// Ajudantes de data do calendario. Regra de ouro: as datas vem em ISO (UTC ou
// com offset) e SEMPRE aparecem no horario local da maquina. Eventos de dia
// inteiro chegam sem hora (ex: "2026-07-20"): esses a gente ancora no dia local
// sem deixar o fuso empurrar pro dia anterior.

export const NOMES_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Dia inteiro: o ISO vem so com a data, sem "T" de hora. O Google manda date
// em vez de dateTime nesses casos.
export function ehDiaInteiro(iso?: string): boolean {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso.trim());
}

// Converte um ISO de evento num Date local. Dia inteiro vira meia-noite local
// do proprio dia (parse manual pra o fuso nao jogar pro dia anterior).
export function dataDoIso(iso?: string): Date | null {
  if (!iso) return null;
  if (ehDiaInteiro(iso)) {
    const [a, m, d] = iso.trim().split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Chave YYYY-MM-DD no fuso local, pra agrupar eventos por dia.
export function chaveDia(d: Date): string {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${a}-${m}-${dia}`;
}

export function mesmoDia(a: Date, b: Date): boolean {
  return chaveDia(a) === chaveDia(b);
}

// Titulo do mes, ex: "Julho de 2026".
export function rotuloMes(ref: Date): string {
  return `${NOMES_MESES[ref.getMonth()]} de ${ref.getFullYear()}`;
}

// Grade do mes: comeca no domingo da semana que contem o dia 1 e vai ate o
// sabado da semana que contem o ultimo dia. Sempre semanas cheias (Dom a Sab).
export function gradeDoMes(ref: Date): Date[] {
  const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const inicio = new Date(primeiro);
  inicio.setDate(1 - primeiro.getDay());

  const ultimo = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const fim = new Date(ultimo);
  fim.setDate(ultimo.getDate() + (6 - ultimo.getDay()));

  const dias: Date[] = [];
  const cursor = new Date(inicio);
  while (cursor <= fim) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

// Intervalo ISO que cobre a grade visivel, com uma margem de um dia de cada
// lado pra pegar evento que comeca na virada. Serve pra buscar no backend.
export function intervaloDaGrade(ref: Date): { deIso: string; ateIso: string } {
  const dias = gradeDoMes(ref);
  const de = new Date(dias[0]);
  de.setDate(de.getDate() - 1);
  de.setHours(0, 0, 0, 0);
  const ate = new Date(dias[dias.length - 1]);
  ate.setDate(ate.getDate() + 1);
  ate.setHours(23, 59, 59, 999);
  return { deIso: de.toISOString(), ateIso: ate.toISOString() };
}

// Hora curta local, ex: "14:30". Vazia pra dia inteiro.
export function horaCurta(iso?: string): string {
  if (!iso || ehDiaInteiro(iso)) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Data e hora por extenso no padrao pt-BR, ex: "20/07/2026, 14:30". Dia inteiro
// mostra so a data.
export function dataHoraLonga(iso?: string): string {
  const d = dataDoIso(iso);
  if (!d) return "-";
  if (ehDiaInteiro(iso)) {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Dia por extenso pro cabecalho do painel, ex: "Sábado, 20 de julho". So a
// primeira letra maiuscula (o pt-BR escreve o resto em minuscula, como manda).
export function diaPorExtenso(d: Date): string {
  const texto = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Valor pro input datetime-local (local, sem fuso): "YYYY-MM-DDTHH:mm".
export function paraInputLocal(d: Date): string {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${a}-${m}-${dia}T${h}:${min}`;
}

// Proxima hora cheia a partir de agora (ou de uma data base, ex: o dia clicado).
export function proximaHoraCheia(base?: Date): Date {
  const d = base ? new Date(base) : new Date();
  if (!base) {
    // Sem base, arredonda pra proxima hora cheia a partir de agora.
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }
  // Com base (dia clicado): usa a proxima hora cheia do horario atual, mas no
  // dia escolhido. Assim um dia futuro nasce num horario comercial plausivel.
  const agora = new Date();
  d.setHours(agora.getHours() + 1, 0, 0, 0);
  return d;
}
