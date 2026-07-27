import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import Fastify, { type FastifyInstance } from "fastify";

import { rotasCrm } from "../crm/rotas.js";
import { garantirConversaPorIdentificador } from "./estado.js";
import { rotasMensagens } from "./rotas.js";

// Tudo vai pra uma raiz de dados temporaria (VKOS_DADOS_TESTE). Sem isso o
// teste gravaria conversa por cima do CRM real do usuario, que e exatamente o
// dado que ninguem pode perder.
let app: FastifyInstance;
let raizDados: string;

before(async () => {
  raizDados = mkdtempSync(join(tmpdir(), "vkos-mensagens-"));
  process.env.VKOS_DADOS_TESTE = raizDados;
  app = Fastify();
  // Os dois plugins juntos: conversa nao existe sem contato, entao o teste
  // precisa do CRM pra criar contato e interacao pelo mesmo caminho que a tela
  // usa.
  await app.register(rotasCrm, { prefix: "/api" });
  await app.register(rotasMensagens, { prefix: "/api" });
  await app.ready();
});

after(async () => {
  await app.close();
  rmSync(raizDados, { recursive: true, force: true });
  delete process.env.VKOS_DADOS_TESTE;
});

async function chamar(
  metodo: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  payload?: Record<string, unknown>,
) {
  const resposta = await app.inject({ method: metodo, url, payload });
  return { status: resposta.statusCode, corpo: resposta.json() as Record<string, unknown> };
}

// Preparacao SEMPRE afirma o status. Numa rodada anterior um POST devolveu 400
// sem ninguem notar e a falha apareceu tres passos adiante, ilegivel.
async function novoContato(nome: string, telefone?: string): Promise<string> {
  const { status, corpo } = await chamar("POST", "/api/crm/contatos", {
    nome,
    ...(telefone ? { telefone } : {}),
  });
  assert.equal(status, 201, `criar contato ${nome}: ${JSON.stringify(corpo)}`);
  return corpo.id as string;
}

async function novaConversa(contatoId: string): Promise<string> {
  const { status, corpo } = await chamar("POST", "/api/crm/mensagens/conversas", {
    contatoId,
  });
  assert.equal(status, 201, `criar conversa: ${JSON.stringify(corpo)}`);
  return corpo.id as string;
}

async function registrar(
  conversaId: string,
  corpo: Record<string, unknown>,
  statusEsperado = 201,
) {
  const resposta = await chamar(
    "POST",
    `/api/crm/mensagens/conversas/${conversaId}/mensagens`,
    corpo,
  );
  assert.equal(
    resposta.status,
    statusEsperado,
    `registrar mensagem: ${JSON.stringify(resposta.corpo)}`,
  );
  return resposta.corpo;
}

async function abrir(conversaId: string, consulta = "") {
  const { status, corpo } = await chamar(
    "GET",
    `/api/crm/mensagens/conversas/${conversaId}${consulta}`,
  );
  assert.equal(status, 200, `abrir conversa: ${JSON.stringify(corpo)}`);
  return corpo as {
    conversa: Record<string, unknown>;
    mensagens: Array<Record<string, unknown>>;
    total: number;
    temMais: boolean;
    cursorAnterior?: string;
    linhasInvalidas: number;
  };
}

function caminhoDaThread(conversaId: string): string {
  return join(raizDados, "crm", "mensagens", "conversas", `${conversaId}.jsonl`);
}

function linhasDaThread(conversaId: string): string[] {
  return readFileSync(caminhoDaThread(conversaId), "utf8")
    .split("\n")
    .filter((linha) => linha.trim());
}

function indiceEmDisco(): { conversas: Array<Record<string, unknown>> } {
  const bruto = readFileSync(join(raizDados, "crm", "mensagens", "indice.json"), "utf8");
  return JSON.parse(bruto) as { conversas: Array<Record<string, unknown>> };
}

// ------------------------------------------ conversa nao existe sem contato

test("conversa nao nasce sem contato", async () => {
  const semContato = await chamar("POST", "/api/crm/mensagens/conversas", {});
  assert.equal(semContato.status, 400);
  assert.match(semContato.corpo.erro as string, /contato/i);

  const contatoFantasma = await chamar("POST", "/api/crm/mensagens/conversas", {
    contatoId: "c-nao-existe",
  });
  assert.equal(contatoFantasma.status, 404);
  assert.match(contatoFantasma.corpo.erro as string, /contato nao encontrado/i);

  // Nenhuma das duas tentativas pode ter deixado conversa solta pra tras.
  const lista = await chamar("GET", "/api/crm/mensagens/conversas");
  assert.equal(lista.status, 200);
  assert.deepEqual(lista.corpo.conversas, []);
});

test("conversa nasce do contato, com o telefone normalizado como identificador", async () => {
  const contatoId = await novoContato("Padaria Aurora", "(31) 99999-8888");
  const criada = await chamar("POST", "/api/crm/mensagens/conversas", { contatoId });
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.contatoId, contatoId);
  assert.equal(criada.corpo.canal, "manual");
  assert.equal(criada.corpo.status, "aberta");
  assert.equal(criada.corpo.naoLidas, 0);
  assert.equal(criada.corpo.previa, "");
  assert.equal(criada.corpo.identificadorExterno, "+5531999998888");

  // Pedir de novo devolve a MESMA conversa, com 200. Duas conversas do mesmo
  // contato no mesmo canal seriam duas caixas de entrada do mesmo cliente.
  const repetida = await chamar("POST", "/api/crm/mensagens/conversas", { contatoId });
  assert.equal(repetida.status, 200);
  assert.equal(repetida.corpo.id, criada.corpo.id);

  const lista = await chamar("GET", `/api/crm/mensagens/conversas?contatoId=${contatoId}`);
  assert.equal(lista.status, 200);
  assert.equal((lista.corpo.conversas as unknown[]).length, 1);
});

test("mensagem de numero desconhecido cria o contato antes da conversa", async () => {
  const antes = (await chamar("GET", "/api/crm")).corpo.contatos as unknown[];
  const resultado = garantirConversaPorIdentificador({
    identificadorExterno: "+55 31 98888-7777",
    nomeSugerido: "Sapataria do Zé",
  });
  assert.equal(resultado.contatoCriado, true);
  assert.equal(resultado.criada, true);

  const estado = (await chamar("GET", "/api/crm")).corpo;
  const contatos = estado.contatos as Array<Record<string, unknown>>;
  assert.equal(contatos.length, antes.length + 1);
  const novo = contatos.find((item) => item.id === resultado.conversa.contatoId);
  assert.ok(novo, "a conversa precisa apontar pra um contato que existe no CRM");
  assert.equal(novo.nome, "Sapataria do Zé");
  assert.equal(novo.telefoneNormalizado, "+5531988887777");
  assert.equal(resultado.conversa.identificadorExterno, "+5531988887777");

  // Segunda mensagem do mesmo numero cai na mesma ficha e na mesma conversa.
  const denovo = garantirConversaPorIdentificador({
    identificadorExterno: "31988887777",
  });
  assert.equal(denovo.contatoCriado, false);
  assert.equal(denovo.criada, false);
  assert.equal(denovo.conversa.id, resultado.conversa.id);
});

test("canal que nao existe e recusado com 400", async () => {
  const contatoId = await novoContato("Cliente de canal futuro");
  const { status, corpo } = await chamar("POST", "/api/crm/mensagens/conversas", {
    contatoId,
    canal: "whatsapp",
  });
  assert.equal(status, 400);
  assert.match(corpo.erro as string, /whatsapp/i);
});

// ------------------------------------------------------------ idempotencia

test("idExterno repetido nao duplica mensagem na thread", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente do webhook"));
  const primeira = await registrar(conversaId, {
    direcao: "entrada",
    texto: "bom dia, ainda tem vaga?",
    idExterno: "wamid.HBgNNTUzMQ==",
  });

  // O mesmo webhook reenviado, com texto diferente pra provar que a resposta e
  // a mensagem ORIGINAL e nao uma segunda linha.
  const reenvio = await registrar(
    conversaId,
    {
      direcao: "entrada",
      texto: "texto diferente do reenvio",
      idExterno: "wamid.HBgNNTUzMQ==",
    },
    200,
  );
  assert.equal(reenvio.id, primeira.id);
  assert.equal(reenvio.texto, "bom dia, ainda tem vaga?");

  const thread = await abrir(conversaId);
  assert.equal(thread.total, 1);
  assert.equal(thread.mensagens.length, 1);
  assert.equal(thread.mensagens[0].texto, "bom dia, ainda tem vaga?");
  assert.equal(linhasDaThread(conversaId).length, 1);
});

test("chaveIdempotencia repetida nao duplica mensagem", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente do clique duplo"));
  const primeira = await registrar(conversaId, {
    direcao: "saida",
    texto: "mandei o orçamento",
    chaveIdempotencia: "envio-1",
  });
  const segunda = await registrar(
    conversaId,
    { direcao: "saida", texto: "mandei o orçamento", chaveIdempotencia: "envio-1" },
    200,
  );
  assert.equal(segunda.id, primeira.id);
  assert.equal((await abrir(conversaId)).total, 1);
});

// --------------------------------------------------- a janela de 24 horas

test("ultimaEntradaEm so muda quando a direcao e entrada", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente da janela"));

  await registrar(conversaId, {
    direcao: "saida",
    texto: "oi, tudo bem?",
    enviadaEm: "2026-07-20T10:00:00.000Z",
  });
  let conversa = (await abrir(conversaId)).conversa;
  assert.equal(conversa.ultimaEntradaEm, undefined, "saida nao abre janela nenhuma");
  assert.equal(conversa.ultimaMensagemEm, "2026-07-20T10:00:00.000Z");

  await registrar(conversaId, {
    direcao: "entrada",
    texto: "tudo, e você?",
    enviadaEm: "2026-07-20T11:00:00.000Z",
  });
  conversa = (await abrir(conversaId)).conversa;
  assert.equal(conversa.ultimaEntradaEm, "2026-07-20T11:00:00.000Z");

  await registrar(conversaId, {
    direcao: "saida",
    texto: "vou te mandar o valor",
    enviadaEm: "2026-07-20T12:00:00.000Z",
  });
  conversa = (await abrir(conversaId)).conversa;
  assert.equal(
    conversa.ultimaEntradaEm,
    "2026-07-20T11:00:00.000Z",
    "saida depois da entrada nao pode mover a janela",
  );
  assert.equal(conversa.ultimaMensagemEm, "2026-07-20T12:00:00.000Z");

  // Nota privada e do dono, nunca do contato: ela nao abre janela sozinha.
  await registrar(conversaId, {
    direcao: "entrada",
    texto: "lembrete: ele pediu desconto",
    privada: true,
    enviadaEm: "2026-07-20T13:00:00.000Z",
  });
  conversa = (await abrir(conversaId)).conversa;
  assert.equal(conversa.ultimaEntradaEm, "2026-07-20T11:00:00.000Z");
  assert.equal(conversa.naoLidas, 1, "nota privada nao conta como nao lida");
});

// ------------------------------------------------------ registro retroativo

test("registro retroativo respeita enviadaEm e nao bagunca a ordem", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente retroativo"));
  await registrar(conversaId, {
    direcao: "entrada",
    texto: "primeira",
    enviadaEm: "2026-07-18T10:00:00.000Z",
  });
  await registrar(conversaId, {
    direcao: "saida",
    texto: "terceira",
    enviadaEm: "2026-07-18T12:00:00.000Z",
  });
  // Lembrou depois que respondeu no meio. Entra por ultimo no arquivo e no
  // meio da thread.
  const domeio = await registrar(conversaId, {
    direcao: "saida",
    texto: "segunda",
    enviadaEm: "2026-07-18T11:00:00.000Z",
  });

  assert.equal(domeio.enviadaEm, "2026-07-18T11:00:00.000Z");
  assert.notEqual(
    domeio.criadaEm,
    domeio.enviadaEm,
    "criadaEm e quando a linha entrou no arquivo, nunca retroativo",
  );
  assert.ok(Date.parse(domeio.criadaEm as string) > Date.parse("2026-07-18T11:00:00.000Z"));

  const thread = await abrir(conversaId);
  assert.deepEqual(
    thread.mensagens.map((m) => m.texto),
    ["primeira", "segunda", "terceira"],
  );
  // No arquivo, a ordem continua sendo a de gravacao: append-only nao reescreve
  // o passado. Quem ordena e a leitura.
  assert.equal(linhasDaThread(conversaId).length, 3);
  assert.match(linhasDaThread(conversaId)[2], /"texto":"segunda"/);

  // A previa e a ultima da thread, nao a ultima gravada.
  assert.equal(thread.conversa.ultimaMensagemEm, "2026-07-18T12:00:00.000Z");
  assert.equal(thread.conversa.previa, "terceira");
});

// ---------------------------------------------------------------- paginacao

test("paginacao da thread devolve a pagina certa e nao a conversa inteira", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente falante"));
  for (let n = 1; n <= 12; n += 1) {
    const hora = String(n).padStart(2, "0");
    await registrar(conversaId, {
      direcao: n % 2 === 0 ? "entrada" : "saida",
      texto: `m${hora}`,
      enviadaEm: `2026-07-19T${hora}:00:00.000Z`,
    });
  }

  const pagina1 = await abrir(conversaId, "?limite=5");
  assert.equal(pagina1.total, 12);
  assert.equal(pagina1.temMais, true);
  assert.deepEqual(
    pagina1.mensagens.map((m) => m.texto),
    ["m08", "m09", "m10", "m11", "m12"],
  );
  assert.equal(pagina1.cursorAnterior, pagina1.mensagens[0].id);

  const pagina2 = await abrir(conversaId, `?limite=5&antesDe=${pagina1.cursorAnterior}`);
  assert.equal(pagina2.temMais, true);
  assert.deepEqual(
    pagina2.mensagens.map((m) => m.texto),
    ["m03", "m04", "m05", "m06", "m07"],
  );

  const pagina3 = await abrir(conversaId, `?limite=5&antesDe=${pagina2.cursorAnterior}`);
  assert.equal(pagina3.temMais, false);
  assert.deepEqual(
    pagina3.mensagens.map((m) => m.texto),
    ["m01", "m02"],
  );

  // Sem limite, a resposta continua sendo uma pagina, nunca a conversa inteira
  // sem teto: o padrao e 50.
  const padrao = await abrir(conversaId);
  assert.equal(padrao.mensagens.length, 12);
  assert.equal(padrao.total, 12);
});

// ------------------------------------------------------------- corrompido

test("linha corrompida no meio do jsonl perde uma mensagem e a conversa continua legivel", async () => {
  const contatoId = await novoContato("Cliente do arquivo ferido");
  const conversaId = await novaConversa(contatoId);
  for (const texto of ["antes", "no meio", "depois"]) {
    await registrar(conversaId, {
      direcao: "entrada",
      texto,
      enviadaEm: `2026-07-21T1${["antes", "no meio", "depois"].indexOf(texto)}:00:00.000Z`,
    });
  }

  // Corta a linha do meio no meio do JSON, que e como um encerramento no meio
  // da escrita deixaria o arquivo.
  const linhas = linhasDaThread(conversaId);
  assert.equal(linhas.length, 3);
  linhas[1] = linhas[1].slice(0, Math.floor(linhas[1].length / 2));
  writeFileSync(caminhoDaThread(conversaId), `${linhas.join("\n")}\n`, "utf8");

  const thread = await abrir(conversaId);
  assert.equal(thread.linhasInvalidas, 1, "a linha quebrada e contada, nao escondida");
  assert.deepEqual(
    thread.mensagens.map((m) => m.texto),
    ["antes", "depois"],
    "perde uma mensagem, nao a conversa",
  );
  assert.equal(thread.total, 2);
  assert.equal(thread.conversa.id, conversaId);

  // E a conversa continua recebendo mensagem depois do estrago.
  await registrar(conversaId, {
    direcao: "saida",
    texto: "continuei conversando",
    enviadaEm: "2026-07-21T13:00:00.000Z",
  });
  const depois = await abrir(conversaId);
  assert.deepEqual(
    depois.mensagens.map((m) => m.texto),
    ["antes", "depois", "continuei conversando"],
  );
  assert.equal(depois.linhasInvalidas, 1);
});

// ------------------------------------------------------------- coerencia

test("indice e conversa ficam coerentes depois de uma escrita", async () => {
  const contatoId = await novoContato("Cliente da coerência");
  const conversaId = await novaConversa(contatoId);
  await registrar(conversaId, {
    direcao: "saida",
    texto: "te mandei a proposta",
    enviadaEm: "2026-07-22T09:00:00.000Z",
  });
  await registrar(conversaId, {
    direcao: "entrada",
    texto: "recebi, vou olhar hoje",
    enviadaEm: "2026-07-22T09:30:00.000Z",
  });

  const emDisco = indiceEmDisco().conversas.find((item) => item.id === conversaId);
  assert.ok(emDisco, "a conversa precisa estar no indice gravado");
  assert.equal(emDisco.contatoId, contatoId);
  assert.equal(emDisco.ultimaMensagemEm, "2026-07-22T09:30:00.000Z");
  assert.equal(emDisco.ultimaEntradaEm, "2026-07-22T09:30:00.000Z");
  assert.equal(emDisco.previa, "recebi, vou olhar hoje");
  assert.equal(emDisco.naoLidas, 1);

  const linhas = linhasDaThread(conversaId);
  assert.equal(linhas.length, 2);
  const ultima = JSON.parse(linhas[1]) as Record<string, unknown>;
  assert.equal(ultima.enviadaEm, emDisco.ultimaMensagemEm);
  assert.equal(ultima.conversaId, conversaId);
  // O id da mensagem e UUID local, nunca o do provedor.
  assert.match(
    ultima.id as string,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
});

test("marcar como lida zera as nao lidas sem reescrever a thread", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente das nao lidas"));
  await registrar(conversaId, {
    direcao: "entrada",
    texto: "oi",
    enviadaEm: "2026-07-23T09:00:00.000Z",
  });
  await registrar(conversaId, {
    direcao: "entrada",
    texto: "consegue hoje?",
    enviadaEm: "2026-07-23T09:01:00.000Z",
  });
  assert.equal((await abrir(conversaId)).conversa.naoLidas, 2);

  const antes = readFileSync(caminhoDaThread(conversaId), "utf8");
  const lida = await chamar("POST", `/api/crm/mensagens/conversas/${conversaId}/lida`);
  assert.equal(lida.status, 200);
  assert.equal(lida.corpo.naoLidas, 0);
  assert.ok(lida.corpo.lidasAte, "o cursor de leitura precisa ficar gravado");
  assert.equal(
    readFileSync(caminhoDaThread(conversaId), "utf8"),
    antes,
    "marcar lida nao pode tocar no arquivo append-only",
  );

  await registrar(conversaId, {
    direcao: "entrada",
    texto: "alô?",
    enviadaEm: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.equal((await abrir(conversaId)).conversa.naoLidas, 1);
});

// ------------------------------------------------------------------ status

test("mudar status cobre adiar, e adiar exige a data pra retomar", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente adiado"));
  const semData = await chamar("PATCH", `/api/crm/mensagens/conversas/${conversaId}`, {
    status: "adiada",
  });
  assert.equal(semData.status, 400);
  assert.match(semData.corpo.erro as string, /data/i);

  const resolvida = await chamar("PATCH", `/api/crm/mensagens/conversas/${conversaId}`, {
    status: "resolvida",
  });
  assert.equal(resolvida.status, 200);
  assert.equal(resolvida.corpo.status, "resolvida");

  const adiada = await chamar("PATCH", `/api/crm/mensagens/conversas/${conversaId}`, {
    status: "adiada",
    adiadaAte: "2026-08-01T09:00:00.000Z",
  });
  assert.equal(adiada.status, 200);
  assert.equal(adiada.corpo.status, "adiada");
  assert.equal(adiada.corpo.adiadaAte, "2026-08-01T09:00:00.000Z");

  const invalido = await chamar("PATCH", `/api/crm/mensagens/conversas/${conversaId}`, {
    status: "arquivada",
  });
  assert.equal(invalido.status, 400);

  // O cliente respondeu: a conversa volta pra aberta e o adiamento cai.
  await registrar(conversaId, { direcao: "entrada", texto: "voltei" });
  const conversa = (await abrir(conversaId)).conversa;
  assert.equal(conversa.status, "aberta");
  assert.equal(conversa.adiadaAte, undefined);

  const fantasma = await chamar("PATCH", "/api/crm/mensagens/conversas/cv-nao-existe", {
    status: "aberta",
  });
  assert.equal(fantasma.status, 404);
});

// ----------------------------------------------------- linha do tempo unica

test("a linha do tempo unificada intercala interacao e mensagem na ordem certa", async () => {
  const contatoId = await novoContato("Cliente da linha do tempo");
  const primeira = await chamar("POST", `/api/crm/contatos/${contatoId}/interacoes`, {
    tipo: "ligacao",
    texto: "liguei e ele pediu proposta",
    em: "2026-07-24T09:00:00.000Z",
  });
  assert.equal(primeira.status, 201, JSON.stringify(primeira.corpo));

  const conversaId = await novaConversa(contatoId);
  await registrar(conversaId, {
    direcao: "saida",
    texto: "segue a proposta em anexo",
    enviadaEm: "2026-07-24T10:00:00.000Z",
  });

  const segunda = await chamar("POST", `/api/crm/contatos/${contatoId}/interacoes`, {
    tipo: "reuniao",
    texto: "reuniao de fechamento",
    em: "2026-07-24T11:00:00.000Z",
  });
  assert.equal(segunda.status, 201, JSON.stringify(segunda.corpo));

  const { status, corpo } = await chamar(
    "GET",
    `/api/crm/contatos/${contatoId}/linha-do-tempo`,
  );
  assert.equal(status, 200);
  const itens = corpo.itens as Array<Record<string, any>>;
  assert.equal(itens.length, 3);
  assert.deepEqual(
    itens.map((item) => item.tipo),
    ["interacao", "mensagem", "interacao"],
  );
  assert.deepEqual(
    itens.map((item) => item.em),
    [
      "2026-07-24T11:00:00.000Z",
      "2026-07-24T10:00:00.000Z",
      "2026-07-24T09:00:00.000Z",
    ],
  );
  assert.equal(itens[0].interacao.texto, "reuniao de fechamento");
  assert.equal(itens[1].mensagem.texto, "segue a proposta em anexo");
  assert.equal(itens[1].conversaId, conversaId);
  assert.equal(itens[2].interacao.texto, "liguei e ele pediu proposta");

  const fantasma = await chamar("GET", "/api/crm/contatos/c-nao-existe/linha-do-tempo");
  assert.equal(fantasma.status, 404);
});

// -------------------------------------------------------------- validacao

test("mensagem vazia, tipo invalido e template sao recusados no canal manual", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente das bordas"));

  const vazia = await chamar(
    "POST",
    `/api/crm/mensagens/conversas/${conversaId}/mensagens`,
    { direcao: "saida", texto: "   " },
  );
  assert.equal(vazia.status, 400);

  const semDirecao = await chamar(
    "POST",
    `/api/crm/mensagens/conversas/${conversaId}/mensagens`,
    { texto: "e pra onde isso vai?" },
  );
  assert.equal(semDirecao.status, 400);
  assert.match(semDirecao.corpo.erro as string, /direcao/i);

  const template = await chamar(
    "POST",
    `/api/crm/mensagens/conversas/${conversaId}/mensagens`,
    { direcao: "saida", texto: "oi", tipo: "template" },
  );
  assert.equal(template.status, 400);
  assert.match(template.corpo.erro as string, /template/i);

  const naoExiste = await chamar(
    "POST",
    "/api/crm/mensagens/conversas/cv-nao-existe/mensagens",
    { direcao: "saida", texto: "oi" },
  );
  assert.equal(naoExiste.status, 404);
});

test("anexo guarda caminho local e recusa URL", async () => {
  const conversaId = await novaConversa(await novoContato("Cliente com anexo"));

  const comUrl = await chamar(
    "POST",
    `/api/crm/mensagens/conversas/${conversaId}/mensagens`,
    {
      direcao: "entrada",
      texto: "",
      tipo: "imagem",
      anexos: [{ caminhoLocal: "https://lookaside.fbsbx.com/whatsapp/midia.jpg" }],
    },
  );
  assert.equal(comUrl.status, 400);
  assert.match(comUrl.corpo.erro as string, /url/i);

  const comArquivo = await registrar(conversaId, {
    direcao: "entrada",
    texto: "",
    tipo: "imagem",
    anexos: [{ caminhoLocal: "midias/2026-07-25/foto-da-obra.jpg", tipo: "imagem" }],
  });
  const anexos = comArquivo.anexos as Array<Record<string, unknown>>;
  assert.equal(anexos.length, 1);
  assert.equal(anexos[0].caminhoLocal, "midias/2026-07-25/foto-da-obra.jpg");
  assert.equal(anexos[0].nome, "foto-da-obra.jpg");
  // Sem texto, a previa descreve o anexo em vez de ficar em branco.
  assert.equal((await abrir(conversaId)).conversa.previa, "[imagem]");
});

test("id de conversa que nao serve como nome de arquivo responde 404, nao le fora da pasta", async () => {
  const { status } = await chamar(
    "GET",
    "/api/crm/mensagens/conversas/..%2F..%2Fcrm.json",
  );
  assert.equal(status, 404);
});

test("o canal manual se declara sem envio real, sem janela e sem template", async () => {
  const { status, corpo } = await chamar("GET", "/api/crm/mensagens/canais");
  assert.equal(status, 200);
  const canais = corpo.canais as Array<Record<string, any>>;
  assert.equal(canais.length, 1);
  assert.equal(canais[0].id, "manual");
  assert.deepEqual(canais[0].capacidades, {
    envioReal: false,
    janela24h: false,
    templates: false,
    recebePorWebhook: false,
    anexos: true,
  });
});
