// Painel de propriedades do Studio de Site. Fica a direita da TelaSite no modo
// Editar (a tela, dono B, monta este componente com as props abaixo). Espelha o
// estado do usarMotorSite (dono A) e chama os metodos dele: texto, tipografia,
// escopo geral ou so no celular, link, imagem, secoes e cores globais. Toda cor
// vem dos tokens de tema (global.css), funciona nos 3 temas, sem backdrop-filter.
// Estilos proprios no bloco /* ===== PainelSite ===== */ no fim de site.css.

import { useEffect, useRef, useState } from "react";
import type { EscopoEstilo, MotorSite } from "../editor/motorSite";
import { ControlesImagem } from "../editor/ControlesImagem";
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
import "../../estilos/site.css";

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

  function gerarImagem() {
    setErroImagem(null);
    const alvo = motor.capturarImagemSelecionada();
    if (!alvo) {
      setErroImagem("Selecione uma imagem antes de gerar outra.");
      return;
    }
    void geracaoImagem.gerar(pecaPasta, alvo);
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

  function excluir(id: string) {
    if (armado !== id) {
      setArmado(id);
      return;
    }
    setArmado(null);
    motor.excluirSecao(id);
  }

  return (
    <aside className="ps-painel nowheel">
      <header className="ps-topo">
        <div className="ps-topo-titulo">
          <h2>Editar</h2>
          {arquivoAtual && <span className="ps-topo-sub">{arquivoAtual}</span>}
        </div>
        <button className="ps-fechar" onClick={aoFechar} title="Fechar o editor">
          <IconeX className="" />
        </button>
      </header>

      <div className="ps-corpo">
        {!sel ? (
          // ===== Sem selecao: dica + lista de secoes.
          <section className="ps-secao">
            <p className="ps-vazio">Clique num elemento do site pra editar.</p>
            <div className="ps-titulo">Seções da página</div>
            {motor.secoes.length === 0 ? (
              <p className="ps-vazio">Esta página não tem seções pra reordenar.</p>
            ) : (
              <ul className="ps-secoes">
                {motor.secoes.map((s) => (
                  <li className="ps-secao-item" key={s.id}>
                    <button
                      className="ps-secao-rotulo"
                      onClick={() => motor.selecionarSecao(s.id)}
                      title="Selecionar esta seção no canvas"
                    >
                      <span className="ps-secao-nome">{s.rotulo}</span>
                      <span className="ps-secao-tag">{s.tag}</span>
                    </button>
                    <div className="ps-secao-acoes">
                      <button
                        className="ps-mini"
                        onClick={() => motor.moverSecao(s.id, "cima")}
                        title="Subir"
                      >
                        <IconeSubir className="" />
                      </button>
                      <button
                        className="ps-mini"
                        onClick={() => motor.moverSecao(s.id, "baixo")}
                        title="Descer"
                      >
                        <IconeSubir className="ps-vira" />
                      </button>
                      <button
                        className="ps-mini"
                        onClick={() => motor.duplicarSecao(s.id)}
                        title="Duplicar"
                      >
                        <IconeDuplicar className="" />
                      </button>
                      <button
                        className={`ps-mini ps-excluir${armado === s.id ? " armado" : ""}`}
                        onClick={() => excluir(s.id)}
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
          </section>
        ) : (
          // ===== Com selecao: elemento, tipografia, escopo, link, imagem.
          <section className="ps-secao">
            <div className="ps-chip">
              <code>{sel.tag}</code>
              {sel.classes && <span>.{sel.classes.split(" ").join(".")}</span>}
            </div>

            <div className="ps-elemento-acoes">
              {sel.podeSubirNivel && (
                <button
                  className="botao botao-neutro"
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

            <label className="ps-campo">
              <span>Texto</span>
              <textarea
                value={sel.texto}
                disabled={!sel.editavelTexto}
                onChange={(e) => motor.aplicarTexto(e.target.value)}
                rows={2}
              />
              {!sel.editavelTexto ? (
                <small className="ps-nota">
                  Dê dois cliques no texto do canvas pra editar este bloco.
                </small>
              ) : sel.temDestaqueInline ? (
                <small className="ps-nota">
                  Este bloco tem partes destacadas, editar aqui remove o destaque.
                  Prefira o duplo clique no canvas.
                </small>
              ) : null}
            </label>

            {/* Escopo: vale pra toda mudanca de estilo abaixo. */}
            <div className="ps-campo">
              <span>Onde vale a mudança</span>
              <div className="ps-escopo">
                <button
                  className={`ps-escopo-btn${escopo === "geral" ? " ativo" : ""}`}
                  onClick={() => setEscopo("geral")}
                >
                  Geral
                </button>
                <button
                  className={`ps-escopo-btn${escopo === "mobile" ? " ativo" : ""}`}
                  onClick={() => setEscopo("mobile")}
                >
                  Só no celular
                </button>
              </div>
              <small className="ps-nota">
                {escopo === "mobile"
                  ? "Vale só em telas até 640px, o desktop não muda."
                  : "Vale nos dois tamanhos, desktop e celular."}
              </small>
            </div>

            <label className="ps-campo">
              <span>Fonte</span>
              <select
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

            <div className="ps-linha">
              <label className="ps-campo">
                <span>Tamanho</span>
                <div className="ps-num">
                  <input
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
              <label className="ps-campo">
                <span>Peso</span>
                <select
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

            <div className="ps-linha">
              <div className="ps-campo">
                <span>Cor do texto</span>
                <label className="ps-swatch">
                  <input
                    type="color"
                    value={sel.cor}
                    onChange={(e) => mudarEstilo("color", e.target.value)}
                  />
                  <span style={{ background: sel.cor }} />
                </label>
              </div>
              <div className="ps-campo">
                <span>Cor do fundo</span>
                <div className="ps-fundo">
                  <label className="ps-swatch">
                    <input
                      type="color"
                      value={sel.corFundo || "#ffffff"}
                      onChange={(e) => mudarEstilo("background-color", e.target.value)}
                    />
                    <span
                      style={{
                        background: sel.corFundo || "transparent",
                      }}
                      className={sel.corFundo ? "" : "ps-swatch-vazio"}
                    />
                  </label>
                  {sel.corFundo && (
                    <button
                      className="ps-limpar"
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
              <div className="ps-campo">
                <span>Link</span>
                <input
                  className="ps-input"
                  value={sel.href}
                  placeholder="https://..."
                  spellCheck={false}
                  onChange={(e) => motor.definirHref(e.target.value)}
                />
                {!sel.ehLink && (
                  <small className="ps-nota">
                    Este elemento ainda não é um link. Colar um endereço aqui
                    transforma ele num link de verdade.
                  </small>
                )}
                {waAberto ? (
                  <div className="ps-wa">
                    <input
                      className="ps-input"
                      value={waNumero}
                      placeholder="Número com DDD"
                      inputMode="tel"
                      spellCheck={false}
                      onChange={(e) => setWaNumero(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && usarWhatsApp()}
                    />
                    <button
                      className="botao botao-principal ps-wa-ok"
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
              <div className="ps-campo">
                <span>Imagem</span>
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
              </div>
            )}
          </section>
        )}

        {/* ===== Cores do site: sempre visivel, colapsavel. ===== */}
        <section className="ps-secao ps-cores">
          <button
            className="ps-cores-cabeca"
            onClick={() => setCoresAbertas((v) => !v)}
            aria-expanded={coresAbertas}
          >
            <span className="ps-titulo">Cores do site</span>
            <IconeChevron className={`ps-cores-seta${coresAbertas ? " aberto" : ""}`} />
          </button>
          {coresAbertas &&
            (motor.vars.length === 0 ? (
              <p className="ps-vazio">Este site não expõe cores no :root.</p>
            ) : (
              <div className="ps-lista-cores">
                {motor.vars.map((v) => (
                  <div className="ps-cor-item" key={v.nome}>
                    <span className="ps-cor-nome" title={v.nome}>
                      {v.nome.replace(/^--/, "")}
                    </span>
                    {ehHex(v.valor) ? (
                      <label className="ps-swatch">
                        <input
                          type="color"
                          value={hexCheio(v.valor)}
                          onChange={(e) => motor.aplicarVar(v.nome, e.target.value)}
                        />
                        <span style={{ background: v.valor }} />
                      </label>
                    ) : (
                      <input
                        className="ps-cor-texto"
                        value={v.valor}
                        spellCheck={false}
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
      <footer className="ps-rodape">
        <button
          className="botao botao-neutro ps-desfazer"
          onClick={motor.desfazer}
          disabled={!motor.podeDesfazer}
          title="Desfazer a última ação"
        >
          <IconeSeta className="ps-vira-esq" />
          Desfazer
        </button>
        <div className="ps-estado">
          <span className={motor.naoSalvo ? "ps-sujo" : "ps-salvo"}>
            {motor.naoSalvo ? "Não salvo" : "Salvo"}
          </span>
          <small className="ps-nota">Ctrl+S salva</small>
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
