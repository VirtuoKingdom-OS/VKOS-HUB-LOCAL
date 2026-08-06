# A moldura também tem registro

## Contexto

O modo editorial nasceu de manhã, com o Dashboard do CORE. À tarde o Jesse
pediu a mesma coisa para o resto: o menu do CORE, a tela de Workspaces, a tela
de Assistente, o menu de cada workspace e a tela Início deles. Com uma condição
que fecha a discussão antes dela começar:

> Só vai manter as cores mesmo, mas o restante você reorganiza aí do seu jeito.

Isso deixou claro qual era o pedido e qual não era. Não era mudar paleta. Era
mudar tudo o que a paleta não é.

## Decisão

**Nenhum token novo, nenhuma cor nova, nenhuma folha em `PENDENTES`.** A rodada
inteira coube na fundação que já existia, e isso não é economia: é a prova de
que o diagnóstico da manhã estava certo. O que fazia o experimento do Instagram
parecer outro produto não era cor nem peso, eram quatro canais: **escala de
número, ar, forma e profundidade**. Todos os quatro já tinham degrau declarado.

### A barra lateral passou a ter registro, e ela é MOLDURA

A barra não tinha erro de composição. Ela tinha erro de registro: media 240px
com recuo de 8px, item colado no item por um fio de 1px, e um rodapé preto de
12px com três linhas espremidas. Do lado de um Dashboard editorial, isso não lia
como moldura discreta, lia como outro app.

Quatro mudanças, nenhuma de cor:

- **Largura 240 → 264px** e recuo lateral do degrau 8 para o 12.
- **Item com raio de 12 e 2px de vão entre irmãos.** Um pixel não é respiro, é
  uma falha de renderização: com ele os itens leem como linhas de tabela.
- **Hover e selecionado deixaram de ser a mesma superfície.** Este era o defeito
  real, e ele durou meses. Os dois pintavam `--superficie-alta`, então a única
  diferença entre "o mouse está em cima" e "você está nesta tela" era um fio de
  2px. Com o ponteiro parado sobre um vizinho, a barra dizia que havia duas
  telas abertas. Agora o hover sobe um degrau e o selecionado sobe dois.
- **O rodapé virou ilha carvão de raio 20**, e o gasto do projeto virou número
  de verdade, no degrau de título, com o rótulo embaixo dele.

**A moldura não vira painel editorial.** O gasto pesa 600, e não 700: 700 é de
número de painel de LEITURA e do wordmark. O item ativo continua no peso 500,
como a v3 manda. A barra ganhou ar e forma, não autoridade.

### A tela de Workspaces: o número virou o corpo do cartão

A composição v1 já tinha acertado o formato. O que ela não acertou foi a
hierarquia dentro do cartão.

A tela existe para uma pergunta só, quanto cada projeto está custando. E o gasto
morava em 14px no rodapé, dividindo a linha com quatro botões. Ou seja: **o único
dado que se compara entre cartões era o menor texto do cartão**, e os botões, que
são iguais em todos, tinham mais peso que o número, que é diferente em todos.
Comparar exigia caçar.

Agora o cartão é `.cartao-editorial` e o corpo dele é o número: rótulo em caixa
alta, valor em 40px, contexto embaixo, caminho por último, ações no rodapé. A
grade abriu de 280 para 320px de coluna e de 16 para 24 de vão, porque um valor
de 40px em coluna de 280 encostava no rótulo.

Gasto que ainda não chegou **não** ganha tratamento de número. Um "sem leitura"
em 40px seria dar tamanho de dado para a ausência de dado.

### O Início do workspace: a foto manda

Era dívida declarada desde a decisão da manhã, que nomeia `dashboard.css` como
candidato natural e diz que ele não foi migrado. Esta rodada paga.

As criações recentes viviam numa **tira que rolava na horizontal**, com 156px de
largura por peça. O conteúdo de um workspace é IMAGEM, e 156px não mostram uma
peça: mostram que existe uma peça. Pior, das oito últimas criações, metade ficava
depois da borda direita, que é onde ninguém procura.

Virou grade de quadrados, com no mínimo 220px por peça e a miniatura em proporção
1:1. É literalmente a mesma correção do experimento do Instagram, na mesma
semana, por um motivo diferente. **Tratar imagem como lista já foi cometido duas
vezes em telas diferentes**, e é por isso que agora existe trava.

**Esta tela não ganhou capa, e a ausência é deliberada.** Cogitei uma capa carvão
com "5 peças esta semana / 23 no total". São números reais, mas são números de
enfeite: ninguém decide nada com eles. Inventar dado para preencher uma capa é
exatamente o movimento que o Jesse chamou de amador na primeira conversa.

### As três portas, no mesmo dia

Depois que a grade ficou pronta, o Jesse perguntou se eu tinha mesmo feito a
revolução nesta tela. **Eu tinha feito metade**, e ele estava certo em cobrar: eu
consertei a grade de peças, que era o defeito mais visível, e deixei o resto da
tela no modo denso porque a decisão de não pôr capa me pareceu, na hora, resposta
suficiente. Não era.

O que sobrava era **o mesmo defeito do rodapé do cartão de workspace**, e eu tinha
acabado de consertá-lo lá sem enxergá-lo aqui: "Anúncio", "Site guiado" e "Criar
conteúdo" eram três botões do **mesmo tamanho**, no canto superior direito, em
território de moldura.

Três alvos iguais lado a lado não têm primeiro. E o primeiro deles é a razão de
existir da tela inteira: este é o balcão de entrada do projeto, e criar é o que se
faz aqui. Quando o alvo principal tem o mesmo peso dos secundários, ele deixa de
ser principal.

As três desceram para o corpo e viraram três `.cartao-editorial`, cada uma com
ícone, título e uma linha dizendo o que ela faz. Elas são caixa porque **se
comparam**: são três jeitos de começar a mesma coisa, e a pessoa escolhe um
olhando os três. Mesma régua do cartão de workspace e do lote do Assistente.

O cabeçalho ficou sem ação nenhuma, e isso é o certo aqui: numa tela cujo trabalho
inteiro é escolher por onde começar, a escolha pertence ao corpo, não à moldura.

Junto foram os títulos de seção, que subiram para 22px e perderam o fio: no modo
denso o fio separa seções numa tela cheia de dado, e aqui as seções são duas e o
que as separa é uma grade de imagem.

**A lição de processo:** quando o dono do produto pergunta "você fez mesmo?", a
resposta honesta quase sempre é "fiz a parte que doía mais". Terminar é outra
coisa, e ele não deveria precisar perguntar duas vezes.

### O Assistente: o fio virou espaço, e o lote virou caixa

A composição v1 tirou daqui as quatro caixas com fio que ele apontou. O que
sobrava era o mesmo erro um nível abaixo: **cada tarefa dentro de um lote tinha
`border-top` e cada entrada de rastro tinha `border-bottom`**. Com quatro tarefas
e trinta entradas, a tela voltava a ser uma pilha de riscos, só que dentro dos
trilhos em vez de em volta deles. A régua já dizia o que fazer: cor e espaço
separam primeiro, fio só quando a cor não deu conta.

O lote virou caixa, e isso **não** contradiz a rodada anterior. A régua é "a caixa
é para o que se compara", e lote se compara com lote na fila. Tarefa não se
compara com tarefa fora do lote dela, então tarefa não é caixa.

Ele veste `.cartao` do modo denso, **sem** a sombra do editorial: trilho de fila é
operação, não painel de leitura. Copiar a sombra para cá seria a primeira sombra
de repouso dentro de uma coluna densa, e é assim que uma exceção vira padrão.

O título de conversa subiu de 12 para 14px. A coluna é uma lista de navegação, e
navegar por uma pilha de linhas de 12px obriga a ler devagar.

## Por quê

**Porque o pedido era de registro, não de paleta, e ele estava certo.** "Mantenha
as cores" foi o enquadramento mais útil que o Jesse podia dar: ele isolou a
variável que já estava resolvida e apontou para as quatro que não estavam.

**Porque a fundação aguentou sem afrouxar.** Cinco superfícies mudaram de cara
sem um hex novo, sem um degrau novo e sem uma folha fora das travas. Se a rodada
tivesse exigido tokens novos, isso seria sinal de que o modo editorial da manhã
foi desenhado curto. Não foi.

**Porque o defeito do hover valia a rodada sozinho.** Ele não estava na lista de
reclamações, ninguém tinha apontado, e estava ali há meses fazendo a barra mentir
sobre qual tela estava aberta. Redesenhar uma superfície é a única hora em que se
olha para ela com atenção suficiente para achar esse tipo de coisa.

**Porque cada erro desta rodada já tinha sido cometido antes, em outro lugar.**
Imagem tratada como lista, número escondido em metadado, fio onde espaço bastava.
Por isso a rodada entrega quatro travas de composição, e não só CSS: regra escrita
em documento não para erro que se repete, e este projeto já pagou para aprender
isso uma vez.

## O acerto do cartão, no mesmo dia

Depois de ver a tela pronta, o Jesse pediu mais quatro coisas nela. Todas foram
feitas, e três delas são a mesma correção vista de ângulos diferentes.

### As quatro ações viraram uma engrenagem

> No lugar das opções de tornar admin, editar e excluir, eu quero uma engrenagem
> que abre essas opções dentro do próprio card, tipo uma página ali dentro do
> card.

O rodapé tinha quatro controles. Eles são **idênticos em todos os cartões**, e
por isso competiam com o número, que é a única coisa que muda de um cartão para
o outro. A rodada anterior tinha subido o número para 40px justamente para ele
ganhar a leitura, e os botões continuavam disputando com ele.

Agora o rodapé tem dois alvos: entrar, e ajustar. As três ações viraram linhas de
`.item-lista` dentro do cartão, com uma segunda linha explicando cada uma.

**Dentro do cartão, e não em popover, tem motivo funcional além do pedido:** a
primeira coisa que se ajusta ali é a cor da capa, e a capa fica a 12px de
distância. Um menu flutuante cobriria exatamente aquilo que a pessoa está tentando
ver mudar. O retorno de um clique precisa estar visível no momento do clique, e é
por isso que a capa continua montada por cima da página de ajustes.

### A cor da capa, numa paleta fechada

A cor é **identidade do projeto**, não estado do app, e por isso ela é a mesma nos
dois temas. Quem acompanha o tema é o carvão, que continua sendo o padrão.

**Ela é uma lista fechada de oito tons escuros, e não um seletor livre.** O motivo
é medido, não estético: a capa carrega o nome do workspace em `--sobre-painel` e o
ponto de sessão viva em `--menta-painel`, que são claros nos dois temas. Com cor
livre, a primeira cor clara que alguém escolhesse **apagaria o nome do próprio
projeto**, e nenhuma trava pegaria isso, porque a trava de contraste mede token
contra token e cor escolhida em execução não é token.

As oito foram medidas antes de entrar: no pior caso o nome fica em 11,5:1 e o
ponto vivo em 7,9:1, contra pisos de 4,5 e 3. `contraste.test.ts` refaz essa conta
a cada rodada, contra os papéis dos **dois** temas.

O registro guarda o **nome** da cor, nunca o valor. Assim o Hub pode recalibrar um
tom sem reescrever o registro de todo mundo, e um `workspaces.json` editado à mão
não consegue injetar cor arbitrária numa tela. A defesa vale na leitura, e não só
na gravação: hex solto, nome inventado e `"OCEANO"` em caixa alta somem ao ler, do
mesmo jeito que a chave `admin` já se defendia.

A duplicação da lista entre servidor e web é real (são workspaces npm separados) e
tem trava própria: se as duas saírem de sincronia, a tela oferece uma cor, o
servidor devolve 400 e nada acontece na cara do usuário.

### O estado "selecionado" saiu

> Tire essa funcionalidade aleatória de quando eu entro em um workspace ele fica
> selecionado na tela de workspaces e a opção muda de abrir para "ir para o
> trabalho" e ainda fica uma borda branca.

Ele estava certo, e o motivo é de composição: **esta tela é onde se ESCOLHE um
projeto.** Destacar o que já está aberto responde uma pergunta que ninguém faz
ali, e gastava a borda forte, um selo e um rótulo de botão diferente para dizer
isso. Saíram os três.

`ehAtivo` **não** sumiu do código, e não podia sumir: o servidor recusa remover o
workspace ativo, então a página de ajustes precisa saber disso. O que mudou é como
ela conta. Antes, um botão de lixeira desabilitado sem explicação; agora, a linha
continua na lista e escreve o motivo por extenso, na segunda linha dela. **Some a
marca visual, fica a informação** — e a informação ficou melhor do que era.

A trava dessa parte é por ausência, porque a regressão aqui é por adição: é barato
alguém reintroduzir um "ativo" achando que está ajudando.

## A campanha de anúncios, e a tela que tem os dois registros

Última tela da rodada. Ela é diferente das outras cinco, e por isso vale escrever
o raciocínio: **quase tudo nela estava certo, e mexer em quase tudo teria sido
churn.** A folha dela já tinha sido refeita em 2026-08-01, com a responsividade
medida em janelas reais (1093x614 e 1152x720, que são 1366x768 e 1440x900 sob a
escala de 125% do Windows). Aquele trabalho fica.

Três coisas mudaram, e só três.

### A capa, e por que aqui ela não é enfeite

A tela abria direto em "Estratégia", com seis pares de rótulo e valor em 14px.
Ela nunca respondia a primeira pergunta de quem abre uma campanha, que é **quanto
isso vai me custar**. O orçamento existia, mas no bloco 7 de 9, a uns três rolares
de distância.

Agora a leitura abre por uma ilha carvão com o orçamento por dia e o custo por
clique alvo em 52px, mais o tamanho da campanha (grupos, palavras-chave, anúncios,
negativas) na terceira coluna.

**Isto contradiz o que eu escrevi sobre o Início do workspace?** Não, e a
diferença é exatamente o critério: lá a única capa possível seria "5 peças esta
semana", que não muda decisão nenhuma. Aqui os dois números decidem se a campanha
sobe ou não. **Capa se põe quando existe número que muda uma decisão**, e essa
regra agora está no contrato de interface.

O total de 30 dias é conta, e a tela diz que é conta: "Cerca de R$ 1.500,00 em 30
dias". O Google cobra por dia, mas quem paga a fatura pensa no mês.

A capa **rola** com a leitura, e não é fixa: ela é chegada, não moldura. Fixa, ela
comeria a primeira tela toda vez que a pessoa voltasse ao topo para conferir um
campo, e esta tela já brigou por altura antes.

### O índice perdeu a laje

`.anuncio-indice` pintava `--superficie` e virava uma faixa cinza atravessada logo
abaixo do cabeçalho. É **exatamente** a leitura de "corta uma fatia lá em cima"
que abriu a rodada de composição, e que o `.tela-topo` já tinha perdido lá atrás.
Esta ficou para trás e ninguém viu. O fio de baixo fica, porque ele é o chão da
navegação e o conteúdo rola num painel logo abaixo dele.

### Os dois registros, na mesma tela

O corpo continua denso, e isso é decisão e não omissão: são 45 linhas de campo com
contador de caracteres e botão de copiar, e uma linha dessas em 40px caberia em
quatro por tela. O que mudou foi só o bloco de orçamento, cujos três valores
estavam no degrau de **título** (22px, peso 600), que é tratamento de título e não
de dado. Agora vestem `.numero-editorial`.

A estimativa de cliques ficou de fora, e de propósito: ela é texto livre no
contrato ("300 a 400"), e em 40px um "Sem estimativa" viraria a maior coisa da
tela dizendo que não se sabe de nada.

**A regra que faz os dois registros conviverem: escala de número só onde há
número.** A trava afirma os dois lados, porque essa mistura estraga nas duas
direções — espalhar 52px pelos nove blocos vira cartaz sem dado, e padronizar a
capa para 14px apaga a razão de ela existir.

## Galerias e Fontes de dados, e a laje que apareceu quatro vezes

### O hub de Fontes: a contagem virou o número

Ele era uma `.lista` de três linhas de 32px dentro de uma coluna de 720px, numa
tela inteira. Três linhas de menu num plano de trabalho vazio leem como tela de
configuração, não como o acervo do projeto.

E o defeito de fundo era **o mesmo do cartão de workspace**: a pergunta que se faz
nessa tela é "quanto material eu já tenho de cada tipo", e a resposta estava
escrita em 12px, na segunda linha de cada item, em tinta fraca. O que se compara
entre as unidades é justamente o que tem que ter a escala.

Agora são três cartões editoriais com o número como corpo, e cada um diz em uma
frase para que serve aquele tipo. Zero aparece igual: esconder o vazio faria a
pessoa achar que o tipo não existe, quando ele só está vazio.

O cartão de uma fonte foi junto. Ele **sempre** foi uma unidade comparável com
prévia de conteúdo de verdade dentro, que é o critério do cartão; o que mudou foi
o registro. Com 12px de respiro, quatro miniaturas quadradas ficavam espremidas
contra a borda, e a prévia é exatamente o que faz escolher uma fonte. O nome subiu
para o degrau de título de cartão: na primitiva ele ficava no corpo de 14px, a
mesma letra da prévia logo abaixo, e os dois pesavam igual.

### Galerias: quase certa, e uma laje

Essa tela já estava perto do certo, e o motivo é que ela nasceu com a lição que o
Instagram depois confirmou: a moldura é acromática de ponta a ponta porque a peça
colorida do usuário é a única coisa que pode ter cor ali. O vão da grade subiu de
16 para 24, que é a medida da grade de workspaces e a do experimento aprovado.

O que estava errado era `.telas-abas`, e ele merece seção própria.

### A quarta laje

`.telas-abas` pintava `--superficie` com um fio embaixo. É a **quarta vez** que
esse desenho apareceu:

| onde | quando caiu |
|---|---|
| `.tela-topo` | rodada de composição v1 |
| `.anuncio-indice` | 2026-08-05, na tela de anúncios |
| `.telas-abas` | 2026-08-05, junto |

Toda vez o resultado é o mesmo: uma faixa cinza atravessada logo abaixo do
cabeçalho, que é literalmente a leitura de *"corta uma fatia lá em cima e no
espaço restante você enche de caixas"* que abriu esta sequência de rodadas.

**Quatro ocorrências não são azar, são um padrão.** Quem escreve uma barra de
navegação horizontal quer separá-la do conteúdo, e alcança o `background` antes de
alcançar o fio. Por isso a trava nova varre as folhas **por padrão** (barra com
fio embaixo que também pinta superfície) e não por nome de classe: barra nova
nasce com nome novo, e uma trava que só conhece os três nomes de hoje não veria a
quinta chegar.

Numa tela de galeria a laje custa mais que nas outras: ela vira a maior mancha
lisa de uma tela desenhada inteira para o carrossel do usuário mandar.

### Uma primitiva morreu junto

`.grade-cartoes` ficou órfã quando a tela de uma fonte passou para a grade
editorial. Ela era `minmax(260px)` com vão de 12, e `.grade-editorial` é a mesma
coisa com vão de 16: duas grades quase idênticas no mesmo arquivo são o modo de
falha que este projeto já pagou uma vez, com `--sombra-suave`, `--sombra-media` e
`--sombra-forte`. O autocompletar entrega a primeira em ordem alfabética e nenhum
teste reclama. Ela saiu, e o comentário do lugar dela diz por quê.

## O que fica pendente

`setup/setup.css` continua no modo denso. Ele era o outro candidato nomeado na
decisão da manhã, e continua sendo dívida conhecida, não esquecimento: ele é uma
tela de passo único, que ninguém vê duas vezes, e nesta rodada o Jesse pediu as
cinco superfícies que ele usa todo dia.

A aba do Instagram **não foi tocada**, e não deve ser. Ela está fora das travas
por decisão dele, e outro agente trabalhava nela enquanto esta rodada acontecia.
Ver [a decisão do modo editorial](2026-08-05-o-modo-editorial.md).
