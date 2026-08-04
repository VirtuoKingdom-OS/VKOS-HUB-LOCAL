import assert from "node:assert/strict";
import test from "node:test";

import { descreverErroDeForma, validarPecaAnuncio } from "./modelo.js";
import type { PecaAnuncio } from "./modelo.js";

// Peca minima que passa no schema. Os testes daqui mexem num campo de cada vez.
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

test("peça bem formada passa no schema", () => {
  const resultado = validarPecaAnuncio(pecaValida());
  assert.equal(resultado.success, true);
});

test("titulos como texto em vez de lista reprova dizendo qual campo", () => {
  const peca = pecaValida();
  const anuncio = peca.campanha.grupos[0].anuncios[0] as unknown as { titulos: unknown };
  anuncio.titulos = "Fisioterapia em SP";

  const resultado = validarPecaAnuncio(peca);
  assert.equal(resultado.success, false);
  if (resultado.success) return;

  const mensagem = descreverErroDeForma(resultado.error);
  assert.match(mensagem, /campanha\.grupos\[0\]\.anuncios\[0\]\.titulos/);
  assert.match(mensagem, /esperava lista, veio texto/);
});

test("campo ausente reprova dizendo o nome e que ele falta", () => {
  const peca = pecaValida();
  delete (peca as Partial<PecaAnuncio>).orcamento;

  const resultado = validarPecaAnuncio(peca);
  assert.equal(resultado.success, false);
  if (resultado.success) return;

  const mensagem = descreverErroDeForma(resultado.error);
  assert.match(mensagem, /orcamento: campo obrigatório ausente/);
});

test("versao diferente de 1 reprova", () => {
  const peca = pecaValida();
  (peca as unknown as { versao: number }).versao = 2;

  const resultado = validarPecaAnuncio(peca);
  assert.equal(resultado.success, false);
  if (resultado.success) return;

  assert.match(descreverErroDeForma(resultado.error), /versao: precisa ser 1/);
});

test("campanha sem nenhum grupo reprova", () => {
  const peca = pecaValida();
  peca.campanha.grupos = [];

  const resultado = validarPecaAnuncio(peca);
  assert.equal(resultado.success, false);
  if (resultado.success) return;

  assert.match(descreverErroDeForma(resultado.error), /campanha\.grupos: precisa ter pelo menos 1/);
});

test("correspondência fora da lista reprova mostrando as opções", () => {
  const peca = pecaValida();
  (peca.campanha.grupos[0].palavrasChave[0] as unknown as { correspondencia: string }).correspondencia =
    "aproximada";

  const resultado = validarPecaAnuncio(peca);
  assert.equal(resultado.success, false);
  if (resultado.success) return;

  assert.match(descreverErroDeForma(resultado.error), /ampla, frase, exata/);
});

// A regra central do modulo. Se este teste virar vermelho, um titulo ruim
// passou a derrubar a campanha inteira e o dono ficou sem nada em vez de ficar
// com quase tudo.
test("título de 34 caracteres PASSA no schema: tamanho não é forma", () => {
  const peca = pecaValida();
  const titulo = "Fisioterapia com hora marcada hoje";
  assert.equal(titulo.length, 34);
  peca.campanha.grupos[0].anuncios[0].titulos[0] = titulo;

  const resultado = validarPecaAnuncio(peca);
  assert.equal(resultado.success, true);
});

test("mensagem de erro corta em três campos e diz quantos sobraram", () => {
  const resultado = validarPecaAnuncio({ versao: 1, plataforma: "google-busca" });
  assert.equal(resultado.success, false);
  if (resultado.success) return;

  const mensagem = descreverErroDeForma(resultado.error);
  assert.match(mensagem, /E mais \d+ problemas\.$/);
});
