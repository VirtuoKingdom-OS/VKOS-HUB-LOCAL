# Fechamento do MVP local: plano de execução

Regras de sempre (colar em TODO prompt de agente, ou seguir à risca se você é um executor único): português brasileiro, sem travessão nem ponto centrado, frase curta, cores só por tokens de `app/web/src/estilos/global.css`, funciona nos 3 temas, NUNCA commit/push/PR. Raiz do repositório: a pasta `VKOSAPP` (caminhos deste plano são relativos a ela). Servidor costuma estar no ar na 4600 servindo `app/web/dist`: não derrubar sem avisar. Typecheck a partir de `app/`: `npm run checar -w server` e `npm run checar -w web`. Toda rodada com frontend termina com `npm run build -w web` e conferência do bundle novo na 4600. Cada dono só toca os próprios arquivos. Antes de editar, leia o arquivo real: o plano descreve o código de 2026-07-15.

**Modo de execução**: com orquestrador multi-agente, despache os donos de cada rodada em paralelo e o QA depois. Executor único (Codex ou uma sessão só): execute os donos NA ORDEM (A, B, C) e depois o roteiro do QA você mesmo, com a mesma honestidade (registrar o que falhou, corrigir, revalidar).

Antes da M1, o executor confere: (1) `app/server/src/sessoes/gerenciador.ts` ainda spawna o claude como descrito no `02-arquitetura.md` (mapa do terreno); (2) os typechecks passam limpos ANTES de começar (senão, anote o que já estava quebrado); (3) o servidor 4600 está no ar.

## Rodada M1: contrato de provedor + Claude atrás dele (2 Opus + 1 QA)

Objetivo: criar `app/server/src/provedores/` e mover o motor claude pra dentro do contrato SEM nenhuma mudança de comportamento visível. É a rodada mais delicada do plano: o motor de sessão é o coração do hub.

### Dono A: contrato e provedor claude

Arquivos: `app/server/src/provedores/contrato.ts`, `provedores/claude.ts` (novos), `app/server/src/sessoes/gerenciador.ts` (cirurgia), `app/CONTRATO.md` (seção nova).

> Você é o Dono A da rodada M1 do plano fechamento-mvp do VKOS Hub. Leia primeiro os quatro arquivos de `planos/fechamento-mvp/` e as regras de sempre no topo do 03. Sua missão, na ordem:
> 1. MAPEIE o dialeto: grep em `app/web/src/` por `sessao:evento` e siga o fluxo até listar TODOS os campos de evento do stream-json que o frontend consome (tipos de evento, subcampos de delta, tool_use, result, custo, session_id). Grep também no próprio `gerenciador.ts` pelos campos que ele interpreta. Escreva essa lista na seção nova "Provedores de IA" do `app/CONTRATO.md`: esse é o dialeto congelado do contrato.
> 2. Escreva `provedores/contrato.ts` conforme a peça 1 do `02-arquitetura.md` (interface ProvedorIA, DeteccaoProvedor, OpcaoModelo, opções de sessão com pastaTrabalho/prompt/modelo/permissao/retomada/mcp, ProcessoSessao emissor de eventos do dialeto + parar()).
> 3. Extraia o motor claude pra `provedores/claude.ts`: localização do binário (reusar `ambiente/deteccao.ts`), montagem dos args EXATAMENTE como hoje, spawn com prompt por stdin, parse de linhas JSON, kill via taskkill no Windows (hoje em `gerenciador.ts:669`, vira responsabilidade do ProcessoSessao). Lista de modelos: opus, sonnet, haiku, com os rótulos que a UI usa hoje.
> 4. Cirurgia no `gerenciador.ts`: o `iniciar()` passa a pedir o ProcessoSessao ao provedor (por ora só o claude, hardcoded na resolução: a config de provedor é da M2) e liga os mesmos handlers de evento. Fila, status, custos, resume, MCP: comportamento idêntico. NADA de mudança de shape nos eventos do WebSocket.
> 5. `npm run checar -w server` limpo. Teste manual: uma sessão real curta pelo hub (a mais barata: modelo haiku, prompt "responda ok") conferindo streaming, custo e status no cockpit.
> Relatório: o dialeto mapeado (a lista exata), o diff conceitual do gerenciador, e qualquer comportamento que você teve que preservar e achou estranho (anote, não "conserte").

### Dono B: config, detecção e sessões com provedor persistido

Arquivos: `app/server/src/config/estado.ts`, `config/rotas.ts` (ou onde as rotas de config vivem, confira), `app/server/src/ambiente/deteccao.ts`, `ambiente/rotas.ts`, `app/server/src/tipos.ts` (campo `provedor` na sessão), `app/web/src/api/cliente.ts` (tipos espelhados, toque mínimo).

> Você é o Dono B da rodada M1 do plano fechamento-mvp do VKOS Hub. Leia primeiro os quatro arquivos de `planos/fechamento-mvp/` e as regras de sempre. Rode depois do Dono A se for executor único; em paralelo, alinhe pelo `contrato.ts` dele. Sua missão:
> 1. Config (peça 5 do 02): `provedorPadrao` opcional (ausente = primeira execução pendente), `modeloPadraoClaude` (migrando o `modeloPadrao` atual com leitura retrocompatível: config antiga sem os campos novos continua funcionando), `modeloPadraoCodex` (aceita string, validação de lista fica pra M2). Rotas GET/PUT no padrão das existentes.
> 2. Detecção (peça 5): `deteccao.ts` ganha a detecção do codex (binário no PATH + override `VKOS_CODEX_BIN`, cache como o do claude); `GET /ambiente` responde os dois com `{instalado, versao}`. O campo `logado` pode vir `null` nesta rodada (a M2 implementa a checagem real): deixe o shape pronto.
> 3. Sessão com provedor: campo `provedor` no tipo da sessão (server e espelho no front), default `"claude"` pra dados antigos ao carregar. Continuação de sessão usa o provedor DELA. `obterProvedorAtivo()` no módulo provedores lendo a config (com fallback `"claude"` quando ausente, pra M1 não travar nada).
> 4. Typechecks limpos nos dois workspaces.
> Relatório: shapes novos de config e sessão, e o contrato da rota `/ambiente` atualizado.

### QA M1

> Você é o QA da rodada M1 do plano fechamento-mvp do VKOS Hub. Leia os quatro arquivos do plano e os relatórios dos donos. Esta rodada é REGRESSÃO PURA: nada pode ter mudado pro usuário. Playwright (chromium 1440x900) contra `http://localhost:4600` (rebuild antes: `npm run build -w web`). Roteiro:
> 1. Sessão real no cockpit (modelo haiku, prompt curto): streaming ao vivo, status muda, custo aparece ao final. UMA sessão real só.
> 2. Continuação da MESMA sessão (mandar segunda mensagem): o resume funciona (a resposta mostra que lembra do contexto).
> 3. Fluxo guiado abre e monta prompt (não precisa gerar de verdade: cancele antes de disparar, ou dispare com haiku se o custo for aceitável e o roteiro pedir prova).
> 4. Config: `GET /config` responde os campos novos; config-app.json antigo (só `modeloPadrao`) é lido sem erro (teste com uma cópia).
> 5. `GET /ambiente` traz claude e codex com shape novo.
> 6. Regressão de telas: dashboard, galerias, CRM, calendário, conexões, IDE e um studio abrem sem erro de console.
> 7. Dados antigos: sessões persistidas de antes da rodada carregam e renderizam no cockpit.
> Matriz com veredito por item, bugs com severidade e arquivo:linha. Não conserte nada.

Checklist de fechamento M1: typechecks, bugs médios+ corrigidos e revalidados, `npm run build -w web` com hash novo na 4600, `app/CONTRATO.md` com o dialeto congelado, `contexto/arquitetura.md` com a linha dos provedores, decisão curta em `decisoes/` (contrato de provedor, dialeto claude como norma), relatório honesto do que ficou.

## Rodada M2: provedor Codex + compat + interface (3 Opus + 1 QA)

Pré-requisito: PONTOS DE VERIFICAÇÃO da peça 3 do `02-arquitetura.md` cumpridos e colados no relatório (flags reais do codex CLI instalado, JSONL cru de uma execução de teste, comportamento de sandbox no Windows, login status, resume). Se o codex não estiver instalado na máquina: instalar (`npm install -g @openai/codex`, confirmando o nome do pacote). Se o Jesse ainda não logou o codex: tudo que exige login vira "fase mock" validada por fixture (o JSONL de exemplo da documentação oficial) e a rodada NÃO FECHA até o gesto do Jesse (logar) e a revalidação real. Anotar isso no relatório com destaque.

### Dono A: provedor codex

Arquivos: `app/server/src/provedores/codex.ts`, `provedores/precos-codex.json` (novos), toque em `provedores/contrato.ts` só se a verificação exigir campo novo (documentar).

> Você é o Dono A da rodada M2 do plano fechamento-mvp do VKOS Hub. Leia os quatro arquivos do plano, o `app/CONTRATO.md` (dialeto congelado na M1) e as regras de sempre. Cumpra você mesmo os PONTOS DE VERIFICAÇÃO 1, 2 e 5 da peça 3 antes de codar, e cole os resultados no relatório. Sua missão:
> 1. `codex.ts` implementando o contrato: detectar (instalado, versão, logado via `codex login status`), modelos (a lista real levantada na verificação, com rótulos humanos), iniciarSessao traduzindo as opções pros args reais do CLI (headless, JSON, modelo, sandbox/aprovação pros dois níveis de permissão, cwd na pasta de trabalho).
> 2. O tradutor de eventos: JSONL do codex entra, dialeto claude sai (deltas de texto, tool_use com nome legível, result com texto final, session id quando existir). Erros viram o evento de erro do dialeto com mensagem clara em português (binário ausente, não logado, crash, timeout).
> 3. Retomada: `codex exec resume` se a versão suportar; senão o fallback de recapitulação da peça 3 (montar o bloco de contexto da transcrição persistida da sessão). Documente qual caminho valeu.
> 4. Custo estimado: acumular tokens dos eventos e converter pela `precos-codex.json` (preencha com os preços atuais dos modelos levantados, com fonte e data no comentário do topo). O result do dialeto carrega o custo estimado + tokens crus + `estimado: true`.
> 5. Opção `mcp` recebida: ignorar com um aviso traduzido no início do stream ("Conexões MCP não funcionam com Codex nesta versão"), nunca falhar por causa dela.
> 6. Teste com o binário real SEM gastar muito: uma execução mínima num diretório temporário (fora das pastas de cliente). `npm run checar -w server` limpo.
> Relatório: verificações coladas, tabela final de tradução de eventos, qual resume valeu, e o custo real da execução de teste.

### Dono B: compatibilidade de workspace

Arquivos: `app/server/src/provedores/skills.ts` (novo), geração de `AGENTS.md` (módulo novo pequeno ou dentro de skills.ts), integração no ponto de entrada do `iniciarSessao` do gerenciador, `app/server/src/config/estado.ts` (validação do modelo codex contra a lista do provedor).

> Você é o Dono B da rodada M2 do plano fechamento-mvp do VKOS Hub. Leia os quatro arquivos do plano e as regras de sempre. Sua missão (peça 4 do 02):
> 1. Expansor de skills: função pura que recebe (prompt, provedor) e devolve o prompt final. Codex + invocação de skill por comando (`/nome` no começo de linha ou como token isolado, caso real: a cerimônia usa `/instalar`) vira a instrução neutra de ler e seguir o SKILL.md correspondente, preservando argumentos. Claude: intocado. Cubra com testes unitários (os casos: /instalar puro, /skill com argumento, prompt sem skill, prompt que só cita um caminho de skill sem invocar).
> 2. AGENTS.md: antes do spawn de sessão codex com cwd numa pasta de cliente, garanta o `AGENTS.md` gerado do `CLAUDE.md` (cabeçalho adaptado + nota de gerado automaticamente), regenerando se o CLAUDE.md for mais novo. Nunca sobrescreva um AGENTS.md que o usuário criou na mão sem a marca de gerado (se existir sem a marca, não toque e anote aviso no log do server).
> 3. Integração: os dois mecanismos ligados no caminho único de início de sessão do gerenciador, valendo pra qualquer origem de prompt.
> 4. Typecheck limpo + testes unitários passando.
> Relatório: regras exatas de detecção de invocação de skill e o formato do AGENTS.md gerado.

### Dono C: interface do motor

Arquivos: `app/web/src/componentes/conexoes/` (bloco Motor de IA), seletores de modelo existentes (IDE e criação de sessão, confira onde vivem), exibição de custo (cartões/telas que mostram custo de sessão), `app/web/src/api/cliente.ts`.

> Você é o Dono C da rodada M2 do plano fechamento-mvp do VKOS Hub. Leia os quatro arquivos do plano, os relatórios dos donos A e B e as regras de sempre. Sua missão (peça 6 do 02):
> 1. Bloco "Motor de IA" no topo da tela Conexões: motor ativo, status dos dois (instalado/logado, da rota /ambiente), trocar com confirmação curta e honesta (MCP só no Claude, custo estimado no Codex), seletor de modelo padrão do motor ativo (lista vinda do server, nada hardcoded).
> 2. Seletores de modelo das sessões passam a listar os modelos do provedor ativo pela rota (mantendo o visual atual).
> 3. Custo de sessão Codex: prefixo "~" e nota "estimado por tokens" onde o custo aparece (cockpit, cartões, workspace). Sessões claude: como hoje.
> 4. Toggles de MCP desabilitados com aviso quando o motor é Codex (sem esconder).
> 5. Visual: tokens de tema, 3 temas, motion sutil da casa. Typecheck limpo.
> Relatório: telas tocadas com screenshot.

### QA M2

> Você é o QA da rodada M2 do plano fechamento-mvp do VKOS Hub. Leia o plano e os relatórios. Playwright contra a 4600 (rebuild antes). Roteiro:
> 1. Com codex logado (se o gesto do Jesse já aconteceu): trocar o motor pra Codex em Conexões, rodar UMA sessão real curta no cockpit (prompt "responda ok"), conferir streaming, ferramenta aparecendo se houver, custo com "~", tokens registrados no custos.json do workspace. Voltar o motor pra Claude ao final. Se codex NÃO logado: validar a cadeia com a fixture do Dono A (injetar o JSONL pelo caminho de teste dele) e MARCAR a rodada como não fechada, com a lista exata do que falta revalidar real.
> 2. Cerimônia do Cérebro com motor Codex num workspace de teste: o prompt expandido não contém mais `/instalar` cru (conferir no log/transcrição) e a sessão recebe a instrução de ler o SKILL.md. Não precisa completar a cerimônia inteira: o primeiro turno já prova a expansão.
> 3. AGENTS.md nasce na pasta de cliente de teste na primeira sessão codex, com a marca de gerado. Rodar de novo: não regenera se nada mudou. Tocar o CLAUDE.md: regenera.
> 4. Trocar motor NÃO quebra sessão antiga: continuar uma sessão claude criada antes, com o motor global em Codex (ela continua no claude).
> 5. Regressão claude completa: sessão real curta, fluxo guiado abre, custos, IDE.
> 6. 3 temas no bloco Motor de IA. Regressão de telas sem erro de console.
> Máximo DUAS sessões reais de IA no roteiro inteiro (uma por motor). Matriz, severidades, arquivo:linha. Não conserte nada.

Checklist de fechamento M2: typechecks, bugs médios+ corrigidos e revalidados, rebuild + hash na 4600, decisão em `decisoes/` (motor Codex, limitações aceitas do MVP), `contexto/arquitetura.md` e `roadmap.md` atualizados na linha certa, gesto do Jesse documentado se pendente (logar codex + revalidação real).

## Rodada M3: inicializador + jornada + pacote (3 Opus + 1 QA)

### Dono A: jornada de primeira execução (tela #/setup)

Arquivos: `app/web/src/componentes/setup/TelaSetup.tsx` + css próprio (novos), `app/web/src/componentes/layout/Shell.tsx` (redirecionamento quando `provedorPadrao` ausente, toque mínimo), rotas de apoio no server que faltarem (`POST /ambiente/login`, `POST /ambiente/atalho`, teste de sessão reusa o gerenciador).

> Você é o Dono A da rodada M3 do plano fechamento-mvp do VKOS Hub. Leia o plano (peça 8 do 02 é a sua spec), os relatórios das rodadas anteriores e as regras de sempre. Sua missão: a jornada de primeira execução em `#/setup`, nos moldes visuais da cerimônia do Cérebro (tela cheia, um passo por vez, calma, identidade VK): boas-vindas, escolha do motor (cards honestos), detecção do CLI (comando com botão copiar + verificar de novo), login (rota que abre `start cmd /k <cli> login` num terminal visível; ping de status a cada poucos segundos), teste real streamando (prompt mínimo, modelo mais barato do motor), conclusão (grava provedorPadrao, oferece atalho na área de trabalho via rota com WScript.Shell, cai no Dashboard). Shell: sem provedorPadrao, toda rota cai em #/setup; com ele, #/setup segue acessível (versão encurtada pra troca de motor, linkada do bloco Motor de IA). Estados de erro com mensagem de gente (CLI não achado depois de instalar: sugerir fechar e reabrir o terminal/hub pela questão do PATH). 3 temas, tokens, motion sutil. Typecheck + rebuild.
> Relatório: screenshots de cada passo e o contrato das rotas novas.

### Dono B: os dois .cmd

Arquivos: `Instalar VKOS Hub.cmd`, `Iniciar VKOS Hub.cmd` (novos, na raiz do repositório).

> Você é o Dono B da rodada M3 do plano fechamento-mvp do VKOS Hub. Leia o plano (peça 8) e as regras de sempre. Sua missão: os dois batch, robustos e legíveis, mensagens em português claro (o público não é técnico), sem depender de PowerShell na entrada. Instalar: checa node (se falta: abre nodejs.org, instrui e pausa), npm install em app/ com aviso de demora, npm run build -w web, delega o subir+abrir pro Iniciar, pausa em qualquer erro com mensagem legível. Iniciar: se a 4600 responde, só abre o navegador; senão sobe o servidor minimizado (npm start em app/ via start /min, ou o mecanismo mais limpo que você validar), espera a porta responder com timeout honesto, abre o navegador; sem node_modules ou sem node: manda rodar o Instalar. Cuidado com os clássicos do batch: caminhos com espaços e acentos (o repositório do Jesse tem os dois: use aspas e `%~dp0` sempre), codepage pra acentuação das mensagens (chcp 65001), janela que não fecha antes do usuário ler. TESTE os dois de verdade: Iniciar com servidor já no ar, Iniciar com servidor morto (mate o seu processo de teste depois, não o servidor do Jesse na 4600 se estiver em uso: use uma cópia com porta alternativa via env se precisar, e anote), Instalar numa cópia limpa do app sem node_modules (pode ser em pasta temporária).
> Relatório: transcrição dos testes reais dos dois arquivos.

### Dono C: portabilidade e docs do pacote

Arquivos: `.gitignore`, `LEIA-ME.md` da raiz (novo, usuário final), `app/CONTRATO.md` (revisão final), preparação da limpeza do git (SEM commit).

> Você é o Dono C da rodada M3 do plano fechamento-mvp do VKOS Hub. Leia o plano (peça 9) e as regras de sempre. Sua missão: (1) `.gitignore` com `app/dados/` (confira que não engole nada legítimo) e o levantamento do que está rastreado e não deveria (`git ls-files` em app/dados, app/dados-backup-rodada8 e qualquer pasta de cliente): prepare os comandos exatos de `git rm -r --cached` num bloco no seu relatório PRO JESSE EXECUTAR OU APROVAR, nunca rode commit. (2) `LEIA-ME.md` de usuário final na raiz: o que é, requisitos, instalar, iniciar, problemas comuns, em linguagem simples. (3) Revisão final do `app/CONTRATO.md`: o contrato de provedor está fiel ao código entregue nas M1/M2? As seções defasadas que a auditoria de portabilidade apontou foram corrigidas? (4) O checklist de pacote (peça 9) validado: liste o conteúdo exato da pasta distribuível e o que NUNCA pode ir junto.
> Relatório: os comandos de limpeza pro Jesse, o checklist de pacote preenchido e os docs escritos.

### QA M3

> Você é o QA da rodada M3 do plano fechamento-mvp do VKOS Hub. Leia o plano e os relatórios. Duas frentes:
> 1. Jornada simulada na máquina atual (Playwright na 4600, rebuild antes): zere o `provedorPadrao` numa CÓPIA da config (guarde a original e restaure no final), recarregue: toda rota cai no #/setup; percorra a jornada inteira com o motor que estiver logado (teste real de sessão incluso, modelo mais barato); confira que concluir grava a config e libera as telas; confira a jornada encurtada de troca de motor a partir de Conexões. 3 temas na tela nova.
> 2. Inicializador de pasta limpa: copie o necessário (checklist de pacote do Dono C) pra uma pasta temporária fora do repositório, rode `Instalar VKOS Hub.cmd` lá (porta alternativa via env pra não brigar com a 4600 do Jesse, o Dono B documentou como), e percorra até o hub abrir no navegador. Depois feche tudo e rode `Iniciar VKOS Hub.cmd`: um clique, hub no ar. Meça e anote o tempo das duas jornadas.
> 3. Regressão: cockpit + uma sessão curta real no motor padrão, dashboard, conexões.
> Ao final restaure a config original do Jesse e derrube os processos de teste. Matriz, severidades, arquivo:linha. Não conserte nada.

Checklist de fechamento M3 (fecha o plano): typechecks, bugs médios+ corrigidos e revalidados, rebuild + hash na 4600, decisão em `decisoes/` (inicializador e pacote de distribuição), `contexto/arquitetura.md` e `roadmap.md` atualizados (fase fechada com data), memória do projeto atualizada (plano executado), lista final de gestos do Jesse: aprovar e commitar a limpeza do git, testar a jornada numa máquina limpa de verdade, e decidir o canal de distribuição do zip.
