// Estado global da geracao disparada pelo wizard de criacao.
//
// A geracao vive FORA do componente do wizard: assim o usuario pode minimizar o
// wizard e a geracao segue viva, acompanhada por um mini card flutuante. A
// deteccao de conclusao (poll de 3s + fallback dos 10s + timeout honesto dos
// 30s) que morava no AssistenteCriacao MIGRA pra ca, sem se perder: tanto o
// wizard quanto o flutuante leem a mesma verdade daqui, sem duplicar logica.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { usarEstado, type EstadoStream } from "./contexto";
import type { ModeloIA } from "../api/cliente";
import type { StatusSessao } from "../tipos/dominio";

// Tipo da peca no wizard visual (carrossel, post, story). Chave dos ajustes por
// tipo do EtapasCriacao: continua com exatamente estes tres, sem "site".
export type TipoCriacao = "carrossel" | "post" | "story";

// Tipo da geracao viva, mais amplo que o wizard visual: inclui "site", que segue
// por um wizard proprio (EtapasSite) e por uma tela propria, nao pelo Studio.
export type TipoGeracao = TipoCriacao | "site";

// As fases da geracao, na ordem. O indice sai do status da sessao e do tamanho
// do stream (nunca do texto dele: o usuario nao ve orquestracao). Fonte unica:
// o wizard e o flutuante importam daqui, sem redefinir.
export const FASES = [
  "Na fila",
  "Lendo o Cérebro do negócio",
  "Escrevendo as páginas",
  "Montando o visual",
  "Finalizando",
];
// Fases da geracao de site: mesma mecanica e larguras, so os rotulos mudam.
export const FASES_SITE = [
  "Na fila",
  "Lendo o Cérebro",
  "Escrevendo o conteúdo",
  "Construindo as páginas",
  "Finalizando",
];
// Largura da barra por fase. A ultima cheia so vem quando a peca aparece pronta.
export const LARGURA_FASE = [8, 30, 56, 82, 94];

// Rotulos de fase conforme o tipo da peca em criacao. Fonte unica pro wizard e
// pro flutuante: os dois leem daqui, nunca redefinem o texto das fases.
export function fasesDoTipo(tipo: TipoGeracao): string[] {
  return tipo === "site" ? FASES_SITE : FASES;
}

// Estado do laco de conformidade que o flutuante entende, sem depender do React.
export interface ConferenciaGeracao {
  estado: "conferindo" | "corrigindo" | "aprovada" | "pendencias";
  volta: number;
}

// Mensagem honesta da conferencia de site. `demorou` vem da guarda de tempo (90s):
// se a conferencia passou do limite ainda em andamento, o flutuante para de
// prometer "Conferindo" e diz que o site ja esta em Sites, sem travar (A8). Nos
// estados terminais (aprovada, pendencias) a geracao segue o fluxo normal e este
// rotulo some (null).
export const MENSAGEM_CONFERENCIA_DEMOROU =
  "A conferência está demorando; o site está em Sites.";

export function rotuloConferencia(
  conf: ConferenciaGeracao | undefined,
  demorou: boolean,
): string | null {
  if (!conf) return null;
  const emAndamento = conf.estado === "conferindo" || conf.estado === "corrigindo";
  if (demorou && emAndamento) return MENSAGEM_CONFERENCIA_DEMOROU;
  if (conf.estado === "conferindo") return "Conferindo o site";
  if (conf.estado === "corrigindo") {
    return `Corrigindo pendências (volta ${conf.volta} de 2)`;
  }
  return null;
}

// Uma geracao viva: a sessao que a roda e os metadados pra UI.
export interface GeracaoAtiva {
  // Id da sessao no backend. Vazio no instante do disparo, ate criarSessao
  // responder.
  sessaoId: string;
  pastaAlvo: string;
  tema: string;
  tipo: TipoGeracao;
}

// Dados que o wizard entrega pra disparar: o que vai pra criarSessao mais os
// metadados da geracao.
export interface DadosIniciar {
  titulo?: string;
  prompt: string;
  skill?: string;
  modelo?: ModeloIA;
  pastaAlvo: string;
  tema: string;
  tipo: TipoGeracao;
  // Geracao visual sem Cerebro: repassado ao backend pra liberar a guarda.
  semCerebro?: boolean;
  modelosUsados?: string[];
}

interface ValorGeracao {
  ativa: GeracaoAtiva | null;
  minimizada: boolean;
  // Derivados de deteccao, lidos pelo wizard e pelo flutuante.
  fase: number;
  // Rotulos das fases conforme o tipo ativo (carrossel/post/story ou site).
  fases: string[];
  falhou: boolean;
  pecaSumiu: boolean;
  // Erro do disparo (criarSessao falhou), ou null.
  erro: string | null;
  // Pasta resolvida quando a peca esta pronta E a sessao concluiu, senao null.
  // Match exato de pastaAlvo, ou a peca "nova" do fallback dos 10s.
  pastaPronta: string | null;
  // Pendencias da auditoria nao escondem um site que existe. A TelaSite usa a
  // propria peca pra exibir o aviso; este campo mantem o contrato da geracao.
  pendenciasSite: string[];
  // Rotulo curto da fase do laco de conformidade de site, ou null quando o laco
  // nao esta ativo. "Conferindo o site" / "Corrigindo pendências (volta 1 de 2)".
  faseConferencia: string | null;
  // A conferencia passou da guarda de 90s ainda em andamento (A8): o flutuante
  // mostra o estado honesto e fica dispensavel, sem travar esperando o laco.
  conferenciaDemorou: boolean;
  // Resposta final do provedor quando ele encerrou sem criar o arquivo esperado.
  // Permite explicar a causa real em vez de sugerir salvamento infinito.
  resultadoSemPeca: string | null;
  status: StatusSessao | undefined;
  stream: EstadoStream | undefined;
  iniciar: (dados: DadosIniciar) => Promise<void>;
  minimizar: () => void;
  restaurar: () => void;
  limpar: () => void;
}

const ContextoGeracao = createContext<ValorGeracao | null>(null);

export function ProvedorGeracao({ children }: { children: ReactNode }) {
  const { pecas, sessoes, streams, criarSessao, recarregarPecas } = usarEstado();

  const [ativa, setAtiva] = useState<GeracaoAtiva | null>(null);
  const [minimizada, setMinimizada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pecaSumiu, setPecaSumiu] = useState(false);
  // Snapshot das pastas ja existentes no instante do disparo: base do fallback
  // "peca nova" quando a comparacao exata falha (ex: evento de fs.watch perdido).
  const [pastasNoDisparo, setPastasNoDisparo] = useState<Set<string>>(new Set());
  // Quando a sessao virou "concluida" (ms epoch), ou null. Base do fallback dos
  // 10s e do aviso dos 30s.
  const [concluidaEm, setConcluidaEm] = useState<number | null>(null);
  // Pasta resolvida quando pronta+concluida (match exato ou fallback).
  const [pastaPronta, setPastaPronta] = useState<string | null>(null);
  // Guarda de tempo da conferencia de site: vira true quando o laco passa de 90s
  // ainda conferindo ou corrigindo. O flutuante entao mostra um estado honesto
  // ("o site está em Sites") em vez de prometer "Conferindo" pra sempre (A8).
  const [conferenciaDemorou, setConferenciaDemorou] = useState(false);
  // Trava sincrona contra dois cliques antes do React concluir o proximo
  // render. O servidor repete a guarda para cobrir outras abas.
  const ativaRef = useRef<GeracaoAtiva | null>(null);
  ativaRef.current = ativa;

  // A sessao e o stream desta geracao.
  const sessao = ativa ? sessoes.find((s) => s.id === ativa.sessaoId) : undefined;
  const stream = ativa ? streams[ativa.sessaoId] : undefined;
  const status = sessao?.status;
  // A peca alvo, quando ja apareceu pronta em pecas. O criterio de "pronta" muda
  // por tipo: carrossel/post/story exigem HTML-first (fonteHtml + paginas); site
  // e uma pasta classificada como site. A auditoria protege o deploy, mas nao
  // esconde uma geracao que existe e pode ser aberta.
  const pecaPronta = useMemo(() => {
    if (!ativa?.pastaAlvo) return false;
    const peca = pecas.find((p) => p.pasta === ativa.pastaAlvo);
    if (!peca) return false;
    if (ativa.tipo === "site") {
      const ehSite = peca.tipo === "site" && peca.site !== undefined;
      if (!ehSite) return false;
      // Site so entra em "pronta" quando o laco de conformidade termina, pra o
      // usuario nao abrir o site no meio da correcao. Enquanto conferindo ou
      // corrigindo, ainda nao. Sem laco (sessao antiga), mantem o antigo.
      const conf = sessao?.conferenciaSite;
      if (!conf) return true;
      return conf.estado === "aprovada" || conf.estado === "pendencias";
    }
    return Boolean(peca.fonteHtml && (peca.paginas ?? 0) > 0);
  }, [pecas, ativa, sessao?.conferenciaSite]);

  const pendenciasSite = useMemo(() => {
    if (ativa?.tipo !== "site" || !ativa.pastaAlvo) return [];
    const peca = pecas.find((item) => item.pasta === ativa.pastaAlvo);
    return peca?.tipo === "site" && peca.site?.valido === false
      ? peca.site.erros
      : [];
  }, [ativa, pecas]);

  // Se a sessao encerrou de forma anormal depois de gravar um site legivel, a
  // peca continua sendo o resultado. O erro da sessao nao deve apagar o arquivo.
  const falhou =
    !pecaPronta &&
    (status === "erro" || status === "parada" || (ativa !== null && erro !== null));

  const resultadoSemPeca = useMemo(() => {
    if (status !== "concluida" || pecaPronta) return null;
    const texto = sessao?.resultado?.trim() || stream?.texto.trim() || "";
    return texto || null;
  }, [status, pecaPronta, sessao?.resultado, stream?.texto]);

  // Fase atual: derivada do status e do tamanho do stream, nunca do texto.
  const fase = useMemo(() => {
    if (!ativa) return 0;
    if (pecaPronta || status === "concluida") return 4;
    if (!status || status === "fila" || status === "iniciando") return 0;
    const tam = stream?.texto.length ?? 0;
    if (tam <= 0) return 1;
    if (tam < 2000) return 2;
    return 3;
  }, [ativa, status, stream, pecaPronta]);

  const limpar = useCallback(() => {
    ativaRef.current = null;
    setAtiva(null);
    setMinimizada(false);
    setErro(null);
    setPecaSumiu(false);
    setConcluidaEm(null);
    setPastaPronta(null);
    setPastasNoDisparo(new Set());
    setConferenciaDemorou(false);
  }, []);

  const minimizar = useCallback(() => setMinimizada(true), []);
  const restaurar = useCallback(() => setMinimizada(false), []);

  const iniciar = useCallback(
    async (dados: DadosIniciar) => {
      if (ativaRef.current) {
        setErro("Finalize ou cancele a criação em andamento antes de iniciar outra.");
        return;
      }
      setErro(null);
      setPecaSumiu(false);
      setConcluidaEm(null);
      setPastaPronta(null);
      setConferenciaDemorou(false);
      setPastasNoDisparo(new Set(pecas.map((p) => p.pasta)));
      setMinimizada(false);
      const proxima: GeracaoAtiva = {
        sessaoId: "",
        pastaAlvo: dados.pastaAlvo,
        tema: dados.tema,
        tipo: dados.tipo,
      };
      ativaRef.current = proxima;
      setAtiva(proxima);
      try {
        const nova = await criarSessao({
          titulo: dados.titulo,
          prompt: dados.prompt,
          skill: dados.skill,
          modelo: dados.modelo,
          // So o site guiado carrega pastaAlvo: liga o laco de conformidade.
          pastaAlvo: dados.tipo === "site" ? dados.pastaAlvo : undefined,
          semCerebro: dados.semCerebro,
          modelosUsados: dados.modelosUsados,
        });
        setAtiva((atual) =>
          atual ? { ...atual, sessaoId: nova.id } : atual
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    },
    [pecas, criarSessao]
  );

  // Marca o instante em que a sessao concluiu (uma vez por geracao). Base do
  // aviso dos 30s e do fallback dos 10s.
  useEffect(() => {
    if (status === "concluida" && concluidaEm === null) setConcluidaEm(Date.now());
  }, [status, concluidaEm]);

  // Conclusao exata: peca pronta e processo encerrado. Uma sessao parada ou com
  // erro pode ter gravado o site inteiro antes de perder o evento final.
  useEffect(() => {
    if (!ativa) return;
    const terminou = status === "concluida" || status === "erro" || status === "parada";
    if (pecaPronta && terminou && pastaPronta === null) {
      setPastaPronta(ativa.pastaAlvo);
    }
  }, [ativa, pecaPronta, status, pastaPronta]);

  // Timeout honesto: a escrita do arquivo acontece antes do result do provedor.
  // Oito segundos cobrem o observador e dois polls sem prender o usuario por
  // meio minuto quando a IA apenas respondeu e nao criou nenhum artefato.
  // O laco de conformidade de site pode levar mais que 8s conferindo ou
  // corrigindo: enquanto ele roda, nao declara peca sumida.
  const conferenciaAtiva =
    sessao?.conferenciaSite?.estado === "conferindo" ||
    sessao?.conferenciaSite?.estado === "corrigindo";
  useEffect(() => {
    if (!ativa || status !== "concluida" || pecaPronta || conferenciaAtiva) return;
    void recarregarPecas();
    const t = window.setTimeout(() => setPecaSumiu(true), 8000);
    return () => window.clearTimeout(t);
  }, [ativa, status, pecaPronta, conferenciaAtiva, recarregarPecas]);

  // Guarda de tempo da conferencia (90s): a conferencia visual no navegador mais a
  // correcao podem levar tempo, mas nunca pra sempre. Se passar de 90s ainda em
  // andamento, o flutuante cai pra um estado honesto ("o site está em Sites") sem
  // travar. Zera assim que a conferencia sai do estado em andamento (A8).
  useEffect(() => {
    if (!conferenciaAtiva) {
      setConferenciaDemorou(false);
      return;
    }
    const t = window.setTimeout(() => setConferenciaDemorou(true), 90000);
    return () => window.clearTimeout(t);
  }, [conferenciaAtiva]);

  // Poll de reforco: a lista de pecas normalmente atualiza por WS
  // (pecas:atualizadas, disparado por fs.watch no backend). fs.watch pode perder
  // ou coalescer eventos durante uma escrita com muitos arquivos; sem fallback a
  // geracao ficaria presa esperando um evento que nao vem. Repete a busca sozinho
  // enquanto a peca alvo nao aparece.
  useEffect(() => {
    if (!ativa || pecaPronta) return;
    const t = window.setInterval(() => {
      void recarregarPecas();
    }, 3000);
    return () => window.clearInterval(t);
  }, [ativa, pecaPronta, recarregarPecas]);

  // Fallback: sessao concluida ha pelo menos 10s, sem match exato de pastaAlvo.
  // Aceita a primeira peca com fonteHtml que nao existia no snapshot do disparo
  // (uma peca "nova"). Cobre o caso raro de a pasta final ter saido diferente da
  // instruida sem depender so da comparacao exata.
  useEffect(() => {
    if (!ativa || status !== "concluida" || pecaPronta || concluidaEm === null) return;
    if (pastaPronta !== null) return;
    if (Date.now() - concluidaEm < 10000) return;
    const ehNova = (p: (typeof pecas)[number]) => !pastasNoDisparo.has(p.pasta);
    const nova =
      ativa.tipo === "site"
        ? pecas.find((p) => p.tipo === "site" && p.site !== undefined && ehNova(p))
        : pecas.find(
            (p) => p.fonteHtml && (p.paginas ?? 0) > 0 && ehNova(p)
          );
    if (nova) setPastaPronta(nova.pasta);
  }, [ativa, status, pecaPronta, concluidaEm, pecas, pastasNoDisparo, pastaPronta]);

  // Rotulos das fases pro tipo ativo. Sem geracao viva, o conjunto padrao.
  const fases = ativa ? fasesDoTipo(ativa.tipo) : FASES;

  // Rotulo do laco de conformidade. Enquanto conferindo ou corrigindo mostra a
  // fase; passado o limite de 90s, cai pro estado honesto (A8). Nos terminais
  // (aprovada, pendencias) some e a geracao segue o fluxo normal.
  const conf = sessao?.conferenciaSite;
  const faseConferencia = rotuloConferencia(conf, conferenciaDemorou);

  const valor: ValorGeracao = {
    ativa,
    minimizada,
    fase,
    fases,
    falhou,
    pecaSumiu,
    erro,
    pastaPronta,
    pendenciasSite,
    faseConferencia,
    conferenciaDemorou,
    resultadoSemPeca,
    status,
    stream,
    iniciar,
    minimizar,
    restaurar,
    limpar,
  };

  return (
    <ContextoGeracao.Provider value={valor}>{children}</ContextoGeracao.Provider>
  );
}

export function usarGeracao(): ValorGeracao {
  const valor = useContext(ContextoGeracao);
  if (!valor) {
    throw new Error("usarGeracao precisa estar dentro do ProvedorGeracao.");
  }
  return valor;
}
