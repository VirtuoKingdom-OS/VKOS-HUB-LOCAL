# Mapa do sistema com dados fora do pacote

## Contexto

O Jesse precisa enxergar a arquitetura do Hub de forma didática. O pacote do cliente leva o código-fonte de `app/`, então esconder os dados do mapa por flag de build ainda entregaria a descrição interna.

## Decisão

1. Os nós e ligações vivem em `interno/mapa-sistema.json`, na raiz do desenvolvimento e fora de `app/`.
2. O servidor lê o arquivo a cada `GET /api/mapa`. Ausente ou inválido responde `disponivel: false`.
3. A Sidebar só mostra Mapa quando a API confirma o dado. O frontend distribuível é apenas um visualizador genérico de nós.
4. O Mapa é read-only e nenhum sistema depende dele para funcionar.
5. A skill `/atualizar` confere se o arquivo continua refletindo os módulos reais.

## Consequência

O desenvolvimento ganha uma visão viva da arquitetura sem flag especial e sem levar seu conteúdo para o pacote do cliente.
