import { useRef, useState } from "react";
import { IconeCheck, IconeLixeira, IconeSubir } from "../comum/Icones";
import { Confirmacao } from "../comum/Confirmacao";
import type { MotorEdicao } from "../editor/motor";
import { ControlesImagem } from "../editor/ControlesImagem";
import { GaleriaFontes, type ArquivoGaleriaFonte } from "../editor/GaleriaFontes";
import { usarGeracaoImagemIA } from "../editor/usarGeracaoImagem";
import {
  aplicarImagemDaFonte,
  type AlvoImagemCapturado,
  urlImagemPreview,
} from "../editor/imagens";
import "../../estilos/editor.css";

// Painel direito de propriedades do Studio. Mesmo conteudo do overlay, mas
// aqui a imagem age sobre a pagina EM FOCO (a mais visivel no scroll), nao
// sobre uma pagina atual de navegacao. Reusa as classes do editor.css (painel,
// campos, swatches) pra nao duplicar o sistema de design.

const PESOS = ["300", "400", "500", "600", "700", "800"];

// Um valor de cor cabe no color picker quando e hex simples (nao rgba/gradiente).
function ehHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

// Envolve em aspas so quando o nome da fonte tem espaco.
function valorFonte(nome: string): string {
  return /\s/.test(nome) ? `'${nome}'` : nome;
}

interface Props {
  motor: MotorEdicao;
  // Pagina em foco (indice 0-based), pra imagem de fundo.
  foco: number;
  pecaPasta: string;
  aplicarTodas: boolean;
  aoAlternarTodas: () => void;
}

export function PainelPropriedades({
  motor,
  foco,
  pecaPasta,
  aplicarTodas,
  aoAlternarTodas,
}: Props) {
  const sel = motor.selecao;
  const [enviando, setEnviando] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<"elemento" | "imagem" | null>(null);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const alvoGaleria = useRef<AlvoImagemCapturado | null>(null);
  const geracaoImagem = usarGeracaoImagemIA();

  async function aoEscolher(file: File) {
    setErroUpload(null);
    geracaoImagem.limparErro();
    setEnviando(true);
    try {
      await motor.trocarImagemSelecionada(file);
    } catch (erro) {
      setErroUpload(erro instanceof Error ? erro.message : "Falha ao enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  function aoGerar() {
    setErroUpload(null);
    const alvo = motor.capturarImagemSelecionada();
    if (!alvo) {
      setErroUpload("Selecione uma imagem antes de gerar outra.");
      return;
    }
    void geracaoImagem.gerar(pecaPasta, alvo);
  }

  function abrirGaleria() {
    setErroUpload(null);
    const alvo = motor.capturarImagemSelecionada();
    if (!alvo) {
      setErroUpload("Selecione uma imagem antes de abrir as fontes de dados.");
      return;
    }
    alvoGaleria.current = alvo;
    setGaleriaAberta(true);
  }

  async function escolherDaGaleria(arquivo: ArquivoGaleriaFonte) {
    if (!alvoGaleria.current) throw new Error("A imagem selecionada não está mais disponível.");
    await aplicarImagemDaFonte(pecaPasta, arquivo, alvoGaleria.current);
  }

  return (
    <aside className="editor-painel studio-painel nowheel">
      {/* Cores globais do tema (variaveis do :root). */}
      <section className="painel-secao">
        <div className="secao-titulo rotulo-secao">Cores do tema</div>
        {motor.vars.length === 0 ? (
          <p className="painel-vazio">Este modelo não expõe cores no :root.</p>
        ) : (
          <div className="lista-cores">
            {motor.vars.map((v) => (
              <div className="cor-item" key={v.nome}>
                <span className="cor-nome" title={v.nome}>
                  {v.nome.replace(/^--/, "")}
                </span>
                {ehHex(v.valor) ? (
                  <label className="cor-swatch">
                    <input
                      type="color"
                      value={
                        v.valor.length === 4
                          ? "#" + v.valor.slice(1).replace(/./g, (c) => c + c)
                          : v.valor
                      }
                      onChange={(e) => motor.aplicarVar(v.nome, e.target.value)}
                    />
                    <span style={{ background: v.valor }} />
                  </label>
                ) : (
                  <input
                    className="cor-texto"
                    value={v.valor}
                    onChange={(e) => motor.aplicarVar(v.nome, e.target.value)}
                    spellCheck={false}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Elemento selecionado. */}
      <section className="painel-secao">
        <div className="secao-titulo rotulo-secao">Elemento</div>
        {!sel ? (
          <p className="painel-vazio">
            Clique num texto de qualquer página para selecionar. Dê dois cliques
            para editar direto no canvas. Arraste para mover, ou use as setas.
          </p>
        ) : (
          <div className="campos-elemento">
            <div className="chip-alvo">
              <code>{sel.tag}</code>
              {sel.classes && <span>.{sel.classes.split(" ").join(".")}</span>}
            </div>

            <div className="studio-elemento-acoes">
              {sel.podeSubirNivel && (
                <button
                  className="botao botao-fantasma"
                  onClick={motor.selecionarPai}
                  title="Selecionar o bloco que envolve este elemento"
                >
                  <IconeSubir className="" />
                  Selecionar contêiner
                </button>
              )}
              {sel.podeExcluir && (
                <button
                  className="botao botao-perigo"
                  onClick={() => setConfirmarExclusao("elemento")}
                >
                  <IconeLixeira className="" />
                  Excluir elemento
                </button>
              )}
            </div>

            <label className="campo">
              <span>Texto</span>
              <textarea
                value={sel.texto}
                disabled={!sel.editavelTexto}
                onChange={(e) => motor.aplicarTexto(e.target.value)}
                rows={2}
              />
              {!sel.editavelTexto ? (
                <small className="campo-nota">
                  Dê dois cliques direto no texto, ou selecione o trecho específico.
                </small>
              ) : sel.temDestaqueInline ? (
                <small className="campo-nota">
                  Este bloco tem partes coloridas, editar aqui remove o destaque.
                  Prefira o duplo clique no canvas.
                </small>
              ) : null}
            </label>

            <label className="campo">
              <span>Fonte</span>
              <select
                value={sel.fonte}
                onChange={(e) =>
                  motor.comEstilo("font-family", valorFonte(e.target.value), aplicarTodas)
                }
              >
                {motor.fontesOpc.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <div className="campo-linha">
              <label className="campo">
                <span>Tamanho</span>
                <input
                  type="number"
                  value={sel.tamanho}
                  onChange={(e) =>
                    motor.comEstilo("font-size", `${Number(e.target.value)}px`, aplicarTodas)
                  }
                />
              </label>
              <label className="campo">
                <span>Peso</span>
                <select
                  value={sel.peso}
                  onChange={(e) => motor.comEstilo("font-weight", e.target.value, aplicarTodas)}
                >
                  {PESOS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo campo-cor">
                <span>Cor</span>
                <label className="cor-swatch">
                  <input
                    type="color"
                    value={sel.cor}
                    onChange={(e) => motor.comEstilo("color", e.target.value, aplicarTodas)}
                  />
                  <span style={{ background: sel.cor }} />
                </label>
              </label>
            </div>

            {/* Posicao: reset aparece so quando o elemento foi movido. */}
            {sel.posicaoAjustada && (
              <div className="campo-posicao">
                <span className="posicao-nota">Elemento movido</span>
                <button
                  className="botao botao-fantasma botao-reset-pos"
                  onClick={motor.resetarPosicao}
                >
                  Posição original
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Toggle de aplicar em todas as paginas. */}
      <section className="painel-secao">
        <button
          className={`toggle-todas${aplicarTodas ? " ativo" : ""}`}
          onClick={aoAlternarTodas}
        >
          <span className="toggle-marca">{aplicarTodas && <IconeCheck className="" />}</span>
          <span className="toggle-texto">
            Aplicar estilo em todas as páginas
            <small>Mesma tag e classes, em todos os slides. Texto nunca replica.</small>
          </span>
        </button>
      </section>

      {/* Qualquer imagem selecionada, pequena ou grande, img ou fundo CSS. */}
      <section className="painel-secao">
        <div className="secao-titulo rotulo-secao">Imagem da página {foco + 1}</div>
        {sel?.ehImagem ? (
          <ControlesImagem
            srcPreview={urlImagemPreview(sel.srcImagem, pecaPasta)}
            enviando={enviando}
            gerando={geracaoImagem.gerando}
            iaDisponivel={geracaoImagem.disponivel}
            erro={erroUpload || geracaoImagem.erro}
            aoArquivo={(file) => void aoEscolher(file)}
            aoAbrirGaleria={abrirGaleria}
            aoGerar={aoGerar}
            aoExcluir={() => setConfirmarExclusao("imagem")}
          />
        ) : (
          <p className="painel-vazio">
            Clique em qualquer imagem desta página para trocar, gerar outra ou excluir.
          </p>
        )}
      </section>
      {confirmarExclusao && sel && (
        <Confirmacao
          dados={{
            titulo:
              confirmarExclusao === "imagem"
                ? "Excluir esta imagem?"
                : "Excluir este elemento?",
            mensagem:
              "Você ainda poderá desfazer enquanto estiver editando. Depois de salvar o carrossel, esta exclusão será irreversível.",
            rotuloConfirmar:
              confirmarExclusao === "imagem" ? "Excluir imagem" : "Excluir elemento",
            aoConfirmar:
              confirmarExclusao === "imagem"
                ? motor.excluirImagemSelecionada
                : motor.excluirSelecionado,
          }}
          aoFechar={() => setConfirmarExclusao(null)}
        />
      )}
      <GaleriaFontes
        aberta={galeriaAberta}
        aoFechar={() => {
          setGaleriaAberta(false);
          alvoGaleria.current = null;
        }}
        aoEscolher={escolherDaGaleria}
      />
    </aside>
  );
}
