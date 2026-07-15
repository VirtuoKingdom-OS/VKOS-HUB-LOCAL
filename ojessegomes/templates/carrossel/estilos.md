# Estilos de carrossel

Este é o catálogo dos estilos de carrossel do VKOS. É a lista curta que o `/carrossel` e o
`/estilo` consultam pra saber quais são as opções — e que serve pra você, dono do negócio,
entender de cara o que cada um faz e quando usar.

Todos os estilos viram imagens 1080x1350 prontas pra postar. A diferença é a cara: uns são
rápidos e não precisam de imagem, outros impressionam mais mas pedem uma imagem gerada por IA.

> **Toda cor sai da identidade do negócio (Cérebro, bloco 13 / `identidade/design-guide.md`).**
> Os modelos abaixo são a *estrutura e a tipografia*; a paleta é sempre a do negócio. No padrão
> VirtuoKingdom: preto `#0A0A0A`, menta `#00C896` (menta-escura `#00875F` no claro), texto
> `#F5F5F5`, e o tema editorial claro em creme `#F2ECDF` com tinta `#15130F`. O que diferencia
> um modelo do outro é o **layout, a tipografia e o tom (claro/escuro)** — nunca uma cor de fora.

---

## Biblioteca VKOS01–VKOS09 (jul/2026)

Os 9 modelos abaixo são a biblioteca **atual**, recriada a partir de referências de inspiração e
**recolorida 100% pra identidade da marca**. Cada um tem um template de produção renderizável
(`modelo-vkosNN.html`, com os `.slide` a 1080×1350) e o `/carrossel` monta em cima dele.

> A galeria de preview com a spec visual completa (capa com imagem, capa sem imagem, página
> interna e página final) e as referências originais vivem no **repositório interno da
> VirtuoKingdom** e **não vêm dentro do VKOS**. A sua referência local, aqui na sua pasta, são os
> próprios arquivos `modelo-vkos01.html` a `modelo-vkos09.html`: dá pra abrir qualquer um deles no
> navegador (clique duas vezes no arquivo) pra ver a cara do estilo antes de escolher.

| Código | Arquivo | Tom | Exige imagem IA? | Quando usar |
|---|---|---|---|---|
| **VKOS01** Cinemático | `modelo-vkos01.html` | escuro | Sim (capa/final) | manifesto, posicionamento, frase-bandeira sobre foto cinematográfica; página de estatística com número gigante em menta |
| **VKOS02** Neon Pixel | `modelo-vkos02.html` | escuro | Opcional | lançamento/anúncio de produto (ex: o próprio VKOS), título em fonte pixel e brilho menta |
| **VKOS03** Editorial Escuro | `modelo-vkos03.html` | escuro | Sim (capa) | peça premium com foto escura + serifa itálica de acento; "como eu faço X" |
| **VKOS04** Tech Claro | `modelo-vkos04.html` | claro | Opcional | clima leve e "tech": headline em camadas (sans + serifa itálica + caixa menta) sobre creme |
| **VKOS05** Editorial Claro | `modelo-vkos05.html` | claro | Opcional | conteúdo calmo/didático; título preto + palavra serifada sublinhada em menta |
| **VKOS06** Dev 3D | `modelo-vkos06.html` | claro→escuro | Sim (capa, render 3D) | tutorial/how-to com bloco de código; final escuro com "link na bio" |
| **VKOS07** Serifa & Menta | `modelo-vkos07.html` | escuro + páginas creme | Sim (capa) | editorial de serifa com chips e destaque menta; posicionamento/opinião |
| **VKOS08** Verde Menta | `modelo-vkos08.html` | escuro (verde→preto) | Sim (capa) | vitrine/portfólio "premium" com serifa itálica gigante e mockups |
| **VKOS09** Pop | `modelo-vkos09.html` | escuro + página creme | Sim (capa ousada) | topo de funil que precisa parar o scroll: imagem surreal + caixa menta; página com card de prompt |

**Regra de imagem-herói (quando exige):** gerar no Gemini/Nano Banana, dark e cinematográfica,
com brilho verde-menta `#00C896`, retrato 4:5, espaço pro texto, "sem texto/sem letras" na
imagem. Exceção do **VKOS09**: a imagem pode ser mais ousada/sensacionalista (topo de funil), mas
o *layout* segue a marca. Salvar em `img/capa.png` na pasta do carrossel (sem a imagem, o template
cai no fundo escuro sozinho e ainda funciona).

> **Status (jul/2026):** os 9 templates de produção estão **prontos e renderizando** a 1080×1350
> (verificados via `render.js`). Cada `modelo-vkosNN.html` traz os tipos de slide do modelo (capa,
> página, final) como blocos de montar — o `/carrossel` copia, preenche com o Cérebro e renderiza.
> Os 5 estilos legados abaixo seguem no repositório como referência/fallback.

---

## Estilos legados (fallback)

Estes 5 seguem no repositório como referência e fallback. Os VKOS0X acima são a evolução direta
deles e devem ser a escolha padrão (Dark→VKOS01/03, Editorial→VKOS07, Declaração→VKOS01,
Claro→VKOS04/05, Produto→VKOS02).

### 1. Dark
- **Arquivo:** `modelo.html`
- **Quando usar:** o do dia a dia. Postar rápido, sem depender de imagem. Dica, lista, aviso.
- **Vibe:** escuro, minimalista, alto contraste. **Exige imagem de IA?** Não.

### 2. Editorial
- **Arquivo:** `modelo-editorial.html`
- **Quando usar:** a peça que impressiona. Capa escura com imagem-herói + corpo claro tipo matéria.
- **Vibe:** capa escura com foto + corpo em "papel" creme, itálico serifado. **Exige IA?** Sim, na capa.

### 3. Declaração
- **Arquivo:** `modelo-declaracao.html`
- **Quando usar:** se posicionar. Opinião forte/manifesto sobre foto cinematográfica.
- **Vibe:** foto escura + frase entre aspas, palavra de destaque no acento. **Exige IA?** Sim.

### 4. Claro
- **Arquivo:** `modelo-claro.html`
- **Quando usar:** clima leve e sofisticado. Fundo creme, título preto + palavra sublinhada.
- **Vibe:** creme dominante, itálico sublinhado no acento. **Exige IA?** Opcional.

### 5. Produto
- **Arquivo:** `modelo-produto.html`
- **Quando usar:** lançar/mostrar um produto. Produto no centro com brilho.
- **Vibe:** escuro e dramático, título neon no acento. **Exige IA?** Sim, a imagem do produto.

---

## Como escolher

1. **Postar rápido, sem imagem?** → **VKOS02 sem imagem** ou o legado **Dark**.
2. **Impressionar / acabamento de revista?** → **VKOS07** / **VKOS03** (escuro) ou **VKOS04/05** (claro).
3. **Posicionamento ou produto?** → **VKOS01** (manifesto) · **VKOS02** (produto) · **VKOS09** (topo de funil).

Na dúvida e sem imagem pronta, vá no tom escuro sem imagem — nunca trava e sai na hora.

---

## Seu estilo travado

O comando `/estilo` te ajuda a escolher o modelo que combina com o seu negócio e **trava** a
paleta em `identidade/design-guide.md`. Depois disso o `/carrossel` já vem com a sua cara por
padrão — suas cores, sua fonte, seu modelo. Dá pra rodar `/estilo` de novo quando quiser mudar.

---

## Novos estilos

Cada modelo novo entra como `modelo-<nome>.html` (com os `.slide` a 1080×1350) e passa a aparecer
nesta lista. O `/carrossel` funciona com qualquer um deles.

---

## Princípios e recoloração

Pra entender o que faz um bom carrossel por dentro (anatomia do slide, scrim da capa, ênfase por
slide), como recolorir um modelo inteiro pra outra marca trocando poucas variáveis CSS, e como
lidar com multi-perfil (mais de um @ no mesmo negócio), veja `principios-modelos.md`. É o destilado
de uma instalação real, escrito pra aplicar em qualquer marca.
