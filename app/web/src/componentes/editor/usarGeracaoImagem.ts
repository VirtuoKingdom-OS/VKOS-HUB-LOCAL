import { useCallback, useEffect, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import type { AlvoImagemCapturado } from "./imagens";
import type { ModeloIA } from "../../api/cliente";
export type { AlvoImagemCapturado } from "./imagens";

// O motor captura o elemento exato antes de iniciar a sessao. A callback fica
// presa a esse no, entao uma mudanca de selecao durante a espera nao aplica a
// imagem nova no lugar errado.
interface Pendente {
  sessaoId: string;
  pasta: string;
  caminhoRelativo: string;
  alvo: AlvoImagemCapturado;
  finalizando: boolean;
}

async function esperarArquivo(pasta: string, caminhoRelativo: string): Promise<void> {
  const url = `/pecas/${encodeURIComponent(pasta)}/${caminhoRelativo}`;
  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    const resposta = await fetch(`${url}?vk=${Date.now()}`, { method: "HEAD" });
    if (resposta.ok) return;
    await new Promise((resolve) => window.setTimeout(resolve, 750));
  }
  throw new Error("A IA concluiu, mas o arquivo da imagem não apareceu na peça.");
}

export function usarGeracaoImagemIA() {
  const { criarSessao, sessoes } = usarEstado();
  const { ativo } = usarProvedoresIA();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaConcluidaEm, setUltimaConcluidaEm] = useState(0);
  const pendenteRef = useRef<Pendente | null>(null);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const gerar = useCallback(async (
    pasta: string,
    alvo: AlvoImagemCapturado,
    modelo?: ModeloIA,
  ) => {
    if (ativo !== "codex") {
      setErro("Gerar outra imagem com IA está disponível quando o Codex está conectado.");
      return;
    }
    if (pendenteRef.current) return;

    const sufixo = Math.random().toString(36).slice(2, 7);
    const nome = `vkos-ia-${Date.now().toString(36)}-${sufixo}.png`;
    const caminhoRelativo = `img/${nome}`;
    const contexto = alvo.contexto.replace(/\s+/g, " ").trim().slice(0, 2400);
    const prompt = [
      "Use explicitamente $imagegen para gerar uma unica imagem original.",
      `Salve o bitmap final EXATAMENTE em conteudo/${pasta}/${caminhoRelativo}.`,
      "Nao edite HTML, CSS, markdown nem qualquer outro arquivo. Nao crie variantes.",
      "A imagem precisa seguir o Cerebro do negocio e representar o contexto do elemento, sem texto ou logotipo inventado.",
      `Contexto visual: ${contexto || "imagem de apoio coerente com a peca"}.`,
      "Ao terminar, responda apenas com o caminho salvo.",
    ].join("\n");

    setErro(null);
    setGerando(true);
    try {
      const sessao = await criarSessao({
        titulo: `Nova imagem: ${pasta}`,
        prompt,
        skill: "imagem",
        modelo,
      });
      pendenteRef.current = {
        sessaoId: sessao.id,
        pasta,
        caminhoRelativo,
        alvo,
        finalizando: false,
      };
    } catch (e) {
      setGerando(false);
      setErro(e instanceof Error ? e.message : "Não foi possível iniciar a geração da imagem.");
    }
  }, [ativo, criarSessao]);

  useEffect(() => {
    const pendente = pendenteRef.current;
    if (!pendente || pendente.finalizando) return;
    const sessao = sessoes.find((item) => item.id === pendente.sessaoId);
    if (!sessao) return;

    if (sessao.status === "erro" || sessao.status === "parada") {
      pendenteRef.current = null;
      setGerando(false);
      setErro(sessao.erro || "A geração da imagem foi interrompida.");
      return;
    }
    if (sessao.status !== "concluida") return;

    pendente.finalizando = true;
    void esperarArquivo(pendente.pasta, pendente.caminhoRelativo)
      .then(async () => {
        await pendente.alvo.aplicar(pendente.caminhoRelativo);
        if (montadoRef.current) {
          setErro(null);
          setUltimaConcluidaEm(Date.now());
        }
      })
      .catch((e: unknown) => {
        if (montadoRef.current) {
          setErro(e instanceof Error ? e.message : "A imagem gerada não pôde ser aplicada.");
        }
      })
      .finally(() => {
        pendenteRef.current = null;
        if (montadoRef.current) setGerando(false);
      });
  }, [sessoes]);

  return {
    disponivel: ativo === "codex",
    gerando,
    erro,
    ultimaConcluidaEm,
    gerar,
    limparErro: useCallback(() => setErro(null), []),
  };
}
