---
name: stories
description: >
  Monta uma sequência de stories (bastidor, enquete, prova, CTA) na voz do negócio. Use quando o
  comprador disser /stories, "faz uns stories", "o que posto no stories hoje", ou quando /semana
  pedir a sequência de stories.
---

# /stories: sequência de stories

Stories é conversa e proximidade, não post polido. O objetivo é presença diária e mover a pessoa
um passo em direção ao contato.

## Antes

Leia `cerebro/cerebro.md`. Em branco? `/instalar`. Use voz, oferta, prova e CTA.

## Como montar

Entregue uma sequência de **4 a 7 telas**, cada uma com o que escrever/mostrar e o recurso a usar
(enquete, caixa de pergunta, contagem, link). Um arco que funciona:

1. **Abertura**: chama atenção / puxa assunto (pergunta, cena de bastidor).
2. **Contexto**: o miolo: uma dica, um bastidor, um caso.
3. **Prova/interação**: enquete ou caixa de pergunta pra engajar (o algoritmo gosta, e você
   aprende do público).
4. **CTA**: o passo de negócio: "chama no direct", "link aqui", "responde essa caixinha".

Regras:
- Linguagem de conversa, uma ideia por tela, texto curto (story é rápido).
- Aproveite recursos nativos (enquete, quiz, slider, caixa de pergunta): eles puxam alcance.
- Voz do Cérebro. CTA concreto, nada de subjetivo.

## Imagens prontas (opcional)

Stories no dia a dia funcionam só com o roteiro (o dono escreve na tela do Insta). Mas quando ele
quiser telas **prontas pra postar** (capa, dica, CTA já desenhados na cara da marca), o VKOS tem
um sistema de stories em `templates/stories/`:

1. **Leia a camada de design antes de montar:** `templates/stories/principios-visuais.md` (as
   regras do formato 1080x1920, as proibições e o teste final), `templates/design/cartela.md`
   (as direções visuais) e `templates/design/estilos/indice.md` (a biblioteca de estilos).
   Escolha UMA direção da cartela e UM estilo do índice que casem com o Cérebro, e leia o
   arquivo do estilo escolhido INTEIRO (`templates/design/estilos/<nome>.md`). Leia também
   `identidade/design-guide.md`: ele manda mais que tudo. Com ele preenchido, as cores e fontes
   da marca ocupam os papéis, a direção vira personalidade e o estilo entra como sistema de
   execução; em branco, a direção e o estilo mandam.
2. **Declare a leitura de design em até 3 linhas** antes da primeira tela: *"Lendo isto como:
   [sequência sobre o tema] para [público], linguagem [vibe], direção [direção da cartela],
   estilo [estilo do índice]."* Aplique o sistema do estilo inteiro (cores, escala tipográfica,
   spacing, motion) adaptado ao formato vertical 1080x1920. Nunca cite a marca de origem do
   estilo no texto das telas.
3. Crie a pasta `conteudo/<AAAA-MM-DD>-<tema>/` (ou use a da semana).
4. Copie `templates/stories/modelo-stories.html` pra lá como `stories.html` e preencha as telas
   (cada `.story` é uma tela 1080x1920). Use as cores/fontes do `identidade/design-guide.md` (ou
   da direção declarada, se o guia estiver em branco), sempre pelas variáveis do `:root`.
   Respeite a área segura no topo e no rodapé (a UI do Insta cobre essas faixas).
5. **Rode o teste final do princípios antes de renderizar:** a pergunta "parece IA?" e o checklist
   de saída. Só renderize o que passar.
6. Renderize: `node templates/stories/render.js conteudo/<AAAA-MM-DD>-<tema>`. As imagens saem em
   `.../instagram-stories/story-01.png`, etc. (Precisa do Playwright, igual ao carrossel.)

A interação (enquete, caixinha) continua sendo feita na hora de postar, no próprio Instagram: a
imagem só prepara o visual.

## Fechar

Se veio do `/semana`, salve na pasta da semana. Ofereça repetir com outro ângulo amanhã.

## Princípios

1. **Proximidade, não produção.** Story é o lado humano da marca.
2. **Sempre uma interação** no meio (enquete/pergunta).
3. **Termina movendo** pra um passo de contato.
4. **Tela pronta passa pela camada de design.** Leitura declarada, área segura respeitada, teste
   final antes do render.
