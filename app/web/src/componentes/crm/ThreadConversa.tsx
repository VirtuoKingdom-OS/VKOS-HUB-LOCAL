// Painel do meio: a thread e o composer.
//
// A fluidez aqui e o ponto: rolagem que comeca embaixo e nao pula na cara de
// quem esta lendo, Enter que manda, envio que aparece na hora e nunca some.
// As decisoes ficam em conversas.ts, onde da pra prova-las sem DOM. Aqui mora
// so o que precisa de elemento de verdade: medir rolagem e focar campo.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Contato } from "../../api/crm";
import type { CapacidadesCanal, Conversa, StatusConversa } from "../../api/mensagens";
import {
  agruparPorDia,
  deveRolarParaOFim,
  estaNoFim,
  type EstadoJanela,
  type MensagemNaTela,
  type RascunhoComposer,
} from "./conversas";
import { PRESETS_SNOOZE, dataDoSnooze } from "./logica";
import { ROTULO_STATUS } from "./ListaConversas";
import { formatarDataHora, iniciais } from "./formatos";
import { IconeAlerta, IconeCheck, IconeSeta, IconeSubir, IconeX } from "../comum/Icones";

// Distancia do topo, em pixels, que dispara a busca da pagina anterior.
const GATILHO_HISTORICO = 80;

function horaCurta(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Marca de estado de uma mensagem de saida. Entrada nao tem ciclo de envio.
function marcaDeEstado(mensagem: MensagemNaTela): string {
  if (mensagem.envio === "pendente") return "Enviando...";
  if (mensagem.envio === "falhou") return "Não enviou";
  if (mensagem.direcao === "entrada") return "";
  if (mensagem.status === "lida") return "Lida";
  if (mensagem.status === "entregue") return "Entregue";
  if (mensagem.status === "falhou") return "Falhou";
  return "Registrada";
}

export function ThreadConversa({
  conversa,
  contato,
  mensagens,
  temMais,
  carregando,
  carregandoMais,
  linhasInvalidas,
  janela,
  capacidades,
  marcaDeEnvioProprio,
  aoCarregarMais,
  aoEnviar,
  aoTentarDeNovo,
  aoDescartarPendente,
  aoMudarStatus,
  aoAbrirFicha,
}: {
  conversa: Conversa | null;
  contato: Contato | undefined;
  mensagens: MensagemNaTela[];
  temMais: boolean;
  carregando: boolean;
  carregandoMais: boolean;
  // Quantas linhas do arquivo da thread nao deram pra ler. Zero e o normal.
  linhasInvalidas: number;
  janela: EstadoJanela;
  capacidades: CapacidadesCanal | null;
  // Sobe de um a cada envio DESTA aba. E o unico jeito de a thread saber que a
  // mensagem nova saiu daqui e que a rolagem tem que acompanhar.
  marcaDeEnvioProprio: number;
  aoCarregarMais: () => void;
  aoEnviar: (rascunho: RascunhoComposer) => void;
  aoTentarDeNovo: (mensagem: MensagemNaTela) => void;
  aoDescartarPendente: (mensagem: MensagemNaTela) => void;
  aoMudarStatus: (status: StatusConversa, adiadaAte?: string) => void;
  aoAbrirFicha: () => void;
}) {
  const rolagemRef = useRef<HTMLDivElement>(null);
  // Onde a pessoa estava ANTES da mudanca. Lido no evento de rolagem, nunca no
  // render: no render a altura ja mudou e a resposta viria errada.
  const noFimRef = useRef(true);
  const primeiraCargaRef = useRef(true);
  const marcaAnteriorRef = useRef(marcaDeEnvioProprio);
  const conversaAnteriorRef = useRef<string | null>(null);
  // Altura total antes de a pagina anterior entrar, pra manter a leitura no
  // mesmo ponto depois que o historico velho e injetado por cima.
  const alturaAntesRef = useRef<number | null>(null);
  const [adiando, setAdiando] = useState(false);

  const aoRolar = useCallback(() => {
    const alvo = rolagemRef.current;
    if (!alvo) return;
    noFimRef.current = estaNoFim({
      topo: alvo.scrollTop,
      alturaVisivel: alvo.clientHeight,
      alturaTotal: alvo.scrollHeight,
    });
    if (alvo.scrollTop < GATILHO_HISTORICO && temMais && !carregandoMais) {
      alturaAntesRef.current = alvo.scrollHeight;
      aoCarregarMais();
    }
  }, [aoCarregarMais, carregandoMais, temMais]);

  // Trocou de conversa: a thread nova abre embaixo, como toda thread abre.
  if (conversa && conversaAnteriorRef.current !== conversa.id) {
    conversaAnteriorRef.current = conversa.id;
    primeiraCargaRef.current = true;
    noFimRef.current = true;
  }

  // useLayoutEffect e nao useEffect: a correcao da rolagem tem que acontecer
  // antes de o navegador pintar, senao a tela pisca no lugar errado.
  useLayoutEffect(() => {
    const alvo = rolagemRef.current;
    if (!alvo || mensagens.length === 0) return;

    // Pagina anterior entrou: devolve a leitura pro mesmo ponto, medindo o
    // quanto o conteudo cresceu por cima.
    if (alturaAntesRef.current !== null) {
      const cresceu = alvo.scrollHeight - alturaAntesRef.current;
      alturaAntesRef.current = null;
      if (cresceu > 0) {
        alvo.scrollTop += cresceu;
        return;
      }
    }

    const ehPropria = marcaDeEnvioProprio !== marcaAnteriorRef.current;
    marcaAnteriorRef.current = marcaDeEnvioProprio;
    const primeiraCarga = primeiraCargaRef.current;
    primeiraCargaRef.current = false;

    if (
      deveRolarParaOFim({
        primeiraCarga,
        ehPropria,
        estavaNoFim: noFimRef.current,
        lendoHistorico: !noFimRef.current,
      })
    ) {
      alvo.scrollTop = alvo.scrollHeight;
      noFimRef.current = true;
    }
  }, [marcaDeEnvioProprio, mensagens]);

  if (!conversa) {
    return (
      <section className="cv-thread cv-thread-vazia">
        <div className="vazio">
          <h2>Escolha uma conversa à esquerda.</h2>
          <p>Ou abra uma nova com qualquer contato do funil.</p>
        </div>
      </section>
    );
  }

  const grupos = agruparPorDia(mensagens, new Date());
  const nome = contato?.nome ?? "Contato removido";

  return (
    <section className="cv-thread" aria-label={`Conversa com ${nome}`}>
      <header className="cv-thread-topo">
        <span className="crm-avatar crm-avatar-g">{iniciais(nome)}</span>
        <div className="cv-thread-id">
          <button className="cv-thread-nome" onClick={aoAbrirFicha} type="button" title="Abrir a ficha completa">
            {nome}
          </button>
          <span className="cv-thread-sub">
            {conversa.identificadorExterno || "Sem número registrado"}
            {conversa.status !== "aberta" && `, ${ROTULO_STATUS[conversa.status]}`}
          </span>
        </div>
        <div className="cv-thread-acoes">
          {/* O relogio da janela so existe quando o CANAL declara que tem
              janela. Nao ha comparacao com nome de canal em lugar nenhum. */}
          {janela.visivel && (
            <span className={`selo ${janela.aberta ? "selo-vivo" : "selo-aviso"}`} role="status">
              {janela.aberta && <span className="ponto-vivo" aria-hidden="true" />}
              {janela.rotulo}
            </span>
          )}
          {conversa.status === "resolvida" || conversa.status === "adiada" ? (
            <button className="botao botao-p botao-neutro" onClick={() => aoMudarStatus("aberta")} type="button">
              Reabrir
            </button>
          ) : (
            <>
              <button className="botao botao-p botao-fantasma" onClick={() => setAdiando((a) => !a)} aria-expanded={adiando} type="button">
                Adiar
              </button>
              <button className="botao botao-p botao-neutro" onClick={() => aoMudarStatus("resolvida")} type="button">
                <IconeCheck className="" /> Resolver
              </button>
            </>
          )}
        </div>
      </header>

      {adiando && (
        <div className="cv-adiar" role="group" aria-label="Adiar a conversa">
          <span className="rotulo">Voltar a falar em</span>
          {PRESETS_SNOOZE.map((preset) => (
            <button
              className="botao botao-p botao-neutro"
              key={preset.chave}
              onClick={() => { setAdiando(false); aoMudarStatus("adiada", dataDoSnooze(new Date(), preset)); }}
              type="button"
            >
              {preset.rotulo}
            </button>
          ))}
          <span className="barra-ferramentas-espaco" />
          <button className="botao botao-p botao-icone botao-fantasma" onClick={() => setAdiando(false)} aria-label="Cancelar" type="button">
            <IconeX className="" />
          </button>
        </div>
      )}

      {/* Arquivo estragado tem que aparecer. Fingir que a thread esta inteira e
          o unico jeito de o usuario confiar num historico furado. */}
      {linhasInvalidas > 0 && (
        <div className="faixa faixa-alerta cv-faixa" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">
            {linhasInvalidas === 1
              ? "1 mensagem desta conversa não pôde ser lida e não aparece abaixo."
              : `${linhasInvalidas} mensagens desta conversa não puderam ser lidas e não aparecem abaixo.`}
          </div>
        </div>
      )}

      <div className="cv-rolagem" ref={rolagemRef} onScroll={aoRolar}>
        {temMais && (
          <div className="cv-mais-antigas">
            <button className="botao botao-p botao-neutro" onClick={aoCarregarMais} disabled={carregandoMais} aria-busy={carregandoMais || undefined} type="button">
              <IconeSubir className="" /> Ver mensagens anteriores
            </button>
          </div>
        )}
        {carregando && mensagens.length === 0 && (
          <div aria-busy="true">
            <span className="so-leitor">Abrindo a conversa</span>
            {[0, 1, 2].map((i) => (
              <div className="cv-esqueleto-balao esqueleto" key={i} aria-hidden="true" />
            ))}
          </div>
        )}
        {!carregando && mensagens.length === 0 && (
          <p className="crm-vazio-inline">Nada registrado ainda. Escreva abaixo o que já foi dito.</p>
        )}

        {grupos.map((grupo) => (
          <div className="cv-dia" key={grupo.chave}>
            <div className="cv-dia-marca"><span>{grupo.rotulo}</span></div>
            {grupo.mensagens.map((mensagem) => (
              <Balao
                key={mensagem.id}
                mensagem={mensagem}
                aoTentarDeNovo={aoTentarDeNovo}
                aoDescartar={aoDescartarPendente}
              />
            ))}
          </div>
        ))}
      </div>

      <Composer
        janela={janela}
        capacidades={capacidades}
        aoEnviar={aoEnviar}
      />
    </section>
  );
}

function Balao({
  mensagem,
  aoTentarDeNovo,
  aoDescartar,
}: {
  mensagem: MensagemNaTela;
  aoTentarDeNovo: (mensagem: MensagemNaTela) => void;
  aoDescartar: (mensagem: MensagemNaTela) => void;
}) {
  const classes = [
    "cv-balao",
    mensagem.direcao === "entrada" ? "entrada" : "saida",
    mensagem.privada ? "privada" : "",
    mensagem.envio ? `envio-${mensagem.envio}` : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      {mensagem.privada && <span className="selo selo-aviso">Nota interna</span>}
      {mensagem.texto && <p className="cv-texto">{mensagem.texto}</p>}
      {mensagem.anexos.length > 0 && (
        <ul className="cv-anexos">
          {mensagem.anexos.map((anexo) => (
            <li key={anexo.id}>{anexo.nome}</li>
          ))}
        </ul>
      )}
      <footer className="cv-balao-pe">
        <time title={formatarDataHora(mensagem.enviadaEm)}>{horaCurta(mensagem.enviadaEm)}</time>
        {marcaDeEstado(mensagem) && <span className="cv-estado">{marcaDeEstado(mensagem)}</span>}
      </footer>
      {/* Mensagem que falhou NUNCA some da tela. Sumir e o unico jeito de a
          pessoa achar que mandou uma coisa que nunca saiu. */}
      {mensagem.envio === "falhou" && (
        <div className="cv-falhou-acoes">
          <button className="botao botao-p botao-neutro" onClick={() => aoTentarDeNovo(mensagem)} type="button">
            Tentar de novo
          </button>
          <button className="botao botao-p botao-fantasma" onClick={() => aoDescartar(mensagem)} type="button">
            Descartar
          </button>
        </div>
      )}
    </article>
  );
}

// O composer.
//
// Adaptado ao CRM, e nao copiado de um mensageiro: o canal manual e o dono
// CONTANDO o que aconteceu por fora, entao quem falou e quando falou sao
// escolha dele, nao suposicao da tela.
function Composer({
  janela,
  capacidades,
  aoEnviar,
}: {
  janela: EstadoJanela;
  capacidades: CapacidadesCanal | null;
  aoEnviar: (rascunho: RascunhoComposer) => void;
}) {
  const [texto, setTexto] = useState("");
  const [ehEntrada, setEhEntrada] = useState(false);
  const [privada, setPrivada] = useState(false);
  const [retroativo, setRetroativo] = useState("");
  const [mostrarData, setMostrarData] = useState(false);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  // Cresce com o texto, ate um teto. Sem isso, escrever tres paragrafos vira
  // uma janelinha de uma linha com rolagem propria.
  useEffect(() => {
    const campo = campoRef.current;
    if (!campo) return;
    campo.style.height = "auto";
    campo.style.height = `${Math.min(campo.scrollHeight, 180)}px`;
  }, [texto]);

  const podeMandar = texto.trim().length > 0;

  function enviar() {
    if (!podeMandar) return;
    aoEnviar({
      texto,
      direcao: ehEntrada ? "entrada" : "saida",
      privada,
      ...(retroativo ? { retroativoEm: retroativo } : {}),
      chaveIdempotencia: novaChave(),
    });
    setTexto("");
    setRetroativo("");
    setMostrarData(false);
    campoRef.current?.focus();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
      return;
    }
    // Esc sai do campo SEM apagar nada. O que foi digitado continua ali quando
    // a pessoa voltar: perder texto por apertar Esc e o erro que a ficha do
    // contato ja pagou uma vez.
    if (e.key === "Escape") {
      e.stopPropagation();
      campoRef.current?.blur();
    }
  }

  // Janela fechada num canal que tem janela: o campo livre sai e entra o que o
  // canal permite. Sem isso a pessoa digita, envia e recebe erro sem entender.
  if (janela.visivel && !janela.aberta) {
    return (
      <div className="cv-composer cv-composer-fechado">
        {/* Sem triangulo: isto nao e alerta, e a explicacao de um estado que a
            tela ja mostra de dois jeitos, no selo "Janela fechada" do topo e no
            proprio campo de escrever, que sumiu. */}
        <p className="cv-fechado-aviso">
          A janela de resposta livre está fechada. Só dá para retomar por um modelo aprovado.
        </p>
        {capacidades?.templates ? (
          <select className="campo campo-p" aria-label="Modelo de mensagem" defaultValue="">
            <option value="">Escolha um modelo</option>
          </select>
        ) : (
          <span className="dica">Este canal ainda não tem modelos cadastrados.</span>
        )}
      </div>
    );
  }

  return (
    <div className="cv-composer">
      <div className="cv-composer-opcoes">
        <div className="segmentado" role="group" aria-label="Quem mandou a mensagem">
          <button className="segmento" onClick={() => setEhEntrada(false)} type="button" aria-pressed={!ehEntrada}>
            Eu mandei
          </button>
          <button className="segmento" onClick={() => setEhEntrada(true)} type="button" aria-pressed={ehEntrada}>
            Ele mandou
          </button>
        </div>
        <label className="linha-escolha">
          <input className="caixa" type="checkbox" checked={privada} onChange={(e) => setPrivada(e.target.checked)} />
          Nota interna
        </label>
        <button
          className="botao botao-p botao-fantasma"
          onClick={() => setMostrarData((atual) => !atual)}
          aria-expanded={mostrarData}
          aria-pressed={mostrarData}
          type="button"
        >
          {retroativo ? "Outra data marcada" : "Outra data"}
        </button>
        {mostrarData && (
          <input
            className="campo campo-p cv-retroativo"
            type="datetime-local"
            value={retroativo}
            onChange={(e) => setRetroativo(e.target.value)}
            aria-label="Quando esta mensagem aconteceu"
          />
        )}
      </div>

      <div className="cv-composer-linha">
        <textarea
          className="campo"
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder={privada ? "Anotação que só você vê" : "Escreva o que foi dito"}
          rows={1}
          maxLength={4096}
          aria-label="Mensagem"
        />
        <button
          className="botao botao-icone botao-principal cv-mandar"
          onClick={enviar}
          disabled={!podeMandar}
          type="button"
          aria-label="Registrar mensagem"
          title="Enter manda, Shift e Enter quebram linha"
        >
          <IconeSeta className="" />
        </button>
      </div>
      <span className="dica">Enter manda. Shift e Enter quebram linha. Esc sai do campo sem perder nada.</span>
    </div>
  );
}

// Chave de idempotencia da mensagem, criada ANTES do envio. E ela que faz
// clique duplo e retentativa de rede devolverem a mesma mensagem em vez de
// gravarem duas.
function novaChave(): string {
  const cripto = globalThis.crypto;
  if (cripto && typeof cripto.randomUUID === "function") return cripto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// Reexportado pra tela conseguir criar o id local da mensagem otimista com a
// mesma regra.
export { novaChave };
