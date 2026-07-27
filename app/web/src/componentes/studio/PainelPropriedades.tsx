import { useRef, useState } from "react";
import { IconeCheck, IconeDuplicar, IconeLixeira, IconeSubir } from "../comum/Icones";
import type { MotorEdicao } from "../editor/motor";
import { ControlesImagem, MenuAdicionarImagem } from "../editor/ControlesImagem";
import { PainelCamadas } from "../editor/PainelCamadas";
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
  // Abre a confirmacao de exclusao, que vive na tela: a tecla Delete no canvas
  // precisa cair na MESMA janela que o botao daqui.
  aoPedirExcluir: (alvo: "elemento" | "imagem") => void;
}

export function PainelPropriedades({
  motor,
  foco,
  pecaPasta,
  aplicarTodas,
  aoAlternarTodas,
  aoPedirExcluir,
}: Props) {
  const sel = motor.selecao;
  const [enviando, setEnviando] = useState(false);
  const [enviandoNova, setEnviandoNova] = useState(false);
  const [erroNova, setErroNova] = useState<string | null>(null);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
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

  // ===== Adicionar imagem livre (E3): computador ou fontes de dados.
  async function adicionarDoComputador(file: File) {
    setErroNova(null);
    setEnviandoNova(true);
    try {
      await motor.inserirImagemLivreArquivo(foco, file);
    } catch (erro) {
      setErroNova(erro instanceof Error ? erro.message : "Falha ao enviar a imagem.");
    } finally {
      setEnviandoNova(false);
    }
  }

  function adicionarDasFontes() {
    setErroNova(null);
    alvoGaleria.current = {
      contexto: "",
      aplicar: (caminhoRelativo) => motor.inserirImagemLivre(foco, caminhoRelativo),
    };
    setGaleriaAberta(true);
  }

  // Camadas da pagina em foco. Releitura direta a cada render: o motor sobe
  // versaoDoc a cada mudanca no doc, entao o pai re-renderiza na hora certa.
  const camadas = motor.pronto ? motor.listarCamadas(foco) : [];

  return (
    <aside className="editor-painel studio-painel nowheel">
      {/* Elemento selecionado. */}
      <section className="painel-secao">
        <div className="secao-titulo rotulo-secao">Elemento</div>
        {!sel ? (
          <p className="painel-vazio">
            Clique em qualquer parte da página para selecionar. Dois cliques
            editam o texto no lugar. Arraste para mover, com guias de alinhamento.
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
                  Contêiner
                </button>
              )}
              {sel.podeExcluir && (
                <button
                  className="botao botao-fantasma"
                  onClick={motor.duplicarSelecionado}
                  title="Duplicar ao lado (Ctrl+D)"
                >
                  <IconeDuplicar className="" />
                  Duplicar
                </button>
              )}
              {sel.podeExcluir && (
                <button
                  className="botao botao-perigo"
                  onClick={() => aoPedirExcluir("elemento")}
                  title="Excluir (Delete)"
                >
                  <IconeLixeira className="" />
                  Excluir
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

            {/* Tamanho: alcas interativas nas bordas mais os campos exatos.
                So elementos absolutos ganham alca (bloco de fluxo nao). */}
            {sel.redimensionavel && (
              <div className="campo-tamanho">
                <span className="posicao-nota">
                  Arraste as alças nas bordas para redimensionar. No canto, a
                  imagem mantém a proporção (Shift libera; num bloco, Shift trava).
                </span>
                {!sel.ehImagem && (
                  <div className="campo-tamanho-linha">
                    <label className="campo">
                      <span>Largura (px)</span>
                      <input
                        type="number"
                        min={16}
                        value={sel.larguraPx}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 16) motor.comEstilo("width", `${v}px`, false);
                        }}
                      />
                    </label>
                    <label className="campo">
                      <span>Altura (px)</span>
                      <input
                        type="number"
                        min={16}
                        value={sel.alturaPx}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 16) motor.comEstilo("height", `${v}px`, false);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Qualquer imagem selecionada, pequena ou grande, img ou fundo CSS. */}
      <section className="painel-secao">
        <div className="secao-titulo rotulo-secao">Imagem da página {foco + 1}</div>
        {sel?.ehImagem ? (
          <>
            <ControlesImagem
              srcPreview={urlImagemPreview(sel.srcImagem, pecaPasta)}
              enviando={enviando}
              gerando={geracaoImagem.gerando}
              iaDisponivel={geracaoImagem.disponivel}
              erro={erroUpload || geracaoImagem.erro}
              aoArquivo={(file) => void aoEscolher(file)}
              aoAbrirGaleria={abrirGaleria}
              aoGerar={aoGerar}
              aoExcluir={() => aoPedirExcluir("imagem")}
            />
            {sel.tipoImagem === "img" && (
              <label className="campo">
                <span>Largura (px)</span>
                <input
                  type="number"
                  min={20}
                  value={sel.larguraPx}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) motor.comEstilo("width", `${v}px`, false);
                  }}
                />
                <small className="campo-nota">A altura acompanha a proporção.</small>
              </label>
            )}
          </>
        ) : (
          <p className="painel-vazio">
            Clique em qualquer imagem desta página para trocar, gerar outra ou excluir.
          </p>
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

      {/* Camadas do slide em foco: seleciona pela lista, sobe e desce. */}
      <section className="painel-secao">
        <div className="secao-titulo rotulo-secao">Camadas da página {foco + 1}</div>
        <PainelCamadas
          itens={camadas}
          selecionadoId={sel?.vkId || null}
          aoSelecionar={motor.selecionarPorId}
          aoMover={motor.moverCamada}
        />
      </section>

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

      {/* Adicionar imagem propria como elemento livre da pagina em foco. */}
      <section className="painel-secao">
        <div className="secao-titulo rotulo-secao">Adicionar imagem</div>
        <MenuAdicionarImagem
          enviando={enviandoNova}
          erro={erroNova}
          aoArquivo={(file) => void adicionarDoComputador(file)}
          aoAbrirGaleria={adicionarDasFontes}
        />
        <p className="painel-vazio">
          A imagem nasce no centro da página {foco + 1}. Arraste pra posicionar e
          use as camadas pra escolher o que fica na frente.
        </p>
      </section>
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
