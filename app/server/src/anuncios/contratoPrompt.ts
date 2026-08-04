// O texto que ensina a IA a escrever o anuncio.json.
//
// Ele mora colado no schema de proposito. Sao duas coisas que precisam andar
// juntas pra sempre: a forma que modelo.ts exige e a forma que a IA recebe
// escrita. Se o contrato morasse no frontend, o schema ganharia um campo um dia
// e o prompt nunca ficaria sabendo, do outro lado de uma fronteira de processo.
//
// Duas travas seguram isso:
//
// 1. Os limites de caractere saem de LIMITES_GOOGLE, a MESMA constante que
//    conferirLimites usa. Nenhum numero e redigitado aqui. A IA precisa saber o
//    limite pra RESPEITAR, nao so pra ser reprovada depois.
// 2. contratoPrompt.test.ts percorre as chaves do schema de modelo.ts e reprova
//    se alguma nao aparecer no texto abaixo. Campo novo no schema e prompt
//    esquecido viram teste vermelho, nao divergencia em silencio.

import { LIMITES_GOOGLE } from "./limites.js";

interface RegraLida {
  campo: string;
  maxCaracteres: number;
  minQuantidade: number;
  maxQuantidade?: number;
}

// A faixa de quantidade em portugues, a partir dos numeros da regra.
function faixaDeQuantidade(regra: RegraLida): string {
  const { minQuantidade: minimo, maxQuantidade: maximo } = regra;
  if (maximo === undefined) return `pelo menos ${minimo}`;
  if (minimo === maximo) return `exatamente ${minimo}`;
  if (minimo <= 0) return `no máximo ${maximo}`;
  return `de ${minimo} a ${maximo}`;
}

// Uma linha de limite, por extenso. Ex: "Título: no máximo 30 caracteres, de 3
// a 15 por anúncio."
function linhaDeLimite(regra: RegraLida, ondeConta: string): string {
  return `- ${regra.campo}: no máximo ${regra.maxCaracteres} caracteres. Escreva ${faixaDeQuantidade(regra)} ${ondeConta}.`;
}

// A forma do arquivo, campo a campo. O valor de cada chave descreve o tipo e o
// que se espera dentro dela, entao a IA le a estrutura e o conteudo de uma vez.
const FORMA_DO_ARQUIVO = `{
  "versao": 1,
  "plataforma": "google-busca",
  "geradoEm": "<texto: a data e a hora de agora em ISO 8601, ex 2026-07-31T14:30:00.000Z>",
  "estrategia": {
    "objetivo": "<texto: o que conta como resultado desta campanha>",
    "oferta": "<texto: exatamente o que está sendo anunciado>",
    "publico": "<texto: quem é a pessoa que procura isso no Google>",
    "dorPrincipal": "<texto: a dor que faz ela procurar>",
    "provas": ["<texto: uma prova concreta do negócio por item>"],
    "destino": {
      "tipo": "<um destes, sem inventar outro: whatsapp, landing, agendamento, telefone>",
      "url": "<texto: o link exato do destino do clique>",
      "observacao": "<texto: o que o dono precisa saber sobre esse destino>"
    },
    "localizacoes": ["<texto: uma cidade, região ou raio por item>"],
    "idioma": "<texto: o idioma da campanha, ex pt-BR>"
  },
  "campanha": {
    "nome": "<texto: o nome da campanha como ela vai aparecer no painel>",
    "tipo": "busca",
    "grupos": [
      {
        "id": "<texto: identificador curto, só minúsculas, números e hífen>",
        "nome": "<texto: o nome do grupo de anúncios no painel>",
        "tema": "<texto: o tema que junta as palavras-chave deste grupo>",
        "palavrasChave": [
          {
            "texto": "<texto: a palavra-chave>",
            "correspondencia": "<um destes: ampla, frase, exata>",
            "motivo": "<texto: por que essa palavra vale o dinheiro do dono>"
          }
        ],
        "anuncios": [
          {
            "titulos": ["<texto: um título por item>"],
            "descricoes": ["<texto: uma descrição por item>"],
            "caminhos": ["<texto: um caminho de exibição por item, sem barra>"],
            "urlFinal": "<texto: a URL para onde o clique vai>"
          }
        ]
      }
    ]
  },
  "negativas": [
    {
      "texto": "<texto: a palavra negativa, no nível da campanha>",
      "motivo": "<texto: que tipo de busca ela filtra>"
    }
  ],
  "recursos": {
    "sitelinks": [
      {
        "texto": "<texto: o rótulo clicável do sitelink>",
        "descricoes": ["<texto: uma linha de descrição por item>"],
        "url": "<texto: a URL deste sitelink>"
      }
    ],
    "frasesDestaque": ["<texto: uma frase de destaque por item>"],
    "snippets": [
      {
        "cabecalho": "<texto: o cabeçalho do snippet, ex Serviços>",
        "valores": ["<texto: um valor por item>"]
      }
    ],
    "chamada": "<texto: o telefone do recurso de chamada, ou texto vazio se não houver>"
  },
  "orcamento": {
    "diarioBrl": <número: quanto gastar por dia, em reais>,
    "cpcAlvoBrl": <número: o custo por clique alvo, em reais>,
    "cliquesEstimadosMes": "<texto: a faixa estimada de cliques no mês, ex 300 a 450>",
    "observacao": "<texto: o raciocínio por trás desses números>"
  },
  "conversoes": [
    {
      "nome": "<texto: o nome da conversão>",
      "tipo": "<um destes: whatsapp, formulario, ligacao, agendamento, outro>",
      "comoMarcar": "<texto: como marcar essa conversão no painel do Google>",
      "valorBrl": <número em reais, ou null quando o dono ainda não sabe quanto vale>
    }
  ],
  "publicacao": [
    {
      "ordem": <número: a ordem do passo, começando em 1>,
      "titulo": "<texto: o passo em uma linha>",
      "detalhe": "<texto: como executar esse passo no painel do Google>"
    }
  ]
}`;

// O contrato inteiro, pronto pra entrar no prompt.
export function montarContratoAnuncioJson(): string {
  return [
    "O ARQUIVO anuncio.json, CAMPO A CAMPO",
    "",
    "Grave exatamente esta forma, com os nomes de campo em camelCase iguais aos daqui.",
    "Nenhum campo é opcional. Quando não houver informação, escreva texto vazio ou lista vazia, nunca omita a chave.",
    'Os valores entre "<" e ">" abaixo são a descrição do que entra ali, não texto pra copiar.',
    "O arquivo é JSON puro: sem comentário, sem vírgula sobrando e sem cerca de bloco de código em volta.",
    "",
    FORMA_DO_ARQUIVO,
    "",
    "OS LIMITES DO GOOGLE, QUE VOCÊ PRECISA RESPEITAR NA HORA DE ESCREVER",
    "",
    "Texto que passa do limite é recusado pelo painel do Google. Conte os caracteres de cada campo antes de gravar.",
    "",
    linhaDeLimite(LIMITES_GOOGLE.titulos, "por anúncio"),
    linhaDeLimite(LIMITES_GOOGLE.descricoes, "por anúncio"),
    linhaDeLimite(LIMITES_GOOGLE.caminhos, "por anúncio"),
    linhaDeLimite(LIMITES_GOOGLE.sitelinks, "na campanha"),
    linhaDeLimite(LIMITES_GOOGLE.descricoesSitelink, "por sitelink"),
    linhaDeLimite(LIMITES_GOOGLE.frasesDestaque, "na campanha"),
    linhaDeLimite(LIMITES_GOOGLE.valoresSnippet, "por snippet"),
    "",
    "Cada grupo de anúncios leva ao menos um anúncio responsivo, e a campanha leva ao menos um grupo.",
  ].join("\n");
}
