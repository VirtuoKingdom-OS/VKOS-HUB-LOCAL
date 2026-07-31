# Leads do Google Maps: arquitetura

Código auditado em 2026-07-18. Referências arquivo:linha desta data; se o código andou, adaptar. Provedor trocado pra Apify em 2026-07-20; a estrutura de módulos e rotas continua a mesma, muda o miolo da chamada externa.

## O que já existe e vamos reaproveitar sem alterar

- **Catálogo de Conexões** (`conexoes/catalogo.ts:44-56,74`): `EntradaCatalogo` com `id`, `nome`, `campos: CampoConexao[]`, `montarServidor?` opcional. Hoje 4 entradas (GitHub, Netlify, Notion, Google Calendar), todas com `montarServidor` porque hoje toda conexão alimenta MCP. Apify é REST puro: **entra no catálogo sem `montarServidor`**, e o laço de `mcp.ts:37` já pula entradas sem essa função, então não aparece em `montarConfigMcp` nem em sessão de IA nenhuma. Zero mudança em `conexoes/estado.ts` nem `conexoes/rotas.ts`.
- **Armazenamento e mascaramento do token**: `conexoes/estado.ts` (`conexoes.json` por workspace) e `conexoes/rotas.ts:16-21,24-50,67-109` já cobrem validação, mesclagem preservando segredo salvo, e mascaramento na resposta. Nada muda aqui, só a entrada nova no catálogo.
- **Padrão de consumo direto do token** (`publicacao/github.ts:20-27`, `publicacao/netlify.ts:53-63`): módulo de domínio lê `lerConexoes(workspaceId).servidores.apify`, extrai `config.token`, usa em `fetch` com `Authorization: Bearer <token>`. `ErroLeads` no mesmo padrão de `ErroPublicacao`, mensagem "Conecte a Apify em Conexões antes de buscar leads." quando faltar.
- **Campo `origem` do Contato** (`crm/estado.ts:43-56`, campo já existe, string livre, sem uso hoje): guarda `"google-maps:<place_id>"`. Rastreável, não exige migração de schema.
- **`normalizaTags`** (`crm/estado.ts:483-496`): já dedupe e corta em 40 caracteres. A tag `"google-maps"` entra no array `tags` da criação, sem mudança na função.
- **`criarContato`** (`crm/estado.ts:525-548`): já aceita `origem` e `tags` no corpo, já emite `crm:contato-criado`. A importação em lote chama essa função uma vez por lead escolhido, sem reinventar criação.
- **Barramento** (`eventos/barramento.ts:61-84`): tipo livre `"modulo:acao"`, assinante isolado por try/catch. `crm:contato-criado` já dispara por lead importado (a sincronização de calendário e as automações já reagem a esse evento hoje, sem mudança). Evento de RESUMO da importação (`crm:leads-importados`, com contagem) é opcional, só pra rodada futura de automação de boas-vindas.

## Como a Apify funciona (o que muda em relação a uma REST síncrona)

A Apify roda por **Actor**: um programa de extração hospedado na infraestrutura deles. O de Google Maps é o `compass/crawler-google-places`, mantido pela própria Apify. O ciclo é assíncrono: dispara uma execução, ela roda por segundos a minutos, o resultado cai num dataset que se busca em outra chamada.

A Apify também oferece o endpoint **`run-sync-get-dataset-items`** (`POST /v2/acts/{actorId}/run-sync-get-dataset-items?token=...`), que dispara a execução, segura a conexão HTTP aberta e devolve os itens do dataset direto na resposta, com teto de tempo do lado deles (na casa de minutos). **Esse é o caminho preferido do plano**: mantém a rota do Hub com cara de chamada única, sem gerenciar estado de polling. O Dono A deve confirmar na documentação atual o teto exato e o comportamento no estouro; se o teto for curto demais pra buscas reais, o fallback é o ciclo run + polling do status + fetch do dataset, **todo dentro do server, numa única requisição do frontend** (o frontend nunca faz polling na Apify, só espera a rota do Hub responder). Timeout da rota do Hub folgado (3 minutos) e mensagem honesta no estouro.

Regra dura de custo: o Actor cobra por lugar devolvido. **Toda execução manda um limite explícito de resultados** (começar com 40 por busca, constante nomeada no módulo, fácil de ajustar). Nunca disparar busca sem teto.

## O que é novo

### Backend (dono A)

1. **`conexoes/catalogo.ts`**: nova entrada
   ```
   {
     id: "apify",
     nome: "Apify (busca de leads)",
     descricao: "Busca negócios no Google Maps com telefone, site e avaliações.",
     disponivel: true,
     transporte: "http",
     campos: [{ chave: "token", rotulo: "Token de API", segredo: true, dica: "Encontre em console.apify.com, em Settings, Integrations" }],
   }
   ```
   Sem `montarServidor`. `CONTRATO.md:456` atualiza a contagem e a lista de conexões.

2. **`server/src/leads/apify.ts`** (novo módulo de domínio):
   - `buscarLeads(workspaceId, termo): Promise<LeadEncontrado[]>`: lê o token salvo (padrão de `github.ts`), chama o Actor `compass/crawler-google-places` via `run-sync-get-dataset-items` (ou run + polling como fallback, ver seção acima), com o termo de busca, idioma `pt-BR`, limite de resultados explícito. Normaliza a resposta pro formato `LeadEncontrado` (nome, endereco, telefone, site, email quando o Actor devolver, categoria, nota, totalAvaliacoes, placeId). O Dono A consulta a documentação atual do Actor pros nomes exatos dos campos de entrada e saída antes de escrever.
   - `ErroLeads` (400 sem conexão, 502 se a Apify responder erro ou a execução do Actor falhar, com a mensagem do provedor traduzida de forma legível; caso especial: crédito da Apify esgotado vira mensagem clara "Sua conta Apify está sem crédito", não um 502 genérico).
   - Normalização de telefone: uma função pura que extrai só dígitos, usada tanto aqui quanto na checagem de duplicata (mesma regra nos dois lados, senão duplicata escapa por formatação diferente).

3. **`server/src/leads/rotas.ts`** (novo):
   - `POST /api/leads/buscar`, corpo `{ termo: string }`. Chama `buscarLeads`, cruza cada resultado contra os contatos existentes do workspace (`lerEstadoCrm` já expõe a lista) comparando telefone normalizado, marca `jaExisteNoCrm: boolean` em cada item da resposta. Não grava nada. Timeout da rota folgado (3 minutos), porque a execução do Actor demora.
   - `POST /api/leads/importar`, corpo `{ leads: LeadParaImportar[] }` (os itens que o usuário marcou, cada um já trazendo os campos exibidos na pré-visualização, pra não precisar buscar de novo na Apify). Pra cada item, confere duplicata de novo (defesa contra corrida: duas importações quase simultâneas), se novo chama `criarContato` com `origem: "google-maps:<placeId>"`, `tags: ["google-maps"]`, `telefone`, `email` quando veio, `empresa` (o próprio nome do negócio encontrado), `nome` (mesmo texto, já que é um negócio, não uma pessoa; o usuário edita depois se quiser separar). Devolve `{ importados: number, duplicados: number, contatos: Contato[] }`.
   - Registrar o plugin em `index.ts` junto dos outros.

4. **Teste de conexão** (`conexoes/rotas.ts:114-116`, hoje hardcoded pra `github`/`netlify`): adicionar `apify` na lista, validando com a chamada mais leve da API (`GET /v2/users/me` com o token), sem disparar Actor nenhum.

5. **Testes do server**: normalização de telefone (casos com parênteses, espaço, hífen, +55, nono dígito), detecção de duplicata na busca e na importação, `ErroLeads` sem conexão configurada, criação em lote não duplicando quando chamada duas vezes com a mesma lista, normalização da resposta do Actor a partir de um fixture JSON com o formato real documentado.

### Frontend (dono B)

1. **CRM ganha uma aba nova** "Buscar leads", ao lado de Hoje, Quadro e Contatos (`TelaCrm.tsx`, mesmo padrão de abas com `role="tablist"`/`role="tab"`/`aria-selected` que o conserto geral já deixou certo).
2. **Componente novo `BuscaLeads.tsx`**: campo de texto pro termo, botão buscar, estado de carregando honesto e demorado (mensagem tipo "Buscando no Google Maps, pode levar até 2 minutos", com indicação viva de progresso, não um spinner mudo), lista de resultados em cartões (nome, endereço, telefone, site, categoria, nota), checkbox por cartão, cartão de quem já existe no CRM aparece visualmente distinto (borda ou selo "já no CRM", checkbox desabilitado), botão "Importar N selecionados" no rodapé fixo da lista, resumo pós-importação (quantos entraram, quantos foram pulados por duplicata).
3. **Aviso de responsabilidade**: bloco fixo no topo da aba, texto curto e honesto (dado de fonte pública de terceiro, tratar como qualquer dado de negócio, evitar disparo em massa sem critério), no padrão visual de aviso que já existe em outras telas.
4. **API client** (`app/web/src/api/`): funções `buscarLeads(termo)` e `importarLeads(leads)`, com timeout do fetch da busca alinhado ao do server (3 minutos), acima do padrão do client se houver um.
5. **Conexões**: o card da Apify aparece automaticamente na tela de Conexões (`TelaConexoes.tsx`) porque ela já itera o catálogo do backend, sem código novo ali além de eventualmente um ícone pro card.
6. **CSS**: `crm.css`, tokens dos 3 temas, motion sutil na entrada dos cartões de resultado.

## Fronteiras dos donos (sem interseção)

- **Dono A (server)**: `conexoes/catalogo.ts` (só a entrada nova), `server/src/leads/**` (novo), `conexoes/rotas.ts` (só a linha do teste de conexão), `index.ts` (só o registro do plugin novo), testes do server. NÃO toca: `crm/estado.ts` (usa `criarContato` como está, não modifica), web.
- **Dono B (web)**: `app/web/src/componentes/crm/**` (aba nova, componente novo), `app/web/src/api/**` (funções novas), `app/web/src/estilos/crm.css`. NÃO toca: server, `conexoes/catalogo.ts`.

Contrato que permite o paralelismo: o payload de `POST /api/leads/buscar` e `POST /api/leads/importar` (campos exatos do `LeadEncontrado`) está fixado nesta página. Divergência descoberta no meio: o executor arbitra.
