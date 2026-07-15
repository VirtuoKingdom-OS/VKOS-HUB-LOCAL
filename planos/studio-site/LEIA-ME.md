# Plano: Studio de Site

Pasta temporária com o plano completo de arquitetura e execução do Studio de Site: o editor manual profissional de sites, irmão do Studio de carrossel. Pode ser apagada depois que a rodada executar e fechar.

## Como executar

Quando o Jesse tiver tempo, basta dizer:

> Execute o plano da pasta planos/studio-site

O executor (Claude arquiteto da sessão) deve:

1. Ler os três arquivos na ordem: `01-visao.md`, `02-arquitetura.md`, `03-execucao.md`.
2. Verificar se os arquivos citados no plano ainda existem como descritos (o código pode ter evoluído desde 2026-07-14). Divergência pequena: adaptar. Divergência grande: avisar o Jesse antes.
3. Despachar os agentes da Fase 1, depois Fase 2, depois QA, com os prompts prontos do `03-execucao.md`.
4. Cumprir o checklist de fechamento do `03-execucao.md` (typecheck, QA de gesto real, rebuild do web/dist, registro em decisoes/ e contexto/).

## Estado

- Plano escrito em 2026-07-14, logo após a entrega do Site Guiado (rodada 17).
- Nada executado ainda.
- Custo estimado: 4 agentes Opus + 1 Sonnet, em três fases.
