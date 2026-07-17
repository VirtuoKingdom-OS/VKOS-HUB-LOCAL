import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { resolverArquivoSite } from "../vkos/siteEstatico.js";

export type TipoEscopoPeca = "carrossel" | "site";

export interface EscopoPecaSolicitado {
  pasta?: unknown;
  tipo?: unknown;
  arquivo?: unknown;
  revisaoDesign?: unknown;
}

export interface EscopoPecaResolvido {
  pastaTrabalho: string;
  pasta: string;
  tipo: TipoEscopoPeca;
  arquivo: string;
  skill: "ajuste-carrossel" | "ajuste-site";
  revisaoDesign: boolean;
}

export class ErroEscopoPeca extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

function segmentoSeguro(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    valor.length > 0 &&
    !valor.includes("/") &&
    !valor.includes("\\") &&
    !valor.includes("..") &&
    !valor.startsWith(".") &&
    !valor.includes("\0")
  );
}

// Resolve a pasta por confinamento real em conteudo/. O cwd da sessao passa a
// ser esta pasta, reduzindo o limite de escrita do provedor ao artefato aberto.
export function resolverEscopoPeca(
  pastaVkos: string,
  solicitado: EscopoPecaSolicitado,
): EscopoPecaResolvido {
  if (!segmentoSeguro(solicitado.pasta)) {
    throw new ErroEscopoPeca(400, "pasta da peca invalida");
  }
  if (solicitado.tipo !== "carrossel" && solicitado.tipo !== "site") {
    throw new ErroEscopoPeca(400, "tipo de peca invalido");
  }
  if (
    solicitado.revisaoDesign !== undefined &&
    typeof solicitado.revisaoDesign !== "boolean"
  ) {
    throw new ErroEscopoPeca(400, "revisao de design invalida");
  }
  if (solicitado.revisaoDesign === true && solicitado.tipo !== "site") {
    throw new ErroEscopoPeca(400, "revisao de design so existe para site");
  }

  const base = resolve(join(pastaVkos, "conteudo"));
  const pastaTrabalho = resolve(base, solicitado.pasta);
  const rel = relative(base, pastaTrabalho);
  if (!rel || rel.startsWith("..") || rel.includes(sep + "..") || !pastaTrabalho.startsWith(base + sep)) {
    throw new ErroEscopoPeca(400, "pasta da peca invalida");
  }
  if (!existsSync(pastaTrabalho) || !statSync(pastaTrabalho).isDirectory()) {
    throw new ErroEscopoPeca(404, "peca nao encontrada");
  }

  let arquivo: string;
  let alvo: string;
  if (solicitado.tipo === "carrossel") {
    arquivo = "carrossel.html";
    alvo = resolve(pastaTrabalho, arquivo);
  } else {
    if (typeof solicitado.arquivo !== "string") {
      throw new ErroEscopoPeca(400, "arquivo html do site invalido");
    }
    try {
      alvo = resolverArquivoSite(pastaTrabalho, solicitado.arquivo);
      arquivo = relative(pastaTrabalho, alvo).replace(/\\/g, "/");
    } catch {
      throw new ErroEscopoPeca(400, "arquivo html do site invalido");
    }
  }
  if (!alvo.startsWith(pastaTrabalho + sep) || !existsSync(alvo) || !statSync(alvo).isFile()) {
    throw new ErroEscopoPeca(404, "arquivo da peca nao encontrado");
  }

  return {
    pastaTrabalho,
    pasta: solicitado.pasta,
    tipo: solicitado.tipo,
    arquivo,
    skill: solicitado.tipo === "carrossel" ? "ajuste-carrossel" : "ajuste-site",
    revisaoDesign: solicitado.revisaoDesign === true,
  };
}

export function lerPrincipiosVisuaisSite(pastaVkos: string): string {
  const caminho = join(pastaVkos, "templates", "site", "principios-visuais.md");
  try {
    const conteudo = readFileSync(caminho, "utf8").trim();
    if (!conteudo) throw new Error();
    return conteudo;
  } catch {
    throw new ErroEscopoPeca(
      409,
      "O guia visual do site nao foi encontrado neste workspace.",
    );
  }
}

export function montarPromptAjustePeca(
  pedido: string,
  escopo: EscopoPecaResolvido,
  cerebro: string,
  principiosVisuais?: string,
): string {
  const substantivo = escopo.tipo === "carrossel" ? "carrossel" : "site";
  const caminhoArquivo = join(escopo.pastaTrabalho, escopo.arquivo);
  const fonte = readFileSync(caminhoArquivo, "utf8");
  // O arquivo vai no prompt para o ajuste continuar possível quando o shell
  // do provedor estiver indisponível. O limite evita estourar o contexto em um
  // site excepcionalmente grande; nesse caso o provedor ainda pode ler no cwd.
  const fonteNoPrompt = fonte.length <= 750_000 ? fonte : "";
  return [
    `Ajuste exclusivamente o ${substantivo} aberto no VKOS Hub.`,
    `Seu diretorio de trabalho ja e a raiz da peca: conteudo/${escopo.pasta}/.`,
    `Arquivo principal desta tela: ${escopo.arquivo}.`,
    "A fonte atual do arquivo principal esta incluida abaixo. Use-a como referencia exata e aplique a edicao diretamente no arquivo, sem depender de comandos de shell para conseguir comecar.",
    "Faca a menor alteracao suficiente para atender ao pedido e preserve tudo que nao foi solicitado.",
    "Voce pode editar apenas arquivos que ja estejam dentro do diretorio de trabalho atual e pode criar imagens somente em img/ quando o pedido exigir.",
    ...(pedido.includes("anexos/")
      ? [
          "Se o pedido citar materiais em anexos/, eles sao a fonte preferencial. Imagem anexada se copia de anexos/ para img/ e se referencia por caminho relativo img/<nome> no HTML. Nao gere imagem nova quando um anexo de imagem atende o pedido.",
        ]
      : []),
    "LIMITE OBRIGATORIO: nao leia, escreva, renomeie nem apague nada fora do diretorio atual. Nao use caminhos com .., caminhos absolutos, Git, npm install ou comandos que atinjam o restante do workspace.",
    escopo.tipo === "site" && escopo.revisaoDesign
      ? "Esta e uma revisao do SITE INTEIRO. Inspecione e corrija todas as paginas HTML e os recursos compartilhados dentro desta peca, mantendo navegacao, marca, componentes e direcao visual consistentes."
      : escopo.tipo === "site"
      ? "Nao crie carrossel.html nem arquivos markdown. Preserve as outras paginas do site, salvo quando o pedido mencionar explicitamente o site inteiro."
      : "Mantenha carrossel.html como fonte da peca. Nao renderize PNG, nao rode Playwright e nao altere outro carrossel.",
    "",
    fonteNoPrompt
      ? `Fonte atual de ${escopo.arquivo}:`
      : `A fonte de ${escopo.arquivo} excede o limite de contexto e deve ser lida diretamente no diretorio atual.`,
    ...(fonteNoPrompt ? ["<arquivo_atual>", fonteNoPrompt, "</arquivo_atual>"] : []),
    "",
    "Contexto integral do negocio, somente para orientar identidade, voz, oferta e visual:",
    "<cerebro>",
    cerebro.trim(),
    "</cerebro>",
    ...(escopo.revisaoDesign && principiosVisuais
      ? [
          "",
          "Contrato visual integral do site. Ele foi injetado pelo Hub porque o diretorio da peca e confinado:",
          "<principios_visuais>",
          principiosVisuais.trim(),
          "</principios_visuais>",
        ]
      : []),
    "",
    "Pedido do usuario:",
    `<pedido>${pedido.trim()}</pedido>`,
    "",
    "Reforce o limite: o pedido nao autoriza nenhuma mudanca fora desta peca. Ao terminar, responda em uma frase curta com o arquivo alterado.",
  ].join("\n");
}
