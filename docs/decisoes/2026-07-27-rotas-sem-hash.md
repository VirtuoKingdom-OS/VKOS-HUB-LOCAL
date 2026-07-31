# Rotas sem hash: o endereço passa a ser um caminho de verdade

## Contexto

Todo endereço do Hub saía na forma `<endereço>/#/<rota>`. Abrir o CRM mostrava
`http://localhost:4600/#/crm`. O Jesse apontou isso como defeito: não parece um
app, parece uma página dos anos 2000.

A escolha original foi por comodidade. Roteamento por hash não precisa de nada
do servidor: o navegador guarda tudo depois do `#` e nunca manda pra ele, então
F5 em qualquer tela funciona sem configurar rota nenhuma. O preço era o
endereço.

Havia vinte pontos no código escrevendo `window.location.hash = "#/algo"`, mais
três links `<a href="#/algo">`, mais a tela de setup, que decidia por regex
sobre o hash, mais a tela do Mapa, que tinha o próprio resolvedor de destino.

## Decisão

O Hub roteia por caminho, com a History API. `/crm`, não `/#/crm`.

Três peças sustentam isso:

1. `web/componentes/layout/rotas.ts` gera e lê caminho. `telaParaCaminho` e
   `caminhoParaTela` são inversas, e o teste trava isso.
2. `server/src/spa.ts` decide quem recebe a casca do app quando o caminho não
   existe em disco. Só navegação: método GET ou HEAD, `Accept` de HTML, fora dos
   prefixos do servidor, e sem cara de arquivo. Rota de API que não existe
   continua 404 em JSON.
3. `irParaCaminho` dispara um evento próprio, porque `pushState` não avisa
   ninguém sozinho. No tempo do hash isso era de graça, o `hashchange` fazia.

Endereço antigo com hash continua sendo lido. `caminhoParaTela("/#/crm")` dá
`crm`, e o Shell reescreve a barra de endereço uma vez, em silêncio. Quem tinha
favorito salvo não cai no Dashboard por engano.

## Por quê

O motivo do hash era não precisar do servidor. Mas o Hub é local-first e sempre
tem servidor: o Fastify já está no ar, servindo o frontend buildado. A condição
que justificava a escolha nunca existiu aqui.

O `setNotFoundHandler` não pode devolver o index pra tudo. Se devolvesse, um
`GET /api/coisa-que-nao-existe` viraria HTML, e o frontend quebraria tentando
ler JSON de um `<!doctype`. O erro apareceria três camadas longe da causa. Por
isso a decisão de quem merece a casca mora num módulo separado, com seis testes,
incluindo o de que `/apiario` não é `/api`.
