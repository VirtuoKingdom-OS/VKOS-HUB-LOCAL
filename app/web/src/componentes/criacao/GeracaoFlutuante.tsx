// Cartao flutuante da geracao minimizada. Fica no canto inferior direito, por
// cima de tudo e sem veu: ele nao atrapalha a navegacao. Mostra o que a pessoa
// precisa saber sem abrir nada, que sao tres coisas: em que fase esta, ha
// quanto tempo, e o que fazer quando terminar. Le tudo do estado global de
// geracao, sem logica propria.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usarGeracao, LARGURA_FASE } from "../../estado/geracao";
import { IconeLapis, IconeOlho, IconeX } from "../comum/Icones";
import { formatarDecorrido, inicioDaGeracao } from "./tempoDecorrido";
import "./criacao.css";
import { irParaPeca } from "../layout/rotas";

// Rotulos curtos por tipo, pro titulo do cartao.
const ROTULO_TIPO: Record<string, string> = {
  carrossel: "carrossel",
  post: "post",
  story: "story",
  site: "site",
};

// Vai pro Studio de uma peca (pasta URL-encoded no hash).
function irParaStudio(pasta: string) {
  irParaPeca("studio", pasta);
}

// Vai pra tela do site de uma peca (pasta URL-encoded no hash).
function irParaSite(pasta: string) {
  irParaPeca("site", pasta);
}

export function GeracaoFlutuante() {
  const {
    ativa,
    minimizada,
    fase,
    fases,
    falhou,
    erro,
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

  const ehSite = ativa.tipo === "site";
  const rotulo = ROTULO_TIPO[ativa.tipo] ?? "carrossel";
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
            if (ehSite) irParaSite(pastaPronta);
            else irParaStudio(pastaPronta);
            limpar();
          }}
        >
          {ehSite ? <IconeOlho className="" /> : <IconeLapis className="" />}
          {ehSite ? "Ver o site" : "Editar no Studio"}
        </button>
      ) : falhou ? (
        <p className="geracao-flutuante-erro">
          {erro ?? "A sessão parou antes de terminar. Tente de novo pelo Criar."}
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
