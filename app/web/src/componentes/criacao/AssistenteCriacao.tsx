import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import { usarGeracao, FASES, LARGURA_FASE, type TipoCriacao } from "../../estado/geracao";
import {
  IconeAlerta,
  IconeCheck,
  IconeGaleria,
  IconeRaio,
  IconeSite,
  IconeSubir,
  IconeX,
} from "../comum/Icones";
import {
  modelosUsadosDaCriacao,
  montarPromptCriacao,
  pastaUnica,
} from "./prompt";
import {
  CONFIG_TIPO,
  EtapasCriacao,
  criarDadosEtapas,
  dadosCriacaoDe,
  etapasTemPreenchimento,
  type DadosEtapas,
} from "./EtapasCriacao";
import {
  EtapasSite,
  criarDadosEtapasSite,
  etapasSiteTemPreenchimento,
  type DadosEtapasSite,
} from "./EtapasSite";
import { montarPromptSite } from "./promptSite";
import "../../estilos/criacao.css";

// O Site Guiado e uma quarta jornada de criacao, irma do conteudo visual. Usa a
// mesma casca do assistente, com etapas e prompt proprios.
type TipoAssistente = TipoCriacao | "site";

interface Props {
  // Tipo da peca. carrossel = varias paginas. post = uma pagina 4:5. story =
  // uma pagina 9:16. site = site HTML estatico (jornada do Site Guiado).
  tipo?: TipoAssistente;
  // Chamado quando a peca alvo aparece pronta: o dashboard leva pro Studio.
  aoConcluir: (pasta: string) => void;
  // Chamado quando o usuario desiste (cancelou ou minimizou a geracao).
  aoCancelar: () => void;
  // Destinos internos usados pelos estados de recuperacao do assistente.
  aoAbrirDestino: (destino: "cockpit" | "arquivos") => void;
}

export function AssistenteCriacao({
  tipo = "carrossel",
  aoConcluir,
  aoCancelar,
  aoAbrirDestino,
}: Props) {
  const { pecas, sessoes, modeloPadrao, pararSessao, estadoVkos } = usarEstado();
  const { ativo: provedorAtivo, modelos: modelosIA } = usarProvedoresIA();
  const {
    ativa,
    fase,
    falhou,
    pecaSumiu,
    erro: erroGeracao,
    pastaPronta,
    faseConferencia,
    resultadoSemPeca,
    iniciar,
    minimizar,
    restaurar,
    limpar,
  } = usarGeracao();

  // Config da casca por tipo. O site nao esta no CONFIG_TIPO (que so cobre as
  // pecas visuais): ganha sua propria marca, substantivo e icone.
  const cfg =
    tipo === "site"
      ? { substantivo: "site", marca: "Site Guiado", Icone: IconeSite }
      : CONFIG_TIPO[tipo];

  // Estado coletado pelas etapas. As etapas so reportam mudancas; o dono
  // persiste. Aqui vive em memoria (o wizard nao sobrevive a reload). Cada
  // jornada tem o seu estado: so o relevante ao `tipo` e usado.
  const [dados, setDados] = useState<DadosEtapas>(() => criarDadosEtapas(modeloPadrao));
  const aoMudar = useCallback(
    (parcial: Partial<DadosEtapas>) => setDados((d) => ({ ...d, ...parcial })),
    []
  );
  const [dadosSite, setDadosSite] = useState<DadosEtapasSite>(() =>
    criarDadosEtapasSite(modeloPadrao)
  );
  const aoMudarSite = useCallback(
    (parcial: Partial<DadosEtapasSite>) =>
      setDadosSite((d) => ({ ...d, ...parcial })),
    []
  );

  // Identidade da geracao. Com Cerebro preenchido, o fluxo e o de sempre e o
  // portao nao aparece. Com Cerebro em branco, o usuario escolhe: montar o
  // Cerebro primeiro (recomendado) ou seguir sem ele nesta geracao.
  const cerebroPreenchido = estadoVkos?.cerebroPreenchido ?? false;
  const [identidade, setIdentidade] = useState<"cerebro" | "sem" | null>(null);
  const [descricaoNegocio, setDescricaoNegocio] = useState("");
  const semCerebro = !cerebroPreenchido && identidade === "sem";
  const precisaEscolherIdentidade = !cerebroPreenchido && identidade === null;

  // Confirmacao de saida.
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  // Geracao viva = ha uma geracao no estado global. Enquanto o wizard esta
  // aberto ele mostra o progresso; o mini card flutuante so aparece minimizado.
  const gerando = ativa !== null;

  // Ao abrir com uma geracao minimizada em andamento, reata: mostra o progresso
  // aqui e esconde o flutuante enquanto o wizard estiver aberto.
  useEffect(() => {
    if (ativa) restaurar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pausa as animacoes continuas do canvas por baixo enquanto o wizard cobre a
  // tela (mesma trava que a cerimonia usa).
  useEffect(() => {
    document.body.classList.add("overlay-aberto");
    return () => {
      if (
        document.querySelectorAll(".overlay-tela-cheia, .criacao-fundo").length <= 1
      ) {
        document.body.classList.remove("overlay-aberto");
      }
    };
  }, []);

  // A sessao desta geracao, so pra ler a mensagem de erro do backend.
  const sessao = ativa ? sessoes.find((s) => s.id === ativa.sessaoId) : undefined;
  const precisaMontarCerebro = Boolean(
    erroGeracao?.toLocaleLowerCase("pt-BR").includes("cérebro")
  );

  // Conclusao: a peca ficou pronta. Vai pro Studio e limpa o estado global.
  useEffect(() => {
    if (pastaPronta) {
      aoConcluir(pastaPronta);
      limpar();
    }
  }, [pastaPronta, aoConcluir, limpar]);

  const dispararGeracao = useCallback(async () => {
    // Aprimorar com IA desligado: o modelo enviado e forcado pro economico da
    // tarefa. Carrossel usa o modelo marcado `economico` pelo backend (haiku no
    // Claude, gpt-5.4-mini no Codex). Site usa o degrau do meio (sonnet no
    // Claude, gpt-5.6-terra no Codex): site nao tem template HTML pra copiar.
    const economicoCarrossel =
      modelosIA.find((m) => m.economico)?.alias ??
      (provedorAtivo === "codex" ? "gpt-5.4-mini" : "haiku");
    const economicoSite = provedorAtivo === "codex" ? "gpt-5.6-terra" : "sonnet";

    // Identidade sem Cerebro carregada na geracao: o prompt recebe o flag e a
    // descricao livre, e iniciar repassa semCerebro ao backend pra liberar a
    // guarda. Com Cerebro preenchido, ambos ficam neutros.
    const descricao = descricaoNegocio.trim();

    // Site Guiado: etapas e prompt proprios, skill "site", tipo "site".
    if (tipo === "site") {
      const tema = dadosSite.tema.trim();
      const pasta = pastaUnica(tema, pecas);
      const dadosSiteFinal: DadosEtapasSite = {
        ...dadosSite,
        semCerebro,
        descricaoNegocio: descricao,
      };
      await iniciar({
        titulo: `Site: ${tema}`,
        prompt: montarPromptSite(dadosSiteFinal, pasta),
        skill: "site",
        modelo:
          dadosSite.aprimorarComIA === false ? economicoSite : dadosSite.modelo,
        pastaAlvo: pasta,
        tema,
        tipo: "site",
        semCerebro,
      });
      return;
    }
    const dc = { ...dadosCriacaoDe(dados, tipo), semCerebro, descricaoNegocio: descricao };
    const pasta = pastaUnica(dc.tema, pecas);
    const nome = cfg.substantivo.charAt(0).toUpperCase() + cfg.substantivo.slice(1);
    await iniciar({
      titulo: `${nome}: ${dc.tema.trim()}`,
      prompt: montarPromptCriacao(dc, pasta),
      skill: "carrossel",
      modelo:
        dados.aprimorarComIA === false ? economicoCarrossel : dados.modelo,
      pastaAlvo: pasta,
      tema: dc.tema.trim(),
      tipo,
      semCerebro,
      modelosUsados: modelosUsadosDaCriacao(dc),
    });
  }, [tipo, dadosSite, dados, pecas, cfg.substantivo, iniciar, provedorAtivo, modelosIA, semCerebro, descricaoNegocio]);

  // Sai de vez: para a sessao se estiver gerando, limpa o estado global e
  // devolve o controle ao pai.
  const sairDeVez = useCallback(async () => {
    if (ativa?.sessaoId) {
      try {
        await pararSessao(ativa.sessaoId);
      } catch {
        // segue saindo mesmo se o backend reclamar
      }
    }
    limpar();
    aoCancelar();
  }, [ativa, pararSessao, limpar, aoCancelar]);

  // Minimizar: manda a geracao pro mini card e fecha o wizard SEM parar a sessao.
  const aoMinimizar = useCallback(() => {
    minimizar();
    aoCancelar();
  }, [minimizar, aoCancelar]);

  // Pedido de cancelar: confirma quando ha o que perder (preenchimento ou uma
  // geracao em andamento). Vazio no formulario sai direto.
  const pedirCancelar = useCallback(() => {
    const geracaoViva = gerando && !falhou && !pecaSumiu;
    const preencheu =
      tipo === "site"
        ? etapasSiteTemPreenchimento(dadosSite)
        : etapasTemPreenchimento(dados);
    if (preencheu || geracaoViva) {
      setConfirmandoSaida(true);
    } else {
      aoCancelar();
    }
  }, [gerando, falhou, pecaSumiu, tipo, dados, dadosSite, aoCancelar]);

  // Teclado: Esc pede pra sair. O Enter que avanca vive nas etapas.
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (confirmandoSaida) setConfirmandoSaida(false);
      else pedirCancelar();
    };
    window.addEventListener("keydown", aoTecla, true);
    return () => window.removeEventListener("keydown", aoTecla, true);
  }, [confirmandoSaida, pedirCancelar]);

  // ===== Render =====

  const corpo = (
    <div className="criacao-fundo" role="dialog" aria-modal="true">
      <div className="criacao-card">
        <header className="criacao-topo">
          <span className="criacao-marca">
            <cfg.Icone className="criacao-marca-icone" />
            {cfg.marca}
          </span>
          <button
            className="criacao-fechar"
            onClick={pedirCancelar}
            title="Fechar"
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </header>

        {!gerando ? (
          precisaEscolherIdentidade ? (
            <div className="criacao-estado criacao-portao">
              <h2 className="criacao-titulo">Este negócio ainda não tem Cérebro</h2>
              <p className="criacao-texto">
                O Cérebro é a identidade do negócio, a fonte que toda geração usa. Montar ele primeiro deixa o {cfg.substantivo} muito melhor. Mas dá pra seguir sem ele nesta geração se você quiser.
              </p>
              <label className="criacao-portao-campo">
                <span>Descreva o negócio em poucas linhas, opcional</span>
                <textarea
                  className="criacao-textarea nodrag nowheel"
                  value={descricaoNegocio}
                  onChange={(e) => setDescricaoNegocio(e.target.value)}
                  placeholder="Nome, o que vende, pra quem, cidade. Ajuda a IA a dar identidade à peça."
                  rows={3}
                />
              </label>
              <div className="criacao-estado-acoes">
                <button
                  className="botao botao-neutro"
                  onClick={() => setIdentidade("sem")}
                >
                  Seguir sem o Cérebro
                </button>
                <button
                  className="botao botao-principal"
                  onClick={() => {
                    limpar();
                    aoAbrirDestino("cockpit");
                  }}
                >
                  <IconeRaio className="" />
                  Montar o Cérebro primeiro
                </button>
              </div>
            </div>
          ) : tipo === "site" ? (
            <EtapasSite
              dados={dadosSite}
              aoMudar={aoMudarSite}
              aoGerar={() => void dispararGeracao()}
              ativo={!confirmandoSaida}
            />
          ) : (
            <EtapasCriacao
              tipo={tipo}
              dados={dados}
              aoMudar={aoMudar}
              aoGerar={() => void dispararGeracao()}
              ativo={!confirmandoSaida}
            />
          )
        ) : (
          // ===== Etapa 5: geracao =====
          <div className="criacao-geracao">
            {falhou ? (
              <div className="criacao-estado">
                <div className="criacao-selo erro">
                  <IconeAlerta className="" />
                </div>
                <h2 className="criacao-titulo">A geração não foi</h2>
                <p className="criacao-texto">
                  {erroGeracao ??
                    sessao?.erro ??
                    `A sessão parou antes de terminar o ${cfg.substantivo}. Dá pra tentar de novo.`}
                </p>
                <div className="criacao-estado-acoes">
                  <button className="botao botao-neutro" onClick={() => limpar()}>
                    Voltar
                  </button>
                  {precisaMontarCerebro ? (
                    <button
                      className="botao botao-principal"
                      onClick={() => {
                        limpar();
                        aoAbrirDestino("cockpit");
                      }}
                    >
                      <IconeRaio className="" />
                      Montar o Cérebro
                    </button>
                  ) : (
                    <button
                      className="botao botao-principal"
                      onClick={() => void dispararGeracao()}
                    >
                      <IconeRaio className="" />
                      Tentar de novo
                    </button>
                  )}
                </div>
              </div>
            ) : pecaSumiu ? (
              <div className="criacao-estado">
                <div className="criacao-selo aviso">
                  <IconeAlerta className="" />
                </div>
                <h2 className="criacao-titulo">
                  {tipo === "site" ? "O site ainda não está pronto" : "O arquivo não foi criado"}
                </h2>
                <p className="criacao-texto">
                  {tipo === "site"
                    ? "A sessão terminou mas nenhum site apareceu na pasta."
                    : `A sessão terminou sem criar o arquivo esperado do ${cfg.substantivo}.`}
                  {resultadoSemPeca
                    ? ` A resposta da IA foi: ${resultadoSemPeca.slice(0, 700)}`
                    : " Verifique a orientação abaixo ou tente novamente."}
                </p>
                <div className="criacao-estado-acoes">
                  <button className="botao botao-neutro" onClick={() => void sairDeVez()}>
                    Fechar
                  </button>
                  <button
                    className="botao botao-principal"
                    onClick={() => {
                      limpar();
                      aoAbrirDestino("arquivos");
                    }}
                  >
                    <IconeGaleria className="" />
                    Abrir Galerias
                  </button>
                </div>
              </div>
            ) : (
              <div className="criacao-progresso">
                <div className="criacao-selo pulsa">
                  <cfg.Icone className="" />
                </div>
                <h2 className="criacao-titulo">
                  {faseConferencia ?? `Gerando seu ${cfg.substantivo}`}
                </h2>
                <p className="criacao-texto">
                  {faseConferencia
                    ? "O Hub está conferindo o site e ajustando o que a auditoria apontou antes de abrir."
                    : "Isso leva um tempo. Pode acompanhar por aqui ou minimizar e seguir usando o app."}
                </p>
                <div className="criacao-fases">
                  {FASES.map((f, i) => (
                    <span
                      key={f}
                      className={`criacao-fase${i === fase ? " atual" : ""}${
                        i < fase ? " feita" : ""
                      }`}
                    >
                      {i < fase ? (
                        <IconeCheck className="" />
                      ) : (
                        <span className="criacao-fase-ponto" />
                      )}
                      {f}
                    </span>
                  ))}
                </div>
                <div className="criacao-barra">
                  <div
                    className="criacao-barra-cheia"
                    style={{ width: `${LARGURA_FASE[fase]}%` }}
                  />
                </div>
                <div className="criacao-geracao-acoes">
                  <button className="botao botao-fantasma" onClick={pedirCancelar}>
                    Cancelar
                  </button>
                  <button className="botao botao-neutro" onClick={aoMinimizar}>
                    <IconeSubir className="" />
                    Minimizar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmacao de saida: scrim solido sobre o card, sem backdrop-filter. */}
        {confirmandoSaida && (
          <div className="criacao-confirma">
            <div className="criacao-confirma-caixa">
              <h3>Sair da criação?</h3>
              <p>
                {gerando && !falhou && !pecaSumiu
                  ? "A geração em andamento vai parar e o que foi preenchido se perde."
                  : "O que você preencheu até aqui se perde."}
              </p>
              <div className="criacao-confirma-acoes">
                <button
                  className="botao botao-neutro"
                  onClick={() => setConfirmandoSaida(false)}
                >
                  Continuar aqui
                </button>
                <button className="botao botao-perigo" onClick={() => void sairDeVez()}>
                  Sair
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(corpo, document.body);
}
