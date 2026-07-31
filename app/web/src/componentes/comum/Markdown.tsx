import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./markdown.css";

// Renderizador de markdown das mensagens da IA. Um so componente pra todo o
// app (no de sessao, cerimonia, chat da IDE), pra conversa nunca mais chegar
// como .md cru. GFM ligado: tabela, lista de tarefas, riscado, link automatico.
//
// Links abrem em aba nova: a mensagem vive dentro do hub, navegar na mesma
// aba mataria a sessao visivel.
function MarkdownInterno({ texto }: { texto: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownInterno);
