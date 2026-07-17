// Resumo seguro do CRM para contexto de IA. So agrega o que orienta decisoes e
// remove emails e telefones inclusive quando foram escritos dentro de uma nota.

import { lerEstado, type Contato, type EstadoCrm, type Interacao } from "./estado.js";

const LIMITE_BYTES = 8 * 1024;
const DIA_MS = 24 * 60 * 60 * 1000;

function primeiroNome(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] || "Cliente";
  return anonimizarTextoCrm(primeiro) || "Cliente";
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removerValorConhecido(texto: string, valor: string | undefined): string {
  if (!valor?.trim()) return texto;
  return texto.replace(new RegExp(escaparRegex(valor.trim()), "gi"), "[dado removido]");
}

export function anonimizarTextoCrm(texto: string, contato?: Contato): string {
  let seguro = removerValorConhecido(texto, contato?.email);
  seguro = removerValorConhecido(seguro, contato?.telefone);
  seguro = seguro.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "[email removido]",
  );
  seguro = seguro.replace(
    /(?<!\w)(?:\+?\d[\s().-]*){8,15}(?!\w)/g,
    "[telefone removido]",
  );
  return seguro.replace(/\s+/g, " ").trim();
}

function limitar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  return `${texto.slice(0, Math.max(0, maximo - 3)).trimEnd()}...`;
}

function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ultimaInteracao(contato: Contato): number {
  if (contato.interacoes.length === 0) return Date.parse(contato.criadoEm);
  return contato.interacoes.reduce((maisRecente, item) => {
    const instante = Date.parse(item.em);
    return Number.isNaN(instante) ? maisRecente : Math.max(maisRecente, instante);
  }, 0);
}

interface Voz {
  contato: Contato;
  interacao: Interacao;
  instante: number;
}

function cortarUtf8(texto: string): string {
  if (Buffer.byteLength(texto, "utf8") <= LIMITE_BYTES) return texto;
  let inicio = 0;
  let fim = texto.length;
  while (inicio < fim) {
    const meio = Math.ceil((inicio + fim) / 2);
    if (Buffer.byteLength(texto.slice(0, meio), "utf8") <= LIMITE_BYTES - 4) inicio = meio;
    else fim = meio - 1;
  }
  return `${texto.slice(0, inicio).trimEnd()}...`;
}

export function montarResumoCrm(estado: EstadoCrm = lerEstado()): string | null {
  if (estado.contatos.length === 0 && estado.negocios.length === 0) return null;

  const agora = Date.now();
  const emSeteDias = agora + 7 * DIA_MS;
  const atrasados = estado.contatos.filter((contato) => {
    const data = contato.proximoContato ? Date.parse(contato.proximoContato) : Number.NaN;
    return !Number.isNaN(data) && data < agora;
  }).length;
  const proximos = estado.contatos.filter((contato) => {
    const data = contato.proximoContato ? Date.parse(contato.proximoContato) : Number.NaN;
    return !Number.isNaN(data) && data >= agora && data <= emSeteDias;
  }).length;

  const esquecidos = estado.contatos.filter((contato) => {
    const instante = ultimaInteracao(contato);
    return !Number.isNaN(instante) && instante < agora - 30 * DIA_MS;
  }).length;

  const tags = new Map<string, { nome: string; total: number }>();
  for (const contato of estado.contatos) {
    for (const tag of contato.tags) {
      const chave = tag.toLocaleLowerCase("pt-BR");
      const atual = tags.get(chave);
      tags.set(chave, { nome: atual?.nome ?? tag, total: (atual?.total ?? 0) + 1 });
    }
  }
  const tagsMaisComuns = [...tags.values()]
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 8);

  const vozes: Voz[] = estado.contatos.flatMap((contato) =>
    contato.interacoes.map((interacao) => ({
      contato,
      interacao,
      instante: Number.isNaN(Date.parse(interacao.em)) ? 0 : Date.parse(interacao.em),
    })),
  );
  vozes.sort((a, b) => b.instante - a.instante);

  const linhas: string[] = ["# Resumo agregado do CRM", "", "## Funil"];
  for (const coluna of [...estado.colunas].sort((a, b) => a.ordem - b.ordem)) {
    const negocios = estado.negocios.filter((negocio) => negocio.colunaId === coluna.id);
    const valor = negocios.reduce((soma, negocio) => soma + (negocio.valorEstimado ?? 0), 0);
    const nomeColuna = anonimizarTextoCrm(coluna.nome) || "Coluna sem nome";
    linhas.push(`- ${nomeColuna}: ${negocios.length} negocio(s), valor ${formatarValor(valor)}`);
  }
  linhas.push(
    "",
    "## Follow-ups",
    `- Atrasados: ${atrasados}`,
    `- Nos proximos 7 dias: ${proximos}`,
    "",
    "## Tags mais comuns",
    tagsMaisComuns.length > 0
      ? tagsMaisComuns
          .map((tag) => `${anonimizarTextoCrm(tag.nome) || "tag protegida"} (${tag.total})`)
          .join(", ")
      : "Nenhuma tag registrada.",
    "",
    "## Clientes esquecidos",
    `${esquecidos} contato(s) sem interacao ha mais de 30 dias.`,
    "",
    "## Vozes dos clientes",
  );
  if (vozes.length === 0) {
    linhas.push("Nenhuma interacao registrada.");
  } else {
    for (const voz of vozes.slice(0, 15)) {
      const texto = limitar(anonimizarTextoCrm(voz.interacao.texto, voz.contato), 200);
      linhas.push(`- ${primeiroNome(voz.contato.nome)} (${voz.interacao.tipo}): ${texto}`);
    }
  }

  return cortarUtf8(linhas.join("\n"));
}
