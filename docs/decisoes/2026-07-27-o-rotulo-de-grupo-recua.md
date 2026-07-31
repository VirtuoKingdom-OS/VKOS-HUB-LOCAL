# O rótulo de grupo recua, e o tracking abre em vez de fechar

> **Emenda, mais tarde no mesmo dia.** A calibragem em 4,69:1 não bastou: o
> Jesse pediu mais recuo pela segunda vez. O rótulo desceu ao patamar de
> contorno, 3,17:1 no Claro (#7c8c84) e 3,11:1 no Escuro (#646464), e o par
> dele no `contraste.test.ts` passou a exigir 3:1 em vez de 4,5:1. É o ÚNICO
> texto autorizado abaixo do mínimo de texto, porque é etiqueta redundante de
> grupo: quem não a lê continua lendo os próprios itens do menu. Nenhum outro
> token pode citar esse par como precedente, e abaixo de 3:1 continua
> reprovando. O restante do documento vale como registro do caminho.

## Contexto

Os grupos da barra do CORE nasceram com o rótulo em 11px, peso 700 e tracking
0,12em, na cor `--texto-fraco`. O Jesse disse que estavam grandes demais e com a
mesma densidade dos itens de menu, o que deixava o visual ruim.

A primeira tentativa baixou o peso para 500 e **fechou** o tracking para 0,06em,
achando que compactar encolhia a palavra. Ele reclamou de novo, e com razão.

Duas coisas estavam erradas.

**O tracking fechado piorou.** Em caixa alta, juntar as letras adensa a mancha e
transforma a palavra num bloco sólido. É justamente o bloco que competia com o
item de menu. Espalhado, o mesmo texto dilui e recua.

**A cor mal se distinguia.** O rótulo usava `--texto-fraco` (5,46:1 no Claro) e o
item de menu usa `--texto-suave` (7,87:1). Perto demais para separar dois níveis
de hierarquia.

## Decisão

Um token próprio, `--texto-rotulo`, e os três canais puxados juntos:

| canal | rótulo | item de menu |
| --- | --- | --- |
| tamanho | 11px, o piso da escala | 14px |
| peso | 400 | 600 |
| contraste | 4,69:1 | 7,87:1 |
| tracking | 0,14em, arejado | normal |

O tamanho não desce porque 11px é o piso, e o piso existe exatamente por causa
deste caso: abaixo disso, rótulo em caixa alta com tracking para de ser legível
em notebook comum.

O token é calibrado pelo **pior fundo em que o rótulo aparece**, que não é o
cartão branco da barra. A classe `.rotulo-secao` também veste o painel de peças,
que se apoia no canvas (`rgba(--fundo-rgb, 0.94)`), e ali sobra menos contraste.
Calibrar pelo cartão teria deixado o painel em 4,18:1.

Os dois pares entraram no `contraste.test.ts`, que passou de 19 para 21.

## Por quê

O token nasceu colado no mínimo de propósito: o pedido era recuar o máximo
possível, então não há folga, e clarear mais um passo reprova no teste. É esse o
ponto de travar o par em vez de confiar na disciplina.

Opacidade continua fora, e não por preguiça: foi medida. `--texto-fraco` a 0.5 dá
2,07:1 no Claro, e mesmo a 0.72 para em 3,06:1, contra os 4,5:1 do critério
1.4.3. Pior, a trava de cor não perceberia, porque mede o token e não a
composição com o fundo. O recuo veio da cor, que passa pela trava, e a opacidade
ficou no fio ao lado, que é decoração e não carrega informação nenhuma.

O erro do tracking vale registrar porque é contraintuitivo e voltaria: parece que
apertar as letras diminui o rótulo, e em caixa alta faz o oposto.
