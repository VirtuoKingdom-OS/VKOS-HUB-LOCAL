import { useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { urlArquivoContexto } from "../../api/cliente";
import type { Contexto, TipoContexto } from "../../tipos/dominio";
import { EditorContexto } from "../comum/EditorContexto";
import { Confirmacao, type DadosConfirmacao } from "../comum/Confirmacao";
import { IconeLapis, IconeLixeira, IconeMais, IconeX } from "../comum/Icones";
import { IconeBaixar, IconeImagens, IconeLink } from "./icones";
import {
  ehImagem,
  formatarDataHora,
  parsearLinks,
  primeirasLinhas,
  ROTULO_FONTE,
  ROTULO_FONTE_ARTIGO,
  tituloLink,
} from "./fontes";

interface Props {
  tipo: TipoContexto;
  aoVoltar?: () => void;
}

// Tela de uma fonte de dados: os contextos daquele tipo em cards generosos.
export function TelaFonte({ tipo, aoVoltar }: Props) {
  const { contextos, criarContexto, excluirContexto } = usarEstado();
  const [editando, setEditando] = useState<Contexto | null>(null);
  const [criando, setCriando] = useState(false);
  const [confirmar, setConfirmar] = useState<DadosConfirmacao | null>(null);

  const itens = useMemo(
    () =>
      contextos
        .filter((c) => c.tipo === tipo)
        .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)),
    [contextos, tipo]
  );

  // Mantem o editor sincronizado com a versao mais nova do contexto.
  const editandoAtual = editando
    ? contextos.find((c) => c.id === editando.id) ?? null
    : null;

  const contagem = itens.length;
  const rotuloContagem = contagem === 1 ? "1 fonte" : `${contagem} fontes`;

  async function criar(nome: string) {
    const contexto = await criarContexto(nome, tipo);
    setCriando(false);
    // Abre o editor da fonte recem-criada pra ja preencher.
    setEditando(contexto);
  }

  function pedirExcluir(contexto: Contexto) {
    setConfirmar({
      titulo: `Excluir "${contexto.nome}"?`,
      mensagem:
        "Isso apaga a fonte e todos os arquivos dela do disco. Não dá pra desfazer.",
      rotuloConfirmar: "Excluir fonte",
      aoConfirmar: () => {
        void excluirContexto(contexto.id);
      },
    });
  }

  return (
    <section className="tela-fluxo">
      <header className="tela-fluxo-topo tela-fonte-topo">
        <div>
          {aoVoltar && (
            <button className="botao-voltar-fontes" onClick={aoVoltar}>
              <span aria-hidden="true">←</span>
              Fontes de dados
            </button>
          )}
          <h1>{ROTULO_FONTE[tipo]}</h1>
          <p className="subtitulo">{rotuloContagem}</p>
        </div>
        <button
          className="botao botao-principal"
          onClick={() => setCriando(true)}
        >
          <IconeMais className="" />
          Nova fonte
        </button>
      </header>

      {contagem === 0 ? (
        <div className="fluxo-vazio">
          <IconeImagens className="icone-vazio" style={{ width: 40, height: 40 }} />
          <h2>Nenhuma fonte de {ROTULO_FONTE_ARTIGO[tipo]} ainda</h2>
          <p>
            Crie uma fonte pra guardar {ROTULO_FONTE_ARTIGO[tipo]} que suas
            sessões vão usar como referência.
          </p>
          <button
            className="botao botao-principal"
            onClick={() => setCriando(true)}
          >
            <IconeMais className="" />
            Nova fonte
          </button>
        </div>
      ) : (
        <div className="tela-fonte-corpo">
          {itens.map((contexto) => (
            <CartaoFonte
              key={contexto.id}
              contexto={contexto}
              aoAbrir={() => setEditando(contexto)}
              aoExcluir={() => pedirExcluir(contexto)}
            />
          ))}
        </div>
      )}

      {criando && (
        <PromptNovaFonte
          tipo={tipo}
          aoConfirmar={criar}
          aoFechar={() => setCriando(false)}
        />
      )}

      {editandoAtual && (
        <EditorContexto
          contexto={editandoAtual}
          aberto={true}
          aoFechar={() => setEditando(null)}
        />
      )}

      {confirmar && (
        <Confirmacao dados={confirmar} aoFechar={() => setConfirmar(null)} />
      )}
    </section>
  );
}

// Card de uma fonte: nome, quando foi atualizada, prévia e ações.
function CartaoFonte({
  contexto,
  aoAbrir,
  aoExcluir,
}: {
  contexto: Contexto;
  aoAbrir: () => void;
  aoExcluir: () => void;
}) {
  const atualizada = formatarDataHora(contexto.atualizadaEm);

  return (
    <article className="cartao-fonte">
      <header className="cartao-fonte-topo">
        <h3>{contexto.nome}</h3>
        {atualizada && (
          <span className="cartao-fonte-data">atualizada em {atualizada}</span>
        )}
      </header>

      <div className="cartao-fonte-previa">
        <PreviaFonte contexto={contexto} />
      </div>

      <div className="cartao-fonte-acoes">
        <button className="botao botao-neutro" onClick={aoAbrir}>
          <IconeLapis className="" />
          Abrir
        </button>
        <button
          className="botao-icone-perigo"
          onClick={aoExcluir}
          title="Excluir esta fonte"
          aria-label="Excluir esta fonte"
        >
          <IconeLixeira className="" />
        </button>
      </div>
    </article>
  );
}

// Prévia do conteudo conforme o tipo da fonte.
function PreviaFonte({ contexto }: { contexto: Contexto }) {
  if (contexto.tipo === "imagens") {
    const imagens = contexto.arquivos
      .filter((a) => ehImagem(a.nome, a.tipo))
      .slice(0, 4);
    if (imagens.length === 0) {
      return <p className="previa-vazia">Sem imagens ainda.</p>;
    }
    return (
      <div className="previa-imagens">
        {imagens.map((a) => (
          <div className="previa-mini" key={a.nome}>
            <img
              src={urlArquivoContexto(contexto.id, a.nome)}
              alt={a.nome}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    );
  }

  if (contexto.tipo === "links") {
    const links = parsearLinks(contexto.texto).slice(0, 3);
    if (links.length === 0) {
      return <p className="previa-vazia">Sem links ainda.</p>;
    }
    return (
      <ul className="previa-links">
        {links.map((l, i) => (
          <li key={`${l.url}-${i}`}>
            <IconeLink className="" />
            <span className="previa-link-texto">
              {l.descricao || tituloLink(l.url)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  // Texto: primeiras linhas.
  const linhas = primeirasLinhas(contexto.texto, 4);
  if (linhas.length === 0) {
    return <p className="previa-vazia">Sem texto ainda.</p>;
  }
  return (
    <div className="previa-texto">
      {linhas.map((linha, i) => (
        <p key={i}>{linha}</p>
      ))}
    </div>
  );
}

// Prompt estilizado pra nomear a nova fonte. Esc ou clique fora fecham.
function PromptNovaFonte({
  tipo,
  aoConfirmar,
  aoFechar,
}: {
  tipo: TipoContexto;
  aoConfirmar: (nome: string) => void | Promise<void>;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  async function enviar() {
    const limpo = nome.trim();
    if (!limpo || salvando) return;
    setSalvando(true);
    try {
      await aoConfirmar(limpo);
    } catch {
      setSalvando(false);
    }
  }

  return (
    <div className="overlay-fonte" onClick={aoFechar}>
      <div
        className="cartao-prompt"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="cartao-prompt-topo">
          <div className="cartao-prompt-selo">
            <IconeBaixar className="" style={{ transform: "rotate(180deg)" }} />
          </div>
          <h2>Nova fonte de {ROTULO_FONTE_ARTIGO[tipo]}</h2>
          <button
            className="botao-fantasma cartao-prompt-x"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </div>
        <p className="cartao-prompt-ajuda">
          Dê um nome pra reconhecer essa fonte depois.
        </p>
        <input
          ref={campo}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void enviar();
          }}
          placeholder="Ex: referências da marca"
          maxLength={80}
        />
        <div className="cartao-prompt-acoes">
          <button className="botao botao-neutro" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className="botao botao-principal"
            onClick={() => void enviar()}
            disabled={!nome.trim() || salvando}
          >
            {salvando ? "Criando..." : "Criar fonte"}
          </button>
        </div>
      </div>
    </div>
  );
}
