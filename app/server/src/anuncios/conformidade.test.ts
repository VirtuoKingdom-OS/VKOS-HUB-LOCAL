// O laco de conformidade do anuncio.
//
// A maior parte dos testes daqui roda com DISCO DE VERDADE, numa pasta
// temporaria, e nao com um fake de validacao. O motivo: o valor deste laco esta
// em ler o arquivo que a IA gravou e rodar o schema nele. Um fake que devolve
// "invalido" provaria a maquina de estados e nada do que ela existe pra fazer.
// A "IA" dos testes e a propria funcao de retomada, que grava o arquivo.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { ConferenciaSite, Sessao, StatusSessao } from "../tipos.js";
import { caminhoAnuncio, diagnosticarAnuncio } from "./armazenamento.js";
import {
  criarLacoAnuncio,
  deveDispararLacoAnuncio,
  montarPromptCorrecaoAnuncio,
  skillPassaPeloLacoAnuncio,
  type DepsConformidadeAnuncio,
} from "./conformidade.js";
import { conferirLimites } from "./limites.js";
import type { PecaAnuncio } from "./modelo.js";

const PASTA_ALVO = "2026-07-31-anuncio-avaliacao";

function sessaoAnuncio(extra: Partial<Sessao> = {}): Sessao {
  return {
    id: "s-anuncio-1",
    provedor: "codex",
    titulo: "Anúncio: avaliação gratuita",
    prompt: "Quero anunciar a avaliação gratuita.",
    skill: "anuncio",
    status: "concluida",
    criadaEm: "2026-07-31T00:00:00.000Z",
    atualizadaEm: "2026-07-31T00:00:00.000Z",
    pastaTrabalho: `/vkos/conteudo/${PASTA_ALVO}`,
    pastaAlvo: PASTA_ALVO,
    ...extra,
  };
}

// A mesma peca minima do modelo.test.ts. Fica aqui de novo, e nao importada,
// porque este teste precisa MEXER nela pra quebrar campo a campo.
function pecaValida(): PecaAnuncio {
  return {
    versao: 1,
    plataforma: "google-busca",
    geradoEm: "2026-07-31T10:00:00.000Z",
    estrategia: {
      objetivo: "Agendar avaliações",
      oferta: "Avaliação gratuita",
      publico: "Adultos de 30 a 50 anos em São Paulo",
      dorPrincipal: "Dor nas costas que não passa",
      provas: ["12 anos de clínica"],
      destino: {
        tipo: "whatsapp",
        url: "https://wa.me/5511999999999",
        observacao: "A recepção responde em até 10 minutos.",
      },
      localizacoes: ["São Paulo, SP"],
      idioma: "pt-BR",
    },
    campanha: {
      nome: "Busca, avaliação gratuita",
      tipo: "busca",
      grupos: [
        {
          id: "avaliacao-gratuita",
          nome: "Avaliação gratuita",
          tema: "Avaliação",
          palavrasChave: [
            { texto: "fisioterapia são paulo", correspondencia: "frase", motivo: "Intenção alta" },
          ],
          anuncios: [
            {
              titulos: ["Fisioterapia em SP", "Avaliação gratuita", "Agende hoje"],
              descricoes: [
                "Atendimento perto de você, com hora marcada.",
                "Fale no WhatsApp e agende hoje mesmo.",
              ],
              caminhos: ["fisioterapia"],
              urlFinal: "https://exemplo.com.br",
            },
          ],
        },
      ],
    },
    negativas: [{ texto: "curso", motivo: "Quem procura curso não vira paciente." }],
    recursos: {
      sitelinks: [
        {
          texto: "Nossos serviços",
          descricoes: ["Pilates, RPG e massagem", "Tudo com hora marcada"],
          url: "https://exemplo.com.br/servicos",
        },
      ],
      frasesDestaque: ["Hora marcada"],
      snippets: [{ cabecalho: "Serviços", valores: ["Pilates", "RPG", "Massagem"] }],
      chamada: "11 99999-9999",
    },
    orcamento: {
      diarioBrl: 50,
      cpcAlvoBrl: 3.5,
      cliquesEstimadosMes: "300 a 450",
      observacao: "Começa baixo e sobe depois da primeira semana.",
    },
    conversoes: [
      {
        nome: "Clique no WhatsApp",
        tipo: "whatsapp",
        comoMarcar: "Marcar clique no botão como conversão principal.",
        valorBrl: null,
      },
    ],
    publicacao: [
      { ordem: 1, titulo: "Criar a campanha", detalhe: "No painel, escolher Rede de Pesquisa." },
    ],
  };
}

// Uma peca quebrada de um jeito que o schema pega e o olho nao: titulos veio
// como texto em vez de lista.
function pecaComTitulosQuebrados(): unknown {
  const peca = pecaValida();
  const anuncio = peca.campanha.grupos[0].anuncios[0] as unknown as { titulos: unknown };
  anuncio.titulos = "Fisioterapia em SP";
  return peca;
}

// Monta uma pasta de peca temporaria, com o conteudo inicial do anuncio.json, e
// um laco ligado nela de verdade. `aoRetomar` faz o papel da IA.
function montarLacoEmDisco(opcoes: {
  conteudoInicial?: string;
  aoRetomar?: (pasta: string) => void;
  retomarOk?: boolean;
  status?: StatusSessao;
  validarLanca?: boolean;
}) {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-anuncio-laco-"));
  if (opcoes.conteudoInicial !== undefined) {
    writeFileSync(caminhoAnuncio(pasta), opcoes.conteudoInicial, "utf8");
  }

  const conferencias: ConferenciaSite[] = [];
  const retomadas: { id: string; prompt: string }[] = [];
  let validacoes = 0;

  const deps: DepsConformidadeAnuncio = {
    validar: () => {
      validacoes += 1;
      if (opcoes.validarLanca) throw new Error("o disco sumiu no meio");
      return diagnosticarAnuncio(pasta);
    },
    retomar: (id, prompt) => {
      retomadas.push({ id, prompt });
      if (opcoes.retomarOk === false) return { ok: false, erro: "sem id de conversa" };
      opcoes.aoRetomar?.(pasta);
      return { ok: true };
    },
    definirConferencia: (_id, conferencia) => conferencias.push(conferencia),
    statusSessao: () => opcoes.status ?? "concluida",
  };

  return {
    pasta,
    laco: criarLacoAnuncio(deps),
    conferencias,
    retomadas,
    contarValidacoes: () => validacoes,
    estados: () => conferencias.map((c) => c.estado),
    limpar: () => rmSync(pasta, { recursive: true, force: true }),
  };
}

function gravar(pasta: string, valor: unknown): void {
  writeFileSync(caminhoAnuncio(pasta), JSON.stringify(valor, null, 2), "utf8");
}

// ------------------------------------------------- quem entra e quem nao entra

test("so a geracao de anuncio roda este laco", () => {
  assert.equal(skillPassaPeloLacoAnuncio("anuncio"), true);
  // A conversa da tela e do dono, com ele olhando: laco automatico ali gastaria
  // credito por cima de uma pessoa que ja esta vendo o erro.
  assert.equal(skillPassaPeloLacoAnuncio("conversa-anuncio"), false);
  assert.equal(skillPassaPeloLacoAnuncio("site"), false);
  assert.equal(skillPassaPeloLacoAnuncio("ajuste-site"), false);
  assert.equal(skillPassaPeloLacoAnuncio("carrossel"), false);
  assert.equal(skillPassaPeloLacoAnuncio(undefined), false);
});

// A OUTRA METADE DA EXCLUSAO MUTUA. A primeira metade (anuncio nao dispara o
// laco de site) mora em sessoes/conformidade-site.test.ts. Esta aqui e a volta:
// peca de site nao tem anuncio.json, e validar o schema nela seria rodar a
// coisa errada no artefato errado.
test("sessao de site nunca dispara a validacao de anuncio", () => {
  assert.equal(deveDispararLacoAnuncio(sessaoAnuncio({ skill: "site" })), false);
  assert.equal(deveDispararLacoAnuncio(sessaoAnuncio({ skill: "ajuste-site" })), false);
  assert.equal(deveDispararLacoAnuncio(sessaoAnuncio({ skill: "carrossel" })), false);
});

test("dispara para a geracao de anuncio, sempre com pastaAlvo", () => {
  assert.equal(deveDispararLacoAnuncio(sessaoAnuncio()), true);
  assert.equal(deveDispararLacoAnuncio(sessaoAnuncio({ pastaAlvo: undefined })), false);
  assert.equal(deveDispararLacoAnuncio(sessaoAnuncio({ pastaAlvo: "" })), false);
});

// ------------------------------------------------------------ o laco rodando

test("campanha bem formada e aprovada de primeira, sem retomar", async () => {
  const c = montarLacoEmDisco({ conteudoInicial: JSON.stringify(pecaValida()) });
  try {
    await c.laco.aoConcluir(sessaoAnuncio());
    assert.deepEqual(c.estados(), ["conferindo", "aprovada"]);
    assert.equal(c.retomadas.length, 0);
  } finally {
    c.limpar();
  }
});

// O TESTE CENTRAL DA FASE. Um anuncio.json propositalmente quebrado, uma IA de
// mentira que conserta quando recebe o erro, e a peca valida na segunda volta.
test("JSON quebrado e consertado na segunda volta", async () => {
  const c = montarLacoEmDisco({
    conteudoInicial: JSON.stringify(pecaComTitulosQuebrados()),
    // A "IA": recebe a correcao e regrava a peca certa.
    aoRetomar: (pasta) => gravar(pasta, pecaValida()),
  });
  try {
    const sessao = sessaoAnuncio();
    // Primeira conclusao: reprova e manda corrigir.
    await c.laco.aoConcluir(sessao);
    // A retomada conclui e reentra no laco: agora o arquivo esta certo.
    await c.laco.aoConcluir(sessao);

    assert.deepEqual(c.estados(), ["conferindo", "corrigindo", "conferindo", "aprovada"]);
    assert.equal(c.retomadas.length, 1, "uma volta so foi preciso");
    assert.equal(c.contarValidacoes(), 2);
    assert.equal(diagnosticarAnuncio(c.pasta).valido, true);

    // O ERRO LITERAL, dizendo qual campo e o que se esperava, e nao "o JSON
    // esta errado". Sem isso a IA reescreve a campanha no chute.
    const prompt = c.retomadas[0].prompt;
    assert.match(prompt, /campanha\.grupos\[0\]\.anuncios\[0\]\.titulos/);
    assert.match(prompt, /esperava lista, veio texto/);
  } finally {
    c.limpar();
  }
});

test("arquivo ausente tambem dispara o laco, dizendo que ele falta", async () => {
  const c = montarLacoEmDisco({ aoRetomar: (pasta) => gravar(pasta, pecaValida()) });
  try {
    const sessao = sessaoAnuncio();
    await c.laco.aoConcluir(sessao);
    await c.laco.aoConcluir(sessao);
    assert.deepEqual(c.estados(), ["conferindo", "corrigindo", "conferindo", "aprovada"]);
    assert.match(c.retomadas[0].prompt, /não tem um anuncio\.json/);
  } finally {
    c.limpar();
  }
});

test("JSON ilegivel dispara o laco dizendo que nao e JSON valido", async () => {
  const c = montarLacoEmDisco({ conteudoInicial: "{ isto nao fecha" });
  try {
    await c.laco.aoConcluir(sessaoAnuncio());
    assert.equal(c.retomadas.length, 1);
    assert.match(c.retomadas[0].prompt, /não é um JSON válido/);
  } finally {
    c.limpar();
  }
});

// Depois de 2 voltas o laco para, e a peca em disco continua quebrada. Quem
// impede a campanha de aparecer como pronta a partir daqui e o veredito da peca
// (diagnosticarAnuncio), afirmado no fim deste teste.
test("no maximo 2 voltas, depois para em pendencias com a peca ainda invalida", async () => {
  const c = montarLacoEmDisco({
    conteudoInicial: JSON.stringify(pecaComTitulosQuebrados()),
    // A IA insiste no erro: nao conserta nada.
  });
  try {
    const sessao = sessaoAnuncio();
    await c.laco.aoConcluir(sessao); // volta 0 -> corrige (volta 1)
    await c.laco.aoConcluir(sessao); // volta 1 -> corrige (volta 2)
    await c.laco.aoConcluir(sessao); // volta 2 -> teto, pendencias
    await c.laco.aoConcluir(sessao); // e continua parado

    assert.equal(c.retomadas.length, 2, "no maximo duas correcoes");
    assert.deepEqual(c.estados(), [
      "conferindo",
      "corrigindo",
      "conferindo",
      "corrigindo",
      "conferindo",
      "pendencias",
      "conferindo",
      "pendencias",
    ]);
    assert.equal(c.conferencias.at(-1)?.volta, 2);

    const veredito = diagnosticarAnuncio(c.pasta);
    assert.equal(veredito.valido, false);
    assert.match(String(veredito.erro), /titulos/);
  } finally {
    c.limpar();
  }
});

// ------------------------------------------------- a decisao que nao se apaga

// VIOLACAO DE LIMITE DE CARACTERE NAO DISPARA VOLTA NENHUMA. Se este teste
// virar vermelho, alguem passou a gastar duas rodadas de credito pra tirar um
// caractere que o dono tira em dois segundos.
test("titulo estourado e descricao estourada nao disparam volta nenhuma", async () => {
  const peca = pecaValida();
  const tituloLongo = "Fisioterapia com hora marcada hoje"; // 34, o limite e 30
  const descricaoLonga =
    "Atendimento perto de você, com hora marcada, equipe própria e retorno incluso no mesmo pacote."; // passa de 90
  peca.campanha.grupos[0].anuncios[0].titulos[0] = tituloLongo;
  peca.campanha.grupos[0].anuncios[0].descricoes[0] = descricaoLonga;

  // Sanidade: a peca REALMENTE viola limite. Sem isto o teste passaria com uma
  // peca perfeitamente dentro dos limites e nao provaria nada.
  assert.ok(tituloLongo.length > 30);
  assert.ok(descricaoLonga.length > 90);
  const violacoes = conferirLimites(peca);
  assert.ok(
    violacoes.some((v) => v.gravidade === "erro"),
    "a peca do teste precisa violar limite de caractere",
  );

  const c = montarLacoEmDisco({ conteudoInicial: JSON.stringify(peca) });
  try {
    await c.laco.aoConcluir(sessaoAnuncio());
    assert.deepEqual(c.estados(), ["conferindo", "aprovada"]);
    assert.equal(c.retomadas.length, 0, "limite de caractere nao e assunto do laco");
  } finally {
    c.limpar();
  }
});

test("o prompt de correcao proibe consertar tamanho de texto", () => {
  const prompt = montarPromptCorrecaoAnuncio("campanha: campo obrigatório ausente");
  assert.match(prompt, /- campanha: campo obrigatório ausente/);
  assert.match(prompt, /Corrija EXATAMENTE isso e nada mais/);
  assert.match(prompt, /30 caracteres/);
  assert.match(prompt, /deixe como está/);
});

// ------------------------------------------------- o laco nunca fica preso

test("sessao parada pelo dono no meio nao e retomada", async () => {
  const c = montarLacoEmDisco({
    conteudoInicial: JSON.stringify(pecaComTitulosQuebrados()),
    status: "parada",
  });
  try {
    await c.laco.aoConcluir(sessaoAnuncio());
    assert.deepEqual(c.estados(), ["conferindo", "pendencias"]);
    assert.equal(c.retomadas.length, 0);
  } finally {
    c.limpar();
  }
});

// Sessao que MORREU no meio de uma volta. Sem esta guarda o laco insistiria em
// retomar uma conversa que acabou, e a conferencia ficaria girando.
test("sessao que morreu no meio da volta vira pendencias, nao retomada", async () => {
  const c = montarLacoEmDisco({
    conteudoInicial: JSON.stringify(pecaComTitulosQuebrados()),
    status: "erro",
  });
  try {
    await c.laco.aoConcluir(sessaoAnuncio());
    assert.deepEqual(c.estados(), ["conferindo", "pendencias"]);
    assert.equal(c.retomadas.length, 0);
  } finally {
    c.limpar();
  }
});

test("retomada que falha vira pendencias", async () => {
  const c = montarLacoEmDisco({
    conteudoInicial: JSON.stringify(pecaComTitulosQuebrados()),
    retomarOk: false,
  });
  try {
    await c.laco.aoConcluir(sessaoAnuncio());
    assert.equal(c.retomadas.length, 1);
    assert.equal(c.conferencias.at(-1)?.estado, "pendencias");
  } finally {
    c.limpar();
  }
});

test("validacao que lanca vira pendencias e nao deixa preso em conferindo", async () => {
  const c = montarLacoEmDisco({ validarLanca: true });
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    await c.laco.aoConcluir(sessaoAnuncio());
  } finally {
    console.error = erroOriginal;
    c.limpar();
  }
  assert.deepEqual(c.estados(), ["conferindo", "pendencias"]);
  assert.equal(c.retomadas.length, 0);
});

// A trava de reentrancia precisa ser liberada mesmo no caminho de erro, senao
// uma excecao numa volta congela a peca em "conferindo" pra sempre.
test("depois da excecao o laco aceita rodar de novo", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-anuncio-laco-"));
  gravar(pasta, pecaValida());
  const conferencias: ConferenciaSite[] = [];
  let chamadas = 0;
  const laco = criarLacoAnuncio({
    validar: () => {
      chamadas += 1;
      if (chamadas === 1) throw new Error("estourou na primeira");
      return diagnosticarAnuncio(pasta);
    },
    retomar: () => ({ ok: true }),
    definirConferencia: (_id, c) => conferencias.push(c),
    statusSessao: () => "concluida",
  });

  const erroOriginal = console.error;
  console.error = () => {};
  try {
    await laco.aoConcluir(sessaoAnuncio());
    await laco.aoConcluir(sessaoAnuncio());
  } finally {
    console.error = erroOriginal;
    rmSync(pasta, { recursive: true, force: true });
  }
  assert.equal(chamadas, 2);
  assert.equal(conferencias.at(-1)?.estado, "aprovada");
});

// ------------------------------------------------ o veredito que a peca leva

test("o diagnostico da peca acompanha o arquivo, ida e volta", () => {
  const pasta = mkdtempSync(join(tmpdir(), "vkos-anuncio-diag-"));
  try {
    // Sem arquivo.
    assert.equal(diagnosticarAnuncio(pasta).valido, false);

    gravar(pasta, pecaValida());
    assert.deepEqual(diagnosticarAnuncio(pasta), { valido: true });

    gravar(pasta, pecaComTitulosQuebrados());
    const quebrado = diagnosticarAnuncio(pasta);
    assert.equal(quebrado.valido, false);
    assert.match(String(quebrado.erro), /titulos/);

    unlinkSync(caminhoAnuncio(pasta));
    assert.equal(diagnosticarAnuncio(pasta).valido, false);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
