# VKOS Hub, roadmap

Reestruturado em 2026-07-13 (ver decisoes/2026-07-13-reestruturacao-vkos-hub.md). O VKOS Hub é local-first, pra prestador de serviço com Claude instalado. Critério de saída de cada fase: "o Jesse usa isso de verdade na operação da VK?". Se não usa, a fase não fechou.

## Entregue até aqui (fases 0 a 5 do roadmap antigo)

Cockpit web no navegador (localhost:4600): canvas React Flow com Cérebro, sessões claude -p em paralelo com streaming, fluxos como botões, galeria de peças com preview e exclusão, Cérebro editável com backup, multi-cliente (workspaces com canvas, contextos, sessões e custos escopados), custo honesto por sessão e por cliente, anexos universais, preview de site com presets. Auditoria de ponta a ponta com QA de gesto real em 2026-07-12.

## Fase 1: enxugar (entregue em 2026-07-14, validar em uso real)

- Terminal removido por completo: nós, backend PTY, dependências (confirmado no código em 2026-07-14: sem server/src/terminal, sem componente no front, sem node-pty nem @xterm no package.json).
- Menu de fluxos só com Carrossel e Site e páginas. Post e stories ocultos do menu (flag oculto em fluxos.ts); sessões e peças antigas continuam renderizando.
Fechou quando: o app rodou sem terminal e sem fluxos ocultos no menu, sem regressão.

## Fase 2: fundação visual nova (entregue em 2026-07-13, validar em uso real)

- Design system com tokens entregue: toda cor passa por tokens semânticos com canais RGB pra alpha (global.css), zero cor de tema hardcoded nos componentes.
- Três temas desde 2026-07-14 (ver decisoes/2026-07-14-tres-temas.md): Escuro (o padrão novo, grafite neutro com menta de destaque), Dark VKOS (a identidade original, intocada) e Claro. Seletor de três opções na sidebar, persistência em localStorage, aplicação antes do bundle carregar (sem flash).
- Passada de refinamento feita em 2026-07-14: foco visível por :focus-visible, scrollbar, hover e motion sutil nas telas. Mensagens da IA renderizam markdown de verdade (componente comum/Markdown) no nó de sessão, na cerimônia e no chat da IDE.
Fecha quando: o Jesse alterna os temas no dia a dia sem achar nada quebrado.

## Fase 3: cerimônia do Cérebro (entregue em 2026-07-13, validar em uso real)

- Entregue: entrevista guiada em tela cheia (componente CerimoniaCerebro) rodando a skill /instalar numa sessão real, com streaming, retomada ao reabrir e celebração quando o Cérebro fica pronto.
- Porta de entrada: com Cérebro vazio, o card de boas-vindas e o clique no nó Cérebro levam pra cerimônia (escrever à mão continua como opção secundária). Com Cérebro cheio, o clique volta a abrir os fluxos.
Fecha quando: um cliente novo de verdade sai da cerimônia com o Cérebro preenchido sem tocar em arquivo.

## Fase 4: VKOS-IDE (entregue em 2026-07-13, validar em uso real)

- Entregue: tela #/ide com árvore de arquivos do workspace (criar, renomear, excluir com confirmação padrão), editor com números de linha e Ctrl+S, e chat do Claude com ferramentas ao vivo (eventos tool_use no WS).
- Permissão por sessão: "Seguro" (acceptEdits) ou "Poder total" (bypassPermissions), escolhida antes de criar a sessão.
- Desde 2026-07-14: seletor de modelo (Opus, Sonnet, Haiku) antes de criar a sessão, e respostas do Claude renderizadas em markdown.
Fecha quando: o Jesse opera arquivos e conversa com o Claude sem abrir o VS Code.

## Fase 5: conexões (MCP) (entregue em 2026-07-13, validar em uso real)

- Entregue: tela #/conexoes por workspace. GitHub (endpoint remoto oficial), Netlify e Notion (npx + token) disponíveis. Vercel saiu do catálogo em 2026-07-14 (o MCP oficial deles é só OAuth de navegador, sem token fixo; ver decisoes/2026-07-14-vercel-fora-do-catalogo.md). Sessões recebem --mcp-config dos habilitados.
- Pendência anotada pelo QA: falta ação de "remover token" na tela (desabilitar mantém o segredo no arquivo local).
Fecha quando: uma sessão usa um MCP conectado pela tela, sem editar JSON na mão.

## Fase 6: CRM (entregue em 2026-07-13, validar em uso real)

- Entregue: tela #/crm com kanban personalizável (colunas com renomear inline, criar, excluir), cartões arrastáveis com persistência, painel de detalhe (campos, tags, notas), busca e total por coluna. Dados locais por workspace.
Fecha quando: o Jesse gerencia os clientes da VK pelo CRM do hub.

## Fase 7: Meta e Google Ads

- Plano de arquitetura pronto em contexto/fase7-meta-plano.md (2026-07-14), aguardando o aval do Jesse e as respostas das 6 perguntas do fim do plano.
- WhatsApp: tela Mensagens estilo WhatsApp dentro do hub (webhook via túnel + coexistence com o app do celular).
- Instagram: publicar e agendar os carrosséis da galeria, DMs na mesma caixa.
- Automações em degraus: regras simples primeiro, rascunho de resposta com IA (com aprovação humana) depois.
- Google Ads: gestão de anúncios via API oficial (depois do Meta).
Fecha quando: uma peça aprovada no hub é publicada no Instagram sem sair do app.

## Adiado, não descartado

- Versão online multi-cliente (Netlify + Supabase + worker). Reavaliar depois da fase 6.
- Editor por blocos e versionamento navegável do Cérebro.
- Encadeamento de nós (saída de uma sessão vira input de outra).
- Apresentações (skill nova de slides).

## Regras do roadmap

- Nunca pular pra uma fase visual antes de a anterior estar em uso real.
- Feio que resolve dor ganha de bonito que ninguém usa.
- Sem promessa de lançamento agora. Cada fase se paga em produtividade própria primeiro.
