# Diagnóstico de produto: VKOS Hub

> Documento-base. Retrato operacional do VKOS Hub como ele é hoje, no código, não como a visão promete. Serve de fundação para outras análises (facilidade de uso, público-alvo, dores, precificação, concorrência). Escrito em 2026-07-22, com o app na versão 2.0.0, na véspera do trabalho rumo à 3.0.0.
>
> Regra deste documento: descrever o que existe, com evidência. Onde houver distância entre o que a visão diz e o que o produto entrega, a distância é nomeada, não maquiada.

## Sumário em uma frase

O VKOS Hub é um sistema de operação de marketing por IA, local-first, genuinamente poderoso e já usável na prática, embalado num invólucro que ainda pressupõe um usuário confortável com computador no nível técnico. O motor é de produto maduro. A porta de entrada e o vocabulário ainda são de ferramenta de desenvolvedor.

## 1. O que o VKOS Hub é hoje

Um aplicativo que roda na máquina do usuário (servidor Fastify local na porta 4600, interface React no navegador) e orquestra uma ou várias sessões de IA (Claude Code ou Codex, instalados como programa na máquina) que trabalham sobre uma pasta VKOS do negócio. Todas as sessões leem o mesmo Cérebro: um markdown com a identidade do negócio em 13 blocos. Por isso o que sai (carrossel, site, legenda) já nasce com a cara do negócio, não genérico.

Na prática, o Hub reúne num lugar só cinco coisas que hoje o dono de negócio faria em cinco ferramentas soltas:

1. Criar conteúdo visual (carrossel, post, story) com assistente guiado e editor.
2. Criar e publicar sites com assistente guiado, editor e publicação automática.
3. Gerenciar clientes e vendas (CRM com funil, contatos, leads do Google Maps).
4. Organizar agenda (calendário local, opcionalmente sincronizado com o Google).
5. Automatizar tarefas simples (regras "quando isto, então aquilo").

Por baixo de tudo, uma camada técnica de poder: o Cockpit (canvas com as IAs em nós) e a VKOS-IDE (chat que edita arquivos do cliente direto). Essa camada é o que dá a sensação "multi-IA", mas é também a mais crua para um leigo.

O produto é o cockpit de operação. A orquestração de IA é a infraestrutura por baixo. A tese é vender o negócio operando, não o painel de IAs. Essa tese está certa no papel e ainda pouco cumprida na interface, porque a orquestração ainda aparece demais.

## 2. Mapa dos módulos e maturidade

Legenda de maturidade: Sólido (parece pronto e polido), Funcional (entrega valor, com arestas), Beta (funciona mas depende de configuração externa ou tem estados de erro visíveis), Interno (não é para o usuário final).

| Módulo | Rota | Maturidade | Observação |
|---|---|---|---|
| Criação de conteúdo visual | `#/criar/<tipo>`, `#/studio/<pasta>`, `#/galerias` | Sólido | Fluxo mais polido do app. Assistente guiado, editor com camadas, "Ajustar com IA", previews vivos. É o coração do produto. |
| Site Guiado + publicação | `#/criar/site`, `#/site/<pasta>` | Funcional a Beta | Gera site HTML de qualidade auditada, edita e publica no GitHub e Netlify. A publicação depende de o usuário configurar tokens externos. |
| Dashboard | `#/dashboard` | Funcional | Porta de entrada com dois botões de criação, recentes e atalhos. Ainda é mais "menu de criação" do que "estado do negócio". |
| CRM | `#/crm` | Funcional a Beta | Abas Hoje, Quadro, Contatos, Buscar leads. Recém-reformado para o contato ser o cartão do funil. Leads do Google Maps via Apify. |
| Calendário | `#/calendario` | Funcional | Agenda local que funciona sem Google. Sincronização com Google é opcional e pede OAuth. |
| Automações | `#/automacoes` | Beta | Regras "se isto, então aquilo". Hoje só cria eventos na agenda e avisa que precisa conectar o Google. Poder ainda estreito. |
| Cockpit (canvas) | `#/cockpit` | Funcional, denso | O canvas multi-IA. Rico, mas rotulado "Modo avançado". Coração técnico, não porta de entrada. |
| VKOS-IDE | camada sobre qualquer tela | Funcional, avançado | Chat que edita a pasta do cliente. Expõe vocabulário de desenvolvedor (Motor, Modelo, Permissão, "Poder total"). |
| Conexões | `#/conexoes` | Beta, o mais técnico | Central de integrações. Tokens, MCP, permissões de repositório. A tela mais crua do app para um leigo. |
| Fontes de dados | `#/fontes` | Discreto | Contextos que alimentam a IA. Aparece só quando há dados. Secundário. |
| Mapa | `#/mapa` | Interno | Visualização da própria arquitetura. Ferramenta de quem constrói, não de quem usa. Some quando o dado interno não está presente. |

Leitura do mapa: o app tem uma coluna vertebral clara de valor (criar conteúdo, criar site, gerir cliente, agendar) e uma cauda de módulos que ou são técnicos (Conexões, IDE, Cockpit) ou internos (Mapa). Para o 3.0, a pergunta de produto é qual dessa cauda o dono de negócio precisa ver e qual deveria virar "avançado" escondido.

## 3. A jornada real do usuário, do zero ao primeiro valor

Este é o percurso que alguém percorre hoje, com a fricção real de cada passo.

**Antes de abrir o app:**
1. Receber um arquivo ZIP e extrair para uma pasta (não rodar de dentro do ZIP).
2. Ter Windows 10 ou 11 com WinGet.
3. Ter uma conta paga de Claude ou Codex.
4. Dar dois cliques em `Instalar VKOS Hub.cmd`. Provável aviso do SmartScreen do Windows a contornar.
5. Deixar instalar Node.js e dependências (alguns minutos, com autorização do Windows).

**Configuração do motor de IA (`#/setup`, 6 passos):**
6. Escolher entre Claude e Codex (a tela já fala de "conexões MCP e skills", "estimativa por tokens").
7. Deixar o Hub detectar e instalar o programa da IA, ou copiar um comando de terminal cru.
8. Fazer login numa janela de terminal que o Hub abre.
9. Passar por um teste real, que já mostra custo em dólar.

**Configuração do negócio (o Cérebro):**
10. Chegar ao Dashboard, então fazer a entrevista guiada do Cérebro (a Cerimônia, cerca de 10 minutos) ou escrever à mão.

**Só então:**
11. Criar a primeira peça com a cara do negócio.

Onze passos, dois deles envolvendo terminal e comandos, antes do primeiro valor. Para o público que a visão nomeia (dono de negócio, não desenvolvedor), a jornada tem pelo menos quatro pontos onde uma pessoa comum trava sozinha: o SmartScreen, a escolha "Claude ou Codex" sem saber a diferença, a janela de terminal do login, e a ideia de configurar um "motor" antes de fazer qualquer coisa. O princípio 6 do próprio README diz "funciona para leigo total, de fábrica: se exige configuração ou vocabulário técnico, ainda não está pronto". Por esse critério declarado pela própria casa, a entrada ainda não está pronta.

## 4. Público-alvo: o declarado e o real

**Declarado (visao.md, ecossistema.md):** o prestador de serviço e o dono de negócio que quer o negócio funcionando, não uma ferramenta nova para dominar. Explicitamente NÃO o desenvolvedor.

**Real, hoje:** quem consegue instalar, configurar e operar o Hub sozinho é alguém confortável com ZIP, terminal, contas de IA e tokens. Ou seja, hoje o produto atende de fato o operador técnico (o próprio Jesse e quem se parece com ele), e atende o dono de negócio comum apenas com alguém técnico ao lado fazendo a instalação e a configuração.

**O gap:** existe uma distância entre o público que o produto foi desenhado para servir e o público que ele de fato consegue servir sem ajuda. Fechar essa distância é, provavelmente, a definição do que a 3.0 precisa ser. Não é adicionar módulo, é remover fricção e vocabulário até o público declarado conseguir usar sozinho.

Observação estratégica: o próprio ecossistema coloca o Hub como "terceira engrenagem" da VK, provado na operação antes de virar oferta. Isso é saudável. Significa que o produto pode amadurecer a acessibilidade sem a pressa de um lançamento, usando o Jesse e poucos clientes próximos como campo de prova.

## 5. Dores que resolve

Dores que o Hub resolve bem hoje:

- "Cada IA começa do zero e não conhece meu negócio." Resolvido pelo Cérebro compartilhado. É o diferencial real.
- "Junto conteúdo de um lugar, cliente de outro, agenda de outro." Resolvido pela reunião de criação, CRM e calendário num app só.
- "Minha peça sai com cara de IA genérica." Combatido pela camada de design (cartela de direções, biblioteca de estilos, proibições anti-IA, auditoria de qualidade antes de publicar).
- "Faço site no improviso e não sei publicar." Resolvido pelo Site Guiado com publicação determinística e auditada.
- "Perco lead e esqueço de dar retorno." Endereçado pelo CRM com funil, follow-up e leads do Google Maps.

Dores que o Hub promete e ainda não resolve por completo:

- "Não quero saber de IA, quero saber de cliente." Ainda não cumprido: a IA e sua orquestração aparecem demais na interface (motor, provedor, tokens, permissões).
- "Quero abrir e ver como meu negócio está agora." Parcial: falta uma home que resuma o estado do negócio num relance. O Dashboard hoje é mais um menu de criação.
- "Meu negócio para quando eu paro." Endereçado só em parte: as Automações ainda são estreitas (basicamente criar evento na agenda).

## 6. O diferencial defensável

O Cérebro. É a única peça que os concorrentes de "canvas de várias IAs" (as referências citadas, AIOX-CORE e Maestri) não têm. O canvas deles é burro de contexto: cada IA começa sem saber que negócio é aquele. No Hub, toda sessão bebe do mesmo Cérebro.

Esse diferencial não é promessa, já roda: o Cérebro vem do produto VKOS que já está à venda e em uso. O Hub é a evolução dele para uma interface onde várias IAs leem a mesma fonte ao mesmo tempo. Isso é uma vantagem difícil de copiar rápido, porque não é uma feature, é um mecanismo com metodologia por trás (a skill de instalação, os 13 blocos, a regra de ler antes de gerar).

Ponto de atenção: hoje o diferencial é forte por dentro e fraco por fora. O usuário sente o resultado (peça com a cara do negócio), mas a interface não conta bem a história de por que aquilo é diferente. Isso é oportunidade de produto e de marketing ao mesmo tempo.

## 7. Acessibilidade: onde trava e o vocabulário

A maior barreira do produto não é o que ele faz, é o que ele exige entender para começar. Um dono de negócio comum encontra, na interface, termos que pertencem ao mundo do desenvolvedor:

- Motor de IA, provedor: a abstração de Claude e Codex.
- CLI, programa local, terminal, e um comando cru de WinGet mostrado na tela.
- MCP, conexões MCP, servidor: repetido em Setup e Conexões, sem explicar o que é.
- Token, personal access token, OAuth, refresh token, com instruções de permissão de repositório.
- Tokens de IA, cache, entrada, saída, e custo sempre em dólar.
- Permissão, "Poder total", "Seguro" (a face amigável de um modo que ignora confirmações).
- Skill, comandos, canvas, nó, fluxo, workspace, cockpit.

Alguns desses termos são inevitáveis por baixo, mas quase todos poderiam ficar escondidos atrás de linguagem de negócio. "Motor de IA" pode ser só "a IA". "Conexão MCP" pode ser "conectar seu GitHub". Custo em dólar pode ser custo em real. O selo "Versão Beta" fixo com aviso de erro é honesto, e ao mesmo tempo é um sinal constante de "ainda não é pra você" para quem busca confiança.

Contraponto justo: partes do onboarding são excelentes para leigo. A Cerimônia do Cérebro ("é uma conversa, não um formulário, leva uns 10 minutos") é o padrão-ouro do que o resto do app deveria imitar. O problema não é o app inteiro, é a mistura: camadas muito amigáveis (Dashboard, Cerimônia) coladas em camadas cruas (Setup com WinGet, Conexões com tokens, IDE com permissões).

## 8. Modelo de negócio e distribuição

- Filosofia: local-first, pagamento único, sem mensalidade obrigatória, sem dado do usuário saindo da máquina, sem telemetria. Herdada do VKOS (à venda a R$67, pagamento único).
- A credencial de IA é do usuário: o Hub nunca recebe token de IA, o login é pelo programa oficial. Isso é uma força de confiança e uma fricção de entrada ao mesmo tempo.
- Distribuição por pacote ZIP com dois instaladores `.cmd`, para Windows. O pacote leva o app, um template de workspace (VKOS 2) e os inicializadores.
- Custo da IA recai sobre a conta do próprio usuário (a assinatura de Claude ou Codex dele). O Hub apenas estima e exibe.

Tensão a registrar para análises futuras: esse modelo é coerente com a cultura da VK e ótimo para privacidade, mas ele empurra a complexidade da conta de IA para o usuário. Existe uma conversa paralela, já iniciada, de uma versão SaaS web com login e Gemini por baixo, que inverteria isso (a VK banca a IA, o usuário só loga). São dois produtos com economias opostas. O 3.0 foi decidido como continuação do local-first, com o SaaS tratado à parte.

## 9. Forças

- O Cérebro como contexto compartilhado, diferencial real e difícil de copiar.
- Profundidade: o app já faz muita coisa de verdade, ponta a ponta, com qualidade auditada (a barreira de publicação de site é séria).
- Disciplina de engenharia: testes automatizados, migração que não descarta dado, quarentena de arquivo corrompido, dado pessoal fora de peça publicável. Base confiável para construir por cima.
- Coerência de identidade visual: três temas por tokens, menta, motion sutil.
- Cultura de decisão registrada: cada escolha vira arquivo em decisoes/, o que mantém o produto legível para quem entra depois.

## 10. Fraquezas e dívidas

- Onboarding técnico: o maior gargalo de acessibilidade, detalhado nas seções 3 e 7.
- Vocabulário de desenvolvedor exposto na interface.
- Falta de um centro que mostre o estado do negócio (o Dashboard é menu, não painel).
- Navegação larga: muitos itens de sidebar de pesos muito diferentes (do Dashboard ao Mapa interno) no mesmo nível.
- Módulos de maturidade desigual convivendo sem hierarquia clara (Sólido ao lado de Beta ao lado de Interno).
- Selo Beta e mensagens de erro visíveis: honestos, mas corroem a confiança de quem chega.
- Dependência de configuração externa em fluxos-chave (publicar site e automações pedem tokens e OAuth).

## 11. Riscos a vigiar

- Dependência de CLI de terceiros: o app depende de Claude Code ou Codex instalados e logados. Se qualquer um mudar o CLI, a auth ou o formato de saída, a ponte quebra.
- Acoplamento com a estrutura de pastas do VKOS: se o VKOS mudar, o Hub sente.
- Rate limit ao paralelizar sessões: mitigado por limite de concorrência, a vigiar em uso real.
- Custo repassado ao usuário: no modelo local, um usuário que abusa gasta a própria conta, o que é justo. No eventual SaaS, isso vira risco financeiro da VK.
- Windows-only: fecha a porta para uma fatia de público de imediato.

## 12. O gap central entre a visão e o produto

A visão diz: o usuário não deveria ver a orquestração, deveria ver resultado. O produto hoje ainda mostra a orquestração em vários pontos (o Cockpit é uma tela de primeira classe, o Setup fala de motores, a IDE fala de permissões). A tese está certa e a execução ainda está no meio do caminho.

Traduzido para uma direção de 3.0: o trabalho não é adicionar capacidade, é esconder maquinaria e nomear tudo na língua do dono de negócio. O motor da criação já é bom. Falta a embalagem alcançar o motor.

## 13. O que este diagnóstico habilita

Esta base foi escrita para alimentar análises mais focadas. Ganchos diretos para os próximos documentos:

- Análise de facilidade de uso: partir das seções 3 (jornada), 7 (vocabulário) e do princípio 6 do README como régua.
- Análise de público-alvo: partir da seção 4 (declarado versus real) e cruzar com o ecossistema (as três engrenagens da VK).
- Análise de dores e proposta de valor: partir das seções 5 e 6, separando dor resolvida de dor prometida.
- Análise competitiva: partir da seção 6 (o Cérebro como cunha) contra AIOX-CORE e Maestri.
- Análise de precificação e modelo: partir da seção 8 e da tensão local-first versus SaaS.
- Priorização do 3.0: partir das seções 10, 11 e 12, ordenando por quanto cada item aproxima o produto do público declarado.

## Veredito

O VKOS Hub 2.0 é um produto de fundação forte com uma casca ainda técnica. Ele já entrega valor real e diferenciado para quem consegue atravessar a entrada. O salto para a 3.0 não é de mais funcionalidade, é de acessibilidade e centralização: transformar uma ferramenta poderosa de operador em um produto que o dono de negócio abre, entende e usa sozinho, sem nunca perceber quantas IAs trabalham por baixo.
