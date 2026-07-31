// Utilitarios compartilhados entre os provedores de IA.

import type { OpcoesSessaoProvedor } from "./contrato.js";

// Cita um argumento pra montar a linha de comando legivel do log. Argumento sem
// espaco nem caractere especial passa cru; o resto vai entre aspas com escape.
export function citarArg(arg: string): string {
  if (arg.length > 0 && !/[\s"()<>|&^]/.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '\\"')}"`;
}

// Monta o prompt que vai pelo stdin, com as instrucoes extras da sessao num
// bloco marcado antes do pedido real.
//
// As instrucoes NUNCA viajam como argumento de linha de comando. No Windows, um
// provedor instalado como .cmd (ou resolvido pelo PATH) e disparado por shell, e
// o cmd.exe corta a linha na primeira quebra: um valor multilinha chega truncado
// na primeira linha e leva junto todo argumento posterior, incluindo
// --mcp-config e --allowedTools. Sem erro e sem aviso.
// Ver docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md.
export function montarPromptComInstrucoes(opcoes: OpcoesSessaoProvedor): string {
  if (!opcoes.instrucoesExtras) return opcoes.prompt;
  return `<regras-da-sessao>\n${opcoes.instrucoesExtras}\n</regras-da-sessao>\n\n${opcoes.prompt}`;
}
