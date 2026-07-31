import "./core.css";

interface Props {
  titulo: string;
  contexto: string;
  // O que a tela vai guardar quando o conteudo dela estiver definido. E o que
  // impede o lugar vazio de virar um botao que nao se sabe pra que serve.
  promessa: string;
}

// Lugar reservado de uma tela do CORE que ja tem porta na barra mas ainda nao
// tem conteudo definido: hoje Clientes e Financas.
//
// Ela existe porque a navegacao foi decidida antes do conteudo, a pedido do
// Jesse. O item fica ativo e navegavel de proposito, pra ordem da barra ficar
// de pe desde ja. O que ela NAO faz e fingir: nao ha tabela falsa, numero de
// mentira nem "em breve" sem sujeito. A tela diz o que vai ser e que ainda nao
// e, porque tela que promete dado inexistente ensina a pessoa a desconfiar do
// resto do Hub.
//
// Ela veste o .vazio das primitivas: a mesma forma de todo estado vazio do app.
export function TelaEmDefinicao({ titulo, contexto, promessa }: Props) {
  return (
    <section className="tela">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>{titulo}</h1>
          <p>{contexto}</p>
        </div>
      </header>

      <div className="tela-corpo">
        <div className="vazio">
          <IconePlanta />
          <h2>Esta tela ainda não tem conteúdo</h2>
          <p>{promessa}</p>
        </div>
      </div>
    </section>
  );
}

// Uma muda: o lugar existe e ainda vai crescer. Sem tracejado e sem cadeado,
// que dizem "bloqueado" em vez de "em construcao".
function IconePlanta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21v-7" />
      <path d="M12 14c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      <path d="M12 16c0-3-2-5-5-5 0 3 2 5 5 5Z" />
    </svg>
  );
}
