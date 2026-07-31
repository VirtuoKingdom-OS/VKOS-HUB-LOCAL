# A grade do canvas vem do React Flow, e não do background do elemento

## Contexto

A fundação v2 (`docs/planos/redesign-v2/00-fundacao.md`, seção 8) receita o
plano do grafo assim: `.area-canvas` pinta `--canvas-fundo` e desenha a grade
de pontos num `radial-gradient` do próprio background, com gap de 20px.

Ao migrar os dois canvas do app na Onda B da Fase 2, medimos no navegador o que
acontece de verdade. Três achados:

1. Cockpit e Mapa já montam o componente `<Background>` do React Flow, e ele
   desenha a grade dentro do `<svg>` da viewport, acompanhando o pan e o zoom.
2. O React Flow v12 aceita `color="var(--pontos-canvas)"`: ele repassa o valor
   para a custom property `--xy-background-pattern-color-props`, e o `circle`
   do padrão resolve para o token. Conferido: `fill` sai `rgb(203, 208, 214)`
   no Claro e `rgb(38, 43, 51)` no Escuro.
3. Com as duas grades ligadas ao mesmo tempo, a do elemento fica parada e a do
   React Flow se move junto com o zoom. Em qualquer zoom diferente de 1 as duas
   se desencontram e o canvas ganha moiré, que é exatamente o tipo de ruído que
   o plano de fundo não pode ter.

## Decisão

O plano do grafo fica LISO no CSS (`background: var(--canvas-fundo)`), e a
grade vem do `<Background variant={Dots} gap={20} size={1}
color="var(--pontos-canvas)" />`, tanto no Cockpit quanto nas duas visões do
Mapa. O `radial-gradient` da receita não é usado.

Junto com ela, três regras do `estilos/legado.css` que ainda vencem a folha do
canvas (`.area-canvas`, `.react-flow__controls-button` e `.no-sessao .cabeca`)
foram contornadas com um nível a mais de especificidade, com comentário em cada
uma. Elas empatavam em especificidade e o legado é importado depois, na mesma
camada: medido, o canvas renderizava `--fundo` no lugar de `--canvas-fundo`. A
exceção morre quando o `legado.css` zerar.

## Por quê

Grade que não acompanha o zoom deixa de ser referência espacial: ela vira uma
textura colada na tela, e a distância entre os pontos passa a mentir sobre a
distância entre os nós. A do React Flow é a única que diz a verdade sobre o
espaço do grafo, e ela já estava lá.

E porque uma grade só. Duas fontes para o mesmo desenho é o começo de dois
cinzas diferentes de ponto, que foi exatamente o que separou o Cockpit do Mapa
antes da fundação existir.
