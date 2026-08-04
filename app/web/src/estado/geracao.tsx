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
import type { Peca, StatusSessao } from "../tipos/dominio";

// Tipo da peca no wizard visual (carrossel, post, story). Chave dos ajustes por
// tipo do EtapasCriacao: continua com exatamente estes tres, sem "site".
export type TipoCriacao = "carrossel" | "post" | "story";

// Tipo da geracao viva, mais amplo que o wizard visual: inclui "site" e
// "anuncio", que seguem por wizards proprios (EtapasSite, EtapasAnuncio) e nao
// terminam no Studio.
export type TipoGeracao = TipoCriacao | "site" | "anuncio";

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
// Fases da geracao de anuncio: mesma mecanica e larguras, so os rotulos mudam.
export const FASES_ANUNCIO = [
  "Na fila",
  "Lendo o Cérebro",
  "Montando a estratégia",
  "Escrevendo os anúncios",
  "Finalizando",
];
// Largura da barra por fase. A ultima cheia so vem quando a peca aparece pronta.
export const LARGURA_FASE = [8, 30, 56, 82, 94];

// Rotulos de fase conforme o tipo da peca em criacao. Fonte unica pro wizard e
// pro flutuante: os dois leem daqui, nunca redefinem o texto das fases.
export function fasesDoTipo(tipo: TipoGeracao): string[] {
  if (tipo === "site") return FASES_SITE;
  if (tipo === "anuncio") return FASES_ANUNCIO;
  return FASES;
}

// Estado do laco de conformidade que o flutuante entende, sem depender do React.
export interface ConferenciaGeracao {
  estado: "conferindo" | "corrigindo" | "aprovada" | "pendencias";
  volta: number;
}

// Mensagem honesta da conferencia. `demorou` vem da guarda de tempo (90s): se a
// conferencia passou do limite ainda em andamento, o flutuante para de prometer
// "Conferindo" e diz onde a peca ja esta, sem travar (A8). Nos estados terminais
// (aprovada, pendencias) a geracao segue o fluxo normal e este rotulo some (null).
export const MENSAGEM_CONFERENCIA_DEMOROU =
  "A conferência está demorando; o site está em Sites.";
export const MENSAGEM_CONFERENCIA_DEMOROU_ANUNCIO =
  "A conferência está demorando; a campanha já está salva.";

// Os rotulos por tipo. O laco do anuncio usa o MESMO campo de conferencia do
// laco de site, entao sem esta tabela o flutuante diria "Conferindo o site"
// enquanto o Hub confere uma campanha de Google Ads.
const ROTULO_CONFERENCIA: Record<
  "site" | "anuncio",
  { conferindo: string; corrigindo: (volta: number) => string; demorou: string }
> = {
  site: {
    conferindo: "Conferindo o site",
    corrigindo: (volta) => `Corrigindo pendências (volta ${volta} de 2)`,
    demorou: MENSAGEM_CONFERENCIA_DEMOROU,
  },
  anuncio: {
    conferindo: "Conferindo a campanha",
    corrigindo: (volta) => `Corrigindo a campanha (volta ${volta} de 2)`,
    demorou: MENSAGEM_CONFERENCIA_DEMOROU_ANUNCIO,
  },
};

export function rotuloConferencia(
  conf: ConferenciaGeracao | undefined,
  demorou: boolean,
  tipo: TipoGeracao = "site",
): string | null {
  if (!conf) return null;
  // Carrossel, post e story nao tem laco nenhum. Se um dia um deles chegar aqui
  // com conferencia, o rotulo de site seria mentira: melhor calar.
  const rotulos = tipo === "anuncio" ? ROTULO_CONFERENCIA.anuncio : ROTULO_CONFERENCIA.site;
  const emAndamento = conf.estado === "conferindo" || conf.estado === "corrigindo";
  if (demorou && emAndamento) return rotulos.demorou;
  if (conf.estado === "conferindo") return rotulos.conferindo;
  if (conf.estado === "corrigindo") return rotulos.corrigindo(conf.volta);
  return null;
}

export function conferenciaEmAndamento(conf: ConferenciaGeracao | undefined): boolean {
  return conf?.estado === "conferindo" || conf?.estado === "corrigindo";
}

// O CRITERIO DE PECA PRONTA, por tipo. Puro e exportado de proposito: o defeito
// que a Fase 5 do fluxo de anuncios fechou (campanha com forma quebrada
// anunciada como pronta) morava numa expressao dentro de um useMemo, onde
// nenhum teste alcancava.
//
// - carrossel, post e story: HTML-first, com pagina de verdade dentro.
// - site: pasta classificada como site, e o laco de conformidade ja terminado,
//   pra ninguem abrir o site no meio de uma correcao. Sem laco (sessao antiga),
//   mantem o comportamento antigo.
// - anuncio: o unico que exige o VEREDITO DA FORMA, e nao so o tipo. Um
//   anuncio.json corrompido continua sendo peca de anuncio, e o servidor a
//   classifica assim de proposito, senao a tela nunca abriria justo no caso em
//   que o dono precisa ver o problema. Mas campanha que nao passa no schema nao
//   e campanha pronta: mandar o dono pra tela ali era mandar ele pra um 422.
export function pecaEstaPronta(
  tipo: TipoGeracao,
  peca: Peca | undefined,
  conferencia: ConferenciaGeracao | undefined,
): boolean {
  if (!peca) return false;
  if (tipo === "anuncio") {
    return peca.tipo === "anuncio" && peca.anuncio?.valido === true;
  }
  if (tipo === "site") {
    if (peca.tipo !== "site" || peca.site === undefined) return false;
    if (!conferencia) return true;
    return conferencia.estado === "aprovada" || conferencia.estado === "pendencias";
  }
  return Boolean(peca.fonteHtml && (peca.paginas ?? 0) > 0);
}

// Mensagem de reserva, se o servidor disser invalido sem dizer por que.
export const ERRO_CAMPANHA_SEM_DETALHE =
  "O anuncio.json não está no formato esperado.";

// O VEREDITO HONESTO DO FIM DA LINHA da campanha: ela foi gravada com a forma
// quebrada e o laco de conformidade ja parou de tentar. Depois das 2 voltas, ou
// de uma sessao que morreu no meio, a geracao FALHA dizendo qual campo esta
// errado, em vez de anunciar campanha pronta e deixar o 422 aparecer na tela.
//
// Enquanto o laco confere ou corrige, nada em disco e veredito: a proxima volta
// ainda pode consertar, e falar antes seria acusar a IA no meio da frase.
export function erroDaCampanha(parametros: {
  tipo: TipoGeracao;
  peca: Peca | undefined;
  conferencia: ConferenciaGeracao | undefined;
  status: StatusSessao | undefined;
}): string | null {
  const { tipo, peca, conferencia, status } = parametros;
  if (tipo !== "anuncio") return null;
  if (conferenciaEmAndamento(conferencia)) return null;
  if (status !== "concluida" && status !== "erro" && status !== "parada") return null;
  if (peca?.tipo !== "anuncio" || peca.anuncio?.valido !== false) return null;
  return peca.anuncio.erro ?? ERRO_CAMPANHA_SEM_DETALHE;
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
  // A campanha ficou em disco com a forma quebrada e o laco de conformidade ja
  // parou. Traz o erro literal do schema, dizendo qual campo, ou null.
  erroPeca: string | null;
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
  // A peca alvo, quando ja apareceu pronta em pecas.
  const pecaPronta = useMemo(() => {
    if (!ativa?.pastaAlvo) return false;
    return pecaEstaPronta(
      ativa.tipo,
      pecas.find((p) => p.pasta === ativa.pastaAlvo),
      sessao?.conferenciaSite,
    );
  }, [pecas, ativa, sessao?.conferenciaSite]);

  // O laco de conformidade esta rodando (conferindo ou corrigindo). Enquanto
  // ele roda, nada em disco e veredito: a proxima volta ainda pode consertar.
  const conferenciaAtiva = conferenciaEmAndamento(sessao?.conferenciaSite);

  const erroPeca = useMemo(() => {
    if (!ativa?.pastaAlvo) return null;
    return erroDaCampanha({
      tipo: ativa.tipo,
      peca: pecas.find((p) => p.pasta === ativa.pastaAlvo),
      conferencia: sessao?.conferenciaSite,
      status,
    });
  }, [ativa, sessao?.conferenciaSite, status, pecas]);

  const pendenciasSite = useMemo(() => {
    if (ativa?.tipo !== "site" || !ativa.pastaAlvo) return [];
    const peca = pecas.find((item) => item.pasta === ativa.pastaAlvo);
    return peca?.tipo === "site" && peca.site?.valido === false
      ? peca.site.erros
      : [];
  }, [ativa, pecas]);

  // Se a sessao encerrou de forma anormal depois de gravar um site legivel, a
  // peca continua sendo o resultado. O erro da sessao nao deve apagar o arquivo.
  //
  // Campanha com forma quebrada tambem e falha, mesmo com a sessao concluida
  // sem erro nenhum: a IA terminou de falar, o laco gastou as duas voltas, e o
  // que ficou em disco a tela nao sabe ler.
  const falhou =
    !pecaPronta &&
    (status === "erro" ||
      status === "parada" ||
      erroPeca !== null ||
      (ativa !== null && erro !== null));

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
          // Site e anuncio carregam pastaAlvo: ela liga o laco de conformidade
          // a peca certa. No anuncio ela vale ainda mais cedo, porque e o
          // servidor que cria a pasta antes de disparar e usa ela como cwd.
          pastaAlvo:
            dados.tipo === "site" || dados.tipo === "anuncio"
              ? dados.pastaAlvo
              : undefined,
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
  // O laco de conformidade pode levar mais que 8s conferindo ou corrigindo:
  // enquanto ele roda, nao declara peca sumida (conferenciaAtiva mora la em
  // cima, junto do veredito da campanha, porque os dois leem o mesmo estado).
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
      ativa.tipo === "anuncio"
        ? pecas.find((p) => p.tipo === "anuncio" && p.anuncio?.valido === true && ehNova(p))
        : ativa.tipo === "site"
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
  const faseConferencia = rotuloConferencia(conf, conferenciaDemorou, ativa?.tipo ?? "site");

  const valor: ValorGeracao = {
    ativa,
    minimizada,
    fase,
    fases,
    falhou,
    pecaSumiu,
    erro,
    erroPeca,
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
