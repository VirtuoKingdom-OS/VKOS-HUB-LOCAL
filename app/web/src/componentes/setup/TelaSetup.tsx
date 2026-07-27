import { useEffect, useMemo, useState } from "react";

import {
  abrirLoginMotor,
  criarAtalhoHub,
  instalarMotorSetup,
  obterAmbiente,
  testarMotorSetup,
  type EventoInstalacaoMotor,
  type EventoTesteSetup,
} from "../../api/cliente";
import type {
  Ambiente,
  DeteccaoMotorIA,
  ProvedorIA,
} from "../../tipos/dominio";
import { mensagemDeErro } from "../../util/erros";
import { IconeAlerta, IconeCheck, IconeRaio, IconeSeta } from "../comum/Icones";
import { Marca } from "../comum/Telas";
import "../../estilos/setup.css";

type Passo = "boas-vindas" | "motor" | "detectar" | "login" | "teste" | "pronto";

interface PropsTelaSetup {
  primeiraExecucao: boolean;
  provedorAtual?: ProvedorIA;
  aoConcluir: (provedor: ProvedorIA) => Promise<void>;
}

const INSTALACAO: Record<ProvedorIA, string> = {
  claude: "winget install --id Anthropic.ClaudeCode -e --source winget",
  codex: "winget install --id OpenAI.Codex -e --source winget",
};

const ORDEM_COMPLETA: Passo[] = [
  "boas-vindas",
  "motor",
  "detectar",
  "login",
  "teste",
  "pronto",
];

export function TelaSetup({
  primeiraExecucao,
  provedorAtual,
  aoConcluir,
}: PropsTelaSetup) {
  const [passo, setPasso] = useState<Passo>(
    primeiraExecucao ? "boas-vindas" : "motor"
  );
  const [provedor, setProvedor] = useState<ProvedorIA | null>(
    provedorAtual ?? null
  );
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [progressoInstalacao, setProgressoInstalacao] = useState<string[]>([]);
  const [loginAberto, setLoginAberto] = useState(false);
  const [testando, setTestando] = useState(false);
  const [textoTeste, setTextoTeste] = useState("");
  const [testeOk, setTesteOk] = useState(false);
  const [custoTeste, setCustoTeste] = useState<{
    valor: number;
    estimado: boolean;
  } | null>(null);
  const [criandoAtalho, setCriandoAtalho] = useState(false);
  const [atalhoCriado, setAtalhoCriado] = useState(false);
  const [concluindo, setConcluindo] = useState(false);

  const ordem = primeiraExecucao ? ORDEM_COMPLETA : ORDEM_COMPLETA.slice(1);
  const indicePasso = ordem.indexOf(passo);
  const deteccao = provedor && ambiente ? ambiente[provedor] : null;

  async function verificarAmbiente() {
    setVerificando(true);
    setErro(null);
    try {
      setAmbiente(await obterAmbiente(true));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setVerificando(false);
    }
  }

  useEffect(() => {
    void verificarAmbiente();
  }, []);

  // Depois que o terminal abre, confere o login a cada tres segundos. Para
  // assim que o CLI confirma a conta ou quando o usuario sai deste passo.
  useEffect(() => {
    if (passo !== "login" || !loginAberto || deteccao?.logado === true) return;
    const timer = window.setInterval(() => void verificarAmbiente(), 3000);
    return () => window.clearInterval(timer);
  }, [passo, loginAberto, deteccao?.logado]);

  const escolherMotor = (id: ProvedorIA) => {
    setProvedor(id);
    setErro(null);
    setTesteOk(false);
    setTextoTeste("");
    setCustoTeste(null);
  };

  async function copiarComando() {
    if (!provedor) return;
    setErro(null);
    try {
      await navigator.clipboard.writeText(INSTALACAO[provedor]);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setErro("Não consegui copiar. Selecione o comando e copie com Ctrl+C.");
    }
  }

  async function abrirLogin() {
    if (!provedor) return;
    setErro(null);
    try {
      await abrirLoginMotor(provedor);
      setLoginAberto(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  async function instalarMotor() {
    if (!provedor || instalando) return;
    setInstalando(true);
    setErro(null);
    setProgressoInstalacao([]);
    let sucesso = false;
    try {
      await instalarMotorSetup(provedor, (evento: EventoInstalacaoMotor) => {
        if (evento.tipo === "texto") {
          setProgressoInstalacao((atual) => [...atual, evento.texto].slice(-4));
        }
        if (evento.tipo === "erro") setErro(evento.mensagem);
        if (evento.tipo === "fim") sucesso = evento.sucesso;
      });
      if (sucesso) await verificarAmbiente();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setInstalando(false);
    }
  }

  function receberEventoTeste(evento: EventoTesteSetup) {
    if (evento.tipo === "texto") {
      setTextoTeste((atual) => atual + evento.texto);
    }
    if (evento.tipo === "resultado") {
      setTextoTeste((atual) => atual || evento.texto);
      setCustoTeste({ valor: evento.custoUsd, estimado: evento.estimado });
    }
    if (evento.tipo === "erro") {
      setErro(evento.mensagem);
    }
    if (evento.tipo === "fim") {
      setTesteOk(evento.sucesso);
    }
  }

  async function testar() {
    if (!provedor || testando) return;
    setTestando(true);
    setErro(null);
    setTesteOk(false);
    setTextoTeste("");
    setCustoTeste(null);
    try {
      await testarMotorSetup(provedor, receberEventoTeste);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setTestando(false);
    }
  }

  async function criarAtalho() {
    setCriandoAtalho(true);
    setErro(null);
    try {
      await criarAtalhoHub();
      setAtalhoCriado(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCriandoAtalho(false);
    }
  }

  async function concluir() {
    if (!provedor || concluindo) return;
    setConcluindo(true);
    setErro(null);
    try {
      await aoConcluir(provedor);
    } catch (e) {
      setErro(mensagemDeErro(e));
      setConcluindo(false);
    }
  }

  const nomeMotor = provedor === "codex" ? "Codex" : "Claude";

  return (
    <main className="setup">
      <div className="setup-ambiente" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="setup-cartao">
        <header className="setup-topo">
          <Marca />
          <div className="setup-progresso" aria-label={`Passo ${indicePasso + 1} de ${ordem.length}`}>
            {ordem.map((item, indice) => (
              <span
                key={item}
                className={indice === indicePasso ? "ativo" : indice < indicePasso ? "feito" : ""}
              />
            ))}
          </div>
          {!primeiraExecucao && (
            <button
              type="button"
              className="setup-fechar"
              onClick={() => {
                window.location.hash = "#/conexoes";
              }}
            >
              Voltar
            </button>
          )}
        </header>

        <div className="setup-miolo" key={passo}>
          {passo === "boas-vindas" && (
            <PassoBoasVindas aoContinuar={() => setPasso("motor")} />
          )}

          {passo === "motor" && (
            <PassoMotor
              selecionado={provedor}
              ambiente={ambiente}
              aoEscolher={escolherMotor}
              aoContinuar={() => setPasso("detectar")}
            />
          )}

          {passo === "detectar" && provedor && (
            <PassoDetectar
              nomeMotor={nomeMotor}
              comando={INSTALACAO[provedor]}
              deteccao={deteccao}
              verificando={verificando}
              instalando={instalando}
              progressoInstalacao={progressoInstalacao}
              copiado={copiado}
              aoInstalar={instalarMotor}
              aoCopiar={copiarComando}
              aoVerificar={verificarAmbiente}
              aoVoltar={() => setPasso("motor")}
              aoContinuar={() =>
                setPasso(deteccao?.logado === true ? "teste" : "login")
              }
            />
          )}

          {passo === "login" && provedor && (
            <PassoLogin
              nomeMotor={nomeMotor}
              deteccao={deteccao}
              loginAberto={loginAberto}
              verificando={verificando}
              aoAbrir={abrirLogin}
              aoVerificar={verificarAmbiente}
              aoVoltar={() => setPasso("detectar")}
              aoContinuar={() => setPasso("teste")}
            />
          )}

          {passo === "teste" && provedor && (
            <PassoTeste
              nomeMotor={nomeMotor}
              texto={textoTeste}
              testando={testando}
              sucesso={testeOk}
              custo={custoTeste}
              aoTestar={testar}
              aoVoltar={() => setPasso("login")}
              aoContinuar={() => setPasso("pronto")}
            />
          )}

          {passo === "pronto" && provedor && (
            <PassoPronto
              nomeMotor={nomeMotor}
              primeiraExecucao={primeiraExecucao}
              atalhoCriado={atalhoCriado}
              criandoAtalho={criandoAtalho}
              concluindo={concluindo}
              aoCriarAtalho={criarAtalho}
              aoConcluir={concluir}
            />
          )}

          {erro && (
            <div className="setup-erro" role="alert">
              <IconeAlerta />
              <span>{erro}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function PassoBoasVindas({ aoContinuar }: { aoContinuar: () => void }) {
  return (
    <>
      <span className="setup-sobre">Primeira abertura</span>
      <h1>Seu negócio, com uma equipe de IA por baixo.</h1>
      <p className="setup-legenda">
        Vamos preparar o motor que o VKOS Hub usa para trabalhar. Leva poucos
        minutos e acontece só nesta máquina.
      </p>
      <div className="setup-destaque">
        <IconeRaio />
        <div>
          <strong>Você escolhe a conta</strong>
          <span>Use Claude ou ChatGPT. O hub não guarda a sua senha.</span>
        </div>
      </div>
      <div className="setup-acoes direita">
        <button className="botao botao-principal" onClick={aoContinuar}>
          Começar <IconeSeta />
        </button>
      </div>
    </>
  );
}

function PassoMotor({
  selecionado,
  ambiente,
  aoEscolher,
  aoContinuar,
}: {
  selecionado: ProvedorIA | null;
  ambiente: Ambiente | null;
  aoEscolher: (id: ProvedorIA) => void;
  aoContinuar: () => void;
}) {
  return (
    <>
      <span className="setup-sobre">Motor de IA</span>
      <h1>Com quem o hub vai trabalhar?</h1>
      <p className="setup-legenda">
        Escolha pela conta que você já usa. Dá para trocar depois em Conexões.
      </p>
      <div className="setup-motores">
        <CartaoMotor
          id="claude"
          nome="Claude"
          selo="Claude Pro, Max ou API"
          texto="Melhor compatibilidade com as conexões MCP e com as skills originais do VKOS."
          deteccao={ambiente?.claude}
          ativo={selecionado === "claude"}
          aoEscolher={aoEscolher}
        />
        <CartaoMotor
          id="codex"
          nome="Codex"
          selo="ChatGPT Plus, Pro ou API"
          texto="Usa sua conta OpenAI. O custo mostrado no hub é uma estimativa por tokens."
          deteccao={ambiente?.codex}
          ativo={selecionado === "codex"}
          aoEscolher={aoEscolher}
        />
      </div>
      <p className="setup-nota">Conexões MCP funcionam só com Claude nesta versão.</p>
      <div className="setup-acoes direita">
        <button
          className="botao botao-principal"
          disabled={!selecionado}
          onClick={aoContinuar}
        >
          Continuar <IconeSeta />
        </button>
      </div>
    </>
  );
}

function CartaoMotor({
  id,
  nome,
  selo,
  texto,
  deteccao,
  ativo,
  aoEscolher,
}: {
  id: ProvedorIA;
  nome: string;
  selo: string;
  texto: string;
  deteccao?: DeteccaoMotorIA;
  ativo: boolean;
  aoEscolher: (id: ProvedorIA) => void;
}) {
  return (
    <button
      type="button"
      className={`setup-motor${ativo ? " ativo" : ""}`}
      onClick={() => aoEscolher(id)}
      aria-pressed={ativo}
    >
      <span className="setup-motor-cabeca">
        <strong>{nome}</strong>
        {ativo && <IconeCheck />}
      </span>
      <span className="setup-motor-selo">{selo}</span>
      <span className="setup-motor-texto">{texto}</span>
      <span className={`setup-motor-estado${deteccao?.instalado ? " ok" : ""}`}>
        {deteccao?.instalado
          ? `Encontrado${deteccao.versao ? `, ${deteccao.versao}` : ""}`
          : "Ainda não encontrado"}
      </span>
    </button>
  );
}

function PassoDetectar({
  nomeMotor,
  comando,
  deteccao,
  verificando,
  instalando,
  progressoInstalacao,
  copiado,
  aoInstalar,
  aoCopiar,
  aoVerificar,
  aoVoltar,
  aoContinuar,
}: {
  nomeMotor: string;
  comando: string;
  deteccao: DeteccaoMotorIA | null;
  verificando: boolean;
  instalando: boolean;
  progressoInstalacao: string[];
  copiado: boolean;
  aoInstalar: () => void;
  aoCopiar: () => void;
  aoVerificar: () => void;
  aoVoltar: () => void;
  aoContinuar: () => void;
}) {
  const encontrado = deteccao?.instalado === true;
  return (
    <>
      <span className="setup-sobre">Programa local</span>
      <h1>{encontrado ? `${nomeMotor} encontrado.` : `Vamos instalar o ${nomeMotor}.`}</h1>
      <p className="setup-legenda">
        {encontrado
          ? "O programa está disponível nesta máquina. Confira a versão e siga."
          : "O Hub pode baixar e instalar o programa oficial para você. Sua conta será conectada somente no próximo passo."}
      </p>
      <div className={`setup-status${encontrado ? " ok" : ""}`}>
        <span className="setup-status-icone">
          {encontrado ? <IconeCheck /> : <IconeAlerta />}
        </span>
        <div>
          <strong>{encontrado ? `${nomeMotor} pronto` : `${nomeMotor} não encontrado`}</strong>
          <span>{deteccao?.versao ?? "Aguardando a instalação"}</span>
        </div>
      </div>
      {!encontrado && (
        <div className={`setup-instalacao${instalando ? " ativa" : ""}`} aria-live="polite">
          <div className="setup-instalacao-cabeca">
            {instalando ? <span className="giro" /> : <IconeRaio />}
            <strong>{instalando ? "Instalando agora" : "Instalação automática"}</strong>
          </div>
          <p>
            {instalando
              ? progressoInstalacao.at(-1) ?? "Preparando o instalador oficial..."
              : "O Windows pode pedir autorização. O Hub não recebe sua senha nem seus dados de login."}
          </p>
        </div>
      )}
      {!encontrado && (
        <details className="setup-manual">
          <summary>Usar instalação manual</summary>
          <div className="setup-comando">
            <code>{comando}</code>
            <button type="button" onClick={aoCopiar}>{copiado ? "Copiado" : "Copiar"}</button>
          </div>
        </details>
      )}
      <div className="setup-acoes">
        <button className="botao botao-fantasma" onClick={aoVoltar} disabled={instalando}>Voltar</button>
        {encontrado ? (
          <button className="botao botao-principal" onClick={aoContinuar}>
            Continuar <IconeSeta />
          </button>
        ) : (
          <div className="setup-acoes-grupo">
            <button
              className="botao botao-fantasma"
              onClick={aoVerificar}
              disabled={verificando || instalando}
            >
              {verificando ? "Verificando" : "Já instalei"}
            </button>
            <button
              className="botao botao-principal"
              onClick={aoInstalar}
              disabled={instalando || verificando}
            >
              {instalando ? "Instalando" : `Instalar ${nomeMotor}`}
              {!instalando && <IconeSeta />}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PassoLogin({
  nomeMotor,
  deteccao,
  loginAberto,
  verificando,
  aoAbrir,
  aoVerificar,
  aoVoltar,
  aoContinuar,
}: {
  nomeMotor: string;
  deteccao: DeteccaoMotorIA | null;
  loginAberto: boolean;
  verificando: boolean;
  aoAbrir: () => void;
  aoVerificar: () => void;
  aoVoltar: () => void;
  aoContinuar: () => void;
}) {
  const logado = deteccao?.logado === true;
  return (
    <>
      <span className="setup-sobre">Sua conta</span>
      <h1>{logado ? "Conta conectada." : `Entre no ${nomeMotor}.`}</h1>
      <p className="setup-legenda">
        {logado
          ? "A autenticação foi confirmada pelo programa instalado."
          : "Vamos abrir uma janela do terminal com o login oficial. Sua senha não passa pelo hub."}
      </p>
      <div className={`setup-status${logado ? " ok" : ""}`}>
        <span className="setup-status-icone">{logado ? <IconeCheck /> : <IconeRaio />}</span>
        <div>
          <strong>{logado ? "Login confirmado" : loginAberto ? "Aguardando o login" : "Login pendente"}</strong>
          <span>{logado ? "Pode seguir para o teste." : "Conclua os passos na janela que abrir."}</span>
        </div>
      </div>
      <div className="setup-acoes">
        <button className="botao botao-fantasma" onClick={aoVoltar}>Voltar</button>
        {logado ? (
          <button className="botao botao-principal" onClick={aoContinuar}>
            Testar conexão <IconeSeta />
          </button>
        ) : (
          <>
            <button className="botao botao-neutro" onClick={aoVerificar} disabled={verificando}>
              {verificando ? "Verificando" : "Verificar agora"}
            </button>
            <button className="botao botao-principal" onClick={aoAbrir}>Abrir login</button>
          </>
        )}
      </div>
    </>
  );
}

function PassoTeste({
  nomeMotor,
  texto,
  testando,
  sucesso,
  custo,
  aoTestar,
  aoVoltar,
  aoContinuar,
}: {
  nomeMotor: string;
  texto: string;
  testando: boolean;
  sucesso: boolean;
  custo: { valor: number; estimado: boolean } | null;
  aoTestar: () => void;
  aoVoltar: () => void;
  aoContinuar: () => void;
}) {
  const custoFormatado = useMemo(
    () => (custo ? custo.valor.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 4 }) : ""),
    [custo]
  );
  return (
    <>
      <span className="setup-sobre">Prova final</span>
      <h1>Vamos ouvir o {nomeMotor}.</h1>
      <p className="setup-legenda">
        Este botão faz uma chamada curta de verdade. A resposta aparece aqui ao vivo,
        sem criar workspace, histórico ou custo salvo no hub.
      </p>
      <div className={`setup-terminal${sucesso ? " sucesso" : ""}`}>
        <span className="setup-terminal-topo">
          <span /><span /><span />
          <em>{testando ? "recebendo resposta" : sucesso ? "teste concluído" : "pronto para testar"}</em>
        </span>
        <pre>{texto || (testando ? "Aguardando o primeiro sinal..." : "A resposta vai aparecer aqui.")}</pre>
      </div>
      {custo && (
        <p className="setup-custo">
          Custo aproximado, estimado por tabela de preços: <strong>{custoFormatado}</strong>
        </p>
      )}
      <div className="setup-acoes">
        <button className="botao botao-fantasma" onClick={aoVoltar} disabled={testando}>Voltar</button>
        {sucesso ? (
          <button className="botao botao-principal" onClick={aoContinuar}>
            Continuar <IconeSeta />
          </button>
        ) : (
          <button className="botao botao-principal" onClick={aoTestar} disabled={testando}>
            {testando ? "Testando" : "Fazer teste real"}
          </button>
        )}
      </div>
    </>
  );
}

function PassoPronto({
  nomeMotor,
  primeiraExecucao,
  atalhoCriado,
  criandoAtalho,
  concluindo,
  aoCriarAtalho,
  aoConcluir,
}: {
  nomeMotor: string;
  primeiraExecucao: boolean;
  atalhoCriado: boolean;
  criandoAtalho: boolean;
  concluindo: boolean;
  aoCriarAtalho: () => void;
  aoConcluir: () => void;
}) {
  return (
    <>
      <span className="setup-sobre">Tudo certo</span>
      <div className="setup-celebracao"><IconeCheck /></div>
      <h1>{nomeMotor} está pronto para trabalhar.</h1>
      <p className="setup-legenda">
        {primeiraExecucao
          ? "Agora vamos montar o Cérebro do seu negócio dentro do VKOS Hub."
          : "As próximas sessões vão usar este motor. Sessões antigas continuam no motor em que nasceram."}
      </p>
      <button
        type="button"
        className={`setup-atalho${atalhoCriado ? " pronto" : ""}`}
        onClick={aoCriarAtalho}
        disabled={criandoAtalho || atalhoCriado}
      >
        <span className="setup-status-icone"><IconeRaio /></span>
        <span>
          <strong>{atalhoCriado ? "Atalho criado" : "Criar atalho na área de trabalho"}</strong>
          <small>{atalhoCriado ? "VKOS Hub está na sua área de trabalho." : "Abra o hub com um clique nas próximas vezes."}</small>
        </span>
      </button>
      <div className="setup-acoes direita">
        <button className="botao botao-principal" onClick={aoConcluir} disabled={concluindo}>
          {concluindo ? "Salvando" : primeiraExecucao ? "Configurar meu negócio" : "Voltar para Conexões"}
          {!concluindo && <IconeSeta />}
        </button>
      </div>
    </>
  );
}
