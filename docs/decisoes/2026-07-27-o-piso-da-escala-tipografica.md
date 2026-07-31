# O piso da escala tipográfica é 11px, e agora tem trava

## Contexto

A escala tipográfica fechou em sete degraus, de `--txt-micro` (11px) a
`--txt-display` (28px). O `escalas.test.ts` já travava que os tokens existem, que
a entrelinha é px absoluto e par, e que a camada de tema não redeclara nenhum
deles.

Numa varredura de responsividade em doze telas e sete tamanhos, apareceu texto
renderizado a 9px e a 10px em toda tela. Contando na fonte: **50 declarações de
`font-size` abaixo de 11px, espalhadas por 15 folhas de estilo.** O `mapa.css`
tinha 11, o `crm.css` 8, o `visual-hub.css` 7.

A escala estava fechada. As folhas simplesmente não usavam ela.

## Decisão

Nenhuma folha declara `font-size` abaixo de 11px. As 50 subiram para
`var(--txt-micro)`.

O `escalas.test.ts` ganhou a trava: ele lê todas as folhas da pasta, procura
`font-size` em px cru, e reprova nomeando arquivo e valor. Provado com mutação:
devolvendo um 9px ao `crm.css`, o teste reprova com
`crm.css: font-size: 9px`.

## Por quê

O piso não é gosto. Quase todo uso desse tamanho aqui é rótulo em caixa alta com
`letter-spacing`, que é justamente a combinação que fica ilegível primeiro
quando encolhe. Num notebook comum, 9px em caixa alta com espaçamento de letra
vira textura, não texto.

E a trava importa mais que o conserto. Sem ela, o próximo componente nasce com
10px porque o de cima tinha 10px, e em três meses a escala fechada vira
documento sobre um app que não a segue. Foi exatamente o que aconteceu entre a
rodada do design system e esta.

A trava é de piso, não de escala inteira. Ela não exige que todo `font-size` seja
um degrau: exigir isso agora reprovaria dezenas de valores intermediários
legítimos e a rodada nunca fecharia. O piso é a parte que tem consequência
medível para quem lê a tela.
