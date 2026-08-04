# O fluxo de anúncios, e a campanha que virou arquivo

## Contexto

O Jesse pediu um terceiro fluxo de criação, no mesmo trilho do carrossel e do
site: parte do Cérebro, junta as fontes de dados, roda a skill que já existe. A
diferença é o que sai do outro lado. Nas palavras dele, anúncio de Google Ads é
complexo demais para caber num cartão de galeria, então o fluxo termina numa
**página dedicada com tudo dividido em blocos** e num **chat lateral que
continua a mesma conversa que gerou tudo**, com poder de mudar o que está na
tela.

O que existia: a skill `/anuncio`, em todas as seis pastas VKOS do projeto,
bifurcada entre Google e Meta, gravando **um markdown solto**. Nunca tinha sido
rodada: não havia uma peça de anúncio em disco em lugar nenhum. E **zero linha
de código de Google Ads no repositório**, só menção em documento.

## Decisão 1: a campanha é `anuncio.json`, com contrato validado

Escolha do Jesse, entre markdown e JSON.

Google Ads é rígido por natureza: título tem 30 caracteres, descrição tem 90,
frase de destaque tem 25. Um título de 34 caracteres é recusado pelo painel. O
valor da página dedicada é **afirmar campo a campo que aquilo cabe**, e markdown
solto não permite dizer "este é o título 7 do grupo 2".

Não existe um `anuncio.md` gerado ao lado. Cada campo da tela copia sozinho, e
dois arquivos dizendo a mesma coisa acabam divergindo.

**O Zod valida FORMA, jamais tamanho de texto.** Falta de campo ou tipo errado
significa que a IA não entregou uma peça. Um título de 34 caracteres é uma
campanha perfeitamente legível com um problema que o dono precisa VER. Se o
schema reprovasse isso, um título ruim tornaria a campanha inteira ilegível, e o
dono ficaria sem nada em vez de ficar com quase tudo. Os limites viram
`conferirLimites`, uma função pura que devolve violações com caminho
endereçável, e a tela lê o veredito do servidor em vez de recalcular.

## Decisão 2: a página mostra a campanha inteira, nove blocos

Também escolha do Jesse, entre nove blocos, cinco e dois.

Estratégia, estrutura, palavras-chave, negativas, anúncios, recursos, orçamento,
conversões e publicação. Campanha pela metade não dá para lançar: sem orçamento
e sem conversão o dono não sabe se está ganhando ou perdendo dinheiro.

Os nove blocos são **visões sobre a árvore**, não nove campos de topo. A árvore
segue a anatomia real do Google Ads (campanha contém grupos, grupo contém
palavras-chave e anúncios), que é o que o dono vai reproduzir no painel.

## Decisão 3: a sessão nasce confinada na pasta da peça

O carrossel e o site rodam na raiz do workspace e deixam a IA criar a pasta. O
anúncio faz diferente: **o Hub cria a pasta antes de disparar, e o `cwd` da
sessão já é a pasta da peça.**

O motivo não é higiene, é o chat. O chat da tela **retoma essa mesma sessão**, e
sessão que nasce com o pé na raiz do workspace fica com ele para sempre. Viraria
um agente solto perto do Cérebro. Nascer confinada resolve na origem, sem
depender de instrução no prompt, que o pedido do usuário sempre pode contornar.

A consequência: de uma subpasta não dá para contar com o provedor descobrindo
`.claude/skills/` subindo diretórios. Então o prompt **embute o `SKILL.md`**. Ao
escrever o plano eu afirmei que `provedores/skills.ts` já fazia esse inline para
o Codex. **Não faz:** ele emite "Leia o arquivo `.claude/skills/<nome>/SKILL.md`",
que é exatamente a resolução de caminho que este fluxo não pode usar. O leitor
que já existia em `vkos/skills.ts` ganhou `lerConteudoSkill`, em vez de nascer um
segundo leitor de skill.

**Medido, não presumido.** Duas gerações reais, num VKOS fora do repositório: a
sessão confinada gerou normalmente, o `anuncio.json` passou no schema **na
primeira tentativa nas duas rodadas**, o `cerebro.md` saiu byte a byte idêntico e
nada nasceu fora da pasta. O plano B não entrou em uso.

## Decisão 4: o contrato do JSON mora colado ao schema

O texto que ensina a IA a escrever o `anuncio.json` vive no servidor, em
`anuncios/contratoPrompt.ts`, derivado da mesma constante de limites que a
conferência usa. Um teste percorre as chaves do schema e afirma que o texto cita
cada uma.

Se ele morasse no web, o schema ganharia um campo um dia e o prompt nunca
ficaria sabendo, do outro lado de uma fronteira de processo. O web monta só a
intenção do dono, e o servidor costura.

**A IA precisa saber o limite para respeitar, não só para ser reprovada depois.**
É por isso que os limites vão escritos por extenso no prompt, e é por isso que as
duas gerações reais saíram com zero violação.

## Decisão 5: o que o schema não pega, o prompt pega

A primeira geração real passou no schema e mesmo assim entregou uma campanha
pior do que o dono faria na mão. Dois defeitos, os dois consertados por regra no
prompt e reprovados na rodada seguinte:

1. **A campanha inteira saiu sem acento** ("orcamento", "bebe", "album"). O
   Google publica exatamente o que se escreve, e quem lê é um cliente decidindo
   se confia no negócio. A segunda rodada saiu com 171 caracteres acentuados.
2. **Saiu um grupo de anúncios só.** Um grupo obriga um texto médio que não fala
   com ninguém: quem busca o serviço, quem busca preço e quem busca a cidade
   estão em momentos diferentes. A regra pede de 2 a 4, um por intenção, e a
   segunda rodada saiu com três.

A lição: **validação de forma não é validação de qualidade.** Schema verde e
resultado ruim convivem bem, e só uma geração de verdade mostra isso.

## Decisão 6: o laço de conformidade separa forma de conteúdo

Espelho do laço do site, máximo 2 voltas. Arquivo ausente, JSON ilegível ou
forma reprovada retomam a mesma sessão com **o erro literal do schema**.

**Violação de limite de caractere NÃO dispara o laço.** É conteúdo, aparece
marcada na tela, e o dono corrige pelo chat ou na mão. Fazer a IA girar duas
vezes para tirar um caractere é gastar dinheiro num trabalho de dois segundos.

Junto veio o fechamento de um buraco: `classificarPeca` chama a peça de
`"anuncio"` só por existir o arquivo, sem olhar o conteúdo, então um JSON
corrompido seria anunciado como campanha pronta. A peça passou a carregar
`anuncio: { valido, erro }`, no espelho exato do `peca.site` que já existia. O
veredito ficou no servidor e não no critério do frontend porque **ele vale em
todo consumidor e sobrevive ao Hub reiniciar**, e estado de sessão não sobrevive.

## Decisão 7: a conversa foi extraída, e as três cópias ficaram

A lógica de somar a transcrição REST com a fatia do stream ao vivo existia em
**três cópias divergentes**: `ChatIde`, `CerimoniaCerebro` e `NoSessao`. Nasceu
`comum/usarConversaSessao.ts` mais `comum/Conversa.tsx`, sem qualificação por
ancestral (o CSS do chat da IDE depende de `.tela-ide`, e é por isso que ele
nunca saiu da janela dele).

**As três não foram migradas, de propósito.** Trocar os três junto com a estreia
de um fluxo é quebrar duas coisas ao mesmo tempo. A dívida fica declarada aqui,
com nome e motivo, e a migração é rodada própria.

A continuidade foi provada com IA real, dois turnos: o segundo pedido citava "o
grupo 2" sem repetir qual, e a sessão retomada entendeu. Isso é o `--resume`
funcionando com o `cwd` na subpasta, e é o que separa "um chat do lado" de "o
mesmo chat que criou tudo". Sessão morta é dita na cara, com o campo desligado
até o dono começar outra: fingir continuidade que morreu destruiria o único
valor desta parte.

## Decisão 8: fluxo que só nasce completo pelo assistente sai do canvas

O Jesse gerou pelo nó de sessão do Cockpit e levou `400`. O compositor do canvas
manda o comando cru da skill, sem pasta alvo, e a pasta é o diretório de trabalho
da sessão.

O primeiro conserto tratou metade: `Fluxo` ganhou `abreAssistente` e o Cockpit
passou a navegar em vez de criar nó. Isso fecha a porta de entrada e **não fecha
o nó que já está salvo no `canvas.json`**, que continua sendo montado a cada
abertura. Era exatamente o caso dele. A guarda definitiva foi para o ponto onde
o nó é RENDERIZADO.

**Guarda na criação protege o futuro, guarda na renderização protege o que já
existe.** Estado salvo em disco sobrevive à correção que só olha para a entrada.

O carrossel não precisa disso: `/carrossel` cru gera um `carrossel.html` de
verdade, que o Hub classifica certo e abre no Studio. O caminho curto entrega
menos, mas entrega. `/anuncio` cru gera o markdown padrão da skill, que vira peça
do tipo "texto" e não tem página nenhuma.

**A porta de volta também precisava existir.** A campanha não entra na galeria
unificada, que é de peça de imagem e depende de miniatura. Sem item próprio na
barra, o dono só voltava numa campanha pelo cartão de recentes ou digitando o
endereço. A seção Conteúdo ganhou "Anúncios", condicional como o item de site.
Criar sem conseguir voltar é meia funcionalidade.

## O que NÃO entrou

- **Nada da API do Google Ads.** Sem OAuth, sem envio, sem métrica. A Fase 7 do
  roadmap continua adiada. O resultado é uma campanha pronta para colar no
  painel, no mesmo espírito da exportação local que substituiu a publicação
  integrada em 2026-07-26.
- **Nenhuma alteração no `SKILL.md` da `/anuncio`.** O arquivo é do produto VKOS
  e está copiado em seis pastas. O contrato de saída é declarado pelo prompt do
  Hub, como o Site Guiado já faz com a `/site`.
- **Nenhum ramo Meta.** O campo `plataforma` existe no schema para o dia em que
  a Meta entrar, sem obrigar migração.

## Por quê

Duas lições que valem além deste fluxo.

**A primeira é sobre prova.** Um agente relatou ter editado à mão a transcrição
de teste para a foto mostrar o comportamento corrigido, e o conserto que ela
ilustrava não tinha teste nenhum. O conserto era real, mas foto retocada não é
prova. O teste entrou depois, e só passou a valer quando a correção foi apagada
de propósito e ele reprovou. **Teste que passa com a injeção apagada não é
teste**, e essa regra já estava escrita na casa antes desta rodada.

**A segunda é sobre onde uma regra mora.** Três vezes nesta rodada o defeito foi
uma decisão guardada longe do dado que ela governa: o contrato do JSON longe do
schema, a guarda do fluxo longe do nó renderizado, e o conjunto de skills fazendo
dois trabalhos ao mesmo tempo (quem guarda `pastaAlvo` e quem roda auditoria de
site). Em todos, o conserto foi aproximar a regra do que ela decide.
