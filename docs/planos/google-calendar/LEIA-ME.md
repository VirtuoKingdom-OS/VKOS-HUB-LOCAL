# Plano: eventos internos + Google Calendar

Pasta temporária com o plano completo de arquitetura e execução do sistema de eventos do hub e da primeira integração que consome ele: o Google Calendar. Pode ser apagada depois que a rodada executar e fechar.

## Como executar

Quando o Jesse tiver tempo, basta dizer:

> Execute o plano da pasta docs/planos/google-calendar

O executor (Claude arquiteto da sessão) deve:

1. Ler os arquivos na ordem: `01-visao.md`, `02-arquitetura.md`, `03-execucao.md`, `04-setup-google.md`.
2. Verificar se os arquivos citados ainda existem como descritos (o código pode ter evoluído desde 2026-07-14). Divergência pequena: adaptar. Divergência grande: avisar o Jesse antes.
3. Despachar as fases do `03-execucao.md` na ordem.
4. Cumprir o checklist de fechamento (typecheck web e server, QA, rebuild do web/dist, registro em docs/decisoes/ e docs/contexto/).

Atenção: a conexão real com o Google exige um gesto único do Jesse (criar as credenciais no Google Cloud e autorizar no navegador). O passo a passo pronto pra ele está em `04-setup-google.md`. O QA valida tudo que dá sem conta real (modo ensaio); o gesto final de conectar é do Jesse.

## Estado

- Plano escrito em 2026-07-14.
- Nada executado ainda.
- Custo de execução: 5 agentes Opus + 1 Sonnet, em três fases. Custo recorrente da integração: zero (API do Google Calendar é gratuita na cota normal, OAuth próprio, nada hospedado).
