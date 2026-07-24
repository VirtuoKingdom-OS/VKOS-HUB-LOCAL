# Feature Meta: analytics de Instagram, Meta Ads e Facebook por workspace

Plano de execução. Escrito para outra IA executar quando o Jesse der o comando.
Antes de qualquer código, leia "Regras da casa" e a fase 0 inteiras.

## O pedido e as decisões já travadas com o Jesse (não reabrir)

1. Feature nova chamada **meta**, liberável por workspace como as outras do catálogo.
   Dentro dela: Instagram, Meta Ads e Facebook (Página). Uma aba nova no workspace.
2. **Somente leitura na v1.** Métricas e desempenho. Nada de criar ou editar anúncio,
   nada de publicar. Criação fica pra uma fase futura, com humano no gatilho.
3. **Modelo de agência.** O Jesse vai operar por uma Business Manager da VirtuoKingdom
   com as contas dos clientes como parceiras, e um usuário de sistema com token. NÃO
   existe OAuth por cliente na v1: o vínculo de cada workspace é feito pelo Jesse, na
   mão, junto com o cliente. Ele vende serviço com implementação, não SaaS self-service.
4. **A conta Meta ainda não existe.** O Jesse vai criar. Tudo deve nascer pronto pra ele
   só preencher: campos claros no painel, um guia passo a passo do que criar na Meta, e
   um "Testar conexão" que diz exatamente o que falta.
5. Enxuto e funcional. Não quebrar a arquitetura atual. Segurança primeiro: token nunca
   chega ao navegador nem ao cliente.

## Regras da casa (inegociáveis)

- NUNCA fazer commit, push ou PR. Sem exceção. O Jesse commita quando validar.
- Português brasileiro em tudo. NUNCA usar o travessão "—" nem o caractere "·".
  Frase curta. Sem jargão.
- Segredo (App Secret, token do usuário de sistema) vive SÓ no servidor: local no
  `app/dados/conexoes.json` central, na nuvem cifrado pelo cofre. Leitura pro front
  sempre mascarada (`mascarar` de `plataforma/cofre.ts`). Nenhum segredo em log.
- O cliente só enxerga o próprio workspace. Toda rota nova respeita o isolamento e o
  gate de feature existentes.
- Nenhuma chamada à Graph API dentro de handler de requisição do cliente: o cliente lê
  snapshots do disco. A Graph API é chamada só pelo coletor e pelas ações do operador.
- Todo texto de interface funciona nos dois temas e nas larguras 390, 768 e 1440 px,
  com os tokens e a camada comum de `app/web/src/componentes/comum/`.
- Ao final: atualizar `interno/mapa-sistema.json` e `interno/mapa-telas.json` (há teste
  que valida), `app/CONTRATO.md`, `CHANGELOG.md`, e criar
  `decisoes/AAAA-MM-DD-feature-meta.md` com contexto, decisão e por quê (data do dia).
- Rodar `npm run testar`, typecheck e build nos três workspaces. Verificação headless
  com playwright-core no padrão dos scripts do scratchpad (subir o server, navegar,
  screenshot, zero pageerror), usando o servidor Graph falso descrito abaixo.

## Fase 0: leitura obrigatória antes de codar

- `app/server/src/features/catalogo.ts`: o manifesto de features (telas, rotasApi,
  dependeDe, disponivelParaCliente) e como o admin liga feature por workspace.
- `app/web/src/componentes/layout/permissoes.ts`: `featureDaTela`, `FEATURES_COM_TELA`
  e `telaPermitida`. `app/web/src/componentes/layout/rotas.ts`: `TELAS_FIXAS`.
- `app/web/src/componentes/layout/Shell.tsx` e `Sidebar.tsx`: como uma tela fixa entra
  no shell e no menu (seguir o padrão do CRM ou do Calendário).
- `app/server/src/conexoes/catalogo.ts` e `estado.ts`: o catálogo de conexões centrais
  do CORE e onde os tokens vivem localmente. A entrada Apify mostra o formato de uma
  conexão sem MCP.
- `app/server/src/google/oauth.ts`: o padrão de endpoints externos MUTÁVEIS só pra
  teste (`configurarEndpointsInternos`). O cliente Graph vai copiar esse padrão.
- `app/server/src/plataforma/cofre.ts`, `banco.ts` e `admin.ts` (a rota
  `definirCredencialAdmin` e a tabela de credenciais): como a nuvem guarda segredo
  cifrado. `plataforma/modo.ts`: MODO core e hub, e o comentário em
  `conexoes/estado.ts` de que o Hub não monta a chave do cofre.
- `app/server/src/crm/estado.ts` (só o topo): o padrão de dados por workspace em
  `pastaDadosWorkspace` com `gravarJsonAtomico`.
- `app/server/src/plataforma/motorRemoto.ts` e `sessoesNuvem.ts` (visão geral): onde a
  nuvem processa trabalho fora do Hub. Necessário pra decidir onde o coletor roda na
  nuvem (ver "Onde o coletor roda", abaixo).
- `interno/mapa-sistema.json` e `interno/mapa-telas.json`: formato dos nós e ligações.

## Arquitetura

### Camadas e fronteira de segurança

Três camadas, com uma fronteira dura entre a segunda e a terceira:

1. **Credencial central** (do operador): App ID, App Secret, id da Business Manager e
   token do usuário de sistema. Uma só pra operação inteira.
2. **Coletor** (server-side): usa a credencial pra chamar a Graph API e grava
   snapshots por workspace. Único lugar que toca o token.
3. **Tela do cliente**: lê snapshots do disco pela rota da feature. Nunca vê token,
   nunca dispara chamada à Meta.

### Credencial central

- Local (CORE): entrada nova `meta` no catálogo de conexões
  (`app/server/src/conexoes/catalogo.ts`), sem `montarServidor` (como a Apify).
  Campos: `appId` (não segredo), `appSecret` (segredo), `businessId` (não segredo),
  `tokenSistema` (segredo). Dicas curtas em cada campo apontando pro guia.
- Nuvem: mesma credencial cifrada pelo cofre, seguindo o padrão da credencial
  `claude_team` em `plataforma/admin.ts`, mas em escopo de SISTEMA (uma linha só, não
  por workspace). Se a tabela atual só suporta escopo por workspace, criar migração
  mínima pra uma tabela `credenciais_sistema (tipo text primary key, valor_cifrado
  text, mascara text, atualizado_em timestamptz)`.
- O token de usuário de sistema da Meta não expira como token de usuário comum.
  Mesmo assim, "Testar conexão" existe pra detectar revogação ou permissão faltando.

### Vínculo por workspace

Arquivo `meta/vinculo.json` na pasta de dados do workspace
(`pastaDadosWorkspace(id)`), gravado com `gravarJsonAtomico`. Campos, todos opcionais
(o cliente pode ter só Instagram, só Ads, ou os três):

```json
{
  "instagramId": "1784...",
  "contaAnunciosId": "act_123...",
  "paginaId": "1029...",
  "vinculadoEm": "2026-07-25T...",
  "ultimaColeta": { "quando": "...", "ok": true, "erro": null }
}
```

Ids de ativo não são segredo. O vínculo é configurado pelo operador (ver painel).

### Cliente Graph API

Módulo novo `app/server/src/meta/graph.ts`:

- Base `https://graph.facebook.com/v23.0` (constante única; conferir no dia da
  implementação qual a versão estável corrente e fixar nela).
- Endpoints mutáveis SÓ pra teste, no padrão de `google/oauth.ts`
  (`configurarEndpointsInternos`), pra apontar pro servidor Graph falso nos testes e
  no headless.
- Funções puras de montagem de URL e parse de resposta, testáveis sem rede.
- Tratamento de erro tipado: token inválido, permissão faltando, ativo inexistente,
  rate limit (código 4 e 17 da Meta), cada um com mensagem clara em português que o
  painel mostra.
- Backoff simples: em rate limit, espera e tenta de novo uma vez; falhou, registra no
  `ultimaColeta.erro` e segue pro próximo workspace. Nunca derruba o coletor inteiro.
- Descoberta de ativos: funções que listam o que o token enxerga (contas Instagram,
  contas de anúncio, Páginas compartilhadas com a BM), pro painel oferecer escolha em
  lista em vez de digitação de id.

### O que a v1 coleta (e o que fica de fora)

Por workspace vinculado, um snapshot por dia mais atualização sob demanda:

- **Instagram (perfil):** seguidores, alcance do dia, visitas ao perfil, cliques no
  site. Grava em `meta/instagram-perfil.jsonl`, uma linha por dia.
- **Instagram (publicações):** as últimas 30 publicações com alcance, curtidas,
  comentários, salvamentos, compartilhamentos e, em Reels, visualizações. Grava o
  estado corrente em `meta/instagram-publicacoes.json` (substitui, não acumula).
- **Meta Ads:** por campanha ativa ou recente (37 dias): gasto, impressões, alcance,
  cliques, CPC, CPM, resultados e custo por resultado. Uma linha por dia por campanha
  em `meta/anuncios.jsonl`.
- **Facebook (Página):** seguidores e alcance da Página por dia em
  `meta/facebook.jsonl`, e as últimas 15 publicações da Página com alcance e
  engajamento em `meta/facebook-publicacoes.json`.

Fora da v1 (registrar no plano de decisão, não implementar): demografia de público,
métricas de stories (janela de 24h exige coleta mais frequente), criação de anúncio,
OAuth por cliente, respostas a comentários. A Meta muda nome de métrica de tempos em
tempos (impressões virou visualizações em 2025): concentrar TODO nome de métrica em um
único mapa por produto dentro de `graph.ts`, pra manutenção futura ser um arquivo só.

Retenção: `.jsonl` diários guardam no máximo 400 linhas por série (13 meses); poda no
próprio coletor ao gravar.

### O coletor

Módulo `app/server/src/meta/coletor.ts`:

- `coletarWorkspace(id)`: coleta os produtos vinculados do workspace, grava snapshots,
  atualiza `ultimaColeta`. Sequencial por produto, com espaçamento entre chamadas.
- `coletarTodos()`: itera os workspaces com vínculo, um por vez (fila serializada, o
  padrão da casa; nunca em paralelo, por respeito ao rate limit da Meta).
- Agendamento: uma vez por dia, cedo (ex: 6h da manhã, horário do servidor), com um
  `setTimeout` reprogramado (sem dependência nova de cron). Guarda a última execução em
  `app/dados/meta-coletor.json` pra não coletar duas vezes no mesmo dia após restart.
- "Atualizar agora" por workspace: rota do operador que dispara `coletarWorkspace` fora
  de hora, com trava de no mínimo 15 minutos entre execuções manuais do mesmo
  workspace.

### Onde o coletor roda na nuvem

Fronteira: o coletor precisa do token; o Hub não monta a chave do cofre. Investigar na
fase 0 qual processo da nuvem tem o cofre (o padrão da credencial claude_team indica o
motor). A regra do plano: o coletor roda no processo que decifra o cofre, e os
snapshots são gravados na pasta de dados do workspace, que o Hub lê normalmente. Se na
topologia atual isso exigir uma ponte (o motor coleta e o Hub só serve), seguir o
padrão broker existente de `motorRemoto.ts`. No CORE local roda tudo no próprio
servidor, simples. Documentar a escolha no arquivo de decisão.

## A feature e a tela

### Feature `meta`

Entrada nova em `CATALOGO_FEATURES`:

```ts
{ id: "meta", nome: "Meta", descricao: "Desempenho de Instagram, anúncios e Facebook.",
  telas: ["meta"], rotasApi: ["/api/meta"], eventosEmitidos: [], eventosConsumidos: [],
  dependeDe: [], usaIa: false, disponivelParaCliente: true }
```

Gate: `meta` entra em `FEATURES_COM_TELA` e `featureDaTela("meta")` devolve `"meta"`.
`TELAS_FIXAS` ganha `"meta"`. Sidebar ganha o item "Meta" (ícone novo na camada comum,
seguindo o padrão dos existentes). No CORE o operador sempre vê; no cliente, só com a
feature ligada.

### Rotas `/api/meta` (workspace, gate da feature)

- `GET /api/meta/estado`: o vínculo (sem segredo), `ultimaColeta` e quais produtos
  estão ativos. É o que decide os estados vazios da tela.
- `GET /api/meta/instagram`, `GET /api/meta/anuncios`, `GET /api/meta/facebook`:
  devolvem os snapshots lidos do disco, já agregados pro front (série diária mais o
  corrente). Sem chamada à Meta no caminho da requisição, sempre.

### Rotas do operador (padrão das rotas admin/gestão existentes)

- `PUT /api/admin/meta/credencial`: grava a credencial central (local: conexões;
  nuvem: cofre). Resposta sempre mascarada.
- `GET /api/admin/meta/credencial`: estado mascarado mais o resultado do último teste.
- `POST /api/admin/meta/testar`: valida o token na Meta (quem sou, permissões
  concedidas, BM acessível) e devolve um diagnóstico por item: ok, falta permissão X,
  token inválido. É o mapa do "o que falta preencher" pro Jesse.
- `GET /api/admin/meta/ativos`: lista os ativos que o token enxerga (Instagram,
  contas de anúncio, Páginas), pro painel de vínculo escolher em lista.
- `PUT /api/admin/meta/vinculo/:workspaceId`: grava o `vinculo.json` do workspace.
- `POST /api/admin/meta/coletar/:workspaceId`: o "Atualizar agora".

### A tela Meta (cliente)

`app/web/src/componentes/meta/TelaMeta.tsx` mais módulos por sub-aba. Sub-abas
internas: **Visão geral**, **Instagram**, **Anúncios**, **Facebook**. Só aparecem as
sub-abas dos produtos vinculados; nenhum vinculado mostra o estado vazio geral.

- **Visão geral:** os números da semana lado a lado (seguidores e alcance do
  Instagram, gasto e resultados dos anúncios, alcance da Página), cada um com a
  variação contra a semana anterior.
- **Instagram:** série de seguidores e alcance (gráfico de linha simples, SVG próprio
  no padrão visual da casa, sem biblioteca nova), e a grade de publicações ordenável
  por alcance, curtidas ou salvamentos.
- **Anúncios:** tabela por campanha com gasto, resultados, custo por resultado, CPC e
  CPM, com o total do período no topo. Período selecionável: 7, 14, 37 dias.
- **Facebook:** série da Página e a lista de publicações com engajamento.
- Estados: "Ainda não conectado" (explica que a VirtuoKingdom conecta junto com o
  cliente, sem botão de conectar pro cliente), "Coletando os primeiros dados",
  "Conexão com problema" (mostra só pro operador o erro; pro cliente, mensagem calma),
  e o estado cheio. Rodapé com "Dados da Meta, atualizados em <data>".
- Sem número inventado em NENHUMA hipótese: célula sem dado mostra traço de ausência
  (usar "sem dado" ou vazio, lembrando que o caractere de travessão é proibido).

### O painel do operador

No CORE, dentro da própria tela Meta quando o usuário é operador, um bloco superior
"Configuração" (o cliente nunca vê):

- Estado da credencial central (mascarada) com link pra tela de Conexões do Sistema,
  onde ela é preenchida de fato.
- Vínculo do workspace atual: três seletores (Instagram, conta de anúncios, Página)
  alimentados por `GET /api/admin/meta/ativos`, botão "Testar conexão" e "Atualizar
  agora", e o resultado da última coleta com erro legível.

Assim não nasce tela nova de gestão: a configuração mora onde o problema aparece.

## O guia pro Jesse (entregável de documentação)

Criar `planos/meta/guia-configuracao-meta.md`, passo a passo em linguagem simples, na
ordem exata de preenchimento:

1. Criar a Business Manager da VirtuoKingdom (business.facebook.com).
2. Iniciar a verificação de negócio (documentos da empresa). É o passo mais lento;
   fazer primeiro e deixar correndo.
3. Criar o App em developers.facebook.com (tipo Business), anotar App ID e App Secret
   e onde colar cada um no VKOS.
4. Criar o usuário de sistema na BM, gerar o token com as permissões da v1
   (`instagram_basic`, `instagram_manage_insights`, `ads_read`, `pages_read_engagement`,
   `read_insights`, `business_management`; conferir os nomes vigentes na submissão) e
   onde colar no VKOS.
5. Submeter o App Review com os textos de caso de uso prontos (o guia traz rascunhos) e
   o que gravar no vídeo de demonstração.
6. Por cliente: como adicionar a conta dele como parceira na BM (Instagram profissional,
   conta de anúncios, Página) e em seguida vincular no painel do VKOS.
7. O que o "Testar conexão" responde em cada estado e o que fazer em cada erro.

## O servidor Graph falso (teste e demonstração)

Módulo de teste `app/server/src/meta/graph-falso.ts` (usado só em teste e no headless,
nunca em produção): um servidor HTTP local que responde os endpoints usados com
fixtures realistas (perfil, publicações, campanhas, Página, erros de permissão e rate
limit). Os testes apontam o cliente Graph pra ele via endpoints mutáveis. É também o
que permite a verificação headless da tela cheia sem existir conta Meta ainda, e serve
de demonstração pro Jesse ver a tela pronta antes da burocracia terminar.

## Fases de execução

Cada fase termina com os testes dela passando.

- **Fase 1, fundação:** `meta/graph.ts` (URLs, parse, erros tipados, mapa de métricas,
  endpoints mutáveis), `meta/graph-falso.ts`, credencial central (conexões no local,
  cofre na nuvem), vínculo por workspace. Testes: montagem de URL, parse com fixture,
  erros tipados, máscara na leitura, vínculo atômico.
- **Fase 2, coletor:** `meta/coletor.ts` com snapshots dos quatro conjuntos, poda de
  retenção, fila serializada, agendador diário com marca de última execução, trava do
  atualizar agora. Testes contra o Graph falso: coleta feliz, permissão faltando não
  derruba a fila, rate limit faz backoff, poda respeita o limite.
- **Fase 3, rotas:** `/api/meta/*` (leitura de snapshot, gate de feature, isolamento) e
  `/api/admin/meta/*` (credencial, testar, ativos, vínculo, coletar). Testes de rota
  no padrão dos existentes.
- **Fase 4, feature e tela:** catálogo, permissões, Sidebar, TelaMeta com as quatro
  sub-abas, gráfico SVG, estados vazios, bloco de configuração do operador, estilos nos
  dois temas e nas três larguras.
- **Fase 5, guia e verificação:** `guia-configuracao-meta.md`, headless com o Graph
  falso (tela cheia, estados vazios, painel do operador com teste de conexão), suíte
  completa, typecheck, build, mapas, CONTRATO, CHANGELOG, decisão.

## Riscos mapeados

- **A burocracia da Meta é o poste longo.** O guia existe pra começar já. Até a
  aprovação, tudo funciona contra o Graph falso e contra os ativos próprios do Jesse
  (modo de desenvolvimento do App).
- **Nome de métrica muda.** Todo nome vive num mapa único por produto em `graph.ts`.
- **Rate limit.** Fila serializada, espaçamento, backoff, e coleta diária (não por
  visita). O "Atualizar agora" tem trava de 15 minutos.
- **Topologia da nuvem.** A fronteira (token só onde há cofre, cliente só lê snapshot)
  é fixa; o encaixe exato (CORE ou motor) se decide na fase 0 com o código na frente e
  fica registrado na decisão.
- **Cliente sem conta profissional.** O guia orienta a conversão (Business ou Creator)
  como parte da implementação com o Jesse. A tela mostra o estado "ainda não conectado"
  sem culpar o cliente.
- **Escopo enxuto de propósito.** Demografia, stories e criação de anúncio ficam fora
  da v1 e entram por fase própria depois que o dado básico estiver rodando no parque.
