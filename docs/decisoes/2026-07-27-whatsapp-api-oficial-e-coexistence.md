# WhatsApp só pela plataforma oficial, e projetado para Coexistence

## Contexto

O Jesse pediu um chat estilo WhatsApp no CRM, preparado para a integração real. Antes de escrever qualquer linha, a pesquisa levantou o que a plataforma exige e o que o mercado faz.

Existem dois caminhos para integrar WhatsApp:

1. **Bibliotecas não oficiais** (Baileys, whatsapp-web.js, Evolution API, WAHA). Grátis, rodam local, resolvem o problema do webhook.
2. **WhatsApp Business Platform (Cloud API)**, oficial da Meta.

## Decisão

**Só a plataforma oficial. As bibliotecas não oficiais estão proibidas no caminho padrão do produto.**

A integração será projetada assumindo **Coexistence**, o modo em que o mesmo número roda no app do WhatsApp Business no celular e na Cloud API ao mesmo tempo, com sincronização nos dois sentidos e importação de até 6 meses de histórico. Disponível globalmente desde maio de 2026.

## Por quê

**Sobre as bibliotecas não oficiais:** elas violam os termos e a detecção é automatizada, não depende de denúncia. O relato de campo fala em 2 a 8 semanas até o banimento permanente. O número banido seria o número de trabalho do usuário, que para um prestador de serviço é o ativo mais valioso que ele tem. Um produto que arrisca isso em troca de conveniência de implementação não é um produto honesto. Se um dia existir, será plugin de terceiro, com aviso explícito, fora do caminho padrão.

**Sobre Coexistence:** o caminho clássico da Cloud API é de mão única. Registrar o número na API tira ele do app do celular e não tem volta. Nenhum prestador solo aceita isso, porque o WhatsApp no celular é como ele trabalha. Projetar para migração seria projetar para algo que ninguém vai fazer. Coexistence é o único desenho que não pede esse sacrifício.

## O que a plataforma impõe, e que o produto tem que respeitar

- **Janela de 24 horas.** O cliente manda mensagem, abre uma janela de 24h em que se pode responder livremente e de graça. A janela reinicia a cada mensagem dele. Fechada, só template pré-aprovado. A interface **tem** que mostrar esse relógio, senão o usuário digita, envia e recebe erro sem entender.
- **Cobrança por mensagem** desde julho de 2025, por categoria e por país. Resposta dentro da janela é gratuita. Template de utility dentro da janela deixa de ser gratuito a partir de outubro de 2026, então nenhuma promessa de custo pode ser gravada em pedra.
- **Opt-in obrigatório**, específico por categoria. Disparo em massa fere a política, derruba a qualidade do número e leva a restrição de volume ou banimento. **Não haverá "enviar para todos os selecionados" neste produto.**
- **Mídia expira.** A URL de download vale 5 minutos e o identificador de mídia recebido por webhook vale 7 dias. O arquivo precisa ser baixado e guardado localmente no momento em que o webhook chega. Guardar URL é garantir mídia quebrada.
- **Webhook exige HTTPS público com certificado válido. Não existe polling.** Ver `2026-07-27-webhook-versus-local-first.md`.

## Consequência para esta rodada

Nada da Meta é implementado agora. O chat nasce com o canal `manual`, em que o dono registra o que enviou e o que recebeu, e o Hub organiza a conversa, liga ao contato e ao negócio. O modelo de dados já nasce com os campos que a integração real exige, porque eles custam quase nada agora e custariam migração de histórico de conversa depois.

A regra que a sidebar já segue continua valendo: WhatsApp não aparece como promessa na interface até a integração existir de verdade.
