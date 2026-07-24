import assert from "node:assert/strict";
import test from "node:test";
import { normalizarEstadoCrm } from "./crm";

test("CRM incompleto vira um estado seguro em vez de derrubar a tela", () => {
  assert.deepEqual(normalizarEstadoCrm({}), {
    versao: 3,
    colunas: [],
    contatos: [],
    negocios: [],
  });
});

test("CRM aceita o envelope usado por respostas da plataforma", () => {
  const estado = normalizarEstadoCrm({
    dados: {
      colunas: [{ id: "entrada", nome: "Entrada", ordem: 0 }],
      contatos: [{ id: "c1", nome: "Cliente", colunaId: "entrada" }],
      negocios: [],
    },
  });
  assert.equal(estado.colunas.length, 1);
  assert.deepEqual(estado.contatos[0].tags, []);
  assert.deepEqual(estado.contatos[0].interacoes, []);
  assert.deepEqual(estado.contatos[0].tarefas, []);
});
