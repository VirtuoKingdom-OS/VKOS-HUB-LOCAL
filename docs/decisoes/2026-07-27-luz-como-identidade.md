# Luz como identidade: o tema Claro vira o padrão e a cara do produto

## Contexto

O Jesse avaliou o visual como ruim e apontou o motivo certo: toda tentativa de
redesenho recriava a interface com base nela mesma, nunca algo novo. Ele mandou
três fontes de princípios (Laws of UX, os 14 princípios básicos de UX, os 13
princípios visuais da ESPM) e duas referências de estilo em `outros/`:

- **design01 (Dub)**: canvas branco, fio de 1px como estrutura no lugar de
  sombra, tipografia quase monocromática fazendo o trabalho estrutural, UM azul
  elétrico falando sozinho, pílulas, ação principal quase preta.
- **design02 (Genie)**: canvas azul pálido com cartão de osso, display gigante
  em peso 500 com tracking apertado, raios generosos, ação principal grafite.

As duas referências compartilham a mesma gramática, e ela batia de frente com o
Hub: escuro por padrão, títulos em bold, botões pintados de menta, glow como
aura.

## Decisão

**O Claro é o padrão e a identidade. O Escuro continua como opção, rederivado
da mesma gramática. O Dark VKOS se aposenta**, e um `vkos` salvo no
localStorage migra pro escuro em silêncio no index.html.

A gramática nova, que vale para os dois temas:

1. **Papel sobre luz do dia.** Canvas tingido de menta bem de leve (#eef4f1),
   cartão branco puro, e o fio de `--linha` segurando a estrutura. É o
   mecanismo do Genie (canvas tingido, cartão de osso) somado ao do Dub (o fio
   como estrutura), com o matiz da VK.
2. **O menta é a única voz colorida, e fala pouco.** Em texto usa o corte
   escuro `#03795e` (4,5:1 sobre branco). O vivo da marca (`--menta-viva`,
   #2fd4a7) só aparece onde não é texto: ponto de sessão viva, logo, progresso.
3. **A ação principal é escura, não menta.** `--acao` quase preta no claro,
   invertendo para clara no escuro, como Linear e Vercel. O botão mais denso da
   tela é o que decide, e só ele. Von Restorff aplicado: o elemento diferente
   entre similares é o que se lembra, então só um pode ser diferente.
4. **Título pesa 500, nunca bold**, com tracking negativo que cresce com o
   tamanho. É a assinatura das duas referências (Satoshi e Aeonik travados no
   500). Título de cartão e nome pequeno pesam 600: rótulo importante não é
   título. Número e wordmark ficam 700: ênfase de dado não é título.
5. **O glow encolhe pra anel na luz.** Aura de luz é coisa de fundo escuro. Os
   três tokens continuam (vivo, foco, ação), mas no claro viram anéis e uma
   sombra curta.

A regra de peso mora na camada `tema` de propósito: ela vence os
`font-weight: 700` espalhados nas folhas de tela sem editar as 21.

## Por quê

O diagnóstico do Jesse estava certo: iterar sobre a paleta antiga produzia
variações dela, não uma identidade. A saída foi trocar a base de derivação:
em vez de partir do que o Hub era, partir do que as referências são e trazer só
o matiz da VK junto.

Manter o menta (e não adotar o azul do Dub) foi decisão dele: é o vínculo com a
marca. Mudou o emprego, não a cor: o menta parou de pintar botão, que é onde
ele competia com tudo, e passou a sinalizar vida e seleção, que é onde uma cor
única concentra atenção (Von Restorff, e o princípio de ênfase dos 13 visuais).

Aposentar o Dark VKOS: manter três temas triplica o custo de cada decisão
visual, e uma linguagem nascida clara faria dele uma tradução da tradução.

A trava de contraste foi reescrita para dois temas com 19 pares, incluindo os
dois do botão de ação novo, e passou de primeira porque os valores foram
calculados pela fórmula antes de virar CSS, não aprovados no olho.
