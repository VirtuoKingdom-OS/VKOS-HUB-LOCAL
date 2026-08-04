import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type WheelEvent,
} from "react";
import {
  Handle,
  Position,
  useReactFlow,
  useStore,
  type NodeProps,
} from "@xyflow/react";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import { enviarAnexo, type ModeloIA } from "../../api/cliente";
import {
  acharFluxo,
  instrucoesImagem,
  FORMATOS,
  PROPORCOES,
  type IdFormato,
  type IdProporcao,
  type Subopcao,
} from "../../config/fluxos";
import { INFO_STATUS } from "../../config/status";
import { mensagemDeErro } from "../../util/erros";
import { lerBase64 } from "../../util/arquivo";
import { montarPromptCompleto, type MaterialConectado } from "../../util/prompt";
import type { TipoCriacao } from "../../estado/geracao";
import { montarPromptCriacao, pastaUnica, type DadosCriacao } from "../criacao/prompt";
import {
  EtapasCriacao,
  criarDadosEtapas,
  dadosCriacaoDe,
  type DadosEtapas,
} from "../criacao/EtapasCriacao";
import { irParaTela } from "../layout/rotas";
import { usarCanvas } from "./canvasContexto";
import {
  IconeClipe,
  IconeFluxo,
  IconeLixeira,
  IconeParar,
  IconeRaio,
  IconeSeta,
  IconeX,
} from "../comum/Icones";
import { Markdown } from "../comum/Markdown";
import type { TurnoSessao } from "../../tipos/dominio";
import "./composer.css";

// Anexo inline do composer: nome do arquivo e caminho relativo devolvido pelo
// backend. Fica no dados do no pra sobreviver ao reload e a duplicacao.
interface AnexoComposer {
  nome: string;
  caminhoRelativo: string;
}

// Tipos de arquivo aceitos no anexo inline (imagem + os textuais/documentos).
const ACEITA_ANEXO = ".md,.txt,.pdf,.csv,.json,.svg,image/*";

// Dados que o no de sessao carrega. Leve e serializavel: o rascunho do composer
// mora aqui pra sobreviver ao reload e poder ser duplicado.
export interface DadosSessao extends Record<string, unknown> {
  idFluxo: string;
  titulo?: string;
  tema?: string;
  detalhes?: string;
  idSub?: string;
  idSessao?: string;
  // Alias de modelo escolhido no composer. As opcoes vem do provedor ativo.
  modelo?: ModeloIA;
  // Modelo de carrossel escolhido (id). Vazio = deixar a IA escolher.
  modeloCarrossel?: string;
  // Composer de imagem: formato (varias paginas ou pagina unica) e proporcao.
  // Vazio = usa o preset do fluxo.
  formato?: IdFormato;
  proporcao?: IdProporcao;
  // Anexos inline ja subidos pro backend, mostrados como chips no composer.
  anexos?: AnexoComposer[];
  // Rascunho das etapas de criacao (fluxos de imagem). Serializavel, sobrevive
  // ao reload e a duplicacao, igual ao resto do rascunho do composer.
  etapas?: DadosEtapas;
  // Ligado pelo menu Renomear pra abrir o campo de edicao do titulo.
  editando?: boolean;
}

// Formata contagem de tokens com sufixo k pra caber no rodape.
function fmtK(n?: number): string {
  if (typeof n !== "number" || !isFinite(n)) return "0";
  if (Math.abs(n) < 1000) return String(n);
  const v = n / 1000;
  const texto = v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "");
  return `${texto}k`;
}

function NoSessaoInterno({ id, data }: NodeProps) {
  const dados = data as unknown as DadosSessao;
  const fluxo = acharFluxo(dados.idFluxo);
  const { setNodes, setEdges } = useReactFlow();
  const { criarContextoConectado } = usarCanvas();
  const {
    pecas,
    sessoes,
    streams,
    contextos,
    modeloPadrao,
    modelosCarrossel,
    criarSessao,
    pararSessao,
    enviarMensagem,
    obterTranscricao,
    excluirSessao,
  } = usarEstado();
  const { modelos, modeloPadrao: modeloPadraoProvedor } = usarProvedoresIA();

  // Fontes conectadas a esta sessao: os ids dos nos de contexto (ctx-<id>)
  // que apontam pra ca. O seletor devolve uma string estavel, entao arrastar
  // qualquer no do canvas nao re-renderiza as sessoes. Assinar a lista inteira
  // de nos (useNodes) fazia cada sessao re-renderizar a cada frame de arrasto.
  const chaveFontes = useStore((s) => {
    let chave = "";
    for (const e of s.edges) {
      if (e.target === id && e.source.startsWith("ctx-")) chave += e.source + "|";
    }
    return chave;
  });

  const primeira = fluxo?.subopcoes[0];
  const idSub = dados.idSub ?? primeira?.id ?? "";
  const tema = dados.tema ?? "";
  const detalhes = dados.detalhes ?? "";
  const idSessao = dados.idSessao ?? null;
  const editando = Boolean(dados.editando);
  const modeloConfigurado = dados.modelo ?? modeloPadraoProvedor ?? modeloPadrao;
  const modelo =
    modelos.length > 0 && !modelos.some((m) => m.alias === modeloConfigurado)
      ? modeloPadraoProvedor || modelos[0].alias
      : modeloConfigurado;
  const modeloCarrossel = dados.modeloCarrossel ?? "";

  // Composer de imagem: formato e proporcao caem no preset do fluxo quando o
  // usuario ainda nao escolheu. Anexos inline ja subidos.
  const preset = fluxo?.imagem;
  const formato: IdFormato = dados.formato ?? preset?.formato ?? "multiplas";
  const proporcao: IdProporcao = dados.proporcao ?? preset?.proporcao ?? "4x5";
  const anexos: AnexoComposer[] = dados.anexos ?? [];

  // Fluxos de imagem (carrossel e os ocultos post/stories) usam o mesmo fluxo de
  // etapas do wizard do dashboard, em layout compacto. O tipo sai do id do fluxo.
  const tipoCriacao: TipoCriacao =
    fluxo?.id === "post" ? "post" : fluxo?.id === "stories" ? "story" : "carrossel";
  const dadosEtapas: DadosEtapas = dados.etapas ?? criarDadosEtapas(modelo);

  const [nomeRascunho, setNomeRascunho] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [anexando, setAnexando] = useState(false);

  // Conversa: turnos finalizados vindos da transcricao + turnos otimistas do
  // usuario que ainda nao apareceram na transcricao.
  const [turnos, setTurnos] = useState<TurnoSessao[]>([]);
  const [pendentes, setPendentes] = useState<TurnoSessao[]>([]);

  const refConversa = useRef<HTMLDivElement>(null);
  const refAnexo = useRef<HTMLInputElement>(null);
  const autoScroll = useRef(true);
  const idCarregado = useRef<string | null>(null);

  // Tira de estilos do carrossel: rola na horizontal com a roda do mouse e
  // mostra fade nas bordas quando ha mais card fora da vista (esquerda e
  // direita conforme a posicao), pra deixar claro que da pra rolar.
  const refTira = useRef<HTMLDivElement>(null);
  const [fadeTira, setFadeTira] = useState({ esq: false, dir: false });
  const atualizarFadeTira = useCallback(() => {
    const el = refTira.current;
    if (!el) return;
    const esq = el.scrollLeft > 2;
    const dir = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setFadeTira((f) => (f.esq === esq && f.dir === dir ? f : { esq, dir }));
  }, []);
  const aoRolarTira = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      const el = refTira.current;
      if (!el) return;
      // Roda vertical do mouse vira rolagem horizontal na tira.
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
      }
      atualizarFadeTira();
    },
    [atualizarFadeTira]
  );
  // Recalcula o fade quando a lista de estilos muda (a tira pode passar a ter
  // conteudo alem da borda direita).
  useEffect(() => {
    atualizarFadeTira();
  }, [modelosCarrossel, atualizarFadeTira]);
  // Tamanho do texto do stream ja finalizado (pertence a turnos anteriores).
  // O que passa disso e a resposta em andamento.
  const baseStream = useRef(0);

  const patch = useCallback(
    (parcial: Partial<DadosSessao>) => {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...parcial } } : n
        )
      );
    },
    [id, setNodes]
  );

  // Reporta mudancas das etapas pro node data (patch), pra sobreviver a reload.
  const aoMudarEtapas = useCallback(
    (parcial: Partial<DadosEtapas>) =>
      patch({ etapas: { ...dadosEtapas, ...parcial } }),
    [patch, dadosEtapas]
  );

  // Fecha o composer ainda nao disparado: tira o no e as arestas dele do canvas.
  // O autosave do Cockpit persiste a remocao. Sem isso, um composer sem idSessao
  // ficaria pra sempre (a poda so remove sessao ja disparada e orfa).
  const fecharComposer = useCallback(() => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  // Remover o fluxo ja disparado: apaga a sessao no backend (conversa e custo
  // da sessao), tira o no do canvas, e NAO toca nas pecas geradas (elas vivem
  // em conteudo/, separadas). Confirmacao em dois cliques: botao de tamanho
  // fixo, balao flutuante, desarme por tempo (4s), nunca por mouseleave.
  const [confirmandoRemover, setConfirmandoRemover] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  useEffect(() => {
    if (!confirmandoRemover) return;
    const t = setTimeout(() => setConfirmandoRemover(false), 4000);
    return () => clearTimeout(t);
  }, [confirmandoRemover]);

  const removerFluxo = useCallback(async () => {
    if (removendo) return;
    if (!confirmandoRemover) {
      setConfirmandoRemover(true);
      return;
    }
    setRemovendo(true);
    if (idSessao) {
      try {
        await excluirSessao(idSessao);
      } catch {
        // segue removendo do canvas mesmo se o backend reclamar
      }
    }
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  }, [removendo, confirmandoRemover, idSessao, excluirSessao, id, setNodes, setEdges]);

  const sessao = idSessao ? sessoes.find((s) => s.id === idSessao) : undefined;
  const stream = idSessao ? streams[idSessao] : undefined;

  const status = sessao?.status;
  const info = status ? INFO_STATUS[status] : null;
  const rodando = status === "iniciando" || status === "rodando" || status === "fila";
  const deuErro = status === "erro";
  const terminou = status === "concluida" || status === "erro" || status === "parada";

  // Materiais: os contextos conectados a esta sessao. O id do no de contexto
  // codifica o id do contexto (ctx-<id>), entao a lista sai direto das arestas.
  const materiais = useMemo<MaterialConectado[]>(() => {
    const lista: MaterialConectado[] = [];
    for (const idFonte of chaveFontes.split("|")) {
      if (!idFonte) continue;
      const idContexto = idFonte.slice("ctx-".length);
      const contexto = contextos.find((c) => c.id === idContexto);
      if (contexto)
        lista.push({
          slug: contexto.slug,
          nome: contexto.nome,
          tipo: contexto.tipo,
        });
    }
    return lista;
  }, [chaveFontes, contextos]);

  // Carrega a transcricao na primeira vez que ve a sessao (ex: no restaurado
  // do canvas), e recarrega quando a sessao encerra pra pegar o turno final.
  useEffect(() => {
    if (!idSessao) return;
    const primeiraVez = idCarregado.current !== idSessao;
    if (!primeiraVez && !terminou) return;
    idCarregado.current = idSessao;
    let vivo = true;
    (async () => {
      try {
        const t = await obterTranscricao(idSessao);
        if (!vivo) return;
        setTurnos(t);
        // Remove os otimistas que ja apareceram na transcricao (dedupe por
        // papel + texto). O que ainda nao chegou fica, pra nao sumir da tela.
        setPendentes((p) =>
          p.filter(
            (pt) => !t.some((tt) => tt.papel === pt.papel && tt.texto === pt.texto)
          )
        );
        // Tudo que ja veio no stream pertence a turnos finalizados agora.
        baseStream.current = streams[idSessao]?.texto.length ?? 0;
      } catch {
        // sem transcricao ainda, segue com o que tiver
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSessao, status]);

  // Texto da resposta em andamento: o que passou do baseline do stream.
  const streamTexto = stream?.texto ?? "";
  const liveTexto = streamTexto.slice(baseStream.current);

  // Auto-scroll pro fim, respeitando o scroll manual do usuario.
  useEffect(() => {
    const el = refConversa.current;
    if (el && autoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [turnos, pendentes, liveTexto, rodando]);

  const aoRolar = () => {
    const el = refConversa.current;
    if (!el) return;
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 44;
    autoScroll.current = perto;
  };

  if (!fluxo || !primeira) {
    return (
      <div className="no-sessao">
        <div className="corpo">Fluxo desconhecido.</div>
      </div>
    );
  }

  // Fluxo que so nasce completo pelo assistente NAO dispara daqui.
  //
  // O compositor do canvas manda o comando cru da skill, sem pasta de destino.
  // Pro anuncio isso e um beco: o servidor recusa com 400, porque a pasta e o
  // diretorio de trabalho da sessao e quem cria ela e o Hub. Mesmo que passasse,
  // a skill gravaria o markdown padrao dela e a peca nasceria como "texto", sem
  // pagina nenhuma.
  //
  // A guarda mora AQUI, e nao so na criacao do no, porque no que ja esta salvo
  // no canvas.json continua sendo montado. Foi assim que o Jesse esbarrou nisso
  // em 2026-07-31: o no dele nasceu antes da porta ser fechada.
  if (fluxo.abreAssistente) {
    return (
      <div className="no-sessao">
        {/* OS DOIS HANDLES SAO OBRIGATORIOS, mesmo num no que nao dispara nada.
            Sem eles o React Flow nao tem onde prender a aresta que vem do
            Cerebro, e o no aparece solto no canvas, sem fio nenhum. Foi o que o
            Jesse viu em 2026-08-01: a primeira versao deste desvio saia antes
            de desenhar os Handles. */}
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} isConnectable={false} />

        <div className="cabeca">
          <IconeFluxo id={fluxo.id} className="" />
          <span className="tit">{fluxo.rotulo}</span>
          <button
            className="botao botao-p botao-icone botao-fantasma"
            onClick={fecharComposer}
            title="Tirar este nó do canvas"
            aria-label="Tirar este nó do canvas"
          >
            <IconeX className="" />
          </button>
        </div>

        <div className="corpo">
          <p className="no-sessao-desvio">
            {fluxo.rotulo} se cria pelo assistente, que pergunta o destino do
            clique e o orçamento por dia. O Cérebro não tem esses dois, e sem
            eles a campanha nasce chutada.
          </p>
          <button
            className="botao botao-principal"
            onClick={() => irParaTela(`criar:${fluxo.abreAssistente}`)}
          >
            <IconeRaio className="" />
            Abrir o assistente
          </button>
        </div>
      </div>
    );
  }

  const sub: Subopcao = fluxo.subopcoes.find((s) => s.id === idSub) ?? primeira;

  // Comando final. Nos fluxos de imagem, o estilo escolhido vira sufixo e as
  // instrucoes de formato/proporcao/subpasta entram como bloco logo abaixo.
  const comandoBase = sub.montarPrompt(tema.trim());
  const comandoComEstilo =
    fluxo.imagem && modeloCarrossel
      ? `${comandoBase}, usando o modelo ${modeloCarrossel}`
      : comandoBase;
  const comando = fluxo.imagem
    ? `${comandoComEstilo}\n\n${instrucoesImagem(formato, proporcao, fluxo.imagem.subpasta)}`
    : comandoComEstilo;

  // Bloco de anexos inline, no fim do prompt: um caminho por linha.
  const blocoAnexos =
    anexos.length > 0
      ? "\n\nMateriais anexados pelo usuário (leia conforme precisar):\n" +
        anexos.map((a) => a.caminhoRelativo).join("\n")
      : "";

  const promptFinal =
    montarPromptCompleto(comando, detalhes, materiais) + blocoAnexos;
  const previa = promptFinal;

  const tituloExibido = dados.titulo ?? sessao?.titulo ?? fluxo.rotulo;

  const salvarNome = () => {
    const limpo = nomeRascunho.trim();
    patch({ editando: false, ...(limpo ? { titulo: limpo } : {}) });
  };

  const disparar = async () => {
    if (!modelo) {
      setErroLocal("Aguarde a lista de modelos carregar.");
      return;
    }
    if (sub.precisaArgumento && !tema.trim()) {
      setErroLocal("Escreva o tema primeiro.");
      return;
    }
    setErroLocal(null);
    setDisparando(true);
    try {
      const tituloBase =
        dados.titulo ?? `${fluxo.rotulo}${tema.trim() ? ": " + tema.trim() : ""}`;
      const nova = await criarSessao({
        titulo: tituloBase,
        prompt: promptFinal,
        skill: sub.skill,
        modelo,
      });
      // Turno otimista do usuario: some quando a transcricao chega.
      autoScroll.current = true;
      baseStream.current = 0;
      setTurnos([]);
      setPendentes([
        { papel: "usuario", texto: promptFinal, em: new Date().toISOString() },
      ]);
      patch({ idSessao: nova.id });
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    } finally {
      setDisparando(false);
    }
  };

  // Monta o prompt de uma geracao pelas etapas: o /carrossel montado por
  // montarPromptCriacao (com detalhes, imagens e visual ja embutidos) mais o
  // bloco de materiais conectados e anexos inline DO NODE. Detalhes nao se
  // duplicam: ja entram por montarPromptCriacao.
  const construirPromptEtapas = (dc: DadosCriacao): { pasta: string; prompt: string } => {
    const pasta = pastaUnica(dc.tema.trim() || "carrossel", pecas);
    const base = montarPromptCriacao(dc, pasta);
    const extras: string[] = [];
    if (materiais.length > 0) {
      const linhas = materiais
        .map((m) => `- materiais/cockpit/${m.slug}/ (${m.nome}, tipo ${m.tipo})`)
        .join("\n");
      extras.push(
        "Materiais anexados pelo usuario nesta tarefa (leia o que for util antes de comecar):\n" +
          linhas
      );
    }
    if (anexos.length > 0) {
      extras.push(
        "Materiais anexados pelo usuário (leia conforme precisar):\n" +
          anexos.map((a) => a.caminhoRelativo).join("\n")
      );
    }
    return { pasta, prompt: [base, ...extras].join("\n\n") };
  };

  // Disparo pelas etapas compactas: mesmo caminho do disparo antigo (sessao +
  // turno otimista + patch), so muda a montagem do prompt.
  const dispararEtapas = async () => {
    const dc = dadosCriacaoDe(dadosEtapas, tipoCriacao);
    if (!dc.tema.trim()) {
      setErroLocal("Escreva o tema primeiro.");
      return;
    }
    if (!dadosEtapas.modelo) {
      setErroLocal("Aguarde a lista de modelos carregar.");
      return;
    }
    setErroLocal(null);
    setDisparando(true);
    try {
      const { prompt } = construirPromptEtapas(dc);
      const titulo = dados.titulo ?? `${fluxo.rotulo}: ${dc.tema.trim()}`;
      const nova = await criarSessao({
        titulo,
        prompt,
        skill: "carrossel",
        modelo: dadosEtapas.modelo,
      });
      autoScroll.current = true;
      baseStream.current = 0;
      setTurnos([]);
      setPendentes([
        { papel: "usuario", texto: prompt, em: new Date().toISOString() },
      ]);
      patch({ idSessao: nova.id });
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    } finally {
      setDisparando(false);
    }
  };

  const parar = async () => {
    if (!idSessao) return;
    try {
      await pararSessao(idSessao);
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    }
  };

  const podeEnviar =
    !!idSessao && !!sessao?.sessionIdClaude && !rodando && !enviando;

  const enviar = async () => {
    const texto = mensagem.trim();
    if (!idSessao || !texto || !podeEnviar) return;
    setEnviando(true);
    setErroLocal(null);
    // Turno do usuario aparece na hora.
    autoScroll.current = true;
    setPendentes((p) => [
      ...p,
      { papel: "usuario", texto, em: new Date().toISOString() },
    ]);
    setMensagem("");
    try {
      await enviarMensagem(idSessao, texto);
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  // Anexo rapido no composer: cria por baixo um no de contexto ja conectado.
  const anexar = async (arquivos: File[]) => {
    if (arquivos.length === 0) return;
    setAnexando(true);
    setErroLocal(null);
    try {
      const nome = `${fluxo.rotulo}${tema.trim() ? ": " + tema.trim() : ""}`;
      const soImagens = arquivos.every((a) => a.type.startsWith("image/"));
      const tipo = soImagens ? "imagens" : "texto";
      await criarContextoConectado(id, nome, arquivos, tipo);
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    } finally {
      setAnexando(false);
    }
  };

  // Anexo inline do botao Anexar: sobe cada arquivo pro backend (/api/anexos) e
  // guarda o caminho relativo como chip. Aceita imagem e os textuais/documentos.
  const anexarInline = async (arquivos: File[]) => {
    if (arquivos.length === 0) return;
    setAnexando(true);
    setErroLocal(null);
    try {
      const novos: AnexoComposer[] = [];
      for (const arquivo of arquivos) {
        const conteudoBase64 = await lerBase64(arquivo);
        const { caminhoRelativo } = await enviarAnexo({
          nome: arquivo.name,
          conteudoBase64,
        });
        novos.push({ nome: arquivo.name, caminhoRelativo });
      }
      patch({ anexos: [...anexos, ...novos] });
    } catch (e) {
      setErroLocal(mensagemDeErro(e));
    } finally {
      setAnexando(false);
    }
  };

  const removerAnexo = (caminho: string) => {
    patch({ anexos: anexos.filter((a) => a.caminhoRelativo !== caminho) });
  };

  const aoSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    void anexar(Array.from(e.dataTransfer.files ?? []));
  };

  const aoColar = (e: ClipboardEvent) => {
    const arquivos = Array.from(e.clipboardData.files ?? []);
    if (arquivos.length > 0) {
      e.preventDefault();
      void anexar(arquivos);
    }
  };

  // Modo etapas: composer de imagem antes de disparar. O node fica mais largo
  // pra caber o fluxo de etapas em layout denso.
  const modoEtapas = !idSessao && !!fluxo.imagem;
  const previaEtapas = modoEtapas
    ? construirPromptEtapas(dadosCriacaoDe(dadosEtapas, tipoCriacao)).prompt
    : "";

  const classeNo = `no-sessao${rodando ? " rodando" : ""}${deuErro ? " erro" : ""}${
    arrastando ? " arrastando" : ""
  }${modoEtapas ? " etapas" : ""}`;

  // Rodape: modelo, custo e tokens da sessao.
  const modeloExibido = sessao?.modelo ?? modelo;
  const custoNum =
    typeof sessao?.custoUsd === "number" ? sessao.custoUsd : stream?.custoUsd;
  // Todo custo em dolar e estimativa por tabela de precos, nunca cobranca real,
  // entao marca como aproximado sempre que ha gasto (inclusive sessao antiga que
  // gravou estimado=false).
  const custoEstimado = (custoNum ?? 0) > 0;
  const temTokens =
    typeof sessao?.tokensEntrada === "number" ||
    typeof sessao?.tokensSaida === "number";
  // Quebra honesta da entrada: entrada realmente nova, cache gravado e cache
  // lido. Os tres tem precos bem diferentes (a escrita custa mais que a entrada
  // nova, a leitura custa uma fracao dela), entao cada um aparece sozinho.
  // Sessao antiga sem esses campos cai no formato antigo (total de entrada).
  const temDetalheEntrada = typeof sessao?.tokensEntradaNova === "number";
  const cacheGravado = sessao?.tokensCacheEscrita ?? 0;
  const cacheLido = sessao?.tokensCacheLeitura ?? 0;
  // Turnos desta sessao que gastaram sem o Hub saber quanto. Enquanto houver, o
  // custo mostrado e um piso, nao o valor da sessao.
  const turnosSemCusto = sessao?.turnosSemCusto ?? 0;

  const conversaVazia =
    turnos.length === 0 && pendentes.length === 0 && !liveTexto && !rodando;

  return (
    <div
      className={classeNo}
      onPaste={!idSessao ? aoColar : undefined}
      onDragOver={
        !idSessao
          ? (e) => {
              e.preventDefault();
              if (!arrastando) setArrastando(true);
            }
          : undefined
      }
      onDragLeave={
        !idSessao
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setArrastando(false);
              }
            }
          : undefined
      }
      onDrop={!idSessao ? aoSoltar : undefined}
    >
      {/* A UNICA alca arrastavel do cockpit junto com a do contexto: e aqui que
          o material entra na tarefa. */}
      <Handle type="target" position={Position.Left} />
      {/* Ancora, nao alca: a aresta sessao -> contêiner do tipo e automatica.
          Sem o Handle o React Flow nao tracaria a aresta; arrastavel, ele so
          oferecia um gesto que o onConnect descartava calado. */}
      <Handle type="source" position={Position.Right} isConnectable={false} />

      <div className="cabeca">
        {editando ? (
          <input
            className="nodrag campo campo-p campo-nome"
            aria-label="Nome do fluxo"
            autoFocus
            value={nomeRascunho}
            onChange={(e) => setNomeRascunho(e.target.value)}
            onBlur={salvarNome}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvarNome();
              if (e.key === "Escape") patch({ editando: false });
            }}
          />
        ) : (
          <span
            className="tit"
            onDoubleClick={() => {
              setNomeRascunho(tituloExibido);
              patch({ editando: true });
            }}
          >
            {tituloExibido}
          </span>
        )}
        <div className="cabeca-dir">
          {/* O estado da sessao e um selo das primitivas, e o ponto que pulsa
              so aparece quando ela esta MESMO rodando: e o unico lugar do no
              em que o menta fala. Concluida e parada sao selo neutro, porque
              terminar nao e um estado vivo. */}
          {info ? (
            <span
              className={`selo${
                rodando ? " selo-vivo" : deuErro ? " selo-alerta" : ""
              }`}
            >
              {rodando && <span className="ponto-vivo" />}
              {info.rotulo}
            </span>
          ) : (
            <span className="selo">Novo</span>
          )}
          {!idSessao && (
            <button
              className="nodrag fechar-composer"
              onClick={fecharComposer}
              title="Fechar composer"
              aria-label="Fechar composer"
            >
              <IconeX className="" />
            </button>
          )}
          {idSessao && (
            <button
              className={`nodrag remover-fluxo${confirmandoRemover ? " armado" : ""}${removendo ? " removendo" : ""}`}
              onClick={() => void removerFluxo()}
              title="Remover este fluxo do cockpit. As peças geradas continuam salvas."
              aria-label="Remover fluxo"
            >
              <IconeLixeira className="" />
              {(confirmandoRemover || removendo) && (
                <span className="aviso-remover-fluxo">
                  {removendo ? "Removendo..." : "Remover fluxo? As peças ficam salvas"}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="corpo">
        {/* Modo composer de imagem: o mesmo fluxo de etapas do wizard do
            dashboard, em layout compacto. Ao gerar, cai no modo conversa atual. */}
        {modoEtapas && (
          <div className="etapas-no">
            <EtapasCriacao
              tipo={tipoCriacao}
              dados={dadosEtapas}
              aoMudar={aoMudarEtapas}
              aoGerar={() => void dispararEtapas()}
              compacto
              textoGerar="Disparar fluxo"
              previa={previaEtapas}
            />
            {erroLocal && <div className="erro-local">{erroLocal}</div>}
          </div>
        )}

        {/* Modo composer classico: fluxos sem imagem (site e paginas). */}
        {!idSessao && !fluxo.imagem && (
          <>
            {fluxo.subopcoes.length > 1 && (
              <div className="sub-opcoes">
                {fluxo.subopcoes.map((op) => (
                  <button
                    key={op.id}
                    className={`chip${op.id === idSub ? " ativo" : ""}`}
                    onClick={() => patch({ idSub: op.id })}
                  >
                    {op.rotulo}
                  </button>
                ))}
              </div>
            )}

            {(sub.precisaArgumento || sub.dicaArgumento) && (
              <input
                className="nodrag campo"
                aria-label={sub.dicaArgumento || "Tema"}
                placeholder={sub.dicaArgumento || "Tema (opcional)"}
                value={tema}
                onChange={(e) => patch({ tema: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void disparar();
                }}
              />
            )}

            <textarea
              className="nodrag nowheel campo campo-detalhes"
              aria-label="Detalhes adicionais"
              placeholder="Detalhes adicionais (opcional)"
              value={detalhes}
              onChange={(e) => patch({ detalhes: e.target.value })}
            />

            {/* Seletor de modelo, em todo composer. */}
            <div className="seletor-modelo">
              <span className="rotulo-mini">Modelo</span>
              <div className="chips-modelo">
                {modelos.map((m) => (
                  <button
                    key={m.alias}
                    className={`chip${m.alias === modelo ? " ativo" : ""}`}
                    title={m.observacaoCusto}
                    onClick={() => patch({ modelo: m.alias })}
                  >
                    {m.rotulo}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de estilo, em todo fluxo de imagem (motor /carrossel). */}
            {fluxo.imagem && modelosCarrossel.length > 0 && (
              <div className="seletor-estilo">
                <span className="rotulo-mini">Estilo do carrossel</span>
                <div
                  className={`tira-estilos${fadeTira.esq ? " fade-esq" : ""}${
                    fadeTira.dir ? " fade-dir" : ""
                  }`}
                >
                  <div
                    className="cards-estilo nowheel"
                    ref={refTira}
                    onWheel={aoRolarTira}
                    onScroll={atualizarFadeTira}
                  >
                    <button
                      className={`card-estilo${modeloCarrossel === "" ? " ativo" : ""}`}
                      onClick={() => patch({ modeloCarrossel: "" })}
                    >
                      <span className="nome-estilo">Deixar a IA escolher</span>
                      <span className="desc-estilo">O sistema decide o modelo.</span>
                    </button>
                    {modelosCarrossel.map((mc) => (
                      <button
                        key={mc.id}
                        className={`card-estilo${
                          modeloCarrossel === mc.id ? " ativo" : ""
                        }`}
                        onClick={() => patch({ modeloCarrossel: mc.id })}
                      >
                        <span className="nome-estilo">{mc.nome}</span>
                        {mc.descricao && (
                          <span className="desc-estilo">{mc.descricao}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Seletores de formato e proporcao, so nos fluxos de imagem. */}
            {fluxo.imagem && (
              <>
                <div className="seletor-formato">
                  <span className="rotulo-mini">Formato</span>
                  <div className="chips-imagem">
                    {FORMATOS.map((f) => (
                      <button
                        key={f.id}
                        className={`chip-imagem${f.id === formato ? " ativo" : ""}`}
                        title={f.descricao}
                        onClick={() => patch({ formato: f.id })}
                      >
                        <span className="nome-op">{f.rotulo}</span>
                        <span className="desc-op">{f.descricao}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="seletor-proporcao">
                  <span className="rotulo-mini">Proporção</span>
                  <div className="chips-imagem">
                    {PROPORCOES.map((p) => (
                      <button
                        key={p.id}
                        className={`chip-imagem${p.id === proporcao ? " ativo" : ""}`}
                        title={p.descricao}
                        onClick={() => patch({ proporcao: p.id })}
                      >
                        <span className="nome-op">{p.rotulo}</span>
                        <span className="desc-op">{p.descricao}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {anexos.length > 0 && (
              <div className="anexos-inline">
                <span className="rotulo-mini">Anexos</span>
                {anexos.map((a) => (
                  <span className="chip-anexo" key={a.caminhoRelativo}>
                    <IconeClipe className="" />
                    <span className="nome-anexo" title={a.nome}>
                      {a.nome}
                    </span>
                    <button
                      className="remover-anexo"
                      onClick={() => removerAnexo(a.caminhoRelativo)}
                      title="Remover anexo"
                      aria-label="Remover anexo"
                    >
                      <IconeX className="" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {materiais.length > 0 && (
              <div className="materiais-conectados">
                <span className="rotulo-mini">Materiais conectados</span>
                {materiais.map((m) => (
                  <span className="pilula-material" key={m.slug}>
                    <IconeClipe className="" />
                    {m.nome}
                  </span>
                ))}
              </div>
            )}

            <div className="prompt-previa nowheel" title={previa}>
              {previa}
            </div>

            {erroLocal && <div className="erro-local">{erroLocal}</div>}

            <div className="acoes-composer">
              <button
                className="botao botao-neutro botao-anexo-rapido"
                onClick={() => refAnexo.current?.click()}
                title="Anexar material a esta tarefa"
                disabled={anexando}
              >
                <IconeClipe className="" />
                {anexando ? "Anexando" : "Anexar"}
              </button>
              <input
                ref={refAnexo}
                type="file"
                multiple
                hidden
                accept={ACEITA_ANEXO}
                onChange={(e) => {
                  void anexarInline(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              <button
                className="botao botao-principal"
                onClick={() => void disparar()}
                disabled={disparando || !modelo}
              >
                <IconeRaio className="" />
                {disparando ? "Disparando" : "Disparar fluxo"}
              </button>
            </div>
          </>
        )}

        {/* Modo conversa: depois de disparar. */}
        {idSessao && (
          <>
            <div className="conversa nowheel" ref={refConversa} onScroll={aoRolar}>
              {conversaVazia && (
                <div className="conversa-vazia">Sem mensagens ainda.</div>
              )}
              {[...turnos, ...pendentes].map((t, i) =>
                t.interno ? (
                  // Turno interno do Hub (retomada automatica do laco): a fala e de
                  // maquina, entao a transcricao mostra so uma nota discreta (M9).
                  // O estilo saiu do inline pro canvas.css: era opacity 0.6
                  // sobre TEXTO (2,4:1 medido) e 0.85em, ou seja, 11,05px,
                  // raspando o piso da escala. Inline nenhuma das duas travas
                  // enxergava. Agora recua por token de cor, que e o canal
                  // certo pra rotulo discreto.
                  <div key={`${t.papel}-${i}-${t.em}`} className="turno-interno">
                    Correção automática do Hub
                  </div>
                ) : (
                  <div key={`${t.papel}-${i}-${t.em}`} className={`turno ${t.papel}`}>
                    <div className="balao">
                      {t.papel === "assistente" ? (
                        <Markdown texto={t.texto} />
                      ) : (
                        t.texto
                      )}
                    </div>
                  </div>
                ),
              )}
              {rodando && (
                <div className="turno assistente">
                  <div className="balao">
                    {liveTexto ? (
                      <>
                        <Markdown texto={liveTexto} />
                        <span className="cursor-stream" />
                      </>
                    ) : (
                      <span className="aguardando">
                        Aguardando a resposta do Claude
                        <span className="cursor-stream" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {deuErro && sessao?.erro && (
              <div className="erro-local">{sessao.erro}</div>
            )}
            {erroLocal && <div className="erro-local">{erroLocal}</div>}

            {/* Rodape: o custo manda, o resto e contexto.

                Antes as tres coisas vinham numa linha so, separadas por
                barras, e a UNICA com peso era o nome do modelo: 700 e em
                menta. Ou seja, o dado mais fraco do bloco era o que o olho
                achava primeiro, e o valor gasto, o unico numero que alguem
                compara entre sessoes, se perdia no meio da frase.

                Agora e o desenho do cartao de workspace: um numero forte em
                cima, e embaixo uma sublinha fraca que concatena modelo,
                ressalva e tokens em frase. Nenhum dado saiu. */}
            <div className="rodape">
              <span className="custo">
                {typeof custoNum === "number" && (
                  <span className="custo-valor">
                    {turnosSemCusto > 0 ? "≥ " : ""}
                    {custoEstimado ? "~" : ""}${custoNum.toFixed(2)}
                  </span>
                )}
                <span className="custo-contexto">
                  <span className="modelo-tag">{modeloExibido}</span>
                  {custoEstimado && (
                    <>
                      {", "}
                      <span title="Valor aproximado, estimado por tabela de preços. Não é a cobrança real.">
                        aproximado
                      </span>
                    </>
                  )}
                  {turnosSemCusto > 0 && (
                    <>
                      {", "}
                      <span
                        title={
                          turnosSemCusto === 1
                            ? "1 turno desta sessão gastou sem preço conhecido. O valor real é maior."
                            : `${turnosSemCusto} turnos desta sessão gastaram sem preço conhecido. O valor real é maior.`
                        }
                      >
                        incompleto
                      </span>
                    </>
                  )}
                  {temTokens &&
                    (temDetalheEntrada ? (
                      <>
                        {", "}
                        {fmtK(sessao?.tokensEntradaNova)} novos,{" "}
                        <span className="tok-cache">{fmtK(cacheGravado)} cache grav.</span>,{" "}
                        <span className="tok-cache">{fmtK(cacheLido)} cache lido</span>,{" "}
                        {fmtK(sessao?.tokensSaida)} saída
                      </>
                    ) : (
                      <>
                        {", "}
                        {fmtK(sessao?.tokensEntrada)} entrada,{" "}
                        {fmtK(sessao?.tokensSaida)} saída
                      </>
                    ))}
                </span>
              </span>
              {rodando && (
                <button className="botao botao-perigo" onClick={() => void parar()}>
                  <IconeParar className="" />
                  Parar
                </button>
              )}
            </div>

            {/* Campo de mensagem, sempre visivel. Desabilita enquanto roda. */}
            <div className="composer-conversa">
              <input
                className="nodrag campo campo-mensagem"
                aria-label="Responder à sessão"
                placeholder="Responda ou peça um ajuste"
                value={mensagem}
                disabled={!podeEnviar}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void enviar();
                }}
              />
              <button
                className="botao botao-neutro botao-icone botao-enviar"
                onClick={() => void enviar()}
                disabled={!podeEnviar || !mensagem.trim()}
                title="Enviar"
                aria-label="Enviar"
              >
                <IconeSeta className="" />
              </button>
            </div>
            {rodando && (
              <div className="aviso-composer">
                A sessão está rodando. Espere terminar pra responder.
              </div>
            )}
          </>
        )}
      </div>

      {arrastando && !idSessao && (
        <div className="capa-soltar">Solte pra anexar a esta tarefa</div>
      )}
    </div>
  );
}

// Memoizado: no custom de React Flow so re-renderiza quando os proprios props
// mudam, nao quando qualquer outro no do canvas se move.
export const NoSessao = memo(NoSessaoInterno);
