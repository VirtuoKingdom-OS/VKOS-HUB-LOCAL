# VKOS Hub, arquitetura técnica

## O que é
Workspace multi-IA local-first para dono de negócio (não dev). Um cockpit onde várias sessões do Claude rodam em paralelo, todas lendo o mesmo Cérebro (markdown com a identidade do negócio em 13 blocos). Ponto de entrada: marketing. Também é ferramenta de produtividade do próprio Jesse, que hoje abre várias janelas do VS Code com Claude Code no mesmo projeto e sofre pra orquestrar isso.

## Princípios inegociáveis
- Local-first: roda na máquina do usuário, nada hospedado, pagamento único (igual ao VKOS atual).
- Cérebro como fonte da verdade: markdown, versionável, legível por humano.
- Não reinventar o VKOS: o app orquestra o repo VKOS existente (skills, cerebro.md, templates de carrossel), não substitui.
- Menor atrito pra um operador solo que domina HTML/CSS/JS/Node.

## Camadas
1. Servidor local Node (acesso a arquivos e processos, serve o frontend no navegador).
2. UI de canvas/cockpit (React + React Flow no navegador).
3. Orquestrador de sessões Claude (spawn, streaming, paralelismo).
4. Estado local (arquivos markdown + índice).
5. Ponte com o repo VKOS na máquina (abrir pasta, ler Cérebro, disparar skills).

## DECIDIDO 2026-07-11: shell é web local, sem Electron (ver decisoes/)
- Backend Node local (Fastify) + frontend React no navegador via localhost.
- Motivo: dois públicos (navegador puro e VSCode) com o mesmo frontend, e caminho aberto pro SaaS trocando só onde o backend roda.
- Empacotar como executável com backend embutido quando for distribuir. Electron/Tauri só se virar necessidade real.

## DECIDIDO 2026-07-11: canvas é React Flow desde o MVP (ver decisoes/)
- React Flow (@xyflow/react): nós, arestas, zoom, pan prontos. O Cérebro é o nó central, cada sessão de IA é um nó puxando dele.
- O workspace visual é o produto, não fase futura. Sem canvas o MVP não valida a tese.

## DECIDIDO 2026-07-11: orquestração via claude -p headless (ver decisoes/)
- `claude -p` com `--output-format stream-json`: cada sessão é um processo filho, o app lê o streaming linha a linha. Retoma contexto com `--resume <session_id>`.
- Reaproveita a auth do CLI instalado, espelha o que o Jesse já faz na mão. O cwd na pasta do VKOS faz o CLAUDE.md de lá garantir o Cérebro no contexto.
- Migrar pro Agent SDK só quando hooks, permissões finas ou controle de custo por sessão virar dor concreta.
- Paralelismo: N processos filhos simultâneos. Cada um roda numa pasta de trabalho (o repo VKOS ou subpasta). Limitar concorrência (ex: 3 a 5 sessões) pra respeitar rate limit do plano e não fritar a máquina.
- Custo/limite: expor no cockpit quantas sessões estão ativas e sinalizar quando bater limite do CLI. Não estimar tokens na fase 0.

## DECIDIDO 2026-07-11: estado local em markdown e JSON (ver decisoes/)
- JSON pra índice de sessões e configuração (pasta `app/dados/`), markdown onde couber. As peças ficam onde o VKOS salva, o app só lê.
- SQLite apenas como cache/índice se a biblioteca de peças crescer a ponto de doer. Nunca como fonte da verdade.

## Ponte com o repo VKOS
- O app abre a pasta de um VKOS já instalado (navegador de pastas servido pelo backend).
- Cópia de referência do VKOS em `vkos/` na raiz desta pasta, usada pra desenvolvimento e teste.
- Lê `cerebro/cerebro.md` e injeta como contexto em toda sessão disparada.
- Descobre as skills disponíveis lendo `.claude/skills/` (as ~27: /instalar, /carrossel, /semana, /site, /evoluir etc.).
- Disparar uma skill = rodar `claude -p "/carrossel ..."` com cwd na pasta do VKOS. A skill já sabe renderizar carrossel via Playwright, salvar PNG etc. O app só orquestra e mostra o resultado.
- Peças geradas (PNGs, posts) ficam onde o VKOS já salva. O painel de peças lê essas pastas, não duplica.

## DECIDIDO 2026-07-12: canvas em árvore com contêineres (ver decisoes/)
- Topologia: Cérebro liga na sessão (fluxo), a sessão liga no contêiner de gerações do tipo. Geração nunca liga direto no Cérebro.
- Um nó contêiner por tipo de peça (Carrosséis, Posts, Stories, Sites) agrupa todas as gerações em miniatura; clicar abre a galeria em modal. Nós individuais de geração não existem mais (canvas.json versão 3, migração automática da versão 2).
- Carrossel, post e stories usam o mesmo motor, a skill /carrossel intocada: o composer escolhe formato (múltiplas páginas ou página única) e proporção (1:1, 4:5, 9:16) e manda como instrução no prompt. A subpasta de saída (instagram/, post/, instagram-stories/) define o tipo da peça.
- Cérebro editável pelo app: GET/PUT /api/vkos/cerebro com gravação atômica e backup automático por boot.
- Anexos universais do composer em materiais/cockpit/anexos/, referenciados por caminho no prompt.
- Preview de site dentro do app: iframe escalado por transform, presets mobile e desktop, atualização ao vivo via evento de peças.

## DECIDIDO 2026-07-12: workspaces multi-cliente (ver decisoes/)
- Um workspace por cliente, e cada workspace é uma pasta VKOS completa. Registro em app/dados/workspaces.json, estado escopado por workspace em app/dados/workspaces/<id>/ (canvas, contextos, sessões, custos, transcrições).
- Sessões de todos os clientes convivem no gerenciador: sessão do cliente A segue rodando com o B ativo, e custo e transcrição vão pro workspace da sessão. Limite de 5 simultâneas continua global.
- Cliente novo nasce clonando a estrutura do ativo (skills, templates) com Cérebro em branco e junction de node_modules. Remover cliente tira só do registro, nunca apaga arquivos.
- Migração automática e idempotente no boot: o estado single-tenant antigo virou o primeiro workspace.

## DECIDIDO 2026-07-13 e 2026-07-14: IDE, Conexões e CRM no hub (rodadas 10 e 11)
Detalhe fino no app/CONTRATO.md e nos arquivos de decisoes/. Aqui só o mapa:
- VKOS-IDE (#/ide): árvore de arquivos do workspace, editor com Ctrl+S e chat do Claude com ferramentas ao vivo. Permissão por sessão (Seguro/acceptEdits ou Poder total/bypassPermissions) e seletor de modelo (Opus, Sonnet, Haiku). Backend em server/src/ide/.
- Conexões MCP (#/conexoes): catálogo por workspace (GitHub, Netlify, Notion), token só no disco local em conexoes.json, montarConfigMcp injeta --mcp-config nas sessões. Backend em server/src/conexoes/. Vercel saiu do catálogo em 2026-07-14 (ver decisoes/2026-07-14-vercel-fora-do-catalogo.md).
- CRM (#/crm): kanban por workspace, colunas personalizáveis, cartões arrastáveis, detalhe com tags e notas. Backend em server/src/crm/.
- Três temas (ver decisoes/2026-07-14-tres-temas.md): Escuro (o padrão), Dark VKOS e Claro, todos via tokens de web/src/estilos/global.css. Mensagens da IA renderizam markdown de verdade (componente comum/Markdown).

## Stack decidida (resumo)
- Node (Fastify) local + React + Vite + TypeScript no navegador.
- child_process spawn do `claude -p` com stream-json, WebSocket pro streaming na tela.
- Markdown/JSON local pra estado; React Flow desde o MVP.
- Playwright já vem do lado do VKOS, o app não precisa dele na fase 0.

## Riscos a vigiar
- Auth do CLI: o app depende do Claude Code estar instalado e logado na máquina. Detectar e guiar o setup.
- Rate limit ao paralelizar: limitar concorrência e dar feedback claro.
- Acoplamento com a estrutura de pastas do VKOS: se o VKOS mudar, a ponte quebra. Ler estrutura de forma tolerante, não hardcodar caminhos além do essencial.
