# Plano: CRM v2 e Mapa do sistema

Rodada com duas entregas:

1. **CRM v2**: o CRM sai de "kanban de cartões soltos" pra um CRM de empresa séria que um leigo total opera. Ficha de contato de verdade, negócios separados do contato no pipeline, linha do tempo de interações, tarefas com prazo, aba Hoje (follow-ups do dia, clientes esquecidos, valor no funil), duas visões do mesmo dado (quadro e lista). Referência de produto: Twenty (conceitos destilados da documentação pública; o código dele é AGPL v3 e NUNCA entra, decisão registrada em decisoes/2026-07-16-pacotes-referencia-e-licencas.md).
2. **CRM como contexto de IA, sem vazamento**: quando o pedido de uma sessão citar o CRM ("com base nas dores dos meus clientes do CRM..."), o servidor injeta um resumo agregado no prompt, com a regra dura de nunca publicar dado pessoal de cliente em peça nenhuma. O CRM guarda, a IA consulta como insight, nada pessoal vaza pra site ou carrossel.
3. **Mapa do sistema (interno)**: tela nova, só do Jesse, que mostra a arquitetura do VKOS Hub como uma rede de nós didáticos (React Flow, leitura, zero influência no sistema). Os DADOS do mapa vivem fora de `app/`, na pasta `interno/` da raiz: o pacote de cliente nunca leva, e a tela some sozinha quando os dados não existem. Sem flag de build, sem risco de vazar a arquitetura.

Pasta temporária. Pode ser apagada depois que a rodada executar e fechar, com aval do Jesse.

## Como executar

Quando o Jesse mandar, basta dizer:

> Execute o plano da pasta planos/crm-v2-e-mapa

O executor (a IA arquiteta da sessão) deve:

1. Ler os três arquivos na ordem: `01-visao.md`, `02-arquitetura.md`, `03-execucao.md`.
2. Verificar se os arquivos citados ainda existem como descritos (plano escrito em 2026-07-16, código auditado nesta data por dois agentes). Divergência pequena: adaptar. Divergência grande: avisar o Jesse antes.
3. Despachar a Fase 1 (donos A e C em paralelo), depois a Fase 2 (dono B, consome o contrato do A), depois o QA, com os prompts prontos do `03-execucao.md`.
4. Cumprir o checklist de fechamento.

## Estado

- Plano escrito em 2026-07-16, código auditado nesta data.
- Nada executado ainda.
- Custo estimado: 2 Opus na Fase 1, 1 Opus na Fase 2, 1 Opus no QA. O QA tem direito a UMA sessão de IA real (provar a injeção do contexto do CRM numa geração de verdade).

## Regras duras da rodada

- Twenty é AGPL v3: NENHUMA linha de código dele é lida, copiada, adaptada ou traduzida. Os conceitos de produto já estão destilados no 01-visao.md; os donos não abrem o zip.
- Migração dos dados atuais do CRM é OBRIGATÓRIA e idempotente: nenhum cartão, tag, nota ou coluna do Jesse se perde. Padrão da casa (como a migração de canvas v2 pra v3).
- As integrações vivas não quebram: sincronização com calendário (proximoContato) e automações (eventos crm:contato-*) continuam funcionando sem mudança nas regras existentes do Jesse.
- Dado pessoal de cliente (nome completo, telefone, email) NUNCA entra em peça publicável. O resumo injetado é agregado e a regra vai escrita no prompt.

## O que NÃO entra nesta rodada

- Objetos customizados livres, workflows programáveis, API pública, apps: é o poder de dev do Twenty que contraria o "funciona pra leigo total". Fica de fora de propósito.
- Import/export CSV: anotado como candidato de rodada futura.
- Multi-usuário/equipe: o Hub é operador solo por enquanto.
- Nenhuma mudança nos wizards de criação (EtapasSite, EtapasCriacao): a detecção do CRM é server-side e funciona com o gesto natural de escrever. Isso também evita conflito com o plano site-guiado-v2, que mexe nesses arquivos.
- O Mapa não influencia nada: é leitura pura. Nenhum sistema passa a depender dele.
