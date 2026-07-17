import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import type {
  EventoSessao,
  FechamentoProcessoSessao,
  OpcoesSessaoProvedor,
  ProcessoSessao,
  ProvedorIA,
} from "../provedores/contrato.js";
import { executarTesteSetup, type EventoTesteSetup } from "./setup.js";

class ProcessoFalso implements ProcessoSessao {
  private eventos = new Set<(evento: EventoSessao) => void>();
  private erros = new Set<(erro: Error) => void>();
  private fechamentos = new Set<
    (fechamento: FechamentoProcessoSessao) => void
  >();

  iniciar(): void {
    queueMicrotask(() => {
      for (const emitir of this.eventos) {
        emitir({
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "olá, VKOS Hub no ar" },
          },
        });
        emitir({
          type: "result",
          result: "olá, VKOS Hub no ar",
          total_cost_usd: 0.001,
          usage: {},
        });
      }
      for (const fechar of this.fechamentos) {
        fechar({ codigo: 0, stderr: "" });
      }
    });
  }

  aoEvento(ouvinte: (evento: EventoSessao) => void) {
    this.eventos.add(ouvinte);
    return () => this.eventos.delete(ouvinte);
  }
  aoErro(ouvinte: (erro: Error) => void) {
    this.erros.add(ouvinte);
    return () => this.erros.delete(ouvinte);
  }
  aoFechar(ouvinte: (fechamento: FechamentoProcessoSessao) => void) {
    this.fechamentos.add(ouvinte);
    return () => this.fechamentos.delete(ouvinte);
  }
  parar(): void {}
}

test("teste do setup usa pasta temporaria e nao depende de workspace", async () => {
  let opcoesRecebidas: OpcoesSessaoProvedor | null = null;
  const processo = new ProcessoFalso();
  const provedor: ProvedorIA = {
    id: "claude",
    detectar: async () => ({
      instalado: true,
      versao: "falso",
      logado: true,
      binario: "falso",
    }),
    modelos: () => [
      { alias: "caro", rotulo: "Caro", observacaoCusto: "mais caro" },
      { alias: "barato", rotulo: "Barato", observacaoCusto: "mais barato" },
    ],
    iniciarSessao: (opcoes) => {
      opcoesRecebidas = opcoes;
      assert.equal(existsSync(opcoes.pastaTrabalho), true);
      processo.iniciar();
      return processo;
    },
  };
  const eventos: EventoTesteSetup[] = [];

  const resultado = await executarTesteSetup(provedor, (evento) =>
    eventos.push(evento),
  );

  assert.equal(resultado.sucesso, true);
  assert.equal(resultado.modelo, "barato");
  assert.ok(opcoesRecebidas);
  const opcoes = opcoesRecebidas as OpcoesSessaoProvedor;
  assert.equal(opcoes.modelo, "barato");
  assert.equal(opcoes.prompt, "Responda somente: olá, VKOS Hub no ar");
  assert.equal(opcoes.permissao, "padrao");
  assert.equal(opcoes.mcp, null);
  assert.equal(existsSync(opcoes.pastaTrabalho), false);
  assert.deepEqual(
    eventos.map((evento) => evento.tipo),
    ["inicio", "texto", "resultado"],
  );
});
