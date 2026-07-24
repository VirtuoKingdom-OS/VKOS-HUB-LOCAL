# Conexões vivem no Sistema do CORE

## Contexto

As conexões externas (GitHub, Netlify, Notion, Google Calendar, Apify) nasceram como tela de workspace, com um `conexoes.json` por cliente. Depois da rodada que transformou o CORE em painel de gestão, o item Conexões ficou órfão: escondido dentro dos workspaces e sem casa na gestão. E todas as cinco conexões do catálogo são contas do próprio Jesse, nenhuma tem natureza por cliente.

## Decisão

As conexões são do sistema, não de workspace. A tela mora em Sistema, no painel de gestão do CORE (`/sistema/conexoes`). O armazenamento é central, em `app/dados/conexoes.json`, e a primeira leitura migra os arquivos antigos por workspace (começando pelo ativo, o primeiro servidor encontrado de cada id vence). Todos os consumidores (calendário, publicação, sessões MCP, leads) leem o estado central sem mudar de assinatura. Remover um workspace não revoga mais o Google, porque o token é central e sobrevive ao workspace. No hub, cliente segue sem acesso a conexões; o caminho continua sendo o cofre central com credencial por workspace via motor.

## Por quê

As contas são do operador e valem pra operação inteira: configurar uma vez e todo estúdio usar é o comportamento esperado. Manter cópias por workspace multiplicava segredo em disco e criava o risco real de a exclusão de um workspace revogar um token que os outros ainda usavam.
