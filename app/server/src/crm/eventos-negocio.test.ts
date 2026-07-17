import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assinar, type EventoDominio } from "../eventos/barramento.js";
import {
  adicionarWorkspace,
  lerRegistro,
  marcarAtivo,
  pastaDadosWorkspace,
  salvarRegistro,
} from "../workspaces/estado.js";
import { atualizarNegocio, criarContato, criarNegocio, removerNegocio } from "./estado.js";

// M8: negocio criado, atualizado e excluido emitem evento no padrao dos demais.
// Precisa de um workspace ativo. Registra um workspace de teste com pasta tmpdir,
// captura o registro original antes e o restaura no fim (cache e disco), pra nao
// deixar rastro nos dados reais do Jesse.
test("criar, atualizar e excluir negocio emitem evento com contato e negocio", () => {
  const registroOriginal = structuredClone(lerRegistro());
  const ws = adicionarWorkspace(join(tmpdir(), "vkos-teste-m8"), "Teste M8");
  marcarAtivo(ws.id);

  const capturados: EventoDominio[] = [];
  const cancelas = [
    assinar("crm:negocio-criado", (e) => {
      capturados.push(e);
    }),
    assinar("crm:negocio-atualizado", (e) => {
      capturados.push(e);
    }),
    assinar("crm:negocio-excluido", (e) => {
      capturados.push(e);
    }),
  ];

  try {
    const contato = criarContato({ nome: "Cliente Teste" });
    const negocio = criarNegocio({ contatoId: contato.id, titulo: "Projeto" });
    atualizarNegocio(negocio.id, { titulo: "Projeto novo" });
    removerNegocio(negocio.id);

    assert.deepEqual(
      capturados.map((e) => e.tipo),
      ["crm:negocio-criado", "crm:negocio-atualizado", "crm:negocio-excluido"],
    );
    for (const evento of capturados) {
      assert.equal(evento.workspaceId, ws.id);
      const c = evento.dados.contato as { id?: string } | undefined;
      const n = evento.dados.negocio as { id?: string } | undefined;
      assert.equal(c?.id, contato.id);
      assert.equal(n?.id, negocio.id);
    }
  } finally {
    for (const cancela of cancelas) cancela();
    const pasta = pastaDadosWorkspace(ws.id);
    if (existsSync(pasta)) rmSync(pasta, { recursive: true, force: true });
    salvarRegistro(registroOriginal);
  }
});
