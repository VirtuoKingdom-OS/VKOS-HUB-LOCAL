import { CABECALHO_ABA, ID_DESTA_ABA } from "./aba";
import type { Contato } from "./crm";

export type Temperatura = "quente" | "morno" | "frio";

// Espelho do LeadFormulario do servidor (server/src/formulario/supabase.ts).
export interface LeadFormulario {
  id: string;
  criadoEm: string;
  negocio: string;
  faturamento: string;
  papelMarketing: string;
  dores: string[];
  gatilho?: string;
  tentativas?: string;
  decisao: string;
  investimento: string;
  nome: string;
  whatsapp: string;
  horario?: string;
  temperatura: Temperatura;
  status: string;
  nota?: string;
  origem?: string;
  utm?: Record<string, string>;
  referrer?: string;
  jaExisteNoCrm: boolean;
}

export interface ListaFormulario {
  novos: LeadFormulario[];
  noFunil: LeadFormulario[];
  // Existe mais lead do que coube na leitura. A tela avisa em vez de fingir
  // que acabou.
  temMais: boolean;
}

export interface ResultadoImportacaoFormulario {
  importados: number;
  duplicados: number;
  contatos: Contato[];
  idsImportados: string[];
  avisoStatus?: string;
  listas: ListaFormulario;
}

export class ErroApiFormulario extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApiFormulario";
    this.status = status;
  }
}

async function lerResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo.erro) mensagem = corpo.erro;
    } catch {
      // Mantém a mensagem HTTP quando a resposta não é JSON.
    }
    throw new ErroApiFormulario(mensagem, resposta.status);
  }
  return (await resposta.json()) as T;
}

async function pedir<T>(url: string, opcoes: RequestInit = {}): Promise<T> {
  try {
    const resposta = await fetch(url, {
      ...opcoes,
      headers: {
        ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
        // Importar grava no CRM. A aba se identifica pelo mesmo cabeçalho das
        // gravações do CRM pra não recarregar por causa do próprio import.
        ...(opcoes.method && opcoes.method !== "GET"
          ? { [CABECALHO_ABA]: ID_DESTA_ABA }
          : {}),
        ...opcoes.headers,
      },
    });
    return await lerResposta<T>(resposta);
  } catch (erro) {
    if (erro instanceof ErroApiFormulario) throw erro;
    throw new ErroApiFormulario("Servidor fora do ar.", 0);
  }
}

export function obterLeadsFormulario(): Promise<ListaFormulario> {
  return pedir<ListaFormulario>("/api/formulario/leads");
}

export function importarLeadsFormulario(
  ids: string[],
): Promise<ResultadoImportacaoFormulario> {
  return pedir<ResultadoImportacaoFormulario>("/api/formulario/importar", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

// O campo whatsapp é texto livre: a pessoa digita como quiser. Limpa pra dígito,
// e prefixa 55 quando o número tem cara de brasileiro sem DDI.
export function linkWhatsapp(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, "");
  if (!digitos) return null;
  const numero =
    digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  // Abaixo disso não é telefone, é engano de digitação.
  if (numero.length < 12) return null;
  return `https://wa.me/${numero}`;
}
