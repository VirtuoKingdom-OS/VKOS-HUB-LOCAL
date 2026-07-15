# Fechamento do MVP local: arquitetura

## Mapa do terreno (o que existe hoje, verificado em 2026-07-15)

Fatos do código que este plano usa como base. Reconfira cada um antes de mexer.

- **Monorepo**: `app/` com workspaces npm `server` (Fastify + tsx) e `web` (React + Vite). Scripts principais em `app/package.json`: `dev` (concurrently server+web), `build` (build do web), `start` (tsx do server). O server serve `app/web/dist` na porta 4600 quando o dist existe (`app/server/src/index.ts`).
- **Motor de sessão**: `app/server/src/sessoes/gerenciador.ts`. O método `iniciar()` spawna o binário do claude com os args: `-p --output-format stream-json --verbose --include-partial-messages --permission-mode <acceptEdits|bypassPermissions>`, mais `--model <alias>` (opus/sonnet/haiku), `--resume <sessionId>` nas continuações, `--mcp-config <arquivo>` quando há conexões habilitadas, e `--allowedTools` variádico no fim. O prompt vai por stdin (nunca por argumento, por causa das aspas no shell do Windows). O stdout é parseado linha a linha como JSON e cada evento é repassado CRU pro frontend via WebSocket (`transmitir({tipo: "sessao:evento", id, workspaceId, evento})`). O gerenciador também interpreta eventos pra: status da sessão, ferramentas usadas (blocos `tool_use` dos eventos `assistant`), resultado final e custo (evento `result`, campo de custo em dólares), e captura do `session_id` pro resume.
- **Detecção do claude**: `app/server/src/ambiente/deteccao.ts`. Acha o binário (com override pela env `VKOS_CLAUDE_BIN`), cacheia por 5 minutos, expõe pra rota `GET /ambiente`.
- **Config global do app**: `app/server/src/config/estado.ts` persiste `app/dados/config-app.json` (hoje só `modeloPadrao`: opus/sonnet/haiku).
- **Onboarding existente**: `app/server/src/ambiente/rotas.ts` detecta o ambiente e abre o seletor NATIVO de pasta do Windows (PowerShell FolderBrowserDialog) pro usuário apontar a pasta VKOS do cliente. O hub NÃO cria a pasta VKOS: ele aponta pra uma que já existe (o produto VKOS que o cliente recebeu). Isso não muda neste plano.
- **Workspaces**: cada workspace do hub guarda estado em `app/dados/workspaces/<id>/` e aponta pra pasta VKOS do cliente (`app/server/src/vkos/estado.ts`, `obterPastaVkos`). As sessões rodam com `cwd` na pasta do cliente, onde vivem `CLAUDE.md`, `.claude/skills/`, `cerebro/`, `templates/` etc.
- **Prompts dos fluxos**: os fluxos guiados montam prompts que mandam a sessão LER arquivos da pasta do cliente (ex: `app/web/src/componentes/criacao/promptSite.ts` manda ler `cerebro/cerebro.md`, `.claude/skills/site/SKILL.md`, `templates/site/principios-visuais.md`). Esse padrão de "leia o arquivo e siga" é neutro de provedor e é a razão de as skills funcionarem em qualquer motor. A cerimônia do Cérebro é a exceção: ela invoca a skill por comando (`/instalar`), sintaxe que só o Claude Code entende (ver peça 4).
- **Frontend**: consome os eventos crus do stream-json do claude. Os pontos de consumo precisam ser mapeados na M1 (grep por `sessao:evento` e pelos campos `type`, `subtype`, `delta`, `tool_use`, `result` em `app/web/src/`).

## Peça 1: o contrato de provedor (`app/server/src/provedores/`)

Módulo novo. Três arquivos:

- `contrato.ts`: os tipos. Interface `ProvedorIA` com, no mínimo:
  - `id`: `"claude" | "codex"`.
  - `detectar(): Promise<DeteccaoProvedor>` (instalado? versão? logado? binário?). Com overrides por env: `VKOS_CLAUDE_BIN` (já existe) e `VKOS_CODEX_BIN` (novo).
  - `modelos(): OpcaoModelo[]` (alias, rótulo humano, observação de custo). A lista de modelos de cada provedor vive AQUI, num lugar só.
  - `iniciarSessao(opcoes): ProcessoSessao`. Opções: `pastaTrabalho`, `prompt`, `modelo` (alias do provedor), `permissao` (`"padrao" | "total"`), `retomada?` (id de sessão anterior), `mcp?` (config de conexões, pode ser ignorada pelo provedor que não suporta, com aviso no evento de início).
  - `ProcessoSessao`: emissor de eventos normalizados + `parar()`.
- `claude.ts`: o provedor Claude (peça 2).
- `codex.ts`: o provedor Codex (peça 3).

**O dialeto de eventos é o do Claude.** Decisão de menor raio de explosão: o frontend inteiro já entende o stream-json do claude. Em vez de inventar um formato neutro e reescrever o frontend, o contrato congela o SUBCONJUNTO de eventos que o frontend realmente consome (mapear na M1 e documentar no `app/CONTRATO.md`), e cada provedor emite NESSE dialeto. O provedor claude repassa quase cru (já é o dialeto). O provedor codex TRADUZ os eventos dele pra esse subconjunto. Campos esperados no mínimo: evento de início com `session_id`, eventos de texto parcial (deltas), eventos `assistant` com blocos `tool_use` (nome da ferramenta), evento `result` com texto final e custo (`total_cost_usd` ou o campo que o mapeamento da M1 confirmar), evento de erro.

O `gerenciador.ts` para de conhecer o binário do claude: ele pede ao provedor ativo (`obterProvedorAtivo()`, peça 5) um `ProcessoSessao` e segue tratando eventos como hoje. A fila, os status, os custos e o WebSocket não mudam.

## Peça 2: provedor Claude (refatoração sem mudança de comportamento)

Extrair de `gerenciador.ts` pra `provedores/claude.ts`: a localização do binário, a montagem dos args (exatamente os de hoje), o spawn com prompt por stdin, o parse de linhas JSON. A regra de sucesso da M1 é dura: NENHUMA mudança visível. Mesmos args, mesmos eventos, mesmo comportamento de fila, resume, MCP e custo. O QA da M1 é regressão pura.

## Peça 3: provedor Codex

O Codex CLI da OpenAI (`codex`) tem um modo headless análogo ao `claude -p`. O conhecimento abaixo é o ponto de partida; TODOS os itens têm PONTO DE VERIFICAÇÃO porque o CLI evolui rápido.

Mapa de tradução esperado (verificar cada linha com `codex --help`, `codex exec --help` e um teste real antes de codar):

| Conceito | Claude | Codex (verificar) |
|---|---|---|
| Modo headless | `claude -p` (prompt por stdin) | `codex exec "<prompt>"` ou prompt por stdin |
| Stream de eventos | `--output-format stream-json` | `--json` (JSONL no stdout) |
| Modelo | `--model opus\|sonnet\|haiku` | `--model <nome>` (levantar a lista atual na verificação) |
| Permissão "padrao" (edita arquivos do workspace sem perguntar) | `--permission-mode acceptEdits` | sandbox de escrita no workspace + aprovação automática (flags de sandbox/approval do CLI) |
| Permissão "total" | `--permission-mode bypassPermissions` | a flag de bypass total do CLI (nome exato na verificação) |
| Retomar sessão | `--resume <session_id>` | `codex exec resume <id>` se existir; senão fallback (abaixo) |
| Custo | evento `result` com custo em dólares | eventos de contagem de tokens (traduzir pra estimativa) |
| Instruções do workspace | `CLAUDE.md` lido pelo CLI | `AGENTS.md` lido pelo CLI |
| Login | conta Anthropic pelo CLI | `codex login` (abre navegador) e `codex login status` |

PONTOS DE VERIFICAÇÃO obrigatórios antes de escrever o `codex.ts` (executor: rode na máquina e cole os resultados no relatório da rodada):

1. `codex --version` e `codex exec --help`: nomes exatos das flags de JSON, modelo, sandbox, aprovação e resume na versão instalada.
2. Uma execução real mínima com saída JSON num diretório de teste: capturar o JSONL cru e mapear os tipos de evento (início, delta de texto, uso de ferramenta/comando, fim com tokens) pro dialeto da peça 1.
3. Comportamento no Windows: o sandbox do Codex tem histórico de ser mais maduro em unix. Testar escrita de arquivo no modo "padrao" numa pasta de teste. Se o sandbox no Windows bloquear o fluxo, decidir com o Jesse: modo "total" como padrão do Codex com aviso claro, ou outra flag. Registrar a decisão.
4. `codex login status` com e sem login, pro detectar() saber diferenciar.
5. Se `codex exec resume` não existir na versão instalada: implementar o fallback de retomada por recapitulação: o hub já persiste a transcrição da sessão; a continuação vira uma sessão NOVA cujo prompt começa com um bloco "Contexto da conversa até aqui" montado da transcrição, seguido da mensagem nova. Marcar no relatório que o fallback foi usado.

Tradução de eventos (o coração do `codex.ts`): consumir o JSONL do codex e emitir o dialeto claude do contrato. Texto parcial vira delta; começo de comando/ferramenta vira bloco `tool_use` com nome legível; o fim vira `result` com o texto final e o custo estimado (peça 7). Erros do processo (binário ausente, não logado, crash) viram o evento de erro do contrato com mensagem em português clara pro usuário final.

## Peça 4: compatibilidade de workspace (skills e instruções nos dois motores)

- **AGENTS.md**: quando o provedor ativo é Codex e a sessão vai rodar numa pasta de cliente, o hub garante um `AGENTS.md` na raiz dessa pasta ANTES do spawn: gerado a partir do `CLAUDE.md` da pasta (mesmo conteúdo, cabeçalho adaptado, nota de "gerado automaticamente do CLAUDE.md, não editar na mão"). Regenerar quando o `CLAUDE.md` for mais novo que o `AGENTS.md`. Nunca tocar no `CLAUDE.md`.
- **Expansor de skills**: módulo pequeno no server (`provedores/skills.ts`). Recebe um prompt e o provedor alvo. Se o provedor é Codex e o prompt invoca skill por comando (começa com `/nome` ou contém a invocação, caso da cerimônia do Cérebro com `/instalar`), reescreve a invocação pra forma neutra: "Leia o arquivo `.claude/skills/<nome>/SKILL.md` e siga as instruções dele como se fossem parte deste prompt" (mantendo os argumentos). Prompts que já mandam ler arquivos (os fluxos guiados) passam intactos. No Claude, tudo passa intacto.
- **Onde os prompts nascem**: os fluxos montam prompts no frontend (`app/web/src/componentes/criacao/`). O expansor roda no SERVER, na entrada do `iniciarSessao`, pra valer pra qualquer origem de prompt (fluxos, IDE, automações futuras) sem tocar no frontend.

## Peça 5: config e detecção

- `config/estado.ts` cresce: `provedorPadrao` (`"claude" | "codex"`, sem padrão inicial: ausente significa "primeira execução ainda não concluída"), `modeloPadraoClaude` (o `modeloPadrao` atual, migrado com retrocompatibilidade de leitura) e `modeloPadraoCodex`. Rotas GET/PUT correspondentes (seguir o padrão das rotas de config existentes).
- `ambiente/deteccao.ts` cresce: detecta também o codex (mesmo padrão do claude: binário no PATH, override `VKOS_CODEX_BIN`, cache). `GET /ambiente` passa a responder os dois, cada um com `{instalado, versao, logado}`. O `logado` do codex vem de `codex login status`; o do claude, do mecanismo que a verificação da M2 confirmar (existência de credencial local ou comando de status do CLI, sem gastar tokens).
- `obterProvedorAtivo()`: resolve o provedor pelo `provedorPadrao` da config. Sessões novas usam o provedor ativo; sessões antigas persistidas guardam o provedor com que nasceram (campo novo `provedor` na sessão, default `"claude"` pra dados antigos), e a continuação de uma sessão usa o provedor DELA, nunca o global (trocar o motor não pode quebrar resume).

## Peça 6: interface do motor

- **Tela Conexões** ganha um bloco "Motor de IA" no topo: qual motor está ativo, status de cada um (instalado/logado), botão de trocar (com confirmação curta explicando o que muda: MCP só no Claude, custo estimado no Codex), e o seletor de modelo padrão do motor ativo.
- **Seletores de modelo existentes** (IDE, criação de sessão): passam a listar os modelos do provedor ativo (via `modelos()` do contrato, expostos numa rota). Nada de lista hardcoded no frontend.
- **Cartões e telas que mostram custo**: quando a sessão é Codex, o valor aparece com o prefixo "~" e tooltip/nota "estimado por tokens". O dado exato de tokens fica registrado no custo da sessão.
- **Conexões MCP** com motor Codex: a tela mostra aviso curto "disponível só com Claude nesta versão" e os toggles ficam desabilitados (sem sumir: o usuário precisa saber que existe).

## Peça 7: custos por provedor

- Claude: como hoje (o CLI reporta o custo em dólares no evento `result`).
- Codex: o provedor acumula os tokens reportados pelos eventos e converte por uma tabela de preços em `app/server/src/provedores/precos-codex.json` (por modelo, entrada/saída, editável sem recompilar; comentário no topo dizendo de onde veio o preço e quando foi atualizado). O evento `result` traduzido carrega o custo estimado nesse campo, e os tokens crus em campos extras. O armazenamento de custos por workspace (`custos.json`) ganha o campo `provedor` e `estimado: boolean`, mantendo leitura retrocompatível dos registros antigos.

## Peça 8: inicializador e jornada de primeira execução

Dois arquivos na RAIZ do repositório (fora de `app/`, pro usuário ver ao abrir a pasta):

- **`Instalar VKOS Hub.cmd`**: batch simples e robusto (sem PowerShell na entrada, pra não esbarrar em ExecutionPolicy):
  1. Confere `node --version` (mínimo: a major que o executor confirmar no `package.json`/engines; anotar). Se não tem Node: abre `https://nodejs.org/pt` no navegador, mostra mensagem em português no console ("Instale o Node LTS e rode este arquivo de novo") e pausa. NÃO tenta instalar Node sozinho (winget nem sempre existe; manter simples).
  2. `npm install` em `app/` (com mensagem de "isso leva alguns minutos na primeira vez").
  3. `npm run build -w web` em `app/`.
  4. Sobe o servidor (mesmo mecanismo do Iniciar, abaixo) e abre `http://localhost:4600` no navegador padrão.
  5. Qualquer erro: mensagem clara em português e pausa (o usuário leigo precisa conseguir ler antes da janela fechar).
- **`Iniciar VKOS Hub.cmd`**: o dia a dia.
  1. Se a 4600 já responde (checar com um request simples), só abre o navegador.
  2. Senão: sobe o servidor em segundo plano (janela minimizada ou oculta; `start /min` resolve o MVP), espera a 4600 responder (loop curto com timeout e mensagem de erro honesta) e abre o navegador.
  3. Node ausente ou `node_modules` ausente: manda rodar o Instalar primeiro, em português.

**Primeira execução dentro do hub**: quando `GET /config` não tem `provedorPadrao`, o frontend (Shell) redireciona pra tela nova `#/setup` (bloqueando as outras telas até concluir). A tela é uma jornada em passos, com o padrão visual da cerimônia do Cérebro (tela cheia, calma, um passo por vez):

1. Boas-vindas.
2. Escolha do motor (cards Claude e Codex; texto honesto do que cada um exige e custa).
3. Detecção do CLI: consulta `GET /ambiente`; se falta, mostra o comando de instalação com botão copiar (`npm install -g @anthropic-ai/claude-code` ou `npm install -g @openai/codex`; PONTO DE VERIFICAÇÃO: confirmar os nomes atuais dos pacotes) e botão "Verificar de novo".
4. Login: botão "Abrir login" chama rota nova `POST /ambiente/login` que abre um terminal visível rodando o comando de login do CLI escolhido (no Windows: `start cmd /k <cli> login`; o rundll32 de abrir navegador do módulo google/oauth serve de referência de como NÃO usar `cmd /c start` com URLs). O hub fica pingando o status de login ("Verificar de novo" automático a cada poucos segundos) até detectar logado.
5. Teste real: dispara uma sessão mínima pelo gerenciador (prompt "Responda só: olá, VKOS Hub no ar") numa pasta temporária de trabalho, streamando o texto na tela. Sucesso mostra o custo (real ou estimado) como primeira lição de honestidade de custo do produto.
6. Conclusão: grava `provedorPadrao`, oferece "Criar atalho na área de trabalho" (rota `POST /ambiente/atalho` que gera o `.lnk` via PowerShell WScript.Shell apontando pro `Iniciar VKOS Hub.cmd`) e segue pro Dashboard.

A tela `#/setup` continua acessível depois (linkada do bloco Motor de IA em Conexões) pra trocar de motor com a mesma jornada encurtada (pula boas-vindas).

## Peça 9: pacote de distribuição e portabilidade

- **Dados fora do git**: `.gitignore` ganha `app/dados/` e o rastreamento atual de `app/dados-backup-rodada8/` e de qualquer dado real sai do índice (`git rm -r --cached`, SEM commit: o Jesse revisa e comanda o commit). Motivo: a pasta distribuída não pode carregar dados de clientes do Jesse.
- **`app/CONTRATO.md`**: seção nova "Provedores de IA" com o contrato da peça 1, o dialeto de eventos congelado (a lista exata de eventos/campos mapeada na M1) e a regra "provedor novo implementa o contrato, nunca toca no gerenciador".
- **`LEIA-ME.md` de usuário final** na raiz: o que é o hub, requisitos (Windows 10/11, Node LTS, conta Claude ou ChatGPT), instalar, iniciar, problemas comuns (porta ocupada, antivírus, Node ausente). Linguagem de gente, sem jargão.
- **Checklist de pacote** (vai pro `04-riscos.md` e pro QA da M3): a pasta que o usuário recebe contém `app/` (sem `node_modules`, sem `dados/`), os dois `.cmd`, o `LEIA-ME.md`. Não contém: `planos/`, `contexto/`, `decisoes/`, `clienteteste/`, pastas de cliente do Jesse, `.git`. O plano NÃO automatiza o empacotamento (é um zip manual por enquanto); o checklist garante que dá pra fazer sem vazamento.

## O que explicitamente não muda

- A jornada de onboarding existente (escolher pasta VKOS, cerimônia do Cérebro) continua igual, apenas passa a acontecer DEPOIS da jornada de setup do motor.
- O barramento de eventos, CRM, calendário, automações, studios: intocados (só a exibição de custo ganha o "estimado" quando for Codex).
- O renderizador de carrossel (`vkos/render.ts` com `process.execPath`) já é neutro de provedor: não toca.
