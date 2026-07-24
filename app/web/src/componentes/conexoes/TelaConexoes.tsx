import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../estilos/conexoes.css";
import { usarEstado } from "../../estado/contexto";
import { usarProvedoresIA } from "../../estado/provedores";
import {
  atualizarConfig,
  obterAmbiente,
  type OpcaoModeloIA,
} from "../../api/cliente";
import type { Ambiente, DeteccaoMotorIA, ProvedorIA } from "../../tipos/dominio";
import {
  conectarGoogleCalendar,
  desconectarGoogleCalendar,
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

// Id da conexao do Google Calendar no catalogo (o card ganha o fluxo Conectar).
const ID_GOOGLE_CALENDAR = "googlecalendar";
const IDS_CONEXAO_GUIADA = new Set(["github", "netlify"]);

interface GuiaToken {
  linkCriacao: string;
  linkDocumentacao: string;
  passos: Array<{ titulo: string; texto: string; observacao?: string }>;
}

const GUIAS_TOKEN: Record<string, GuiaToken> = {
  github: {
    linkCriacao:
      "https://github.com/settings/personal-access-tokens/new?name=VKOS%20Hub&description=Publicacao%20de%20sites%20pelo%20VKOS%20Hub&expires_in=90&administration=write&contents=write",
    linkDocumentacao:
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
    passos: [
      {
        titulo: "Abra o gerador seguro",
        texto:
          "Entre na sua conta do GitHub e abra o formulário pelo botão abaixo. O VKOS já preenche nome, validade e permissões compatíveis.",
      },
      {
        titulo: "Escolha quem será o dono",
        texto:
          "Em Resource owner, escolha a conta que deve receber os repositórios. Em Repository access, marque All repositories para incluir também os próximos sites criados.",
        observacao:
          "Se escolher uma organização, ela pode exigir aprovação de um administrador antes de o token funcionar.",
      },
      {
        titulo: "Confira as permissões",
        texto:
          "Em Repository permissions, confirme Administration: Read and write e Contents: Read and write. Metadata permanece somente leitura automaticamente.",
      },
      {
        titulo: "Gere e copie o token",
        texto:
          "Clique em Generate token e copie o valor completo. Volte ao VKOS sem fechar esta trilha, cole no campo abaixo, ative a conexão e salve.",
        observacao: "O GitHub mostra o valor completo apenas nesse momento.",
      },
    ],
  },
  netlify: {
    linkCriacao: "https://app.netlify.com/user/applications#personal-access-tokens",
    linkDocumentacao:
      "https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/#authentication",
    passos: [
      {
        titulo: "Abra seus tokens pessoais",
        texto:
          "Entre na Netlify e abra Applications, Personal access tokens pelo botão abaixo. Depois escolha New access token.",
      },
      {
        titulo: "Identifique e proteja o token",
        texto:
          "Use o nome VKOS Hub e escolha uma data de expiração. Se sua equipe usa SAML SSO, marque a autorização de acesso à equipe.",
      },
      {
        titulo: "Gere e copie uma única vez",
        texto:
          "Clique em Generate token e copie o valor completo antes de sair da página. A Netlify não volta a mostrar esse valor.",
      },
      {
        titulo: "Cole e valide no VKOS",
        texto:
          "Volte ao VKOS, cole o token no campo abaixo, ative a conexão e clique em Salvar. O Hub fará um teste real na API da Netlify.",
        observacao:
          "O time principal é detectado automaticamente. Use o campo opcional de time somente se quiser publicar em outra equipe. Se redefinir a senha da Netlify, será necessário gerar outro token.",
      },
    ],
  },
};

// Mapa de estado por id de servidor.
type MapaServidores = Record<string, EstadoServidor>;

// Tela das conexoes MCP: um card por servico. O usuario cola o token, liga o
// servidor e salva. Os tokens ficam so nesta maquina, no arquivo local do cliente.
export function TelaConexoes() {
  const { workspaceAtivo, ambiente: ambienteInicial } = usarEstado();
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

  // Recarrega no boot e a cada troca de cliente (cada workspace tem o seu estado).
  useEffect(() => {
    void carregar();
  }, [carregar, workspaceAtivo]);

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
                ? "Nenhuma conexao ligada"
                : ligadas === 1
                ? "1 conexao ligada"
                : `${ligadas} conexoes ligadas`}
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
          Os tokens ficam so nesta maquina, no arquivo local do cliente. Nada sai
          daqui.
        </p>

        {provedorAtivo === "codex" && (
          <p className="conx-aviso-mcp">
            <IconeAlerta className="conx-aviso-icone" />
            As ferramentas MCP estão disponíveis só com Claude nesta versão. As
            conexões continuam configuráveis com Codex e a publicação direta por
            GitHub e Netlify funciona normalmente.
          </p>
        )}

        {erro && (
          <div className="conx-erro-topo">
            {erro}
            <button className="botao botao-neutro" onClick={() => void carregar()}>
              Tentar de novo
            </button>
          </div>
        )}

        {carregando ? (
          <div className="conx-carregando">
            <span className="giro" />
          </div>
        ) : (
          <div className="conx-grade" key={workspaceAtivo ?? "sem-cliente"}>
            {catalogo.map((entrada) => (
              <CartaoConexao
                key={entrada.id}
                entrada={entrada}
                estado={servidores[entrada.id]}
                aoSalvar={aoSalvar}
                recarregar={carregar}
                mcpBloqueado={provedorAtivo === "codex"}
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
              <button
                type="button"
                className={`botao ${selecionado ? "botao-neutro" : "botao-fantasma"} conx-motor-trocar`}
                disabled={selecionado || !opcao.disponivel || salvando}
                onClick={() => void trocar(opcao.id)}
              >
                {selecionado
                  ? "Em uso"
                  : armada
                  ? `Confirmar ${opcao.nome}`
                  : `Usar ${opcao.nome}`}
              </button>
              {armada && (
                <p className="conx-motor-confirmacao">
                  {opcao.id === "codex"
                    ? "O custo passa a ser estimado por tokens e o MCP fica indisponível."
                    : "As novas sessões usam Claude e recuperam as conexões MCP."}
                  <button type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
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
  recarregar,
  mcpBloqueado,
}: {
  entrada: EntradaConexao;
  estado: EstadoServidor | undefined;
  aoSalvar: (
    id: string,
    dados: { habilitado: boolean; config?: Record<string, string> }
  ) => Promise<void>;
  recarregar: () => Promise<void>;
  mcpBloqueado: boolean;
}) {
  const [habilitado, setHabilitado] = useState(estado?.habilitado ?? false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [revelar, setRevelar] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [guiaAberta, setGuiaAberta] = useState(false);
  const [validando, setValidando] = useState(false);
  const [testeOk, setTesteOk] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  // Sincroniza o toggle com o valor persistido quando ele muda no servidor (ex:
  // o fluxo Conectar liga a conexao no backend). So dispara quando o disco muda,
  // entao nao atropela o usuario mexendo no toggle antes de salvar.
  useEffect(() => {
    setHabilitado(estado?.habilitado ?? false);
  }, [estado?.habilitado]);

  // Placeholder mascarado do token salvo, quando existe.
  const mascarado = (campo: CampoConexao): string => estado?.config?.[campo.chave] ?? "";
  const temTokenSalvo = entrada.campos.some((c) => c.segredo && mascarado(c));

  // So o Google Calendar tem o fluxo Conectar. Credenciais salvas = Client ID e
  // Client Secret ja no disco (o backend le do conexoes.json pra abrir o OAuth).
  const ehGoogle = entrada.id === ID_GOOGLE_CALENDAR;
  const temGuia = IDS_CONEXAO_GUIADA.has(entrada.id);
  const credenciaisSalvas =
    (estado?.config?.clientId ?? "").trim() !== "" &&
    (estado?.config?.clientSecret ?? "").trim() !== "";

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
      if (temGuia && habilitado) {
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

      {temGuia && (
        <>
          <button
            type="button"
            className="conx-guia-abrir"
            aria-expanded={guiaAberta}
            onClick={() => setGuiaAberta((aberta) => !aberta)}
          >
            {guiaAberta ? "Fechar conexão guiada" : "Iniciar conexão guiada"}
          </button>
          {guiaAberta && (
            <TrilhaConexaoToken
              servico={entrada.id}
              aoIrAoToken={() => {
                tokenRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                tokenRef.current?.focus({ preventScroll: true });
              }}
            />
          )}
        </>
      )}

      {mcpBloqueado && temGuia && (
        <p className="conx-dica">
          Com Codex, esta credencial habilita a publicação direta. O MCP permanece
          disponível apenas quando o motor ativo for Claude.
        </p>
      )}

      <div className="conx-campos">
        {entrada.campos.map((campo) => {
          const vendo = revelar[campo.chave] ?? false;
          return (
            <div className="conx-campo" key={campo.chave}>
              <label className="conx-rotulo">{campo.rotulo}</label>
              <div className="conx-entrada">
                <input
                  ref={campo.chave === "token" ? tokenRef : undefined}
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
                  <button
                    type="button"
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
                  </button>
                )}
              </div>
              {campo.dica && <p className="conx-dica">{campo.dica}</p>}
            </div>
          );
        })}
      </div>

      {ehGoogle && (
        <BlocoConexaoGoogle
          conectado={estado?.conectado === true}
          contaEmail={estado?.contaEmail}
          credenciaisSalvas={credenciaisSalvas}
          recarregar={recarregar}
          aoDesconectado={() => {
            // Backend limpou clientId/clientSecret/refreshToken/contaEmail. Aqui
            // zera o que o usuario tinha digitado pra o card voltar ao inicio.
            setValores({});
            setRevelar({});
            setSalvo(false);
            setErro(null);
          }}
        />
      )}

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
          <button
            className="botao botao-principal conx-salvar"
            onClick={() => void salvar()}
            disabled={salvando}
          >
            {validando
              ? "Validando..."
              : salvando
              ? "Salvando..."
              : temGuia && habilitado
              ? "Salvar e testar"
              : "Salvar"}
          </button>
        </div>
      </div>
    </article>
  );
}

function TrilhaConexaoToken({
  servico,
  aoIrAoToken,
}: {
  servico: string;
  aoIrAoToken: () => void;
}) {
  const [passo, setPasso] = useState(0);
  const guia = GUIAS_TOKEN[servico];
  if (!guia) return null;

  const atual = guia.passos[passo];
  const ultimo = passo === guia.passos.length - 1;
  return (
    <section className="conx-guia" aria-label="Conexão guiada">
      <header className="conx-guia-topo">
        <div>
          <span>Passo {passo + 1} de {guia.passos.length}</span>
          <strong>{atual.titulo}</strong>
        </div>
        <a href={guia.linkDocumentacao} target="_blank" rel="noreferrer">
          Documentação oficial
        </a>
      </header>
      <div className="conx-guia-progresso" aria-hidden="true">
        <span style={{ width: `${((passo + 1) / guia.passos.length) * 100}%` }} />
      </div>
      <p>{atual.texto}</p>
      {atual.observacao && <p className="conx-guia-nota">{atual.observacao}</p>}
      <div className="conx-guia-acoes">
        {passo > 0 && (
          <button type="button" className="botao botao-neutro" onClick={() => setPasso((p) => p - 1)}>
            Voltar
          </button>
        )}
        {passo === 0 && (
          <a
            className="botao botao-neutro conx-guia-externo"
            href={guia.linkCriacao}
            target="_blank"
            rel="noreferrer"
          >
            Abrir {servico === "github" ? "GitHub" : "Netlify"}
          </a>
        )}
        <button
          type="button"
          className="botao botao-principal"
          onClick={() => {
            if (ultimo) aoIrAoToken();
            else setPasso((p) => p + 1);
          }}
        >
          {ultimo ? "Ir para o campo do token" : "Concluí este passo"}
        </button>
      </div>
    </section>
  );
}

// Bloco de conexao OAuth do Google Calendar. Sem refresh token, mostra o botao
// Conectar (desabilitado com dica enquanto as credenciais nao estao salvas).
// Conectado, mostra a conta e o Desconectar com confirmacao em dois cliques.
function BlocoConexaoGoogle({
  conectado,
  contaEmail,
  credenciaisSalvas,
  recarregar,
  aoDesconectado,
}: {
  conectado: boolean;
  contaEmail?: string;
  credenciaisSalvas: boolean;
  recarregar: () => Promise<void>;
  aoDesconectado?: () => void;
}) {
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [armado, setArmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Confirmacao armada desarma sozinha em 4s, no padrao do app (nunca por sair
  // com o mouse: sair nao cancela a intencao).
  useEffect(() => {
    if (!armado) return;
    const t = window.setTimeout(() => setArmado(false), 4000);
    return () => window.clearTimeout(t);
  }, [armado]);

  async function conectar() {
    if (conectando) return;
    setConectando(true);
    setErro(null);
    try {
      // A chamada segura ate a autorizacao no navegador (pode levar minutos): quem
      // corta o tempo e o backend, com mensagem honesta.
      await conectarGoogleCalendar();
      await recarregar();
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Nao deu pra conectar. Tente de novo."
      );
    } finally {
      setConectando(false);
    }
  }

  async function desconectar() {
    if (desconectando) return;
    if (!armado) {
      setArmado(true);
      return;
    }
    setArmado(false);
    setDesconectando(true);
    setErro(null);
    try {
      await desconectarGoogleCalendar();
      // Recarrega o estado do GET (o backend zerou tudo) antes de confiar so no
      // local, e limpa o que o usuario tinha digitado no card.
      await recarregar();
      aoDesconectado?.();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Nao deu pra desconectar. Tente de novo."
      );
    } finally {
      setDesconectando(false);
    }
  }

  if (conectado) {
    return (
      <div className="conx-google">
        <div className="conx-google-conectado">
          <span className="conx-google-ponto" aria-hidden="true" />
          <span className="conx-google-conta">
            Conectado{contaEmail ? ` como ${contaEmail}` : ""}
          </span>
          <button
            type="button"
            className={`botao botao-neutro conx-google-desconectar${armado ? " armado" : ""}`}
            onClick={() => void desconectar()}
            disabled={desconectando}
            title={armado ? "Clique de novo pra confirmar" : "Desconectar do Google"}
          >
            {desconectando
              ? "Desconectando..."
              : armado
              ? "Confirmar?"
              : "Desconectar"}
          </button>
        </div>
        {erro && <p className="conx-erro">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="conx-google">
      <div className="conx-google-acao">
        <button
          type="button"
          className="botao botao-principal conx-google-conectar"
          onClick={() => void conectar()}
          disabled={conectando || !credenciaisSalvas}
          title={
            credenciaisSalvas
              ? "Abre o navegador na autorizacao do Google"
              : "Salve o Client ID e o Client Secret antes de conectar"
          }
        >
          {conectando ? "Aguardando autorizacao no navegador..." : "Conectar"}
        </button>
        {conectando && <span className="giro conx-google-giro" />}
      </div>
      {!credenciaisSalvas && (
        <p className="conx-dica">
          Salve o Client ID e o Client Secret acima antes de conectar.
        </p>
      )}
      {conectando && (
        <p className="conx-dica">
          Autorize a conta na janela do navegador. Isso pode levar alguns minutos.
        </p>
      )}
      {erro && <p className="conx-erro">{erro}</p>}
    </div>
  );
}
