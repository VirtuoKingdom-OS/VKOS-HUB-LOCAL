# A textura do canvas, e a profundidade que não vem de sombra

> **Emenda, mais tarde no mesmo dia.** Duas correções depois que o Jesse viu a
> tela. O canvas do Escuro voltou de #050505 para **#0a0a0a**: o rgb(10,10,10)
> era pedido, não sugestão. E a textura saiu do `body::before` fixo, que vazava
> pontos por toda superfície translúcida (a barra lateral inteira ficou
> pontilhada): ela agora pinta o background do próprio `.tela-core`, o plano
> mais ao fundo, com a grade em #111111, quase invisível. No Claro a textura
> foi desligada por completo (`--pontos-fundo: transparent`, `--grao: none`),
> porque ponto escuro sobre papel lia como sujeira. As seções abaixo sobre
> #050505 e sobre o pseudo-elemento ficam como registro do que não funcionou.

## Contexto

O Jesse apontou dois problemas olhando o Dashboard no tema Escuro: falta de
profundidade, e um elemento que não parecia clicável. As palavras dele: "nem
parece que eu posso clicar nesse Meu Negócio aberto".

Ele estava certo, e a causa era literal. A `.core-linha` era
`background: transparent` com borda transparente: ela só existia visualmente
quando o mouse chegava em cima. Quem olhava a tela parada não tinha como saber
que aquilo abria alguma coisa.

Pediu também um fundo mais escuro, com vidro fosco, grão e grade pontilhada bem
sutil.

## Decisão

**O canvas do Escuro desceu de `#0a0a0a` para `#050505`.** O degrau até o cartão
passou de 1,075 para 1,106. Preto puro ficou de fora de propósito: em OLED ele
apaga o pixel e a borda do cartão passa a flutuar no escuro absoluto, sem plano
de fundo para se apoiar.

**O canvas do Claro NÃO acompanhou.** Foi testado em `#e8efeb` e derruba a
`--linha-forte` para 2,99:1 e o rótulo de grupo para 4,47:1, os dois abaixo do
mínimo. E o Claro é papel sobre luz do dia: afundar o canvas contraria a própria
identidade.

**Duas camadas de textura**, num `body::before` fixo: uma grade de pontos e um
grão. O grão é SVG com `feTurbulence` embutido em data URI, sem imagem para
baixar. A intensidade mora na cor, nunca num `opacity` no elemento, que abriria
um degrau fora da escala.

A grade do fundo ganhou token próprio, `--pontos-fundo`, bem mais fraco que o
`--pontos-canvas` do cockpit. São trabalhos diferentes: no cockpit a grade
orienta o arrasto e precisa ser vista; aqui é textura atrás de tela de leitura, e
se for notada virou padronagem.

**O cartão do Dashboard virou vidro fosco**, com `backdrop-filter` e fundo com
alfa, então a textura atravessa de leve. Sob `@supports`: quem não tem o filtro
recebe a superfície sólida, que é o desenho de antes e continua correto.

**A linha clicável nasce como superfície**, com fio, uma seta à direita e 2px de
deslocamento no hover. O hover agora reforça o que já estava anunciado, em vez de
ser a única prova de que o elemento existe.

## Por quê

O `CLAUDE.md` diz que a profundidade vem da escada de superfície e nunca de
sombra. A textura não contraria isso, completa: a escada dá os degraus, e o grão
dá matéria ao degrau mais baixo, para o cartão ter sobre o que se apoiar em vez
de flutuar num vazio chapado. Nenhuma sombra entrou.

O caso da `.core-linha` é o mais importante da rodada, e não era estético. Um
alvo que só se anuncia no hover não existe para quem navega por teclado, para
quem usa toque, e para quem simplesmente não passou o mouse por ali. O item mais
clicado do Dashboard estava invisível como alvo.

## O que a conferência visual pegou

O `.core-ver-todos` media 16px de altura, abaixo dos 24px do critério 2.5.8. O
defeito já existia e passava despercebido com um botão só; com quatro na tela, a
ferramenta reprovou. Corrigido com `min-height` e padding lateral negativo, que
mantém o rótulo alinhado sem encolher o alvo.
