// Helpers de formatacao do CRM. Reais em pt-BR, data e hora curtas, iniciais.

const REAIS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const REAIS_CENTAVOS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Formata um valor em reais. Sem centavos quando e redondo, pra caber melhor.
export function formatarReais(valor: number): string {
  return Number.isInteger(valor) ? REAIS.format(valor) : REAIS_CENTAVOS.format(valor);
}

// Data e hora curtas de um ISO, no fuso local. String vazia se invalida.
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Converte um ISO pro valor de um input datetime-local (AAAA-MM-DDTHH:mm no
// fuso local). String vazia se invalido ou ausente.
export function isoParaDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Data e hora curtas (dia/mes e hora) de um ISO, pro cartao do kanban. Sem ano,
// pra caber discreto. String vazia se invalido.
export function formatarDataHoraCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Iniciais de um nome pro avatar do cartao. Ate duas letras.
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
