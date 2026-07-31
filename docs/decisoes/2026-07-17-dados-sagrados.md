# Dados sagrados: quarentena, limpeza e serialização

## Contexto

O checkup de 2026-07-17 achou três riscos reais aos dados do usuário: um crm.json corrompido era sobrescrito por estado vazio só de abrir a tela (perda total silenciosa), a exclusão de workspace deixava tokens (Google, GitHub, Netlify) e dados de clientes no disco pra sempre, e a sincronização CRM agenda tinha corrida que duplicava evento.

## Decisão

1. Leitura do CRM nunca sobrescreve arquivo existente: arquivo que existe mas não parseia (ou não tem forma de CRM) vai pra quarentena `crm.json.corrompido-<timestamp>` por rename e a rota responde erro 409 legível. Estado inicial só nasce quando o arquivo não existe.
2. Migração e saneamento com fallback, nunca descarte: contato sem nome vira "Sem nome", sem coluna cai na primeira, id ausente ganha id novo.
3. Excluir workspace revoga o refresh token do Google (best effort) e apaga `app/dados/workspaces/<id>/` (segredos e PII). A pasta VKOS do cliente fica intacta.
4. Sincronização CRM agenda serializada por `workspaceId::contatoId` (fila de promessas em memória).
5. Negócios passaram a emitir eventos próprios no barramento (`crm:negocio-criado/atualizado/excluido` com `{ contato, negocio }`), sem mudar os eventos antigos.

## Por quê

Dado de negócio é o ativo mais sensível do produto. Perder por corrupção de um byte, vazar por exclusão incompleta ou duplicar por corrida mina a confiança que o Hub existe pra construir. Todos os consertos endurecem contratos existentes sem mudar o fluxo feliz.
