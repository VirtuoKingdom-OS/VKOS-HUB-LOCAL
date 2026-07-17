// Rotas do modulo onboarding.
// Expoe a deteccao do ambiente e o navegador de pastas pro frontend guiar o leigo.

import { spawn } from "node:child_process";
import type { FastifyPluginAsync } from "fastify";

import { detectarAmbiente, limparCacheProvedores } from "./deteccao.js";
import { navegar } from "./pastas.js";
import { obterProvedor } from "../provedores/index.js";
import type { IdProvedor } from "../provedores/contrato.js";
import {
  abrirTerminalDeLogin,
  criarAtalhoNaAreaDeTrabalho,
  executarTesteSetup,
} from "./setup.js";
import { instalarMotorComWinget } from "./instalacaoMotor.js";

interface QueryPastas {
  caminho?: string;
}

interface QueryAmbiente {
  atualizar?: string;
}

// So um dialogo nativo por vez: dois ao mesmo tempo confundem o usuario.
let dialogoAberto = false;
let instalacaoMotorEmAndamento = false;

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

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
  // Estado da maquina e dos dois motores. atualizar=1 ignora o cache.
  app.get<{ Querystring: QueryAmbiente }>("/ambiente", async (requisicao) => {
    if (requisicao.query.atualizar === "1") {
      limparCacheProvedores();
    }
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

  // Abre um terminal visivel com o comando oficial de login do motor. O corpo
  // aceita somente o id do provedor. Nenhum comando vindo do cliente e executado.
  app.post("/ambiente/login", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as { provedor?: unknown };
    if (corpo.provedor !== "claude" && corpo.provedor !== "codex") {
      return resposta.code(400).send({ erro: "Escolha Claude ou Codex." });
    }
    if (process.platform !== "win32") {
      return resposta
        .code(501)
        .send({ erro: "O login guiado está disponível somente no Windows." });
    }

    limparCacheProvedores();
    const deteccao = await obterProvedor(corpo.provedor).detectar();
    if (!deteccao.instalado || !deteccao.binario) {
      return resposta
        .code(409)
        .send({ erro: "O CLI desse motor ainda não foi encontrado." });
    }

    try {
      abrirTerminalDeLogin(corpo.provedor, deteccao.binario);
      return { ok: true };
    } catch (erro) {
      return resposta.code(500).send({
        erro:
          erro instanceof Error
            ? erro.message
            : "Não consegui abrir o terminal de login.",
      });
    }
  });

  // Instala o CLI escolhido com um pacote oficial fixo do WinGet. O cliente
  // nunca envia comando ou id de pacote. A resposta NDJSON mantém o progresso
  // visível sem abrir um terminal técnico para o usuário.
  app.post("/ambiente/instalar", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as { provedor?: unknown };
    if (corpo.provedor !== "claude" && corpo.provedor !== "codex") {
      return resposta.code(400).send({ erro: "Escolha Claude ou Codex." });
    }
    if (process.platform !== "win32") {
      return resposta.code(501).send({
        erro: "A instalação automática está disponível somente no Windows.",
      });
    }
    if (instalacaoMotorEmAndamento) {
      return resposta.code(409).send({
        erro: "Já existe uma instalação de motor em andamento.",
      });
    }

    const id = corpo.provedor as IdProvedor;
    instalacaoMotorEmAndamento = true;
    let atual: { instalado: boolean };
    try {
      limparCacheProvedores();
      atual = await obterProvedor(id).detectar();
    } catch (erro) {
      instalacaoMotorEmAndamento = false;
      return resposta.code(500).send({
        erro:
          erro instanceof Error
            ? erro.message
            : "Não foi possível conferir o programa instalado.",
      });
    }

    resposta.hijack();
    resposta.raw.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const enviar = (evento: object) => {
      if (!resposta.raw.destroyed) {
        resposta.raw.write(`${JSON.stringify(evento)}\n`);
      }
    };

    if (atual.instalado) {
      enviar({ tipo: "texto", texto: "O programa já está instalado." });
      enviar({ tipo: "fim", sucesso: true });
      instalacaoMotorEmAndamento = false;
      resposta.raw.end();
      return resposta;
    }

    try {
      const concluiu = await instalarMotorComWinget(id, enviar);
      if (!concluiu) {
        enviar({
          tipo: "erro",
          mensagem: "A instalação não terminou. Tente novamente ou use a opção manual.",
        });
        enviar({ tipo: "fim", sucesso: false });
        return resposta;
      }

      enviar({ tipo: "texto", texto: "Instalação concluída. Confirmando a versão..." });
      let detectado = false;
      for (let tentativa = 0; tentativa < 5; tentativa += 1) {
        limparCacheProvedores();
        const verificacao = await obterProvedor(id).detectar();
        if (verificacao.instalado) {
          detectado = true;
          enviar({
            tipo: "texto",
            texto: verificacao.versao
              ? `Programa confirmado, versão ${verificacao.versao}.`
              : "Programa confirmado.",
          });
          break;
        }
        await esperar(800);
      }

      if (!detectado) {
        enviar({
          tipo: "erro",
          mensagem: "O Windows instalou o programa, mas o Hub ainda não encontrou o novo caminho. Feche e abra o Hub uma vez.",
        });
      }
      enviar({ tipo: "fim", sucesso: detectado });
    } catch (erro) {
      enviar({
        tipo: "erro",
        mensagem:
          erro instanceof Error
            ? erro.message
            : "Não foi possível iniciar a instalação automática.",
      });
      enviar({ tipo: "fim", sucesso: false });
    } finally {
      instalacaoMotorEmAndamento = false;
      resposta.raw.end();
    }
    return resposta;
  });

  // Teste isolado do setup. O prompt e o modelo barato sao definidos no
  // servidor. A resposta NDJSON permite mostrar o texto enquanto ele chega.
  app.post("/ambiente/teste", async (requisicao, resposta) => {
    const corpo = (requisicao.body ?? {}) as { provedor?: unknown };
    if (corpo.provedor !== "claude" && corpo.provedor !== "codex") {
      return resposta.code(400).send({ erro: "Escolha Claude ou Codex." });
    }
    const id = corpo.provedor as IdProvedor;
    const provedor = obterProvedor(id);
    limparCacheProvedores();
    const deteccao = await provedor.detectar();
    if (!deteccao.instalado) {
      return resposta.code(409).send({ erro: "O CLI desse motor não foi encontrado." });
    }
    if (deteccao.logado === false) {
      return resposta.code(409).send({ erro: "Faça login nesse motor antes do teste." });
    }

    resposta.hijack();
    resposta.raw.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const enviar = (evento: object) => {
      if (!resposta.raw.destroyed) {
        resposta.raw.write(`${JSON.stringify(evento)}\n`);
      }
    };

    try {
      const resultado = await executarTesteSetup(provedor, enviar);
      enviar({ tipo: "fim", sucesso: resultado.sucesso, modelo: resultado.modelo });
    } catch (erro) {
      enviar({
        tipo: "erro",
        mensagem:
          erro instanceof Error ? erro.message : "Não foi possível iniciar o teste.",
      });
      enviar({ tipo: "fim", sucesso: false });
    } finally {
      resposta.raw.end();
    }
    return resposta;
  });

  // Cria um .lnk fixo para o inicializador do produto. Nao recebe caminho.
  app.post("/ambiente/atalho", async (_requisicao, resposta) => {
    try {
      const caminho = await criarAtalhoNaAreaDeTrabalho();
      return { ok: true, caminho };
    } catch (erro) {
      return resposta.code(process.platform === "win32" ? 500 : 501).send({
        erro:
          erro instanceof Error ? erro.message : "Não consegui criar o atalho.",
      });
    }
  });
};
