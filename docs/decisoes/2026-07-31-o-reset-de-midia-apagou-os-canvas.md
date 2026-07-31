# O reset de mídia apagou os dois canvas

## Contexto

Depois do redesign v2, o Jesse relatou que o Cockpit estava "tudo desconectado":
nem o fluxo de carrossel aparecia ligado ao contêiner que agrupa os carrosséis.

A investigação passou por dois diagnósticos errados antes do certo, e vale
registrar os dois porque eles são armadilhas de método:

1. **Primeiro erro: culpar o contraste.** As arestas de contexto e de contêiner
   estavam em `--linha-forte` a 1,4px, que dá 3,5:1 no canvas claro. Isso era
   verdade e foi corrigido, mas não era a causa: mesmo com stroke vermelho de
   10px injetado no navegador, nada aparecia.
2. **Segundo erro: acreditar na medição de estilo.** `getComputedStyle` dizia
   `stroke` visível, `opacity: 1`, `visibility: visible`, e `elementsFromPoint`
   encontrava o path no meio do trajeto. Tudo indicava que a aresta estava
   pintada. Ela não estava.

## A causa

O reset de mídia do `global.css`:

```css
img, svg, video, canvas { display: block; max-width: 100%; }
```

O React Flow desenha cada aresta num `<svg>` sem `width`, filho de um
`<div class="react-flow__edges">` que é `position: absolute` e por isso tem
largura **zero de propósito**: a aresta escapa pelo `overflow: visible`, em
coordenadas de canvas.

Com `svg` naquele seletor, o `max-width: 100%` virava 100% de zero. O svg ficava
com 0 de largura e o navegador não pintava nenhum descendente. As arestas
continuavam existindo no DOM, com geometria correta e respondendo ao hit-test.
Nada no console, nada em teste, nada na medição de estilo.

## Decisão

`svg` sai do reset de mídia. Imagem, vídeo e canvas continuam contidos pela
coluna; svg cuida do próprio tamanho.

Junto, três correções de legibilidade que a investigação expôs:

- As arestas de contexto e de contêiner passaram de `--linha-forte` a 1,4px para
  `--ligacao` a 2px. A diferença entre elas é o tracejado, não a fraqueza:
  hierarquia por apagamento só funciona enquanto o degrau de baixo ainda é
  visível.
- `--ligacao` subiu um degrau nos dois temas (4,6:1 no Claro, 5,1:1 no Escuro).
- Toda aresta ganhou `vector-effect: non-scaling-stroke`. A espessura passou a
  ser em pixel de tela, não em unidade de canvas: antes a linha afinava junto
  com o zoom, e é justamente afastado que se olha a topologia inteira.

## A trava

`estilos/camadas.test.ts` ganhou um teste que reprova qualquer folha que ponha
`svg` no seletor de elemento junto com limite de largura. Conferido apagando o
conserto: sem ele, o teste falha.

Regra escrita não teria segurado isto. O sintoma não apontava para o reset, e
ninguém revisando o reset imaginaria que ele alcança um `<svg>` de biblioteca de
terceiro com largura zero por contrato.

## Por quê

Vale além deste caso: **reset de elemento alcança o DOM de biblioteca de
terceiro**, e biblioteca de canvas usa geometria que parece degenerada de
propósito (largura zero, overflow visível, coordenadas fora da viewport). O
mesmo raciocínio se aplica a qualquer regra de elemento nu que o app declare
daqui pra frente.
