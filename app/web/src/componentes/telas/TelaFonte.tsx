import { useEffect, useMemo, useRef, useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { urlArquivoContexto } from "../../api/cliente";
import type { Contexto, TipoContexto } from "../../tipos/dominio";
import { Botao } from "../comum/Botao";
import { EditorContexto } from "../comum/EditorContexto";
import { Confirmacao, type DadosConfirmacao } from "../comum/Confirmacao";
import {
  IconeChevron,
  IconeLapis,
  IconeLixeira,
  IconeMais,
} from "../comum/Icones";
import { IconeImagens, IconeLink } from "./icones";
import {
  ehImagem,
  formatarDataHora,
  parsearLinks,
  primeirasLinhas,
  ROTULO_FONTE,
  ROTULO_FONTE_ARTIGO,
  tituloLink,
} from "./fontes";
import "./telas.css";

interface Props {
  tipo: TipoContexto;
  aoVoltar?: () => void;
}

// Tela de uma fonte de dados: os contextos daquele tipo, um cartao cada. Aqui
// o cartao e legitimo: objeto repetido, independente, com previa dentro.
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
    <section className="tela tela-fonte">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          {aoVoltar && (
            <Botao
              variante="fantasma"
              tamanho="p"
              className="fonte-voltar"
              onClick={aoVoltar}
            >
              <IconeChevron className="" />
              Fontes de dados
            </Botao>
          )}
          <h1>{ROTULO_FONTE[tipo]}</h1>
          <p>{rotuloContagem}</p>
        </div>
        {/* Com a tela vazia, a ação mora no estado vazio: dois "Nova fonte"
            visíveis ao mesmo tempo seriam duas ações principais na tela. */}
        {contagem > 0 && (
          <div className="tela-topo-acoes">
            <Botao variante="principal" onClick={() => setCriando(true)}>
              <IconeMais className="" />
              Nova fonte
            </Botao>
          </div>
        )}
      </header>

      <div className="tela-corpo">
        {contagem === 0 ? (
          <div className="vazio">
            <IconeImagens className="" />
            <h2>Nenhuma fonte de {ROTULO_FONTE_ARTIGO[tipo]} ainda</h2>
            <p>
              Uma fonte guarda {ROTULO_FONTE_ARTIGO[tipo]} que suas sessões vão
              usar como referência. Crie a primeira e já preencha.
            </p>
            <Botao variante="principal" onClick={() => setCriando(true)}>
              <IconeMais className="" />
              Nova fonte
            </Botao>
          </div>
        ) : (
          <div className="grade-cartoes">
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
      </div>

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

// Cartao de uma fonte: nome, quando foi atualizada, prévia e ações. As ações
// nascem visíveis, nunca no hover.
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
    <article className="cartao">
      <h3>{contexto.nome}</h3>
      {atualizada && (
        <span className="fonte-data">atualizada em {atualizada}</span>
      )}

      <div className="fonte-previa">
        <PreviaFonte contexto={contexto} />
      </div>

      <div className="fonte-acoes">
        <Botao variante="neutro" tamanho="p" onClick={aoAbrir}>
          <IconeLapis className="" />
          Abrir
        </Botao>
        <Botao
          variante="perigo"
          tamanho="p"
          soIcone
          onClick={aoExcluir}
          title="Excluir esta fonte"
          aria-label="Excluir esta fonte"
        >
          <IconeLixeira className="" />
        </Botao>
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
      return <p className="fonte-previa-vazia">Sem imagens ainda.</p>;
    }
    return (
      <div className="fonte-previa-imagens">
        {imagens.map((a) => (
          <div className="fonte-previa-mini" key={a.nome}>
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
      return <p className="fonte-previa-vazia">Sem links ainda.</p>;
    }
    return (
      <ul className="fonte-previa-links">
        {links.map((l, i) => (
          <li key={`${l.url}-${i}`}>
            <IconeLink className="" />
            <span className="fonte-previa-link-texto">
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
    return <p className="fonte-previa-vazia">Sem texto ainda.</p>;
  }
  return (
    <div className="fonte-previa-texto">
      {linhas.map((linha, i) => (
        <p key={i}>{linha}</p>
      ))}
    </div>
  );
}

// Modal pra nomear a nova fonte. Esc ou clique fora fecham. Ele e modal porque
// EXIGE a decisao antes de continuar: sem nome nao ha fonte pra abrir.
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
    <div className="veu-modal" onClick={aoFechar}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-nova-fonte"
      >
        <div className="modal-topo">
          <h2 id="titulo-nova-fonte">
            Nova fonte de {ROTULO_FONTE_ARTIGO[tipo]}
          </h2>
        </div>
        <div className="modal-corpo">
          <div className="grupo-campo">
            <label className="rotulo" htmlFor="nome-nova-fonte">
              Nome da fonte
            </label>
            <input
              className="campo"
              id="nome-nova-fonte"
              ref={campo}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void enviar();
              }}
              placeholder="Ex: referências da marca"
              maxLength={80}
            />
            <span className="dica">
              Escolha um nome para reconhecer essa fonte depois.
            </span>
          </div>
        </div>
        <div className="modal-rodape">
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="principal"
            onClick={() => void enviar()}
            disabled={!nome.trim() || salvando}
            aria-busy={salvando}
          >
            Criar fonte
          </Botao>
        </div>
      </div>
    </div>
  );
}
