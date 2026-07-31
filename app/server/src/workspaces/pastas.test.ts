// O destino de um workspace novo nasce pronto: <raiz>/workspaces/<slug>.
//
// Ate 2026-07-27 quem montava esse caminho era o frontend, e o servidor so
// obedecia. Isso deixava a regra sem teste nenhum: clonagem.ts, criarWorkspaceNovo
// e prepararDestino nao tinham cobertura. Este arquivo cobre a composicao do
// destino, o slug e as recusas.
//
// Nada aqui pode encostar no registro nem na config de verdade. As duas fotos
// do inicio provam isso no fim.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

import { pararObservador } from "../vkos/pecas.js";
import { definirPastaVkos, obterPastaVkos } from "../vkos/estado.js";
import { criarWorkspaceNovo, ErroWorkspace, prepararDestino } from "./clonagem.js";
import { lerRegistro, normalizarPasta, pastaDadosHub, salvarRegistro } from "./estado.js";
import { destinoPadraoWorkspace, raizWorkspaces, slugWorkspace } from "./pastas.js";

// Fotos do dado real, tiradas na carga do modulo, ANTES de a raiz ser desviada.
const pastaDadosReal = pastaDadosHub();
const registroReal = join(pastaDadosReal, "workspaces.json");
const configReal = join(pastaDadosReal, "config.json");
const fotoRegistro = existsSync(registroReal) ? readFileSync(registroReal, "utf8") : null;
const fotoConfig = existsSync(configReal) ? readFileSync(configReal, "utf8") : null;

let dados = "";
let projeto = "";
let origem = "";

// Uma instalacao VKOS de mentira: o minimo que validarPastaVkos exige, mais um
// cerebro com titulos, pra dar o que copiar.
function montarOrigem(pasta: string): void {
  mkdirSync(join(pasta, "cerebro"), { recursive: true });
  mkdirSync(join(pasta, ".claude", "skills"), { recursive: true });
  mkdirSync(join(pasta, "templates"), { recursive: true });
  writeFileSync(join(pasta, "cerebro", "cerebro.md"), "# Quem somos\n\nA padaria da esquina.\n");
  writeFileSync(join(pasta, "templates", "modelo.html"), "<p>oi</p>");
  writeFileSync(join(pasta, "CLAUDE.md"), "instrucoes do cliente", "utf8");
}

before(() => {
  dados = mkdtempSync(join(tmpdir(), "vkos-pastas-dados-"));
  projeto = mkdtempSync(join(tmpdir(), "vkos-pastas-projeto-"));
  process.env.VKOS_DADOS_TESTE = dados;
  origem = join(projeto, "origem-vkos");
  montarOrigem(origem);
  salvarRegistro({ workspaces: [], ativo: null });
  definirPastaVkos(origem);
});

after(() => {
  // Criar workspace ativa, e ativar instala o observador de pecas. Sem parar,
  // o handle segura o processo do teste e a pasta some debaixo do watcher.
  pararObservador();
  delete process.env.VKOS_DADOS_TESTE;
  rmSync(dados, { recursive: true, force: true });
  rmSync(projeto, { recursive: true, force: true });
});

// Cada criacao ativa o cliente novo, entao a origem muda. Volta pra origem
// montada aqui pra um teste nao depender do anterior.
function voltarOrigem(): void {
  definirPastaVkos(origem);
}

test("nome vira slug: acento, maiuscula, espaco e simbolo", () => {
  assert.equal(slugWorkspace("Padaria do Zé"), "padaria-do-ze");
  assert.equal(slugWorkspace("Mãe Pixel"), "mae-pixel");
  assert.equal(slugWorkspace("AÇÃO & Cia."), "acao-cia");
  assert.equal(slugWorkspace("  JDV  "), "jdv");
  assert.equal(slugWorkspace("Já é 2026!"), "ja-e-2026");
});

test("nome que viraria slug vazio ganha fallback, nunca pasta sem nome", () => {
  assert.equal(slugWorkspace("🙂🙂"), "workspace");
  assert.equal(slugWorkspace("!!!"), "workspace");
  assert.equal(slugWorkspace("   "), "workspace");
  assert.equal(slugWorkspace(""), "workspace");
});

test("o destino padrao e <raiz>/workspaces/<slug>", () => {
  assert.equal(raizWorkspaces("C:/projeto"), join("C:/projeto", "workspaces"));
  assert.equal(
    destinoPadraoWorkspace("Padaria do Zé", "C:/projeto"),
    join("C:/projeto", "workspaces", "padaria-do-ze"),
  );
});

test("sem pastaDestino, o workspace nasce em workspaces/<slug>", () => {
  voltarOrigem();
  const { workspace } = criarWorkspaceNovo({ nome: "Padaria do Zé", raiz: projeto });

  const esperada = normalizarPasta(join(projeto, "workspaces", "padaria-do-ze"));
  assert.equal(workspace?.pasta, esperada);
  assert.equal(workspace?.nome, "Padaria do Zé");

  // A estrutura foi mesmo clonada pra la, e o cerebro nasceu em branco.
  assert.ok(existsSync(join(esperada, ".claude", "skills")));
  assert.ok(existsSync(join(esperada, "templates", "modelo.html")));
  const cerebro = readFileSync(join(esperada, "cerebro", "cerebro.md"), "utf8");
  assert.match(cerebro, /# Quem somos/);
  assert.ok(!cerebro.includes("A padaria da esquina"), "o cerebro do novo nasce sem o dado do ativo");

  // E o cliente novo ficou aberto, nas duas fontes.
  assert.equal(lerRegistro().ativo, workspace?.id);
  assert.equal(normalizarPasta(obterPastaVkos() ?? ""), esperada);
});

test("com pastaDestino informada, o caminho escolhido continua valendo", () => {
  voltarOrigem();
  const escolhida = join(projeto, "fora-da-casa", "cliente-especial");
  const { workspace } = criarWorkspaceNovo({
    nome: "Cliente Especial",
    pastaDestino: escolhida,
    raiz: projeto,
  });

  assert.equal(workspace?.pasta, normalizarPasta(escolhida));
  assert.ok(existsSync(join(escolhida, "cerebro", "cerebro.md")));
  // E nada foi criado com o slug dele na casa dos workspaces.
  assert.equal(existsSync(join(projeto, "workspaces", "cliente-especial")), false);
});

test("nome repetido recusa com mensagem de nome, nao de pasta", () => {
  voltarOrigem();
  criarWorkspaceNovo({ nome: "Repetido", raiz: projeto });
  voltarOrigem();

  assert.throws(
    () => criarWorkspaceNovo({ nome: "Repetido", raiz: projeto }),
    (erro: unknown) => {
      assert.ok(erro instanceof ErroWorkspace);
      assert.equal(erro.status, 400);
      assert.match(erro.message, /Ja existe um workspace com esse nome/);
      return true;
    },
  );
});

test("pastaDestino informada que nao e absoluta continua sendo recusada", () => {
  assert.throws(
    () => prepararDestino("pasta/relativa"),
    (erro: unknown) => {
      assert.ok(erro instanceof ErroWorkspace);
      assert.match(erro.message, /caminho absoluto/);
      return true;
    },
  );
});

test("pasta informada que existe e tem conteudo pede pasta vazia", () => {
  const cheia = join(projeto, "pasta-cheia");
  mkdirSync(cheia, { recursive: true });
  writeFileSync(join(cheia, "algo.txt"), "ocupado", "utf8");
  assert.throws(
    () => prepararDestino(cheia),
    (erro: unknown) => {
      assert.ok(erro instanceof ErroWorkspace);
      assert.match(erro.message, /precisa estar vazia/);
      return true;
    },
  );
});

// A trava. Se algum dia um destes arquivos mudar por causa do teste, o Jesse
// perde a lista de clientes ou abre o app numa pasta temporaria que ja sumiu.
test("nada disso encostou no registro nem na config de verdade", () => {
  assert.equal(existsSync(registroReal) ? readFileSync(registroReal, "utf8") : null, fotoRegistro);
  assert.equal(existsSync(configReal) ? readFileSync(configReal, "utf8") : null, fotoConfig);
});
