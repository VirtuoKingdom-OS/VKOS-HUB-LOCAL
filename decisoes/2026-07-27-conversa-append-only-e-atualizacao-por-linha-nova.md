# Conversa append-only, e atualização de mensagem por linha nova

## Contexto

A thread de uma conversa cresce sem teto e mora em `app/dados/crm/mensagens/conversas/<id>.jsonl`, um arquivo por conversa, que só recebe linha nova. Isso resolve o custo de escrita e limita o estrago de uma linha corrompida a uma mensagem.

Só que duas coisas do WhatsApp real precisam mudar uma mensagem depois de gravada:

1. O status de uma mensagem enviada muda por callback do provedor, de `na-fila` para `entregue` e depois `lida`, minutos depois da gravação.
2. Marcar a conversa como lida muda o estado de várias mensagens de entrada de uma vez.

Um arquivo append-only não deixa alterar linha. As saídas eram: reescrever o arquivo inteiro na mudança de status, guardar status fora do histórico, ou aceitar que o status congela no que foi gravado.

## Decisão

**A versão nova da mensagem entra como uma linha nova e completa, com o mesmo `id`.** A leitura colapsa por `id`, a última linha vence e a posição da primeira é mantida. Quem grava a versão nova preserva `id`, `enviadaEm` e `criadaEm` da original: muda só o que mudou de fato.

**O "eu já li" não é da mensagem, é da conversa.** Marcar como lida zera `naoLidas` e move `lidasAte` no índice, e não toca no arquivo da thread. O campo `lidaEm` da mensagem fica reservado para o que ele significa na plataforma: o contato leu o que eu mandei, confirmado pelo provedor.

**Uma conversa por contato e por canal.** Pedir de novo a conversa de um contato que já tem uma devolve a que existe, com 200 em vez de 201.

## Por quê

**Por que não reescrever o arquivo.** Reescrever é a operação que este desenho existe para evitar: cada confirmação de entrega reescreveria a conversa inteira, e uma queda no meio da reescrita levaria o histórico junto. Linha nova é O(1) e nunca coloca o que já está gravado em risco.

**Por que não guardar status fora do histórico.** Um arquivo separado de status seria uma segunda verdade sobre a mesma mensagem, e as duas divergiriam na primeira falha parcial. O `payloadBruto` e o status precisam viajar juntos, porque é a mesma resposta do provedor.

**Por que colapsar na leitura e não na escrita.** Colapsar na escrita é compactar, e compactar é reescrever. A leitura já percorre o arquivo inteiro para montar a thread, então o colapso custa um `Map` e nada mais. Se um dia uma thread ficar grande o bastante para doer, a compactação entra como manutenção explícita, nunca no caminho de uma mensagem chegando.

**Por que o cursor de leitura fica na conversa.** "Eu já li" é estado do dono, não fato da mensagem. Guardar por mensagem obrigaria a regravar dezenas de linhas ao abrir uma conversa, que é a ação mais frequente do produto inteiro. O cursor também é o que a tela usa para desenhar a linha de "novas mensagens" no lugar certo.

**Por que a conversa é reusada.** Duas conversas do mesmo contato no mesmo canal são duas caixas de entrada para o mesmo cliente, que é a doença que este módulo existe para curar. Reusar é a única resposta coerente com a regra de que conversa não existe sem contato.
