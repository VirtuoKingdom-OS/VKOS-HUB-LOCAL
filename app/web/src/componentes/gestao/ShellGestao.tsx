import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { lazyRecarregavel } from "../../util/carregarModulo";
import type { SessaoWeb } from "../../api/cliente";
import {
  listarFeaturesAdmin,
  listarModelosAdmin,
  listarWorkspacesAdmin,
  obterEstadoMotoresAdmin,
  type EstadoMotoresAdmin,
  type FeaturePlataforma,
  type ModeloWorkspace,
  type WorkspacePlataforma,
} from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { EVENTO_NAVEGACAO } from "../layout/rotas";
import { BotaoTema } from "../layout/Sidebar";
import { Marca } from "../comum/Telas";
import { Aviso } from "../comum/Sistema";
import {
  PainelMeuClaude,
  PainelSeguranca,
} from "../admin/TelaAdmin";
import { AreaWorkspace } from "../admin/AreaWorkspace";
import { AREAS, caminhoDaArea, lerArea, type Area, type AreaSistema } from "./rotasGestao";
import { PainelOperacao } from "./PainelOperacao";
import { Estudio } from "./Estudio";
import { AreaIde } from "./AreaIde";
import { PainelAuditoria } from "./PainelAuditoria";
import { BancoVisual } from "./BancoVisual";
import "../../estilos/admin.css";
import "../../estilos/gestao.css";

const TelaMapa = lazyRecarregavel(() =>
  import("../mapa/TelaMapa").then((m) => ({ default: m.TelaMapa })),
);
const TelaConexoes = lazyRecarregavel(() =>
  import("../conexoes").then((m) => ({ default: m.TelaConexoes })),
);

const SUB_SISTEMA: { id: AreaSistema; nome: string }[] = [
  { id: "meu-claude", nome: "Meu Claude" },
  { id: "conexoes", nome: "Conexões" },
  { id: "seguranca", nome: "Segurança" },
  { id: "auditoria", nome: "Auditoria" },
  { id: "mapa", nome: "Mapa do sistema" },
];

export function ShellGestao({ sessao }: { sessao: SessaoWeb }) {
  const { trocarWorkspace } = usarEstado();
  const [rota, setRota] = useState(() => lerArea(window.location.pathname));
  const [mapaDisponivel, setMapaDisponivel] = useState(false);

  // Estado compartilhado dos paineis de gestao (o que a antiga TelaAdmin tinha).
  const [features, setFeatures] = useState<FeaturePlataforma[]>([]);
  const [modelos, setModelos] = useState<ModeloWorkspace[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspacePlataforma[]>([]);
  const [motores, setMotores] = useState<EstadoMotoresAdmin | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [focoWorkspace, setFocoWorkspace] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [catalogo, receitas, clientes, estadoMotores] = await Promise.all([
        listarFeaturesAdmin(),
        listarModelosAdmin(),
        listarWorkspacesAdmin(),
        obterEstadoMotoresAdmin().catch(() => null),
      ]);
      setFeatures(catalogo.features.filter((f) => f.disponivelParaCliente));
      setModelos(receitas.modelos);
      setWorkspaces(clientes.workspaces);
      setMotores(estadoMotores);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao carregar a operação.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void recarregar(); }, [recarregar]);

  useEffect(() => {
    const aoNavegar = () => setRota(lerArea(window.location.pathname));
    window.addEventListener("popstate", aoNavegar);
    window.addEventListener(EVENTO_NAVEGACAO, aoNavegar);
    return () => {
      window.removeEventListener("popstate", aoNavegar);
      window.removeEventListener(EVENTO_NAVEGACAO, aoNavegar);
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/mapa", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((r: { disponivel?: boolean } | null) => vivo && setMapaDisponivel(r?.disponivel === true))
      .catch(() => vivo && setMapaDisponivel(false));
    return () => { vivo = false; };
  }, []);

  const ir = useCallback((area: Area, sub?: AreaSistema) => {
    setErro("");
    setAviso("");
    const caminho = caminhoDaArea(area, sub);
    if (window.location.pathname !== caminho) {
      history.pushState(null, "", caminho);
      window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
    }
    setRota(lerArea(caminho));
  }, []);

  const executar = useCallback(async (acao: () => Promise<unknown>, mensagem: string) => {
    setErro("");
    setAviso("");
    try {
      await acao();
      setAviso(mensagem);
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "A operação falhou.");
    }
  }, [recarregar]);

  const entrarWorkspace = useCallback(async (id: string) => {
    try {
      await trocarWorkspace(id);
    } catch {
      // Em workspace de cliente (fora do registro local) a troca pode nao
      // se aplicar no CORE dev; a navegacao segue e o Shell resolve o estado.
    }
    history.pushState(null, "", `/w/${encodeURIComponent(id)}`);
    window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
  }, [trocarWorkspace]);

  const irParaWorkspace = useCallback(
    (destino: "workspace" | "workspace:planos" | "sistema:meu-claude", workspaceId?: string) => {
      if (destino === "sistema:meu-claude") { ir("sistema", "meu-claude"); return; }
      setFocoWorkspace(destino === "workspace:planos" ? "planos" : (workspaceId ?? null));
      ir("workspace");
    },
    [ir],
  );

  const cabecalho = useMemo(() => {
    switch (rota.area) {
      case "painel": return { titulo: "Painel", sub: "Como está a operação agora." };
      case "workspace": return { titulo: "Workspace", sub: "Crie, configure e libere acesso aos workspaces." };
      case "estudio": return { titulo: "Estúdio", sub: "Seus workspaces de trabalho." };
      case "banco-visual": return { titulo: "Banco visual", sub: "Modelos compartilhados para carrosséis." };
      case "ide": return { titulo: "VKOS-IDE", sub: "Todos os arquivos do sistema, com a IA do CORE." };
      case "sistema": return { titulo: "Sistema", sub: "Claude, conexões, segurança, auditoria e mapa." };
    }
  }, [rota.area]);

  return (
    <div className="gestao-shell">
      <aside className="gestao-sidebar">
        <div className="gestao-marca">
          <Marca />
          <BotaoTema />
        </div>
        <nav className="gestao-nav" aria-label="Áreas do CORE">
          {AREAS.map((a) => (
            <button
              key={a.id}
              className={`gestao-item${rota.area === a.id ? " ativo" : ""}`}
              aria-current={rota.area === a.id ? "page" : undefined}
              onClick={() => ir(a.id)}
            >
              {a.nome}
            </button>
          ))}
        </nav>
        <div className="gestao-rodape">
          <span className="gestao-rodape-marca">VKOS HUB CORE</span>
          <span className="gestao-rodape-conta">{sessao.usuario.email}</span>
        </div>
      </aside>

      <main className="gestao-conteudo">
        <header className="gestao-cabeca">
          <div>
            <span className="gestao-eyebrow">VKOS HUB CORE</span>
            <h1>{cabecalho.titulo}</h1>
            <p>{cabecalho.sub}</p>
          </div>
        </header>

        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}

        {rota.area === "painel" && (
          <PainelOperacao workspaces={workspaces} modelos={modelos.length} motores={motores} aoIr={irParaWorkspace} />
        )}
        {rota.area === "workspace" && (
          <AreaWorkspace
            modelos={modelos}
            workspaces={workspaces}
            features={features}
            motores={motores}
            carregando={carregando}
            aoExecutar={executar}
            aoAvisar={setAviso}
            aoLimparMensagens={() => { setErro(""); setAviso(""); }}
            aoEntrarWorkspace={entrarWorkspace}
            focoInicial={focoWorkspace}
            aoConsumirFoco={() => setFocoWorkspace(null)}
          />
        )}
        {rota.area === "estudio" && <Estudio aoEntrar={(id) => void entrarWorkspace(id)} />}
        {rota.area === "banco-visual" && <BancoVisual />}
        {rota.area === "ide" && <AreaIde />}
        {rota.area === "sistema" && (
          <div className="gestao-sistema">
            <nav className="gestao-subnav" aria-label="Áreas do sistema">
              {SUB_SISTEMA.filter((s) => s.id !== "mapa" || mapaDisponivel).map((s) => (
                <button
                  key={s.id}
                  className={`gestao-subitem${rota.sub === s.id ? " ativo" : ""}`}
                  aria-current={rota.sub === s.id ? "page" : undefined}
                  onClick={() => ir("sistema", s.id)}
                >
                  {s.nome}
                </button>
              ))}
            </nav>
            <div className="gestao-sistema-corpo">
              {rota.sub === "meu-claude" && <PainelMeuClaude aoErro={setErro} aoAvisar={setAviso} />}
              {rota.sub === "conexoes" && (
                <div className="gestao-quadro">
                  <Suspense fallback={<div className="gestao-vazio-linha">Abrindo as conexões…</div>}>
                    <TelaConexoes />
                  </Suspense>
                </div>
              )}
              {rota.sub === "seguranca" && <PainelSeguranca aoErro={setErro} aoAvisar={setAviso} />}
              {rota.sub === "auditoria" && <PainelAuditoria />}
              {rota.sub === "mapa" && mapaDisponivel && (
                <div className="gestao-quadro">
                  <Suspense fallback={<div className="gestao-vazio-linha">Abrindo o mapa…</div>}>
                    <TelaMapa />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
