# Fechar guarda, descartar apaga

## Contexto

A Cerimônia do Cérebro tinha uma saída só: o X, que **guarda**. A sessão segue
viva no servidor e reabrir retoma de onde parou. Isso é certo, e é a promessa que
a própria tela faz: *"Pode parar no meio e voltar depois: nada se perde."*

Faltava a outra saída. Quem começa a entrevista guiada e percebe no meio que
prefere soltar o `.md` que já tinha escrito, ou escrever à mão, ficava preso: as
três portas do cartão de boas-vindas não voltavam mais. Fechar e abrir de novo
caía na **mesma** conversa, porque `acharSessaoDoCerebro` reencontra a entrevista
pelo título fixo.

## Decisão

**Descartar apaga a sessão no servidor, e não só fecha a tela.**

Meia medida aqui seria a pior de todas as versões possíveis: a tela diria
"descartado", e a próxima abertura traria a entrevista de volta. O `DELETE` do
servidor mata o processo em voo, esquece o laço, apaga a transcrição e tira a
sessão do registro, então depois dele a cerimônia começa limpa de verdade.

O botão fica **ao lado do X** porque os dois são saídas, e a diferença entre eles
é a única coisa que a pessoa precisa entender ali: fechar guarda, descartar apaga.

### Quatro coisas que quase viraram bug

**1. Apagar só "a que vale" deixaria a anterior ressuscitar.** Cada "Recomeçar"
da saída de falha abre uma sessão **nova** com o mesmo título fixo, porque a
conversa pertence ao motor que a abriu. A tela sempre mostrou a última, e isso
está certo para ler. Para descartar, não: apagando só a última, a anterior
passaria a ser "a mais recente" e voltaria na próxima abertura, com a pessoa
achando que tinha descartado tudo. Nasceu `sessoesDoCerebro()`, que devolve
todas, e o descarte roda em série sobre ela.

**2. 404 é o destino, não uma falha.** A sessão já não existir é exatamente o
estado que o botão quer alcançar. Tratar como erro deixaria a pessoa presa numa
tela que ela mandou fechar.

**3. Esc pulava dois passos.** Com uma confirmação armada, `Esc` fechava a
cerimônia inteira. Esc quer dizer "volta um passo": agora ele desarma primeiro e
só fecha no segundo toque. Isso **já valia para o `confirmandoFim`** e nunca tinha
sido tratado; foi consertado junto.

**4. A corrida do "Recomeçar".** Com uma entrevista nascendo, o descarte apagaria
as que existem, fecharia a tela, e a nova nasceria **depois**, órfã. O cartão de
boas-vindas nunca voltaria, porque ele exige lista de sessões vazia, e ninguém
saberia de onde veio aquela entrevista. O botão fica desligado enquanto
`comecando` ou `trocando`.

### A confirmação tem frase, e a frase muda

Um "tem certeza?" sem dizer o que some não é confirmação, é susto. E o que some é
mesmo diferente conforme o Cérebro já ter conteúdo gravado: **a conversa sempre
morre, o arquivo do Cérebro não.** São dois textos, e cada um é verdade no seu
caso.

O botão do topo é fantasma, e não perigo: ele fica visível os dez minutos da
entrevista, e contorno vermelho parado ali esse tempo todo vira decoração, do
jeito que o triângulo permanente do "Versão Beta" já virou uma vez. A tinta de
alerta entra no hover e na confirmação, que é quando ela significa alguma coisa.

## Por quê

**Porque "nada se perde" e "não dá pra recomeçar" não são a mesma promessa,** e a
tela só cumpria a primeira. Guardar tudo por padrão é a escolha certa para a
tarefa mais longa do produto; não oferecer nenhuma forma de desfazer, não.

**Porque a garantia que importa aqui é de consequência, não visual.** Uma versão
que só fechasse a tela passaria em qualquer conferência a olho: o botão está lá, o
clique funciona, a cerimônia fecha. O defeito só apareceria na segunda abertura.
Por isso a trava afirma que `excluirSessao` é chamado, e afirma a ordem: apaga,
depois fecha.

**Porque três dos quatro bugs acima só existem em combinação com uma falha de
motor**, que é justamente o caminho que ninguém testa à mão.
