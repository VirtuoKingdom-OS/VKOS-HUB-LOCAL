# Otimização de tokens: opções A + B aprovadas

## Contexto

Um carrossel em Haiku custou $0.21 com 505k tokens de entrada. Diagnóstico: cada turno relê o contexto fixo inteiro (prompt do Claude Code, CLAUDE.md, skill, Cérebro, catálogo de estilos). Cerca de 90% é cache, bem mais barato, mas o painel somava tudo como "entrada". Um turno de "obrigado" custou $0.065, 32% da sessão, sem produzir nada.

Cinco opções foram apresentadas: A (painel honesto), B (caminho rápido nas skills), C (montagem mecânica de HTML), D (geração em lote), E (Agent SDK).

## Decisão

Implementar A + B agora:

- A: capturar e exibir o split real de tokens (entrada nova, escrita de cache, leitura de cache, saída) por sessão e no acumulado.
- B: quando o estilo do carrossel já vem escolhido pelo app (ex: "usando o modelo vkos02"), a skill pula a leitura do catálogo de estilos e lê só o template escolhido.

C fica como segundo passo se o custo ainda incomodar. E (Agent SDK) fica como fundação da fase 5 do roadmap, quando o app for empacotado pra clientes.

## Por quê

A não tem risco nenhum e mata o susto dos números (painel dizia 505k de entrada quando a entrada nova real era uma fração). B corta 30 a 40% do custo por fluxo sem comprometer o resultado, porque o catálogo só serve pra escolher estilo, e o estilo já foi escolhido na interface. E é o maior ganho estrutural, mas o esforço é de dias e o retorno imediato por esforço é menor que A+B.
