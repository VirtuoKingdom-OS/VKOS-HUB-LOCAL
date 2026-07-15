# WhatsApp local: riscos, honestidade e mitigações

Este arquivo existe pra decisão consciente. O Jesse pesquisou o tema na rodada 16 (ver contexto/fase7-meta-plano.md pro caminho oficial); aqui fica o retrato honesto do caminho local.

## O que este plano usa e o que isso significa

O acesso total local usa o protocolo do WhatsApp Web (a mesma via que o WhatsApp Web do navegador usa), por uma biblioteca não oficial (Baileys). Isso:

- **Viola os termos de serviço do WhatsApp.** Ferramentas como o wacrm que "prometem zero risco" usam exatamente essa via; a promessa deles é marketing, não garantia.
- **Tem risco de banimento do número.** Real, porém assimétrico: o WhatsApp bane por COMPORTAMENTO (spam, massa, denúncias), não por detectar a biblioteca em si. Atendimento 1:1 respondendo quem chamou primeiro é o perfil de menor risco que existe. Zero não é; baixo é.
- Não tem custo por mensagem, não precisa de servidor, e dá o que a API oficial não dá: o número inteiro, com histórico, dentro do hub local.

## O que aumenta o risco de ban (e o produto evita por decisão)

1. Mensagem em massa e listas de transmissão: NÃO EXISTEM no produto. Nem como opção escondida.
2. Iniciar conversa com quem nunca falou com o número: os agentes NUNCA iniciam conversa. Só respondem.
3. Número novo com volume súbito: número recém-criado disparando é o padrão clássico de ban.
4. Muitas denúncias "bloquear e denunciar" de quem recebe.
5. Ritmo de robô: rajadas instantâneas, 24/7, sem pausa. O motor tem debounce, "digitando..." e ritmo humano por decisão.

## Mitigações práticas (ordem do que fazer)

1. **Começar com um número secundário de teste.** Chip barato, WhatsApp comum, parear no hub, usar uns dias, validar tudo. Só depois parear número real de operação.
2. Número real: usar um número MADURO (com histórico de uso normal), não um recém-ativado.
3. Modo rascunho primeiro (é o padrão do produto): humano aprova tudo até confiar no agente.
4. Limites configurados: respostas seguidas e por dia por conversa. Não desligar os guardrails.
5. O celular continua com o app normal (o hub é só mais um aparelho conectado). Se o hub cair, nada se perde: está tudo no celular.
6. Backup da caixa: a pasta `app/dados/workspaces/<id>/whatsapp/` é o histórico local; entra em qualquer rotina de backup da máquina.

## Se o número for banido

- O WhatsApp oferece pedido de revisão dentro do próprio app (casos de atendimento legítimo costumam voltar, sem garantia).
- O plano B documentado continua de pé: a API oficial da Meta (contexto/fase7-meta-plano.md), sem risco de ban, com custo por conversa fora da janela de 24h e webhook via túnel. A arquitetura deste plano isola o transporte justamente pra essa troca não reescrever a caixa nem os agentes.

## Posição recomendada

Pro estágio atual (operação própria da VK e primeiros clientes, atendimento 1:1, sem massa), o caminho local é o que entrega a visão com custo zero e risco administrado. Quando o volume crescer ou o número virar ativo crítico de um cliente pagante, reavaliar a migração do transporte pra API oficial: é o gatilho de revisão desta decisão.
