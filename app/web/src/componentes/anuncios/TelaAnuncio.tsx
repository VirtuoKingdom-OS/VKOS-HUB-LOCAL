// A pagina da campanha de Google Ads, so leitura. Tela cheia irma da TelaSite,
// na rota /anuncio/<pasta>.
//
// O QUE ELA RESOLVE. O dono vai colar esta campanha no painel do Google, um
// campo por vez, e o painel RECUSA campo que passa do limite de caracteres.
// Entao a tela faz duas coisas bem: mostra o tamanho de todo campo que o Google
// limita, e entrega o texto exato no botao de copiar. Nada mais.
//
// A CONFERENCIA E DO SERVIDOR. O GET /api/anuncios/:pasta ja devolve a lista de
// violacoes com o caminho endereçavel de cada campo
// (campanha.grupos[1].anuncios[0].titulos[6]). A tela remonta esse caminho e
// marca o campo. Ela nao decide limite nenhum: a tabela em tipos/anuncios.ts so
// escreve o "/30" do contador, e o tipo dela obriga a bater com o servidor.
//
// OS NOVE BLOCOS SAO VISOES sobre a arvore da peca, nao nove campos de topo. O
// bloco de palavras-chave percorre os grupos, o de anuncios tambem. Cada bloco e
// uma SECAO, com titulo, fio e espaco: cartao aqui seria cartao dentro de cartao.
//
// A TELA E UMA CAIXA FECHADA, e isso e requisito, nao estilo. Ver o cabecalho de
// anuncios.css: em 2026-08-01, num notebook de 899x469, clicar numa aba do
// indice levava o cabecalho pra fora da janela e ele nunca voltava. Metade da
// causa era CSS e metade era daqui: scrollIntoView rola TODO ancestral rolavel,
// inclusive o documento. Neste arquivo, quem rola e sempre um painel nomeado, e
// nunca o documento.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import {
  definirConversaAnuncio,
  ErroApi,
  obterAnuncio,
  obterConversaAnuncio,
  type RespostaAnuncio,
} from "../../api/cliente";
import {
  contarCaracteres,
  MAX_CARACTERES,
  type Conversao,
  type Destino,
  type GrupoAnuncio,
  type PalavraChave,
  type PecaAnuncio,
  type Violacao,
} from "../../tipos/anuncios";
import { formatarTema } from "../telas/fluxos";
import {
  IconeAlerta,
  IconeAnuncio,
  IconeCheck,
  IconeDuplicar,
  IconeRaio,
  IconeSeta,
  IconeX,
} from "../comum/Icones";
import { Conversa } from "../comum/Conversa";
import { sessaoEstaRodando, usarConversaSessao } from "../comum/usarConversaSessao";
import { irParaTela } from "../layout/rotas";
import "./anuncios.css";

interface Props {
  // Subpasta da peca, um segmento ja decodificado.
  pasta: string;
}

// O painel onde tudo isto vai ser colado. E a proxima acao da tela, e a unica
// acao principal dela.
const PAINEL_GOOGLE = "https://ads.google.com/aw/campaigns";

// Os nove blocos, na ordem de leitura. O indice ancorado no topo sai daqui.
const BLOCOS = [
  { id: "estrategia", rotulo: "Estratégia" },
  { id: "estrutura", rotulo: "Estrutura" },
  { id: "palavras-chave", rotulo: "Palavras-chave" },
  { id: "negativas", rotulo: "Negativas" },
  { id: "anuncios", rotulo: "Anúncios" },
  { id: "recursos", rotulo: "Recursos" },
  { id: "orcamento", rotulo: "Orçamento" },
  { id: "conversoes", rotulo: "Conversões" },
  { id: "publicacao", rotulo: "Publicação" },
] as const;

// ONDE A CONVERSA VIRA COLUNA. O numero e medido, e o porque esta por extenso
// no fim de anuncios.css: abaixo daqui a coluna de leitura pagava a conta
// sozinha (493px de leitura contra 360px de conversa, em 1093x614), entao a
// conversa deixa de disputar largura e vira gaveta.
const DUAS_COLUNAS = "(min-width: 1200px)";

// Diz se cabem duas colunas AGORA, e continua dizendo quando a janela muda de
// tamanho. Sem o ouvinte, quem maximiza a janela ficaria com a gaveta pra
// sempre, e quem restaura ficaria com a leitura espremida pra sempre.
function usarDuasColunas(): boolean {
  const [duas, setDuas] = useState(() => window.matchMedia(DUAS_COLUNAS).matches);
  useEffect(() => {
    const consulta = window.matchMedia(DUAS_COLUNAS);
    const aoMudar = (evento: MediaQueryListEvent) => setDuas(evento.matches);
    setDuas(consulta.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);
  return duas;
}

const ROTULO_DESTINO: Record<Destino["tipo"], string> = {
  whatsapp: "WhatsApp",
  landing: "Página de destino",
  agendamento: "Agendamento",
  telefone: "Telefone",
};

const ROTULO_CORRESPONDENCIA: Record<PalavraChave["correspondencia"], string> = {
  ampla: "Ampla",
  frase: "Frase",
  exata: "Exata",
};

const ROTULO_CONVERSAO: Record<Conversao["tipo"], string> = {
  whatsapp: "WhatsApp",
  formulario: "Formulário",
  ligacao: "Ligação",
  agendamento: "Agendamento",
  outro: "Outro",
};

// A palavra-chave no formato que o painel do Google entende: colchete e exata,
// aspas e frase, sem sinal e ampla. Copiar so o texto perderia a correspondencia
// que a IA escolheu, e o dono teria que remarcar uma por uma.
function sintaxeGoogle(palavra: PalavraChave): string {
  if (palavra.correspondencia === "exata") return `[${palavra.texto}]`;
  if (palavra.correspondencia === "frase") return `"${palavra.texto}"`;
  return palavra.texto;
}

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarMoeda(valor: number): string {
  return MOEDA.format(valor);
}

// A data de geracao, legivel. Data quebrada nao derruba nada: o campo e texto
// livre no schema de proposito.
function formatarQuando(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// A frase de um aviso de QUANTIDADE. Ela vem sem texto: o que saiu da faixa e o
// numero de itens, e o dono precisa saber pra que lado.
function frasePorQuantidade(violacao: Violacao): string {
  const itens = violacao.tamanho === 1 ? "1 item" : `${violacao.tamanho} itens`;
  return violacao.tamanho < violacao.limite
    ? `${violacao.campo}: ${itens}. O Google pede pelo menos ${violacao.limite}.`
    : `${violacao.campo}: ${itens}. O Google aceita no máximo ${violacao.limite}.`;
}

// ===================================================================== copiar

// Copiar entrega o TEXTO EXATO: sem contador junto, sem aspas de enfeite, sem
// espaco a mais. E o que vai ser colado no painel do Google.
function BotaoCopiar({
  texto,
  rotulo,
  aoAvisar,
  compacto = true,
}: {
  texto: string;
  rotulo: string;
  aoAvisar: (mensagem: string) => void;
  // Compacto e o botao de icone que mora na linha de um campo. O de bloco leva
  // rotulo escrito, porque ele copia varias coisas de uma vez.
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const timer = window.setTimeout(() => setCopiado(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      aoAvisar(`Copiei ${rotulo}.`);
    } catch {
      aoAvisar(`Não consegui copiar ${rotulo}. Selecione o texto e use Ctrl+C.`);
    }
  }

  const classe = compacto
    ? "botao botao-p botao-icone botao-fantasma"
    : "botao botao-p botao-neutro";

  return (
    <button
      className={classe}
      onClick={() => void copiar()}
      title={`Copiar ${rotulo}`}
      aria-label={`Copiar ${rotulo}`}
    >
      {copiado ? <IconeCheck className="" /> : <IconeDuplicar className="" />}
      {!compacto && (copiado ? "Copiado" : "Copiar")}
    </button>
  );
}

// =================================================================== o campo

// Uma linha de campo que o Google limita: o texto, a contagem e o copiar.
//
// A contagem dentro do limite e informacao de rotina, entao ela e um numero
// quieto. Acima do limite ela vira selo de alerta e a linha inteira ganha fundo,
// porque esse campo o painel do Google RECUSA, e quem passa o olho precisa achar
// sem ler linha por linha.
function LinhaCampo({
  texto,
  limite,
  violacao,
  rotulo,
  aoAvisar,
}: {
  texto: string;
  limite: number;
  violacao?: Violacao;
  rotulo: string;
  aoAvisar: (mensagem: string) => void;
}) {
  const tamanho = contarCaracteres(texto);
  const estourou = violacao !== undefined;
  return (
    <li className={`item-lista anuncio-campo${estourou ? " estourado" : ""}`}>
      <span className="anuncio-campo-texto">{texto || "Vazio"}</span>
      <span className="item-lista-acoes">
        {estourou ? (
          <span
            className="selo selo-alerta"
            title={`Passa ${tamanho - limite} caractere(s) do limite de ${limite}. O painel do Google recusa este campo.`}
          >
            {tamanho}/{limite}
            <span className="so-leitor"> caracteres, acima do limite do Google</span>
          </span>
        ) : (
          <span className="anuncio-contagem" title={`${tamanho} de ${limite} caracteres`}>
            {tamanho}/{limite}
          </span>
        )}
        <BotaoCopiar texto={texto} rotulo={rotulo} aoAvisar={aoAvisar} />
      </span>
    </li>
  );
}

// Lista de campos do mesmo tipo (os titulos de um anuncio, as descricoes de um
// sitelink). O caminho de cada item e o mesmo que o servidor usa nas violacoes.
function ListaCampos({
  titulo,
  itens,
  limite,
  caminhoLista,
  erros,
  rotuloItem,
  aoAvisar,
}: {
  titulo: string;
  itens: string[];
  limite: number;
  caminhoLista: string;
  erros: Map<string, Violacao>;
  rotuloItem: (indice: number) => string;
  aoAvisar: (mensagem: string) => void;
}) {
  if (itens.length === 0) return null;
  return (
    <div className="anuncio-lista-campos">
      <h4 className="anuncio-rotulo-lista">
        {titulo}
        <span className="contagem">{itens.length}</span>
      </h4>
      <ul className="lista">
        {itens.map((texto, indice) => (
          <LinhaCampo
            key={`${caminhoLista}[${indice}]`}
            texto={texto}
            limite={limite}
            violacao={erros.get(`${caminhoLista}[${indice}]`)}
            rotulo={rotuloItem(indice)}
            aoAvisar={aoAvisar}
          />
        ))}
      </ul>
    </div>
  );
}

// Um dado de texto que o Google nao limita (o objetivo, um motivo, uma URL).
function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="anuncio-dado">
      <span className="rotulo">{rotulo}</span>
      <span className={valor ? "anuncio-dado-valor" : "anuncio-dado-vazio"}>
        {valor || "Não informado"}
      </span>
    </div>
  );
}

// Faixa dos avisos de quantidade de um bloco. Ancorada onde o problema esta, e
// nao no topo da tela: quem le "faltam sitelinks" precisa ver os sitelinks.
function FaixaAvisos({ avisos }: { avisos: Violacao[] }) {
  if (avisos.length === 0) return null;
  return (
    <div className="faixa faixa-aviso anuncio-faixa" role="status">
      <div className="faixa-texto">
        {avisos.map((aviso) => (
          <p key={`${aviso.caminho}-${aviso.campo}`}>{frasePorQuantidade(aviso)}</p>
        ))}
      </div>
    </div>
  );
}

// Selo de conferencia de um bloco, no cabecalho da secao.
function SeloDoBloco({ erros, avisos }: { erros: number; avisos: number }) {
  if (erros > 0) {
    return (
      <span className="selo selo-alerta">
        {erros === 1 ? "1 campo acima do limite" : `${erros} campos acima do limite`}
      </span>
    );
  }
  if (avisos > 0) {
    return <span className="selo selo-aviso">{avisos === 1 ? "1 aviso" : `${avisos} avisos`}</span>;
  }
  return null;
}

// ==================================================================== a tela

type Situacao =
  | { estado: "carregando" }
  | { estado: "pronta"; dados: RespostaAnuncio }
  | { estado: "ausente" }
  // O detalhe e a mensagem literal do servidor, que ja diz QUAL campo falhou.
  // Ela fica embaixo de uma frase que o dono entende, nunca sozinha.
  | { estado: "erro"; titulo: string; explicacao: string; detalhe: string };

export default function TelaAnuncio({ pasta }: Props) {
  const { pecas, carregandoInicial, trocandoWorkspace, avisoPecas } = usarEstado();
  const carregandoPeca = carregandoInicial || trocandoWorkspace;
  // O tipo da peca, e nao o objeto: a lista global troca de referencia a cada
  // pecas:atualizadas, e depender do objeto refaria a busca a cada aviso.
  const tipoDaPeca = pecas.find((p) => p.pasta === pasta)?.tipo;

  const [situacao, setSituacao] = useState<Situacao>({ estado: "carregando" });
  const [aviso, setAviso] = useState("");

  // Um lugar so pra dizer o que aconteceu no copiar. Quarenta linhas de campo
  // com quarenta avisos proprios seria quarenta regioes vivas competindo.
  const avisar = useCallback((mensagem: string) => setAviso(mensagem), []);
  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(""), 2600);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  useEffect(() => {
    if (carregandoPeca) return;
    // Peca que nao existe, ou que existe e nao e anuncio, nao vira requisicao:
    // um 404 de propósito e barulho no console e nao diz mais do que ja se sabe.
    if (tipoDaPeca !== "anuncio") {
      setSituacao({ estado: "ausente" });
      return;
    }
    let vivo = true;
    setSituacao({ estado: "carregando" });
    obterAnuncio(pasta)
      .then((dados) => {
        if (vivo) setSituacao({ estado: "pronta", dados });
      })
      .catch((erro: unknown) => {
        if (!vivo) return;
        // Peca apagada entre a lista e a busca: e o mesmo caso do "ausente".
        if (erro instanceof ErroApi && erro.status === 404) {
          setSituacao({ estado: "ausente" });
          return;
        }
        if (erro instanceof ErroApi && erro.status === 422) {
          setSituacao({
            estado: "erro",
            titulo: "Esta campanha está fora do formato",
            explicacao:
              "O arquivo da campanha existe, mas um campo dele não veio como o esperado. Sem esse campo a página não consegue montar a campanha inteira.",
            detalhe: erro.message,
          });
          return;
        }
        setSituacao({
          estado: "erro",
          titulo: "Não consegui abrir esta campanha",
          explicacao:
            erro instanceof Error ? erro.message : "O servidor respondeu com erro.",
          detalhe: "",
        });
      });
    return () => {
      vivo = false;
    };
  }, [pasta, tipoDaPeca, carregandoPeca]);

  // A TELA ATUALIZA SOZINHA. Quando a conversa ao lado reescreve o anuncio.json,
  // o observador de arquivos do servidor avisa e a peça é relida aqui. Não há
  // botão de atualizar, e não há recarregar a página.
  //
  // Duas coisas que valem para quem for mexer nisto:
  //
  // 1. O OBSERVADOR TEM DEBOUNCE DE 1 SEGUNDO. Entre a IA terminar de gravar e a
  //    tela mudar existe essa espera, e ela é do servidor, não daqui.
  // 2. A RELEITURA É SILENCIOSA: ela não passa pelo estado "carregando" e não
  //    derruba a tela quando falha. O observador avisa por qualquer escrita na
  //    pasta, inclusive no meio de uma gravação, e um JSON pela metade lido nesse
  //    instante viraria uma tela de erro que se conserta sozinha um segundo
  //    depois. Campanha realmente quebrada aparece na próxima abertura da tela,
  //    onde o erro é dito por inteiro.
  useEffect(() => {
    if (avisoPecas === 0 || carregandoPeca || tipoDaPeca !== "anuncio") return;
    let vivo = true;
    obterAnuncio(pasta)
      .then((dados) => {
        if (vivo) setSituacao({ estado: "pronta", dados });
      })
      .catch(() => {
        // Silêncio de propósito. Ver o comentário acima.
      });
    return () => {
      vivo = false;
    };
  }, [avisoPecas, pasta, tipoDaPeca, carregandoPeca]);

  const dados = situacao.estado === "pronta" ? situacao.dados : null;

  // As violacoes de caractere, endereçadas pelo caminho que o servidor mandou.
  const erros = useMemo(() => {
    const mapa = new Map<string, Violacao>();
    for (const violacao of dados?.violacoes ?? []) {
      if (violacao.gravidade === "erro") mapa.set(violacao.caminho, violacao);
    }
    return mapa;
  }, [dados]);

  const avisos = useMemo(
    () => (dados?.violacoes ?? []).filter((v) => v.gravidade === "aviso"),
    [dados],
  );

  const voltar = useCallback(() => {
    let mesmaOrigem = false;
    try {
      mesmaOrigem =
        !!document.referrer &&
        new URL(document.referrer).origin === window.location.origin;
    } catch {
      mesmaOrigem = false;
    }
    if (window.history.length > 1 && mesmaOrigem) window.history.back();
    else irParaTela("inicio");
  }, []);

  const nomeDaPasta = formatarTema(pasta.replace(/^\d{4}-\d{2}-\d{2}-/, ""));

  if (carregandoPeca || situacao.estado === "carregando") {
    return (
      <section className="tela tela-anuncio">
        <header className="tela-topo">
          <BotaoVoltar aoVoltar={voltar} />
          <div className="tela-topo-texto">
            <h1>{nomeDaPasta}</h1>
            <p>Abrindo a campanha.</p>
          </div>
        </header>
        <div className="anuncio-esqueleto" aria-hidden="true">
          <div className="esqueleto esqueleto-linha anuncio-esqueleto-titulo" />
          <div className="esqueleto esqueleto-linha" />
          <div className="esqueleto esqueleto-linha" />
          <div className="esqueleto esqueleto-linha anuncio-esqueleto-titulo" />
          <div className="esqueleto esqueleto-linha" />
          <div className="esqueleto esqueleto-linha" />
        </div>
      </section>
    );
  }

  if (situacao.estado !== "pronta") {
    const ausente = situacao.estado === "ausente";
    return (
      <section className="tela tela-anuncio tela-anuncio-erro">
        <div className="vazio">
          <IconeAnuncio className="" />
          <h2>{ausente ? "Campanha não encontrada" : situacao.titulo}</h2>
          <p>
            {ausente
              ? "Esta peça não existe mais, ou ela não é uma campanha de anúncio. Volte pro workspace e escolha outra."
              : situacao.explicacao}
          </p>
          {!ausente && situacao.detalhe && (
            <p className="anuncio-erro-detalhe">{situacao.detalhe}</p>
          )}
          <button className="botao botao-principal" onClick={voltar}>
            Voltar
          </button>
        </div>
      </section>
    );
  }

  return (
    <Campanha
      pasta={pasta}
      peca={situacao.dados.peca}
      erros={erros}
      avisos={avisos}
      aviso={aviso}
      aoAvisar={avisar}
      aoVoltar={voltar}
    />
  );
}

function BotaoVoltar({ aoVoltar }: { aoVoltar: () => void }) {
  return (
    <button
      className="botao botao-icone botao-neutro anuncio-voltar"
      onClick={aoVoltar}
      title="Voltar"
      aria-label="Voltar"
    >
      <IconeSeta className="" />
    </button>
  );
}

// A campanha inteira. Separada da busca de propósito: aqui dentro a peca existe,
// entao nada precisa de "se existir".
function Campanha({
  pasta,
  peca,
  erros,
  avisos,
  aviso,
  aoAvisar,
  aoVoltar,
}: {
  pasta: string;
  peca: PecaAnuncio;
  erros: Map<string, Violacao>;
  avisos: Violacao[];
  aviso: string;
  aoAvisar: (mensagem: string) => void;
  aoVoltar: () => void;
}) {
  const refBlocos = useRef<HTMLDivElement>(null);
  const refAbas = useRef<HTMLElement>(null);
  const refConversa = useRef<HTMLElement>(null);
  const refBotaoConversa = useRef<HTMLButtonElement>(null);
  const [blocoAtivo, setBlocoAtivo] = useState<string>(BLOCOS[0].id);

  const duasColunas = usarDuasColunas();
  // A LARGURA DECIDE O MODO, E O MODO DECIDE O ESTADO. Em duas colunas a
  // conversa nasce aberta ao lado, porque ela é o motivo de esta tela existir e
  // não ser um arquivo aberto no bloco de notas. Em gaveta ela nasce fechada,
  // porque quem abre esta página vem LER a campanha, e a gaveta cobre a leitura.
  const [conversaAberta, setConversaAberta] = useState(duasColunas);
  useEffect(() => setConversaAberta(duasColunas), [duasColunas]);

  // Enquanto a rolagem disparada por um clique não chega no destino, é ela quem
  // manda no índice. Sem isto o marcador voltava pro bloco anterior no meio do
  // caminho, e o último bloco nunca ficava ativo: ele é curto demais pra subir
  // até o topo, então o painel para antes e o cálculo por posição elegia o
  // bloco de cima.
  const alvoDoClique = useRef<string | null>(null);

  // Qual bloco esta sendo lido. Sem isto o indice vira uma fileira de atalhos
  // que nunca diz onde a pessoa esta, e nove blocos de rolagem longa e
  // exatamente onde essa informacao vale.
  useEffect(() => {
    const area = refBlocos.current;
    if (!area) return;
    let agendado = false;
    const medir = () => {
      agendado = false;
      const noFim = area.scrollTop + area.clientHeight >= area.scrollHeight - 4;
      let atual = BLOCOS[BLOCOS.length - 1].id as string;
      if (!noFim) {
        const base = area.getBoundingClientRect().top;
        atual = BLOCOS[0].id;
        for (const bloco of BLOCOS) {
          const alvo = area.querySelector<HTMLElement>(`#bloco-${bloco.id}`);
          if (alvo && alvo.getBoundingClientRect().top - base <= 24) atual = bloco.id;
        }
      }
      if (alvoDoClique.current) {
        // No fim do painel o pedido é atendido do jeito que dá: o bloco não
        // chega ao topo, mas foi ele que a pessoa pediu, e mentir aqui faria o
        // índice marcar um bloco que ninguém escolheu.
        if (noFim) atual = alvoDoClique.current;
        else if (atual !== alvoDoClique.current) return;
        alvoDoClique.current = null;
      }
      setBlocoAtivo(atual);
    };
    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      window.requestAnimationFrame(medir);
    };
    area.addEventListener("scroll", aoRolar, { passive: true });
    medir();
    return () => area.removeEventListener("scroll", aoRolar);
  }, []);

  // A aba ativa fica sempre à vista. Só o scrollLeft da própria barra se mexe:
  // scrollIntoView rolaria os ancestrais junto, que é o defeito que esta rodada
  // consertou.
  useEffect(() => {
    const barra = refAbas.current;
    const aba = barra?.querySelector<HTMLElement>(`[data-bloco="${blocoAtivo}"]`);
    if (!barra || !aba) return;
    const folga = 24;
    const inicio = aba.offsetLeft - folga;
    const fim = aba.offsetLeft + aba.offsetWidth + folga;
    if (inicio < barra.scrollLeft) barra.scrollLeft = inicio;
    else if (fim > barra.scrollLeft + barra.clientWidth) {
      barra.scrollLeft = fim - barra.clientWidth;
    }
  }, [blocoAtivo]);

  const fecharConversa = useCallback(() => {
    setConversaAberta(false);
    refBotaoConversa.current?.focus();
  }, []);

  // Gaveta aberta: o foco entra nela, senão o teclado teria que percorrer a
  // campanha inteira pra chegar no campo. E o Esc fecha e devolve o foco pro
  // botão que abriu, que é o caminho de volta esperado.
  useEffect(() => {
    if (!conversaAberta || duasColunas) return;
    refConversa.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fecharConversa();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [conversaAberta, duasColunas, fecharConversa]);

  function irParaBloco(id: string) {
    const area = refBlocos.current;
    const alvo = area?.querySelector<HTMLElement>(`#bloco-${id}`);
    if (!area || !alvo) return;
    alvoDoClique.current = id;
    setBlocoAtivo(id);
    // scrollTo, e nunca scrollIntoView: só este painel se move. O "behavior" vem
    // do scroll-behavior da folha, que o movimento reduzido já desliga.
    area.scrollTo({ top: alvo.offsetTop });
  }

  const totalErros = erros.size;
  const gerado = formatarQuando(peca.geradoEm);

  // Cada violacao mora num dos dois blocos que tem campo com limite.
  const errosDaCampanha = [...erros.values()].filter((v) => v.caminho.startsWith("campanha."));
  const errosDosRecursos = [...erros.values()].filter((v) => v.caminho.startsWith("recursos."));
  const avisosDosRecursos = avisos.filter((v) => v.caminho.startsWith("recursos."));
  const avisosDaCampanha = avisos.filter((v) => v.caminho.startsWith("campanha."));

  return (
    <section className="tela tela-anuncio">
      <header className="tela-topo">
        <BotaoVoltar aoVoltar={aoVoltar} />
        <div className="tela-topo-texto">
          <h1 title={peca.campanha.nome}>{peca.campanha.nome}</h1>
          <p>
            Google, rede de busca.{gerado ? ` Gerado em ${gerado}.` : ""} Copie campo a
            campo e cole no painel.
          </p>
        </div>
        {/* O cabeçalho é a receita da fundação e nada mais: título, e à direita
            uma ação principal. O veredito da conferência desceu pro índice em
            2026-08-01, onde ele fica ao lado da navegação que leva até o
            problema, e o cabeçalho parou de estourar em tela de notebook. */}
        <div className="tela-topo-acoes">
          <button
            ref={refBotaoConversa}
            className="botao botao-neutro"
            onClick={() => setConversaAberta((aberta) => !aberta)}
            aria-expanded={conversaAberta}
            aria-controls="conversa-da-campanha"
            title="A conversa que escreveu esta campanha. Peça uma mudança e a página muda sozinha."
          >
            <IconeRaio className="" />
            Conversa
          </button>
          <a
            className="botao botao-principal"
            href={PAINEL_GOOGLE}
            target="_blank"
            rel="noreferrer"
            title="Abre o painel do Google Ads em outra aba. É lá que esta campanha é montada."
          >
            Abrir o Google Ads
          </a>
        </div>
      </header>

      <div className="anuncio-indice">
        <nav className="abas anuncio-abas" aria-label="Blocos da campanha" ref={refAbas}>
          {BLOCOS.map((bloco) => (
            <button
              key={bloco.id}
              data-bloco={bloco.id}
              className={`aba${blocoAtivo === bloco.id ? " ativa" : ""}`}
              onClick={() => irParaBloco(bloco.id)}
              aria-current={blocoAtivo === bloco.id ? "true" : undefined}
            >
              {bloco.rotulo}
            </button>
          ))}
        </nav>
        {/* O veredito não rola junto com as abas: ele é o resumo do estado da
            campanha inteira e some fácil no meio de nove atalhos. */}
        <div className="anuncio-veredito">
          {totalErros > 0 ? (
            <span className="selo selo-alerta">
              {totalErros === 1
                ? "1 campo acima do limite"
                : `${totalErros} campos acima do limite`}
            </span>
          ) : (
            <span className="selo">Tudo dentro dos limites</span>
          )}
          {avisos.length > 0 && (
            <span className="selo selo-aviso">
              {avisos.length === 1 ? "1 aviso" : `${avisos.length} avisos`}
            </span>
          )}
        </div>
      </div>

      {/* A leitura e a conversa que continua a mesma sessão que escreveu a
          campanha. Acima de 1200px são duas colunas; abaixo, a conversa vira
          gaveta sobre a leitura e a coluna de leitura fica com a largura toda. */}
      <div className="anuncio-corpo">
        <div className="anuncio-blocos" ref={refBlocos}>
          <div className="anuncio-coluna">
            <BlocoEstrategia peca={peca} aoAvisar={aoAvisar} />
            <BlocoEstrutura peca={peca} aoAvisar={aoAvisar} />
            <BlocoPalavras peca={peca} aoAvisar={aoAvisar} />
            <BlocoNegativas peca={peca} aoAvisar={aoAvisar} />
            <BlocoAnuncios
              peca={peca}
              erros={erros}
              contagemErros={errosDaCampanha.length}
              avisos={avisosDaCampanha}
              aoAvisar={aoAvisar}
            />
            <BlocoRecursos
              peca={peca}
              erros={erros}
              contagemErros={errosDosRecursos.length}
              avisos={avisosDosRecursos}
              aoAvisar={aoAvisar}
            />
            <BlocoOrcamento peca={peca} />
            <BlocoConversoes peca={peca} />
            <BlocoPublicacao peca={peca} />
          </div>
        </div>

        {/* A conversa continua MONTADA quando fecha, e some por CSS. Assim o
            rascunho que o dono estava escrevendo sobrevive a fechar e abrir, e
            a sessão continua ouvindo o servidor com a gaveta fechada. */}
        <aside
          id="conversa-da-campanha"
          ref={refConversa}
          tabIndex={-1}
          className={`anuncio-conversa${conversaAberta ? " aberta" : ""}`}
          aria-label="Conversa sobre a campanha"
        >
          <ConversaDaCampanha
            pasta={pasta}
            nomeCampanha={peca.campanha.nome}
            aoRecolher={fecharConversa}
          />
        </aside>
      </div>

      {/* O retorno do copiar, num lugar só. Ele fica parado enquanto o conteúdo
          rola, então a sombra de popover é a certa. */}
      <p className={`anuncio-aviso${aviso ? " visivel" : ""}`} role="status">
        {aviso}
      </p>
    </section>
  );
}

// =============================================================== a conversa

// A CONVERSA QUE CONTINUA A MESMA SESSÃO QUE ESCREVEU A CAMPANHA.
//
// O que faz isto valer a pena não é o chat: é a CONTINUIDADE. A sessão que
// gerou o anuncio.json nasceu com o diretório de trabalho na pasta da peça
// (Fase 2), com o Cérebro, a skill e o contrato do JSON no contexto dela.
// Retomar aquela sessão por --resume significa que "troca os títulos do grupo 2
// por ângulo de urgência" já sabe quais são os grupos, qual é a voz do negócio e
// que título tem 30 caracteres. Um chat novo saberia nada disso.
//
// E o mesmo confinamento vem junto: com o cwd na pasta da peça, a sessão
// retomada pode reescrever o anuncio.json e nada mais. O Cérebro fica fora do
// alcance dela por construção, não por instrução no prompt.
//
// QUEM GUARDA O VÍNCULO É O SERVIDOR, em app/dados/workspaces/<id>/anuncios.json.
// Não dentro do anuncio.json, que a IA reescreve; não no estado do React, que
// morre quando o dono sai da tela e volta.
//
// QUANDO A SESSÃO MORREU, ISSO É DITO NA CARA. Nunca fingir que continua uma
// conversa que acabou: se a continuidade não é real, o dono precisa saber, senão
// ele vai escrever "muda o que a gente falou" para uma IA que nunca falou nada.
function ConversaDaCampanha({
  pasta,
  nomeCampanha,
  aoRecolher,
}: {
  pasta: string;
  nomeCampanha: string;
  aoRecolher: () => void;
}) {
  const { sessoes, criarSessao } = usarEstado();
  // null enquanto o servidor não respondeu. Sem isto a tela mostraria "esta
  // campanha não tem conversa" por uma fração de segundo em toda abertura.
  const [vinculoLido, setVinculoLido] = useState(false);
  const [sessaoVinculada, setSessaoVinculada] = useState<string | null>(null);
  const [resgatando, setResgatando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setVinculoLido(false);
    setSessaoVinculada(null);
    setResgatando(false);
    obterConversaAnuncio(pasta)
      .then((resposta) => {
        if (!vivo) return;
        setSessaoVinculada(resposta.sessaoId);
        setVinculoLido(true);
      })
      .catch(() => {
        // Sem vínculo legível, o caminho é o mesmo de peça sem conversa: abrir
        // uma nova. Ficar sem chat por causa do registro seria pior.
        if (vivo) setVinculoLido(true);
      });
    return () => {
      vivo = false;
    };
  }, [pasta]);

  const sessao = sessaoVinculada
    ? sessoes.find((s) => s.id === sessaoVinculada)
    : undefined;
  const rodando = sessaoEstaRodando(sessao?.status);

  // MORTA é uma das duas coisas: a sessão sumiu do registro do Hub, ou ela está
  // parada sem o id da conversa do provedor. A segunda é a que pega o Hub
  // reiniciado no meio de uma geração: o gerenciador recusa retomar sem
  // sessionIdClaude, e recusar depois de a pessoa escrever seria pior do que
  // avisar antes.
  const morta =
    vinculoLido &&
    sessaoVinculada !== null &&
    (!sessao || (!rodando && !sessao.sessionIdClaude));
  const semConversa = vinculoLido && sessaoVinculada === null;
  const precisaDeOutra = morta || semConversa;

  const abrirOutra = useCallback(
    async (texto: string) => {
      const nova = await criarSessao({
        titulo: `Campanha, ${nomeCampanha}`,
        prompt: texto,
        // A mesma máquina da Fase 2: o servidor valida a pasta pela barreira de
        // peça e confina o diretório de trabalho nela. A diferença é que este
        // caminho nunca cria peça, e o anuncio.json atual vai embutido.
        skill: "conversa-anuncio",
        pastaAlvo: pasta,
      });
      try {
        await definirConversaAnuncio(pasta, nova.id);
      } catch {
        // A sessão já está de pé e ela é o que importa agora. Vínculo perdido
        // custa uma conversa nova na próxima visita, não esta.
      }
      setSessaoVinculada(nova.id);
      setResgatando(false);
    },
    [pasta, nomeCampanha, criarSessao],
  );

  const conversa = usarConversaSessao(precisaDeOutra ? null : sessaoVinculada, {
    aoAbrirSessao: abrirOutra,
  });

  const mostrarFaixa = precisaDeOutra && !resgatando;

  return (
    <Conversa
      turnos={conversa.turnos}
      pendentes={conversa.pendentes}
      respostaViva={conversa.respostaViva}
      ferramentas={conversa.ferramentasVivas}
      rodando={conversa.rodando}
      enviando={conversa.enviando}
      erro={conversa.erro}
      aoEnviar={(texto) => void conversa.enviar(texto)}
      titulo="Conversa"
      rotuloCampo="O que mudar nesta campanha"
      campoDesligado={!vinculoLido || mostrarFaixa}
      dicaCampoDesligado={
        vinculoLido ? "Comece outra conversa para escrever aqui." : "Abrindo a conversa..."
      }
      acoesCabecalho={
        <button
          className="botao botao-p botao-icone botao-fantasma"
          onClick={aoRecolher}
          title="Recolher a conversa"
          aria-label="Recolher a conversa"
        >
          <IconeX className="" />
        </button>
      }
      avisoNoRodape={
        mostrarFaixa ? (
          <div
            className={`faixa anuncio-conversa-faixa${morta ? " faixa-alerta" : ""}`}
            role="status"
          >
            {morta && <IconeAlerta className="" />}
            <div className="faixa-texto">
              {morta
                ? "A conversa que escreveu esta campanha não existe mais, então não dá para continuar de onde ela parou. Uma conversa nova começa com a campanha atual em mãos, presa nesta mesma pasta."
                : "Esta campanha ainda não tem uma conversa. Uma conversa nova começa com a campanha atual em mãos, presa nesta mesma pasta."}
            </div>
            <div className="faixa-acoes">
              <button
                className="botao botao-p botao-neutro"
                onClick={() => setResgatando(true)}
              >
                Começar outra conversa
              </button>
            </div>
          </div>
        ) : null
      }
      // Com a faixa na tela, o estado vazio NÃO repete o que ela já diz. Dois
      // textos dizendo a mesma coisa num painel de 400px não cabiam, e num
      // notebook de 469px de altura o segundo aparecia cortado no meio de uma
      // linha. A faixa fica com a explicação e com a ação, que é onde a pessoa
      // vai clicar; o vazio fica só com o nome do lugar.
      vazio={
        <div className="vazio anuncio-conversa-vazio">
          <IconeRaio className="" />
          <h2>Peça uma mudança</h2>
          {!precisaDeOutra && (
            <p>
              Esta é a mesma conversa que escreveu a campanha. Peça o que quiser, tipo
              “troca os títulos do grupo 2 por ângulo de urgência”, e a página muda
              sozinha.
            </p>
          )}
        </div>
      }
    />
  );
}

// ================================================================== 1. estrategia

function BlocoEstrategia({
  peca,
  aoAvisar,
}: {
  peca: PecaAnuncio;
  aoAvisar: (mensagem: string) => void;
}) {
  const { estrategia } = peca;
  return (
    <section className="secao" id="bloco-estrategia">
      <div className="secao-topo">
        <h2>Estratégia</h2>
      </div>
      <div className="anuncio-dados">
        <Dado rotulo="Objetivo" valor={estrategia.objetivo} />
        <Dado rotulo="Oferta" valor={estrategia.oferta} />
        <Dado rotulo="Público" valor={estrategia.publico} />
        <Dado rotulo="Dor principal" valor={estrategia.dorPrincipal} />
        <Dado rotulo="Praças" valor={estrategia.localizacoes.join(", ")} />
        <Dado rotulo="Idioma" valor={estrategia.idioma} />
      </div>

      <h3 className="anuncio-subtitulo">Provas</h3>
      {estrategia.provas.length === 0 ? (
        <p className="anuncio-dado-vazio">Nenhuma prova declarada.</p>
      ) : (
        <ul className="anuncio-marcadores">
          {estrategia.provas.map((prova) => (
            <li key={prova}>{prova}</li>
          ))}
        </ul>
      )}

      <h3 className="anuncio-subtitulo">Destino do clique</h3>
      <div className="anuncio-dados">
        <Dado rotulo="Onde o clique cai" valor={ROTULO_DESTINO[estrategia.destino.tipo]} />
        <div className="anuncio-dado">
          <span className="rotulo">Endereço</span>
          <span className="anuncio-dado-linha">
            <span className="anuncio-dado-valor anuncio-url">{estrategia.destino.url}</span>
            <BotaoCopiar
              texto={estrategia.destino.url}
              rotulo="o endereço de destino"
              aoAvisar={aoAvisar}
            />
          </span>
        </div>
      </div>
      {estrategia.destino.observacao && (
        <p className="anuncio-observacao">{estrategia.destino.observacao}</p>
      )}
    </section>
  );
}

// =================================================================== 2. estrutura

function BlocoEstrutura({
  peca,
  aoAvisar,
}: {
  peca: PecaAnuncio;
  aoAvisar: (mensagem: string) => void;
}) {
  const { campanha } = peca;
  return (
    <section className="secao" id="bloco-estrutura">
      <div className="secao-topo">
        <h2>Estrutura</h2>
        <span className="contagem">{campanha.grupos.length}</span>
      </div>
      <div className="anuncio-dado">
        <span className="rotulo">Nome da campanha</span>
        <span className="anuncio-dado-linha">
          <span className="anuncio-dado-valor">{campanha.nome}</span>
          <BotaoCopiar texto={campanha.nome} rotulo="o nome da campanha" aoAvisar={aoAvisar} />
        </span>
      </div>
      <ul className="lista anuncio-grupos">
        {campanha.grupos.map((grupo) => (
          <li className="item-lista" key={grupo.id}>
            <span className="item-lista-texto">
              <span className="item-lista-titulo">{grupo.nome}</span>
              <span className="item-lista-meta">{grupo.tema}</span>
            </span>
            <span className="item-lista-acoes">
              <span className="anuncio-contagem">
                {grupo.palavrasChave.length} palavras, {grupo.anuncios.length}{" "}
                {grupo.anuncios.length === 1 ? "anúncio" : "anúncios"}
              </span>
              <BotaoCopiar texto={grupo.nome} rotulo={`o nome do grupo ${grupo.nome}`} aoAvisar={aoAvisar} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ============================================================== 3. palavras-chave

function BlocoPalavras({
  peca,
  aoAvisar,
}: {
  peca: PecaAnuncio;
  aoAvisar: (mensagem: string) => void;
}) {
  return (
    <section className="secao" id="bloco-palavras-chave">
      <div className="secao-topo">
        <h2>Palavras-chave</h2>
        <p>A cópia sai no formato do Google: [exata], "frase" e ampla sem sinal.</p>
      </div>
      {peca.campanha.grupos.map((grupo) => (
        <PalavrasDoGrupo key={grupo.id} grupo={grupo} aoAvisar={aoAvisar} />
      ))}
    </section>
  );
}

function PalavrasDoGrupo({
  grupo,
  aoAvisar,
}: {
  grupo: GrupoAnuncio;
  aoAvisar: (mensagem: string) => void;
}) {
  const bloco = grupo.palavrasChave.map(sintaxeGoogle).join("\n");
  return (
    <div className="anuncio-grupo">
      <div className="anuncio-grupo-topo">
        <h3 className="anuncio-subtitulo">{grupo.nome}</h3>
        {grupo.palavrasChave.length > 0 && (
          <BotaoCopiar
            texto={bloco}
            rotulo={`as ${grupo.palavrasChave.length} palavras-chave do grupo ${grupo.nome}`}
            aoAvisar={aoAvisar}
            compacto={false}
          />
        )}
      </div>
      {grupo.palavrasChave.length === 0 ? (
        <p className="anuncio-dado-vazio">Este grupo ficou sem palavra-chave.</p>
      ) : (
        <div className="anuncio-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Palavra-chave</th>
                <th>Correspondência</th>
                <th>Por que ela está aqui</th>
              </tr>
            </thead>
            <tbody>
              {grupo.palavrasChave.map((palavra) => (
                <tr key={`${palavra.correspondencia}-${palavra.texto}`}>
                  <td className="anuncio-celula-chave">{sintaxeGoogle(palavra)}</td>
                  {/* Correspondência é PROPRIEDADE da palavra, não estado dela:
                      vinte e uma pílulas numa coluna seriam decoração, e selo
                      não é enfeite. */}
                  <td className="anuncio-celula-tipo">
                    {ROTULO_CORRESPONDENCIA[palavra.correspondencia]}
                  </td>
                  <td className="anuncio-celula-motivo">{palavra.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =================================================================== 4. negativas

function BlocoNegativas({
  peca,
  aoAvisar,
}: {
  peca: PecaAnuncio;
  aoAvisar: (mensagem: string) => void;
}) {
  const bloco = peca.negativas.map((n) => n.texto).join("\n");
  return (
    <section className="secao" id="bloco-negativas">
      <div className="secao-topo">
        <h2>Negativas</h2>
        <span className="contagem">{peca.negativas.length}</span>
        {peca.negativas.length > 0 && (
          <BotaoCopiar
            texto={bloco}
            rotulo={`as ${peca.negativas.length} negativas`}
            aoAvisar={aoAvisar}
            compacto={false}
          />
        )}
      </div>
      {peca.negativas.length === 0 ? (
        <p className="anuncio-dado-vazio">Nenhuma palavra negativa nesta campanha.</p>
      ) : (
        <div className="anuncio-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Não aparecer para</th>
                <th>Por quê</th>
              </tr>
            </thead>
            <tbody>
              {peca.negativas.map((negativa) => (
                <tr key={negativa.texto}>
                  <td className="anuncio-celula-chave">{negativa.texto}</td>
                  <td className="anuncio-celula-motivo">{negativa.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ==================================================================== 5. anuncios

function BlocoAnuncios({
  peca,
  erros,
  contagemErros,
  avisos,
  aoAvisar,
}: {
  peca: PecaAnuncio;
  erros: Map<string, Violacao>;
  contagemErros: number;
  avisos: Violacao[];
  aoAvisar: (mensagem: string) => void;
}) {
  return (
    <section className="secao" id="bloco-anuncios">
      <div className="secao-topo">
        <h2>Anúncios</h2>
        <SeloDoBloco erros={contagemErros} avisos={avisos.length} />
      </div>
      <FaixaAvisos avisos={avisos} />
      {peca.campanha.grupos.map((grupo, indiceGrupo) => (
        <div className="anuncio-grupo" key={grupo.id}>
          <h3 className="anuncio-subtitulo">{grupo.nome}</h3>
          {grupo.anuncios.length === 0 ? (
            <p className="anuncio-dado-vazio">Este grupo ficou sem anúncio.</p>
          ) : (
            grupo.anuncios.map((anuncio, indiceAnuncio) => {
              const base = `campanha.grupos[${indiceGrupo}].anuncios[${indiceAnuncio}]`;
              return (
                <div className="anuncio-peca" key={base}>
                  {grupo.anuncios.length > 1 && (
                    <h4 className="anuncio-rotulo-peca">Anúncio {indiceAnuncio + 1}</h4>
                  )}
                  <ListaCampos
                    titulo="Títulos"
                    itens={anuncio.titulos}
                    limite={MAX_CARACTERES.titulos}
                    caminhoLista={`${base}.titulos`}
                    erros={erros}
                    rotuloItem={(i) => `o título ${i + 1} de ${grupo.nome}`}
                    aoAvisar={aoAvisar}
                  />
                  <ListaCampos
                    titulo="Descrições"
                    itens={anuncio.descricoes}
                    limite={MAX_CARACTERES.descricoes}
                    caminhoLista={`${base}.descricoes`}
                    erros={erros}
                    rotuloItem={(i) => `a descrição ${i + 1} de ${grupo.nome}`}
                    aoAvisar={aoAvisar}
                  />
                  <ListaCampos
                    titulo="Caminhos de exibição"
                    itens={anuncio.caminhos}
                    limite={MAX_CARACTERES.caminhos}
                    caminhoLista={`${base}.caminhos`}
                    erros={erros}
                    rotuloItem={(i) => `o caminho ${i + 1} de ${grupo.nome}`}
                    aoAvisar={aoAvisar}
                  />
                  <div className="anuncio-dado">
                    <span className="rotulo">Para onde o anúncio leva</span>
                    <span className="anuncio-dado-linha">
                      <span className="anuncio-dado-valor anuncio-url">{anuncio.urlFinal}</span>
                      <BotaoCopiar
                        texto={anuncio.urlFinal}
                        rotulo={`o endereço final de ${grupo.nome}`}
                        aoAvisar={aoAvisar}
                      />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
    </section>
  );
}

// ==================================================================== 6. recursos

function BlocoRecursos({
  peca,
  erros,
  contagemErros,
  avisos,
  aoAvisar,
}: {
  peca: PecaAnuncio;
  erros: Map<string, Violacao>;
  contagemErros: number;
  avisos: Violacao[];
  aoAvisar: (mensagem: string) => void;
}) {
  const { recursos } = peca;
  return (
    <section className="secao" id="bloco-recursos">
      <div className="secao-topo">
        <h2>Recursos</h2>
        <SeloDoBloco erros={contagemErros} avisos={avisos.length} />
      </div>
      <FaixaAvisos avisos={avisos} />

      <h3 className="anuncio-subtitulo">Sitelinks</h3>
      {recursos.sitelinks.length === 0 ? (
        <p className="anuncio-dado-vazio">Nenhum sitelink nesta campanha.</p>
      ) : (
        recursos.sitelinks.map((sitelink, indice) => (
          <div className="anuncio-peca" key={`${sitelink.texto}-${indice}`}>
            {/* O sitelink é um conjunto: o texto do link e as duas descrições
                dele. Sem este rótulo as três linhas viram uma lista solta e o
                dono não sabe qual campo é qual no painel. */}
            <h4 className="anuncio-rotulo-peca">Sitelink {indice + 1}</h4>
            <ul className="lista">
              <LinhaCampo
                texto={sitelink.texto}
                limite={MAX_CARACTERES.sitelinks}
                violacao={erros.get(`recursos.sitelinks[${indice}].texto`)}
                rotulo={`o sitelink ${indice + 1}`}
                aoAvisar={aoAvisar}
              />
              {sitelink.descricoes.map((descricao, i) => (
                <LinhaCampo
                  key={`${indice}-${i}`}
                  texto={descricao}
                  limite={MAX_CARACTERES.descricoesSitelink}
                  violacao={erros.get(`recursos.sitelinks[${indice}].descricoes[${i}]`)}
                  rotulo={`a descrição ${i + 1} do sitelink ${indice + 1}`}
                  aoAvisar={aoAvisar}
                />
              ))}
            </ul>
            <div className="anuncio-dado">
              <span className="rotulo">Endereço do sitelink</span>
              <span className="anuncio-dado-linha">
                <span className="anuncio-dado-valor anuncio-url">{sitelink.url}</span>
                <BotaoCopiar
                  texto={sitelink.url}
                  rotulo={`o endereço do sitelink ${indice + 1}`}
                  aoAvisar={aoAvisar}
                />
              </span>
            </div>
          </div>
        ))
      )}

      <ListaCampos
        titulo="Frases de destaque"
        itens={recursos.frasesDestaque}
        limite={MAX_CARACTERES.frasesDestaque}
        caminhoLista="recursos.frasesDestaque"
        erros={erros}
        rotuloItem={(i) => `a frase de destaque ${i + 1}`}
        aoAvisar={aoAvisar}
      />

      <h3 className="anuncio-subtitulo">Snippets estruturados</h3>
      {recursos.snippets.length === 0 ? (
        <p className="anuncio-dado-vazio">Nenhum snippet nesta campanha.</p>
      ) : (
        recursos.snippets.map((snippet, indice) => (
          <ListaCampos
            key={`${snippet.cabecalho}-${indice}`}
            titulo={snippet.cabecalho}
            itens={snippet.valores}
            limite={MAX_CARACTERES.valoresSnippet}
            caminhoLista={`recursos.snippets[${indice}].valores`}
            erros={erros}
            rotuloItem={(i) => `o valor ${i + 1} de ${snippet.cabecalho}`}
            aoAvisar={aoAvisar}
          />
        ))
      )}

      <div className="anuncio-dado">
        <span className="rotulo">Chamada telefônica</span>
        {recursos.chamada ? (
          <span className="anuncio-dado-linha">
            <span className="anuncio-dado-valor">{recursos.chamada}</span>
            <BotaoCopiar texto={recursos.chamada} rotulo="o telefone da chamada" aoAvisar={aoAvisar} />
          </span>
        ) : (
          <span className="anuncio-dado-vazio">Sem telefone nesta campanha.</span>
        )}
      </div>
    </section>
  );
}

// =================================================================== 7. orcamento

function BlocoOrcamento({ peca }: { peca: PecaAnuncio }) {
  const { orcamento } = peca;
  return (
    <section className="secao" id="bloco-orcamento">
      <div className="secao-topo">
        <h2>Orçamento</h2>
      </div>
      <div className="anuncio-numeros">
        <div className="anuncio-numero">
          <span className="rotulo">Por dia</span>
          <span className="anuncio-numero-valor">{formatarMoeda(orcamento.diarioBrl)}</span>
        </div>
        <div className="anuncio-numero">
          <span className="rotulo">CPC alvo</span>
          <span className="anuncio-numero-valor">{formatarMoeda(orcamento.cpcAlvoBrl)}</span>
        </div>
        <div className="anuncio-numero">
          <span className="rotulo">Cliques por mês</span>
          <span className="anuncio-numero-valor">{orcamento.cliquesEstimadosMes || "Sem estimativa"}</span>
        </div>
      </div>
      {orcamento.observacao && <p className="anuncio-observacao">{orcamento.observacao}</p>}
    </section>
  );
}

// ================================================================== 8. conversoes

function BlocoConversoes({ peca }: { peca: PecaAnuncio }) {
  return (
    <section className="secao" id="bloco-conversoes">
      <div className="secao-topo">
        <h2>Conversões</h2>
        <span className="contagem">{peca.conversoes.length}</span>
      </div>
      {peca.conversoes.length === 0 ? (
        <p className="anuncio-dado-vazio">
          Nenhuma conversão declarada. Sem conversão, o painel não diz se a campanha
          está dando resultado.
        </p>
      ) : (
        peca.conversoes.map((conversao, indice) => (
          <div className="anuncio-peca" key={`${conversao.nome}-${indice}`}>
            <div className="anuncio-linha-titulo">
              <h3 className="anuncio-subtitulo">{conversao.nome}</h3>
              <span className="selo">{ROTULO_CONVERSAO[conversao.tipo]}</span>
            </div>
            <div className="anuncio-dados">
              <Dado rotulo="Como marcar no painel" valor={conversao.comoMarcar} />
              <Dado
                rotulo="Quanto vale uma"
                valor={conversao.valorBrl === null ? "" : formatarMoeda(conversao.valorBrl)}
              />
            </div>
          </div>
        ))
      )}
    </section>
  );
}

// ================================================================== 9. publicacao

function BlocoPublicacao({ peca }: { peca: PecaAnuncio }) {
  const passos = [...peca.publicacao].sort((a, b) => a.ordem - b.ordem);
  return (
    <section className="secao" id="bloco-publicacao">
      <div className="secao-topo">
        <h2>Publicação</h2>
        <span className="contagem">{passos.length}</span>
      </div>
      {passos.length === 0 ? (
        <p className="anuncio-dado-vazio">Nenhum passo de publicação declarado.</p>
      ) : (
        <ol className="anuncio-passos">
          {passos.map((passo) => (
            <li className="anuncio-passo" key={`${passo.ordem}-${passo.titulo}`}>
              <span className="contagem">{passo.ordem}</span>
              <span className="anuncio-passo-texto">
                <span className="anuncio-passo-titulo">{passo.titulo}</span>
                <span className="anuncio-passo-detalhe">{passo.detalhe}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
