import type { ItemFonte } from "../layout/Sidebar";
import { PainelCriacoes } from "./TelaGalerias";
import { PainelFontes } from "./TelaFontes";
import "../../estilos/dashboard.css";

export type AbaArquivos = "criacoes" | "fontes";

interface Props {
  aba: AbaArquivos;
  itensFonte: ItemFonte[];
  aoNavegar: (tela: string) => void;
  // Quais lados existem pra este workspace (pelas features ligadas).
  temCriacoes: boolean;
  temFontes: boolean;
}

// A tela Arquivos: um teto unico pra tudo que o workspace guarda. Duas
// sub-abas, Criacoes (as pecas visuais) e Fontes de dados, cada uma reusando o
// painel da tela antiga. Com uma feature so, a tela abre direto na sub-aba
// unica, sem abas visiveis.
export function TelaArquivos({ aba, itensFonte, aoNavegar, temCriacoes, temFontes }: Props) {
  const abas: { id: AbaArquivos; rotulo: string; tela: string }[] = [
    ...(temCriacoes ? [{ id: "criacoes" as const, rotulo: "Criações", tela: "arquivos" }] : []),
    ...(temFontes ? [{ id: "fontes" as const, rotulo: "Fontes de dados", tela: "arquivos:fontes" }] : []),
  ];
  const abaValida: AbaArquivos = abas.some((a) => a.id === aba)
    ? aba
    : (abas[0]?.id ?? "criacoes");

  return (
    <section className="tela-fluxo tela-arquivos">
      <header className="tela-fluxo-topo arquivos-topo">
        <div>
          <h1>Arquivos</h1>
          <p className="subtitulo">As criações e as fontes de dados deste negócio.</p>
        </div>
        {abas.length > 1 && (
          <div className="arquivos-abas" role="tablist" aria-label="Tipo de arquivo">
            {abas.map((item) => (
              <button
                key={item.id}
                className={`chip-filtro${abaValida === item.id ? " ativo" : ""}`}
                role="tab"
                aria-selected={abaValida === item.id}
                onClick={() => aoNavegar(item.tela)}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
        )}
      </header>

      {abaValida === "fontes" ? (
        <PainelFontes itens={itensFonte} aoNavegar={aoNavegar} />
      ) : (
        <PainelCriacoes />
      )}
    </section>
  );
}
