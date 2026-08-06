# Publicar no Instagram, e o armazém de passagem

## Contexto

A API do Instagram **não aceita upload de imagem**. Para publicar uma foto ou um
carrossel, você manda uma URL e a Meta vai buscar o arquivo. Só vídeo tem upload
de bytes, e vídeo não é o que interessa aqui: o Jesse disse que Reels não entra
agora, e post e carrossel são essenciais.

O Hub é local. Ele não tem endereço na internet. Então a peça precisa ficar
alcançável por alguns segundos em algum lugar que a Meta consiga abrir, e essa é
a única razão desta decisão existir.

O plano original, em `docs/planos/instagram/01-visao.md`, previa um túnel
Cloudflare efêmero: sobe, a Meta baixa da máquina, derruba. Nada disso tinha
sido construído, era só desenho.

## Decisão

**A imagem passa pelo Supabase Storage, num balde privado, com URL assinada de
dez minutos, e é apagada assim que a publicação termina.**

O balde é criado pelo próprio Hub na primeira publicação. Não há passo manual no
painel do Supabase: setup manual em produto local é a classe de instrução que
ninguém lê e todo mundo erra.

A limpeza roda no `finally`, ou seja, também quando a publicação falha no meio.
Sem isso cada tentativa frustrada deixaria lixo num balde que ninguém olha.

## Por quê

O argumento que sustentava o túnel era privacidade, e ele não se sustenta neste
caso, por dois motivos que só apareceram quando a decisão foi olhada de perto:

**Os bytes trafegam por terceiro nos dois caminhos.** No túnel, a Meta não baixa
direto da máquina: ela baixa através da infraestrutura da Cloudflare, que faz o
roteamento. A diferença real entre as duas opções não é trânsito, é
armazenamento em repouso, e aqui ele dura segundos.

**A peça vai virar pública no Instagram logo em seguida.** O sigilo dela dura,
por definição, o tempo entre subir e publicar. Não é documento de cliente nem
credencial: é a imagem que está sendo publicada de propósito. Proteger o que
está prestes a se tornar público é gastar engenharia num risco que não existe.

Tirada a privacidade da conta, o que sobra é confiabilidade, e aí o armazém
ganha limpo. O túnel exigiria o binário `cloudflared`, e o Hub já tem cicatriz
disso: o `mkcert` precisou de uma rota inteira de instalação via winget para
funcionar no Windows. Exigiria também subir e derrubar processo filho a cada
publicação, num sistema operacional onde o projeto já registrou uma regra
nascida de dor com processo filho. E colocaria um túnel gratuito sem garantia de
serviço no caminho crítico de publicar.

O custo assumido: publicar imagem passa a depender do Supabase estar ligado em
Conexões. A mensagem de erro diz isso com todas as letras, e diz por quê.

## O outro lado, e por que ele perdeu por pouco

Se o Hub virar produto vendido, exigir conta Supabase de cada comprador é
fricção real, e o túnel funcionaria sem conta nenhuma. Isso casa melhor com
"pagamento único, nada hospedado", que é o posicionamento.

Só que publicar pela conta de um cliente exige App Review da Meta de qualquer
forma, o que é uma rodada bem maior que esta. Quando esse dia chegar, a
arquitetura de publicação vai ser revisitada inteira, e o armazém pode virar
outra coisa sem que nada mais mude: ele é um módulo de 170 linhas com duas
funções, `subirImagem` e `apagarImagens`, e nada em `publicar.ts` sabe que
existe Supabase do outro lado.

## O que mais ficou decidido no caminho

**A espera pelo processamento não é opcional.** A Meta cria o container de forma
assíncrona, e publicar antes de ele ficar `FINISHED` é o erro intermitente
clássico desta API: passa no teste com imagem pequena e falha com imagem grande.
O Hub pergunta o estado de dois em dois segundos, por até um minuto por imagem.

**As imagens sobem em fila, e não em paralelo.** Dez uploads simultâneos num
link doméstico competem entre si, e o conjunto termina depois do que terminaria
em sequência.

**A quantidade decide o formato.** Uma imagem vira post, duas ou mais viram
carrossel. A tela não pergunta qual dos dois, porque perguntar seria pedir que a
pessoa declare o que ela acabou de escolher.

**A conferência roda antes de subir qualquer byte.** Legenda acima de 2200
caracteres, mais de dez imagens ou formato que a Meta não aceita são recusados
antes do primeiro upload. `publicar.test.ts` trava isso.

## A Galeria virou a fonte, e o seletor de arquivo virou o caso de exceção

A primeira versão publicava só o que vinha do seletor de arquivo do sistema. Isso
é o mínimo que faz a API funcionar, e não a integração: as peças do Hub nascem
nos fluxos de criação e moram no VKOS como `carrossel.html`, HTML-first, com o
PNG renderizado sob demanda. Publicá-las pelo seletor obrigaria a baixar página
por página, achar tudo no Downloads e subir de volta. Era o trabalho que o Hub
existe para poupar.

**Agora a Galeria é a fonte padrão.** O painel lista as peças de carrossel e post
do workspace, o Hub renderiza as páginas no servidor e publica. O seletor de
arquivo continua ali, na segunda aba, para o que não nasceu aqui dentro.

Três decisões concretas:

**O render acontece uma vez, para todas as páginas.** Cada chamada de
`renderizarPaginas` é um processo do Playwright; pedir página a página custaria
dez processos num carrossel de dez.

**A página é escolhível, e a ordem é a de clique.** Uma peça pode ter mais
páginas do que o teto de dez do Instagram, e recusar a peça inteira por isso
seria pior do que mostrar o corte e deixar o dono ajustar. As páginas de fora
continuam visíveis, apagadas: sumir esconderia que existem.

**O que já saiu fica registrado, e o registro não é a verdade do Instagram.** Ele
responde "o Hub publicou isto", não "isto está no ar". Se a peça for apagada de
lá, o registro continua dizendo que foi publicada, porque foi. Fingir saber o
estado remoto exigiria consultar a Meta a cada abertura da Galeria, gastando cota
para responder uma pergunta que ninguém fez. Peça já publicada **não fica
bloqueada**: republicar é caso raro e quase sempre correção, e impedir seria
decidir pelo dono.

Isto cria uma ligação nova entre módulos, e ela entrou em
`interno/mapa-sistema.json` na mesma tarefa: o nó `instagram` nasce no grupo de
integrações, recebe `pecas -> instagram` (publica) e devolve
`instagram -> pecas` (marca o que saiu).

## Quadrado e vertical, e as duas regras de proporção da Meta

As peças do Hub não têm um formato só: um carrossel nasce quadrado (1080x1080)
ou vertical (1080x1350), conforme o CSS da peça. O render já lidava bem com
isso, e por um motivo que vale registrar: `render-paginas.cjs` fotografa o
**elemento `.slide`**, e não o viewport. A viewport de 1080x1350 é só o palco; o
PNG sai do tamanho real que a peça declarou.

O que faltava era o Hub saber o que a Meta aceita. São duas regras, e as duas
são silenciosas do lado de lá:

**A proporção precisa ficar entre 4:5 e 1.91:1.** Fora disso a peça é recusada,
e o erro que volta não diz qual página nem qual medida. Uma peça em formato de
stories (9:16) cairia aqui.

**Num carrossel, todas as imagens saem na proporção da primeira.** As outras são
cortadas, sem aviso, **depois de publicadas**. Esta é a pior das duas: ela não
falha, ela estraga, e não tem desfazer.

Por isso as duas viram recusa em `conferirPedido`, antes de subir o primeiro
byte, com a mensagem dizendo qual página é o problema e qual é a medida dela. Ler
as medidas não precisou de dependência nova: PNG guarda largura e altura no
IHDR, em posição fixa, e JPEG no primeiro marcador SOF.

Duas escolhas de fronteira: imagem que não deu para medir **não** vira problema,
porque o formato já foi aceito antes e recusar por não saber ler seria inventar
um defeito; e a folga de 2% na comparação existe porque 1080x1350 e 1080x1349
são a mesma intenção de desenho.

Na tela, a prévia passou a mostrar a **proporção real** em vez de uma caixa fixa
de 4:5. Uma peça quadrada aparecendo com tarja nos dois lados daria a entender
que ela sai assim no Instagram. Como todas as páginas de uma mesma peça
compartilham a proporção, a grade continua alinhada sozinha.

## O que continua fora

Agendamento por horário e publicação para conta de terceiro. O primeiro por
escopo desta rodada; o segundo por App Review, como
`docs/planos/instagram/01-visao.md` já registrava.

Reels também estava aqui, e saiu em 2026-08-06. Ele **não** passa pelo armazém:
vídeo é a única coisa desta API que aceita upload de bytes, e por isso ele sobe
direto do Hub pra Meta. Ver `2026-08-06-o-reels-sobe-por-bytes.md`.
