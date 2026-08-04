# A tela do anúncio num notebook, e a coluna que pagava a conta sozinha

## Contexto

A página da campanha estreou em 2026-07-31 e o Jesse usou ela no notebook dele
no dia seguinte. O relato: clicar numa aba do índice rolava até o bloco certo,
mas o cabeçalho subia e **nunca mais voltava**; a coluna de leitura ficava
ilegível; e o chat, que é metade do valor desta tela, ele não conseguia ver.

A medição confirmou tudo, e mostrou que o defeito não era de tela pequena, era
de tela de notebook Windows. De 1093x614 pra baixo:

| tamanho | doc rola | topo depois do clique | leitura | conversa |
|---|---|---|---|---|
| 1093x614 | não | 0 | **493px** | 360px |
| 960x540 | **sim** | **-21** | 360px | 360px |
| 899x469 | **sim** | **-108** | **299px** | 360px |

1093x614 e 1152x720 não são tamanhos inventados: são 1366x768 e 1440x900 sob a
escala de 125% do Windows, que é o padrão de fábrica em notebook de 15,6
polegadas. 1920x1080 a 150% dá 1280 de largura em CSS. Ou seja, **a faixa onde
tudo desandava é exatamente onde o dono de negócio trabalha**, e a conferência
visual nunca olhou pra lá: `ferramentas/olhar-telas.mjs` mede 1440, 1366 e 1280
e para.

## Decisão 1: a tela é uma caixa fechada, e quem rola é painel interno

O cabeçalho sumindo tinha duas causas, e as duas precisavam morrer.

**A de CSS.** `.anuncio-conversa` era item de grade com altura mínima
automática, que é o tamanho mínimo do CONTEÚDO dela. Ela travava em 433px, a
linha da grade ficava maior que o corpo, e a `.tela` passava da janela. Como o
`body` do Hub é `overflow: hidden`, isso não vira barra de rolagem: vira uma
página que rola sem ter como voltar.

**A de JavaScript.** `scrollIntoView` rola TODO ancestral rolável, inclusive o
documento. Era ele que arrastava o cabeçalho pra cima, e com o documento sem
barra, não havia gesto que trouxesse de volta.

Agora: `min-height: 0` nos dois filhos da grade, `overflow: hidden` na `.tela`
como cinto de segurança, e a navegação por âncora é `area.scrollTo({ top:
alvo.offsetTop })`, que só move o painel nomeado. **Nesta tela nada mais chama
`scrollIntoView`**, nem o índice quando ele traz a aba ativa pra vista: ali é
`scrollLeft` da própria barra.

## Decisão 2: abaixo de 1200px a conversa deixa de disputar largura

A prioridade estava invertida. Quem encolhia era a leitura, que é o conteúdo,
enquanto a conversa segurava 360px fixos. Em 899px de janela isso dava 299px de
leitura contra 360px de chat.

O número saiu de conta, não de gosto. A barra lateral come 240px fixos, então
1200px de janela deixam 960px de corpo. Tirando os 320px que um turno de
conversa precisa pra ser legível e os 48px de respiro do painel, sobram 592px de
leitura: é o piso onde uma linha de campo (o texto, o contador e o copiar) ainda
cabe sem quebrar em três.

- **Acima de 1200px**: duas colunas, e a conversa é `clamp(320px, 27%, 400px)`.
  Quem cede largura primeiro passou a ser ela.
- **Abaixo de 1200px**: a conversa vira **gaveta** sobre a leitura, encostada na
  direita, com `--sombra-modal`. A leitura fica com a largura inteira.

**A gaveta não é modal, de propósito.** Sem véu e sem prender o foco: o dono
continua rolando e lendo a campanha enquanto escreve o que quer mudar, que é
exatamente o gesto. Fechar é o X, o botão do cabeçalho ou Esc, e o Esc devolve o
foco pro botão que abriu.

**A largura decide o modo, e o modo decide o estado.** Em duas colunas a
conversa nasce aberta; em gaveta ela nasce fechada, porque quem abre esta página
vem LER, e gaveta aberta na chegada cobriria a campanha. Mudar o tamanho da
janela reavalia, então maximizar devolve a coluna e restaurar devolve a gaveta.

## Decisão 3: a faixa lateral morreu, e o botão do cabeçalho ficou

Antes, reabrir a conversa recolhida dependia de uma faixa vertical de 40px na
borda. Ela custava 40px de largura justo onde a largura tinha acabado, e não
existia jeito nenhum de chegar na conversa em tela estreita.

Agora existe **um controle só, no cabeçalho, em qualquer largura**, com
`aria-expanded`. Um alvo previsível vale mais que dois parciais, e é o padrão que
o VS Code e o Linear usam pro painel secundário.

Pra abrir espaço pra ele sem estourar o cabeçalho, o veredito da conferência
("Tudo dentro dos limites", "3 campos acima do limite") **desceu pro índice**,
preso à direita e sem rolar junto com as abas. O cabeçalho voltou a ser a receita
da fundação: título, e uma ação principal à direita. E o veredito ficou ao lado
da navegação que leva até o problema.

## Decisão 4: a profundidade são três planos, e a escada de título estava invertida

O pedido do Jesse foi "aproveitar a profundidade das coisas e separar tudo mais
bonitinho". Nove blocos com lista dentro é onde "conteúdo não nasce dentro de
cartão" costuma morrer, então nada aqui virou caixa nova.

**Três planos, e nenhum deles é sombra:**

1. `--fundo`, o papel do painel de leitura, onde vivem o título do bloco, o nome
   do grupo e a prosa.
2. `--superficie`, o dado: a lista de campos e, agora, também a tabela, que era
   a única coisa nua no meio de listas emolduradas.
3. `--sombra-modal`, só a gaveta, que é a única coisa da tela que de fato flutua
   sobre conteúdo parado. É a régua da seção 4.7 da fundação, sem exceção.

**O título do bloco gruda no topo do painel.** Com quarenta e cinco linhas de
campo, o índice diz pra onde ir mas não diz onde se está lendo. Os 16px de
respiro abaixo do fio são margem, e margem é transparente: sem um pedaço de papel
estendido, o texto que passava por baixo aparecia colado no fio e parecia
atravessar a linha. Esse pedaço existe e é só isso que ele faz.

**A escada de título estava invertida e ninguém tinha visto.** O h2 do bloco é
18px peso 500 e o h3 do grupo era 16px peso 600: o subtítulo pesava mais que o
título, e os nove blocos liam como um rio só. Agora é 22/500 na barra, 18/500 no
bloco, 14/600 no grupo e 12 na lista. O nome do grupo se separa do título de
linha da lista pelo PLANO, e não por mais peso: o grupo vive no papel, a linha
vive na superfície.

**"Sitelink 2" e "Endereço do sitelink" eram a mesma classe**, então o rótulo que
ABRE uma peça nova e o rótulo que FECHA a anterior ficavam idênticos. Nasceu
`.anuncio-rotulo-peca`, com tinta cheia e peso de nome.

## Decisão 5: o índice diz a verdade sobre onde a pessoa está

Clicar em "Publicação" deixava o marcador em "Orçamento", nos oito tamanhos. O
último bloco é curto demais pra subir até o topo, o painel para antes, e o
cálculo por posição elegia o bloco de cima.

Agora a rolagem disparada por um clique manda no índice até chegar no destino, e
no fim do painel o pedido é atendido do jeito que dá: o bloco pedido fica
marcado. Mentir ali faria o índice apontar um bloco que ninguém escolheu.

## Por quê

**A causa raiz das duas metades era a mesma: alguma coisa da tela alcançava
mais do que devia.** A conversa alcançava a altura da janela inteira pela altura
mínima automática de item de grade; o `scrollIntoView` alcançava o documento
inteiro por ser a API que rola todo mundo. Nos dois casos o conserto foi
encurtar o alcance, não compensar o efeito.

**E o defeito passou porque a régua de medida era curta.** Cinco portões verdes,
conferência visual verde, e mesmo assim a tela quebrava em 25% da faixa onde ela
é usada, porque a ferramenta media 1440, 1366 e 1280 e o Windows entrega 1093 e
1152. Medir é escolher onde olhar, e escolher errado é o mesmo que não medir.
