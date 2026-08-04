# O Assistente do Hub: a arquitetura

## 1. O disparo sai da rota, e é isso que destrava a rodada

Hoje `POST /api/sessoes` faz duas coisas misturadas: lê o alvo do estado global
e orquestra a geração. As linhas 244 e 257 de `sessoes/rotas.ts` chamam
`obterPastaVkos()` e `idWorkspaceAtivo()` sem parâmetro nenhum.

Nasce `sessoes/disparo.ts`:

```ts
export interface AlvoDaGeracao {
  workspaceId: string;
  pastaVkos: string;
}

export function dispararGeracao(
  alvo: AlvoDaGeracao,
  pedido: PedidoDeGeracao,
): { sessao: Sessao } // lança ErroDisparo com status pronto
```

`PedidoDeGeracao` é o que hoje chega no corpo HTTP: titulo, prompt, skill,
modelo, permissao, pastaAlvo. Toda a sequência de validação que hoje vive na
rota vai para dentro: Cérebro preenchido, modelo do provedor ativo, a trava de
geração guiada, o preparo do anúncio, o resumo do CRM, o vínculo peça e conversa.

Depois disso existem dois chamadores, e só dois:

- **A rota HTTP** passa o alvo ativo. Comportamento idêntico ao de hoje.
- **A fila** passa o alvo da tarefa. Nunca ativa workspace nenhum.

**`ativarPorId` continua sendo chamado só por gesto do usuário.** Está escrito
aqui porque é a regra que, se quebrada, faz a tela do dono pular para outro
cliente no meio do trabalho.

### O que precisa receber a pasta por parâmetro

Verificado antes de escrever este plano. A maior parte já recebe:

| Função | Hoje |
| --- | --- |
| `gerenciador.criar()` | já recebe `pastaTrabalho` e `workspaceId` |
| `prepararGeracaoAnuncio()` | já recebe `pastaVkos` |
| `resolverEscopoPeca()` | já recebe `pastaVkos` |
| `lerCerebro()` | já recebe a pasta |
| `lerPecas()` | já recebe a pasta |
| `resolverPeca()` | já recebe a pasta |

O que lê global é a rota. Por isso a Fase 0 é extração, não reescrita.

### Duas consequências que precisam ser tratadas, não ignoradas

**O observador de peças é único e global**, religado por `ativarPorId` e apontado
só para a pasta ativa. Peça gerada num workspace de fundo **não dispara**
`peca:criada` nem `pecas:atualizadas`. Quem sabe que a peça nasceu é a fila, que
criou a tarefa e conhece a pasta. O rastro registra por aí, não pelo observador.
Ampliar o observador para N pastas é rodada própria e não entra aqui.

**`pastaUnica`, que evita colidir nome de pasta, hoje é do frontend** e usa a
lista de peças do workspace aberto. Para gerar num workspace de fundo o nome
precisa ser resolvido no servidor, contra as peças daquele workspace. Sem isso,
duas tarefas do mesmo lote gerariam a mesma pasta.

## 2. A tarefa é um dado validado, nunca um comando

O assistente **não roda comando e não chama rota**. Ele preenche uma tarefa de
um catálogo fechado, e o servidor valida com Zod antes de aceitar.

```
Tarefa {
  id, loteId, criadaEm,
  origem: "assistente" | "dono",
  conversaId,
  workspaceId, workspaceNome,          // O ALVO VIAJA NA TAREFA
  tipo: "carrossel" | "site" | "anuncio",
  dados: { ... },                       // por tipo, o mesmo que o wizard colhe
  estado: "proposta" | "aprovada" | "na-fila" | "rodando"
        | "feita" | "falhou" | "cancelada",
  sessaoId?, pastaAlvo?, erro?, em
}
```

`origem` existe porque o rastro precisa saber a diferença entre "você pediu" e
"o assistente propôs". Sem esse campo, daqui a um mês nenhuma linha do rastro
responde quem começou aquilo.

`workspaceNome` viaja junto do id de propósito: workspace removido continua
tendo nome no rastro, e recibo que aponta para um id que não existe mais não é
recibo.

### Como a IA entrega a proposta

Pelo mesmo caminho que o `anuncio.json` já usa e que foi medido com IA real: a
sessão tem um diretório de trabalho e **grava um arquivo lá**. Aqui é
`lote.json`, e o servidor lê, valida e enfileira.

Não é MCP. MCP só funciona no Claude neste Hub, e o Codex é motor de primeira
classe aqui. Arquivo validado funciona nos dois.

### O diretório de trabalho do assistente

**Uma pasta temporária do sistema, por conversa, fora do projeto.**

O motivo é a decisão 3 do Jesse. Confinamento por diretório de trabalho é o que
este projeto usa e mediu, mas ele não é uma prisão: uma IA determinada sobe com
`..`. A diferença é **o que existe um nível acima**. Com a pasta em
`app/dados/`, um nível acima tem `conexoes.json`, onde moram os tokens da Apify
e do Supabase. Com a pasta no temp do sistema, um nível acima não tem nada do
Jesse.

Ela é descartável de propósito. O `lote.json` é lido e enfileirado na hora, e o
registro durável é a fila, nunca o arquivo.

O assistente roda com `permissao: "padrao"`, jamais `"total"`.

## 3. A fila é dona da tarefa

`app/dados/assistente/fila.jsonl`, append-only, **sem rotação**.

Mudança de estado é **linha nova e completa com o mesmo id**, e a leitura
colapsa por id mantendo a posição da primeira. Isso não é invenção desta rodada:
é a decisão registrada em
`docs/decisoes/2026-07-27-conversa-append-only-e-atualizacao-por-linha-nova.md`,
e uma tarefa indo de "na fila" para "rodando" é o mesmo problema que uma
mensagem indo de "na fila" para "entregue".

Sem rotação porque isso é dado do dono. `util/jsonl.ts` já declara essa regra no
cabeçalho; quem rotaciona é só o `eventos.jsonl`, que é auditoria descartável.

### O laço da fila

```
proposta  --(o dono aprova o lote)-->  aprovada
aprovada  --(há vaga)-->              na-fila --> rodando --> feita | falhou
qualquer  --(o dono cancela)-->       cancelada
```

**Uma tarefa por vez, e a trava existente é o portão.** O Hub já recusa uma
segunda criação guiada com 409, e a checagem é `geracaoVisualEmAndamento`, em
`sessoes/rotas.ts:78`. A fila **reusa essa função** em vez de escrever uma
segunda contagem: enquanto ela responder que há geração em andamento, a próxima
tarefa espera.

É a reviravolta que faz a fila valer a pena: o que hoje é um 409 na cara do
dono vira "esperando a vez".

### Retomada depois de reiniciar

No boot, tarefa que estava `rodando` vira `falhou` com motivo declarado, no
espelho exato do que `saneiaSessaoPersistida` já faz com sessão
(`gerenciador.ts:148`). Ela não recomeça sozinha: uma peça pode ter sido gravada
pela metade, e refazer por conta própria gastaria crédito por cima de um estado
que ninguém olhou. `aprovada` e `na-fila` sobrevivem e continuam.

## 4. O rastro é o recibo, e o barramento ganha seu primeiro consumidor

`app/dados/assistente/rastro.jsonl`, append-only, **sem rotação**.

O barramento em `eventos/barramento.ts` está sem nenhum consumidor desde
2026-07-26. Ele entrega a todo assinante **independente de escopo**: quem
descarta evento CORE é só o log dele, na linha 96. Então o rastro assina `"*"` e
vira o primeiro consumidor real do barramento, sem precisar mexer nele.

O rastro escreve por dois caminhos:

1. **Direto**, para o que é da fila: lote proposto, lote aprovado, tarefa
   iniciada, tarefa concluída, tarefa falhou, tarefa cancelada, peça gravada.
2. **Por assinatura**, para o que os outros módulos já emitem: `peca:criada`,
   `peca:exportada`, `sessao:concluida`.

**O que o rastro NUNCA registra: o que a IA disse que fez.** A linha nasce de um
efeito que o servidor observou, com pasta, workspace, sessão e custo.

O stream `sessao:ferramenta` mostra qual ferramenta a IA chamou e em que
arquivo. Ele é útil e aparece na tela ao vivo, mas **não entra no rastro**: é o
provedor narrando a própria chamada, e recibo não se faz de narração.

## 5. A conversa é CORE, e isso é trabalho de verdade no gerenciador

Toda sessão hoje é gravada em `app/dados/workspaces/<id>/sessoes.json`, e a
transcrição em `transcricoes/<idSessao>.json` do mesmo workspace. O assistente
não tem workspace.

O gerenciador aprende o **escopo CORE**, com a mesma convenção que o barramento
já usa: `workspaceId` vazio significa CORE.

- Sessão CORE persiste em `app/dados/assistente/sessoes.json`.
- Transcrição em `app/dados/assistente/transcricoes/<idSessao>.json`.
- `carregar()`, no boot, passa a carregar esse balde além dos workspaces.
- `transmitirDaSessao` já cai em broadcast quando a sessão não tem workspace.

**O gasto do assistente entra no total do Dashboard.** Um `custos.jsonl` CORE em
`app/dados/`, somado em `montarResumoCore`. Se ficar de fora, o número principal
do Hub passa a mentir, e a Fase 2 do plano do v1 existiu justamente para ele
parar de mentir.

### O histórico de conversas

`app/dados/assistente/indice.json`, no padrão de `mensagens/armazenamento.ts`:
uma lista com id, sessão, título, quando nasceu, último uso e uma prévia. A
coluna da esquerda lê o índice; abrir uma conversa lê a transcrição daquela
sessão.

**O chat da IDE não serve de modelo aqui.** Ele reencontra a própria conversa
pelo título fixo `"Sessão da IDE"`, pegando a última sessão com aquele nome
(`ChatIde.tsx:127-130`). Trocar de modelo cria outra e a anterior fica invisível
para sempre. O assistente guarda id, e o título é rótulo que o dono pode
renomear.

## 6. O que a IA vê, já que ela não vê arquivo

O briefing vai por `instrucoesExtras`, que já existe, viaja por **stdin** nos
dois provedores e volta em toda retomada. Ele carrega:

- Os workspaces: id, nome, se o Cérebro está preenchido, última atividade.
- O gasto do mês e a comparação de semana, o mesmo dado do Dashboard.
- As peças recentes por workspace.
- A fila agora: o que está proposto, aprovado, rodando e o que falhou.

O id do workspace vai escrito, porque é ele que a IA precisa colocar na tarefa.
Nome de cliente é ambíguo, id não é.

**Nada disso pode viajar por argumento de linha de comando.** A regra está no
`CLAUDE.md` e custou caro: no Windows sob shell, o `cmd.exe` corta na primeira
quebra de linha e leva junto o resto da linha, em silêncio. O `instrucoesExtras`
já resolve isso, e é por isso que ele é o caminho.

O checklist que o Jesse digita à mão vai para a IA como mensagem normal. **O Hub
não interpreta `[ ]` com expressão regular.** Resolver "cliente X" para um id e
"2 carrosséis" para duas tarefas com temas diferentes é interpretação, e
interpretação é o trabalho da IA. O Hub valida o resultado.

## 7. A tela

Três colunas em `componentes/assistente/`, folha própria ao lado, com
`@layer base, externo, tela, tema;` na primeira linha e todo o conteúdo dentro
da camada `tela`.

```
+--------------+---------------------------+------------------+
| Conversas    | A conversa                | O rastro         |
| (índice)     | (Conversa.tsx)            | (linha do tempo) |
|              |                           |                  |
| + Nova       | ...                       | 14:02 peça       |
| Hoje         |                           | 14:07 tarefa     |
| Ontem        | [ o lote proposto ]       | 14:09 falhou     |
|              | [ Aprovar ] [ Cancelar ]  |                  |
+--------------+---------------------------+------------------+
```

**A conversa reusa o que já existe**: `comum/usarConversaSessao.ts` e
`comum/Conversa.tsx`, hoje com um consumidor só, a tela do anúncio. O hook já
tem a regra que as três cópias antigas não têm: marca maior que o stream quer
dizer stream recomeçado. Este é o segundo consumidor, não uma quinta cópia.

**Responsividade, e ela não é detalhe aqui.** Três colunas é uma coluna a mais do
que a tela do anúncio, que já teve que virar gaveta abaixo de 1200px. As duas
laterais colapsam por faixa declarada, e o piso da conferência é 1280x720. Ver
`docs/decisoes/2026-08-01-a-tela-do-anuncio-num-notebook.md`: `scrollIntoView`
rola todos os ancestrais roláveis, e item de grid tem altura mínima automática.
Os dois defeitos voltam fácil.

**O lote aprova dentro da conversa**, não num modal. Ele é a resposta da IA
àquela mensagem, e tirar ele da conversa quebraria o fio.

## 8. Segurança, declarada

- O assistente roda com `permissao: "padrao"`, nunca `"total"`.
- O diretório de trabalho é temporário e fora do projeto.
- Ele não recebe `escopo: "projeto"`, que é o que dá a raiz da instalação ao
  chat da IDE.
- Ele não escreve em disco do usuário. Quem escreve é a fila, por tarefa
  validada.
- Tarefa fora do catálogo é recusada com o campo dito, não ignorada em silêncio.
- O lote só sai de `proposta` por gesto do dono. Nenhum caminho de código
  aprova lote.

**Um achado desta pesquisa, que não é criado por esta rodada e precisa ser dito:**
o chat da IDE cria sessão com diretório de trabalho na raiz da instalação e
permite o modo "Poder total". O 403 de `app/dados` documentado na arquitetura
protege as **rotas de arquivo da IDE**, não a sessão de IA. Uma sessão nessa
combinação alcança `app/dados/conexoes.json`. Isso é de hoje, e vale uma rodada
própria.

## 9. O catálogo desta rodada

| Tipo | O que a tarefa carrega | Reusa |
| --- | --- | --- |
| `carrossel` | tema, formato, proporção, modelo de capa e páginas, instruções | `montarPromptCriacao` |
| `site` | tema, objetivo, seções, botão principal, detalhes | `montarPromptSite` |
| `anuncio` | oferta, objetivo, destino e URL, praça, raio, orçamento diário | `montarPromptAnuncio` |

Os três prompts moram no web hoje. **Eles sobem para o servidor**, porque a fila
é do servidor e não pode depender de um navegador aberto. O wizard passa a
chamar o mesmo módulo, e um teste de snapshot afirma que o prompt não mudou uma
vírgula na mudança de lugar.
