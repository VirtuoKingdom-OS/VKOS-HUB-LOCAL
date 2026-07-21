# Visão: o app inteiro em telas, jornadas e gestos

## O que o Jesse vê

Abre o Mapa e no topo escolhe "Telas". O canvas mostra o app de ponta a ponta, organizado em zonas da esquerda pra direita, seguindo a ordem real de uso: Entrada e boot, Hub, Conteúdo, Criação, Edição. Cada tela é um cartão com um mini-esqueleto do layout dela, o nome, a rota e os estados internos. As setas entre os cartões dizem o gesto que leva de uma pra outra. Chips de jornada acendem caminhos completos com passo numerado. Clicou num cartão, o painel lateral explica a tela por inteiro e oferece "Abrir esta tela": um clique e o Hub navega pra ela de verdade.

## Inventário de telas, rotas e estados (auditado no código em 2026-07-21)

Fonte da verdade: `app/web/src/componentes/layout/rotas.ts` (hash), `Shell.tsx` (montagem), `App.tsx` (estados pré-shell).

### Zona 1: Entrada e boot

| Nó | Rota | Estados internos |
|---|---|---|
| Splash | sem rota (estado de carga) | carregando inicial |
| Servidor fora do ar | sem rota (estado de erro) | botão tentar de novo |
| Setup do motor | `#/setup` | escolha do provedor (Claude/Codex), instalação guiada, login, teste ao vivo com custo |
| Onboarding | sem hash (cockpit não liberado) | escolher ou criar a pasta VKOS |

### Zona 2: Hub (gestão e operação)

| Nó | Rota | Estados internos |
|---|---|---|
| Dashboard | `#/dashboard` | porta de entrada, botões de criação, resumo do cliente |
| Cockpit | `#/cockpit` | canvas infinito; nó do Cérebro, nós de sessão (conversa multi-IA, custo, modelo), terminal, preview de site |
| CRM | `#/crm` | kanban de negócios, painel do contato, busca de leads (Google Maps) |
| Calendário | `#/calendario` | eventos locais e Google Calendar |
| Automações | `#/automacoes` | lista de regras, assistente de regra, ensaio |
| Conexões | `#/conexoes` | catálogo de integrações, tokens, teste real |
| Mapa | `#/mapa` | visão Sistema (normal, discreto, percurso das skills, mapa completo) e visão Telas (esta) |
| IDE | camada sobreposta (hash legado `#/ide`) | chat IDE por cima de qualquer tela |

### Zona 3: Conteúdo

| Nó | Rota | Estados internos |
|---|---|---|
| Galerias | `#/galerias` | peças de imagem unificadas (carrossel, post, story) |
| Fluxo de peças | `#/fluxo/:tipo` (carrossel, post, story, site) | lista por tipo; só existe com peça do tipo |
| Fontes | `#/fontes` | tipos de contexto presentes |
| Fonte | `#/fonte/:tipo` | itens de um tipo de contexto |

### Zona 4: Criação

| Nó | Rota | Estados internos |
|---|---|---|
| Assistente de criação | `#/criar/carrossel`, `#/criar/post`, `#/criar/story`, `#/criar/site` | etapas do wizard: briefing, modelo e estilo, origens de imagem, instruções finais, interruptor Aprimorar com IA, geração ao vivo |
| Geração flutuante | estado (wizard minimizado) | mini card com progresso, reabre o wizard |

### Zona 5: Edição

| Nó | Rota | Estados internos |
|---|---|---|
| Studio | `#/studio/:pasta` | canvas da peça, seleção, alças de redimensionar, painel de propriedades, painel de camadas, ajustar com IA |
| Site | `#/site/:pasta` | preview, conformidade (auditoria), publicação (Netlify, GitHub) |

Total: 20 nós de tela/estado. Com as repetições didáticas das jornadas, o canvas fica na casa de 25 a 30 cartões, tamanho confortável.

## Jornadas (as arestas que importam)

Cada jornada é uma sequência de nós com o gesto em cada passo:

1. **Primeira vez no Hub**: Splash > Setup do motor (escolhe, instala, loga, testa) > Dashboard. Variante: Splash > Onboarding (cria a pasta VKOS) > Dashboard.
2. **Criar um carrossel**: Dashboard (clica Criar) > Assistente `criar:carrossel` (conclui o wizard) > Studio da peça nova. Vale igual pra post e story.
3. **Criar e publicar um site**: Dashboard > Assistente `criar:site` > Tela do Site (preview, conformidade) > publicação.
4. **Editar uma peça existente**: Galerias ou Fluxo (clica na peça) > Studio. Site: Fluxo de sites > Tela do Site.
5. **Cuidar do CRM**: Dashboard > CRM (kanban) > busca de leads > contato novo no funil.
6. **Operar com IA**: qualquer tela > IDE (camada) ou Cockpit (sessões multi-IA).

A repetição é bem-vinda: o Dashboard aparece como origem em várias jornadas; na jornada ele repete como nó de passo, pequeno, além do cartão principal na zona.

## Por que agora

O Jesse vai reescrever o design do app. Antes de redesenhar, precisa ver tudo que existe e como conecta de fato, sem abrir tela por tela na mão. O Mapa de Telas é o índice visual dessa reforma e, de quebra, vira mais uma prova da profundidade do produto (mesmo papel de valor percebido do Mapa completo).
