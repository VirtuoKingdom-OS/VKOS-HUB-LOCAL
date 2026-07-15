# Eventos + Google Calendar: plano de execução

Regras de sempre (colar em TODO prompt de agente): português brasileiro, sem travessão "—" nem "·", frase curta, cores só por tokens de `app/web/src/estilos/global.css`, funciona nos 3 temas, NUNCA commit. Raiz: `e:\@OJESSEGOMES - OS CREATOR\VKOS\VKOS-APP\VKOSAPP`. Servidores no ar (4600 backend, 5173 Vite): não derrubar. Typecheck: `npm run checar -w web` e `npm run checar -w server` a partir de `app/`. Cada dono só toca os próprios arquivos.

Agentes: 5 Opus + 1 Sonnet, em três fases. A Fase 2 depende das interfaces da Fase 1 (barramento, oauth, cliente calendar).

Antes da Fase 1, o executor confere: versão atual de `@modelcontextprotocol/sdk` e a forma vigente de declarar tools stdio (a peça 5 da arquitetura depende disso), e os endpoints OAuth do Google (token e revoke). Divergência do plano: adaptar e anotar.

## Fase 1 (paralela): fundação

### Dono A (Opus): OAuth Google + cliente Calendar

Arquivos: `app/server/src/google/oauth.ts` (novo), `app/server/src/google/calendar.ts` (novo), adições em `app/server/src/conexoes/rotas.ts` e `app/server/src/conexoes/catalogo.ts`.

Prompt pronto:

> Você é o Dono A da rodada Eventos + Google Calendar do VKOS Hub. Leia primeiro os quatro arquivos de planos/google-calendar/ e siga as regras de sempre. Sua missão: as peças 3 e 4 da arquitetura. (1) oauth.ts com o fluxo loopback completo (abrir navegador, listener temporário em porta efêmera de 127.0.0.1, PKCE, troca do code, persistência de clientId, clientSecret, refreshToken e contaEmail no conexoes.json do workspace pelo módulo conexoes/estado.ts existente) e tokenDeAcesso(workspaceId) com cache até expirar. (2) calendar.ts com o cliente fetch fino (listarAgendas, listarEventos, criarEvento, atualizarEvento, excluirEvento), timeZone explícito, erros com mensagem honesta em português (401 vira pedido de reconexão). (3) A entrada googlecalendar no catálogo (disponivel true, campos clientId e clientSecret como segredo, montarServidor devolvendo null por enquanto: o dono C liga o servidor MCP na Fase 2) e as rotas POST /conexoes/googlecalendar/conectar e /desconectar (revogar token e limpar). Valide o fluxo com um mock local do endpoint de token (teste unitário ou script curl contra um servidorzinho fake), já que não há conta Google no ambiente. Ao final: npm run checar -w server limpo e relatório com as assinaturas públicas de oauth.ts e calendar.ts.

### Dono B (Opus): barramento de eventos + instrumentação + próximo contato

Arquivos: `app/server/src/eventos/barramento.ts` (novo), toques mínimos em `app/server/src/crm/estado.ts`, `app/server/src/crm/rotas.ts`, `app/server/src/vkos/pecas.ts`, `app/server/src/sessoes/gerenciador.ts`, `app/server/src/tipos.ts`, e o campo novo em `app/web/src/api/crm.ts` + painel de detalhe do CRM em `app/web/src/componentes/crm/`.

Prompt pronto:

> Você é o Dono B da rodada Eventos + Google Calendar do VKOS Hub. Leia primeiro os quatro arquivos de planos/google-calendar/ e siga as regras de sempre. Sua missão: as peças 1 e 2 da arquitetura. (1) barramento.ts com emitir/assinar tipados, tolerância a erro de assinante e log JSONL por workspace com a rotação descrita. (2) Instrumentar os eventos iniciais nos módulos existentes com toque mínimo, sempre depois da persistência: crm:contato-criado, crm:contato-movido (com colunaDe e colunaPara), crm:contato-atualizado, peca:criada (no observador de pecas.ts, junto do debounce existente), sessao:concluida (no gerenciador, onde o status vira concluida). (3) Campo proximoContato opcional (ISO) no Contato: backend aceita no criar e no editar, frontend ganha input datetime-local rotulado "Próximo contato" no painel de detalhe do cartão do CRM, exibindo a data no cartão quando preenchida (discreto, padrão visual do CRM atual). Cuidado: gerenciador.ts e pecas.ts são módulos sensíveis, mudança cirúrgica, nada de refatorar. Ao final: npm run checar -w server e -w web limpos, teste manual via curl das rotas do CRM emitindo evento (conferir eventos.jsonl) e relatório com a API pública do barramento.

## Fase 2 (paralela, após a Fase 1): consumidores

### Dono C (Opus): servidor MCP próprio + card Conexões

Arquivos: `app/server/src/google/mcp-calendar.ts` (novo), ajuste do `montarServidor` de googlecalendar em `catalogo.ts`, `app/server/package.json` (dependência do SDK), e o fluxo Conectar no card em `app/web/src/componentes/conexoes/TelaConexoes.tsx` + `app/web/src/api/conexoes.ts`.

Prompt pronto:

> Você é o Dono C da rodada Eventos + Google Calendar do VKOS Hub. Leia primeiro os quatro arquivos de planos/google-calendar/, o relatório do dono A e siga as regras de sempre. Sua missão: a peça 5 da arquitetura. (1) mcp-calendar.ts: servidor MCP stdio com @modelcontextprotocol/sdk expondo listar_agendas, listar_eventos, criar_evento, atualizar_evento e excluir_evento por cima do calendar.ts do dono A, credenciais por env VK_GCAL_*, descrições das ferramentas em português, erro 401 devolvendo pedido de reconexão legível. (2) montarServidor do googlecalendar devolvendo command node com o caminho certo do script em dev (tsx de src) e em build (dist), no padrão de resolução de caminho que o server já usa, e só quando refreshToken existe. (3) No card do Google Calendar em TelaConexoes: campos clientId e clientSecret como hoje, mais o botão Conectar (chama a rota do dono A, mostra "aguardando autorização no navegador", conclui com a conta conectada), status conectado com o e-mail e botão Desconectar. Estados de erro honestos. Valide o servidor MCP na unha: rodar o script com env fake e mandar um initialize + tools/list por stdio, conferindo o JSON de resposta. Ao final: typechecks limpos e relatório.

### Dono D (Sonnet): automações backend

Arquivos: `app/server/src/automacoes/` (novo: estado.ts, executor.ts, rotas.ts), registro das rotas e do executor no boot em `app/server/src/index.ts` (toque mínimo).

Prompt pronto:

> Você é o Dono D da rodada Eventos + Google Calendar do VKOS Hub. Leia primeiro os quatro arquivos de planos/google-calendar/, os relatórios dos donos A e B e siga as regras de sempre. Sua missão: a peça 6 da arquitetura, só o backend. Regras em automacoes.json por workspace (shape Regra do plano), executor assinando o barramento do dono B no boot, filtro do gatilho, templates com as variáveis do plano, ação calendar:criar-evento pelo calendar.ts do dono A usando o proximoContato do cartão como data (sem data: execução registrada como pendente, sem chamar o Google), histórico em automacoes-historico.jsonl com rotação, modo ensaio (rota que renderiza a regra contra um evento sintético ou o último evento compatível do eventos.jsonl, sem efeito real) e as rotas GET/POST/PATCH/DELETE /automacoes, POST /automacoes/:id/ensaiar, GET /automacoes/historico. Padrão de validação e escrita atômica dos outros módulos do server (olhe crm/estado.ts). Ao final: npm run checar -w server limpo, validação por curl (criar regra, ensaiar contra evento sintético, histórico) e relatório com os shapes e rotas.

### Dono E (Opus): tela Automações

Arquivos: `app/web/src/componentes/automacoes/TelaAutomacoes.tsx` (novo), `app/web/src/estilos/automacoes.css` (novo), `app/web/src/api/automacoes.ts` (novo), rota e item de sidebar em `app/web/src/componentes/layout/Shell.tsx` e `Sidebar.tsx` (toque mínimo).

Prompt pronto:

> Você é o Dono E da rodada Eventos + Google Calendar do VKOS Hub. Leia primeiro os quatro arquivos de planos/google-calendar/, o relatório do dono D (rotas e shapes) e siga as regras de sempre. Sua missão: a tela #/automacoes da peça 6. Item "Automações" na sidebar junto de Conexões. Lista de regras com liga/desliga e excluir com confirmação padrão. Criação guiada em passos simples e visuais: (1) gatilho: escolher o evento (nomes humanos: "Cartão criado no CRM", "Cartão movido de coluna") e, no movido, a coluna de destino pelo NOME (buscar as colunas do CRM pela API existente); (2) ação: criar evento no Google Calendar, com campos de título e descrição mostrando as variáveis disponíveis como chips clicáveis que inserem o {{placeholder}}, duração em minutos; (3) revisão com botão Ensaiar chamando a rota de ensaio e mostrando o resultado renderizado (título, descrição, data) antes de salvar. Histórico das últimas execuções embaixo da lista (sucesso, pendente, erro, com hora). Estado vazio caprichado explicando o conceito com o exemplo do CRM. Aviso claro quando a conexão Google Calendar não está conectada (link pra Conexões). Tokens, 3 temas, motion sutil. Ao final: npm run checar -w web limpo e relatório.

## Fase 3: QA de gesto real (Opus)

Prompt pronto:

> Você é o QA de gesto real da rodada Eventos + Google Calendar do VKOS Hub. Leia os quatro arquivos de planos/google-calendar/ e os relatórios dos donos. Playwright real em http://localhost:5173, viewport 1440x900, screenshots. Regras da casa: valida usabilidade em tamanho real; NENHUMA sessão de IA nesta rodada de QA (nada aqui precisa); sem conta Google real, valide até a fronteira e reporte o que ficou pro gesto do Jesse. Roteiro: (1) barramento: criar cartão no CRM pela UI, mover de coluna, conferir eventos.jsonl do workspace com os eventos e payloads certos; (2) próximo contato: preencher no painel do cartão, salvar, recarregar, conferir persistência e exibição; (3) automações: criar regra guiada completa pela UI (gatilho cartão movido pra coluna Fechado, ação com templates), ensaiar e conferir o resultado renderizado com os dados reais do último evento, ligar a regra, mover um cartão SEM conexão Google e conferir no histórico a falha honesta de conexão ausente (nunca stack trace), mover um cartão sem próximo contato e conferir a pendência; (4) conexões: card Google Calendar com campos e botão Conectar presente e honesto sem credenciais (mensagem clara do que falta, link pro passo a passo); (5) MCP: rodar o script mcp-calendar por stdio com env fake e conferir initialize + tools/list; conferir que com a conexão desligada o mcp-config.json não ganha o servidor; (6) regressões: Conexões existentes (GitHub, Netlify, Notion) intocadas na UI, CRM arrasta e solta funcionando, uma sessão simples do cockpit ainda abre (sem enviar prompt); (7) 3 temas na tela Automações e no card novo. Relatório: matriz com veredito, bugs com severidade e arquivo:linha, screenshots, e a lista exata do que só o Jesse consegue validar (conectar conta real, evento aparecer na agenda, ferramentas MCP numa sessão real).

## Checklist de fechamento (executor)

1. Typecheck web e server limpos.
2. Bugs do QA de severidade média pra cima: corrigir e revalidar o gesto afetado.
3. `npm run build -w web` a partir de `app/` e conferir que a 4600 serve o hash novo (o Jesse usa a 4600).
4. Registrar decisão em `decisoes/AAAA-MM-DD-barramento-eventos-google-calendar.md` e atualizar `contexto/arquitetura.md` e `contexto/roadmap.md`.
5. Entregar ao Jesse o resumo com o passo a passo do 04-setup-google.md pro gesto final dele (criar credenciais e conectar), e a lista do QA do que depende desse gesto.
6. Perguntar ao Jesse se pode apagar a pasta `planos/google-calendar/`.
