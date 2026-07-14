// Montagem do arquivo de config MCP pro claude CLI. O gerenciador de sessoes
// chama montarConfigMcp(workspaceId) na hora do spawn: se ha servidor habilitado,
// grava o JSON com a config completa (segredos reais) e devolve o caminho e os
// ids, pra empurrar --mcp-config e liberar as ferramentas mcp__<id>.

import { join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";

import { gravarJsonAtomico } from "../util/gravarJson.js";
import { garantirPastaDadosWorkspace, pastaDadosWorkspace } from "../workspaces/estado.js";
import { entradaCatalogo } from "./catalogo.js";
import { lerConexoes } from "./estado.js";

const NOME_ARQUIVO = "mcp-config.json";

// O retorno do montarConfigMcp: caminho absoluto do arquivo e os ids habilitados.
export interface ConfigMcp {
  caminho: string;
  servidores: string[];
}

// Monta o mcp-config.json dos servidores habilitados do workspace e devolve o
// caminho absoluto mais os ids. Sem nenhum habilitado (ou sem workspace), apaga
// o arquivo antigo e devolve null, pra o spawn nao passar config morta.
export function montarConfigMcp(workspaceId: string): ConfigMcp | null {
  if (!workspaceId) return null;

  const caminho = join(pastaDadosWorkspace(workspaceId), NOME_ARQUIVO);
  const estado = lerConexoes(workspaceId);

  const mcpServers: Record<string, unknown> = {};
  const servidores: string[] = [];

  for (const [id, servidor] of Object.entries(estado.servidores)) {
    if (!servidor || servidor.habilitado !== true) continue;
    const entrada = entradaCatalogo(id);
    if (!entrada || !entrada.disponivel || !entrada.montarServidor) continue;
    const objeto = entrada.montarServidor(servidor.config ?? {});
    if (!objeto) continue;
    mcpServers[id] = objeto;
    servidores.push(id);
  }

  if (servidores.length === 0) {
    try {
      if (existsSync(caminho)) unlinkSync(caminho);
    } catch {
      // Limpeza defensiva do arquivo antigo: nunca derruba o spawn.
    }
    return null;
  }

  garantirPastaDadosWorkspace(workspaceId);
  gravarJsonAtomico(caminho, { mcpServers });
  return { caminho, servidores };
}
