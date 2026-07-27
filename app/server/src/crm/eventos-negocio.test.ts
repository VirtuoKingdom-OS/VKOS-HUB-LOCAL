import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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
//
// O funil vai pra uma raiz de dados temporaria (VKOS_DADOS_TESTE), pra nao
// gravar no CRM real. O workspace de teste continua existindo so pelo carimbo de
// procedencia do contato: o registro original e capturado antes e restaurado no
// fim, cache e disco.
test("criar, atualizar e excluir negocio emitem evento com contato e negocio", () => {
  const registroOriginal = structuredClone(lerRegistro());
  const raizDados = mkdtempSync(join(tmpdir(), "vkos-m8-dados-"));
  process.env.VKOS_DADOS_TESTE = raizDados;
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
      // O CRM e do dono do Hub, nao do cliente: o evento sai no escopo CORE, com
      // workspaceId vazio. Carimbar o cliente aberto aqui seria mentira.
      assert.equal(evento.workspaceId, "");
      const c = evento.dados.contato as { id?: string } | undefined;
      const n = evento.dados.negocio as { id?: string } | undefined;
      assert.equal(c?.id, contato.id);
      assert.equal(n?.id, negocio.id);
    }
  } finally {
    for (const cancela of cancelas) cancela();
    const pasta = pastaDadosWorkspace(ws.id);
    if (existsSync(pasta)) rmSync(pasta, { recursive: true, force: true });
    rmSync(raizDados, { recursive: true, force: true });
    delete process.env.VKOS_DADOS_TESTE;
    salvarRegistro(registroOriginal);
  }
});
