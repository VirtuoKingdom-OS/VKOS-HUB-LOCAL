# CRM ao vivo, e o stream das sessões com escopo no servidor

## Contexto

Duas coisas do mesmo barramento estavam erradas, em direções opostas.

O CRM não assinava o WebSocket. Duas abas divergiam e só F5 corrigia. Nada avisava ninguém.

O stream das sessões avisava demais. `sessoes/gerenciador.ts` usava `transmitir` (broadcast para todos) carimbando `workspaceId` dentro do payload, e quem filtrava era o frontend. Isso vale para `sessao:status`, `sessao:conferencia`, `sessao:ferramenta` e principalmente `sessao:evento`, que repassa o stream cru do provedor: o Cérebro do cliente, o texto da resposta e trechos de arquivo lido. Na prática, qualquer aba recebia o stream de qualquer cliente, e a proteção era o frontend se comportar.

`transmitirPara` e `clientesNoWorkspace` existiam desde a rodada anterior, escritos para o CRM. Com o CRM subindo para o nível CORE, ficaram sem chamador nenhum.

## Decisão

**O CRM avisa, e o aviso é notificação, não dado.** Toda gravação bem sucedida solta `{ tipo: "crm:atualizado", escopo, contatoId?, origem? }` e quem recebe refaz o fetch. É o mesmo padrão do `pecas:atualizadas`. Nenhum dado de contato viaja pelo socket.

O aviso sai de um hook `onResponse` dentro do plugin de rotas do CRM, não de cada rota. `POST /leads/importar` avisa por fora, porque cria contato sem passar por lá.

O envio é `transmitir`, para todas as abas. O CRM é do CORE: é o mesmo funil para qualquer aba do dono, então `transmitirPara` filtraria por um workspace que o CRM não tem mais.

**O escopo separa duas leituras, não uma tela.** `funil` relê `GET /crm`. `interacoes` relê `GET /crm/interacoes/ultimas` e a linha do tempo daquele contato. `origem` é o id da aba que gravou, que ela mesma manda no cabeçalho `x-vkos-aba` e recebe de volta no aviso.

**Recarga não atropela quem está escrevendo.** A tela guarda a recarga e só aplica quando não há campo de texto do CRM em foco nem gravação da própria aba no ar. Adiar nunca perde a pendência. A recarga de fundo nunca passa pelo estado de carregamento da tela.

**O stream das sessões passou para `transmitirPara`.** O servidor decide quem recebe, pelo `workspaceId` que a mensagem já carregava. A aba declara o cliente em `?workspace=<id>` no upgrade e redeclara por mensagem `{ tipo: "workspace", workspaceId }` quando troca, sem derrubar a conexão. `workspace:ativado`, `pecas:atualizadas`, `cerebro:atualizado` e `crm:atualizado` continuam em broadcast: são do Hub inteiro.

## Por quê

**Por que não um `crm:atualizado` seco.** Um aviso único é simples e sempre correto, mas obriga a tela inteira a reler o funil a cada gravação, e a ficha grava a cada campo que perde o foco. As duas linhas do CRM que crescem sem teto são lidas por caminhos diferentes: o funil no `crm.json` e o histórico no `interacoes.jsonl`. Registrar interação, que é o caso mais frequente, só toca o histórico. Separar os dois troca a leitura cara pela barata onde importa, e ainda diz de qual contato a linha do tempo mudou, então ficha aberta de outro contato não relê nada.

**Por que a aba que gravou não recarrega.** Ela já aplicou a mudança com a resposta do próprio PATCH. Recarregar por causa do próprio eco é trabalho jogado fora a cada tecla salva, e abre uma janela para a leitura passar na frente da escrita e devolver o valor velho para o campo.

**Por que adiar em vez de recarregar e reconciliar.** O pior resultado possível é o usuário escrevendo na ficha e a tela trocando o texto por baixo dele. Nenhuma atualização vinda de outra aba vale isso. Esperar o campo liberar custa segundos e não custa nada mais.

**Por que o escopo do stream é do servidor.** Filtro no cliente não é filtro: é combinação. O byte já saiu pelo socket, e qualquer aba com o console aberto lê o Cérebro do cliente que ela não abriu. Levar a decisão para o servidor não muda uma linha do que a tela mostra, e fecha o furo.

**Por que a declaração anda por mensagem, e não só na URL.** A aba conecta antes de saber qual cliente está ativo, porque o boot ainda está buscando a lista. E trocar de cliente não pode derrubar o socket: os eventos da janela de reconexão se perderiam. As duas pernas são necessárias, e a redeclaração acontece de novo em todo `onopen`, então a reconexão devolve o escopo sozinha.
