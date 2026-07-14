import type { StatusSessao } from "../tipos/dominio";

interface InfoStatus {
  rotulo: string;
  // Classe css aplicada no badge, define a cor.
  classe: string;
  // Se o status representa uma sessao em andamento (conta pro limite de 5).
  ativa: boolean;
}

export const INFO_STATUS: Record<StatusSessao, InfoStatus> = {
  fila: { rotulo: "Na fila", classe: "status-fila", ativa: true },
  iniciando: { rotulo: "Iniciando", classe: "status-iniciando", ativa: true },
  rodando: { rotulo: "Rodando", classe: "status-rodando", ativa: true },
  concluida: { rotulo: "Concluída", classe: "status-concluida", ativa: false },
  erro: { rotulo: "Erro", classe: "status-erro", ativa: false },
  parada: { rotulo: "Parada", classe: "status-parada", ativa: false },
};
