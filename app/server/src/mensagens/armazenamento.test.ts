import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import {
  anexarMensagens,
  caminhoConversa,
  caminhoIndice,
  lerConversaCompleta,
  lerIndice,
  salvarIndice,
} from "./armazenamento.js";
import { ErroMensagens, type Mensagem } from "./modelo.js";

let raizDados: string;

before(() => {
  raizDados = mkdtempSync(join(tmpdir(), "vkos-mensagens-arq-"));
  process.env.VKOS_DADOS_TESTE = raizDados;
});

after(() => {
  rmSync(raizDados, { recursive: true, force: true });
  delete process.env.VKOS_DADOS_TESTE;
});

function mensagem(parcial: Partial<Mensagem> & { id: string }): Mensagem {
  return {
    conversaId: "cv-teste",
    direcao: "saida",
    canal: "manual",
    origem: "manual",
    tipo: "texto",
    texto: "",
    privada: false,
    status: "enviada",
    chaveIdempotencia: parcial.id,
    autorTipo: "usuario",
    enviadaEm: "2026-07-25T10:00:00.000Z",
    criadaEm: "2026-07-25T10:00:00.000Z",
    anexos: [],
    ...parcial,
  };
}

test("conversa que nunca recebeu mensagem devolve thread vazia, sem erro", () => {
  const { mensagens, linhasInvalidas } = lerConversaCompleta("cv-que-nao-existe");
  assert.deepEqual(mensagens, []);
  assert.equal(linhasInvalidas, 0);
});

test("a versao nova de uma mensagem entra como linha nova e a leitura colapsa por id", () => {
  const conversaId = "cv-colapso";
  const primeira = mensagem({ id: "m-1", texto: "orçamento enviado", status: "na-fila" });
  const segunda = mensagem({ id: "m-2", texto: "segunda mensagem" });
  anexarMensagens(conversaId, [primeira, segunda]);

  // O callback do provedor confirma a entrega. Mesma mensagem, mesmo id, mesmas
  // datas: muda so o status. Nada e reescrito no arquivo.
  anexarMensagens(conversaId, [
    { ...primeira, status: "entregue", entregueEm: "2026-07-25T10:05:00.000Z" },
  ]);

  const linhas = readFileSync(caminhoConversa(conversaId), "utf8")
    .split("\n")
    .filter((linha) => linha.trim());
  assert.equal(linhas.length, 3, "o arquivo so cresce, nunca e reescrito");

  const { mensagens } = lerConversaCompleta(conversaId);
  assert.equal(mensagens.length, 2, "a leitura colapsa por id");
  assert.deepEqual(
    mensagens.map((item) => item.id),
    ["m-1", "m-2"],
    "a versao nova mantem a posicao da original na thread",
  );
  assert.equal(mensagens[0].status, "entregue");
  assert.equal(mensagens[0].entregueEm, "2026-07-25T10:05:00.000Z");
  assert.equal(mensagens[0].texto, "orçamento enviado");
});

test("linha corrompida some sozinha e conta, sem derrubar a leitura", () => {
  const conversaId = "cv-linha-ruim";
  anexarMensagens(conversaId, [
    mensagem({ id: "b-1", texto: "primeira" }),
    mensagem({ id: "b-2", texto: "segunda" }),
  ]);
  const caminho = caminhoConversa(conversaId);
  // Linha que parseia mas nao e mensagem, e lixo que nem parseia.
  writeFileSync(
    caminho,
    `${readFileSync(caminho, "utf8")}{"qualquer":"coisa"}\n{ isto nao e json\n`,
    "utf8",
  );

  const { mensagens, linhasInvalidas } = lerConversaCompleta(conversaId);
  assert.deepEqual(
    mensagens.map((item) => item.texto),
    ["primeira", "segunda"],
  );
  assert.equal(linhasInvalidas, 2);
});

test("id de conversa que nao serve como nome de arquivo nunca vira caminho", () => {
  for (const id of ["../fora", "cv/../..", "cv com espaço", ""]) {
    assert.throws(
      () => caminhoConversa(id),
      (erro: unknown) => erro instanceof ErroMensagens && erro.status === 404,
      `"${id}" nao pode virar caminho de arquivo`,
    );
  }
});

test("indice corrompido vai pra quarentena com os bytes intactos, e nada e gravado por cima", () => {
  salvarIndice({
    versao: 1,
    conversas: [
      {
        id: "cv-boa",
        contatoId: "c-1",
        canal: "manual",
        identificadorExterno: "+5531999998888",
        status: "aberta",
        previa: "oi",
        naoLidas: 0,
        criadaEm: "2026-07-25T10:00:00.000Z",
        atualizadaEm: "2026-07-25T10:00:00.000Z",
      },
    ],
  });
  assert.equal(lerIndice().conversas.length, 1);

  const bruto = '{"versao": 1, "conversas": [ISTO ESTA QUEBRADO';
  writeFileSync(caminhoIndice(), bruto, "utf8");

  assert.throws(
    () => lerIndice(),
    (erro: unknown) => erro instanceof ErroMensagens && erro.status === 409,
  );
  assert.equal(existsSync(caminhoIndice()), false, "o arquivo ruim sai do lugar");

  const pasta = join(raizDados, "crm", "mensagens");
  const quarentena = readdirSync(pasta).find((nome) => nome.includes(".corrompido-"));
  assert.ok(quarentena, "o original precisa continuar em disco");
  assert.equal(
    readFileSync(join(pasta, quarentena), "utf8"),
    bruto,
    "os bytes do original chegam intactos na quarentena",
  );
});
