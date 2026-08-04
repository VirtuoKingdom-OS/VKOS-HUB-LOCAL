import assert from "node:assert/strict";
import test from "node:test";

import { conferirLimites, contarCaracteres } from "./limites.js";
import type { PecaAnuncio } from "./modelo.js";

// Peca que nao viola nada: todo texto dentro do limite e toda lista dentro da
// faixa. Cada teste daqui quebra um campo de cada vez.
function pecaLimpa(): PecaAnuncio {
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
        {
          texto: "Quem somos",
          descricoes: ["Equipe formada há 12 anos", "Perto da estação"],
          url: "https://exemplo.com.br/sobre",
        },
        {
          texto: "Onde ficamos",
          descricoes: ["Duas quadras do metrô", "Estacionamento na porta"],
          url: "https://exemplo.com.br/local",
        },
        {
          texto: "Agendar horário",
          descricoes: ["Resposta em 10 minutos", "Atendimento no WhatsApp"],
          url: "https://exemplo.com.br/agendar",
        },
      ],
      frasesDestaque: ["Hora marcada", "Perto do metrô", "Equipe formada", "Sem fila"],
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

test("peça dentro dos limites não gera violação nenhuma", () => {
  assert.deepEqual(conferirLimites(pecaLimpa()), []);
});

test("título de 34 caracteres vira erro com caminho endereçável", () => {
  const peca = pecaLimpa();
  const titulo = "Fisioterapia com hora marcada hoje";
  assert.equal(titulo.length, 34);
  peca.campanha.grupos[0].anuncios[0].titulos[0] = titulo;

  const violacoes = conferirLimites(peca);
  assert.deepEqual(violacoes, [
    {
      caminho: "campanha.grupos[0].anuncios[0].titulos[0]",
      campo: "Título",
      valor: titulo,
      limite: 30,
      tamanho: 34,
      gravidade: "erro",
    },
  ]);
});

test("conta por ponto de código, não por unidade UTF-16", () => {
  const trintaEmojis = "🎯".repeat(30);
  assert.equal(trintaEmojis.length, 60);
  assert.equal(contarCaracteres(trintaEmojis), 30);

  const peca = pecaLimpa();
  peca.campanha.grupos[0].anuncios[0].titulos[0] = trintaEmojis;
  assert.deepEqual(conferirLimites(peca), []);

  peca.campanha.grupos[0].anuncios[0].titulos[0] = "🎯".repeat(31);
  const violacoes = conferirLimites(peca);
  assert.equal(violacoes.length, 1);
  assert.equal(violacoes[0].tamanho, 31);
  assert.equal(violacoes[0].gravidade, "erro");
});

test("menos títulos que o mínimo vira aviso na lista, não erro", () => {
  const peca = pecaLimpa();
  peca.campanha.grupos[0].anuncios[0].titulos = ["Fisioterapia em SP", "Agende hoje"];

  const violacoes = conferirLimites(peca);
  assert.deepEqual(violacoes, [
    {
      caminho: "campanha.grupos[0].anuncios[0].titulos",
      campo: "Título",
      valor: "",
      limite: 3,
      tamanho: 2,
      gravidade: "aviso",
    },
  ]);
});

test("mais títulos que o teto também vira aviso", () => {
  const peca = pecaLimpa();
  peca.campanha.grupos[0].anuncios[0].titulos = Array.from({ length: 16 }, (_, i) => `Título ${i}`);

  const violacoes = conferirLimites(peca);
  assert.equal(violacoes.length, 1);
  assert.equal(violacoes[0].gravidade, "aviso");
  assert.equal(violacoes[0].limite, 15);
  assert.equal(violacoes[0].tamanho, 16);
});

test("três sitelinks avisam na lista inteira, e não em um sitelink", () => {
  const peca = pecaLimpa();
  peca.recursos.sitelinks = peca.recursos.sitelinks.slice(0, 3);

  const violacoes = conferirLimites(peca);
  assert.deepEqual(violacoes, [
    {
      caminho: "recursos.sitelinks",
      campo: "Texto do sitelink",
      valor: "",
      limite: 4,
      tamanho: 3,
      gravidade: "aviso",
    },
  ]);
});

test("texto de sitelink estourado aponta o campo do sitelink certo", () => {
  const peca = pecaLimpa();
  peca.recursos.sitelinks[2].texto = "Onde a gente fica hoje em dia";

  const violacoes = conferirLimites(peca);
  assert.equal(violacoes.length, 1);
  assert.equal(violacoes[0].caminho, "recursos.sitelinks[2].texto");
  assert.equal(violacoes[0].limite, 25);
  assert.equal(violacoes[0].gravidade, "erro");
});

test("sitelink com uma descrição só avisa no caminho das descrições dele", () => {
  const peca = pecaLimpa();
  peca.recursos.sitelinks[1].descricoes = ["Equipe formada há 12 anos"];

  const violacoes = conferirLimites(peca);
  assert.deepEqual(violacoes, [
    {
      caminho: "recursos.sitelinks[1].descricoes",
      campo: "Descrição do sitelink",
      valor: "",
      limite: 2,
      tamanho: 1,
      gravidade: "aviso",
    },
  ]);
});

test("frase de destaque e valor de snippet também são conferidos", () => {
  const peca = pecaLimpa();
  peca.recursos.frasesDestaque = ["Hora marcada", "Perto do metrô", "Equipe formada"];
  peca.recursos.snippets[0].valores = ["Pilates com acompanhamento de perto"];

  const violacoes = conferirLimites(peca);
  assert.equal(violacoes.length, 3);
  assert.ok(
    violacoes.some(
      (v) => v.caminho === "recursos.frasesDestaque" && v.gravidade === "aviso" && v.limite === 4,
    ),
  );
  assert.ok(
    violacoes.some(
      (v) => v.caminho === "recursos.snippets[0].valores[0]" && v.gravidade === "erro",
    ),
  );
  assert.ok(
    violacoes.some((v) => v.caminho === "recursos.snippets[0].valores" && v.gravidade === "aviso"),
  );
});

test("descrição de 91 caracteres vira erro e a de 90 passa", () => {
  const peca = pecaLimpa();
  peca.campanha.grupos[0].anuncios[0].descricoes[0] = "a".repeat(90);
  assert.deepEqual(conferirLimites(peca), []);

  peca.campanha.grupos[0].anuncios[0].descricoes[0] = "a".repeat(91);
  const violacoes = conferirLimites(peca);
  assert.equal(violacoes.length, 1);
  assert.equal(violacoes[0].campo, "Descrição");
  assert.equal(violacoes[0].tamanho, 91);
});
