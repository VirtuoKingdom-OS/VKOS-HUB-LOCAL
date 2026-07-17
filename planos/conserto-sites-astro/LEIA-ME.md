# Plano: conserto final da rodada Sites Astro e Design

Rodada curta de conserto pra deixar o pipeline de sites (geração design-first + publicação Astro) funcionando de ponta a ponta, sem pendência. Nasce de um checkup minucioso feito em 2026-07-17, depois da rodada sites-astro-e-design executada e com os 3 bugs do QA já corrigidos.

O que este plano NÃO é: retrabalho da rodada. O conversor, o motor, a publicação em dois modos, o prompt design-first e a biblioteca de estilos estão entregues e testados (64 testes verdes, ensaiar-astro ok na peça real). Este plano fecha os cabos soltos que o checkup encontrou e faz as duas provas que faltam: a peça de teste passar na auditoria visual e uma publicação real com tokens.

## Como executar

Quando o Jesse mandar, basta dizer:

> Execute o plano da pasta planos/conserto-sites-astro

O executor deve:

1. Ler `01-checkup.md` (o que já foi verificado como saudável e o que falta, com evidência) e `02-execucao.md` (as fases e os prompts).
2. Fase 1 (dono único, sem custo de IA de geração): consertos de coerência e miudezas.
3. Fase 2 (UMA sessão real): revisão de design da peça de teste até a auditoria visual aprovar.
4. Fase 3 (com o Jesse presente): publicação real GitHub + Netlify da peça aprovada, validando o modo Astro de ponta a ponta.
5. Fechamento curto.

## Estado

- Plano escrito em 2026-07-17, código e arquivos verificados nesta data (evidência no 01-checkup.md).
- Nada executado ainda.
- Custo estimado: 1 Opus na Fase 1, 1 sessão de IA real na Fase 2 (a Revisão de design). A Fase 3 não usa IA, mas precisa do Jesse presente (tokens reais de GitHub/Netlify e aval de publicar).

## Regras duras

- Peças e dados reais do Jesse são sagrados. A única peça tocada por sessão de IA é a de teste do Estúdio Aura (`2026-07-17-site-do-estudio-aura-estudio-de-design`), criada pelo QA exatamente pra isso.
- A publicação real da Fase 3 só acontece com o Jesse na frente, destino a destino, com aval explícito em cada clique.
- Edições nos templates propagados (principios-visuais, estilos) são cirúrgicas e idênticas nos 4 lugares (vkos2, ojessegomes, estudio-aura, vkos): editar a seção, nunca reescrever o arquivo.
- NUNCA commit nem push sem ordem do Jesse.
