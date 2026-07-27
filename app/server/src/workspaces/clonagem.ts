// Criacao de um cliente novo clonando a ESTRUTURA do workspace ativo.
// Copia skills, templates, identidade e os arquivos leves de raiz. NAO copia
// node_modules, conteudo, materiais nem .git. O cerebro do novo nasce em branco:
// so os titulos de secao do cerebro ativo, com o corpo trocado por ✍️, pra nao
// vazar dado do cliente ativo.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join } from "node:path";

import { obterPastaVkos } from "../vkos/estado.js";
import { registrarEAtivar } from "./ativacao.js";
import { lerRegistro, workspacePorPasta, type RegistroWorkspaces, type Workspace } from "./estado.js";

// Erro de negocio com status HTTP, pra virar resposta clara na rota.
export class ErroWorkspace extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Pastas de estrutura que o cliente novo herda do ativo.
const PASTAS_ESTRUTURA = [".claude", "templates", "identidade", "marca"];

// Lista branca dos arquivos de raiz que o cliente novo herda. So estrutura leve:
// nunca copiar arquivo solto qualquer da raiz do ativo (um .env ou notas.md
// vazaria dado de um cliente pro outro).
const ARQUIVOS_RAIZ = [
  "CLAUDE.md",
  "LEIA.md",
  "LEIA-ME.md",
  "README.md",
  "package.json",
  "package-lock.json",
  ".gitignore",
];

// Marcador de campo em branco do template do Cerebro. A heuristica de preenchido
// do app entende ✍️ como em branco.
const MARCADOR_VAZIO = "✍️";

// Monta o esqueleto do cerebro.md: preserva as linhas de titulo (comecam com #)
// e troca o corpo de cada secao por ✍️. Sem cerebro legivel, cai num minimo.
function esqueletoCerebro(origem: string): string {
  const caminhoCerebro = join(origem, "cerebro", "cerebro.md");
  let titulos: string[] = [];
  try {
    const texto = readFileSync(caminhoCerebro, "utf8");
    titulos = texto.split(/\r?\n/).filter((linha) => /^#{1,6}\s/.test(linha.trim()));
  } catch {
    // sem cerebro legivel: usa um esqueleto minimo.
  }
  if (titulos.length === 0) {
    return `# Cerebro\n\n${MARCADOR_VAZIO}\n`;
  }
  const partes: string[] = [];
  for (const titulo of titulos) {
    partes.push(titulo.trim());
    partes.push("");
    partes.push(MARCADOR_VAZIO);
    partes.push("");
  }
  return partes.join("\n");
}

// Valida a pasta destino: absoluta, e nao existente ou existente e vazia. Cria
// a pasta se ainda nao existe.
function prepararDestino(pastaDestino: string): void {
  if (!pastaDestino || !isAbsolute(pastaDestino)) {
    throw new ErroWorkspace(400, "Informe um caminho absoluto para a pasta do novo workspace.");
  }
  if (existsSync(pastaDestino)) {
    if (!statSync(pastaDestino).isDirectory()) {
      throw new ErroWorkspace(400, "O destino existe e nao e uma pasta.");
    }
    if (readdirSync(pastaDestino).length > 0) {
      throw new ErroWorkspace(400, "A pasta destino precisa estar vazia.");
    }
  } else {
    mkdirSync(pastaDestino, { recursive: true });
  }
}

// Copia as pastas de estrutura que existirem na origem.
function copiarEstrutura(origem: string, destino: string): void {
  for (const nome of PASTAS_ESTRUTURA) {
    const de = join(origem, nome);
    if (existsSync(de) && statSync(de).isDirectory()) {
      cpSync(de, join(destino, nome), { recursive: true });
    }
  }
}

// Copia so os arquivos de raiz da lista branca (CLAUDE.md, LEIA.md, package.json
// e afins). Nunca varre a raiz inteira: qualquer arquivo fora da lista fica pra
// tras, pra nao vazar dado de um cliente pro outro.
function copiarArquivosRaiz(origem: string, destino: string): void {
  for (const nome of ARQUIVOS_RAIZ) {
    const de = join(origem, nome);
    try {
      if (existsSync(de) && statSync(de).isFile()) {
        cpSync(de, join(destino, nome));
      }
    } catch {
      // um arquivo de raiz que nao copiou nao pode abortar o clone inteiro.
    }
  }
}

// Tenta uma junction do Windows pro node_modules do ativo, pro render funcionar
// sem npm install. Se falhar (ou o ativo nao ter node_modules), devolve um aviso.
function ligarNodeModules(origem: string, destino: string): string[] {
  const de = join(origem, "node_modules");
  if (!existsSync(de)) {
    return ["rode npm install na pasta nova"];
  }
  try {
    symlinkSync(de, join(destino, "node_modules"), "junction");
    return [];
  } catch {
    return ["rode npm install na pasta nova"];
  }
}

// Cria um cliente novo: valida o destino, clona a estrutura, gera o cerebro em
// branco, liga o node_modules, registra e ativa. Devolve o registro e os avisos.
export function criarWorkspaceNovo(entrada: {
  nome: string;
  pastaDestino: string;
}): { registro: RegistroWorkspaces; avisos: string[]; workspace: Workspace | null } {
  const nome = (entrada.nome ?? "").trim();
  if (!nome) {
    throw new ErroWorkspace(400, "Informe o nome do novo workspace.");
  }

  const origem = obterPastaVkos();
  if (!origem) {
    throw new ErroWorkspace(400, "Nenhum workspace aberto pra clonar a estrutura.");
  }

  const pastaDestino = entrada.pastaDestino ?? "";
  prepararDestino(pastaDestino);

  copiarEstrutura(origem, pastaDestino);
  copiarArquivosRaiz(origem, pastaDestino);

  // Cerebro em branco: nunca vaza dado do cliente ativo.
  const pastaCerebro = join(pastaDestino, "cerebro");
  mkdirSync(pastaCerebro, { recursive: true });
  writeFileSync(join(pastaCerebro, "cerebro.md"), esqueletoCerebro(origem), "utf8");

  const avisos = ligarNodeModules(origem, pastaDestino);

  // Registra e ativa o cliente novo.
  registrarEAtivar(pastaDestino, nome);

  return { registro: lerRegistro(), avisos, workspace: workspacePorPasta(pastaDestino) };
}
