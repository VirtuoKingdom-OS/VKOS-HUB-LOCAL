# O conflito entre webhook do WhatsApp e local-first

## Contexto

A Cloud API do WhatsApp entrega mensagem recebida **só por webhook**, para uma URL pública com HTTPS e certificado válido. Não existe polling. Certificado autoassinado não serve.

O primeiro princípio do produto é local-first: roda na máquina do usuário, nada hospedado, nenhum dado sai da máquina.

Os dois não convivem sem uma escolha explícita. Um servidor em `127.0.0.1` não é alcançável pela Meta.

## Decisão

**A decisão da integração fica adiada, e registrada como adiada.** O que se decide agora é só isto: o chat desta rodada não depende dela.

O módulo de mensagens nasce com um contrato de canal, espelhando o contrato de provedor de IA que já existe em `app/server/src/provedores/contrato.ts` e que já provou no repositório que dá para trocar o motor sem tocar no núcleo. O canal `manual` é a implementação da v1. Qualquer canal real entra atrás do mesmo contrato, sem reescrever o núcleo.

Quando a integração for encarada, as três saídas possíveis são:

1. **Túnel na máquina do usuário** (Cloudflare Tunnel, ngrok). Mantém o dado local, mas exige que o usuário configure um túnel, o que fere "funciona para leigo total, de fábrica".
2. **Relay mínimo hospedado pela VK**, que só repassa o webhook para a máquina do usuário. Quebra "nada hospedado" e cria custo de infraestrutura e responsabilidade sobre dado de terceiro em trânsito.
3. **Coexistence com sincronização pelo app do celular**, sem webhook, aceitando o atraso e a limitação que isso impõe.

Nenhuma é gratuita. Escolher agora, sem o chat existir e sem uso real, seria decidir no escuro.

## Por quê

O valor do chat não depende da integração. Um prestador solo que registra a conversa no lugar certo já ganha: o histórico fica junto do funil, a conversa se liga ao negócio, e a linha do tempo do cliente deixa de morar na cabeça dele.

Construir o canal `manual` primeiro prova a modelagem, a persistência e o tempo real com risco zero de token, de conformidade e de banimento. Se a modelagem estiver errada, o erro aparece com dez conversas de teste, não com o histórico real do negócio dentro.

E a decisão de infraestrutura fica para quando existir uso real para justificá-la, com o custo de cada saída medido contra um produto que já funciona, em vez de contra uma hipótese.
