import assert from "node:assert/strict";
import test from "node:test";

import { ErroPublicacao } from "./erros.js";
import {
  comandoAbrirPasta,
  conferirBarreiraQualidade,
  criarZipExportacao,
  nomeArquivoExportacao,
} from "./exportacao.js";

// Junta o stream do archiver num Buffer, como a resposta HTTP faria.
async function juntarZip(arquivos: { caminho: string; conteudo: Buffer }[]): Promise<Buffer> {
  const zip = criarZipExportacao(arquivos);
  const partes: Buffer[] = [];
  const pronto = new Promise<void>((resolver, rejeitar) => {
    zip.on("data", (parte: Buffer) => partes.push(Buffer.from(parte)));
    zip.on("error", rejeitar);
    zip.on("end", () => resolver());
  });
  await zip.finalize();
  await pronto;
  return Buffer.concat(partes);
}

test("monta o ZIP da exportação com os arquivos do site", async () => {
  const buffer = await juntarZip([
    { caminho: "index.html", conteudo: Buffer.from("<h1>Início</h1>", "utf8") },
    { caminho: "css/estilo.css", conteudo: Buffer.from("body{margin:0}", "utf8") },
  ]);

  // Assinatura local de arquivo ZIP.
  assert.equal(buffer.subarray(0, 4).toString("binary"), "PK");
  const texto = buffer.toString("binary");
  assert.ok(texto.includes("index.html"), "a entrada index.html precisa estar no pacote");
  assert.ok(texto.includes("css/estilo.css"), "a entrada em subpasta precisa manter o caminho");
});

test("recusa exportar peça sem nenhum arquivo", () => {
  assert.throws(
    () => criarZipExportacao([]),
    (erro: unknown) => erro instanceof ErroPublicacao && erro.statusHttp === 400,
  );
});

test("a barreira de qualidade continua bloqueando site reprovado", () => {
  assert.throws(
    () =>
      conferirBarreiraQualidade({
        valido: false,
        erros: ["A página sobre.html aponta para foto-equipe.jpg, que não existe."],
      }),
    (erro: unknown) =>
      erro instanceof ErroPublicacao &&
      erro.statusHttp === 400 &&
      erro.message.includes("foto-equipe.jpg"),
  );
});

test("a barreira libera site aprovado", () => {
  assert.doesNotThrow(() => conferirBarreiraQualidade({ valido: true, erros: [] }));
});

// Maquina sem Chrome nem Edge: a conferencia visual nao roda e o resultado sai
// com valido false e erros vazio. Bloquear ai deixava a tela dizendo "precisa
// de correcao" com a lista vazia e o botao morto, sem nada pra corrigir e sem
// saida nenhuma, porque exportar e o unico caminho de tirar o site do produto.
test("conferencia que nao rodou nao vira bloqueio sem pendencia", () => {
  assert.doesNotThrow(() =>
    conferirBarreiraQualidade({ valido: false, erros: [], verificavel: false }),
  );
});

test("conferencia que rodou e reprovou continua bloqueando", () => {
  assert.throws(
    () =>
      conferirBarreiraQualidade({
        valido: false,
        erros: ["contraste insuficiente no rodapé"],
        verificavel: true,
      }),
    (erro: unknown) =>
      erro instanceof ErroPublicacao && erro.message.includes("contraste"),
  );
});

test("sem o campo verificavel, o bloqueio antigo vale", () => {
  assert.throws(
    () => conferirBarreiraQualidade({ valido: false, erros: ["erro qualquer"] }),
    (erro: unknown) => erro instanceof ErroPublicacao,
  );
});

test("o nome do arquivo baixado vem da pasta da peça", () => {
  assert.equal(
    nomeArquivoExportacao("2026-07-26-site-da-padaria"),
    "2026-07-26-site-da-padaria.zip",
  );
  assert.equal(nomeArquivoExportacao("Sítio do João"), "sitio-do-joao.zip");
  assert.equal(nomeArquivoExportacao("///"), "site.zip");
});

test("cada sistema abre a pasta com o comando certo", () => {
  assert.equal(comandoAbrirPasta("win32"), "explorer.exe");
  assert.equal(comandoAbrirPasta("darwin"), "open");
  assert.equal(comandoAbrirPasta("linux"), "xdg-open");
});
