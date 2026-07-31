# O CRM é único do Hub, no nível CORE

## Contexto

O CRM nasceu escopado por cliente: cada workspace tinha o seu `crm.json` em `app/dados/workspaces/<id>/`. Sem cliente aberto a tela não abria, e respondia 409 "Nenhum cliente ativo. Abra um workspace pra usar o CRM."

Isso descreve errado o que o CRM é. Ele é o funil comercial de quem usa o Hub para vender, não do cliente atendido. Nenhum workspace de cliente vai ter CRM. Na prática o dono via um funil diferente a cada troca de cliente, e um pedaço do próprio funil sumia quando nenhum cliente estava aberto.

A hora era esta: a base tinha zero contatos. Depois, a mesma mudança custaria migração de risco com histórico de conversa dentro.

## Decisão

O CRM passou para `app/dados/crm/`, com os mesmos quatro arquivos: `crm.json`, `interacoes.jsonl`, `estagios.jsonl`, `recuperacoes.jsonl`. A pasta não depende de workspace nenhum, então existe sempre. O erro 409 por falta de cliente ativo deixou de existir em todo o módulo.

Na primeira leitura, se o `crm.json` do CORE ainda não existe, o que ficou nos workspaces é fundido num só (`server/src/crm/fusao.ts`), com regras fechadas:

- Os workspaces são percorridos em ordem de id. Sem ordem estável, o resultado muda a cada execução e não dá para testar.
- Coluna funde por nome normalizado (minúsculo, sem acento, sem espaço nas pontas). A primeira ocorrência vence e mantém o id; as outras viram apelido dela, e todo contato que apontava para o id perdedor é remapeado para o vencedor. A ordem é recalculada em sequência no fim.
- Id repetido entre clientes (contato, negócio, orçamento, tarefa, coluna, organização, linha de histórico) é renomeado no segundo, com sufixo do workspace de origem, e toda referência é atualizada junto: `negocio.contatoId`, `tarefa.contatoId`, `tarefa.negocioId`, `orcamento.negocioId`, `interacao.contatoId`, `registroEstagio.contatoId`.
- `workspaceOrigemId` é preservado em todo contato, e preenchido com o workspace de origem quando vem vazio.
- Contato duplicado NÃO é fundido. Cada suspeita (mesmo telefone normalizado ou mesma `chaveExterna`) vira uma linha em `app/dados/crm/duplicatas-da-fusao.jsonl`, com os dois ids, o que bateu e de qual cliente cada um veio.
- Histórico primeiro, `crm.json` depois. Uma queda no meio repete a fusão sem duplicar nada.
- Depois de fundir, cada arquivo de origem é renomeado para `<nome>.migrado-para-core-<carimbo>`, por rename, com os bytes intactos. Nada é apagado, nunca.

Evento de CRM sai do barramento com `workspaceId` vazio, que passou a significar escopo CORE, o Hub inteiro.

Na tela, o CRM perdeu a key por workspace no Shell: trocar de cliente não remonta mais o CRM. Mover a tela do CRM para o menu do CORE é fase seguinte e ficou de fora desta rodada.

## Por quê

**Por que não fundir contato duplicado automaticamente.** O mesmo cliente pode existir em dois workspaces com o mesmo telefone. Fundir sozinho parece limpeza, mas é destruição irreversível: some nome, tag, negócio e interação de um dos lados, e o usuário não fica sabendo. E o palpite erra: dois contatos com o mesmo telefone podem ser duas pessoas do mesmo escritório. O custo de errar para cada lado não é o mesmo. Não fundir custa uma linha repetida no quadro, que o usuário resolve em dois cliques. Fundir errado custa dado que não volta. Por isso os dois ficam vivos e a suspeita vira anotação, com a decisão na mão de quem sabe.

**Por que o evento sai com workspaceId vazio.** Carimbar o cliente aberto seria mentira: o movimento não é dele, e o log de auditoria daquele cliente receberia contato que não tem nada a ver com ele. Inventar um workspace "core" seria pior, porque criaria uma pasta de cliente falsa em `app/dados/workspaces/`. O preço da escolha é que evento de CRM não entra em nenhum `eventos.jsonl` por cliente. Dá para pagar: o histórico do CRM já é permanente e mora no `interacoes.jsonl` e no `estagios.jsonl`, e o log de eventos hoje não tem leitor nenhum.

**Por que renomear a origem em vez de apagar.** O guarda da fusão é a existência do `crm.json` do CORE, então o rename não é o que impede a repetição. Ele existe para o original continuar em disco, alcançável, se algo aparecer fora do lugar depois.
