// Logo de um workspace. Com imagem, mostra a arte; sem, cai nas iniciais do
// nome num quadrado neutro. Usada na lista e no detalhe do CORE.
export function LogoWorkspace({
  nome,
  logo,
  className = "",
}: {
  nome: string;
  logo?: string | null;
  className?: string;
}) {
  if (logo) {
    return <img className={`ws-logo ${className}`.trim()} src={logo} alt={`Logo de ${nome}`} />;
  }
  const iniciais =
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <span className={`ws-logo ws-logo-vazio ${className}`.trim()} aria-hidden="true">
      {iniciais}
    </span>
  );
}
