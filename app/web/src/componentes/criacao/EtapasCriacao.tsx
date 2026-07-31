import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactElement,
} from "react";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import type { TipoCriacao } from "../../estado/geracao";
import { enviarAnexo, urlArquivoContexto, type ModeloIA } from "../../api/cliente";
import { PROPORCOES, type IdFormato, type IdProporcao } from "../../config/fluxos";
import { lerBase64 } from "../../util/arquivo";
import { mensagemDeErro } from "../../util/erros";
import {
  IconeCarrossel,
  IconeGaleria,
  IconePost,
  IconeRaio,
  IconeStories,
  IconeX,
} from "../comum/Icones";
import { GaleriaFontes, type ArquivoGaleriaFonte } from "../editor/GaleriaFontes";
import { ehImagem } from "../telas/fontes";
import type { DadosCriacao, ModoImagem, OrigemImagem } from "./prompt";
import "./criacao.css";

// Um anexo ja enviado pro backend: nome do arquivo e caminho relativo devolvido.
// Serializavel, entao sobrevive no node data e no rascunho do dashboard.
export interface AnexoEnviado {
  nome: string;
  caminhoRelativo: string;
}

// Estado completo que as etapas coletam. Tudo primitivo ou lista simples, entao
// serializa direto pro node data (patch) e pro rascunho do wizard.
export interface DadosEtapas {
  tema: string;
  detalhes: string;
  // Numero de paginas, ou null pra Auto. So o carrossel usa.
  paginas: number | null;
  modelo: ModeloIA;
  // Id do modelo de carrossel, ou "" pra deixar a IA escolher.
  estilo: string;
  // Opcionais para aceitar rascunhos salvos antes da composicao de modelos.
  estiloCapa?: string;
  estiloPaginas?: string;
  proporcao: IdProporcao;
  modoImagem: ModoImagem;
  // Opcional por compatibilidade com rascunhos salvos antes da geracao por IA.
  origemImagem?: OrigemImagem;
  anexos: AnexoEnviado[];
  visualModo: "negocio" | "personalizado";
  corFundo: string;
  corDestaque: string;
  corTexto: string;
  fonteTitulos: string;
  fonteCorpo: string;
  // Interruptor "Aprimorar com IA" da etapa de instrucoes finais. Opcional por
  // compatibilidade com rascunho antigo: ausente = ligado (padrao).
  aprimorarComIA?: boolean;
}

// Valores iniciais das etapas. O modelo vem do padrao do workspace.
export function criarDadosEtapas(modelo: ModeloIA): DadosEtapas {
  return {
    tema: "",
    detalhes: "",
    paginas: null,
    modelo,
    aprimorarComIA: true,
    estilo: "",
    estiloCapa: "",
    estiloPaginas: "",
    proporcao: "4x5",
    modoImagem: "sem",
    origemImagem: "usuario",
    anexos: [],
    visualModo: "negocio",
    corFundo: "#101418",
    corDestaque: "#00c896",
    corTexto: "#ffffff",
    fonteTitulos: "Poppins",
    fonteCorpo: "Inter",
  };
}

// Configuracao por tipo: o que muda entre carrossel, post e story. O carrossel e
// varias paginas com dimensao escolhivel; post e story sao pagina unica com
// proporcao fixa e sem a pergunta de quantidade de paginas.
export const CONFIG_TIPO: Record<
  TipoCriacao,
  {
    substantivo: string;
    marca: string;
    tituloEtapa0: string;
    rotuloTema: string;
    formato: IdFormato;
    proporcaoFixa?: IdProporcao;
    Icone: (p: { className?: string }) => ReactElement;
  }
> = {
  carrossel: {
    substantivo: "carrossel",
    marca: "Criar carrossel",
    tituloEtapa0: "O que vamos criar?",
    rotuloTema: "Tema do carrossel",
    formato: "multiplas",
    Icone: IconeCarrossel,
  },
  post: {
    substantivo: "post",
    marca: "Criar post",
    tituloEtapa0: "Sobre o que é o post?",
    rotuloTema: "Tema do post",
    formato: "unica",
    proporcaoFixa: "4x5",
    Icone: IconePost,
  },
  story: {
    substantivo: "story",
    marca: "Criar story",
    tituloEtapa0: "Sobre o que é o story?",
    rotuloTema: "Tema do story",
    formato: "unica",
    proporcaoFixa: "9x16",
    Icone: IconeStories,
  },
};

// Converte o estado coletado no formato serializavel do prompt. Reune o visual
// personalizado, resolve a proporcao fixa por tipo e os caminhos das imagens.
export function dadosCriacaoDe(d: DadosEtapas, tipo: TipoCriacao): DadosCriacao {
  const cfg = CONFIG_TIPO[tipo];
  return {
    tema: d.tema,
    detalhes: d.detalhes,
    paginas: tipo === "carrossel" ? d.paginas : null,
    estilo: tipo === "carrossel" ? "" : d.estilo,
    estiloCapa:
      tipo === "carrossel" ? (d.estiloCapa ?? d.estilo ?? "") : "",
    estiloPaginas:
      tipo === "carrossel" ? (d.estiloPaginas ?? d.estilo ?? "") : "",
    formato: cfg.formato,
    proporcao: cfg.proporcaoFixa ?? d.proporcao,
    modoImagem: d.modoImagem,
    origemImagem: d.origemImagem ?? "usuario",
    caminhosImagens: d.anexos.map((a) => a.caminhoRelativo),
    visual:
      d.visualModo === "personalizado"
        ? {
            corFundo: d.corFundo,
            corDestaque: d.corDestaque,
            corTexto: d.corTexto,
            fonteTitulos: d.fonteTitulos,
            fonteCorpo: d.fonteCorpo,
          }
        : null,
    aprimorarComIA: d.aprimorarComIA !== false,
  };
}

// Ha algo preenchido nas etapas? Decide se cancelar pede confirmacao.
export function etapasTemPreenchimento(d: DadosEtapas): boolean {
  return (
    d.tema.trim().length > 0 ||
    d.detalhes.trim().length > 0 ||
    d.anexos.length > 0 ||
    d.estilo !== "" ||
    (d.estiloCapa ?? "") !== "" ||
    (d.estiloPaginas ?? "") !== "" ||
    d.modoImagem !== "sem" ||
    d.visualModo !== "negocio" ||
    d.aprimorarComIA === false
  );
}

// Limites da quantidade de paginas do carrossel (Auto = null).
const PAGINAS_MIN = 2;
const PAGINAS_MAX = 15;
const PAGINAS_PADRAO = 6;

// Fontes disponiveis no visual personalizado (Google Fonts e web-safe).
const FONTES = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "DM Sans",
  "Georgia",
  "Arial",
];

// As tres opcoes de imagem da etapa 3.
const MODOS_IMAGEM: { id: ModoImagem; titulo: string; desc: string }[] = [
  { id: "sem", titulo: "Sem imagens", desc: "Só texto, o modelo cuida do visual." },
  { id: "com", titulo: "Com imagens", desc: "As suas fotos entram nas páginas." },
  {
    id: "intercalado",
    titulo: "Intercalado",
    desc: "Alterna página com imagem e página só de texto.",
  },
];

const TOTAL_ETAPAS = 4;

interface Props {
  tipo: TipoCriacao;
  dados: DadosEtapas;
  // Reporta mudancas parciais. O dono do estado (wizard ou node) persiste.
  aoMudar: (parcial: Partial<DadosEtapas>) => void;
  // Chamado na ultima etapa ao clicar em Gerar. A geracao vive no dono.
  aoGerar: () => void;
  // Layout denso pro node do cockpit.
  compacto?: boolean;
  // Texto do botao final. Padrao: "Gerar <substantivo>".
  textoGerar?: string;
  // Previa do prompt, mostrada discreta so na ultima etapa quando presente.
  previa?: string;
  // Habilita o atalho de teclado (Enter avanca). Desliga quando ha overlay
  // por cima (ex: confirmacao de saida). Padrao true fora do modo compacto.
  ativo?: boolean;
}

// So a coleta de dados: etapas, navegacao e validacao. Sem nenhuma logica de
// geracao. Controlado por `dados` + `aoMudar`, serve o wizard do dashboard e o
// composer compacto do node.
export function EtapasCriacao({
  tipo,
  dados,
  aoMudar,
  aoGerar,
  compacto = false,
  textoGerar,
  previa,
  ativo = true,
}: Props) {
  const { modelosCarrossel, contextos } = usarEstado();
  const {
    ativo: provedorAtivo,
    modelos,
    modeloPadrao,
    carregando: carregandoModelos,
  } = usarProvedoresIA();
  const cfg = CONFIG_TIPO[tipo];
  // Prefixo unico de id: as mesmas etapas rodam duas vezes na tela quando ha um
  // node do cockpit aberto atras do wizard, e id repetido quebra o <label for>.
  const id = useId();

  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "tras">("frente");
  // O aviso de tema vazio so aparece depois que a pessoa mexeu no campo e saiu
  // dele. Antes ele nascia junto com a etapa, em cima de um formulario que
  // ninguem tinha tocado ainda: era uma reclamacao antes de haver erro.
  const [temaTocado, setTemaTocado] = useState(false);

  // Upload de imagens da etapa 3: progresso e erro sao UI local; os anexos em si
  // moram em `dados`.
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const refArquivo = useRef<HTMLInputElement>(null);
  const refTema = useRef<HTMLInputElement>(null);
  const estiloCapa = dados.estiloCapa ?? dados.estilo ?? "";
  const estiloPaginas = dados.estiloPaginas ?? dados.estilo ?? "";
  const paginasTocadasRef = useRef(
    estiloPaginas !== "" && estiloPaginas !== estiloCapa,
  );
  const temImagensNasFontes = useMemo(
    () =>
      contextos.some((contexto) =>
        contexto.arquivos.some((arquivo) => ehImagem(arquivo.nome, arquivo.tipo)),
      ),
    [contextos],
  );

  const proporcaoEfetiva = cfg.proporcaoFixa ?? dados.proporcao;
  const temaValido = dados.tema.trim().length > 0;
  const estilosValidos =
    tipo !== "carrossel" || (!!estiloCapa === !!estiloPaginas);
  const etapaValida =
    etapa === 0
      ? temaValido
      : etapa === 1
        ? estilosValidos
        : etapa === TOTAL_ETAPAS - 1
          ? !!dados.modelo
          : true;
  const modeloTravado = dados.aprimorarComIA === false;

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((m) => m.alias === dados.modelo)) return;
    aoMudar({ modelo: modeloPadrao || modelos[0].alias });
  }, [modelos, modeloPadrao, dados.modelo, aoMudar]);

  // Aprimorar com IA desligado: o modelo do wizard vira o economico do provedor
  // (campo `economico` do backend). Assim todo consumidor destas etapas envia o
  // modelo barato, e o seletor desabilitado mostra a verdade.
  const modeloEconomico = modelos.find((m) => m.economico)?.alias;
  useEffect(() => {
    if (dados.aprimorarComIA !== false || !modeloEconomico) return;
    if (dados.modelo !== modeloEconomico) aoMudar({ modelo: modeloEconomico });
  }, [dados.aprimorarComIA, dados.modelo, modeloEconomico, aoMudar]);

  // Um rascunho pode ter sido criado com Codex e reaberto depois da troca para
  // Claude. Nesse caso volta para upload, sem enviar um prompt impossivel.
  useEffect(() => {
    if (provedorAtivo === "codex" || dados.origemImagem !== "ia") return;
    aoMudar({ origemImagem: "usuario" });
  }, [provedorAtivo, dados.origemImagem, aoMudar]);

  // Foca o tema ao abrir, so no wizard (no node evitamos roubar o foco do canvas).
  useEffect(() => {
    if (etapa === 0 && !compacto) refTema.current?.focus();
  }, [etapa, compacto]);

  const avancar = useCallback(() => {
    if (!etapaValida) return;
    if (etapa < TOTAL_ETAPAS - 1) {
      setDirecao("frente");
      setEtapa((e) => e + 1);
    } else {
      aoGerar();
    }
  }, [etapaValida, etapa, aoGerar]);

  const voltar = useCallback(() => {
    setDirecao("tras");
    setEtapa((e) => Math.max(0, e - 1));
  }, []);

  // Enter avanca quando a etapa e valida. Enter em textarea/select segue nativo.
  // So no wizard: no node um listener global roubaria o Enter do canvas.
  useEffect(() => {
    if (compacto || !ativo) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const alvo = e.target as HTMLElement | null;
      const tag = alvo?.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      avancar();
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [compacto, ativo, avancar]);

  const enviarArquivos = async (arquivos: File[]) => {
    if (arquivos.length === 0) return;
    aoMudar({ origemImagem: "usuario" });
    setEnviandoAnexo(true);
    setErroAnexo(null);
    const novos: AnexoEnviado[] = [];
    try {
      for (const arquivo of arquivos) {
        const conteudoBase64 = await lerBase64(arquivo);
        const { caminhoRelativo } = await enviarAnexo({
          nome: arquivo.name,
          conteudoBase64,
        });
        novos.push({ nome: arquivo.name, caminhoRelativo });
      }
    } catch (e) {
      setErroAnexo(mensagemDeErro(e));
    } finally {
      if (novos.length > 0) aoMudar({ anexos: [...dados.anexos, ...novos] });
      setEnviandoAnexo(false);
    }
  };

  const removerAnexo = (caminho: string) => {
    aoMudar({ anexos: dados.anexos.filter((a) => a.caminhoRelativo !== caminho) });
  };

  const escolherDaFonte = async (arquivo: ArquivoGaleriaFonte) => {
    if (dados.anexos.some((anexo) => anexo.nome === arquivo.nome)) {
      setErroAnexo("Essa imagem já está na criação.");
      return;
    }
    setEnviandoAnexo(true);
    setErroAnexo(null);
    try {
      const resposta = await fetch(urlArquivoContexto(arquivo.contextoId, arquivo.nome));
      if (!resposta.ok) throw new Error("Não consegui abrir a imagem da fonte de dados.");
      const blob = await resposta.blob();
      const arquivoLocal = new File([blob], arquivo.nome, { type: blob.type });
      const conteudoBase64 = await lerBase64(arquivoLocal);
      const { caminhoRelativo } = await enviarAnexo({
        nome: arquivo.nome,
        conteudoBase64,
      });
      aoMudar({
        origemImagem: "usuario",
        anexos: [...dados.anexos, { nome: arquivo.nome, caminhoRelativo }],
      });
    } catch (e) {
      setErroAnexo(mensagemDeErro(e));
      throw e;
    } finally {
      setEnviandoAnexo(false);
    }
  };

  // Arrastar e soltar imagens na area de soltar. stopPropagation pra nao vazar
  // pro handler de anexar-material do node por baixo.
  const aoSoltar = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(false);
    const imagens = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    void enviarArquivos(imagens);
  };

  const rotulosEtapa = [
    cfg.tituloEtapa0,
    "Qual a cara dele?",
    "Com ou sem imagens?",
    "Visual e gerar",
  ];

  const c = compacto ? " compacto" : "";
  const ultima = etapa === TOTAL_ETAPAS - 1;

  return (
    <>
      {/* Progresso da coleta. O numero exato esta escrito ao lado da pergunta,
          entao a barra e reforco visual e nao carrega informacao sozinha. */}
      <div className={`progresso criacao-progresso${c}`} aria-hidden="true">
        <div
          className="progresso-barra"
          style={{ width: `${((etapa + 1) / TOTAL_ETAPAS) * 100}%` }}
        />
      </div>

      <div className={`criacao-corpo${c}${compacto ? " nowheel" : ""}`}>
        <div key={etapa} className={`criacao-etapa da-${direcao}`}>
          <div className="criacao-cabeca">
            <h2 className="criacao-pergunta">{rotulosEtapa[etapa]}</h2>
            <span className="criacao-contador">
              Etapa {etapa + 1} de {TOTAL_ETAPAS}
            </span>
          </div>

          {/* Etapa 1: o que criar. */}
          {etapa === 0 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-tema`}>
                  {cfg.rotuloTema}
                </label>
                <input
                  ref={refTema}
                  id={`${id}-tema`}
                  className="campo campo-g nodrag"
                  placeholder="Ex: 5 erros de logo que espantam cliente"
                  value={dados.tema}
                  onChange={(e) => aoMudar({ tema: e.target.value })}
                  onBlur={() => setTemaTocado(true)}
                  aria-invalid={temaTocado && !temaValido}
                  aria-describedby={
                    temaTocado && !temaValido ? `${id}-tema-erro` : undefined
                  }
                />
                {temaTocado && !temaValido && (
                  <span className="erro-campo" id={`${id}-tema-erro`}>
                    Escreva o tema pra continuar.
                  </span>
                )}
              </div>

              {/* Quantidade de paginas: so no carrossel. Dois controles, nao
                  dois nomes da mesma coisa: ou o Hub decide a quantidade, ou
                  voce escolhe o numero. */}
              {tipo === "carrossel" && (
                <div className="grupo-campo">
                  <span className="rotulo" id={`${id}-paginas`}>
                    Quantidade de páginas
                  </span>
                  <div className="criacao-paginas">
                    <div className="segmentado" aria-labelledby={`${id}-paginas`}>
                      <button
                        className="segmento"
                        aria-pressed={dados.paginas === null}
                        onClick={() => aoMudar({ paginas: null })}
                      >
                        Automático
                      </button>
                      <button
                        className="segmento"
                        aria-pressed={dados.paginas !== null}
                        onClick={() =>
                          aoMudar({ paginas: dados.paginas ?? PAGINAS_PADRAO })
                        }
                      >
                        Escolher
                      </button>
                    </div>
                    {dados.paginas !== null && (
                      <div className="criacao-stepper">
                        <button
                          className="botao botao-p botao-icone botao-neutro"
                          aria-label="Menos páginas"
                          disabled={dados.paginas <= PAGINAS_MIN}
                          onClick={() =>
                            aoMudar({
                              paginas: Math.max(PAGINAS_MIN, (dados.paginas ?? PAGINAS_PADRAO) - 1),
                            })
                          }
                        >
                          −
                        </button>
                        <span
                          className="criacao-stepper-valor"
                          aria-live="polite"
                          aria-label={`${dados.paginas} páginas`}
                        >
                          {dados.paginas}
                        </span>
                        <button
                          className="botao botao-p botao-icone botao-neutro"
                          aria-label="Mais páginas"
                          disabled={dados.paginas >= PAGINAS_MAX}
                          onClick={() =>
                            aoMudar({
                              paginas: Math.min(PAGINAS_MAX, (dados.paginas ?? PAGINAS_PADRAO) + 1),
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="dica">
                    {dados.paginas === null
                      ? "O Hub escolhe quantas páginas o tema pede."
                      : `O carrossel sai com ${dados.paginas} páginas.`}
                  </span>
                </div>
              )}

              <div className="grupo-campo">
                <span className="rotulo" id={`${id}-r-modelo`}>
                  Modelo de IA
                </span>
                <fieldset className="opcoes" aria-labelledby={`${id}-r-modelo`}>
                  {modelos.map((m) => (
                    <label className="opcao" key={m.alias}>
                      <input
                        type="radio"
                        name={`${id}-modelo`}
                        value={m.alias}
                        checked={dados.modelo === m.alias}
                        disabled={modeloTravado}
                        onChange={() => aoMudar({ modelo: m.alias })}
                      />
                      <span className="opcao-titulo">{m.rotulo}</span>
                      <span className="opcao-descricao">{m.observacaoCusto}</span>
                    </label>
                  ))}
                </fieldset>
                {carregandoModelos && modelos.length === 0 && (
                  <span className="dica">Carregando modelos...</span>
                )}
                {modeloTravado && (
                  <span className="dica">
                    O Aprimorar com IA está desligado, então a geração usa o
                    modelo econômico. Ligue de novo na última etapa pra escolher.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Etapa 2: a cara. */}
          {etapa === 1 && (
            <div className="criacao-campos">
              {tipo === "carrossel" ? (
                <>
                  <div className="grupo-campo">
                    <span className="rotulo" id={`${id}-r-capa`}>
                      Capa
                    </span>
                    <fieldset
                      className="opcoes criacao-modelos"
                      aria-labelledby={`${id}-r-capa`}
                    >
                      <label className="opcao">
                        <input
                          type="radio"
                          name={`${id}-capa`}
                          checked={estiloCapa === ""}
                          onChange={() => {
                            paginasTocadasRef.current = false;
                            aoMudar({ estilo: "", estiloCapa: "", estiloPaginas: "" });
                          }}
                        />
                        <span className="criacao-thumb criacao-thumb-vazia">
                          <IconeRaio className="" />
                        </span>
                        <span className="opcao-titulo">Deixar a IA escolher</span>
                        <span className="opcao-descricao">
                          O sistema decide os dois estilos.
                        </span>
                      </label>
                      {modelosCarrossel.map((mc) => (
                        <label className="opcao" key={mc.id}>
                          <input
                            type="radio"
                            name={`${id}-capa`}
                            checked={estiloCapa === mc.id}
                            onChange={() =>
                              aoMudar({
                                estilo: "",
                                estiloCapa: mc.id,
                                ...(!paginasTocadasRef.current
                                  ? { estiloPaginas: mc.id }
                                  : {}),
                              })
                            }
                          />
                          <MiniModelo id={mc.id} slide={1} />
                          <span className="opcao-titulo">{mc.nome}</span>
                          {mc.descricao && (
                            <span className="opcao-descricao">{mc.descricao}</span>
                          )}
                        </label>
                      ))}
                    </fieldset>
                  </div>

                  <div className="grupo-campo">
                    <span className="rotulo" id={`${id}-r-paginas-estilo`}>
                      Páginas de conteúdo
                    </span>
                    {estiloCapa === "" && (
                      <span className="dica">
                        Escolha uma capa acima pra liberar o estilo das páginas.
                      </span>
                    )}
                    <fieldset
                      className="opcoes criacao-modelos"
                      aria-labelledby={`${id}-r-paginas-estilo`}
                    >
                      {modelosCarrossel.map((mc) => (
                        <label className="opcao" key={mc.id}>
                          <input
                            type="radio"
                            name={`${id}-paginas-estilo`}
                            checked={estiloPaginas === mc.id}
                            disabled={estiloCapa === ""}
                            onChange={() => {
                              paginasTocadasRef.current = true;
                              aoMudar({ estilo: "", estiloPaginas: mc.id });
                            }}
                          />
                          <MiniModelo id={mc.id} slide={2} />
                          <span className="opcao-titulo">{mc.nome}</span>
                          {mc.descricao && (
                            <span className="opcao-descricao">{mc.descricao}</span>
                          )}
                        </label>
                      ))}
                    </fieldset>
                  </div>
                </>
              ) : (
                <div className="grupo-campo">
                  <span className="rotulo" id={`${id}-r-estilo`}>
                    Estilo
                  </span>
                  <fieldset
                    className="opcoes criacao-modelos"
                    aria-labelledby={`${id}-r-estilo`}
                  >
                    <label className="opcao">
                      <input
                        type="radio"
                        name={`${id}-estilo`}
                        checked={dados.estilo === ""}
                        onChange={() => aoMudar({ estilo: "" })}
                      />
                      <span className="criacao-thumb criacao-thumb-vazia">
                        <IconeRaio className="" />
                      </span>
                      <span className="opcao-titulo">Deixar a IA escolher</span>
                      <span className="opcao-descricao">O sistema decide o modelo.</span>
                    </label>
                    {modelosCarrossel.map((mc) => (
                      <label className="opcao" key={mc.id}>
                        <input
                          type="radio"
                          name={`${id}-estilo`}
                          checked={dados.estilo === mc.id}
                          onChange={() => aoMudar({ estilo: mc.id })}
                        />
                        <MiniModelo id={mc.id} />
                        <span className="opcao-titulo">{mc.nome}</span>
                        {mc.descricao && (
                          <span className="opcao-descricao">{mc.descricao}</span>
                        )}
                      </label>
                    ))}
                  </fieldset>
                </div>
              )}

              {/* Dimensao: so no carrossel. Post e story sao proporcao fixa. */}
              {tipo === "carrossel" && (
                <div className="grupo-campo">
                  <span className="rotulo" id={`${id}-r-proporcao`}>
                    Dimensão
                  </span>
                  <fieldset
                    className="opcoes"
                    aria-labelledby={`${id}-r-proporcao`}
                  >
                    {PROPORCOES.map((p) => (
                      <label className="opcao" key={p.id}>
                        <input
                          type="radio"
                          name={`${id}-proporcao`}
                          checked={proporcaoEfetiva === p.id}
                          onChange={() => aoMudar({ proporcao: p.id })}
                        />
                        <span className="opcao-titulo">{p.rotulo}</span>
                        <span className="opcao-descricao">{p.descricao}</span>
                      </label>
                    ))}
                  </fieldset>
                </div>
              )}
            </div>
          )}

          {/* Etapa 3: imagens. */}
          {etapa === 2 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <span className="rotulo" id={`${id}-r-modo`}>
                  Imagens nas páginas
                </span>
                <fieldset className="opcoes" aria-labelledby={`${id}-r-modo`}>
                  {MODOS_IMAGEM.map((m) => (
                    <label className="opcao" key={m.id}>
                      <input
                        type="radio"
                        name={`${id}-modo-imagem`}
                        checked={dados.modoImagem === m.id}
                        onChange={() => aoMudar({ modoImagem: m.id })}
                      />
                      <span className="opcao-titulo">{m.titulo}</span>
                      <span className="opcao-descricao">{m.desc}</span>
                    </label>
                  ))}
                </fieldset>
              </div>

              {dados.modoImagem !== "sem" && (
                <>
                  <div className="grupo-campo">
                    <span className="rotulo" id={`${id}-r-origem`}>
                      De onde vêm as imagens
                    </span>
                    <fieldset
                      className="opcoes"
                      aria-labelledby={`${id}-r-origem`}
                    >
                      <label className="opcao">
                        <input
                          type="radio"
                          name={`${id}-origem`}
                          checked={dados.origemImagem !== "ia"}
                          onChange={() => aoMudar({ origemImagem: "usuario" })}
                        />
                        <span className="opcao-titulo">São minhas</span>
                        <span className="opcao-descricao">
                          Envie do computador ou pegue das Fontes de dados.
                        </span>
                      </label>
                      <label className="opcao">
                        <input
                          type="radio"
                          name={`${id}-origem`}
                          checked={dados.origemImagem === "ia"}
                          disabled={provedorAtivo !== "codex"}
                          onChange={() => aoMudar({ origemImagem: "ia", anexos: [] })}
                        />
                        <span className="opcao-titulo">Gerar com IA</span>
                        <span className="opcao-descricao">Imagens criadas na hora.</span>
                        {provedorAtivo !== "codex" && (
                          <span className="selo criacao-opcao-nota">Use o Codex</span>
                        )}
                      </label>
                    </fieldset>
                  </div>

                  {dados.origemImagem !== "ia" && (
                    <div className="grupo-campo">
                      <span className="rotulo">Suas imagens</span>
                      <div
                        className={`criacao-soltar${arrastando ? " arrastando" : ""}`}
                        role="button"
                        tabIndex={0}
                        aria-label="Enviar imagens do computador"
                        onClick={() => refArquivo.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            refArquivo.current?.click();
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setArrastando(true);
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          setArrastando(false);
                        }}
                        onDrop={aoSoltar}
                      >
                        <span className="criacao-soltar-titulo">
                          {enviandoAnexo
                            ? "Enviando..."
                            : arrastando
                              ? "Solte as imagens aqui"
                              : "Arraste imagens aqui"}
                        </span>
                        <span className="criacao-soltar-dica">
                          Ou clique pra escolher no computador.
                        </span>
                      </div>
                      <input
                        ref={refArquivo}
                        type="file"
                        multiple
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          void enviarArquivos(Array.from(e.target.files ?? []));
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="botao botao-p botao-neutro criacao-fontes-acao"
                        onClick={() => setGaleriaAberta(true)}
                        disabled={!temImagensNasFontes || enviandoAnexo}
                      >
                        <IconeGaleria className="" />
                        Escolher das Fontes de dados
                      </button>
                      {!temImagensNasFontes && (
                        <span className="dica">Nenhuma imagem nas fontes ainda.</span>
                      )}
                      {erroAnexo && <span className="erro-campo">{erroAnexo}</span>}
                      {dados.anexos.length > 0 && (
                        <ul className="lista criacao-anexos">
                          {dados.anexos.map((a) => (
                            <li className="item-lista" key={a.caminhoRelativo}>
                              <span className="item-lista-texto">
                                <span className="item-lista-titulo" title={a.nome}>
                                  {a.nome}
                                </span>
                              </span>
                              <span className="item-lista-acoes">
                                <button
                                  className="botao botao-p botao-icone botao-fantasma"
                                  onClick={() => removerAnexo(a.caminhoRelativo)}
                                  aria-label={`Remover ${a.nome}`}
                                >
                                  <IconeX className="" />
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <GaleriaFontes
                        aberta={galeriaAberta}
                        aoFechar={() => setGaleriaAberta(false)}
                        aoEscolher={escolherDaFonte}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Etapa 4: visual. */}
          {etapa === 3 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <span className="rotulo" id={`${id}-r-visual`}>
                  Cores e fontes
                </span>
                <fieldset className="opcoes" aria-labelledby={`${id}-r-visual`}>
                  <label className="opcao">
                    <input
                      type="radio"
                      name={`${id}-visual`}
                      checked={dados.visualModo === "negocio"}
                      onChange={() => aoMudar({ visualModo: "negocio" })}
                    />
                    <span className="opcao-titulo">Usar o visual do negócio</span>
                    <span className="opcao-descricao">
                      Cores e fontes do Cérebro, com a cara da marca.
                    </span>
                  </label>
                  <label className="opcao">
                    <input
                      type="radio"
                      name={`${id}-visual`}
                      checked={dados.visualModo === "personalizado"}
                      onChange={() => aoMudar({ visualModo: "personalizado" })}
                    />
                    <span className="opcao-titulo">Personalizar</span>
                    <span className="opcao-descricao">
                      Escolha as cores e as fontes desta geração.
                    </span>
                  </label>
                </fieldset>
              </div>

              {dados.visualModo === "personalizado" && (
                <>
                  <div className="criacao-cores">
                    <div className="grupo-campo">
                      <label className="rotulo" htmlFor={`${id}-cor-fundo`}>
                        Fundo
                      </label>
                      <input
                        id={`${id}-cor-fundo`}
                        type="color"
                        className="campo campo-g criacao-campo-cor nodrag"
                        value={dados.corFundo}
                        onChange={(e) => aoMudar({ corFundo: e.target.value })}
                      />
                    </div>
                    <div className="grupo-campo">
                      <label className="rotulo" htmlFor={`${id}-cor-destaque`}>
                        Destaque
                      </label>
                      <input
                        id={`${id}-cor-destaque`}
                        type="color"
                        className="campo campo-g criacao-campo-cor nodrag"
                        value={dados.corDestaque}
                        onChange={(e) => aoMudar({ corDestaque: e.target.value })}
                      />
                    </div>
                    <div className="grupo-campo">
                      <label className="rotulo" htmlFor={`${id}-cor-texto`}>
                        Texto
                      </label>
                      <input
                        id={`${id}-cor-texto`}
                        type="color"
                        className="campo campo-g criacao-campo-cor nodrag"
                        value={dados.corTexto}
                        onChange={(e) => aoMudar({ corTexto: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="criacao-fontes">
                    <div className="grupo-campo">
                      <label className="rotulo" htmlFor={`${id}-fonte-titulos`}>
                        Fonte dos títulos
                      </label>
                      <select
                        id={`${id}-fonte-titulos`}
                        className="campo nodrag"
                        value={dados.fonteTitulos}
                        onChange={(e) => aoMudar({ fonteTitulos: e.target.value })}
                      >
                        {FONTES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grupo-campo">
                      <label className="rotulo" htmlFor={`${id}-fonte-corpo`}>
                        Fonte do corpo
                      </label>
                      <select
                        id={`${id}-fonte-corpo`}
                        className="campo nodrag"
                        value={dados.fonteCorpo}
                        onChange={(e) => aoMudar({ fonteCorpo: e.target.value })}
                      >
                        {FONTES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-detalhes`}>
                  Instruções finais (opcional)
                </label>
                <textarea
                  id={`${id}-detalhes`}
                  className="campo nodrag nowheel"
                  placeholder="Ex: use exatamente o roteiro abaixo; deixe o texto mais direto; não use amarelo; a capa precisa destacar esta frase..."
                  value={dados.detalhes}
                  onChange={(e) => aoMudar({ detalhes: e.target.value })}
                />
                <span className="dica">
                  Última chance de definir conteúdo, tom e exceções antes de gerar.
                </span>
              </div>

              {/* Interruptor do modo economico. Ligado (padrao): fluxo atual.
                  Desligado: montagem direta num modelo economico. */}
              <label className="criacao-linha-interruptor">
                <span className="criacao-linha-interruptor-texto">
                  <span className="criacao-linha-interruptor-titulo">
                    Aprimorar com IA
                  </span>
                  <span className="dica">
                    Ligado, a IA capricha no design com o modelo escolhido.
                    Desligado, um modelo econômico só monta o template com o seu
                    conteúdo: bem mais barato, resultado mais simples.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="interruptor"
                  checked={dados.aprimorarComIA !== false}
                  onChange={(e) => aoMudar({ aprimorarComIA: e.target.checked })}
                  aria-label="Aprimorar com IA"
                />
              </label>
              {modeloTravado && dados.detalhes.trim() === "" && (
                <div className="faixa faixa-aviso" role="status">
                  <div className="faixa-texto">
                    Sem instruções, o modo econômico escreve um conteúdo básico.
                    Pra um resultado caprichado, ligue o Aprimorar ou descreva o
                    conteúdo acima.
                  </div>
                </div>
              )}

              {/* Previa discreta do prompt, so na ultima etapa e so quando o
                  dono passa uma (o node). O wizard nao passa: fica limpo. */}
              {previa && (
                <div className="criacao-previa nowheel" title={previa}>
                  {previa}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rodape de navegacao. */}
      <footer className={`criacao-rodape${c}`}>
        <button
          className="botao botao-fantasma"
          onClick={voltar}
          disabled={etapa === 0}
        >
          Voltar
        </button>
        <button
          className="botao botao-principal"
          onClick={avancar}
          disabled={!etapaValida}
        >
          {!ultima ? (
            "Continuar"
          ) : (
            <>
              <IconeRaio className="" />
              {textoGerar ?? `Gerar ${cfg.substantivo}`}
            </>
          )}
        </button>
      </footer>
    </>
  );
}

// Miniatura viva de um modelo de carrossel na etapa 2: um mini-iframe de
// /modelos-html/<id>/preview escalado pra caber na moldura, lazy por
// IntersectionObserver (nao carrega todos de uma vez). Fallback elegante quando
// o preview nao existe (404) ou nao tem .slide.
function MiniModelo({ id, slide = 1 }: { id: string; slide?: number }) {
  const refCaixa = useRef<HTMLSpanElement>(null);
  const refIframe = useRef<HTMLIFrameElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [dims, setDims] = useState<{ largura: number; altura: number } | null>(null);
  const [fator, setFator] = useState(0);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setVisivel(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(caixa);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa || !dims) return;
    const medir = () => {
      const f = caixa.clientWidth / dims.largura;
      setFator(f > 0 ? f : 0);
    };
    const ro = new ResizeObserver(medir);
    ro.observe(caixa);
    medir();
    return () => ro.disconnect();
  }, [dims]);

  function aoCarregar() {
    const doc = refIframe.current?.contentDocument;
    if (!doc?.body || !doc.querySelector(".slide")) {
      setFalhou(true);
      return;
    }
    setFalhou(false);
    setDims({ largura: doc.body.scrollWidth, altura: doc.body.scrollHeight });
  }

  const url = `/modelos-html/${encodeURIComponent(id)}/preview?slide=${slide}`;

  return (
    <span className="criacao-thumb" ref={refCaixa}>
      {falhou || !visivel ? (
        <span className="criacao-thumb-falhou">
          <IconeCarrossel className="" />
        </span>
      ) : (
        <iframe
          ref={refIframe}
          className="criacao-thumb-frame"
          src={url}
          title=""
          tabIndex={-1}
          aria-hidden="true"
          scrolling="no"
          onLoad={aoCarregar}
          onError={() => setFalhou(true)}
          style={
            dims && fator > 0
              ? {
                  width: `${dims.largura}px`,
                  height: `${dims.altura}px`,
                  transform: `scale(${fator})`,
                }
              : { opacity: 0 }
          }
        />
      )}
    </span>
  );
}
