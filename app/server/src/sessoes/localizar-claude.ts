// Resolve onde esta o binario do Claude Code nesta maquina.
// O CLI pode estar fora do PATH em algumas instalacoes Windows. Aqui achamos
// o caminho real antes de iniciar o processo.

import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ClaudeLocalizado {
  // Caminho ou nome do executavel a passar pro spawn.
  binario: string;
  // Se true, precisa rodar via shell (caso de .cmd/.bat ou fallback pelo PATH).
  usarShell: boolean;
}

// Monta a lista de candidatos na ordem de preferencia.
function candidatos(): string[] {
  const ehWindows = process.platform === "win32";
  const casa = os.homedir();
  const lista: (string | undefined)[] = [
    // Override explicito, sempre ganha.
    process.env.VKOS_CLAUDE_BIN,
    // Instalacao nativa comum.
    path.join(casa, ".local", "bin", ehWindows ? "claude.exe" : "claude"),
    // Instalacao via npm global no Windows.
    ehWindows && process.env.APPDATA
      ? path.join(process.env.APPDATA, "npm", "claude.cmd")
      : undefined,
    // App Store / WindowsApps.
    ehWindows && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Microsoft", "WindowsApps", "claude.exe")
      : undefined,
    // Caminhos comuns em unix.
    !ehWindows ? "/usr/local/bin/claude" : undefined,
    !ehWindows ? "/opt/homebrew/bin/claude" : undefined,
    !ehWindows ? path.join(casa, ".npm-global", "bin", "claude") : undefined,
  ];
  return lista.filter((x): x is string => typeof x === "string" && x.length > 0);
}

// Decide se um caminho precisa de shell pra rodar.
function precisaShell(caminho: string): boolean {
  const min = caminho.toLowerCase();
  return min.endsWith(".cmd") || min.endsWith(".bat");
}

// Acha o claude. Se nada existir no disco, cai no fallback pelo PATH via shell.
export function localizarClaude(): ClaudeLocalizado {
  for (const candidato of candidatos()) {
    if (existsSync(candidato)) {
      return { binario: candidato, usarShell: precisaShell(candidato) };
    }
  }
  // Ultimo recurso: deixa o shell resolver "claude" pelo PATH.
  return { binario: "claude", usarShell: true };
}
