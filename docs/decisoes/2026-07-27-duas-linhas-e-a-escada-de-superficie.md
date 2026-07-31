# Duas linhas, e a profundidade vem da escada de superfície

## Contexto

Duas medições da rodada de design system, feitas no código, não estimadas:

1. A borda de campo falhava nos três temas. `--borda` sobre `--superficie` dava 1,55:1 no Escuro, 1,87:1 no Dark VKOS e 1,68:1 no Claro. O critério 1.4.11 do WCAG 2.2 exige 3:1 onde a borda é o único indicador de um controle, e o campo de texto do Hub é exatamente esse caso. Nenhum dos três chegava perto.

   A causa é simples: `--borda` fazia dois trabalhos. Era a divisória de cartão e era o contorno de campo. Como divisória, ela precisa ser discreta, então alguém escolheu discreta, e o campo pagou.

2. O app tinha 117 sombras distintas em 203 declarações. Não era escala de elevação, eram 117 decisões independentes.

## Decisão

**A borda vira dois tokens com nome que não deixa confundir.**

- `--linha`: separador, borda de cartão, divisória. Sutil de propósito, perto de 1,3:1. Não precisa passar em nada.
- `--linha-forte`: borda de campo, de botão neutro, de trilho de interruptor, de caixa de seleção. Obrigada a 3:1 contra a superfície em que se apoia.

Medido: `--linha-forte` sobre `--superficie` dá 3,01:1 no Escuro, 3,02:1 no Dark VKOS e 3,43:1 no Claro.

Sim, o contorno de campo ficou menos macio que antes. É o preço de o campo parecer um campo. "Contraste confortável, nunca extremo" continua valendo na superfície e no texto, que é onde o olho descansa. No controle, não.

**A profundidade sai da escada de superfície, não de sombra.**

Quatro degraus sólidos, um por nível, mais o fio de `--linha`:

| Nível | Token | O que fica aqui |
|---|---|---|
| 0 | `--fundo` | a área de trabalho, o canvas |
| 1 | `--superficie` | sidebar, cartão, painel, barra de topo |
| 2 | `--superficie-alta` | hover de linha, item selecionado, campo, cabeçalho de coluna |
| 3 | `--superficie-flutuante` | popover, menu, modal, elemento arrastado |

A sombra só entra onde o elemento flutua de verdade sobre outro conteúdo, e são três: `--sombra-popover`, `--sombra-modal` e `--sombra-arrasto`.

Aplicado: 83 sombras removidas, 33 trocadas por um dos três tokens, 84 mantidas. As mantidas são anel puro (`0 0 0 Npx`), sombra interna, ou anel de foco: nenhuma delas é elevação, todas carregam informação. Junto saíram 30 `transform: translateY(-1px)` de hover de cartão.

Um teste em `app/web/src/estilos/contraste.test.ts` calcula a razão de 16 pares críticos nos três temas e falha se algum descer do mínimo. São 48 verificações. A paleta antiga falhava em 13. Esta falha em zero.

## Por quê

O contraste não é detalhe de conformidade. O estudo de eyetracking do NN/g com 71 participantes mediu 22% mais tempo e 25% mais fixações na mesma tarefa quando o sinalizador é fraco, com p < 0,05. A conclusão deles é precisa: o problema não é a pessoa nunca ver o campo, é ver e não ter certeza de que aquilo é um campo, então continuar procurando. Num app usado horas por dia, isso é o custo mais caro que existe.

Sobre a sombra, a Apple diz literalmente que o material "cria sensação de profundidade deixando a cor do fundo atravessar", e no modo escuro o sistema usa dois conjuntos de fundo, base e elevated, com o elevado mais claro para parecer que avança. Linear e Raycast fazem o mesmo e não usam sombra nenhuma em cartão: escada de superfície mais um fio de 1px.

E tem o motivo prático: sombra em 240 elementos numa tela com canvas React Flow animando ao lado é custo de quadro por decoração. Cor sólida não custa nada.

Medir no olho não vale. Foi assim que o tema Claro chegou a um botão principal com 3,69:1 no rótulo. Por isso a trava é um teste, não uma revisão.
