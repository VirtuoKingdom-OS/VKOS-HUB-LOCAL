import {
  useCallback,
  useEffect,
  useId,
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
import { IconeGaleria, IconeRaio, IconeX } from "../comum/Icones";
import { GaleriaFontes, type ArquivoGaleriaFonte } from "../editor/GaleriaFontes";
import { ehImagem } from "../telas/fontes";
import type { AnexoEnviado } from "./EtapasCriacao";
import "./criacao.css";

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
  // Interruptor "Aprimorar com IA" da etapa de detalhes. Opcional por
  // compatibilidade com rascunho antigo: ausente = ligado (padrao).
  aprimorarComIA?: boolean;
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
    aprimorarComIA: true,
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
    d.visualModo !== "negocio" ||
    d.aprimorarComIA === false
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
  const id = useId();
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "tras">("frente");
  // Mesma regra do wizard de conteudo visual: o aviso de campo vazio so aparece
  // depois que a pessoa mexeu no campo e saiu dele.
  const [temaTocado, setTemaTocado] = useState(false);

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
  const modeloTravado = dados.aprimorarComIA === false;

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((m) => m.alias === dados.modelo)) return;
    aoMudar({ modelo: modeloPadrao || modelos[0].alias });
  }, [modelos, modeloPadrao, dados.modelo, aoMudar]);

  // Aprimorar com IA desligado: o modelo do wizard vira o economico da tarefa
  // de site (degrau do meio: sonnet no Claude, gpt-5.6-terra no Codex). Site
  // nao tem template HTML pra copiar; no minimo absoluto a qualidade despenca.
  const economicoSite = provedorAtivo === "codex" ? "gpt-5.6-terra" : "sonnet";
  useEffect(() => {
    if (dados.aprimorarComIA !== false) return;
    if (dados.modelo !== economicoSite) aoMudar({ modelo: economicoSite });
  }, [dados.aprimorarComIA, dados.modelo, economicoSite, aoMudar]);

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
    "Do que é o site?",
    "O que ele precisa ter?",
    "Com ou sem imagens?",
    "Visual e gerar",
  ];

  const ultima = etapa === TOTAL_ETAPAS - 1;

  return (
    <>
      {/* Progresso da coleta. O numero exato esta escrito ao lado da pergunta,
          entao a barra e reforco visual e nao carrega informacao sozinha. */}
      <div className="progresso criacao-progresso" aria-hidden="true">
        <div
          className="progresso-barra"
          style={{ width: `${((etapa + 1) / TOTAL_ETAPAS) * 100}%` }}
        />
      </div>

      <div className="criacao-corpo">
        <div key={etapa} className={`criacao-etapa da-${direcao}`}>
          <div className="criacao-cabeca">
            <h2 className="criacao-pergunta">{rotulosEtapa[etapa]}</h2>
            <span className="criacao-contador">
              Etapa {etapa + 1} de {TOTAL_ETAPAS}
            </span>
          </div>

          {/* Etapa 0: o site. */}
          {etapa === 0 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-tema`}>
                  O que é esse site? Fale do negócio e do objetivo
                </label>
                <textarea
                  ref={refTema}
                  id={`${id}-tema`}
                  className="campo criacao-textarea-alta nodrag nowheel"
                  placeholder="Ex: site do meu estúdio de tatuagem em Curitiba, pra agendar horário"
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
                    Escreva do que é o site pra continuar.
                  </span>
                )}
              </div>

              <div className="grupo-campo">
                <span className="rotulo" id={`${id}-r-formato`}>
                  Formato
                </span>
                <fieldset className="opcoes" aria-labelledby={`${id}-r-formato`}>
                  {FORMATOS.map((f) => (
                    <label className="opcao" key={f.id}>
                      <input
                        type="radio"
                        name={`${id}-formato`}
                        checked={dados.formato === f.id}
                        onChange={() => aoMudar({ formato: f.id })}
                      />
                      <span className="opcao-titulo">{f.titulo}</span>
                      <span className="opcao-descricao">{f.desc}</span>
                    </label>
                  ))}
                </fieldset>
              </div>

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

          {/* Etapa 1: estrutura. */}
          {etapa === 1 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-objetivo-livre`}>
                  Objetivo nº 1 do site
                </label>
                <textarea
                  id={`${id}-objetivo-livre`}
                  className="campo nodrag nowheel"
                  placeholder="Ex: fazer o visitante chamar no WhatsApp pra pedir orçamento; vender o pacote fotográfico premium; conseguir inscrições pra aula experimental..."
                  value={dados.objetivoLivre}
                  onChange={(e) => aoMudar({ objetivoLivre: e.target.value })}
                />
              </div>

              <div className="grupo-campo">
                <span className="rotulo" id={`${id}-r-botao`}>
                  Botão principal
                </span>
                <span className="dica">
                  O botão que fecha o objetivo. O link ou número vai nele.
                </span>
                <div className="segmentado" aria-labelledby={`${id}-r-botao`}>
                  {OBJETIVOS.map((o) => (
                    <button
                      key={o.id}
                      className="segmento"
                      aria-pressed={dados.objetivo === o.id}
                      onClick={() => aoMudar({ objetivo: o.id })}
                    >
                      {o.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-link`}>
                  {dados.objetivo === "whatsapp"
                    ? "Número do WhatsApp"
                    : "Link do botão (opcional)"}
                </label>
                <input
                  id={`${id}-link`}
                  className="campo nodrag"
                  placeholder={objetivoAtual.placeholder}
                  value={dados.linkObjetivo}
                  onChange={(e) => aoMudar({ linkObjetivo: e.target.value })}
                />
              </div>

              {/* Bio nao tem secoes: e uma pagina de links. */}
              {dados.formato !== "bio" && (
                <div className="grupo-campo">
                  <label className="rotulo" htmlFor={`${id}-secoes`}>
                    Seções do site
                  </label>
                  <textarea
                    id={`${id}-secoes`}
                    className="campo nodrag nowheel"
                    placeholder="Ex: uma abertura forte com foto, uma seção com os 3 pacotes e preços, depoimentos de clientes, um FAQ curto e o contato no final."
                    value={dados.secoesLivre}
                    onChange={(e) => aoMudar({ secoesLivre: e.target.value })}
                  />
                  <span className="dica">
                    Descreva do seu jeito, em texto. Deixe vazio pro sistema
                    montar a estrutura pelo método da casa.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Etapa 2: imagens. */}
          {etapa === 2 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <span className="rotulo" id={`${id}-r-imagens`}>
                  Imagens do site
                </span>
                <fieldset className="opcoes" aria-labelledby={`${id}-r-imagens`}>
                  <label className="opcao">
                    <input
                      type="radio"
                      name={`${id}-imagens`}
                      checked={dados.modoImagem === "sem"}
                      onChange={() => aoMudar({ modoImagem: "sem" })}
                    />
                    <span className="opcao-titulo">Sem imagens</span>
                    <span className="opcao-descricao">
                      Visual só com cor e tipografia.
                    </span>
                  </label>
                  <label className="opcao">
                    <input
                      type="radio"
                      name={`${id}-imagens`}
                      checked={dados.modoImagem === "com"}
                      onChange={() => aoMudar({ modoImagem: "com" })}
                    />
                    <span className="opcao-titulo">Com imagens</span>
                    <span className="opcao-descricao">
                      Use fotos das suas Fontes de dados ou envie novas.
                    </span>
                  </label>
                  <label className="opcao">
                    <input
                      type="radio"
                      name={`${id}-imagens`}
                      checked={dados.modoImagem === "ia"}
                      disabled={provedorAtivo !== "codex"}
                      onChange={() => aoMudar({ modoImagem: "ia", anexos: [] })}
                    />
                    <span className="opcao-titulo">Gerar com IA</span>
                    <span className="opcao-descricao">
                      Imagens originais criadas na hora.
                    </span>
                    {provedorAtivo !== "codex" && (
                      <span className="selo criacao-opcao-nota">Use o Codex</span>
                    )}
                  </label>
                </fieldset>
              </div>

              {dados.modoImagem === "com" && (
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
            </div>
          )}

          {/* Etapa 3: visual. */}
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
                      Escolha as cores e as fontes deste site.
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
                  Detalhes (opcional)
                </label>
                <textarea
                  id={`${id}-detalhes`}
                  className="campo nodrag nowheel"
                  placeholder={'Ex: tom mais sério; usar a frase "20 anos de estrada" no topo; não usar amarelo; incluir o Instagram no rodapé...'}
                  value={dados.detalhes}
                  onChange={(e) => aoMudar({ detalhes: e.target.value })}
                />
                <span className="dica">
                  Última chance de pedir qualquer coisa antes de gerar.
                </span>
              </div>

              {/* Interruptor do modo economico. Ligado (padrao): fluxo atual.
                  Desligado: estilo fixo num modelo economico. */}
              <label className="criacao-linha-interruptor">
                <span className="criacao-linha-interruptor-texto">
                  <span className="criacao-linha-interruptor-titulo">
                    Aprimorar com IA
                  </span>
                  <span className="dica">
                    Ligado, a IA capricha no design com o modelo escolhido.
                    Desligado, um modelo econômico usa um estilo pronto e monta o
                    site com o seu conteúdo: mais barato, resultado mais simples.
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
            </div>
          )}
        </div>
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
