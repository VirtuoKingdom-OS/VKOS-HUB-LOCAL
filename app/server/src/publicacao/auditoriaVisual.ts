import { chromium, type Browser, type Page } from "playwright-core";

export interface AuditoriaVisualSite {
  executada: boolean;
  erros: string[];
  avisos: string[];
}

async function abrirNavegador(): Promise<Browser> {
  const canais = process.platform === "win32"
    ? ["msedge", "chrome"]
    : ["chrome", "msedge"];
  let ultimoErro: unknown;
  for (const channel of canais) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error("Edge ou Chrome não encontrado.");
}

function urlPagina(base: string, pagina: string): string {
  const caminho = pagina.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/+$/, "")}/${caminho}`;
}

function adicionarUnico(lista: string[], mensagem: string): void {
  if (!lista.includes(mensagem)) lista.push(mensagem);
}

// O servidor roda por tsx/esbuild, que pode preservar nomes de funções locais
// com um helper __name. A função enviada ao Playwright não carrega helpers do
// processo Node, então expomos a identidade mínima dentro da página auditada.
async function prepararAvaliacao(aba: Page): Promise<void> {
  await aba.evaluate("globalThis.__name = (alvo) => alvo");
}

async function percorrerPagina(aba: Page): Promise<void> {
  const medidas = await aba.evaluate(() => ({
    altura: document.documentElement.scrollHeight,
    viewport: innerHeight,
  }));
  const passo = Math.max(320, Math.floor(medidas.viewport * 0.72));
  const maximoPassos = 24;
  for (let y = 0, n = 0; y < medidas.altura && n < maximoPassos; y += passo, n += 1) {
    await aba.evaluate((topo) => scrollTo(0, topo), y);
    await aba.waitForTimeout(55);
  }
  await aba.evaluate(() => scrollTo(0, 0));
  await aba.waitForTimeout(80);
}

async function conferirSemJavaScript(
  navegador: Browser,
  url: string,
  pagina: string,
  erros: string[],
): Promise<void> {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const aba = await contexto.newPage();
  try {
    const resposta = await aba.goto(url, { waitUntil: "load", timeout: 30_000 });
    if (!resposta?.ok()) return;
    await prepararAvaliacao(aba);
    const ocultos = await aba.evaluate(() => {
      const nome = (elemento: Element) => {
        if (elemento.id) return `#${elemento.id}`;
        if (elemento.classList.length > 0) {
          return `.${Array.from(elemento.classList).join(".")}`;
        }
        return elemento.tagName.toLowerCase();
      };
      return Array.from(
        document.querySelectorAll<HTMLElement>(
          "main h1, main h2, main h3, main p, main a, main li, main .reveal",
        ),
      )
        .filter((elemento) => {
          if (!(elemento.textContent ?? "").trim()) return false;
          if (elemento.closest("dialog, details:not([open]), [aria-hidden='true']")) return false;
          const estilo = getComputedStyle(elemento);
          const caixa = elemento.getBoundingClientRect();
          return estilo.opacity === "0" ||
            estilo.visibility === "hidden" ||
            estilo.display === "none" ||
            caixa.height === 0;
        })
        .map(nome)
        .slice(0, 6);
    });
    if (ocultos.length > 0) {
      adicionarUnico(
        erros,
        `${pagina} esconde conteúdo quando o JavaScript está desligado: ${ocultos.join(", ")}.`,
      );
    }
  } finally {
    await contexto.close();
  }
}

async function conferirMovimentoReduzido(
  navegador: Browser,
  url: string,
  pagina: string,
  erros: string[],
): Promise<void> {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const aba = await contexto.newPage();
  try {
    const resposta = await aba.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    if (!resposta?.ok()) return;
    await prepararAvaliacao(aba);
    await percorrerPagina(aba);
    const animados = await aba.evaluate(() => {
      const maximo = (valor: string) => Math.max(
        0,
        ...valor.split(",").map((item) => {
          const limpo = item.trim();
          const numero = Number.parseFloat(limpo) || 0;
          return limpo.endsWith("ms") ? numero / 1000 : numero;
        }),
      );
      const nome = (elemento: Element) => {
        if (elemento.id) return `#${elemento.id}`;
        if (elemento.classList.length > 0) {
          return `.${Array.from(elemento.classList).join(".")}`;
        }
        return elemento.tagName.toLowerCase();
      };
      const propriedadesDeMovimento =
        /(^|,\s*)(all|transform|translate|rotate|scale|top|right|bottom|left|width|height|max-height)(\s*,|$)/i;
      return Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((elemento) => {
          const estilo = getComputedStyle(elemento);
          const animacaoAtiva = estilo.animationName !== "none" &&
            maximo(estilo.animationDuration) > 0.02;
          const transicaoDeMovimento = propriedadesDeMovimento.test(estilo.transitionProperty) &&
            maximo(estilo.transitionDuration) > 0.02;
          return animacaoAtiva || transicaoDeMovimento;
        })
        .map(nome)
        .slice(0, 6);
    });
    if (animados.length > 0) {
      adicionarUnico(
        erros,
        `${pagina} mantém movimento com prefers-reduced-motion: reduce em ${animados.join(", ")}.`,
      );
    }
  } finally {
    await contexto.close();
  }
}

export async function auditarSiteNoNavegador(
  baseUrl: string,
  paginas: string[],
): Promise<AuditoriaVisualSite> {
  let navegador: Browser;
  try {
    navegador = await abrirNavegador();
  } catch {
    return {
      executada: false,
      erros: [],
      avisos: [
        "A conferência visual automática não rodou porque Edge ou Chrome não foi encontrado.",
      ],
    };
  }

  const erros: string[] = [];
  const avisos: string[] = [];
  try {
    for (const pagina of paginas) {
      const url = urlPagina(baseUrl, pagina);
      await Promise.all(([390, 1440] as const).map(async (largura) => {
        const contexto = await navegador.newContext({
          viewport: { width: largura, height: largura === 390 ? 844 : 900 },
        });
        const aba = await contexto.newPage();
        const recursosQuebrados: string[] = [];
        const errosPagina: string[] = [];
        aba.on("response", (resposta) => {
          if (resposta.status() < 400) return;
          if (!resposta.url().startsWith(baseUrl)) return;
          recursosQuebrados.push(`${resposta.status()} ${resposta.url()}`);
        });
        aba.on("pageerror", (erro) => errosPagina.push(erro.message));
        try {
          const resposta = await aba.goto(url, {
            waitUntil: "networkidle",
            timeout: 30_000,
          });
          if (!resposta || !resposta.ok()) {
            adicionarUnico(erros, `${pagina} não abriu em ${largura}px.`);
            return;
          }
          await prepararAvaliacao(aba);
          await aba.evaluate(() => document.fonts.ready);
          const layout = await aba.evaluate(() => {
            const larguraDocumento = document.documentElement.scrollWidth;
            const linksCss = Array.from(
              document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]'),
            );
            const cssLocaisSemFolha = linksCss
              .filter((link) => {
                const urlFolha = new URL(link.href, location.href);
                return urlFolha.origin === location.origin && !link.sheet;
              })
              .map((link) => link.getAttribute("href") || link.href);
            const estourado = Array.from(document.querySelectorAll<HTMLElement>("body *"))
              .map((elemento) => {
                const caixa = elemento.getBoundingClientRect();
                return {
                  nome: elemento.id
                    ? `#${elemento.id}`
                    : elemento.classList.length > 0
                      ? `.${Array.from(elemento.classList).join(".")}`
                      : elemento.tagName.toLowerCase(),
                  esquerda: caixa.left,
                  direita: caixa.right,
                };
              })
              .find((item) => item.esquerda < -1 || item.direita > innerWidth + 1);
            return {
              larguraDocumento,
              larguraViewport: innerWidth,
              cssLocaisSemFolha,
              estourado,
            };
          });

          await percorrerPagina(aba);
          const contrato = await aba.evaluate(() => {
            interface Cor { r: number; g: number; b: number; a: number }
            const nome = (elemento: Element) => {
              if (elemento.id) return `#${elemento.id}`;
              if (elemento.classList.length > 0) {
                return `.${Array.from(elemento.classList).join(".")}`;
              }
              return elemento.tagName.toLowerCase();
            };
            const visivel = (elemento: HTMLElement) => {
              const estilo = getComputedStyle(elemento);
              const caixa = elemento.getBoundingClientRect();
              return estilo.display !== "none" &&
                estilo.visibility !== "hidden" &&
                Number.parseFloat(estilo.opacity) > 0 &&
                caixa.width > 0 && caixa.height > 0;
            };
            const parseCor = (valor: string): Cor | null => {
              const numeros = valor.match(/[\d.]+/g)?.map(Number) ?? [];
              if (numeros.length < 3) return null;
              return {
                r: numeros[0],
                g: numeros[1],
                b: numeros[2],
                a: numeros.length >= 4 ? numeros[3] : 1,
              };
            };
            const sobre = (frente: Cor, fundo: Cor): Cor => {
              const alfa = frente.a + fundo.a * (1 - frente.a);
              if (alfa <= 0) return { r: 255, g: 255, b: 255, a: 1 };
              return {
                r: (frente.r * frente.a + fundo.r * fundo.a * (1 - frente.a)) / alfa,
                g: (frente.g * frente.a + fundo.g * fundo.a * (1 - frente.a)) / alfa,
                b: (frente.b * frente.a + fundo.b * fundo.a * (1 - frente.a)) / alfa,
                a: alfa,
              };
            };
            const luminancia = (cor: Cor) => {
              const canais = [cor.r, cor.g, cor.b].map((canal) => {
                const valor = canal / 255;
                return valor <= 0.04045
                  ? valor / 12.92
                  : Math.pow((valor + 0.055) / 1.055, 2.4);
              });
              return canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
            };
            const fundoDo = (elemento: HTMLElement): Cor | null => {
              const cadeia: HTMLElement[] = [];
              let atual: HTMLElement | null = elemento;
              while (atual) {
                cadeia.unshift(atual);
                atual = atual.parentElement;
              }
              let fundo: Cor = { r: 255, g: 255, b: 255, a: 1 };
              for (const item of cadeia) {
                const estilo = getComputedStyle(item);
                if (estilo.backgroundImage !== "none") return null;
                const cor = parseCor(estilo.backgroundColor);
                if (cor && cor.a > 0) fundo = sobre(cor, fundo);
              }
              return fundo;
            };

            const diretosPermitidos = new Set([
              "A", "HEADER", "MAIN", "SECTION", "FOOTER", "NAV", "DIALOG", "SCRIPT", "STYLE",
            ]);
            const bodyGenericos = Array.from(document.body.children)
              .filter((elemento) =>
                !diretosPermitidos.has(elemento.tagName) &&
                elemento.getAttribute("aria-hidden") !== "true"
              )
              .map(nome);

            const desativadosInvalidos = Array.from(
              document.querySelectorAll<HTMLElement>('[aria-disabled="true"]'),
            )
              .filter((elemento) =>
                /(?:^|\s)(?:btn|button|card|link|cta)(?:\s|$|-)/i.test(elemento.className) &&
                elemento.tagName !== "A"
              )
              .map(nome);
            const desativadosSemEvento = Array.from(
              document.querySelectorAll<HTMLElement>('[aria-disabled="true"]'),
            )
              .filter((elemento) => getComputedStyle(elemento).pointerEvents === "none")
              .map(nome);
            const menusInvalidos = Array.from(
              document.querySelectorAll<HTMLElement>(".menu-toggle"),
            )
              .filter((elemento) => elemento.tagName !== "BUTTON")
              .map(nome);

            const elementos = Array.from(document.querySelectorAll<HTMLElement>("body *"));
            const gradientText = elementos
              .filter((elemento) => {
                const estilo = getComputedStyle(elemento);
                return estilo.backgroundClip === "text" ||
                  (estilo as CSSStyleDeclaration & { webkitBackgroundClip?: string })
                    .webkitBackgroundClip === "text";
              })
              .map(nome)
              .slice(0, 6);
            const vidro = elementos
              .filter((elemento) => {
                const estilo = getComputedStyle(elemento) as CSSStyleDeclaration & {
                  backdropFilter?: string;
                  webkitBackdropFilter?: string;
                };
                return (estilo.backdropFilter && estilo.backdropFilter !== "none") ||
                  (estilo.webkitBackdropFilter && estilo.webkitBackdropFilter !== "none");
              })
              .map(nome)
              .slice(0, 6);
            const barraLateral = elementos
              .filter((elemento) => {
                const estilo = getComputedStyle(elemento);
                return Number.parseFloat(estilo.borderLeftWidth) >= 3 &&
                  Number.parseFloat(estilo.borderTopWidth) <= 1 &&
                  Number.parseFloat(estilo.borderRightWidth) <= 1;
              })
              .map(nome)
              .slice(0, 6);

            const imagensExternas = Array.from(
              document.querySelectorAll<HTMLImageElement>("img[src]"),
            )
              .filter((imagem) => {
                try { return new URL(imagem.currentSrc || imagem.src).origin !== location.origin; }
                catch { return false; }
              })
              .map(nome);
            for (const elemento of elementos) {
              const fundo = getComputedStyle(elemento).backgroundImage;
              for (const achado of fundo.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
                try {
                  if (new URL(achado[1], location.href).origin !== location.origin) {
                    imagensExternas.push(nome(elemento));
                  }
                } catch { /* URL inválida será coberta pela auditoria estrutural. */ }
              }
            }

            const textoPagina = `${document.title}\n${document.body.innerText}`;
            const caracteresProibidos = [
              ...(textoPagina.includes("—") ? ["travessão"] : []),
              ...(/\s·\s/.test(textoPagina) ? ["ponto centrado como separador"] : []),
            ];
            const revealsOcultos = Array.from(
              document.querySelectorAll<HTMLElement>("main .reveal"),
            )
              .filter((elemento) => {
                if (!(elemento.textContent ?? "").trim()) return false;
                const estilo = getComputedStyle(elemento);
                return estilo.opacity === "0" ||
                  estilo.visibility === "hidden" ||
                  estilo.display === "none";
              })
              .map(nome)
              .slice(0, 6);

            const gruposCards = new Map<string, number>();
            for (const elemento of elementos) {
              if (!/(?:^|\s)[\w-]*card(?:\s|$)/i.test(elemento.className)) continue;
              if (!visivel(elemento)) continue;
              const classes = Array.from(elemento.classList)
                .filter((classe) => !["reveal", "is-visible", "ativo", "active"].includes(classe))
                .sort()
                .join(".");
              const chave = `${elemento.tagName.toLowerCase()}.${classes}`;
              gruposCards.set(chave, (gruposCards.get(chave) ?? 0) + 1);
            }
            const gradesRepetitivas = Array.from(gruposCards.entries())
              .filter(([, quantidade]) => quantidade >= 6)
              .map(([grupo, quantidade]) => `${grupo} (${quantidade})`)
              .slice(0, 4);

            const secoes = document.querySelectorAll("main section, body > section").length;
            const eyebrows = document.querySelectorAll(
              ".eyebrow, [class*='eyebrow'], .section-kicker",
            ).length;
            const excessoEyebrow = secoes >= 3 && eyebrows > Math.ceil(secoes / 2)
              ? [`${eyebrows} rótulos em ${secoes} seções`]
              : [];

            const contrastes = Array.from(
              document.querySelectorAll<HTMLElement>(
                "h1, h2, h3, h4, p, a, button, li, label, small, strong, span",
              ),
            )
              .filter((elemento) => {
                if (!visivel(elemento) || elemento.closest('[aria-disabled="true"]')) return false;
                const textoDireto = Array.from(elemento.childNodes)
                  .filter((no) => no.nodeType === Node.TEXT_NODE)
                  .map((no) => no.textContent ?? "")
                  .join("")
                  .trim();
                return textoDireto.length > 0;
              })
              .flatMap((elemento) => {
                const estilo = getComputedStyle(elemento);
                const fundo = fundoDo(elemento);
                const frenteBruta = parseCor(estilo.color);
                if (!fundo || !frenteBruta) return [];
                const frente = sobre(frenteBruta, fundo);
                const l1 = luminancia(frente);
                const l2 = luminancia(fundo);
                const razao = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
                const tamanho = Number.parseFloat(estilo.fontSize);
                const peso = Number.parseInt(estilo.fontWeight, 10) || 400;
                const grande = tamanho >= 24 || (tamanho >= 18.66 && peso >= 700);
                const minimo = grande ? 3 : 4.5;
                return razao < minimo - 0.15
                  ? [{ alvo: nome(elemento), razao: razao.toFixed(2), minimo }]
                  : [];
              })
              .slice(0, 8);

            return {
              bodyGenericos,
              desativadosInvalidos,
              desativadosSemEvento,
              menusInvalidos,
              gradientText,
              vidro,
              barraLateral,
              imagensExternas: Array.from(new Set(imagensExternas)).slice(0, 6),
              caracteresProibidos,
              revealsOcultos,
              gradesRepetitivas,
              excessoEyebrow,
              contrastes,
            };
          });

          if (layout.cssLocaisSemFolha.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} não carregou o CSS local: ${layout.cssLocaisSemFolha.join(", ")}.`,
            );
          }
          if (layout.larguraDocumento > layout.larguraViewport + 1) {
            const alvo = layout.estourado?.nome
              ? ` O primeiro elemento fora da tela é ${layout.estourado.nome}.`
              : "";
            adicionarUnico(
              erros,
              `${pagina} cria rolagem horizontal em ${largura}px.${alvo}`,
            );
          }
          if (contrato.bodyGenericos.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} envolve o body em elemento genérico não editável pelo Studio: ${contrato.bodyGenericos.join(", ")}.`,
            );
          }
          if (contrato.desativadosInvalidos.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} usa destino desativado sem <a>: ${contrato.desativadosInvalidos.join(", ")}.`,
            );
          }
          if (contrato.desativadosSemEvento.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} desativa interação com pointer-events: ${contrato.desativadosSemEvento.join(", ")}.`,
            );
          }
          if (contrato.menusInvalidos.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} precisa usar <button type="button"> no menu: ${contrato.menusInvalidos.join(", ")}.`,
            );
          }
          if (contrato.gradientText.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} usa gradient text proibido em ${contrato.gradientText.join(", ")}.`,
            );
          }
          if (contrato.imagensExternas.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} usa imagem externa em ${contrato.imagensExternas.join(", ")}. Salve a imagem na peça.`,
            );
          }
          if (contrato.caracteresProibidos.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} contém ${contrato.caracteresProibidos.join(" e ")} no texto.`,
            );
          }
          if (contrato.revealsOcultos.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} mantém conteúdo invisível depois da rolagem: ${contrato.revealsOcultos.join(", ")}.`,
            );
          }
          if (contrato.gradesRepetitivas.length > 0) {
            adicionarUnico(
              erros,
              `${pagina} repete uma grade extensa de cards idênticos: ${contrato.gradesRepetitivas.join(", ")}.`,
            );
          }
          for (const contraste of contrato.contrastes) {
            adicionarUnico(
              erros,
              `${pagina} tem contraste ${contraste.razao}:1 em ${contraste.alvo}; o mínimo é ${contraste.minimo}:1.`,
            );
          }
          if (contrato.vidro.length > 0) {
            adicionarUnico(
              avisos,
              `${pagina} usa backdrop-filter em ${contrato.vidro.join(", ")}; confirme que há camada real atrás e não vidro decorativo.`,
            );
          }
          if (contrato.barraLateral.length > 0) {
            adicionarUnico(
              avisos,
              `${pagina} tem borda lateral grossa em ${contrato.barraLateral.join(", ")}.`,
            );
          }
          if (contrato.excessoEyebrow.length > 0) {
            adicionarUnico(
              avisos,
              `${pagina} pode estar repetindo eyebrow em excesso: ${contrato.excessoEyebrow.join(", ")}.`,
            );
          }
          for (const recurso of recursosQuebrados) {
            adicionarUnico(erros, `${pagina} carregou recurso quebrado: ${recurso}.`);
          }
          for (const erro of errosPagina) {
            adicionarUnico(avisos, `${pagina} gerou erro de JavaScript: ${erro}.`);
          }
        } catch (erro) {
          adicionarUnico(
            erros,
            `${pagina} falhou na conferência de ${largura}px: ${
              erro instanceof Error ? erro.message : String(erro)
            }`,
          );
        } finally {
          await contexto.close();
        }
      }));
      await Promise.all([
        conferirSemJavaScript(navegador, url, pagina, erros),
        conferirMovimentoReduzido(navegador, url, pagina, erros),
      ]);
    }
  } finally {
    await navegador.close();
  }
  return { executada: true, erros, avisos };
}
