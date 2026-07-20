import {
  useCallback,
  useEffect,
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
  IconeClipe,
  IconeGaleria,
  IconePost,
  IconeRaio,
  IconeStories,
  IconeX,
} from "../comum/Icones";
import { GaleriaFontes, type ArquivoGaleriaFonte } from "../editor/GaleriaFontes";
import { ehImagem } from "../telas/fontes";
import type { DadosCriacao, ModoImagem, OrigemImagem } from "./prompt";
import "../../estilos/criacao.css";

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
}

// Valores iniciais das etapas. O modelo vem do padrao do workspace.
export function criarDadosEtapas(modelo: ModeloIA): DadosEtapas {
  return {
    tema: "",
    detalhes: "",
    paginas: null,
    modelo,
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
    d.visualModo !== "negocio"
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
  { id: "com", titulo: "Com imagens", desc: "Imagens nas páginas do carrossel." },
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

  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "tras">("frente");

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

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((m) => m.alias === dados.modelo)) return;
    aoMudar({ modelo: modeloPadrao || modelos[0].alias });
  }, [modelos, modeloPadrao, dados.modelo, aoMudar]);

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

  // Arrastar e soltar imagens na dropzone. stopPropagation pra nao vazar pro
  // handler de anexar-material do node por baixo.
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
      {/* Indicador de passos. */}
      <div className={`criacao-passos${c}`} aria-hidden="true">
        {rotulosEtapa.map((_, i) => (
          <span
            key={i}
            className={`criacao-passo${i === etapa ? " atual" : ""}${
              i < etapa ? " feito" : ""
            }`}
          />
        ))}
      </div>

      <div
        key={etapa}
        className={`criacao-etapa da-${direcao}${c}${compacto ? " nowheel" : ""}`}
      >
        <h2 className="criacao-titulo">{rotulosEtapa[etapa]}</h2>

        {/* Etapa 1: o que criar. */}
        {etapa === 0 && (
          <div className="criacao-campos">
            <label className="criacao-rotulo">
              {cfg.rotuloTema}
              <input
                ref={refTema}
                className="criacao-input-grande nodrag"
                placeholder="Ex: 5 erros de logo que espantam cliente"
                value={dados.tema}
                onChange={(e) => aoMudar({ tema: e.target.value })}
              />
            </label>
            {!temaValido && (
              <span className="criacao-hint">Escreva o tema pra continuar.</span>
            )}

            {/* Quantidade de paginas: so no carrossel. */}
            {tipo === "carrossel" && (
              <div className="criacao-bloco">
                <span className="criacao-rotulo-mini">Quantidade de páginas</span>
                <div className="criacao-paginas">
                  <button
                    className={`criacao-chip${dados.paginas === null ? " ativo" : ""}`}
                    onClick={() => aoMudar({ paginas: null })}
                  >
                    Auto
                  </button>
                  <div
                    className={`criacao-stepper${dados.paginas !== null ? " ativo" : ""}`}
                  >
                    <button
                      className="criacao-stepper-btn"
                      aria-label="Menos páginas"
                      onClick={() =>
                        aoMudar({
                          paginas: Math.max(
                            PAGINAS_MIN,
                            (dados.paginas ?? PAGINAS_PADRAO) - 1
                          ),
                        })
                      }
                    >
                      −
                    </button>
                    <span className="criacao-stepper-valor">
                      {dados.paginas ?? "Auto"}
                    </span>
                    <button
                      className="criacao-stepper-btn"
                      aria-label="Mais páginas"
                      onClick={() =>
                        aoMudar({
                          paginas: Math.min(
                            PAGINAS_MAX,
                            (dados.paginas ?? PAGINAS_PADRAO - 1) + 1
                          ),
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="criacao-bloco">
              <span className="criacao-rotulo-mini">Modelo de IA</span>
              <div className="criacao-cards-lin">
                {modelos.map((m) => (
                  <button
                    key={m.alias}
                    className={`criacao-card-op${dados.modelo === m.alias ? " ativo" : ""}`}
                    onClick={() => aoMudar({ modelo: m.alias })}
                    title={m.observacaoCusto}
                  >
                    <span className="criacao-card-nome">{m.rotulo}</span>
                    <span className="criacao-card-desc">{m.observacaoCusto}</span>
                  </button>
                ))}
                {carregandoModelos && modelos.length === 0 && (
                  <span className="criacao-card-desc">Carregando modelos...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2: a cara. */}
        {etapa === 1 && (
          <div className="criacao-campos">
            {tipo === "carrossel" ? (
              <>
                <div className="criacao-bloco criacao-modelos-grupo">
                  <span className="criacao-rotulo-mini">Capa</span>
                  <div className="criacao-modelos-grade">
                    <button
                      className={`criacao-card-op com-thumb${
                        estiloCapa === "" ? " ativo" : ""
                      }`}
                      onClick={() => {
                        paginasTocadasRef.current = false;
                        aoMudar({ estilo: "", estiloCapa: "", estiloPaginas: "" });
                      }}
                    >
                      <span className="criacao-modelo-thumb vazia">
                        <IconeRaio className="" />
                      </span>
                      <span className="criacao-card-nome">Deixar a IA escolher</span>
                      <span className="criacao-card-desc">
                        O sistema decide os dois estilos.
                      </span>
                    </button>
                    {modelosCarrossel.map((mc) => (
                      <button
                        key={mc.id}
                        className={`criacao-card-op com-thumb${
                          estiloCapa === mc.id ? " ativo" : ""
                        }`}
                        onClick={() =>
                          aoMudar({
                            estilo: "",
                            estiloCapa: mc.id,
                            ...(!paginasTocadasRef.current
                              ? { estiloPaginas: mc.id }
                              : {}),
                          })
                        }
                      >
                        <MiniModelo id={mc.id} slide={1} />
                        <span className="criacao-card-nome">{mc.nome}</span>
                        {mc.descricao && (
                          <span className="criacao-card-desc">{mc.descricao}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className={`criacao-bloco criacao-modelos-grupo${
                    estiloCapa === "" ? " desabilitado" : ""
                  }`}
                >
                  <span className="criacao-rotulo-mini">Páginas de conteúdo</span>
                  <div className="criacao-modelos-grade">
                    {modelosCarrossel.map((mc) => (
                      <button
                        key={mc.id}
                        disabled={estiloCapa === ""}
                        className={`criacao-card-op com-thumb${
                          estiloPaginas === mc.id ? " ativo" : ""
                        }`}
                        onClick={() => {
                          paginasTocadasRef.current = true;
                          aoMudar({ estilo: "", estiloPaginas: mc.id });
                        }}
                      >
                        <MiniModelo id={mc.id} slide={2} />
                        <span className="criacao-card-nome">{mc.nome}</span>
                        {mc.descricao && (
                          <span className="criacao-card-desc">{mc.descricao}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="criacao-bloco">
                <span className="criacao-rotulo-mini">Estilo</span>
                <div className="criacao-modelos-grade">
                  <button
                    className={`criacao-card-op com-thumb${
                      dados.estilo === "" ? " ativo" : ""
                    }`}
                    onClick={() => aoMudar({ estilo: "" })}
                  >
                    <span className="criacao-modelo-thumb vazia">
                      <IconeRaio className="" />
                    </span>
                    <span className="criacao-card-nome">Deixar a IA escolher</span>
                    <span className="criacao-card-desc">O sistema decide o modelo.</span>
                  </button>
                  {modelosCarrossel.map((mc) => (
                    <button
                      key={mc.id}
                      className={`criacao-card-op com-thumb${
                        dados.estilo === mc.id ? " ativo" : ""
                      }`}
                      onClick={() => aoMudar({ estilo: mc.id })}
                    >
                      <MiniModelo id={mc.id} />
                      <span className="criacao-card-nome">{mc.nome}</span>
                      {mc.descricao && (
                        <span className="criacao-card-desc">{mc.descricao}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dimensao: so no carrossel. Post e story sao proporcao fixa. */}
            {tipo === "carrossel" && (
              <div className="criacao-bloco">
                <span className="criacao-rotulo-mini">Dimensão</span>
                <div className="criacao-cards-lin">
                  {PROPORCOES.map((p) => (
                    <button
                      key={p.id}
                      className={`criacao-card-op${
                        proporcaoEfetiva === p.id ? " ativo" : ""
                      }`}
                      onClick={() => aoMudar({ proporcao: p.id })}
                    >
                      <span className="criacao-card-nome">{p.rotulo}</span>
                      <span className="criacao-card-desc">{p.descricao}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Etapa 3: imagens. */}
        {etapa === 2 && (
          <div className="criacao-campos">
            <div className="criacao-cards-lin">
              {MODOS_IMAGEM.map((m) => (
                <button
                  key={m.id}
                  className={`criacao-card-op alto${
                    dados.modoImagem === m.id ? " ativo" : ""
                  }`}
                  onClick={() => aoMudar({ modoImagem: m.id })}
                >
                  <span className="criacao-card-nome">{m.titulo}</span>
                  <span className="criacao-card-desc">{m.desc}</span>
                </button>
              ))}
            </div>

            {dados.modoImagem !== "sem" && (
              <div className="criacao-origem">
                <span className="criacao-rotulo-mini">De onde vêm as imagens</span>
                <button
                  type="button"
                  className="botao botao-neutro criacao-fontes-acao"
                  onClick={() => {
                    aoMudar({ origemImagem: "usuario" });
                    setGaleriaAberta(true);
                  }}
                  disabled={!temImagensNasFontes || enviandoAnexo}
                >
                  <IconeGaleria className="" />
                  Escolher das Fontes de dados
                </button>
                {!temImagensNasFontes && (
                  <span className="criacao-hint">Nenhuma imagem nas fontes ainda.</span>
                )}
                <div className="criacao-cards-lin">
                  <button
                    className={`criacao-card-op${
                      dados.origemImagem === "ia" ? " ativo" : ""
                    }${provedorAtivo !== "codex" ? " desabilitado" : ""}`}
                    disabled={provedorAtivo !== "codex"}
                    onClick={() => aoMudar({ origemImagem: "ia", anexos: [] })}
                    title={
                      provedorAtivo === "codex"
                        ? "O Codex cria as imagens durante a geracao"
                        : "Disponivel quando o Codex estiver conectado"
                    }
                  >
                    <span className="criacao-card-nome">Gerar com IA</span>
                    <span className="criacao-card-desc">Imagens criadas na hora.</span>
                    {provedorAtivo !== "codex" && (
                      <span className="criacao-badge-breve">Use o Codex</span>
                    )}
                  </button>
                  <div
                    className={`criacao-card-op criacao-dropzone${
                      arrastando ? " arrastando" : ""
                    }${dados.origemImagem !== "ia" ? " ativo" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      aoMudar({ origemImagem: "usuario" });
                      refArquivo.current?.click();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        aoMudar({ origemImagem: "usuario" });
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
                    <span className="criacao-card-nome">Enviar minhas imagens</span>
                    <span className="criacao-card-desc">
                      {enviandoAnexo
                        ? "Enviando..."
                        : arrastando
                          ? "Solte as imagens aqui."
                          : "Arraste aqui ou clique pra escolher."}
                    </span>
                  </div>
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
                {erroAnexo && <span className="criacao-hint erro">{erroAnexo}</span>}
                {dados.origemImagem !== "ia" && dados.anexos.length > 0 && (
                  <div className="criacao-anexos">
                    {dados.anexos.map((a) => (
                      <span className="criacao-chip-anexo" key={a.caminhoRelativo}>
                        <IconeClipe className="" />
                        <span className="criacao-nome-anexo" title={a.nome}>
                          {a.nome}
                        </span>
                        <button
                          className="criacao-remover-anexo"
                          onClick={() => removerAnexo(a.caminhoRelativo)}
                          aria-label="Remover imagem"
                          title="Remover imagem"
                        >
                          <IconeX className="" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <GaleriaFontes
                  aberta={galeriaAberta}
                  aoFechar={() => setGaleriaAberta(false)}
                  aoEscolher={escolherDaFonte}
                />
              </div>
            )}
          </div>
        )}

        {/* Etapa 4: visual. */}
        {etapa === 3 && (
          <div className="criacao-campos">
            <div className="criacao-cards-lin">
              <button
                className={`criacao-card-op alto${
                  dados.visualModo === "negocio" ? " ativo" : ""
                }`}
                onClick={() => aoMudar({ visualModo: "negocio" })}
              >
                <span className="criacao-card-nome">Usar o visual do negócio</span>
                <span className="criacao-card-desc">
                  Cores e fontes do Cérebro, com a cara da marca.
                </span>
              </button>
              <button
                className={`criacao-card-op alto${
                  dados.visualModo === "personalizado" ? " ativo" : ""
                }`}
                onClick={() => aoMudar({ visualModo: "personalizado" })}
              >
                <span className="criacao-card-nome">Personalizar</span>
                <span className="criacao-card-desc">
                  Escolha as cores e as fontes desta geração.
                </span>
              </button>
            </div>

            {dados.visualModo === "personalizado" && (
              <div className="criacao-visual">
                <div className="criacao-cores">
                  <label className="criacao-cor">
                    <span>Fundo</span>
                    <input
                      type="color"
                      value={dados.corFundo}
                      onChange={(e) => aoMudar({ corFundo: e.target.value })}
                    />
                  </label>
                  <label className="criacao-cor">
                    <span>Destaque</span>
                    <input
                      type="color"
                      value={dados.corDestaque}
                      onChange={(e) => aoMudar({ corDestaque: e.target.value })}
                    />
                  </label>
                  <label className="criacao-cor">
                    <span>Texto</span>
                    <input
                      type="color"
                      value={dados.corTexto}
                      onChange={(e) => aoMudar({ corTexto: e.target.value })}
                    />
                  </label>
                </div>
                <div className="criacao-fontes">
                  <label className="criacao-rotulo">
                    Fonte dos títulos
                    <select
                      className="nodrag"
                      value={dados.fonteTitulos}
                      onChange={(e) => aoMudar({ fonteTitulos: e.target.value })}
                    >
                      {FONTES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="criacao-rotulo">
                    Fonte do corpo
                    <select
                      className="nodrag"
                      value={dados.fonteCorpo}
                      onChange={(e) => aoMudar({ fonteCorpo: e.target.value })}
                    >
                      {FONTES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            <label className="criacao-rotulo">
              Instruções finais (opcional)
              <textarea
                className="criacao-textarea nodrag nowheel"
                placeholder="Ex: use exatamente o roteiro abaixo; deixe o texto mais direto; não use amarelo; a capa precisa destacar esta frase..."
                value={dados.detalhes}
                onChange={(e) => aoMudar({ detalhes: e.target.value })}
              />
              <span className="criacao-hint">
                Última chance de definir conteúdo, tom e exceções antes de gerar.
              </span>
            </label>

            {/* Previa discreta do prompt, so na ultima etapa e so quando o dono
                passa uma (o node). O wizard do dashboard nao passa: fica limpo. */}
            {previa && (
              <div className="criacao-previa nowheel" title={previa}>
                {previa}
              </div>
            )}
          </div>
        )}
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
  const refCaixa = useRef<HTMLDivElement>(null);
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
    <span className="criacao-modelo-thumb" ref={refCaixa}>
      {falhou || !visivel ? (
        <span className="criacao-modelo-fallback">
          <IconeCarrossel className="" />
        </span>
      ) : (
        <iframe
          ref={refIframe}
          className="criacao-modelo-frame"
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
