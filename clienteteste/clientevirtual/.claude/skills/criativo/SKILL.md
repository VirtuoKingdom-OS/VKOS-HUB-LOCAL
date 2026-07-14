---
name: criativo
description: >
  Cria a ideia e o roteiro do criativo de um anúncio (imagem ou vídeo): o conceito, o texto na
  tela, e como gravar/montar. Pode gerar o criativo em carrossel/imagem via o sistema de
  carrossel. Use quando o comprador disser /criativo, "ideia de imagem pro anúncio", "roteiro do
  vídeo do anúncio", ou quando /anuncio apontar pra cá.
---

# /criativo — O criativo do anúncio

O texto do anúncio (`/anuncio`) só funciona com um criativo que para o dedo. Este comando cria o
conceito e o passo a passo pra produzir.

## Antes

Leia `cerebro/cerebro.md`. Em branco → `/instalar`. Use a oferta e o público do anúncio em questão.

## Passo 1 — Formato

Confirme: **imagem estática** (mais rápido) ou **vídeo** (converte mais, dá mais trabalho)?

## Passo 2 — Conceito e roteiro

**Se imagem:**
- Dê 2-3 conceitos: o que aparece, o **texto na tela** (headline curta que comunica a oferta em 1
  segundo), e a sensação visual (coerente com o Cérebro, bloco 13).
- Se for arte de texto (fundo + frase), você pode gerá-la com o **sistema de carrossel**: monte
  um único slide (ver `.claude/skills/carrossel/SKILL.md`, passos 3 a 5) e renderize.

**Se vídeo:**
- Roteiro de 15-30s: **gancho (3s)** que mostra a dor/oferta → prova/demonstração → **CTA**.
- Marque o que aparece na tela e o que é falado. Priorize os 3 primeiros segundos.

## Passo 3 — Entregar

Salve junto do anúncio (`conteudo/<...>-anuncio-<oferta>/`). Se gerou imagem, aponte o caminho do
PNG. Lembre que o criativo e o texto (`/anuncio`) têm que contar a mesma história.

## Princípios

1. **Os 3 primeiros segundos** valem mais que o resto.
2. **Uma mensagem só** no criativo — a oferta.
3. **Criativo e texto casam.** Mesma oferta, mesma promessa, mesma cara.
