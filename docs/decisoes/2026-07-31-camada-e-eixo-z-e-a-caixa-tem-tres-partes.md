# Camada é eixo Z, e a caixa tem três partes

## Contexto

Editando o carrossel "os jovens já aprenderam a usar a" no workspace da Mãe
Pixel, o Jesse encontrou três coisas, e elas tinham uma causa só: **o painel de
camadas tratava ordem no DOM como se fosse empilhamento.**

1. As setas do painel moviam o texto no **eixo Y da página**, quando deviam
   mexer só em quem pinta por cima.
2. A caixa com fundo blur atrás dos textos não saía. Apagar ela apagava os
   textos junto, e o Ajustar com IA também não resolvia.
3. As setas eram um controle de um passo por vez, onde o gesto natural é
   arrastar.

## A causa, medida

`moverCamada` trocava os dois nós de lugar no DOM. No slide 2:

- Os filhos de `.slide` (`.bimg`, `.scrim`, `.cnt`, `.wrap`, `.handle`) são
  todos `position: absolute`. Trocar no DOM só muda quem pinta por cima. A seta
  funcionava.
- Os filhos de `.wrap` são itens de fluxo, porque `.wrap` é
  `display: flex; flex-direction: column`. Trocar no DOM **reordena a coluna**.
  O texto anda na página.

Não era aleatório: era sistemático no nível 1 do painel.

E `.page .wrap` é **três coisas ao mesmo tempo**: a caixa
(`position: absolute; inset: 140px 70px 120px`), o layout (`flex`, `padding`) e
a pele (`background`, `border`, `backdrop-filter: blur(10px)`, `box-shadow`).
Os textos são filhos dela. O editor só tinha `el.remove()`, que leva as três
mais os filhos.

## Decisão 1: reordenar tem dois significados, e o painel declara qual

```ts
export type ModoCamadas = "empilhamento" | "fluxo";
```

- **Carrossel e Studio: `empilhamento`.** A página é tela fixa. Reordenar
  reescreve `z-index` e **nunca** toca na ordem do DOM.
- **Site: `fluxo`.** A página é documento que corre. Reordenar muda a ordem no
  DOM, e **isso lá está certo**: "subir" quer dizer "vir antes na página".

Sem essa distinção declarada qualquer conserto vira remendo: era a mesma função
servindo a dois donos com expectativas opostas.

A aritmética saiu pra `editor/camadas.ts`, sem DOM, com treze testes. Ordem de
lista errada foi exatamente o defeito desta rodada, e ela agora é aritmética
testável.

Duas escolhas dentro dela:

- **A escala é reescrita inteira, não permutada entre os envolvidos.** Permutar
  só funciona quando os valores do template já são distintos, e no caso real
  não são: dentro do `.wrap` todo mundo é `auto`, que lê 0.
- **`z-index` nunca fica negativo.** Filho com z negativo pinta atrás do fundo
  do próprio pai, e num contêiner com fundo e blur o texto sumiria. É um bug
  que só apareceria depois de salvo.

Pra reescrever a escala com segurança o pai precisa fechar o empilhamento, e o
`.slide` não fecha (`position: relative` com `z-index: auto`). Ele ganha
`isolation: isolate`.

**O risco foi medido, não presumido.** `isolation: isolate` num ancestral
podia mudar o Backdrop Root e portanto o que o `backdrop-filter` do `.wrap`
enxerga. Foto do slide antes e depois: os dois PNG saíram **byte a byte
idênticos**. E renumerar os filhos do `.wrap` mudou 16 pixels em 1,4 milhão
(0,001%, delta máximo 7), que é ruído de antialiasing.

## Decisão 2: uma primitiva, três ações

A caixa é pele, layout e pai. Cada ação ataca uma parte, e as três moram no
painel de propriedades e não na lista de camadas, porque **pele de contêiner é
propriedade do contêiner, não uma camada separada.**

- **Limpar o fundo** zera fundo, blur e sombra. O fio some **pela cor, nunca
  pela largura**: `border: 0` tira um pixel de cada lado e empurra o conteúdo.
  A primeira versão fazia isso e a prova pegou, os três textos andavam 1px.
  Reversível, e o marcador é `data-vk-sem-pele`, que sobrevive ao salvar: com
  prefixo `data-ed` o serializador limparia e não haveria como devolver.
- **Soltar do bloco** tira um elemento do contêiner sem ele sair do lugar na
  tela.
- **Desagrupar** dissolve o contêiner e os filhos ficam onde estavam.

As duas últimas nascem da mesma primitiva: medir o retângulo, mover, recolocar
em coordenada absoluta.

**A medição e a aplicação são separadas.** Ao tirar um filho de uma coluna
flex, os que ficam se reacomodam na hora. A primeira versão media e movia um de
cada vez, e do segundo em diante a medida já era a do layout reacomodado: os
três textos do slide 2 caíram em 213, 213 e 243 em vez de 213, 482 e 751. A
prova pegou isso também.

**Trade-off declarado:** o elemento sai do fluxo e passa a ter posição
congelada. Ganha controle manual, perde o rearranjo automático da coluna. Numa
peça de carrossel, que é tela de tamanho fixo, é a troca certa. Num site não
seria, e por isso a primitiva não existe no `motorSite`.

## Decisão 3: a alça, e o teclado que fica

As setas saíram. No lugar entrou a grade de pontinhos na borda do cartão, com
Pointer Events e não drag-and-drop nativo: o nativo não funciona em toque e não
dá controle sobre o marcador de destino.

**A alça é botão de verdade, focável.** Arrasto não existe pro teclado, então
no espaço ela entra em modo de mover e as setas passam a valer, Enter confirma,
Esc cancela. Era só nisso que as setas antigas ainda tinham razão, e isso
ficou.

## Provado no carrossel real

- **73 elementos medidos, 0 mudaram de geometria** ao reordenar uma camada.
  Essa é a condição de aceite do que o Jesse relatou.
- Limpar o fundo: blur, fundo e sombra saem, o fio continua ocupando 1px, os
  três textos ficam em `139,213,802`, `139,482,700` e `139,751,802`. Idênticos.
- Devolver o fundo restaura tudo.
- Desagrupar: o `.wrap` some, os três textos sobrevivem, **nas mesmas
  coordenadas**.
- O arquivo do Jesse não foi tocado: o Studio só grava no Salvar, conferido por
  diff contra a cópia de antes.

## Decisão 4: a árvore não tem teto (mesma rodada, achado depois)

Testando o slide 7 do mesmo carrossel, o Jesse encontrou o resto: **bloco
dentro de bloco não mostrava o que tinha dentro.** Os quatro textos só
apareciam depois de tirar o bloco de dentro do outro.

O `.card` daquele slide guarda um `div` anônimo, e os textos moram dentro DELE.
Nível 2. E o painel parava no nível 1, por herança do plano de 2026-07-20:
*"dois níveis bastam pra anatomia dos templates"*. Não bastavam.

O teto estava em três lugares, e os três caíram:

- `listarCamadas` era um laço com um `if` de um nível. Virou descida
  recursiva, com teto de 12 que existe só pra HTML patológico não gerar lista
  infinita. Template real chega a três.
- `calcularDestinos` decidia o pai por `nivel === 1`. Passou a usar `paiId`,
  que é a árvore de verdade. **Amarrar a regra ao número do nível foi
  exatamente o que cegou o bloco aninhado**, e agora um teste prova que duas
  listas com os mesmos pais e níveis diferentes dão o mesmo resultado.
- O recuo eram duas classes de CSS, uma por nível, e isso *era* o teto: a
  lista mostrava dois níveis porque só existiam duas classes. Virou
  `--nivel` por variável. O recuo para de crescer no quinto degrau, porque aí
  a linha ficaria sem largura útil, mas o nível continua inteiro nos dados:
  **o teto é de desenho, nunca de árvore.**

Duas ações ficaram mais granulares junto, porque com profundidade qualquer
pular direto pro slide atravessaria níveis que a pessoa nem viu:

- **Soltar do bloco** sobe UM degrau, e não direto pro slide. Clicando de novo
  continua subindo.
- **Desagrupar** promove os filhos pro lugar onde a caixa estava.

Provado no slide 7: os quatro textos aparecem no nível 2 com recuo de 24px,
têm alça de arrasto, e reordenar lá dentro muda **0 elementos de geometria**.

## Por quê

A lição não é sobre z-index: **um controle que serve a duas telas com modelos
de layout diferentes precisa declarar em qual modelo está.** O painel era
compartilhado por três telas e dois motores, e o significado de "reordenar"
ficou implícito. Implícito, ele virou o significado errado numa das duas.

E a segunda, que veio do teto de níveis: **estrutura de árvore não se codifica
em número de nível.** Nível é recuo, é desenho. Quem é filho de quem é `paiId`.
Toda vez que a regra olhou pro número em vez de olhar pro pai, ela ficou cega
um degrau abaixo.
