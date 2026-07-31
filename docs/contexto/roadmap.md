# VKOS Hub, roadmap

Reestruturado em 2026-07-13 (ver docs/decisoes/2026-07-13-reestruturacao-vkos-hub.md). O VKOS Hub é local-first, pra prestador de serviço com Claude instalado. Critério de saída de cada fase: "o Jesse usa isso de verdade na operação da VK?". Se não usa, a fase não fechou.

## Entregue até aqui (fases 0 a 5 do roadmap antigo)

Cockpit web no navegador (localhost:4600): canvas React Flow com Cérebro, sessões claude -p em paralelo com streaming, fluxos como botões, galeria de peças com preview e exclusão, Cérebro editável com backup, multi-cliente (workspaces com canvas, contextos, sessões e custos escopados), custo honesto por sessão e por cliente, anexos universais, preview de site com presets. Auditoria de ponta a ponta com QA de gesto real em 2026-07-12.

## Fase 1: enxugar (entregue em 2026-07-14, validar em uso real)

- Terminal removido por completo: nós, backend PTY, dependências (confirmado no código em 2026-07-14: sem server/src/terminal, sem componente no front, sem node-pty nem @xterm no package.json).
- Menu de fluxos só com Carrossel e Site e páginas. Post e stories ocultos do menu (flag oculto em fluxos.ts); sessões e peças antigas continuam renderizando.
Fechou quando: o app rodou sem terminal e sem fluxos ocultos no menu, sem regressão.

## Fase 2: fundação visual nova (entregue em 2026-07-13, validar em uso real)

- Design system com tokens entregue: toda cor passa por tokens semânticos com canais RGB pra alpha (global.css), zero cor de tema hardcoded nos componentes.
- Três temas desde 2026-07-14 (ver docs/decisoes/2026-07-14-tres-temas.md): Escuro (o padrão novo, grafite neutro com menta de destaque), Dark VKOS (a identidade original, intocada) e Claro. Seletor de três opções na sidebar, persistência em localStorage, aplicação antes do bundle carregar (sem flash).
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
- Desde 2026-07-15: virou camada universal sobre qualquer tela, sem desmontar a tela de trás. O controle único escolhe motor, modelo e permissão para a próxima conversa.
- Desde 2026-07-16: virou janela flutuante sem véu, arrastável, minimizável para o chat e responsiva pela largura real da camada. Posição e minimização persistem entre aberturas.
Fecha quando: o Jesse opera arquivos e conversa com o Claude sem abrir o VS Code.

## Fase 5: conexões (MCP) (entregue em 2026-07-13, validar em uso real)

- Entregue: tela #/conexoes por workspace. Desde 2026-07-26 o catálogo só tem Apify: GitHub, Netlify, Notion e Google Calendar foram removidos na versão 1.1.0, junto com a publicação integrada que os tokens de GitHub e Netlify alimentavam. Vercel, Meta e Google Ads não aparecem no catálogo atual. Sessões Claude recebem --mcp-config somente dos habilitados que montam MCP, e hoje nenhuma entrada monta. O token da Apify alimenta a busca REST de leads e fica fora das sessões.
- Pendência anotada pelo QA: falta ação de "remover token" na tela (desabilitar mantém o segredo no arquivo local).
Fecha quando: uma sessão usa um MCP conectado pela tela, sem editar JSON na mão.

## Fase 6: CRM (v2 entregue em 2026-07-16, validar em uso real)

- Entregue: CRM v2 com contatos separados de negócios, migração idempotente dos cartões antigos, linha do tempo de interações, tarefas e entrada confirmada de leads do Google Maps pela Apify. O campo próximo contato segue no cartão, mas desde 2026-07-26 não alimenta mais Calendário nem Automações: os dois foram removidos.
- A tela #/crm tem Hoje, Quadro, Contatos e Buscar leads. O Quadro move negócios; a lista busca, filtra e ordena fichas; a ficha concentra negócios, interações, tarefas, tags e follow-up. Buscar leads salva toda mineração antes de responder, mantém listas de Minerados e Arquivados e oferece termo, localização, quantidade e enriquecimento de email. A importação confirmada cria Contatos com origem e tag rastreáveis.
- Sessões cujo pedido cita CRM recebem um resumo agregado do funil e das vozes dos clientes, com telefone e email removidos e regra dura contra publicar dado pessoal.
- O Mapa interno em #/mapa documenta os módulos como uma rede didática. Seus dados vivem em `interno/`, fora do pacote de cliente, e o item desaparece quando eles não existem.
Fecha quando: o Jesse gerencia os clientes da VK pelo CRM do hub.

## Fase 6.5: duas jornadas (entregue em 2026-07-14, validar em uso real)

- Carrossel HTML-first com editor, Dashboard com criação guiada e Studio. A sidebar final tem um hub único de Fontes de dados, não mostra promessas de WhatsApp ou Instagram e abre a IDE como camada universal.
- Em 2026-07-16, o wizard passou a escolher separadamente o estilo da capa e das páginas, com miniaturas reais de capa e página interna. O Studio reutiliza imagens das Fontes de dados copiando-as para dentro da peça.
- Em 2026-07-20, o Studio ganhou clique geométrico (enfeites com pointer-events none viram selecionáveis), painel de camadas com reordenação e imagem própria posicionável; o wizard ganhou o interruptor "Aprimorar com IA" com modo econômico de montagem. Ver docs/decisoes/2026-07-20-camadas-e-modo-economico.md.
Fecha quando: o Jesse cria um carrossel pelo Dashboard e edita no Studio sem tocar no cockpit.

## Fase 6.6: Site Guiado (entregue em 2026-07-14, validar em uso real)

- Segunda jornada do Dashboard: wizard em 4 etapas gera site HTML estático por prompt direto (metodologia da skill /site pro texto, principios-visuais.md pro visual), sem tocar nas skills. Ver docs/decisoes/2026-07-14-site-guiado-html-first.md.
- Tela #/site/<pasta>: viewport com presets Desktop e Mobile, seletor de páginas, abrir em nova aba, atualização ao vivo e ajuste com IA na própria tela.
- Em 2026-07-15, a TelaSite ganhou publicação direta e independente no GitHub e na Netlify, sem sessão de IA. Removida na versão 1.1.0 (2026-07-26): no lugar entrou a exportação local, abrir a pasta da peça ou baixar o site pronto em ZIP.
- Em 2026-07-16, a geração ganhou a camada de design v2 (principios-visuais.md reescrito com leitura de design, cartela de 13 direções e proibições anti-IA, destilado de impeccable, taste-skill, ui-ux-pro-max e astryx) e a TelaSite ganhou o atalho Revisão de design no painel de IA. As sessões utilitárias ganharam o Modo enxuto opcional (economia de tokens, toggle na sidebar, ver docs/decisoes/2026-07-16-modo-enxuto.md). Parte 02 futura: levar a camada de design pro carrossel (entregue no VKOS 2 em 2026-07-16, ver docs/decisoes/2026-07-16-vkos2.md; retrofit pro vkos v1 e cópias de cliente segue em aberto).
- Em 2026-07-16, o fluxo ganhou um contrato estático único e barreira de deploy. MIME, cache, páginas aninhadas, recursos relativos e URLs limpas funcionam no preview. A geração só conclui com auditoria estrutural válida. GitHub e Netlify só recebiam o site depois de conferir todas as páginas em 390 px e 1440 px no navegador local; desde 2026-07-26 a mesma barreira bloqueia a exportação local, não mais o deploy.
- QA de gesto real em 2026-07-14: jornada completa aprovada, site gerado avaliado como vendável, regressão do carrossel limpa.
- Em 2026-07-17, rodada Sites Astro e Design: prompt design-first com declaração obrigatória, biblioteca de 13 estilos concretos propagada com a camada v2 pros workspaces reais, e publicação de multipágina como projeto Astro (conversor determinístico com fallback HTML, motor compartilhado). Ver docs/decisoes/2026-07-17-astro-na-publicacao.md e 2026-07-17-biblioteca-estilos-design-first.md. No mesmo dia o vkos2 estendeu a biblioteca pros demais formatos visuais: stories, carrossel em criação livre (modelo travado continua mandando) e interface de projeto, com a mesma declaração e teste final.
- Ainda em 2026-07-17, conserto geral do checkup de ponta a ponta (4 auditorias, 30+ achados): dados sagrados (quarentena de crm.json corrompido, migração sem descarte, eventos de negócio, sincronização serializada, exclusão de workspace limpando segredos), publicação fiel (conversor valida cobertura do body e heads, chaves no texto sem quebrar build, conferência unificada, badge honesto), laço de conformidade robusto (nunca preso, exclusão mútua completa, turno interno na transcrição) e camada de tema oficial documentada. Ver docs/decisoes/2026-07-17-dados-sagrados.md e 2026-07-17-camada-tema-oficial.md.
Fecha quando: o Jesse gera um site de cliente real pelo Site Guiado e exporta o resultado pronto pra publicar onde quiser.

## Fase 6.8: Studio de Site (entregue em 2026-07-15, validar em uso real)

- A tela do site ganhou o modo Editar: edição manual profissional com painel de propriedades, escopo geral ou só no celular, seções, links, imagens e cores globais, convivendo com o Ajustar com IA. Ver docs/decisoes/2026-07-15-studio-de-site.md.
- Em 2026-07-16, o editor de imagem ganhou a galeria das Fontes de dados e o Ajustar com IA passou a priorizar anexos prontos, sem gerar substituto quando o pedido manda usar o arquivo enviado.
- Em 2026-07-20, o modo Editar ganhou o painel de camadas da seção (mesmo componente do Studio) e inserção de imagem própria de bloco; o Ajustar com IA dos dois editores passou a abrir no modelo econômico do provedor. Ver docs/decisoes/2026-07-20-camadas-e-modo-economico.md.
- QA de gesto real em 2026-07-15 com regressão do Studio de carrossel e do Site Guiado limpas; bug de especificidade corrigido e revalidado no site real.
Fecha quando: o Jesse edita um site de cliente real no modo Editar e publica sem tocar em arquivo.

## Fase 6.7: barramento de eventos + Google Calendar (ENCERRADA POR REMOÇÃO em 2026-07-26)

- Entregue em 2026-07-15: barramento de eventos interno com log por workspace, conexão Google Calendar (OAuth pelo app, servidor MCP próprio pras sessões), tela Automações com regras CRM > agenda, ensaio e histórico, e tela Calendário local-first sincronizável com o Google. Ver docs/decisoes/2026-07-15-barramento-eventos-google-calendar.md pro histórico completo.
- Removidos por inteiro na versão 1.1.0 (2026-07-26): a camada Google (OAuth, cliente REST, servidor MCP de agenda), o módulo Automações e a tela Calendário. O campo próximo contato segue no cartão do CRM, mas não alimenta mais nada.
- O barramento de eventos (server/src/eventos/barramento.ts) continua no código, mas hoje não tem consumidor: fica como log de auditoria e vira base do feed de atividade do Dashboard na Fase 3 (HUB CORE) de docs/planos/vkos-hub-local-v1/01-fases.md, plano separado deste roadmap.
Fase encerrada por remoção de escopo, não por entrega. Sem critério de fechamento: o recurso que ela descrevia não existe mais no produto.

## Fase 8: fechamento do MVP local (implementação entregue em 2026-07-15)

- Motor multi-IA entregue: Claude e Codex atrás do contrato de provedor, eventos compatíveis, sessões presas ao motor de origem, modelos dinâmicos, skills e AGENTS.md compatíveis, custo Codex estimado e MCP limitado ao Claude de forma visível.
- Jornada de instalação entregue: `Instalar VKOS Hub.cmd`, `Iniciar VKOS Hub.cmd` e `#/setup` com detecção, login, teste real e atalho.
- O pacote agora leva o VKOS junto. A pasta `VKOS/` interna nasce limpa e é registrada automaticamente como workspace, sem a pergunta de onde está o VKOS.
- Portabilidade preparada: dados ignorados, pacote integrado documentado, contrato e LEIA-ME revisados. A remoção de 138 arquivos privados já rastreados ficou preparada, sem executar `git rm` sem aprovação do Jesse.
- QA local em 2026-07-15: 14 testes, dois typechecks e build verdes; teste real mínimo aprovado nos dois motores; instalação limpa aprovada em caminho com espaços e acentos; bundle `assets/index-B16N0nmS.js` servido na porta isolada 46210. A porta 4600 de outra cópia ficou intacta.
- Faltam três gestos fora da implementação: Jesse aprovar a limpeza do índice Git, testar o pacote numa segunda máquina Windows limpa e escolher o canal do ZIP.

Fecha em uso real quando alguém que não é o Jesse instala numa máquina Windows limpa com dois cliques, escolhe o motor, loga e gera uma peça sem tocar em terminal.

## Fase 7: Meta e Google Ads

- Plano de arquitetura pronto em docs/contexto/fase7-meta-plano.md (2026-07-14), aguardando o aval do Jesse e as respostas das 6 perguntas do fim do plano.
- Os aperitivos de WhatsApp, Instagram, Meta e Google Ads saíram da interface em 2026-07-15. O plano continua guardado e volta ao menu somente quando a integração funcionar.
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
