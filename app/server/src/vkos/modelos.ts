// Modelos de carrossel do VKOS. Le os arquivos templates/carrossel/modelo-*.html
// da pasta do VKOS e cruza com as descricoes do estilos.md.
//
// Decisao de escopo: o arquivo base modelo.html E o legado "Dark" (assim o
// estilos.md o descreve). Ele entra na lista com id "dark", nao como uma entrada
// separada. Total esperado: 9 modelos VKOS + 5 legados (dark, editorial,
// declaracao, claro, produto) = 14.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModeloCarrossel } from "../tipos.js";

// Modelos que pedem imagem-heroi gerada por IA (conforme o estilos.md / contrato).
const PEDEM_IMAGEM = new Set([
  "vkos01",
  "vkos03",
  "vkos06",
  "vkos07",
  "vkos08",
  "vkos09",
  "editorial",
  "declaracao",
  "produto",
]);

// Ordem de exibicao dos legados. Os VKOS vem antes, ordenados pelo id.
const ORDEM_LEGADOS = ["dark", "editorial", "declaracao", "claro", "produto"];

// Nomes legiveis de fallback quando o estilos.md nao entrega um.
const NOMES_FALLBACK: Record<string, string> = {
  dark: "Dark",
  editorial: "Editorial",
  declaracao: "Declaracao",
  claro: "Claro",
  produto: "Produto",
};

// Descoberta dos modelos de carrossel na pasta do VKOS.
export function lerModelosCarrossel(pastaVkos: string): ModeloCarrossel[] {
  const pastaTemplates = join(pastaVkos, "templates", "carrossel");
  if (!existsSync(pastaTemplates)) {
    return [];
  }

  let entradas: string[];
  try {
    entradas = readdirSync(pastaTemplates);
  } catch {
    return [];
  }

  // So os HTML de modelo. modelo.html e modelo-*.html.
  const arquivos = entradas.filter(
    (nome) => nome === "modelo.html" || (nome.startsWith("modelo-") && nome.endsWith(".html")),
  );

  // Descricoes vindas do estilos.md, mapeadas por id do modelo.
  const infoEstilo = lerEstilos(pastaTemplates);

  const modelos: ModeloCarrossel[] = arquivos.map((arquivo) => {
    const id = idDoArquivo(arquivo);
    const info = infoEstilo.get(id);
    const nome = info?.nome || NOMES_FALLBACK[id] || rotularId(id);
    return {
      id,
      nome,
      descricao: info?.descricao ?? "",
      arquivo,
      pedeImagem: PEDEM_IMAGEM.has(id),
    };
  });

  modelos.sort(ordenar);
  return modelos;
}

// id = miolo do nome do arquivo. modelo.html vira "dark" (o legado base).
function idDoArquivo(arquivo: string): string {
  if (arquivo === "modelo.html") {
    return "dark";
  }
  return arquivo.replace(/^modelo-/, "").replace(/\.html$/, "");
}

// Ordena: VKOS primeiro (por id), depois legados na ordem definida.
function ordenar(a: ModeloCarrossel, b: ModeloCarrossel): number {
  const ea = a.id.startsWith("vkos");
  const eb = b.id.startsWith("vkos");
  if (ea && eb) return a.id.localeCompare(b.id);
  if (ea) return -1;
  if (eb) return 1;
  const ia = ORDEM_LEGADOS.indexOf(a.id);
  const ib = ORDEM_LEGADOS.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
}

// Rotulo simples pra um id sem nome conhecido (ex: "vkos10" vira "Vkos10").
function rotularId(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

interface InfoEstilo {
  nome: string;
  descricao: string;
}

// Le o estilos.md e monta um mapa id -> { nome, descricao }. Parser tolerante:
// entende a tabela dos VKOS e as secoes dos legados. Falha vira mapa vazio.
function lerEstilos(pastaTemplates: string): Map<string, InfoEstilo> {
  const mapa = new Map<string, InfoEstilo>();
  const caminho = join(pastaTemplates, "estilos.md");
  let texto: string;
  try {
    if (!existsSync(caminho)) return mapa;
    texto = readFileSync(caminho, "utf8").replace(/\r\n/g, "\n");
  } catch {
    return mapa;
  }

  const linhas = texto.split("\n");

  // 1) Tabela dos VKOS. Linhas com "modelo-vkosNN.html" e 5 colunas.
  for (const linha of linhas) {
    if (!linha.includes("modelo-vkos")) continue;
    if (!linha.trim().startsWith("|")) continue;
    const celulas = linha
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    // Colunas: codigo | arquivo | tom | exige imagem | quando usar.
    if (celulas.length < 5) continue;
    const arquivoCelula = celulas[1];
    const m = arquivoCelula.match(/modelo-([a-z0-9]+)\.html/i);
    if (!m) continue;
    const id = m[1].toLowerCase();
    const nome = limparInline(celulas[0]);
    const descricao = limparInline(celulas[4]);
    mapa.set(id, { nome, descricao });
  }

  // 2) Secoes dos legados. Blocos "### N. Nome" com Arquivo e Quando usar.
  for (let i = 0; i < linhas.length; i++) {
    const cab = linhas[i].match(/^###\s+\d+\.\s+(.+)$/);
    if (!cab) continue;
    const nome = cab[1].trim();
    let arquivo = "";
    let descricao = "";
    // Varre ate a proxima secao ou titulo.
    for (let j = i + 1; j < linhas.length && !/^#{2,3}\s/.test(linhas[j]); j++) {
      const linha = linhas[j];
      const mArq = linha.match(/\*\*Arquivo:\*\*\s*`([^`]+)`/);
      if (mArq) arquivo = mArq[1].trim();
      const mQuando = linha.match(/\*\*Quando usar:\*\*\s*(.+)$/);
      if (mQuando) descricao = limparInline(mQuando[1]);
    }
    if (!arquivo) continue;
    const id = idDoArquivo(arquivo);
    // Nao sobrescreve algo ja vindo da tabela.
    if (!mapa.has(id)) {
      mapa.set(id, { nome, descricao });
    }
  }

  return mapa;
}

// Tira negrito, aspas de markdown e colapsa espacos de um trecho inline.
function limparInline(valor: string): string {
  return valor
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
