import { useEffect, useState } from "react";
import { listarAuditoriaAdmin, type EventoAuditoria } from "../../api/cliente";
import { EstadoCarregando, EstadoErro, EstadoVazio } from "../comum/Sistema";

const ROTULO: Record<string, string> = {
  "credencial.rotacionada": "Credencial atualizada",
  "credencial.acessada": "Credencial acessada",
  "workspace.criado": "Cliente provisionado",
  "workspace.aberto_como_operador": "Workspace aberto por você",
  "workspace.motor_alterado": "Motor alterado",
  "convite.criado": "Login liberado",
  "convite.revogado": "Convite revogado",
  "membro.removido": "Login removido",
  "login.sucesso": "Login de cliente",
  "login.falha": "Tentativa de login",
  "operador.bootstrap": "Operador configurado",
};

export function PainelAuditoria() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");

  useEffect(() => {
    let vivo = true;
    listarAuditoriaAdmin()
      .then((r) => { if (vivo) { setEventos(r.eventos); setEstado("pronto"); } })
      .catch(() => vivo && setEstado("erro"));
    return () => { vivo = false; };
  }, []);

  if (estado === "carregando") return <EstadoCarregando />;
  if (estado === "erro") return <EstadoErro mensagem="Não foi possível carregar a auditoria." />;
  if (eventos.length === 0) return <EstadoVazio titulo="Sem registros" mensagem="As ações da operação aparecem aqui." />;

  return (
    <div className="gestao-auditoria">
      <table className="gestao-tabela">
        <thead>
          <tr><th>Ação</th><th>Alvo</th><th>Quando</th></tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id}>
              <td>{ROTULO[e.acao] ?? e.acao}</td>
              <td className="gestao-tabela-alvo">{e.alvo ?? "—"}</td>
              <td>{new Date(e.criado_em).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
