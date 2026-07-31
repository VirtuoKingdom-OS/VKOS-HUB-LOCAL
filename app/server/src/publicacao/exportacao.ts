// Exportacao local do site. Substituiu a publicacao integrada no GitHub e na
// Netlify em 2026-07-26 (ver docs/decisoes/2026-07-26-fim-da-publicacao-integrada.md).
// Duas saidas: abrir a pasta da peca no explorador do sistema e baixar o site
// pronto num ZIP. Nenhuma credencial, nenhuma chamada de rede.
//
// A barreira de qualidade continua sendo o portao: um site reprovado na
// auditoria nao vira ZIP. Ela so deixou de barrar um deploy e passou a barrar
// uma exportacao anunciada como pronta.

import { spawn } from "node:child_process";

import archiver from "archiver";

import { coletarArquivosPublicaveis, type ArquivoPublicavel } from "./arquivos.js";
import { ErroPublicacao } from "./erros.js";
import type { ModoPublicacaoRegistro } from "./estado.js";
import { ConversaoInviavel } from "./astro/conversor.js";
import { BuildFalhou, MotorIndisponivel } from "./astro/motor.js";
import {
  prepararAstro,
  resolverModoPublicacao,
  type ModoPublicacao,
} from "./astro/publicacao.js";

// O que a auditoria precisa entregar pra exportacao seguir.
export interface VeredictoAuditoria {
  valido: boolean;
  erros: string[];
  // Falso quando a conferencia visual nem chegou a rodar, o caso de maquina sem
  // navegador. Opcional pra aceitar chamador antigo, que sempre conferia.
  verificavel?: boolean;
}

// Portao de qualidade. Site reprovado nao exporta, com as pendencias na
// mensagem, do mesmo jeito que bloqueava o deploy antes.
//
// Sem navegador no sistema a conferencia visual nao roda e o resultado chega
// com valido false e erros vazio. Bloquear ai deixava a pessoa sem saida: a
// tela dizia "precisa de correcao" com a lista de pendencias vazia e o botao
// morto, sem nada pra corrigir. Antes isso barrava um deploy opcional; hoje
// barraria o unico caminho de tirar o site do produto. Entao conferencia que
// nao rodou libera a exportacao, e quem chama avisa que ela nao rodou.
export function conferirBarreiraQualidade(auditoria: VeredictoAuditoria): void {
  if (auditoria.valido) return;
  if (auditoria.verificavel === false) return;
  throw new ErroPublicacao(
    `O site ainda não está pronto para exportar. ${auditoria.erros.join(" ")}`.trim(),
    400,
  );
}

// Nome do arquivo baixado, derivado da pasta da peca. Sem acento, sem espaco e
// sem nada que atrapalhe o header Content-Disposition.
export function nomeArquivoExportacao(pasta: string): string {
  const base = pasta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "site"}.zip`;
}

// Comando do explorador de arquivos de cada sistema. Recebe a plataforma pra
// ser conferivel sem depender da maquina do teste.
export function comandoAbrirPasta(plataforma: NodeJS.Platform = process.platform): string {
  if (plataforma === "win32") return "explorer.exe";
  if (plataforma === "darwin") return "open";
  return "xdg-open";
}

// Abre a pasta no explorador do sistema. O caminho vai como argumento de array,
// nunca como linha de comando montada em string.
export function abrirPastaNoSistema(caminho: string): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const filho = spawn(comandoAbrirPasta(), [caminho], {
      detached: true,
      stdio: "ignore",
    });
    filho.on("error", () => {
      rejeitar(
        new ErroPublicacao(
          "Não foi possível abrir a pasta no explorador de arquivos deste sistema.",
          500,
        ),
      );
    });
    filho.on("spawn", () => {
      // Solta o processo: o explorador continua aberto depois da resposta.
      filho.unref();
      resolver();
    });
  });
}

function ehFalhaAstro(erro: unknown): erro is Error {
  return (
    erro instanceof ConversaoInviavel ||
    erro instanceof MotorIndisponivel ||
    erro instanceof BuildFalhou
  );
}

export interface ConteudoExportacao {
  modo: ModoPublicacaoRegistro;
  arquivos: ArquivoPublicavel[];
  avisos: string[];
}

// Escolhe o que vai dentro do ZIP. Com o build Astro viavel, exporta o site
// compilado (dist). Em qualquer falha esperada da conversao, do motor ou do
// build, cai no HTML puro da peca e diz o motivo no aviso: o mesmo fallback
// honesto que o deploy tinha.
export async function prepararConteudoExportacao(
  workspaceId: string,
  pasta: string,
  pastaPeca: string,
): Promise<ConteudoExportacao> {
  const avisos: string[] = [];
  let modoPrevisto: ModoPublicacao = "html";
  try {
    modoPrevisto = resolverModoPublicacao(pastaPeca);
  } catch {
    modoPrevisto = "html";
  }
  if (modoPrevisto === "astro") {
    try {
      const artefatos = await prepararAstro(pastaPeca);
      return {
        modo: "astro",
        arquivos: artefatos.dist,
        avisos: [...avisos, ...artefatos.projeto.avisos],
      };
    } catch (erro) {
      if (!ehFalhaAstro(erro)) throw erro;
      avisos.push(erro.message);
    }
  }
  return {
    modo: "html",
    arquivos: coletarArquivosPublicaveis(workspaceId, pasta),
    avisos,
  };
}

// Monta o ZIP da exportacao. Devolve o proprio stream do archiver, que a rota
// entrega direto na resposta. Quem chama finaliza depois de mandar enviar.
export function criarZipExportacao(arquivos: ArquivoPublicavel[]): archiver.Archiver {
  if (arquivos.length === 0) {
    throw new ErroPublicacao("A peça não tem arquivos para exportar.", 400);
  }
  const zip = archiver("zip", { zlib: { level: 6 } });
  for (const arquivo of arquivos) {
    zip.append(arquivo.conteudo, { name: arquivo.caminho });
  }
  return zip;
}
