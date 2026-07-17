// Render sob demanda das paginas de um carrossel.html em PNG. Spawna o script
// render-paginas.cjs com o node do proprio processo. O script usa o Playwright do
// VKOS ativo (vkos/node_modules). Timeout de 120s e erros legiveis.

import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Este modulo mora em src/vkos (dev) ou dist/vkos (build). Subir dois niveis
// chega em app/server nos dois casos, porque src e dist sao irmaos de scripts.
const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaServer = resolve(pastaModulo, "..", "..");
const caminhoScript = join(pastaServer, "scripts", "render-paginas.cjs");

// Teto de tempo do render: 120s. Carrossel pesado com fontes e imagem cabe folgado.
const TIMEOUT_MS = 120_000;

// Erro de negocio com status HTTP, pra virar resposta clara nas rotas.
export class ErroRender extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Traduz o stderr do script num erro legivel pro dono do negocio (nao tecnico).
function traduzirFalha(stderr: string, code: number | null): ErroRender {
  if (stderr.includes("PLAYWRIGHT_AUSENTE")) {
    return new ErroRender(
      500,
      "O renderizador do Hub nao foi instalado corretamente. Reinstale as dependencias do app.",
    );
  }
  if (stderr.includes("CHROMIUM_AUSENTE")) {
    return new ErroRender(
      500,
      "Nao achei Edge ou Chrome para gerar as imagens do carrossel.",
    );
  }
  if (stderr.includes("SEM_SLIDES")) {
    return new ErroRender(400, "Esse carrossel nao tem nenhuma pagina (.slide) pra gerar.");
  }
  const cauda = stderr.trim().split("\n").slice(-1)[0] ?? "";
  return new ErroRender(500, `Falha ao gerar as imagens (codigo ${code}). ${cauda}`.trim());
}

// Renderiza as paginas do htmlPath em PNG dentro de outDir. Sem n, renderiza
// todas; com n, so a pagina n. O nome de cada arquivo e slide-01.png, slide-02.png...
// pastaVkos aponta pro VKOS ativo (de onde vem o node_modules do Playwright).
export function renderizarPaginas(
  pastaVkos: string,
  htmlPath: string,
  outDir: string,
  n?: number,
): Promise<void> {
  const nodeModules = join(pastaVkos, "node_modules");
  const nodeModulesHub = resolve(pastaServer, "..", "node_modules");
  const args = [caminhoScript, htmlPath, outDir];
  if (n !== undefined) args.push(String(n));

  return new Promise<void>((resolver, rejeitar) => {
    const proc = spawn(process.execPath, args, {
      env: {
        ...process.env,
        VKOS_NODE_MODULES: nodeModules,
        VKOS_HUB_NODE_MODULES: nodeModulesHub,
      },
      windowsHide: true,
    });

    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += String(d);
    });
    // Consome o stdout pra o processo nao travar no buffer cheio do pipe.
    proc.stdout.on("data", () => {});

    let encerrado = false;
    const temporizador = setTimeout(() => {
      encerrado = true;
      proc.kill();
      rejeitar(new ErroRender(500, "O render passou de 120s e foi cancelado."));
    }, TIMEOUT_MS);

    proc.on("error", (erro) => {
      if (encerrado) return;
      clearTimeout(temporizador);
      rejeitar(new ErroRender(500, `Nao consegui iniciar o render: ${erro.message}`));
    });

    proc.on("close", (code) => {
      if (encerrado) return;
      clearTimeout(temporizador);
      if (code === 0) {
        resolver();
      } else {
        rejeitar(traduzirFalha(stderr, code));
      }
    });
  });
}
