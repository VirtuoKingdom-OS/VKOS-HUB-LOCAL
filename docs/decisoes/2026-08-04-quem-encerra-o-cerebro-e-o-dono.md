# Quem encerra o Cérebro é o dono, e a conversa continua pelo Chat

Data: 2026-08-04

## Contexto

Na primeira entrevista real, a cerimônia fechou sozinha no meio de um assunto e
anunciou que o Cérebro estava pronto. O dono não pediu isso e não teve como
discordar.

O mecanismo era este: a tela de fim substituía a conversa assim que
`cerebroPreenchido` virava verdadeiro e o turno terminava. A IA gravava o
`cerebro/cerebro.md`, o servidor via arquivo com conteúdo, e a interface trocava
a conversa por "O Cérebro está pronto".

Dois defeitos numa coisa só. **Gravar o arquivo é fato do disco; declarar a
identidade pronta é julgamento**, e o julgamento é de quem é dono do negócio.
E a troca acontecia justamente quando ainda havia o que ajustar: a IA grava a
primeira versão cedo, no meio da entrevista, não no fim dela.

Depois de fechada, também não havia por onde voltar. O painel do Cérebro só
sabia ler e editar à mão. Mexer na voz do negócio, que foi decidida conversando,
virava edição de markdown.

## Decisão

**A cerimônia não se encerra sozinha nunca.** A tela de fim passa a depender de
um estado local, e só o botão liga esse estado. O Cérebro estar gravado habilita
o botão, e mais nada.

**O botão tem dois passos.** O primeiro troca a faixa pela pergunta, o segundo
conclui. Um clique sem querer no canto da tela não encerra a tarefa mais longa
do produto.

**A faixa é neutra, não verde.** Ela fica na tela o resto da conversa inteira, e
menta permanente vira decoração. O menta desta tela continua sendo o selo do
fim, que acontece uma vez.

**O painel do Cérebro ganhou duas guias, Ler e Chat.** O Chat é a MESMA sessão
da cerimônia, reencontrada pelo título fixo. Ao terminar um turno, a guia Ler
relê o arquivo sozinha, menos durante a edição à mão, onde o dono é a fonte da
verdade e trocar o texto embaixo do cursor perderia o que ele está escrevendo.

**Quando a sessão morreu, isso é dito na cara**, no mesmo padrão do chat da
campanha: faixa, campo desligado e o botão de começar outra. A conversa nova
não invoca o `/instalar`; ela recebe um prompt próprio que manda ler o
`cerebro/cerebro.md` que já existe, mexer só no que foi pedido e não recomeçar a
entrevista.

## Por quê

**Por que a mesma sessão, e não um chat novo ao lado do documento.** A
entrevista sabe o que já foi perguntado, o que o dono respondeu e o que ele
recusou. Um chat novo sabe nada disso, e a primeira coisa que ele faz é
perguntar de novo o que já foi respondido. É a mesma razão pela qual o chat da
campanha retoma a sessão que escreveu o `anuncio.json`.

**Por que o prompt da conversa nova não usa o `/instalar`.** A skill conduz a
entrevista inteira, bloco por bloco. Usá-la sobre um documento pronto faria a IA
remontar uma identidade que já está escrita.

**Por que a leitura recarrega sozinha.** Pedir uma mudança pelo Chat e voltar
para a guia Ler mostrando o texto de antes é a pior forma de errar num documento
de identidade: silenciosa. A pessoa acreditaria que o pedido não pegou, e
pediria de novo.

As partes puras (achar a sessão, decidir se ela morreu, montar o prompt) moram
em `cerebroConversa.ts`, fora do componente, com trava em
`cerebroConversa.test.ts`. Injeção de conteúdo se testa afirmando o conteúdo
injetado.
