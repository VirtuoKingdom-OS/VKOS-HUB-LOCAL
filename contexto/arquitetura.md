# VKOS Hub 3.0, arquitetura técnica

## Topologia

```text
internet
  Caddy, TLS e headers
    core.dominio -> CORE
    app.dominio  -> hub

CORE -------- PostgreSQL
  |               identidade, configuração, auditoria e consumo
  |--- Claude pessoal, volume exclusivo
  |--- cofre, chave exclusiva
  |--- /dados/core e /dados/clientes

hub --------- motor -------- Vertex AI ou Claude do cliente
  |              |
  |              |--- cofre, chave exclusiva
  |--- /dados/clientes

backup ------- PostgreSQL + /dados -> arquivo cifrado -> Cloud Storage
```

## Processos

- `server`, `MODO=core`: operação do Jesse, IA local e rotas administrativas.
- `server`, `MODO=hub`: app dos clientes, sem CLI e sem chave do cofre.
- `motor`: serviço interno sem porta pública, único executor de IA para clientes.
- `postgres`: identidade e configuração. Dados de trabalho continuam em pastas.
- `caddy`: TLS, roteamento e cabeçalhos de segurança.
- `backup`: dump e pastas cifrados diariamente.

## Identidade e isolamento

Toda requisição passa por um middleware único. Ele resolve o cookie de sessão, usuário, papel, workspace, pasta e features ativas. A pasta vem do banco, nunca do navegador.

O contexto usa `AsyncLocalStorage`, então módulos herdados que consultam o workspace ativo recebem o workspace da requisição sem compartilhar estado entre usuários simultâneos.

No hub, uma rota de feature desligada responde 404. O mapa de autorização é derivado dos prefixos declarados no próprio catálogo, sem uma lista manual paralela. WebSockets carregam o workspace da sessão e recebem somente eventos desse workspace. Arquivos de peças também exigem autenticação.

No CORE local, sem `PRODUCAO=1`, o middleware cria um contexto fixo de operador e abre o painel sem cadastro. Em produção, o bootstrap pede email e senha; TOTP é opcional e pode ser ligado ou removido em Administração, Segurança. A sessão deslizante do CORE dura 12 horas.

## Features

O catálogo declarativo vive em `app/server/src/features/catalogo.ts`. Ele registra as 10 features, telas, prefixos de API, eventos, dependências, uso de IA e disponibilidade para cliente.

As flags ficam em `features_workspace`. Cockpit, Cérebro e Fontes de dados são uma única feature `cockpit`; configurações antigas são unidas na migração sem perder ativações. O frontend consulta as flags ao navegar, e o servidor confere de novo em toda requisição. Esconder o menu não é a barreira de segurança.

Administração, Mapa, Conexões e Automações são exclusivos do CORE. Suas rotas nem são registradas no processo `MODO=hub`, independentemente de flags antigas no banco. Um cliente sem tela liberada recebe o estado “Seu workspace está sendo preparado”.

## Interface

DECIDIDO 2026-07-23: dois shells sobre o mesmo código. O operador (CORE) entra no **ShellGestao** (`web/src/componentes/gestao/`), um painel de gestão com cinco áreas: Painel (indicadores, alertas acionáveis e atividade da auditoria), Clientes, Modelos, Estúdio (os workspaces do próprio Jesse) e Sistema (Meu Claude, Segurança, Auditoria, Mapa). O CORE deixou de ser um estúdio de criação: a saudação "o que vamos criar" e o seletor de workspace da sidebar saíram. Ver decisoes/2026-07-23-core-painel-de-gestao.md. A **experiência de workspace** (o Shell de sempre, montado por features: Cockpit, Cérebro, criação, CRM, Calendário, IDE) é o que o cliente vê e o que o operador vê quando entra num workspace pelo Estúdio ou por Clientes. Entrar é ação explícita: a URL vira `/w/<id>/...` (prefixo de base no Shell), uma barra de contexto fixa mostra o workspace e o botão Voltar ao painel, e a entrada é auditada. Dentro de um workspace, os itens de gestão (Conexões, Automações, Mapa, Administração) não aparecem: ali se opera o workspace como o cliente operaria. Mapa e telas internas nunca aparecem para cliente.

O frontend compartilhado usa dois temas: Escuro e Claro off-white. `global.css` define os tokens de espaço, tipo, raio, movimento, profundidade e cor. `visual-hub.css`, carregado por último, fixa os valores finais de cada tema. O valor legado `vkos` do armazenamento local migra para Escuro.

Os componentes comuns ficam em `web/src/componentes/comum/`. O App tem um limite de erro global e o Shell isola cada tela, então uma exceção local não desmonta o produto inteiro. Em até 640 px a navegação vira uma barra inferior rolável. A auditoria em `infra/varredura-ui.mjs` cobre 390, 768 e 1440 px, os dois temas, overflow, console e contraste.

Toda tela nova entra no contêiner `tela-fluxo`, no `interno/mapa-telas.json`, no teste de ida e volta da rota e sob o limite de erro do Shell. O Shell usa caminhos limpos com History API. O Fastify e o Vite entregam o `index.html` em rotas profundas da aplicação; APIs, previews e arquivos mantêm precedência e 404 próprio. No boot, links antigos `#/...` são convertidos para o caminho equivalente.

O canvas do Cockpit continua montado para preservar estado, mas recebe `visibility: hidden`, `inert` e bloqueio de ponteiro quando outra tela está ativa. As telas de fluxo usam fundo opaco por token.

## Dados

PostgreSQL guarda usuários, modelos, workspaces, membros, features, credenciais cifradas, convites, auditoria, consumo, limites e sessões web.

As pastas ficam em `/dados/core` e `/dados/clientes/<uuid>`. O CORE materializa cada workspace a partir de uma semente conhecida. O id é gerado no servidor e o caminho final é confinado à base configurada.

## Motores e cofre

O motor recebe somente workspace, feature, pedido e contexto. Antes do envio, o hub resolve a skill em `.claude/skills/<skill>/SKILL.md`, remove o comando de barra cru e inclui as instruções e a conversa anterior. Escritas de texto pedidas pela skill usam um protocolo confinado à pasta do workspace, aplicado atomicamente pelo hub. O motor resolve credencial e limite no banco e devolve NDJSON, que o hub traduz para o streaming já usado pela interface. Para Leads, o Hub envia workspace, termo e opções ao endpoint interno da Apify; o motor resolve o token e devolve somente o resultado da busca.

Credenciais usam AES-256-GCM. A chave mestra vem de arquivo montado como secret, apenas no CORE e no motor. Respostas administrativas mostram somente os quatro últimos caracteres.

Gemini usa Vertex AI com uma conta de serviço exclusiva e modelos configurados por ambiente nas faixas `economico`, `padrao` e `forte`. Todo modelo usa Gemini por padrão e todo workspace provisionado nasce com Gemini, inclusive quando a receita administrativa declara Claude Team. A troca para Claude Team só é liberada depois de registrar o consentimento e testar a credencial própria do workspace. `nenhum` existe apenas como contingência interna e nunca aparece como escolha administrativa; nesse estado o cliente recebe a mensagem neutra de IA em manutenção.

O broker usa os tokens finais informados pelo provedor e a tabela em USD por milhão de tokens da faixa resolvida. Todo teste real também entra em `consumo_ia`. Antes de abrir uma sessão, o consumo do mês é comparado ao orçamento: `avisar` mantém o fluxo e `cortar` recusa novas sessões. Falha de autenticação ou configuração marca o motor em manutenção e devolve mensagem neutra ao cliente.

O Claude pessoal do Jesse segue outro caminho: a CLI existe somente na imagem CORE, persiste em `claude_core` e atende apenas sessões do CORE. Administração, Meu Claude consulta instalação, versão, login e conta e oferece um teste curto. A aba Acesso lista e revoga convites, lista e remove membros e encerra sessões do cliente, com auditoria no servidor e falhas parciais isoladas na interface. O login na VPS é interativo por `docker compose exec core claude`.

As conexões externas legadas ainda persistem tokens em arquivo no modo CORE. O modo Hub bloqueia estruturalmente a leitura, a escrita e as rotas dessa implementação. A Apify já é mediada pelo motor; GitHub, Netlify e Google continuam bloqueados no Hub até receberem o mesmo desenho. O container Hub continua sem chave mestra.

## Infraestrutura

`docker-compose.yml` separa redes pública e interna. Postgres e motor não publicam porta. Os containers de aplicação rodam como usuário não root e com filesystem somente leitura, exceto volumes e `tmpfs` declarados.

`infra/gcp/` declara Compute Engine, IP fixo, firewall, contas separadas para VM, Vertex e backup, Secret Manager e bucket versionado. `infra/backup/` gera backup cifrado e inclui restauração verificável. `infra/RUNBOOK-VPS.md` cobre o caminho completo, inclusive DNS, Claude do CORE, teste real dos motores e restauração em Postgres descartável. `infra/CHECKLIST-SEGURANCA.md` separa controles verificados no repositório das validações que exigem a VM.

## Compatibilidade 2.x

Sem `DATABASE_URL`, `MODO=core` mantém temporariamente a operação local existente. Esse caminho existe para migração e não é o ambiente de cliente. `MODO=hub` exige identidade e banco e nunca registra provedores locais.
