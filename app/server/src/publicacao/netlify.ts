import archiver from "archiver";

import { lerConexoes } from "../conexoes/estado.js";
import { coletarArquivosPublicaveis, type ArquivoPublicavel } from "./arquivos.js";
import {
  atualizarRegistroPeca,
  registroDaPeca,
  type ModoPublicacaoRegistro,
  type RegistroNetlify,
} from "./estado.js";
import { ErroPublicacao, lerRespostaExterna } from "./http.js";

const API = "https://api.netlify.com/api/v1";

interface RespostaNetlify {
  id?: string;
  site_id?: string;
  deploy_id?: string;
  name?: string;
  state?: string;
  url?: string;
  ssl_url?: string;
  admin_url?: string;
  deploy_url?: string;
  deploy_ssl_url?: string;
  error_message?: string;
}

interface ContaNetlify {
  slug?: string;
  name?: string;
}

export interface ResultadoNetlify extends RegistroNetlify {
  pendente?: boolean;
}

const STATUS_PUBLICO_OK_MIN = 200;
const STATUS_PUBLICO_OK_MAX = 399;

export function nomeUnicoSiteNetlify(pasta: string, siteId: string): string {
  const sufixo = siteId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "site";
  const base = pasta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site";
  const limiteBase = Math.max(1, 63 - "vkos--".length - sufixo.length);
  return `vkos-${base.slice(0, limiteBase).replace(/-+$/g, "")}-${sufixo}`;
}

function conexaoNetlify(workspaceId: string): { token: string; accountSlug: string } {
  const conexao = lerConexoes(workspaceId).servidores.netlify;
  const token = conexao?.config.token?.trim() ?? "";
  if (!conexao?.habilitado || !token) {
    throw new ErroPublicacao("Conecte a Netlify em Conexões antes de publicar.", 400);
  }
  return {
    token,
    accountSlug: conexao?.config.accountSlug?.trim() ?? "",
  };
}

async function montarZip(
  workspaceId: string,
  pasta: string,
  arquivosExplicitos?: ArquivoPublicavel[],
): Promise<Buffer> {
  const arquivos = arquivosExplicitos ?? coletarArquivosPublicaveis(workspaceId, pasta);
  return new Promise<Buffer>((resolve, reject) => {
    const zip = archiver("zip", { zlib: { level: 6 } });
    const partes: Buffer[] = [];
    zip.on("data", (parte: Buffer) => partes.push(Buffer.from(parte)));
    zip.on("warning", (erro) => reject(erro));
    zip.on("error", (erro) => reject(erro));
    zip.on("end", () => resolve(Buffer.concat(partes)));
    for (const arquivo of arquivos) {
      zip.append(arquivo.conteudo, { name: arquivo.caminho });
    }
    void zip.finalize();
  });
}

async function aguardarDeploy(
  token: string,
  deployId: string,
): Promise<RespostaNetlify | null> {
  const limite = Date.now() + 90_000;
  while (Date.now() < limite) {
    const resposta = await fetch(`${API}/deploys/${encodeURIComponent(deployId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const deploy = await lerRespostaExterna<RespostaNetlify>(resposta, "Netlify");
    if (deploy.state === "ready") return deploy;
    if (deploy.state === "error") {
      throw new ErroPublicacao(
        deploy.error_message
          ? `A Netlify recusou o deploy. ${deploy.error_message}`
          : "A Netlify recusou o deploy.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return null;
}

async function statusUrlPublica(url: string): Promise<number | null> {
  try {
    const resposta = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 VKOS-Hub-Publicacao",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    await resposta.body?.cancel();
    return resposta.status;
  } catch {
    return null;
  }
}

async function aguardarUrlPublica(
  url: string,
  tentativas = 5,
): Promise<number | null> {
  let ultimo: number | null = null;
  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    ultimo = await statusUrlPublica(url);
    if (
      ultimo !== null &&
      ultimo >= STATUS_PUBLICO_OK_MIN &&
      ultimo <= STATUS_PUBLICO_OK_MAX
    ) {
      return ultimo;
    }
    // O 429 no subdominio recem-criado nao melhora por propagacao. Quem chama
    // tenta recuperar o mesmo site com um nome unico.
    if (ultimo === 429) return ultimo;
    if (tentativa < tentativas - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
  }
  return ultimo;
}

async function criarSiteVazio(
  token: string,
  pasta: string,
  accountSlug: string,
): Promise<RespostaNetlify> {
  const nome = nomeUnicoSiteNetlify(pasta, Date.now().toString(36));
  const resposta = await fetch(
    `${API}/${encodeURIComponent(accountSlug)}/sites`,
    {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: nome }),
    },
  );
  return lerRespostaExterna<RespostaNetlify>(resposta, "Netlify");
}

async function resolverContaNetlify(
  token: string,
  configurada: string,
): Promise<string> {
  if (configurada) return configurada;
  const resposta = await fetch(`${API}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const contas = await lerRespostaExterna<ContaNetlify[]>(resposta, "Netlify");
  const slug = contas.find((conta) => conta.slug?.trim())?.slug?.trim();
  if (!slug) {
    throw new ErroPublicacao(
      "A Netlify não informou um time disponível. Preencha o slug do time em Conexões.",
      400,
    );
  }
  return slug;
}

async function enviarZip(
  token: string,
  siteId: string,
  zip: Buffer,
): Promise<RespostaNetlify> {
  const resposta = await fetch(
    `${API}/sites/${encodeURIComponent(siteId)}/deploys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: zip as unknown as BodyInit,
    },
  );
  return lerRespostaExterna<RespostaNetlify>(resposta, "Netlify");
}

export interface OpcoesPublicarNetlify {
  // Arvore a subir no ZIP. Sem ela, coleta a peca HTML crua (modo html).
  arquivos?: ArquivoPublicavel[];
  modo?: ModoPublicacaoRegistro;
}

export async function publicarNaNetlify(
  workspaceId: string,
  pasta: string,
  opcoes: OpcoesPublicarNetlify = {},
): Promise<ResultadoNetlify> {
  const conexao = conexaoNetlify(workspaceId);
  const token = conexao.token;
  const accountSlug = await resolverContaNetlify(token, conexao.accountSlug);
  const zip = await montarZip(workspaceId, pasta, opcoes.arquivos);
  const salvo = registroDaPeca(workspaceId, pasta).netlify;
  const siteCriado = salvo ? null : await criarSiteVazio(token, pasta, accountSlug);
  let siteId = salvo?.siteId || siteCriado?.id;
  if (!siteId) throw new ErroPublicacao("A Netlify não devolveu o identificador do site.");
  let enviada = await enviarZip(token, siteId, zip);
  const deployId = enviada.deploy_id || enviada.id;
  let confirmada = deployId ? await aguardarDeploy(token, deployId) : null;
  let url =
    confirmada?.ssl_url ||
    confirmada?.deploy_ssl_url ||
    confirmada?.url ||
    enviada.ssl_url ||
    enviada.deploy_ssl_url ||
    enviada.url ||
    enviada.deploy_url ||
    siteCriado?.ssl_url ||
    siteCriado?.url ||
    salvo?.url;
  if (!url) throw new ErroPublicacao("A Netlify recebeu o deploy, mas não devolveu a URL do site.");

  let statusPublico = await aguardarUrlPublica(url);
  let adminUrl: string | undefined;
  if (statusPublico === 429) {
    // Projetos criados pela operacao combinada de site + ZIP podem ficar presos
    // em um bloqueio 429 da borda mesmo com deploy ready. Migra para um projeto
    // criado explicitamente e so entao envia o mesmo ZIP.
    const substituto = await criarSiteVazio(token, pasta, accountSlug);
    if (!substituto.id) {
      throw new ErroPublicacao("A Netlify não devolveu o identificador do projeto substituto.");
    }
    siteId = substituto.id;
    enviada = await enviarZip(token, siteId, zip);
    const deploySubstituto = enviada.deploy_id || enviada.id;
    confirmada = deploySubstituto
      ? await aguardarDeploy(token, deploySubstituto)
      : null;
    url =
      confirmada?.ssl_url ||
      confirmada?.deploy_ssl_url ||
      confirmada?.url ||
      enviada.ssl_url ||
      enviada.deploy_ssl_url ||
      enviada.url ||
      enviada.deploy_url ||
      substituto.ssl_url ||
      substituto.url;
    adminUrl = substituto.admin_url;
    if (!url) {
      throw new ErroPublicacao("O novo projeto foi criado, mas a Netlify não devolveu a URL.");
    }
    statusPublico = await aguardarUrlPublica(url);
  }
  if (
    statusPublico === null ||
    statusPublico < STATUS_PUBLICO_OK_MIN ||
    statusPublico > STATUS_PUBLICO_OK_MAX
  ) {
    const detalhe = statusPublico === null ? "sem resposta" : `HTTP ${statusPublico}`;
    const painel = adminUrl ? ` Confira o projeto em ${adminUrl}.` : "";
    throw new ErroPublicacao(
      `O deploy terminou, mas a URL pública ainda não está acessível (${detalhe}).${painel}`,
    );
  }

  const registro: RegistroNetlify = {
    siteId,
    url,
    em: new Date().toISOString(),
    modo: opcoes.modo ?? "html",
  };
  atualizarRegistroPeca(workspaceId, pasta, { netlify: registro });
  return confirmada ? registro : { ...registro, pendente: true };
}
