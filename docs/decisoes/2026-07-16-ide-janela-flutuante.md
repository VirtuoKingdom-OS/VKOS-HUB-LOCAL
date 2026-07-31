# VKOS-IDE como janela flutuante

## Contexto

A IDE universal vivia centralizada sobre um véu e usava media queries da viewport, embora a área real fosse menor por causa da sidebar.

## Decisão

A IDE vira janela sem véu, arrastável pela barra, minimizável para barra + chat e persistida em `localStorage` na chave `vkos-ide-janela`. A camada deixa cliques passarem para o app. `ResizeObserver` mede a área disponível e define as faixas responsivas do próprio painel.

Árvore e editor permanecem montados ao minimizar. Em largura compacta, a janela ocupa toda a camada, usa abas e desativa arrasto e minimização.

## Por quê

O comportamento corresponde ao papel de comando universal, preserva o trabalho em andamento e elimina a diferença entre largura da viewport e largura realmente disponível.
