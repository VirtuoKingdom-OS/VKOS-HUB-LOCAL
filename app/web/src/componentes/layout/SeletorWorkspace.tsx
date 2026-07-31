import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { escolherPastaNativa } from "../../api/cliente";
// A previsao do caminho mora na logica do CORE, do lado da tela de Workspaces,
// pra as duas telas anunciarem exatamente a mesma pasta.
import { pastaPrevista } from "../core/logica";
import { Botao } from "../comum/Botao";
import {
  IconeAlerta,
  IconeCheck,
  IconeLapis,
  IconeLixeira,
  IconeMais,
  IconePasta,
  IconeSeta,
  IconeX,
} from "../comum/Icones";
import "./workspaces.css";

// Quantos workspaces ate valer a busca por nome.
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

// Seletor de workspace, no topo da barra do projeto. Mostra o workspace aberto
// e abre um popover pra trocar, adicionar, criar, renomear e remover.
//
// REFEITO na Fase 2 do redesign v2 (2026-07-30). O que mudou, e por que:
//
// 1. ELE COMPOE .popover E .menu. Era um painel proprio, com a propria sombra,
//    a propria animacao, o proprio item de lista e o proprio campo de busca.
// 2. AS ACOES DE LINHA NASCEM VISIVEIS. Renomear e remover apareciam so no
//    hover: nao existiam pro toque nem pra quem nunca passou o mouse ali.
// 3. O BALAO "CONFIRMAR?" SUMIU. A confirmacao passou a ser dita na propria
//    linha e o botao vira perigo, como na tela de Workspaces do CORE. Balao
//    flutuante dentro de um popover ficava recortado pela borda dele.
// 4. O WORKSPACE ABERTO NAO E MAIS VERDE. Ele se marca por superficie, fio a
//    esquerda em --acao e o tique, que e a gramatica de selecionado do sistema.
//
// Os nomes das funcoes do contexto ainda dizem "Cliente". E de propria vontade:
// o rotulo que o usuario le virou Workspace, mas identificador de codigo nao se
// renomeia por simetria.
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
  const [avisos, setAvisos] = useState<string[] | null>(null);

  // Edicao inline do nome de um workspace.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");
  // Confirmacao de remover em dois cliques.
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  // Form de workspace novo. So o nome: a pasta e do servidor desde 2026-07-27.
  const [nomeNovo, setNomeNovo] = useState("");

  const ativo = workspaces.find((w) => w.id === workspaceAtivo) ?? null;
  const nomeAtivo = ativo?.nome ?? "Selecionar workspace";

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
  }, []);

  // Esc e clique fora fecham o painel.
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
        "Escolha a pasta VKOS do workspace"
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

  // Criar pede so o nome. O destino nao e mais escolha da pessoa: o servidor
  // monta <raiz do projeto>/workspaces/<slug do nome> sozinho, e a tela anuncia
  // esse caminho enquanto ela digita.
  const aoCriar = async () => {
    const nome = nomeNovo.trim();
    if (!nome) return;
    setOcupado(true);
    setErro(null);
    try {
      const retorno = await criarCliente(nome);
      if (retorno.length > 0) setAvisos(retorno);
      fechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  const faixaErro = erro && (
    <div className="faixa faixa-alerta sw-faixa" role="alert">
      <IconeAlerta className="" />
      <div className="faixa-texto">{erro}</div>
    </div>
  );

  return (
    <div className="seletor-workspace" ref={refRaiz}>
      <span className="rotulo-grupo sw-rotulo">Workspace</span>
      <button
        className={`sw-trigger${aberto ? " aberto" : ""}`}
        onClick={() => (aberto ? fechar() : setAberto(true))}
        disabled={trocandoWorkspace}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title={ativo?.pasta ?? "Nenhum workspace aberto"}
      >
        <span className="sw-trigger-nome">{nomeAtivo}</span>
        <ChevronBaixo className="sw-chevron" />
      </button>

      {aberto && (
        <div className="popover sw-painel">
          {vista === "lista" && (
            <>
              {mostrarBusca && (
                <input
                  className="campo campo-p sw-busca"
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar workspace"
                  aria-label="Buscar workspace"
                />
              )}

              <div className="menu sw-lista">
                {filtrados.length === 0 ? (
                  <p className="sw-vazio">
                    {workspaces.length === 0
                      ? "Nenhum workspace ainda. Crie o primeiro aqui embaixo."
                      : "Nada encontrado. Apague parte da busca."}
                  </p>
                ) : (
                  filtrados.map((w) => {
                    const ehAtivo = w.id === workspaceAtivo;
                    const editando = editandoId === w.id;
                    const armado = confirmandoId === w.id;
                    return (
                      <div
                        key={w.id}
                        className={`sw-linha${ehAtivo ? " aberto" : ""}`}
                      >
                        {editando ? (
                          <input
                            className="campo campo-p sw-item-edit"
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
                          <button
                            className="menu-item sw-item"
                            onClick={() => void selecionar(w.id)}
                          >
                            <span className="item-lista-texto">
                              <span className="sw-item-nome" title={w.nome}>
                                {w.nome}
                              </span>
                              {/* Armado pra remover, a propria linha diz o que
                                  vai acontecer: balao flutuante dentro de um
                                  popover ficava recortado pela borda dele. */}
                              <span
                                className={`sw-item-caminho${armado ? " armado" : ""}`}
                                title={w.pasta}
                              >
                                {armado
                                  ? "Clique de novo para remover do Hub."
                                  : encurtar(w.pasta)}
                              </span>
                            </span>
                            {ehAtivo && <IconeCheck className="sw-check" />}
                          </button>
                        )}

                        {!editando && (
                          <div className="sw-linha-acoes">
                            <Botao
                              variante="fantasma"
                              tamanho="p"
                              soIcone
                              title="Renomear"
                              aria-label={`Renomear ${w.nome}`}
                              onClick={() => iniciarEdicao(w.id, w.nome)}
                            >
                              <IconeLapis className="" />
                            </Botao>
                            <Botao
                              variante={armado ? "perigo" : "fantasma"}
                              tamanho="p"
                              soIcone
                              title={
                                ehAtivo
                                  ? "Não dá pra remover o workspace aberto"
                                  : "Remover workspace do registro"
                              }
                              aria-label={`Remover ${w.nome}`}
                              disabled={ehAtivo}
                              onClick={() => clicarRemover(w.id)}
                            >
                              <IconeLixeira className="" />
                            </Botao>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {faixaErro}

              <div className="menu-separador" />
              <div className="menu">
                <button
                  className="menu-item"
                  onClick={() => {
                    setErro(null);
                    setVista("adicionar");
                  }}
                >
                  <IconePasta className="sw-icone" />
                  Adicionar workspace
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setErro(null);
                    setVista("novo");
                  }}
                >
                  <IconeMais className="sw-icone" />
                  Novo workspace
                </button>
              </div>
            </>
          )}

          {vista === "adicionar" && (
            <div className="sw-form">
              <div className="sw-form-topo">
                <Botao
                  variante="fantasma"
                  tamanho="p"
                  soIcone
                  aria-label="Voltar para a lista"
                  onClick={() => setVista("lista")}
                  disabled={ocupado}
                >
                  <IconeSeta className="sw-voltar-seta" />
                </Botao>
                <h3>Adicionar workspace</h3>
              </div>
              <p className="dica">
                Aponte a pasta VKOS de um projeto que já existe. O seletor do
                Windows vai abrir.
              </p>
              <Botao
                variante="principal"
                className="sw-botao-pasta"
                onClick={() => void aoEscolherEAdicionar()}
                disabled={ocupado}
                aria-busy={ocupado}
              >
                <IconePasta className="sw-icone" />
                Escolher pasta do workspace
              </Botao>
              {ocupado && (
                <p className="dica">Aguardando o seletor do Windows.</p>
              )}
              {faixaErro}
            </div>
          )}

          {vista === "novo" && (
            <div className="sw-form">
              <div className="sw-form-topo">
                <Botao
                  variante="fantasma"
                  tamanho="p"
                  soIcone
                  aria-label="Voltar para a lista"
                  onClick={() => setVista("lista")}
                  disabled={ocupado}
                >
                  <IconeSeta className="sw-voltar-seta" />
                </Botao>
                <h3>Novo workspace</h3>
              </div>
              <p className="dica">
                Cria um workspace novo com a mesma estrutura do aberto e o
                Cérebro em branco. Basta o nome: o Hub já sabe onde guardar.
              </p>
              <div className="grupo-campo">
                <label className="rotulo" htmlFor="sw-nome-novo">
                  Nome do workspace
                </label>
                <input
                  className="campo campo-p"
                  id="sw-nome-novo"
                  value={nomeNovo}
                  onChange={(e) => setNomeNovo(e.target.value)}
                  placeholder="Padaria do Bairro"
                  disabled={ocupado}
                />
                {/* A pessoa nao escolhe mais a pasta, mas nao pode ficar no
                    escuro sobre onde o dado dela vai parar. */}
                <span className="dica sw-destino">
                  Vai nascer em{" "}
                  <span className="sw-destino-valor">
                    {pastaPrevista(nomeNovo)}
                  </span>
                </span>
              </div>
              {faixaErro}
              <div className="acoes-formulario sw-form-acoes">
                <Botao
                  variante="principal"
                  onClick={() => void aoCriar()}
                  disabled={ocupado || !nomeNovo.trim()}
                  aria-busy={ocupado}
                >
                  Criar workspace
                </Botao>
              </div>
            </div>
          )}
        </div>
      )}

      {avisos && (
        <div className="sw-toast faixa faixa-aviso" role="status">
          <IconeAlerta className="" />
          <div className="faixa-texto">
            <strong className="sw-toast-titulo">
              Workspace criado, com pendências
            </strong>
            <ul className="sw-toast-lista">
              {avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="faixa-acoes">
            <Botao
              variante="fantasma"
              tamanho="p"
              soIcone
              aria-label="Fechar aviso"
              onClick={() => setAvisos(null)}
            >
              <IconeX className="" />
            </Botao>
          </div>
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
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
