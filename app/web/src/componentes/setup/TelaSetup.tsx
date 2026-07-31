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
import { Botao } from "../comum/Botao";
import { IconeAlerta, IconeCheck, IconeRaio, IconeSeta } from "../comum/Icones";
import { Marca } from "../comum/Telas";
import "./setup.css";
import { irParaTela } from "../layout/rotas";

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

// A configuracao guiada. Ela e a PRIMEIRA tela que um cliente novo ve na vida,
// entao ela e calma: um passo por vez, uma coluna estreita, um titulo, uma
// frase, uma decisao e uma acao principal. O progresso e honesto, escrito em
// palavra ("Passo 2 de 5") e desenhado na barra ao lado.
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
  const passoAtual = indicePasso + 1;

  return (
    <main className="setup">
      <header className="setup-topo">
        <Marca />
        <div className="setup-progresso-bloco">
          <span className="setup-progresso-rotulo">
            Passo {passoAtual} de {ordem.length}
          </span>
          <div
            className="progresso"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={ordem.length}
            aria-valuenow={passoAtual}
            aria-label="Progresso da configuração"
          >
            <div
              className="progresso-barra"
              style={{ width: `${(passoAtual / ordem.length) * 100}%` }}
            />
          </div>
        </div>
        {!primeiraExecucao && (
          <Botao
            variante="fantasma"
            onClick={() => {
              irParaTela("conexoes");
            }}
          >
            Sair
          </Botao>
        )}
      </header>

      <div className="setup-corpo">
        <div className="setup-passo" key={passo}>
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
            <div className="faixa faixa-alerta" role="alert">
              <IconeAlerta className="" />
              <div className="faixa-texto">{erro}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// O rotulo que nomeia o passo. Frase normal, nunca caixa alta.
function Sobre({ children }: { children: string }) {
  return <p className="setup-sobre">{children}</p>;
}

function PassoBoasVindas({ aoContinuar }: { aoContinuar: () => void }) {
  return (
    <>
      <Sobre>Primeira abertura</Sobre>
      <h1>Seu negócio, com uma equipe de IA por baixo.</h1>
      <p className="setup-legenda">
        Vamos preparar o motor que o VKOS Hub usa para trabalhar. Leva poucos
        minutos e acontece só nesta máquina.
      </p>
      <div className="faixa" role="note">
        <IconeRaio className="" />
        <div className="faixa-texto">
          <strong>Você escolhe a conta.</strong> Use Claude ou ChatGPT. O Hub
          não guarda a sua senha.
        </div>
      </div>
      <div className="acoes-formulario">
        <Botao variante="principal" tamanho="m" onClick={aoContinuar}>
          Começar
          <IconeSeta className="" />
        </Botao>
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
      <Sobre>Motor de IA</Sobre>
      <h1>Com quem o Hub vai trabalhar?</h1>
      <p className="setup-legenda">
        Escolha pela conta que você já usa. Dá para trocar depois em Conexões.
      </p>
      <fieldset className="opcoes setup-motores">
        <legend className="so-leitor">Motor de IA</legend>
        <OpcaoMotor
          id="claude"
          nome="Claude"
          texto="Melhor compatibilidade com as conexões MCP e com as skills originais do VKOS. Conta Claude Pro, Max ou API."
          deteccao={ambiente?.claude}
          ativo={selecionado === "claude"}
          aoEscolher={aoEscolher}
        />
        <OpcaoMotor
          id="codex"
          nome="Codex"
          texto="Usa sua conta OpenAI, do ChatGPT Plus, Pro ou API. O custo mostrado no Hub é uma estimativa por tokens."
          deteccao={ambiente?.codex}
          ativo={selecionado === "codex"}
          aoEscolher={aoEscolher}
        />
      </fieldset>
      <p className="dica">Conexões MCP funcionam só com Claude nesta versão.</p>
      <div className="acoes-formulario">
        <Botao variante="principal" disabled={!selecionado} onClick={aoContinuar}>
          Continuar
          <IconeSeta className="" />
        </Botao>
      </div>
    </>
  );
}

function OpcaoMotor({
  id,
  nome,
  texto,
  deteccao,
  ativo,
  aoEscolher,
}: {
  id: ProvedorIA;
  nome: string;
  texto: string;
  deteccao?: DeteccaoMotorIA;
  ativo: boolean;
  aoEscolher: (id: ProvedorIA) => void;
}) {
  return (
    <label className="opcao">
      <input
        type="radio"
        name="setup-motor"
        checked={ativo}
        onChange={() => aoEscolher(id)}
      />
      <span className="opcao-titulo">{nome}</span>
      <span className="opcao-descricao">{texto}</span>
      <span className={deteccao?.instalado ? "selo selo-vivo" : "selo"}>
        {deteccao?.instalado
          ? `Encontrado${deteccao.versao ? `, ${deteccao.versao}` : ""}`
          : "Ainda não encontrado"}
      </span>
    </label>
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
      <Sobre>Programa local</Sobre>
      <h1>{encontrado ? `${nomeMotor} encontrado.` : `Vamos instalar o ${nomeMotor}.`}</h1>
      <p className="setup-legenda">
        {encontrado
          ? "O programa está disponível nesta máquina. Confira a versão e siga."
          : "O Hub pode baixar e instalar o programa oficial para você. Sua conta entra só no próximo passo."}
      </p>

      <div
        className={encontrado ? "faixa faixa-boa" : "faixa"}
        role="status"
        aria-live="polite"
      >
        {encontrado ? <IconeCheck className="" /> : <IconeAlerta className="" />}
        <div className="faixa-texto">
          <strong>
            {encontrado ? `${nomeMotor} pronto` : `${nomeMotor} não encontrado`}
          </strong>
          <span className="setup-faixa-detalhe">
            {deteccao?.versao ?? "Aguardando a instalação"}
          </span>
        </div>
      </div>

      {!encontrado && instalando && (
        <div className="faixa" role="status" aria-live="polite">
          <span className="ponto-vivo" />
          <div className="faixa-texto">
            <strong>Instalando agora</strong>
            <span className="setup-faixa-detalhe">
              {progressoInstalacao.at(-1) ?? "Preparando o instalador oficial."}
            </span>
          </div>
        </div>
      )}

      {!encontrado && !instalando && (
        <p className="dica">
          O Windows pode pedir autorização. O Hub não recebe sua senha nem seus
          dados de login.
        </p>
      )}

      {!encontrado && (
        <details className="setup-manual">
          <summary>Prefiro instalar na mão</summary>
          <div className="setup-comando">
            <code>{comando}</code>
            <Botao tamanho="p" onClick={aoCopiar}>
              {copiado ? "Copiado" : "Copiar"}
            </Botao>
          </div>
        </details>
      )}

      <div className="acoes-formulario">
        <Botao variante="fantasma" onClick={aoVoltar} disabled={instalando}>
          Voltar
        </Botao>
        <span className="acoes-formulario-espaco" />
        {encontrado ? (
          <Botao variante="principal" onClick={aoContinuar}>
            Continuar
            <IconeSeta className="" />
          </Botao>
        ) : (
          <>
            <Botao
              variante="neutro"
              onClick={aoVerificar}
              disabled={verificando || instalando}
              aria-busy={verificando}
            >
              Já instalei
            </Botao>
            <Botao
              variante="principal"
              onClick={aoInstalar}
              disabled={instalando || verificando}
              aria-busy={instalando}
            >
              Instalar {nomeMotor}
            </Botao>
          </>
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
      <Sobre>Sua conta</Sobre>
      <h1>{logado ? "Conta conectada." : `Entre no ${nomeMotor}.`}</h1>
      <p className="setup-legenda">
        {logado
          ? "A autenticação foi confirmada pelo programa instalado."
          : "Vamos abrir uma janela do terminal com o login oficial. Sua senha não passa pelo Hub."}
      </p>

      <div
        className={logado ? "faixa faixa-boa" : "faixa"}
        role="status"
        aria-live="polite"
      >
        {logado ? <IconeCheck className="" /> : <IconeRaio className="" />}
        <div className="faixa-texto">
          <strong>
            {logado
              ? "Login confirmado"
              : loginAberto
              ? "Aguardando o login"
              : "Login pendente"}
          </strong>
          <span className="setup-faixa-detalhe">
            {logado
              ? "Pode seguir para o teste."
              : "Conclua os passos na janela que abrir."}
          </span>
        </div>
      </div>

      <div className="acoes-formulario">
        <Botao variante="fantasma" onClick={aoVoltar}>
          Voltar
        </Botao>
        <span className="acoes-formulario-espaco" />
        {logado ? (
          <Botao variante="principal" onClick={aoContinuar}>
            Testar conexão
            <IconeSeta className="" />
          </Botao>
        ) : (
          <>
            <Botao
              variante="neutro"
              onClick={aoVerificar}
              disabled={verificando}
              aria-busy={verificando}
            >
              Verificar agora
            </Botao>
            <Botao variante="principal" onClick={aoAbrir}>
              Abrir login
            </Botao>
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
    () =>
      custo
        ? custo.valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 4,
          })
        : "",
    [custo]
  );
  return (
    <>
      <Sobre>Prova final</Sobre>
      <h1>Vamos ouvir o {nomeMotor}.</h1>
      <p className="setup-legenda">
        Este botão faz uma chamada curta de verdade. A resposta aparece aqui ao
        vivo, sem criar workspace, histórico ou custo salvo no Hub.
      </p>

      <div className="setup-resposta">
        <div className="setup-resposta-topo">
          {testando && <span className="ponto-vivo" />}
          {testando
            ? "Recebendo resposta"
            : sucesso
            ? "Teste concluído"
            : "Pronto para testar"}
        </div>
        <pre aria-live="polite">
          {texto ||
            (testando
              ? "Aguardando o primeiro sinal."
              : "A resposta vai aparecer aqui.")}
        </pre>
      </div>

      {custo && (
        <p className="dica">
          Custo aproximado, estimado por tabela de preços: {custoFormatado}
        </p>
      )}

      <div className="acoes-formulario">
        <Botao variante="fantasma" onClick={aoVoltar} disabled={testando}>
          Voltar
        </Botao>
        <span className="acoes-formulario-espaco" />
        {sucesso ? (
          <Botao variante="principal" onClick={aoContinuar}>
            Continuar
            <IconeSeta className="" />
          </Botao>
        ) : (
          <Botao
            variante="principal"
            onClick={aoTestar}
            disabled={testando}
            aria-busy={testando}
          >
            Fazer teste real
          </Botao>
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
      <Sobre>Tudo certo</Sobre>
      <h1>{nomeMotor} está pronto para trabalhar.</h1>
      <p className="setup-legenda">
        {primeiraExecucao
          ? "Agora vamos montar o Cérebro do seu negócio dentro do VKOS Hub."
          : "As próximas sessões vão usar este motor. Sessões antigas continuam no motor em que nasceram."}
      </p>

      <div className={atalhoCriado ? "faixa faixa-boa" : "faixa"} role="status">
        {atalhoCriado ? <IconeCheck className="" /> : <IconeRaio className="" />}
        <div className="faixa-texto">
          <strong>
            {atalhoCriado ? "Atalho criado" : "Atalho na área de trabalho"}
          </strong>
          <span className="setup-faixa-detalhe">
            {atalhoCriado
              ? "O VKOS Hub está na sua área de trabalho."
              : "Abra o Hub com um clique nas próximas vezes."}
          </span>
        </div>
        {!atalhoCriado && (
          <div className="faixa-acoes">
            <Botao
              tamanho="p"
              onClick={aoCriarAtalho}
              disabled={criandoAtalho}
              aria-busy={criandoAtalho}
            >
              Criar atalho
            </Botao>
          </div>
        )}
      </div>

      <div className="acoes-formulario">
        <Botao
          variante="principal"
          onClick={aoConcluir}
          disabled={concluindo}
          aria-busy={concluindo}
        >
          {primeiraExecucao ? "Configurar meu negócio" : "Voltar para Conexões"}
          {!concluindo && <IconeSeta className="" />}
        </Botao>
      </div>
    </>
  );
}
