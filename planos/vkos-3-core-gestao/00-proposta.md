# VKOS HUB CORE como painel de gestão, proposta completa

Proposta criada em 2026-07-23, escrita como desenho de engenharia sênior com segurança embutida. **APROVADA pelo Jesse em 2026-07-23: liberada pra execução nas 4 fases do fim do documento.** A direção geral está em `decisoes/2026-07-23-core-painel-de-gestao.md`; este documento é o desenho concreto do painel novo e o contrato de execução.

## O erro de arquitetura que estamos corrigindo

O CORE de hoje é o shell de criação do 2.x com uma aba de Administração pendurada. A home diz "Olá, o que vamos criar hoje?" (`TelaDashboard.tsx` linha 133), a sidebar tem um seletor de "Cliente" (`Sidebar.tsx` linha 115) que duplica o que a Central de operação já faz, e todo o layout empurra pra criação. Só que criação é a experiência do **workspace** (a que o cliente recebe). O CORE é outra coisa: o painel de onde o Jesse **gerencia a operação inteira**.

A separação certa:

- **Experiência de workspace** (criação): dashboard criativo, cockpit, CRM, calendário, studio, sites. É o que o cliente vê no hub, montada por features. É também o que o Jesse vê **quando entra num workspace** (dele ou de cliente).
- **Experiência de gestão** (o CORE): clientes, modelos, motores, consumo, auditoria, sistema. Nada de "o que vamos criar".

Hoje as duas estão misturadas num shell só. A proposta separa em dois shells sobre o mesmo código de features.

## O novo CORE, área por área

### 1. Painel (a home nova)

A primeira tela ao abrir o CORE. Visão da operação em uma dobra:

- **Indicadores**: clientes ativos e suspensos, consumo de IA do mês (total e por motor), sessões rodando agora.
- **Alertas acionáveis** (a parte mais importante): credencial de Claude Team em manutenção, orçamento de workspace estourando, workspace suspenso, Meu Claude deslogado, Vertex não configurado, backup atrasado. Cada alerta com link direto pra ação.
- **Atividade recente**: os últimos eventos relevantes da auditoria (logins de clientes, features alteradas, sessões caras), filtráveis.

Sem métrica de vaidade. Se o número não leva a uma ação, não entra.

### 2. Clientes

A Central de operação atual, promovida a área principal: lista de clientes, detalhe com Features, Acesso, Consumo, motor, limites. Ganha o botão **"Entrar no workspace"** (ver seção 4).

### 3. Modelos

Como hoje: as receitas de workspace. Sem mudança além do visual de gestão.

### 4. Estúdio (os workspaces do Jesse) e entrada em workspace

O seletor de "Cliente" na sidebar morre. No lugar, entrada **explícita** em workspace:

- **Estúdio**: área que lista os workspaces internos do Jesse (ojessegomes, estudio-aura, vkos). Clicar em um abre a **experiência de workspace completa** (a mesma do cliente, com todas as features), rodando com o Claude do Jesse. É onde ele continua criando carrossel, site e operando o CRM dele. Nada da capacidade atual se perde; ela muda de porta.
- **Entrar num workspace de cliente**: pelo detalhe do cliente, ação "Entrar no workspace" com aviso claro ("Você vai operar o workspace do cliente X") e auditoria. Dentro, a mesma experiência de workspace, montada pelas features **daquele** cliente.
- **Barra de contexto**: dentro de qualquer workspace, uma barra fixa discreta: "Workspace: X" e "Voltar ao painel". Impossível não saber onde está. Sair devolve pro CORE.

Regra de motor dentro de workspace (segurança e billing limpos):

- Workspace interno do Jesse: Claude pessoal dele (como hoje).
- Workspace de cliente aberto como operador: **o motor do cliente via broker** (Gemini ou Claude Team do cliente), nunca o Claude pessoal. O que o Jesse fizer ali consome como o cliente consumiria e fica medido no workspace certo. Sem caminho de código que leve a credencial pessoal dele pra dentro de workspace de cliente.

### 5. Sistema

Agrupa o que é da plataforma: Meu Claude (status, teste, login VPS), Segurança (senha, TOTP opcional, sessões ativas), Mapa do sistema e Mapa de telas (internos, nunca em workspace nenhum), Auditoria completa, Consumo global com corte por workspace e por motor.

### A sidebar nova do CORE

```
Painel
Clientes
Modelos
Estúdio
Sistema (Meu Claude, Segurança, Mapa, Auditoria, Consumo)
```

Cinco entradas. Sem seletor de workspace, sem dashboard criativo, sem CRM/calendário soltos no menu do CORE (eles vivem dentro dos workspaces, onde fazem sentido).

## O que muda no código (visão técnica)

1. **Dois shells sobre o mesmo código**: `ShellGestao` (novo, o CORE) e o Shell de workspace atual (que já é o do hub). O Shell de workspace passa a ser montado por features em todos os casos; a única diferença entre Jesse e cliente é o conjunto de features e o motor.
2. **Contexto de workspace explícito, não ambiente**: hoje o workspace ativo é estado global escolhido no seletor. Passa a ser um estado de "sessão de trabalho" aberto ao entrar e fechado ao sair, sempre visível na barra de contexto. Elimina a classe inteira de bug "fiz a ação no workspace errado".
3. **Rotas**: `/` abre o Painel; `/clientes`, `/modelos`, `/sistema/...`; `/estudio` lista; `/w/<workspace>/...` é a experiência de workspace (mesma gramática pro hub, que já vive nela por padrão). Atualizar gramática, testes de round-trip e mapa-telas.
4. **Permissões** (`permissoes.ts`): o hub não muda nada. No CORE, `telaPermitida` ganha a distinção shell de gestão x shell de workspace; as telas de gestão nunca existem em rota de workspace.
5. **Onboarding**: o gate atual de onboarding criativo sai do CORE (vai pra dentro do workspace, onde a cerimônia mora).

## Segurança, requisitos do redesenho

1. **Separação de superfícies**: rotas de gestão (`/api/admin`, telas de gestão) continuam operador-somente e fora do bundle de decisão do hub. Nenhuma tela de gestão renderiza dentro de contexto de workspace.
2. **Entrada em workspace de cliente é evento de auditoria** com id do operador, workspace, hora de entrada e saída.
3. **Motor por contexto, verificado em teste**: teste automatizado de que sessão criada dentro de `/w/<cliente>` usa o broker com o motor do cliente, e que o provedor local (Claude pessoal) é inalcançável nesse caminho, mesmo em `MODO=core`.
4. **Mapa e internos**: `mapa` e afins continuam fora de qualquer rota de workspace, inclusive pro operador dentro de `/w/...` (gestão só no shell de gestão).
5. **Sem regressão de isolamento**: os testes de isolamento existentes (A contra workspace de B, path traversal, feature desligada 404) rodam intactos; a mudança é de interface e contexto, não de autorização de API.
6. **Sessões e CSRF**: cookies como estão (httpOnly, SameSite=Lax); a troca de contexto de workspace não cria token novo nem relaxa nada.

## O que explicitamente NÃO muda

- O hub do cliente: já é a experiência de workspace montada por features. Ganha só a consistência de rota (`/w/...` interna ou raiz direto, a definir na execução; o cliente tem um workspace só e não precisa ver o prefixo).
- As features em si (cockpit, criador visual, site, CRM, calendário, IDE).
- O motor, o cofre, a plataforma, o banco.
- Os dados de nenhum workspace.

## Fases de execução (após o aval)

1. **Fase 1, ShellGestao e Painel**: shell novo com sidebar de 5 entradas, home Painel com indicadores, alertas e atividade (dados que já existem: workspaces, consumo_ia, auditoria, meu-claude). Clientes, Modelos e Sistema migram pro shell novo (as telas já existem, mudam de casa).
2. **Fase 2, Estúdio e entrada em workspace**: seletor sai da sidebar; Estúdio lista os workspaces internos; "Entrar no workspace" nos clientes com auditoria e barra de contexto; rotas `/w/...`.
3. **Fase 3, motor por contexto**: sessões em workspace de cliente aberto pelo operador vão pro broker com o motor do cliente; teste que prova que o provedor local é inalcançável nesse caminho.
4. **Fase 4, limpeza e contexto**: saudação criativa e onboarding saem do CORE, mapa-telas e mapa-sistema atualizados, gramática de rotas com round-trip verde, CLAUDE.md, CONTRATO, arquitetura e CHANGELOG em dia, screenshots das telas novas nos dois temas e três larguras.

Critério final: o Jesse abre o CORE e vê a operação (não um estúdio); cria e gerencia clientes na área Clientes; entra no workspace dele pelo Estúdio e cria como sempre criou; entra no de um cliente com aviso e auditoria; e o cliente não percebe mudança nenhuma além de melhorias.

## Regras pra execução

As da casa, sem exceção: português brasileiro, sem travessão e sem ponto centrado, cor só por token nos dois temas, NUNCA commit sem ordem do Jesse, dado real é sagrado, evidência visual pra mudança de UI, testes novos pra comportamento novo. Cada fase fecha com `npm run checar`, `npm run testar`, `npm run build -w web` e o smoke verdes. Ambiente local: Postgres via `docker compose -f docker-compose.dev.yml up -d`, CORE 4600, hub 4601.
