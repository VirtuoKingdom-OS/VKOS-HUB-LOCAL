import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  criarWorkspaceAdmin,
  type EstadoMotoresAdmin,
  type FeaturePlataforma,
  type ModeloWorkspace,
  type WorkspacePlataforma,
} from "../../api/cliente";
import { Botao, Campo, EstadoCarregando, EstadoVazio } from "../comum/Sistema";
import { nomeMotorAdmin } from "./motoresAdmin";
import { LogoWorkspace } from "./LogoWorkspace";
import { DetalheCliente, PainelModelos } from "./TelaAdmin";

function acessoResumo(workspace: WorkspacePlataforma): string {
  const emails = (workspace.membros_resumo ?? []).map((m) => m.email);
  if (emails.length === 0) return "Sem acesso liberado";
  return `Acesso: ${emails.join(", ")}`;
}

// Area unificada Workspace do CORE. O workspace real e o objeto principal; o
// plano virou uma receita de partida, escolhida ao criar e gerenciada numa
// gaveta secundaria. Nada de plano compete com o workspace na tela em repouso.

type Gaveta = "nenhuma" | "criar" | "planos" | "detalhe";

interface Props {
  modelos: ModeloWorkspace[];
  workspaces: WorkspacePlataforma[];
  features: FeaturePlataforma[];
  motores: EstadoMotoresAdmin | null;
  carregando: boolean;
  aoExecutar: (acao: () => Promise<unknown>, mensagem: string) => Promise<void>;
  aoAvisar: (mensagem: string) => void;
  aoLimparMensagens: () => void;
  aoEntrarWorkspace?: (id: string) => void;
  // "planos" abre a gaveta de planos; qualquer outro texto e um id de workspace
  // pra abrir direto o detalhe (usado pelos alertas do Painel).
  focoInicial?: string | null;
  aoConsumirFoco?: () => void;
}

const LIMITE_BUSCA = 6;

export function AreaWorkspace({
  modelos,
  workspaces,
  features,
  motores,
  carregando,
  aoExecutar,
  aoAvisar,
  aoLimparMensagens,
  aoEntrarWorkspace,
  focoInicial = null,
  aoConsumirFoco,
}: Props) {
  const [gaveta, setGaveta] = useState<Gaveta>("nenhuma");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState("");
  const [modeloId, setModeloId] = useState("");

  // Foco vindo do Painel: abre a gaveta certa uma vez e limpa.
  useEffect(() => {
    if (!focoInicial) return;
    if (focoInicial === "planos") {
      setGaveta("planos");
    } else {
      setSelecionadoId(focoInicial);
      setGaveta("detalhe");
    }
    aoConsumirFoco?.();
  }, [focoInicial, aoConsumirFoco]);

  const selecionado = useMemo(
    () => workspaces.find((w) => w.id === selecionadoId) ?? null,
    [workspaces, selecionadoId],
  );

  const ativos = workspaces.filter((w) => w.status === "ativo").length;
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return workspaces;
    return workspaces.filter((w) => w.nome.toLowerCase().includes(termo));
  }, [workspaces, busca]);

  const fecharGaveta = useCallback(() => {
    if (gaveta === "criar" && nome.trim()) {
      if (!window.confirm("Descartar o novo workspace?")) return;
    }
    setGaveta("nenhuma");
    setSelecionadoId(null);
    aoLimparMensagens();
  }, [gaveta, nome, aoLimparMensagens]);

  // Escape fecha a gaveta aberta.
  useEffect(() => {
    if (gaveta === "nenhuma") return;
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fecharGaveta();
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [gaveta, fecharGaveta]);

  function abrirCriar() {
    setNome("");
    setModeloId(modelos[0]?.id ?? "");
    aoLimparMensagens();
    setGaveta("criar");
  }

  function abrirDetalhe(id: string) {
    setSelecionadoId(id);
    aoLimparMensagens();
    setGaveta("detalhe");
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    if (!modeloId) return;
    await aoExecutar(
      () => criarWorkspaceAdmin({ nome, modeloId }),
      "Workspace provisionado. O acesso externo ainda não foi liberado.",
    );
    setNome("");
    setModeloId(modelos[0]?.id ?? "");
    setGaveta("nenhuma");
  }

  const semPlano = modelos.length === 0;

  return (
    <section className="workspace-area">
      <div className="workspace-barra">
        <div className="workspace-resumo">
          {carregando ? (
            <span>Carregando...</span>
          ) : (
            <span>
              {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"}, {ativos} ativo
              {ativos === 1 ? "" : "s"}
            </span>
          )}
          {workspaces.length > LIMITE_BUSCA && (
            <input
              className="workspace-busca"
              type="search"
              placeholder="Buscar workspace"
              aria-label="Buscar workspace"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          )}
        </div>
        <div className="workspace-barra-acoes">
          <Botao variante="sutil" type="button" onClick={() => setGaveta("planos")}>
            Planos de partida ({modelos.length})
          </Botao>
          <Botao variante="primario" type="button" onClick={abrirCriar}>
            Novo workspace
          </Botao>
        </div>
      </div>

      {carregando ? (
        <div className="workspace-lista">
          <EstadoCarregando linhas={4} />
        </div>
      ) : workspaces.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum workspace ainda"
          mensagem={
            semPlano
              ? "Antes de criar um workspace, crie um plano de partida."
              : "Provisione o primeiro workspace a partir de um plano."
          }
          acao={
            semPlano ? (
              <Botao variante="primario" type="button" onClick={() => setGaveta("planos")}>
                Criar primeiro plano
              </Botao>
            ) : (
              <Botao variante="primario" type="button" onClick={abrirCriar}>
                Novo workspace
              </Botao>
            )
          }
        />
      ) : filtrados.length === 0 ? (
        <EstadoVazio titulo="Nada encontrado" mensagem="Nenhum workspace com esse nome." />
      ) : (
        <div className="workspace-lista">
          {filtrados.map((workspace) => (
            <article
              className={`admin-linha admin-cliente${workspace.id === selecionadoId ? " selecionado" : ""}`}
              key={workspace.id}
            >
              <div className="workspace-linha-info">
                <LogoWorkspace nome={workspace.nome} logo={workspace.logo} />
                <div className="workspace-linha-texto">
                  <strong>{workspace.nome}</strong>
                  <p>${Number(workspace.consumo_mes).toFixed(2)} neste mês</p>
                  <small className="workspace-acesso">{acessoResumo(workspace)}</small>
                </div>
              </div>
              <span className={`admin-selo ${workspace.status}`}>{workspace.status}</span>
              <span>{nomeMotorAdmin(workspace.motor)}</span>
              <div className="admin-cliente-acoes">
                {aoEntrarWorkspace && (
                  <Botao variante="sutil" type="button" onClick={() => aoEntrarWorkspace(workspace.id)}>
                    Entrar
                  </Botao>
                )}
                <Botao variante="sutil" type="button" onClick={() => abrirDetalhe(workspace.id)}>
                  Gerenciar
                </Botao>
              </div>
            </article>
          ))}
        </div>
      )}

      {gaveta !== "nenhuma" && (
        <>
          <div className="core-gaveta-fundo" onClick={fecharGaveta} aria-hidden="true" />

          {gaveta === "criar" && (
            <div className="core-gaveta" role="dialog" aria-modal="true" aria-label="Novo workspace">
              <div className="core-gaveta-cabeca">
                <h2>Novo workspace</h2>
                <button type="button" className="core-gaveta-fechar" aria-label="Fechar" onClick={fecharGaveta}>
                  ✕
                </button>
              </div>
              {semPlano ? (
                <EstadoVazio
                  titulo="Você ainda não tem planos"
                  mensagem="Um workspace nasce de um plano. Crie o primeiro plano pra liberar a criação."
                  acao={
                    <Botao variante="primario" type="button" onClick={() => setGaveta("planos")}>
                      Criar primeiro plano
                    </Botao>
                  }
                />
              ) : (
                <form className="core-gaveta-form" onSubmit={criar}>
                  <Campo
                    rotulo="Nome do workspace"
                    ajuda="O identificador interno é criado automaticamente."
                    placeholder="Ex.: Padaria Aurora"
                    value={nome}
                    onChange={(evento) => setNome(evento.target.value)}
                    autoFocus
                    required
                  />
                  <SeletorPlano modelos={modelos} valor={modeloId} aoEscolher={setModeloId} />
                  <div className="core-gaveta-acoes">
                    <Botao variante="primario" type="submit" disabled={!modeloId}>
                      Provisionar workspace
                    </Botao>
                  </div>
                </form>
              )}
            </div>
          )}

          {gaveta === "planos" && (
            <div className="core-gaveta" role="dialog" aria-modal="true" aria-label="Planos de partida">
              <div className="core-gaveta-cabeca">
                <div>
                  <h2>Planos de partida</h2>
                  <p>As receitas que originam um workspace.</p>
                </div>
                <button type="button" className="core-gaveta-fechar" aria-label="Fechar" onClick={fecharGaveta}>
                  ✕
                </button>
              </div>
              <PainelModelos features={features} modelos={modelos} aoExecutar={aoExecutar} />
            </div>
          )}

          {gaveta === "detalhe" && selecionado && (
            <div className="core-gaveta" role="dialog" aria-modal="true" aria-label={`Gerenciar ${selecionado.nome}`}>
              <DetalheCliente
                workspace={selecionado}
                features={features}
                motores={motores}
                aoExecutar={aoExecutar}
                aoAvisar={aoAvisar}
                aoLimparMensagens={aoLimparMensagens}
                aoFechar={fecharGaveta}
                aoEntrarWorkspace={aoEntrarWorkspace}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Seletor de plano em cartoes de radio. Mostra motor e contagem de features na
// hora da escolha, pra o operador saber o que o plano molda no workspace.
function SeletorPlano({
  modelos,
  valor,
  aoEscolher,
}: {
  modelos: ModeloWorkspace[];
  valor: string;
  aoEscolher: (id: string) => void;
}) {
  return (
    <fieldset className="seletor-plano">
      <legend>Plano de partida</legend>
      <p className="seletor-plano-ajuda">Define a semente da pasta, o motor e as features iniciais.</p>
      <div className="seletor-plano-cartoes">
        {modelos.map((modelo) => (
          <button
            type="button"
            key={modelo.id}
            className={`seletor-plano-cartao${valor === modelo.id ? " ativo" : ""}`}
            aria-pressed={valor === modelo.id}
            onClick={() => aoEscolher(modelo.id)}
          >
            <span className="seletor-plano-topo">
              <strong>{modelo.nome}</strong>
              <span className="seletor-plano-motor">{nomeMotorAdmin(modelo.motor_padrao)}</span>
            </span>
            <span className="seletor-plano-descricao">{modelo.descricao || "Sem descrição"}</span>
            <span className="seletor-plano-features">{modelo.features_json.length} features</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
