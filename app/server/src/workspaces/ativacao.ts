// Ativacao de workspace: a costura entre o registro e a ponte VKOS.
// Trocar de workspace significa apontar a pasta VKOS ativa (config.json), religar
// o observador de pecas e avisar o frontend pelo WebSocket. Fica aqui pra o POST
// /vkos e as rotas de workspace reusarem a mesma sequencia.

import { definirPastaVkos } from "../vkos/estado.js";
import { reinstalarObservador } from "../vkos/pecas.js";
import { invalidarCacheContextos } from "../contextos/armazenamento.js";
import { transmitir } from "../ws.js";
import {
  adicionarWorkspace,
  lerRegistro,
  marcarAtivo,
  workspacePorId,
  workspacePorPasta,
  type RegistroWorkspaces,
} from "./estado.js";

// Ativa um workspace pelo id. Devolve o registro atualizado, ou null se o id nao
// existe. Aponta a pasta VKOS, religa o observador e transmite workspace:ativado.
export function ativarPorId(id: string): RegistroWorkspaces | null {
  const ws = workspacePorId(id);
  if (!ws) return null;
  definirPastaVkos(ws.pasta);
  // A pasta VKOS mudou: religa o observador na nova pasta conteudo.
  reinstalarObservador();
  // Descarta o cache de contextos do workspace que entra: o disco pode ter mudado
  // enquanto ele estava inativo, entao o proximo acesso rele da fonte da verdade.
  invalidarCacheContextos(id);
  marcarAtivo(id);
  transmitir({ tipo: "workspace:ativado", id });
  return lerRegistro();
}

// Garante um workspace pra uma pasta (acha ou cria) e ativa. Usado pelo POST
// /vkos pra o onboarding existente continuar registrando/ativando o workspace.
export function registrarEAtivar(pasta: string, nome?: string): RegistroWorkspaces {
  let ws = workspacePorPasta(pasta);
  if (!ws) {
    ws = adicionarWorkspace(pasta, nome);
  }
  ativarPorId(ws.id);
  return lerRegistro();
}
