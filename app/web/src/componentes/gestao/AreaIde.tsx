import { Suspense, useEffect, useState } from "react";
import { obterRaizes, type RaizIde } from "../../api/ide";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { lazyRecarregavel } from "../../util/carregarModulo";
import { Aviso } from "../comum/Sistema";

const TelaIde = lazyRecarregavel(() =>
  import("../ide/TelaIde").then((m) => ({ default: m.TelaIde })),
);

// VKOS-IDE geral do CORE: o poder total de arquivos do sistema. A raiz escolhida
// ativa o workspace correspondente no servidor, entao arvore, editor e conversa
// (com o Claude do CORE) passam a operar nela. Raizes: o sistema inteiro, os
// workspaces do estudio e os clientes ja materializados.
export function AreaIde() {
  const { workspaceAtivo, trocarWorkspace } = usarEstado();
  const [raizes, setRaizes] = useState<RaizIde[]>([]);
  const [erro, setErro] = useState("");
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    let vivo = true;
    obterRaizes()
      .then((r) => {
        if (vivo) setRaizes(r.raizes);
      })
      .catch((falha) => {
        if (vivo) setErro(mensagemDeErro(falha));
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function selecionar(id: string) {
    if (!id) return;
    setErro("");
    setTrocando(true);
    try {
      await trocarWorkspace(id);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setTrocando(false);
    }
  }

  function rotulo(r: RaizIde): string {
    if (r.tipo === "cliente") return `Cliente: ${r.nome}`;
    if (r.tipo === "estudio") return `Estúdio: ${r.nome}`;
    return r.nome;
  }

  const selecionada = raizes.some((r) => r.id === workspaceAtivo)
    ? (workspaceAtivo as string)
    : "";

  return (
    <div className="gestao-ide">
      <div className="gestao-ide-topo">
        <label className="gestao-ide-rotulo" htmlFor="gestao-ide-raiz">
          Raiz
        </label>
        <select
          id="gestao-ide-raiz"
          className="gestao-ide-seletor"
          value={selecionada}
          disabled={trocando}
          onChange={(e) => void selecionar(e.target.value)}
        >
          {selecionada === "" && <option value="">Escolher raiz…</option>}
          {raizes.map((r) => (
            <option key={r.id} value={r.id}>
              {rotulo(r)}
            </option>
          ))}
        </select>
        <p className="gestao-secao-ajuda">
          A IDE lê e edita tudo dentro da raiz escolhida. A conversa usa o seu
          Claude nessa pasta.
        </p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="gestao-quadro gestao-quadro-ide">
        <Suspense fallback={<div className="gestao-vazio-linha">Abrindo a IDE…</div>}>
          <TelaIde key={workspaceAtivo ?? "sem-raiz"} fixa />
        </Suspense>
      </div>
    </div>
  );
}
