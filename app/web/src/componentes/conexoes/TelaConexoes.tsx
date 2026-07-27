import { useCallback, useEffect, useMemo, useState } from "react";
import "../../estilos/conexoes.css";
import { Botao } from "../comum/Botao";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import {
  atualizarConfig,
  obterAmbiente,
  type OpcaoModeloIA,
} from "../../api/cliente";
import type { Ambiente, DeteccaoMotorIA, ProvedorIA } from "../../tipos/dominio";
import {
  obterConexoes,
  salvarConexao,
  testarConexao,
  type CampoConexao,
  type EntradaConexao,
  type EstadoServidor,
} from "../../api/conexoes";
import {
  IconeAlerta,
  IconeCheck,
  IconeOlho,
  IconeOlhoRiscado,
  IconeRaio,
} from "../comum/Icones";

// Conexões que o Hub confirma na API oficial ao salvar. Hoje só a Apify, que
// alimenta a busca de leads do CRM.
const IDS_COM_TESTE = new Set(["apify"]);

// Mapa de estado por id de servidor.
type MapaServidores = Record<string, EstadoServidor>;

// Tela das conexoes: um card por servico. O usuario cola o token, liga o
// servidor e salva.
//
// A conexao e do CORE desde 2026-07-27, nao do workspace: a conta e do dono do
// Hub e a mesma em todo projeto. Por isso nada aqui depende do workspace aberto,
// e trocar de workspace nao recarrega nem remonta esta tela.
export function TelaConexoes() {
  const { ambiente: ambienteInicial } = usarEstado();
  const {
    ativo: provedorAtivo,
    provedores,
    modelos,
    modeloPadrao,
    carregando: carregandoProvedores,
    erro: erroProvedores,
    recarregar: recarregarProvedores,
  } = usarProvedoresIA();
  const [catalogo, setCatalogo] = useState<EntradaConexao[]>([]);
  const [servidores, setServidores] = useState<MapaServidores>({});
  const [ambiente, setAmbiente] = useState<Ambiente | null>(ambienteInicial);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await obterConexoes();
      setCatalogo(dados.catalogo);
      setServidores(dados.estado.servidores);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao deu pra carregar as conexoes.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Carrega uma vez. O estado e do CORE, entao nao ha troca de escopo pra
  // acompanhar.
  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    let vivo = true;
    obterAmbiente(true)
      .then((dados) => {
        if (vivo) setAmbiente(dados);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  // Salva um servidor e atualiza o mapa com o estado novo mascarado.
  const aoSalvar = useCallback(
    async (id: string, dados: { habilitado: boolean; config?: Record<string, string> }) => {
      const { servidor } = await salvarConexao(id, dados);
      setServidores((antes) => ({ ...antes, [id]: servidor }));
    },
    []
  );

  const ligadas = useMemo(
    () =>
      catalogo.filter((e) => e.disponivel && servidores[e.id]?.habilitado).length,
    [catalogo, servidores]
  );

  return (
    <section className="tela-fluxo">
      <header className="tela-fluxo-topo">
        <div className="conx-topo-titulo">
          <IconeRaio className="conx-topo-icone" />
          <div>
            <h1>Conexões</h1>
            <p className="subtitulo">
              {ligadas === 0
                ? "Nenhuma conexão ligada, valem para todos os workspaces"
                : ligadas === 1
                ? "1 conexão ligada, vale para todos os workspaces"
                : `${ligadas} conexões ligadas, valem para todos os workspaces`}
            </p>
          </div>
        </div>
      </header>

      <div className="conx-corpo">
        <BlocoMotorIA
          ativo={provedorAtivo}
          modelos={modelos}
          modeloPadrao={modeloPadrao}
          temClaude={provedores.some((p) => p.id === "claude")}
          temCodex={provedores.some((p) => p.id === "codex")}
          ambiente={ambiente}
          carregando={carregandoProvedores}
          erro={erroProvedores}
          aoAtualizar={async () => {
            await recarregarProvedores();
            try {
              setAmbiente(await obterAmbiente(true));
            } catch {
              // O catalogo segue utilizavel mesmo sem atualizar a deteccao.
            }
          }}
        />

        <p className="conx-aviso-local">
          <IconeAlerta className="conx-aviso-icone" />
          Os tokens ficam só nesta máquina, num arquivo local do Hub. Eles são
          seus, não do workspace, e nada sai daqui.
        </p>

        {provedorAtivo === "codex" && (
          <p className="conx-aviso-mcp">
            <IconeAlerta className="conx-aviso-icone" />
            As ferramentas MCP estão disponíveis só com Claude nesta versão. As
            conexões continuam configuráveis com Codex.
          </p>
        )}

        {erro && (
          <div className="conx-erro-topo">
            {erro}
            <Botao onClick={() => void carregar()}>Tentar de novo</Botao>
          </div>
        )}

        {carregando ? (
          <div className="conx-carregando">
            <span className="giro" />
          </div>
        ) : (
          <div className="conx-grade">
            {catalogo.map((entrada) => (
              <CartaoConexao
                key={entrada.id}
                entrada={entrada}
                estado={servidores[entrada.id]}
                aoSalvar={aoSalvar}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function textoStatus(deteccao?: DeteccaoMotorIA): string {
  if (!deteccao) return "Verificando...";
  if (!deteccao?.instalado) return "Não instalado";
  if (deteccao.logado === true) return "Instalado e conectado";
  if (deteccao.logado === false) return "Instalado, falta entrar";
  return "Instalado, login não verificado";
}

function BlocoMotorIA({
  ativo,
  modelos,
  modeloPadrao,
  temClaude,
  temCodex,
  ambiente,
  carregando,
  erro,
  aoAtualizar,
}: {
  ativo: ProvedorIA;
  modelos: OpcaoModeloIA[];
  modeloPadrao: string;
  temClaude: boolean;
  temCodex: boolean;
  ambiente: Ambiente | null;
  carregando: boolean;
  erro: string | null;
  aoAtualizar: () => Promise<void>;
}) {
  const [confirmar, setConfirmar] = useState<ProvedorIA | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  async function trocar(provedor: ProvedorIA) {
    if (provedor === ativo || salvando) return;
    if (confirmar !== provedor) {
      setConfirmar(provedor);
      return;
    }
    setSalvando(true);
    setErroLocal(null);
    try {
      await atualizarConfig({ provedorPadrao: provedor });
      setConfirmar(null);
      await aoAtualizar();
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : "Não foi possível trocar o motor.");
    } finally {
      setSalvando(false);
    }
  }

  async function escolherModelo(alias: string) {
    if (!alias || salvando) return;
    setSalvando(true);
    setErroLocal(null);
    try {
      await atualizarConfig(
        ativo === "codex"
          ? { modeloPadraoCodex: alias }
          : { modeloPadraoClaude: alias }
      );
      await aoAtualizar();
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : "Não foi possível salvar o modelo.");
    } finally {
      setSalvando(false);
    }
  }

  const opcoes: Array<{
    id: ProvedorIA;
    nome: string;
    disponivel: boolean;
    deteccao?: DeteccaoMotorIA;
  }> = [
    { id: "claude", nome: "Claude", disponivel: temClaude, deteccao: ambiente?.claude },
    { id: "codex", nome: "Codex", disponivel: temCodex, deteccao: ambiente?.codex },
  ];

  return (
    <section className="conx-motor" aria-labelledby="conx-motor-titulo">
      <header className="conx-motor-topo">
        <div>
          <span className="conx-motor-sobre">Motor ativo</span>
          <h2 id="conx-motor-titulo">Motor de IA</h2>
        </div>
        <div className="conx-motor-acoes-topo">
          <span className="conx-motor-ativo">
            {ativo === "codex" ? "Codex" : "Claude"}
          </span>
          <Botao
            variante="fantasma"
            tamanho="p"
            className="conx-motor-guia"
            onClick={() => {
              window.location.hash = "#/setup";
            }}
          >
            Abrir configuração guiada
          </Botao>
        </div>
      </header>

      <div className="conx-motor-grade">
        {opcoes.map((opcao) => {
          const selecionado = opcao.id === ativo;
          const armada = confirmar === opcao.id;
          return (
            <div className={`conx-motor-opcao${selecionado ? " ativa" : ""}`} key={opcao.id}>
              <div className="conx-motor-opcao-cabeca">
                <strong>{opcao.nome}</strong>
                <span className={`conx-motor-status${opcao.deteccao?.logado ? " ok" : ""}`}>
                  {textoStatus(opcao.deteccao)}
                </span>
              </div>
              {opcao.deteccao?.versao && (
                <span className="conx-motor-versao">{opcao.deteccao.versao}</span>
              )}
              <Botao
                variante={selecionado ? "neutro" : "fantasma"}
                tamanho="p"
                className="conx-motor-trocar"
                disabled={selecionado || !opcao.disponivel || salvando}
                onClick={() => void trocar(opcao.id)}
              >
                {selecionado
                  ? "Em uso"
                  : armada
                  ? `Confirmar ${opcao.nome}`
                  : `Usar ${opcao.nome}`}
              </Botao>
              {armada && (
                <p className="conx-motor-confirmacao">
                  {opcao.id === "codex"
                    ? "O custo passa a ser estimado por tokens e o MCP fica indisponível."
                    : "As novas sessões usam Claude e recuperam as conexões MCP."}
                  <Botao variante="fantasma" tamanho="p" onClick={() => setConfirmar(null)}>
                    Cancelar
                  </Botao>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <label className="conx-motor-modelo">
        <span>Modelo padrão de {ativo === "codex" ? "Codex" : "Claude"}</span>
        <select
          value={modeloPadrao}
          onChange={(e) => void escolherModelo(e.target.value)}
          disabled={carregando || salvando || modelos.length === 0}
        >
          {modelos.map((modelo) => (
            <option key={modelo.alias} value={modelo.alias}>
              {modelo.rotulo}, {modelo.observacaoCusto}
            </option>
          ))}
        </select>
      </label>

      {(erro || erroLocal) && <p className="conx-erro">{erroLocal ?? erro}</p>}
    </section>
  );
}

// Card de um servico. Servico indisponivel vira card apagado com selo "em breve".
function CartaoConexao({
  entrada,
  estado,
  aoSalvar,
}: {
  entrada: EntradaConexao;
  estado: EstadoServidor | undefined;
  aoSalvar: (
    id: string,
    dados: { habilitado: boolean; config?: Record<string, string> }
  ) => Promise<void>;
}) {
  const [habilitado, setHabilitado] = useState(estado?.habilitado ?? false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [revelar, setRevelar] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [validando, setValidando] = useState(false);
  const [testeOk, setTesteOk] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Sincroniza o toggle com o valor persistido quando ele muda no servidor (ex:
  // o fluxo Conectar liga a conexao no backend). So dispara quando o disco muda,
  // entao nao atropela o usuario mexendo no toggle antes de salvar.
  useEffect(() => {
    setHabilitado(estado?.habilitado ?? false);
  }, [estado?.habilitado]);

  // Placeholder mascarado do token salvo, quando existe.
  const mascarado = (campo: CampoConexao): string => estado?.config?.[campo.chave] ?? "";
  const temTokenSalvo = entrada.campos.some((c) => c.segredo && mascarado(c));

  const temTeste = IDS_COM_TESTE.has(entrada.id);

  if (!entrada.disponivel) {
    return (
      <article className="conx-cartao indisponivel">
        <header className="conx-cartao-topo">
          <h3>{entrada.nome}</h3>
          <span className="conx-selo-breve">em breve</span>
        </header>
        <p className="conx-descricao">{entrada.descricao}</p>
      </article>
    );
  }

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    setTesteOk(null);
    // Para cada campo: manda o que o usuario digitou. Se ficou vazio e ja havia
    // token salvo, devolve a mascara igual, que o backend le como "nao troca".
    const config: Record<string, string> = {};
    for (const campo of entrada.campos) {
      const digitado = valores[campo.chave] ?? "";
      config[campo.chave] = digitado !== "" ? digitado : mascarado(campo);
    }
    try {
      await aoSalvar(entrada.id, { habilitado, config });
      // Limpa os campos digitados: o placeholder ja mostra o novo mascarado.
      setValores({});
      setRevelar({});
      if (temTeste && habilitado) {
        setValidando(true);
        try {
          const teste = await testarConexao(entrada.id);
          setTesteOk(
            teste.conta
              ? `Conexão validada como ${teste.conta}`
              : "Conexão validada com sucesso"
          );
        } catch (e) {
          setErro(
            `O token foi salvo, mas a validação falhou: ${
              e instanceof Error ? e.message : "tente novamente"
            }.`
          );
          return;
        } finally {
          setValidando(false);
        }
      }
      setSalvo(true);
      window.setTimeout(() => setSalvo(false), 2200);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao deu pra salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <article className={`conx-cartao${habilitado ? " ligado" : ""}`}>
      <header className="conx-cartao-topo">
        <h3>{entrada.nome}</h3>
        <label className="conx-switch" title={habilitado ? "Ligado" : "Desligado"}>
          <input
            type="checkbox"
            checked={habilitado}
            onChange={(e) => {
              setHabilitado(e.target.checked);
              setTesteOk(null);
            }}
          />
          <span className="conx-switch-trilho">
            <span className="conx-switch-bola" />
          </span>
        </label>
      </header>

      <p className="conx-descricao">{entrada.descricao}</p>

      <div className="conx-campos">
        {entrada.campos.map((campo) => {
          const vendo = revelar[campo.chave] ?? false;
          return (
            <div className="conx-campo" key={campo.chave}>
              <label className="conx-rotulo">{campo.rotulo}</label>
              <div className="conx-entrada">
                <input
                  type={campo.segredo && !vendo ? "password" : "text"}
                  value={valores[campo.chave] ?? ""}
                  onChange={(e) => {
                    setValores((antes) => ({ ...antes, [campo.chave]: e.target.value }));
                    setTesteOk(null);
                  }}
                  placeholder={
                    mascarado(campo) || campo.dica || "Cole o token aqui"
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
                {campo.segredo && (
                  <Botao
                    variante="fantasma"
                    tamanho="p"
                    soIcone
                    className="conx-olho"
                    onClick={() =>
                      setRevelar((antes) => ({ ...antes, [campo.chave]: !vendo }))
                    }
                    aria-label={vendo ? "Ocultar" : "Revelar"}
                    title={vendo ? "Ocultar" : "Revelar"}
                  >
                    {vendo ? (
                      <IconeOlhoRiscado className="" />
                    ) : (
                      <IconeOlho className="" />
                    )}
                  </Botao>
                )}
              </div>
              {campo.dica && <p className="conx-dica">{campo.dica}</p>}
            </div>
          );
        })}
      </div>

      {erro && <p className="conx-erro">{erro}</p>}
      {testeOk && (
        <p className="conx-teste-ok">
          <IconeCheck className="" />
          {testeOk}
        </p>
      )}

      <div className="conx-cartao-rodape">
        <span className="conx-estado-token">
          {temTokenSalvo ? "token salvo nesta maquina" : "sem token ainda"}
        </span>
        <div className="conx-acoes">
          {salvo && (
            <span className="conx-salvo">
              <IconeCheck className="" />
              salvo
            </span>
          )}
          <Botao
            variante="principal"
            className="conx-salvar"
            onClick={() => void salvar()}
            disabled={salvando}
          >
            {validando
              ? "Validando..."
              : salvando
              ? "Salvando..."
              : temTeste && habilitado
              ? "Salvar e testar"
              : "Salvar"}
          </Botao>
        </div>
      </div>
    </article>
  );
}
