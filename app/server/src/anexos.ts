// Anexos universais do composer. Recebe um arquivo em base64, sanitiza o nome,
// grava em materiais/cockpit/anexos/<AAAA-MM-DD>/ dentro do VKOS e devolve o
// caminho relativo com barras normais. E assim que o prompt referencia o arquivo,
// ja que a sessao roda com cwd na pasta do VKOS.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { obterPastaVkos } from "./vkos/estado.js";

// Extensoes aceitas.
const EXTENSOES = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".md",
  ".txt",
  ".pdf",
  ".csv",
  ".json",
]);

// Limite de 15MB por arquivo (bytes decodificados).
const LIMITE_ARQUIVO = 15 * 1024 * 1024;

// Teto do corpo da requisicao: 15MB viram ~20MB em base64, mais o JSON em volta.
const LIMITE_CORPO = 32 * 1024 * 1024;

// Caracteres proibidos em nome de arquivo no Windows.
const PROIBIDOS = /[<>:"|?*]/;

// Tem algum caractere de controle (codigo 0 a 31)?
function temControle(texto: string): boolean {
  for (let i = 0; i < texto.length; i += 1) {
    if (texto.charCodeAt(i) < 32) return true;
  }
  return false;
}

// Sanitiza o nome do arquivo. Recusa path traversal (barra, contrabarra, "..") e
// caracteres de controle ou proibidos no Windows. Normaliza espacos. Devolve null
// quando nao sobra nada valido.
function sanitizarNome(bruto: string): string | null {
  // Barra, contrabarra ou ".." seria sair da pasta.
  if (/[\\/]/.test(bruto) || bruto.includes("..")) return null;
  if (temControle(bruto)) return null;
  if (PROIBIDOS.test(bruto)) return null;
  // Normaliza espacos: colapsa repetidos e tira das pontas. Tira ponto do fim.
  const nome = bruto.replace(/\s+/g, " ").trim().replace(/\.+$/, "").trim();
  if (!nome || nome === "." || nome === "..") return null;
  return nome;
}

// Data de hoje em AAAA-MM-DD (hora local), pra pasta do dia.
function dataHoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Escolhe um nome livre na pasta. Colisao ganha sufixo -2, -3 antes da extensao.
function nomeLivre(pasta: string, nome: string): string {
  const ext = extname(nome);
  const base = ext ? nome.slice(0, -ext.length) : nome;
  let escolhido = nome;
  let n = 2;
  while (existsSync(join(pasta, escolhido))) {
    escolhido = `${base}-${n}${ext}`;
    n += 1;
  }
  return escolhido;
}

// Valida e decodifica o base64. Devolve null se o texto nao for base64 valido.
function decodificarBase64(bruto: string): Buffer | null {
  // Aceita data URL (data:...;base64,) e ignora espacos e quebras de linha.
  const limpo = bruto.replace(/^data:[^;,]*;base64,/, "").replace(/\s+/g, "");
  if (limpo.length === 0) return null;
  // Base64 valido: so o alfabeto, tamanho multiplo de 4, padding no fim.
  if (limpo.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(limpo)) return null;
  const dados = Buffer.from(limpo, "base64");
  if (dados.length === 0) return null;
  return dados;
}

export const rotasAnexos: FastifyPluginAsync = async (app) => {
  // Corpo folgado (32MB) so nesta rota, pra caber o base64 de um arquivo de 15MB.
  app.post(
    "/anexos",
    { bodyLimit: LIMITE_CORPO },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const pasta = obterPastaVkos();
      if (!pasta) {
        return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
      }

      const corpo = (req.body ?? {}) as { nome?: unknown; conteudoBase64?: unknown };
      if (typeof corpo.nome !== "string" || typeof corpo.conteudoBase64 !== "string") {
        return resposta.status(400).send({ erro: "Informe nome e conteudoBase64." });
      }

      const nome = sanitizarNome(corpo.nome);
      if (!nome) {
        return resposta.status(400).send({ erro: "Nome de arquivo invalido." });
      }

      const ext = extname(nome).toLowerCase();
      if (!EXTENSOES.has(ext)) {
        return resposta.status(400).send({
          erro: `Extensao "${ext || "sem extensao"}" nao aceita.`,
        });
      }

      const dados = decodificarBase64(corpo.conteudoBase64);
      if (!dados) {
        return resposta.status(400).send({ erro: "conteudoBase64 invalido." });
      }
      if (dados.length > LIMITE_ARQUIVO) {
        return resposta.status(413).send({ erro: "Arquivo passou do limite de 15MB." });
      }

      const dia = dataHoje();
      const destinoPasta = join(pasta, "materiais", "cockpit", "anexos", dia);
      mkdirSync(destinoPasta, { recursive: true });

      const nomeFinal = nomeLivre(destinoPasta, nome);
      writeFileSync(join(destinoPasta, nomeFinal), dados);

      // Caminho relativo a pasta do VKOS, sempre com barra normal.
      const caminhoRelativo = `materiais/cockpit/anexos/${dia}/${nomeFinal}`;
      return resposta.status(201).send({ caminhoRelativo });
    },
  );
};
