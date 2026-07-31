# Eventos + Google Calendar: visão de produto

## A ideia central

O pedido do Jesse não é "um card de Google Calendar em Conexões". É um sistema onde o que acontece dentro do hub dispara coisas fora dele. Exemplo dele: o CRM evolui, e mover um cartão gera automaticamente o compromisso no Google Calendar.

Então este plano entrega duas coisas, nesta ordem de importância:

1. **O barramento de eventos interno**: o hub passa a anunciar o que acontece nele (cartão do CRM criado, movido, peça criada, sessão concluída). É a fundação. Amanhã o WhatsApp, o Instagram e qualquer integração nova plugam nesse mesmo barramento.
2. **O Google Calendar como primeiro consumidor**: conexão da conta do Google pelo app, ferramentas de agenda pras sessões de IA (via MCP), e automações determinísticas (quando X acontecer no CRM, criar evento na agenda, sem gastar sessão de IA).

## Como o usuário vive isso

- **Conexões**: card novo "Google Calendar". Em vez de colar token, tem o botão "Conectar": abre o navegador na tela de autorização do Google, o usuário aceita, volta pro app conectado. Status mostra a conta conectada e o desconectar.
- **Sessões de IA**: com a conexão ligada, qualquer sessão do cockpit e da IDE ganha as ferramentas de agenda (listar, criar, atualizar, excluir eventos). "Agenda uma reunião com a cliente do cartão tal na quinta às 14h" passa a funcionar.
- **Automações**: tela nova, simples, com regras "quando <gatilho> então <ação>". Primeira leva de gatilhos: cartão do CRM entra em coluna específica, cartão criado. Primeira ação: criar evento no Google Calendar com título e descrição por template ({{nome}}, {{empresa}}, {{coluna}}...). Toda regra tem o modo ensaio: mostra o que faria sem criar nada de verdade.
- **CRM**: o cartão ganha o campo opcional "Próximo contato" (data e hora). É ele que dá a data do evento criado pela automação. Cartão sem data não gera evento cego: a automação registra a pendência e mostra no histórico.

## Decisões de produto (fechadas neste plano)

### 1. Barramento primeiro, integração depois

A automação nunca chama o CRM direto nem o CRM chama o Google direto. O CRM anuncia o evento no barramento; a automação escuta e age. Por quê: cada integração nova (WhatsApp na fase 7) vira só um novo tipo de ação, sem mexer nos módulos existentes.

### 2. Automação determinística não gasta IA

Criar evento na agenda a partir de uma regra é chamada de API direta, sem sessão do Claude. IA é pra quando há linguagem natural envolvida (a sessão do cockpit usando as ferramentas MCP). Por quê: automação que gasta token a cada cartão movido não escala e o Jesse paga a conta.

### 3. Servidor MCP próprio, não da comunidade

O hub embute um servidor MCP fininho de Google Calendar em vez de usar um da comunidade via npx. Por quê: os da comunidade gerenciam a própria autenticação (segunda tela de OAuth, arquivos de token próprios espalhados), quebrando o padrão do hub de segredo único e local em conexoes.json. O nosso lê o mesmo token da conexão e expõe as ferramentas. Uma autorização só, dois consumidores (sessões via MCP e automações via API direta).

### 4. O que fica de fora desta rodada

- Sincronização de volta (evento criado na agenda aparecendo no hub). Só hub -> agenda por enquanto.
- Outros gatilhos além do CRM e outras ações além do Calendar (a arquitetura já nasce pronta pra eles, mas a UI da primeira rodada é enxuta).
- Agendamento por horário (cron interno). Gatilho é evento de domínio, não relógio.
- Google Ads e Meta (fase 7 do roadmap).

## Critério de fechamento

O Jesse conecta a conta dele pelo card, cria a regra "quando cartão entrar em Fechado, criar evento no dia do próximo contato", move um cartão de teste com data preenchida e o evento aparece na agenda do Google dele. E uma sessão do cockpit consegue listar a agenda da semana quando ele pede.
