# Eventos + Google Calendar: arquitetura técnica

Estado do código em 2026-07-14. O executor deve reconferir os arquivos citados antes de despachar.

## Base existente que este plano usa

- `app/server/src/conexoes/catalogo.ts`: catálogo fixo com `EntradaCatalogo { id, nome, descricao, disponivel, transporte, campos, montarServidor(config) }`. GitHub é http com header, Netlify e Notion são stdio via npx com env.
- `app/server/src/conexoes/estado.ts`: segredos por workspace em `app/dados/workspaces/<id>/conexoes.json`, shape `EstadoServidor { habilitado, config: Record<string,string> }`, escrita atômica, máscara nos GETs.
- `app/server/src/conexoes/mcp.ts`: `montarConfigMcp(workspaceId)` gera `mcp-config.json` dos servidores habilitados; `gerenciador.ts` (~linha 330) injeta `--mcp-config` e libera `mcp__<id>` nos allowedTools.
- `app/server/src/crm/`: `Contato { id, nome, empresa?, telefone?, email?, origem?, valorEstimado?, colunaId, tags, notas, criadoEm, atualizadoEm }` em `crm.json` por workspace. Rotas: POST /crm/contatos, PATCH /crm/contatos/:id, PATCH /crm/contatos/:id/mover, etc. NÃO existe campo de data de compromisso.
- `app/server/src/ws.ts`: `transmitir(mensagem)` broadcast pro frontend.
- Não existe nada de eventos nem automações no server hoje (confirmado por grep em 2026-07-14).

## As seis peças da arquitetura

### 1. Barramento de eventos: `server/src/eventos/barramento.ts` (novo)

- Emissor tipado em memória (map de assinantes por tipo de evento; sem dependência nova).
- Shape do evento de domínio:

```ts
export interface EventoDominio {
  tipo: string;            // "crm:contato-movido", "crm:contato-criado", "peca:criada", "sessao:concluida"
  workspaceId: string;
  em: string;              // ISO
  dados: Record<string, unknown>;  // payload específico do tipo
}
```

- `emitir(evento)` entrega pros assinantes de forma tolerante: assinante que lança erro não derruba os outros nem o emissor (try/catch por assinante, log honesto).
- Log de auditoria: cada evento emitido vira uma linha em `app/dados/workspaces/<id>/eventos.jsonl` (append, com rotação simples: acima de ~2000 linhas, mantém as 1000 últimas).
- Instrumentação nos módulos existentes (toque mínimo, sempre DEPOIS da persistência dar certo):
  - CRM: `crm:contato-criado`, `crm:contato-movido` (dados: contato inteiro + colunaDe + colunaPara), `crm:contato-atualizado`.
  - Peças: `peca:criada` quando o observador detecta pasta nova (dados: pasta, tipo).
  - Sessões: `sessao:concluida` no gerenciador (dados: id, skill, titulo).

### 2. Campo "Próximo contato" no CRM

- `Contato` ganha `proximoContato?: string` (ISO com data e hora). Backend aceita no POST e no PATCH; frontend ganha o campo no painel de detalhe do cartão (input datetime-local, rótulo "Próximo contato"). Sem migração: campo opcional, cartões antigos seguem válidos.

### 3. OAuth do Google: `server/src/google/oauth.ts` (novo)

- Fluxo loopback de app instalado: o backend abre a URL de consentimento no navegador padrão, sobe um listener HTTP temporário em `http://127.0.0.1:<porta efêmera>/callback`, recebe o code, troca por tokens e guarda `{ clientId, clientSecret, refreshToken, contaEmail }` no `conexoes.json` do workspace (padrão de segredo local existente).
- Escopo mínimo: `https://www.googleapis.com/auth/calendar.events` (mais `calendar.readonly` se a ferramenta de listar agendas precisar). PKCE ligado.
- `tokenDeAcesso(workspaceId)`: troca o refresh token por access token, com cache em memória até expirar.
- Rotas novas em conexoes/rotas.ts: `POST /conexoes/googlecalendar/conectar` (inicia o fluxo, responde a URL aberta e o resultado quando o callback chegar), `POST /conexoes/googlecalendar/desconectar` (revoga e limpa). O PUT genérico existente continua servindo pra salvar clientId e clientSecret antes do conectar.
- PEGADINHA GRANDE, documentar na UI e no 04-setup-google.md: tela de consentimento em modo "Testing" faz o refresh token expirar em 7 dias. O setup instrui publicar o app OAuth em "Production" (aviso de app não verificado aparece uma vez e o Jesse clica em avançado; uso próprio, sem verificação da Google necessária).

### 4. Cliente Calendar: `server/src/google/calendar.ts` (novo)

- Cliente fino com fetch direto na REST v3 (sem SDK pesado): `listarAgendas()`, `listarEventos(agenda, deIso, ateIso)`, `criarEvento(agenda, { titulo, descricao, inicioIso, fimIso })`, `atualizarEvento(...)`, `excluirEvento(...)`. Erros com mensagem honesta (401 vira "conexão expirou, reconecte").
- Usado pelos DOIS consumidores: o servidor MCP (peça 5) e o executor de automações (peça 6).

### 5. Servidor MCP próprio: `server/src/google/mcp-calendar.ts` (novo)

- Servidor stdio com `@modelcontextprotocol/sdk` (dependência nova do server; o executor confere a versão atual do SDK e a forma vigente de declarar tools).
- Ferramentas: `listar_agendas`, `listar_eventos`, `criar_evento`, `atualizar_evento`, `excluir_evento`. Descrições em português, datas em ISO.
- Recebe as credenciais por env (`VK_GCAL_CLIENT_ID`, `VK_GCAL_CLIENT_SECRET`, `VK_GCAL_REFRESH_TOKEN`): o processo filho não lê conexoes.json.
- Compilado junto do server; entrada de catálogo `googlecalendar` com `montarServidor(config)` devolvendo `{ command: "node", args: [<caminho do script compilado ou tsx em dev>], env: {...} }`. O executor resolve o caminho certo pros dois modos (dev roda de src com tsx, build roda de dist), no padrão que o server já usa pra resolver caminhos (ver comentários em config/estado.ts).
- No catálogo, o card `googleagenda` fica `disponivel: true` com campos clientId e clientSecret (segredo) e o fluxo Conectar da peça 3. A entrada só monta servidor quando o refreshToken existe.

### 6. Automações: `server/src/automacoes/` (novo) + tela `#/automacoes`

- Regras por workspace em `app/dados/workspaces/<id>/automacoes.json`:

```ts
export interface Regra {
  id: string;
  nome: string;
  ativa: boolean;
  gatilho: { evento: string; filtro?: Record<string, string> };  // ex: { evento: "crm:contato-movido", filtro: { colunaPara: "<colunaId>" } }
  acao: {
    tipo: "calendar:criar-evento";
    parametros: Record<string, string>;  // titulo, descricao (templates), duracaoMin, agenda
  };
  criadaEm: string;
}
```

- Executor: assina o barramento no boot; pra cada evento, avalia as regras ativas do workspace do evento (gatilho + filtro), renderiza os templates (`{{nome}}`, `{{empresa}}`, `{{coluna}}`, `{{valorEstimado}}`, `{{proximoContato}}`) e executa a ação via cliente Calendar.
- Data do evento criado: o `proximoContato` do cartão. Sem `proximoContato`: NÃO cria evento; registra execução com status "pendente: cartão sem próximo contato".
- Histórico: cada execução (sucesso, pendência ou erro) vira linha em `app/dados/workspaces/<id>/automacoes-historico.jsonl` (mesma rotação do eventos.jsonl) e as últimas ficam visíveis na tela.
- Modo ensaio: rota que recebe uma regra e um evento sintético (ou o último evento real compatível do eventos.jsonl) e devolve o que SERIA feito (título, descrição e data renderizados), sem chamar o Google.
- Rotas: GET/POST/PATCH/DELETE `/automacoes`, `POST /automacoes/:id/ensaiar`, `GET /automacoes/historico`.
- Tela `#/automacoes` na sidebar (junto de Conexões): lista de regras com liga/desliga, criação guiada em passos simples (gatilho: evento + coluna do CRM por nome; ação: templates com as variáveis visíveis como chips), botão Ensaiar mostrando o resultado, e o histórico embaixo. Estado vazio caprichado explicando o conceito com o exemplo do CRM.

## Riscos e pegadinhas

- Refresh token de consent screen em Testing expira em 7 dias (mitigação na peça 3 e no 04-setup-google.md).
- `montarConfigMcp` roda a cada início de sessão: com a conexão ligada mas token revogado, o servidor MCP nasce mas as chamadas falham 401. As ferramentas devolvem mensagem clara pedindo reconexão (nunca stack trace).
- O barramento é em memória e o server é um processo só: suficiente. Não inventar fila externa.
- Fuso horário: eventos criados com o fuso da máquina (America/Sao_Paulo do Windows do Jesse); explicitar `timeZone` no corpo do evento.
- Broadcast do ws não é escopado por workspace: seguir o padrão atual (workspaceId no payload, filtro no frontend) se a tela de automações quiser atualização ao vivo do histórico.
