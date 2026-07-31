import { useCallback, useEffect, useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { INFO_STATUS } from "../../config/status";
import { obterResumoCore } from "../../api/core";
import type { ResumoCore, WorkspaceNoCore } from "../../tipos/core";
import { mensagemDeErro } from "../../util/erros";
import { Botao } from "../comum/Botao";
import { IconeAlerta, IconeSeta } from "../comum/Icones";
import { PainelClientes, PainelCrm, PainelFinancas } from "./PaineisExemplo";
import {
  ROTULO_ATIVIDADE,
  alturaDaBarra,
  dicaDoGasto,
  formatarUsd,
  fraseDaTendencia,
  fraseDoPiso,
  fraseDosRemovidos,
  lerSerie,
  tempoRelativo,
} from "./logica";
import "./core.css";

// Quantos workspaces cabem no bloco do Dashboard antes de mandar pra lista.
const NO_DASHBOARD = 5;

interface Props {
  aoNavegar: (tela: string) => void;
}

// Dashboard do CORE: a tela principal do nivel de cima.
//
// Duas coisas, e so elas: quanto o dono gastou com IA e o que esta acontecendo
// no negocio dele agora. Nada aqui e do cliente aberto: o CORE nao muda quando
// se troca de workspace.
//
// A estrutura e a da fundacao v2: .tela, uma linha de cabecalho de 56px e um
// corpo rolante. Cada painel e uma .secao apoiada direto no plano de trabalho,
// e a unica caixa da tela e a .lista, onde o dado repete.
export function TelaCore({ aoNavegar }: Props) {
  const { sessoes, custos, workspaces, workspaceAtivo, trocarWorkspace } = usarEstado();
  const [resumo, setResumo] = useState<ResumoCore | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const emVoo = sessoes.filter((s) => INFO_STATUS[s.status].ativa).length;

  // Recarrega quando algo que muda o resumo acontece: sessao entrando ou
  // saindo de voo, custo somado, cliente entrando ou saindo do registro.
  useEffect(() => {
    let vivo = true;
    obterResumoCore()
      .then((dados) => {
        if (!vivo) return;
        setResumo(dados);
        setErro(null);
      })
      .catch((e) => {
        if (vivo) setErro(mensagemDeErro(e));
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [emVoo, custos, workspaces.length, workspaceAtivo]);

  const abrirWorkspace = useCallback(
    async (id: string) => {
      if (id !== workspaceAtivo) {
        try {
          await trocarWorkspace(id);
        } catch (e) {
          setErro(mensagemDeErro(e));
          return;
        }
      }
      aoNavegar("inicio");
    },
    [workspaceAtivo, trocarWorkspace, aoNavegar],
  );

  const destaque = useMemo(
    () => (resumo ? resumo.workspaces.slice(0, NO_DASHBOARD) : []),
    [resumo],
  );

  return (
    <section className="tela">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>Seu negócio</h1>
          <p>O nível de cima do Hub. Nada aqui muda quando você troca de workspace.</p>
        </div>
        <div className="tela-topo-acoes">
          {/* A unica acao principal da tela. Tudo o que se faz a partir do
              Dashboard passa por abrir um projeto. */}
          <Botao variante="principal" onClick={() => aoNavegar("workspaces")}>
            Abrir workspaces
          </Botao>
        </div>
      </header>

      <div className="tela-corpo">
        {erro && (
          <div className="faixa faixa-alerta core-faixa-erro" role="alert">
            <IconeAlerta className="" />
            <div className="faixa-texto">{erro}</div>
          </div>
        )}

        {/* Enquanto houver painel de exemplo na tela, o Dashboard diz isso uma
            vez, em texto corrido. Um selo em cada painel repetiria a mesma
            ressalva cinco vezes. */}
        <div className="faixa core-nota" role="note">
          <div className="faixa-texto">
            Clientes, Finanças e CRM estão com números de demonstração, para
            desenhar a tela. Gasto com IA e Projetos ativos são reais.
          </div>
        </div>

        <div className="core-grade">
          <section className="secao core-painel" aria-label="Gasto com IA">
            <div className="secao-topo">
              <h2>Gasto com IA</h2>
              <span className="selo">estimado</span>
            </div>

            {carregando && !resumo ? (
              <div className="esqueleto core-esqueleto" aria-hidden="true" />
            ) : resumo ? (
              <>
                <p className="core-numero" title={dicaDoGasto(resumo.gasto)}>
                  {formatarUsd(resumo.gasto.totalUsd, {
                    estimado: resumo.gasto.estimado,
                    piso: resumo.gasto.piso,
                  })}
                </p>
                <p className="core-legenda">
                  Todos os workspaces, inclusive os já removidos.
                </p>

                {/* O valor sai de uma tabela de precos embutida e a
                    autenticacao e assinatura, nao chave de API. Nenhum dolar
                    aqui e cobranca real, e a tela diz isso sempre. */}
                <p className="core-ressalva">
                  Valor aproximado, calculado por tabela de preços. Não é cobrança.
                </p>

                {fraseDoPiso(resumo.gasto) && (
                  <p className="core-alerta">
                    <IconeAlerta className="core-alerta-icone" />
                    {fraseDoPiso(resumo.gasto)}
                  </p>
                )}

                {fraseDosRemovidos(resumo.gasto) && (
                  <p className="core-ressalva">{fraseDosRemovidos(resumo.gasto)}</p>
                )}

                <Serie resumo={resumo} />
              </>
            ) : null}
          </section>

          <section className="secao core-painel" aria-label="Projetos ativos">
            <div className="secao-topo">
              <h2>Projetos ativos</h2>
              {resumo && resumo.sessoesRodando > 0 && (
                <span className="selo selo-vivo">
                  <span className="ponto-vivo" aria-hidden="true" />
                  ao vivo
                </span>
              )}
            </div>

            {carregando && !resumo ? (
              <div className="esqueleto core-esqueleto" aria-hidden="true" />
            ) : resumo ? (
              <>
                <p className="core-numero">
                  {resumo.projetosAtivos}
                  <span className="core-numero-de"> de {resumo.workspaces.length}</span>
                </p>
                <p className="core-legenda">
                  Projetos que trabalharam nos últimos dias.
                </p>

                {destaque.length === 0 ? (
                  <div className="vazio">
                    <h3>Nenhum workspace ainda</h3>
                    <p>
                      Cada projeto seu vira um workspace, com o Cérebro e as peças
                      dele. Crie o primeiro para começar.
                    </p>
                    <Botao variante="neutro" onClick={() => aoNavegar("workspaces")}>
                      Criar o primeiro
                    </Botao>
                  </div>
                ) : (
                  <div className="lista core-lista">
                    {destaque.map((w) => (
                      <LinhaWorkspace
                        key={w.id}
                        workspace={w}
                        aoAbrir={() => void abrirWorkspace(w.id)}
                      />
                    ))}
                  </div>
                )}

                {resumo.workspaces.length > destaque.length && (
                  <Botao
                    variante="fantasma"
                    tamanho="p"
                    className="core-ver-todos"
                    onClick={() => aoNavegar("workspaces")}
                  >
                    Ver os {resumo.workspaces.length} workspaces
                    <IconeSeta className="core-linha-seta" />
                  </Botao>
                )}
              </>
            ) : null}
          </section>

          {/* PAINEIS DE EXEMPLO. Numero nenhum aqui vem do sistema: eles estao
              na tela pro Jesse decidir se os resumos sao os certos antes de
              alguem ligar isso em dado real. Pra remover, ver exemplo.ts. */}
          <PainelClientes aoNavegar={aoNavegar} />
          <PainelFinancas aoNavegar={aoNavegar} />
          <PainelCrm aoNavegar={aoNavegar} />
        </div>
      </div>
    </section>
  );
}

// A serie diaria. Ela so existe por causa da leitura embaixo dela: sem a
// comparacao entre a semana corrente e a anterior, um desenho de barras nao
// mudaria nada do que se faz nos proximos dez minutos.
function Serie({ resumo }: { resumo: ResumoCore }) {
  const leitura = lerSerie(resumo.gasto.porDia);
  return (
    <div className="core-serie">
      <div className="core-serie-barras" aria-hidden="true">
        {resumo.gasto.porDia.map((dia) => (
          <span
            key={dia.dia}
            className={`core-barra${dia.turnosSemCusto > 0 ? " piso" : ""}`}
            style={{ height: `${alturaDaBarra(dia, leitura.maximo)}%` }}
            title={`${dia.dia}: ${formatarUsd(dia.usd, {
              estimado: true,
              piso: dia.turnosSemCusto > 0,
            })} em ${dia.turnos} ${dia.turnos === 1 ? "turno" : "turnos"}`}
          />
        ))}
      </div>
      <p className="core-serie-leitura">
        {fraseDaTendencia(leitura, resumo.diasDaSerie)}
      </p>
    </div>
  );
}

// Uma linha de workspace no Dashboard. Clicar abre o workspace e cai na tela de
// trabalho dele. A linha inteira e o alvo, e ela se anuncia parada: superficie,
// fio e seta ja estao la antes de o mouse chegar.
export function LinhaWorkspace({
  workspace,
  aoAbrir,
}: {
  workspace: WorkspaceNoCore;
  aoAbrir: () => void;
}) {
  const quando = tempoRelativo(workspace.ultimoTurnoEm ?? workspace.ultimoUso);
  const rodando = workspace.atividade === "rodando";
  return (
    <button className="item-lista" type="button" onClick={aoAbrir} title={workspace.pasta}>
      <span
        className={`ponto-vivo${rodando ? "" : " parado"}`}
        aria-hidden="true"
      />
      <span className="item-lista-texto">
        <span className="item-lista-titulo">{workspace.nome}</span>
        <span className="item-lista-meta">
          {ROTULO_ATIVIDADE[workspace.atividade]}
          {workspace.sessoesRodando > 0 &&
            `, ${workspace.sessoesRodando} ${
              workspace.sessoesRodando === 1 ? "sessão" : "sessões"
            }`}
          {quando && `, ${quando}`}
        </span>
      </span>
      <span
        className="core-linha-valor"
        title={
          workspace.gastoIlegivel
            ? "O histórico de gasto deste workspace não pôde ser lido."
            : undefined
        }
      >
        {workspace.gastoIlegivel
          ? "sem leitura"
          : formatarUsd(workspace.totalUsd, {
              estimado: workspace.estimado,
              piso: workspace.piso,
            })}
      </span>
      <IconeSeta className="core-linha-seta" />
    </button>
  );
}
