import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../../api/assistente";
import type { ConversaAssistente } from "../../api/assistente";
import { usarEstado } from "../../estado/contexto";
import { Botao } from "../comum/Botao";
import { Conversa } from "../comum/Conversa";
import { IconeMais } from "../comum/Icones";
import { usarConversaSessao } from "../comum/usarConversaSessao";
import { CartaoLote } from "./CartaoLote";
import { ListaConversas } from "./ListaConversas";
import { PainelRastro } from "./PainelRastro";
import "./assistente.css";

function agruparPorLote(tarefas: api.TarefaAssistente[]): [string, api.TarefaAssistente[]][] {
  const grupos = new Map<string, api.TarefaAssistente[]>();
  for (const tarefa of tarefas) {
    const grupo = grupos.get(tarefa.loteId) ?? [];
    grupo.push(tarefa);
    grupos.set(tarefa.loteId, grupo);
  }
  return [...grupos.entries()];
}

// O que a IA recebe quando o dono clica em "Pedir correção". Ela leva o erro
// LITERAL do schema, e não uma paráfrase: é o mesmo princípio do laço de
// conformidade do site e do anúncio, onde a mensagem crua é o que faz a IA
// achar o campo errado em vez de reescrever o arquivo inteiro no chute.
export function pedidoDeCorrecao(erro: string): string {
  return [
    `O Hub recusou o lote.json que você gravou. O erro literal foi: ${erro}`,
    "Corrija o arquivo seguindo o contrato que você já recebeu e grave de novo, no mesmo lugar.",
    "Não mude o conteúdo das tarefas, só a forma que estava errada.",
  ].join("\n");
}

function dinheiro(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(valor);
}

export function TelaAssistente() {
  const { custos, avisoAssistente, recarregarSessoesCore } = usarEstado();
  const [conversas, setConversas] = useState<ConversaAssistente[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [tarefas, setTarefas] = useState<api.TarefaAssistente[]>([]);
  const [rastro, setRastro] = useState<api.EntradaRastroAssistente[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lateralAberta, setLateralAberta] = useState<"conversas" | "fila" | null>(null);

  const conversa = conversas.find((item) => item.id === selecionada) ?? null;
  const grupos = useMemo(() => agruparPorLote(tarefas), [tarefas]);
  const chat = usarConversaSessao(conversa?.sessaoId ?? null, {
    aoAbrirSessao: async (texto) => {
      if (!conversa) return;
      const resposta = await api.enviarMensagem(conversa.id, texto);
      setConversas((antes) => antes.map((item) =>
        item.id === conversa.id ? { ...item, sessaoId: resposta.sessaoId, previa: texto } : item,
      ));
      await recarregarSessoesCore();
    },
  });

  const carregar = useCallback(async () => {
    try {
      const [lista, fila, eventos] = await Promise.all([
        api.listarConversas(),
        api.listarFila(),
        api.listarRastro({ limite: 30 }),
      ]);
      setConversas(lista.conversas);
      setTarefas(fila.tarefas);
      setRastro(eventos.entradas);
      setSelecionada((antes) =>
        antes && lista.conversas.some((item) => item.id === antes)
          ? antes
          : lista.conversas[0]?.id ?? null,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui carregar o Assistente.");
    }
  }, []);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), 1800);
    return () => window.clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    if (avisoAssistente > 0) void carregar();
  }, [avisoAssistente, carregar]);

  async function novaConversa() {
    setErro(null);
    try {
      const resposta = await api.criarConversa();
      setConversas((antes) => [resposta.conversa, ...antes]);
      setSelecionada(resposta.conversa.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui abrir uma conversa.");
    }
  }

  async function apagarConversa(id: string) {
    setErro(null);
    try {
      await api.apagarConversa(id);
      setConversas((antes) => antes.filter((item) => item.id !== id));
      setSelecionada((antes) => (antes === id ? null : antes));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui apagar a conversa.");
    }
  }

  async function aprovarLote(loteId: string) {
    setOcupado(true);
    setErro(null);
    try {
      await api.aprovarLote(loteId);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui aprovar o lote.");
    } finally {
      setOcupado(false);
    }
  }

  async function cancelarLote(loteId: string) {
    setOcupado(true);
    setErro(null);
    try {
      await api.cancelarLote(loteId);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui cancelar o lote.");
    } finally {
      setOcupado(false);
    }
  }

  const totalCore = custos?.totalGeralUsd ?? custos?.totalUsd ?? 0;

  return (
    <main className="tela tela-assistente">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <span className="tela-kicker">Core</span>
          <h1>Assistente</h1>
          <p>Descreva o trabalho. Revise a proposta. Aprove quando estiver certo.</p>
        </div>
        <div className="tela-topo-acoes">
          <span className="assistente-custo">CORE {dinheiro(totalCore)}</span>
          <div className="assistente-laterais-toggle" aria-label="Abrir painéis">
            <Botao
              variante="neutro"
              tamanho="p"
              aria-pressed={lateralAberta === "conversas"}
              onClick={() => setLateralAberta((antes) => antes === "conversas" ? null : "conversas")}
            >
              Conversas
            </Botao>
            <Botao
              variante="neutro"
              tamanho="p"
              aria-pressed={lateralAberta === "fila"}
              onClick={() => setLateralAberta((antes) => antes === "fila" ? null : "fila")}
            >
              Fila
            </Botao>
          </div>
          <Botao variante="principal" onClick={novaConversa}>
            <IconeMais />
            Nova conversa
          </Botao>
        </div>
      </header>

      {erro && <div className="faixa faixa-alerta assistente-alerta" role="alert">{erro}</div>}

      <div className={`tela-corpo assistente-corpo lateral-${lateralAberta ?? "fechada"}`}>
        <ListaConversas
          conversas={conversas}
          selecionada={selecionada}
          aoSelecionar={setSelecionada}
          aoNova={novaConversa}
          aoApagar={apagarConversa}
        />

        <section className="assistente-coluna assistente-coluna-conversa" aria-label="Conversa ativa">
          {!conversa ? (
            <div className="assistente-primeiro-passo">
              <span className="assistente-kicker">Comece pelo objetivo</span>
              <h2>O que precisa ser feito?</h2>
              <p>O Assistente prepara uma proposta antes de qualquer geração.</p>
              <Botao variante="principal" onClick={novaConversa}>
                <IconeMais />
                Abrir conversa
              </Botao>
            </div>
          ) : (
            <Conversa
              // A RECUSA DO LOTE APARECE AQUI, e não some num log.
              //
              // Quando o assistente grava um lote.json fora do contrato, o Hub
              // recusa. Antes isso morria num catch: a IA dizia "criei o
              // lote.json", a fila do lado continuava vazia, e não havia uma
              // linha na tela dizendo por quê. Numa tela que promete execução,
              // falha silenciosa é pior que falha barulhenta, porque parece que
              // funcionou.
              //
              // A faixa fica em cima do campo, com o texto literal da recusa e
              // um botão que devolve esse mesmo texto pra IA: é ela que tem o
              // arquivo em mãos e sabe consertar, e é assim que o laço de
              // conformidade do site e do anúncio já funciona.
              avisoNoRodape={
                conversa.erroLote ? (
                  <div className="faixa faixa-alerta assistente-erro-lote" role="alert">
                    <div className="faixa-texto">
                      A proposta não entrou na fila: {conversa.erroLote}
                    </div>
                    <div className="faixa-acoes">
                      <Botao
                        variante="neutro"
                        tamanho="p"
                        disabled={chat.rodando || chat.enviando}
                        onClick={() => void chat.enviar(pedidoDeCorrecao(conversa.erroLote ?? ""))}
                      >
                        Pedir correção
                      </Botao>
                    </div>
                  </div>
                ) : null
              }
              turnos={chat.turnos}
              pendentes={chat.pendentes}
              respostaViva={chat.respostaViva}
              ferramentas={chat.ferramentasVivas}
              rodando={chat.rodando}
              enviando={chat.enviando}
              erro={chat.erro}
              aoEnviar={(texto) => void chat.enviar(texto)}
              titulo={conversa.titulo}
              vazio={<p className="assistente-vazio conversa-vazia">Escreva um pedido para orientar o trabalho.</p>}
              rotuloCampo="Descreva o trabalho para o Assistente"
            />
          )}
        </section>

        <aside className="assistente-coluna assistente-coluna-direita">
          <section className="assistente-fila" aria-label="Propostas e fila">
            <div className="assistente-coluna-topo">
              <div>
                <span className="assistente-kicker">Aguardando decisão</span>
                <h2>Fila</h2>
              </div>
              <span className="assistente-contagem">{tarefas.length}</span>
            </div>
            <div className="assistente-fila-lista">
              {grupos.length === 0 ? (
                <p className="assistente-vazio">Nenhuma proposta aguardando.</p>
              ) : (
                grupos.map(([loteId, lote]) => (
                  <CartaoLote
                    key={loteId}
                    loteId={loteId}
                    tarefas={lote}
                    aoAprovar={aprovarLote}
                    aoCancelar={cancelarLote}
                    ocupado={ocupado}
                  />
                ))
              )}
            </div>
          </section>
          <PainelRastro entradas={rastro} />
        </aside>
      </div>
    </main>
  );
}
