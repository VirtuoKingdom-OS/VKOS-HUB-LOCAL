import { useCallback, useEffect, useMemo, useState } from "react";
import "../../estilos/conexoes.css";
import { usarEstado } from "../../estado/contexto";
import {
  conectarGoogleCalendar,
  desconectarGoogleCalendar,
  obterConexoes,
  salvarConexao,
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

// Mapa de estado por id de servidor.
type MapaServidores = Record<string, EstadoServidor>;

// Tela das conexoes MCP: um card por servico. O usuario cola o token, liga o
// servidor e salva. Os tokens ficam so nesta maquina, no arquivo local do cliente.
export function TelaConexoes() {
  const { workspaceAtivo } = usarEstado();
  const [catalogo, setCatalogo] = useState<EntradaConexao[]>([]);
  const [servidores, setServidores] = useState<MapaServidores>({});
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
        <p className="conx-aviso-local">
          <IconeAlerta className="conx-aviso-icone" />
          Os tokens ficam so nesta maquina, no arquivo local do cliente. Nada sai
          daqui.
        </p>

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
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Card de um servico. Servico indisponivel vira card apagado com selo "em breve".
function CartaoConexao({
  entrada,
  estado,
  aoSalvar,
  recarregar,
}: {
  entrada: EntradaConexao;
  estado: EstadoServidor | undefined;
  aoSalvar: (
    id: string,
    dados: { habilitado: boolean; config?: Record<string, string> }
  ) => Promise<void>;
  recarregar: () => Promise<void>;
}) {
  const [habilitado, setHabilitado] = useState(estado?.habilitado ?? false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [revelar, setRevelar] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
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

  // So o Google Calendar tem o fluxo Conectar. Credenciais salvas = Client ID e
  // Client Secret ja no disco (o backend le do conexoes.json pra abrir o OAuth).
  const ehGoogle = entrada.id === ID_GOOGLE_CALENDAR;
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
            onChange={(e) => setHabilitado(e.target.checked)}
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
                  onChange={(e) =>
                    setValores((antes) => ({ ...antes, [campo.chave]: e.target.value }))
                  }
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
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </article>
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
