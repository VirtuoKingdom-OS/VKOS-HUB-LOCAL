// Le um arquivo como base64 puro, sem o prefixo data:...;base64.
export function lerBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const texto = String(leitor.result ?? "");
      const virgula = texto.indexOf(",");
      resolve(virgula >= 0 ? texto.slice(virgula + 1) : texto);
    };
    leitor.onerror = () => reject(leitor.error ?? new Error("Falha ao ler arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}
