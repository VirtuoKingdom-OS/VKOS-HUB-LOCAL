---
name: stories
description: >
  Monta uma sequência de stories (bastidor, enquete, prova, CTA) na voz do negócio. Use quando o
  comprador disser /stories, "faz uns stories", "o que posto no stories hoje", ou quando /semana
  pedir a sequência de stories.
---

# /stories — Sequência de stories

Stories é conversa e proximidade, não post polido. O objetivo é presença diária e mover a pessoa
um passo em direção ao contato.

## Antes

Leia `cerebro/cerebro.md`. Em branco → `/instalar`. Use voz, oferta, prova e CTA.

## Como montar

Entregue uma sequência de **4 a 7 telas**, cada uma com o que escrever/mostrar e o recurso a usar
(enquete, caixa de pergunta, contagem, link). Um arco que funciona:

1. **Abertura** — chama atenção / puxa assunto (pergunta, cena de bastidor).
2. **Contexto** — o miolo: uma dica, um bastidor, um caso.
3. **Prova/interação** — enquete ou caixa de pergunta pra engajar (o algoritmo gosta, e você
   aprende do público).
4. **CTA** — o passo de negócio: "chama no direct", "link aqui", "responde essa caixinha".

Regras:
- Linguagem de conversa, uma ideia por tela, texto curto (story é rápido).
- Aproveite recursos nativos (enquete, quiz, slider, caixa de pergunta) — eles puxam alcance.
- Voz do Cérebro. CTA concreto, nada de subjetivo.

## Imagens prontas (opcional)

Stories no dia a dia funcionam só com o roteiro (o dono escreve na tela do Insta). Mas quando ele
quiser telas **prontas pra postar** (capa, dica, CTA já desenhados na cara da marca), o VKOS tem
um sistema de stories em `templates/stories/`:

1. Crie a pasta `conteudo/<AAAA-MM-DD>-<tema>/` (ou use a da semana).
2. Copie `templates/stories/modelo-stories.html` pra lá como `stories.html` e preencha as telas
   (cada `.story` é uma tela 1080x1920). Use as cores/fontes do `identidade/design-guide.md`.
   Respeite a área segura no topo e no rodapé (a UI do Insta cobre essas faixas).
3. Renderize: `node templates/stories/render.js conteudo/<AAAA-MM-DD>-<tema>`. As imagens saem em
   `.../instagram-stories/story-01.png`, etc. (Precisa do Playwright, igual ao carrossel.)

A interação (enquete, caixinha) continua sendo feita na hora de postar, no próprio Instagram — a
imagem só prepara o visual.

## Fechar

Se veio do `/semana`, salve na pasta da semana. Ofereça repetir com outro ângulo amanhã.

## Princípios

1. **Proximidade, não produção.** Story é o lado humano da marca.
2. **Sempre uma interação** no meio (enquete/pergunta).
3. **Termina movendo** pra um passo de contato.
