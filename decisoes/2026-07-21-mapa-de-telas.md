# Mapa de Telas: segunda visão do Mapa

## Contexto
O Jesse vai reescrever o design do app e precisa ver todas as telas, rotas e estados de ponta a ponta, com a jornada e a conexão entre cada uma, num lugar só. Também serve de prova visual da profundidade da arquitetura. A navegação do Hub é por estado e hash (rotas.ts, Shell.tsx), não por router de página.

## Decisão
1. Nasce uma segunda visão dentro do Mapa, com seletor "Sistema | Telas". A visão Sistema continua idêntica. A visão Telas é um espelho: um nó por tela, rota ou estado, em zonas, com ligações rotuladas pelo gesto e jornadas selecionáveis.
2. O dado vive em interno/mapa-telas.json, curado à mão, validado por Zod no server e servido em GET /api/mapa/telas. Mesmo padrão do mapa do sistema: editável sem rebuild, opcional por instalação.
3. O detalhe visual de cada nó é um mini-esqueleto desenhado em CSS por token, nunca screenshot.
4. O botão Abrir navega por hash (window.location.hash), o mesmo caminho do Voltar do navegador. Destinos parametrizados (studio, site, fonte) resolvem pela peça ou fonte mais recente do cliente ativo; sem candidato, o botão desabilita com o motivo.
5. Puramente visual: nada aqui muda o comportamento real de navegação, rota ou estado. Grafo estático e leve de nascença (sem animação contínua, onlyRenderVisibleElements).

## Por quê
Reusa a receita que já provou funcionar (mapa do sistema): dado em interno/, rota validada, React Flow. Navegar por hash não toca no Shell nem inventa API de navegação, então o espelho não vira acoplamento. Esqueleto CSS em vez de screenshot evita peso, manutenção manual e quebra nos três temas. O JSON curado com um teste de round-trip contra rotas.ts trava se alguém renomear uma rota, então o mapa não passa a mentir. Repetir nós nas jornadas é aceito de propósito: o objetivo é didática, não pureza de grafo.
