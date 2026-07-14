# Skill /atualizar adaptada pro braço de desenvolvimento

## Contexto

A skill `/atualizar` existe no produto VKOS (lado cliente): reconcilia o Cérebro, o design-guide e a
marca com a realidade das peças. O Jesse pediu ela aqui no desenvolvimento do Hub pra otimizar custo
e contexto. Copiar crua não servia: ela aponta pra Cérebro, marca e LEIA que não existem neste
workspace.

## Decisão

Criar uma versão adaptada em `.claude/skills/atualizar/SKILL.md` deste projeto. Mesma lógica
(atualizar o que mudou, enxugar o peso morto, sempre com o Jesse aprovando), mas apontando pros
arquivos que a sessão lê aqui: `contexto/` (visao, arquitetura, roadmap, ecossistema), `decisoes/`,
`CLAUDE.md`, `app/CONTRATO.md` e a memória. A realidade a cruzar é o código em `app/`, não o Cérebro
de um cliente. A fonte da verdade de cada decisão é o arquivo em `decisoes/`; roadmap e arquitetura
só apontam.

## Por quê

O contexto do desenvolvimento é lido em toda sessão. Quando o roadmap diz "em execução" numa fase já
fechada, ou o CONTRATO cita um módulo removido, cada sessão paga token lendo mentira e ainda corre o
risco de refazer discussão fechada. Um comando de faxina periódica mantém o contexto fiel e leve,
que é gastar menos e errar menos. Escrita seguindo a regra do projeto: sem travessão.
