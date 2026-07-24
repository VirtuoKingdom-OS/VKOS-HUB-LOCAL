# VKOS 3.0, motores de IA e preparo pra VPS

Plano criado em 2026-07-23 para execução por IA. Fecha a espinha do negócio: o Claude do Jesse no CORE, o motor de cada cliente configurável (Gemini ou Claude Team), Gemini funcionando de verdade, e tudo pronto pra subir na VPS do Google Cloud. Diagnóstico feito no código. Decisão registrada em `decisoes/2026-07-23-motores-por-workspace.md`.

## O modelo, pra fixar

- **CORE (Jesse)**: usa o Claude Code pessoal do Jesse, logado uma vez, a nível global. É o Claude que trabalha em tudo que o Jesse faz no painel, inclusive dentro dos workspaces quando ele opera como dono. Uso individual do titular, permitido.
- **Cliente**: nunca toca o Claude do Jesse. Cada workspace roda com o motor que o Jesse habilitou: **Gemini** (bancado pelo Jesse via Vertex, medido por workspace) ou **Claude Team** (uma conta que o Jesse libera e coloca por trás pro cliente, credencial no cofre). O cliente só paga o Jesse; o Jesse entrega tudo funcionando.

## Estado atual (o que já existe)

- CORE roda sessões locais via `provedores/claude.ts` (`claude -p` no processo, na pasta do workspace). No Compose, o volume `claude_core` guarda o login em `/home/node/.claude` só no container core.
- Hub roda sessões via `plataforma/sessoesNuvem.ts` que chama o `motor` por rede interna.
- `motor/index.ts` já tem `executarGemini` (Vertex, service account do projeto) e `executarClaude` (Anthropic SDK com credencial `claude_team` do cofre).
- Admin já define motor por workspace (`claude_team | gemini | nenhum`) e guarda credenciais cifradas (`admin.ts`).

## Os gaps a fechar

### Gap 1: o Claude global do Jesse, com login e status

Hoje não há como saber, pela interface, se o Claude do CORE está logado, nem um caminho pra logar na VPS (onde não há navegador nem terminal à mão do jeito de sempre).

1. **Tela Meu Claude no CORE** (dentro da Administração ou numa aba de sistema): mostra se o Claude Code está instalado e logado, qual conta, e um botão de testar (roda um `claude -p` mínimo e mostra o resultado). Rota só no `MODO=core`.
2. **Fluxo de login na VPS documentado e assistido**: como o `claude setup-token` (ou `claude login`) é feito uma vez dentro do container core (via `docker compose exec core ...`), gravando no volume `claude_core`. A tela Meu Claude explica o passo quando detecta que não está logado.
3. **O CORE nunca usa o Claude do Jesse pra atender request vindo do subdomínio do cliente.** Confirmar no código que sessão de workspace de cliente sempre passa pelo motor, nunca pelo provedor local, mesmo quando o Jesse abre o workspace "como operador" (nesse caso, ou usa o motor do cliente, ou deixa explícito que está usando o Claude dele; decidir e deixar claro na tela).

Fecha quando: a tela Meu Claude mostra o estado real do login, o teste responde, e está documentado como logar na VPS.

### Gap 2: Gemini funcional de ponta a ponta

1. **Matar o código morto**: a credencial `gemini` por workspace no `admin.ts` não é usada pelo motor (que usa a service account do projeto). Remover esse tipo de credencial do admin. Selecionar Gemini pra um workspace passa a exigir só que o projeto Vertex esteja configurado no motor, nada de chave por cliente.
2. **Mapa de modelos Gemini** no motor, como o app mapeia Opus/Sonnet/Haiku hoje: um modelo econômico e um forte (ex.: `gemini-2.5-flash` e `gemini-2.5-pro`), escolhidos pelo pedido/modo enxuto. Modelo padrão vem do `.env`.
3. **Preço e medição**: `consumo_ia` já grava tokens; garantir que `executarGemini` retorna entrada/saída corretos e que o custo é calculado com os preços do `.env` (`PRECO_GEMINI_*`). Corte por orçamento já existe em `sessoesNuvem`/motor, confirmar que dispara pro Gemini.
4. **Teste de conexão**: botão no admin que roda um prompt mínimo via Gemini naquele workspace e confirma que responde, sem depender de o cliente descobrir na hora.
5. **Skills no Gemini**: casa com a frente 1 do plano `vkos-3-nucleo-e-rotas` (o servidor injeta o conteúdo da skill no prompt). Sem isso, a cerimônia e as criações não funcionam no Gemini. Este plano depende daquele pra Gemini ser útil de verdade, não só responder texto solto.

Fecha quando: um workspace com Gemini roda uma sessão real (cerimônia ou criação), o consumo aparece no CORE com custo, e o teste de conexão passa.

### Gap 3: Claude Team por cliente, com teste e clareza

1. **Teste de conexão** no admin: valida a credencial `claude_team` do workspace com uma chamada mínima antes de o cliente depender dela.
2. **Mapa de modelos Claude** no motor (os `claude-*` atuais), com padrão e forte, coerente com o modo enxuto.
3. **Estado de credencial**: se a chave expira ou falha, o motor marca o workspace, avisa no CORE, e o cliente vê um estado digno ("IA em manutenção") em vez de erro cru. `executarClaude` trata falha de auth separadamente.
4. **Consentimento** já é exigido no admin (`consentimento: true`); manter e registrar na auditoria (já registra).

Fecha quando: configurar Claude Team num workspace, testar, e o cliente rodar uma sessão; derrubar a credencial mostra estado digno.

### Gap 4: seleção de motor coerente no admin

1. A tela de detalhe do workspace escolhe o motor com estados reais: Gemini é o padrão de todo workspace e não depende de credencial por cliente; Claude Team fica disponível só depois de cadastrar e testar a credencial. `nenhum` é contingência interna e não aparece como opção. Rótulos humanos explicam Gemini e Claude Team.
2. Trocar motor é auditado e vale pras próximas sessões (as abertas terminam no motor de origem, padrão que o 2.x já segue).
3. Limite de orçamento por workspace editável na mesma tela (`limites_workspace` já existe).

Fecha quando: o Jesse escolhe o motor de um cliente por uma tela clara, com os estados refletindo a realidade da configuração.

### Gap 5: tudo pronto pra VPS do Google Cloud

1. **Revisar o Compose e o Terraform** (já existem em `docker-compose.yml` e `infra/gcp/`) contra este plano: volume `claude_core` só no core, service account do Vertex só no motor (papel mínimo `aiplatform.user`), chave mestra do cofre no Secret Manager, sem credencial em variável no container do hub.
2. **Runbook de subida** em `infra/`: criar a VM, DNS pros dois subdomínios, TLS pelo Caddy, subir o Compose, migrar o banco, logar o Claude do Jesse no container core, configurar o projeto Vertex, e rodar o smoke contra o ambiente real.
3. **Checagem de que o Gemini funciona na VM**: a service account da VM com acesso ao Vertex, quota configurada como teto, e o smoke do Gemini passando na nuvem.
4. **Backup e restauração** (já há artefatos): confirmar que rodam na VM e testar uma restauração.

Fecha quando: existe um runbook que leva de VM zerada a CORE logado, um cliente com Gemini funcionando e backup testado, sem passo faltando.

## Ordem de execução

1. Gap 2 (Gemini funcional) e Gap 3 (Claude Team) no motor, que são o coração.
2. Gap 4 (seleção coerente no admin), que expõe os dois.
3. Gap 1 (Claude global do Jesse e tela Meu Claude).
4. Gap 5 (runbook e revisão pra VPS), por último, amarrando tudo.

Depende do plano `vkos-3-nucleo-e-rotas` (skills injetadas no prompt) pra Gemini e Claude Team serem úteis de verdade. Se aquele ainda não fechou, este entrega os motores respondendo texto e deixa a parte de skills anotada como bloqueio.

Cada gap fecha com `npm run checar`, `npm run testar`, `npm run build -w web` e `npm run smoke:nuvem` verdes.

## Regras para quem executa

As da casa: português brasileiro, sem travessão e sem ponto centrado, cor só por token nos dois temas, NUNCA commit sem ordem do Jesse, dado real é sagrado, credencial nunca em log nem em resposta de API (só os quatro últimos caracteres), o container do hub jamais executa IA local nem monta o cofre. Atualizar ao fechar: `interno/mapa-sistema.json`, `contexto/arquitetura.md`, `app/CONTRATO.md`, CHANGELOG e os planos da nuvem correspondentes. Ambiente local: Postgres via `docker compose -f docker-compose.dev.yml up -d`, CORE 4600, hub 4601, motor 4700 quando precisar testar o caminho de cliente.

## Estado da execução em 2026-07-23

Concluído no repositório:

- Gemini e Claude Team com mapas econômico, padrão e forte, medição por modelo, orçamento e estados operacionais.
- Administração com bloqueios coerentes, consentimento, cofre, testes por workspace e limite mensal.
- Meu Claude com estado e teste da CLI exclusiva do CORE, além do fluxo de login persistente na VPS.
- Plano complementar `vkos-3-motor-padrao-e-fixes` aplicado: Gemini virou o padrão de modelos e workspaces, registros antigos em `nenhum` são migrados e a Administração passou a gerenciar convites, membros e sessões sem derrubar a aba inteira.
- Migração 003 validada em banco novo e em base legada com credenciais anteriores.
- Compose, imagens, Terraform, scripts shell, runbook de VPS, checklist de segurança e restauração descartável preparados.
- Typecheck, 212 testes, builds, imagens Docker e smoke de nuvem verdes.

Dependências externas, documentadas em `infra/RUNBOOK-VPS.md`: aplicar no GCP, apontar DNS, obter TLS público, configurar quota, autenticar o Claude do CORE, testar Gemini e Claude Team com credenciais reais e executar a restauração em uma VM limpa.
