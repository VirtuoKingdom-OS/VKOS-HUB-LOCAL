import { useEffect, useState } from "react";
import type { Peca } from "../../tipos/dominio";
import { excluirPeca } from "../../api/cliente";
import {
  baseNome,
  formatarData,
  formatarTema,
  nomeArquivo,
  nomeDownload,
  nomePagina,
} from "../telas/fluxos";
import { IconeArquivo, IconeLixeira, IconeSeta } from "../comum/Icones";
import { IconeBaixar } from "../telas/icones";

interface Props {
  peca: Peca;
  // Abre o visor com a lista de imagens do pedido, na imagem clicada.
  aoAmpliar: (urls: string[], indice: number) => void;
}

// Diz se a peça é de imagem (carrossel, stories ou post) e tem prévias. O post
// e uma pagina unica, mas ainda e imagem: mostra miniatura, download e lightbox
// como os demais, em vez de virar uma lista de arquivos.
function ehPecaImagem(peca: Peca): boolean {
  return (
    (peca.tipo === "carrossel" ||
      peca.tipo === "stories" ||
      peca.tipo === "post") &&
    peca.previews.length > 0
  );
}

// Rotulo do botao de baixar tudo, conforme o tipo.
function rotuloBaixarTudo(peca: Peca): string {
  if (peca.tipo === "stories") return "Baixar stories";
  if (peca.tipo === "post") return "Baixar post";
  return "Baixar carrossel";
}

// Botao de excluir uma geracao, com confirmacao em dois cliques: o primeiro
// arma (fica vermelho, com um balao "Confirmar?" flutuante), o segundo apaga.
// O botao NUNCA muda de tamanho ao armar, senao o layout desloca e o segundo
// clique erra o alvo. O desarme e por tempo (4s), nao por mouse: sair com o
// mouse nao pode cancelar a intencao. Apagar e irreversivel: a pasta da peca
// some do disco. A lista global atualiza pelo evento pecas:atualizadas do WS.
export function BotaoExcluirPeca({ pasta }: { pasta: string }) {
  const [armado, setArmado] = useState(false);
  const [apagando, setApagando] = useState(false);

  // Armou e nao confirmou: desarma sozinho depois de 4 segundos.
  useEffect(() => {
    if (!armado) return;
    const timer = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(timer);
  }, [armado]);

  const aoClicar = async () => {
    if (apagando) return;
    if (!armado) {
      setArmado(true);
      return;
    }
    setApagando(true);
    try {
      await excluirPeca(pasta);
    } catch {
      setApagando(false);
      setArmado(false);
    }
  };

  return (
    <button
      className={`botao botao-excluir-peca${armado ? " armado" : ""}${apagando ? " apagando" : ""}`}
      onClick={aoClicar}
      title={armado ? "Clique de novo pra apagar de vez" : "Excluir esta geração"}
    >
      <IconeLixeira className="" />
      {(armado || apagando) && (
        <span className="aviso-confirmar">
          {apagando ? "Apagando..." : "Confirmar exclusão?"}
        </span>
      )}
    </button>
  );
}

// Card de um pedido (uma subpasta de conteudo). O corpo muda conforme o tipo.
export function CartaoPeca({ peca, aoAmpliar }: Props) {
  const tema = formatarTema(peca.tema);
  const data = formatarData(peca.data);
  const imagem = ehPecaImagem(peca);
  const base = baseNome(peca.tema);
  const urlZip = `/api/vkos/pecas/${encodeURIComponent(peca.pasta)}/zip`;

  return (
    <article className={`cartao-peca${imagem ? " grande" : ""}`}>
      <header className="cartao-peca-topo">
        <div className="cartao-peca-titulo">
          <h3>{tema}</h3>
          {data && <span className="cartao-peca-data">{data}</span>}
        </div>
        {imagem && (
          <a
            className="botao botao-neutro botao-baixar-tudo"
            href={urlZip}
            download
            title="Baixar todas as imagens em um zip"
          >
            <IconeBaixar className="" />
            {rotuloBaixarTudo(peca)}
          </a>
        )}
        <BotaoExcluirPeca pasta={peca.pasta} />
      </header>
      {corpo(peca, tema, base, imagem, aoAmpliar)}
    </article>
  );
}

function corpo(
  peca: Peca,
  tema: string,
  base: string,
  imagem: boolean,
  aoAmpliar: (urls: string[], indice: number) => void
) {
  if (imagem) {
    return (
      <div className="tira-imagens grande">
        {peca.previews.map((url, i) => (
          <div className="miniatura-caixa" key={url}>
            <button
              className="miniatura"
              onClick={() => aoAmpliar(peca.previews, i)}
              title={`${tema}, imagem ${i + 1}`}
            >
              <img
                src={url}
                alt={`${tema}, imagem ${i + 1}`}
                loading="lazy"
                decoding="async"
              />
            </button>
            <a
              className="baixar-mini"
              href={url}
              download={nomeDownload(base, i, url)}
              title="Baixar esta imagem"
            >
              <IconeBaixar className="" />
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (peca.tipo === "site" && peca.previews.length > 0) {
    return (
      <div className="cartao-links">
        {peca.previews.map((url) => (
          <a
            className="botao botao-neutro"
            href={url}
            target="_blank"
            rel="noreferrer"
            key={url}
          >
            <IconeSeta className="" />
            Abrir {nomePagina(url)}
          </a>
        ))}
      </div>
    );
  }

  // Texto, outros, ou tipos sem preview: lista os arquivos do pedido.
  if (peca.arquivos.length > 0) {
    return (
      <ul className="lista-arquivos">
        {peca.arquivos.map((a) => (
          <li key={a}>
            <IconeArquivo className="" />
            <span>{nomeArquivo(a)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <p className="cartao-peca-vazio">Sem arquivos neste pedido.</p>;
}
