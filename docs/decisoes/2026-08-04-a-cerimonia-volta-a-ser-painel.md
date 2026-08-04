# A cerimônia volta a ser painel, e o prompt passa a fixar o idioma

Data: 2026-08-04

## Contexto

Em 2026-07-30, na Fase 2 do redesign, a Cerimônia do Cérebro virou camada de
tela cheia. O argumento era razoável no papel: é a tarefa mais longa do
produto, uns dez minutos de conversa, e tarefa longa mora em tela cheia.

O uso real derrubou o argumento. Numa conversa de uma pergunta e uma resposta
por vez, a tela cheia espalha as duas coisas que importam pelos extremos do
monitor: a pergunta no alto, o campo de resposta encostado na borda de baixo,
a um pixel da barra de tarefas do Windows. O olho anda a tela inteira a cada
turno, e a última coisa que a pessoa vê antes de digitar é o relógio do
sistema. A largura ainda deixava a linha do texto passar de 110 caracteres,
que é onde se perde a volta pra linha seguinte.

Na mesma sessão apareceu outro defeito, de natureza diferente. Uma pergunta
saiu assim: "qual é a ação que você quer que a pessoa faça quando curtir o
conteúdo hoje? օրինակ: seguir a página, comentar...". `օրինակ` é "por exemplo"
em armênio. Não é bug de renderização: o texto está assim na transcrição. O
prompt da cerimônia nunca dizia em que idioma escrever, ele só herdava o
português do texto em volta, e herança não é instrução.

## Decisão

**A cerimônia volta a ser um painel centrado, composto sobre a primitiva de
modal que já existe** (`.veu-modal` + `.modal-g` + `.modal-topo` /
`.modal-rodape`), com altura travada em `min(80vh, 760px)`. Ela não tem mais
casca própria: `cerimonia.css` guarda só o que é dela, a conversa e os turnos.

**O véu não fecha no clique.** Ele existe para comer o clique perdido, que era
o defeito da versão anterior à tela cheia: um botão do canvas alcançável por
engano atrás da conversa. Fechar só pelo X ou pelo Esc, e nenhum dos dois
perde nada, porque a sessão segue viva no servidor.

**Nem a pergunta nem a resposta moram em caixa com borda por padrão.** Dentro
de um painel que já é superfície flutuante, bolha com borda é cartão dentro de
cartão. A pergunta é texto puro, limitado a 68ch de leitura. A resposta do
dono é a única em caixa, e ela leva borda junto com a superfície: no tema
Escuro o degrau de superfície sozinho some contra o painel.

**Os dois prompts da cerimônia passam a fixar o idioma**, em uma linha:
português do Brasil do começo ao fim, e nenhuma palavra em outro alfabeto.
Vale para a entrevista comum (`promptDaCerimonia`) e para a semeada por
documento (`promptComDocumento`).

## Por quê

A regra "tarefa longa mora em tela cheia" é boa e continua valendo para o
Studio e para o editor, onde a tarefa é manipular uma peça grande. Ela não
serve para conversa de turno curto: ali o que importa não é área, é a
distância entre ler e responder. O painel centrado junta as duas no centro do
olhar, e o véu faz o trabalho de calar o resto do app que a opacidade da tela
cheia fazia.

Sobre o idioma: quem lê a saída é o dono do negócio, sozinho, no meio da
tarefa mais longa do produto. Uma palavra em outro alfabeto não é um errinho
de estilo, ela destrói a confiança na conversa inteira, e a conversa inteira é
o que vira a identidade do negócio. Custava uma linha de prompt e ficou sem
dono por não ter sido escrita.

A trava está em `cerebroDocumento.test.ts`, e ela afirma o conteúdo injetado
nos dois prompts, não o entorno.
