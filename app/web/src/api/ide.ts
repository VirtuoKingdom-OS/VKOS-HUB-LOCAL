// Cliente REST da VKOS-IDE. Fetch proprio, no padrao do app: resposta de erro e
// { erro: mensagem }. Lanca Error com essa mensagem pra a tela mostrar.
// Rotas escopadas na pasta do workspace ATIVO (contrato da rodada 10).

// Um no da arvore de arquivos. Pasta pode trazer filhos ja carregados.
export interface NoIde {
  nome: string;
  caminho: string;
  tipo: "pasta" | "arquivo";
  filhos?: NoIde[];
}

export interface RespostaArvore {
  base: string;
  itens: NoIde[];
}

export interface RespostaArquivo {
  caminho: string;
  conteudo: string;
  tamanho: number;
}

// Erro de rede: servidor fora do ar ou inalcancavel.
export class ErroRedeIde extends Error {
  constructor(mensagem = "Servidor fora do ar.") {
    super(mensagem);
    this.name = "ErroRedeIde";
  }
}

// Faz a chamada e devolve o corpo json. Em erro, lanca Error com a mensagem do
// campo { erro } quando o backend manda, senao uma frase padrao pelo status.
async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  let resposta: Response;
  const cabecalhos = opcoes?.body
    ? { "Content-Type": "application/json", ...(opcoes.headers ?? {}) }
    : opcoes?.headers;
  try {
    resposta = await fetch(url, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new ErroRedeIde();
  }

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status}`;
    try {
      const corpo = (await resposta.json()) as { erro?: string };
      if (corpo?.erro) mensagem = corpo.erro;
    } catch {
      // corpo sem json, mantem a mensagem padrao
    }
    throw new Error(mensagem);
  }

  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}

// Uma raiz da IDE geral do CORE: o sistema, um workspace do estudio ou um
// cliente do banco. Selecionar uma raiz ativa o workspace correspondente.
export interface RaizIde {
  id: string;
  nome: string;
  tipo: "sistema" | "estudio" | "cliente";
}

// Raizes disponiveis pra IDE geral (so existe no CORE).
export function obterRaizes(): Promise<{ raizes: RaizIde[]; ativo: string | null }> {
  return pedir<{ raizes: RaizIde[]; ativo: string | null }>("/api/ide/raizes");
}

// Arvore inteira da pasta do workspace ativo.
export function obterArvore(): Promise<RespostaArvore> {
  return pedir<RespostaArvore>("/api/ide/arvore");
}

// Le um arquivo. Recusa binario e arquivo grande (413) no backend.
export function lerArquivo(caminho: string): Promise<RespostaArquivo> {
  return pedir<RespostaArquivo>(
    `/api/ide/arquivo?caminho=${encodeURIComponent(caminho)}`
  );
}

// Grava um arquivo (cria se nao existir). Gravacao atomica no backend.
export function salvarArquivo(caminho: string, conteudo: string): Promise<void> {
  return pedir<void>("/api/ide/arquivo", {
    method: "PUT",
    body: JSON.stringify({ caminho, conteudo }),
  });
}

// Cria uma pasta (mkdir recursivo).
export function criarPasta(caminho: string): Promise<void> {
  return pedir<void>("/api/ide/pasta", {
    method: "POST",
    body: JSON.stringify({ caminho }),
  });
}

// Renomeia ou move um arquivo ou pasta.
export function renomear(de: string, para: string): Promise<void> {
  return pedir<void>("/api/ide/renomear", {
    method: "POST",
    body: JSON.stringify({ de, para }),
  });
}

// Apaga um arquivo ou pasta vazia. Pasta cheia responde 409 (vira Error).
export function excluir(caminho: string): Promise<void> {
  return pedir<void>(`/api/ide/arquivo?caminho=${encodeURIComponent(caminho)}`, {
    method: "DELETE",
  });
}
