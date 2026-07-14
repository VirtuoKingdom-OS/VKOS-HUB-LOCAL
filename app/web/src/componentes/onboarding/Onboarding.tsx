import { useState } from "react";
import { usarEstado } from "../../estado/contexto";
import { mensagemDeErro } from "../../util/erros";
import { NavegadorPastas } from "./NavegadorPastas";
import { Marca } from "../comum/Telas";
import {
  IconeAlerta,
  IconeCheck,
  IconeSeta,
} from "../comum/Icones";

type Passo = 1 | 2 | 3;

// Onboarding guiado em 3 passos, linguagem pra leigo.
export function Onboarding() {
  const {
    ambiente,
    estadoVkos,
    recarregarAmbiente,
    definirPastaVkos,
    liberarCockpit,
  } = usarEstado();

  const claudeOk = ambiente?.claude.instalado ?? false;
  const [passo, setPasso] = useState<Passo>(claudeOk ? 2 : 1);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const escolherPasta = async (caminho: string) => {
    setSalvando(true);
    setErro(null);
    try {
      const novo = await definirPastaVkos(caminho);
      if (!novo.valida) {
        setErro(
          "Essa pasta nao parece ser um VKOS completo. Escolha a pasta que tem o Cerebro dentro."
        );
        return;
      }
      setPasso(3);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const verificarClaude = async () => {
    setVerificando(true);
    setErro(null);
    try {
      await recarregarAmbiente();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="cartao-onboarding">
        <div className="cabecalho">
          <Marca />
          <div className="passos">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`passo-pino${
                  n === passo ? " ativo" : n < passo ? " feito" : ""
                }`}
              />
            ))}
          </div>
        </div>

        {passo === 1 && (
          <PassoClaude
            claudeOk={claudeOk}
            versao={ambiente?.claude.versao ?? null}
            verificando={verificando}
            aoVerificar={verificarClaude}
            aoAvancar={() => setPasso(2)}
          />
        )}

        {passo === 2 && (
          <div className="miolo">
            <h1>Onde esta o seu VKOS?</h1>
            <p className="legenda">
              O VKOS e a pasta com o Cerebro do seu negocio. Navegue ate ela e
              clique em usar. As pastas que ja sao um VKOS aparecem destacadas em
              verde.
            </p>
            <NavegadorPastas aoEscolher={escolherPasta} ocupado={salvando} />
            {erro && (
              <div className="erro-linha">
                <IconeAlerta className="" />
                {erro}
              </div>
            )}
            <div className="acoes">
              {!claudeOk && (
                <button
                  className="botao botao-fantasma"
                  onClick={() => setPasso(1)}
                >
                  Voltar
                </button>
              )}
              {salvando && <span className="badge status-iniciando">Validando</span>}
            </div>
          </div>
        )}

        {passo === 3 && (
          <PassoConfirmacao
            pasta={estadoVkos?.pasta ?? ""}
            cerebroPreenchido={estadoVkos?.cerebroPreenchido ?? false}
            totalSkills={estadoVkos?.totalSkills ?? 0}
            aoEntrar={liberarCockpit}
          />
        )}
      </div>
    </div>
  );
}

function PassoClaude({
  claudeOk,
  versao,
  verificando,
  aoVerificar,
  aoAvancar,
}: {
  claudeOk: boolean;
  versao: string | null;
  verificando: boolean;
  aoVerificar: () => void;
  aoAvancar: () => void;
}) {
  return (
    <div className="miolo">
      <h1>Primeiro, o Claude Code</h1>
      <p className="legenda">
        O VKOS Hub usa o Claude Code para trabalhar. E um programa gratuito que
        roda no seu computador. Veja se ele ja esta pronto.
      </p>

      <div className="cartao-estado">
        <span className={`selo ${claudeOk ? "ok" : "pendente"}`}>
          {claudeOk ? <IconeCheck className="" /> : <IconeAlerta className="" />}
        </span>
        <div className="texto-estado">
          {claudeOk ? (
            <>
              <strong>Claude Code encontrado</strong>
              <span>Tudo certo{versao ? `, versao ${versao}` : ""}. Pode seguir.</span>
            </>
          ) : (
            <>
              <strong>Ainda nao encontramos o Claude Code</strong>
              <span>Siga o passo a passo abaixo e verifique de novo.</span>
            </>
          )}
        </div>
      </div>

      {!claudeOk && (
        <ol className="guia-passos">
          <li>
            <span className="num">1</span>
            <span>
              Abra o site oficial <code>claude.com/code</code> e instale o Claude
              Code no seu computador.
            </span>
          </li>
          <li>
            <span className="num">2</span>
            <span>
              Depois de instalar, faca login com a sua conta Claude quando ele
              pedir.
            </span>
          </li>
          <li>
            <span className="num">3</span>
            <span>Volte aqui e clique em verificar de novo.</span>
          </li>
        </ol>
      )}

      <div className="acoes">
        {claudeOk ? (
          <button className="botao botao-principal" onClick={aoAvancar}>
            Continuar <IconeSeta className="" />
          </button>
        ) : (
          <button
            className="botao botao-principal"
            onClick={aoVerificar}
            disabled={verificando}
          >
            {verificando ? "Verificando" : "Verificar de novo"}
          </button>
        )}
      </div>
    </div>
  );
}

function PassoConfirmacao({
  pasta,
  cerebroPreenchido,
  totalSkills,
  aoEntrar,
}: {
  pasta: string;
  cerebroPreenchido: boolean;
  totalSkills: number;
  aoEntrar: () => void;
}) {
  return (
    <div className="miolo">
      <h1>Tudo pronto</h1>
      <p className="legenda">
        Seu VKOS esta conectado. O cockpit vai abrir com o Cerebro do seu negocio
        carregado no centro.
      </p>

      <div className="cartao-estado">
        <span className="selo ok">
          <IconeCheck className="" />
        </span>
        <div className="texto-estado">
          <strong>VKOS conectado</strong>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{pasta}</span>
        </div>
      </div>

      <div className="cartao-estado">
        <span className={`selo ${cerebroPreenchido ? "ok" : "pendente"}`}>
          {cerebroPreenchido ? (
            <IconeCheck className="" />
          ) : (
            <IconeAlerta className="" />
          )}
        </span>
        <div className="texto-estado">
          <strong>
            {cerebroPreenchido ? "Cerebro preenchido" : "Cerebro ainda em branco"}
          </strong>
          <span>
            {cerebroPreenchido
              ? `${totalSkills} comandos prontos pra usar.`
              : "Entre no cockpit e rode o comando instalar para montar o Cerebro."}
          </span>
        </div>
      </div>

      <div className="acoes">
        <button className="botao botao-principal" onClick={aoEntrar}>
          Entrar no cockpit <IconeSeta className="" />
        </button>
      </div>
    </div>
  );
}
