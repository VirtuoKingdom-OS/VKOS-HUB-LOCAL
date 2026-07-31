# Plano: WhatsApp local com acesso total + agentes de atendimento

Pasta temporária com o plano completo do WhatsApp dentro do hub: conexão local com acesso total ao número (sem nada hospedado, sem Agente SDK por enquanto), caixa de mensagens estilo WhatsApp Web, e os agentes de atendimento configuráveis que respondem com base no Cérebro do negócio. Pode ser apagada depois que as rodadas executarem e fecharem.

## Como executar

É o maior dos planos pendentes, então ele é dividido em TRÊS rodadas encadeadas que podem ser executadas em dias diferentes:

- **Rodada W1**: conexão do número + caixa de mensagens (receber e responder texto).
- **Rodada W2**: mídia, busca e vínculo com o CRM.
- **Rodada W3**: agentes de atendimento com base no Cérebro.

Quando o Jesse tiver tempo, basta dizer:

> Execute o plano da pasta docs/planos/whatsapp

(ou "Execute a rodada W2 do plano docs/planos/whatsapp" pra continuar de onde parou; o executor confere o que já foi entregue antes de despachar.)

O executor (Claude arquiteto da sessão) deve:

1. Ler os arquivos na ordem: `01-visao.md`, `02-arquitetura.md`, `03-execucao.md`, `04-riscos.md`.
2. Reconferir o código citado e o estado da biblioteca de protocolo (peça 1 da arquitetura: o ecossistema Baileys muda de fork de tempos em tempos; confirmar o pacote saudável e a versão antes de despachar).
3. Conferir a dependência cruzada: se o plano `docs/planos/google-calendar` ainda não executou, o barramento de eventos (peça 1 de lá) é construído AQUI primeiro, com a mesma especificação.
4. Despachar as rodadas na ordem, cada uma com typecheck, QA e o checklist de fechamento do `03-execucao.md`.

Atenção: parear um número de WhatsApp de verdade é gesto do Jesse (QR code na tela, recomendado começar com um número secundário de teste, ver `04-riscos.md`). O QA valida tudo que dá com o modo de injeção de mensagens sintéticas; o gesto real fecha com o Jesse.

## Estado

- Plano escrito em 2026-07-14.
- Nada executado ainda.
- Relação com `docs/contexto/fase7-meta-plano.md` (rodada 16): aquele documento descreve o caminho OFICIAL da Meta (Cloud API + webhook + túnel + Instagram). Este plano escolhe o caminho local de acesso total pro WhatsApp e mantém o transporte isolado atrás de interface, então migrar pro oficial depois é trocar um módulo. O Instagram continua no plano da fase 7, fora deste.
- Custo de execução: W1 com 4 Opus, W2 com 3 Opus, W3 com 3 Opus + 1 Sonnet. Custo recorrente: zero por mensagem; resposta de agente de IA custa os tokens da sessão (centavos com Haiku).
