# Sistema de carrossel

Usado pelo comando `/carrossel`. Você não precisa mexer aqui na mão, mas é bom saber como
funciona.

## Estilos disponíveis

Esta pasta traz a biblioteca de estilos de carrossel do VKOS:

- **Biblioteca VKOS01 a VKOS09** (`modelo-vkos01.html` a `modelo-vkos09.html`) — a linha atual,
  já recolorida pra marca. É a escolha padrão.
- **5 clássicos** (`modelo.html` Dark, `modelo-editorial.html`, `modelo-declaracao.html`,
  `modelo-claro.html`, `modelo-produto.html`) — as alternativas de sempre.

O catálogo completo, com a descrição de cada estilo e quando usar cada um, é o **`estilos.md`**
(a fonte única da verdade). Comece por lá. Cada `modelo-*.html` traz um exemplo de cada tipo de
slide (capa, texto, lista, fecho/CTA), é só duplicar e reordenar.

O `/carrossel` copia o modelo escolhido pra `conteudo/<data-tema>/carrossel.html`, preenche com o
seu conteúdo e aplica as cores e a voz do seu Cérebro.

## Renderizar (transformar em imagem)

O **`render.js`** transforma o carrossel HTML em imagens PNG 1080x1350 prontas pra postar.
Funciona com qualquer estilo (lê sempre o `carrossel.html` da pasta):

```
node templates/carrossel/render.js conteudo/<pasta-do-carrossel>
```

As imagens saem em `conteudo/<pasta-do-carrossel>/instagram/`.

## Requisito

Precisa do Playwright instalado. Na primeira vez, rode uma vez na pasta do VKOS:

```
npm install
```

Se o navegador do Playwright faltar, rode também:

```
npx playwright install chromium
```

O `/carrossel` cuida disso pra você se estiver faltando.
