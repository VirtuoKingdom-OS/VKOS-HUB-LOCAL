import { useCallback, useEffect, useMemo, useState } from "react";

import {
  abrirStudioBancoModelo,
  atualizarBancoModelo,
  criarBancoModelo,
  enviarAnexo,
  excluirBancoModelo,
  listarBancoModelos,
  restaurarBancoModelo,
  type ModeloBancoVisual,
  type OrigemHtmlBanco,
  type OriginalBancoVisual,
  type TipoModeloBanco,
} from "../../api/cliente";
import { usarEstado } from "../../estado/contexto";
import { lerBase64 } from "../../util/arquivo";
import { MiniModelo } from "../comum/MiniModelo";
import {
  AreaTexto,
  Aviso,
  Botao,
  Campo,
  EstadoCarregando,
  EstadoVazio,
  Interruptor,
  Selecao,
} from "../comum/Sistema";
import { EVENTO_NAVEGACAO } from "../layout/rotas";
import { montarPromptModelo } from "./promptModelo";
import "../../estilos/criacao.css";

type OrigemFormulario = "colar" | "referencia";

interface GeracaoModelo {
  sessaoId: string;
  workspaceId: string;
  pasta: string;
}

// Cartao unificado da grade: um original da semente ou um modelo proprio (b-*).
interface CartaoModelo {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoModeloBanco;
  pedeImagem: boolean;
  original: boolean;
  atualizado: boolean;
}

// Edicao aberta no Studio: a peca temporaria que vai voltar pro banco.
interface EdicaoStudio {
  cartao: CartaoModelo;
  workspaceId: string;
  pasta: string;
}

function cartaoDeOriginal(modelo: OriginalBancoVisual): CartaoModelo {
  return {
    id: modelo.id,
    nome: modelo.nome,
    descricao: modelo.descricao,
    tipo: modelo.tipo,
    pedeImagem: modelo.pedeImagem,
    original: true,
    atualizado: modelo.atualizado,
  };
}

function cartaoDeProprio(modelo: ModeloBancoVisual): CartaoModelo {
  return {
    id: modelo.id,
    nome: modelo.nome,
    descricao: modelo.descricao,
    tipo: modelo.tipo,
    pedeImagem: modelo.pedeImagem,
    original: false,
    atualizado: false,
  };
}

const ROTULOS_TIPO: Record<TipoModeloBanco, string> = {
  capa: "Capa",
  desenvolvimento: "Desenvolvimento",
  cta: "CTA",
  completo: "Completo",
};

function dataLocal(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function slug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "novo";
}

function pastaLivre(nome: string, ocupadas: Set<string>): string {
  const base = `${dataLocal()}-modelo-${slug(nome)}`;
  if (!ocupadas.has(base)) return base;
  let indice = 2;
  while (ocupadas.has(`${base}-${indice}`)) indice += 1;
  return `${base}-${indice}`;
}

export function BancoVisual() {
  const {
    criarSessao,
    modeloPadrao,
    pecas,
    recarregarPecas,
    sessoes,
    workspaceAtivo,
  } = usarEstado();
  const [originais, setOriginais] = useState<OriginalBancoVisual[]>([]);
  const [proprios, setProprios] = useState<ModeloBancoVisual[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [formulario, setFormulario] = useState(false);
  const [passo, setPasso] = useState<1 | 2>(1);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoModeloBanco>("completo");
  const [pedeImagem, setPedeImagem] = useState(false);
  const [origem, setOrigem] = useState<OrigemFormulario>("colar");
  const [html, setHtml] = useState("");
  const [imagem, setImagem] = useState("");
  const [imagemNome, setImagemNome] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const [geracao, setGeracao] = useState<GeracaoModelo | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [confirmandoRestauro, setConfirmandoRestauro] = useState<string | null>(null);
  const [edicaoStudio, setEdicaoStudio] = useState<EdicaoStudio | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await listarBancoModelos();
      setOriginais(resposta.originais);
      setProprios(resposta.proprios);
      setErro("");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar o banco visual.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const sessaoGeracao = useMemo(
    () => geracao ? sessoes.find((sessao) => sessao.id === geracao.sessaoId) : undefined,
    [geracao, sessoes],
  );
  const pecaGerada = useMemo(
    () => geracao ? pecas.find((peca) => peca.pasta === geracao.pasta) : undefined,
    [geracao, pecas],
  );
  const geracaoTerminou =
    sessaoGeracao?.status === "concluida" ||
    sessaoGeracao?.status === "erro" ||
    sessaoGeracao?.status === "parada";
  const geracaoPronta = Boolean(
    pecaGerada?.fonteHtml &&
    (pecaGerada.paginas ?? 0) > 0 &&
    geracaoTerminou,
  );

  useEffect(() => {
    if (!geracao || geracaoPronta || geracaoTerminou) return;
    const intervalo = window.setInterval(() => {
      void recarregarPecas();
    }, 3000);
    return () => window.clearInterval(intervalo);
  }, [geracao, geracaoPronta, geracaoTerminou, recarregarPecas]);

  function limparFormulario() {
    setFormulario(false);
    setPasso(1);
    setEditando(null);
    setNome("");
    setDescricao("");
    setTipo("completo");
    setPedeImagem(false);
    setOrigem("colar");
    setHtml("");
    setImagem("");
    setImagemNome("");
    setInstrucoes("");
    setGeracao(null);
    setErro("");
  }

  function novoModelo() {
    limparFormulario();
    setFormulario(true);
  }

  function editar(modelo: CartaoModelo) {
    limparFormulario();
    setFormulario(true);
    setPasso(1);
    setEditando(modelo.id);
    setNome(modelo.nome);
    setDescricao(modelo.descricao);
    setTipo(modelo.tipo);
    setPedeImagem(modelo.pedeImagem);
  }

  async function salvarComOrigem(origemHtml?: OrigemHtmlBanco) {
    setErro("");
    setAviso("");
    setOcupado(true);
    try {
      const dados = { nome: nome.trim(), descricao: descricao.trim(), tipo, pedeImagem };
      const resposta = editando
        ? await atualizarBancoModelo(editando, { ...dados, origemHtml })
        : await criarBancoModelo({ ...dados, origemHtml: origemHtml! });
      setAviso(
        resposta.avisos.length > 0
          ? `Modelo salvo. ${resposta.avisos.join(" ")}`
          : "Modelo salvo no banco visual.",
      );
      limparFormulario();
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o modelo.");
    } finally {
      setOcupado(false);
    }
  }

  async function salvarHtml() {
    const conteudo = html.trim();
    if (!editando && !conteudo) {
      setErro("Cole o HTML do modelo ou envie um arquivo .html.");
      return;
    }
    await salvarComOrigem(conteudo ? { modo: "colar", html: conteudo } : undefined);
  }

  async function escolherHtml(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.name.toLowerCase().endsWith(".html")) {
      setErro("Escolha um arquivo .html.");
      return;
    }
    setHtml(await arquivo.text());
    setErro("");
  }

  async function escolherImagem(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha uma imagem de referência.");
      return;
    }
    setErro("");
    setOcupado(true);
    try {
      const resposta = await enviarAnexo({
        nome: arquivo.name,
        conteudoBase64: await lerBase64(arquivo),
      });
      setImagem(resposta.caminhoRelativo);
      setImagemNome(arquivo.name);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar a referência.");
    } finally {
      setOcupado(false);
    }
  }

  async function copiarModelo() {
    if (!workspaceAtivo) {
      setErro("Ative um workspace no Estúdio antes de copiar uma referência.");
      return;
    }
    if (!imagem) {
      setErro("Envie uma imagem de referência.");
      return;
    }
    setErro("");
    setAviso("");
    setOcupado(true);
    try {
      const pasta = pastaLivre(nome, new Set(pecas.map((peca) => peca.pasta)));
      const sessao = await criarSessao({
        titulo: `Copiar modelo: ${nome.trim()}`,
        prompt: montarPromptModelo({
          nome: nome.trim(),
          tipo,
          pasta,
          imagem,
          instrucoes,
        }),
        skill: "modelo-carrossel",
        modelo: modeloPadrao,
      });
      setGeracao({ sessaoId: sessao.id, workspaceId: workspaceAtivo, pasta });
      setAviso("A cópia começou. Você pode acompanhar o resultado aqui.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível iniciar a cópia.");
    } finally {
      setOcupado(false);
    }
  }

  async function salvarGerado() {
    if (!geracao) return;
    await salvarComOrigem({
      modo: "peca",
      workspaceId: geracao.workspaceId,
      pasta: geracao.pasta,
    });
  }

  function abrirStudio() {
    if (!geracao) return;
    window.open(
      `/w/${encodeURIComponent(geracao.workspaceId)}/studio/${encodeURIComponent(geracao.pasta)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function irEstudio() {
    history.pushState(null, "", "/estudio");
    window.dispatchEvent(new Event(EVENTO_NAVEGACAO));
  }

  async function excluir(modelo: CartaoModelo) {
    if (confirmandoExclusao !== modelo.id) {
      setConfirmandoExclusao(modelo.id);
      return;
    }
    setOcupado(true);
    setErro("");
    try {
      await excluirBancoModelo(modelo.id);
      setAviso("Modelo excluído do banco. As cópias já usadas nos workspaces foram mantidas.");
      setConfirmandoExclusao(null);
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível excluir o modelo.");
    } finally {
      setOcupado(false);
    }
  }

  // Restaurar original: volta pro estado de fabrica. O parque converge no
  // proximo uso de cada workspace.
  async function restaurar(modelo: CartaoModelo) {
    if (confirmandoRestauro !== modelo.id) {
      setConfirmandoRestauro(modelo.id);
      return;
    }
    setOcupado(true);
    setErro("");
    try {
      await restaurarBancoModelo(modelo.id);
      setAviso("Original restaurado. Os workspaces voltam à versão de fábrica no próximo uso.");
      setConfirmandoRestauro(null);
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível restaurar o original.");
    } finally {
      setOcupado(false);
    }
  }

  // Abrir no Studio: materializa a peca temporaria no workspace ativo e abre o
  // editor em aba nova. O salvar traz o resultado de volta pro banco.
  async function abrirStudioModelo(modelo: CartaoModelo) {
    if (!workspaceAtivo) {
      setErro("Ative um workspace no Estúdio antes de editar no Studio.");
      return;
    }
    setErro("");
    setOcupado(true);
    try {
      const resposta = await abrirStudioBancoModelo(modelo.id, workspaceAtivo);
      setEdicaoStudio({ cartao: modelo, workspaceId: workspaceAtivo, pasta: resposta.pasta });
      window.open(
        `/w/${encodeURIComponent(workspaceAtivo)}/studio/${encodeURIComponent(resposta.pasta)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir o modelo no Studio.");
    } finally {
      setOcupado(false);
    }
  }

  async function salvarEdicaoStudio() {
    if (!edicaoStudio) return;
    setOcupado(true);
    setErro("");
    try {
      const { cartao, workspaceId, pasta } = edicaoStudio;
      const resposta = await atualizarBancoModelo(cartao.id, {
        nome: cartao.nome,
        descricao: cartao.descricao,
        tipo: cartao.tipo,
        pedeImagem: cartao.pedeImagem,
        origemHtml: { modo: "peca", workspaceId, pasta },
      });
      setAviso(
        resposta.avisos.length > 0
          ? `Modelo atualizado. ${resposta.avisos.join(" ")}`
          : "Modelo atualizado com a edição do Studio.",
      );
      setEdicaoStudio(null);
      await recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a edição.");
    } finally {
      setOcupado(false);
    }
  }

  const dadosValidos = nome.trim().length > 0 && descricao.trim().length > 0;

  return (
    <div className="banco-visual">
      <div className="banco-visual-topo">
        <p className="gestao-secao-ajuda">
          Modelos compartilhados aparecem em todos os workspaces e são copiados somente quando usados.
        </p>
        {!formulario && (
          <Botao variante="primario" type="button" onClick={novoModelo}>
            Novo modelo
          </Botao>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}

      {formulario ? (
        <section className="banco-formulario">
          <div className="banco-passos" aria-label="Etapas do novo modelo">
            <span className={passo === 1 ? "ativo" : ""}>1. Identidade</span>
            <span className={passo === 2 ? "ativo" : ""}>2. Origem</span>
          </div>

          {passo === 1 && (
            <div className="banco-campos">
              <div className="banco-campos-dupla">
                <Campo
                  rotulo="Nome"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  placeholder="Ex: Grid editorial"
                  autoFocus
                />
                <Selecao
                  rotulo="Tipo"
                  value={tipo}
                  onChange={(evento) => setTipo(evento.target.value as TipoModeloBanco)}
                >
                  {Object.entries(ROTULOS_TIPO).map(([valor, rotulo]) => (
                    <option value={valor} key={valor}>{rotulo}</option>
                  ))}
                </Selecao>
              </div>
              <AreaTexto
                rotulo="Descrição"
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                rows={3}
                placeholder="Explique quando este modelo funciona melhor."
              />
              <Interruptor
                ativo={pedeImagem}
                aoMudar={setPedeImagem}
                rotulo="Pede imagem"
                descricao="Marque quando o modelo depende de uma foto principal."
              />
              <div className="banco-formulario-acoes">
                <Botao variante="sutil" type="button" onClick={limparFormulario}>Cancelar</Botao>
                {editando && (
                  <Botao
                    variante="neutro"
                    type="button"
                    ocupado={ocupado}
                    disabled={!dadosValidos}
                    onClick={() => void salvarComOrigem()}
                  >
                    Salvar metadados
                  </Botao>
                )}
                <Botao
                  variante="primario"
                  type="button"
                  disabled={!dadosValidos}
                  onClick={() => setPasso(2)}
                >
                  Escolher origem
                </Botao>
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="banco-campos">
              <div className="banco-origens">
                <button
                  className={origem === "colar" ? "ativo" : ""}
                  type="button"
                  onClick={() => setOrigem("colar")}
                >
                  <strong>Colar HTML pronto</strong>
                  <span>Use um modelo já construído e validado.</span>
                </button>
                <button
                  className={origem === "referencia" ? "ativo" : ""}
                  type="button"
                  onClick={() => setOrigem("referencia")}
                >
                  <strong>Copiar de uma referência</strong>
                  <span>A IA replica a linguagem visual para você refinar.</span>
                </button>
              </div>

              {origem === "colar" ? (
                <>
                  <AreaTexto
                    rotulo="HTML do modelo"
                    ajuda={editando ? "Deixe vazio para manter o HTML atual." : "Limite de 512 KB. Precisa conter ao menos um elemento .slide."}
                    value={html}
                    onChange={(evento) => setHtml(evento.target.value)}
                    rows={15}
                    className="banco-html"
                    spellCheck={false}
                    placeholder="<!doctype html>..."
                  />
                  <label className="banco-upload">
                    <span>Ou carregar arquivo .html</span>
                    <input
                      type="file"
                      accept=".html,text/html"
                      onChange={(evento) => void escolherHtml(evento.target.files?.[0])}
                    />
                  </label>
                </>
              ) : (
                <>
                  {!workspaceAtivo && (
                    <Aviso tipo="atencao">
                      Ative um workspace do Jesse para gerar e refinar o modelo.
                      {" "}
                      <button className="banco-link" type="button" onClick={irEstudio}>Ir para o Estúdio</button>
                    </Aviso>
                  )}
                  <label className="banco-upload banco-upload-referencia">
                    <span>Imagem de referência</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(evento) => void escolherImagem(evento.target.files?.[0])}
                    />
                    {imagemNome && <strong>{imagemNome}</strong>}
                  </label>
                  <AreaTexto
                    rotulo="Instruções opcionais"
                    value={instrucoes}
                    onChange={(evento) => setInstrucoes(evento.target.value)}
                    rows={4}
                    placeholder="Ex: Preserve o bloco numérico no canto."
                  />
                  {geracao && (
                    <div className="banco-geracao" aria-live="polite">
                      <div>
                        <strong>
                          {geracaoPronta
                            ? "Modelo pronto para revisar"
                            : geracaoTerminou
                              ? "A geração terminou sem um modelo válido"
                              : "Copiando a referência"}
                        </strong>
                        <span>
                          {sessaoGeracao?.status === "erro"
                            ? sessaoGeracao.erro || "A sessão encontrou um erro."
                            : geracaoPronta
                              ? `${pecaGerada?.paginas ?? 0} slides gerados.`
                              : "A sessão continua no workspace ativo."}
                        </span>
                      </div>
                      {geracaoPronta && (
                        <div className="banco-geracao-acoes">
                          <Botao variante="sutil" type="button" onClick={abrirStudio}>Abrir no Studio</Botao>
                          <Botao variante="primario" type="button" ocupado={ocupado} onClick={() => void salvarGerado()}>
                            Salvar no banco
                          </Botao>
                          <Botao variante="sutil" type="button" onClick={() => setGeracao(null)}>Descartar</Botao>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="banco-formulario-acoes">
                <Botao variante="sutil" type="button" onClick={() => setPasso(1)}>Voltar</Botao>
                {origem === "colar" ? (
                  <Botao variante="primario" type="button" ocupado={ocupado} onClick={() => void salvarHtml()}>
                    Salvar no banco
                  </Botao>
                ) : (
                  <Botao
                    variante="primario"
                    type="button"
                    ocupado={ocupado}
                    disabled={!workspaceAtivo || !imagem || Boolean(geracao && !geracaoTerminou)}
                    onClick={() => void copiarModelo()}
                  >
                    Copiar modelo
                  </Botao>
                )}
              </div>
            </div>
          )}
        </section>
      ) : carregando ? (
        <EstadoCarregando linhas={5} />
      ) : originais.length === 0 && proprios.length === 0 ? (
        <EstadoVazio
          titulo="O banco visual está vazio"
          mensagem="Adicione o primeiro modelo compartilhado para ele aparecer nos workspaces."
          acao={<Botao variante="primario" type="button" onClick={novoModelo}>Novo modelo</Botao>}
        />
      ) : (
        <>
          {edicaoStudio && (
            <div className="banco-geracao" aria-live="polite">
              <div>
                <strong>Editando {edicaoStudio.cartao.nome} no Studio</strong>
                <span>
                  Refine a peça na aba do Studio, salve lá, e traga o resultado de volta.
                </span>
              </div>
              <div className="banco-geracao-acoes">
                <Botao variante="primario" type="button" ocupado={ocupado} onClick={() => void salvarEdicaoStudio()}>
                  Salvar no banco
                </Botao>
                <Botao variante="sutil" type="button" onClick={() => setEdicaoStudio(null)}>Descartar</Botao>
              </div>
            </div>
          )}
          {(
            [
              {
                chave: "originais",
                titulo: "Originais do VKOS",
                cartoes: originais.map(cartaoDeOriginal),
                vazio: null,
              },
              {
                chave: "proprios",
                titulo: "Criados por você",
                cartoes: proprios.map(cartaoDeProprio),
                vazio: "Nenhum modelo próprio ainda. Crie o primeiro em Novo modelo.",
              },
            ] as const
          ).map((secao) => (
            <section className="banco-secao" key={secao.chave}>
              <h3 className="banco-secao-titulo">{secao.titulo}</h3>
              {secao.cartoes.length === 0 ? (
                secao.vazio && <p className="gestao-secao-ajuda">{secao.vazio}</p>
              ) : (
                <div className="banco-grade">
                  {secao.cartoes.map((modelo) => (
                    <article className="banco-card" key={modelo.id}>
                      <MiniModelo id={modelo.id} />
                      <div className="banco-card-corpo">
                        <div className="banco-card-titulo">
                          <strong>{modelo.nome}</strong>
                          <span>{ROTULOS_TIPO[modelo.tipo]}</span>
                          {modelo.atualizado && (
                            <span className="banco-badge">Atualizado</span>
                          )}
                        </div>
                        <p>{modelo.descricao}</p>
                        <small>{modelo.pedeImagem ? "Pede imagem" : "Não pede imagem"}</small>
                      </div>
                      <div className="banco-card-acoes">
                        <Botao variante="sutil" type="button" onClick={() => editar(modelo)}>Editar</Botao>
                        <Botao
                          variante="sutil"
                          type="button"
                          disabled={!workspaceAtivo || ocupado}
                          onClick={() => void abrirStudioModelo(modelo)}
                        >
                          Abrir no Studio
                        </Botao>
                        {modelo.original ? (
                          modelo.atualizado && (
                            <Botao
                              variante={confirmandoRestauro === modelo.id ? "perigo" : "sutil"}
                              type="button"
                              ocupado={ocupado && confirmandoRestauro === modelo.id}
                              onClick={() => void restaurar(modelo)}
                            >
                              {confirmandoRestauro === modelo.id
                                ? "Confirmar restauração"
                                : "Restaurar original"}
                            </Botao>
                          )
                        ) : (
                          <Botao
                            variante={confirmandoExclusao === modelo.id ? "perigo" : "sutil"}
                            type="button"
                            ocupado={ocupado && confirmandoExclusao === modelo.id}
                            onClick={() => void excluir(modelo)}
                          >
                            {confirmandoExclusao === modelo.id ? "Confirmar exclusão" : "Excluir"}
                          </Botao>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
