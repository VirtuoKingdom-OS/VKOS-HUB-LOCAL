import assert from "node:assert/strict";
import test from "node:test";

import type { ConferenciaSite, Sessao, StatusSessao } from "../tipos.js";
import {
  criarLacoConformidade,
  deveDispararLaco,
  montarPromptCorrecao,
  skillPassaPelaConferencia,
  type DepsConformidade,
  type ResultadoConferencia,
} from "./conformidade-site.js";

function sessaoSite(extra: Partial<Sessao> = {}): Sessao {
  return {
    id: "s-1",
    provedor: "claude",
    titulo: "Site: estúdio",
    prompt: "gere o site",
    skill: "site",
    status: "concluida",
    criadaEm: "2026-07-17T00:00:00.000Z",
    atualizadaEm: "2026-07-17T00:00:00.000Z",
    pastaTrabalho: "/vkos",
    pastaAlvo: "2026-07-17-site-estudio",
    ...extra,
  };
}

// Monta um laco com fakes controlaveis e um registro do que aconteceu.
function montarLaco(opcoes: {
  auditar: ResultadoConferencia[];
  ehPecaSite?: boolean;
  status?: StatusSessao;
  retomarOk?: boolean;
  auditarLanca?: boolean;
}) {
  const conferencias: ConferenciaSite[] = [];
  const retomadas: { id: string; prompt: string }[] = [];
  let chamadasAuditar = 0;
  const deps: DepsConformidade = {
    auditar: async () => {
      chamadasAuditar += 1;
      if (opcoes.auditarLanca) {
        throw new Error("auditoria estourou");
      }
      const r = opcoes.auditar[Math.min(chamadasAuditar - 1, opcoes.auditar.length - 1)];
      return r;
    },
    retomar: (id, prompt) => {
      retomadas.push({ id, prompt });
      return { ok: opcoes.retomarOk ?? true };
    },
    definirConferencia: (_id, conferencia) => conferencias.push(conferencia),
    ehPecaSite: () => opcoes.ehPecaSite ?? true,
    statusSessao: () => opcoes.status ?? "concluida",
  };
  return {
    laco: criarLacoConformidade(deps),
    conferencias,
    retomadas,
    contarAuditorias: () => chamadasAuditar,
  };
}

// Esta e a regra que o gerenciador usa pra decidir se guarda a pastaAlvo da
// sessao. Sem ela o laco nunca sabe qual peca auditar.
test("skills que passam pela conferencia sao geracao e ajuste de site", () => {
  assert.equal(skillPassaPelaConferencia("site"), true);
  assert.equal(skillPassaPelaConferencia("ajuste-site"), true);
  assert.equal(skillPassaPelaConferencia("carrossel"), false);
  assert.equal(skillPassaPelaConferencia("ajuste-carrossel"), false);
  assert.equal(skillPassaPelaConferencia("imagem"), false);
  assert.equal(skillPassaPelaConferencia(undefined), false);
});

test("dispara para geracao e para ajuste de site, sempre com pastaAlvo", () => {
  assert.equal(deveDispararLaco(sessaoSite()), true);
  // Ajuste de site com IA quebra o site do mesmo jeito que a geracao: entra.
  assert.equal(deveDispararLaco(sessaoSite({ skill: "ajuste-site" })), true);
  assert.equal(deveDispararLaco(sessaoSite({ skill: "carrossel" })), false);
  assert.equal(deveDispararLaco(sessaoSite({ skill: "ajuste-carrossel" })), false);
  assert.equal(deveDispararLaco(sessaoSite({ pastaAlvo: undefined })), false);
  assert.equal(deveDispararLaco(sessaoSite({ skill: "site", pastaAlvo: "" })), false);
  assert.equal(deveDispararLaco(sessaoSite({ skill: "ajuste-site", pastaAlvo: "" })), false);
});

test("nao roda quando a pasta nao e peca de site", async () => {
  const { laco, conferencias, retomadas } = montarLaco({
    auditar: [{ verificavel: true, valido: true, erros: [] }],
    ehPecaSite: false,
  });
  await laco.aoConcluir(sessaoSite());
  assert.equal(conferencias.length, 0);
  assert.equal(retomadas.length, 0);
});

test("aprova quando a auditoria passa, sem retomar", async () => {
  const { laco, conferencias, retomadas } = montarLaco({
    auditar: [{ verificavel: true, valido: true, erros: [] }],
  });
  await laco.aoConcluir(sessaoSite());
  assert.deepEqual(
    conferencias.map((c) => c.estado),
    ["conferindo", "aprovada"],
  );
  assert.equal(retomadas.length, 0);
});

test("navegador ausente registra pendencias e nao retoma", async () => {
  const { laco, conferencias, retomadas } = montarLaco({
    auditar: [{ verificavel: false, valido: false, erros: [] }],
  });
  await laco.aoConcluir(sessaoSite());
  assert.deepEqual(
    conferencias.map((c) => c.estado),
    ["conferindo", "pendencias"],
  );
  assert.equal(retomadas.length, 0);
});

test("reprova acionavel retoma com a lista literal de erros", async () => {
  const erros = [
    "index.html cria rolagem horizontal em 390px. O primeiro elemento fora da tela é #cursor-glow.",
    "index.html envolve o body em elemento genérico não editável pelo Studio: #mobile-panel.",
  ];
  const { laco, conferencias, retomadas } = montarLaco({
    auditar: [{ verificavel: true, valido: false, erros }],
  });
  await laco.aoConcluir(sessaoSite());
  assert.deepEqual(
    conferencias.map((c) => c.estado),
    ["conferindo", "corrigindo"],
  );
  assert.equal(conferencias[1].volta, 1);
  assert.equal(retomadas.length, 1);
  for (const erro of erros) {
    assert.ok(retomadas[0].prompt.includes(erro), `prompt deve conter: ${erro}`);
  }
  assert.match(retomadas[0].prompt, /Corrija EXATAMENTE os pontos abaixo/);
});

test("leva avisos visuais para a mesma rodada de correcao", async () => {
  const aviso = "index.html pode estar repetindo eyebrow em excesso";
  const { laco, retomadas } = montarLaco({
    auditar: [{
      verificavel: true,
      valido: false,
      erros: ["index.html tem contraste insuficiente"],
      avisos: [aviso],
    }],
  });
  await laco.aoConcluir(sessaoSite());
  assert.equal(retomadas.length, 1);
  assert.match(retomadas[0].prompt, /Também revise estes avisos/);
  assert.ok(retomadas[0].prompt.includes(aviso));
});

test("nao retoma sessao parada pelo usuario", async () => {
  const { laco, conferencias, retomadas } = montarLaco({
    auditar: [{ verificavel: true, valido: false, erros: ["um erro qualquer"] }],
    status: "parada",
  });
  await laco.aoConcluir(sessaoSite());
  assert.deepEqual(
    conferencias.map((c) => c.estado),
    ["conferindo", "pendencias"],
  );
  assert.equal(retomadas.length, 0);
});

test("no maximo 2 voltas de correcao, depois para em pendencias", async () => {
  const { laco, conferencias, retomadas, contarAuditorias } = montarLaco({
    auditar: [{ verificavel: true, valido: false, erros: ["segue quebrado"] }],
  });
  const sessao = sessaoSite();
  // Cada conclusao (geracao + duas retomadas + a ultima) reentra no laco.
  await laco.aoConcluir(sessao); // volta 0 -> corrige (volta 1)
  await laco.aoConcluir(sessao); // volta 1 -> corrige (volta 2)
  await laco.aoConcluir(sessao); // volta 2 -> teto, pendencias
  assert.equal(retomadas.length, 2, "no maximo duas correcoes");
  const estados = conferencias.map((c) => c.estado);
  assert.deepEqual(estados, [
    "conferindo",
    "corrigindo",
    "conferindo",
    "corrigindo",
    "conferindo",
    "pendencias",
  ]);
  assert.equal(contarAuditorias(), 3);
});

test("retomada que falha vira pendencias", async () => {
  const { laco, conferencias, retomadas } = montarLaco({
    auditar: [{ verificavel: true, valido: false, erros: ["quebrou"] }],
    retomarOk: false,
  });
  await laco.aoConcluir(sessaoSite());
  assert.equal(retomadas.length, 1);
  assert.equal(conferencias.at(-1)?.estado, "pendencias");
});

test("auditoria que lanca vira pendencias e nao deixa preso em conferindo", async () => {
  const { laco, conferencias, retomadas } = montarLaco({
    auditar: [],
    auditarLanca: true,
  });
  // Silencia o console.error esperado da blindagem durante o teste.
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    await laco.aoConcluir(sessaoSite());
  } finally {
    console.error = erroOriginal;
  }
  assert.deepEqual(
    conferencias.map((c) => c.estado),
    ["conferindo", "pendencias"],
  );
  assert.equal(retomadas.length, 0);
});

test("depois da excecao o laco aceita rodar de novo (emAndamento liberado)", async () => {
  // Primeiro passe estoura; um segundo aoConcluir precisa auditar de novo, prova
  // que o finally liberou a trava de reentrancia mesmo no caminho de erro.
  const conferencias: ConferenciaSite[] = [];
  let chamadas = 0;
  const deps: DepsConformidade = {
    auditar: async () => {
      chamadas += 1;
      if (chamadas === 1) throw new Error("estourou na primeira");
      return { verificavel: true, valido: true, erros: [] };
    },
    retomar: () => ({ ok: true }),
    definirConferencia: (_id, c) => conferencias.push(c),
    ehPecaSite: () => true,
    statusSessao: () => "concluida",
  };
  const laco = criarLacoConformidade(deps);
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    await laco.aoConcluir(sessaoSite());
    await laco.aoConcluir(sessaoSite());
  } finally {
    console.error = erroOriginal;
  }
  assert.equal(chamadas, 2);
  assert.equal(conferencias.at(-1)?.estado, "aprovada");
});

test("montarPromptCorrecao lista cada erro em bullet literal", () => {
  const prompt = montarPromptCorrecao(["erro A", "erro B"]);
  assert.match(prompt, /- erro A/);
  assert.match(prompt, /- erro B/);
  assert.match(prompt, /Não redesenhe/);
  assert.match(prompt, /390px/);
});
