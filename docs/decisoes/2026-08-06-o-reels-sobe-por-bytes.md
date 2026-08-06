# O reels sobe por bytes, e não pelo armazém

## Contexto

Publicar imagem no Instagram passa pelo Supabase Storage. Isso foi decidido em
2026-08-05, e a razão é dura: a API da Meta **não aceita upload de imagem**. Você
manda uma URL e ela vai buscar o arquivo. Como o Hub é local e não tem endereço
na internet, a peça precisa ficar alcançável por alguns segundos em algum lugar
que a Meta consiga abrir. Ver `2026-08-05-publicar-no-instagram.md`.

Reels ficou de fora daquela rodada, por escopo.

Ao voltar pra ele, a pesquisa que já estava escrita em
`docs/planos/instagram/01-visao.md` respondeu a pergunta antes dela ser feita:

> "Não existe upload de bytes para imagem. Só vídeo tem, pelo
> `rupload.facebook.com`."

## Decisão

**O vídeo vai direto do Hub pra Meta, pelo rupload, sem passar pelo armazém.**

São três tempos. O container nasce com `media_type=REELS` e
`upload_type=resumable`, e a resposta traz o id **e um endereço de envio**. O
arquivo vai pra esse endereço, com o token num cabeçalho `OAuth` em vez da query.
Só então o container é publicado, igual à imagem.

O endereço de envio é usado **como veio**. Ele chega com a versão da API
embutida, e montá-lo na mão amarraria o Hub a uma versão que um dia sai do ar.

## Por quê

**Reels publica com o Supabase desligado.** O armazém é a única dependência
externa de publicar, e ela some deste caminho. Fazer o vídeo passar por lá só
pra reusar código existente seria criar uma dependência que a API não pede.

**O balde não caberia.** Ele nasceu com teto de 20MB e a lista de tipos fechada
em JPEG e PNG, e a criação responde 409 quando ele já existe: quem já publicou
uma imagem tem o balde velho, com as regras velhas, e nenhum vídeo entraria.
Alargar o balde pra caber um giga de vídeo seria alargar também o que a
publicação de imagem aceita, e por nada.

**O plano do Supabase entraria no caminho.** O limite de arquivo do plano
gratuito é bem menor que o giga que a Meta aceita num reels. O caminho por bytes
não tem esse teto.

## O trabalho é em dois pedidos, e não num só

O corpo do vídeo **não passa por JSON**. Um reels de 200MB em base64 seria 266MB
de texto: o navegador teria que montar essa string inteira na memória antes de
mandar, e o servidor de novo pra ler. O arquivo vai cru, e o servidor grava
direto no disco sem que nenhuma string exista.

Ficou assim, e não num pedido só, por três motivos concretos:

**A ficha do vídeo aparece antes da legenda.** Quanto ele dura, que tamanho tem,
como vai ser enquadrado. É a informação que ainda muda o que a pessoa vai
escrever, e num pedido só ela chegaria depois de tudo.

**Falha ao publicar não obriga a mandar os bytes de novo.** Token vencido no meio
é caso real, e subir 200MB outra vez por causa dele seria castigo. Por isso o
arquivo temporário **sai só no sucesso**, e um `finally` ali estaria errado.

**O progresso é contável.** A barra existe porque o `fetch` não conta quanto do
corpo já subiu, e o `XMLHttpRequest` conta. Num arquivo grande, um giro sem
número é indistinguível de travado.

O que fica de dívida: fechar o navegador no tranco deixa o temporário pra trás.
Quem fecha o painel avisa e o Hub apaga; o resto a varredura leva em duas horas,
e ela roda antes de cada gravação nova.

## O que o Hub confere antes de gastar upload

Um reels tem duzentos megabytes com facilidade. Subir isso e ouvir "vídeo curto
demais" é um minuto jogado fora, e a mensagem que volta da Meta não diz quantos
segundos ele tem.

Então o Hub lê o MP4 antes: **duração fora de 3 segundos a 15 minutos e arquivo
acima de 1GB viram recusa**, com a duração escrita na mensagem.

Ler custa alguns bytes. O arquivo é uma árvore de caixas; `mvhd` guarda a
duração e a escala, e o `tkhd` de cada trilha guarda o tamanho. A leitura anda
pelas caixas em vez de assumir posição fixa porque **o `moov` mora no fim do
arquivo em quase todo vídeo de celular**, e é por pedaço em vez de
`readFileSync` porque o arquivo pode ter um giga.

**A matriz de rotação não é detalhe.** Vídeo gravado de pé no celular sai
1920x1080 no `tkhd`, com uma matriz de 90 graus: ele **exibe** 1080x1920. Ler só
os dois números faria o Hub chamar de horizontal um reels que é vertical, e
avisar errado é pior do que não avisar.

**Proporção fora do 9:16 é aviso, e nunca recusa.** A Meta aceita e enquadra
sozinha, com barra ou com corte, e quem desenhou pode ter querido assim. Aqui a
regra é oposta à do carrossel, onde proporção misturada vira recusa: lá o corte
acontece depois de publicado e não tem desfazer.

**Não conseguir ler não é defeito do vídeo.** Quando a leitura falha, o Hub
deixa passar e quem decide é a Meta. É o mesmo princípio de `proporcao.ts`:
recusar por não saber ler seria inventar um problema.

## Na tela

**O reels é aba própria, e não um vídeo caindo na aba do computador.** Ele tem
caminho diferente até a Meta, não se mistura com imagem no mesmo carrossel, e
tem uma escolha que só existe nele. Uma aba na lista também é a única forma de o
dono descobrir que dá.

**A escolha que só existe nele é aparecer ou não no feed**, e ela vai pra Meta
sempre, marcada ou desmarcada. O padrão do `share_to_feed` muda com o tipo de
conta, e omitir seria deixar a decisão do dono nas mãos de um valor que o Hub não
controla.

**A capa ficou de fora**, e isso é escolha, não esquecimento. A Meta aceita um
`thumb_offset` em milissegundos, mas pedir o segundo da capa sem mostrar o
quadro é pedir pra pessoa adivinhar. Ou o Hub mostra o quadro, ou ele não
pergunta.
