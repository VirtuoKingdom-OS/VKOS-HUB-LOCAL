import { useState, type FormEvent } from "react";
import { usarEstado } from "../../estado/contexto";
import { escolherPastaNativa } from "../../api/cliente";
import { Aviso, Botao, Campo, EstadoVazio } from "../comum/Sistema";

// O Estudio lista os workspaces internos do proprio Jesse (marca pessoal,
// clientes que ele opera direto). Entrar abre a experiencia de workspace
// completa, com o Claude dele. E a porta pela qual o Jesse cria, agora fora
// do painel de gestao.
interface Props {
  aoEntrar: (id: string) => void;
}

export function Estudio({ aoEntrar }: Props) {
  const { workspaces: todos, workspaceAtivo, adicionarCliente, criarCliente } = usarEstado();
  // Entradas ocultas (clientes do banco, raiz do sistema) nao sao do Estudio.
  const workspaces = todos.filter((w) => !w.oculto);
  const [vista, setVista] = useState<"lista" | "novo" | "adicionar">("lista");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);

  async function criarNovo(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setOcupado(true);
    try {
      const destino = await escolherPastaNativa("Escolha onde criar o workspace");
      if (!destino) {
        setOcupado(false);
        return;
      }
      const resultado = await criarCliente(nome, destino);
      setAvisos(resultado);
      setNome("");
      setVista("lista");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível criar o workspace.");
    } finally {
      setOcupado(false);
    }
  }

  async function adicionarExistente() {
    setErro("");
    setOcupado(true);
    try {
      const pasta = await escolherPastaNativa("Escolha a pasta VKOS do workspace");
      if (!pasta) {
        setOcupado(false);
        return;
      }
      await adicionarCliente(pasta);
      setVista("lista");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível adicionar o workspace.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="gestao-estudio">
      <div className="gestao-estudio-topo">
        <p className="gestao-secao-ajuda">
          Seus workspaces de trabalho. Entrar abre a criação completa com o seu Claude.
        </p>
        <div className="gestao-estudio-acoes">
          <Botao variante="sutil" type="button" onClick={() => setVista("adicionar")}>
            Adicionar pasta existente
          </Botao>
          <Botao variante="primario" type="button" onClick={() => setVista("novo")}>
            Novo workspace
          </Botao>
        </div>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {avisos.map((aviso) => (
        <Aviso key={aviso} tipo="sucesso">{aviso}</Aviso>
      ))}

      {vista === "novo" && (
        <form className="gestao-estudio-form" onSubmit={criarNovo}>
          <Campo
            rotulo="Nome do workspace"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <div className="gestao-estudio-form-acoes">
            <Botao variante="sutil" type="button" onClick={() => setVista("lista")}>Cancelar</Botao>
            <Botao variante="primario" ocupado={ocupado}>Escolher pasta e criar</Botao>
          </div>
        </form>
      )}

      {vista === "adicionar" && (
        <div className="gestao-estudio-form">
          <p className="gestao-secao-ajuda">Aponte para uma pasta VKOS que já existe no disco.</p>
          <div className="gestao-estudio-form-acoes">
            <Botao variante="sutil" type="button" onClick={() => setVista("lista")}>Cancelar</Botao>
            <Botao variante="primario" type="button" ocupado={ocupado} onClick={() => void adicionarExistente()}>
              Escolher pasta
            </Botao>
          </div>
        </div>
      )}

      {workspaces.length === 0 ? (
        <EstadoVazio titulo="Nenhum workspace ainda" mensagem="Crie o primeiro para começar a produzir." />
      ) : (
        <div className="gestao-estudio-grade">
          {workspaces.map((w) => (
            <article className={`gestao-card-workspace${w.id === workspaceAtivo ? " ativo" : ""}`} key={w.id}>
              <div>
                <strong>{w.nome}</strong>
                <small>{w.pasta}</small>
              </div>
              <Botao variante="primario" type="button" onClick={() => aoEntrar(w.id)}>
                Entrar
              </Botao>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
