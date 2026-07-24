// Secoes do Cerebro como VISTA de edicao do cerebro.md. O markdown continua a
// unica fonte da verdade: dividir e substituir preservam o arquivo byte a byte
// fora da secao tocada. Secao e cada linha que comeca com "## "; o preambulo e
// tudo antes da primeira secao; o epilogo e o bloco final que comeca no ultimo
// separador "---" depois da ultima secao (a nota de rodape do template).

// Marcador de campo em branco do template. Igual ao de cerebro.ts.
const MARCADOR_VAZIO = "✍️";

export class ErroSecaoCerebro extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

// Um segmento cru: a linha de titulo (com a quebra) e o corpo exatamente como
// esta no arquivo. E o que garante a reconstrucao byte a byte.
interface SegmentoSecao {
  tituloLinha: string;
  corpoRaw: string;
}

interface Segmentos {
  preambulo: string;
  secoes: SegmentoSecao[];
  epilogo: string;
}

// Divide o texto em preambulo, secoes cruas e epilogo. A concatenacao de tudo
// reproduz o texto original byte a byte, por construcao.
function segmentar(texto: string): Segmentos {
  const inicios: number[] = [];
  const regex = /^## /gm;
  for (let m = regex.exec(texto); m; m = regex.exec(texto)) {
    inicios.push(m.index);
  }
  if (inicios.length === 0) {
    return { preambulo: texto, secoes: [], epilogo: "" };
  }

  const preambulo = texto.slice(0, inicios[0]);
  const blocos: string[] = inicios.map((inicio, i) =>
    texto.slice(inicio, i + 1 < inicios.length ? inicios[i + 1] : texto.length),
  );

  // Epilogo: dentro do ultimo bloco, o ultimo "---" em linha propria abre a
  // nota de fechamento do template. Ela nao pertence a ultima secao.
  let epilogo = "";
  const ultimo = blocos[blocos.length - 1];
  const separador = /^[ \t]*---[ \t]*\r?$/gm;
  let corte = -1;
  for (let m = separador.exec(ultimo); m; m = separador.exec(ultimo)) {
    corte = m.index;
  }
  if (corte >= 0) {
    epilogo = ultimo.slice(corte);
    blocos[blocos.length - 1] = ultimo.slice(0, corte);
  }

  const secoes = blocos.map((bloco) => {
    const fimTitulo = bloco.indexOf("\n");
    if (fimTitulo < 0) return { tituloLinha: bloco, corpoRaw: "" };
    return {
      tituloLinha: bloco.slice(0, fimTitulo + 1),
      corpoRaw: bloco.slice(fimTitulo + 1),
    };
  });

  return { preambulo, secoes, epilogo };
}

function montar(seg: Segmentos): string {
  return (
    seg.preambulo
    + seg.secoes.map((s) => s.tituloLinha + s.corpoRaw).join("")
    + seg.epilogo
  );
}

// Uma secao pronta pra tela: titulo limpo, corpo aparado e o estado.
export interface SecaoCerebro {
  indice: number;
  titulo: string;
  corpo: string;
  preenchida: boolean;
}

export interface CerebroEmSecoes {
  preambulo: string;
  secoes: SecaoCerebro[];
  epilogo: string;
}

function tituloLimpo(tituloLinha: string): string {
  return tituloLinha.replace(/\r?\n$/, "").replace(/^##\s*/, "").trim();
}

export function dividirSecoes(texto: string): CerebroEmSecoes {
  const seg = segmentar(texto);
  return {
    preambulo: seg.preambulo,
    epilogo: seg.epilogo,
    secoes: seg.secoes.map((s, indice) => {
      const corpo = s.corpoRaw.trim();
      return {
        indice,
        titulo: tituloLimpo(s.tituloLinha),
        corpo,
        preenchida: corpo !== "" && !corpo.includes(MARCADOR_VAZIO),
      };
    }),
  };
}

// Troca SOMENTE o corpo de uma secao, preservando o espacamento original em
// volta (cabeca e rabo do corpo cru). Corpo vazio restaura o marcador ✍️, pra
// heuristica de preenchido continuar honesta. Substituir uma secao pelo proprio
// corpo devolve o texto original byte a byte.
export function substituirSecao(
  texto: string,
  indice: number,
  corpoNovo: unknown,
): string {
  if (typeof corpoNovo !== "string") {
    throw new ErroSecaoCerebro(400, "O campo corpo e obrigatorio e precisa ser uma string.");
  }
  const seg = segmentar(texto);
  if (!Number.isInteger(indice) || indice < 0 || indice >= seg.secoes.length) {
    throw new ErroSecaoCerebro(404, "Seção não encontrada no Cérebro.");
  }
  const secao = seg.secoes[indice];
  const partes = secao.corpoRaw.match(/^(\s*)([\s\S]*?)(\s*)$/);
  let cabeca = partes?.[1] ?? "";
  let rabo = partes?.[3] ?? "";
  const miolo = partes?.[2] ?? "";
  if (miolo === "") {
    // Corpo original vazio ou so espaco: usa um fecho padrao de secao.
    cabeca = "";
    rabo = secao.corpoRaw !== "" ? secao.corpoRaw : "\n\n";
  }
  const corpoLimpo = corpoNovo.trim();
  const corpoFinal = corpoLimpo === "" ? MARCADOR_VAZIO : corpoLimpo;
  seg.secoes[indice] = {
    tituloLinha: secao.tituloLinha,
    corpoRaw: cabeca + corpoFinal + rabo,
  };
  return montar(seg);
}
