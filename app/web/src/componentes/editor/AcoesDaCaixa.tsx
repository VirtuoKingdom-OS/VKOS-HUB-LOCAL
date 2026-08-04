import { IconeSubir, IconeX } from "../comum/Icones";

// AS AÇÕES DA CAIXA (2026-07-31).
//
// Um contêiner de template, como o `.wrap` dos carrosséis, é TRÊS coisas ao
// mesmo tempo: a pele (fundo, fio, blur, sombra), o layout (posição, flex,
// padding) e o pai dos textos. Até esta rodada o editor só sabia apagar as três
// juntas, com os filhos dentro. Quem quisesse tirar o fundo blur de trás de um
// texto perdia o texto.
//
// Cada botão daqui ataca uma parte, e só aparece quando faz sentido: botão que
// às vezes não faz nada é pior que botão nenhum.
//
// Elas moram no painel de propriedades, e não na lista de camadas, porque pele
// de contêiner é PROPRIEDADE do contêiner, não uma camada separada.

export interface PropsAcoesDaCaixa {
  temPele: boolean;
  peleLimpa: boolean;
  podeSoltar: boolean;
  podeDesagrupar: boolean;
  filhosConteudo: number;
  aoAlternarPele: () => void;
  aoSoltar: () => void;
  aoDesagrupar: () => void;
}

export function AcoesDaCaixa({
  temPele,
  peleLimpa,
  podeSoltar,
  podeDesagrupar,
  filhosConteudo,
  aoAlternarPele,
  aoSoltar,
  aoDesagrupar,
}: PropsAcoesDaCaixa) {
  if (!temPele && !podeSoltar && !podeDesagrupar) return null;
  return (
    <div className="acoes-caixa">
      {temPele && (
        <button
          type="button"
          className="botao botao-p botao-neutro"
          onClick={aoAlternarPele}
          title={
            peleLimpa
              ? "Devolve o fundo, o fio, o blur e a sombra deste bloco"
              : "Tira o fundo, o fio, o blur e a sombra. O texto de dentro fica"
          }
        >
          {peleLimpa ? "Devolver o fundo" : "Limpar o fundo"}
        </button>
      )}
      {podeSoltar && (
        <button
          type="button"
          className="botao botao-p botao-neutro"
          onClick={aoSoltar}
          title="Tira este elemento de dentro do bloco, sem sair do lugar na tela"
        >
          <IconeSubir className="" />
          Soltar do bloco
        </button>
      )}
      {podeDesagrupar && (
        <button
          type="button"
          className="botao botao-p botao-neutro"
          onClick={aoDesagrupar}
          title={`Dissolve este bloco. Os ${filhosConteudo} elementos de dentro ficam onde estão`}
        >
          <IconeX className="" />
          Desagrupar
        </button>
      )}
    </div>
  );
}
