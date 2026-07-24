import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pastaInfra = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(pastaInfra, "..");
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright-core", { paths: [join(raiz, "app")] }));

const core = process.env.CORE_URL ?? "http://127.0.0.1:4600";
const email = process.env.SMOKE_OPERADOR_EMAIL ?? "operador-ui@vkos.local";
const senha = process.env.SMOKE_OPERADOR_SENHA ?? "Teste-VKOS-UI-seguro";
const usarFixtures = process.env.VARREDURA_FIXTURES === "1";
const filtroTelas = new Set((process.env.VARREDURA_TELAS ?? "").split(",").map((item) => item.trim()).filter(Boolean));
const estadoAdmin = (process.env.VARREDURA_ESTADO_ADMIN ?? "").trim().toLowerCase();
const temas = ["escuro", "claro"];
const larguras = [
  { nome: "celular", width: 390, height: 740 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "desktop", width: 1440, height: 900 },
];

function acharExecutavel() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const base = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  if (!existsSync(base)) return undefined;
  for (const pasta of readdirSync(base).filter((item) => item.startsWith("chromium-")).sort().reverse()) {
    const candidato = join(base, pasta, "chrome-win64", "chrome.exe");
    if (existsSync(candidato)) return candidato;
  }
  return undefined;
}

function base32(segredo) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const caractere of segredo.replace(/\s/g, "").toUpperCase()) {
    const indice = alfabeto.indexOf(caractere);
    if (indice >= 0) bits += indice.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(segredo) {
  const contador = Math.floor(Date.now() / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(contador));
  const hash = createHmac("sha1", base32(segredo)).update(buffer).digest();
  const deslocamento = hash.at(-1) & 15;
  return String((hash.readUInt32BE(deslocamento) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function json(resposta) {
  return resposta.json().catch(() => ({}));
}

async function autenticar(contexto) {
  const estadoResposta = await contexto.request.get(`${core}/api/auth/estado`);
  if (!estadoResposta.ok()) throw new Error(`Estado de autenticação respondeu ${estadoResposta.status()}.`);
  const estado = await json(estadoResposta);
  let segredo = process.env.SMOKE_TOTP_SECRET;
  if (estado.precisaBootstrap) {
    const resposta = await contexto.request.post(`${core}/api/auth/bootstrap`, {
      data: { email, senha },
    });
    const dados = await json(resposta);
    if (resposta.status() !== 201) throw new Error(`Bootstrap visual falhou: ${JSON.stringify(dados)}`);
    return;
  }
  if (!estado.obrigatoria) return;
  if (estado.totpAtivo && !segredo) {
    throw new Error("O CORE já tem operador. Informe SMOKE_TOTP_SECRET para a varredura visual.");
  }
  const resposta = await contexto.request.post(`${core}/api/auth/login`, {
    data: {
      email,
      senha,
      ...(estado.totpAtivo ? { codigoTotp: totp(segredo) } : {}),
    },
  });
  if (!resposta.ok()) throw new Error(`Login visual falhou: ${JSON.stringify(await json(resposta))}`);
}

function nomeSeguro(valor) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function rgbDaCor(valor) {
  const texto = valor.trim();
  if (texto.startsWith("#")) {
    const hex = texto.slice(1);
    const inteiro = Number.parseInt(hex.length === 3 ? hex.split("").map((item) => item + item).join("") : hex.slice(0, 6), 16);
    return [(inteiro >> 16) & 255, (inteiro >> 8) & 255, inteiro & 255];
  }
  const partes = texto.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  return partes?.length === 3 ? partes : null;
}

function luminancia(rgb) {
  const canais = rgb.map((valor) => {
    const canal = valor / 255;
    return canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
}

function contraste(a, b) {
  const rgbA = rgbDaCor(a);
  const rgbB = rgbDaCor(b);
  if (!rgbA || !rgbB) return null;
  const [clara, escura] = [luminancia(rgbA), luminancia(rgbB)].sort((x, y) => y - x);
  return (clara + 0.05) / (escura + 0.05);
}

function rotaExecutavel(tela) {
  if (tela.id === "acesso") return "/dashboard";
  if (["splash", "servidor-fora", "onboarding", "ide"].includes(tela.id)) return "/dashboard";
  if (tela.id === "fonte") return "/fonte/texto";
  if (tela.id === "studio") return "/studio/fixture-carrossel";
  if (tela.id === "site") return "/site/fixture-site";
  if (typeof tela.rota !== "string" || !tela.rota.startsWith("/")) return null;
  if (tela.rota.includes(":")) return null;
  return tela.rota;
}

const mapa = JSON.parse(readFileSync(join(raiz, "interno", "mapa-telas.json"), "utf8"));
const data = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const destino = join(raiz, "analises", "varredura-ui", data);
mkdirSync(destino, { recursive: true });

const navegador = await chromium.launch({ headless: true, executablePath: acharExecutavel() });
const contexto = await navegador.newContext();
const relatorio = { criadoEm: new Date().toISOString(), base: core, capturas: [], ignoradas: [], falhas: [] };

async function instalarFixtures() {
  const mapaSistema = JSON.parse(readFileSync(join(raiz, "interno", "mapa-sistema.json"), "utf8"));
  const agora = new Date().toISOString();
  const workspace = { id: "ui-workspace", nome: "Workspace de teste", pasta: "", criadoEm: agora, ultimoUso: agora };
  const pecas = [
    {
      pasta: "fixture-carrossel",
      data: "22/07/2026",
      tema: "Sistema visual VKOS 3",
      tipo: "carrossel",
      arquivos: ["carrossel.html"],
      previews: ["/pecas-html/fixture-carrossel/pagina/1"],
      fonteHtml: true,
      paginas: 1,
      criadoEm: agora,
    },
    {
      pasta: "fixture-site",
      data: "22/07/2026",
      tema: "Site institucional VKOS",
      tipo: "site",
      arquivos: ["index.html"],
      previews: ["/pecas/fixture-site/index.html"],
      criadoEm: agora,
      site: { valido: true, erros: [], avisos: [] },
    },
  ];
  const contextos = [{
    id: "fixture-texto",
    nome: "Diretrizes da marca",
    slug: "diretrizes-da-marca",
    tipo: "texto",
    texto: "Tom direto, humano e orientado a resultado.",
    arquivos: [],
    pastaRelativa: "contextos/diretrizes-da-marca",
    criadaEm: agora,
    atualizadaEm: agora,
  }];
  const features = ["cockpit", "cerebro", "criador-visual", "site-guiado", "crm", "leads", "calendario", "automacoes", "conexoes", "ide", "fontes"];
  const sessao = {
    usuario: { id: "operador-ui", email, papel: "operador" },
    workspaceId: null,
    features,
    modo: "core",
    totpAtivo: false,
  };
  const modeloAdmin = {
    id: "modelo-ui",
    nome: "Operação comercial",
    descricao: "CRM, calendário e geração visual para equipes de atendimento.",
    features_json: ["crm", "leads", "calendario"].map((id) => ({ id })),
    motor_padrao: "gemini",
  };
  const workspaceAdmin = {
    id: "11111111-1111-4111-8111-111111111111",
    nome: "Estúdio Aurora",
    slug: "estudio-aurora",
    motor: "gemini",
    status: "ativo",
    consumo_mes: 18.42,
    features_ativas: ["crm", "leads", "calendario"],
  };
  await contexto.route(`${new URL(core).origin}/api/**`, async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname;
    let corpo;
    if (caminho === "/api/auth/estado") corpo = { precisaBootstrap: false, modo: "core", obrigatoria: false, totpAtivo: false };
    else if (caminho === "/api/auth/me") corpo = sessao;
    else if (caminho === "/api/ambiente") corpo = { plataforma: "win32", node: "22", claude: { instalado: true, versao: "teste", logado: true, binario: "claude" }, codex: { instalado: true, versao: "teste", logado: true, binario: "codex" } };
    else if (caminho === "/api/vkos") corpo = { pasta: "workspace-fixture", valida: true, cerebroPreenchido: true, totalSkills: 3 };
    else if (caminho === "/api/config") corpo = { modeloPadrao: "sonnet", provedorPadrao: "claude", modeloPadraoClaude: "sonnet", modoEnxuto: false };
    else if (caminho === "/api/workspaces") corpo = { workspaces: [workspace], ativo: workspace.id };
    else if (caminho === "/api/sessoes") corpo = { sessoes: [] };
    else if (caminho === "/api/vkos/pecas") corpo = { pecas };
    else if (caminho === "/api/contextos") corpo = { contextos };
    else if (caminho === "/api/custos") corpo = { totalUsd: 0, totalSessoes: 0, tokensEntrada: 0, tokensSaida: 0, totalGeralUsd: 0 };
    else if (caminho === "/api/vkos/modelos-carrossel") corpo = { modelos: [] };
    else if (caminho === "/api/features-ativas") corpo = { features, workspaceId: workspace.id };
    else if (caminho === "/api/canvas") corpo = { versao: 3, nos: [], arestas: [] };
    else if (caminho === "/api/crm") corpo = { versao: 3, colunas: [{ id: "entrada", nome: "Entrada", ordem: 0 }, { id: "conversa", nome: "Em conversa", ordem: 1 }, { id: "ganhos", nome: "Ganhos", ordem: 2 }], contatos: [], negocios: [] };
    else if (caminho === "/api/leads") corpo = { minerados: [], arquivados: [] };
    else if (caminho === "/api/leads/disponivel") corpo = { disponivel: true };
    else if (caminho === "/api/calendario") corpo = { conectado: false, contaEmail: "", sincronizarCrm: true, sincronizarGoogle: false };
    else if (caminho === "/api/calendario/eventos") corpo = { eventos: [] };
    else if (caminho === "/api/automacoes") corpo = { regras: [], conectadoGoogle: false };
    else if (caminho === "/api/conexoes") corpo = { catalogo: [], estado: { servidores: {} } };
    else if (caminho === "/api/admin/features") corpo = { features: features.map((id) => ({ id, nome: id, descricao: "Feature de teste", usaIa: false, disponivelParaCliente: true, dependeDe: [] })) };
    else if (caminho === "/api/admin/modelos") corpo = { modelos: [modeloAdmin] };
    else if (caminho === "/api/admin/workspaces") corpo = { workspaces: [workspaceAdmin] };
    else if (caminho === "/api/mapa") corpo = { disponivel: true, mapa: mapaSistema };
    else if (caminho === "/api/mapa/telas") corpo = { disponivel: true, mapa };
    else if (caminho.startsWith("/api/publicacao/")) corpo = { disponivel: true, paginas: [], netlify: null, github: null };
    else if (caminho === "/api/provedores") corpo = { ativo: "claude", provedores: [{ id: "claude", modelos: [{ alias: "sonnet", rotulo: "Sonnet", observacaoCusto: "Teste" }] }] };
    else corpo = {};
    await rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const htmlFixture = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#101312;color:#e9edeb;font:24px/1.45 system-ui,sans-serif}
    .slide,main{width:1080px;min-height:1350px;padding:110px;background:linear-gradient(145deg,#171b19,#1e322b)}
    main{width:100%;min-height:900px}p{max-width:720px;color:#a7b0ac}strong{color:#2fd4a7}
  </style></head><body><main class="slide"><strong>VKOS 3</strong><h1>Interface operacional clara.</h1><p>Fixture visual sem dados reais para validar Studio e Site.</p></main></body></html>`;
  for (const prefixo of ["pecas", "pecas-html", "pecas-edicao"]) {
    await contexto.route(`${new URL(core).origin}/${prefixo}/**`, (rota) => rota.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: htmlFixture,
    }));
  }
}

try {
  if (usarFixtures) await instalarFixtures();
  else await autenticar(contexto);
  for (const tela of mapa.telas) {
    if (filtroTelas.size && !filtroTelas.has(tela.id)) continue;
    const rota = rotaExecutavel(tela);
    if (!rota) {
      relatorio.ignoradas.push({ id: tela.id, motivo: "estado sem hash fixo ou rota parametrizada" });
      continue;
    }
    for (const tema of temas) {
      for (const largura of larguras) {
        const pagina = await contexto.newPage();
        const erros = [];
        pagina.on("console", (mensagem) => {
          const texto = mensagem.text();
          if (usarFixtures && texto.includes("WebSocket connection") && texto.includes("/ws")) return;
          if (usarFixtures && tela.id === "servidor-fora" && texto.includes("net::ERR_FAILED")) return;
          if (mensagem.type() === "error") erros.push(`console: ${texto}`);
        });
        pagina.on("pageerror", (erro) => erros.push(`pageerror: ${erro.message}`));
        try {
          if (usarFixtures && tela.id === "splash") {
            await pagina.route("**/api/auth/estado", async (rota) => {
              await new Promise((resolve) => setTimeout(resolve, 5_000));
              await rota.fulfill({
                status: 200,
                contentType: "application/json",
              body: JSON.stringify({ precisaBootstrap: false, modo: "core", obrigatoria: false, totpAtivo: false }),
              });
            });
          }
          if (usarFixtures && tela.id === "servidor-fora") {
            await pagina.route("**/api/auth/estado", (rota) => rota.abort("failed"));
          }
          if (usarFixtures && tela.id === "onboarding") {
            await pagina.route("**/api/vkos", (rota) => rota.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ pasta: null, valida: false, cerebroPreenchido: false, totalSkills: 0 }),
            }));
          }
          if (usarFixtures && tela.id === "acesso") {
            await pagina.route("**/api/auth/estado", (rota) => rota.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ precisaBootstrap: true, modo: "core", obrigatoria: true, totpAtivo: false }),
            }));
          }
          await pagina.setViewportSize({ width: largura.width, height: largura.height });
          await pagina.addInitScript((temaInicial) => {
            try {
              localStorage.setItem("vkos-tema", temaInicial);
            } catch {
              // Iframes de preview podem ser sandboxados sem allow-same-origin.
            }
          }, tema);
          await pagina.goto(`${core}${rota}`, {
            waitUntil: usarFixtures && tela.id === "splash" ? "domcontentloaded" : "networkidle",
            timeout: 30_000,
          });
          await pagina.waitForTimeout(350);
          if (usarFixtures && tela.id === "admin" && estadoAdmin) {
            if (["detalhe", "acesso", "consumo"].includes(estadoAdmin)) {
              await pagina.getByRole("button", { name: "Gerenciar" }).click();
              if (estadoAdmin === "acesso") {
                await pagina.getByRole("tab", { name: "Acesso" }).click();
              }
              if (estadoAdmin === "consumo") {
                await pagina.getByRole("tab", { name: "Consumo" }).click();
              }
            } else if (estadoAdmin === "modelos") {
              await pagina.getByRole("tab", { name: "Modelos" }).click();
            } else if (estadoAdmin === "seguranca") {
              await pagina.getByRole("tab", { name: "Segurança" }).click();
            }
            await pagina.waitForTimeout(200);
          }
          if (usarFixtures && tela.id === "ide") {
            await pagina.getByRole("button", { name: "VKOS-IDE" }).click();
            await pagina.waitForTimeout(350);
          }
          const medida = await pagina.evaluate(() => ({
            larguraDocumento: document.documentElement.scrollWidth,
            larguraJanela: window.innerWidth,
            tema: document.documentElement.dataset.theme,
            tokens: Object.fromEntries(["--fundo", "--superficie", "--texto", "--texto-suave"].map((token) => [token, getComputedStyle(document.documentElement).getPropertyValue(token).trim()])),
          }));
          if (medida.larguraDocumento > medida.larguraJanela) {
            erros.push(`overflow horizontal: ${medida.larguraDocumento}px > ${medida.larguraJanela}px`);
          }
          if (medida.tema !== tema) erros.push(`tema ativo ${medida.tema ?? "ausente"}, esperado ${tema}`);
          for (const fundo of ["--fundo", "--superficie"]) {
            for (const texto of ["--texto", "--texto-suave"]) {
              const taxa = contraste(medida.tokens[texto], medida.tokens[fundo]);
              if (taxa !== null && taxa < 4.5) erros.push(`contraste ${texto} em ${fundo}: ${taxa.toFixed(2)}:1`);
            }
          }
          if (tela.id === "acesso") {
            const rolagem = await pagina.locator(".acesso").evaluate((elemento) => {
              const antes = elemento.scrollTop;
              elemento.scrollTop = 32;
              const depois = elemento.scrollTop;
              elemento.scrollTop = antes;
              return { precisa: elemento.scrollHeight > elemento.clientHeight, funciona: depois > 0 };
            });
            if (rolagem.precisa && !rolagem.funciona) erros.push("conteúdo vertical excede a tela sem rolagem funcional");
          }
          const sufixoEstado = tela.id === "admin" && estadoAdmin
            ? `-${nomeSeguro(estadoAdmin)}`
            : "";
          const arquivo = `${nomeSeguro(tela.id)}${sufixoEstado}-${tema}-${largura.nome}.png`;
          await pagina.screenshot({ path: join(destino, arquivo), fullPage: true });
          const item = { tela: tela.id, rota, ...(sufixoEstado ? { estado: estadoAdmin } : {}), tema, largura: largura.nome, arquivo, erros };
          relatorio.capturas.push(item);
          if (erros.length) relatorio.falhas.push(item);
        } catch (erro) {
          relatorio.falhas.push({ tela: tela.id, rota, tema, largura: largura.nome, erros: [erro.message] });
        } finally {
          await pagina.close();
        }
      }
    }
  }
} finally {
  await navegador.close();
  const nomeRelatorio = estadoAdmin
    ? `relatorio-admin-${nomeSeguro(estadoAdmin)}.json`
    : "relatorio.json";
  writeFileSync(join(destino, nomeRelatorio), `${JSON.stringify(relatorio, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({ destino, fixtures: usarFixtures, capturas: relatorio.capturas.length, ignoradas: relatorio.ignoradas.length, falhas: relatorio.falhas.length }));
if (relatorio.falhas.length) process.exitCode = 1;
