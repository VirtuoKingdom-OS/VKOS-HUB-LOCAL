import { useEffect, useRef, useState } from "react";
import type { Peca } from "../../tipos/dominio";
import { excluirPeca } from "../../api/cliente";
import {
  baseNome,
  formatarDataHora,
  formatarTema,
  nomeArquivo,
  nomeDownload,
  nomePagina,
} from "../telas/fluxos";
import { IconeArquivo, IconeLapis, IconeLixeira, IconeSeta } from "../comum/Icones";
import { IconeBaixar } from "../telas/icones";
import "./pecas.css";

interface Props {
  peca: Peca;
  // Abre o visor na peca inteira, na pagina/imagem clicada.
  aoAmpliar: (peca: Peca, indice: number) => void;
  // So pecas fonteHtml oferecem editar. Sem prop, o botao nao aparece.
  aoEditar?: (pasta: string) => void;
  // Peca que tem tela propria (site e anuncio) oferece a acao "Abrir". Quem
  // decide pra onde ir e quem passa a prop, porque o destino e do tipo da peca.
  // Sem a prop, o botao nao aparece.
  aoAbrir?: (pasta: string) => void;
  // Card mais baixo e tira de paginas mais densa (rodada 14: filtro "Todos"
  // da galeria unificada). Sem a prop, o card fica no tamanho de sempre: nao
  // afeta o cockpit nem as telas de fluxo por tipo, que nao passam isto.
  condensado?: boolean;
}

// Rota do PNG de uma pagina de peca fonteHtml, renderizado sob demanda.
function urlPngPagina(pasta: string, indice: number): string {
  return `/api/vkos/pecas/${encodeURIComponent(pasta)}/png/${indice + 1}`;
}

// Rota do zip com todas as paginas de uma peca fonteHtml.
function urlPngZip(pasta: string): string {
  return `/api/vkos/pecas/${encodeURIComponent(pasta)}/png-zip`;
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
      className={`botao botao-p botao-icone botao-fantasma botao-excluir-peca${
        armado ? " armado" : ""
      }${apagando ? " apagando" : ""}`}
      onClick={aoClicar}
      aria-label={armado ? "Clique de novo pra apagar de vez" : "Excluir esta geração"}
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
export function CartaoPeca({
  peca,
  aoAmpliar,
  aoEditar,
  aoAbrir,
  condensado,
}: Props) {
  const tema = formatarTema(peca.tema);
  // criadoEm (interface 3) chega do backend com data e hora; sem ele, cai na
  // data sozinha, como sempre foi. Cast tolerante: nao trava o typecheck
  // deste dono enquanto o tipo Peca em dominio.ts ainda nao ganhou o campo.
  const criadoEm = (peca as Peca & { criadoEm?: string }).criadoEm;
  const data = formatarDataHora(peca.data, criadoEm);
  const imagem = ehPecaImagem(peca);
  const base = baseNome(peca.tema);
  const urlZip = peca.fonteHtml
    ? urlPngZip(peca.pasta)
    : `/api/vkos/pecas/${encodeURIComponent(peca.pasta)}/zip`;

  return (
    <article
      className={`cartao cartao-peca${imagem ? " grande" : ""}${
        condensado ? " condensado" : ""
      }`}
    >
      <header className="cartao-peca-topo">
        <div className="cartao-peca-titulo">
          <h3>{tema}</h3>
          {data && <span className="cartao-peca-data">{data}</span>}
        </div>
        {/* As acoes viajam JUNTAS quando a linha quebra. Soltas, o
            "space-between" empurrava a lixeira pra ponta oposta da segunda
            linha, longe do botao que ela acompanha. */}
        <div className="cartao-peca-acoes">
        {imagem && peca.fonteHtml && aoEditar && (
          <button
            className="botao botao-p botao-neutro"
            onClick={() => aoEditar(peca.pasta)}
            title="Abrir no Studio"
          >
            <IconeLapis className="" />
            Editar no Studio
          </button>
        )}
        {/* Neutro, nao principal: sao ate trinta cartoes iguais na mesma tela,
            e trinta acoes principais nao e uma acao principal. */}
        {(peca.tipo === "site" || peca.tipo === "anuncio") && aoAbrir && (
          <button
            className="botao botao-p botao-neutro"
            onClick={() => aoAbrir(peca.pasta)}
            title={peca.tipo === "site" ? "Abrir a tela do site" : "Abrir a campanha"}
          >
            <IconeSeta className="" />
            Abrir
          </button>
        )}
        {imagem && (
          <a
            className="botao botao-p botao-neutro"
            href={urlZip}
            download
            title="Baixar todas as imagens em um zip"
          >
            <IconeBaixar className="" />
            {rotuloBaixarTudo(peca)}
          </a>
        )}
          <BotaoExcluirPeca pasta={peca.pasta} />
        </div>
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
  aoAmpliar: (peca: Peca, indice: number) => void
) {
  if (imagem && peca.fonteHtml) {
    return (
      <div className="tira-imagens grande">
        {peca.previews.map((url, i) => (
          <div className="miniatura-caixa" key={url}>
            <MiniaturaPagina
              url={url}
              titulo={`${tema}, página ${i + 1}`}
              aoClicar={() => aoAmpliar(peca, i)}
            />
            <a
              className="baixar-mini"
              href={urlPngPagina(peca.pasta, i)}
              aria-label={`Baixar o PNG da página ${i + 1}`}
              title="Baixar o PNG desta página"
            >
              <IconeBaixar className="" />
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (imagem) {
    return (
      <div className="tira-imagens grande">
        {peca.previews.map((url, i) => (
          <div className="miniatura-caixa" key={url}>
            <button
              className="miniatura"
              onClick={() => aoAmpliar(peca, i)}
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
              aria-label={`Baixar a imagem ${i + 1}`}
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

// Miniatura viva de uma pagina de carrossel fonteHtml: iframe da pagina isolada
// (o body do endpoint tem o tamanho exato do slide), escalado com transform:
// scale() pra caber na moldura da miniatura, mesmo padrao do MiniaturaSite. Sem
// interacao (pointer-events none no css): o proprio botao em volta e o alvo do
// clique, o iframe so preenche visualmente. Monta perto da tela (Intersection
// Observer) pra nao pesar tiras longas com muitos iframes de uma vez.
function MiniaturaPagina({
  url,
  titulo,
  aoClicar,
}: {
  url: string;
  titulo: string;
  aoClicar: () => void;
}) {
  const refCaixa = useRef<HTMLDivElement>(null);
  const refIframe = useRef<HTMLIFrameElement>(null);
  const [visivel, setVisivel] = useState(false);
  const [dimsPagina, setDimsPagina] = useState<{ largura: number; altura: number } | null>(
    null
  );
  const [fator, setFator] = useState(0);

  // So monta o iframe quando o slot chega perto da tela.
  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa) return;
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setVisivel(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(caixa);
    return () => io.disconnect();
  }, []);

  // Mede o slot e reage a mudanca de tamanho (ex: layout responsivo).
  useEffect(() => {
    const caixa = refCaixa.current;
    if (!caixa || !dimsPagina) return;
    const medir = () => {
      const f = caixa.clientWidth / dimsPagina.largura;
      setFator(f > 0 ? f : 0);
    };
    const ro = new ResizeObserver(medir);
    ro.observe(caixa);
    medir();
    return () => ro.disconnect();
  }, [dimsPagina]);

  // Le o tamanho real do slide direto do documento carregado (contentDocument
  // e acessivel porque a pagina isolada e servida na mesma origem).
  function aoCarregar() {
    const doc = refIframe.current?.contentDocument;
    if (!doc?.body) return;
    setDimsPagina({ largura: doc.body.scrollWidth, altura: doc.body.scrollHeight });
  }

  return (
    <button className="miniatura miniatura-pagina" onClick={aoClicar} title={titulo}>
      <div className="miniatura-pagina-caixa" ref={refCaixa}>
        {visivel && (
          <iframe
            ref={refIframe}
            className="miniatura-pagina-frame"
            src={url}
            title={titulo}
            tabIndex={-1}
            aria-hidden="true"
            onLoad={aoCarregar}
            style={
              dimsPagina && fator > 0
                ? {
                    width: `${dimsPagina.largura}px`,
                    height: `${dimsPagina.altura}px`,
                    transform: `scale(${fator})`,
                  }
                : { opacity: 0 }
            }
          />
        )}
      </div>
    </button>
  );
}
