// Normalizacao unica de telefone do Hub, com saida em E.164.
//
// Nasceu de um bug vivo: a regra antiga so removia nao-digitos, entao
// "+55 31 99999-8888" virava "5531999998888" e "(31) 99999-8888" virava
// "31999998888". Duas chaves diferentes para o MESMO numero, e o mesmo cliente
// entrava duas vezes no CRM. Aqui os dois viram "+5531999998888".
//
// Quem nao da pra normalizar com confianca devolve null. O chamador decide o
// que fazer: o telefone que o usuario digitou nunca e alterado nem descartado,
// so deixa de servir como chave de deduplicacao.
//
// Modulo folha: nao importa nada do servidor.

// DDI do Brasil. Numero sem "+" e tratado como brasileiro, que e o caso de
// quase tudo que o usuario digita e de tudo que o Google Maps devolve.
const DDI_BRASIL = "55";

// E.164 admite de 8 a 15 digitos contando o DDI. Fora dessa faixa nao ha
// confianca nenhuma no que chegou.
const MINIMO_E164 = 8;
const MAXIMO_E164 = 15;

function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// DDD brasileiro plausivel: de 11 a 99 e nunca terminando em 0. A tabela
// oficial tem buracos (20, 23, 25, 30...), mas a regra curta ja barra o que de
// fato aparece na base: prefixo de operadora, 0800 e numero curto. Uma tabela
// completa envelheceria a cada mudanca da Anatel sem ganho pratico.
function dddPlausivel(ddd: string): boolean {
  const numero = Number(ddd);
  return numero >= 11 && numero <= 99 && ddd[1] !== "0";
}

// Monta o E.164 brasileiro a partir do numero nacional (DDD + assinante).
//
// O nono digito e a unica correcao aplicada. Depois da migracao da Anatel nao
// existe mais celular com 8 digitos, entao assinante de 8 digitos comecando em
// 6, 7, 8 ou 9 ganha o "9" na frente. Sem isso o mesmo cliente cadastrado antes
// e depois da migracao vira duas fichas. Fixo comeca em 2, 3, 4 ou 5 e nunca e
// tocado.
function montarBrasileiro(nacional: string): string | null {
  if (nacional.length !== 10 && nacional.length !== 11) return null;
  const ddd = nacional.slice(0, 2);
  if (!dddPlausivel(ddd)) return null;
  let assinante = nacional.slice(2);
  if (assinante.length === 8) {
    // 0 e 1 na frente sao numeros de servico, nao linha de cliente.
    if (assinante[0] < "2") return null;
    if (assinante[0] >= "6") assinante = `9${assinante}`;
  } else if (assinante[0] !== "9") {
    // Assinante de 9 digitos so existe em celular, e celular comeca com 9.
    return null;
  }
  return `+${DDI_BRASIL}${ddd}${assinante}`;
}

// Normaliza um telefone para E.164 com o "+" na frente, ou devolve null.
//
// Com "+" e DDI 55, ou sem "+" nenhum, vale a regra brasileira: DDD
// obrigatorio, nono digito corrigido. Com "+" e DDI de outro pais o numero ja
// chega em E.164 e so passa pela conferencia de tamanho.
export function normalizarTelefone(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const texto = bruto.trim();
  if (!texto) return null;
  const internacional = texto.startsWith("+");
  let digitos = somenteDigitos(texto);
  if (!digitos) return null;

  if (internacional) {
    // 55 e do Brasil, sempre. Se o resto nao formar um numero brasileiro
    // valido, e null: cair no ramo estrangeiro devolveria um "+55" sem DDD.
    if (digitos.startsWith(DDI_BRASIL)) return montarBrasileiro(digitos.slice(2));
    if (digitos.length < MINIMO_E164 || digitos.length > MAXIMO_E164) return null;
    return `+${digitos}`;
  }

  // Sem "+", o "0" da frente e prefixo de operadora, nao faz parte do numero.
  digitos = digitos.replace(/^0+/, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith(DDI_BRASIL)) {
    return montarBrasileiro(digitos.slice(2));
  }
  return montarBrasileiro(digitos);
}

// Chave de deduplicacao por telefone. Devolve string vazia quando o numero nao
// serve como chave, pra quem monta Set poder filtrar com um teste so.
export function chaveTelefone(bruto: unknown): string {
  return normalizarTelefone(bruto) ?? "";
}
