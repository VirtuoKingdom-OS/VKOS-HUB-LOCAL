# VKOS Hub Local

**Um workspace multi-IA local-first que opera um negócio inteiro de uma tela só.**

Várias sessões de IA trabalham em paralelo, e todas leem o mesmo **Cérebro**: um arquivo markdown com a identidade do negócio. Nada é hospedado. Sem telemetria. Sem conta. Nenhum dado seu sai da sua máquina.

[![Licença: AGPL v3](https://img.shields.io/badge/Licen%C3%A7a-AGPL_v3-blue.svg)](LICENSE)
[![CI](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/actions/workflows/ci.yml/badge.svg)](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![Local-first](https://img.shields.io/badge/local--first-sem%20telemetria-6f6)](docs/ARCHITECTURE.md)

**English: [README.md](README.md)** | Arquitetura: [docs/contexto/arquitetura.md](docs/contexto/arquitetura.md) | Instalação para o usuário final: [LEIA-ME.md](LEIA-ME.md)

---

## O problema

O prestador de serviço e o dono de negócio não querem "unificar suas IAs". Querem o negócio funcionando.

Hoje, usar IA para trabalho de verdade significa fazer malabarismo com uma dúzia de ferramentas soltas. Cada uma começa do zero. Cada uma precisa ouvir de novo quem é o negócio, com quem ele fala e como ele soa. A ferramenta vira um trabalho a mais em vez de um a menos.

## A ideia

Dar a toda sessão de IA uma memória compartilhada, e colocar na mesma sala as ferramentas que usam ela.

O **Cérebro** é um markdown que descreve o negócio: a oferta, a voz, o cliente, o posicionamento. É legível por gente, versionável, e mora numa pasta que é sua. Toda sessão do workspace lê ele antes de fazer qualquer coisa. Um carrossel, uma landing page, uma campanha de Google Ads e um resumo do CRM saem soando como o mesmo negócio, porque todos foram escritos por algo que já sabia qual negócio era.

Essa é a aposta inteira. Não é "várias IAs num canvas", que é um canvas burro de contexto. É uma memória, vários modelos, uma saída coerente.

## O que ele faz hoje

Não é protótipo. É a ferramenta que o autor usa para tocar a própria empresa.

**Dois níveis de escopo.** O CORE é o nível do dono e não muda quando se troca de cliente. O WORKSPACE é o nível do projeto, um por cliente ou marca. Dado de um workspace nunca chega em outro.

| CORE, o nível do dono | O que é |
| --- | --- |
| **Dashboard** | Gasto, projetos ativos, portas de entrada da criação guiada |
| **Assistente** | Um chat persistente no CORE que planeja lotes de trabalho, propõe, e só executa depois que você aprova. Fila append-only, rastro append-only do que o servidor de fato fez |
| **CRM** | Contatos separados de negócios, quadro, linha do tempo, tarefas, follow-up. Mineração de leads do Google Maps pela Apify. O que a IA recebe é agregado, com telefone e email apagados |
| **Workspaces** | Um por cliente. Criar, trocar, excluir. Excluir apaga a pasta de dados daquele cliente |
| **Conexões** | Credencial de terceiro, guardada localmente, com remoção de verdade |
| **Criador de Estilos** | Monta a paleta do app: escolhe uma base, uma cor de marca, cola um tema, tira as cores de uma imagem ou descreve em palavras. Nada entra sem passar na mesma medição de contraste WCAG que aprova os temas de fábrica |
| **Mapa** | Um grafo vivo e testado dos módulos do próprio sistema e de quem alimenta quem |

| WORKSPACE, o nível do projeto | O que é |
| --- | --- |
| **Cockpit** | Um canvas React Flow. O Cérebro é o nó central, cada sessão de IA em paralelo é um nó bebendo dele, com streaming ao vivo |
| **Cerimônia do Cérebro** | Uma entrevista guiada que escreve o Cérebro de um negócio que ainda não tem um. Retomável. Ela nunca se declara pronta sozinha, porque esse julgamento é do dono |
| **Studio de carrossel** | Peças HTML-first com painel de camadas de verdade, seleção geométrica e imagem própria |
| **Site Guiado** | Um wizard de quatro etapas que gera site estático multipágina, com camada de design, viewport de desktop e celular, edição manual e ajuste com IA lado a lado. Exporta como pasta ou ZIP |
| **Anúncios** | Uma campanha de Google Ads inteira em nove blocos, conferida campo a campo contra os limites reais de caractere do Google, com botão de copiar e a mesma conversa ainda aberta para reescrever |
| **Instagram** | Publica post, carrossel e reels. Lê métrica. Lê, responde, esconde e apaga comentário sem sair do Hub |
| **IDE** | Árvore de arquivos, editor e chat de IA como camada universal flutuante sobre qualquer tela. Ela não alcança a pasta de dados do próprio app, e esse bloqueio está no resolvedor de caminho, não na listagem |

**Motores.** Claude Code e Codex, os dois atrás de um contrato de provedor só. Sessão fica presa ao motor que a abriu. O Hub nunca vê, recebe nem guarda credencial de IA: você loga pelo CLI oficial, e o Hub dispara ele.

## Princípios que não se negociam

1. **Local-first.** O servidor escuta em `127.0.0.1`. Não existe backend hospedado nem telemetria. Nunca.
2. **A credencial é do usuário.** O Hub nunca recebe nem guarda token de IA. O login acontece no programa oficial do motor.
3. **Dado do usuário é sagrado.** Arquivo existente nunca é sobrescrito às cegas. Arquivo corrompido vai para quarentena com data, nunca é substituído por estado vazio. Migração usa valor padrão, não descarta registro.
4. **Dado pessoal de cliente nunca vira conteúdo.** O que a IA recebe do CRM é agregado. Telefone e email são apagados por código, não por pedir com jeitinho ao modelo. Ver [`docs/decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`](docs/decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md).
5. **Geração é verificada, não confiada.** Auditoria determinística antes de dar qualquer coisa por pronta.
6. **Funciona para leigo total, de fábrica.** Se exige configuração ou vocabulário técnico, não está pronto.

## Começando rápido

Você precisa de **Node 22 ou mais recente**, e de **Claude Code ou Codex instalado e logado**, porque o Hub dirige o CLI oficial em vez de guardar a sua chave.

```bash
git clone https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL.git
cd VKOS-HUB-LOCAL/app
npm install
npm run dev
```

Backend na `4600`, Vite na `5173`. Guia completo em [docs/INSTALL.md](docs/INSTALL.md). Se você não é desenvolvedor e só quer usar, o caminho de dois cliques no Windows está em [LEIA-ME.md](LEIA-ME.md).

**Depois disso não tem nada pra configurar.** O repositório já traz um VKOS limpo em [`vkos-modelo/`](vkos-modelo/): os 33 comandos, os templates de carrossel, stories e site, a camada de design, e um Cérebro em branco de propósito. Na primeira abertura o servidor copia ele pra `workspaces/meu-negocio/` e abre a cópia, então o Cockpit já sobe com um Cérebro esperando ser preenchido. O modelo continua intacto e versionado, a sua cópia mora em `workspaces/`, que o git ignora, e o `/instalar` preenche o Cérebro numa conversa guiada.

## Stack

Node e Fastify no servidor, React e Vite no navegador, React Flow no canvas, TypeScript em tudo, npm workspaces segurando os dois. Nenhum framework foi adotado sem o projeto precisar dele.

O mapa técnico de verdade está em [`docs/contexto/arquitetura.md`](docs/contexto/arquitetura.md), e a versão em inglês em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Como este projeto é construído

Três hábitos, e eles aparecem no repositório, que é por isso que vale mencionar.

**Toda decisão é registrada.** `docs/decisoes/` tem mais de 120 arquivos, um por decisão de produto ou técnica, cada um com contexto, decisão e por quê. Antes de reabrir um debate, essa pasta é conferida. É a coisa mais útil do repositório para quem chega, e é o registro honesto do que foi tentado e do que falhou.

**A arquitetura tem um mapa vivo.** `interno/mapa-sistema.json` não é documentação, é dado que o app lê rodando. Mudança que altera quem alimenta quem atualiza o mapa na mesma tarefa, e existe teste que reprova quando o mapa descola do código.

**O portão de qualidade enxerga pixel.** Typecheck, testes e build são o mínimo. Além deles, `ferramentas/olhar-telas.mjs` abre um navegador de verdade e percorre 17 telas em três resoluções, reprovando por erro de console, rolagem horizontal, alvo de toque abaixo de 24px e texto abaixo do piso de 11px. Ele existe porque um build que compilava e passava em tudo já entregou uma barra lateral que deixava 33px para o menu do projeto num notebook de 720px. Nenhum outro portão viu, porque nenhum outro tinha altura.

## Roadmap

A direção é um Hub com ferramentas **modulares por workspace**: o operador escolhe quais ferramentas cada cliente recebe, então uma confeitaria e um estúdio de design veem apps diferentes montados das mesmas peças. O trabalho segue no princípio com que começou: cada ferramenta útil sozinha, e melhor ao lado das outras.

Estado atual e histórico das fases em [`docs/contexto/roadmap.md`](docs/contexto/roadmap.md). A visão em [`docs/contexto/visao.md`](docs/contexto/visao.md).

## Contribuindo

Contribuição é bem-vinda, e a régua está escrita em vez de subentendida. Comece por [CONTRIBUTING.md](CONTRIBUTING.md), depois leia [CLAUDE.md](CLAUDE.md), que são as regras da casa para pessoa e para IA trabalhando neste repositório.

Duas coisas que surpreendem quem chega, então ficam ditas na frente: o código é escrito em português brasileiro, nomes inclusive, e nada entra sem typecheck, testes e build verdes.

Bug e ideia vão em [Issues](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/issues). Falha de segurança **não**: ver [SECURITY.md](SECURITY.md). Quem participa concorda com o [Código de Conduta](CODE_OF_CONDUCT.md).

## Licença

**GNU Affero General Public License v3.0 ou posterior.** Ver [LICENSE](LICENSE).

Use, estude, mude, venda. Se distribuir, entregue o código junto. Se rodar uma versão modificada como serviço de rede para outras pessoas, ofereça o código a elas também. Rodar na sua máquina, para o seu negócio, modificado como você quiser, não obriga você a nada.

Existe licença comercial separada para quem quiser construir um serviço hospedado de código fechado em cima deste código. Isso é possível porque o autor detém o copyright, e não tira nada da concessão da AGPL, que é permanente. Detalhes e a explicação em português claro estão em [NOTICE](NOTICE).

Contato: jesseconta017@gmail.com

---

Feito por [Jesse Gomes](https://github.com/NexcauVirtuoso), VirtuoKingdom.
