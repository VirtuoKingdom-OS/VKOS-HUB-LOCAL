// Guarda a fronteira de tipos do CRM.
//
// O bug que este teste existe pra impedir: o web tinha a propria copia das
// entidades do CRM, o servidor foi pra v4 e o typecheck do web continuou verde
// enquanto a tela quebrava em runtime. Se alguem redeclarar as entidades no
// cliente, o erro volta a ser invisivel pro compilador. Aqui ele grita.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ponte = readFileSync(new URL("./crm.ts", import.meta.url), "utf8");
const cliente = readFileSync(new URL("../api/crm.ts", import.meta.url), "utf8");
const ponteMensagens = readFileSync(new URL("./mensagens.ts", import.meta.url), "utf8");
const clienteMensagens = readFileSync(new URL("../api/mensagens.ts", import.meta.url), "utf8");

test("a ponte de tipos aponta pro modelo do servidor", () => {
  assert.match(ponte, /from "\.\.\/\.\.\/\.\.\/server\/src\/crm\/modelo"/);
  // So tipo atravessa a fronteira: import de valor traria codigo de servidor
  // pro bundle do navegador.
  assert.doesNotMatch(ponte, /^\s*import\s+\{/m);
});

test("o cliente HTTP nao redeclara as entidades do CRM", () => {
  for (const entidade of ["Contato", "Negocio", "Coluna", "Tarefa", "Orcamento", "EstadoCrm"]) {
    assert.doesNotMatch(
      cliente,
      new RegExp(`\\binterface\\s+${entidade}\\b`),
      `${entidade} precisa vir do servidor, nao de uma copia local`,
    );
  }
});

test("o cliente pega os tipos da ponte, nunca do servidor direto", () => {
  assert.match(cliente, /from "\.\.\/tipos\/crm"/);
  assert.doesNotMatch(cliente, /from "[^"]*server\/src/);
});

// A MESMA guarda pras conversas. O chat nasceu depois do bug, entao ele ja
// nasce dentro da regra: Mensagem e Conversa tem uma definicao so, no servidor.

test("a ponte das conversas aponta pro modelo do servidor", () => {
  assert.match(ponteMensagens, /from "\.\.\/\.\.\/\.\.\/server\/src\/mensagens\/modelo"/);
  // So tipo atravessa a fronteira. Import de valor traria codigo de servidor
  // (e a arvore de node:) pro bundle do navegador.
  assert.doesNotMatch(ponteMensagens, /^\s*import\s+\{/m);
});

test("a ponte das conversas trava a versao do indice", () => {
  // Sem esta linha, o servidor sobe pra v2 do indice e o typecheck do web
  // continua verde enquanto a tela quebra em runtime. Foi assim com o CRM v4.
  assert.match(ponteMensagens, /VERSAO_MENSAGENS_ATUAL/);
  assert.match(ponteMensagens, /Confere<\s*1,/);
});

test("o cliente das conversas nao redeclara as entidades", () => {
  for (const entidade of ["Mensagem", "Conversa", "PaginaConversa", "CapacidadesCanal", "AnexoMensagem"]) {
    assert.doesNotMatch(
      clienteMensagens,
      new RegExp(`\\binterface\\s+${entidade}\\b`),
      `${entidade} precisa vir do servidor, nao de uma copia local`,
    );
  }
  assert.match(clienteMensagens, /from "\.\.\/tipos\/mensagens"/);
  assert.doesNotMatch(clienteMensagens, /from "[^"]*server\/src/);
});

// O comentario explica a regra e cita o antipadrao de proposito, entao a busca
// e no CODIGO, nao no texto ao lado dele.
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

test("a tela do chat nao pergunta o nome do canal, pergunta a capacidade", () => {
  // A regra que faz o relogio da janela de 24 horas e o seletor de template
  // nascerem sozinhos quando o WhatsApp entrar. Comparar com o nome do canal e
  // o que obriga a caçar dez arquivos naquele dia.
  const pasta = new URL("../componentes/crm/", import.meta.url);
  for (const arquivo of ["TelaConversas.tsx", "ThreadConversa.tsx", "conversas.ts"]) {
    const codigo = semComentario(readFileSync(new URL(arquivo, pasta), "utf8"));
    assert.doesNotMatch(
      codigo,
      /["']whatsapp["']/i,
      `${arquivo} decide por capacidade do canal, nunca pelo nome dele`,
    );
  }
});

test("a janela de 24 horas so aparece por capacidade do canal", () => {
  // A prova de que a regra acima nao e so ausencia: a decisao existe, e ela le
  // capacidades.janela24h. Sem esta afirmacao, apagar o relogio inteiro faria o
  // teste de cima passar.
  const logica = readFileSync(new URL("../componentes/crm/conversas.ts", import.meta.url), "utf8");
  assert.match(semComentario(logica), /capacidades\?\.janela24h/);
});
