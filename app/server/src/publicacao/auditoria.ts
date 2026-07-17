// Auditoria completa de uma peca de site antes de virar publica. Combina a
// auditoria estrutural (arquivos, caminhos, marcadores) com a conferencia visual
// no navegador (Playwright, 390px e 1440px), com cache curto por versao dos
// arquivos. Extraida de publicacao/rotas.ts pra ser reutilizada pelo laco de
// conformidade pos-geracao (sessoes/conformidade-site.ts) sem duplicar regra.

import {
  auditarPecaParaPublicacao,
  versaoPecaParaPublicacao,
} from "./arquivos.js";
import { auditarSiteNoNavegador } from "./auditoriaVisual.js";

export interface AlvoPublicacao {
  workspaceId: string;
  pasta: string;
}

export type AuditoriaPublicacao = ReturnType<typeof auditarPecaParaPublicacao>;

const cacheAuditoria = new Map<string, { expiraEm: number; valor: AuditoriaPublicacao }>();
const DURACAO_CACHE_AUDITORIA = 2 * 60_000;

// URL local da peca servida pelo proprio Hub, base da conferencia visual.
function urlDaPeca(host: string, pasta: string): string {
  return `http://${host}/pecas/${encodeURIComponent(pasta)}`;
}

// Auditoria completa usada pelas rotas de publicacao. Mantem o cache por versao
// e o formato historico do resultado (mesmas mensagens de erro). Comportamento
// identico ao que vivia em rotas.ts; so o parametro mudou de req pra host.
export async function auditarSitePublicavel(
  alvo: AlvoPublicacao,
  host: string | undefined,
): Promise<AuditoriaPublicacao> {
  const auditoria = auditarPecaParaPublicacao(alvo.workspaceId, alvo.pasta);
  if (!auditoria.valido) return auditoria;
  const versao = versaoPecaParaPublicacao(alvo.workspaceId, alvo.pasta);
  const chaveCache = `${alvo.workspaceId}:${alvo.pasta}:${versao}`;
  const emCache = cacheAuditoria.get(chaveCache);
  if (emCache && emCache.expiraEm > Date.now()) return emCache.valor;
  if (!host) {
    return {
      ...auditoria,
      valido: false,
      erros: [
        ...auditoria.erros,
        "Não foi possível montar a URL local para conferir o site.",
      ],
    };
  }
  const visual = await auditarSiteNoNavegador(
    urlDaPeca(host, alvo.pasta),
    auditoria.paginas,
  );
  if (!visual.executada) {
    return {
      ...auditoria,
      valido: false,
      erros: [
        ...auditoria.erros,
        `Não foi possível fazer a conferência visual antes do deploy. ${visual.avisos.join(" ")}`,
      ],
      avisos: [...auditoria.avisos, ...visual.avisos],
    };
  }
  const resultado = {
    ...auditoria,
    valido: visual.erros.length === 0,
    erros: [...auditoria.erros, ...visual.erros],
    avisos: [...auditoria.avisos, ...visual.avisos],
  };
  if (cacheAuditoria.size >= 32) cacheAuditoria.clear();
  cacheAuditoria.set(chaveCache, {
    expiraEm: Date.now() + DURACAO_CACHE_AUDITORIA,
    valor: resultado,
  });
  return resultado;
}

// Resultado da conferencia pro laco de conformidade. Separa o sinal que o laco
// precisa: verificavel diz se deu pra conferir de verdade. Quando o navegador do
// sistema nao esta disponivel, verificavel e false e o laco NAO manda corrigir,
// porque nao ha como confirmar o problema nem a correcao.
export interface ConferenciaConformidade {
  verificavel: boolean;
  valido: boolean;
  erros: string[];
  avisos: string[];
}

// Conferencia sem cache pro laco: cada volta muda os arquivos, entao a leitura
// precisa ser sempre fresca. Roda a auditoria estrutural e, se ela passar, a
// visual no navegador.
export async function conferirSiteParaConformidade(
  alvo: AlvoPublicacao,
  host: string | undefined,
): Promise<ConferenciaConformidade> {
  const estrutural = auditarPecaParaPublicacao(alvo.workspaceId, alvo.pasta);
  if (!estrutural.valido) {
    // A auditoria estrutural rodou e reprovou: acionavel e verificavel.
    return {
      verificavel: true,
      valido: false,
      erros: estrutural.erros,
      avisos: estrutural.avisos,
    };
  }
  if (!host) {
    return { verificavel: false, valido: false, erros: [], avisos: estrutural.avisos };
  }
  const visual = await auditarSiteNoNavegador(
    urlDaPeca(host, alvo.pasta),
    estrutural.paginas,
  );
  if (!visual.executada) {
    return {
      verificavel: false,
      valido: false,
      erros: [],
      avisos: [...estrutural.avisos, ...visual.avisos],
    };
  }
  return {
    verificavel: true,
    valido: visual.erros.length === 0,
    erros: [...estrutural.erros, ...visual.erros],
    avisos: [...estrutural.avisos, ...visual.avisos],
  };
}
