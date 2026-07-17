import { lerConexoes } from "../conexoes/estado.js";
import { extrairDataTema } from "../vkos/pecas.js";
import { baseDoTema } from "../vkos/zip.js";
import { coletarArquivosPublicaveis, type ArquivoPublicavel } from "./arquivos.js";
import {
  atualizarRegistroPeca,
  registroDaPeca,
  type ModoPublicacaoRegistro,
  type RegistroGithub,
} from "./estado.js";
import { ErroPublicacao, lerRespostaExterna } from "./http.js";

const API = "https://api.github.com";

interface UsuarioGithub { login: string }
interface RepoGithub { name: string; html_url: string; default_branch?: string }
interface RefGithub { object: { sha: string } }
interface CriadoGithub { sha: string }

function tokenGithub(workspaceId: string): string {
  const conexao = lerConexoes(workspaceId).servidores.github;
  const token = conexao?.config.token?.trim() ?? "";
  if (!conexao?.habilitado || !token) {
    throw new ErroPublicacao("Conecte o GitHub em Conexões antes de publicar.", 400);
  }
  return token;
}

function cabecalhos(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function github<T>(
  token: string,
  caminho: string,
  init?: RequestInit,
): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    ...init,
    headers: { ...cabecalhos(token), ...(init?.headers ?? {}) },
  });
  return lerRespostaExterna<T>(resposta, "GitHub");
}

async function criarRepositorio(
  token: string,
  base: string,
): Promise<RepoGithub> {
  for (let numero = 1; numero <= 20; numero++) {
    const nome = numero === 1 ? base : `${base}-${numero}`;
    const resposta = await fetch(`${API}/user/repos`, {
      method: "POST",
      headers: cabecalhos(token),
      body: JSON.stringify({ name: nome, private: true, auto_init: true }),
    });
    if (resposta.ok) return (await resposta.json()) as RepoGithub;
    if (resposta.status !== 422) {
      return lerRespostaExterna<RepoGithub>(resposta, "GitHub");
    }
  }
  throw new ErroPublicacao("Não foi possível encontrar um nome livre para o repositório.");
}

async function obterRefComEspera(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<RefGithub> {
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const resposta = await fetch(
      `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
      { headers: cabecalhos(token) },
    );
    if (resposta.ok) return (await resposta.json()) as RefGithub;
    if (resposta.status !== 404 || tentativa === 9) {
      return lerRespostaExterna<RefGithub>(resposta, "GitHub");
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  throw new ErroPublicacao("O GitHub não preparou o repositório a tempo.");
}

export interface OpcoesPublicarGithub {
  // Arvore a subir. Sem ela, coleta a peca HTML crua (modo html).
  arquivos?: ArquivoPublicavel[];
  modo?: ModoPublicacaoRegistro;
}

export async function publicarNoGithub(
  workspaceId: string,
  pasta: string,
  opcoes: OpcoesPublicarGithub = {},
): Promise<RegistroGithub> {
  const token = tokenGithub(workspaceId);
  const usuario = await github<UsuarioGithub>(token, "/user");
  const arquivos = opcoes.arquivos ?? coletarArquivosPublicaveis(workspaceId, pasta);
  const salvo = registroDaPeca(workspaceId, pasta).github;

  let repo = salvo?.repo;
  let url = salvo?.url;
  let branch = salvo?.branch || "main";
  if (!repo) {
    const tema = baseDoTema(extrairDataTema(pasta).tema).slice(0, 85);
    const base = `vkos-site-${tema}`;
    const criado = await criarRepositorio(token, base);
    repo = criado.name;
    url = criado.html_url;
    branch = criado.default_branch || "main";
  }

  const owner = usuario.login;
  const ref = await obterRefComEspera(token, owner, repo, branch);
  const tree: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }> = [];

  for (const arquivo of arquivos) {
    const blob = await github<CriadoGithub>(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content: arquivo.conteudo.toString("base64"),
          encoding: "base64",
        }),
      },
    );
    tree.push({ path: arquivo.caminho, mode: "100644", type: "blob", sha: blob.sha });
  }

  const arvore = await github<CriadoGithub>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
    { method: "POST", body: JSON.stringify({ tree }) },
  );
  const commit = await github<CriadoGithub>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: `Publicação do VKOS Hub em ${new Date().toLocaleString("pt-BR")}`,
        tree: arvore.sha,
        parents: [ref.object.sha],
      }),
    },
  );
  await github<RefGithub>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
    { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) },
  );

  const registro: RegistroGithub = {
    repo,
    url: url || `https://github.com/${owner}/${repo}`,
    branch,
    em: new Date().toISOString(),
    modo: opcoes.modo ?? "html",
  };
  atualizarRegistroPeca(workspaceId, pasta, { github: registro });
  return registro;
}
