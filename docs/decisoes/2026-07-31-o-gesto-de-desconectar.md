# O gesto de desconectar, e o alvo que encolhia com o zoom

## Contexto

Depois que as arestas voltaram a aparecer (ver
`2026-07-31-o-reset-de-midia-apagou-os-canvas.md`), sobrou o outro lado do
problema: dava pra VER a ligação, mas não pra mexer nela.

Desconectar tinha um caminho só, e ele era invisível: acertar o botão direito
em cima de um traço de 2px e achar "Desconectar" no menu. Quem não sabia que o
menu existia não tinha como descobrir, e quem sabia ainda precisava da
pontaria. A ação existia no código e não existia na tela.

## Decisão

A aresta do cockpit vira componente próprio, `cockpit/ArestaCockpit.tsx`, e ele
substitui a chave `default` do `edgeTypes`. Isso é de propósito: nenhuma aresta
do canvas declara `type`, então todas caem no padrão e todas ganham o
comportamento novo sem tocar em nenhuma fábrica de aresta e sem mudar uma
vírgula do formato do `canvas.json`, que nunca gravou o tipo.

Duas coisas mudam no gesto:

- **A faixa de acerto.** Uma trilha invisível de 26px acompanha a linha, com
  `vector-effect: non-scaling-stroke` pra medir sempre o mesmo em pixel de
  TELA. Sem isso o alvo encolhe com o zoom, e é afastado que se olha a
  topologia inteira.
- **O corte no meio do caminho.** Encostar na aresta revela um botão de 24px
  sobre ela. Clicar corta. O menu de botão direito continua valendo, porque ele
  é o caminho do toque longo, e a aresta selecionada também abre o corte, que é
  o caminho de quem não tem hover.

O corte é o mesmo `desconectarAresta` que o menu já chamava. Nada mudou em O
QUE é permitido cortar, só em como se chega lá. A função subiu pro
`CanvasContexto`, que já era a ponte de quem está dentro do canvas pro dono
dele.

## O bug que a conferência achou no meio

Medido no navegador: o botão de 24px dava **17px** com o canvas a 70% de zoom,
e daria 7px no zoom mínimo. Bem abaixo dos 24 do critério 2.5.8 do WCAG 2.2.

A causa é do React Flow, e é fácil de repetir: o `EdgeLabelRenderer` entrega o
rótulo DENTRO do viewport transformado. O que se declara ali em px sofre a
escala do canvas. A folha estava certa; quem encolhia era o pai.

O conserto lê o zoom do canvas (`useStore(e => e.transform[2])`) e divide por
ele no próprio transform. O seletor devolve só o terceiro item, e não o vetor
inteiro, pra arrastar o canvas não re-renderizar aresta nenhuma: pan mexe em
`transform[0]` e `[1]`.

São dois elementos, e não um: a âncora POSICIONA e desfaz o zoom, o botão
dentro dela só cresce ao aparecer. Empilhar as duas coisas num transform só não
funciona, porque a propriedade `scale` entra na matriz depois do `transform` e
com a origem no canto do plano: o botão entraria em cena vindo de fora da tela.

## A trava

`estilos/escalas.test.ts` ganhou um teste: rótulo de aresta que contém ALVO
(botão ou `onClick`) tem que ler `transform[2]` e dividir por ele. Conferido
apagando o conserto: sem ele, o teste falha.

Ela cobre alvo, não todo rótulo. O rótulo das ligações do Mapa é legenda do
desenho, sem clique, e acompanha a escala do grafo de propósito: some junto
quando a pessoa se afasta pra ver a topologia. Alvo é outra coisa, ele responde
ao dedo e por isso mede em pixel de tela sempre.

## Por quê

A regra que sai daqui vale além do canvas: **quando um componente de terceiro
coloca conteúdo nosso dentro de um plano transformado, a nossa escala deixa de
valer ali.** Nenhuma trava de CSS pega isso, porque o CSS está correto. Só
medição no navegador pega, e é por isso que ela é parte do trabalho, não uma
conferência opcional no fim.
