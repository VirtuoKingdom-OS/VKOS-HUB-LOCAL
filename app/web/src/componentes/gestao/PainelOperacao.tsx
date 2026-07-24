import { useEffect, useMemo, useState } from "react";
import {
  listarAuditoriaAdmin,
  obterClaudeCoreAdmin,
  type EstadoClaudeCore,
  type EstadoMotoresAdmin,
  type EventoAuditoria,
  type WorkspacePlataforma,
} from "../../api/cliente";
import { EstadoVazio } from "../comum/Sistema";

// Alerta acionavel: nunca um numero de vaidade, sempre algo que leva a uma acao.
interface Alerta {
  id: string;
  nivel: "critico" | "atencao";
  texto: string;
  acao: string;
  aoAgir: () => void;
}

type Destino = "workspace" | "workspace:planos" | "sistema:meu-claude";

interface Props {
  workspaces: WorkspacePlataforma[];
  modelos: number;
  motores: EstadoMotoresAdmin | null;
  aoIr: (destino: Destino, workspaceId?: string) => void;
}

const ROTULO_ACAO: Record<string, string> = {
  "credencial.rotacionada": "Credencial atualizada",
  "workspace.criado": "Cliente provisionado",
  "workspace.aberto_como_operador": "Workspace aberto por você",
  "convite.criado": "Login liberado",
  "convite.aceito": "Convite aceito",
  "convite.revogado": "Convite revogado",
  "membro.removido": "Login removido",
  "workspace.membro_removido": "Login removido",
  "workspace.feature_alterada": "Feature alterada",
  "workspace.suspenso": "Workspace suspenso",
  "workspace.reativado": "Workspace reativado",
  "login.sucesso": "Login de cliente",
  "login.falha": "Tentativa de login",
  "workspace.motor_alterado": "Motor alterado",
  "operador.bootstrap": "Operador configurado",
};

function quando(iso: string): string {
  const data = new Date(iso);
  const agora = Date.now();
  const min = Math.round((agora - data.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return data.toLocaleDateString("pt-BR");
}

export function PainelOperacao({ workspaces, modelos, motores, aoIr }: Props) {
  const [claude, setClaude] = useState<EstadoClaudeCore | null>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [carregandoAtividade, setCarregandoAtividade] = useState(true);

  useEffect(() => {
    let vivo = true;
    obterClaudeCoreAdmin().then((c) => vivo && setClaude(c)).catch(() => undefined);
    listarAuditoriaAdmin()
      .then((r) => vivo && setEventos(r.eventos.slice(0, 6)))
      .catch(() => undefined)
      .finally(() => vivo && setCarregandoAtividade(false));
    return () => {
      vivo = false;
    };
  }, []);

  const ativos = workspaces.filter((w) => w.status === "ativo").length;
  const suspensos = workspaces.length - ativos;
  const consumoMes = workspaces.reduce((soma, w) => soma + Number(w.consumo_mes), 0);

  const alertas = useMemo<Alerta[]>(() => {
    const lista: Alerta[] = [];
    if (claude && claude.logado === false) {
      lista.push({
        id: "claude-deslogado",
        nivel: "critico",
        texto: "Seu Claude do CORE está deslogado.",
        acao: "Abrir Meu Claude",
        aoAgir: () => aoIr("sistema:meu-claude"),
      });
    }
    if (motores && motores.gemini.disponivel === false) {
      lista.push({
        id: "gemini-off",
        nivel: "atencao",
        texto: "O Gemini não está configurado. Clientes novos ficam sem IA até o Vertex responder.",
        acao: "Ver segurança e motores",
        aoAgir: () => aoIr("sistema:meu-claude"),
      });
    }
    for (const w of workspaces) {
      if (w.status === "suspenso") {
        lista.push({
          id: `susp-${w.id}`,
          nivel: "atencao",
          texto: `O workspace de ${w.nome} está suspenso.`,
          acao: "Gerenciar workspace",
          aoAgir: () => aoIr("workspace", w.id),
        });
      }
      if (w.motor === "claude_team" && w.claude_credencial_status !== "valida") {
        lista.push({
          id: `cred-${w.id}`,
          nivel: "critico",
          texto: `A credencial Claude Team de ${w.nome} não está validada.`,
          acao: "Configurar credencial",
          aoAgir: () => aoIr("workspace", w.id),
        });
      }
      if (w.motor_estado === "manutencao") {
        lista.push({
          id: `mot-${w.id}`,
          nivel: "critico",
          texto: `A IA de ${w.nome} está em manutenção.`,
          acao: "Testar motor",
          aoAgir: () => aoIr("workspace", w.id),
        });
      }
      if (w.orcamento_mensal > 0 && Number(w.consumo_mes) >= w.orcamento_mensal) {
        lista.push({
          id: `orc-${w.id}`,
          nivel: "atencao",
          texto: `${w.nome} atingiu o orçamento de IA do mês.`,
          acao: "Ajustar limite",
          aoAgir: () => aoIr("workspace", w.id),
        });
      }
    }
    return lista;
  }, [workspaces, claude, motores, aoIr]);

  return (
    <div className="gestao-painel">
      <div className="gestao-indicadores">
        <button type="button" className="gestao-indicador gestao-indicador-acao" onClick={() => aoIr("workspace")}>
          <strong>{ativos}</strong>
          <span>workspaces ativos</span>
          {suspensos > 0 && <small>{suspensos} suspenso{suspensos > 1 ? "s" : ""}</small>}
        </button>
        <button type="button" className="gestao-indicador gestao-indicador-acao" onClick={() => aoIr("workspace:planos")}>
          <strong>{modelos}</strong>
          <span>planos</span>
        </button>
        <article className="gestao-indicador">
          <strong>${consumoMes.toFixed(2)}</strong>
          <span>IA neste mês</span>
          <small>somado, aproximado</small>
        </article>
        <article className="gestao-indicador">
          <strong>{claude?.logado ? "ok" : claude?.logado === false ? "off" : "…"}</strong>
          <span>Meu Claude</span>
          {claude?.conta && <small>{claude.conta}</small>}
        </article>
      </div>

      <div className="gestao-painel-colunas">
        <section className="gestao-bloco">
          <h2>Alertas</h2>
          {alertas.length === 0 ? (
            <EstadoVazio titulo="Tudo em ordem" mensagem="Nenhuma pendência na operação agora." />
          ) : (
            <ul className="gestao-alertas">
              {alertas.map((a) => (
                <li key={a.id} className={`gestao-alerta ${a.nivel}`}>
                  <span className="gestao-alerta-texto">{a.texto}</span>
                  <button type="button" className="gestao-alerta-acao" onClick={a.aoAgir}>
                    {a.acao}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="gestao-bloco gestao-atividade-canto">
          <h2>Atividade</h2>
          {carregandoAtividade ? (
            <p className="gestao-vazio-linha">Carregando…</p>
          ) : eventos.length === 0 ? (
            <p className="gestao-vazio-linha">Sem atividade ainda.</p>
          ) : (
            <ul className="gestao-atividade">
              {eventos.map((e) => (
                <li key={e.id} className="gestao-evento">
                  <span className="gestao-evento-acao">{ROTULO_ACAO[e.acao] ?? e.acao}</span>
                  <span className="gestao-evento-quando">{quando(e.criado_em)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
