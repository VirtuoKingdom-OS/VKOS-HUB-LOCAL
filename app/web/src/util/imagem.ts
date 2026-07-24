// Rebaixa uma imagem escolhida pelo usuario pra um data URL pequeno. Rasteriza
// tudo (inclusive SVG) num quadrado de no maximo `lado` px, o que mantem o banco
// leve e ainda descarta qualquer script embutido num SVG.
export function imagemParaDataUrl(arquivo: File, lado = 256): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    if (!arquivo.type.startsWith("image/")) {
      rejeitar(new Error("Escolha um arquivo de imagem."));
      return;
    }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, lado / Math.max(img.width, img.height));
      const largura = Math.max(1, Math.round(img.width * escala));
      const altura = Math.max(1, Math.round(img.height * escala));
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rejeitar(new Error("Não foi possível processar a imagem."));
        return;
      }
      ctx.drawImage(img, 0, 0, largura, altura);
      resolver(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejeitar(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}
