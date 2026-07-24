# VKOS 3.0, Gemini como motor padrão e correção do admin

Plano criado em 2026-07-23. Execução por IA. Diagnóstico feito no código e no servidor rodando. Decisão de produto registrada em `decisoes/2026-07-23-gemini-motor-padrao.md`.

## Frente 1: não existe cliente Sem IA, Gemini é o padrão

O VKOS é um OS de IA. "Sem IA" não é um estado de produto válido pra um cliente. Todo workspace nasce com Gemini.

1. **Motor padrão Gemini na criação**: em `admin.ts`, ao criar workspace (e ao criar modelo), o motor padrão passa a ser `gemini`, não `nenhum`. O `nenhum` deixa de ser oferecido na interface de criação.
2. **`nenhum` some da seleção de cliente**: no catálogo de motores da tela de detalhe (`MOTORES` em `TelaAdmin.tsx`), ficam só Gemini e Claude Team. Sem opção "Sem IA".
3. **Estado interno de contingência, não escolha**: `nenhum` continua existindo no banco só como estado de contingência (credencial do Claude Team caiu e não há Gemini configurado), nunca como opção que o Jesse seleciona. Quando cai nesse estado, o cliente vê "IA em manutenção", e o CORE avisa. Não é um botão.
4. **Migração dos existentes**: workspaces e modelos hoje com `motor = 'nenhum'` migram pra `gemini` (migration idempotente). O `cli01` de teste hoje está `nenhum`; passa a `gemini`.
5. **Gemini disponível de fábrica**: como o Gemini é bancado centralmente pelo Jesse (service account do projeto no motor), selecionar Gemini não depende de credencial por cliente. Um workspace novo já nasce operante assim que o projeto Vertex estiver configurado no ambiente.

Fecha quando: criar um cliente já vem com Gemini, a interface não oferece "Sem IA" em lugar nenhum, e os workspaces antigos migram pra Gemini.

## Frente 2: a tela Meu Claude e a aba Acesso quebradas

### Causa raiz confirmada (as duas têm a mesma origem)

O middleware de autorização (`plataforma/autorizacao.ts`) monta o contexto do operador local, mas o `negar()` só roda quando `autenticacaoObrigatoria()` é verdadeiro (hub ou produção). No modo local **não roda** o `negar`, então o operador local passa. O problema não é o gate. O problema é registro de rota:

- `GET /api/admin/meu-claude`, `POST /api/admin/meu-claude/testar`, `.../convites` e `.../membros` respondem `{"erro":"rota nao encontrada"}` mesmo com o server novo. Rodei os quatro no servidor de pé: `meu-claude` **agora responde** (o GPT corrigiu o registro dela nesta última rodada), mas `convites` (GET) e `membros` **não existem como rota GET**: o `admin.ts` só tem `POST /admin/workspaces/:id/convites` (linha 443). Não há `GET` de convites nem nenhuma rota de membros. A aba Acesso do front chama endpoints que o servidor não expõe, recebe 404, o componente estoura e cai no error boundary ("essa tela encontrou um problema").
- O `/api/admin/motores` responde **503** ("O acesso interno ao motor ainda não foi configurado") porque no ambiente local o `MOTOR_URL` não aponta pra um motor de pé. O front trata isso com `.catch(() => null)` no `recarregar` (linha 67), então isso sozinho não derruba, mas confirma que a tela depende do motor pra estados completos.

### Correções

1. **Rota Meu Claude**: confirmar que `GET /api/admin/meu-claude` e `POST /admin/meu-claude/testar` estão registradas e respondendo nos dois cenários (com e sem Claude instalado). No servidor atual já respondem; garantir que o build servido e o front batem, e que o "rota não encontrada persistindo nas outras abas" (o aviso que fica preso) é limpo ao trocar de aba (`setErro("")` ao mudar de aba, hoje o erro só limpa dentro de `executar`).
2. **Aba Acesso**: criar as rotas que faltam no `admin.ts`:
   - `GET /admin/workspaces/:id/convites`: lista convites pendentes do workspace (email, expira_em, usado).
   - `GET /admin/workspaces/:id/membros`: lista os logins de cliente daquele workspace (email, status, último acesso).
   - Ações que a tela precisa: revogar convite, remover membro, derrubar sessões do cliente (já existe suspender workspace).
   Cada uma auditada, só no `MODO=core`, operador apenas.
3. **Erro não pode derrubar a aba inteira**: a aba Acesso deve tratar falha de carregamento parcial (um endpoint 404/503 mostra estado vazio digno naquela seção, não quebra a tela). O error boundary é a última linha, não a primeira; a tela carrega cada bloco com seu próprio try e EstadoVazio/EstadoErro local.
4. **Aviso preso entre abas**: ao trocar de aba (sistema e de cliente), limpar `erro` e `aviso`. Hoje um erro de uma aba persiste visível nas outras.

Fecha quando: Meu Claude abre e testa sem erro, a aba Acesso lista convites e membros e permite revogar, trocar de aba limpa avisos, e nenhum 404/503 de um bloco derruba a tela toda.

## Frente 3: regressão e contexto

- `npm run checar`, `npm run testar`, `npm run build -w web` verdes. O `smoke:nuvem` precisa ser atualizado pro fluxo local sem TOTP (ele quebrou na última validação por presumir bootstrap obrigatório): ou detecta `obrigatoria: false` e pula o login, ou roda só contra o hub. Deixar o smoke verde de novo faz parte desta frente.
- Testes novos: criação de workspace nasce com `gemini`; interface não oferece `nenhum`; `GET` de convites e membros retornam o esperado; troca de aba limpa aviso.
- Atualizar `interno/mapa-sistema.json`, `contexto/arquitetura.md`, `app/CONTRATO.md`, CHANGELOG e o plano `vkos-3-motores-e-vps` (marcar Gemini como padrão).

## Ordem

1. Frente 2 (rotas faltantes e robustez do admin): destrava o uso agora.
2. Frente 1 (Gemini padrão): decisão de arquitetura.
3. Frente 3 (regressão e smoke).

## Regras para quem executa

As da casa: português brasileiro, sem travessão e sem ponto centrado, cor só por token nos dois temas, NUNCA commit sem ordem do Jesse, dado real é sagrado, credencial nunca em log nem em resposta (só os quatro últimos caracteres), o hub jamais executa IA local. Ambiente local: Postgres via `docker compose -f docker-compose.dev.yml up -d`, CORE 4600, hub 4601, motor 4700 quando for testar o caminho de cliente com IA.

## Estado da execução em 2026-07-23

Concluído no repositório:

- Migration 004 torna Gemini o default, migra modelos e workspaces antigos em `nenhum` e acrescenta id revogável aos convites.
- Criação de workspace sempre inicia em Gemini. A Administração oferece somente Gemini e Claude Team; o estado interno `nenhum` aparece como IA em manutenção.
- Rotas CORE de listagem e revogação de convites, listagem e remoção de membros e encerramento de sessões estão registradas e auditadas.
- A aba Acesso carrega convites e membros separadamente, permite as ações administrativas e preserva a tela quando um bloco falha. Trocas de aba limpam erro e aviso anteriores.
- Smoke local detecta autenticação não obrigatória e valida Gemini, convites, membros, remoção e isolamento de feature.
- `npm run checar`, 212 testes, `npm run build -w web`, build da imagem Docker, migration nova e legada e smoke ponta a ponta ficaram verdes.
