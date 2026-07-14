// Migracao do estado global antigo pro primeiro workspace. Roda no boot, uma vez.
// Idempotente: se o workspaces.json ja existe, nao faz nada. Nunca apaga dado,
// so move o legado de app/dados/ pra app/dados/workspaces/<id>/.

import {
  copyFileSync,
  cpSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { obterPastaVkos } from "../vkos/estado.js";
import {
  garantirPastaDadosWorkspace,
  gerarIdWorkspace,
  normalizarPasta,
  registroExiste,
  salvarRegistro,
  ultimoSegmento,
} from "./estado.js";

const arquivoAtual = fileURLToPath(import.meta.url);
const pastaModulo = dirname(arquivoAtual);
const pastaApp = resolve(pastaModulo, "..", "..", "..");
const pastaDados = join(pastaApp, "dados");

// Arquivos de estado que viviam soltos em app/dados/ no modelo single-tenant.
const ARQUIVOS_LEGADOS = ["canvas.json", "sessoes.json", "custos.json", "contextos.json"];

// Move um arquivo. Rename primeiro (atomico, mesmo volume). Se falhar, copia e
// so entao remove a origem, pra nunca perder dado.
function moverArquivo(origem: string, destino: string): void {
  try {
    renameSync(origem, destino);
  } catch {
    copyFileSync(origem, destino);
    try {
      unlinkSync(origem);
    } catch {
      // origem ja sumiu: sem drama, a copia ja garantiu o dado.
    }
  }
}

// Move uma pasta inteira. Mesma logica do arquivo, com copia recursiva no fallback.
function moverPasta(origem: string, destino: string): void {
  try {
    renameSync(origem, destino);
  } catch {
    cpSync(origem, destino, { recursive: true });
    try {
      rmSync(origem, { recursive: true, force: true });
    } catch {
      // ignora: a copia ja preservou o dado.
    }
  }
}

// Move o sessoes.json marcando cada sessao com o workspaceId do principal.
function moverSessoes(origem: string, destino: string, workspaceId: string): void {
  try {
    const dados = JSON.parse(readFileSync(origem, "utf8"));
    if (Array.isArray(dados)) {
      const marcadas = dados.map((s) =>
        s && typeof s === "object" && !("workspaceId" in s) ? { ...s, workspaceId } : s,
      );
      writeFileSync(destino, JSON.stringify(marcadas, null, 2), "utf8");
      try {
        unlinkSync(origem);
      } catch {
        // ignora: o destino ja tem o dado.
      }
      return;
    }
  } catch {
    // sessoes.json ilegivel: cai no move cru pra nao perder o arquivo.
  }
  moverArquivo(origem, destino);
}

// Roda a migracao se ainda nao rodou. Chamar no boot, antes de carregar as sessoes.
export function migrarSeNecessario(): void {
  // Ja migrado (ou registro ja criado): nada a fazer. Garante idempotencia.
  if (registroExiste()) return;

  const temArquivoLegado = ARQUIVOS_LEGADOS.some((n) => existsSync(join(pastaDados, n)));
  const temTranscricoes = existsSync(join(pastaDados, "transcricoes"));
  const temLegado = temArquivoLegado || temTranscricoes;
  const pastaVkos = obterPastaVkos();

  // Sem legado ou sem pasta VKOS configurada: nao migra. O registro nasce vazio,
  // o legado (se houver) fica quieto no lugar.
  if (!temLegado || !pastaVkos) {
    salvarRegistro({ workspaces: [], ativo: null });
    return;
  }

  // Cria o workspace principal apontando pra pasta VKOS ja configurada.
  const id = gerarIdWorkspace();
  const agora = new Date().toISOString();
  const destino = garantirPastaDadosWorkspace(id);

  for (const nome of ARQUIVOS_LEGADOS) {
    const origem = join(pastaDados, nome);
    if (!existsSync(origem)) continue;
    if (nome === "sessoes.json") {
      moverSessoes(origem, join(destino, nome), id);
    } else {
      moverArquivo(origem, join(destino, nome));
    }
  }

  const transOrigem = join(pastaDados, "transcricoes");
  if (existsSync(transOrigem)) {
    moverPasta(transOrigem, join(destino, "transcricoes"));
  }

  salvarRegistro({
    workspaces: [
      {
        id,
        nome: ultimoSegmento(pastaVkos),
        pasta: normalizarPasta(pastaVkos),
        criadoEm: agora,
        ultimoUso: agora,
      },
    ],
    ativo: id,
  });
}
