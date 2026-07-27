// Auditoria completa de uma peca de site antes de virar publica. Combina a
// auditoria estrutural (arquivos, caminhos, marcadores) com a conferencia visual
// no navegador (Playwright, 390px e 1440px), com cache curto por versao dos
// arquivos. Fonte unica de conferencia: o deploy e o laco de conformidade
// pos-geracao (sessoes/gerenciador.ts) chamam o MESMO nucleo, pelo MESMO host
// resolvido no server, entao nunca podem divergir.

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

interface EntradaCache {
  expiraEm: number;
  valido: boolean;
  erros: string[];
  avisos: string[];
}

const cacheAuditoria = new Map<string, EntradaCache>();
const DURACAO_CACHE_AUDITORIA = 2 * 60_000;
const LIMITE_CACHE = 32;

// URL local da peca servida pelo proprio Hub, base da conferencia visual.
function urlDaPeca(host: string, pasta: string): string {
  return `http://${host}/pecas/${encodeURIComponent(pasta)}`;
}

// Host local canonico do Hub, base da conferencia visual pros DOIS caminhos
// (deploy e laco). Segue a porta real (VKOS_PORT no QA, 4600 no produto), o
// mesmo host que as rotas usam. Resolvido no server, nunca a partir do header
// da requisicao, pra que deploy e laco confiram exatamente a MESMA URL.
export function hostLocalDoHub(): string {
  const porta = process.env.VKOS_PORT?.trim() || "4600";
  return `127.0.0.1:${porta}`;
}

function chaveCache(alvo: AlvoPublicacao, versao: string): string {
  return `${alvo.workspaceId}:${alvo.pasta}:${versao}`;
}

// Invalida o cache de conferencia da peca (todas as versoes). O laco chama isto
// ao terminar cada volta, pra o painel de deploy nao servir um veredito velho
// logo depois de a correcao mudar os arquivos. Assinatura granular
// (workspaceId, pasta) pra casar com o chamador do lado das sessoes.
export function invalidarCacheAuditoria(workspaceId: string, pasta: string): void {
  const prefixo = `${workspaceId}:${pasta}:`;
  for (const chave of [...cacheAuditoria.keys()]) {
    if (chave.startsWith(prefixo)) cacheAuditoria.delete(chave);
  }
}

function guardarNoCache(
  alvo: AlvoPublicacao,
  versao: string,
  entrada: Omit<EntradaCache, "expiraEm">,
): void {
  // Evict simples da entrada mais velha (o Map mantem ordem de insercao) em vez
  // de limpar o cache inteiro.
  if (cacheAuditoria.size >= LIMITE_CACHE) {
    const maisVelha = cacheAuditoria.keys().next().value;
    if (maisVelha !== undefined) cacheAuditoria.delete(maisVelha);
  }
  cacheAuditoria.set(chaveCache(alvo, versao), {
    expiraEm: Date.now() + DURACAO_CACHE_AUDITORIA,
    ...entrada,
  });
}

// Resultado da conferencia. Separa o sinal que o laco precisa: verificavel diz
// se deu pra conferir de verdade. Quando o navegador do sistema nao esta
// disponivel, verificavel e false e o laco NAO manda corrigir, porque nao ha
// como confirmar o problema nem a correcao. `estrutura` carrega o resultado
// estrutural cru pro caminho de deploy montar sua resposta historica.
export interface ResultadoConferencia {
  verificavel: boolean;
  valido: boolean;
  erros: string[];
  avisos: string[];
  estrutura: AuditoriaPublicacao;
}

export interface OpcoesConferencia {
  // Host que serve as pecas. Sem valor, cai no host local canonico do Hub.
  host?: string;
  // Cache de 2 min por versao dos arquivos. O deploy usa; o laco nao (cada volta
  // muda os arquivos, entao a leitura precisa ser sempre fresca).
  usarCache?: boolean;
}

// Nucleo unico de conferencia, usado pelo deploy e pelo laco. Roda a auditoria
// estrutural e, se ela passar, a conferencia visual no navegador pelo mesmo host
// resolvido no server. O cache so entra quando usarCache e true.
export async function conferirPeca(
  alvo: AlvoPublicacao,
  opcoes: OpcoesConferencia = {},
): Promise<ResultadoConferencia> {
  const host = opcoes.host?.trim() || hostLocalDoHub();
  const estrutura = auditarPecaParaPublicacao(alvo.workspaceId, alvo.pasta);
  if (!estrutura.valido) {
    // A auditoria estrutural rodou e reprovou: acionavel e verificavel.
    return {
      verificavel: true,
      valido: false,
      erros: estrutura.erros,
      avisos: estrutura.avisos,
      estrutura,
    };
  }

  const versao = versaoPecaParaPublicacao(alvo.workspaceId, alvo.pasta);
  if (opcoes.usarCache) {
    const emCache = cacheAuditoria.get(chaveCache(alvo, versao));
    if (emCache && emCache.expiraEm > Date.now()) {
      return {
        verificavel: true,
        valido: emCache.valido,
        erros: emCache.erros,
        avisos: emCache.avisos,
        estrutura,
      };
    }
  }

  const visual = await auditarSiteNoNavegador(urlDaPeca(host, alvo.pasta), estrutura.paginas);
  if (!visual.executada) {
    return {
      verificavel: false,
      valido: false,
      erros: [],
      avisos: [...estrutura.avisos, ...visual.avisos],
      estrutura,
    };
  }

  const resultado: ResultadoConferencia = {
    verificavel: true,
    valido: visual.erros.length === 0,
    erros: [...estrutura.erros, ...visual.erros],
    avisos: [...estrutura.avisos, ...visual.avisos],
    estrutura,
  };
  if (opcoes.usarCache) {
    guardarNoCache(alvo, versao, {
      valido: resultado.valido,
      erros: resultado.erros,
      avisos: resultado.avisos,
    });
  }
  return resultado;
}

// Auditoria completa usada pelas rotas de publicacao. Mantem o cache por versao
// e o formato historico do resultado (mesmas mensagens de erro). O host e
// resolvido no server (hostLocalDoHub), o mesmo do laco.
export async function auditarSitePublicavel(
  alvo: AlvoPublicacao,
  host?: string,
): Promise<AuditoriaPublicacao & { verificavel: boolean }> {
  const conferencia = await conferirPeca(alvo, { host, usarCache: true });
  return {
    ...conferencia.estrutura,
    // verificavel diz se a conferencia visual chegou a rodar. Sem navegador no
    // sistema ela nao roda, e o resultado sai com valido false e erros vazio.
    // Descartar esse campo aqui transformava "nao deu pra conferir" em "site
    // reprovado sem motivo", e travava a exportacao sem saida nenhuma.
    verificavel: conferencia.verificavel,
    valido: conferencia.valido,
    erros: conferencia.erros,
    avisos: conferencia.avisos,
  };
}

// Resultado da conferencia pro laco de conformidade. Mesma forma historica, sem
// o campo estrutura interno.
export interface ConferenciaConformidade {
  verificavel: boolean;
  valido: boolean;
  erros: string[];
  avisos: string[];
}

// Conferencia sem cache pro laco: cada volta muda os arquivos, entao a leitura
// precisa ser sempre fresca. Mesmo nucleo e mesmo host do deploy.
export async function conferirSiteParaConformidade(
  alvo: AlvoPublicacao,
  host?: string,
): Promise<ConferenciaConformidade> {
  const conferencia = await conferirPeca(alvo, { host, usarCache: false });
  return {
    verificavel: conferencia.verificavel,
    valido: conferencia.valido,
    erros: conferencia.erros,
    avisos: conferencia.avisos,
  };
}
