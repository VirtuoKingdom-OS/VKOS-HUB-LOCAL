import { useState, type FormEvent } from "react";
import {
  aceitarConvite,
  criarOperador,
  entrar,
  type EstadoAutenticacao,
  type SessaoWeb,
} from "../../api/cliente";
import { Aviso, Botao } from "../comum/Sistema";
import { navegarParaCaminho } from "../layout/rotas";
import "../../estilos/acesso.css";

interface Props {
  estado: EstadoAutenticacao;
  aoEntrar: (sessao: SessaoWeb) => void;
}

export function TelaAcesso({ estado, aoEntrar }: Props) {
  const parametros = new URLSearchParams(window.location.search);
  const tokenConvite = parametros.get("token");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigoTotp, setCodigoTotp] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bootstrap = estado.modo === "core" && estado.precisaBootstrap;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setOcupado(true);
    try {
      if (tokenConvite) {
        await aceitarConvite({ token: tokenConvite, senha });
        navegarParaCaminho("/entrar", true);
        setSenha("");
        return;
      }
      if (bootstrap) {
        const sessao = await criarOperador({ email, senha });
        navegarParaCaminho("/dashboard", true);
        aoEntrar(sessao);
        return;
      }
      const sessao = await entrar({ email, senha, codigoTotp: estado.modo === "core" ? codigoTotp : undefined });
      navegarParaCaminho("/dashboard", true);
      aoEntrar(sessao);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Nao foi possivel entrar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="acesso">
      <div className="acesso-orbita acesso-orbita-a" />
      <div className="acesso-orbita acesso-orbita-b" />
      <section className="acesso-cartao">
        <header className="acesso-marca">
          <img src="/logo.png" alt="" />
          <div>
            <strong>VKOS</strong>
            <span>{estado.modo === "core" ? "HUB CORE" : "WORKSPACE"}</span>
          </div>
        </header>

        <div className="acesso-intro">
          <span className="acesso-sobre">
            {tokenConvite ? "Seu convite" : bootstrap ? "Primeiro acesso" : "Area segura"}
          </span>
          <h1>{tokenConvite ? "Crie sua senha" : bootstrap ? "Proteja o CORE" : "Continue de onde parou"}</h1>
          <p>
            {tokenConvite
              ? "Defina uma senha para ativar seu workspace."
              : bootstrap
                ? "Cadastre o operador do CORE. A verificacao em duas etapas pode ser ligada depois em Seguranca."
                : "Entre para acessar apenas os dados e recursos liberados para voce."}
          </p>
        </div>

        <form onSubmit={enviar} className="acesso-formulario">
          {!tokenConvite && (
            <label>
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
          )}
          <label>
            <span>Senha</span>
            <input type="password" autoComplete={bootstrap || tokenConvite ? "new-password" : "current-password"} minLength={12} value={senha} onChange={(e) => setSenha(e.target.value)} required />
            {(bootstrap || tokenConvite) && <small>Use pelo menos 12 caracteres.</small>}
          </label>

          {estado.modo === "core" && !tokenConvite && !bootstrap && estado.totpAtivo && (
            <label>
              <span>Codigo de 6 digitos</span>
              <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={codigoTotp} onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, ""))} required />
            </label>
          )}

          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Botao className="acesso-acao" variante="primario" ocupado={ocupado}>
            {ocupado ? "Conferindo..." : tokenConvite ? "Ativar workspace" : bootstrap ? "Criar operador" : "Entrar"}
          </Botao>
        </form>
      </section>
      <p className="acesso-rodape">Dados separados por workspace. Sessao protegida por cookie seguro.</p>
    </main>
  );
}
