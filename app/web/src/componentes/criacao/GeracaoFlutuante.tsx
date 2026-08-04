// Cartao flutuante da geracao minimizada. Fica no canto inferior direito, por
// cima de tudo e sem veu: ele nao atrapalha a navegacao. Mostra o que a pessoa
// precisa saber sem abrir nada, que sao tres coisas: em que fase esta, ha
// quanto tempo, e o que fazer quando terminar. Le tudo do estado global de
// geracao, sem logica propria.

import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { usarGeracao, LARGURA_FASE, type TipoGeracao } from "../../estado/geracao";
import { IconeLapis, IconeOlho, IconeX } from "../comum/Icones";
import { formatarDecorrido, inicioDaGeracao } from "./tempoDecorrido";
import "./criacao.css";
import { irParaPeca } from "../layout/rotas";

// Rotulos curtos por tipo, pro titulo do cartao.
const ROTULO_TIPO: Record<TipoGeracao, string> = {
  carrossel: "carrossel",
  post: "post",
  story: "story",
  site: "site",
  anuncio: "anúncio",
};

// A saida de cada jornada quando a peca fica pronta: o rotulo do botao, o icone
// e pra onde ele leva. Exaustiva sobre TipoGeracao, entao tipo novo sem saida e
// erro de compilacao, e nao um botao que nao leva a lugar nenhum.
const SAIDA_TIPO: Record<
  TipoGeracao,
  { rotulo: string; Icone: (p: { className?: string }) => ReactElement; ir: (pasta: string) => void }
> = {
  carrossel: { rotulo: "Editar no Studio", Icone: IconeLapis, ir: (p) => irParaPeca("studio", p) },
  post: { rotulo: "Editar no Studio", Icone: IconeLapis, ir: (p) => irParaPeca("studio", p) },
  story: { rotulo: "Editar no Studio", Icone: IconeLapis, ir: (p) => irParaPeca("studio", p) },
  site: { rotulo: "Ver o site", Icone: IconeOlho, ir: (p) => irParaPeca("site", p) },
  anuncio: { rotulo: "Ver a campanha", Icone: IconeOlho, ir: (p) => irParaPeca("anuncio", p) },
};

export function GeracaoFlutuante() {
  const {
    ativa,
    minimizada,
    fase,
    fases,
    falhou,
    erro,
    erroPeca,
    pastaPronta,
    faseConferencia,
    conferenciaDemorou,
    limpar,
  } = usarGeracao();

  const rodando = Boolean(ativa) && minimizada && !falhou && pastaPronta === null;
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!rodando) return;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [rodando]);

  // So aparece quando ha geracao viva E minimizada. Com o wizard aberto, e ele
  // que mostra o progresso.
  if (!ativa || !minimizada) return null;

  const saida = SAIDA_TIPO[ativa.tipo];
  const rotulo = ROTULO_TIPO[ativa.tipo];
  const pronta = pastaPronta !== null;
  const decorrido = formatarDecorrido(agora - inicioDaGeracao(ativa.sessaoId));

  const corpo = (
    <div className="geracao-flutuante" role="status" aria-live="polite">
      <div className="geracao-flutuante-topo">
        <span
          className={`ponto-vivo${falhou ? " erro" : pronta ? " parado" : ""}`}
          aria-hidden="true"
        />
        <span className="geracao-flutuante-texto">
          <span className="geracao-flutuante-titulo">
            {falhou
              ? "A geração não foi"
              : pronta
                ? `Seu ${rotulo} está pronto`
                : `Gerando seu ${rotulo}`}
          </span>
          <span className="geracao-flutuante-tema" title={ativa.tema}>
            {ativa.tema}
          </span>
        </span>
        {(pronta || falhou || conferenciaDemorou) && (
          <button
            className="botao botao-p botao-icone botao-fantasma"
            onClick={limpar}
            aria-label="Dispensar aviso"
          >
            <IconeX className="" />
          </button>
        )}
      </div>

      {pronta ? (
        <button
          className="botao botao-principal geracao-flutuante-editar"
          onClick={() => {
            saida.ir(pastaPronta);
            limpar();
          }}
        >
          <saida.Icone className="" />
          {saida.rotulo}
        </button>
      ) : falhou ? (
        <p className="geracao-flutuante-erro">
          {/* O erro da peca vem primeiro quando existe: ele diz QUAL campo do
              arquivo saiu errado, e isso e mais util que qualquer frase geral. */}
          {erro ?? erroPeca ?? "A sessão parou antes de terminar. Tente de novo pelo Criar."}
        </p>
      ) : (
        <>
          <div className="geracao-flutuante-fase">
            {faseConferencia ?? fases[fase]}, há {decorrido}
          </div>
          <div className="progresso" aria-hidden="true">
            <div
              className="progresso-barra"
              style={{ width: `${LARGURA_FASE[fase]}%` }}
            />
          </div>
        </>
      )}
    </div>
  );

  return createPortal(corpo, document.body);
}
