export function trocarAbaLimpando<T extends string>(
  proxima: T,
  definirAba: (aba: T) => void,
  definirErro: (mensagem: string) => void,
  definirAviso: (mensagem: string) => void,
): void {
  definirErro("");
  definirAviso("");
  definirAba(proxima);
}
