// Painel de propriedades do Studio de Site. Fica a direita da TelaSite no modo
// Editar (a tela, dono B, monta este componente com as props abaixo). Espelha o
// estado do usarMotorSite (dono A) e chama os metodos dele: texto, tipografia,
// escopo geral ou so no celular, link, imagem, secoes e cores globais. Toda cor
// vem dos tokens de tema (global.css), funciona nos 3 temas, sem backdrop-filter.
// Estilos proprios no bloco /* ===== PainelSite ===== */ no fim de site.css.

import { useEffect, useRef, useState } from "react";
import type { EscopoEstilo, MotorSite } from "../editor/motorSite";
import { ControlesImagem, MenuAdicionarImagem } from "../editor/ControlesImagem";
import { PainelCamadas } from "../editor/PainelCamadas";
import { GaleriaFontes, type ArquivoGaleriaFonte } from "../editor/GaleriaFontes";
import { usarGeracaoImagemIA } from "../editor/usarGeracaoImagem";
import {
  aplicarImagemDaFonte,
  type AlvoImagemCapturado,
  urlImagemPreview,
} from "../editor/imagens";
import { Confirmacao } from "../comum/Confirmacao";
import {
  IconeX,
  IconeSubir,
  IconeDuplicar,
  IconeLixeira,
  IconeChevron,
  IconeSeta,
} from "../comum/Icones";
import "./site.css";
// Estilos do PainelCamadas e do menu de adicionar imagem (blocos camadas-* e
// editor-imagem-* compartilhados com o editor de carrossel).
import "../editor/editor.css";

// Contrato da rodada: a tela (dono B) passa exatamente estas props.
interface Props {
  // Retorno do usarMotorSite ligado ao iframe da pagina.
  motor: MotorSite;
  // Subpasta da peca (um segmento), pro preview de imagem.
  pecaPasta: string;
  // Nome do arquivo da pagina aberta, so pra contexto no cabecalho.
  arquivoAtual: string;
  // Fecha o painel (a tela decide o que isso significa, ex sair do modo Editar).
  aoFechar: () => void;
}

const PESOS = ["400", "500", "600", "700", "800"];

// Um valor de cor cabe no color picker quando e hex simples (nao rgba nem gradiente).
function ehHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

// Expande #abc pra #aabbcc, que e o unico formato aceito pelo input color.
function hexCheio(v: string): string {
  const t = v.trim();
  return t.length === 4 ? "#" + t.slice(1).replace(/./g, (c) => c + c) : t;
}

// Envolve em aspas so quando o nome da fonte tem espaco.
function valorFonte(nome: string): string {
  return /\s/.test(nome) ? `'${nome}'` : nome;
}

export function PainelSite({ motor, pecaPasta, arquivoAtual, aoFechar }: Props) {
  const sel = motor.selecao;

  // Escopo das mudancas de estilo: vale pra todas as chamadas de aplicarEstilo.
  const [escopo, setEscopo] = useState<EscopoEstilo>("geral");
  // Cores globais colapsam, mas nascem abertas (sempre visiveis).
  const [coresAbertas, setCoresAbertas] = useState(true);
  // Atalho WhatsApp: campo de numero inline.
  const [waAberto, setWaAberto] = useState(false);
  const [waNumero, setWaNumero] = useState("");
  // Troca de imagem em andamento.
  const [enviando, setEnviando] = useState(false);
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  // Insercao de imagem nova na secao (Adicionar imagem).
  const [inserindo, setInserindo] = useState(false);
  const [erroInserir, setErroInserir] = useState<string | null>(null);
  // Exclusao de secao armada (confirmacao de dois cliques padrao do app).
  const [armado, setArmado] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<"elemento" | "imagem" | null>(null);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const alvoGaleria = useRef<AlvoImagemCapturado | null>(null);
  const geracaoImagem = usarGeracaoImagemIA();

  // Some com a barra do WhatsApp quando o elemento deixa de ser link.
  useEffect(() => {
    if (!sel?.ehLink) {
      setWaAberto(false);
      setWaNumero("");
    }
  }, [sel?.ehLink]);

  // Desarma a exclusao sozinho depois de 4s, como o resto do app.
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(null), 4000);
    return () => clearTimeout(t);
  }, [armado]);

  function mudarEstilo(prop: string, valor: string) {
    motor.aplicarEstilo(prop, valor, escopo);
  }

  function usarWhatsApp() {
    const digitos = waNumero.replace(/\D/g, "");
    if (!digitos) return;
    motor.definirHref(`https://wa.me/${digitos}`);
    setWaAberto(false);
    setWaNumero("");
  }

  async function trocarImagem(file: File) {
    setErroImagem(null);
    geracaoImagem.limparErro();
    setEnviando(true);
    try {
      await motor.trocarImagem(file);
    } catch {
      setErroImagem("Não foi possível trocar a imagem. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  // A descricao vem da janela do ControlesImagem e pode ser vazia: vazia, a IA
  // trabalha so com o contexto do elemento, como sempre trabalhou.
  function gerarImagem(descricao: string) {
    setErroImagem(null);
    const alvo = motor.capturarImagemSelecionada();
    if (!alvo) {
      setErroImagem("Selecione uma imagem antes de gerar outra.");
      return;
    }
    void geracaoImagem.gerar(pecaPasta, alvo, undefined, descricao);
  }

  function abrirGaleria() {
    setErroImagem(null);
    const alvo = motor.capturarImagemSelecionada();
    if (!alvo) {
      setErroImagem("Selecione uma imagem antes de abrir as fontes de dados.");
      return;
    }
    alvoGaleria.current = alvo;
    setGaleriaAberta(true);
  }

  async function escolherDaGaleria(arquivo: ArquivoGaleriaFonte) {
    if (!alvoGaleria.current) throw new Error("A imagem selecionada não está mais disponível.");
    await aplicarImagemDaFonte(pecaPasta, arquivo, alvoGaleria.current);
  }

  // ===== Adicionar imagem na secao selecionada (insercao, nao troca).
  async function inserirImagem(file: File) {
    setErroInserir(null);
    setInserindo(true);
    try {
      await motor.inserirImagemLivre(file);
    } catch (err) {
      setErroInserir(
        err instanceof Error ? err.message : "Não foi possível adicionar a imagem.",
      );
    } finally {
      setInserindo(false);
    }
  }

  function abrirGaleriaInsercao() {
    setErroInserir(null);
    const alvo = motor.capturarInsercaoImagem();
    if (!alvo) {
      setErroInserir("Selecione uma seção do site primeiro.");
      return;
    }
    alvoGaleria.current = alvo;
    setGaleriaAberta(true);
  }

  function excluir(id: string) {
    if (armado !== id) {
      setArmado(id);
      return;
    }
    setArmado(null);
    motor.excluirSecao(id);
  }

  return (
    <aside className="ed-lateral ps-painel nowheel" aria-label="Editar">
      <header className="ed-lateral-topo">
        <div className="ed-lateral-topo-texto">
          <h2>Editar</h2>
          {arquivoAtual && <p>{arquivoAtual}</p>}
        </div>
        {/* Nunca ganha disabled: é a saída do painel. */}
        <button
          className="botao botao-p botao-icone botao-fantasma"
          onClick={aoFechar}
          title="Fechar o editor"
          aria-label="Fechar o editor"
        >
          <IconeX className="" />
        </button>
      </header>

      <div className="ps-corpo">
        {!sel ? (
          // ===== Sem selecao: dica + lista de secoes.
          <section className="painel-secao">
            <div className="secao-titulo secao-principal">Seções da página</div>
            <p className="painel-vazio">
              Clique num elemento do site pra editar, ou escolha uma seção aqui
              pra selecionar ela no canvas.
            </p>
            {motor.secoes.length === 0 ? (
              <p className="painel-vazio">Esta página não tem seções pra reordenar.</p>
            ) : (
              <ul className="lista">
                {motor.secoes.map((s) => (
                  <li className="item-lista ps-secao-item" key={s.id}>
                    <button
                      className="ps-secao-rotulo"
                      onClick={() => motor.selecionarSecao(s.id)}
                      title="Selecionar esta seção no canvas"
                    >
                      <span className="item-lista-titulo">{s.rotulo}</span>
                      <span className="item-lista-meta">{s.tag}</span>
                    </button>
                    {/* As quatro ações nascem visíveis. */}
                    <div className="item-lista-acoes">
                      <button
                        className="botao botao-p botao-icone botao-fantasma"
                        onClick={() => motor.moverSecao(s.id, "cima")}
                        title="Subir"
                        aria-label={`Subir a seção ${s.rotulo}`}
                      >
                        <IconeSubir className="" />
                      </button>
                      <button
                        className="botao botao-p botao-icone botao-fantasma"
                        onClick={() => motor.moverSecao(s.id, "baixo")}
                        title="Descer"
                        aria-label={`Descer a seção ${s.rotulo}`}
                      >
                        <IconeSubir className="ps-vira" />
                      </button>
                      <button
                        className="botao botao-p botao-icone botao-fantasma"
                        onClick={() => motor.duplicarSecao(s.id)}
                        title="Duplicar"
                        aria-label={`Duplicar a seção ${s.rotulo}`}
                      >
                        <IconeDuplicar className="" />
                      </button>
                      <button
                        className={`botao botao-p botao-icone botao-fantasma ps-excluir${
                          armado === s.id ? " armado" : ""
                        }`}
                        onClick={() => excluir(s.id)}
                        aria-label={`Excluir a seção ${s.rotulo}`}
                        title={
                          armado === s.id
                            ? "Clique de novo pra excluir de vez"
                            : "Excluir seção"
                        }
                      >
                        <IconeLixeira className="" />
                      </button>
                    </div>
                    {armado === s.id && (
                      <span className="ps-confirma">Confirmar exclusão?</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <small className="dica">
              Selecione uma seção pra ver e reordenar as camadas dela.
            </small>
          </section>
        ) : (
          // ===== Com selecao: elemento, tipografia, escopo, link, imagem.
          <section className="painel-secao">
            <div className="secao-titulo secao-principal">Elemento</div>
            <span className="selo chip-alvo" title={`${sel.tag} ${sel.classes}`}>
              <code>{sel.tag}</code>
              {sel.classes && <span>.{sel.classes.split(" ").join(".")}</span>}
            </span>

            <div className="acoes-elemento">
              {sel.podeSubirNivel && (
                <button
                  className="botao botao-p botao-neutro"
                  onClick={motor.selecionarPai}
                  title="Selecionar o bloco que envolve este elemento"
                >
                  <IconeSubir className="" />
                  Contêiner
                </button>
              )}
              {sel.podeExcluir && (
                <button
                  className="botao botao-p botao-perigo"
                  onClick={() => setConfirmarExclusao("elemento")}
                >
                  <IconeLixeira className="" />
                  Excluir
                </button>
              )}
            </div>

            <label className="grupo-campo">
              <span className="rotulo">Texto</span>
              <textarea
                className="campo"
                value={sel.texto}
                disabled={!sel.editavelTexto}
                onChange={(e) => motor.aplicarTexto(e.target.value)}
                rows={2}
              />
              {!sel.editavelTexto ? (
                <small className="dica">
                  Dê dois cliques no texto do canvas pra editar este bloco.
                </small>
              ) : sel.temDestaqueInline ? (
                <small className="dica">
                  Este bloco tem partes destacadas, editar aqui remove o destaque.
                  Prefira o duplo clique no canvas.
                </small>
              ) : null}
            </label>

            {/* Escopo: vale pra toda mudanca de estilo abaixo. */}
            <div className="grupo-campo">
              <span className="rotulo" id="ps-rotulo-escopo">
                Onde vale a mudança
              </span>
              <div className="segmentado" role="group" aria-labelledby="ps-rotulo-escopo">
                <button
                  className="segmento"
                  aria-pressed={escopo === "geral"}
                  onClick={() => setEscopo("geral")}
                >
                  Geral
                </button>
                <button
                  className="segmento"
                  aria-pressed={escopo === "mobile"}
                  onClick={() => setEscopo("mobile")}
                >
                  Só no celular
                </button>
              </div>
              <small className="dica">
                {escopo === "mobile"
                  ? "Vale só em telas até 640px, o desktop não muda."
                  : "Vale nos dois tamanhos, desktop e celular."}
              </small>
            </div>

            <label className="grupo-campo">
              <span className="rotulo">Fonte</span>
              <select
                className="campo"
                value={sel.fonte}
                onChange={(e) => mudarEstilo("font-family", valorFonte(e.target.value))}
              >
                {motor.fontesOpc.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <div className="campo-tamanho-linha">
              <label className="grupo-campo">
                <span className="rotulo">Tamanho</span>
                <div className="ps-num">
                  <input
                    className="campo"
                    type="number"
                    value={sel.tamanho}
                    min={1}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n > 0) mudarEstilo("font-size", `${n}px`);
                    }}
                  />
                  <span className="ps-num-un">px</span>
                </div>
              </label>
              <label className="grupo-campo">
                <span className="rotulo">Peso</span>
                <select
                  className="campo"
                  value={sel.peso}
                  onChange={(e) => mudarEstilo("font-weight", e.target.value)}
                >
                  {PESOS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="campo-tamanho-linha">
              <div className="grupo-campo campo-cor">
                <span className="rotulo">Cor do texto</span>
                <label className="cor-swatch">
                  <input
                    type="color"
                    value={sel.cor}
                    onChange={(e) => mudarEstilo("color", e.target.value)}
                    aria-label="Cor do texto"
                  />
                  <span style={{ background: sel.cor }} />
                </label>
              </div>
              <div className="grupo-campo campo-cor">
                <span className="rotulo">Cor do fundo</span>
                <div className="ps-fundo">
                  <label className="cor-swatch">
                    <input
                      type="color"
                      value={sel.corFundo || "#ffffff"}
                      onChange={(e) => mudarEstilo("background-color", e.target.value)}
                      aria-label="Cor do fundo"
                    />
                    {/* Sem cor definida, o xadrez da folha diz que o fundo e
                        transparente. O estilo inline so entra quando ha cor:
                        inline vence folha, e um "transparent" escrito aqui
                        apagava o xadrez. */}
                    <span
                      style={sel.corFundo ? { background: sel.corFundo } : undefined}
                      className={sel.corFundo ? "" : "ps-swatch-vazio"}
                    />
                  </label>
                  {sel.corFundo && (
                    <button
                      className="botao botao-p botao-neutro"
                      onClick={() => mudarEstilo("background-color", "")}
                      title="Remover a cor de fundo"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Link: campo de href + atalho WhatsApp. Tambem aparece quando o
                elemento ainda nao e link mas pode virar um (ex: cartao "em
                breve"): o primeiro endereco converte em <a> no motor. */}
            {(sel.ehLink || sel.podeVirarLink) && (
              <div className="grupo-campo">
                <span className="rotulo">Link</span>
                <input
                  className="campo"
                  value={sel.href}
                  placeholder="https://..."
                  spellCheck={false}
                  aria-label="Endereço do link"
                  onChange={(e) => motor.definirHref(e.target.value)}
                />
                {!sel.ehLink && (
                  <small className="dica">
                    Este elemento ainda não é um link. Colar um endereço aqui
                    transforma ele num link de verdade.
                  </small>
                )}
                {waAberto ? (
                  <div className="ps-wa">
                    <input
                      className="campo"
                      value={waNumero}
                      placeholder="Número com DDD"
                      inputMode="tel"
                      spellCheck={false}
                      aria-label="Número do WhatsApp"
                      onChange={(e) => setWaNumero(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && usarWhatsApp()}
                    />
                    <button
                      className="botao botao-neutro"
                      onClick={usarWhatsApp}
                      disabled={waNumero.replace(/\D/g, "") === ""}
                    >
                      Usar
                    </button>
                  </div>
                ) : (
                  <button
                    className="botao botao-neutro ps-wa-abrir"
                    onClick={() => setWaAberto(true)}
                  >
                    Atalho WhatsApp
                  </button>
                )}
              </div>
            )}

            {/* Imagem: img ou background CSS, com as mesmas acoes. */}
            {sel.ehImagem && (
              <div className="grupo-campo">
                <span className="rotulo">Imagem</span>
                <ControlesImagem
                  srcPreview={urlImagemPreview(sel.src, pecaPasta)}
                  enviando={enviando}
                  gerando={geracaoImagem.gerando}
                  iaDisponivel={geracaoImagem.disponivel}
                  erro={erroImagem || geracaoImagem.erro}
                  aoArquivo={(file) => void trocarImagem(file)}
                  aoAbrirGaleria={abrirGaleria}
                  aoGerar={gerarImagem}
                  aoExcluir={() => setConfirmarExclusao("imagem")}
                />
                {sel.tipoImagem === "img" && (
                  <label className="grupo-campo">
                    <span className="rotulo">Largura máxima</span>
                    <div className="ps-num">
                      <input
                        className="campo"
                        type="number"
                        value={sel.larguraMax}
                        min={1}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n > 0) {
                            mudarEstilo("max-width", `${n}px`);
                          }
                        }}
                      />
                      <span className="ps-num-un">px</span>
                    </div>
                    <small className="dica">
                      A imagem ocupa a coluna até este limite e encolhe junto
                      com a tela.
                    </small>
                  </label>
                )}
              </div>
            )}
          </section>
        )}

        {/* ===== Camadas da seção: aparece quando a seleção está dentro de uma
            seção listada. A lista segue a ordem da página (primeiro item no
            topo); as setas trocam a posição no fluxo. ===== */}
        {sel && (
          <section className="painel-secao ps-camadas">
            <div className="secao-titulo">Camadas da seção</div>
            {motor.camadas.length > 0 ? (
              <PainelCamadas
                itens={motor.camadas}
                selecionadoId={motor.camadaSelecionadaId}
                modo="fluxo"
                aoSelecionar={motor.selecionarCamada}
                aoReordenar={motor.reordenarCamada}
              />
            ) : (
              <p className="painel-vazio">
                Este elemento está fora das seções da página.
              </p>
            )}
            <MenuAdicionarImagem
              enviando={inserindo}
              erro={erroInserir}
              aoArquivo={(file) => void inserirImagem(file)}
              aoAbrirGaleria={abrirGaleriaInsercao}
            />
            <small className="dica">
              A imagem entra no fim da seção selecionada, na largura da coluna.
            </small>
          </section>
        )}

        {/* ===== Cores do site: sempre visivel, colapsavel. ===== */}
        <section className="painel-secao ps-cores">
          <button
            className="ps-cores-cabeca"
            onClick={() => setCoresAbertas((v) => !v)}
            aria-expanded={coresAbertas}
          >
            <span className="secao-titulo">Cores do site</span>
            <IconeChevron className={`ps-cores-seta${coresAbertas ? " aberto" : ""}`} />
          </button>
          {coresAbertas &&
            (motor.vars.length === 0 ? (
              <p className="painel-vazio">Este site não expõe cores no :root.</p>
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
                          value={hexCheio(v.valor)}
                          onChange={(e) => motor.aplicarVar(v.nome, e.target.value)}
                          aria-label={v.nome}
                        />
                        <span style={{ background: v.valor }} />
                      </label>
                    ) : (
                      <input
                        className="campo campo-p cor-texto"
                        value={v.valor}
                        spellCheck={false}
                        aria-label={v.nome}
                        onChange={(e) => motor.aplicarVar(v.nome, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
        </section>
      </div>

      {/* ===== Rodape: desfazer + estado. O salvar e da tela (Ctrl+S). ===== */}
      <footer className="ed-lateral-rodape">
        <button
          className="botao botao-neutro"
          onClick={motor.desfazer}
          disabled={!motor.podeDesfazer}
          title="Desfazer a última ação"
        >
          <IconeSeta className="ps-vira-esq" />
          Desfazer
        </button>
        <div className="ps-estado">
          <span
            className={motor.naoSalvo ? "selo selo-aviso" : "selo"}
            role="status"
          >
            {motor.naoSalvo ? "Não salvo" : "Salvo"}
          </span>
          <small className="dica">Ctrl+S salva</small>
        </div>
      </footer>
      {confirmarExclusao && sel && (
        <Confirmacao
          dados={{
            titulo:
              confirmarExclusao === "imagem"
                ? "Excluir esta imagem?"
                : "Excluir este elemento?",
            mensagem:
              "Você ainda poderá desfazer enquanto estiver editando. Depois de salvar o site, esta exclusão será irreversível.",
            rotuloConfirmar:
              confirmarExclusao === "imagem" ? "Excluir imagem" : "Excluir elemento",
            aoConfirmar:
              confirmarExclusao === "imagem"
                ? motor.excluirImagem
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

export default PainelSite;
