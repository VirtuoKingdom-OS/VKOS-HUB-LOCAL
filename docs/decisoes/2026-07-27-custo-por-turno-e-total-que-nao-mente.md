# Custo por turno e um total que não mente

## Contexto

O Dashboard vai mostrar o gasto com IA como número principal. Antes disso o número precisava ser verdade, e ele tinha buracos.

A dúvida central era se o `total_cost_usd` do resume vinha do turno ou acumulado da conversa. Isso não se resolve lendo código nem documentação, então foi medido rodando os dois CLIs de verdade, em pasta temporária, com prompt mínimo.

**Claude Code 2.1.220.** Três turnos na mesma sessão, o segundo e o terceiro com `--resume`:

| turno | `total_cost_usd` | `usage.input_tokens` | `usage.output_tokens` | `num_turns` |
|---|---|---|---|---|
| 1 (nova) | 0,0187826 | 10 | 305 | 1 |
| 2 (resume) | 0,0053409 | 10 | 215 | 1 |
| 3 (resume) | 0,0049751 | 10 | 263 | 1 |

O valor é **do turno**. Somar a cada turno estava certo desde sempre.

**codex-cli 0.144.4.** Três turnos "responda só: X" na mesma thread:

| turno | `input_tokens` | `cached_input_tokens` | `output_tokens` |
|---|---|---|---|
| 1 (nova) | 12411 | 4480 | 40 |
| 2 (resume) | 24839 | 16640 | 62 |
| 3 (resume) | 37284 | 28800 | 80 |

O valor é o **acumulado da thread**. Saída monotônica (40, 62, 80) para três respostas de uma letra cada. O Hub somava isso a cada retomada, então o gasto do Codex inflava de forma composta: no terceiro turno o Hub contava 74534 tokens de entrada onde o consumo real da thread era 37284.

Na mesma medição apareceu um segundo problema no Claude: o bloco `usage` do topo cobre só a última iteração do turno, enquanto `modelUsage` cobre todas as chamadas de modelo e é dele que sai o `total_cost_usd`. No turno 1, `usage` dizia 10 tokens de entrada e 305 de saída; `modelUsage` dizia 532 e 317, e a conta de preço do `modelUsage` bate centavo a centavo com o `total_cost_usd`. Os tokens da tela contavam menos do que o dólar cobrava.

## Decisão

**1. O contrato de provedor passa a distinguir quem reporta por turno de quem reporta acumulado.** `OpcoesSessaoProvedor.usoAnterior` tem três valores com três sentidos: ausente (sessão nova, ou provedor que já reporta por turno), objeto (linha de base, o provedor subtrai e emite o turno) e `null` (retomada cuja linha de base o Hub não tem). O Codex subtrai; o Claude ignora, porque foi medido reportando por turno. A linha de base viaja no result como `uso_acumulado`, o gerenciador guarda em `Sessao.usoAcumuladoProvedor` e devolve na retomada, então sobrevive a um restart do servidor.

**2. Custo que não dá para saber nunca vira zero.** O result carrega `custo_conhecido`. Fica falso quando o modelo não está na tabela de preços, quando a retomada de Codex não tem linha de base, e quando o turno conclui sem `total_cost_usd` numérico. Nesse caso nada é somado ao total em dólar, o turno é contado em `turnosSemCusto`, e a tela mostra o total como piso (`≥`) com o número de turnos sem preço. Turno com erro continua fora do total pela regra M10 e não conta como sem preço: ali o Hub sabe que não deve somar, não falta informação.

**3. Processo morto no meio conta como turno sem medição.** Se o CLI subiu (mandou o init) e o processo terminou sem result, o crédito foi consumido e ninguém vai dizer quanto. Vira `turnosSemCusto`, não zero.

**4. O total geral sobrevive à exclusão do cliente.** Ao remover um workspace, o acumulado dele é somado em `app/dados/custos-historico.json` (escopo CORE) antes de a pasta ser apagada. Custos ilegíveis não travam a remoção, mas contam em `workspacesSemHistorico` e o total geral passa a se declarar piso. Dinheiro gasto não deixa de ter sido gasto porque a pasta sumiu.

**5. Cada turno vira uma linha em `custos.jsonl`, append-only,** no padrão do CRM (`util/jsonl.ts`): data, sessão, provedor, modelo, se foi retomada, se deu erro, custo, se o custo é conhecido, o motivo quando não é, e o split de tokens. Sem rotação, porque é dado do usuário.

**6. Os tokens saem do `modelUsage` quando ele existe,** com queda para o `usage` quando não existe (Codex). Cache gravado e cache lido aparecem separados na tela: os preços são bem diferentes e somá-los num número só escondia a diferença.

**7. `estimado: true` em todo custo em dólar fica como está.** O `total_cost_usd` sai de uma tabela de preços embutida e a autenticação é assinatura, não chave de API. Marcar tudo como estimado continua sendo a leitura honesta.

## Por quê

O número principal de uma tela de gasto só vale se for verdade. Duas mentiras diferentes moravam ali: o Codex inflava em toda retomada, e o custo desconhecido virava zero, que some do total sem ninguém perceber. A primeira era erro de leitura do dialeto do provedor e tinha conserto exato. A segunda não tem conserto exato, então a saída é a tela admitir que não sabe, em vez de mostrar um número com cara de exatidão.

O registro por turno entrou porque sem ele um pulo no total é impossível de investigar: o acumulado sozinho não diz de onde veio. O custo é uma linha de texto por turno num arquivo local, e o benefício é conseguir auditar o próprio número.
