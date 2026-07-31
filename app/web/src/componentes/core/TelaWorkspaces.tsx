import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { escolherPastaNativa } from "../../api/cliente";
import { obterResumoCore } from "../../api/core";
import type { EstadoAtividade, ResumoCore, WorkspaceNoCore } from "../../tipos/core";
import { INFO_STATUS } from "../../config/status";
import { mensagemDeErro } from "../../util/erros";
import { Botao } from "../comum/Botao";
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
  pastaPrevista,
  tempoRelativo,
} from "./logica";
import "./core.css";

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
//
// UMA LINHA POR PROJETO, e nao mais uma grade de cartoes: workspace nao tem
// imagem, e sem imagem o cartao so gasta altura. Na lista cabem tres vezes mais
// projetos na mesma tela, o gasto vira coluna e se compara de cima a baixo, e
// as acoes de cada linha nascem visiveis.
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

  // Criar pede so o nome. O destino nao e mais escolha da pessoa: o servidor
  // monta <raiz do projeto>/workspaces/<slug do nome> sozinho, e a tela anuncia
  // esse caminho em relativo enquanto ela digita.
  const aoCriar = async () => {
    const nome = nomeNovo.trim();
    if (!nome) return;
    setOcupado(true);
    setErro(null);
    try {
      const retorno = await criarCliente(nome);
      if (retorno.length > 0) setAvisos(retorno);
      setVista("lista");
      setNomeNovo("");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="tela">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>Workspaces</h1>
          <p>
            Um workspace por projeto. Cada um é uma pasta VKOS completa, com o
            Cérebro, as peças e as sessões dele.
          </p>
        </div>
        {/* As acoes do cabecalho so existem na lista: nas duas telas de
            formulario a acao principal e a do proprio formulario, e duas
            principais na mesma tela e o que faz o olho parar de achar a
            primeira. */}
        {vista === "lista" && (
          <div className="tela-topo-acoes">
            <Botao
              variante="neutro"
              onClick={() => {
                setErro(null);
                setVista("adicionar");
              }}
            >
              <IconePasta className="" />
              Adicionar
            </Botao>
            <Botao
              variante="principal"
              onClick={() => {
                setErro(null);
                setVista("novo");
              }}
            >
              <IconeMais className="" />
              Novo workspace
            </Botao>
          </div>
        )}
      </header>

      <div className="tela-corpo">
        {erro && (
          <div className="faixa faixa-alerta core-faixa-erro" role="alert">
            <IconeAlerta className="" />
            <div className="faixa-texto">{erro}</div>
          </div>
        )}

        {avisos && (
          <div className="faixa faixa-aviso core-faixa-erro" role="status">
            <IconeAlerta className="" />
            <div className="faixa-texto">
              Workspace criado, com pendências:{" "}
              {avisos.join(" ")}
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

        {vista === "lista" && (
          <>
            {workspaces.length > LIMITE_BUSCA && (
              <div className="barra-ferramentas">
                <div className="campo-com-icone ws-busca">
                  <IconeLupa />
                  <input
                    className="campo"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar workspace"
                    aria-label="Buscar workspace"
                  />
                </div>
              </div>
            )}

            {linhas.length === 0 ? (
              <div className="vazio">
                <h2>
                  {workspaces.length === 0
                    ? "Nenhum workspace ainda"
                    : "Nenhum workspace com esse nome"}
                </h2>
                <p>
                  {workspaces.length === 0
                    ? "Cada projeto seu vira um workspace, com o Cérebro e as peças dele. Crie o primeiro para começar a trabalhar."
                    : "Apague parte da busca para ver os outros projetos."}
                </p>
                {workspaces.length === 0 && (
                  <Botao variante="neutro" onClick={() => setVista("novo")}>
                    Criar o primeiro
                  </Botao>
                )}
              </div>
            ) : (
              <div className="lista ws-lista">
                {linhas.map(({ registro, core }) => {
                  const ehAtivo = registro.id === workspaceAtivo;
                  const editando = editandoId === registro.id;
                  const armado = confirmandoId === registro.id;
                  const quando = tempoRelativo(core?.ultimoTurnoEm ?? registro.ultimoUso);
                  const contexto = fraseDoContexto(core, quando);
                  return (
                    <div
                      key={registro.id}
                      className={`item-lista${ehAtivo ? " ativo" : ""}`}
                    >
                      {editando ? (
                        <input
                          className="campo campo-p ws-nome-edit"
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
                        <span className="item-lista-texto">
                          <span className="item-lista-titulo" title={registro.nome}>
                            {registro.nome}
                          </span>
                          {/* Armado pra remover, a propria linha diz o que vai
                              acontecer. Balao flutuante em cima do botao ficava
                              recortado pela borda da lista. */}
                          <span
                            className={`item-lista-meta${armado ? " ws-meta-armada" : ""}`}
                            title={registro.pasta}
                          >
                            {armado
                              ? "Clique de novo para remover. Sai do registro do Hub; a pasta VKOS fica intacta."
                              : `${encurtarCaminho(registro.pasta)}, ${contexto}`}
                          </span>
                        </span>
                      )}

                      <span className="ws-cel-selo">
                        <SeloAtividade atividade={core?.atividade ?? "parado"} />
                      </span>

                      {!core ? (
                        <span className="ws-gasto vago">carregando</span>
                      ) : core.gastoIlegivel ? (
                        <span
                          className="ws-gasto vago"
                          title="O histórico de gasto deste workspace não pôde ser lido."
                        >
                          sem leitura
                        </span>
                      ) : (
                        <span className="ws-gasto" title="Gasto com IA neste workspace">
                          {formatarUsd(core.totalUsd, {
                            estimado: core.estimado,
                            piso: core.piso,
                          })}
                          <span className="ws-gasto-unidade">em IA</span>
                        </span>
                      )}

                      <div className="item-lista-acoes">
                        <Botao
                          tamanho="p"
                          disabled={trocandoWorkspace}
                          onClick={() => void abrir(registro.id)}
                        >
                          {ehAtivo ? "Ir para o trabalho" : "Abrir"}
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="p"
                          soIcone
                          title="Renomear"
                          aria-label={`Renomear ${registro.nome}`}
                          onClick={() => {
                            setConfirmandoId(null);
                            setEditandoId(registro.id);
                            setNomeEdit(registro.nome);
                          }}
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
                          aria-label={`Remover ${registro.nome}`}
                          disabled={ehAtivo}
                          onClick={() => clicarRemover(registro.id)}
                        >
                          <IconeLixeira className="" />
                        </Botao>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {vista === "adicionar" && (
          <div className="tela-corpo-estreito">
            <section className="secao">
              <div className="secao-topo">
                <h2>Adicionar workspace</h2>
                <Botao variante="fantasma" tamanho="p" onClick={() => setVista("lista")}>
                  Voltar
                </Botao>
              </div>
              <p className="dica">
                Aponte a pasta VKOS de um projeto que já existe. O seletor do
                Windows vai abrir.
              </p>
              <div className="acoes-formulario">
                <Botao
                  variante="principal"
                  onClick={() => void aoEscolherEAdicionar()}
                  disabled={ocupado}
                  aria-busy={ocupado}
                >
                  <IconePasta className="" />
                  Escolher pasta
                </Botao>
              </div>
            </section>
          </div>
        )}

        {vista === "novo" && (
          <div className="tela-corpo-estreito">
            <section className="secao">
              <div className="secao-topo">
                <h2>Novo workspace</h2>
                <Botao variante="fantasma" tamanho="p" onClick={() => setVista("lista")}>
                  Voltar
                </Botao>
              </div>
              <p className="dica">
                Cria um workspace novo com a mesma estrutura do aberto e o Cérebro
                em branco. Basta o nome: o Hub já sabe onde guardar.
              </p>
              <div className="grupo-campo">
                <label className="rotulo" htmlFor="ws-nome-novo">
                  Nome do workspace
                </label>
                <input
                  className="campo"
                  id="ws-nome-novo"
                  value={nomeNovo}
                  onChange={(e) => setNomeNovo(e.target.value)}
                  placeholder="Padaria do Bairro"
                  disabled={ocupado}
                  aria-describedby="ws-destino"
                />
                {/* A pessoa nao escolhe mais a pasta, mas nao pode ficar no
                    escuro sobre onde o dado dela vai parar. O caminho e
                    relativo porque a raiz e do servidor. */}
                <span className="dica" id="ws-destino">
                  Vai nascer em {pastaPrevista(nomeNovo)}
                </span>
              </div>
              <div className="acoes-formulario">
                <Botao variante="neutro" onClick={() => setVista("lista")} disabled={ocupado}>
                  Cancelar
                </Botao>
                {/* O rotulo NAO vira "Criando": trocar o texto por um estado
                    apaga qual acao esta em curso. O giro entra ao lado. */}
                <Botao
                  variante="principal"
                  onClick={() => void aoCriar()}
                  disabled={ocupado || !nomeNovo.trim()}
                  aria-busy={ocupado}
                >
                  Criar workspace
                </Botao>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

// O estado de atividade do workspace, como selo com texto.
//
// Sao TRES estados, e nao um liga/desliga: "Rodando agora" e "Ativo" nao sao a
// mesma noticia. Cor so no estado vivo, que e a regra do menta falar pouco: os
// outros dois sao o selo neutro.
function SeloAtividade({ atividade }: { atividade: EstadoAtividade }) {
  const vivo = atividade === "rodando";
  return (
    <span className={`selo${vivo ? " selo-vivo" : ""}`}>
      <span className={`ponto-vivo${vivo ? "" : " parado"}`} aria-hidden="true" />
      {ROTULO_ATIVIDADE[atividade]}
    </span>
  );
}

// A frase de contexto da linha: sessoes em voo e quando foi o ultimo trabalho.
function fraseDoContexto(core: WorkspaceNoCore | null, quando: string | null): string {
  const partes: string[] = [];
  if (core && core.sessoesRodando > 0) {
    partes.push(
      `${core.sessoesRodando} ${core.sessoesRodando === 1 ? "sessão" : "sessões"}`,
    );
  }
  partes.push(quando ? `trabalhou ${quando}` : "nunca trabalhou");
  return partes.join(", ");
}

// Lupa da busca. Ela e decorativa: o rotulo real do campo vive no aria-label.
function IconeLupa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}
