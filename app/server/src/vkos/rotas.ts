// Rotas da ponte VKOS. Monta o estado do VKOS escolhido, serve o Cerebro, as
// skills e as pecas, e entrega os arquivos das pecas de dentro de conteudo/.
//
// Dois plugins: rotasVkos (montado sob /api pelo index.ts) e rotasPecas
// (montado na raiz, sem prefixo, porque o frontend faz proxy de /pecas separado).

import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import archiver from "archiver";

import type { EstadoVkos } from "../tipos.js";
import { obterPastaVkos, validarPastaVkos } from "./estado.js";
import {
  cerebroPreenchido,
  ErroCerebro,
  gravarCerebro,
  lerCerebro,
  lerCerebroCompleto,
} from "./cerebro.js";
import { ErroCarrossel, gravarCarrossel, salvarImagem } from "./carrossel.js";
import { salvarAnexoPeca } from "./anexoPeca.js";
import { ErroPaginaSite, gravarPaginaSite } from "./paginaSite.js";
import { ErroRender, renderizarPaginas } from "./render.js";
import { limparBuildAstro, PASTA_BUILD } from "../publicacao/astro/conversor.js";
import { transmitir } from "../ws.js";
import { registrarEAtivar } from "../workspaces/ativacao.js";
import { lerSkills } from "./skills.js";
import { contarSlides, extrairDataTema, lerPecas, reinstalarObservador } from "./pecas.js";
import { baseDoTema, servirZip } from "./zip.js";
import { lerModelosCarrossel } from "./modelos.js";
import { tipoConteudo } from "./tipoConteudo.js";
import { neutralizarScriptsParaEdicao } from "./siteEstatico.js";

// Monta o EstadoVkos a partir da pasta atual (ou null).
function montarEstado(pasta: string | null): EstadoVkos {
  if (!pasta) {
    return { pasta: null, valida: false, cerebroPreenchido: false, totalSkills: 0 };
  }
  const validacao = validarPastaVkos(pasta);
  if (!validacao.valida) {
    return { pasta, valida: false, cerebroPreenchido: false, totalSkills: 0 };
  }
  const cerebro = lerCerebro(pasta);
  const skills = lerSkills(pasta);
  return {
    pasta,
    valida: true,
    cerebroPreenchido: cerebro.preenchido,
    totalSkills: skills.length,
  };
}

// Sanitiza o nome da peca (um segmento) e devolve o caminho absoluto dentro de
// conteudo/. Null quando invalido. Mesmo padrao rigido do DELETE: sem barra, sem
// "..", sem ponto inicial, sem byte nulo, e o alvo tem que ficar dentro de conteudo.
function resolverPeca(pastaVkos: string, bruto: string): { alvo: string; nome: string } | null {
  let nome: string;
  try {
    nome = decodeURIComponent(bruto);
  } catch {
    return null;
  }
  if (
    !nome ||
    nome.includes("/") ||
    nome.includes("\\") ||
    nome.includes("..") ||
    nome.startsWith(".") ||
    nome.includes("\0")
  ) {
    return null;
  }
  const pastaConteudo = join(pastaVkos, "conteudo");
  const alvo = join(pastaConteudo, nome);
  if (!alvo.startsWith(pastaConteudo + sep)) {
    return null;
  }
  return { alvo, nome };
}

export const rotasVkos: FastifyPluginAsync = async (app) => {
  // Observador de conteudo comeca junto com o servidor.
  reinstalarObservador();

  // Estado atual da ponte.
  app.get("/vkos", async () => {
    return montarEstado(obterPastaVkos());
  });

  // Escolhe (e valida) a pasta do VKOS. Erro 400 com mensagem clara se invalida.
  app.post("/vkos", async (req: FastifyRequest, resposta: FastifyReply) => {
    const corpo = (req.body ?? {}) as { caminho?: unknown };
    const caminho = typeof corpo.caminho === "string" ? corpo.caminho.trim() : "";

    const validacao = validarPastaVkos(caminho);
    if (!validacao.valida) {
      return resposta.status(400).send({ erro: validacao.motivo });
    }

    // Registra (ou reaproveita) e ATIVA o workspace dessa pasta. Isso ja chama
    // definirPastaVkos, religa o observador e transmite workspace:ativado, pra o
    // onboarding existente continuar redondo.
    registrarEAtivar(caminho);
    return montarEstado(caminho);
  });

  // Conteudo do Cerebro. Contrato novo: texto, caminho, atualizadoEm (mtime).
  // conteudo e preenchido continuam por compatibilidade com o painel atual.
  app.get("/vkos/cerebro", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    const cerebro = lerCerebroCompleto(pasta);
    if (!cerebro) {
      return resposta.status(404).send({ erro: "Nao achei o cerebro.md nessa pasta." });
    }
    return {
      texto: cerebro.texto,
      caminho: cerebro.caminho,
      atualizadoEm: cerebro.atualizadoEm,
      conteudo: cerebro.texto,
      preenchido: cerebroPreenchido(cerebro.texto),
    };
  });

  // Grava o Cerebro. Corpo { texto }. Gravacao atomica com backup unico por boot.
  // Depois de gravar, transmite cerebro:atualizado pelo WebSocket. Limite de corpo
  // folgado (2MB) pra o JSON com o texto de ate 512 KB e os escapes caberem.
  app.put(
    "/vkos/cerebro",
    { bodyLimit: 2 * 1024 * 1024 },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const pasta = obterPastaVkos();
      if (!pasta) {
        return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
      }
      const corpo = (req.body ?? {}) as { texto?: unknown };
      try {
        const salvo = gravarCerebro(pasta, corpo.texto);
        transmitir({ tipo: "cerebro:atualizado" });
        return {
          texto: salvo.texto,
          caminho: salvo.caminho,
          atualizadoEm: salvo.atualizadoEm,
          conteudo: salvo.texto,
          preenchido: cerebroPreenchido(salvo.texto),
        };
      } catch (erro) {
        if (erro instanceof ErroCerebro) {
          return resposta.status(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }
    },
  );

  // Lista das skills (comandos) do VKOS.
  app.get("/vkos/skills", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    return { skills: lerSkills(pasta) };
  });

  // Lista das pecas geradas.
  app.get("/vkos/pecas", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    return { pecas: lerPecas(pasta) };
  });

  // Baixa uma geracao inteira como ZIP, imagens renomeadas em ordem natural.
  app.get("/vkos/pecas/:pasta/zip", servirZip);

  // Apaga uma geracao inteira: a subpasta da peca dentro de conteudo/.
  // Sanitizacao rigida: o nome nao pode conter separador nem "..", e o alvo
  // resolvido precisa ser uma subpasta direta e existente de conteudo/.
  app.delete("/vkos/pecas/:pasta", async (req, resposta) => {
    const pastaVkos = obterPastaVkos();
    if (!pastaVkos) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    const { pasta } = req.params as { pasta: string };
    if (
      !pasta ||
      pasta.includes("/") ||
      pasta.includes("\\") ||
      pasta.includes("..") ||
      pasta.startsWith(".")
    ) {
      return resposta.status(400).send({ erro: "Nome de peça inválido." });
    }
    const pastaConteudo = join(pastaVkos, "conteudo");
    const alvo = join(pastaConteudo, pasta);
    // O alvo resolvido tem que continuar dentro de conteudo/.
    if (!alvo.startsWith(pastaConteudo + sep)) {
      return resposta.status(400).send({ erro: "Nome de peça inválido." });
    }
    if (!existsSync(alvo) || !statSync(alvo).isDirectory()) {
      return resposta.status(404).send({ erro: "Peça não encontrada." });
    }
    // Desfaz um junction de build Astro remanescente antes do rm recursivo,
    // pra jamais cruzar o reparse point pra dentro do motor compartilhado.
    limparBuildAstro(join(alvo, PASTA_BUILD));
    rmSync(alvo, { recursive: true, force: true });
    // O watcher de conteudo/ tambem dispara, mas transmitir aqui garante a
    // atualizacao imediata mesmo se o watch falhar no Windows.
    transmitir({ tipo: "pecas:atualizadas" });
    return { ok: true };
  });

  // Lista dos modelos de carrossel (templates/carrossel/modelo-*.html).
  app.get("/vkos/modelos-carrossel", async (_req, resposta) => {
    const pasta = obterPastaVkos();
    if (!pasta) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    return { modelos: lerModelosCarrossel(pasta) };
  });

  // Grava o carrossel.html da peca. Corpo { texto }. Escrita atomica, backup
  // .bak unico por boot, apaga o PNG legado: a peca vira HTML-first. Depois
  // transmite pecas:atualizadas. Limite de corpo 4MB.
  app.put(
    "/vkos/pecas/:pasta/carrossel",
    { bodyLimit: 4 * 1024 * 1024 },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const pastaVkos = obterPastaVkos();
      if (!pastaVkos) {
        return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
      }
      const { pasta } = req.params as { pasta: string };
      const resolvida = resolverPeca(pastaVkos, pasta);
      if (!resolvida) {
        return resposta.status(400).send({ erro: "Nome de peça inválido." });
      }
      if (!existsSync(resolvida.alvo) || !statSync(resolvida.alvo).isDirectory()) {
        return resposta.status(404).send({ erro: "Peça não encontrada." });
      }
      const corpo = (req.body ?? {}) as { texto?: unknown };
      try {
        gravarCarrossel(resolvida.alvo, corpo.texto);
        transmitir({ tipo: "pecas:atualizadas" });
        return { ok: true };
      } catch (erro) {
        if (erro instanceof ErroCarrossel) {
          return resposta.status(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }
    },
  );

  // Grava uma pagina HTML da peca de site. Corpo { texto }. So regrava pagina
  // que JA existe na raiz da peca: a rota nao cria pagina nova. Escrita atomica,
  // backup .bak unico por boot, carrossel.html proibido (e a classificacao da
  // peca). Depois transmite pecas:atualizadas. Limite de corpo 4MB.
  app.put(
    "/vkos/pecas/:pasta/pagina/*",
    { bodyLimit: 4 * 1024 * 1024 },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const pastaVkos = obterPastaVkos();
      if (!pastaVkos) {
        return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
      }
      const params = req.params as { pasta: string; "*": string };
      const pasta = params.pasta;
      const arquivo = params["*"];
      const resolvida = resolverPeca(pastaVkos, pasta);
      if (!resolvida) {
        return resposta.status(400).send({ erro: "Nome de peça inválido." });
      }
      if (!existsSync(resolvida.alvo) || !statSync(resolvida.alvo).isDirectory()) {
        return resposta.status(404).send({ erro: "Peça não encontrada." });
      }
      const corpo = (req.body ?? {}) as { texto?: unknown };
      try {
        gravarPaginaSite(resolvida.alvo, arquivo, corpo.texto);
        transmitir({ tipo: "pecas:atualizadas" });
        return { ok: true };
      } catch (erro) {
        if (erro instanceof ErroPaginaSite) {
          return resposta.status(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }
    },
  );

  // Salva uma imagem do editor em <peca>/img/ com nome unico. Corpo
  // { nome, conteudoBase64 }. Responde { caminhoRelativo }. Limite 20MB de imagem
  // (o corpo base64 folga um pouco mais, por causa do overhead do base64).
  app.post(
    "/vkos/pecas/:pasta/imagem",
    { bodyLimit: 28 * 1024 * 1024 },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const pastaVkos = obterPastaVkos();
      if (!pastaVkos) {
        return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
      }
      const { pasta } = req.params as { pasta: string };
      const resolvida = resolverPeca(pastaVkos, pasta);
      if (!resolvida) {
        return resposta.status(400).send({ erro: "Nome de peça inválido." });
      }
      if (!existsSync(resolvida.alvo) || !statSync(resolvida.alvo).isDirectory()) {
        return resposta.status(404).send({ erro: "Peça não encontrada." });
      }
      const corpo = (req.body ?? {}) as { nome?: unknown; conteudoBase64?: unknown };
      try {
        const caminhoRelativo = salvarImagem(resolvida.alvo, corpo.nome, corpo.conteudoBase64);
        return { caminhoRelativo };
      } catch (erro) {
        if (erro instanceof ErroCarrossel) {
          return resposta.status(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }
    },
  );

  // Salva um anexo de referencia em <peca>/anexos/. Ele fica dentro do escopo
  // confinado do ajuste e nunca vira parte do site ou carrossel publicado.
  app.post(
    "/vkos/pecas/:pasta/anexo",
    { bodyLimit: 32 * 1024 * 1024 },
    async (req: FastifyRequest, resposta: FastifyReply) => {
      const pastaVkos = obterPastaVkos();
      if (!pastaVkos) {
        return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
      }
      const { pasta } = req.params as { pasta: string };
      const resolvida = resolverPeca(pastaVkos, pasta);
      if (!resolvida) {
        return resposta.status(400).send({ erro: "Nome de peça inválido." });
      }
      if (!existsSync(resolvida.alvo) || !statSync(resolvida.alvo).isDirectory()) {
        return resposta.status(404).send({ erro: "Peça não encontrada." });
      }
      const corpo = (req.body ?? {}) as { nome?: unknown; conteudoBase64?: unknown };
      try {
        const caminhoRelativo = salvarAnexoPeca(
          resolvida.alvo,
          corpo.nome,
          corpo.conteudoBase64,
        );
        return resposta.status(201).send({ caminhoRelativo });
      } catch (erro) {
        if (erro instanceof ErroCarrossel) {
          return resposta.status(erro.status).send({ erro: erro.message });
        }
        throw erro;
      }
    },
  );

  // Renderiza SOB DEMANDA a pagina n em PNG num temp do SO e streama o arquivo.
  // Nunca grava dentro da peca. Content-Disposition com o nome no padrao do zip.
  app.get("/vkos/pecas/:pasta/png/:n", async (req, resposta) => {
    const pastaVkos = obterPastaVkos();
    if (!pastaVkos) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    const params = req.params as { pasta: string; n: string };
    const resolvida = resolverPeca(pastaVkos, params.pasta);
    if (!resolvida) {
      return resposta.status(400).send({ erro: "Nome de peça inválido." });
    }
    const htmlPath = join(resolvida.alvo, "carrossel.html");
    if (!existsSync(htmlPath)) {
      return resposta.status(404).send({ erro: "Essa peça não tem carrossel.html." });
    }
    const n = Number(params.n);
    if (!Number.isInteger(n) || n < 1) {
      return resposta.status(404).send({ erro: "Página não encontrada." });
    }
    const total = contarSlides(readFileSync(htmlPath, "utf8"));
    if (n > total) {
      return resposta.status(404).send({ erro: "Página não encontrada." });
    }

    const nomeBase = baseDoTema(extrairDataTema(resolvida.nome).tema);
    const nn = String(n).padStart(2, "0");
    const tmpDir = mkdtempSync(join(tmpdir(), "vkos-render-"));
    try {
      await renderizarPaginas(pastaVkos, htmlPath, tmpDir, n);
      const arquivoPng = join(tmpDir, `slide-${nn}.png`);
      if (!existsSync(arquivoPng)) {
        return resposta.status(500).send({ erro: "O render não gerou a imagem." });
      }
      // Le pra memoria antes de apagar o temp, pra o send sobreviver a limpeza.
      const buf = readFileSync(arquivoPng);
      resposta.header("Content-Type", "image/png");
      resposta.header("Content-Disposition", `attachment; filename="${nomeBase}${nn}.png"`);
      return resposta.send(buf);
    } catch (erro) {
      if (erro instanceof ErroRender) {
        return resposta.status(erro.status).send({ erro: erro.message });
      }
      throw erro;
    } finally {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // limpeza do temp e defensiva.
      }
    }
  });

  // Renderiza SOB DEMANDA todas as paginas num temp do SO e streama um ZIP no
  // mesmo padrao do zip.ts: <base>.zip com <base>01.png, <base>02.png...
  app.get("/vkos/pecas/:pasta/png-zip", async (req, resposta) => {
    const pastaVkos = obterPastaVkos();
    if (!pastaVkos) {
      return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
    }
    const params = req.params as { pasta: string };
    const resolvida = resolverPeca(pastaVkos, params.pasta);
    if (!resolvida) {
      return resposta.status(400).send({ erro: "Nome de peça inválido." });
    }
    const htmlPath = join(resolvida.alvo, "carrossel.html");
    if (!existsSync(htmlPath)) {
      return resposta.status(404).send({ erro: "Essa peça não tem carrossel.html." });
    }
    const total = contarSlides(readFileSync(htmlPath, "utf8"));
    if (total === 0) {
      return resposta.status(400).send({ erro: "Esse carrossel não tem página pra baixar." });
    }

    const nomeBase = baseDoTema(extrairDataTema(resolvida.nome).tema);
    const tmpDir = mkdtempSync(join(tmpdir(), "vkos-render-"));
    try {
      await renderizarPaginas(pastaVkos, htmlPath, tmpDir);
    } catch (erro) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // limpeza defensiva.
      }
      if (erro instanceof ErroRender) {
        return resposta.status(erro.status).send({ erro: erro.message });
      }
      throw erro;
    }

    // Store: PNG ja vem comprimido, a prioridade e velocidade.
    const arquivo = archiver("zip", { store: true });
    arquivo.on("error", (erro) => {
      req.log?.error?.(erro);
      resposta.raw.destroy(erro);
    });

    resposta.header("Content-Type", "application/zip");
    resposta.header("Content-Disposition", `attachment; filename="${nomeBase}.zip"`);

    // Append em ordem: le cada PNG pra memoria (buffer) antes de apagar o temp.
    for (let n = 1; n <= total; n++) {
      const nn = String(n).padStart(2, "0");
      const arquivoPng = join(tmpDir, `slide-${nn}.png`);
      try {
        arquivo.append(readFileSync(arquivoPng), { name: `${nomeBase}${nn}.png` });
      } catch {
        // Pagina que nao rendeu: segue sem ela.
      }
    }

    // Os PNGs ja estao em memoria no archiver, o temp pode sair agora.
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // limpeza defensiva.
    }

    resposta.send(arquivo);
    void arquivo.finalize();
    return resposta;
  });

};

// Arquivos das pecas na raiz (sem /api). O index.ts registra sem prefixo.
export const rotasPecas: FastifyPluginAsync = async (app) => {
  // Pagina isolada de um carrossel HTML-first, pro iframe do front medir e escalar.
  app.get("/pecas-html/:pasta/pagina/:n", servirPaginaHtml);
  app.get("/pecas-edicao/*", servirPecaEdicao);
  app.get("/pecas/*", servirPeca);
  app.get("/modelos-html/_exemplo-capa.svg", servirExemploCapa);
  // Preview de um modelo de carrossel (templates/carrossel/), slide pedido isolado.
  app.get("/modelos-html/:id/preview", servirPreviewModelo);
};

// Injeta a <base> logo depois da abertura do <head>, pros recursos relativos
// (img/, fontes) resolverem contra /pecas/<pasta>/. Sem <head>, poe no comeco.
function injetarBase(html: string, baseTag: string): string {
  const m = html.match(/<head[^>]*>/i);
  if (m && m.index !== undefined) {
    const fim = m.index + m[0].length;
    return html.slice(0, fim) + "\n" + baseTag + html.slice(fim);
  }
  return baseTag + "\n" + html;
}

// Injeta o script isolador antes do </body>. Ele deixa so o slide n no DOM,
// zera margin/padding do body e dimensiona o body ao slide, pro iframe medir por
// scrollWidth/scrollHeight e escalar. Sem </body>, anexa no fim.
function injetarScriptIsolador(html: string, n: number): string {
  const script = `<script>
(function(){
  var slides = document.querySelectorAll('.slide');
  var indice = Math.min(Math.max(${n - 1}, 0), Math.max(slides.length - 1, 0));
  var alvo = slides[indice];
  if(!alvo){ return; }
  for(var i=slides.length-1;i>=0;i--){
    if(slides[i]!==alvo && slides[i].parentNode){ slides[i].parentNode.removeChild(slides[i]); }
  }
  document.body.style.margin='0';
  document.body.style.padding='0';
  var r = alvo.getBoundingClientRect();
  document.body.style.width = r.width + 'px';
  document.body.style.height = r.height + 'px';
})();
</script>`;
  const idx = html.toLowerCase().lastIndexOf("</body>");
  if (idx >= 0) {
    return html.slice(0, idx) + script + "\n" + html.slice(idx);
  }
  return html + "\n" + script;
}

// GET /pecas-html/:pasta/pagina/:n: serve o carrossel.html da peca com a <base>
// e o script isolador, pra o front exibir e medir uma pagina por vez.
async function servirPaginaHtml(
  req: FastifyRequest,
  resposta: FastifyReply,
): Promise<FastifyReply> {
  const pastaVkos = obterPastaVkos();
  if (!pastaVkos) {
    return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
  }

  const params = req.params as { pasta: string; n: string };
  const alvo = resolverPeca(pastaVkos, params.pasta);
  if (!alvo) {
    return resposta.status(400).send({ erro: "Nome de peça inválido." });
  }
  const htmlPath = join(alvo.alvo, "carrossel.html");
  let estat;
  try {
    estat = statSync(htmlPath);
  } catch {
    return resposta.status(404).send({ erro: "Carrossel não encontrado." });
  }
  if (!estat.isFile()) {
    return resposta.status(404).send({ erro: "Carrossel não encontrado." });
  }

  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1) {
    return resposta.status(404).send({ erro: "Página não encontrada." });
  }

  let html = readFileSync(htmlPath, "utf8");
  const total = contarSlides(html);
  if (n > total) {
    return resposta.status(404).send({ erro: "Página não encontrada." });
  }

  const pastaEnc = encodeURIComponent(alvo.nome);
  html = injetarBase(html, `<base href="/pecas/${pastaEnc}/">`);
  html = injetarScriptIsolador(html, n);

  resposta.header("Content-Type", "text/html; charset=utf-8");
  return resposta.send(html);
}

const CAMINHO_EXEMPLO_CAPA = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "exemplo-capa.svg",
);

async function servirExemploCapa(
  _req: FastifyRequest,
  resposta: FastifyReply,
): Promise<FastifyReply> {
  try {
    const svg = readFileSync(CAMINHO_EXEMPLO_CAPA, "utf8");
    resposta.header("Content-Type", "image/svg+xml; charset=utf-8");
    resposta.header("Cache-Control", "public, max-age=86400");
    return resposta.send(svg);
  } catch {
    return resposta.status(404).send({ erro: "Imagem de exemplo não encontrada." });
  }
}

// GET /modelos-html/:id/preview: serve o modelo-<id>.html de templates/carrossel/
// com a mesma injecao da /pecas-html: <base> pra recursos relativos e o script
// isolador. A query ?slide=N escolhe a miniatura e faz clamp no ultimo slide.
async function servirPreviewModelo(
  req: FastifyRequest,
  resposta: FastifyReply,
): Promise<FastifyReply> {
  const pastaVkos = obterPastaVkos();
  if (!pastaVkos) {
    return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
  }

  const { id } = req.params as { id: string };
  const { slide: slideCru } = req.query as { slide?: string };
  if (!/^[a-z0-9-]+$/.test(id)) {
    return resposta.status(404).send({ erro: "Modelo não encontrado." });
  }

  const modelo = lerModelosCarrossel(pastaVkos).find((m) => m.id === id);
  if (!modelo) {
    return resposta.status(404).send({ erro: "Modelo não encontrado." });
  }

  const htmlPath = join(pastaVkos, "templates", "carrossel", modelo.arquivo);
  let html: string;
  try {
    html = readFileSync(htmlPath, "utf8");
  } catch {
    return resposta.status(404).send({ erro: "Modelo não encontrado." });
  }

  const slideLido = Number.parseInt(slideCru ?? "1", 10);
  const slidePedido = Number.isInteger(slideLido) && slideLido > 0 ? slideLido : 1;
  const totalSlides = contarSlides(html);
  const slide = Math.min(slidePedido, Math.max(totalSlides, 1));
  html = html
    .replaceAll("img/capa.png", "/modelos-html/_exemplo-capa.svg")
    .replaceAll("img/produto.png", "/modelos-html/_exemplo-capa.svg");
  html = injetarBase(html, `<base href="/modelos-html/${id}/">`);
  html = injetarScriptIsolador(html, slide);

  resposta.header("Content-Type", "text/html; charset=utf-8");
  return resposta.send(html);
}

// Serve um arquivo de dentro de conteudo/ da pasta VKOS escolhida.
// Seguranca: resolve o alvo e garante que ele esta dentro de conteudo/. Bloqueia
// qualquer tentativa de sair da pasta (../, caminho absoluto, byte nulo).
async function servirPeca(req: FastifyRequest, resposta: FastifyReply): Promise<FastifyReply> {
  return servirArquivoPeca(req, resposta, false);
}

async function servirPecaEdicao(
  req: FastifyRequest,
  resposta: FastifyReply,
): Promise<FastifyReply> {
  return servirArquivoPeca(req, resposta, true);
}

async function servirArquivoPeca(
  req: FastifyRequest,
  resposta: FastifyReply,
  modoEdicao: boolean,
): Promise<FastifyReply> {
  const pasta = obterPastaVkos();
  if (!pasta) {
    return resposta.status(400).send({ erro: "Nenhuma pasta de VKOS escolhida ainda." });
  }

  const params = req.params as Record<string, string>;
  const bruto = params["*"] ?? "";

  let relativo: string;
  try {
    relativo = decodeURIComponent(bruto);
  } catch {
    return resposta.status(400).send({ erro: "Caminho invalido." });
  }
  if (relativo.includes("\0")) {
    return resposta.status(400).send({ erro: "Caminho invalido." });
  }

  const base = resolve(join(pasta, "conteudo"));
  let alvo = resolve(base, relativo);

  // Garante que o alvo esta dentro de conteudo/. rel comeca com .. ou vira
  // absoluto quando o caminho escapa da base.
  const rel = relative(base, alvo);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return resposta.status(403).send({ erro: "Acesso fora da pasta de conteudo." });
  }

  let estat;
  try {
    estat = statSync(alvo);
  } catch {
    return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
  }
  // URLs relativas como "./" e "sobre/" sao comuns em sites estaticos. Quando
  // o alvo e uma pasta, serve o index.html dela, igual aos hosts de deploy.
  if (estat.isDirectory()) {
    alvo = join(alvo, "index.html");
    try {
      estat = statSync(alvo);
    } catch {
      return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
    }
  }
  if (!estat.isFile()) {
    return resposta.status(404).send({ erro: "Arquivo nao encontrado." });
  }

  resposta.header("Content-Type", tipoConteudo(alvo));
  // Preview e editor precisam enxergar troca de CSS, JS e imagem com o mesmo
  // nome imediatamente. no-cache revalida sem proibir o cache do navegador.
  resposta.header("Cache-Control", "no-cache");
  resposta.header("X-Content-Type-Options", "nosniff");
  if (modoEdicao && /\.html?$/i.test(alvo)) {
    const html = neutralizarScriptsParaEdicao(readFileSync(alvo, "utf8"));
    resposta.header("Content-Length", Buffer.byteLength(html, "utf8"));
    return resposta.send(html);
  }
  resposta.header("Content-Length", estat.size);
  return resposta.send(createReadStream(alvo));
}
