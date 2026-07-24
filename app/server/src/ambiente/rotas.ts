import { spawn } from "node:child_process";
import type { FastifyPluginAsync } from "fastify";

import { detectarAmbiente, limparCacheProvedores } from "./deteccao.js";
import { navegar } from "./pastas.js";
import { MODO } from "../plataforma/modo.js";

interface QueryPastas { caminho?: string }
interface QueryAmbiente { atualizar?: string }

let dialogoAberto = false;

function abrirDialogoDePasta(titulo: string): Promise<string | null> {
  return new Promise((resolver, rejeitar) => {
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms;",
      "$dono = New-Object System.Windows.Forms.Form;",
      "$dono.TopMost = $true;",
      "$d = New-Object System.Windows.Forms.FolderBrowserDialog;",
      `$d.Description = '${titulo.replace(/'/g, "''")}';`,
      "$d.ShowNewFolderButton = $true;",
      "if ($d.ShowDialog($dono) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }",
    ].join(" ");
    const processo = spawn("powershell.exe", ["-NoProfile", "-STA", "-Command", script], { windowsHide: true });
    let saida = "";
    processo.stdout.setEncoding("utf8");
    processo.stdout.on("data", (pedaco: string) => { saida += pedaco; });
    processo.on("error", rejeitar);
    processo.on("close", () => resolver(saida.trim() || null));
    setTimeout(() => processo.kill(), 5 * 60 * 1000).unref();
  });
}

export const rotasAmbiente: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: QueryAmbiente }>("/ambiente", async (requisicao) => {
    if (MODO === "hub") {
      const indisponivel = { instalado: false, versao: null, logado: null, binario: null };
      return { plataforma: process.platform, node: process.version, claude: indisponivel, codex: indisponivel };
    }
    if (requisicao.query.atualizar === "1") limparCacheProvedores();
    return detectarAmbiente();
  });

  app.get<{ Querystring: QueryPastas }>("/ambiente/pastas", async (requisicao, resposta) => {
    if (MODO !== "core") return resposta.code(404).send({ erro: "rota nao encontrada" });
    return navegar(requisicao.query.caminho);
  });

  app.post("/ambiente/escolher-pasta", async (requisicao, resposta) => {
    if (MODO !== "core") return resposta.code(404).send({ erro: "rota nao encontrada" });
    if (process.platform !== "win32") return resposta.code(501).send({ erro: "Seletor nativo disponivel somente no Windows." });
    if (dialogoAberto) return resposta.code(409).send({ erro: "Ja existe um seletor de pasta aberto." });
    const corpo = (requisicao.body ?? {}) as { titulo?: unknown };
    const titulo = typeof corpo.titulo === "string" && corpo.titulo.trim() ? corpo.titulo.trim().slice(0, 120) : "Escolha a pasta";
    dialogoAberto = true;
    try {
      return { caminho: await abrirDialogoDePasta(titulo) };
    } finally {
      dialogoAberto = false;
    }
  });
};
