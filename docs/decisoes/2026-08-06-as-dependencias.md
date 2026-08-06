# As dependências com aviso de segurança

## Contexto

A auditoria de 2026-08-06 rodou `npm audit --omit=dev` e achou 8 vulnerabilidades
nas dependências de produção: 5 altas e 3 moderadas. Duas eram diretas.

O contexto pesava a favor da calma, e vale registrar: o servidor só escuta em
127.0.0.1, tem guarda de Host contra DNS rebinding e o CORS está preso na origem
do Vite. O vetor é estreito. Isso justificava não ter pressa, não justificava
ficar parado.

## Decisão

**O `@modelcontextprotocol/sdk` foi removido, não atualizado.**

Ele estava declarado em `server/package.json` e **não era importado em lugar
nenhum**. A config MCP que o Hub monta é JSON escrito à mão em
`server/src/conexoes/mcp.ts`, sem SDK. Ele arrastava `@hono/node-server`, `hono`
e `ip-address` junto, então tirar ele sozinho fechou 4 dos 8 avisos.

**O `@fastify/static` subiu de 8.3.0 para 10.1.2**, e isso é salto de major.
Ele carregava quatro avisos altos, três deles de travessia de caminho e bypass
de guarda de rota, e é o pacote que serve o `web/dist`. Não havia correção
dentro do 8.x.

As transitivas (`brace-expansion`, `fast-uri`, `find-my-way`, e o `postcss` do
lado de desenvolvimento) fecharam com `npm audit fix`, sem `--force`.

Resultado: **zero vulnerabilidades**, em produção e em desenvolvimento.

## O que o major quebrou, e era uma coisa só

Do `@fastify/static` 10 em diante, o primeiro argumento de `setHeaders` é a
`FastifyReply`, e não mais o `ServerResponse` cru. `res.setHeader(...)` virou
`resposta.header(...)`, em `server/src/index.ts`. O typecheck pegou na hora.

## Por que a conferência foi na porta, e não só no teste

O que este pacote faz não aparece em teste de unidade: ele é cabeçalho de cache,
resolução de caminho e o encaixe com o `setNotFoundHandler` que devolve a casca
do app. Então a prova foi num servidor de verdade, em porta isolada:

| o quê | resultado |
|---|---|
| `GET /` | 200, `cache-control: no-cache` |
| `GET /assets/<hash>.js` | 200, `public, max-age=31536000, immutable` |
| `GET /crm` com `Accept: text/html` | 200, casca do app, `no-cache` |
| `GET /assets/nao-existe.js` | 404 com `{erro}`, e não a casca |
| `GET /../../../package.json` | 403 |
| `GET /..%2f..%2f..%2fpackage.json` | 404 |
| `GET /%2e%2e/%2e%2e/package.json` | 403 |

O `logo.png`, que mora na raiz do `dist` e não em `assets/`, continua saindo com
`no-cache`, que é o certo: o nome dele não muda quando o arquivo muda.

## Uma armadilha que custou uma volta

`npm audit fix --omit=dev` **poda as dependências de desenvolvimento**. O build
da web morreu com "vite não é reconhecido" logo depois. `npm install` devolve
tudo. Quem repetir isso em outra rodada não precisa descobrir de novo.
