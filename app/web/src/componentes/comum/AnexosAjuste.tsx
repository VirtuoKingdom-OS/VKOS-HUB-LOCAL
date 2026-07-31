import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { enviarAnexoPeca } from "../../api/cliente";
import type { AnexoAjuste } from "../../tipos/dominio";
import { lerBase64 } from "../../util/arquivo";
import { mensagemDeErro } from "../../util/erros";
import { IconeClipe, IconeX } from "./Icones";
import "../cockpit/composer.css";

const ACEITA_ANEXO = ".md,.txt,.pdf,.csv,.json,.svg,image/*";

interface Props {
  pasta: string;
  anexos: AnexoAjuste[];
  aoMudar: (anexos: AnexoAjuste[]) => void;
  desabilitado?: boolean;
}

export function blocoDeAnexos(anexos: AnexoAjuste[]): string {
  if (anexos.length === 0) return "";
  return [
    "",
    "",
    "Materiais anexados pelo usuário:",
    ...anexos.map((anexo) => anexo.caminhoRelativo),
    "Esses arquivos são material pronto, fornecido pelo usuário. Quando o pedido mandar usar, colocar ou trocar por uma imagem anexada, copie o arquivo de anexos/ para img/ e referencie img/<nome> no HTML. Não gere imagem nova quando um anexo atende o pedido. Documentos anexados (pdf, md, txt, csv, json) são referência de conteúdo: leia antes de aplicar o ajuste.",
  ].join("\n");
}

export function AnexosAjuste({ pasta, anexos, aoMudar, desabilitado = false }: Props) {
  const refInput = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const anexar = async (arquivos: File[]) => {
    if (desabilitado || arquivos.length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      const novos: AnexoAjuste[] = [];
      for (const arquivo of arquivos) {
        const conteudoBase64 = await lerBase64(arquivo);
        const { caminhoRelativo } = await enviarAnexoPeca(pasta, {
          nome: arquivo.name,
          conteudoBase64,
        });
        novos.push({ nome: arquivo.name, caminhoRelativo });
      }
      aoMudar([...anexos, ...novos]);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  };

  const aoEscolher = (e: ChangeEvent<HTMLInputElement>) => {
    void anexar(Array.from(e.target.files ?? []));
    e.target.value = "";
  };
  const aoSoltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    void anexar(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="anexos-inline" onDragOver={(e) => e.preventDefault()} onDrop={aoSoltar}>
      <input
        ref={refInput}
        type="file"
        hidden
        multiple
        accept={ACEITA_ANEXO}
        disabled={desabilitado || enviando}
        onChange={aoEscolher}
      />
      <button
        type="button"
        className="botao botao-neutro"
        onClick={() => refInput.current?.click()}
        disabled={desabilitado || enviando}
      >
        <IconeClipe className="" />
        {enviando ? "Anexando..." : "Anexar"}
      </button>
      {anexos.map((anexo) => (
        <span className="chip-anexo" key={anexo.caminhoRelativo}>
          <IconeClipe className="" />
          <span className="nome-anexo" title={anexo.nome}>{anexo.nome}</span>
          <button
            type="button"
            className="remover-anexo"
            title={`Remover ${anexo.nome}`}
            disabled={desabilitado || enviando}
            onClick={() => aoMudar(anexos.filter((a) => a.caminhoRelativo !== anexo.caminhoRelativo))}
          >
            <IconeX className="" />
          </button>
        </span>
      ))}
      {erro && <p className="studio-ajuste-erro">{erro}</p>}
    </div>
  );
}
