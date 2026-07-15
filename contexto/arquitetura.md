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
- Carrossel, post e stories usam o mesmo motor, a skill /carrossel intocada: o composer escolhe formato (múltiplas páginas ou página única) e proporção (1:1, 4:5, 9:16) e manda como instrução no prompt.
- Desde 2026-07-14 o carrossel é HTML-first (ver decisoes/2026-07-14-carrossel-html-first.md): a peça é o carrossel.html, a geração é direta (sem perguntas, instruída pelo prompt), o PNG só nasce sob demanda no download (render em pasta temporária), e há editor visual no app (texto, fontes, cores globais via variáveis CSS, imagem de fundo). Peça legada com PNG segue classificada pela subpasta (instagram/, post/, instagram-stories/); peça nova classifica pelo carrossel.html na raiz.
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

## DECIDIDO 2026-07-14: duas jornadas, Dashboard e Studio (rodada 13)
Ver decisoes/2026-07-14-duas-jornadas-dashboard-studio.md. Mapa:
- Dashboard (#/dashboard, tela padrão): porta de entrada simplificada. Criação guiada estilo quiz (AssistenteCriacao em web/src/componentes/criacao/): tema/páginas/modelo, estilo/dimensão, imagens (sem/com/intercalado, gerar com IA em breve), visual do Cérebro ou paleta manual, Gerar com progresso por fases. O usuário nunca vê o chat.
- Studio (#/studio/<pasta>): o único editor de carrossel. Páginas lado a lado num iframe só, zoom, painel de propriedades, mover elementos (drag com guias e snap). Motor de edição compartilhado em web/src/componentes/editor/motor.ts.
- Sidebar: Dashboard, Cockpit, CRM, WhatsApp (em breve), Instagram (em breve), Conexões, Conteúdo condicional (Galerias unificada de imagens, Site e páginas), Fontes de dados, VKOS-IDE sempre por último.
- Cliente de trabalho único: Estúdio Aura (designer fictícia, Cérebro completo) em estudio-aura/. A pasta vkos/ segue só como referência, fora do registro.

## DECIDIDO 2026-07-14: Site Guiado HTML-first por prompt (rodada 17)
Ver decisoes/2026-07-14-site-guiado-html-first.md. Mapa:
- Wizard do Dashboard (AssistenteCriacao com tipo "site", EtapasSite em web/src/componentes/criacao/): 4 etapas, gera por montarPromptSite (promptSite.ts) com skill "site". A sessão constrói o site HTML estático direto em conteudo/<pasta>/ lendo o Cérebro, a metodologia da skill /site e principios-visuais.md. Nenhuma skill modificada.
- Estado global de geração aceita tipo "site": peça pronta = pasta alvo com tipo "site" (sem fonteHtml), fases próprias, flutuante com "Ver o site".
- Tela #/site/<pasta> (web/src/componentes/site/TelaSite.tsx): iframe escalado com presets Desktop 1440x900 e Mobile 390x844, seletor de páginas, cache-bust ao vivo, painel lateral "Ajustar com IA" (criarSessao direto, estado local da tela).

## DECIDIDO 2026-07-15: barramento de eventos e Google Calendar
Ver decisoes/2026-07-15-barramento-eventos-google-calendar.md. Mapa:
- Barramento de eventos (server/src/eventos/barramento.ts): emitir/assinar tipados, log auditável por workspace em eventos.jsonl com rotação. Eventos: crm:contato-criado/movido/atualizado, peca:criada, sessao:concluida. Integração nova assina o barramento, não chama módulo direto.
- Google Calendar: OAuth loopback no app (server/src/google/oauth.ts, token só em conexoes.json), cliente REST fino (calendar.ts), servidor MCP próprio (mcp-calendar.ts, 5 ferramentas de agenda injetadas nas sessões via montarConfigMcp) e card com botão Conectar na tela Conexões.
- Automações (server/src/automacoes/ e tela #/automacoes): regras por workspace "quando evento então criar evento na agenda", filtro por coluna, templates com variáveis do cartão, modo ensaio sem efeito real, histórico em jsonl. Ação determinística chama a API direto, sem gastar sessão de IA. Cartão do CRM ganhou proximoContato (data do compromisso).
- Tela Calendário (#/calendario, item fixo na sidebar abaixo do CRM) é LOCAL-FIRST desde 2026-07-15: agenda própria por workspace (eventosLocais em calendario.json, server/src/calendario/eventosLocais.ts), funciona sem Google. Visão de mês, criar/editar/excluir evento, poll de 60s e refresh no foco. Dois toggles no cabeçalho: "Sincronizar com CRM" (sempre disponível) e "Sincronizar com Google Calendar" (opcional; ligar exige conexão e pede pra conectar em Conexões). Modo google = sincronizarGoogle e conectado: a tela opera na agenda do Google, eventos locais são enviados ao ligar, e criações no modo google guardam espelho local. A página de retorno do OAuth redireciona sozinha pra #/calendario.
- Sincronização CRM > agenda (server/src/calendario/sincronizacao.ts): cartão com proximoContato vira evento pela camada LOCAL, que propaga pro Google quando o modo google está ativo. Mantido em dia pelo barramento (criar, atualizar, remover ao limpar a data ou excluir o cartão; o CRM emite crm:contato-excluido desde 2026-07-15). Desligar não apaga compromissos já criados.
- Desconectar o Google (oauth.ts) zera a conexão inteira (clientId, clientSecret, refreshToken, contaEmail), desabilita o servidor MCP e desliga a sincronização do calendário. O cockpit fica oculto (visibility hidden) quando não é a tela ativa, pra não vazar por baixo das telas no carregamento.

## DECIDIDO 2026-07-15: Studio de Site (modo Editar na TelaSite)
Ver decisoes/2026-07-15-studio-de-site.md. Mapa:
- TelaSite (#/site/<pasta>) tem os modos Visualizar e Editar. Editar liga o usarMotorSite (web/src/componentes/editor/motorSite.ts, contrato no topo do arquivo) e o PainelSite (componentes/site/PainelSite.tsx): texto, tipografia e cores com escopo geral ou só no celular, link com atalho WhatsApp, troca de imagem, seções (mover, duplicar, excluir) e cores globais do site.
- Sem drag livre (site é layout fluido). Estilos vão pra folha <style id="vkos-ajustes"> com data-vk e !important, nunca inline. Serialização preserva doctype, data-vk e a folha; remove artefatos de editor.
- Hit-test do motorSite faz descida geométrica no ponto do clique ignorando pointer-events (2026-07-15): elemento "desabilitado" pelo site (ex: botão Em breve com pointer-events none) é selecionável e editável; camada decorativa aria-hidden só é pulada quando cobre a viewport (ícone pequeno aria-hidden é alvo normal). O Ajustar com IA também fica disponível no modo Editar (troca de painel com o de propriedades, salvar antes de disparar).
- Refino do Studio de Site (2026-07-15, rodada 2): a lista de seções pula camadas decorativas e desce pro wrapper quando o body tem um container só; texto editável por textarea exige filhos com display inline computado (span display block não conta); definirHref converte elemento em <a> in-place quando não há link (campo Link do painel aparece em qualquer bloco elegível); promptSite.ts exige marcação amigável ao Studio (todo clicável é <a>, "em breve" sem href com aria-disabled, nunca pointer-events pra desativar, decorativos com aria-hidden).
- Primitivas compartilhadas em editor/nucleo.ts; motor.ts (carrossel) manteve API e comportamento.
- Gravação: PUT /vkos/pecas/:pasta/pagina/:arquivo (server/src/vkos/paginaSite.ts), padrão do carrossel, carrossel.html proibido.
- Fantasma do cockpit (2026-07-15): a camada do cockpit fica sempre montada e ganha visibility hidden fora da tela dele; a troca de tela no Shell commita com flushSync antes do paint (sem isso, com a thread ocupada pelo canvas, o cockpit vazava uns frames na saída). O servidor serve o dist com Cache-Control: no-cache no index.html e immutable nos assets com hash (build novo chega sem Ctrl+F5).

## Stack decidida (resumo)
- Node (Fastify) local + React + Vite + TypeScript no navegador.
- child_process spawn do `claude -p` com stream-json, WebSocket pro streaming na tela.
- Markdown/JSON local pra estado; React Flow desde o MVP.
- Playwright já vem do lado do VKOS, o app não precisa dele na fase 0.

## Riscos a vigiar
- Auth do CLI: o app depende do Claude Code estar instalado e logado na máquina. Detectar e guiar o setup.
- Rate limit ao paralelizar: limitar concorrência e dar feedback claro.
- Acoplamento com a estrutura de pastas do VKOS: se o VKOS mudar, a ponte quebra. Ler estrutura de forma tolerante, não hardcodar caminhos além do essencial.
