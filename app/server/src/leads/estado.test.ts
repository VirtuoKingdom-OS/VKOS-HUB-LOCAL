import assert from "node:assert/strict";
import test from "node:test";

import { apagarPastaDadosWorkspace } from "../workspaces/estado.js";
import {
  alterarStatusLead,
  excluirLead,
  lerEstadoLeads,
  persistirBusca,
} from "./estado.js";

function workspaceTeste(): string {
  return `w-teste-lista-leads-${Math.random().toString(36).slice(2, 9)}`;
}

test("persiste resultados minerados e atualiza sem duplicar placeId", () => {
  const workspaceId = workspaceTeste();
  try {
    const primeira = persistirBusca(workspaceId, [{
      nome: "Padaria Central",
      telefone: "(31) 3333-4444",
      placeId: "place-1",
    }], "padaria", "Belo Horizonte");
    assert.deepEqual(primeira, { encontrados: 1, novos: 1, atualizados: 0 });

    const segunda = persistirBusca(workspaceId, [{
      nome: "Padaria Central atualizada",
      telefone: "(31) 3333-4444",
      placeId: "place-1",
    }], "padaria artesanal", "Belo Horizonte");
    assert.deepEqual(segunda, { encontrados: 1, novos: 0, atualizados: 1 });

    const estado = lerEstadoLeads(workspaceId);
    assert.equal(estado.leads.length, 1);
    assert.equal(estado.leads[0].nome, "Padaria Central atualizada");
    assert.equal(estado.leads[0].status, "minerado");
  } finally {
    apagarPastaDadosWorkspace(workspaceId);
  }
});

test("arquiva, restaura e exclui um lead persistido", () => {
  const workspaceId = workspaceTeste();
  try {
    persistirBusca(workspaceId, [{ nome: "Clínica", placeId: "place-2" }], "clínica");
    assert.equal(alterarStatusLead(workspaceId, "place-2", "arquivado").status, "arquivado");
    assert.equal(lerEstadoLeads(workspaceId).leads[0].status, "arquivado");
    assert.equal(alterarStatusLead(workspaceId, "place-2", "minerado").status, "minerado");
    assert.equal(excluirLead(workspaceId, "place-2"), true);
    assert.equal(excluirLead(workspaceId, "place-2"), false);
    assert.equal(lerEstadoLeads(workspaceId).leads.length, 0);
  } finally {
    apagarPastaDadosWorkspace(workspaceId);
  }
});

test("uma nova busca não desarquiva automaticamente o que foi descartado", () => {
  const workspaceId = workspaceTeste();
  try {
    persistirBusca(workspaceId, [{ nome: "Restaurante", placeId: "place-3" }], "restaurante");
    alterarStatusLead(workspaceId, "place-3", "arquivado");
    persistirBusca(workspaceId, [{ nome: "Restaurante novo nome", placeId: "place-3" }], "restaurante");
    const lead = lerEstadoLeads(workspaceId).leads[0];
    assert.equal(lead.status, "arquivado");
    assert.equal(lead.nome, "Restaurante novo nome");
  } finally {
    apagarPastaDadosWorkspace(workspaceId);
  }
});
