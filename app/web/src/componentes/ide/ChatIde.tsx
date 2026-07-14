import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import type { TurnoSessao } from "../../tipos/dominio";
import type { ModeloIA } from "../../api/cliente";
import { IconeMais, IconeRaio, IconeSeta } from "../comum/Icones";
import { Markdown } from "../comum/Markdown";

// Titulo fixo da sessao da IDE: e por ele que reencontramos a conversa em
// andamento ao reabrir a tela (a sessao vive no backend).
const TITULO_IDE = "Sessão da IDE";

type Permissao = "padrao" | "total";

// Os mesmos rotulos honestos do composer do cockpit.
const MODELOS: { id: ModeloIA; rotulo: string; nota: string }[] = [
  { id: "opus", rotulo: "Opus", nota: "mais capaz, mais caro" },
  { id: "sonnet", rotulo: "Sonnet", nota: "equilíbrio" },
  { id: "haiku", rotulo: "Haiku", nota: "rápido e barato" },
];

// Nome amigavel a partir do id real que o backend grava na sessao
// (ex: "claude-opus-4-8" vira "Opus").
function nomeDoModelo(id?: string): string | null {
  if (!id) return null;
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
    modeloPadrao,
  } = usarEstado();

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

  const refConversa = useRef<HTMLDivElement>(null);
  const refCampo = useRef<HTMLTextAreaElement>(null);
  // Tamanho ja consumido por turnos finalizados. O que passa disso e a resposta
  // em andamento (mesmo padrao do no de sessao e da cerimonia).
  const baseStream = useRef(0);
  // Ferramentas ja consumidas por turnos finalizados. So mostramos as do turno
  // atual, ao vivo (contrato: "ferramentas ao vivo").
  const baseFerramentas = useRef(0);
  const idCarregado = useRef<string | null>(null);
  const statusAnterior = useRef<string | undefined>(undefined);

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

  const novaSessao = () => {
    setForcarNova(true);
    setTurnos([]);
    setPendentes([]);
    setErro(null);
  };

  const semSessao = !sessao;

  return (
    <div className="ide-chat">
      <header className="ide-chat-topo">
        <span className="ide-chat-titulo">Conversa</span>
        {sessao && (
          <>
            {nomeDoModelo(sessao.modelo) && (
              <span className="ide-chat-selo" title="Modelo travado nesta sessão">
                {nomeDoModelo(sessao.modelo)}
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
            <button
              className="ide-chat-nova"
              title="Nova sessão (escolher permissão de novo)"
              onClick={novaSessao}
            >
              <IconeMais className="" />
            </button>
          </>
        )}
      </header>

      <div className="ide-chat-conversa" ref={refConversa}>
        {semSessao ? (
          <div className="ide-chat-intro">
            <div className="ide-chat-intro-selo">
              <IconeRaio className="" />
            </div>
            <h3>Converse com o Claude</h3>
            <p>
              Ele lê o mesmo Cérebro deste cliente e pode editar os arquivos da
              pasta. Escolha o modelo e o nível de permissão antes de começar.
            </p>

            <div className="ide-modelo" role="group" aria-label="Modelo do Claude">
              {MODELOS.map((m) => (
                <button
                  key={m.id}
                  className={`ide-modelo-opcao${modelo === m.id ? " ativa" : ""}`}
                  onClick={() => setModelo(m.id)}
                  title={m.nota}
                >
                  <span className="ide-modelo-nome">{m.rotulo}</span>
                  <span className="ide-modelo-nota">{m.nota}</span>
                </button>
              ))}
            </div>

            <div className="ide-permissao">
              <button
                className={`ide-permissao-opcao${
                  permissao === "padrao" ? " ativa" : ""
                }`}
                onClick={() => setPermissao("padrao")}
              >
                <span className="ide-permissao-nome">Seguro</span>
                <span className="ide-permissao-desc">
                  O Claude edita arquivos, mas ações fora disso pedem cuidado.
                </span>
              </button>
              <button
                className={`ide-permissao-opcao perigo${
                  permissao === "total" ? " ativa" : ""
                }`}
                onClick={() => setPermissao("total")}
              >
                <span className="ide-permissao-nome">Poder total</span>
                <span className="ide-permissao-desc">
                  Sem freios: ele executa o que decidir, sem pedir confirmação.
                  Use com consciência.
                </span>
              </button>
            </div>
            <span className="ide-chat-dica">
              Mande a primeira mensagem pra abrir a sessão.
            </span>
          </div>
        ) : (
          <>
            {turnos.map((t, i) => (
              <div key={i} className={`ide-turno ${t.papel}`}>
                {t.papel === "assistente" ? <Markdown texto={t.texto} /> : t.texto}
              </div>
            ))}
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
          placeholder={rodando ? "O Claude está trabalhando..." : "Escreva uma mensagem"}
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
          disabled={rodando || enviando || !mensagem.trim()}
          title="Enviar"
        >
          <IconeSeta className="" />
        </button>
      </div>
    </div>
  );
}
