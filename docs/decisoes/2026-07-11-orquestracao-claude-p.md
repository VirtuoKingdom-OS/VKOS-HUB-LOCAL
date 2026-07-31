# Orquestração via claude -p headless

## Contexto
Duas opções na arquitetura: spawnar o binário `claude -p` com stream-json, ou usar o Claude Agent SDK em TypeScript.

## Decisão
`claude -p --output-format stream-json` via child_process, cada sessão um processo filho com cwd na pasta do VKOS. Retomada com `--resume <session_id>`. Máximo de 5 sessões simultâneas.

## Por quê
Reusa a instalação e a auth do CLI que o usuário já tem, sem gerenciar chave de API. Espelha o que o Jesse já faz na mão. O cwd na pasta do VKOS faz o CLAUDE.md de lá garantir a leitura do Cérebro, sem injetar contexto na mão. Migrar pro Agent SDK só quando controle fino de custo ou permissão virar dor real.
