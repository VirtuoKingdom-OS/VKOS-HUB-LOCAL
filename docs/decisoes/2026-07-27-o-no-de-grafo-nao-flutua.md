# O nó de grafo não flutua, o que está por cima dele sim

## Contexto

A regra 1 do `06-ajuste-fino-das-telas.md` diz que sombra só existe onde o
elemento flutua de verdade sobre outro conteúdo, e que são três tokens:
`--sombra-popover`, `--sombra-modal` e `--sombra-arrasto`.

No Mapa a regra dá um nó. Um cartão de nó dentro de um canvas do React Flow
parece flutuar: ele fica por cima de um plano contínuo, se move quando a pessoa
arrasta o canvas, e as ligações passam por baixo dele. A pergunta é honesta, e
ela vai voltar em toda tela com canvas: o Cockpit, o Studio, o editor de site.

Na varredura de 2026-07-27 o `mapa.css` tinha 6 declarações de `box-shadow`.
Nenhuma delas era profundidade. Quatro eram anel de 0px de desfoque, ou seja,
uma segunda borda fingindo espessura de 2px: no ponto de conexão do nó, no chip
de skill ligado e no nó que participa de uma rota. As outras duas eram só a
palavra `box-shadow` dentro de um `transition` que não animava sombra nenhuma.

## Decisão

**O nó de grafo não leva sombra. Ele é o conteúdo do canvas, e não algo por
cima do canvas.**

A separação dele vem da escada de superfície, igual à de qualquer cartão de
lista: `--fundo` no canvas, `--superficie` no cartão, mais o fio de `--linha` e
o fio de 3px na cor do grupo. É a mesma profundidade de um cartão de workspace
dentro do Dashboard, e por um motivo simples: nos dois casos o cartão é a
matéria da tela, não uma camada acima dela.

**O que está POR CIMA do canvas leva `--sombra-popover`.** No Mapa são três, e
os três são a mesma categoria de coisa: a barra de skills, a legenda dos grupos
e os controles de zoom. Eles não pertencem ao grafo, ficam ancorados na
viewport, cobrem nós de verdade e continuam no lugar quando a pessoa arrasta o
canvas por baixo. Esses flutuam.

A régua que vale pra qualquer tela com canvas: **flutua o que fica parado
enquanto o canvas se move.** Se o elemento acompanha o pan e o zoom, ele é
conteúdo e ganha superfície. Se ele fica ancorado na tela, é camada e ganha
sombra.

**Anel de 0px de desfoque não é exceção.** A exceção do contrato é
`box-shadow: inset` usado como fio, porque fio não ocupa caixa. Um anel externo
somado a uma `border` já existente é só uma borda de 2px escrita em duas
propriedades, e o certo é decidir a espessura na borda.

## Por quê

Porque sem uma régua a pergunta se responde por gosto, e por gosto todo mundo
responde "sim, parece flutuar". Foi assim que o app chegou a 117 sombras
distintas: cada tela decidiu sozinha o que era profundidade.

E porque a resposta muda o resultado na tela. O Mapa tem vinte nós visíveis ao
mesmo tempo. Vinte sombras suaves não leem como vinte planos, leem como sujeira
uniforme, e o que era pra destacar cada nó acaba borrando o canvas inteiro. As
três sombras que sobraram, ao contrário, significam alguma coisa: elas dizem
"isto aqui não faz parte do desenho, é controle".
