import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import { mensagemDeErro } from "../../util/erros";
import type { ProvedorIA, TurnoSessao } from "../../tipos/dominio";
import type { ModeloIA } from "../../api/cliente";
import type { OpcaoModeloIA } from "../../api/cliente";
import { atualizarConfig } from "../../api/cliente";
import { IconeAlerta, IconeRaio, IconeSeta } from "../comum/Icones";
import { Markdown } from "../comum/Markdown";
import { Botao } from "../comum/Botao";

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
        // escopo "projeto": a conversa roda na raiz da instalacao, a mesma
        // pasta que a arvore ao lado mostra. Sem isto a IDE listaria o projeto
        // e a IA responderia sobre a pasta do workspace, que e pior que nao ter
        // IDE nenhuma: a resposta parece certa e fala de outro lugar.
        await criarSessao({
          titulo: TITULO_IDE,
          prompt: texto,
          permissao,
          modelo,
          escopo: "projeto",
        });
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
        {sessao && modeloDaSessao && (
          <span className="selo" title="Modelo travado nesta sessão">
            {modeloDaSessao}
          </span>
        )}
        {sessao && permissaoSessao && (
          <span
            className={permissaoSessao === "total" ? "selo selo-alerta" : "selo"}
            title="Permissão travada nesta sessão"
          >
            {permissaoSessao === "total" ? "Poder total" : "Seguro"}
          </span>
        )}
        <div className="ide-controle" ref={refControle}>
          {/* Com sessão aberta os dois selos ao lado já dizem o modelo e a
              permissão que VALEM. O botão vira só o ícone para não repetir a
              mesma informação em 340px de coluna. Sem sessão ele escreve a
              escolha por extenso, porque ali ela ainda é uma decisão. */}
          <Botao
            variante="neutro"
            tamanho="p"
            soIcone={!semSessao}
            className="ide-controle-botao"
            onClick={() => setControleAberto((aberto) => !aberto)}
            aria-haspopup="dialog"
            aria-expanded={controleAberto}
            aria-label="Motor, modelo e permissão"
            title="Motor, modelo e permissão"
          >
            <IconeControles />
            {semSessao && (
              <span>
                {modeloEscolhido}, {permissao === "total" ? "Poder total" : "Seguro"}
              </span>
            )}
          </Botao>
          {controleAberto && (
            <div
              className="popover ide-controle-popover"
              role="dialog"
              aria-label="Configuração da IA"
            >
              <fieldset className="ide-controle-grupo">
                <legend className="rotulo">Motor</legend>
                <div className="opcoes">
                  {provedores.map((provedor) => {
                    const disponivel = ambiente?.[provedor.id]?.instalado === true;
                    return (
                      <label className="opcao" key={provedor.id}>
                        <input
                          type="radio"
                          name="ide-motor"
                          checked={ativo === provedor.id}
                          disabled={!disponivel || salvandoControle}
                          onChange={() => void escolherMotor(provedor.id)}
                        />
                        <span className="opcao-titulo">
                          {provedor.id === "codex" ? "Codex" : "Claude"}
                        </span>
                        <span className="opcao-descricao">
                          {disponivel ? "Disponível" : "Não instalado"}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="dica">Vale para sessões novas no app inteiro.</p>
              </fieldset>

              <fieldset className="ide-controle-grupo">
                <legend className="rotulo">Modelo</legend>
                <div className="opcoes uma">
                  {modelos.map((opcao) => (
                    <label className="opcao" key={opcao.alias}>
                      <input
                        type="radio"
                        name="ide-modelo"
                        checked={modelo === opcao.alias}
                        disabled={salvandoControle}
                        onChange={() => void escolherModelo(opcao.alias)}
                      />
                      <span className="opcao-titulo">{opcao.rotulo}</span>
                      <span className="opcao-descricao">{opcao.observacaoCusto}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ide-controle-grupo">
                <legend className="rotulo">Permissão</legend>
                <div className="opcoes">
                  <label className="opcao">
                    <input
                      type="radio"
                      name="ide-permissao"
                      checked={permissao === "padrao"}
                      onChange={() => setPermissao("padrao")}
                    />
                    <span className="opcao-titulo">Seguro</span>
                    <span className="opcao-descricao">Edita a pasta com limites.</span>
                  </label>
                  <label className="opcao">
                    <input
                      type="radio"
                      name="ide-permissao"
                      checked={permissao === "total"}
                      onChange={() => setPermissao("total")}
                    />
                    <span className="opcao-titulo">Poder total</span>
                    <span className="opcao-descricao">Executa sem confirmação.</span>
                  </label>
                </div>
              </fieldset>

              <Botao
                variante="neutro"
                className="ide-controle-aplicar"
                onClick={sessao ? aplicarNovaSessao : () => setControleAberto(false)}
                disabled={salvandoControle}
                aria-busy={salvandoControle}
              >
                {sessao ? "Aplicar numa conversa nova" : "Aplicar"}
              </Botao>
            </div>
          )}
        </div>
      </header>

      <div className="ide-chat-conversa" ref={refConversa}>
        {semSessao ? (
          <div className="vazio ide-chat-intro">
            <IconeRaio className="" />
            <h2>Converse com a IA</h2>
            <p>
              O motor {ativo === "codex" ? "Codex" : "Claude"} enxerga o projeto
              inteiro, os mesmos arquivos da árvore ao lado, e pode editá-los.
            </p>
            <div className="ide-chat-selos">
              <span className="selo">{ativo === "codex" ? "Codex" : "Claude"}</span>
              <span className="selo">{modeloEscolhido}</span>
              <span className={permissao === "total" ? "selo selo-alerta" : "selo"}>
                {permissao === "total" ? "Poder total" : "Seguro"}
              </span>
            </div>
            <p className="dica">
              Ajuste no controle acima e mande a primeira mensagem para abrir a
              sessão.
            </p>
          </div>
        ) : (
          <>
            {turnos.map((t, i) =>
              t.interno ? (
                // Turno interno do Hub (retomada automatica do laco): fala de
                // maquina, mostrada so como nota discreta na transcricao (M9).
                <div key={i} className="ide-turno-interno">
                  Correção automática do Hub
                </div>
              ) : t.papel === "assistente" ? (
                <div key={i} className="ide-turno-ia">
                  <Markdown texto={t.texto} />
                </div>
              ) : (
                <div key={i} className="ide-turno-usuario">
                  {t.texto}
                </div>
              ),
            )}
            {pendentes.map((t, i) => (
              <div key={`p${i}`} className="ide-turno-usuario pendente">
                {t.texto}
              </div>
            ))}
            {ferramentasVivas.map((f, i) => (
              <div key={`f${i}`} className="ide-ferramenta">
                <IconeEngrenagem />
                <span className="ide-ferramenta-nome">{f.nome}</span>
                {f.alvo && <span className="ide-ferramenta-alvo">{f.alvo}</span>}
              </div>
            ))}
            {respostaViva && (
              <div className="ide-turno-ia">
                <Markdown texto={respostaViva} />
              </div>
            )}
            {rodando && !respostaViva && ferramentasVivas.length === 0 && (
              <p className="ide-trabalhando" role="status">
                <span className="ponto-vivo" />
                A IA está trabalhando
              </p>
            )}
          </>
        )}
      </div>

      {erro && (
        <div className="faixa faixa-alerta ide-chat-erro" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erro}</div>
        </div>
      )}

      <div className="ide-chat-envio">
        <textarea
          ref={refCampo}
          className="campo ide-chat-campo"
          aria-label="Mensagem para a IA"
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
        <Botao
          variante="principal"
          soIcone
          className="ide-chat-enviar"
          onClick={() => void enviar()}
          disabled={rodando || enviando || !mensagem.trim() || !modelo}
          title="Enviar"
          aria-label="Enviar mensagem"
        >
          <IconeSeta className="" />
        </Botao>
      </div>
    </div>
  );
}
