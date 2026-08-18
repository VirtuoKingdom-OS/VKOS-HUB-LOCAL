---
name: vkos
description: >
  O mapa do VKOS. Mostra o que dá pra fazer, confirma que o Cérebro está pronto e sugere o
  próximo passo certo pro momento do comprador. Use quando ele digitar /vkos, "o que eu faço
  agora", "o que dá pra fazer", "me ajuda", "estou perdido", ou quando ele parecer sem direção.
---

# /vkos: Por onde começar

É a "tela inicial" do sistema. Serve pra orientar quem chegou agora e pra desencalhar quem não
sabe o próximo passo.

## Fluxo

1. **Leia `cerebro/cerebro.md`** pra saber em que ponto a pessoa está.

2. **Se o Cérebro estiver em branco:**
   - Descubra em que pé a pessoa está com **uma** pergunta: ela já sabe o que vende e pra quem?
     - **Sabe** → o primeiro passo é montar o Cérebro: chame o `/instalar`.
     - **Não sabe / está perdida sobre o rumo** → chame o `/ikigai` primeiro. Ele destrava a
       direção (o que vender, pra quem, por que você) e já entrega pronto pra virar Cérebro.
   - Não liste os outros comandos ainda, um passo de cada vez.

3. **Se o Cérebro estiver pronto:**
   - Cumprimente pelo nome do negócio (puxe do bloco 1) e mostre o mapa dos módulos de forma
     enxuta e sem enfeite:

   ```
   📱 Conteúdo         : /semana (o motor), /ideias, /carrossel, /stories, /legenda, /titulo-gancho
   👤 Perfil           : /bio, /destaques, /perfil
   🌐 Site             : /site, /landing, /blog
   🔎 Google           : /google, /avaliacoes, /seo-local
   📣 Anúncios & Funil : /anuncio, /criativo, /funil
   🎨 Visual           : /estilo (o visual próprio do seu negócio)
   🧭 Estratégia       : /posicionamento (seu ângulo único), /evoluir (o próximo salto)
   🧠 Núcleo           : /cerebro (ver/atualizar seu negócio), /atualizar (reconciliar o sistema)
   ✍️ Escrita          : /humanizer (polimento final de texto)
   ```

   - **Sugira UM próximo passo**, não cinco. Escolha pelo que faz mais sentido:
     - Nunca gerou nada e ainda não afinou o ângulo/visual → sugira `/posicionamento` ou
       `/estilo` pra afiar antes, OU já vá de `/semana` se ele quiser produzir logo.
     - Já tem tudo afinado → `/semana` ("dá uma ideia e eu monto sua semana inteira").
     - Já usou bastante → pergunte o que quer resolver hoje e aponte o comando certo (ou
       `/evoluir` se ele quiser saber onde focar).

4. **Se ele descrever um problema** ("meu Instagram tá parado", "preciso de um site"), traduza
   pro comando certo e já ofereça rodar.

## Princípios

1. **Orientar, não despejar.** Mostrar o mapa, mas terminar com **um** próximo passo claro.
2. **Falar a língua do dono do negócio**, não a de marketing.
3. **Cérebro primeiro, sempre.** Sem ele, o único caminho é `/instalar`.
