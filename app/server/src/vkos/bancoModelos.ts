import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ModeloCarrossel } from "../tipos.js";
import { resolverSemente } from "../plataforma/provisionamento.js";
import { lerModelosCarrossel } from "./modelos.js";

const pastaModulo = dirname(fileURLToPath(import.meta.url));
const pastaApp = resolve(pastaModulo, "..", "..", "..");
export const pastaBancoModelos = resolve(
  process.env.DADOS_MODELOS ?? join(pastaApp, "dados", "modelos-carrossel"),
);

export const TIPOS_MODELO_BANCO = [
  "capa",
  "desenvolvimento",
  "cta",
  "completo",
] as const;
export type TipoModeloBanco = (typeof TIPOS_MODELO_BANCO)[number];

export interface ModeloBanco {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoModeloBanco;
  pedeImagem: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ModeloBancoComHtml extends ModeloBanco {
  html: string;
}

export interface EntradaModeloBanco {
  id?: string;
  nome: string;
  descricao?: string;
  tipo: TipoModeloBanco;
  pedeImagem?: boolean;
  html: string;
}

export interface ValidacaoHtmlModelo {
  avisos: string[];
}

const ID_BANCO = /^b-[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Superconjunto seguro pra caminho: cobre os b-* e os ids de original da
// semente (vkos01, dark, editorial...). A regra de negocio de quem pode entrar
// no banco fica no salvar; aqui e so seguranca de filesystem.
const ID_SEGURO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LIMITE_HTML = 512 * 1024;

// Pasta da semente vkos2 (o estado de fabrica dos originais), ou null quando a
// semente nao existe no deploy. Toda funcao que compara com a semente aceita o
// caminho por parametro pra os testes injetarem uma semente propria.
export function pastaSementePadrao(): string | null {
  try {
    return resolverSemente("vkos2");
  } catch {
    return null;
  }
}

// Catalogo de originais da semente. Vazio quando a semente nao esta disponivel.
export function listarSemente(
  pastaSemente: string | null = pastaSementePadrao(),
): ModeloCarrossel[] {
  return pastaSemente ? lerModelosCarrossel(pastaSemente) : [];
}

// Nome do arquivo local de um modelo dentro de templates/carrossel/. O legado
// "dark" vive em modelo.html; todos os outros em modelo-<id>.html.
export function arquivoLocalDoModelo(id: string): string {
  return id === "dark" ? "modelo.html" : `modelo-${id}.html`;
}

// HTML de fabrica de um original, direto da semente. Null quando nao existe.
export function lerHtmlSemente(
  id: string,
  pastaSemente: string | null = pastaSementePadrao(),
): string | null {
  if (!pastaSemente || !ID_SEGURO.test(id)) return null;
  const modelo = listarSemente(pastaSemente).find((item) => item.id === id);
  if (!modelo) return null;
  try {
    return readFileSync(
      join(pastaSemente, "templates", "carrossel", modelo.arquivo),
      "utf8",
    );
  } catch {
    return null;
  }
}

function slug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

export function gerarIdModeloBanco(
  nome: string,
  ocupados: Iterable<string> = [],
): string {
  const base = `b-${slug(nome) || "modelo"}`;
  const usados = new Set(ocupados);
  if (!usados.has(base)) return base;
  let numero = 2;
  while (usados.has(`${base}-${numero}`)) numero += 1;
  return `${base}-${numero}`;
}

// Id de modelo NOVO do banco: sempre com prefixo b-.
export function idModeloBancoValido(id: string): boolean {
  return ID_BANCO.test(id);
}

// Id aceitavel como entrada no banco: novo (b-*) ou sobrescrita de um original
// da semente (id identico ao do catalogo de fabrica).
export function idEntradaBancoValido(
  id: string,
  idsSemente: ReadonlySet<string>,
): boolean {
  return ID_BANCO.test(id) || (ID_SEGURO.test(id) && idsSemente.has(id));
}

function pastaDoModelo(id: string, base: string): string {
  if (!ID_SEGURO.test(id)) throw new Error("Id de modelo inválido.");
  return join(base, id);
}

function ehTipo(valor: unknown): valor is TipoModeloBanco {
  return typeof valor === "string"
    && (TIPOS_MODELO_BANCO as readonly string[]).includes(valor);
}

function ehModeloBanco(valor: unknown): valor is ModeloBanco {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Record<string, unknown>;
  return (
    typeof item.id === "string"
    && ID_SEGURO.test(item.id)
    && typeof item.nome === "string"
    && typeof item.descricao === "string"
    && ehTipo(item.tipo)
    && typeof item.pedeImagem === "boolean"
    && typeof item.criadoEm === "string"
    && typeof item.atualizadoEm === "string"
  );
}

export function validarHtmlModelo(html: string): ValidacaoHtmlModelo {
  if (typeof html !== "string" || !html.trim()) {
    throw new Error("Cole um HTML de modelo.");
  }
  if (Buffer.byteLength(html, "utf8") > LIMITE_HTML) {
    throw new Error("O HTML do modelo passa do limite de 512 KB.");
  }
  if (!/class\s*=\s*["'][^"']*\bslide\b[^"']*["']/i.test(html)) {
    throw new Error("O HTML precisa ter ao menos um elemento com a classe slide.");
  }
  const avisos = new Set<string>();
  for (const resultado of html.matchAll(/https?:\/\/[^\s"'<>)]*/gi)) {
    try {
      const host = new URL(resultado[0]).hostname.toLowerCase();
      if (host !== "fonts.googleapis.com" && host !== "fonts.gstatic.com") {
        avisos.add(`Referência externa encontrada: ${host}.`);
      }
    } catch {
      avisos.add("O HTML contém uma referência externa inválida.");
    }
  }
  return { avisos: [...avisos] };
}

export function listarBanco(base = pastaBancoModelos): ModeloBanco[] {
  if (!existsSync(base)) return [];
  let entradas: string[];
  try {
    entradas = readdirSync(base);
  } catch {
    return [];
  }
  const modelos: ModeloBanco[] = [];
  for (const id of entradas) {
    if (!ID_SEGURO.test(id)) continue;
    try {
      const json = JSON.parse(
        readFileSync(join(base, id, "modelo.json"), "utf8"),
      ) as unknown;
      if (!ehModeloBanco(json) || json.id !== id) {
        console.warn(`Modelo do banco ignorado por metadados inválidos: ${id}`);
        continue;
      }
      if (!existsSync(join(base, id, "modelo.html"))) continue;
      modelos.push(json);
    } catch {
      console.warn(`Modelo do banco ignorado por JSON inválido: ${id}`);
    }
  }
  return modelos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function lerModeloBanco(
  id: string,
  base = pastaBancoModelos,
): ModeloBancoComHtml | null {
  if (!ID_SEGURO.test(id)) return null;
  try {
    const metadados = JSON.parse(
      readFileSync(join(base, id, "modelo.json"), "utf8"),
    ) as unknown;
    if (!ehModeloBanco(metadados) || metadados.id !== id) return null;
    const html = readFileSync(join(base, id, "modelo.html"), "utf8");
    return { ...metadados, html };
  } catch {
    return null;
  }
}

export function salvarModeloBanco(
  entrada: EntradaModeloBanco,
  base = pastaBancoModelos,
  pastaSemente: string | null = pastaSementePadrao(),
): { modelo: ModeloBanco; avisos: string[] } {
  const nome = entrada.nome?.trim().slice(0, 100);
  if (!nome) throw new Error("Informe o nome do modelo.");
  if (!ehTipo(entrada.tipo)) throw new Error("Tipo de modelo inválido.");
  const validacao = validarHtmlModelo(entrada.html);
  mkdirSync(base, { recursive: true });
  const existentes = listarBanco(base);
  const id = entrada.id
    ? entrada.id
    : gerarIdModeloBanco(nome, existentes.map((item) => item.id));
  // Id novo sempre com prefixo b-; id sem prefixo so como sobrescrita de um
  // original da semente. Qualquer outro id nao entra no banco.
  const idsSemente = new Set(listarSemente(pastaSemente).map((item) => item.id));
  if (!idEntradaBancoValido(id, idsSemente)) {
    throw new Error("Id de modelo inválido.");
  }
  const anterior = lerModeloBanco(id, base);
  const agora = new Date().toISOString();
  const modelo: ModeloBanco = {
    id,
    nome,
    descricao: entrada.descricao?.trim().slice(0, 500) ?? "",
    tipo: entrada.tipo,
    pedeImagem: entrada.pedeImagem === true,
    criadoEm: anterior?.criadoEm ?? agora,
    atualizadoEm: agora,
  };
  const pasta = pastaDoModelo(id, base);
  mkdirSync(pasta, { recursive: true });
  const htmlTemporario = join(pasta, "modelo.html.tmp");
  const jsonTemporario = join(pasta, "modelo.json.tmp");
  writeFileSync(htmlTemporario, entrada.html, "utf8");
  writeFileSync(jsonTemporario, JSON.stringify(modelo, null, 2), "utf8");
  renameSync(htmlTemporario, join(pasta, "modelo.html"));
  renameSync(jsonTemporario, join(pasta, "modelo.json"));
  return { modelo, avisos: validacao.avisos };
}

export function removerModeloBanco(
  id: string,
  base = pastaBancoModelos,
): boolean {
  // Original nunca sai do banco por exclusao: apagar a sobrescrita deixaria os
  // clientes que ja receberam a versao editada presos nela pra sempre (a
  // comparacao pararia). O caminho de volta e o restaurar.
  if (!idModeloBancoValido(id)) {
    throw new Error("Um original não pode ser excluído. Use o Restaurar original.");
  }
  const pasta = pastaDoModelo(id, base);
  if (!existsSync(pasta)) return false;
  rmSync(pasta, { recursive: true, force: true });
  return true;
}

// Decisao pura da atualizacao no uso: com o modelo no banco, o arquivo do
// workspace converge pro banco (grava quando falta ou difere, pula quando
// igual). Sem o modelo no banco, um b-* e erro (foi removido) e um id de
// original segue o arquivo local que ja existe no workspace.
export type AcaoModeloUso = "gravar" | "pular" | "erro-inexistente";

export function decidirAtualizacaoModelo(
  id: string,
  htmlLocal: string | null,
  htmlBanco: string | null,
): AcaoModeloUso {
  if (htmlBanco === null) {
    return id.startsWith("b-") ? "erro-inexistente" : "pular";
  }
  return htmlLocal === htmlBanco ? "pular" : "gravar";
}

export function garantirModelosNoWorkspace(
  pastaWorkspace: string,
  ids: readonly string[],
  base = pastaBancoModelos,
): void {
  const pastaTemplates = join(pastaWorkspace, "templates", "carrossel");
  for (const id of new Set(ids)) {
    if (!ID_SEGURO.test(id)) {
      if (id.startsWith("b-")) {
        throw new Error("Esse modelo não existe mais no banco. Escolha outro.");
      }
      continue;
    }
    const central = lerModeloBanco(id, base);
    const destino = join(pastaTemplates, arquivoLocalDoModelo(id));
    let local: string | null = null;
    try {
      local = readFileSync(destino, "utf8");
    } catch {
      local = null;
    }
    const acao = decidirAtualizacaoModelo(id, local, central?.html ?? null);
    if (acao === "erro-inexistente") {
      throw new Error("Esse modelo não existe mais no banco. Escolha outro.");
    }
    if (acao !== "gravar" || !central) continue;
    // So o arquivo exato do modelo usado na geracao. Nunca varrer a pasta.
    mkdirSync(pastaTemplates, { recursive: true });
    writeFileSync(destino, central.html, "utf8");
  }
}

// Um original da semente visto pelo painel: metadados vigentes (sobrescrita
// quando existe, fabrica quando nao) e as marcas de estado.
export interface OriginalBanco {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoModeloBanco;
  pedeImagem: boolean;
  temSobrescrita: boolean;
  atualizado: boolean;
}

export function listarOriginais(
  base = pastaBancoModelos,
  pastaSemente: string | null = pastaSementePadrao(),
): OriginalBanco[] {
  return listarSemente(pastaSemente).map((original) => {
    const sobrescrita = lerModeloBanco(original.id, base);
    const htmlSemente = sobrescrita
      ? lerHtmlSemente(original.id, pastaSemente)
      : null;
    return {
      id: original.id,
      nome: sobrescrita?.nome ?? original.nome,
      descricao: sobrescrita?.descricao ?? original.descricao,
      tipo: sobrescrita?.tipo ?? "completo",
      pedeImagem: sobrescrita?.pedeImagem ?? original.pedeImagem,
      temSobrescrita: sobrescrita !== null,
      atualizado:
        sobrescrita !== null
        && htmlSemente !== null
        && sobrescrita.html !== htmlSemente,
    };
  });
}

// Restaurar original: regrava a sobrescrita com o conteudo de fabrica em vez
// de apagar a entrada. Com a entrada mantida e igual a semente, o proximo uso
// em cada cliente regrava o arquivo de fabrica e o parque converge.
export function restaurarModeloBanco(
  id: string,
  base = pastaBancoModelos,
  pastaSemente: string | null = pastaSementePadrao(),
): ModeloBanco {
  const original = listarSemente(pastaSemente).find((item) => item.id === id);
  if (!original) {
    throw new Error("Só um modelo original da semente pode ser restaurado.");
  }
  if (!lerModeloBanco(id, base)) {
    throw new Error("Esse original ainda está no estado de fábrica.");
  }
  const html = lerHtmlSemente(id, pastaSemente);
  if (html === null) {
    throw new Error("O arquivo original não foi encontrado na semente.");
  }
  return salvarModeloBanco(
    {
      id,
      nome: original.nome,
      descricao: original.descricao,
      tipo: "completo",
      pedeImagem: original.pedeImagem,
      html,
    },
    base,
    pastaSemente,
  ).modelo;
}
