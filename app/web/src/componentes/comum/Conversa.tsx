// A CONVERSA COM A IA, como apresentação pura.
//
// Ela não sabe de onde os dados vêm. Quem liga ela numa sessão é
// usarConversaSessao; quem decide o cabeçalho, o estado vazio e o rótulo do
// campo é a tela. Assim o mesmo painel serve pro chat da IDE, pra cerimônia e
// pro chat da campanha sem nenhum "se for a tela tal".
//
// O RASCUNHO MORA AQUI DENTRO de propósito: o texto que a pessoa está digitando
// é estado de apresentação, não dado de domínio. Subir ele pra tela obrigaria
// toda tela a repetir o mesmo useState, o mesmo Enter e o mesmo limpar.

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { TurnoSessao } from "../../tipos/dominio";
import type { FerramentaViva } from "./usarConversaSessao";
import { IconeAlerta, IconeSeta } from "./Icones";
import { Markdown } from "./Markdown";
import { Botao } from "./Botao";
import "./conversaIa.css";

// A engrenagem das linhas de ferramenta. Ela mora aqui porque só existe aqui.
function IconeEngrenagem() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5" />
    </svg>
  );
}

export interface PropsConversa {
  turnos: TurnoSessao[];
  pendentes: TurnoSessao[];
  respostaViva: string;
  ferramentas: FerramentaViva[];
  rodando: boolean;
  enviando?: boolean;
  erro?: string | null;
  aoEnviar: (texto: string) => void;

  /** Título do cabeçalho. Sem ele, o cabeçalho inteiro não existe. */
  titulo?: string;
  /** O que fica à direita do título: selos, botão de fechar, o que a tela quiser. */
  acoesCabecalho?: ReactNode;
  /** O que aparece quando não há nenhum turno ainda. */
  vazio?: ReactNode;
  /** O que aparece ACIMA do campo, sempre. É onde mora o aviso de sessão morta. */
  avisoNoRodape?: ReactNode;
  /** Rótulo acessível e placeholder do campo. */
  rotuloCampo?: string;
  /** Campo desligado por decisão da tela, e não por a IA estar trabalhando. */
  campoDesligado?: boolean;
  /** Placeholder quando o campo está desligado pela tela. */
  dicaCampoDesligado?: string;
}

export function Conversa({
  turnos,
  pendentes,
  respostaViva,
  ferramentas,
  rodando,
  enviando = false,
  erro = null,
  aoEnviar,
  titulo,
  acoesCabecalho,
  vazio,
  avisoNoRodape,
  rotuloCampo = "Mensagem para a IA",
  campoDesligado = false,
  dicaCampoDesligado,
}: PropsConversa) {
  const [rascunho, setRascunho] = useState("");
  const refRolagem = useRef<HTMLDivElement>(null);
  const refCampo = useRef<HTMLTextAreaElement>(null);

  // Rola pro fim a cada novidade.
  useEffect(() => {
    const area = refRolagem.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [turnos, pendentes, respostaViva, ferramentas.length]);

  const bloqueado = rodando || enviando || campoDesligado;
  const vazia =
    turnos.length === 0 && pendentes.length === 0 && !respostaViva && !rodando;

  function mandar() {
    const texto = rascunho.trim();
    if (!texto || bloqueado) return;
    setRascunho("");
    aoEnviar(texto);
    refCampo.current?.focus();
  }

  return (
    <div className="conversa-ia">
      {titulo && (
        <header className="conversa-ia-topo">
          <span className="conversa-ia-titulo">{titulo}</span>
          {acoesCabecalho && <span className="conversa-ia-acoes">{acoesCabecalho}</span>}
        </header>
      )}

      <div className="conversa-ia-rolagem" ref={refRolagem}>
        {vazia ? (
          vazio ?? null
        ) : (
          <>
            {turnos.map((t, i) =>
              t.interno ? (
                // Turno interno do Hub: fala de máquina, e ela aparece como nota
                // discreta em vez de virar uma fala do dono que ele não escreveu.
                <div key={i} className="conversa-ia-turno-interno">
                  Correção automática do Hub
                </div>
              ) : t.papel === "assistente" ? (
                <div key={i} className="conversa-ia-turno-ia">
                  <Markdown texto={t.texto} />
                </div>
              ) : (
                <div key={i} className="conversa-ia-turno-usuario">
                  {t.texto}
                </div>
              ),
            )}
            {pendentes.map((t, i) => (
              <div key={`p${i}`} className="conversa-ia-turno-usuario pendente">
                {t.texto}
              </div>
            ))}
            {ferramentas.map((f, i) => (
              <div key={`f${i}`} className="conversa-ia-ferramenta">
                <IconeEngrenagem />
                <span className="conversa-ia-ferramenta-nome">{f.nome}</span>
                {f.alvo && <span className="conversa-ia-ferramenta-alvo">{f.alvo}</span>}
              </div>
            ))}
            {respostaViva && (
              <div className="conversa-ia-turno-ia">
                <Markdown texto={respostaViva} />
              </div>
            )}
            {rodando && !respostaViva && ferramentas.length === 0 && (
              <p className="conversa-ia-trabalhando" role="status">
                <span className="ponto-vivo" />
                A IA está trabalhando
              </p>
            )}
          </>
        )}
      </div>

      {erro && (
        <div className="faixa faixa-alerta conversa-ia-erro" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erro}</div>
        </div>
      )}

      {avisoNoRodape}

      <div className="conversa-ia-envio">
        <textarea
          ref={refCampo}
          className="campo conversa-ia-campo"
          aria-label={rotuloCampo}
          value={rascunho}
          placeholder={
            campoDesligado
              ? dicaCampoDesligado ?? ""
              : rodando
                ? "A IA está trabalhando..."
                : rotuloCampo
          }
          disabled={bloqueado}
          rows={2}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              mandar();
            }
          }}
        />
        <Botao
          variante="principal"
          soIcone
          className="conversa-ia-enviar"
          onClick={mandar}
          disabled={bloqueado || !rascunho.trim()}
          title="Enviar"
          aria-label="Enviar mensagem"
        >
          <IconeSeta className="" />
        </Botao>
      </div>
    </div>
  );
}
