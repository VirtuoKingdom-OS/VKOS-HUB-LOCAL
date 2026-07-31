import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import { usarGeracao, LARGURA_FASE, type TipoCriacao } from "../../estado/geracao";
import {
  IconeCheck,
  IconeGaleria,
  IconeRaio,
  IconeSite,
  IconeSubir,
  IconeX,
} from "../comum/Icones";
import { montarPromptCriacao, pastaUnica } from "./prompt";
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
import { esquecerGeracao, formatarDecorrido, inicioDaGeracao } from "./tempoDecorrido";
import "./criacao.css";

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
  aoAbrirDestino: (destino: "cockpit" | "galerias") => void;
}

export function AssistenteCriacao({
  tipo = "carrossel",
  aoConcluir,
  aoCancelar,
  aoAbrirDestino,
}: Props) {
  const { pecas, sessoes, modeloPadrao, pararSessao } = usarEstado();
  const { ativo: provedorAtivo, modelos: modelosIA } = usarProvedoresIA();
  const {
    ativa,
    fase,
    fases,
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

  // Confirmacao de saida.
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  // Geracao viva = ha uma geracao no estado global. Enquanto o wizard esta
  // aberto ele mostra o progresso; o mini card flutuante so aparece minimizado.
  const gerando = ativa !== null;

  // Relogio da geracao. Um numero que anda na tela e o que separa "esta
  // travado" de "esta demorando", e a diferenca entre as duas leituras e a
  // pessoa cancelar ou esperar.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!gerando || falhou || pecaSumiu) return;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [gerando, falhou, pecaSumiu]);
  const decorrido = ativa
    ? formatarDecorrido(agora - inicioDaGeracao(ativa.sessaoId))
    : null;

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
        document.querySelectorAll(".overlay-tela-cheia, .criacao-veu").length <= 1
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

    // Site Guiado: etapas e prompt proprios, skill "site", tipo "site".
    if (tipo === "site") {
      const tema = dadosSite.tema.trim();
      const pasta = pastaUnica(tema, pecas);
      await iniciar({
        titulo: `Site: ${tema}`,
        prompt: montarPromptSite(dadosSite, pasta),
        skill: "site",
        modelo:
          dadosSite.aprimorarComIA === false ? economicoSite : dadosSite.modelo,
        pastaAlvo: pasta,
        tema,
        tipo: "site",
      });
      return;
    }
    const dc = dadosCriacaoDe(dados, tipo);
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
    });
  }, [tipo, dadosSite, dados, pecas, cfg.substantivo, iniciar, provedorAtivo, modelosIA]);

  // Sai de vez: para a sessao se estiver gerando, limpa o estado global e
  // devolve o controle ao pai.
  const sairDeVez = useCallback(async () => {
    if (ativa?.sessaoId) {
      try {
        await pararSessao(ativa.sessaoId);
      } catch {
        // segue saindo mesmo se o backend reclamar
      }
      esquecerGeracao(ativa.sessaoId);
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
    <>
      <div className="veu-modal criacao-veu">
        <div
          className="modal criacao-modal"
          role="dialog"
          aria-modal="true"
          aria-label={cfg.marca}
        >
          <header className="modal-topo">
            <p className="criacao-marca">
              <cfg.Icone className="" />
              {cfg.marca}
            </p>
            <button
              className="botao botao-p botao-icone botao-fantasma"
              onClick={pedirCancelar}
              aria-label="Fechar"
            >
              <IconeX className="" />
            </button>
          </header>

          {!gerando ? (
            tipo === "site" ? (
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
          ) : falhou ? (
            // ===== A geracao parou no meio =====
            <>
              <div className="criacao-corpo">
                <div className="criacao-geracao">
                  <div className="criacao-cabeca">
                    <h2 className="criacao-pergunta">A geração não foi</h2>
                  </div>
                  <p className="criacao-geracao-texto">
                    A sessão parou antes de terminar o {cfg.substantivo}. Nada foi
                    perdido: dá pra tentar de novo com os mesmos dados.
                  </p>
                  {(erroGeracao ?? sessao?.erro) && (
                    <div className="faixa faixa-alerta" role="alert">
                      <div className="faixa-texto">{erroGeracao ?? sessao?.erro}</div>
                    </div>
                  )}
                </div>
              </div>
              <footer className="criacao-rodape">
                <button className="botao botao-neutro" onClick={() => limpar()}>
                  Voltar às etapas
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
              </footer>
            </>
          ) : pecaSumiu ? (
            // ===== A sessao terminou sem deixar a peca =====
            <>
              <div className="criacao-corpo">
                <div className="criacao-geracao">
                  <div className="criacao-cabeca">
                    <h2 className="criacao-pergunta">
                      {tipo === "site"
                        ? "O site ainda não está pronto"
                        : "O arquivo não foi criado"}
                    </h2>
                  </div>
                  <p className="criacao-geracao-texto">
                    {tipo === "site"
                      ? "A sessão terminou, mas nenhum site apareceu na pasta."
                      : `A sessão terminou sem criar o arquivo esperado do ${cfg.substantivo}.`}{" "}
                    Vale conferir nas Galerias se sobrou alguma coisa antes de
                    tentar de novo.
                  </p>
                  {resultadoSemPeca && (
                    <div className="faixa faixa-aviso" role="status">
                      <div className="faixa-texto">
                        A resposta da IA foi: {resultadoSemPeca.slice(0, 700)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <footer className="criacao-rodape">
                <button className="botao botao-neutro" onClick={() => void sairDeVez()}>
                  Fechar
                </button>
                <button
                  className="botao botao-principal"
                  onClick={() => {
                    limpar();
                    aoAbrirDestino("galerias");
                  }}
                >
                  <IconeGaleria className="" />
                  Abrir Galerias
                </button>
              </footer>
            </>
          ) : (
            // ===== Gerando =====
            <>
              <div className="progresso criacao-progresso" aria-hidden="true">
                <div
                  className="progresso-barra"
                  style={{ width: `${LARGURA_FASE[fase]}%` }}
                />
              </div>
              <div className="criacao-corpo">
                <div className="criacao-geracao">
                  <div className="criacao-cabeca">
                    <h2 className="criacao-pergunta">
                      {faseConferencia ?? `Gerando seu ${cfg.substantivo}`}
                    </h2>
                    <span className="criacao-contador">{decorrido}</span>
                  </div>
                  <p className="criacao-geracao-texto">
                    {faseConferencia
                      ? "O Hub está conferindo o site e ajustando o que a auditoria apontou antes de abrir."
                      : "Costuma levar alguns minutos. Pode minimizar e seguir usando o app: quando ficar pronto, um aviso aparece no canto."}
                  </p>
                  <ul className="criacao-fases">
                    {fases.map((f, i) => (
                      <li
                        key={f}
                        className={`criacao-fase${i === fase ? " atual" : ""}${
                          i < fase ? " feita" : ""
                        }`}
                        aria-current={i === fase ? "step" : undefined}
                      >
                        {i < fase ? (
                          <IconeCheck className="" />
                        ) : i === fase ? (
                          <span className="ponto-vivo" />
                        ) : (
                          <span className="criacao-fase-espera" />
                        )}
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <footer className="criacao-rodape">
                <button className="botao botao-fantasma" onClick={pedirCancelar}>
                  Cancelar geração
                </button>
                <button className="botao botao-principal" onClick={aoMinimizar}>
                  <IconeSubir className="" />
                  Minimizar e seguir usando
                </button>
              </footer>
            </>
          )}
        </div>
      </div>

      {/* Confirmacao de saida. Ela cobre a tela inteira, e nao so o card: e uma
          decisao que trava tudo, e meio veu por cima de outro veu le como
          bug. */}
      {confirmandoSaida && (
        <div className="veu-modal">
          <div className="modal" role="alertdialog" aria-modal="true">
            <div className="modal-topo">
              <h2>Sair da criação?</h2>
            </div>
            <div className="modal-corpo">
              <p>
                {gerando && !falhou && !pecaSumiu
                  ? "A geração em andamento vai parar e o que foi preenchido se perde."
                  : "O que você preencheu até aqui se perde."}
              </p>
            </div>
            <div className="modal-rodape">
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
    </>
  );

  return createPortal(corpo, document.body);
}
