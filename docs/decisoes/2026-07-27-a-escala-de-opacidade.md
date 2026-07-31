# A escala de opacidade, e por que ela não encosta em texto

## Contexto

O Jesse pediu separadores mais sutis e disse a frase que abriu esta rodada: que
a opacidade é uma das coisas que deixam a UI carregada e pouco profissional, e
que era pra ter hierarquia de opacidade.

Medido antes de mexer em qualquer coisa: **68 declarações de opacidade em 12
folhas, com 26 valores distintos**. 0.45, 0.46, 0.48, 0.5, 0.52, 0.55, 0.58,
0.6, 0.62, 0.68, 0.7, 0.72, 0.75. Nos `rgba()` a situação era pior, 60 valores
de alpha diferentes.

Opacidade era o único eixo do design system sem escala. Espaçamento tem 8
degraus travados, tipografia 7, peso 4, raio 5, movimento 5, empilhamento 7.
Opacidade tinha 26 valores que ninguém escolheu de propósito: cada tela inventou
o seu.

## Decisão

**Cinco degraus, na camada base, com trava em `escalas.test.ts`.**

| token | valor | para quê |
| --- | --- | --- |
| `--op-plena` | 1 | normal |
| `--op-secundaria` | 0.72 | apoio |
| `--op-fraca` | 0.5 | recuado |
| `--op-apagada` | 0.32 | desabilitado, decoração |
| `--op-fantasma` | 0.16 | fora de foco em canvas denso |

As 59 ocorrências migraram pro degrau mais próximo, o que manteve a mudança
visual quase nula. `0` e `1` continuam livres, e dentro de `@keyframes` a
opacidade é trajetória de animação, não hierarquia, então fica de fora da trava.

O quinto degrau não estava no plano e entrou por um uso real: no Mapa, atenuar
ligação fora de foco em 0.32 ainda deixa uma malha que compete com a rota em
destaque. Escala serve ao produto, não o contrário.

**E a regra que custou a medição: opacidade não encosta em texto.**

Ela tem trava própria, porque o `contraste.test.ts` não pega esse caso. Ele mede
token contra token e não vê o que a composição com o fundo faz depois.

Medido no Claro, `--texto-fraco` #5d6d66 sobre branco:

| opacidade | contraste | veredito |
| --- | --- | --- |
| 1.00 | 5,46:1 | passa |
| 0.72 | 3,06:1 | reprova para texto |
| 0.50 | 2,07:1 | reprova |
| 0.32 | 1,56:1 | reprova |

Nenhum degrau é seguro sobre texto. Quando um rótulo precisa ficar mais
discreto, os canais são peso, tracking e token de cor mais fraco, que passam
pela trava de contraste. Opacidade fica para decoração e para elemento inteiro
fora de foco.

A trava isenta seletor de ícone e `svg`: um SVG pinta o traço com `color` via
`currentColor`, então cai no mesmo padrão do texto sem ser texto. Ícone
decorativo de estado vazio vem sempre acompanhado da frase que explica o estado,
então atenuar ele não tira informação de ninguém.

## Por quê

Vinte e seis níveis não são hierarquia. A pessoa consegue ler três ou quatro
graus de importância numa tela; com vinte e seis, o que deveria ranquear vira
ruído uniforme, e o resultado é a interface parecer carregada sem que se consiga
apontar o culpado. Era exatamente o sintoma que o Jesse descreveu.

A trava sobre texto foi escrita depois de eu mesmo cometer o erro nesta rodada:
apliquei `--op-fraca` no rótulo dos separadores, que é o que tinha sido pedido, e
só descobri o 2,07:1 ao medir. Se dependesse de disciplina, voltaria. Ela já
pagou o custo na primeira execução: pegou dois casos antigos, o rótulo "Versão
Beta" e a contagem de token de cache, os dois em 3,06:1 havia meses. Um aviso de
versão instável e um número de gasto que ninguém conseguia ler direito.
