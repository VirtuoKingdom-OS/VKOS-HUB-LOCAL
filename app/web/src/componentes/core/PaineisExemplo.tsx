import { useCallback, useState, type ReactNode } from "react";
import { Botao } from "../comum/Botao";
import { IconeOlho, IconeOlhoRiscado, IconeSeta } from "../comum/Icones";
import {
  CLIENTES_ATIVOS_EXEMPLO,
  CLIENTES_EXEMPLO,
  CRM_EXEMPLO,
  ENTRADA_EXEMPLO,
  FUNIL_EXEMPLO,
  MOVIMENTOS_EXEMPLO,
  RECEITA_MENSAL_EXEMPLO,
  SAIDA_EXEMPLO,
  SALDO_EXEMPLO,
} from "./exemplo";

// Paineis de Clientes, Financas e CRM do Dashboard, ainda com DADO DE EXEMPLO.
// Ver exemplo.ts pra apagar tudo de uma vez.
//
// Eles vestem a mesma gramatica dos dois paineis reais: .secao com titulo e
// fio, o numero, a legenda e uma .lista. Nada aqui e cartao.

// Cada painel guarda o proprio olho, com chave propria.
//
// A primeira versao tinha um interruptor so pra tela inteira, e o Jesse pediu
// separado: esconder o faturamento nao e a mesma decisao que esconder a lista
// de clientes, e quem mostra a tela pra alguem costuma querer cobrir um sem
// cobrir o outro.
//
// Comeca ESCONDIDO. O Dashboard e a primeira tela do Hub e costuma abrir com
// gente do lado; valor a mostra por padrao e o tipo de decisao que so se percebe
// errada depois que ja aconteceu.
function usarOlho(chave: string): [boolean, () => void] {
  const armazenamento = `vkos-visivel-${chave}`;
  const [visivel, setVisivel] = useState(() => {
    try {
      return localStorage.getItem(armazenamento) === "1";
    } catch {
      return false;
    }
  });

  const alternar = useCallback(() => {
    setVisivel((antes) => {
      const proximo = !antes;
      try {
        localStorage.setItem(armazenamento, proximo ? "1" : "0");
      } catch {
        // sem localStorage, a escolha so nao persiste entre sessoes
      }
      return proximo;
    });
  }, [armazenamento]);

  return [visivel, alternar];
}

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// Envelope do que o olho cobre. O borrao vale pra VALOR e pra NOME: o Jesse
// pediu os dois, e faz sentido junto, porque saber que "Padaria do Bairro" paga
// mais que os outros ja entrega metade do que o valor escondia.
//
// Borrao, e nao substituicao por pontos: ele preserva a largura exata do texto,
// entao a lista nao dança ao ligar e desligar, e continua obvio que ha dado ali
// em vez de campo vazio. O select desligado impede copiar o texto por baixo.
function Sigilo({ visivel, children }: { visivel: boolean; children: ReactNode }) {
  if (visivel) return <>{children}</>;
  return (
    <>
      {/* O texto borrado sai da arvore de acessibilidade junto. Sem isto, o
          leitor de tela anunciaria o valor que a tela esta cobrindo, e o olho
          viraria um efeito visual em vez de uma garantia. */}
      <span className="core-sigilo" aria-hidden="true">
        {children}
      </span>
      <span className="so-leitor">oculto</span>
    </>
  );
}

// O olho mora no TOPO do painel, junto do titulo, e nao num rodape: pra
// esconder o saldo seria preciso rolar ate o fim passando pelo numero que se
// quer esconder. Controle de privacidade fica alcancavel antes do dado.
function BotaoOlho({
  visivel,
  aoAlternar,
  oque,
}: {
  visivel: boolean;
  aoAlternar: () => void;
  oque: string;
}) {
  const rotulo = visivel ? `Ocultar ${oque}` : `Mostrar ${oque}`;
  return (
    <Botao
      variante="fantasma"
      tamanho="p"
      soIcone
      onClick={aoAlternar}
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={!visivel}
    >
      {visivel ? <IconeOlho className="" /> : <IconeOlhoRiscado className="" />}
    </Botao>
  );
}

export function PainelClientes({ aoNavegar }: { aoNavegar: (tela: string) => void }) {
  const [visivel, alternar] = usarOlho("clientes");
  return (
    <section className="secao core-painel" aria-label="Clientes">
      <div className="secao-topo">
        <h2>Clientes</h2>
        <BotaoOlho visivel={visivel} aoAlternar={alternar} oque="os clientes" />
      </div>

      <p className="core-numero">
        {CLIENTES_ATIVOS_EXEMPLO}
        <span className="core-numero-de"> de {CLIENTES_EXEMPLO.length}</span>
      </p>
      <p className="core-legenda">
        Ativos agora. Recuperando{" "}
        <Sigilo visivel={visivel}>
          <strong>{moeda(RECEITA_MENSAL_EXEMPLO)}</strong>
        </Sigilo>{" "}
        por mês.
      </p>

      <div className="lista core-lista">
        {CLIENTES_EXEMPLO.slice(0, 3).map((c) => (
          <button
            key={c.nome}
            className="item-lista"
            type="button"
            onClick={() => aoNavegar("clientes")}
          >
            {/* Sem ponto de vida aqui: cliente ativo e um contrato em pe, nao
                uma sessao acontecendo agora. O estado dele se le no texto. */}
            <span className="item-lista-texto">
              <span className="item-lista-titulo">
                <Sigilo visivel={visivel}>{c.nome}</Sigilo>
              </span>
              <span className="item-lista-meta">
                {c.estado === "ativo"
                  ? "Ativo"
                  : c.estado === "proposta"
                    ? "Proposta enviada"
                    : "Pausado"}
                , {c.desde}
              </span>
            </span>
            <span className="core-linha-valor">
              {c.mensalUsd > 0 ? (
                <Sigilo visivel={visivel}>{moeda(c.mensalUsd)}</Sigilo>
              ) : (
                "sem valor"
              )}
            </span>
            <IconeSeta className="core-linha-seta" />
          </button>
        ))}
      </div>

      <Botao
        variante="fantasma"
        tamanho="p"
        className="core-ver-todos"
        onClick={() => aoNavegar("clientes")}
      >
        Ver os {CLIENTES_EXEMPLO.length} clientes
        <IconeSeta className="core-linha-seta" />
      </Botao>
    </section>
  );
}

export function PainelFinancas({ aoNavegar }: { aoNavegar: (tela: string) => void }) {
  const [visivel, alternar] = usarOlho("financas");
  return (
    <section className="secao core-painel" aria-label="Finanças">
      <div className="secao-topo">
        <h2>Finanças</h2>
        <BotaoOlho visivel={visivel} aoAlternar={alternar} oque="os valores" />
      </div>

      <p className="core-numero">
        <Sigilo visivel={visivel}>{moeda(SALDO_EXEMPLO)}</Sigilo>
      </p>
      <p className="core-legenda">Saldo do mês, entradas menos saídas.</p>

      <div className="core-fluxo">
        <div className="core-fluxo-item">
          <span className="rotulo">Entrou</span>
          <span className="core-fluxo-valor">
            <Sigilo visivel={visivel}>{moeda(ENTRADA_EXEMPLO)}</Sigilo>
          </span>
        </div>
        <div className="core-fluxo-item">
          <span className="rotulo">Saiu</span>
          <span className="core-fluxo-valor">
            <Sigilo visivel={visivel}>{moeda(SAIDA_EXEMPLO)}</Sigilo>
          </span>
        </div>
      </div>

      <div className="lista core-lista">
        {MOVIMENTOS_EXEMPLO.slice(0, 3).map((m) => (
          <button
            key={m.descricao}
            className="item-lista"
            type="button"
            onClick={() => aoNavegar("financas")}
          >
            <span className="core-mov-sinal" aria-hidden="true">
              {m.valorUsd > 0 ? "+" : "−"}
            </span>
            <span className="item-lista-texto">
              <span className="item-lista-titulo">
                <Sigilo visivel={visivel}>{m.descricao}</Sigilo>
              </span>
              <span className="item-lista-meta">
                {m.valorUsd > 0 ? "Entrou" : "Saiu"}, {m.quando}
              </span>
            </span>
            <span className="core-linha-valor">
              <Sigilo visivel={visivel}>{moeda(Math.abs(m.valorUsd))}</Sigilo>
            </span>
            <IconeSeta className="core-linha-seta" />
          </button>
        ))}
      </div>

      <Botao
        variante="fantasma"
        tamanho="p"
        className="core-ver-todos"
        onClick={() => aoNavegar("financas")}
      >
        Abrir Finanças
        <IconeSeta className="core-linha-seta" />
      </Botao>
    </section>
  );
}

export function PainelCrm({ aoNavegar }: { aoNavegar: (tela: string) => void }) {
  const maior = Math.max(...FUNIL_EXEMPLO.map((e) => e.total));
  return (
    <section className="secao core-painel" aria-label="CRM">
      <div className="secao-topo">
        <h2>CRM</h2>
        <span className="selo">{CRM_EXEMPLO.tarefasHoje} para hoje</span>
      </div>

      <p className="core-numero">
        {CRM_EXEMPLO.contatos}
        <span className="core-numero-de"> contatos</span>
      </p>
      <p className="core-legenda">
        {CRM_EXEMPLO.semResposta} sem resposta há mais de 3 dias.
      </p>

      {/* O funil como barras deitadas: cada estagio se le pela largura, e a
          queda entre eles e o que interessa olhar. */}
      <div className="core-funil">
        {FUNIL_EXEMPLO.map((e) => (
          <div className="core-funil-linha" key={e.nome}>
            <span className="core-funil-nome">{e.nome}</span>
            <span className="core-funil-trilho">
              <span
                className="core-funil-barra"
                style={{ width: `${Math.round((e.total / maior) * 100)}%` }}
              />
            </span>
            <span className="core-funil-total">{e.total}</span>
          </div>
        ))}
      </div>

      <Botao
        variante="fantasma"
        tamanho="p"
        className="core-ver-todos"
        onClick={() => aoNavegar("crm")}
      >
        Abrir o CRM
        <IconeSeta className="core-linha-seta" />
      </Botao>
    </section>
  );
}
