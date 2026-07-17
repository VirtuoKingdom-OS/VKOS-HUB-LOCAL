// Laco de conformidade pos-geracao de site. Quando uma sessao de geracao de site
// conclui, roda a auditoria completa do deploy na peca; se reprovar com erros
// acionaveis, retoma a MESMA sessao com um prompt curto e cirurgico pra corrigir
// so os pontos apontados; audita de novo. No maximo 2 voltas de correcao. O
// prompt sozinho nao segura a qualidade, a arquitetura confere e manda corrigir.
//
// Este modulo nao conhece o gerenciador nem o navegador: recebe tudo por injecao
// (deps). Isso deixa o laco testavel com fakes e mantem a regra de negocio num
// lugar so.

import type { ConferenciaSite, Sessao, StatusSessao } from "../tipos.js";

// Teto de voltas de correcao. Depois disso, para e deixa as pendencias
// registradas: a TelaSite mostra e a barreira de publicacao bloqueia.
export const MAX_VOLTAS_CORRECAO = 2;

// Resultado de uma rodada de auditoria, do ponto de vista do laco.
export interface ResultadoConferencia {
  // false quando nao deu pra conferir de verdade (navegador do sistema ausente).
  verificavel: boolean;
  valido: boolean;
  erros: string[];
  avisos?: string[];
}

export interface DepsConformidade {
  // Roda a auditoria completa (estrutural + visual) na peca da sessao.
  auditar: (sessao: Sessao) => Promise<ResultadoConferencia>;
  // Retoma a MESMA sessao com o prompt de correcao (via --resume). Sessao nova
  // nunca: a exclusao mutua global de geracao guiada continua respeitada.
  retomar: (id: string, prompt: string) => { ok: boolean; erro?: string };
  // Atualiza o campo de conferencia da sessao e emite no WS.
  definirConferencia: (id: string, conferencia: ConferenciaSite) => void;
  // A pastaAlvo existe como peca de site (index.html, sem carrossel.html).
  ehPecaSite: (sessao: Sessao) => boolean;
  // Status atual da sessao. Se ela foi parada pelo usuario, nao retoma.
  statusSessao: (id: string) => StatusSessao | undefined;
}

// Condicao de disparo: skill "site" com pastaAlvo. Ajuste de peca e carrossel nao
// tem pastaAlvo, entao nao entram. So a geracao guiada de site do wizard preenche.
export function deveDispararLaco(sessao: Sessao): boolean {
  return sessao.skill === "site" && typeof sessao.pastaAlvo === "string" && sessao.pastaAlvo.length > 0;
}

// Prompt de correcao: curto, cirurgico, com a lista literal dos erros da auditoria.
// Cabecalho e rodape somam pouco; o custo por volta e dominado por reler o site.
export function montarPromptCorrecao(erros: string[], avisos: string[] = []): string {
  const lista = erros.map((erro) => `- ${erro}`).join("\n");
  const revisaoAvisos = avisos.length > 0
    ? [
        "",
        "Também revise estes avisos da conferência. Corrija quando a causa existir; não apenas esconda ou renomeie seletores:",
        avisos.map((aviso) => `- ${aviso}`).join("\n"),
      ]
    : [];
  return [
    "A conferência automática do Hub reprovou o site. Corrija EXATAMENTE os pontos abaixo e nada mais. Não redesenhe, não troque conteúdo, não mexa em outras partes.",
    "",
    lista,
    ...revisaoAvisos,
    "",
    "Depois de corrigir, confira você mesmo cada ponto acima antes de terminar: em 390px de largura nada pode vazar, o contraste precisa passar e nenhum wrapper genérico pode envolver o body.",
  ].join("\n");
}

// Estado interno por sessao. volta = quantas correcoes ja foram mandadas.
// emAndamento = trava de reentrancia (nunca duas voltas simultaneas da peca).
interface EstadoLaco {
  volta: number;
  emAndamento: boolean;
}

export interface LacoConformidade {
  // Chamado pelo gerenciador quando uma sessao conclui. Faz UM passo do laco:
  // audita e, se preciso, dispara a proxima correcao. O passo seguinte vem da
  // proxima conclusao (a retomada volta a concluir e reentra aqui).
  aoConcluir: (sessao: Sessao) => Promise<void>;
  // Limpa o estado interno de uma sessao (ao remover a sessao).
  esquecer: (id: string) => void;
}

export function criarLacoConformidade(deps: DepsConformidade): LacoConformidade {
  const estados = new Map<string, EstadoLaco>();

  async function aoConcluir(sessao: Sessao): Promise<void> {
    if (!deveDispararLaco(sessao)) return;
    if (!deps.ehPecaSite(sessao)) return;

    const estado = estados.get(sessao.id) ?? { volta: 0, emAndamento: false };
    if (estado.emAndamento) return; // reentrancia: ja tem uma volta rodando
    estado.emAndamento = true;
    estados.set(sessao.id, estado);

    try {
      deps.definirConferencia(sessao.id, { estado: "conferindo", volta: estado.volta });
      const resultado = await deps.auditar(sessao);

      // Navegador ausente: nao da pra confirmar problema nem correcao. Registra
      // as pendencias e para, sem retomar. A barreira do deploy segue conferindo.
      if (!resultado.verificavel) {
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
        return;
      }
      if (resultado.valido) {
        deps.definirConferencia(sessao.id, { estado: "aprovada", volta: estado.volta });
        return;
      }
      // Reprovou com erros acionaveis. Chegou no teto: para e deixa pendencias.
      if (estado.volta >= MAX_VOLTAS_CORRECAO) {
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
        return;
      }
      // A sessao foi parada pelo usuario nesse meio tempo: nao retoma.
      const status = deps.statusSessao(sessao.id);
      if (status === "parada") {
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
        return;
      }

      const proximaVolta = estado.volta + 1;
      deps.definirConferencia(sessao.id, { estado: "corrigindo", volta: proximaVolta });
      const retomada = deps.retomar(
        sessao.id,
        montarPromptCorrecao(resultado.erros, resultado.avisos ?? []),
      );
      if (!retomada.ok) {
        // Nao deu pra retomar (ex: sessao sem id de conversa). Registra e para.
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
        return;
      }
      estado.volta = proximaVolta;
      // A proxima conclusao da retomada reentra em aoConcluir e continua o laco.
    } finally {
      estado.emAndamento = false;
      estados.set(sessao.id, estado);
    }
  }

  function esquecer(id: string): void {
    estados.delete(id);
  }

  return { aoConcluir, esquecer };
}
