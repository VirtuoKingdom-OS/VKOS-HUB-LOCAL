// Travas da passagem do lote proposto para a fila.
//
// O caso que abriu esta rodada está aqui inteiro: o lote.json de uma conversa
// real de 2026-08-04, do jeito que a IA escreveu, precisa virar tarefa válida
// na fila. Ele era recusado por 22 campos que a IA não tinha como saber.

import assert from "node:assert/strict";
import test from "node:test";

import { criarTarefasDoLote } from "./lote.js";
import { LotePropostaSchema, TarefaSchema } from "./tarefa.js";

const WORKSPACES = [
  { id: "w-ms3li5tp9mu", nome: "Mae Pixel" },
  { id: "w-ms3lhk5es10", nome: "JDV" },
];

function acharWorkspace(id: string) {
  return WORKSPACES.find((w) => w.id === id);
}

// O conteúdo real do lote.json da conversa c-mseruoww-opa248, encurtado só nos
// textos longos.
const LOTE_REAL = LotePropostaSchema.parse({
  id: "lote-c-mseruoww-opa248",
  conversaId: "c-mseruoww-opa248",
  tarefas: [
    {
      workspaceId: "w-ms3li5tp9mu",
      workspaceNome: "Mae Pixel",
      tipo: "carrossel",
      dados: {
        tema: "O que é Gamiologia",
        detalhes: "Carrossel explicativo sobre Gamiologia, da fogueira aos ecossistemas digitais.",
      },
    },
    {
      workspaceId: "w-ms3li5tp9mu",
      workspaceNome: "Mae Pixel",
      tipo: "carrossel",
      dados: {
        tema: "O que é Alfabetização Gamiológica",
        detalhes: "Carrossel educativo que define o conceito e o compara com outras alfabetizações.",
      },
    },
  ],
});

test("o lote real vira duas tarefas validas pra fila", () => {
  // A fila valida com TarefaSchema antes de gravar. Se esta conversão não
  // passasse ali, adicionarLote lançaria e o dono veria de novo a fila vazia
  // com a IA dizendo que criou o lote.
  const tarefas = criarTarefasDoLote({
    lote: LOTE_REAL,
    conversaId: "c-mseruoww-opa248",
    acharWorkspace,
    agora: "2026-08-04T14:47:07.694Z",
  });
  assert.equal(tarefas.length, 2);
  for (const tarefa of tarefas) {
    assert.ok(TarefaSchema.safeParse(tarefa).success, "a tarefa precisa passar no schema da fila");
    assert.equal(tarefa.estado, "proposta");
    assert.equal(tarefa.origem, "assistente");
    assert.equal(tarefa.workspaceId, "w-ms3li5tp9mu");
  }
});

test("tarefa sem id ganha um id derivado do lote, estavel e sem colisao", () => {
  const tarefas = criarTarefasDoLote({ lote: LOTE_REAL, conversaId: "c-1", acharWorkspace });
  assert.deepEqual(
    tarefas.map((t) => t.id),
    ["lote-c-mseruoww-opa248-t1", "lote-c-mseruoww-opa248-t2"],
  );
});

test("os dados chegam completos, com o padrao do Hub no que a conversa nao disse", () => {
  const [primeira] = criarTarefasDoLote({ lote: LOTE_REAL, conversaId: "c-1", acharWorkspace });
  assert.equal(primeira.tipo, "carrossel");
  if (primeira.tipo !== "carrossel") return;
  assert.equal(primeira.dados.proporcao, "4x5");
  assert.equal(primeira.dados.formato, "multiplas");
  assert.deepEqual(primeira.dados.caminhosImagens, []);
  assert.equal(primeira.dados.tema, "O que é Gamiologia");
});

test("workspace que nao existe recusa o lote pelo id, sem escolher outro", () => {
  const lote = LotePropostaSchema.parse({
    id: "l-1",
    tarefas: [
      {
        workspaceId: "w-nao-existe",
        tipo: "carrossel",
        dados: { tema: "t", detalhes: "d" },
      },
    ],
  });
  assert.throws(
    () => criarTarefasDoLote({ lote, conversaId: "c-1", acharWorkspace }),
    /w-nao-existe não existe/,
  );
});

test("nome divergente do id reprova, e a mensagem mostra os dois", () => {
  // Gerar a peça do cliente A na pasta do cliente B é o pior erro possível
  // nesta tela, e nome divergente é o sinal de que a IA resolveu pelo nome.
  const lote = LotePropostaSchema.parse({
    id: "l-1",
    tarefas: [
      {
        workspaceId: "w-ms3li5tp9mu",
        workspaceNome: "JDV",
        tipo: "carrossel",
        dados: { tema: "t", detalhes: "d" },
      },
    ],
  });
  assert.throws(
    () => criarTarefasDoLote({ lote, conversaId: "c-1", acharWorkspace }),
    /"JDV".*"Mae Pixel"/s,
  );
});

test("o mesmo lote lido duas vezes gera os mesmos ids", () => {
  // A sincronização roda a cada leitura da tela. Id instável criaria uma tarefa
  // nova por segundo na fila.
  const a = criarTarefasDoLote({ lote: LOTE_REAL, conversaId: "c-1", acharWorkspace });
  const b = criarTarefasDoLote({ lote: LOTE_REAL, conversaId: "c-1", acharWorkspace });
  assert.deepEqual(a.map((t) => t.id), b.map((t) => t.id));
});
