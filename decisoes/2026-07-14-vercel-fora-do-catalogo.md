# Vercel sai do catálogo de conexões

## Contexto

Na rodada 10 a entrada da Vercel entrou no catálogo como indisponível, com nota honesta: o servidor MCP oficial deles (mcp.vercel.com) só autentica por OAuth de navegador, sem token fixo, o que não funciona no nosso spawn headless do Claude CLI.

## Decisão

Remover a Vercel do catálogo por completo, por ordem do Jesse em 2026-07-14. Sem card, sem promessa.

## Por quê

Card de coisa que não dá pra ligar é ruído. Se a Vercel um dia aceitar token fixo, a entrada volta (o comentário no catalogo.ts guarda o caminho).
