// Erro com status HTTP proprio do modulo de publicacao. As rotas traduzem ele
// direto pra resposta, sem inventar 500 pra falha esperada.

export class ErroPublicacao extends Error {
  statusHttp: number;

  constructor(mensagem: string, statusHttp = 502) {
    super(mensagem);
    this.name = "ErroPublicacao";
    this.statusHttp = statusHttp;
  }
}
