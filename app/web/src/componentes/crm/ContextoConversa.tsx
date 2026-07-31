// Painel da direita: o funil, ao lado da conversa.
//
// E ele que separa isto de um clone de mensageiro. Enquanto a pessoa conversa,
// aqui do lado ficam o negocio aberto com estagio, valor e proxima acao
// editavel, o orcamento com status e validade, as interacoes que aconteceram
// fora do chat, as tags, e as acoes de criar negocio, criar orcamento, agendar
// e marcar como ganho. Tudo sem sair da conversa.
//
// A edicao de negocio, orcamento e tag e A MESMA da ficha do contato: vem de
// EditorNegocio.tsx. Uma segunda versao divergiria da ficha na primeira
// mudanca de campo.
//
// O painel inteiro leva data-vkos-dados. E por esse marcador que a tela sabe
// que o cursor esta num campo cujo valor veio do servidor, e adia a recarga ao
// vivo em vez de atropelar o que esta sendo digitado. O composer fica fora dele
// de proposito.

import { useState } from "react";
import type {
  Coluna,
  Contato,
  DadosContato,
  Interacao,
  Negocio,
  Orcamento,
} from "../../api/crm";
import type { Conversa } from "../../api/mensagens";
import { EditorTags, LinhaNegocio, type AcoesNegocio } from "./EditorNegocio";
import { formatarDataHora, formatarReais } from "./formatos";
import { valorDoNegocio } from "./logica";
import { IconeMais } from "../comum/Icones";

const ROTULO_INTERACAO: Record<string, string> = {
  nota: "Nota",
  ligacao: "Ligação",
  mensagem: "Mensagem",
  reuniao: "Reunião",
  outro: "Outro",
};

export function ContextoConversa({
  conversa,
  contato,
  colunas,
  negocios,
  orcamentos,
  interacoes,
  carregandoInteracoes,
  acoesNegocio,
  aoAtualizarContato,
  aoMoverEstagio,
  aoLigarNegocio,
  aoCriarNegocio,
  aoAbrirFicha,
}: {
  conversa: Conversa;
  contato: Contato | undefined;
  colunas: Coluna[];
  negocios: Negocio[];
  orcamentos: Orcamento[];
  // Só o que aconteceu FORA do chat. A mensagem ja esta na thread ao lado;
  // repetir ela aqui seria a mesma informacao duas vezes na mesma tela.
  interacoes: Interacao[];
  carregandoInteracoes: boolean;
  acoesNegocio: AcoesNegocio;
  aoAtualizarContato: (dados: DadosContato) => void;
  aoMoverEstagio: (colunaId: string) => void;
  aoLigarNegocio: (negocioId: string | null) => void;
  aoCriarNegocio: (titulo: string) => void;
  aoAbrirFicha: () => void;
}) {
  const [tituloNovo, setTituloNovo] = useState("");
  const [criandoNegocio, setCriandoNegocio] = useState(false);

  if (!contato) {
    return (
      <aside className="cv-contexto" aria-label="Contexto do contato">
        <div className="vazio">
          <h2>Contato removido.</h2>
          <p>O contato desta conversa não existe mais no funil.</p>
        </div>
      </aside>
    );
  }

  const abertos = negocios.filter((negocio) => negocio.status === "aberto");
  const total = negocios.reduce((soma, negocio) => soma + valorDoNegocio(negocio), 0);
  const orcamentosDe = (negocioId: string) =>
    orcamentos.filter((orcamento) => orcamento.negocioId === negocioId);

  function criar() {
    const limpo = tituloNovo.trim();
    if (!limpo) return;
    setTituloNovo("");
    setCriandoNegocio(false);
    aoCriarNegocio(limpo);
  }

  return (
    <aside className="cv-contexto" aria-label="Contexto do contato" data-vkos-dados="1">
      <header className="cv-contexto-topo">
        <div className="cv-contexto-id">
          <span className="rotulo">Contexto</span>
          <h2>{contato.nome}</h2>
        </div>
        <button className="botao botao-p botao-fantasma" onClick={aoAbrirFicha} type="button">
          Ficha completa
        </button>
      </header>

      <div className="cv-contexto-corpo">
        <section className="secao">
          <div className="crm-placar">
            <div className="crm-placar-item">
              <span className="crm-numero">{formatarReais(total)}</span>
              <span className="crm-numero-rotulo">em negócios</span>
            </div>
            <div className="crm-placar-item">
              <span className="crm-numero">{abertos.length}</span>
              <span className="crm-numero-rotulo">{abertos.length === 1 ? "aberto" : "abertos"}</span>
            </div>
          </div>
          <label className="grupo-campo">
            <span className="rotulo">Estágio no funil</span>
            <select className="campo campo-p" value={contato.colunaId} onChange={(e) => aoMoverEstagio(e.target.value)}>
              {colunas.map((coluna) => (
                <option key={coluna.id} value={coluna.id}>{coluna.nome}</option>
              ))}
            </select>
          </label>
          <label className="grupo-campo">
            <span className="rotulo">Conversa sobre</span>
            <select
              className="campo campo-p"
              value={conversa.negocioId ?? ""}
              onChange={(e) => aoLigarNegocio(e.target.value || null)}
            >
              <option value="">Nenhum negócio específico</option>
              {negocios.map((negocio) => (
                <option key={negocio.id} value={negocio.id}>{negocio.titulo}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="secao">
          <div className="secao-topo">
            <h2>Negócios</h2>
            <button className="botao botao-p botao-fantasma" onClick={() => setCriandoNegocio((atual) => !atual)} aria-expanded={criandoNegocio} type="button">
              {criandoNegocio ? "Cancelar" : "Novo negócio"}
            </button>
          </div>

          {criandoNegocio && (
            <div className="cv-negocio-novo">
              <input
                className="campo campo-p"
                value={tituloNovo}
                onChange={(e) => setTituloNovo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); criar(); } }}
                placeholder="Ex: ensaio da equipe"
                maxLength={200}
                aria-label="Título do negócio novo"
                autoFocus
              />
              <button className="botao botao-p botao-neutro" onClick={criar} disabled={!tituloNovo.trim()} type="button">
                <IconeMais className="" /> Criar
              </button>
            </div>
          )}

          {negocios.length === 0 && !criandoNegocio && (
            <p className="crm-vazio-inline">Nenhum negócio com este contato ainda.</p>
          )}
          <div className="crm-negocios-lista">
            {negocios.map((negocio) => (
              <LinhaNegocio
                key={negocio.id}
                negocio={negocio}
                orcamentos={orcamentosDe(negocio.id)}
                destaque={negocio.id === conversa.negocioId}
                acoes={acoesNegocio}
              />
            ))}
          </div>
        </section>

        <section className="secao">
          <EditorTags contato={contato} aoSalvar={aoAtualizarContato} />
        </section>

        <section className="secao">
          <div className="secao-topo"><h2>Fora do chat</h2></div>
          {carregandoInteracoes && <p className="crm-vazio-inline">Carregando...</p>}
          {!carregandoInteracoes && interacoes.length === 0 && (
            <p className="crm-vazio-inline">Nenhuma ligação, reunião ou nota registrada.</p>
          )}
          <ol className="crm-linha-tempo">
            {interacoes.map((interacao) => (
              <li className="crm-interacao" key={interacao.id}>
                <span className="selo">{ROTULO_INTERACAO[interacao.tipo] ?? interacao.tipo}</span>
                <time>{formatarDataHora(interacao.em)}</time>
                <p>{interacao.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </aside>
  );
}
