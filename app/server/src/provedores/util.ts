// Utilitarios compartilhados entre os provedores de IA.

// Cita um argumento pra montar a linha de comando legivel do log. Argumento sem
// espaco nem caractere especial passa cru; o resto vai entre aspas com escape.
export function citarArg(arg: string): string {
  if (arg.length > 0 && !/[\s"()<>|&^]/.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '\\"')}"`;
}
