# Cockpit web local, sem Electron

## Contexto
A fase 0 previa uma janela Electron. O Jesse definiu dois públicos: quem usa pelo navegador e quem usa pelo VSCode. E o MVP precisa abrir caminho pra virar SaaS depois.

## Decisão
Backend local em Node (Fastify) rodando na máquina do usuário. Frontend React servido no navegador via localhost. Electron descartado por ora.

## Por quê
O mesmo frontend serve os dois públicos hoje (navegador puro e webview do VSCode) e o SaaS amanhã: basta trocar onde o backend roda, de local pra nuvem. O navegador não acessa arquivos do PC, mas o backend local acessa tudo e o browser só consome a API. Menos atrito que manter um shell nativo.
