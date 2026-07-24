# VKOS 3.0, núcleo unificado, cerimônia no hub e URLs limpas

Plano criado em 2026-07-23. Execução por IA. Três frentes com diagnóstico feito no código. Decisão de produto registrada em `decisoes/2026-07-23-feature-nucleo-unificada.md`.

## Frente 1: a cerimônia do Cérebro funcionando no hub

### Diagnóstico confirmado

A cerimônia (`CerimoniaCerebro.tsx` linha 124) cria a sessão com `prompt: "/instalar"` e `skill: "instalar"`. No 2.x isso funciona porque o provedor Claude roda `claude -p` dentro da pasta do workspace e o CLI resolve a skill `.claude/skills/instalar/`. No hub, `sessoesNuvem.ts` repassa o pedido pro motor, e o Gemini recebe a string literal `/instalar` sem o conteúdo da skill: ele não tem como saber o que isso significa. A entrevista nunca acontece. Além disso, com motor `nenhum`, o POST `/sessoes` devolve 409 e a cerimônia não trata o erro.

### Correção

1. **O motor resolve skills.** Quando a sessão traz `skill`, o servidor (sessoesNuvem, antes de chamar o motor) lê o arquivo da skill na pasta do workspace (`.claude/skills/<skill>/SKILL.md`, que a semente vkos2 já leva) e monta o pedido real: instruções da skill + pedido do usuário. O motor recebe prompt completo, nunca um comando de barra cru. Vale pra qualquer skill, não só a instalar (site e carrossel vão precisar do mesmo caminho).
2. **Prompt de barra nunca chega cru no motor.** Se o pedido começa com `/` e a skill não existe na pasta do workspace, a sessão falha cedo com mensagem clara, sem gastar token.
3. **Estados honestos na cerimônia**: motor `nenhum` mostra "A IA deste workspace ainda não foi ativada, fale com quem gerencia seu VKOS" em vez de quebrar. Erro do motor aparece como estado com botão de tentar de novo.
4. A cerimônia grava o Cérebro pelo mesmo caminho de hoje (o turno termina e o front recarrega o Cérebro). Conferir que a skill instalada na semente escreve no lugar certo da pasta do cliente e que o streaming de turnos flui pelo WS do hub.

Fecha quando: num workspace de cliente com Gemini configurado, a entrevista roda de ponta a ponta, o Cérebro é gravado e a celebração aparece; com motor `nenhum`, a tela explica em vez de quebrar.

## Frente 2: Cockpit, Cérebro e Fontes de dados viram uma feature só

### O que muda

Hoje são três entradas no catálogo (`cockpit`, `cerebro`, `fontes`), com dependências entre elas e três interruptores no admin. Viram **uma feature** com id `cockpit` (nome "Cockpit", descrição "Canvas, sessões, Cérebro e fontes de dados do workspace"). O Cérebro e as Fontes são o combustível do Cockpit, não faz sentido liberar separado.

1. **Catálogo** (`features/catalogo.ts`): remover `cerebro` e `fontes`; `cockpit` absorve as telas (`cockpit`, `fontes`, `fonte`) e as rotas (`/api/canvas`, `/api/sessoes`, `/api/vkos/cerebro`, `/api/contextos`, `/api/anexos`). Dependências: `criador-visual`, `site-guiado` e `ide` passam a depender de `cockpit`.
2. **Migração de dados**: em `features_workspace` e nos `features_json` dos modelos, quem tinha `cerebro` ou `fontes` ativas passa a ter `cockpit` ativa (união, sem descarte). Migração SQL idempotente numa migration nova, mais a normalização ao ler modelos antigos.
3. **Admin**: um interruptor só. `featureDoPedido` em `sessoesNuvem.ts` continua mapeando skill desconhecida pra `cockpit`.

### Aproveitar pra fechar o achado da revisão de segurança

A revisão de 2026-07-22 confirmou (média, 8/10): o mapa `featureDaRota` em `plataforma/autorizacao.ts` é um allow-list de 8 prefixos que já divergiu do catálogo, deixando `/api/vkos/cerebro`, `/api/vkos/pecas`, `/api/anexos` e `/api/contextos` sem gate de feature no hub (cliente com a feature desligada continua usando a API). Como esta frente mexe exatamente nesse mapa:

1. **Derivar o mapa rota > feature de `CATALOGO_FEATURES[].rotasApi`**, eliminando o allow-list manual. Default-deny: toda rota `/api/` que pertence a uma feature exige a feature ativa; a isenção é uma lista pequena e explícita de rotas de sistema (auth, saúde, plataforma, features-ativas, workspaces).
2. Teste de regressão: pra cada feature do catálogo, cliente com a feature desligada recebe 404 em todas as `rotasApi` dela.

Fecha quando: o admin mostra um interruptor só pro núcleo, workspaces e modelos antigos migram sem perda, e o teste de gate por catálogo passa pra todas as features.

## Frente 3: URLs limpas, sem `#`

### Diagnóstico

Toda navegação do app usa hash (`dominio/#/crm`, `dominio/#/admin`), herança do 2.x servindo arquivo estático. Pro produto na nuvem a URL fica amadora e o Jesse pediu rota limpa (`dominio/crm`).

### Correção

1. **Front**: migrar a gramática de rotas (`componentes/layout/rotas.ts`) de hash pra caminho real com History API (`pushState` + evento `popstate`). A gramática `telaParaHash`/`hashParaTela` vira `telaParaCaminho`/`caminhoParaTela` mantendo os mesmos ids de tela e o teste de round-trip (que já cobre todos os destinos) atualizado junto. Links, convites (`/entrar?token=...`) e o Shell trocam de `window.location.hash` pra navegação por caminho.
2. **Servidor**: fallback de SPA no Fastify: qualquer GET que não seja `/api/*`, `/assets/*` ou arquivo existente devolve o `index.html`. Nos dois modos. Cuidado com as rotas de preview de site que já servem conteúdo próprio: elas têm precedência sobre o fallback.
3. **Compatibilidade**: URL antiga com `#/rota` redireciona pra rota limpa no boot do app (uma linha no bootstrap lendo `location.hash`). Convites antigos continuam funcionando.
4. **Mapa de telas**: `interno/mapa-telas.json` e a TelaMapaTelas usam os caminhos novos. O teste de round-trip do mapa acompanha.
5. **Dev**: o proxy do Vite continua cobrindo `/api`; conferir que o dev server do Vite faz o fallback de história (`appType: "spa"` já resolve).

Fecha quando: navegar pelo app inteiro gera URLs limpas, F5 em qualquer rota funda funciona nos dois modos, convite abre pela URL nova, URL velha com `#` redireciona, e os testes de rota e do mapa passam.

## Ordem de execução

1. Frente 2 primeiro (catálogo, migração, gate default-deny): é a base que as outras tocam.
2. Frente 1 (cerimônia e skills no motor).
3. Frente 3 (URLs limpas), por último, porque toca o app inteiro e precisa das outras estáveis pra regressão fazer sentido.

Cada frente fecha com `npm run checar`, `npm run testar`, `npm run build -w web` e `npm run smoke:nuvem` verdes. A frente 3 atualiza o smoke se ele referenciar URLs com hash (o token de convite é lido de `convite.url`, conferir o formato novo).

## Regras para quem executa

As da casa: português brasileiro, sem travessão e sem ponto centrado, cor só por token nos dois temas, NUNCA commit sem ordem do Jesse, dado real é sagrado, testes novos pra comportamento novo, atualizar `interno/mapa-sistema.json`, `interno/mapa-telas.json`, `contexto/arquitetura.md`, `app/CONTRATO.md` e CHANGELOG ao fechar. Ambiente local: Postgres via `docker compose -f docker-compose.dev.yml up -d`, CORE 4600, hub 4601 (README, seção Desenvolvimento).
