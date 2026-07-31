import { IconeX } from "../comum/Icones";

// Folha de atalhos do Studio. Existe porque nada na tela contava que arrastar,
// duplicar, mover com as setas e desfazer eram possiveis: a manipulacao direta
// so ajuda quem descobre que ela existe. Fica atras de um botao, no espirito de
// progressive disclosure, e nao ocupa espaco do trabalho.

interface Atalho {
  teclas: string[];
  o_que: string;
}

interface Grupo {
  titulo: string;
  itens: Atalho[];
}

const GRUPOS: Grupo[] = [
  {
    titulo: "No canvas",
    itens: [
      { teclas: ["Clique"], o_que: "Seleciona o elemento" },
      { teclas: ["Clique", "de novo"], o_que: "Alterna entre elementos empilhados no ponto" },
      { teclas: ["Duplo clique"], o_que: "Edita o texto no lugar" },
      { teclas: ["Enter"], o_que: "Edita o texto do que está selecionado" },
      { teclas: ["Arrastar"], o_que: "Move, com guias de alinhamento" },
      { teclas: ["Shift"], o_que: "Ao arrastar a alça de canto, trava a proporção" },
      { teclas: ["Esc"], o_que: "Sai da edição, ou solta a seleção" },
    ],
  },
  {
    titulo: "Com um elemento selecionado",
    itens: [
      { teclas: ["←", "↑", "→", "↓"], o_que: "Move 1 px" },
      { teclas: ["Shift", "+", "seta"], o_que: "Move 10 px" },
      { teclas: ["Ctrl", "D"], o_que: "Duplica ao lado" },
      { teclas: ["Delete"], o_que: "Pede a exclusão" },
    ],
  },
  {
    titulo: "Sempre",
    itens: [
      { teclas: ["Ctrl", "Z"], o_que: "Desfaz" },
      { teclas: ["Ctrl", "Shift", "Z"], o_que: "Refaz" },
      { teclas: ["Ctrl", "S"], o_que: "Salva" },
    ],
  },
];

interface Props {
  aoFechar: () => void;
}

export function AtalhosStudio({ aoFechar }: Props) {
  return (
    <div className="veu-modal" onMouseDown={aoFechar}>
      <div
        className="modal"
        role="dialog"
        aria-label="Atalhos do teclado"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-topo">
          <h2>Atalhos</h2>
          <button
            className="botao botao-p botao-icone botao-fantasma"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </header>
        <div className="modal-corpo studio-atalhos-corpo">
          {GRUPOS.map((g) => (
            <section key={g.titulo}>
              {/* Cabecalho de conteudo, nao rotulo de gaveta: aqui ele nao e
                  redundante, e quem nao o ler perde em qual contexto o atalho
                  vale. Por isso nao e caixa alta. */}
              <div className="studio-atalhos-grupo">{g.titulo}</div>
              <ul>
                {g.itens.map((a) => (
                  <li key={a.o_que}>
                    <span className="studio-atalhos-teclas">
                      {a.teclas.map((t, i) =>
                        t === "+" ? (
                          <span key={i} className="studio-atalhos-mais">
                            +
                          </span>
                        ) : (
                          <kbd key={i}>{t}</kbd>
                        ),
                      )}
                    </span>
                    <span className="studio-atalhos-oque">{a.o_que}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
