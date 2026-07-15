# WhatsApp local: plano de execução

Regras de sempre (colar em TODO prompt de agente): português brasileiro, sem travessão "—" nem "·", frase curta, cores só por tokens de `app/web/src/estilos/global.css`, funciona nos 3 temas, NUNCA commit. Raiz: `e:\@OJESSEGOMES - OS CREATOR\VKOS\VKOS-APP\VKOSAPP`. Servidores no ar (4600 backend, 5173 Vite): não derrubar. Typecheck: `npm run checar -w web` e `npm run checar -w server` a partir de `app/`. Cada dono só toca os próprios arquivos.

Antes da W1, o executor: (1) confirma o pacote e a versão saudável do Baileys (ou anota a troca pra whatsapp-web.js com justificativa); (2) garante que o barramento de eventos existe (senão, constrói primeiro pela spec de planos/google-calendar/02, peça 1); (3) reconfere Shell.tsx e Sidebar.tsx pro item WhatsApp.

## Rodada W1: conexão e caixa (4 Opus)

### Dono A (Opus): transporte e caixa

Arquivos: `app/server/src/whatsapp/transporte.ts`, `baileys.ts`, `caixa.ts` (novos), `app/server/package.json` (dependência).

> Você é o Dono A da rodada W1 do plano WhatsApp do VKOS Hub. Leia primeiro os quatro arquivos de planos/whatsapp/ e siga as regras de sempre. Sua missão: as peças 1 e 2 da arquitetura, sem mídia (fica pra W2): interface TransporteWhatsApp, implementação Baileys com pareamento por QR, credenciais por workspace, sockets de todos os workspaces pareados no boot, reconexão com backoff, logout remoto sem loop, erro nunca derrubando o server; e a caixa com JSONL por conversa, índice, dedup por id, sincronização de histórico best-effort, eventos no barramento (whatsapp:mensagem-recebida, whatsapp:mensagem-enviada, whatsapp:conversa-nova) e transmitir do WS (whatsapp:atualizado, whatsapp:mensagem). Sanitize o jid pra nome de arquivo. Sem número real no ambiente: valide a caixa com testes unitários (gravar, dedup, índice, paginação) e o transporte com o socket mockado atrás da interface. Ao final: npm run checar -w server limpo e relatório com a interface do transporte e os shapes.

### Dono B (Opus): rotas e integração no server

Arquivos: `app/server/src/whatsapp/rotas.ts` (novo), registro em `app/server/src/index.ts` (toque mínimo).

> Você é o Dono B da rodada W1 do plano WhatsApp do VKOS Hub. Leia primeiro os quatro arquivos de planos/whatsapp/ e o relatório do Dono A (rode em sequência a ele se preciso pela interface; se rodar em paralelo, construa contra a interface da peça 3 e anote fronteiras). Sua missão: a peça 3 sem as rotas de W2/W3: estado da conexão com QR, parear, desconectar, listar conversas paginado, mensagens paginadas de trás pra frente, enviar texto, marcar lida, e a rota DEV de injeção de mensagem sintética (só loopback). Validação por curl com a caixa real (use a injeção pra popular). Padrões de validação e erro dos outros módulos do server. Ao final: npm run checar -w server limpo e relatório com as rotas e exemplos de payload.

### Dono C (Opus): a tela

Arquivos: `app/web/src/componentes/whatsapp/TelaWhatsapp.tsx` (novo), `app/web/src/api/whatsapp.ts` (novo), `app/web/src/estilos/whatsapp.css` (novo), toque mínimo em `Shell.tsx`/`Sidebar.tsx` (tirar o "em breve").

> Você é o Dono C da rodada W1 do plano WhatsApp do VKOS Hub. Leia primeiro os quatro arquivos de planos/whatsapp/ e os relatórios dos donos A e B. Sua missão: a peça 4 sem mídia e sem painel de CRM: estado desconectado com QR de pareamento ao vivo (WS) e aviso resumido de risco com link, lista de conversas com busca e não lidas, thread com bolhas de TEXTO PURO (nunca markdown) agrupadas por dia, status discretos, scroll infinito pra trás, composer com Enter enviando e Shift+Enter quebrando, marcar como lida ao abrir, atualização em tempo real pelos eventos WS. Identidade VK sóbria (não clonar o verde do WhatsApp; usar os tokens da casa), 3 temas, motion sutil. Use a rota DEV de injeção pra desenvolver sem número real. Ao final: npm run checar -w web limpo e relatório.

### QA W1 (Opus)

> Você é o QA da rodada W1 do plano WhatsApp do VKOS Hub. Leia os quatro arquivos de planos/whatsapp/ e os relatórios. Playwright real em http://localhost:5173, screenshots. Sem número real: use POST /whatsapp/dev/injetar pra popular e simular chegada. Roteiro: estado desconectado digno com QR area; injetar 3 conversas e 40 mensagens numa delas; lista ordena por recência e mostra não lidas; abrir conversa zera o badge; scroll pra trás pagina; injetar mensagem com a conversa aberta atualiza em tempo real; enviar texto grava na caixa (conferir o JSONL) e aparece na thread; busca filtra; 3 temas; regressão: dashboard, galerias e cockpit abrem sem erro de console. Matriz com veredito, bugs com severidade e arquivo:linha. A lista do que só o Jesse valida (parear número de teste, receber e responder de verdade) fecha o relatório. Não conserte nada.

Checklist de fechamento W1: typechecks, bugs médios+ corrigidos, `npm run build -w web` e hash novo na 4600, decisão em decisoes/ (whatsapp local, transporte isolado, riscos aceitos) e roadmap/arquitetura atualizados, gesto do Jesse documentado (parear número secundário).

## Rodada W2: mídia, busca e CRM (3 Opus)

### Dono A (Opus): mídia no backend
Arquivos: whatsapp/transporte.ts, baileys.ts, caixa.ts, rotas.ts (dele).

> Missão: completar as peças 1, 2 e 3 com mídia: receber imagem, documento, áudio e figurinha (baixar sob demanda pra whatsapp/midia/, referência na caixa), enviar imagem e documento, rota GET /whatsapp/midia/:arquivo validada contra traversal, e enviar mídia na rota de envio. Testes das validações.

### Dono B (Opus): mídia e CRM na tela
Arquivos: componentes/whatsapp/, api/whatsapp.ts, estilos/whatsapp.css.

> Missão: completar a peça 4: bolhas de imagem (lightbox padrão do app), documento (nome + baixar), áudio (player nativo), figurinha como imagem; anexo no composer por clipe e arrastar e soltar; painel lateral do contato com o cartão do CRM casado por telefone (normalização por sufixo de dígitos), "Criar no CRM" quando não existe (POST na rota existente do CRM, coluna Novo contato), link pro cartão quando existe.

### QA W2 (Opus)

> Roteiro nos mesmos moldes da W1 (injeção pra receber; envio real de mídia validado até a fronteira do transporte mockado se não houver número pareado; se o Jesse já pareou o número de teste, UM envio real de imagem). Painel CRM: injetar conversa com telefone de um cartão existente e conferir o casamento; criar cartão de número novo e conferir no kanban. Regressões da W1.

Checklist de fechamento W2: igual ao da W1.

## Rodada W3: agentes de atendimento (3 Opus + 1 Sonnet)

### Dono A (Opus): motor de atendimento
Arquivos: `app/server/src/whatsapp/agentes.ts`, `atendimento.ts` (novos), rotas de agentes/rascunhos/assumir em rotas.ts, filtro de skill "atendimento" no canvas (toque mínimo onde o cockpit monta nós de sessão).

> Missão: as peças 5 (inteira) e o lado servidor da 6: config dos agentes, motor com elegibilidade, debounce humano, sessão pelo gerenciador existente com skill "atendimento" e saída JSON estruturada, guardrails DUROS no motor (confiança, gatilhos, limites, transferência), modo rascunho com rascunhos.json, modo auto com digitando e ritmo humano, histórico completo em JSONL, assumir e liberar conversa. Sessões de atendimento não aparecem no canvas do cockpit. Rota de teste de agente: POST /whatsapp/agentes/:id/testar com uma mensagem sintética que roda o pipeline INTEIRO em modo rascunho independente do modo configurado. Valide o motor com o transporte mockado e UMA sessão real de IA no máximo.

### Dono B (Opus): UI dos agentes
Arquivos: `componentes/whatsapp/Agentes.tsx`, `Rascunhos.tsx` (novos), integração na TelaWhatsapp, api/whatsapp.ts, whatsapp.css (bloco próprio no fim).

> Missão: a peça 6: aba Agentes com lista, formulário guiado com defaults e explicações curtas, histórico de ações; fila de rascunhos com badge, aprovar/editar/descartar; selo de mensagem de agente na thread; Assumir conversa e devolver; botão "Testar agente" chamando a rota de teste e mostrando o resultado. Aviso claro do modo rascunho como padrão e do que o modo auto faz antes de deixar promover.

### Dono C (Sonnet): documentação viva e custos

> Missão: registrar no fim da rodada: decisão em decisoes/ (agentes de atendimento, modos e guardrails), atualização de contexto/arquitetura.md e roadmap.md, e um custo estimado honesto por resposta de agente medido nas sessões de teste da rodada (o gerenciador já contabiliza), escrito na tela de Agentes (rodapé discreto "custo aproximado por resposta").

### QA W3 (Opus)

> Roteiro: criar agente pela UI (modo rascunho, Haiku); injetar mensagem de cliente sintética; conferir debounce (duas mensagens seguidas geram UM rascunho); rascunho aparece na fila com resposta na voz do Cérebro (avaliar qualidade honestamente contra o cerebro.md do Estúdio Aura); editar e aprovar envia (fronteira do transporte mockado ou real se pareado); histórico registra tudo; gatilho de handoff: injetar "quero falar com uma pessoa" e conferir transferência e silêncio do agente; limites: estourar maxRespostasSeguidas em modo auto e conferir o corte; assumir conversa pausa o agente; agente nunca age em grupo (injetar mensagem de grupo e conferir silêncio com motivo no histórico); 3 temas; regressões W1/W2 e do cockpit (sessões de atendimento invisíveis no canvas, custos aparecendo no workspace). MÁXIMO duas sessões reais de IA no QA inteiro.

Checklist de fechamento W3: igual aos anteriores, mais: conferir com o Jesse a promoção do primeiro agente real pra modo auto SÓ depois de ele aprovar alguns rascunhos no uso real.
