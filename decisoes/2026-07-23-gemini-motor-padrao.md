# Gemini é o motor padrão: não existe cliente Sem IA

## Contexto

O 3.0 nasceu com três motores por workspace: `gemini`, `claude_team` e `nenhum` (Sem IA). No uso real, o Jesse apontou que "Sem IA" não faz sentido como opção de produto: o VKOS é vendido como um OS de IA, todo cliente que paga tem IA por padrão.

## Decisão

1. Todo workspace de cliente nasce com **Gemini** como motor, bancado centralmente pelo Jesse via Vertex.
2. A opção "Sem IA" (`nenhum`) sai da interface: não é oferecida na criação nem na seleção de motor do cliente.
3. `nenhum` sobrevive só como estado interno de contingência (a credencial do Claude Team caiu e não há Gemini configurado), nunca como escolha. Nesse estado o cliente vê "IA em manutenção" e o CORE é avisado.
4. Workspaces e modelos existentes com `nenhum` migram para `gemini`.

## Por quê

- O produto é um OS de IA; entregar um workspace sem IA seria entregar um casco vazio.
- Gemini bancado centralmente já é o caminho mais simples e permitido; usá-lo como padrão remove uma decisão desnecessária do Jesse a cada cliente.
- Claude Team continua disponível como upgrade para o cliente que tem conta própria.
