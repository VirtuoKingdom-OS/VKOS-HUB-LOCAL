import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { escolherPastaNativa } from "../../api/cliente";
import { obterResumoCore } from "../../api/core";
import type { ResumoCore, WorkspaceNoCore } from "../../tipos/core";
import { INFO_STATUS } from "../../config/status";
import { mensagemDeErro } from "../../util/erros";
import {
  IconeAlerta,
  IconeLapis,
  IconeLixeira,
  IconeMais,
  IconePasta,
  IconeX,
} from "../comum/Icones";
import {
  ROTULO_ATIVIDADE,
  encurtarCaminho,
  formatarUsd,
  tempoRelativo,
} from "./logica";
import "../../estilos/core.css";

// A partir de quantos workspaces vale ter busca por nome.
const LIMITE_BUSCA = 6;
// Tempo pra desarmar a confirmacao de remover (nunca por sair com o mouse).
const MS_DESARME = 4000;

type Vista = "lista" | "adicionar" | "novo";

interface Props {
  aoNavegar: (tela: string) => void;
}

// Tela de Workspaces do CORE: a lista de projetos do dono, com o gasto e o
// estado de cada um. Abrir, criar, adicionar, renomear e remover moram aqui.
export function TelaWorkspaces({ aoNavegar }: Props) {
  const {
    workspaces,
    workspaceAtivo,
    trocandoWorkspace,
    trocarWorkspace,
    // Os nomes destas funcoes do contexto seguem "Cliente" de proposito: o
    // rotulo que o usuario le virou Workspace, mas renomear identificador de
    // codigo por simetria so gera churn.
    adicionarCliente,
    criarCliente,
    renomearCliente,
    removerCliente,
    sessoes,
    custos,
  } = usarEstado();

  const [resumo, setResumo] = useState<ResumoCore | null>(null);
  const [vista, setVista] = useState<Vista>("lista");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [avisos, setAvisos] = useState<string[] | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState("");
  const [pastaDestino, setPastaDestino] = useState<string | null>(null);
  const timerDesarme = useRef<number | undefined>(undefined);

  const emVoo = sessoes.filter((s) => INFO_STATUS[s.status].ativa).length;

  useEffect(() => {
    let vivo = true;
    obterResumoCore()
      .then((dados) => {
        if (vivo) setResumo(dados);
      })
      .catch(() => {
        // O resumo e enriquecimento: sem ele a lista continua funcionando com o
        // registro que ja esta no estado do app.
        if (vivo) setResumo(null);
      });
    return () => {
      vivo = false;
    };
  }, [emVoo, custos, workspaces.length, workspaceAtivo]);

  useEffect(() => {
    return () => {
      if (timerDesarme.current) window.clearTimeout(timerDesarme.current);
    };
  }, []);

  // Junta o registro (que o estado do app ja tem) com o resumo do CORE. Sem o
  // resumo a linha aparece igual, so sem gasto nem atividade.
  const linhas = useMemo(() => {
    const porId = new Map<string, WorkspaceNoCore>(
      (resumo?.workspaces ?? []).map((w) => [w.id, w]),
    );
    const ordem = resumo
      ? resumo.workspaces.map((w) => w.id)
      : workspaces.map((w) => w.id);
    const conhecidos = new Set(ordem);
    for (const w of workspaces) if (!conhecidos.has(w.id)) ordem.push(w.id);
    const q = busca.trim().toLowerCase();
    return ordem
      .map((id) => {
        const registro = workspaces.find((w) => w.id === id);
        if (!registro) return null;
        return { registro, core: porId.get(id) ?? null };
      })
      .filter((item): item is { registro: (typeof workspaces)[number]; core: WorkspaceNoCore | null } =>
        item !== null,
      )
      .filter(({ registro }) =>
        !q ||
        registro.nome.toLowerCase().includes(q) ||
        registro.pasta.toLowerCase().includes(q),
      );
  }, [resumo, workspaces, busca]);

  const abrir = useCallback(
    async (id: string) => {
      setErro(null);
      try {
        if (id !== workspaceAtivo) await trocarWorkspace(id);
        aoNavegar("inicio");
      } catch (e) {
        setErro(mensagemDeErro(e));
      }
    },
    [workspaceAtivo, trocarWorkspace, aoNavegar],
  );

  const salvarEdicao = async () => {
    const id = editandoId;
    const nome = nomeEdit.trim();
    setEditandoId(null);
    if (!id || !nome) return;
    const anterior = workspaces.find((w) => w.id === id);
    if (anterior && anterior.nome === nome) return;
    try {
      await renomearCliente(id, nome);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  // Primeiro clique arma, segundo remove. Desarma sozinho em 4s.
  const clicarRemover = (id: string) => {
    if (timerDesarme.current) window.clearTimeout(timerDesarme.current);
    if (confirmandoId === id) {
      setConfirmandoId(null);
      void (async () => {
        try {
          await removerCliente(id);
        } catch (e) {
          setErro(mensagemDeErro(e));
        }
      })();
      return;
    }
    setConfirmandoId(id);
    timerDesarme.current = window.setTimeout(() => setConfirmandoId(null), MS_DESARME);
  };

  const aoEscolherEAdicionar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      const caminho = await escolherPastaNativa("Escolha a pasta VKOS do workspace");
      if (!caminho) {
        setOcupado(false);
        return;
      }
      await adicionarCliente(caminho);
      setVista("lista");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  const aoEscolherDestino = async () => {
    setErro(null);
    try {
      const caminho = await escolherPastaNativa("Escolha onde criar a pasta do workspace novo");
      if (caminho) setPastaDestino(caminho);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  // A pasta do workspace novo nasce DENTRO da pasta escolhida, com o nome em
  // slug. O backend cria a pasta se ela nao existir.
  const destinoFinal = (): string | null => {
    if (!pastaDestino) return null;
    const limpo = nomeNovo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const separador = pastaDestino.includes("\\") ? "\\" : "/";
    const base = pastaDestino.endsWith(separador) ? pastaDestino.slice(0, -1) : pastaDestino;
    return `${base}${separador}${limpo || "workspace"}`;
  };

  const aoCriar = async () => {
    const nome = nomeNovo.trim();
    const destino = destinoFinal();
    if (!nome || !destino) return;
    setOcupado(true);
    setErro(null);
    try {
      const retorno = await criarCliente(nome, destino);
      if (retorno.length > 0) setAvisos(retorno);
      setVista("lista");
      setNomeNovo("");
      setPastaDestino(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="tela-core tela-workspaces">
      <div className="core-scroll">
        <header className="core-cabecalho">
          <span className="core-nivel">CORE</span>
          <h1>Workspaces</h1>
          <p className="core-contexto">
            Um workspace por projeto. Cada um é uma pasta VKOS completa, com o
            Cérebro, as peças e as sessões dele.
          </p>
        </header>

        {erro && (
          <div className="core-erro" role="alert">
            <IconeAlerta className="" />
            {erro}
          </div>
        )}

        {vista === "lista" && (
          <>
            <div className="ws-barra">
              {workspaces.length > LIMITE_BUSCA && (
                <input
                  className="ws-busca"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar workspace"
                  aria-label="Buscar workspace"
                />
              )}
              <div className="ws-barra-acoes">
                <button
                  className="botao botao-neutro"
                  type="button"
                  onClick={() => {
                    setErro(null);
                    setVista("adicionar");
                  }}
                >
                  <IconePasta className="" />
                  Adicionar workspace
                </button>
                <button
                  className="botao botao-principal"
                  type="button"
                  onClick={() => {
                    setErro(null);
                    setVista("novo");
                  }}
                >
                  <IconeMais className="" />
                  Novo workspace
                </button>
              </div>
            </div>

            {linhas.length === 0 ? (
              <div className="core-vazio ws-vazio">
                <p>
                  {workspaces.length === 0
                    ? "Nenhum workspace ainda. Crie o primeiro para começar a trabalhar."
                    : "Nenhum workspace com esse nome."}
                </p>
              </div>
            ) : (
              <ul className="ws-grade">
                {linhas.map(({ registro, core }) => {
                  const ehAtivo = registro.id === workspaceAtivo;
                  const editando = editandoId === registro.id;
                  const armado = confirmandoId === registro.id;
                  const quando = tempoRelativo(core?.ultimoTurnoEm ?? registro.ultimoUso);
                  return (
                    <li
                      key={registro.id}
                      className={`ws-cartao${ehAtivo ? " aberto" : ""}`}
                    >
                      <div className="ws-cartao-topo">
                        <span
                          className={`core-linha-estado ${core?.atividade ?? "parado"}`}
                          aria-hidden="true"
                        />
                        {editando ? (
                          <input
                            className="ws-cartao-edit"
                            autoFocus
                            value={nomeEdit}
                            onChange={(e) => setNomeEdit(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void salvarEdicao();
                              if (e.key === "Escape") setEditandoId(null);
                            }}
                            onBlur={() => void salvarEdicao()}
                            aria-label="Novo nome do workspace"
                          />
                        ) : (
                          <h2 className="ws-cartao-nome" title={registro.nome}>
                            {registro.nome}
                          </h2>
                        )}
                        {ehAtivo && <span className="core-etiqueta">aberto</span>}
                      </div>

                      <p className="ws-cartao-pasta" title={registro.pasta}>
                        {encurtarCaminho(registro.pasta)}
                      </p>

                      <dl className="ws-cartao-dados">
                        <div>
                          <dt>Estado</dt>
                          <dd>
                            {ROTULO_ATIVIDADE[core?.atividade ?? "parado"]}
                            {core && core.sessoesRodando > 0 &&
                              `, ${core.sessoesRodando} ${
                                core.sessoesRodando === 1 ? "sessão" : "sessões"
                              }`}
                          </dd>
                        </div>
                        <div>
                          <dt>Gasto com IA</dt>
                          <dd
                            title={
                              core?.gastoIlegivel
                                ? "O histórico de gasto deste workspace não pôde ser lido."
                                : undefined
                            }
                          >
                            {!core
                              ? "carregando"
                              : core.gastoIlegivel
                                ? "sem leitura"
                                : formatarUsd(core.totalUsd, {
                                    estimado: core.estimado,
                                    piso: core.piso,
                                  })}
                          </dd>
                        </div>
                        <div>
                          <dt>Último trabalho</dt>
                          <dd>{quando ?? "nunca"}</dd>
                        </div>
                      </dl>

                      <div className="ws-cartao-acoes">
                        <button
                          className="botao botao-principal ws-abrir"
                          type="button"
                          disabled={trocandoWorkspace}
                          onClick={() => void abrir(registro.id)}
                        >
                          {ehAtivo ? "Ir para o trabalho" : "Abrir"}
                        </button>
                        <button
                          className="ws-acao"
                          type="button"
                          title="Renomear"
                          aria-label={`Renomear ${registro.nome}`}
                          onClick={() => {
                            setConfirmandoId(null);
                            setEditandoId(registro.id);
                            setNomeEdit(registro.nome);
                          }}
                        >
                          <IconeLapis className="" />
                        </button>
                        <button
                          className={`ws-acao ws-remover${armado ? " armado" : ""}`}
                          type="button"
                          title={
                            ehAtivo
                              ? "Não dá pra remover o workspace aberto"
                              : "Remover workspace do registro"
                          }
                          aria-label={`Remover ${registro.nome}`}
                          disabled={ehAtivo}
                          onClick={() => clicarRemover(registro.id)}
                        >
                          <IconeLixeira className="" />
                          {armado && <span className="ws-balao">Confirmar?</span>}
                        </button>
                      </div>

                      {armado && (
                        <p className="ws-cartao-aviso">
                          Sai do registro e apaga os dados do Hub deste workspace.
                          A pasta VKOS dele fica intacta.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {vista === "adicionar" && (
          <div className="ws-form">
            <div className="ws-form-topo">
              <button
                className="ws-voltar"
                type="button"
                onClick={() => setVista("lista")}
                disabled={ocupado}
                aria-label="Voltar para a lista"
              >
                <IconeX className="" />
              </button>
              <h2>Adicionar workspace</h2>
            </div>
            <p className="ws-ajuda">
              Aponte a pasta VKOS de um projeto que já existe. O seletor do
              Windows vai abrir.
            </p>
            <button
              className="botao botao-principal"
              type="button"
              onClick={() => void aoEscolherEAdicionar()}
              disabled={ocupado}
            >
              <IconePasta className="" />
              {ocupado ? "Aguardando o seletor..." : "Escolher pasta"}
            </button>
          </div>
        )}

        {vista === "novo" && (
          <div className="ws-form">
            <div className="ws-form-topo">
              <button
                className="ws-voltar"
                type="button"
                onClick={() => setVista("lista")}
                disabled={ocupado}
                aria-label="Voltar para a lista"
              >
                <IconeX className="" />
              </button>
              <h2>Novo workspace</h2>
            </div>
            <p className="ws-ajuda">
              Cria um workspace novo com a mesma estrutura do aberto e o Cérebro
              em branco. Escolha o nome e a pasta onde ele vai morar.
            </p>
            <input
              className="ws-input"
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
              placeholder="Nome do workspace"
              aria-label="Nome do workspace"
              disabled={ocupado}
            />
            <button
              className="botao botao-neutro"
              type="button"
              onClick={() => void aoEscolherDestino()}
              disabled={ocupado}
            >
              <IconePasta className="" />
              {pastaDestino ? "Trocar a pasta" : "Escolher onde criar"}
            </button>
            <div className="ws-destino">
              <span className="ws-destino-rotulo">Pasta do workspace</span>
              <span className="ws-destino-valor">
                {destinoFinal() ? encurtarCaminho(destinoFinal() as string) : "Nenhuma escolhida ainda"}
              </span>
            </div>
            <button
              className="botao botao-principal"
              type="button"
              onClick={() => void aoCriar()}
              disabled={ocupado || !nomeNovo.trim() || !pastaDestino}
            >
              {ocupado ? "Criando" : "Criar workspace"}
            </button>
          </div>
        )}

        {avisos && (
          <div className="ws-toast" role="status">
            <div className="ws-toast-topo">
              <IconeAlerta className="" />
              <strong>Workspace criado, com pendências</strong>
              <button
                className="ws-toast-x"
                type="button"
                onClick={() => setAvisos(null)}
                aria-label="Fechar aviso"
              >
                <IconeX className="" />
              </button>
            </div>
            <ul className="ws-toast-lista">
              {avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
