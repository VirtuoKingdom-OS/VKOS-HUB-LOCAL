import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { arquivoDe, arquivoLancamentos } from "../sessoes/custos.js";
import { lerCustos, registrarResult } from "../sessoes/custos.js";
import { montarInstrucoesExtrasSessao } from "../sessoes/gerenciador.js";
import { caminhoTranscricaoSessao } from "../sessoes/transcricao.js";

test("custos CORE usam a raiz do Hub e nao um workspace vazio", () => {
  assert.match(arquivoDe(""), /dados[\\/]custos\.json$/);
  assert.match(arquivoLancamentos(""), /dados[\\/]custos\.jsonl$/);
});

test("transcricao CORE mora no balde persistente do assistente", () => {
  assert.match(caminhoTranscricaoSessao("", "s-core"), /assistente[\\/]transcricoes[\\/]s-core\.json$/);
});

test("briefing do assistente entra nas instrucoes extras do provedor", () => {
  const briefing = "<briefing>workspace w-mae</briefing>";
  const extras = montarInstrucoesExtrasSessao({ instrucoesExtras: briefing });
  assert.ok(extras?.includes(briefing));
});

test("turno CORE entra no total de custo do Dashboard", () => {
  const anterior = process.env.VKOS_DADOS_TESTE;
  process.env.VKOS_DADOS_TESTE = mkdtempSync(join(tmpdir(), "vkos-core-custo-"));
  try {
    const antes = lerCustos("").totalUsd;
    registrarResult("", {
      custoUsd: 0.07,
      custoConhecido: true,
      tokensEntrada: 10,
      tokensSaida: 4,
      tokensEntradaNova: 10,
      tokensCacheEscrita: 0,
      tokensCacheLeitura: 0,
      contarSessao: true,
      provedor: "claude",
      estimado: true,
      sessaoId: "s-core-teste",
      modelo: "teste",
      ehResume: false,
      ehErro: false,
    });
    assert.equal(lerCustos("").totalUsd, antes + 0.07);
  } finally {
    if (anterior === undefined) delete process.env.VKOS_DADOS_TESTE;
    else process.env.VKOS_DADOS_TESTE = anterior;
  }
});
