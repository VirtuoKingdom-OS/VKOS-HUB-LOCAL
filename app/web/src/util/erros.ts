import { ErroApi, ErroRede } from "../api/cliente";

// Traduz qualquer erro pego num try/catch pra uma frase gentil pro leigo.
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroRede) {
    return "Servidor fora do ar. Verifique se o VKOS Hub esta rodando.";
  }
  if (erro instanceof ErroApi) {
    return erro.message;
  }
  if (erro instanceof Error && erro.message) {
    return erro.message;
  }
  return "Algo deu errado. Tente de novo.";
}
