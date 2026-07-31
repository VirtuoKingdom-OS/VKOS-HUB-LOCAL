// A mudanca de casa das pastas de workspace roda no boot. Migracao que erra no
// boot nao tem tela pra avisar: ou o app abre certo, ou abre apontando pra uma
// pasta que nao existe mais.
//
// Os quatro perigos cobertos aqui: mover o VKOS integrado (quebraria o
// integrado.ts, que o procura por caminho ao lado de app/), mover pasta que o
// usuario guardou em outro lugar do disco, rodar duas vezes e duplicar
// trabalho, e atualizar so uma das duas fontes da pasta ativa.

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { definirPastaVkos, obterPastaVkos } from "../vkos/estado.js";
import {
  adicionarWorkspace,
  lerRegistro,
  marcarAtivo,
  normalizarPasta,
  pastaDadosHub,
  salvarRegistro,
  type Workspace,
} from "./estado.js";
import { migrarPastasParaRaizWorkspaces } from "./migracaoPastas.js";

// Fotos do dado real, tiradas na carga do modulo, antes de qualquer desvio.
const pastaDadosReal = pastaDadosHub();
const registroReal = join(pastaDadosReal, "workspaces.json");
const configReal = join(pastaDadosReal, "config.json");
const fotoRegistro = existsSync(registroReal) ? readFileSync(registroReal, "utf8") : null;
const fotoConfig = existsSync(configReal) ? readFileSync(configReal, "utf8") : null;

interface Cenario {
  projeto: string;
  dados: string;
}

// Um projeto de mentira e uma raiz de dados de mentira, montados e apagados por
// teste. Nenhuma pasta real entra aqui.
function cenario<T>(acao: (ctx: Cenario) => T): T {
  const anterior = process.env.VKOS_DADOS_TESTE;
  const dados = mkdtempSync(join(tmpdir(), "vkos-mudanca-dados-"));
  const projeto = mkdtempSync(join(tmpdir(), "vkos-mudanca-projeto-"));
  process.env.VKOS_DADOS_TESTE = dados;
  try {
    salvarRegistro({ workspaces: [], ativo: null });
    return acao({ projeto, dados });
  } finally {
    if (anterior === undefined) delete process.env.VKOS_DADOS_TESTE;
    else process.env.VKOS_DADOS_TESTE = anterior;
    rmSync(dados, { recursive: true, force: true });
    rmSync(projeto, { recursive: true, force: true });
  }
}

// Cria uma pasta de cliente com uma marca dentro, pra provar que o conteudo
// viajou junto, e registra ela.
function clienteEm(pasta: string, nome: string): Workspace {
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, "marca.txt"), nome, "utf8");
  return adicionarWorkspace(pasta, nome);
}

function pastaNoRegistro(id: string): string {
  return lerRegistro().workspaces.find((w) => w.id === id)?.pasta ?? "";
}

function pastaNaConfig(dados: string): string {
  const bruto = JSON.parse(readFileSync(join(dados, "config.json"), "utf8")) as {
    pastaVkos?: string;
  };
  return normalizarPasta(bruto.pastaVkos ?? "");
}

test("pasta solta na raiz vai pra workspaces/, com registro e config juntos", () => {
  cenario(({ projeto, dados }) => {
    const antiga = join(projeto, "mae-pixel");
    const cliente = clienteEm(antiga, "Mae Pixel");
    marcarAtivo(cliente.id);
    definirPastaVkos(antiga);

    const resultado = migrarPastasParaRaizWorkspaces(projeto);

    const nova = normalizarPasta(join(projeto, "workspaces", "mae-pixel"));
    assert.equal(resultado.movidas.length, 1);
    assert.deepEqual(resultado.avisos, []);

    // Os arquivos foram junto, e a pasta velha nao ficou pra tras.
    assert.equal(existsSync(antiga), false);
    assert.equal(readFileSync(join(nova, "marca.txt"), "utf8"), "Mae Pixel");

    // As DUAS fontes da pasta ativa apontam pro lugar novo.
    assert.equal(pastaNoRegistro(cliente.id), nova);
    assert.equal(normalizarPasta(obterPastaVkos() ?? ""), nova);
    assert.equal(pastaNaConfig(dados), nova);
  });
});

test("o VKOS integrado nunca sai do lado da pasta app", () => {
  cenario(({ projeto }) => {
    // Um VKOS de verdade aos olhos do validarPastaVkos.
    const integrado = join(projeto, "VKOS");
    mkdirSync(join(integrado, "cerebro"), { recursive: true });
    mkdirSync(join(integrado, ".claude", "skills"), { recursive: true });
    writeFileSync(join(integrado, "cerebro", "cerebro.md"), "# Meu negocio\n", "utf8");
    const cliente = adicionarWorkspace(integrado, "Meu negocio");
    marcarAtivo(cliente.id);

    const resultado = migrarPastasParaRaizWorkspaces(projeto);

    assert.deepEqual(resultado.movidas, []);
    assert.equal(existsSync(join(integrado, "cerebro", "cerebro.md")), true);
    assert.equal(existsSync(join(projeto, "workspaces", "VKOS")), false);
    assert.equal(pastaNoRegistro(cliente.id), normalizarPasta(integrado));
  });
});

test("pasta guardada fora da raiz do projeto fica onde o usuario deixou", () => {
  cenario(({ projeto }) => {
    const outroLugar = mkdtempSync(join(tmpdir(), "vkos-outro-drive-"));
    try {
      const cliente = clienteEm(join(outroLugar, "cliente-viajante"), "Viajante");

      const resultado = migrarPastasParaRaizWorkspaces(projeto);

      assert.deepEqual(resultado.movidas, []);
      assert.equal(existsSync(join(outroLugar, "cliente-viajante", "marca.txt")), true);
      assert.equal(
        pastaNoRegistro(cliente.id),
        normalizarPasta(join(outroLugar, "cliente-viajante")),
      );
      assert.equal(existsSync(join(projeto, "workspaces")), false);
    } finally {
      rmSync(outroLugar, { recursive: true, force: true });
    }
  });
});

test("rodar de novo nao faz nada: quem ja mudou de casa nao esta mais na raiz", () => {
  cenario(({ projeto }) => {
    const cliente = clienteEm(join(projeto, "jdv"), "JDV");
    marcarAtivo(cliente.id);

    const primeira = migrarPastasParaRaizWorkspaces(projeto);
    assert.equal(primeira.movidas.length, 1);
    const depoisDaPrimeira = pastaNoRegistro(cliente.id);

    const segunda = migrarPastasParaRaizWorkspaces(projeto);
    assert.deepEqual(segunda.movidas, []);
    assert.deepEqual(segunda.avisos, []);
    assert.equal(pastaNoRegistro(cliente.id), depoisDaPrimeira);
    assert.equal(readFileSync(join(depoisDaPrimeira, "marca.txt"), "utf8"), "JDV");
  });
});

// O boot nao pode cair por causa de uma pasta que nao quis mover. Aqui o
// caminho da casa dos workspaces esta ocupado por um ARQUIVO, entao criar a
// pasta falha. O esperado e aviso legivel e registro intocado.
test("falha ao mover vira aviso, nao excecao, e o registro segue coerente", () => {
  cenario(({ projeto }) => {
    const antiga = join(projeto, "cliente-teimoso");
    const cliente = clienteEm(antiga, "Teimoso");
    marcarAtivo(cliente.id);
    definirPastaVkos(antiga);
    // Um arquivo no lugar da pasta workspaces/.
    writeFileSync(join(projeto, "workspaces"), "nao sou pasta", "utf8");

    const resultado = migrarPastasParaRaizWorkspaces(projeto);

    assert.deepEqual(resultado.movidas, []);
    assert.equal(resultado.avisos.length, 1);
    assert.match(resultado.avisos[0], /Teimoso/);

    // A pasta continua inteira, e as duas fontes continuam apontando pra ela.
    assert.equal(readFileSync(join(antiga, "marca.txt"), "utf8"), "Teimoso");
    assert.equal(pastaNoRegistro(cliente.id), normalizarPasta(antiga));
    assert.equal(normalizarPasta(obterPastaVkos() ?? ""), normalizarPasta(antiga));
  });
});

// A junction de node_modules guarda caminho absoluto. Duas pastas mudando de
// casa juntas quebravam o link de uma pra outra, e o estrago so apareceria na
// primeira peca que nao renderizasse.
test("junction de node_modules apontando pra pasta movida volta a funcionar", () => {
  cenario(({ projeto }) => {
    const doador = join(projeto, "cliente-doador");
    const dependente = join(projeto, "cliente-dependente");
    clienteEm(doador, "Doador");
    clienteEm(dependente, "Dependente");
    mkdirSync(join(doador, "node_modules", "alguma-lib"), { recursive: true });
    symlinkSync(join(doador, "node_modules"), join(dependente, "node_modules"), "junction");

    const resultado = migrarPastasParaRaizWorkspaces(projeto);
    assert.equal(resultado.movidas.length, 2);

    const linkNovo = join(projeto, "workspaces", "cliente-dependente", "node_modules");
    assert.equal(
      normalizarPasta(readlinkSync(linkNovo)),
      normalizarPasta(join(projeto, "workspaces", "cliente-doador", "node_modules")),
    );
    // E o link resolve mesmo: existsSync segue a junction.
    assert.equal(existsSync(join(linkNovo, "alguma-lib")), true);
  });
});

test("com o registro vazio a migracao nao inventa pasta nenhuma", () => {
  cenario(({ projeto }) => {
    const resultado = migrarPastasParaRaizWorkspaces(projeto);
    assert.deepEqual(resultado.movidas, []);
    assert.equal(existsSync(join(projeto, "workspaces")), false);
  });
});

// A trava: nenhum destes cenarios pode ter tocado o dado do usuario.
test("nada disso encostou no registro nem na config de verdade", () => {
  assert.equal(existsSync(registroReal) ? readFileSync(registroReal, "utf8") : null, fotoRegistro);
  assert.equal(existsSync(configReal) ? readFileSync(configReal, "utf8") : null, fotoConfig);
});
