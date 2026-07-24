import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { escolherPastaNativa, obterEstadoAutenticacao, obterSessaoWeb } from "../../api/cliente";
import {
  IconeAlerta,
  IconeCheck,
  IconeLapis,
  IconeLixeira,
  IconeMais,
  IconePasta,
  IconeX,
} from "../comum/Icones";
import "../../estilos/workspaces.css";

// Quantos clientes ate valer a busca por nome.
const LIMITE_BUSCA = 6;
// Tempo pra desarmar a confirmacao de remover (nunca por mouseleave).
const MS_DESARME = 4000;

// Encurta um caminho longo pros ultimos dois segmentos, legivel.
function encurtar(caminho: string): string {
  const partes = caminho.split(/[\\/]/).filter(Boolean);
  if (partes.length <= 2) return partes.join(" / ");
  return `… / ${partes.slice(-2).join(" / ")}`;
}

type Vista = "lista" | "adicionar" | "novo";

// Switcher de cliente no topo da sidebar. Mostra o cliente ativo e abre um
// painel pra trocar, adicionar, criar, renomear e remover clientes.
export function SeletorWorkspace() {
  const {
    workspaces,
    workspaceAtivo,
    trocandoWorkspace,
    trocarWorkspace,
    adicionarCliente,
    criarCliente,
    renomearCliente,
    removerCliente,
  } = usarEstado();

  const refRaiz = useRef<HTMLDivElement>(null);
  const timerDesarme = useRef<number | undefined>(undefined);

  const [aberto, setAberto] = useState(false);
  const [vista, setVista] = useState<Vista>("lista");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ehOperador, setEhOperador] = useState(false);
  const [avisos, setAvisos] = useState<string[] | null>(null);

  // Edicao inline do nome de um cliente.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");
  // Confirmacao de remover em dois cliques.
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  // Form de cliente novo.
  const [nomeNovo, setNomeNovo] = useState("");
  const [pastaDestino, setPastaDestino] = useState<string | null>(null);

  const ativo = workspaces.find((w) => w.id === workspaceAtivo) ?? null;
  const nomeAtivo = ativo?.nome ?? "Selecionar cliente";

  const mostrarBusca = workspaces.length > LIMITE_BUSCA;
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) =>
        w.nome.toLowerCase().includes(q) || w.pasta.toLowerCase().includes(q)
    );
  }, [workspaces, busca]);

  // Fecha e reseta o painel ao estado de lista.
  const fechar = useCallback(() => {
    setAberto(false);
    setVista("lista");
    setBusca("");
    setErro(null);
    setEditandoId(null);
    setConfirmandoId(null);
    setNomeNovo("");
    setPastaDestino(null);
  }, []);

  // Esc e clique fora fecham o painel.
  useEffect(() => {
    obterEstadoAutenticacao()
      .then(async (estado) => {
        if (!estado.obrigatoria) return setEhOperador(true);
        const sessao = await obterSessaoWeb();
        setEhOperador(sessao.usuario.papel === "operador");
      })
      .catch(() => setEhOperador(false));
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    const aoClicarFora = (e: MouseEvent) => {
      if (refRaiz.current && !refRaiz.current.contains(e.target as Node)) {
        fechar();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto, fechar]);

  useEffect(() => {
    return () => {
      if (timerDesarme.current) window.clearTimeout(timerDesarme.current);
    };
  }, []);

  const selecionar = useCallback(
    async (id: string) => {
      fechar();
      if (id === workspaceAtivo) return;
      try {
        await trocarWorkspace(id);
      } catch (e) {
        setErro(mensagemDeErro(e));
      }
    },
    [fechar, workspaceAtivo, trocarWorkspace]
  );

  const iniciarEdicao = (id: string, nome: string) => {
    setConfirmandoId(null);
    setEditandoId(id);
    setNomeEdit(nome);
  };

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

  // Primeiro clique arma; segundo clique remove. Desarma sozinho em 4s, nunca
  // por sair com o mouse.
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
    timerDesarme.current = window.setTimeout(
      () => setConfirmandoId(null),
      MS_DESARME
    );
  };

  const aoAdicionar = async (caminho: string) => {
    setOcupado(true);
    setErro(null);
    try {
      await adicionarCliente(caminho);
      fechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  // Abre o seletor de pasta nativo do Windows e ja registra a escolhida.
  const aoEscolherEAdicionar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      const caminho = await escolherPastaNativa(
        "Escolha a pasta VKOS do cliente"
      );
      if (!caminho) {
        setOcupado(false);
        return;
      }
      setOcupado(false);
      await aoAdicionar(caminho);
    } catch (e) {
      setErro(mensagemDeErro(e));
      setOcupado(false);
    }
  };

  // Abre o seletor nativo pra escolher ONDE o cliente novo vai morar.
  const aoEscolherDestino = async () => {
    setErro(null);
    try {
      const caminho = await escolherPastaNativa(
        "Escolha onde criar a pasta do cliente novo"
      );
      if (caminho) setPastaDestino(caminho);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  // A pasta do cliente novo nasce DENTRO da pasta escolhida no navegador, com
  // o nome do cliente em slug. O backend cria a pasta se nao existir, entao o
  // usuario nao precisa criar nada no Explorer antes.
  const slugPasta = (nome: string): string => {
    const limpo = nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return limpo || "cliente";
  };

  const destinoFinal = (): string | null => {
    if (!pastaDestino) return null;
    const separador = pastaDestino.includes("\\") ? "\\" : "/";
    const base = pastaDestino.endsWith(separador)
      ? pastaDestino.slice(0, -1)
      : pastaDestino;
    return `${base}${separador}${slugPasta(nomeNovo)}`;
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
      fechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="seletor-workspace" ref={refRaiz}>
      <button
        className={`sw-trigger${aberto ? " aberto" : ""}`}
        onClick={() => (aberto ? fechar() : setAberto(true))}
        disabled={trocandoWorkspace}
        title={ativo?.pasta ?? "Nenhum cliente ativo"}
      >
        <span className="sw-ponto" />
        <span className="sw-trigger-texto">
          <span className="sw-trigger-rotulo">Cliente</span>
          <span className="sw-trigger-nome" title={nomeAtivo}>
            {nomeAtivo}
          </span>
        </span>
        <ChevronBaixo className="sw-chevron" />
      </button>

      {aberto && (
        <div className="sw-painel">
          {vista === "lista" && (
            <>
              {mostrarBusca && (
                <div className="sw-busca">
                  <input
                    autoFocus
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar cliente"
                  />
                </div>
              )}

              <div className="sw-lista">
                {filtrados.length === 0 ? (
                  <div className="sw-vazio">
                    {workspaces.length === 0
                      ? "Nenhum cliente ainda."
                      : "Nada encontrado."}
                  </div>
                ) : (
                  filtrados.map((w) => {
                    const ehAtivo = w.id === workspaceAtivo;
                    const editando = editandoId === w.id;
                    const armado = confirmandoId === w.id;
                    return (
                      <div
                        key={w.id}
                        className={`sw-item${ehAtivo ? " ativo" : ""}`}
                      >
                        {editando ? (
                          <input
                            className="sw-item-edit"
                            autoFocus
                            value={nomeEdit}
                            onChange={(e) => setNomeEdit(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void salvarEdicao();
                              if (e.key === "Escape") setEditandoId(null);
                            }}
                            onBlur={() => void salvarEdicao()}
                          />
                        ) : (
                          <button
                            className="sw-item-principal"
                            onClick={() => void selecionar(w.id)}
                          >
                            <span
                              className={`sw-item-ponto${ehAtivo ? " on" : ""}`}
                            />
                            <span className="sw-item-info">
                              <span className="sw-item-nome" title={w.nome}>
                                {w.nome}
                              </span>
                              {ehOperador && w.pasta && <span className="sw-item-caminho" title={w.pasta}>{encurtar(w.pasta)}</span>}
                            </span>
                            {ehAtivo && (
                              <IconeCheck className="sw-item-check" />
                            )}
                          </button>
                        )}

                        {!editando && ehOperador && (
                          <div className="sw-item-acoes">
                            <button
                              className="sw-acao"
                              title="Renomear"
                              onClick={() => iniciarEdicao(w.id, w.nome)}
                            >
                              <IconeLapis className="" />
                            </button>
                            <button
                              className={`sw-acao sw-remover${
                                armado ? " armado" : ""
                              }`}
                              title={
                                ehAtivo
                                  ? "Nao da pra remover o cliente ativo"
                                  : "Remover cliente"
                              }
                              disabled={ehAtivo}
                              onClick={() => clicarRemover(w.id)}
                            >
                              <IconeLixeira className="" />
                              {armado && (
                                <span className="sw-balao">Confirmar?</span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {erro && (
                <div className="sw-erro">
                  <IconeAlerta className="" />
                  {erro}
                </div>
              )}

              {ehOperador && <div className="sw-rodape">
                <button
                  className="sw-acao-rodape"
                  onClick={() => {
                    setErro(null);
                    setVista("adicionar");
                  }}
                >
                  <IconePasta className="" />
                  Adicionar cliente
                </button>
                <button
                  className="sw-acao-rodape"
                  onClick={() => {
                    setErro(null);
                    setVista("novo");
                  }}
                >
                  <IconeMais className="" />
                  Novo cliente
                </button>
              </div>}
            </>
          )}

          {vista === "adicionar" && (
            <div className="sw-form">
              <div className="sw-form-topo">
                <button
                  className="sw-voltar"
                  onClick={() => setVista("lista")}
                  disabled={ocupado}
                >
                  <IconeX className="" />
                </button>
                <h3>Adicionar cliente</h3>
              </div>
              <p className="sw-ajuda">
                Aponte a pasta VKOS de um cliente que ja existe. O seletor do
                Windows vai abrir.
              </p>
              <button
                className="botao botao-principal sw-botao-pasta"
                onClick={() => void aoEscolherEAdicionar()}
                disabled={ocupado}
              >
                <IconePasta className="" />
                {ocupado ? "Aguardando o seletor..." : "Escolher pasta do cliente"}
              </button>
              {ocupado && <div className="sw-carregando">Registrando o cliente.</div>}
              {erro && (
                <div className="sw-erro">
                  <IconeAlerta className="" />
                  {erro}
                </div>
              )}
            </div>
          )}

          {vista === "novo" && (
            <div className="sw-form">
              <div className="sw-form-topo">
                <button
                  className="sw-voltar"
                  onClick={() => setVista("lista")}
                  disabled={ocupado}
                >
                  <IconeX className="" />
                </button>
                <h3>Novo cliente</h3>
              </div>
              <p className="sw-ajuda">
                Cria um cliente novo com a mesma estrutura do atual e o Cerebro em
                branco. Escolha o nome e a pasta onde ele vai morar.
              </p>
              <input
                className="sw-input"
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                placeholder="Nome do cliente"
                disabled={ocupado}
              />
              <button
                className="botao botao-neutro sw-botao-pasta"
                onClick={() => void aoEscolherDestino()}
                disabled={ocupado}
              >
                <IconePasta className="" />
                {pastaDestino ? "Trocar a pasta" : "Escolher onde criar"}
              </button>
              <div className="sw-destino">
                <span className="sw-destino-rotulo">Pasta do cliente</span>
                <span className="sw-destino-valor">
                  {destinoFinal()
                    ? encurtar(destinoFinal() as string)
                    : "Nenhuma escolhida ainda"}
                </span>
              </div>
              {erro && (
                <div className="sw-erro">
                  <IconeAlerta className="" />
                  {erro}
                </div>
              )}
              <div className="sw-form-acoes">
                <button
                  className="botao botao-principal"
                  onClick={() => void aoCriar()}
                  disabled={ocupado || !nomeNovo.trim() || !pastaDestino}
                >
                  {ocupado ? "Criando" : "Criar cliente"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {avisos && (
        <div className="sw-toast">
          <div className="sw-toast-topo">
            <IconeAlerta className="" />
            <strong>Cliente criado, com pendencias</strong>
            <button className="sw-toast-x" onClick={() => setAvisos(null)}>
              <IconeX className="" />
            </button>
          </div>
          <ul className="sw-toast-lista">
            {avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChevronBaixo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
