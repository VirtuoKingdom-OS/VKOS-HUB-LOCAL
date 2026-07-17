# Contexto do CRM para IA sem publicar dado pessoal

## Contexto

As sessões rodam na pasta do workspace e não alcançam o `crm.json` guardado pelo Hub. Ainda assim, pedidos como criar conteúdo com base nas dores do CRM precisam funcionar sem copiar dados pessoais para uma peça pública.

## Decisão

1. A palavra inteira `crm` no prompt ativa um resumo agregado montado pelo servidor.
2. O resumo inclui funil, follow-ups, tags, esquecidos e até 15 interações recentes, com teto de 8 KB.
3. Telefone e email são removidos inclusive quando aparecem dentro de uma interação.
4. O resumo persiste em `contextoCrm` e volta em toda retomada da sessão.
5. A instrução enviada ao provedor proíbe publicar nome completo, telefone, email ou qualquer dado identificável de cliente. O CRM orienta como insight, nunca como fonte de dados pessoais para a peça.

## Consequência

Qualquer skill pode usar padrões do relacionamento comercial sem botão novo. Prompt sem a palavra CRM mantém custo zero para esse contexto.
