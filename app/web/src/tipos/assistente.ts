// Ponte de tipos do Assistente entre o web e o servidor.
// O contrato de tarefa e o rastro têm uma fonte única no backend.

import type {
  ConversaAssistente as ConversaAssistenteDoServidor,
} from "../../../server/src/assistente/conversas";
import type {
  EntradaRastro as EntradaRastroDoServidor,
} from "../../../server/src/assistente/rastro";
import type {
  Tarefa as TarefaDoServidor,
} from "../../../server/src/assistente/tarefa";

export type ConversaAssistente = ConversaAssistenteDoServidor;
export type EntradaRastroAssistente = EntradaRastroDoServidor;
export type TarefaAssistente = TarefaDoServidor;
export type EstadoTarefa = TarefaDoServidor["estado"];
