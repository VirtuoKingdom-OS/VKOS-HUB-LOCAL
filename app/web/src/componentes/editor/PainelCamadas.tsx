import { IconeChevron } from "../comum/Icones";

// Painel de camadas compartilhado entre os editores (carrossel e site). Ele e
// so apresentacao: recebe a lista pronta de camadas do slide ou da secao (do
// mais alto pro mais baixo no empilhamento), a selecao atual e os callbacks.
// Quem monta (Studio, overlay do carrossel, painel do site) traduz as acoes
// pro motor correspondente. Estilos em editor.css, por token, nos 3 temas.

export type DirecaoCamada = "acima" | "abaixo";

export interface ItemCamada {
  // Id estavel do elemento (data-vk).
  id: string;
  // Papel deduzido: "Texto", "Imagem", "Enfeite" ou "Bloco".
  nome: string;
  // Primeiras palavras do conteudo, vazio quando nao ha texto relevante.
  conteudo: string;
  // Detalhe tecnico (tag.classes), vai no title da linha.
  detalhe: string;
  // Nivel de aninhamento: 0 = filho direto do slide/secao, 1 = filho de conteiner.
  nivel: 0 | 1;
  // Ha alguem acima/abaixo no mesmo pai (habilita as setas).
  podeSubir: boolean;
  podeDescer: boolean;
}

export interface PropsPainelCamadas {
  itens: ItemCamada[];
  selecionadoId: string | null;
  aoSelecionar: (id: string) => void;
  aoMover: (id: string, direcao: DirecaoCamada) => void;
}

export function PainelCamadas({
  itens,
  selecionadoId,
  aoSelecionar,
  aoMover,
}: PropsPainelCamadas) {
  if (itens.length === 0) {
    return <p className="painel-vazio">Nenhuma camada visível nesta página.</p>;
  }
  return (
    <ul className="lista camadas-lista">
      {itens.map((item) => (
        <li
          key={item.id}
          className={`item-lista camadas-item camadas-nivel-${item.nivel}${
            item.id === selecionadoId ? " ativo" : ""
          }`}
        >
          <button
            type="button"
            className="camadas-nome"
            onClick={() => aoSelecionar(item.id)}
            title={item.detalhe}
            aria-current={item.id === selecionadoId ? "true" : undefined}
          >
            <span className="camadas-papel">{item.nome}</span>
            {item.conteudo && <span className="camadas-conteudo">{item.conteudo}</span>}
          </button>
          {/* As setas nascem visíveis. Ação que só aparece no hover não existe
              pro teclado, não existe pro toque, e some pra quem não sabe que
              ela está ali. */}
          <span className="item-lista-acoes">
            <button
              type="button"
              className="botao botao-p botao-icone botao-fantasma camadas-seta camadas-seta-cima"
              disabled={!item.podeSubir}
              onClick={() => aoMover(item.id, "acima")}
              title="Trazer pra frente"
              aria-label={`Trazer ${item.nome} pra frente`}
            >
              <IconeChevron className="" />
            </button>
            <button
              type="button"
              className="botao botao-p botao-icone botao-fantasma camadas-seta camadas-seta-baixo"
              disabled={!item.podeDescer}
              onClick={() => aoMover(item.id, "abaixo")}
              title="Levar pra trás"
              aria-label={`Levar ${item.nome} pra trás`}
            >
              <IconeChevron className="" />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
