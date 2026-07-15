import { useMemo, useRef, useState } from "react";
import type { Coluna } from "../../api/crm";
import {
  criarRegra,
  atualizarRegra,
  excluirRegra,
  ensaiarRegra,
  type DadosRegra,
  type Regra,
  type ResultadoEnsaio,
} from "../../api/automacoes";
import {
  EVENTOS_GATILHO,
  VARIAVEIS_TEMPLATE,
  eventoPorId,
} from "./constantes";
import { IconeX, IconeCheck, IconeAlerta } from "../comum/Icones";

interface Props {
  colunas: Coluna[];
  conectadoGoogle: boolean;
  aoFechar: () => void;
  // Chamado quando a regra e salva de vez: o pai recarrega a lista e fecha.
  aoConcluir: () => void;
}

type Passo = 1 | 2 | 3;

// Assistente de criacao de regra em tres passos: gatilho, acao e revisao.
// Overlay sobre a tela, no padrao visual da casa (scrim escuro, sem blur sobre
// o canvas). O ensaio da revisao chama a rota real: por isso a regra e salva
// (rascunho) antes de ensaiar, e o mesmo id vale pro Salvar, sem duplicar.
export function AssistenteRegra({
  colunas,
  conectadoGoogle,
  aoFechar,
  aoConcluir,
}: Props) {
  const [passo, setPasso] = useState<Passo>(1);

  // Gatilho.
  const [eventoId, setEventoId] = useState<string>(EVENTOS_GATILHO[0]?.id ?? "");
  const [colunaPara, setColunaPara] = useState<string>("");

  // Acao.
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [duracaoMin, setDuracaoMin] = useState("60");
  const [ativa, setAtiva] = useState(true);

  // Campo de texto que recebe o chip clicado (o ultimo com foco).
  const [campoAtivo, setCampoAtivo] = useState<"titulo" | "descricao">("titulo");
  const refTitulo = useRef<HTMLInputElement>(null);
  const refDescricao = useRef<HTMLTextAreaElement>(null);

  // Rascunho salvo: guarda o id pra ensaiar e nao duplicar no Salvar.
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);

  // Ensaio.
  const [ensaiando, setEnsaiando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnsaio | null>(null);
  const [erroEnsaio, setErroEnsaio] = useState<string | null>(null);

  // Salvar.
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const evento = eventoPorId(eventoId);
  const precisaColuna = evento?.precisaColuna ?? false;

  const gatilhoValido = !precisaColuna || colunaPara !== "";
  const acaoValida =
    titulo.trim() !== "" && Number(duracaoMin) > 0;

  const dados = useMemo<DadosRegra>(() => {
    const filtro =
      precisaColuna && colunaPara ? { colunaPara } : undefined;
    const nomeAuto =
      titulo.trim() !== "" ? titulo.trim() : "Nova automação";
    return {
      nome: nomeAuto,
      ativa,
      gatilho: filtro
        ? { evento: eventoId, filtro }
        : { evento: eventoId },
      acao: {
        tipo: "calendar:criar-evento",
        parametros: {
          titulo,
          descricao,
          duracaoMin: String(Number(duracaoMin) || 60),
          agenda: "primary",
        },
      },
    };
  }, [precisaColuna, colunaPara, titulo, descricao, duracaoMin, ativa, eventoId]);

  // Insere {{chave}} na posicao do cursor do campo ativo.
  function inserirVariavel(chave: string) {
    const marca = `{{${chave}}}`;
    if (campoAtivo === "titulo") {
      const el = refTitulo.current;
      const ini = el?.selectionStart ?? titulo.length;
      const fim = el?.selectionEnd ?? titulo.length;
      const novo = titulo.slice(0, ini) + marca + titulo.slice(fim);
      setTitulo(novo);
      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          const pos = ini + marca.length;
          el.setSelectionRange(pos, pos);
        }
      });
    } else {
      const el = refDescricao.current;
      const ini = el?.selectionStart ?? descricao.length;
      const fim = el?.selectionEnd ?? descricao.length;
      const novo = descricao.slice(0, ini) + marca + descricao.slice(fim);
      setDescricao(novo);
      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          const pos = ini + marca.length;
          el.setSelectionRange(pos, pos);
        }
      });
    }
  }

  // Garante o rascunho salvo e devolve a regra. Cria na primeira vez, atualiza
  // nas seguintes (edicoes depois de ensaiar refletem no proximo ensaio).
  // O rascunho SEMPRE nasce desligado: o executor le as regras ativas do disco
  // a cada evento, e uma regra pela metade nao pode disparar. O valor do
  // switch "Ativa" so e aplicado no Salvar final.
  async function garantirRascunho(): Promise<Regra> {
    const rascunho = { ...dados, ativa: false };
    if (rascunhoId) {
      return atualizarRegra(rascunhoId, rascunho);
    }
    const criada = await criarRegra(rascunho);
    setRascunhoId(criada.id);
    return criada;
  }

  // Cancelar (X, scrim ou botao): se ja existe rascunho persistido e o Salvar
  // final nao aconteceu, apaga o rascunho pra nao deixar regra orfa na lista.
  // Melhor esforco: se a exclusao falhar, fecha mesmo assim (o rascunho esta
  // desligado, entao nunca dispara).
  function cancelar() {
    if (rascunhoId) {
      void excluirRegra(rascunhoId).catch(() => {});
    }
    aoFechar();
  }

  async function aoEnsaiar() {
    if (ensaiando) return;
    setEnsaiando(true);
    setErroEnsaio(null);
    setResultado(null);
    try {
      const regra = await garantirRascunho();
      const res = await ensaiarRegra(regra.id);
      setResultado(res);
    } catch (e) {
      setErroEnsaio(
        e instanceof Error ? e.message : "Não deu pra ensaiar agora."
      );
    } finally {
      setEnsaiando(false);
    }
  }

  async function aoSalvar() {
    if (salvando) return;
    setSalvando(true);
    setErroSalvar(null);
    try {
      // Grava a versao final com o ativa do switch (o rascunho vive desligado).
      if (rascunhoId) {
        await atualizarRegra(rascunhoId, dados);
      } else {
        await criarRegra(dados);
      }
      aoConcluir();
    } catch (e) {
      setErroSalvar(
        e instanceof Error ? e.message : "Não deu pra salvar a regra."
      );
      setSalvando(false);
    }
  }

  return (
    <div className="aut-overlay" onClick={cancelar}>
      <div
        className="aut-assistente"
        role="dialog"
        aria-modal="true"
        aria-label="Nova automação"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="aut-assistente-topo">
          <div className="aut-passos">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`aut-passo-ponto${passo === n ? " ativo" : ""}${
                  passo > n ? " feito" : ""
                }`}
              >
                {n}
              </span>
            ))}
          </div>
          <h2>
            {passo === 1
              ? "Quando acontecer"
              : passo === 2
              ? "O que fazer"
              : "Revisar e salvar"}
          </h2>
          <button
            className="botao botao-fantasma aut-fechar"
            onClick={cancelar}
            aria-label="Fechar"
          >
            <IconeX className="" />
          </button>
        </header>

        <div className="aut-assistente-corpo">
          {passo === 1 && (
            <div className="aut-campo-bloco">
              <label className="aut-rotulo">Evento que dispara a regra</label>
              <div className="aut-opcoes-evento">
                {EVENTOS_GATILHO.map((ev) => (
                  <button
                    key={ev.id}
                    className={`aut-opcao${eventoId === ev.id ? " ativa" : ""}`}
                    onClick={() => setEventoId(ev.id)}
                  >
                    <span className="aut-opcao-nome">{ev.nome}</span>
                    {eventoId === ev.id && <IconeCheck className="aut-opcao-check" />}
                  </button>
                ))}
              </div>

              {precisaColuna && (
                <div className="aut-campo-bloco">
                  <label className="aut-rotulo">Coluna de destino</label>
                  {colunas.length === 0 ? (
                    <p className="aut-ajuda">
                      Nenhuma coluna no CRM ainda. Crie colunas no CRM pra
                      escolher o destino.
                    </p>
                  ) : (
                    <select
                      className="aut-select"
                      value={colunaPara}
                      onChange={(e) => setColunaPara(e.target.value)}
                    >
                      <option value="">Escolha a coluna</option>
                      {colunas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="aut-ajuda">
                    A regra dispara quando um cartão entra nesta coluna.
                  </p>
                </div>
              )}
            </div>
          )}

          {passo === 2 && (
            <div className="aut-campo-bloco">
              <div className="aut-acao-selo">
                Criar um compromisso no Google Calendar
              </div>

              <div className="aut-campo-bloco">
                <label className="aut-rotulo">Título do compromisso</label>
                <input
                  ref={refTitulo}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  onFocus={() => setCampoAtivo("titulo")}
                  placeholder="Ex: Retorno para {{nome}}"
                  spellCheck={false}
                />
              </div>

              <div className="aut-campo-bloco">
                <label className="aut-rotulo">Descrição</label>
                <textarea
                  ref={refDescricao}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  onFocus={() => setCampoAtivo("descricao")}
                  placeholder="Ex: Falar com {{nome}} da {{empresa}}. Valor: {{valorEstimado}}"
                  rows={3}
                  spellCheck={false}
                />
              </div>

              <div className="aut-chips-bloco">
                <span className="aut-chips-rotulo">
                  Variáveis (clique pra inserir no campo focado)
                </span>
                <div className="aut-chips">
                  {VARIAVEIS_TEMPLATE.map((v) => (
                    <button
                      key={v.chave}
                      type="button"
                      className="aut-chip"
                      title={v.rotulo}
                      onClick={() => inserirVariavel(v.chave)}
                    >
                      {`{{${v.chave}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="aut-campo-bloco aut-duracao">
                <label className="aut-rotulo">Duração (minutos)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={duracaoMin}
                  onChange={(e) => setDuracaoMin(e.target.value)}
                  className="aut-input-num"
                />
              </div>
            </div>
          )}

          {passo === 3 && (
            <div className="aut-campo-bloco">
              <div className="aut-revisao">
                <div className="aut-revisao-linha">
                  <span className="aut-revisao-rot">Gatilho</span>
                  <span className="aut-revisao-val">
                    {precisaColuna && colunaPara
                      ? `Cartão entra em "${
                          colunas.find((c) => c.id === colunaPara)?.nome ??
                          colunaPara
                        }"`
                      : evento?.nome ?? eventoId}
                  </span>
                </div>
                <div className="aut-revisao-linha">
                  <span className="aut-revisao-rot">Título</span>
                  <span className="aut-revisao-val">{titulo || "-"}</span>
                </div>
                {descricao && (
                  <div className="aut-revisao-linha">
                    <span className="aut-revisao-rot">Descrição</span>
                    <span className="aut-revisao-val">{descricao}</span>
                  </div>
                )}
                <div className="aut-revisao-linha">
                  <span className="aut-revisao-rot">Duração</span>
                  <span className="aut-revisao-val">
                    {Number(duracaoMin) || 60} min
                  </span>
                </div>
                <div className="aut-revisao-linha">
                  <span className="aut-revisao-rot">Ativa ao salvar</span>
                  <label className="aut-switch" title={ativa ? "Sim" : "Não"}>
                    <input
                      type="checkbox"
                      checked={ativa}
                      onChange={(e) => setAtiva(e.target.checked)}
                    />
                    <span className="aut-switch-trilho">
                      <span className="aut-switch-bola" />
                    </span>
                  </label>
                </div>
              </div>

              {!conectadoGoogle && (
                <p className="aut-nota-ensaio">
                  <IconeAlerta className="aut-nota-icone" />
                  Sem o Google conectado a regra não cria eventos de verdade. O
                  ensaio abaixo mostra o que ela faria.
                </p>
              )}

              <button
                className="botao botao-neutro aut-btn-ensaiar"
                onClick={() => void aoEnsaiar()}
                disabled={ensaiando}
              >
                {ensaiando ? "Ensaiando..." : "Ensaiar"}
              </button>

              {erroEnsaio && <p className="aut-erro">{erroEnsaio}</p>}

              {resultado && (
                <div className="aut-ensaio-resultado">
                  {resultado.aviso ? (
                    <p className="aut-ensaio-aviso">
                      <IconeAlerta className="aut-nota-icone" />
                      {resultado.aviso}
                    </p>
                  ) : (
                    <>
                      <div className="aut-ensaio-cabecalho">
                        Prévia do compromisso
                      </div>
                      <div className="aut-ensaio-linha">
                        <span className="aut-ensaio-rot">Título</span>
                        <span className="aut-ensaio-val">{resultado.titulo}</span>
                      </div>
                      {resultado.descricao && (
                        <div className="aut-ensaio-linha">
                          <span className="aut-ensaio-rot">Descrição</span>
                          <span className="aut-ensaio-val">
                            {resultado.descricao}
                          </span>
                        </div>
                      )}
                      <div className="aut-ensaio-linha">
                        <span className="aut-ensaio-rot">Início</span>
                        <span className="aut-ensaio-val">
                          {fmtDataHora(resultado.inicioIso)}
                        </span>
                      </div>
                      <div className="aut-ensaio-linha">
                        <span className="aut-ensaio-rot">Fim</span>
                        <span className="aut-ensaio-val">
                          {fmtDataHora(resultado.fimIso)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {erroSalvar && <p className="aut-erro">{erroSalvar}</p>}
            </div>
          )}
        </div>

        <footer className="aut-assistente-rodape">
          {passo > 1 ? (
            <button
              className="botao botao-neutro"
              onClick={() => setPasso((p) => (p - 1) as Passo)}
            >
              Voltar
            </button>
          ) : (
            <button className="botao botao-fantasma" onClick={cancelar}>
              Cancelar
            </button>
          )}

          {passo < 3 ? (
            <button
              className="botao botao-principal"
              onClick={() => setPasso((p) => (p + 1) as Passo)}
              disabled={passo === 1 ? !gatilhoValido : !acaoValida}
            >
              Continuar
            </button>
          ) : (
            <button
              className="botao botao-principal"
              onClick={() => void aoSalvar()}
              disabled={salvando || !acaoValida}
            >
              {salvando ? "Salvando..." : "Salvar automação"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

// Formata um ISO em data e hora curtas no padrao pt-BR. Ausente ou invalido
// vira "-".
function fmtDataHora(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
