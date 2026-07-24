# Cockpit, Cérebro e Fontes de dados são uma feature só

## Contexto

O catálogo do 3.0 nasceu com Cockpit, Cérebro e Fontes de dados como features separadas, com dependências entre elas e três interruptores na Administração. No uso real, liberar Cockpit sem Cérebro não faz sentido (a cerimônia é a porta de entrada do workspace) e Fontes de dados é insumo dos dois.

## Decisão

As três viram uma feature única com id `cockpit` (nome "Cockpit"), cobrindo canvas, sessões, Cérebro, cerimônia e fontes de dados. `criador-visual`, `site-guiado` e `ide` passam a depender de `cockpit`. Workspaces e modelos existentes migram por união (tinha qualquer uma das três ativa, fica com `cockpit` ativa), sem descarte. Plano de execução em `planos/vkos-3-nucleo-e-rotas/`.

## Por quê

- Menos interruptores no admin, menos combinações quebradas possíveis (Cockpit sem Cérebro era um estado inválido oferecido pela interface).
- O modelo mental do produto é "o núcleo do workspace": identidade, conversa e insumos juntos.
- A unificação obriga a rederivar o gate de rotas do catálogo, fechando de quebra o bypass de entitlement achado na revisão de segurança de 2026-07-22.
