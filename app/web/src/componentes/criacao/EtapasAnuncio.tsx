import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ModeloIA } from "../../api/cliente";
import { usarProvedoresIA } from "../../estado/provedores";
import { IconeRaio } from "../comum/Icones";
import "./criacao.css";

// Estado completo que as etapas do anuncio coletam. Tudo texto ou lista simples,
// mesmo padrao das outras duas jornadas.
//
// O QUE ESTAS ETAPAS PERGUNTAM, E POR QUE: a skill /anuncio abre pedindo tres
// coisas (onde anunciar, qual oferta, pra onde vai o clique) e o Cerebro nao
// responde nenhuma delas com precisao. O bloco 12 costuma dizer so "WhatsApp", o
// bloco 3 fala da praca em termos gerais, e o Cerebro NAO TEM nenhum bloco de
// orcamento, ticket, margem ou custo de aquisicao. Sem perguntar, o bloco de
// orcamento da campanha vira chute.
export interface DadosEtapasAnuncio {
  // A oferta que vai ao ar (obrigatoria). Vira o nome da pasta e o titulo.
  oferta: string;
  // O que conta como resultado, em texto livre.
  objetivo: string;
  // Pra onde o clique leva.
  destino: "whatsapp" | "landing" | "agendamento" | "telefone";
  // Numero ou URL do destino.
  linkDestino: string;
  // Cidades, bairros, regiao.
  praca: string;
  // Raio em volta da praca, do jeito que o dono descreve.
  raio: string;
  // Quanto por dia (obrigatorio).
  orcamentoDiario: string;
  // Texto aberto, entra literal no prompt.
  detalhes: string;
  modelo: ModeloIA;
}

// Valores iniciais das etapas. O modelo vem do padrao do workspace. O destino
// nasce em WhatsApp porque e o que o Cerebro quase sempre traz.
export function criarDadosEtapasAnuncio(modelo: ModeloIA): DadosEtapasAnuncio {
  return {
    oferta: "",
    objetivo: "",
    destino: "whatsapp",
    linkDestino: "",
    praca: "",
    raio: "",
    orcamentoDiario: "",
    detalhes: "",
    modelo,
  };
}

// Ha algo preenchido nas etapas? Decide se cancelar pede confirmacao.
export function etapasAnuncioTemPreenchimento(d: DadosEtapasAnuncio): boolean {
  return (
    d.oferta.trim().length > 0 ||
    d.objetivo.trim().length > 0 ||
    d.linkDestino.trim().length > 0 ||
    d.praca.trim().length > 0 ||
    d.raio.trim().length > 0 ||
    d.orcamentoDiario.trim().length > 0 ||
    d.detalhes.trim().length > 0 ||
    d.destino !== "whatsapp"
  );
}

// Os quatro destinos de clique, e o placeholder do endereco de cada um.
export const DESTINOS: {
  id: DadosEtapasAnuncio["destino"];
  rotulo: string;
  rotuloCampo: string;
  placeholder: string;
}[] = [
  {
    id: "whatsapp",
    rotulo: "WhatsApp",
    rotuloCampo: "Número do WhatsApp",
    placeholder: "Número com DDD, ex: 11 91234-5678",
  },
  {
    id: "landing",
    rotulo: "Landing page",
    rotuloCampo: "Endereço da página",
    placeholder: "Link da página, ex: https://...",
  },
  {
    id: "agendamento",
    rotulo: "Agendamento",
    rotuloCampo: "Link do agendamento",
    placeholder: "Link de agendamento, ex: https://...",
  },
  {
    id: "telefone",
    rotulo: "Telefone",
    rotuloCampo: "Número do telefone",
    placeholder: "Número com DDD, ex: 11 3456-7890",
  },
];

const TOTAL_ETAPAS = 4;

interface Props {
  dados: DadosEtapasAnuncio;
  // Reporta mudancas parciais. O dono do estado (wizard) persiste.
  aoMudar: (parcial: Partial<DadosEtapasAnuncio>) => void;
  // Chamado na ultima etapa ao clicar em Gerar anuncio.
  aoGerar: () => void;
  // Habilita o Enter que avanca. Desliga quando ha overlay por cima.
  ativo?: boolean;
}

// So a coleta de dados do anuncio: 4 etapas, navegacao e validacao. Mesmo padrao
// visual do EtapasSite, sem nenhuma logica de geracao.
export function EtapasAnuncio({ dados, aoMudar, aoGerar, ativo = true }: Props) {
  const { modelos, modeloPadrao, carregando: carregandoModelos } = usarProvedoresIA();
  const id = useId();
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "tras">("frente");
  // Mesma regra das outras jornadas: o aviso de campo vazio so aparece depois
  // que a pessoa mexeu no campo e saiu dele.
  const [ofertaTocada, setOfertaTocada] = useState(false);
  const [orcamentoTocado, setOrcamentoTocado] = useState(false);
  const refOferta = useRef<HTMLTextAreaElement>(null);

  const ofertaValida = dados.oferta.trim().length > 0;
  // O orcamento e obrigatorio de proposito: o Cerebro nao tem nenhum numero de
  // dinheiro, entao sem esta resposta o bloco de orcamento da campanha nasce
  // inventado.
  const orcamentoValido = dados.orcamentoDiario.trim().length > 0;
  const etapaValida =
    etapa === 0
      ? ofertaValida && !!dados.modelo
      : etapa === TOTAL_ETAPAS - 1
        ? orcamentoValido
        : true;

  useEffect(() => {
    if (modelos.length === 0 || modelos.some((m) => m.alias === dados.modelo)) return;
    aoMudar({ modelo: modeloPadrao || modelos[0].alias });
  }, [modelos, modeloPadrao, dados.modelo, aoMudar]);

  // Foca a oferta ao abrir a primeira etapa.
  useEffect(() => {
    if (etapa === 0) refOferta.current?.focus();
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

  const destinoAtual = DESTINOS.find((d) => d.id === dados.destino) ?? DESTINOS[0];

  const rotulosEtapa = [
    "O que vamos anunciar?",
    "Pra onde vai o clique?",
    "Onde e pra quem?",
    "Quanto por dia?",
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

          {/* Etapa 0: a oferta, o resultado e o modelo. */}
          {etapa === 0 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-oferta`}>
                  Qual oferta vai ao ar?
                </label>
                <textarea
                  ref={refOferta}
                  id={`${id}-oferta`}
                  className="campo criacao-textarea-alta nodrag nowheel"
                  placeholder="Ex: limpeza de pele com desconto de estreia no meu estúdio em Curitiba"
                  value={dados.oferta}
                  onChange={(e) => aoMudar({ oferta: e.target.value })}
                  onBlur={() => setOfertaTocada(true)}
                  aria-invalid={ofertaTocada && !ofertaValida}
                  aria-describedby={
                    ofertaTocada && !ofertaValida ? `${id}-oferta-erro` : undefined
                  }
                />
                {ofertaTocada && !ofertaValida && (
                  <span className="erro-campo" id={`${id}-oferta-erro`}>
                    Escreva a oferta pra continuar.
                  </span>
                )}
              </div>

              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-objetivo`}>
                  O que conta como resultado?
                </label>
                <textarea
                  id={`${id}-objetivo`}
                  className="campo nodrag nowheel"
                  placeholder="Ex: pessoa chamar no WhatsApp e marcar horário; encher a agenda de terça e quarta..."
                  value={dados.objetivo}
                  onChange={(e) => aoMudar({ objetivo: e.target.value })}
                />
                <span className="dica">
                  É o que o anúncio precisa provocar. Sem isso, a campanha mira em
                  clique, e clique não paga conta.
                </span>
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
              </div>
            </div>
          )}

          {/* Etapa 1: o destino do clique. */}
          {etapa === 1 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <span className="rotulo" id={`${id}-r-destino`}>
                  Destino do clique
                </span>
                <span className="dica">
                  É a decisão que muda a campanha inteira: a chamada, a extensão e
                  o que conta como conversão saem daqui.
                </span>
                <div className="segmentado" aria-labelledby={`${id}-r-destino`}>
                  {DESTINOS.map((d) => (
                    <button
                      key={d.id}
                      className="segmento"
                      aria-pressed={dados.destino === d.id}
                      onClick={() => aoMudar({ destino: d.id })}
                    >
                      {d.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-link-destino`}>
                  {destinoAtual.rotuloCampo}
                </label>
                <input
                  id={`${id}-link-destino`}
                  className="campo nodrag"
                  placeholder={destinoAtual.placeholder}
                  value={dados.linkDestino}
                  onChange={(e) => aoMudar({ linkDestino: e.target.value })}
                />
                <span className="dica">
                  Deixe vazio pra usar o contato que está no Cérebro.
                </span>
              </div>
            </div>
          )}

          {/* Etapa 2: praca e raio. */}
          {etapa === 2 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-praca`}>
                  Onde o anúncio aparece
                </label>
                <textarea
                  id={`${id}-praca`}
                  className="campo nodrag nowheel"
                  placeholder="Ex: Curitiba e região metropolitana; só os bairros Batel, Água Verde e Bigorrilho..."
                  value={dados.praca}
                  onChange={(e) => aoMudar({ praca: e.target.value })}
                />
                <span className="dica">
                  Vazio faz a campanha seguir a praça que está no Cérebro.
                </span>
              </div>

              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-raio`}>
                  Raio (opcional)
                </label>
                <input
                  id={`${id}-raio`}
                  className="campo nodrag"
                  placeholder="Ex: 10 km em volta do estúdio"
                  value={dados.raio}
                  onChange={(e) => aoMudar({ raio: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Etapa 3: orcamento e detalhes livres. */}
          {etapa === 3 && (
            <div className="criacao-campos">
              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-orcamento`}>
                  Orçamento por dia
                </label>
                <input
                  id={`${id}-orcamento`}
                  className="campo nodrag"
                  placeholder="Ex: R$ 30 por dia"
                  value={dados.orcamentoDiario}
                  onChange={(e) => aoMudar({ orcamentoDiario: e.target.value })}
                  onBlur={() => setOrcamentoTocado(true)}
                  aria-invalid={orcamentoTocado && !orcamentoValido}
                  aria-describedby={
                    orcamentoTocado && !orcamentoValido
                      ? `${id}-orcamento-erro`
                      : undefined
                  }
                />
                {orcamentoTocado && !orcamentoValido ? (
                  <span className="erro-campo" id={`${id}-orcamento-erro`}>
                    Diga quanto por dia pra continuar.
                  </span>
                ) : (
                  <span className="dica">
                    O Cérebro não guarda nenhum número de dinheiro. Sem esta
                    resposta, o orçamento da campanha sai chutado.
                  </span>
                )}
              </div>

              <div className="grupo-campo">
                <label className="rotulo" htmlFor={`${id}-detalhes`}>
                  Detalhes (opcional)
                </label>
                <textarea
                  id={`${id}-detalhes`}
                  className="campo nodrag nowheel"
                  placeholder={'Ex: não usar a palavra "barato"; citar os 20 anos de estrada; evitar quem procura curso...'}
                  value={dados.detalhes}
                  onChange={(e) => aoMudar({ detalhes: e.target.value })}
                />
                <span className="dica">
                  Última chance de pedir qualquer coisa antes de gerar.
                </span>
              </div>
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
              Gerar anúncio
            </>
          )}
        </button>
      </footer>
    </>
  );
}
