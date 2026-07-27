import type { ButtonHTMLAttributes, ReactNode } from "react";

// O botao do Hub.
//
// POR QUE ELE EXISTE: sao 352 elementos <button> nos componentes e so 143
// usam a classe base. Os outros 209 tem estilo proprio, e por isso o app tinha
// 45 botoes visualmente diferentes. Cada tela que nasce sem este componente
// devolve o problema.
//
// Ele nao inventa CSS: ele monta o nome de classe da base que vive em
// global.css, na camada base. A cor, o raio, a fonte e o movimento vem todos
// de token. Quem precisa de um botao diferente ganha uma variante aqui, nunca
// uma classe nova na folha da tela.

type Variante = "principal" | "neutro" | "fantasma" | "perigo";
type Tamanho = "p" | "m";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Papel do botao na tela. Uma acao principal por tela, no maximo. */
  variante?: Variante;
  /** "m" e o padrao. "p" e pra barra de ferramenta e acao dentro de linha. */
  tamanho?: Tamanho;
  /** Botao quadrado so com icone. Exige rotulo em aria-label. */
  soIcone?: boolean;
  children?: ReactNode;
};

export function Botao({
  variante = "neutro",
  tamanho = "m",
  soIcone = false,
  className,
  type = "button",
  ...resto
}: Props) {
  const classes = ["botao", `botao-${variante}`];
  if (tamanho === "p") classes.push("botao-p");
  if (soIcone) classes.push("botao-icone");
  if (className) classes.push(className);

  // O type padrao de <button> dentro de <form> e "submit", e isso ja mandou
  // formulario sem querer mais de uma vez. Aqui o padrao e "button".
  return <button type={type} className={classes.join(" ")} {...resto} />;
}
