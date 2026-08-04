# O prompt de geração tem uma implementação só, e o HTML vence o PNG

Data: 2026-08-04

## Contexto

O Assistente criou dois carrosséis de verdade no workspace Mae Pixel. As peças
saíram, e vieram com dois defeitos: as duas com a mesma cara, e nenhuma das duas
abre no Studio.

Uma causa só para as duas coisas.

A Fase 1 do plano do Assistente pediu que os três prompts de geração subissem do
web para o servidor, **movidos sem uma vírgula de diferença**, com as fixtures
de snapshot que já existiam servindo de prova. O que aconteceu foi outra coisa:
o servidor ganhou uma REESCRITA. O `montarPromptCriacao` do web tem 248 linhas;
o do servidor tinha 20. Site: 256 contra 18. Anúncio: 81 contra 15.

O que a reescrita perdeu, no carrossel:

- **O contrato do modelo visual.** No original, escolher um modelo vira um
  contrato verificável: o caminho do arquivo em `templates/carrossel/`, a ordem
  de cópia, e a proibição de redesenhar por interpretação parecida. Sem ele, a
  frase `/carrossel <tema>, usando o modelo X` é só um nome solto.
- **As instruções de formato e dimensão**, que dizem o tamanho do `.slide`.
- **O modo direto**, que proíbe a IA de fazer pergunta numa sessão headless.
- **A linha da entrega**, e é ela que custou o Studio.

A linha da entrega diz, com todas as letras: *NAO execute o Passo 5 da skill
(renderizar). NAO gere nenhum PNG.* Sem ela a skill `/carrossel` roda o render e
salva PNG em `instagram/`. E `classificarPeca` classificava peça com PNG como
legado, legado não carrega `fonteHtml`, e sem `fonteHtml` o Studio recusa abrir.

O segundo defeito é mais simples: sem o contrato do modelo, e sem o assistente
saber que modelos existem, as duas tarefas do lote caíram na mesma escolha da
skill.

## Decisão

**Os três prompts de geração passam a morar no servidor, movidos verbatim.** O
web reexporta de lá. As fixtures de `web/src/componentes/criacao/fixtures/`
continuam passando sem uma edição, e é isso que prova que a mudança de casa não
mudou o texto. `IdFormato`, `IdProporcao`, `FORMATOS`, `PROPORCOES` e
`instrucoesImagem` foram junto, para `server/src/geracao/formato.ts`;
`web/src/config/fluxos.ts` reexporta.

**O `carrossel.html` passa a vencer o PNG de `instagram/` na classificação.**
Peça com os dois vira HTML-first e abre no Studio. Stories e post continuam
acima na ordem, porque eles também têm `carrossel.html` na pasta e passar o HTML
na frente transformaria um story em carrossel.

**O briefing passa a listar os modelos de carrossel de cada workspace**, lidos
de `templates/carrossel/modelo-*.html`. E o contrato do lote passa a mandar:
lote com mais de um carrossel no mesmo workspace manda `estilo` diferente em
cada um.

## Por quê

**Duas implementações do mesmo prompt divergem no primeiro dia.** Não é uma
previsão, é o que aconteceu: a cópia do servidor nasceu magra e ninguém viu,
porque nenhum teste comparava as duas. O prompt não é configuração, é o produto:
ele é a única coisa que a IA lê antes de gerar a peça que o dono vai publicar.

**Por que o HTML vence o PNG.** A decisão do HTML-first, de 2026-07-14, já dizia
que a fonte da verdade é o `carrossel.html` e que o PNG só nasce quando o dono
baixa. PNG velho ao lado de um HTML editado mente sobre o conteúdo, e o próprio
save do Studio apaga essas subpastas na primeira gravação. A ordem antiga
tratava a presença de um PNG como prova de que a peça era antiga, quando ela era
só prova de que alguém rodou o render.

**Por que listar os modelos no briefing.** O campo `estilo` já existia na
entrada da tarefa. O assistente nunca o mandava porque não tinha como saber
quais existem. "Escolha um estilo" só vira instrução executável com o catálogo
do lado.

## Como ficou provado

- As fixtures de snapshot do web passam contra a implementação no servidor, sem
  edição nenhuma. É a prova de que o texto não mudou de casa mudando.
- Num Hub isolado apontado para o Mae Pixel real, as quatro peças da pasta saem
  com `fonteHtml: true`, incluindo as duas do Assistente, que antes saíam como
  legado. O Studio abre a de Gamiologia com as 8 páginas e o painel de camadas.
- Nove testes novos, entre `pecas.classificacao.test.ts` e
  `modelosCarrossel.test.ts`. O de classificação afirma os quatro casos que
  importam: HTML vence PNG, PNG sozinho continua legado, HTML ilegível não rouba
  a peça do legado, e stories e post continuam acima.
