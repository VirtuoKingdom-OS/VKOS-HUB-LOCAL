// Rotas do modulo onboarding.
// Expoe a deteccao do ambiente e o navegador de pastas pro frontend guiar o leigo.

import { spawn } from "node:child_process";
import type { FastifyPluginAsync } from "fastify";

import { detectarAmbiente } from "./deteccao.js";
import { navegar } from "./pastas.js";

interface QueryPastas {
  caminho?: string;
}

// So um dialogo nativo por vez: dois ao mesmo tempo confundem o usuario.
let dialogoAberto = false;

// Abre o seletor de pasta NATIVO do Windows (o mesmo do Explorer) na maquina
// do usuario. Funciona porque o servidor roda local, na sessao do proprio
// usuario. Resolve com o caminho escolhido ou null se cancelou.
function abrirDialogoDePasta(titulo: string): Promise<string | null> {
  return new Promise((resolver, rejeitar) => {
    // Form invisivel TopMost como dono do dialogo, senao ele nasce atras
    // das janelas abertas e o usuario nem ve.
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms;",
      "$dono = New-Object System.Windows.Forms.Form;",
      "$dono.TopMost = $true;",
      "$d = New-Object System.Windows.Forms.FolderBrowserDialog;",
      `$d.Description = '${titulo.replace(/'/g, "''")}';`,
      "$d.ShowNewFolderButton = $true;",
      "if ($d.ShowDialog($dono) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }",
    ].join(" ");

    const processo = spawn(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", script],
      { windowsHide: true }
    );

    let saida = "";
    processo.stdout.setEncoding("utf8");
    processo.stdout.on("data", (pedaco: string) => {
      saida += pedaco;
    });
    processo.on("error", (erro) => rejeitar(erro));
    processo.on("close", () => {
      const caminho = saida.trim();
      resolver(caminho.length > 0 ? caminho : null);
    });

    // Ninguem escolhe pasta por mais de 5 minutos. Mata e trata como cancelado.
    setTimeout(() => {
      try {
        processo.kill();
      } catch {
        // ja morto.
      }
    }, 5 * 60 * 1000);
  });
}

export const rotasAmbiente: FastifyPluginAsync = async (app) => {
  // Estado da maquina: plataforma, Node e se o Claude Code esta instalado.
  app.get("/ambiente", async () => {
    return detectarAmbiente();
  });

  // Navegador de pastas. Sem caminho lista as raizes, com caminho lista subpastas.
  app.get<{ Querystring: QueryPastas }>(
    "/ambiente/pastas",
    async (requisicao) => {
      const { caminho } = requisicao.query;
      return navegar(caminho);
    },
  );

  // Abre o dialogo nativo de escolher pasta do Windows e espera a escolha.
  // Corpo opcional { titulo }. Responde { caminho: string | null } (null =
  // cancelado). 409 se ja tem um dialogo aberto. 501 fora do Windows.
  app.post("/ambiente/escolher-pasta", async (req, resposta) => {
    if (process.platform !== "win32") {
      return resposta
        .status(501)
        .send({ erro: "Seletor nativo so existe no Windows por enquanto." });
    }
    if (dialogoAberto) {
      return resposta
        .status(409)
        .send({ erro: "Ja tem um seletor de pasta aberto. Conclua ele primeiro." });
    }
    const corpo = (req.body ?? {}) as { titulo?: unknown };
    const titulo =
      typeof corpo.titulo === "string" && corpo.titulo.trim()
        ? corpo.titulo.trim().slice(0, 120)
        : "Escolha a pasta";

    dialogoAberto = true;
    try {
      const caminho = await abrirDialogoDePasta(titulo);
      return { caminho };
    } catch {
      return resposta
        .status(500)
        .send({ erro: "Nao consegui abrir o seletor de pasta do Windows." });
    } finally {
      dialogoAberto = false;
    }
  });
};
