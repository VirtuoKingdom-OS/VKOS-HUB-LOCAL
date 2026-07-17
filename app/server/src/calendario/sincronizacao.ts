// Sincronizacao CRM > agenda. Quando ligada, todo cartao do CRM com "proximo
// contato" vira um evento na agenda LOCAL do workspace, mantido em dia pelo
// barramento de eventos: data nova cria, data alterada atualiza, data limpa ou
// cartao excluido remove o evento.
//
// Local-first: a sincronizacao do CRM funciona SEM Google. Ela cria eventos pela
// camada local (eventosLocais.ts), que por sua vez espelha pro Google quando a
// sincronizacao com o Google esta ligada e conectada. O vinculo cartao > evento
// aponta pro id do evento LOCAL.
//
// Desligar a sincronizacao para de sincronizar, mas NAO apaga os eventos ja
// criados (nada destrutivo sem gesto do usuario).

import { assinar, type EventoDominio } from "../eventos/barramento.js";
import { lerEstado as lerEstadoCrm, type Contato } from "../crm/estado.js";
import {
  atualizarEventoLocal,
  criarEventoLocal,
  definirVinculo,
  lerConfigCalendario,
  lerVinculo,
  removerEventoLocal,
  removerVinculo,
  type DadosEventoLocal,
} from "./eventosLocais.js";

// Duracao padrao do evento criado a partir do cartao, em minutos.
const DURACAO_MIN = 60;

// Serializa as reacoes por workspaceId+contatoId. Sem isso, duas operacoes rapidas
// no mesmo contato (ex: editar a data e mover o cartao quase juntos) leem o vinculo
// vazio ao mesmo tempo e cada uma cria um evento, duplicando na agenda e deixando
// vinculo orfao. A fila em memoria encadeia uma reacao apos a outra por chave, sem
// dependencia nova. A cadeia segue mesmo se uma reacao falhar (roda a proxima).
const filasContato = new Map<string, Promise<unknown>>();

function enfileirar<T>(chave: string, tarefa: () => Promise<T>): Promise<T> {
  const anterior = filasContato.get(chave) ?? Promise.resolve();
  const resultado = anterior.then(tarefa, tarefa);
  const marcador = resultado.then(
    () => {
      if (filasContato.get(chave) === marcador) filasContato.delete(chave);
    },
    () => {
      if (filasContato.get(chave) === marcador) filasContato.delete(chave);
    },
  );
  filasContato.set(chave, marcador);
  return resultado;
}

// Monta os dados do evento a partir do cartao.
function dadosDoContato(contato: Contato): DadosEventoLocal {
  const inicio = new Date(contato.proximoContato as string);
  const fim = new Date(inicio.getTime() + DURACAO_MIN * 60 * 1000);
  const partes: string[] = [];
  if (contato.empresa) partes.push(`Empresa: ${contato.empresa}`);
  if (contato.telefone) partes.push(`Telefone: ${contato.telefone}`);
  if (contato.email) partes.push(`E-mail: ${contato.email}`);
  partes.push("Compromisso criado pelo VKOS Hub a partir do CRM.");
  return {
    titulo: `Proximo contato: ${contato.nome}`,
    descricao: partes.join("\n"),
    inicioIso: inicio.toISOString(),
    fimIso: fim.toISOString(),
  };
}

// Cria ou atualiza o evento local de um cartao. Devolve "criado", "atualizado",
// "removido" ou null quando nao ha o que fazer. Vinculo apontando pra evento que
// sumiu (id orfao) e recriado e revinculado.
async function upsertContato(
  workspaceId: string,
  contato: Contato,
): Promise<"criado" | "atualizado" | "removido" | null> {
  const eventoId = lerVinculo(workspaceId, contato.id);

  if (!contato.proximoContato) {
    // Data limpa: remove o evento vinculado, se houver. Tira o vinculo ANTES do
    // evento: a leitura de config descarta vinculo orfao, entao remover o evento
    // primeiro deixaria o removerVinculo sem o que gravar.
    if (eventoId) {
      removerVinculo(workspaceId, contato.id);
      await removerEventoLocal(workspaceId, eventoId);
      return "removido";
    }
    return null;
  }

  const dados = dadosDoContato(contato);
  if (eventoId) {
    const atualizado = await atualizarEventoLocal(workspaceId, eventoId, dados);
    if (atualizado) return "atualizado";
    // Evento sumiu: limpa o vinculo orfao e recria abaixo.
    removerVinculo(workspaceId, contato.id);
  }
  const criado = await criarEventoLocal(workspaceId, dados);
  definirVinculo(workspaceId, contato.id, criado.id);
  return "criado";
}

async function removerDoContato(workspaceId: string, contatoId: string): Promise<void> {
  const eventoId = lerVinculo(workspaceId, contatoId);
  if (!eventoId) return;
  // Vinculo antes do evento: a leitura de config descarta vinculo orfao, entao a
  // ordem inversa deixaria o vinculo pendurado no arquivo.
  removerVinculo(workspaceId, contatoId);
  await removerEventoLocal(workspaceId, eventoId);
}

// Sincroniza todos os cartoes do workspace ativo que tem proximo contato. Usada
// ao LIGAR a opcao na tela. Devolve o resumo pro usuario ver.
export async function sincronizarTudo(
  workspaceId: string,
): Promise<{ criados: number; atualizados: number; erros: number }> {
  const resumo = { criados: 0, atualizados: 0, erros: 0 };
  const estado = lerEstadoCrm();
  for (const contato of estado.contatos) {
    if (!contato.proximoContato) continue;
    try {
      const feito = await upsertContato(workspaceId, contato);
      if (feito === "criado") resumo.criados += 1;
      if (feito === "atualizado") resumo.atualizados += 1;
    } catch (erro) {
      resumo.erros += 1;
      console.error("[calendario] falha ao sincronizar cartao:", (erro as Error).message);
    }
  }
  return resumo;
}

// Reage a um evento do CRM vindo do barramento. Silencioso quando a sincronizacao
// do CRM esta desligada. Nao exige Google: modo local funciona sozinho. A reacao
// roda serializada por workspaceId+contatoId pra nunca duplicar evento nem deixar
// vinculo orfao numa corrida. Exportada pra testar a serializacao sem barramento.
export async function reagir(evento: EventoDominio): Promise<void> {
  const workspaceId = evento.workspaceId;
  if (!workspaceId) return;
  if (!lerConfigCalendario(workspaceId).sincronizarCrm) return;

  const contato = evento.dados.contato as Contato | undefined;
  if (!contato || typeof contato.id !== "string") return;

  const chave = `${workspaceId}::${contato.id}`;
  await enfileirar(chave, async () => {
    if (evento.tipo === "crm:contato-excluido") {
      await removerDoContato(workspaceId, contato.id);
      return;
    }
    await upsertContato(workspaceId, contato);
  });
}

// Assina o barramento. Chamar UMA vez no boot. Erro de sincronizacao vira log,
// nunca derruba o server nem os outros assinantes.
export function iniciarSincronizacaoCalendario(): void {
  const tipos = [
    "crm:contato-criado",
    "crm:contato-atualizado",
    "crm:contato-movido",
    "crm:contato-excluido",
  ];
  for (const tipo of tipos) {
    assinar(tipo, (evento) => {
      void reagir(evento).catch((erro) => {
        console.error("[calendario] sincronizacao falhou:", (erro as Error).message);
      });
    });
  }
}
