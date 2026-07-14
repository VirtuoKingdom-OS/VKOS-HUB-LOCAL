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

// Iniciais de um nome pro avatar do cartao. Ate duas letras.
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
