// Laco de conformidade pos-geracao de anuncio. Espelho de
// sessoes/conformidade-site.ts: mesmo desenho, mesmo teto de 2 voltas, e os
// mesmos consertos de robustez de 2026-07-17 (laco nunca preso, trava de
// reentrancia por sessao, retomada que vira turno interno na transcricao). O
// que muda e O QUE SE CONFERE.
//
// Quando uma sessao de anuncio conclui, o servidor le o anuncio.json da pasta
// alvo e roda o schema de modelo.ts. Arquivo ausente, JSON ilegivel ou forma
// reprovada retomam a MESMA sessao com o erro literal, dizendo qual campo e o
// que se esperava. Sessao nova nunca: a exclusao mutua global de geracao guiada
// continua respeitada.
//
// VIOLACAO DE LIMITE DE CARACTERE NAO DISPARA O LACO, E ISSO E DECISAO TOMADA.
//
// Um titulo de 31 caracteres e conteudo, nao defeito de forma: a campanha
// inteira continua legivel, a tela marca aquele campo em alerta com a contagem,
// e o dono corrige pelo chat ou na mao em dois segundos. Fazer a IA girar duas
// voltas inteiras pra tirar um caractere e gastar dinheiro num trabalho de dois
// segundos. Quem for "consertar" isso depois: limites.ts continua sendo a fonte
// das violacoes, e violacao e pra ser EXIBIDA, nunca corrigida por laco. O
// proprio prompt de correcao diz isso pra IA, pra ela nao reescrever titulo bom
// enquanto conserta a forma.
//
// Este modulo nao conhece o gerenciador nem o disco: recebe tudo por injecao
// (deps). Isso deixa o laco testavel com fakes e mantem a regra num lugar so.

import { SKILL_ANUNCIO } from "../sessoes/geracao-anuncio.js";
import type { ConferenciaSite, Sessao, StatusSessao } from "../tipos.js";

// Teto de voltas de correcao. Depois disso, para e deixa pendencias: a peca
// existe em disco, mas com forma quebrada, e ninguem a apresenta como pronta.
export const MAX_VOLTAS_ANUNCIO = 2;

// Resultado de uma leitura do anuncio.json, do ponto de vista do laco.
export interface ResultadoConformidadeAnuncio {
  valido: boolean;
  // O erro literal, ja em portugues por descreverErroDeForma. Ausente quando
  // valido. E este texto que vai inteiro pro prompt de correcao: dizer "o JSON
  // esta errado" sem dizer o campo faz a IA reescrever a campanha no chute.
  erro?: string;
}

export interface DepsConformidadeAnuncio {
  // Le o anuncio.json da pasta alvo da sessao e roda o schema.
  validar: (sessao: Sessao) => ResultadoConformidadeAnuncio;
  // Retoma a MESMA sessao com o prompt de correcao (via --resume).
  retomar: (id: string, prompt: string) => { ok: boolean; erro?: string };
  // Atualiza o campo de conferencia da sessao e emite no WS.
  definirConferencia: (id: string, conferencia: ConferenciaSite) => void;
  // Status atual da sessao. Se ela morreu ou foi parada, nao retoma.
  statusSessao: (id: string) => StatusSessao | undefined;
}

// Skills que rodam ESTE laco. So a geracao de anuncio.
//
// O conjunto e proprio, e nao um terceiro item nas listas de
// conformidade-site.ts, pelo mesmo motivo que separou aquelas duas: peca de
// anuncio nao tem index.html pra auditar e peca de site nao tem anuncio.json
// pra validar. Uma lista so faria a proxima skill cair no laco errado por
// tabela.
//
// conversa-anuncio fica de fora, e por dois motivos. Ela nem chegaria aqui:
// nao esta em SKILLS_COM_CONFERENCIA, entao a sessao dela nunca guarda
// pastaAlvo. E o motivo de fundo: aquele chat e do dono, com a tela aberta na
// frente dele. Se a IA errar a forma ali, ele ve na hora e responde na mesma
// conversa. Laco automatico gastaria credito por cima de uma pessoa que ja esta
// olhando.
const SKILLS_DO_LACO_ANUNCIO = new Set<string>([SKILL_ANUNCIO]);

export function skillPassaPeloLacoAnuncio(skill: unknown): boolean {
  return typeof skill === "string" && SKILLS_DO_LACO_ANUNCIO.has(skill);
}

// Condicao de disparo: skill de anuncio com pastaAlvo. A pastaAlvo vem do corpo
// da requisicao e ja passou pela barreira resolverPeca, porque no anuncio quem
// cria a pasta e o Hub, antes de disparar.
export function deveDispararLacoAnuncio(sessao: Sessao): boolean {
  return skillPassaPeloLacoAnuncio(sessao.skill)
    && typeof sessao.pastaAlvo === "string"
    && sessao.pastaAlvo.length > 0;
}

// Status em que retomar nao faz sentido. "parada" e o usuario mandando parar;
// "erro" e a sessao que morreu no meio de uma volta. Nos dois casos o laco
// grava pendencias e sai, em vez de insistir numa conversa que acabou.
const STATUS_SEM_RETOMADA = new Set<StatusSessao>(["parada", "erro"]);

// Mensagem de reserva. So aparece se a validacao reprovar sem dizer o motivo,
// o que nao deveria acontecer: prompt de correcao sem o erro literal e a IA
// chutando o que consertar.
const ERRO_SEM_DETALHE = "O anuncio.json não está no formato esperado.";

// Prompt de correcao: curto, cirurgico, com o erro literal do schema. As duas
// ultimas linhas existem pra proteger o que ja esta certo: a volta anterior
// custou credito e nao pode virar desculpa pra reescrever a campanha inteira.
export function montarPromptCorrecaoAnuncio(erro: string): string {
  return [
    "A conferência automática do Hub reprovou o anuncio.json desta campanha. O arquivo precisa passar no contrato que foi combinado no começo da conversa.",
    "",
    `- ${erro}`,
    "",
    "Corrija EXATAMENTE isso e nada mais. Não refaça a estratégia, não troque títulos, descrições ou palavras-chave que já estão lá, e não crie nenhum arquivo além do anuncio.json.",
    "Regrave o anuncio.json inteiro na pasta atual, como um JSON válido, com todos os campos do contrato.",
    "Tamanho de texto não é assunto desta volta: se algum título passar de 30 caracteres ou alguma descrição passar de 90, deixe como está. Quem decide isso é o dono, na tela.",
  ].join("\n");
}

// Estado interno por sessao. volta = quantas correcoes ja foram mandadas.
// emAndamento = trava de reentrancia (nunca duas voltas simultaneas da peca).
interface EstadoLaco {
  volta: number;
  emAndamento: boolean;
}

export interface LacoAnuncio {
  // Chamado pelo gerenciador quando uma sessao conclui. Faz UM passo do laco:
  // valida e, se preciso, dispara a proxima correcao. O passo seguinte vem da
  // proxima conclusao (a retomada volta a concluir e reentra aqui).
  aoConcluir: (sessao: Sessao) => Promise<void>;
  // Limpa o estado interno de uma sessao (ao remover a sessao).
  esquecer: (id: string) => void;
}

export function criarLacoAnuncio(deps: DepsConformidadeAnuncio): LacoAnuncio {
  const estados = new Map<string, EstadoLaco>();

  async function aoConcluir(sessao: Sessao): Promise<void> {
    if (!deveDispararLacoAnuncio(sessao)) return;

    const estado = estados.get(sessao.id) ?? { volta: 0, emAndamento: false };
    if (estado.emAndamento) return; // reentrancia: ja tem uma volta rodando
    estado.emAndamento = true;
    estados.set(sessao.id, estado);

    try {
      deps.definirConferencia(sessao.id, { estado: "conferindo", volta: estado.volta });
      const resultado = deps.validar(sessao);

      if (resultado.valido) {
        deps.definirConferencia(sessao.id, { estado: "aprovada", volta: estado.volta });
        return;
      }
      // Reprovou. Chegou no teto: para e deixa pendencias. A peca em disco
      // continua quebrada, e e por isso que a lista de pecas a marca invalida:
      // pendencia aqui nunca pode virar campanha pronta na tela.
      if (estado.volta >= MAX_VOLTAS_ANUNCIO) {
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
        return;
      }
      // A sessao morreu ou foi parada nesse meio tempo: nao retoma.
      const status = deps.statusSessao(sessao.id);
      if (status !== undefined && STATUS_SEM_RETOMADA.has(status)) {
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
        return;
      }

      const proximaVolta = estado.volta + 1;
      deps.definirConferencia(sessao.id, { estado: "corrigindo", volta: proximaVolta });
      const retomada = deps.retomar(
        sessao.id,
        montarPromptCorrecaoAnuncio(resultado.erro ?? ERRO_SEM_DETALHE),
      );
      if (!retomada.ok) {
        // Nao deu pra retomar (ex: sessao sem id de conversa). Registra e para.
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
        return;
      }
      estado.volta = proximaVolta;
      // A proxima conclusao da retomada reentra em aoConcluir e continua o laco.
    } catch (erro) {
      // Qualquer excecao no corpo (IO, disco cheio, bug) nao pode deixar a peca
      // presa em "conferindo": grava pendencias e loga o motivo em vez de
      // engolir. A tela le a peca do disco e diz a verdade de qualquer jeito.
      const motivo = erro instanceof Error ? erro.message : String(erro);
      console.error(
        `Conferencia do anuncio da sessao ${sessao.id} falhou: ${motivo}`,
      );
      try {
        deps.definirConferencia(sessao.id, { estado: "pendencias", volta: estado.volta });
      } catch {
        // Nem o registro de pendencias pode derrubar o fechamento da sessao.
      }
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
