import { useCallback, useEffect, useMemo, useState } from "react";
import "../../estilos/automacoes.css";
import { usarEstado } from "../../estado/contexto";
import {
  obterAutomacoes,
  obterHistorico,
  atualizarRegra,
  excluirRegra,
  ensaiarRegra,
  type Regra,
  type LinhaHistorico,
  type ResultadoEnsaio,
} from "../../api/automacoes";
import { obterCrm, type Coluna } from "../../api/crm";
import { resumoGatilho, resumoAcao } from "./constantes";
import { AssistenteRegra } from "./AssistenteRegra";
import {
  IconeRaio,
  IconeAlerta,
  IconeMais,
  IconeLixeira,
  IconeCheck,
} from "../comum/Icones";

// Tela das automacoes: regras que reagem a eventos do hub e criam compromissos
// no Google Calendar. Lista de regras, assistente de criacao em tres passos e o
// historico das ultimas execucoes. Cada workspace tem as suas regras.
export function TelaAutomacoes() {
  const { workspaceAtivo } = usarEstado();
  const [regras, setRegras] = useState<Regra[]>([]);
  const [conectadoGoogle, setConectadoGoogle] = useState(false);
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [historico, setHistorico] = useState<LinhaHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // As colunas do CRM sao pro assistente (gatilho por nome) e pro resumo da
      // lista. Falha do CRM nao derruba a tela: seguimos com lista vazia.
      const [aut, hist] = await Promise.all([
        obterAutomacoes(),
        obterHistorico(50).catch(() => [] as LinhaHistorico[]),
      ]);
      setRegras(aut.regras);
      setConectadoGoogle(aut.conectadoGoogle);
      setHistorico(hist);
      try {
        const crm = await obterCrm();
        setColunas(crm.colunas);
      } catch {
        setColunas([]);
      }
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não deu pra carregar as automações."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar, workspaceAtivo]);

  const aoAlternar = useCallback(async (regra: Regra, ativa: boolean) => {
    // Otimista: reflete na hora, reverte se o backend recusar.
    setRegras((antes) =>
      antes.map((r) => (r.id === regra.id ? { ...r, ativa } : r))
    );
    try {
      const atualizada = await atualizarRegra(regra.id, { ativa });
      setRegras((antes) =>
        antes.map((r) => (r.id === regra.id ? atualizada : r))
      );
    } catch {
      setRegras((antes) =>
        antes.map((r) => (r.id === regra.id ? { ...r, ativa: !ativa } : r))
      );
    }
  }, []);

  const aoExcluir = useCallback(async (id: string) => {
    await excluirRegra(id);
    setRegras((antes) => antes.filter((r) => r.id !== id));
  }, []);

  const ativas = useMemo(() => regras.filter((r) => r.ativa).length, [regras]);

  return (
    <section className="tela-fluxo">
      <header className="tela-fluxo-topo">
        <div className="aut-topo-titulo">
          <IconeRaio className="aut-topo-icone" />
          <div>
            <h1>Automações</h1>
            <p className="subtitulo">
              {regras.length === 0
                ? "Nenhuma regra ainda"
                : `${regras.length} ${
                    regras.length === 1 ? "regra" : "regras"
                  }, ${ativas} ${ativas === 1 ? "ativa" : "ativas"}`}
            </p>
          </div>
        </div>
        <button
          className="botao botao-principal aut-btn-nova"
          onClick={() => setCriando(true)}
        >
          <IconeMais className="" />
          Nova automação
        </button>
      </header>

      <div className="aut-corpo">
        {!conectadoGoogle && !carregando && (
          <p className="aut-aviso-google">
            <IconeAlerta className="aut-aviso-icone" />
            <span>
              Conecte o Google Calendar pra as regras poderem criar eventos. As
              regras podem ser criadas e ensaiadas mesmo sem conexão.
            </span>
            <a className="aut-aviso-link" href="/conexoes">
              Ir para Conexões
            </a>
          </p>
        )}

        {erro && (
          <div className="aut-erro-topo">
            {erro}
            <button
              className="botao botao-neutro"
              onClick={() => void carregar()}
            >
              Tentar de novo
            </button>
          </div>
        )}

        {carregando ? (
          <div className="aut-carregando">
            <span className="giro" />
          </div>
        ) : regras.length === 0 ? (
          <EstadoVazio aoCriar={() => setCriando(true)} />
        ) : (
          <div className="aut-lista">
            {regras.map((regra) => (
              <RegraLinha
                key={regra.id}
                regra={regra}
                colunas={colunas}
                aoAlternar={aoAlternar}
                aoExcluir={aoExcluir}
              />
            ))}
          </div>
        )}

        {!carregando && historico.length > 0 && (
          <div className="aut-historico">
            <h2 className="aut-historico-titulo">Últimas execuções</h2>
            <ul className="aut-historico-lista">
              {historico.map((linha, i) => (
                <li
                  key={`${linha.em}-${i}`}
                  className={`aut-hist-linha aut-status-${linha.status}`}
                >
                  <span className="aut-hist-ponto" />
                  <span className="aut-hist-regra">{linha.regraNome}</span>
                  <span className="aut-hist-detalhe">{linha.detalhe}</span>
                  <span className="aut-hist-hora">{fmtHora(linha.em)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {criando && (
        <AssistenteRegra
          colunas={colunas}
          conectadoGoogle={conectadoGoogle}
          aoFechar={() => setCriando(false)}
          aoConcluir={() => {
            setCriando(false);
            void carregar();
          }}
        />
      )}
    </section>
  );
}

// Uma linha de regra: nome, resumo humano, switch, ensaiar e excluir. O ensaio
// aparece embaixo da propria linha, sem sair da lista.
function RegraLinha({
  regra,
  colunas,
  aoAlternar,
  aoExcluir,
}: {
  regra: Regra;
  colunas: Coluna[];
  aoAlternar: (regra: Regra, ativa: boolean) => Promise<void>;
  aoExcluir: (id: string) => Promise<void>;
}) {
  const [armado, setArmado] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [ensaiando, setEnsaiando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnsaio | null>(null);
  const [erroEnsaio, setErroEnsaio] = useState<string | null>(null);

  // Armou e nao confirmou: desarma sozinho depois de 4 segundos.
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);

  const clicarExcluir = async () => {
    if (apagando) return;
    if (!armado) {
      setArmado(true);
      return;
    }
    setApagando(true);
    try {
      await aoExcluir(regra.id);
    } catch {
      setApagando(false);
      setArmado(false);
    }
  };

  const clicarEnsaiar = async () => {
    if (ensaiando) return;
    setEnsaiando(true);
    setErroEnsaio(null);
    // Alterna: clicar de novo com resultado aberto fecha a previa.
    if (resultado) {
      setResultado(null);
      setEnsaiando(false);
      return;
    }
    try {
      const res = await ensaiarRegra(regra.id);
      setResultado(res);
    } catch (e) {
      setErroEnsaio(
        e instanceof Error ? e.message : "Não deu pra ensaiar agora."
      );
    } finally {
      setEnsaiando(false);
    }
  };

  return (
    <article className={`aut-regra${regra.ativa ? " ativa" : ""}`}>
      <div className="aut-regra-topo">
        <label
          className="aut-switch"
          title={regra.ativa ? "Ligada" : "Desligada"}
        >
          <input
            type="checkbox"
            checked={regra.ativa}
            onChange={(e) => void aoAlternar(regra, e.target.checked)}
          />
          <span className="aut-switch-trilho">
            <span className="aut-switch-bola" />
          </span>
        </label>

        <div className="aut-regra-info">
          <h3 className="aut-regra-nome">{regra.nome}</h3>
          <p className="aut-regra-resumo">
            <span className="aut-regra-quando">
              {resumoGatilho(regra, colunas)}
            </span>
            <span className="aut-regra-seta">então</span>
            <span className="aut-regra-entao">{resumoAcao(regra)}</span>
          </p>
        </div>

        <div className="aut-regra-acoes">
          <button
            className="botao botao-neutro aut-regra-ensaiar"
            onClick={() => void clicarEnsaiar()}
            disabled={ensaiando}
          >
            {ensaiando ? "..." : resultado ? "Fechar" : "Ensaiar"}
          </button>
          <button
            className={`aut-regra-excluir${armado ? " armado" : ""}${
              apagando ? " apagando" : ""
            }`}
            onClick={() => void clicarExcluir()}
            title={
              armado ? "Clique de novo pra excluir" : "Excluir esta regra"
            }
          >
            <IconeLixeira className="" />
            {(armado || apagando) && (
              <span className="aut-aviso-confirmar">
                {apagando ? "Excluindo..." : "Confirmar?"}
              </span>
            )}
          </button>
        </div>
      </div>

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
              <div className="aut-ensaio-linha">
                <span className="aut-ensaio-rot">Título</span>
                <span className="aut-ensaio-val">{resultado.titulo}</span>
              </div>
              {resultado.descricao && (
                <div className="aut-ensaio-linha">
                  <span className="aut-ensaio-rot">Descrição</span>
                  <span className="aut-ensaio-val">{resultado.descricao}</span>
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
    </article>
  );
}

// Estado vazio: explica o conceito com o exemplo do CRM e convida a criar.
function EstadoVazio({ aoCriar }: { aoCriar: () => void }) {
  return (
    <div className="aut-vazio">
      <div className="aut-vazio-selo">
        <IconeRaio className="" />
      </div>
      <h2>Deixe o hub trabalhar por você</h2>
      <p>
        Uma automação escuta um evento do seu negócio e reage sozinha. Exemplo:
        quando um cartão entra na coluna "Fechado" do CRM, o hub cria o
        compromisso na sua agenda com a data do próximo contato.
      </p>
      <div className="aut-vazio-exemplo">
        <span className="aut-vazio-quando">Quando um cartão entra em "Fechado"</span>
        <IconeCheck className="aut-vazio-check" />
        <span className="aut-vazio-entao">Criar o compromisso na agenda</span>
      </div>
      <button className="botao botao-principal" onClick={aoCriar}>
        <IconeMais className="" />
        Criar a primeira automação
      </button>
    </div>
  );
}

// Data e hora curtas no padrao pt-BR. ISO invalido ou ausente vira "-".
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

// Hora curta pro historico (dia/mes e hora:min).
function fmtHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
