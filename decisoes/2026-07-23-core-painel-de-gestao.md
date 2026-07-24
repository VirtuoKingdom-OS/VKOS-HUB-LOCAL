# O CORE é painel de gestão, não estúdio de criação

## Contexto

O CORE do 3.0 herdou o shell de criação do 2.x: home "o que vamos criar hoje", seletor de workspace de cliente na sidebar e layout inteiro voltado a criar peças. No uso real o Jesse apontou o erro: criação é a experiência do workspace (a que o cliente recebe e a que ele usa dentro dos workspaces dele). O CORE é o painel de gestão da operação inteira do VKOS HUB.

## Decisão

1. O CORE vira painel de gestão: Painel (visão da operação), Clientes, Modelos, Estúdio (workspaces do Jesse) e Sistema.
2. O seletor de "Cliente" sai do menu do CORE. Workspace de cliente se cria e gerencia na área Clientes; entrar num workspace (do Jesse ou de cliente) é ação explícita com barra de contexto e auditoria.
3. A experiência de criação vive só dentro de workspace, montada por features, igual pra Jesse e cliente. Dentro de workspace de cliente, o motor é sempre o do cliente via broker, nunca o Claude pessoal do Jesse.
4. Mapa e telas internas de gestão nunca aparecem em contexto de workspace, pra ninguém.

O desenho completo do painel novo está em `planos/vkos-3-core-gestao/00-proposta.md`, aprovado pelo Jesse em 2026-07-23.

## Por quê

- O seletor da sidebar duplicava a Central de operação e mantinha o risco de agir no workspace errado sem perceber.
- Um painel de gestão responde "como está minha operação", não "o que vamos criar": os dois papéis exigem layouts diferentes.
- Contexto de workspace explícito (entrar e sair) é mais seguro e mais claro que estado global ambiente.
