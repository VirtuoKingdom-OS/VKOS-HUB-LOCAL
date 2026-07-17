import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import test from "node:test";

import type { EventoDominio } from "../eventos/barramento.js";
import { garantirPastaDadosWorkspace, pastaDadosWorkspace } from "../workspaces/estado.js";
import { definirSincronizarCrm, lerConfigCalendario } from "./eventosLocais.js";
import { reagir } from "./sincronizacao.js";

// Usa um workspaceId claramente de teste. As funcoes de calendario resolvem o
// caminho pelo id, sem consultar o registro, entao nada toca os dados reais do
// Jesse. A pasta e removida no fim.
function eventoContato(workspaceId: string, contato: Record<string, unknown>): EventoDominio {
  return {
    tipo: "crm:contato-atualizado",
    workspaceId,
    em: new Date().toISOString(),
    dados: { contato },
  };
}

test("duas reacoes rapidas no mesmo contato nao duplicam evento nem deixam vinculo orfao", async () => {
  const workspaceId = `w-teste-a7-${Math.random().toString(36).slice(2, 8)}`;
  const contato = {
    id: "c-a7",
    nome: "Corrida",
    proximoContato: "2026-09-01T12:00:00.000Z",
    tags: [],
    interacoes: [],
    tarefas: [],
    criadoEm: "2026-08-01T00:00:00.000Z",
    atualizadoEm: "2026-08-01T00:00:00.000Z",
  };
  try {
    garantirPastaDadosWorkspace(workspaceId);
    definirSincronizarCrm(workspaceId, true);
    // Dispara as duas reacoes quase juntas, como o barramento faria numa corrida.
    await Promise.all([
      reagir(eventoContato(workspaceId, contato)),
      reagir(eventoContato(workspaceId, contato)),
    ]);
    const config = lerConfigCalendario(workspaceId);
    assert.equal(config.eventosLocais.length, 1);
    const eventoId = config.vinculos[contato.id];
    assert.ok(eventoId, "o vinculo do contato deve existir");
    assert.equal(config.eventosLocais[0].id, eventoId);
  } finally {
    const pasta = pastaDadosWorkspace(workspaceId);
    if (existsSync(pasta)) rmSync(pasta, { recursive: true, force: true });
  }
});
