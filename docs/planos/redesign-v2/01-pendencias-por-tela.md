# Pendências por tela, Fase 2

> **A FASE 2 TERMINOU EM 2026-07-30.** A lista zerou: as 21 folhas do app
> migraram para a fundação v2, o `estilos/legado.css` foi demolido classe por
> classe e o arquivo não existe mais. Este documento passa a ser o registro do
> que aconteceu, não mais um mapa de trabalho pendente.

## A lista

Vazia. `PENDENTES`, em `app/web/src/estilos/folhas.ts`, também está vazia: as
travas de conteúdo (cascata, contraste, escalas, densidade) varrem o app
inteiro, sem exceção de arquivo nenhum.

## Estado final

Portão verde: `npm run checar -w web` limpo, **193 testes passando**, build ok.
Zero violação mecânica em zero folha. As 102 violações do começo da Fase 2 não
foram isoladas: foram resolvidas.

## Como a lista encolheu

| onda | data | o que migrou |
|---|---|---|
| A | 2026-07-30 | CORE e a casca: `core.css`, `barra.css` |
| B | 2026-07-30 | Dashboard e Início (`dashboard.css`, `workspaces.css`), CRM (`crm.css`, `conversas.css`), Criação (`criacao.css`), Site, Studio e Editor (`site.css`, `studio.css`, `editor.css`), Cockpit e Mapa (`canvas.css`, `mapa.css`, `cerebro.css`, `cerimonia.css`, `composer.css`), IDE, Conexões, Galerias, Fontes e Setup (`ide.css`, `conexoes.css`, `telas.css`, `setup.css`, `markdown.css`) |
| varredura final | 2026-07-30 | o `legado.css` inteiro, os dois componentes sem dono e os remendos que as telas carregavam por causa dele |

## A varredura final, em detalhe

**O que foi demolido.** As 1640 linhas do `estilos/legado.css`. Cada bloco foi
conferido por grep no TSX antes de sair. Morreram por não casar com componente
nenhum: `.cartao-fonte*`, `.previa-*`, `.overlay-fonte`, `.cartao-prompt*`,
`.fontes-hub-*`, `.chip-filtro`, `.botao-voltar-fontes`, `.botao-icone-perigo`,
`.crm-hero`, `.crm-topo`, `.crm-tag`, `.tela-fluxo`, `.tela-fluxo-topo`,
`.fluxo-vazio`, `.icone-vazio`, `.subtitulo`, `.tela-fonte-*`, `.ws-cartao-nome`,
`.conx-*`, `.galeria-fontes-modal`, `.studio-topo`, `.site-topo`, `.editor-topo`
e as duas dúzias de seletores de dashboard que já estavam comentados. Morreu
também o bloco `input, textarea, select` por seletor de elemento, que era a
causa dos remendos, e o bloco de movimento reduzido, porque o `global.css` e o
`primitivas.css` já declaram o deles.

**O que foi migrado, não apagado.** Duas coisas ainda estavam vivas e nenhuma
onda anterior podia levar, porque nenhuma delas pertence a uma tela só:

- `componentes/pecas/pecas.css`, folha nova. O cartão de uma geração
  (`CartaoPeca`) e o visor que amplia ela (`Lightbox`). Três donos usam os dois:
  a tela de um fluxo, a galeria unificada e a galeria de um contêiner do
  Cockpit. O cartão passou a compor `.cartao`, o título caiu de 15px/700 para
  14px/600, o botão de baixar a miniatura deixou de aparecer só no hover, a
  miniatura parou de ficar menta ao passar o mouse e "Abrir" deixou de ser
  `.botao-principal` (são até trinta cartões iguais na mesma tela).
- `componentes/comum/comum.css`, folha nova. O wordmark, a tela de carregamento
  e a tela de servidor fora do ar. O giro próprio de 34px virou o `.girinho` das
  primitivas, e o selo de erro saiu do `style` inline do TSX.

**Os remendos que sumiram com a causa.** Sete blocos, todos nomeados e
comentados na época em que nasceram, todos removidos agora: a seção 0 do
`crm.css` (17 regras), a seção 2.1 do `criacao.css` (11), a seção 0 do
`conexoes.css` (5), a seção 0 do `ide.css` (2), a seção 0 do `editor.css` (22),
a regra `.tela-fonte .campo` do `telas.css` (1) e os três níveis a mais de
especificidade do `canvas.css` (`.cockpit .area-canvas`,
`.area-canvas .react-flow__controls-button` e `.area-canvas .no-sessao .cabeca`).
Conferido no navegador depois de remover, nos dois temas: campo e select com
32px de altura e 6px de raio, caixa de seleção quadrada de 16px, interruptor de
36 por 20, botão de 28px, select com a seta desenhada em CSS.

**Os 22 apelidos legados de token saíram do `global.css`** (`--fundo-2`,
`--borda`, `--menta-clara`, `--amarelo`, `--realce-rgb`, `--confirmar-perigo-*`,
`--pontos-fundo`, `--grao`, `--vidro` e os demais). Cada um foi conferido por
`var(--nome)` no CSS e no TypeScript antes de sair: zero uso.

## O que a Fase 2 mudou, além das travas

O que nenhuma expressão regular media, e que era o trabalho de verdade:

- **Reinvenção de componente.** Cada tela tinha o seu campo de busca, a sua
  pílula, o seu cartão e a sua faixa de aviso. Hoje as telas compõem
  `primitivas.css`.
- **Cartão dentro de cartão.** Acabou.
- **Menta decorando.** A pílula menta da aba ativa, o preenchimento menta da
  opção escolhida e o nome do negócio em verde saíram. O menta só diz o que está
  vivo.
- **Densidade.** Cabeçalho de tela de 96px virou uma linha de 56px.
- **Ação que só aparecia no hover.** O último caso era o botão de baixar a
  miniatura de um slide, e ele caiu na varredura final.

## O que continua valendo

`estilos/canvas.css` deixou de ser depósito na Onda B e é hoje a folha do canvas
de grafo, compartilhada pelo Cockpit e pelo Mapa. Ela continua em `estilos/`
por um motivo concreto, e o `camadas.test.ts` registra o motivo: é ela quem
sobrescreve as variáveis `--xy-*` do React Flow, que entra na camada `externo`
pelo `externo.css` ao lado.

A lista `PENDENTES` continua existindo mesmo vazia. Ela é a única forma honesta
de abrir uma exceção temporária: quem precisar de uma folha fora das travas por
uma rodada escreve o nome dela ali, com data e motivo, e o próximo que passar vê
que a dívida existe em vez de descobrir por acidente.
