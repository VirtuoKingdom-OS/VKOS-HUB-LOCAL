import { useCallback, useEffect, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import type { AlvoImagemCapturado } from "./imagens";
import type { ModeloIA } from "../../api/cliente";
import { montarPromptImagem } from "./promptImagem";
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

// Rede de seguranca. A tela sai do estado de espera quando a sessao termina,
// quando da erro ou quando o arquivo aparece. Se o provedor nunca chega a
// estado terminal (processo morto, maquina suspensa, conexao caida), nenhum
// desses tres acontece e a espera fica pra sempre: foi o travamento que o Jesse
// relatou. Quatro minutos porque gerar imagem e lento de verdade, entao um
// limite curto abortaria trabalho bom; e um teto, nao uma expectativa.
const LIMITE_ESPERA_MS = 4 * 60 * 1000;

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
  const relogioRef = useRef(0);

  // Encerra a espera de um jeito so, venha ela do fim da sessao, do erro ou do
  // limite de tempo. Sempre desarma o relogio: relogio orfao derruba uma
  // geracao seguinte que nao tem nada a ver com a que estourou.
  const encerrarEspera = useCallback((mensagem: string | null) => {
    if (relogioRef.current) {
      window.clearTimeout(relogioRef.current);
      relogioRef.current = 0;
    }
    pendenteRef.current = null;
    if (!montadoRef.current) return;
    setGerando(false);
    if (mensagem !== null) setErro(mensagem);
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      if (relogioRef.current) window.clearTimeout(relogioRef.current);
    };
  }, []);

  // Devolve null quando o pedido foi aceito e a espera comecou, ou a frase do
  // motivo quando foi recusado. O chamador precisa desse retorno na mao: antes,
  // a recusa saia num `return` mudo, e quem esperava a imagem ficava esperando
  // uma sessao que nunca nasceu. Ler o `erro` do hook nao serve aqui, porque
  // dentro da funcao ele ainda e o valor do render anterior.
  const gerar = useCallback(async (
    pasta: string,
    alvo: AlvoImagemCapturado,
    modelo?: ModeloIA,
    descricao?: string,
  ): Promise<string | null> => {
    if (ativo !== "codex") {
      const motivo =
        "Gerar outra imagem com IA está disponível quando o Codex está conectado.";
      setErro(motivo);
      return motivo;
    }
    if (pendenteRef.current) {
      const motivo = "Já existe uma geração de imagem em andamento. Espere ela terminar.";
      setErro(motivo);
      return motivo;
    }

    const sufixo = Math.random().toString(36).slice(2, 7);
    const nome = `vkos-ia-${Date.now().toString(36)}-${sufixo}.png`;
    const caminhoRelativo = `img/${nome}`;
    const prompt = montarPromptImagem({
      pasta,
      caminhoRelativo,
      contexto: alvo.contexto,
      descricao,
    });

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
      relogioRef.current = window.setTimeout(() => {
        relogioRef.current = 0;
        if (!pendenteRef.current) return;
        encerrarEspera(
          "A geração da imagem passou de 4 minutos sem resposta. Confira o Codex e tente de novo.",
        );
      }, LIMITE_ESPERA_MS);
      return null;
    } catch (e) {
      const motivo =
        e instanceof Error ? e.message : "Não foi possível iniciar a geração da imagem.";
      encerrarEspera(motivo);
      return motivo;
    }
  }, [ativo, criarSessao, encerrarEspera]);

  useEffect(() => {
    const pendente = pendenteRef.current;
    if (!pendente || pendente.finalizando) return;
    const sessao = sessoes.find((item) => item.id === pendente.sessaoId);
    if (!sessao) return;

    if (sessao.status === "erro" || sessao.status === "parada") {
      encerrarEspera(sessao.erro || "A geração da imagem foi interrompida.");
      return;
    }
    if (sessao.status !== "concluida") return;

    pendente.finalizando = true;
    const resultado: { falha: string | null } = { falha: null };
    void esperarArquivo(pendente.pasta, pendente.caminhoRelativo)
      .then(async () => {
        await pendente.alvo.aplicar(pendente.caminhoRelativo);
        if (montadoRef.current) {
          setErro(null);
          setUltimaConcluidaEm(Date.now());
        }
      })
      .catch((e: unknown) => {
        resultado.falha =
          e instanceof Error ? e.message : "A imagem gerada não pôde ser aplicada.";
      })
      .finally(() => {
        encerrarEspera(resultado.falha);
      });
  }, [sessoes, encerrarEspera]);

  return {
    disponivel: ativo === "codex",
    gerando,
    erro,
    ultimaConcluidaEm,
    gerar,
    limparErro: useCallback(() => setErro(null), []),
  };
}
