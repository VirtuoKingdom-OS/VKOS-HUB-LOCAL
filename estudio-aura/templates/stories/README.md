# Sistema de stories

Usado pelo comando `/stories`. É o irmão vertical do carrossel: em vez de um post que arrasta,
são telas de story (tela cheia, 1080x1920) prontas pra subir no Instagram. Você não precisa
mexer aqui na mão — mas é bom saber como funciona.

## O que é

O `/stories` copia o `modelo-stories.html` pra `conteudo/<data-tema>/stories.html` e preenche com
o seu conteúdo, usando as cores, a voz e o @ do seu Cérebro. O modelo já traz um exemplo de cada
tipo de tela: **capa/gancho**, **dica/conteúdo**, **interação** (enquete ou caixinha de pergunta)
e **CTA** (chama no direct / link na bio). É só duplicar e reordenar.

**Área segura:** o Instagram desenha a interface dele por cima do story (seu nome em cima, a barra
de resposta embaixo). Por isso o modelo deixa faixas livres no topo e no rodapé — marcadas com um
tracejado guia enquanto você monta. Não encoste texto importante nessas bordas.

**Enquete e caixinha de pergunta:** o adesivo de verdade é um recurso nativo do Instagram — você
adiciona ele na hora de postar, dentro do app. O modelo só reserva e mostra o lugar certo dele,
pra sua arte não brigar com o adesivo.

**`render.js`** — transforma o `stories.html` em imagens PNG 1080x1920, uma por tela.

## Rodar na mão (se precisar)

```
node templates/stories/render.js conteudo/<pasta-dos-stories>
```

As imagens saem em `conteudo/<pasta-dos-stories>/instagram-stories/` como `story-01.png`,
`story-02.png`, etc. — na ordem em que subir no Instagram.

## Requisito

Precisa do Playwright instalado. Na primeira vez, rode uma vez na pasta do VKOS:

```
npm install
```

Se o navegador do Playwright não estiver instalado, rode também:

```
npx playwright install chromium
```

O `/stories` cuida disso pra você se estiver faltando.
