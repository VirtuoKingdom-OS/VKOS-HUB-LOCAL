// Regras do CRM ao vivo, do lado da tela.
//
// Fica separado do TelaCrm.tsx por um motivo pratico: o teste do web roda em
// `tsx --test`, sem DOM, entao a decisao de recarregar so pode ser provada se
// for funcao pura. E o que precisa de prova aqui nao e "a mensagem chegou", e
// "a mensagem chegou e a recarga NAO passou por cima do que estava sendo
// digitado".
//
// O sincronizador guarda o que ficou pendente e devolve a recarga so quando a
// aba pode aplicar. Quem adia:
//
// - editando: o cursor esta num campo de texto do CRM. Recarregar agora e o
//   unico jeito de perder o que a pessoa esta escrevendo, e nenhuma atualizacao
//   de outra aba vale isso. A pendencia NAO se perde: ela espera.
// - gravando: uma gravacao desta aba ainda nao voltou. Ler no meio traz o
//   estado de antes dela e o campo volta sozinho pro valor velho.
//
// E quem nem chega a virar pendencia: o aviso da propria aba. Ela ja aplicou a
// mudanca com a resposta do proprio PATCH, entao recarregar por causa dela e
// trabalho jogado fora a cada tecla salva.

export type EscopoAviso = "funil" | "interacoes" | "tudo";

export interface AvisoCrm {
  escopo: EscopoAviso;
  // So no escopo interacoes: de qual contato a linha do tempo mudou.
  contatoId?: string;
  // Qual aba gravou. Ausente quando o aviso nao veio de uma gravacao (o caso da
  // reconexao, que ninguem originou).
  origem?: string;
}

export interface SituacaoDaAba {
  editando: boolean;
  gravando: boolean;
}

export interface Recarga {
  // Reler GET /crm: colunas, contatos, negocios, orcamentos, tarefas.
  funil: boolean;
  // Reler GET /crm/interacoes/ultimas, que alimenta o bloco "Esfriando".
  ultimasInteracoes: boolean;
  // Contatos cuja linha do tempo mudou. Ficha aberta de outro contato nao
  // precisa reler nada.
  linhaDoTempoDe: string[];
  // Reconexao: nao da pra saber quem mudou enquanto o socket esteve fora, entao
  // qualquer ficha aberta rele.
  linhaDoTempoDeTodos: boolean;
}

export interface Sincronizador {
  // Registra um aviso. Aviso da propria aba e descartado.
  receber(aviso: AvisoCrm): void;
  // Ha recarga guardada esperando a hora certa.
  pendente(): boolean;
  // Devolve a recarga e zera a pendencia, ou null quando ainda nao da.
  // Devolver null NUNCA perde o que estava pendente.
  tomar(situacao: SituacaoDaAba): Recarga | null;
}

function vazia(): Recarga {
  return {
    funil: false,
    ultimasInteracoes: false,
    linhaDoTempoDe: [],
    linhaDoTempoDeTodos: false,
  };
}

function temAlgo(recarga: Recarga): boolean {
  return (
    recarga.funil ||
    recarga.ultimasInteracoes ||
    recarga.linhaDoTempoDeTodos ||
    recarga.linhaDoTempoDe.length > 0
  );
}

export function criarSincronizador(idDestaAba: string): Sincronizador {
  let acumulada = vazia();

  return {
    receber(aviso: AvisoCrm): void {
      if (aviso.origem && aviso.origem === idDestaAba) return;

      if (aviso.escopo === "tudo") {
        acumulada.funil = true;
        acumulada.ultimasInteracoes = true;
        acumulada.linhaDoTempoDeTodos = true;
        return;
      }

      if (aviso.escopo === "funil") {
        acumulada.funil = true;
        return;
      }

      // interacoes: o historico cresceu. O funil so teve o carimbo do contato
      // mexido, que a tela nem desenha, entao nao vale reler o funil inteiro.
      acumulada.ultimasInteracoes = true;
      if (aviso.contatoId && !acumulada.linhaDoTempoDe.includes(aviso.contatoId)) {
        acumulada.linhaDoTempoDe.push(aviso.contatoId);
      }
    },

    pendente(): boolean {
      return temAlgo(acumulada);
    },

    tomar(situacao: SituacaoDaAba): Recarga | null {
      if (!temAlgo(acumulada)) return null;
      if (situacao.editando || situacao.gravando) return null;
      const recarga = acumulada;
      acumulada = vazia();
      return recarga;
    },
  };
}

// A ficha aberta precisa reler a linha do tempo por causa desta recarga.
export function relerLinhaDoTempo(recarga: Recarga, contatoAberto: string | null): boolean {
  if (!contatoAberto) return false;
  return recarga.linhaDoTempoDeTodos || recarga.linhaDoTempoDe.includes(contatoAberto);
}
