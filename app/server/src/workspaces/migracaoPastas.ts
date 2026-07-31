// Mudanca de casa das pastas de workspace: o que estava solto na raiz do
// projeto passa a viver em <raiz>/workspaces/. Roda no boot, e idempotente.
//
// A idempotencia nao vem de numero de versao, vem do disco: o que ja esta
// dentro de workspaces/ nao esta diretamente na raiz, entao a segunda passada
// nao encontra nada pra fazer.
//
// Tres coisas que esta migracao NAO faz, de proposito:
//
// 1. Nao move o VKOS integrado. O integrado.ts o procura ao lado de app/, por
//    caminho. Mover quebraria o boot do pacote do cliente.
// 2. Nao move pasta que esta fora da raiz do projeto. Cliente guardado em outro
//    drive ou no Documentos e escolha do usuario, e o registro guarda caminho
//    absoluto: continua funcionando onde esta.
// 3. Nao copia quando o rename falha. A pasta de workspace costuma ter uma
//    junction de node_modules (ver clonagem.ts). Copia recursiva de junction ou
//    duplica um node_modules inteiro ou segue o link e copia a origem. Rename
//    que falha vira aviso, a pasta fica onde esta e o boot segue.
//
// Ver docs/decisoes/2026-07-27-a-pasta-dos-workspaces.md.

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  renameSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

import { raizProjeto } from "../util/raizProjeto.js";
import { definirPastaVkos } from "../vkos/estado.js";
import { localizarVkosIntegrado } from "./integrado.js";
import { chavePasta, lerRegistro, normalizarPasta, salvarRegistro } from "./estado.js";
import { raizWorkspaces } from "./pastas.js";

// Nomes de pasta na raiz que nunca sao movidos, mesmo se aparecerem no
// registro. O VKOS integrado e o principal: outros modulos o acham por caminho.
const NOMES_INTOCAVEIS = new Set(["vkos", "vkos2", "app", "docs", "interno", "ferramentas"]);

export interface PastaMovida {
  id: string;
  nome: string;
  de: string;
  para: string;
}

export interface ResultadoMigracaoPastas {
  movidas: PastaMovida[];
  avisos: string[];
}

// A junction de node_modules que o clonagem.ts cria aponta pro node_modules do
// workspace que estava aberto na hora. Ela guarda caminho ABSOLUTO, entao quando
// esse outro workspace tambem muda de casa, o link fica pendurado no vazio: o
// render para de achar as dependencias e o erro so aparece na primeira peca.
//
// O rename preserva a junction, mas nao conserta o alvo dela. Isto conserta:
// junction morta cujo alvo era uma das pastas movidas volta a apontar pro lugar
// novo. Best effort, e falha em silencio: sem node_modules o app so pede um npm
// install, nunca perde dado.
function religarNodeModules(pasta: string, movidas: PastaMovida[]): void {
  const link = join(pasta, "node_modules");
  let alvo = "";
  try {
    if (!lstatSync(link).isSymbolicLink()) return;
    // Junction viva nao precisa de conserto. Morta, o existsSync devolve false
    // porque ele segue o link.
    if (existsSync(link)) return;
    alvo = normalizarPasta(readlinkSync(link));
  } catch {
    return;
  }

  for (const movida of movidas) {
    const prefixo = `${chavePasta(movida.de)}/`;
    if (!chavePasta(alvo).startsWith(prefixo)) continue;
    const novoAlvo = join(movida.para, alvo.slice(movida.de.length + 1));
    if (!existsSync(novoAlvo)) return;
    try {
      try {
        unlinkSync(link);
      } catch {
        rmdirSync(link);
      }
      symlinkSync(novoAlvo, link, "junction");
    } catch {
      // sem junction o app so pede npm install. Nao vale derrubar o boot.
    }
    return;
  }
}

// Diz se a pasta esta DIRETAMENTE dentro da raiz do projeto (pai igual a raiz).
// Pasta ja dentro de workspaces/ tem a raiz como avo, nao como pai, entao cai
// fora sozinha e a migracao vira no-op na segunda passada.
function estaDiretamenteNaRaiz(pasta: string, raiz: string): boolean {
  return chavePasta(dirname(normalizarPasta(pasta))) === chavePasta(raiz);
}

// Move pras <raiz>/workspaces/ as pastas de workspace que estao soltas na raiz.
// A raiz aceita ser injetada pra o teste nao mexer no projeto de verdade.
export function migrarPastasParaRaizWorkspaces(
  raiz: string = raizProjeto(),
): ResultadoMigracaoPastas {
  const movidas: PastaMovida[] = [];
  const avisos: string[] = [];

  const registro = structuredClone(lerRegistro());
  if (registro.workspaces.length === 0) return { movidas, avisos };

  const destinoRaiz = raizWorkspaces(raiz);
  const integrado = localizarVkosIntegrado(raiz);
  const chaveIntegrado = integrado ? chavePasta(integrado) : null;

  for (const ws of registro.workspaces) {
    const atual = normalizarPasta(ws.pasta);
    if (chaveIntegrado && chavePasta(atual) === chaveIntegrado) continue;
    if (NOMES_INTOCAVEIS.has(basename(atual).toLowerCase())) continue;
    if (!estaDiretamenteNaRaiz(atual, raiz)) continue;
    if (!existsSync(atual)) continue;

    const destino = join(destinoRaiz, basename(atual));
    if (existsSync(destino)) {
      avisos.push(
        `Ja existe uma pasta "${basename(atual)}" em workspaces/, entao o workspace "${ws.nome}" ficou onde estava.`,
      );
      continue;
    }

    try {
      mkdirSync(destinoRaiz, { recursive: true });
      // Rename, nunca copia: no mesmo volume e atomico e preserva a junction de
      // node_modules. Falhou, a pasta fica onde esta e o boot segue.
      renameSync(atual, destino);
    } catch {
      avisos.push(
        `Nao deu pra mover a pasta do workspace "${ws.nome}" pra workspaces/. Ela continua em ${atual}.`,
      );
      continue;
    }

    const para = normalizarPasta(destino);
    movidas.push({ id: ws.id, nome: ws.nome, de: atual, para });
    ws.pasta = para;
  }

  if (movidas.length === 0) return { movidas, avisos };

  // Com todo mundo ja no lugar novo, religa as junctions de node_modules que
  // apontavam pras pastas antigas. Vale pra quem mudou de casa e pra quem ficou
  // parado apontando pra quem mudou.
  for (const ws of registro.workspaces) {
    religarNodeModules(ws.pasta, movidas);
  }

  // Registro por ultimo, com os arquivos ja no lugar novo.
  salvarRegistro(registro);

  // A pasta ativa vive em DUAS fontes sincronizadas: o registro e o
  // config.json. Atualizar so uma abriria o app apontando pra pasta que sumiu.
  const ativa = movidas.find((m) => m.id === registro.ativo);
  if (ativa) {
    try {
      definirPastaVkos(ativa.para);
    } catch {
      avisos.push(
        `A pasta do workspace aberto mudou pra ${ativa.para}, mas o config.json nao aceitou a gravacao. Abra o workspace de novo pela tela.`,
      );
    }
  }

  return { movidas, avisos };
}
