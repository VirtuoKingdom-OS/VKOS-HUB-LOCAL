import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import { mensagemDeErro } from "../../util/erros";
import type { ProvedorIA, TurnoSessao } from "../../tipos/dominio";
import type { ModeloIA } from "../../api/cliente";
import type { OpcaoModeloIA } from "../../api/cliente";
import { atualizarConfig } from "../../api/cliente";
import { IconeRaio, IconeSeta } from "../comum/Icones";
import { Markdown } from "../comum/Markdown";

// Titulo fixo da sessao da IDE: e por ele que reencontramos a conversa em
// andamento ao reabrir a tela (a sessao vive no backend).
const TITULO_IDE = "Sessão da IDE";

type Permissao = "padrao" | "total";

// Nome amigavel a partir do id real que o backend grava na sessao
// (ex: "claude-opus-4-8" vira "Opus").
function nomeDoModelo(id: string | undefined, modelos: OpcaoModeloIA[]): string | null {
  if (!id) return null;
  const cadastrado = modelos.find((modelo) => modelo.alias === id);
  if (cadastrado) return cadastrado.rotulo;
  const baixo = id.toLowerCase();
  if (baixo.includes("opus")) return "Opus";
  if (baixo.includes("sonnet")) return "Sonnet";
  if (baixo.includes("haiku")) return "Haiku";
  return id;
}

// Engrenagem inline pras linhas de ferramenta. Local, sem dependencia.
function IconeEngrenagem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5" />
    </svg>
  );
}

function IconeControles() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h8M16 18h4" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="14" cy="18" r="2" />
    </svg>
  );
}

// Painel de chat da IDE. Conversa no padrao do app (transcricao + stream ao
// vivo), com as ferramentas ao vivo viradas em linhas discretas. Seletor de
// permissao visivel antes de criar a sessao.
export function ChatIde() {
  const {
    sessoes,
    streams,
    criarSessao,
    enviarMensagem,
    obterTranscricao,
  } = usarEstado();
  const { ambiente } = usarEstado();
  const { ativo, provedores, modelos, modeloPadrao, recarregar } = usarProvedoresIA();

  const [permissao, setPermissao] = useState<Permissao>("padrao");
  // Modelo da proxima sessao. Nasce no padrao configurado do app e trava na
  // sessao ao criar (o CLI nao troca de modelo no meio de uma conversa).
  const [modelo, setModelo] = useState<ModeloIA>(modeloPadrao);
  // Forca a tela de nova sessao mesmo havendo uma antiga (troca de permissao).
  const [forcarNova, setForcarNova] = useState(false);
  const [turnos, setTurnos] = useState<TurnoSessao[]>([]);
  const [pendentes, setPendentes] = useState<TurnoSessao[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [controleAberto, setControleAberto] = useState(false);
  const [salvandoControle, setSalvandoControle] = useState(false);

  const refConversa = useRef<HTMLDivElement>(null);
  const refCampo = useRef<HTMLTextAreaElement>(null);
  const refControle = useRef<HTMLDivElement>(null);
  // Tamanho ja consumido por turnos finalizados. O que passa disso e a resposta
  // em andamento (mesmo padrao do no de sessao e da cerimonia).
  const baseStream = useRef(0);
  // Ferramentas ja consumidas por turnos finalizados. So mostramos as do turno
  // atual, ao vivo (contrato: "ferramentas ao vivo").
  const baseFerramentas = useRef(0);
  const idCarregado = useRef<string | null>(null);
  const statusAnterior = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((m) => m.alias === modelo)) return;
    setModelo(modeloPadrao || modelos[0].alias);
  }, [modelos, modeloPadrao, modelo]);

  useEffect(() => {
    if (!controleAberto) return;
    const aoClicar = (evento: MouseEvent) => {
      if (!refControle.current?.contains(evento.target as Node)) {
        setControleAberto(false);
      }
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setControleAberto(false);
    };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [controleAberto]);

  // A sessao da IDE: a mais recente com o titulo fixo.
  const sessaoExistente = useMemo(() => {
    const minhas = sessoes.filter((s) => s.titulo === TITULO_IDE);
    return minhas.length > 0 ? minhas[minhas.length - 1] : undefined;
  }, [sessoes]);

  const sessao = forcarNova ? undefined : sessaoExistente;
  const rodando =
    sessao?.status === "iniciando" ||
    sessao?.status === "rodando" ||
    sessao?.status === "fila";
  const stream = sessao ? streams[sessao.id] : undefined;
  // A permissao fica travada na sessao. O backend a devolve, mas o tipo Sessao
  // (dominio.ts, intocavel nesta rodada) nao a declara: lemos com cast.
  const permissaoSessao = sessao
    ? (sessao as unknown as { permissao?: Permissao }).permissao ?? null
    : null;

  // Carrega a transcricao ao reencontrar a sessao e recarrega quando um turno
  // termina (pra pegar a resposta final e limpar os otimistas).
  useEffect(() => {
    if (!sessao) {
      idCarregado.current = null;
      return;
    }
    const primeiraVez = idCarregado.current !== sessao.id;
    const terminouAgora =
      statusAnterior.current !== sessao.status &&
      !rodando &&
      statusAnterior.current;
    statusAnterior.current = sessao.status;
    if (!primeiraVez && !terminouAgora) return;
    idCarregado.current = sessao.id;
    let vivo = true;
    (async () => {
      try {
        const t = await obterTranscricao(sessao.id);
        if (!vivo) return;
        setTurnos(t);
        setPendentes([]);
        baseStream.current = streams[sessao.id]?.texto.length ?? 0;
        baseFerramentas.current = streams[sessao.id]?.ferramentas?.length ?? 0;
      } catch {
        // sem transcricao ainda, segue com o stream
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.id, sessao?.status]);

  // Resposta ao vivo: o que veio alem dos turnos ja finalizados.
  const respostaViva = stream ? stream.texto.slice(baseStream.current) : "";
  const ferramentasVivas = stream?.ferramentas
    ? stream.ferramentas.slice(baseFerramentas.current)
    : [];

  // Rola pro fim a cada novidade.
  useEffect(() => {
    const el = refConversa.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turnos, pendentes, respostaViva, ferramentasVivas.length]);

  const enviar = useCallback(async () => {
    const texto = mensagem.trim();
    if (!texto || rodando || enviando) return;
    setEnviando(true);
    setErro(null);
    setMensagem("");
    setPendentes((p) => [
      ...p,
      { papel: "usuario", texto, em: new Date().toISOString() },
    ]);
    try {
      if (!sessao) {
        setTurnos([]);
        await criarSessao({ titulo: TITULO_IDE, prompt: texto, permissao, modelo });
        setForcarNova(false);
      } else {
        await enviarMensagem(sessao.id, texto);
      }
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
      refCampo.current?.focus();
    }
  }, [
    mensagem,
    rodando,
    enviando,
    sessao,
    permissao,
    modelo,
    criarSessao,
    enviarMensagem,
  ]);

  const aplicarNovaSessao = () => {
    setForcarNova(true);
    setTurnos([]);
    setPendentes([]);
    setErro(null);
    setControleAberto(false);
  };

  async function escolherMotor(provedor: ProvedorIA) {
    if (provedor === ativo || salvandoControle) return;
    const deteccao = ambiente?.[provedor];
    if (!deteccao?.instalado) return;
    setSalvandoControle(true);
    setErro(null);
    try {
      await atualizarConfig({ provedorPadrao: provedor });
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvandoControle(false);
    }
  }

  async function escolherModelo(alias: string) {
    if (!alias || alias === modelo || salvandoControle) return;
    setModelo(alias);
    setSalvandoControle(true);
    setErro(null);
    try {
      await atualizarConfig(
        ativo === "codex"
          ? { modeloPadraoCodex: alias }
          : { modeloPadraoClaude: alias }
      );
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvandoControle(false);
    }
  }

  const semSessao = !sessao;
  const modeloDaSessao = nomeDoModelo(sessao?.modelo, modelos);
  const modeloEscolhido = nomeDoModelo(modelo, modelos) ?? "Modelo";

  return (
    <div className="ide-chat">
      <header className="ide-chat-topo">
        <span className="ide-chat-titulo">Conversa</span>
        {sessao && (
          <>
            {modeloDaSessao && (
              <span className="ide-chat-selo" title="Modelo travado nesta sessão">
                {modeloDaSessao}
              </span>
            )}
            {permissaoSessao && (
              <span
                className={`ide-chat-selo${
                  permissaoSessao === "total" ? " perigo" : ""
                }`}
                title="Permissão travada nesta sessão"
              >
                {permissaoSessao === "total" ? "Poder total" : "Seguro"}
              </span>
            )}
          </>
        )}
        <div className="ide-controle-wrap" ref={refControle}>
          <button
            className={`ide-controle-botao${controleAberto ? " ativo" : ""}`}
            onClick={() => setControleAberto((aberto) => !aberto)}
            aria-haspopup="menu"
            aria-expanded={controleAberto}
            title="Motor, modelo e permissão"
          >
            <IconeControles />
            <span>{modeloEscolhido}, {permissao === "total" ? "Poder total" : "Seguro"}</span>
          </button>
          {controleAberto && (
            <div className="ide-controle-popover" role="menu" aria-label="Configuração da IA">
              <GrupoControle titulo="Motor">
                <div className="ide-controle-opcoes duas">
                  {provedores.map((provedor) => {
                    const disponivel = ambiente?.[provedor.id]?.instalado === true;
                    return (
                      <button
                        key={provedor.id}
                        className={`ide-controle-opcao${ativo === provedor.id ? " ativa" : ""}`}
                        onClick={() => void escolherMotor(provedor.id)}
                        disabled={!disponivel || salvandoControle}
                      >
                        <strong>{provedor.id === "codex" ? "Codex" : "Claude"}</strong>
                        <span>{disponivel ? "disponível" : "não instalado"}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="ide-controle-nota">Vale pra sessões novas no app inteiro.</p>
              </GrupoControle>

              <GrupoControle titulo="Modelo">
                <div className="ide-controle-opcoes">
                  {modelos.map((opcao) => (
                    <button
                      key={opcao.alias}
                      className={`ide-controle-opcao${modelo === opcao.alias ? " ativa" : ""}`}
                      onClick={() => void escolherModelo(opcao.alias)}
                      disabled={salvandoControle}
                    >
                      <strong>{opcao.rotulo}</strong>
                      <span>{opcao.observacaoCusto}</span>
                    </button>
                  ))}
                </div>
              </GrupoControle>

              <GrupoControle titulo="Permissão">
                <div className="ide-controle-opcoes duas">
                  <button
                    className={`ide-controle-opcao${permissao === "padrao" ? " ativa" : ""}`}
                    onClick={() => setPermissao("padrao")}
                  >
                    <strong>Seguro</strong>
                    <span>Edita a pasta com limites.</span>
                  </button>
                  <button
                    className={`ide-controle-opcao perigo${permissao === "total" ? " ativa" : ""}`}
                    onClick={() => setPermissao("total")}
                  >
                    <strong>Poder total</strong>
                    <span>Executa sem confirmação.</span>
                  </button>
                </div>
              </GrupoControle>

              <button
                className="botao botao-principal ide-controle-aplicar"
                onClick={sessao ? aplicarNovaSessao : () => setControleAberto(false)}
                disabled={salvandoControle}
              >
                {sessao ? "Aplicar numa conversa nova" : "Aplicar"}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="ide-chat-conversa" ref={refConversa}>
        {semSessao ? (
          <div className="ide-chat-intro">
            <div className="ide-chat-intro-selo">
              <IconeRaio className="" />
            </div>
            <h3>Converse com a IA</h3>
            <p>
              O motor {ativo === "codex" ? "Codex" : "Claude"} lê o mesmo Cérebro deste workspace e pode editar os arquivos da
              pasta.
            </p>
            <div className="ide-chat-escolhas">
              <span>{ativo === "codex" ? "Codex" : "Claude"}</span>
              <span>{modeloEscolhido}</span>
              <span className={permissao === "total" ? "perigo" : ""}>
                {permissao === "total" ? "Poder total" : "Seguro"}
              </span>
            </div>
            <span className="ide-chat-dica">
              Ajuste no controle acima e mande a primeira mensagem pra abrir a sessão.
            </span>
          </div>
        ) : (
          <>
            {turnos.map((t, i) =>
              t.interno ? (
                // Turno interno do Hub (retomada automatica do laco): fala de
                // maquina, mostrada so como nota discreta na transcricao (M9).
                <div
                  key={i}
                  className="ide-turno-interno"
                  style={{ opacity: 0.6, fontSize: "0.85em", textAlign: "center", padding: "4px 0" }}
                >
                  Correção automática do Hub
                </div>
              ) : (
                <div key={i} className={`ide-turno ${t.papel}`}>
                  {t.papel === "assistente" ? <Markdown texto={t.texto} /> : t.texto}
                </div>
              ),
            )}
            {pendentes.map((t, i) => (
              <div key={`p${i}`} className="ide-turno usuario pendente">
                {t.texto}
              </div>
            ))}
            {ferramentasVivas.map((f, i) => (
              <div key={`f${i}`} className="ide-ferramenta">
                <IconeEngrenagem className="ide-ferramenta-icone" />
                <span className="ide-ferramenta-nome">{f.nome}</span>
                {f.alvo && <span className="ide-ferramenta-alvo">{f.alvo}</span>}
              </div>
            ))}
            {respostaViva && (
              <div className="ide-turno assistente">
                <Markdown texto={respostaViva} />
              </div>
            )}
            {rodando && !respostaViva && ferramentasVivas.length === 0 && (
              <div className="ide-digitando">
                <span />
                <span />
                <span />
              </div>
            )}
          </>
        )}
      </div>

      {erro && <div className="ide-chat-erro">{erro}</div>}

      <div className="ide-chat-envio">
        <textarea
          ref={refCampo}
          className="ide-chat-campo"
          value={mensagem}
          placeholder={rodando ? "A IA está trabalhando..." : "Escreva uma mensagem"}
          disabled={rodando || enviando}
          rows={2}
          onChange={(e) => setMensagem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
        />
        <button
          className="botao botao-principal ide-chat-enviar"
          onClick={() => void enviar()}
          disabled={rodando || enviando || !mensagem.trim() || !modelo}
          title="Enviar"
        >
          <IconeSeta className="" />
        </button>
      </div>
    </div>
  );
}

function GrupoControle({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ide-controle-grupo" role="group" aria-label={titulo}>
      <h4>{titulo}</h4>
      {children}
    </section>
  );
}
