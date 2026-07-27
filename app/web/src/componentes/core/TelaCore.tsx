import { useCallback, useEffect, useMemo, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { INFO_STATUS } from "../../config/status";
import { obterResumoCore } from "../../api/core";
import type { ResumoCore, WorkspaceNoCore } from "../../tipos/core";
import { mensagemDeErro } from "../../util/erros";
import { IconeAlerta, IconeSeta } from "../comum/Icones";
import {
  ROTULO_ATIVIDADE,
  alturaDaBarra,
  dicaDoGasto,
  formatarUsd,
  fraseDaTendencia,
  fraseDoPiso,
  fraseDosProjetos,
  fraseDosRemovidos,
  lerSerie,
  tempoRelativo,
} from "./logica";
import "../../estilos/core.css";

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

  const serie = useMemo(() => lerSerie(resumo?.gasto.porDia ?? []), [resumo]);
  const destaque = useMemo(
    () => (resumo ? resumo.workspaces.slice(0, NO_DASHBOARD) : []),
    [resumo],
  );

  return (
    <section className="tela-core">
      <div className="core-scroll">
        <header className="core-cabecalho">
          <span className="core-nivel">CORE</span>
          <h1>Seu negócio</h1>
          <p className="core-contexto">
            O nível de cima do Hub. O que você vê aqui não muda quando você troca
            de workspace.
          </p>
        </header>

        {erro && (
          <div className="core-erro" role="alert">
            <IconeAlerta className="" />
            {erro}
          </div>
        )}

        <div className="core-blocos">
          <section className="core-bloco core-bloco-gasto" aria-label="Gasto com IA">
            <div className="core-bloco-topo">
              <h2>Gasto com IA</h2>
              <span className="core-bloco-marca">estimado</span>
            </div>

            {carregando && !resumo ? (
              <div className="core-esqueleto" aria-hidden="true" />
            ) : resumo ? (
              <>
                <p className="core-numero" title={dicaDoGasto(resumo.gasto)}>
                  {formatarUsd(resumo.gasto.totalUsd, {
                    estimado: resumo.gasto.estimado,
                    piso: resumo.gasto.piso,
                  })}
                </p>
                <p className="core-numero-legenda">
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

          <section className="core-bloco core-bloco-projetos" aria-label="Projetos ativos">
            <div className="core-bloco-topo">
              <h2>Projetos ativos</h2>
              {resumo && resumo.sessoesRodando > 0 && (
                <span className="core-bloco-pulso">
                  <span className="core-ponto-vivo" />
                  ao vivo
                </span>
              )}
            </div>

            {carregando && !resumo ? (
              <div className="core-esqueleto" aria-hidden="true" />
            ) : resumo ? (
              <>
                <p className="core-numero">
                  {resumo.projetosAtivos}
                  <span className="core-numero-de"> de {resumo.workspaces.length}</span>
                </p>
                <p className="core-numero-legenda">
                  {fraseDosProjetos({
                    projetosAtivos: resumo.projetosAtivos,
                    total: resumo.workspaces.length,
                    sessoesRodando: resumo.sessoesRodando,
                    janelaAtividadeDias: resumo.janelaAtividadeDias,
                  })}
                </p>

                {destaque.length === 0 ? (
                  <div className="core-vazio">
                    <p>Nenhum workspace ainda.</p>
                    <button
                      className="botao botao-principal"
                      type="button"
                      onClick={() => aoNavegar("workspaces")}
                    >
                      Criar o primeiro
                    </button>
                  </div>
                ) : (
                  <ul className="core-lista">
                    {destaque.map((w) => (
                      <li key={w.id}>
                        <LinhaWorkspace
                          workspace={w}
                          aoAbrir={() => void abrirWorkspace(w.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {resumo.workspaces.length > destaque.length && (
                  <button
                    className="core-ver-todos"
                    type="button"
                    onClick={() => aoNavegar("workspaces")}
                  >
                    Ver os {resumo.workspaces.length} workspaces
                    <IconeSeta className="" />
                  </button>
                )}
              </>
            ) : null}
          </section>
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
// trabalho dele.
export function LinhaWorkspace({
  workspace,
  aoAbrir,
}: {
  workspace: WorkspaceNoCore;
  aoAbrir: () => void;
}) {
  const quando = tempoRelativo(workspace.ultimoTurnoEm ?? workspace.ultimoUso);
  return (
    <button className="core-linha" type="button" onClick={aoAbrir} title={workspace.pasta}>
      <span className={`core-linha-estado ${workspace.atividade}`} aria-hidden="true" />
      <span className="core-linha-texto">
        <span className="core-linha-nome">
          {workspace.nome}
          {workspace.ativo && <span className="core-etiqueta">aberto</span>}
        </span>
        <span className="core-linha-sub">
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
    </button>
  );
}
