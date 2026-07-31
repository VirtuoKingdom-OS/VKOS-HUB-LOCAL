# O cartão do workspace, e a criação sem escolher pasta

## Contexto

O cartão da tela de Workspaces mostrava três informações numa grade de três
colunas iguais: `Estado`, `Gasto com IA` e `Último trabalho`. Cada uma era um
rótulo em caixa alta com o valor logo abaixo, no mesmo tamanho, no mesmo peso e
na mesma cor. "Parado", "$0.00" e "há 3 dias" pesavam exatamente igual, então o
olho não tinha o que encontrar primeiro. O Jesse apontou isso com o nome certo:
três informações do mesmo jeito, quando bastava um selo de estado no canto.

Pior que o empate, havia repetição. A bolinha `core-linha-estado` do topo e a
coluna `Estado` diziam a MESMA coisa, o `core.atividade`. A bolinha era
`aria-hidden`, então quem enxergava lia o estado duas vezes e quem usa leitor de
tela dependia só do rótulo da grade.

A mesma tela ainda pedia uma pasta na hora de criar um workspace. O usuário
abria um seletor do Windows, escolhia um lugar qualquer, e o frontend compunha o
caminho final montando slug e separador na mão. Duas telas faziam isso, com o
código duplicado: a tela de Workspaces do CORE e o seletor da barra lateral. O
Jesse pediu que o destino já viesse decidido.

A referência do que funcionava já estava no próprio projeto: a `LinhaWorkspace`
do Dashboard, que mostra os mesmos dados em três pesos diferentes.

## Decisão

**O cartão passou a ter quatro faixas, cada uma com um trabalho e um peso.**

1. **Topo.** O nome do workspace (600, 15px) e, ancorado à direita, um selo com
   o estado de atividade. O selo substitui de uma vez a bolinha muda e a coluna
   `Estado`. Como ele carrega texto, o estado passou a ser lido uma vez só, por
   todo mundo, inclusive por leitor de tela.
2. **Pasta.** Onde o workspace mora, em `--texto-fraco`, 12px.
3. **Rodapé.** O gasto como número (600, tabular, tinta cheia) com a unidade
   "em IA" um degrau abaixo em peso e em tinta, e, na outra ponta, o contexto
   como prosa fraca de 12px: sessões em voo e quando foi o último trabalho, numa
   voz só, no mesmo desenho da sublinha do Dashboard.
4. **Ações.** Abrir, renomear, remover.

O que separa as faixas é espaço, não fio. O `border-top` que dividia os dados
saiu: se foi preciso uma borda para separar, o espaçamento falhou antes.

**São três estados, não um liga/desliga.** O modelo tem `rodando`, `recente` e
`parado`, e os rótulos prontos em `ROTULO_ATIVIDADE` ("Rodando agora", "Ativo",
"Parado") informam mais que um ativo/desativado. O selo reaproveita o `.badge` do
`global.css`, então forma, raio e o `.ponto` já vêm prontos; a folha do CORE só
declara a cor de cada estado:

| estado | tinta | preenchimento | ponto |
| --- | --- | --- | --- |
| Parado | `--texto-fraco` | nenhum, só o fio `--linha` | `--linha-forte` |
| Ativo | `--texto-suave` | `--neutro-tenue` | `--linha-forte` |
| Rodando agora | `--menta` | `--menta-tenue` | `--menta-viva`, com `--glow-vivo` e pulso |

Só o estado vivo tem cor e só ele tem glow, que é para o que o `--glow-vivo`
existe. O ponto vivo carrega `data-mov="pulso"`, o gancho que a camada de tema
usa para trocar o pulso por um fade sob movimento reduzido. O atributo NÃO
aparece nos pontos parados: lá ele criaria uma animação que não existia.

Os dois pares novos entraram na trava de contraste, medidos nos dois temas:
`--menta` sobre `--menta-tenue` (4,66:1 no Claro, 7,44:1 no Escuro) e
`--texto-suave` sobre `--neutro-tenue` (6,90:1 no Claro, 8,48:1 no Escuro).
Selo com preenchimento tem fundo próprio, então medir a tinta contra a
superfície do cartão daria um número que ninguém enxerga.

**"Aberto" e o estado continuam separados, e não se parecem.** São duas notícias
diferentes: "aberto" é qual workspace está em uso agora, o estado é atividade
recente. Elas moram em lugares diferentes e falam vocabulários diferentes. A
etiqueta "aberto" fica colada no nome, em caixa alta, sem preenchimento e sem
ponto, exatamente como na `LinhaWorkspace`. O selo de estado fica na direita, em
caixa normal, com preenchimento e com ponto. Mesmo quando as duas aparecem no
mesmo cartão, ninguém as confunde por objeto igual.

**Criar workspace pede só o nome.** O `pastaDestino` saiu do corpo da requisição,
e com ele o botão "Escolher onde criar", o estado da pasta escolhida e o cálculo
de slug e de separador que o frontend fazia. O servidor monta
`<raiz do projeto>/workspaces/<slug do nome>` sozinho. A tela anuncia esse
destino em texto discreto enquanto a pessoa digita, em relativo e em monoespaçada
("Vai nascer em `workspaces/mae-pixel`"): ela não escolhe mais, mas não fica no
escuro sobre onde o dado dela vai parar.

A previsão do caminho virou uma função só, `pastaPrevista` em
`componentes/core/logica.ts`, usada pelas duas telas, com teste que repete os
casos do slug do servidor. Se as duas regras se separarem, a tela passa a
anunciar uma pasta que não é a que nasce.

O fluxo de ADICIONAR pasta existente não mudou: ali a pessoa aponta uma pasta
que já existe, e é outro caso.

## Por quê

**Peso igual não é hierarquia, é lista.** Uma grade de três colunas idênticas
comunica "estes três dados valem o mesmo", e eles não valem: o estado é o que se
varre em uma lista de workspaces, o gasto é o único número que se compara entre
cartões, e o último trabalho é contexto. Dar a cada um um tratamento diferente é
o que faz o olho achar o que procura sem ler tudo.

**Rótulo em caixa alta acima de todo dado é andaime, não hierarquia.** Ele dobra
a altura da linha e adiciona uma mancha de texto que ninguém lê duas vezes. O
número se explica com uma palavra ao lado ("em IA"); o tempo se explica com o
verbo ("trabalhou há 3 dias").

**Informação nenhuma se perdeu.** Minimalismo aqui é tirar ruído, não tirar
informação. Os estados de "carregando o gasto" e "gasto sem leitura" continuam,
com o `title` que explica por que não deu para ler, e perdem o tratamento de
número de propósito: não há número ali, e fingir um seria mentir. A contagem de
sessões em voo desceu para a frase de contexto, junto do tempo, no lugar de
virar um quarto dado empatado no topo.

**Três estados informam mais que dois.** "Rodando agora" e "Ativo" não são a
mesma notícia: um diz que há IA trabalhando neste segundo, o outro que houve
trabalho na janela recente. Colapsar os dois em "ativo" jogaria fora justamente
a informação que faz alguém abrir um workspace em vez de outro.

**Perguntar a pasta era transferir um problema.** O público é dono de negócio,
não desenvolvedor. Ele não tem opinião sobre onde a pasta VKOS deve morar, e a
pergunta obrigava uma decisão que ele não tinha como tomar bem. Na prática as
pastas caíam soltas na raiz do projeto. O servidor tem a resposta certa e agora
a dá sozinho. Mostrar o destino sem deixar editar preserva o que importava na
pergunta, saber onde o dado está, e descarta o que só atrapalhava.
