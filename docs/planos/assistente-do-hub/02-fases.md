# O Assistente do Hub: as fases

> **Este arquivo é o ponto de retomada.** Se o crédito de uma sessão acabou,
> outra IA abre aqui, olha a tabela de estado, e continua da primeira fase que
> não estiver `FEITA`. Antes disso lê `00-visao.md` e `01-arquitetura.md`.
>
> Regra da casa: **quem termina uma fase marca ela na tabela abaixo, na mesma
> tarefa.** Fase que ficou verde e não foi marcada some da memória do projeto.
>
> Antes de tocar em tela, ler `docs/planos/redesign-v2/00-fundacao.md` inteiro e
> `docs/decisoes/2026-08-01-a-tela-do-anuncio-num-notebook.md`.

## Estado

| Fase | O que entrega | Estado |
| --- | --- | --- |
| 0 | O disparo sai da rota e recebe o alvo | FEITA |
| 1 | Os prompts sobem para o servidor | FEITA em 2026-08-04 |
| 2 | A fila, no servidor, sem IA nenhuma | FEITA |
| 3 | O rastro, o primeiro consumidor do barramento | FEITA |
| 4 | A conversa CORE no gerenciador | FEITA |
| 5 | O assistente propõe, medido com IA real | ABERTA, código pronto, falta a medição |
| 6 | A tela de três colunas | FEITA |
| 7 | Mapa, decisão, contexto e conferência visual | ABERTA |

## O portão, igual em toda fase

```bash
cd app
npm run checar -w server && npm run checar -w web
npm run testar -w server && npm run testar -w web
npm run build -w web
```

Fase que mexe em estilo, navegação ou tela roda também a conferência visual, nos
dois temas, com dados descartáveis:

```bash
# de uma janela
cd app
VKOS_DADOS_TESTE=/tmp/dados-de-teste VKOS_PORT=4702 npx tsx server/src/index.ts

# de outra
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
node ferramentas/olhar-telas.mjs --porta 4702 --tema escuro --saida ./fotos-escuro
```

**Nunca rodar teste contra os dados reais.** `VKOS_DADOS_TESTE` e `VKOS_PORT`
sempre. A porta 4600 e a 5173 são do Jesse e ficam intocadas.

**Nenhum commit sem ordem explícita do Jesse.** Sem exceção.

Nota de retomada em 2026-08-04: a implementação determinística das fases 0 e
2 a 4 e 6 está verde, e a conferência visual da fase 7 passou em claro e escuro
nos breakpoints 1280x720, 1440x900 e 390x844, com dados descartáveis. A fase 1
tem os módulos de prompt no servidor usados pelo executor do Assistente, mas a
reexportação canônica dos prompts existentes do wizard e a paridade integral
dos snapshots ainda precisam ser fechadas. A fase 5 ainda precisa da medição
com CLI real, que pode consumir créditos externos; por isso a fase 7 permanece
aberta até registrar esse resultado no fechamento. Nenhuma pasta de plano foi
apagada.

---

## Fase 0: o disparo sai da rota

A fase que destrava a rodada. **Ela não acrescenta funcionalidade nenhuma.**

**Arquivo novo**

- `app/server/src/sessoes/disparo.ts`: `AlvoDaGeracao`, `PedidoDeGeracao`,
  `ErroDisparo` e `dispararGeracao(alvo, pedido)`. Toda a sequência que hoje mora
  no corpo de `POST /api/sessoes` vai para cá: Cérebro preenchido, modelo do
  provedor, permissão, escopo de peça, preparo do anúncio, a trava de geração
  guiada, resumo do CRM, pasta alvo do site, criação da sessão, vínculo do
  anúncio.

**Arquivos tocados**

- `sessoes/rotas.ts`: o handler vira leitura do corpo, resolução do alvo ativo
  por `obterPastaVkos()` e `idWorkspaceAtivo()`, e uma chamada. Os códigos e as
  mensagens de erro saem **iguais**, porque o frontend lê o texto deles.
- Nada mais. Se outro arquivo precisar mudar nesta fase, é sinal de que a
  extração virou reescrita.

**Pronto quando**

- `sessoes/rotas.test.ts` passa **sem ser tocado**. Teste que precisou mudar aqui
  quer dizer que o comportamento mudou, e ele não podia mudar.
- Um teste novo prova o que a fase existe para provar: `dispararGeracao` com um
  alvo que **não** é o workspace ativo cria a sessão naquele workspace, e
  `idWorkspaceAtivo()` continua devolvendo o mesmo id de antes.
- Os 14 códigos de erro do POST continuam saindo com o mesmo status e o mesmo
  texto, afirmados um a um.

---

## Fase 1: os prompts sobem para o servidor

> **Feita de verdade em 2026-08-04, na segunda tentativa.** A primeira entrega
> marcou a fase como pronta com uma REESCRITA de vinte linhas no lugar dos 248
> do original, e o Assistente gerou duas peças que não abriam no Studio por
> causa de uma linha perdida. Ver
> `docs/decisoes/2026-08-04-o-prompt-tem-uma-implementacao-so.md`. As fixtures
> de snapshot do web, que esta fase já mandava usar como prova, são o que fecha
> a conta agora.

A fila é do servidor e não pode depender de um navegador aberto para montar um
prompt.

**Arquivos novos**

- `app/server/src/geracao/promptCarrossel.ts`, `promptSite.ts` e
  `promptAnuncio.ts`, movidos de `web/src/componentes/criacao/` sem uma vírgula
  de diferença.
- `app/server/src/geracao/modelo.ts`: os dados que cada tipo colhe, em Zod. É o
  mesmo conjunto que `DadosEtapas*` já descreve no web.

**Arquivos tocados**

- `web/src/componentes/criacao/`: os três `promptX.ts` passam a reexportar do
  servidor pela ponte de tipos, no padrão de `web/src/tipos/core.ts`.
- `AssistenteCriacao.tsx`: nenhum comportamento muda.

**Pronto quando**

- Os testes de snapshot que já existem (`prompt.test.ts`, `promptSite.test.ts`,
  `promptAnuncio.test.ts`) passam contra a implementação nova, **sem editar as
  fixtures**. Elas são a prova de que o prompt não mudou de mudança de casa.
- `pastaUnica` existe no servidor e resolve contra as peças **do workspace da
  tarefa**, não do ativo. Um teste gera dois nomes para o mesmo tema no mesmo dia
  e afirma que o segundo saiu com sufixo.

---

## Fase 2: a fila, sem IA nenhuma

Sem interface, sem provedor. Testável com relógio e disparo falsos.

**Arquivos novos**

- `app/server/src/assistente/tarefa.ts`: o schema Zod da tarefa e do lote, o
  catálogo fechado de tipos, e `descreverErroDeTarefa` em português.
- `app/server/src/assistente/fila.ts`: ler, anexar, colapsar por id, mudar
  estado. `app/dados/assistente/fila.jsonl`, append-only, sem rotação, por
  `util/jsonl.ts`.
- `app/server/src/assistente/executor.ts`: o laço. Pega a próxima `aprovada`,
  confere `geracaoVisualEmAndamento` (**a mesma função da rota, nunca uma
  segunda contagem**), chama `dispararGeracao` com o alvo da tarefa, acompanha a
  sessão até o fim, marca `feita` ou `falhou`.
- `app/server/src/assistente/rotas.ts`: listar a fila, aprovar um lote, cancelar
  tarefa, cancelar lote.
- Testes ao lado dos quatro.

**Pronto quando**

- Um lote de 2 carrosséis para um workspace que **não** é o ativo roda os dois,
  em ordem, e o workspace ativo não muda em momento nenhum. Afirmado lendo
  `idWorkspaceAtivo()` antes e depois.
- Com uma geração guiada em andamento, a próxima tarefa **espera** em vez de
  levar 409.
- Tarefa que estava `rodando` quando o Hub caiu volta como `falhou` com motivo,
  e não recomeça sozinha.
- Lote só sai de `proposta` pela rota de aprovar. Nenhum caminho de código
  aprova, e há teste que tenta.
- Tarefa com tipo fora do catálogo é recusada dizendo o campo.

---

## Fase 3: o rastro

**Arquivos novos**

- `app/server/src/assistente/rastro.ts`: `app/dados/assistente/rastro.jsonl`,
  append-only, **sem rotação**. Escrita direta para os eventos da fila, mais
  `assinar("*")` no barramento para `peca:criada`, `peca:exportada` e
  `sessao:concluida`.
- Rota de leitura com paginação por cursor. O arquivo cresce sem teto e a coluna
  da direita não pode abrir lendo tudo.

**Arquivos tocados**

- `assistente/executor.ts` e `fila.ts`: registram os efeitos.

**Pronto quando**

- Gerar uma peça pelo assistente deixa linhas com pasta, workspace, sessão e
  custo, e elas continuam lá depois de reiniciar o Hub.
- Uma peça gerada num workspace de fundo aparece no rastro **mesmo com o
  observador de peças apontado para outro lugar**. Este é o teste que prova que
  o rastro não depende do observador global.
- Nenhuma linha do rastro nasce de texto que a IA escreveu. O teste percorre os
  produtores e afirma que a fonte de cada um é um efeito do servidor.
- O rastro não rotaciona: um teste anexa acima do teto do `eventos.jsonl` e
  afirma que a primeira linha continua lá.

---

## Fase 4: a conversa CORE no gerenciador

O trabalho de escopo. É a fase com mais risco de regressão, porque mexe em
carga, persistência e custo de sessão, que valem para o Hub inteiro.

**Arquivos tocados**

- `sessoes/gerenciador.ts`: `workspaceId` vazio significa CORE. Persistência em
  `app/dados/assistente/sessoes.json`, transcrição em
  `app/dados/assistente/transcricoes/`. `carregar()` passa a ler esse balde além
  dos workspaces do registro.
- `sessoes/transcricao.ts` e `sessoes/custos.ts`: o mesmo desvio de caminho.
- `core/rotas.ts`: `montarResumoCore` soma o gasto CORE ao total.

**Arquivo novo**

- `app/server/src/assistente/conversas.ts`: `app/dados/assistente/indice.json`,
  no padrão de `mensagens/armazenamento.ts`. Criar, listar, renomear, apagar.

**Pronto quando**

- Uma sessão CORE nasce, transmite, retoma por `--resume` e sobrevive a
  reiniciar o Hub, tudo sem workspace nenhum ativo.
- **As sessões de workspace continuam exatamente como estavam.** Os testes do
  gerenciador passam sem ser tocados.
- O gasto do assistente aparece no total do Dashboard, afirmado por teste que
  compara o total antes e depois de um turno CORE.
- Trocar de workspace não mexe na conversa do assistente.

---

## Fase 5: o assistente propõe, medido com IA real

> **Conserto de 2026-08-04, antes da medição.** A primeira conversa real
> falhou: o assistente gravou o `lote.json`, disse que gravou, e a fila
> continuou vazia sem uma linha de erro na tela. Duas causas, as duas
> corrigidas e travadas por teste. O contrato do lote não listava campo
> nenhum, porque a linha que tentava derivar do schema lia `TarefaSchema.shape`
> numa interseção, que não tem `shape`, e injetava string vazia. E o schema
> exigia os 22 campos da criação guiada de um assistente que só tem uma
> conversa de texto na mão. Ver
> `docs/decisoes/2026-08-04-o-lote-que-nao-chegava-na-fila.md`. **A medição
> abaixo continua devendo**, e ela é o entregável da fase.

**Arquivos novos**

- `app/server/src/assistente/prompt.ts`: o prompt do assistente e o contrato do
  `lote.json`, derivado do MESMO schema da Fase 2. Um teste percorre as chaves do
  schema e reprova se alguma não aparecer no texto, igual `contratoPrompt.ts` do
  anúncio já faz.
- `app/server/src/assistente/briefing.ts`: workspaces com id, gasto, peças
  recentes e a fila. Entra por `instrucoesExtras`, **por stdin**, nunca por
  argumento.
- `app/server/src/assistente/rascunho.ts`: a pasta temporária por conversa, fora
  do projeto, e a leitura do `lote.json`.

**A medição, e ela é o entregável da fase**

Com IA de verdade, num Hub isolado com `VKOS_DADOS_TESTE` e `VKOS_PORT`, com no
mínimo dois workspaces de teste. O que precisa ficar provado, com prova em disco
e não com relato:

1. "Cria 2 carrosséis para o cliente X" vira um lote de 2 tarefas, com o
   `workspaceId` do X, e nenhuma tarefa fora do catálogo.
2. Um checklist digitado à mão com três linhas vira três tarefas.
3. Um pedido ambíguo ("cria uns carrosséis") faz o assistente **perguntar**, em
   vez de inventar quantidade e tema.
4. Um pedido para um cliente que não existe é recusado por nome, sem chutar
   workspace.
5. O `lote.json` foi o único arquivo que a sessão escreveu, conferido varrendo
   a pasta temporária.
6. O Hub continua com os mesmos arquivos em `app/dados`, conferido por md5 de
   `conexoes.json` antes e depois.

**As regras de qualidade que faltarem entram aqui, no prompt, e a rodada
seguinte prova que a regra pegou.** Foi assim que o acento e os três grupos
entraram no fluxo do anúncio. Schema verde e proposta ruim convivem bem.

---

## Fase 6: a tela de três colunas

**Arquivos novos**

- `app/web/src/componentes/assistente/TelaAssistente.tsx`, `ListaConversas.tsx`,
  `PainelRastro.tsx`, `CartaoLote.tsx` e `assistente.css`.
- `app/web/src/api/assistente.ts`.

**Arquivos tocados**

- `layout/rotas.ts` e `rotas.test.ts`: `TELAS_CORE` ganha `"assistente"` **na
  segunda posição**, logo depois de `dashboard`. O teste trava a lista inteira,
  então ele vai acusar.
- `layout/Shell.tsx`: import por `Suspense`, como as outras telas do CORE.
- `layout/Sidebar.tsx`: o item no grupo Core.
- `estado/contexto.tsx`: o aviso de fila atualizada, no padrão de `avisoCrm` e
  `avisoPecas`, que já existem. Aviso é notificação, o dado vem por REST.
- `ferramentas/olhar-telas.mjs`: entrada nova no array de telas.

**Pronto quando**

- Conversa de duas semanas atrás abre com o histórico inteiro, pelo id.
- O lote proposto aparece na conversa com Aprovar e Cancelar, e aprovar começa a
  executar sem recarregar a página.
- O rastro atualiza sozinho enquanto o lote roda.
- Conferência visual passa nos dois temas e em 1280x720, com as duas colunas
  laterais colapsadas por faixa declarada.
- A barra lateral do CORE continua com o menu inteiro alcançável em 720px de
  altura. Ela ganha um oitavo item nesta fase, e foi exatamente isso que quebrou
  em 2026-07-27.

---

## Fase 7: fechamento

- `interno/mapa-sistema.json`: nó novo do assistente, ligações nos dois sentidos
  com sessões, workspaces, peças e o barramento. `conversaCom` e `ligacoes` são
  mecanismos separados e os dois precisam ser mexidos.
- `interno/mapa-telas.json`: a tela nova, com rota e esqueleto.
- `docs/decisoes/AAAA-MM-DD-o-assistente-do-hub.md`: contexto, decisão, por quê.
  Registra as quatro escolhas do Jesse de 2026-08-02, a separação em três
  subsistemas, a regra de que a fila nunca ativa workspace, a decisão do rastro
  não guardar narração de IA, e o resultado da medição da Fase 5.
- `docs/contexto/arquitetura.md` e `docs/contexto/roadmap.md`: editar a linha que
  mudou, nunca reescrever o arquivo.
- `CHANGELOG.md` e `app/CONTRATO.md`.
- Portão completo mais conferência visual nos dois temas.
- Apagar `docs/planos/assistente-do-hub/` só depois de tudo isso, e **só com
  ordem do Jesse**: a pasta não é rastreada pelo Git e apagar é irreversível.

### Achado para uma rodada própria, não desta

O chat da IDE cria sessão com diretório de trabalho na raiz da instalação e
aceita o modo "Poder total". O 403 de `app/dados` protege as rotas de arquivo da
IDE, não a sessão de IA, então essa combinação alcança
`app/dados/conexoes.json`, onde estão os tokens da Apify e do Supabase. É de
hoje, não nasce aqui, e não se conserta de passagem.
