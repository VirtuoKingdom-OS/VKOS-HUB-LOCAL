# O Criador de Estilos: a régua muda de lugar, e não de valor

## Contexto

O Hub tinha dois estilos, e os dois eram de fábrica: o Escuro e o Claro,
escritos à mão em `web/src/estilos/visual-hub.css` e travados por
`estilos/contraste.test.ts`. Trocar a cara do app era tarefa de quem edita CSS.

O Jesse pediu poder criar estilo dentro do produto: montar um do zero, colar um
de fora, descrever em palavras ou puxar de uma imagem; ver antes de decidir; e,
ao aprovar, ele passa a valer no Hub inteiro, em todos os workspaces.

**O risco é conhecido e é um só.** Cor escolhida no olho foi como o botão
principal chegou a 3,69:1 no rótulo e a borda de campo a 1,55:1. Foi para isso
que a trava de contraste nasceu, e ela mede **arquivo**: um estilo criado em
execução não passa por trava de build nenhuma.

## Decisão

**A régua muda de lugar sem mudar de valor.**

`server/src/estilos/contraste.ts` é a mesma fórmula do WCAG 2.2, a mesma lista
de pares e os mesmos pisos da trava de fábrica. Ela mora no servidor porque é lá
que se aprova e é lá que se grava; defesa que só existe no cliente é decoração.

A propriedade que fecha o argumento está afirmada em `estilos/regua.test.ts`: **o
Escuro e o Claro de fábrica passam na mesma régua do estilo do dono.** Se ela
for frouxa demais, deixa passar cor ruim; se for rígida demais, reprova o próprio
Escuro e o teste cai. Não há como afrouxar um lado sem quebrar o outro.

### O que um estilo controla, e o que ele não alcança

**Cor e forma.** Os 35 tokens de cor, por tema, e os cinco degraus de raio em
três conjuntos (reto, padrão, redondo). Continuam sendo cinco degraus, então a
proibição 5 segue de pé: o que o estilo troca é o VALOR, num lugar só.

**Fora do alcance, e isso é decisão:** escala de texto, régua de 4px, altura de
controle, movimento, peso, e `--papel`, que é a folha do site do cliente e não
uma superfície do Hub. São eles que seguram a densidade do cockpit, e nenhuma
trava executável cobriria um estilo que os mexesse.

### Um estilo tem sempre os dois lados

O dono edita um, o Hub deriva o outro, e depois ele ajusta o derivado se quiser.
O botão de sol e lua continua fazendo exatamente o que fazia.

A derivação do outro lado **não inverte token a token**: ela espelha as ÂNCORAS e
roda o mesmo motor de novo. Inverter cada token daria um Claro cheio de tinta
clara sobre plano claro, porque o que muda entre os dois lados não é a cor, é a
RELAÇÃO. Os três papéis do carvão atravessam sem mudar: a ilha é escura nos dois
lados, então a tinta dela é a mesma nos dois, como já era de fábrica.

### Quatro cores viram trinta e cinco, e a conta é nossa

As quatro portas de entrada (do zero, colar, imagem, descrever) desembocam todas
no mesmo lugar: de quatro a sete **âncoras**. `derivacao.ts` transforma elas nos
35 tokens, e cada token que carrega informação sai de uma **busca binária na
luminância** até fechar exatamente a razão que o par dele exige. O tema nasce
passando na régua em vez de nascer torto e ser consertado depois.

A busca preserva matiz e saturação e mexe só na luz, porque quem escolheu a cor
escolheu a COR: clarear um roxo continua roxo, e empurrar em direção ao branco em
sRGB não continua.

**A IA nunca escreve os 35 tokens, e o leitor de texto colado também não.** Um
modelo devolvendo trinta e cinco hexes acerta a paleta e erra a relação: ele não
tem como saber que `--texto-fraco` deve 4,5:1 contra os quatro planos, nem que
`--menta-viva` é gráfico e deve 3:1. Sistema de cor coerente é conta, e a parte
de conta não se terceiriza.

### Quando reprova, o Hub conserta

`ajustarAtePassar` move só o token da frente, nunca o plano, pelo menor passo que
fecha o piso, e diz o que mexeu com o antes, o depois e as duas razões. Ele nunca
encosta em token que já passava, e é **idempotente**: sem isso, abrir e salvar o
mesmo estilo duas vezes o faria derivar de si mesmo para sempre, e a cor
escolhida iria embora sozinha, um clique por vez.

Quando a paleta não fecha nem assim (acontece com os quatro planos espalhados de
ponta a ponta da escala), ele **desiste em voz alta**, com o par e o número.
Inventar uma cor que passa seria mentir sobre um estilo que não fecha.

O preenchimento tenue é a única coisa que cede em vez da tinta: o selo de erro é
um retângulo de `--alerta-tenue` com `--alerta` escrito dentro, e quem existe
para receber a tinta é o retângulo.

## O maior risco escondido, e ele não era de cor

Três lugares do app leem o valor computado de um token no `:root` e mandam o
**literal** para dentro de um iframe, que é outro documento e não enxerga
`var()`: o contorno de seleção do motor de carrossel, o layout do palco do Studio
e o marcador de seta do React Flow. Os três reagiam à troca de tema por um
`MutationObserver` em `data-theme`.

**Um estilo que trocasse a paleta sem trocar o tema não dispararia nenhum
deles.** O Studio ficaria com o contorno, as guias e o fundo do palco na paleta
velha até a próxima troca de tema. Nada quebra, só fica errado, e só dentro do
Studio.

Por isso todo estilo carimba também `data-estilo`, e os três passaram a escutar
os dois atributos pelo `aoTrocarPaleta` compartilhado de `estilos/paleta.ts`. A
tripla cópia do observador saiu junto, e `estilos/paleta.test.ts` varre o app
**por padrão** procurando `attributeFilter` com `data-theme`: observador novo
nasce em arquivo novo, e uma lista de três caminhos ficaria desatualizada no dia
em que o quarto aparecesse.

## Como o estilo chega na tela

**Nenhum CSS é gerado, e a cascata não é tocada.** Os tokens resolvidos entram
como propriedades customizadas inline em `document.documentElement`. Estilo
inline vence toda camada `@layer` por definição, todo descendente herda por
`var()`, e tirar as propriedades devolve o app ao Escuro e ao Claro de fábrica,
sem sobra e sem folha órfã.

A mesma propriedade vale num container, e é dela que a **vitrine** vive:
carimbar os tokens num `<div>` veste tudo dentro dele e não encosta no app em
volta. É o mesmo mecanismo, com outro escopo, e é o que torna a tela honesta.

O `index.html` ganhou um segundo passo no script que já estampava o tema: ele lê
`vkos-estilo` do `localStorage` e carimba antes do bundle, dentro do mesmo
`try/catch`. Sem isso a tela abre na identidade de fábrica e pula para o estilo
do dono um quadro depois.

**Uma consequência que quase virou defeito:** no boot quem carimba é o script do
`index.html`, e não o módulo. Se a lista do que foi carimbado começasse vazia, o
primeiro "voltar pro de fábrica" não apagaria nada e o estilo ficaria grudado na
tela até o próximo F5. Ela começa **nula** e se descobre do cache.

## Não dá para se trancar do lado de fora

Três guardas, e elas são independentes:

1. **Só estilo aprovado ativa**, e só passa no aprovar quem fecha a régua nos
   dois lados.
2. **A aprovação é remedida na leitura do disco.** O arquivo pode ter sido
   editado depois de gravado; confiar na chave `estado` sem remedir seria deixar
   a régua de fora pelo caminho mais fácil que existe. Estilo que não passa volta
   a rascunho e sai do ar sozinho.
3. **A identidade VKOS fica sempre no topo da lista** do menu da barra, e um
   clique nela devolve o Hub ao Escuro e ao Claro medidos, sem depender de
   nenhuma tela.

## Por quê

**Porque a garantia que importa aqui é de execução, e a trava de fábrica é de
build.** Elas medem a mesma coisa e nenhuma das duas cobre o buraco da outra.
Duplicar a lista de pares nos dois lados da fronteira de pacote foi o preço, e
`regua.test.ts` guarda a igualdade: par novo na trava e esquecido na régua
deixaria o estilo do dono passar por um crivo mais frouxo que o do Escuro, em
silêncio.

**Porque pedir os 35 tokens de partida seria pedir ao dono do negócio que fosse
designer de sistema.** Ele escolhe o plano, a tinta e a marca; o resto é
consequência, e consequência é conta.

**Porque a arquitetura já estava pronta e não precisou mudar.** Toda cor do app
já saía de token, os tokens já eram herdados por `var()`, e a camada `@layer
tema` já existia para dizer o valor final de cada um. O que faltava não era
mecanismo: era a régua alcançar o que se cria em execução.
