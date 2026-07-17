import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { enviarAnexo, urlArquivoContexto, type ModeloIA } from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import { lerBase64 } from "../../util/arquivo";
import { mensagemDeErro } from "../../util/erros";
import { IconeClipe, IconeGaleria, IconeRaio, IconeX } from "../comum/Icones";
import { GaleriaFontes, type ArquivoGaleriaFonte } from "../editor/GaleriaFontes";
import { ehImagem } from "../telas/fontes";
import type { AnexoEnviado } from "./EtapasCriacao";
import "../../estilos/criacao.css";

// Estado completo que as etapas do Site Guiado coletam. Tudo primitivo ou lista
// simples: serializa direto, mesmo padrao do wizard de conteudo visual.
export interface DadosEtapasSite {
  // O que e o site, negocio e objetivo em uma frase (obrigatorio).
  tema: string;
  // Detalhes livres (opcional).
  detalhes: string;
  // Pagina unica, site com paginas, ou link na bio.
  formato: "unica" | "completo" | "bio";
  // Objetivo numero 1 do site: o que o CTA principal faz.
  objetivo: "whatsapp" | "agendamento" | "orcamento" | "contato";
  // Resultado principal descrito livremente pelo usuario.
  objetivoLivre: string;
  // Numero do WhatsApp ou URL do CTA principal (pode ficar vazio).
  linkObjetivo: string;
  modelo: ModeloIA;
  // Estrutura descrita livremente. Vazio deixa o metodo da casa escolher.
  secoesLivre: string;
  // Sem imagens, com arquivos do usuario ou geradas pelo Codex.
  modoImagem: "sem" | "com" | "ia";
  anexos: AnexoEnviado[];
  visualModo: "negocio" | "personalizado";
  corFundo: string;
  corDestaque: string;
  corTexto: string;
  fonteTitulos: string;
  fonteCorpo: string;
}

// Valores iniciais das etapas. O modelo vem do padrao do workspace. Defaults
// sensatos: pagina unica, WhatsApp, secoes Auto, sem imagens, visual do negocio.
export function criarDadosEtapasSite(modelo: ModeloIA): DadosEtapasSite {
  return {
    tema: "",
    detalhes: "",
    formato: "unica",
    objetivo: "whatsapp",
    objetivoLivre: "",
    linkObjetivo: "",
    modelo,
    secoesLivre: "",
    modoImagem: "sem",
    anexos: [],
    visualModo: "negocio",
    corFundo: "#101418",
    corDestaque: "#00c896",
    corTexto: "#ffffff",
    fonteTitulos: "Poppins",
    fonteCorpo: "Inter",
  };
}

// Ha algo preenchido nas etapas? Decide se cancelar pede confirmacao.
export function etapasSiteTemPreenchimento(d: DadosEtapasSite): boolean {
  return (
    d.tema.trim().length > 0 ||
    d.detalhes.trim().length > 0 ||
    d.objetivoLivre.trim().length > 0 ||
    d.secoesLivre.trim().length > 0 ||
    d.linkObjetivo.trim().length > 0 ||
    d.anexos.length > 0 ||
    d.formato !== "unica" ||
    d.objetivo !== "whatsapp" ||
    d.modoImagem !== "sem" ||
    d.visualModo !== "negocio"
  );
}

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

// Os tres formatos de site da etapa 0.
const FORMATOS: { id: DadosEtapasSite["formato"]; titulo: string; desc: string }[] = [
  { id: "unica", titulo: "Página única", desc: "Landing page de uma tela." },
  {
    id: "completo",
    titulo: "Site com páginas",
    desc: "Início, sobre, serviços, contato. Publica como projeto Astro com sitemap.",
  },
  { id: "bio", titulo: "Link na bio", desc: "Página de links estilo linktree." },
];

// Os quatro objetivos possiveis do CTA principal, e o placeholder do link de cada.
const OBJETIVOS: {
  id: DadosEtapasSite["objetivo"];
  rotulo: string;
  placeholder: string;
}[] = [
  {
    id: "whatsapp",
    rotulo: "WhatsApp",
    placeholder: "Número com DDD, ex: 11 91234-5678",
  },
  {
    id: "agendamento",
    rotulo: "Agendamento",
    placeholder: "Link de agendamento, ex: https://...",
  },
  {
    id: "orcamento",
    rotulo: "Orçamento",
    placeholder: "Link do orçamento, ex: https://...",
  },
  { id: "contato", rotulo: "Contato", placeholder: "Link ou e-mail de contato" },
];

const TOTAL_ETAPAS = 4;

interface Props {
  dados: DadosEtapasSite;
  // Reporta mudancas parciais. O dono do estado (wizard) persiste.
  aoMudar: (parcial: Partial<DadosEtapasSite>) => void;
  // Chamado na ultima etapa ao clicar em Gerar site.
  aoGerar: () => void;
  // Habilita o Enter que avanca. Desliga quando ha overlay por cima.
  ativo?: boolean;
}

// So a coleta de dados do Site Guiado: 4 etapas, navegacao e validacao. Mesmo
// padrao visual do EtapasCriacao, sem nenhuma logica de geracao.
export function EtapasSite({ dados, aoMudar, aoGerar, ativo = true }: Props) {
  const { contextos } = usarEstado();
  const {
    ativo: provedorAtivo,
    modelos,
    modeloPadrao,
    carregando: carregandoModelos,
  } = usarProvedoresIA();
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "tras">("frente");

  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const refArquivo = useRef<HTMLInputElement>(null);
  const refTema = useRef<HTMLTextAreaElement>(null);

  const temaValido = dados.tema.trim().length > 0;
  const temImagensNasFontes = useMemo(
    () =>
      contextos.some((contexto) =>
        contexto.arquivos.some((arquivo) => ehImagem(arquivo.nome, arquivo.tipo)),
      ),
    [contextos],
  );
  const etapaValida = etapa === 0 ? temaValido : etapa === TOTAL_ETAPAS - 1 ? !!dados.modelo : true;

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((m) => m.alias === dados.modelo)) return;
    aoMudar({ modelo: modeloPadrao || modelos[0].alias });
  }, [modelos, modeloPadrao, dados.modelo, aoMudar]);

  useEffect(() => {
    if (provedorAtivo === "codex" || dados.modoImagem !== "ia") return;
    aoMudar({ modoImagem: "sem" });
  }, [provedorAtivo, dados.modoImagem, aoMudar]);

  // Foca o tema ao abrir a primeira etapa.
  useEffect(() => {
    if (etapa === 0) refTema.current?.focus();
  }, [etapa]);

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
  useEffect(() => {
    if (!ativo) return;
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
  }, [ativo, avancar]);

  const enviarArquivos = async (arquivos: File[]) => {
    if (arquivos.length === 0) return;
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
        anexos: [...dados.anexos, { nome: arquivo.nome, caminhoRelativo }],
      });
    } catch (e) {
      setErroAnexo(mensagemDeErro(e));
      throw e;
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const aoSoltar = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(false);
    const imagens = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    void enviarArquivos(imagens);
  };

  const objetivoAtual =
    OBJETIVOS.find((o) => o.id === dados.objetivo) ?? OBJETIVOS[0];

  const rotulosEtapa = [
    "O site",
    "A estrutura",
    "Com ou sem imagens?",
    "Visual e gerar",
  ];

  const ultima = etapa === TOTAL_ETAPAS - 1;

  return (
    <>
      {/* Indicador de passos. */}
      <div className="criacao-passos" aria-hidden="true">
        {rotulosEtapa.map((_, i) => (
          <span
            key={i}
            className={`criacao-passo${i === etapa ? " atual" : ""}${
              i < etapa ? " feito" : ""
            }`}
          />
        ))}
      </div>

      <div key={etapa} className={`criacao-etapa da-${direcao}`}>
        <h2 className="criacao-titulo">{rotulosEtapa[etapa]}</h2>

        {/* Etapa 0: o site. */}
        {etapa === 0 && (
          <div className="criacao-campos">
            <label className="criacao-rotulo">
              O que é esse site? Fale do negócio e do objetivo
              <textarea
                ref={refTema}
                className="criacao-textarea site-tema nodrag nowheel"
                placeholder="Ex: site do meu estúdio de tatuagem em Curitiba, pra agendar horário"
                value={dados.tema}
                onChange={(e) => aoMudar({ tema: e.target.value })}
              />
            </label>
            {!temaValido && (
              <span className="criacao-hint">Escreva do que é o site pra continuar.</span>
            )}

            <div className="criacao-bloco">
              <span className="criacao-rotulo-mini">Formato</span>
              <div className="criacao-cards-lin">
                {FORMATOS.map((f) => (
                  <button
                    key={f.id}
                    className={`criacao-card-op alto${
                      dados.formato === f.id ? " ativo" : ""
                    }`}
                    onClick={() => aoMudar({ formato: f.id })}
                  >
                    <span className="criacao-card-nome">{f.titulo}</span>
                    <span className="criacao-card-desc">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

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

        {/* Etapa 1: estrutura. */}
        {etapa === 1 && (
          <div className="criacao-campos">
            <label className="criacao-rotulo">
              Objetivo nº 1 do site
              <textarea
                className="criacao-textarea nodrag nowheel"
                placeholder="Ex: fazer o visitante chamar no WhatsApp pra pedir orçamento; vender o pacote fotográfico premium; conseguir inscrições pra aula experimental..."
                value={dados.objetivoLivre}
                onChange={(e) => aoMudar({ objetivoLivre: e.target.value })}
              />
            </label>

            <div className="criacao-bloco">
              <span className="criacao-rotulo-mini">Botão principal</span>
              <span className="criacao-hint">
                O botão que fecha o objetivo. O link ou número vai nele.
              </span>
              <div className="criacao-chips">
                {OBJETIVOS.map((o) => (
                  <button
                    key={o.id}
                    className={`criacao-chip${dados.objetivo === o.id ? " ativo" : ""}`}
                    onClick={() => aoMudar({ objetivo: o.id })}
                  >
                    {o.rotulo}
                  </button>
                ))}
              </div>
              <label className="criacao-rotulo site-link">
                {dados.objetivo === "whatsapp"
                  ? "Número do WhatsApp"
                  : "Link do CTA (opcional)"}
                <input
                  className="nodrag"
                  placeholder={objetivoAtual.placeholder}
                  value={dados.linkObjetivo}
                  onChange={(e) => aoMudar({ linkObjetivo: e.target.value })}
                />
              </label>
            </div>

            {/* Bio nao tem secoes: e uma pagina de links. */}
            {dados.formato !== "bio" && (
              <label className="criacao-rotulo">
                Seções do site
                <textarea
                  className="criacao-textarea nodrag nowheel"
                  placeholder="Ex: uma abertura forte com foto, uma seção com os 3 pacotes e preços, depoimentos de clientes, um FAQ curto e o contato no final. Deixe vazio pro sistema escolher."
                  value={dados.secoesLivre}
                  onChange={(e) => aoMudar({ secoesLivre: e.target.value })}
                />
                <span className="criacao-hint">
                  Descreva do seu jeito, em texto. Vazio = o sistema monta a estrutura pelo método da casa.
                </span>
              </label>
            )}
          </div>
        )}

        {/* Etapa 2: imagens. */}
        {etapa === 2 && (
          <div className="criacao-campos">
            <div className="criacao-cards-lin">
              <button
                className={`criacao-card-op alto${
                  dados.modoImagem === "sem" ? " ativo" : ""
                }`}
                onClick={() => aoMudar({ modoImagem: "sem" })}
              >
                <span className="criacao-card-nome">Sem imagens</span>
                <span className="criacao-card-desc">
                  Visual só com cor e tipografia.
                </span>
              </button>
              <button
                className={`criacao-card-op alto${
                  dados.modoImagem === "com" ? " ativo" : ""
                }`}
                onClick={() => aoMudar({ modoImagem: "com" })}
              >
                <span className="criacao-card-nome">Com imagens</span>
                <span className="criacao-card-desc">
                  Use fotos das suas Fontes de dados ou envie novas.
                </span>
              </button>
              <button
                className={`criacao-card-op alto${
                  dados.modoImagem === "ia" ? " ativo" : ""
                }${provedorAtivo !== "codex" ? " desabilitado" : ""}`}
                onClick={() => aoMudar({ modoImagem: "ia", anexos: [] })}
                disabled={provedorAtivo !== "codex"}
                title={
                  provedorAtivo === "codex"
                    ? "O Codex cria as imagens durante a geracao"
                    : "Disponivel quando o Codex estiver conectado"
                }
              >
                <span className="criacao-card-nome">Gerar com IA</span>
                <span className="criacao-card-desc">Imagens originais criadas na hora.</span>
                {provedorAtivo !== "codex" && (
                  <span className="criacao-badge-breve">Use o Codex</span>
                )}
              </button>
            </div>

            {dados.modoImagem === "com" && (
              <div className="criacao-origem">
                <span className="criacao-rotulo-mini">Suas imagens</span>
                <button
                  type="button"
                  className="botao botao-neutro criacao-fontes-acao"
                  onClick={() => setGaleriaAberta(true)}
                  disabled={!temImagensNasFontes || enviandoAnexo}
                >
                  <IconeGaleria className="" />
                  Escolher das Fontes de dados
                </button>
                {!temImagensNasFontes && (
                  <span className="criacao-hint">Nenhuma imagem nas fontes ainda.</span>
                )}
                <div
                  className={`criacao-card-op criacao-dropzone${
                    arrastando ? " arrastando" : ""
                  }`}
                  role="button"
                  tabIndex={0}
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
                  <span className="criacao-card-nome">Enviar minhas imagens</span>
                  <span className="criacao-card-desc">
                    {enviandoAnexo
                      ? "Enviando..."
                      : arrastando
                        ? "Solte as imagens aqui."
                        : "Arraste aqui ou clique pra escolher."}
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
                {erroAnexo && <span className="criacao-hint erro">{erroAnexo}</span>}
                {dados.anexos.length > 0 && (
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

        {/* Etapa 3: visual. */}
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
                  Escolha as cores e as fontes deste site.
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
              Detalhes (opcional)
              <textarea
                className="criacao-textarea nodrag nowheel"
                placeholder={'Ex: tom mais sério; usar a frase "20 anos de estrada" no topo; não usar amarelo; incluir o Instagram no rodapé; página de obrigado depois do formulário...'}
                value={dados.detalhes}
                onChange={(e) => aoMudar({ detalhes: e.target.value })}
              />
              <span className="criacao-hint">
                Última chance de pedir qualquer coisa antes de gerar.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Rodape de navegacao. */}
      <footer className="criacao-rodape">
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
              Gerar site
            </>
          )}
        </button>
      </footer>
    </>
  );
}
