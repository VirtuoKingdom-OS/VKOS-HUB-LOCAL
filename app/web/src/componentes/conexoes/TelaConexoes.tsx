import { useCallback, useEffect, useMemo, useState } from "react";
import "./conexoes.css";
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
} from "../comum/Icones";
import { CAMINHO_SETUP, irParaCaminho } from "../layout/rotas";

// Conexões que o Hub confirma na API oficial ao salvar. Hoje só a Apify, que
// alimenta a busca de leads do CRM.
const IDS_COM_TESTE = new Set(["apify", "supabase"]);

// Mapa de estado por id de servidor.
type MapaServidores = Record<string, EstadoServidor>;

// Tela das conexoes: o motor de IA em cima e uma secao por servico externo. O
// usuario cola o token, liga o servidor e salva.
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
      setErro(e instanceof Error ? e.message : "Não deu para carregar as conexões.");
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
    <section className="tela tela-conexoes">
      <header className="tela-topo">
        <div className="tela-topo-texto">
          <h1>Conexões</h1>
          <p>
            {ligadas === 0
              ? "Nenhuma conexão ligada. Elas valem para todos os workspaces."
              : ligadas === 1
              ? "1 conexão ligada. Ela vale para todos os workspaces."
              : `${ligadas} conexões ligadas. Elas valem para todos os workspaces.`}
          </p>
        </div>
        <div className="tela-topo-acoes">
          <Botao
            variante="neutro"
            onClick={() => {
              irParaCaminho(CAMINHO_SETUP);
            }}
          >
            Configuração guiada
          </Botao>
        </div>
      </header>

      <div className="tela-corpo">
        <div className="tela-corpo-estreito">
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

          <section className="secao">
            <div className="secao-topo">
              <h2>Serviços</h2>
              <p>Os tokens ficam só nesta máquina, num arquivo local do Hub.</p>
            </div>

            {erro && (
              <div className="faixa faixa-alerta conx-faixa" role="alert">
                <IconeAlerta className="" />
                <div className="faixa-texto">{erro}</div>
                <div className="faixa-acoes">
                  <Botao tamanho="p" onClick={() => void carregar()}>
                    Tentar de novo
                  </Botao>
                </div>
              </div>
            )}

            {carregando ? (
              <div className="conx-carregando" aria-hidden="true">
                <div className="esqueleto esqueleto-linha" />
                <div className="esqueleto esqueleto-linha" />
                <div className="esqueleto esqueleto-linha" />
              </div>
            ) : (
              catalogo.map((entrada) => (
                <ServicoConexao
                  key={entrada.id}
                  entrada={entrada}
                  estado={servidores[entrada.id]}
                  aoSalvar={aoSalvar}
                />
              ))
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function textoStatus(deteccao?: DeteccaoMotorIA): string {
  if (!deteccao) return "Verificando";
  if (!deteccao?.instalado) return "Não instalado";
  if (deteccao.logado === true) return "Instalado e conectado";
  if (deteccao.logado === false) return "Instalado, falta entrar";
  return "Instalado, login não verificado";
}

// O selo do motor só fica vivo quando ele está pronto de verdade: instalado e
// com a conta conectada. Cor que fala sempre deixa de significar.
function classeStatus(deteccao?: DeteccaoMotorIA): string {
  if (!deteccao || !deteccao.instalado) return "selo";
  return deteccao.logado === true ? "selo selo-vivo" : "selo selo-aviso";
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
  const [salvando, setSalvando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  async function trocar(provedor: ProvedorIA) {
    if (provedor === ativo || salvando) return;
    setSalvando(true);
    setErroLocal(null);
    try {
      await atualizarConfig({ provedorPadrao: provedor });
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
    <section className="secao">
      <div className="secao-topo">
        <h2>Motor de IA</h2>
        <p>Vale para as sessões novas de todos os workspaces.</p>
      </div>

      <fieldset className="opcoes conx-motores">
        <legend className="so-leitor">Motor de IA em uso</legend>
        {opcoes.map((opcao) => (
          <label className="opcao" key={opcao.id}>
            <input
              type="radio"
              name="conx-motor"
              checked={opcao.id === ativo}
              disabled={!opcao.disponivel || salvando}
              onChange={() => void trocar(opcao.id)}
            />
            <span className="opcao-titulo">{opcao.nome}</span>
            <span className="opcao-descricao">
              {opcao.deteccao?.versao ?? "Versão desconhecida"}
            </span>
            <span className={classeStatus(opcao.deteccao)}>
              {opcao.deteccao?.logado === true && <span className="ponto-vivo" />}
              {textoStatus(opcao.deteccao)}
            </span>
          </label>
        ))}
      </fieldset>

      {ativo === "codex" && (
        <div className="faixa faixa-aviso conx-faixa" role="status">
          <IconeAlerta className="" />
          <div className="faixa-texto">
            As ferramentas MCP funcionam só com Claude nesta versão. Os serviços
            abaixo continuam configuráveis.
          </div>
        </div>
      )}

      <div className="grupo-campo conx-modelo">
        <label className="rotulo" htmlFor="conx-modelo">
          Modelo padrão de {ativo === "codex" ? "Codex" : "Claude"}
        </label>
        <select
          className="campo"
          id="conx-modelo"
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
        <span className="dica">A troca vale da próxima sessão em diante.</span>
      </div>

      {(erro || erroLocal) && (
        <div className="faixa faixa-alerta conx-faixa" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erroLocal ?? erro}</div>
        </div>
      )}
    </section>
  );
}

// Uma seção por serviço externo. Serviço que ainda não existe fica com o selo
// "Em breve" e sem formulário.
function ServicoConexao({
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

  // Sincroniza o interruptor com o valor persistido quando ele muda no servidor
  // (ex: o fluxo Conectar liga a conexao no backend). So dispara quando o disco
  // muda, entao nao atropela o usuario mexendo no controle antes de salvar.
  useEffect(() => {
    setHabilitado(estado?.habilitado ?? false);
  }, [estado?.habilitado]);

  // Placeholder mascarado do token salvo, quando existe.
  const mascarado = (campo: CampoConexao): string => estado?.config?.[campo.chave] ?? "";
  const temTokenSalvo = entrada.campos.some((c) => c.segredo && mascarado(c));
  const temTeste = IDS_COM_TESTE.has(entrada.id);

  if (!entrada.disponivel) {
    return (
      <article className="conx-servico">
        <div className="conx-servico-topo">
          <h3>{entrada.nome}</h3>
          <span className="selo">Em breve</span>
        </div>
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
      setErro(e instanceof Error ? e.message : "Não deu para salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const idInterruptor = `conx-ligar-${entrada.id}`;

  return (
    <article className="conx-servico">
      <div className="conx-servico-topo">
        <h3>{entrada.nome}</h3>
        <span className={habilitado ? "selo selo-vivo" : "selo"}>
          {habilitado && <span className="ponto-vivo" />}
          {habilitado ? "Ligado" : "Desligado"}
        </span>
        {/* O selo ao lado já diz o estado por escrito, então o rótulo do
            interruptor vive só para o leitor de tela. */}
        <label className="conx-ligar" htmlFor={idInterruptor}>
          <span className="so-leitor">Ligar {entrada.nome}</span>
          <input
            className="interruptor"
            type="checkbox"
            id={idInterruptor}
            checked={habilitado}
            onChange={(e) => {
              setHabilitado(e.target.checked);
              setTesteOk(null);
            }}
          />
        </label>
      </div>

      <p className="conx-descricao">{entrada.descricao}</p>

      {entrada.campos.map((campo) => {
        const vendo = revelar[campo.chave] ?? false;
        const id = `conx-${entrada.id}-${campo.chave}`;
        return (
          <div className="grupo-campo" key={campo.chave}>
            <label className="rotulo" htmlFor={id}>
              {campo.rotulo}
            </label>
            <div className="conx-entrada">
              <input
                className="campo conx-campo-token"
                id={id}
                type={campo.segredo && !vendo ? "password" : "text"}
                value={valores[campo.chave] ?? ""}
                onChange={(e) => {
                  setValores((antes) => ({ ...antes, [campo.chave]: e.target.value }));
                  setTesteOk(null);
                }}
                // O placeholder NÃO repete a dica: ela já aparece logo abaixo
                // do campo, e o texto duplicado fazia o bloco parecer ter dois
                // avisos onde há um.
                placeholder={mascarado(campo) || "Cole o token aqui"}
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
                  aria-label={vendo ? "Ocultar o token" : "Revelar o token"}
                  title={vendo ? "Ocultar o token" : "Revelar o token"}
                >
                  {vendo ? <IconeOlhoRiscado className="" /> : <IconeOlho className="" />}
                </Botao>
              )}
            </div>
            {campo.dica && <span className="dica">{campo.dica}</span>}
          </div>
        );
      })}

      {erro && (
        <div className="faixa faixa-alerta conx-faixa" role="alert">
          <IconeAlerta className="" />
          <div className="faixa-texto">{erro}</div>
        </div>
      )}
      {(testeOk || salvo) && !erro && (
        <div className="faixa faixa-boa conx-faixa" role="status">
          <IconeCheck className="" />
          <div className="faixa-texto">{testeOk ?? "Salvo nesta máquina"}</div>
        </div>
      )}

      <div className="acoes-formulario">
        <span className="dica acoes-formulario-espaco">
          {temTokenSalvo ? "Token salvo nesta máquina" : "Sem token ainda"}
        </span>
        <Botao
          variante="neutro"
          onClick={() => void salvar()}
          disabled={salvando || validando}
          aria-busy={salvando || validando}
        >
          {validando
            ? "Validando"
            : salvando
            ? "Salvando"
            : temTeste && habilitado
            ? "Salvar e testar"
            : "Salvar"}
        </Botao>
      </div>
    </article>
  );
}
