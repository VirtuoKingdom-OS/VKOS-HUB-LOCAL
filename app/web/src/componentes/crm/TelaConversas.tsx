// O chat do CRM, em tres paineis: conversas, thread e contexto.
//
// A fluidez e a familiaridade sao de um mensageiro bom. O que ele serve nao e:
// o painel da direita e o funil, e o composer registra o que aconteceu no mundo
// real, com quem falou e quando. Um clone de WhatsApp nao teria a coluna da
// direita, e e ela que faz isto valer a pena.
//
// Esta tela cuida de estado e de rede. Toda decisao que da pra provar sem DOM
// mora em conversas.ts, e tem teste la.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ID_DESTA_ABA, gravando } from "../../api/aba";
import type {
  Coluna,
  Contato,
  DadosContato,
  EstadoCrm,
  Interacao,
  Negocio,
} from "../../api/crm";
import {
  abrirConversa as apiAbrirConversa,
  atualizarConversa as apiAtualizarConversa,
  criarConversa as apiCriarConversa,
  linhaDoTempo as apiLinhaDoTempo,
  listarCanais,
  listarConversas,
  marcarComoLida,
  registrarMensagem,
  type CanalResumo,
  type Conversa,
  type StatusConversa,
} from "../../api/mensagens";
import type { AvisoMensagens } from "../../tipos/mensagens";
import { ListaConversas } from "./ListaConversas";
import { ThreadConversa } from "./ThreadConversa";
import { ContextoConversa } from "./ContextoConversa";
import type { AcoesNegocio } from "./EditorNegocio";
import {
  calcularJanela24h,
  criarSincronizadorConversas,
  juntarPaginaAnterior,
  mesclarThread,
  montarPayloadComposer,
  relerThread,
  type MensagemNaTela,
  type RascunhoComposer,
  type RecargaConversas,
} from "./conversas";
import { contatoCombina } from "./logica";
import "../../estilos/conversas.css";

// Tamanho da pagina da thread. O servidor tem teto de 200.
const PAGINA = 50;
const PAGINA_MAXIMA = 200;
// Espera curta entre o aviso e a leitura: uma rajada de gravacoes vira uma
// leitura so. Tambem e o intervalo de nova tentativa enquanto a aba esta
// ocupada.
const ESPERA_RECARGA = 250;

// A pessoa esta escrevendo num campo cujo valor VEM DO SERVIDOR. So o painel de
// contexto conta: ele e marcado com data-vkos-dados. O composer fica de fora de
// proposito, porque o texto dele e local e nenhuma recarga encosta nele.
function editandoCampoDeDados(tela: HTMLElement | null): boolean {
  const ativo = document.activeElement;
  if (!tela || !(ativo instanceof HTMLElement)) return false;
  if (!tela.contains(ativo)) return false;
  if (!ativo.closest("[data-vkos-dados]")) return false;
  return ativo.tagName === "INPUT" || ativo.tagName === "TEXTAREA" || ativo.isContentEditable;
}

function idLocal(): string {
  const cripto = globalThis.crypto;
  if (cripto && typeof cripto.randomUUID === "function") return cripto.randomUUID();
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function TelaConversas({
  estado,
  colunas,
  nomeOrganizacao,
  avisoMensagens,
  acoesNegocio,
  aoAtualizarContato,
  aoMoverEstagio,
  aoCriarNegocio,
  aoAbrirFicha,
}: {
  estado: EstadoCrm;
  colunas: Coluna[];
  nomeOrganizacao: (contato: Contato) => string;
  // Ultimo aviso do WebSocket. Cada aviso e um objeto novo, entao o efeito
  // dispara mesmo com dois avisos iguais seguidos.
  avisoMensagens: AvisoMensagens | null;
  acoesNegocio: AcoesNegocio;
  aoAtualizarContato: (id: string, dados: DadosContato) => Promise<Contato>;
  aoMoverEstagio: (id: string, colunaId: string) => Promise<void> | void;
  aoCriarNegocio: (contatoId: string, titulo: string) => Promise<Negocio>;
  aoAbrirFicha: (contatoId: string) => void;
}) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<StatusConversa | "todas">("todas");
  const [busca, setBusca] = useState("");

  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemNaTela[]>([]);
  const [pendentes, setPendentes] = useState<MensagemNaTela[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [cursorAnterior, setCursorAnterior] = useState<string | undefined>(undefined);
  const [linhasInvalidas, setLinhasInvalidas] = useState(0);
  const [carregandoThread, setCarregandoThread] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [marcaDeEnvioProprio, setMarcaDeEnvioProprio] = useState(0);

  const [canais, setCanais] = useState<CanalResumo[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [carregandoInteracoes, setCarregandoInteracoes] = useState(false);

  const telaRef = useRef<HTMLDivElement>(null);
  const abertaRef = useRef<string | null>(null);
  abertaRef.current = abertaId;

  const contatosPorId = useMemo(
    () => new Map(estado.contatos.map((contato) => [contato.id, contato])),
    [estado.contatos],
  );
  const contatoDe = useCallback(
    (id: string) => contatosPorId.get(id),
    [contatosPorId],
  );

  const conversaAberta = conversas.find((item) => item.id === abertaId) ?? null;
  const contatoAberto = conversaAberta ? contatoDe(conversaAberta.contatoId) : undefined;

  // ------------------------------------------------------------- leitura

  const recarregarLista = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregandoLista(true);
    try {
      setConversas(await listarConversas());
      if (!silencioso) setErro(null);
    } catch (e) {
      // Recarga de fundo nao vira faixa vermelha: e sincronizacao, nao acao do
      // usuario. A proxima acao dele mostra o erro de verdade.
      if (!silencioso) setErro(e instanceof Error ? e.message : "Não deu pra carregar as conversas.");
    } finally {
      if (!silencioso) setCarregandoLista(false);
    }
  }, []);

  // Abre a thread. "quantas" existe pra recarga ao vivo nao encolher o que a
  // pessoa ja tinha rolado: quem subiu tres paginas continua com as tres.
  const carregarThread = useCallback(async (id: string, quantas = PAGINA, silencioso = false) => {
    if (!silencioso) setCarregandoThread(true);
    try {
      const pagina = await apiAbrirConversa(id, { limite: Math.min(quantas, PAGINA_MAXIMA) });
      if (abertaRef.current !== id) return;
      setMensagens(pagina.mensagens);
      setTemMais(pagina.temMais);
      setCursorAnterior(pagina.cursorAnterior);
      setLinhasInvalidas(pagina.linhasInvalidas);
    } catch (e) {
      if (!silencioso) setErro(e instanceof Error ? e.message : "Não deu pra abrir a conversa.");
    } finally {
      if (!silencioso) setCarregandoThread(false);
    }
  }, []);

  const carregarInteracoes = useCallback(async (contatoId: string) => {
    setCarregandoInteracoes(true);
    try {
      const itens = await apiLinhaDoTempo(contatoId, 40);
      // Só o que aconteceu FORA do chat. A mensagem ja esta na thread do meio:
      // repetir ela na direita seria o mesmo fato duas vezes na mesma tela.
      setInteracoes(
        itens.flatMap((item) => (item.tipo === "interacao" ? [item.interacao] : [])),
      );
    } catch {
      setInteracoes([]);
    } finally {
      setCarregandoInteracoes(false);
    }
  }, []);

  useEffect(() => {
    void recarregarLista();
    // O que cada canal consegue fazer. Falha aqui nao derruba a tela: sem
    // capacidade conhecida, a tela desenha o que o canal manual faz hoje.
    listarCanais().then(setCanais).catch(() => undefined);
  }, [recarregarLista]);

  // Abriu uma conversa: thread, leitura marcada e linha do tempo do contato.
  useEffect(() => {
    if (!abertaId) {
      setMensagens([]);
      setPendentes([]);
      setInteracoes([]);
      return;
    }
    setPendentes([]);
    void carregarThread(abertaId);
  }, [abertaId, carregarThread]);

  useEffect(() => {
    if (!conversaAberta) return;
    void carregarInteracoes(conversaAberta.contatoId);
  }, [carregarInteracoes, conversaAberta?.contatoId]);

  // Marcar como lida nao reescreve mensagem nenhuma: move o cursor da conversa.
  useEffect(() => {
    if (!conversaAberta || conversaAberta.naoLidas === 0) return;
    const id = conversaAberta.id;
    marcarComoLida(id)
      .then((atualizada) => {
        setConversas((atual) => atual.map((item) => (item.id === id ? atualizada : item)));
      })
      .catch(() => undefined);
  }, [conversaAberta?.id, conversaAberta?.naoLidas]);

  // -------------------------------------------------------------- ao vivo

  const sincronizador = useMemo(() => criarSincronizadorConversas(ID_DESTA_ABA), []);
  const relogioRef = useRef<number | null>(null);
  const passoRef = useRef<() => void>(() => {});

  const aplicarRecarga = useCallback(async (recarga: RecargaConversas) => {
    const tarefas: Promise<unknown>[] = [];
    if (recarga.lista) tarefas.push(recarregarLista(true));
    const aberta = abertaRef.current;
    if (aberta && relerThread(recarga, aberta)) {
      // Pede pelo menos o que ja esta na tela, pra recarga nao engolir o
      // historico que a pessoa foi buscar rolando pra cima.
      tarefas.push(carregarThread(aberta, Math.max(PAGINA, mensagens.length), true));
    }
    await Promise.all(tarefas);
  }, [carregarThread, mensagens.length, recarregarLista]);

  const agendarRecarga = useCallback(() => {
    if (relogioRef.current !== null) return;
    relogioRef.current = window.setTimeout(() => {
      relogioRef.current = null;
      passoRef.current();
    }, ESPERA_RECARGA);
  }, []);

  const passo = useCallback(() => {
    const recarga = sincronizador.tomar({
      editandoCampoDeDados: editandoCampoDeDados(telaRef.current),
      gravando: gravando(),
    });
    // Adiado: a pendencia continua guardada e a tela tenta de novo quando o
    // campo liberar. Nada se perde.
    if (!recarga) {
      if (sincronizador.pendente()) agendarRecarga();
      return;
    }
    void aplicarRecarga(recarga);
  }, [agendarRecarga, aplicarRecarga, sincronizador]);

  useEffect(() => {
    passoRef.current = passo;
  }, [passo]);

  const avisoDaMontagem = useRef(avisoMensagens);
  useEffect(() => {
    if (!avisoMensagens || avisoMensagens === avisoDaMontagem.current) return;
    sincronizador.receber(avisoMensagens);
    agendarRecarga();
  }, [agendarRecarga, avisoMensagens, sincronizador]);

  useEffect(() => () => {
    if (relogioRef.current !== null) window.clearTimeout(relogioRef.current);
  }, []);

  // -------------------------------------------------------------- escrita

  const abrir = useCallback((id: string) => {
    setAbertaId(id);
    setErro(null);
  }, []);

  const criarConversa = useCallback(async (contatoId: string) => {
    try {
      // 200 quando ja existia, 201 quando nasceu. Os DOIS sao sucesso: a
      // conversa volta igual, e reusar e o que impede uma segunda caixa de
      // entrada do mesmo cliente.
      const conversa = await apiCriarConversa({ contatoId });
      await recarregarLista(true);
      abrir(conversa.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu pra abrir a conversa.");
    }
  }, [abrir, recarregarLista]);

  const carregarMais = useCallback(async () => {
    if (!abertaId || !cursorAnterior || carregandoMais) return;
    setCarregandoMais(true);
    try {
      const pagina = await apiAbrirConversa(abertaId, { limite: PAGINA, antesDe: cursorAnterior });
      if (abertaRef.current !== abertaId) return;
      setMensagens((atual) => juntarPaginaAnterior(pagina.mensagens, atual));
      setTemMais(pagina.temMais);
      setCursorAnterior(pagina.cursorAnterior);
    } catch {
      // Buscar historico e opcional: falhar aqui nao pode derrubar a conversa.
    } finally {
      setCarregandoMais(false);
    }
  }, [abertaId, carregandoMais, cursorAnterior]);

  // Grava a mensagem e resolve o otimista pela CHAVE, nunca pelo id: o id da
  // mensagem otimista nasce aqui e o do servidor e outro.
  const gravar = useCallback(async (
    conversaId: string,
    otimista: MensagemNaTela,
    payload: ReturnType<typeof montarPayloadComposer>,
  ) => {
    if (!payload) return;
    try {
      const gravada = await registrarMensagem(conversaId, payload);
      if (abertaRef.current !== conversaId) return;
      setMensagens((atual) => mesclarThread([...atual, gravada], []));
      setPendentes((atual) =>
        atual.filter((item) => item.chaveIdempotencia !== otimista.chaveIdempotencia),
      );
      // A previa, a ordem e as nao lidas da coluna da esquerda mudaram junto.
      void recarregarLista(true);
    } catch {
      // A mensagem NAO some: ela fica visivel, marcada, com botao de tentar de
      // novo. A retentativa manda a MESMA chave, entao o servidor devolve a
      // mesma mensagem em vez de gravar uma segunda.
      setPendentes((atual) =>
        atual.map((item) =>
          item.chaveIdempotencia === otimista.chaveIdempotencia
            ? { ...item, envio: "falhou" as const }
            : item,
        ),
      );
    }
  }, [recarregarLista]);

  const enviar = useCallback((rascunho: RascunhoComposer) => {
    const conversa = conversaAberta;
    if (!conversa) return;
    const agora = new Date();
    const payload = montarPayloadComposer(rascunho, agora);
    if (!payload) return;

    // O envio otimista precisa de um id local ANTES de existir resposta do
    // servidor. E por isso que o modelo manda o id da mensagem nascer sempre no
    // Hub, nunca no provedor.
    const otimista: MensagemNaTela = {
      id: idLocal(),
      conversaId: conversa.id,
      direcao: payload.direcao,
      canal: conversa.canal,
      origem: "manual",
      tipo: "texto",
      texto: payload.texto,
      privada: payload.privada,
      status: "na-fila",
      chaveIdempotencia: payload.chaveIdempotencia,
      autorTipo: payload.direcao === "entrada" ? "contato" : "usuario",
      enviadaEm: payload.enviadaEm ?? agora.toISOString(),
      criadaEm: agora.toISOString(),
      anexos: payload.anexos ?? [],
      envio: "pendente",
    };
    setPendentes((atual) => [...atual, otimista]);
    setMarcaDeEnvioProprio((n) => n + 1);
    void gravar(conversa.id, otimista, payload);
  }, [conversaAberta, gravar]);

  const tentarDeNovo = useCallback((mensagem: MensagemNaTela) => {
    const conversa = conversaAberta;
    if (!conversa) return;
    setPendentes((atual) =>
      atual.map((item) =>
        item.chaveIdempotencia === mensagem.chaveIdempotencia
          ? { ...item, envio: "pendente" as const }
          : item,
      ),
    );
    void gravar(conversa.id, mensagem, {
      direcao: mensagem.direcao,
      texto: mensagem.texto,
      privada: mensagem.privada,
      // A MESMA chave da primeira tentativa. Trocar a chave aqui seria gravar
      // duas vezes o que a pessoa escreveu uma.
      chaveIdempotencia: mensagem.chaveIdempotencia,
      enviadaEm: mensagem.enviadaEm,
      ...(mensagem.anexos.length > 0 ? { anexos: mensagem.anexos } : {}),
    });
  }, [conversaAberta, gravar]);

  const descartarPendente = useCallback((mensagem: MensagemNaTela) => {
    setPendentes((atual) =>
      atual.filter((item) => item.chaveIdempotencia !== mensagem.chaveIdempotencia),
    );
  }, []);

  const mudarStatus = useCallback(async (status: StatusConversa, adiadaAte?: string) => {
    if (!conversaAberta) return;
    try {
      const atualizada = await apiAtualizarConversa(conversaAberta.id, {
        status,
        ...(status === "adiada" ? { adiadaAte: adiadaAte ?? null } : {}),
      });
      setConversas((atual) => atual.map((item) => (item.id === atualizada.id ? atualizada : item)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu pra mudar o status da conversa.");
    }
  }, [conversaAberta]);

  const ligarNegocio = useCallback(async (negocioId: string | null) => {
    if (!conversaAberta) return;
    try {
      const atualizada = await apiAtualizarConversa(conversaAberta.id, { negocioId });
      setConversas((atual) => atual.map((item) => (item.id === atualizada.id ? atualizada : item)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu pra ligar a conversa ao negócio.");
    }
  }, [conversaAberta]);

  // ------------------------------------------------------------ derivados

  const naTela = useMemo(() => mesclarThread(mensagens, pendentes), [mensagens, pendentes]);

  const capacidades = useMemo(() => {
    if (!conversaAberta) return null;
    return canais.find((canal) => canal.id === conversaAberta.canal)?.capacidades ?? null;
  }, [canais, conversaAberta]);

  const janela = useMemo(
    () => calcularJanela24h(conversaAberta ?? { ultimaEntradaEm: undefined }, capacidades, new Date()),
    [capacidades, conversaAberta],
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return conversas.filter((conversa) => {
      if (filtro !== "todas" && conversa.status !== filtro) return false;
      if (!termo) return true;
      const contato = contatoDe(conversa.contatoId);
      if (contato && contatoCombina(contato, termo, nomeOrganizacao(contato))) return true;
      return conversa.previa.toLowerCase().includes(termo);
    });
  }, [busca, contatoDe, conversas, filtro, nomeOrganizacao]);

  const negociosDoContato = useMemo(
    () => (contatoAberto ? estado.negocios.filter((n) => n.contatoId === contatoAberto.id) : []),
    [contatoAberto, estado.negocios],
  );
  const orcamentosDoContato = useMemo(() => {
    const ids = new Set(negociosDoContato.map((n) => n.id));
    return estado.orcamentos.filter((orcamento) => ids.has(orcamento.negocioId));
  }, [estado.orcamentos, negociosDoContato]);

  return (
    <div className="cv-tela" ref={telaRef}>
      {erro && (
        <div className="cv-erro" role="alert">
          {erro}
          <button onClick={() => setErro(null)} aria-label="Fechar aviso" type="button">×</button>
        </div>
      )}
      <div className="cv-paineis">
        <ListaConversas
          conversas={visiveis}
          contatoDe={contatoDe}
          nomeOrganizacao={nomeOrganizacao}
          abertaId={abertaId}
          filtro={filtro}
          busca={busca}
          carregando={carregandoLista}
          contatosParaNova={estado.contatos}
          aoFiltrar={setFiltro}
          aoBuscar={setBusca}
          aoAbrir={abrir}
          aoCriarConversa={(contatoId) => void criarConversa(contatoId)}
        />

        <ThreadConversa
          conversa={conversaAberta}
          contato={contatoAberto}
          mensagens={naTela}
          temMais={temMais}
          carregando={carregandoThread}
          carregandoMais={carregandoMais}
          linhasInvalidas={linhasInvalidas}
          janela={janela}
          capacidades={capacidades}
          marcaDeEnvioProprio={marcaDeEnvioProprio}
          aoCarregarMais={() => void carregarMais()}
          aoEnviar={enviar}
          aoTentarDeNovo={tentarDeNovo}
          aoDescartarPendente={descartarPendente}
          aoMudarStatus={(status, adiadaAte) => void mudarStatus(status, adiadaAte)}
          aoAbrirFicha={() => conversaAberta && aoAbrirFicha(conversaAberta.contatoId)}
        />

        {conversaAberta && (
          <ContextoConversa
            conversa={conversaAberta}
            contato={contatoAberto}
            colunas={colunas}
            negocios={negociosDoContato}
            orcamentos={orcamentosDoContato}
            interacoes={interacoes}
            carregandoInteracoes={carregandoInteracoes}
            acoesNegocio={acoesNegocio}
            aoAtualizarContato={(dados) => {
              if (contatoAberto) void aoAtualizarContato(contatoAberto.id, dados).catch(() => undefined);
            }}
            aoMoverEstagio={(colunaId) => {
              if (contatoAberto) void aoMoverEstagio(contatoAberto.id, colunaId);
            }}
            aoLigarNegocio={(negocioId) => void ligarNegocio(negocioId)}
            aoCriarNegocio={(titulo) => {
              if (!contatoAberto) return;
              void aoCriarNegocio(contatoAberto.id, titulo).catch(() => undefined);
            }}
            aoAbrirFicha={() => aoAbrirFicha(conversaAberta.contatoId)}
          />
        )}
      </div>
    </div>
  );
}
