// Mini card flutuante da geracao minimizada. Fica no canto inferior direito,
// pequeno e por cima de tudo, sem overlay: nao atrapalha a navegacao. Mostra a
// geracao em andamento (titulo + barra de fases) e, ao concluir, o botao
// "Editar no Studio". Le tudo do estado global de geracao, sem logica propria.

import { createPortal } from "react-dom";
import { usarGeracao, LARGURA_FASE } from "../../estado/geracao";
import {
  IconeAlerta,
  IconeCarrossel,
  IconeLapis,
  IconeOlho,
  IconePost,
  IconeSite,
  IconeStories,
  IconeX,
} from "../comum/Icones";
import "../../estilos/criacao.css";

// Rotulos curtos por tipo, pro titulo do mini card.
const ROTULO_TIPO: Record<string, string> = {
  carrossel: "carrossel",
  post: "post",
  story: "story",
  site: "site",
};

// Vai pro Studio de uma peca (pasta URL-encoded no hash).
function irParaStudio(pasta: string) {
  window.location.hash = "#/studio/" + encodeURIComponent(pasta);
}

// Vai pra tela do site de uma peca (pasta URL-encoded no hash).
function irParaSite(pasta: string) {
  window.location.hash = "#/site/" + encodeURIComponent(pasta);
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

  // So aparece quando ha geracao viva E minimizada. Com o wizard aberto, ele e
  // que mostra o progresso.
  if (!ativa || !minimizada) return null;

  const ehSite = ativa.tipo === "site";
  const Icone =
    ativa.tipo === "post"
      ? IconePost
      : ativa.tipo === "story"
        ? IconeStories
        : ehSite
          ? IconeSite
          : IconeCarrossel;
  const rotulo = ROTULO_TIPO[ativa.tipo] ?? "carrossel";
  const pronta = pastaPronta !== null;

  const corpo = (
    <div
      className={`geracao-flutuante${pronta ? " pronta" : ""}${falhou ? " falhou" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="geracao-flutuante-topo">
        <span className="geracao-flutuante-selo">
          {falhou ? <IconeAlerta className="" /> : <Icone className="" />}
        </span>
        <span className="geracao-flutuante-texto">
          <span className="geracao-flutuante-titulo">
            {falhou
              ? "A geração não foi"
              : pronta
                ? "Pronto!"
                : `Gerando seu ${rotulo}`}
          </span>
          <span className="geracao-flutuante-tema" title={ativa.tema}>
            {ativa.tema}
          </span>
        </span>
        {(pronta || falhou || conferenciaDemorou) && (
          <button
            className="geracao-flutuante-x"
            onClick={limpar}
            aria-label="Dispensar"
            title="Dispensar"
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
          {erro ?? "A sessão parou antes de terminar. Tente de novo pelo criar."}
        </p>
      ) : (
        <>
          <div className="geracao-flutuante-fase">{faseConferencia ?? fases[fase]}</div>
          <div className="geracao-flutuante-barra">
            <div
              className="geracao-flutuante-barra-cheia"
              style={{ width: `${LARGURA_FASE[fase]}%` }}
            />
          </div>
        </>
      )}
    </div>
  );

  return createPortal(corpo, document.body);
}
