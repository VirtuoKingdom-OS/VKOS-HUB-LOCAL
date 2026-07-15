# WhatsApp local: arquitetura técnica

Estado do código em 2026-07-14. O executor reconfere os arquivos citados e a biblioteca de protocolo antes de despachar.

## Base existente que este plano usa

- Padrão de estado por workspace: `app/dados/workspaces/<id>/...` com escrita atômica (ver crm/estado.ts, conexoes/estado.ts).
- `app/server/src/ws.ts`: `transmitir(mensagem)` broadcast, filtro por workspaceId no payload.
- Gerenciador de sessões (`app/server/src/sessoes/gerenciador.ts`): spawn de `claude -p` com fila, limite global de 5, custo por sessão e por workspace já contabilizado. Os agentes de atendimento REUTILIZAM esse gerenciador (custo honesto de graça).
- Barramento de eventos: especificado na peça 1 de `planos/google-calendar/02-arquitetura.md`. Se ainda não existir quando este plano rodar, é construído primeiro, idêntico.
- CRM: `Contato` com `telefone?` (match de conversa), rotas em server/src/crm/.
- Sidebar: item WhatsApp existe como "em breve" (Shell.tsx e Sidebar.tsx).

## As sete peças da arquitetura

### 1. Transporte: `server/src/whatsapp/transporte.ts` + `baileys.ts` (novos)

- Interface `TransporteWhatsApp` (a peça que permite migrar pro oficial depois): `conectar(workspaceId)`, `desconectar`, `estado()` ("desconectado" | "pareando" | "conectado" | "erro"), `enviarTexto(jid, texto)`, `enviarMidia(...)` (W2), `marcarLida(jid)`, `digitar(jid, ligado)` (W3), callbacks `aoReceberMensagem`, `aoMudarEstado`, `aoSincronizarHistorico`.
- Implementação Baileys (`baileys.ts`): protocolo multi-device do WhatsApp Web via WebSocket, sem navegador. Pacote de referência em 2026: `@whiskeysockets/baileys` (o executor CONFIRMA o fork saudável e a versão vigente antes de instalar; esse ecossistema muda). Alternativa documentada se o Baileys estiver quebrado na época: whatsapp-web.js (puppeteer, mais pesado).
- Credenciais de pareamento em `app/dados/workspaces/<id>/whatsapp/credenciais/` (o multi-file auth state da lib). Pareamento por QR code entregue ao frontend via WS; suporte a código de pareamento por número se a lib oferecer estável.
- Um socket por workspace pareado, todos sobem no boot (mensagem chega com qualquer cliente ativo, mesmo padrão das sessões). Reconexão com backoff exponencial. Logout remoto (usuário removeu o aparelho no celular) derruba pro estado "desconectado" com aviso na UI, sem loop de reconexão.
- Erro de socket NUNCA derruba o server (mesma postura do observador de peças).

### 2. Caixa: `server/src/whatsapp/caixa.ts` (novo)

- Conversas em `app/dados/workspaces/<id>/whatsapp/conversas/<jid>.jsonl` (append-only, sem rotação: histórico é valioso). Linha = mensagem: `{ id, de: "cliente" | "nos" | "agente:<id>", em: ISO, tipo: "texto" | "imagem" | "documento" | "audio" | "figurinha", texto?, midia?: { arquivo, mime, nome? }, status?: "enviada" | "entregue" | "lida" }`.
- Índice em `whatsapp/indice.json`: por conversa `{ jid, nome, ehGrupo, ultimaMensagem, ultimaEm, naoLidas, assumida?: boolean, agentePausado?: boolean }`.
- Dedup por id de mensagem (o protocolo reenvia). Sincronização de histórico no pareamento: best-effort, o que a lib entregar entra na caixa.
- Mídia baixada sob demanda em `whatsapp/midia/<idMensagem>.<ext>` (W2); a caixa guarda só a referência.
- Eventos no barramento: `whatsapp:mensagem-recebida`, `whatsapp:mensagem-enviada`, `whatsapp:conversa-nova` (workspaceId, jid, resumo curto SEM o conteúdo integral: o conteúdo fica na caixa).
- WS pro frontend: `{ tipo: "whatsapp:atualizado", workspaceId }` (índice mudou) e `{ tipo: "whatsapp:mensagem", workspaceId, jid }` (conversa aberta recarrega).

### 3. Rotas: `server/src/whatsapp/rotas.ts` (novo)

- `GET /whatsapp/estado` (estado da conexão + QR atual quando pareando), `POST /whatsapp/parear`, `POST /whatsapp/desconectar`.
- `GET /whatsapp/conversas` (índice paginado), `GET /whatsapp/conversas/:jid/mensagens?antesDe=` (paginado de trás pra frente), `POST /whatsapp/conversas/:jid/enviar`, `POST /whatsapp/conversas/:jid/lida`, `GET /whatsapp/midia/:arquivo` (W2, validado contra traversal).
- `POST /whatsapp/conversas/:jid/assumir` e `/liberar` (W3).
- DEV: `POST /whatsapp/dev/injetar` (injeta mensagem sintética na caixa como se tivesse chegado; existe pro QA validar o pipeline sem número real; só responde quando o header do loopback bate, padrão das rotas locais).

### 4. Tela `#/whatsapp`: `web/src/componentes/whatsapp/` (novo)

- `TelaWhatsapp.tsx`: duas colunas. Sem conexão: estado de boas-vindas com o QR de pareamento (via WS) e o aviso honesto de risco resumido com link pro texto completo. Conectado: lista de conversas (busca, não lidas em badge menta, foto quando houver) e a thread (bolhas texto puro, agrupado por dia, status discretos, scroll infinito pra trás por paginação).
- Composer: textarea de uma linha que cresce, Enter envia, Shift+Enter quebra. Anexo (W2): botão de clipe + arrastar e soltar na thread.
- Painel lateral direito do contato (W2): dados do WhatsApp + cartão do CRM casado por telefone (normalizar: só dígitos, comparar sufixo de 10/11 dígitos), botão "Criar no CRM" quando não existe, link pro cartão quando existe.
- Estilos em `web/src/estilos/whatsapp.css`, tokens, 3 temas.

### 5. Agentes: `server/src/whatsapp/agentes.ts` + `atendimento.ts` (novos, W3)

- Config em `whatsapp/agentes.json`:

```ts
export interface AgenteAtendimento {
  id: string;
  nome: string;
  ativo: boolean;
  modo: "rascunho" | "auto";
  modelo: "haiku" | "sonnet";
  objetivo: string;             // texto curto: o que esse agente faz
  instrucoesExtras: string;     // tom, regras específicas do negócio
  horario: { dias: number[]; de: string; ate: string } | null;  // null = sempre
  escopo: "novas" | "todas";    // conversas novas ou todas as individuais
  limites: { maxRespostasSeguidas: number; maxPorDiaPorConversa: number };
  gatilhosHandoff: string[];    // palavras que transferem na hora
  criadoEm: string;
}
```

- Motor (`atendimento.ts`), assinante do barramento em `whatsapp:mensagem-recebida`:
  1. Elegibilidade: nunca grupo, nunca conversa assumida ou com agente pausado, agente ativo, dentro do horário, dentro do escopo, dentro dos limites.
  2. Debounce humano: espera 30 a 45s juntando mensagens seguidas do cliente antes de agir (uma resposta pro conjunto, não uma por linha).
  3. Contexto da sessão: cwd no workspace (o CLAUDE.md de lá já garante o Cérebro), mais um prompt com a config do agente, as últimas ~30 mensagens da conversa e o cartão do CRM se houver. Instrução de saída estruturada em JSON: `{ resposta, confianca: 0..1, transferir: boolean, motivo }`.
  4. Dispara pelo gerenciador de sessões existente com `skill: "atendimento"` (custo contabilizado; sessões de atendimento NÃO aparecem no canvas do cockpit: filtrar pela skill onde o canvas monta os nós).
  5. Guardrails duros no motor (não confiar só no prompt): transferir se `transferir === true`, se `confianca < 0.6`, se algum gatilho de handoff apareceu na mensagem do cliente, ou se estourou `maxRespostasSeguidas`. Transferir = marca a conversa como pendente de humano (badge na UI) e o agente silencia nela.
  6. Modo rascunho: resposta vira pendência em `whatsapp/rascunhos.json`; UI aprova (envia), edita e envia, ou descarta.
  7. Modo auto: `digitar(jid, true)`, pausa proporcional ao tamanho da resposta (ritmo humano), envia, registra.
  8. Tudo (inclusive silêncio e motivo) em `whatsapp/agentes-historico.jsonl`.
- Prompt do agente (regras mínimas): responder na voz do Cérebro, curto como mensagem de WhatsApp de verdade, nunca inventar preço, prazo ou promessa que não está no Cérebro ou na conversa, nunca se declarar humano se perguntado, na dúvida transferir. Sem travessão e sem markdown na resposta.

### 6. UI dos agentes (W3): `web/src/componentes/whatsapp/Agentes.tsx` + `Rascunhos.tsx`

- Aba/seção "Agentes" na tela WhatsApp: lista com liga/desliga e modo visível, formulário guiado (os campos do shape, com defaults sensatos e explicação curta por campo), histórico das últimas ações.
- Fila de rascunhos: badge no topo, painel com a conversa resumida + resposta proposta editável + aprovar/descartar.
- Na thread: selo discreto quando a mensagem foi de agente, botão "Assumir conversa" no topo (e "Devolver pro agente").

### 7. Ordem, dependência e o que não muda

- W1 = peças 1, 2, 3 (sem mídia, sem dev de agentes) + tela da peça 4 (texto). W2 = mídia + busca + CRM (completa as peças 2, 3, 4). W3 = peças 5 e 6.
- O barramento (google-calendar, peça 1) é pré-requisito da W1 (os eventos whatsapp:* nascem já no barramento).
- Nada de tocar no gerenciador além do filtro de skill no canvas e do que a W3 precisar de mínimo.

## Riscos técnicos

- A lib de protocolo quebra quando o WhatsApp muda o protocolo: fixar versão exata no package.json, e a tela mostra estado de erro honesto com "tentar reconectar". Atualização da lib é manutenção esperada.
- Volume de mensagens: JSONL por conversa aguenta; se a listagem pesar, paginação já prevista. SQLite só se doer de verdade (regra da casa).
- Banimento e termos de uso: tratado por inteiro em `04-riscos.md`, com as mitigações que são DECISÃO DE PRODUTO (nunca iniciar conversa, sem massa, ritmo humano).
- Windows: caminhos com jid contêm `@` e dígitos: sanitizar nome de arquivo do jid (trocar `@` por `_`).
