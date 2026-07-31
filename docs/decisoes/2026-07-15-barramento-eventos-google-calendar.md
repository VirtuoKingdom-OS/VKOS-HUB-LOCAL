# Barramento de eventos interno e Google Calendar como primeiro consumidor

## Contexto

O Jesse pediu a conexão MCP com o Google Calendar, mas o pedido real era maior: um sistema onde o que acontece no hub dispara integrações externas (exemplo dele: o CRM move um cartão e o compromisso nasce na agenda). Plano completo escrito em docs/planos/google-calendar/ e executado em 2026-07-15.

## Decisão

1. Barramento de eventos interno (server/src/eventos/barramento.ts): o hub anuncia o que acontece nele (crm:contato-criado, crm:contato-movido, crm:contato-atualizado, peca:criada, sessao:concluida), com log auditável por workspace em eventos.jsonl. Integrações novas assinam o barramento, nunca chamam módulos entre si.
2. Google Calendar em três frentes: OAuth loopback feito pelo próprio app (token só em conexoes.json local), servidor MCP próprio embutido (server/src/google/mcp-calendar.ts, 5 ferramentas de agenda pras sessões via montarConfigMcp) e automações determinísticas (server/src/automacoes/, tela #/automacoes) com regras "quando evento então criar evento na agenda", templates, modo ensaio e histórico.
3. Automação determinística não gasta IA: a ação chama a API do Google direto. O cartão do CRM ganhou o campo proximoContato, que é a data do compromisso criado.
4. Servidor MCP próprio em vez de servidor da comunidade: uma autorização só, o mesmo token local, dois consumidores (sessões e automações).

## Por quê

- O barramento é a fundação que o WhatsApp e o Instagram (fase 7) vão plugar sem mexer nos módulos existentes.
- Automação por regra que gastasse sessão de IA a cada cartão movido não escala em custo.
- Servidores MCP da comunidade gerenciam a própria autenticação e espalham token; o próprio lê a conexão local única.
- Rascunho de regra nasce desligado e cancelamento apaga o rascunho (QA de 2026-07-15): o executor lê as regras ativas do disco a cada evento, regra pela metade não pode disparar.
