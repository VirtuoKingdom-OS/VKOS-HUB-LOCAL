# A tela nunca entra transparente

## Contexto

O Jesse relatou que a cada troca de tela aparecia por um instante, no fundo, o
cockpit do Cérebro. O relato veio com a palavra "ainda": já tinha havido uma
tentativa de conserto antes, com `flushSync` na navegação, e o comentário no
código falava do "fantasma na saída do cockpit".

A camada do cockpit fica sempre montada, pra preservar o canvas e o streaming, e
ganhava `visibility: hidden` quando outra tela estava ativa. Medindo quadro a
quadro em navegador de verdade, esse estado estava sempre correto: em nenhuma
amostra o cockpit apareceu visível com outra tela montada.

O que apareceu foi outra coisa. Toda tela de tela cheia entrava com
`animation: entrada-suave 220ms`, e esse keyframe começa em `opacity: 0`. Com a
CPU estrangulada em 6 vezes, a condição de um notebook, a medição deu:

    cockpit -> Dashboard: 5 quadros translúcidos, janela de 209ms
    +   0ms  opacidade 0.00
    + 185ms  opacidade 0.16
    + 195ms  opacidade 0.91

Ou seja: por quase um quinto de segundo, a pessoa estava olhando **através** da
tela nova. E o que estava atrás era a camada do cockpit.

## Decisão

Três mudanças, cada uma correta sozinha, que juntas fecham o caso.

1. **Tela de tela cheia não entra com fade.** `.tela-core`, `.tela-dashboard`,
   `.tela-fluxo`, `.tela-site` e `.tela-studio` aparecem inteiras e opacas no
   primeiro quadro. O movimento não sumiu: mudou pro conteúdo, que já se apoia
   numa superfície pintada. `.core-scroll` e `.dashboard-scroll` entram com
   180ms.

2. **A área de conteúdo tem fundo próprio.** `.shell-conteudo` ganhou
   `background: var(--fundo)`. Qualquer tela que apareça com um quadro de
   atraso mostra a superfície do app, nunca o que estava embaixo.

3. **O cockpit sai da árvore de desenho.** `.camada-cockpit.oculta` passou a
   ter `content-visibility: hidden` junto com `visibility: hidden`. O
   `visibility` tira do clique e do leitor de tela; o `content-visibility` tira
   do desenho.

Medido depois: zero quadros translúcidos nas quatro transições testadas, e o
cockpit em `hidden/hidden` desde o primeiro quadro.

## Por quê

Fade de entrada em elemento de tela cheia é uma armadilha específica: enquanto
ele fecha, o elemento é uma janela pro que está atrás. Num cartão isso é bonito,
porque atrás dele tem a superfície da tela. Numa tela inteira, atrás dela tem a
tela anterior.

E fade é o tipo de coisa que só falha na máquina do usuário. Numa máquina
rápida os 220ms passam lisos e ninguém vê nada. Numa máquina ocupada a animação
trava, salta de 0.16 pra 0.91, e o que era transição vira piscada.

`content-visibility` em vez de `display: none` foi escolha, não acaso.
`display: none` zera a caixa do elemento, e o React Flow remede pelo
ResizeObserver: voltar ao cockpit poderia refazer o enquadramento. Conferido
depois da mudança, indo pra três telas e voltando: mesmos nós, mesma medida, e o
`transform` do viewport idêntico até a sexta casa decimal. O zoom e a posição do
canvas sobrevivem.
