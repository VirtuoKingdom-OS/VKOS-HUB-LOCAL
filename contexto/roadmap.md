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

## Fase 6.5: duas jornadas (entregue em 2026-07-14, validar em uso real)

- Carrossel HTML-first com editor (rodada 12) e depois Dashboard com criação guiada, Studio de edição com páginas lado a lado e mover elementos, sidebar simplificada (Galerias, em breve WhatsApp/Instagram, IDE por último) e cliente único Estúdio Aura (rodada 13). Ver decisoes/2026-07-14-carrossel-html-first.md e decisoes/2026-07-14-duas-jornadas-dashboard-studio.md.
Fecha quando: o Jesse cria um carrossel pelo Dashboard e edita no Studio sem tocar no cockpit.

## Fase 6.6: Site Guiado (entregue em 2026-07-14, validar em uso real)

- Segunda jornada do Dashboard: wizard em 4 etapas gera site HTML estático por prompt direto (metodologia da skill /site pro texto, principios-visuais.md pro visual), sem tocar nas skills. Ver decisoes/2026-07-14-site-guiado-html-first.md.
- Tela #/site/<pasta>: viewport com presets Desktop e Mobile, seletor de páginas, abrir em nova aba, atualização ao vivo e ajuste com IA na própria tela.
- QA de gesto real em 2026-07-14: jornada completa aprovada, site gerado avaliado como vendável, regressão do carrossel limpa.
Fecha quando: o Jesse gera um site de cliente real pelo Site Guiado e publica.

## Fase 6.8: Studio de Site (entregue em 2026-07-15, validar em uso real)

- A tela do site ganhou o modo Editar: edição manual profissional com painel de propriedades, escopo geral ou só no celular, seções, links, imagens e cores globais, convivendo com o Ajustar com IA. Ver decisoes/2026-07-15-studio-de-site.md.
- QA de gesto real em 2026-07-15 com regressão do Studio de carrossel e do Site Guiado limpas; bug de especificidade corrigido e revalidado no site real.
Fecha quando: o Jesse edita um site de cliente real no modo Editar e publica sem tocar em arquivo.

## Fase 6.7: barramento de eventos + Google Calendar (entregue em 2026-07-15, validar em uso real)

- Barramento de eventos interno com log por workspace, conexão Google Calendar (OAuth pelo app, servidor MCP próprio pras sessões) e tela Automações com regras CRM > agenda, ensaio e histórico. Ver decisoes/2026-07-15-barramento-eventos-google-calendar.md.
- Tela Calendário (#/calendario, item fixo na sidebar abaixo do CRM), local-first desde 2026-07-15: agenda própria do workspace que funciona sem Google, com visão de mês, criar/editar/excluir evento, e dois toggles: "Sincronizar com CRM" (sempre) e "Sincronizar com Google Calendar" (opcional, pede conexão). Backend em server/src/calendario/.
- Sincronização CRM > agenda validada com a conta real do Jesse em 2026-07-15: cartão com próximo contato vira compromisso, mantido em dia pelo barramento, no modo local ou no Google. Desconectar o Google agora zera a conexão inteira.
- QA de gesto real em 2026-07-15: pipeline validado de ponta a ponta sem conta Google; falta o gesto do Jesse (criar credenciais pelo planos/google-calendar/04-setup-google.md, conectar e ver o evento nascer na agenda).
Fecha quando: um cartão real movido no CRM cria o compromisso na agenda do Google do Jesse.

## Fase 8: fechamento do MVP local (planejada em 2026-07-15, plano pronto)

- Motor multi-IA (Claude + Codex atrás de um contrato de provedor), jornada de instalação de um clique (Instalar/Iniciar .cmd + tela #/setup) e portabilidade do pacote de distribuição. Plano completo em planos/fechamento-mvp/ (rodadas M1, M2, M3), escrito pra qualquer IA executar. Ver decisoes/2026-07-15-fechamento-mvp-multi-ia.md.
Fecha quando: alguém que não é o Jesse instala numa máquina Windows limpa com dois cliques, escolhe o motor, loga e gera uma peça real sem tocar em terminal.

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
