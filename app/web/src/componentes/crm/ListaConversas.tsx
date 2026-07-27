// Coluna da esquerda do chat: quem falou por ultimo aparece primeiro.
//
// Esta lista NUNCA abre arquivo de thread. Tudo que ela desenha (previa, nao
// lidas, status, carimbo) ja vem do indice, numa requisicao so. Pedir a thread
// aqui pra montar a previa seria uma leitura de arquivo por conversa a cada
// mensagem que chega.

import { useState } from "react";
import type { Contato } from "../../api/crm";
import type { Conversa, StatusConversa } from "../../api/mensagens";
import { contatoCombina } from "./logica";
import { iniciais } from "./formatos";
import { IconeMais, IconeX } from "../comum/Icones";

export const ROTULO_STATUS: Record<StatusConversa, string> = {
  aberta: "Aberta",
  aguardando: "Aguardando",
  resolvida: "Resolvida",
  adiada: "Adiada",
};

const FILTROS: { valor: StatusConversa | "todas"; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "aberta", rotulo: "Abertas" },
  { valor: "aguardando", rotulo: "Aguardando" },
  { valor: "resolvida", rotulo: "Resolvidas" },
];

// Carimbo curto da lista, no estilo de mensageiro: hora hoje, dia da semana na
// semana, data depois disso. A lista tem 300px; data completa em toda linha
// come o espaco do nome.
export function carimboCurto(iso: string | undefined, agora: Date): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const mesmoDia =
    data.getFullYear() === agora.getFullYear() &&
    data.getMonth() === agora.getMonth() &&
    data.getDate() === agora.getDate();
  if (mesmoDia) return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dias = Math.floor((agora.getTime() - data.getTime()) / 86400000);
  if (dias < 7) return data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ListaConversas({
  conversas,
  contatoDe,
  nomeOrganizacao,
  abertaId,
  filtro,
  busca,
  carregando,
  contatosParaNova,
  aoFiltrar,
  aoBuscar,
  aoAbrir,
  aoCriarConversa,
}: {
  conversas: Conversa[];
  contatoDe: (id: string) => Contato | undefined;
  nomeOrganizacao: (contato: Contato) => string;
  abertaId: string | null;
  filtro: StatusConversa | "todas";
  busca: string;
  carregando: boolean;
  // Todos os contatos, pro seletor de conversa nova.
  contatosParaNova: Contato[];
  aoFiltrar: (valor: StatusConversa | "todas") => void;
  aoBuscar: (valor: string) => void;
  aoAbrir: (id: string) => void;
  aoCriarConversa: (contatoId: string) => void;
}) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [termoContato, setTermoContato] = useState("");
  const agora = new Date();

  const sugestoes = escolhendo
    ? contatosParaNova
        .filter((contato) => contatoCombina(contato, termoContato, nomeOrganizacao(contato)))
        .slice(0, 12)
    : [];

  return (
    <aside className="cv-lista" aria-label="Conversas">
      <header className="cv-lista-topo">
        <div className="cv-lista-titulo">
          <h2>Conversas</h2>
          <button
            className="cv-nova"
            onClick={() => { setEscolhendo((atual) => !atual); setTermoContato(""); }}
            aria-expanded={escolhendo}
            type="button"
            title="Abrir conversa com um contato"
          >
            {escolhendo ? <IconeX className="" /> : <IconeMais className="" />}
          </button>
        </div>

        {escolhendo ? (
          <div className="cv-escolher-contato">
            <input
              value={termoContato}
              onChange={(e) => setTermoContato(e.target.value)}
              placeholder="Com quem você vai falar?"
              aria-label="Buscar contato para a conversa nova"
              autoFocus
            />
            <div className="cv-escolher-lista" role="listbox" aria-label="Contatos">
              {sugestoes.length === 0 && (
                <p className="cv-vazio-inline">Nenhum contato encontrado.</p>
              )}
              {sugestoes.map((contato) => (
                <button
                  className="cv-escolher-opcao"
                  key={contato.id}
                  onClick={() => { setEscolhendo(false); aoCriarConversa(contato.id); }}
                  type="button"
                  role="option"
                  aria-selected="false"
                >
                  <span className="cv-avatar">{iniciais(contato.nome)}</span>
                  <span className="cv-escolher-id">
                    <b>{contato.nome}</b>
                    {nomeOrganizacao(contato) && <small>{nomeOrganizacao(contato)}</small>}
                  </span>
                </button>
              ))}
            </div>
            {/* Conversa que ja existe volta a mesma, nao nasce uma segunda. Duas
                caixas de entrada do mesmo cliente e a doenca que o modulo cura. */}
            <span className="cv-ajuda">Se já houver conversa com esse contato, ela é reaberta.</span>
          </div>
        ) : (
          <>
            <input
              className="cv-busca"
              value={busca}
              onChange={(e) => aoBuscar(e.target.value)}
              placeholder="Buscar conversa"
              aria-label="Buscar conversa"
            />
            <div className="cv-filtros" role="tablist" aria-label="Filtrar conversas por status">
              {FILTROS.map((item) => (
                <button
                  className={filtro === item.valor ? "ativo" : ""}
                  key={item.valor}
                  onClick={() => aoFiltrar(item.valor)}
                  role="tab"
                  aria-selected={filtro === item.valor}
                  type="button"
                >
                  {item.rotulo}
                </button>
              ))}
            </div>
          </>
        )}
      </header>

      <div className="cv-lista-corpo">
        {carregando && <p className="cv-vazio-inline">Carregando as conversas...</p>}
        {!carregando && conversas.length === 0 && (
          <p className="cv-vazio">
            Nenhuma conversa por aqui.
            <small>Abra uma pelo botão de mais e registre o que já foi dito.</small>
          </p>
        )}
        {conversas.map((conversa) => {
          const contato = contatoDe(conversa.contatoId);
          const nome = contato?.nome ?? "Contato removido";
          return (
            <button
              className={`cv-item${conversa.id === abertaId ? " aberta" : ""}${conversa.naoLidas > 0 ? " nao-lida" : ""}`}
              key={conversa.id}
              onClick={() => aoAbrir(conversa.id)}
              type="button"
              aria-current={conversa.id === abertaId ? "true" : undefined}
            >
              <span className="cv-avatar">{iniciais(nome)}</span>
              <span className="cv-item-corpo">
                <span className="cv-item-linha">
                  <b className="cv-item-nome">{nome}</b>
                  <time className="cv-item-hora">{carimboCurto(conversa.ultimaMensagemEm, agora)}</time>
                </span>
                <span className="cv-item-linha">
                  <span className="cv-item-previa">{conversa.previa || "Sem mensagem ainda."}</span>
                  {conversa.naoLidas > 0 && (
                    <span className="cv-badge" aria-label={`${conversa.naoLidas} não lidas`}>
                      {conversa.naoLidas > 99 ? "99+" : conversa.naoLidas}
                    </span>
                  )}
                </span>
                {conversa.status !== "aberta" && (
                  <span className={`cv-marca-status status-${conversa.status}`}>
                    {ROTULO_STATUS[conversa.status]}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
