import { useEffect, useRef, useState } from "react";
import type { Contato, DadosContato } from "../../api/crm";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { formatarDataHora } from "./formatos";
import { IconeLixeira, IconeMais, IconeX } from "../comum/Icones";

// Campos de texto simples do detalhe, com rotulo e placeholder.
const CAMPOS: { chave: keyof DadosContato; rotulo: string; dica: string; tipo?: string }[] = [
  { chave: "empresa", rotulo: "Empresa", dica: "Nome da empresa" },
  { chave: "telefone", rotulo: "Telefone", dica: "(00) 00000-0000", tipo: "tel" },
  { chave: "email", rotulo: "Email", dica: "email@exemplo.com", tipo: "email" },
  { chave: "origem", rotulo: "Origem", dica: "Como chegou ate voce" },
];

// Painel lateral de detalhe do contato. Campos editaveis que salvam ao sair do
// campo, tags, notas com data e hora, e exclusao em dois cliques.
export function PainelContato({
  contato,
  aoAtualizar,
  aoAdicionarNota,
  aoExcluir,
  aoFechar,
}: {
  contato: Contato;
  aoAtualizar: (id: string, dados: DadosContato) => Promise<Contato> | void;
  aoAdicionarNota: (id: string, texto: string) => Promise<Contato> | void;
  aoExcluir: (id: string) => Promise<void> | void;
  aoFechar: () => void;
}) {
  // Rascunhos dos campos, semeados do contato. O key={contato.id} no pai remonta
  // o painel a cada contato, entao a semente inicial basta.
  const [nome, setNome] = useState(contato.nome);
  const [empresa, setEmpresa] = useState(contato.empresa ?? "");
  const [telefone, setTelefone] = useState(contato.telefone ?? "");
  const [email, setEmail] = useState(contato.email ?? "");
  const [origem, setOrigem] = useState(contato.origem ?? "");
  const [valor, setValor] = useState(
    contato.valorEstimado !== undefined ? String(contato.valorEstimado) : ""
  );
  const [novaTag, setNovaTag] = useState("");
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);

  const rascunhos: Record<string, [string, (v: string) => void]> = {
    empresa: [empresa, setEmpresa],
    telefone: [telefone, setTelefone],
    email: [email, setEmail],
    origem: [origem, setOrigem],
  };

  // Esc fecha o painel.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  // Salva um campo de texto se mudou de verdade.
  function salvarTexto(chave: keyof DadosContato, atual: string) {
    const original = (contato[chave as keyof Contato] as string | undefined) ?? "";
    if (atual.trim() === original) return;
    void aoAtualizar(contato.id, { [chave]: atual.trim() });
  }

  function salvarNome() {
    const limpo = nome.trim();
    if (!limpo) {
      setNome(contato.nome);
      return;
    }
    if (limpo !== contato.nome) void aoAtualizar(contato.id, { nome: limpo });
  }

  function salvarValor() {
    const limpo = valor.replace(",", ".").trim();
    const original = contato.valorEstimado;
    if (limpo === "") {
      // null (nao undefined) pra o backend enxergar a intencao de limpar.
      if (original !== undefined) void aoAtualizar(contato.id, { valorEstimado: null });
      return;
    }
    const n = Number(limpo);
    if (!Number.isFinite(n) || n < 0) {
      setValor(original !== undefined ? String(original) : "");
      return;
    }
    if (n !== original) void aoAtualizar(contato.id, { valorEstimado: n });
  }

  function adicionarTag() {
    const limpo = novaTag.trim();
    if (!limpo) return;
    const jaTem = contato.tags.some((t) => t.toLowerCase() === limpo.toLowerCase());
    setNovaTag("");
    if (jaTem) return;
    void aoAtualizar(contato.id, { tags: [...contato.tags, limpo] });
  }

  function removerTag(tag: string) {
    void aoAtualizar(contato.id, { tags: contato.tags.filter((t) => t !== tag) });
  }

  async function enviarNota() {
    const limpo = novaNota.trim();
    if (!limpo || salvandoNota) return;
    setSalvandoNota(true);
    try {
      await aoAdicionarNota(contato.id, limpo);
      setNovaNota("");
    } finally {
      setSalvandoNota(false);
    }
  }

  return (
    <aside className="crm-painel">
      <header className="crm-painel-topo">
        <h2>Detalhe do contato</h2>
        <button className="crm-painel-fechar" onClick={aoFechar} aria-label="Fechar" type="button">
          <IconeX className="" />
        </button>
      </header>

      <div className="crm-painel-corpo">
        <label className="crm-campo crm-campo-nome">
          <span className="crm-rotulo">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={salvarNome}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="Nome do contato"
            maxLength={200}
          />
        </label>

        {CAMPOS.map(({ chave, rotulo, dica, tipo }) => {
          const [v, set] = rascunhos[chave as string];
          return (
            <label className="crm-campo" key={chave as string}>
              <span className="crm-rotulo">{rotulo}</span>
              <input
                type={tipo ?? "text"}
                value={v}
                onChange={(e) => set(e.target.value)}
                onBlur={() => salvarTexto(chave, v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder={dica}
                maxLength={200}
              />
            </label>
          );
        })}

        <label className="crm-campo">
          <span className="crm-rotulo">Valor estimado (R$)</span>
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onBlur={salvarValor}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="0"
          />
        </label>

        <div className="crm-campo">
          <span className="crm-rotulo">Tags</span>
          <div className="crm-tags-lista">
            {contato.tags.length === 0 && <span className="crm-vazio-inline">Nenhuma tag ainda.</span>}
            {contato.tags.map((tag) => (
              <span className="crm-tag crm-tag-editavel" key={tag}>
                {tag}
                <button
                  className="crm-tag-x"
                  onClick={() => removerTag(tag)}
                  aria-label={`Remover ${tag}`}
                  type="button"
                >
                  <IconeX className="" />
                </button>
              </span>
            ))}
          </div>
          <div className="crm-tag-nova">
            <input
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarTag();
                }
              }}
              placeholder="Adicionar tag"
              maxLength={40}
            />
            <button
              className="botao botao-neutro crm-add-tag"
              onClick={adicionarTag}
              disabled={!novaTag.trim()}
              type="button"
            >
              <IconeMais className="" />
            </button>
          </div>
        </div>

        <div className="crm-campo crm-notas">
          <span className="crm-rotulo">Notas</span>
          <div className="crm-nota-nova">
            <textarea
              value={novaNota}
              onChange={(e) => setNovaNota(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void enviarNota();
                }
              }}
              placeholder="Escreva uma nota. Ctrl+Enter pra salvar."
              rows={2}
            />
            <button
              className="botao botao-principal crm-add-nota"
              onClick={() => void enviarNota()}
              disabled={!novaNota.trim() || salvandoNota}
              type="button"
            >
              {salvandoNota ? "Salvando..." : "Adicionar nota"}
            </button>
          </div>
          <ul className="crm-nota-lista">
            {contato.notas.length === 0 && (
              <li className="crm-vazio-inline">Nenhuma nota ainda.</li>
            )}
            {contato.notas.map((nota, i) => (
              <li className="crm-nota" key={`${nota.em}-${i}`}>
                <span className="crm-nota-hora">{formatarDataHora(nota.em)}</span>
                <p className="crm-nota-texto">{nota.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="crm-painel-pe">
        <BotaoConfirmar
          className="crm-excluir-contato"
          titulo="Excluir este contato"
          aviso="Excluir contato?"
          aoConfirmar={() => aoExcluir(contato.id)}
        >
          <IconeLixeira className="" />
          Excluir contato
        </BotaoConfirmar>
      </footer>
    </aside>
  );
}
