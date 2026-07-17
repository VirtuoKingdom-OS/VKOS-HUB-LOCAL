# CRM v2 e Mapa do sistema: arquitetura

Auditado no código em 2026-07-16. Raiz: `e:\@OJESSEGOMES - OS CREATOR\VKOS\VKOS-APP\VKOSAPPv2`. Linhas desta data: divergência pequena adapta, grande avisa.

## Estado atual que importa

- CRM backend: `app/server/src/crm/estado.ts` (domínio + persistência) e `rotas.ts` (HTTP sob `/api/crm`, registrado em `index.ts:136`). Modelo: `Contato` (linhas 37 a 53: id, nome, empresa?, telefone?, email?, origem?, valorEstimado?, proximoContato?, colunaId, tags[], notas[], criadoEm, atualizadoEm), `Nota` (31 a 34: em, texto), `Coluna` (56 a 60), `EstadoCrm { colunas, contatos }` (63 a 66). Colunas padrão (69 a 75): Novo contato, Conversando, Proposta enviada, Fechado, Perdido. Persistência: `app/dados/workspaces/<id>/crm.json`, caminho resolvido POR CHAMADA (`caminhoAtivo`, 89 a 92), gravação atômica, saneamento defensivo na leitura (95 a 155). Rotas: GET /crm, POST/PATCH/DELETE contatos, POST notas, PATCH mover, POST/PATCH/DELETE colunas, PATCH colunas/reordenar (registrada ANTES de :id de propósito, rotas.ts:103 a 105).
- Eventos: `emitirCrm` (estado.ts 180 a 184) emite `crm:contato-criado` (320), `-atualizado` (348), `-excluido` (368), `-movido` com `{contato, colunaDe, colunaPara, nomeColunaDe, nomeColunaPara}` (394 a 400). Nota e operações de coluna NÃO emitem. Consumidores: sincronização de calendário (`calendario/sincronizacao.ts` 129 a 143, reage aos 4; usa `proximoContato` do CONTATO) e executor de automações (`automacoes/executor.ts` assina `"*"`; UI só oferece contato-criado e contato-movido com filtro de coluna, `web/src/componentes/automacoes/constantes.ts` 16 a 19; variáveis de template: nome, empresa, coluna, valorEstimado, proximoContato, executor.ts 65 a 80).
- CRM frontend: `app/web/src/componentes/crm/` (TelaCrm, ColunaCrm, CartaoContato, PainelContato, BotaoConfirmar, formatos.ts), CSS único `app/web/src/estilos/crm.css` (618 linhas, tokens). Drag por pointer events sem lib (TelaCrm 215 a 292), busca (51 a 59, 334 a 352), total por coluna (378), painel de detalhe com campos no blur, tags, notas, datetime-local do próximo contato (PainelContato). Rota `#/crm` via `TELAS_FIXAS` (`layout/rotas.ts` 3 a 11), lazy no Shell (38 a 40, render 315).
- Injeção de contexto em sessão: `instrucoesExtras` no contrato (`provedores/contrato.ts` 34 a 37); Claude vira `--append-system-prompt` (claude.ts 159 a 161), Codex vira bloco `<regras-da-sessao>` no stdin (codex.ts 418 a 421). Hoje preenchido só pelo Modo enxuto em `gerenciador.ts:361` (`sessao.modoEnxuto ? REGRA_MODO_ENXUTO : undefined`); a retomada repete a injeção. Precedente de contexto injetado porque o cwd não alcança o dado: o Cérebro no ajuste confinado (`escopo-peca.ts` 119 a 175).
- cwd das sessões: raiz do VKOS do workspace (`sessoes/rotas.ts` 140 e 158) ou `conteudo/<peça>/` no ajuste. `crm.json` fica em `app/dados/workspaces/<id>/`, fora dos dois: a sessão NÃO lê o CRM sozinha. Pra montar resumo no server: `lerEstado()` de `crm/estado.ts:189`.
- Pacote de cliente: decisão 2026-07-15 (inicializador-pacote-local): o pacote leva `app/` COM fonte, `VKOS/`, os dois .cmd e o LEIA-ME; `Instalar VKOS Hub.cmd` builda o web NA MÁQUINA DO CLIENTE (linha 67: `npm.cmd run build -w web`). Pastas da raiz como `contexto/`, `planos/`, `decisoes/` ficam fora do pacote (item 7 da decisão). Não existe flag `VITE_*` nem `import.meta.env` customizada hoje.
- React Flow: `@xyflow/react` ^12.3.0, chunk próprio no build (vite.config 24 a 27), CSS global importado em main.tsx, uso de referência no Cockpit (`ReactFlowProvider` + `ReactFlow` com nodeTypes, fitView, `proOptions={{ hideAttribution: true }}`, Cockpit.tsx 1206 a 1252, 1361 a 1370).
- Sidebar: itens fixos e padrão de item condicional `{cond && (...)}` (Sidebar.tsx 95 a 199; exemplos: Conteúdo 139 a 165, Fontes 167 a 185). Ícones SVG inline no fim do arquivo.

## Peça 1: modelo de dados v2 e migração (dono A)

### Modelo novo (estado.ts)

```ts
interface Interacao { id: string; em: string; tipo: "nota" | "ligacao" | "mensagem" | "reuniao" | "outro"; texto: string }
interface Tarefa { id: string; texto: string; prazo?: string; feita: boolean; criadaEm: string }
interface Contato { id; nome; empresa?; telefone?; email?; origem?; tags: string[]; interacoes: Interacao[]; tarefas: Tarefa[]; proximoContato?: string; criadoEm; atualizadoEm }
interface Negocio { id: string; titulo: string; contatoId: string; colunaId: string; valorEstimado?: number; criadoEm: string; atualizadoEm: string }
interface EstadoCrm { versao: 2; colunas: Coluna[]; contatos: Contato[]; negocios: Negocio[] }
```

- `proximoContato` FICA no contato (contrato vivo da sincronização de calendário; não mexer em sincronizacao.ts).
- `valorEstimado` migra pro negócio (é dinheiro de negócio, não de pessoa).
- `notas` morre como campo: viram `interacoes` de tipo "nota".

### Migração idempotente na leitura (padrão canvas v2 pra v3)

Em `lerEstado()`: arquivo sem `versao` (formato v1) converte na hora: cada contato v1 vira um `Contato` v2 (notas viram interações tipo nota, mesma data e texto, ordem preservada) MAIS um `Negocio` (`titulo` = nome do contato, `contatoId` apontando pra ficha, `colunaId` e `valorEstimado` herdados do cartão). Persiste como v2 na primeira gravação. Arquivo v2 passa direto. Saneamento defensivo estendido aos tipos novos. NENHUM dado se perde: nome, empresa, telefone, email, origem, tags, notas, coluna, valor, próximo contato, datas.

### Rotas novas e ajustadas (rotas.ts)

- GET `/crm`: devolve o `EstadoCrm` v2 inteiro.
- Contatos: POST/PATCH/DELETE como hoje (sem colunaId e sem valorEstimado no contato). DELETE de contato exclui os negócios dele (e emite os eventos de cada um).
- POST `/crm/contatos/:id/interacoes` `{ tipo, texto }` (substitui a rota de notas; manter a rota antiga POST `/crm/contatos/:id/notas` como alias que cria interação tipo nota, pro frontend antigo não quebrar durante o build).
- Tarefas: POST `/crm/contatos/:id/tarefas` `{ texto, prazo? }`, PATCH `/crm/tarefas/:id` `{ texto?, prazo?, feita? }`, DELETE `/crm/tarefas/:id`.
- Negócios: POST `/crm/negocios` `{ titulo, contatoId, colunaId?, valorEstimado? }`, PATCH `/crm/negocios/:id`, DELETE `/crm/negocios/:id`, PATCH `/crm/negocios/:id/mover` `{ colunaId }`.
- Colunas: como hoje.

### Eventos (compatibilidade acima de tudo)

- Criar/atualizar/excluir CONTATO: eventos atuais, mesmo payload `{ contato }` (o contato v2 tem os mesmos campos que as automações usam: nome, empresa, proximoContato; `valorEstimado` sai do contato, então `variaveisDoEvento` do executor precisa de fallback: se o payload trouxer `negocio`, usar o valor dele; ver abaixo).
- Mover NEGÓCIO: emite `crm:contato-movido` com payload `{ contato (a ficha vinculada), negocio, colunaDe, colunaPara, nomeColunaDe, nomeColunaPara }`. Os campos que as automações filtram (`colunaPara`) e as variáveis de template continuam presentes. `automacoes/executor.ts` `variaveisDoEvento` (65 a 80) ganha: `valorEstimado` lido de `dados.negocio?.valorEstimado ?? dados.contato?.valorEstimado` (retrocompat com eventos antigos no ensaio, que lê eventos.jsonl históricos).
- Interações e tarefas: emitir `crm:interacao-registrada` `{ contato, interacao }` (novo, ainda sem consumidor; entra no barramento pra automação futura). Tarefas não emitem nesta rodada.

### O resumo pro contexto de IA (novo módulo `app/server/src/crm/resumo.ts`)

`montarResumoCrm(): string | null` (null quando o CRM está vazio). Markdown agregado, teto de 8 KB:

- Funil: cada coluna com contagem de negócios e soma de valor.
- Follow-ups: quantos atrasados e quantos nos próximos 7 dias.
- Tags mais comuns (top 8, com contagem).
- Clientes esquecidos: contagem de contatos sem interação há mais de 30 dias.
- Vozes dos clientes: as 15 interações mais recentes (tipo + texto, truncado a 200 caracteres cada, SEM telefone e SEM email em lugar nenhum; primeiro nome do contato pode aparecer, é o material de onde a IA tira dores e objeções).

### A injeção (sessoes/rotas.ts + gerenciador.ts)

- Em POST `/sessoes` (rotas.ts 103 a 207), antes de `gerenciador.criar`: se `/\bcrm\b/i.test(prompt)` e `montarResumoCrm()` devolver texto, passar o resumo pro gerenciador (campo novo `contextoCrm?: string` na criação, persistido na sessão como o `modoEnxuto` é, pra retomada repetir).
- Em `gerenciador.ts:361`: `instrucoesExtras` vira a concatenação do que existir: regra do modo enxuto e/ou o bloco do CRM. Formato do bloco:

```
<contexto-crm>
Resumo do CRM do usuario (agregado, gerado agora):
{resumo}
</contexto-crm>
REGRA DURA: use o contexto-crm como insight para orientar conteudo e decisao. E PROIBIDO publicar em qualquer peca, site, carrossel ou texto publico: nome completo, telefone, email ou qualquer dado identificavel de cliente. Insight agregado sim, dado pessoal nunca.
```

- Vale pra qualquer skill, inclusive ajuste confinado (o instrucoesExtras chega igual). Sem menção a "crm" no prompt, nada é injetado: custo zero no caso comum.

## Peça 2: frontend do CRM v2 (dono B, consome o contrato do A)

- `TelaCrm.tsx` ganha três abas no topo: **Hoje**, **Quadro**, **Contatos**. Estado da aba em useState (padrão local, sem URL nova).
- **Quadro**: o kanban atual passa a renderizar NEGÓCIOS (título do negócio + nome do contato + valor). Drag, colunas personalizáveis, fantasma e totais continuam como estão (mesma mecânica de pointer events, só muda o dado). Clicar num negócio abre o painel do CONTATO dele com o negócio em destaque. Botão criar: pergunta contato (busca com autocomplete nos existentes ou cria novo na hora com só o nome) + título do negócio + valor opcional.
- **Contatos** (lista nova): tabela com colunas Nome, Empresa, Tags, Última interação, Próximo contato, Negócios (contagem/valor). Busca no topo (reusa o padrão atual), filtro por tag e por coluna do negócio, ordenação clicando no cabeçalho (nome, última interação, valor). Clicar abre a ficha.
- **Ficha do contato** (evolução do PainelContato): dados no blur como hoje; bloco Negócios (lista com estágio e valor, criar/editar/excluir); linha do tempo de interações (composer com tipo: nota, ligação, mensagem, reunião, outro; lista cronológica, mais nova no topo); tarefas (adicionar com prazo opcional, marcar feita, excluir); próximo contato como hoje (datetime-local, continua alimentando a agenda); tags como hoje; excluir com confirmação dupla avisando que os negócios vão junto.
- **Hoje**: quatro blocos simples: Follow-ups (atrasados em destaque + os de hoje, clicáveis pra ficha), Clientes esquecidos (sem interação há 30+ dias, os 10 mais antigos), Funil (contagem e valor por coluna, barrinha proporcional), Tarefas abertas (as com prazo mais próximo). Nada de gráfico complexo: número grande, rótulo claro, clique leva pro lugar.
- CSS: evoluir `crm.css` com tokens; reaproveitar classes existentes onde der; 3 temas.
- `api/cliente.ts` (ou onde as chamadas do CRM moram hoje, o dono confere): funções novas pros endpoints do A.

## Peça 3: Mapa do sistema (dono C, independente)

### Dados (a parte que nunca vai pro cliente)

- `interno/mapa-sistema.json` na RAIZ do repo (criar a pasta `interno/` com um LEIA.md de uma linha: "Material interno do desenvolvimento. NUNCA entra no pacote de cliente."). Estrutura:

```json
{
  "versao": 1,
  "grupos": [{ "id": "entrada", "nome": "Portas de entrada", "cor": "menta" }],
  "nos": [{ "id": "cerebro", "grupo": "dados", "nome": "Cérebro", "resumo": "A identidade do negócio que toda IA lê antes de agir.", "descricao": "2 a 4 frases didáticas com analogia, sem tecniquês.", "conversaCom": ["sessoes", "cerimonia"] }],
  "ligacoes": [{ "de": "cerebro", "para": "sessoes", "rotulo": "alimenta" }]
}
```

- Conteúdo curado: 18 a 22 nós cobrindo Cérebro, Workspaces/clientes, Sessões de IA (motores Claude e Codex), Skills do VKOS, Peças/Conteúdo, Dashboard e criação guiada, Studio de carrossel, Site Guiado e TelaSite, Publicação (GitHub/Netlify), CRM, Calendário, Automações, Barramento de eventos, Conexões MCP, Fontes de dados, Anexos, VKOS-IDE, Custos, Setup/instalador. Cada resumo em uma linha de gente, cada descrição com analogia (ex: o Barramento é "o sistema nervoso: todo acontecimento passa por ele e quem quiser reagir, assina"). Grupos por camada: Portas de entrada (telas), Motor de IA, Dados do negócio, Integrações, Saída.
- Fonte pro conteúdo: `contexto/arquitetura.md` e `app/CONTRATO.md` (o dono lê e destila didático; nada de copiar tecniquês).

### Servidor

- Rota nova `GET /api/mapa` em módulo pequeno (`app/server/src/mapa.ts`, registrado no index.ts): lê `interno/mapa-sistema.json` resolvendo a partir da raiz do repo (a pasta acima de `app/`; conferir como o server resolve caminhos pra raiz hoje, padrão dos .cmd). Arquivo ausente ou inválido: responde `{ disponivel: false }`. Presente: `{ disponivel: true, mapa }`. Sem cache agressivo (ler do disco a cada chamada é barato e reflete edição ao vivo).

### Frontend

- `app/web/src/componentes/mapa/TelaMapa.tsx` (+ CSS próprio ou bloco novo): React Flow read-only no padrão do Cockpit (`ReactFlowProvider`, `fitView`, `proOptions={{ hideAttribution: true }}`, `nodesConnectable={false}`, sem persistência; arrastar nó pode ficar livre, é só visual da sessão). Nó customizado simples: nome + resumo + cor do grupo. Layout: posições calculadas por grupo em colunas (determinístico a partir do JSON, sem lib de layout externa). Clique abre painel lateral com a descrição e a lista "conversa com" (clicável, navega pro nó). Legenda dos grupos. 3 temas via tokens.
- Sidebar: item "Mapa" condicional, só quando `GET /api/mapa` devolveu `disponivel: true` (o estado global ou um fetch no Shell decide; padrão do item condicional de Fontes, Sidebar.tsx 167 a 185). Tela registrada em `TELAS_FIXAS` e no Shell como as outras (lazy import incondicional é aceitável: o componente é um visualizador genérico sem conteúdo de arquitetura).
- SEM flag de build. A proteção é o dado morar em `interno/`, que o pacote de cliente já não leva (decisão 2026-07-15, item 7). O checklist de fechamento adiciona `interno/` explicitamente à lista de exclusão documentada do pacote (editar a decisão NÃO; adicionar a menção no LEIA-ME do pacote ou onde a lista de exclusão estiver documentada, o dono confere em `decisoes/2026-07-15-inicializador-pacote-local.md` e no LEIA-ME.md da raiz se existir).

### Manutenção viva

- `.claude/skills/atualizar/SKILL.md` (a skill do DESENVOLVIMENTO, na raiz do repo): adicionar uma linha no passo de levantamento: conferir se `interno/mapa-sistema.json` reflete os módulos reais (nó faltando ou sobrando é defasagem a propor).

## Fronteiras entre donos

- Dono A: `app/server/src/crm/estado.ts`, `crm/rotas.ts`, `crm/resumo.ts` (novo), `app/server/src/sessoes/rotas.ts` (só a detecção), `gerenciador.ts` (só a linha do instrucoesExtras e a persistência do contextoCrm), `app/server/src/tipos.ts` se a Sessao precisar do campo, `automacoes/executor.ts` (só o fallback de valorEstimado), testes do server pro modelo v2, migração e resumo.
- Dono B: `app/web/src/componentes/crm/` inteiro, `app/web/src/estilos/crm.css`, as funções de API do CRM no client. NÃO toca no server.
- Dono C: `interno/` (novo), `app/server/src/mapa.ts` (novo) + registro no index.ts, `app/web/src/componentes/mapa/` (novo), Sidebar.tsx (item condicional), `layout/rotas.ts`, Shell.tsx (registro da tela), `.claude/skills/atualizar/SKILL.md` (uma linha). NÃO toca no CRM.
- Interseções: A e C tocam arquivos disjuntos do server (index.ts: C adiciona um registro de rota; A não mexe no index). B espera o contrato do A (as rotas novas), por isso Fase 2. Sidebar: só C toca. Ninguém toca calendário, sincronização, wizards de criação nem NoSessao.
