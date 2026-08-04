// Travas da entrada do assistente.
//
// O que estes testes seguram é o contrato entre a conversa e a fila: o pouco
// que a IA escreve vira o muito que o executor consome, e nenhum dos dois lados
// pode inventar o que falta.

import assert from "node:assert/strict";
import test from "node:test";

import {
  EntradaCarrosselSchema,
  PADRAO_CARROSSEL,
  completarAnuncio,
  completarCarrossel,
  completarSite,
} from "./entrada.js";
import { DadosCriacaoSchema, DadosSiteSchema } from "../geracao/modelo.js";
import { LotePropostaSchema } from "./tarefa.js";

test("o carrossel minimo da conversa vira dados completos de criacao", () => {
  // O caso real de 2026-08-04: a IA tinha tema e briefing, e mais nada. O que
  // ela mandou precisa bastar, e o que sai precisa passar no schema que o
  // executor usa pra montar o prompt.
  const dados = completarCarrossel({ tema: "O que é Gamiologia", detalhes: "Carrossel explicativo." });
  assert.ok(DadosCriacaoSchema.safeParse(dados).success);
  assert.equal(dados.proporcao, PADRAO_CARROSSEL.proporcao);
  assert.equal(dados.formato, PADRAO_CARROSSEL.formato);
  assert.equal(dados.paginas, null);
});

test("o Hub nao inventa imagem nem paleta pro que nasceu de uma conversa", () => {
  // Anexo não existe numa conversa de texto, e cor escolhida pela IA seria ela
  // decidindo a marca do dono. Os dois campos têm que sair vazios.
  const dados = completarCarrossel({ tema: "t", detalhes: "d" });
  assert.deepEqual(dados.caminhosImagens, []);
  assert.equal(dados.visual, null);
  assert.equal(completarSite({ tema: "t", detalhes: "d" }).anexos.length, 0);
  assert.equal(completarSite({ tema: "t", detalhes: "d" }).visualModo, "negocio");
});

test("o que a conversa escolheu vence o padrao", () => {
  const dados = completarCarrossel({
    tema: "t",
    detalhes: "d",
    paginas: 6,
    proporcao: "9x16",
    modoImagem: "com",
  });
  assert.equal(dados.paginas, 6);
  assert.equal(dados.proporcao, "9x16");
  assert.equal(dados.modoImagem, "com");
});

test("um estilo so vale pra capa e pras paginas, sem divergir", () => {
  // A criação guiada tem os dois controles separados. Quem pede por conversa
  // não distingue os dois, e divergir aqui inventaria uma escolha que ninguém
  // fez.
  const dados = completarCarrossel({ tema: "t", detalhes: "d", estilo: "editorial" });
  assert.equal(dados.estiloCapa, "editorial");
  assert.equal(dados.estiloPaginas, "editorial");
});

test("o site minimo tambem sai completo e valido", () => {
  const dados = completarSite({ tema: "Landing da consultoria", detalhes: "Uma página só." });
  assert.ok(DadosSiteSchema.safeParse(dados).success);
  assert.equal(dados.objetivo, "whatsapp");
  assert.equal(dados.formato, "completo");
});

test("o anuncio nao ganha padrao pro que so o dono sabe", () => {
  // Oferta, destino, praça e orçamento são as quatro perguntas que a criação
  // guiada faz porque o Cérebro não responde. Um padrão aqui seria o Hub
  // inventando para onde vai o clique e quanto se pode gastar por dia.
  const entrada = {
    id: "l-1",
    tarefas: [{ workspaceId: "w-1", tipo: "anuncio", dados: { oferta: "x", objetivo: "y" } }],
  };
  assert.equal(LotePropostaSchema.safeParse(entrada).success, false);

  const completo = completarAnuncio({
    oferta: "Sessão de fotos",
    objetivo: "gerar contatos",
    destino: "whatsapp",
    linkDestino: "",
    praca: "Curitiba",
    orcamentoDiario: "30",
  });
  assert.equal(completo.raio, "");
  assert.equal(completo.detalhes, "");
});

test("carrossel sem tema ou sem detalhes e recusado", () => {
  // São os dois campos que a IA sempre tem depois de uma conversa. Aceitar
  // vazio aqui geraria uma peça sobre nada.
  assert.equal(EntradaCarrosselSchema.safeParse({ tema: "", detalhes: "d" }).success, false);
  assert.equal(EntradaCarrosselSchema.safeParse({ tema: "t" }).success, false);
});

test("o lote que a IA escreveu de verdade em 2026-08-04 agora passa", () => {
  // A prova do conserto: este é o conteúdo que estava no lote.json da conversa
  // real, campo por campo, e ele era recusado por 22 campos faltando.
  const lote = {
    id: "lote-c-mseruoww-opa248",
    conversaId: "c-mseruoww-opa248",
    tarefas: [
      {
        workspaceId: "w-ms3li5tp9mu",
        workspaceNome: "Mae Pixel",
        tipo: "carrossel",
        dados: { tema: "O que é Gamiologia", detalhes: "Carrossel explicativo sobre Gamiologia." },
      },
    ],
  };
  const resultado = LotePropostaSchema.safeParse(lote);
  assert.ok(resultado.success, "o lote de uma conversa real precisa passar");
});

test("nome de campo fora do contrato reprova DIZENDO o nome inventado", () => {
  // "briefing" foi o nome que a IA inventou quando o contrato não listava campo
  // nenhum. Os schemas de entrada são fechados justamente pra a recusa apontar
  // o nome errado: sem isso, o Zod só descartaria a chave e reclamaria de
  // "detalhes obrigatório", e a IA leria isso como "faltou um campo" em vez de
  // "você chamou detalhes de briefing".
  const lote = {
    id: "l-1",
    tarefas: [
      {
        workspaceId: "w-1",
        tipo: "carrossel",
        dados: { tema: "t", detalhes: "d", briefing: "o texto do dono" },
      },
    ],
  };
  const resultado = LotePropostaSchema.safeParse(lote);
  assert.equal(resultado.success, false);
  assert.match(JSON.stringify(resultado.error?.issues), /briefing/);
});

test("lote sem tarefa nenhuma nao e proposta", () => {
  assert.equal(LotePropostaSchema.safeParse({ id: "l-1", tarefas: [] }).success, false);
});
