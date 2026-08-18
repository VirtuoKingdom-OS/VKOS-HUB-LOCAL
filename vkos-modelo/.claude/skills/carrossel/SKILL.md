---
name: carrossel
description: >
  Cria um carrossel de Instagram (texto dos slides) e renderiza as imagens PNG prontas pra
  postar, usando o template de estilo e o Cérebro do negócio (cores, voz, @). Use quando o
  comprador disser /carrossel, "faz um carrossel sobre X", "quero um post em carrossel", ou
  quando outro comando (ex: /semana) pedir um carrossel.
---

# /carrossel: Carrossel pronto pra postar

Entrega o texto dos slides E as imagens renderizadas. O comprador só baixa e posta.

## Antes

Leia `cerebro/cerebro.md`. Se estiver em branco, chame o `/instalar`. Pegue de lá: a voz, os
pilares, o @ (bloco 12/handle), as cores (bloco 13) e o CTA.

Leia também `identidade/design-guide.md`: é o visual travado do negócio (cores, fontes, o
**estilo de carrossel** escolhido). Se estiver preenchido, use ele como padrão. Se estiver em
branco, tudo bem seguir com o Dark, mas ofereça o `/estilo` pra deixar com a cara dele. E dê uma
olhada em `identidade/inspiracoes/`: se o dono deixou referências lá, elas guiam o acabamento.

E leia a camada de gosto: `templates/carrossel/principios-visuais.md` (o critério de execução,
as proibições anti-slop e o teste final) e `templates/design/cartela.md` (as direções visuais,
usadas quando o design-guide está em branco). A precedência é a do princípios: o modelo travado
manda mais que tudo, o design-guide manda mais que a cartela.

## Caminho rápido: modelo já escolhido

Se o pedido já diz **"usando o modelo X"** (ou "no modelo X", "estilo X"), a escolha do estilo já
foi feita na interface do app. Não repita a escolha e não gaste leitura com o catálogo:

- **NÃO leia** `templates/carrossel/estilos.md` nem `templates/carrossel/principios-modelos.md`, e
  **não abra os outros templates**. Esses arquivos só servem pra escolher o estilo, e a escolha já
  está feita.
- **Pule o Passo 3 inteiro.**
- Leia só o template escolhido: `templates/carrossel/modelo-<X>.html`. Todo o resto do fluxo segue
  igual (conteúdo no Passo 2, montar no Passo 4, renderizar no Passo 5, entregar no Passo 6).

O modelo escolhido é um contrato estrutural, não uma referência vaga. Copie o arquivo real para a
pasta da peça antes de editar. Preserve anatomia, classes, geometria, hierarquia, ritmo, componentes
e acabamento. Cores, fontes, imagens e instruções do usuário personalizam a cópia, mas não autorizam
trocar o modelo por um desenho inventado, salvo pedido explícito. Antes de terminar, compare a peça
com o template e confirme que os tipos de slide e as classes estruturais seguem reconhecíveis.

O `<X>` vira o arquivo assim:

- `vkos01` a `vkos09` → `modelo-vkos01.html` até `modelo-vkos09.html`.
- Legados: `dark` → `modelo.html`, `editorial` → `modelo-editorial.html`, `declaracao` →
  `modelo-declaracao.html`, `claro` → `modelo-claro.html`, `produto` → `modelo-produto.html`.

O que continua valendo mesmo no caminho rápido: ler o `cerebro/cerebro.md` e o
`identidade/design-guide.md` (seção **Antes**, são as cores e a voz, não o catálogo), ler a
camada de gosto (`templates/carrossel/principios-visuais.md` e `templates/design/cartela.md`,
com a leitura de design declarada no Passo 2), a regra de imagem-herói do Passo 4 (o próprio
SKILL.md já diz quais modelos pedem imagem, sem precisar do catálogo) e o teste final do Passo 5.
Se o modelo pedido não bater com nenhum desses arquivos, aí sim ignore este atalho e siga o
fluxo normal a partir do Passo 3.

### Caminho rápido composto: capa e páginas diferentes

Se o pedido disser **"usando a capa do modelo A e as paginas do modelo B"**, a interface já fez
as duas escolhas. Leia somente os templates A e B e pule o Passo 3.

1. Copie o modelo B para `conteudo/<pasta>/carrossel.html` como base. As páginas de
   desenvolvimento e o bloco FINAL/CTA vêm dele.
2. Extraia do modelo A o bloco `<!-- CAPA -->`, que é o primeiro `.slide`, e apenas as regras de
   CSS, variáveis e fontes necessárias para essa capa.
3. Insira a capa como o primeiro `.slide` da base. Adicione uma classe exclusiva, como
   `capa-modelo-a`, e prefixe com ela todas as regras transplantadas, para o CSS da capa não
   alterar as páginas e o CSS das páginas não quebrar a capa.
4. Se os modelos usarem famílias tipográficas diferentes, importe as duas. Preserve
   `img/capa.png` como imagem-herói da capa.
5. Antes de renderizar, confira que não há vazamento de estilos entre capa, desenvolvimento e
   FINAL. A forma simples **"usando o modelo X"** continua seguindo o caminho rápido normal.

## Passo 1: Tema e ângulo

- Se o comprador deu o tema, use. Se não, sugira 3 temas puxados dos pilares e deixe ele
  escolher.
- Defina o ângulo: geralmente **lista** ("5 erros que...", "3 sinais de que...") ou
  **narrativa** (problema → virada → solução). Lista rende carrossel forte.

## Passo 2: Escrever os slides

- Antes do primeiro slide, **declare a leitura de design em UMA linha**, no modelo do
  `principios-visuais.md`: *"Lendo isto como: carrossel de [ângulo] para [público], linguagem
  [vibe], modelo [X], paleta [da marca ou direção da cartela]."* Declarada, ela vira lei pro
  resto da peça.
- 6 a 9 slides. Estrutura: **capa (gancho)** → desenvolvimento/itens → **CTA final**.
- Uma ideia por slide. Frase natural, na voz do Cérebro. Nada de bullet seco.
- Capa tem que prender em 1 linha. Último slide chama pra ação (o CTA do Cérebro; se for pra
  perfil/bio, use "Acesse o link na bio"). **Nunca** ponha link clicável na imagem: imagem não
  clica; direcione pra bio.
- Regra do subjetivo: nada de "viralizar/enriquecer". Dor e resultado concretos.

## Passo 3: Escolher o estilo

> Se você entrou pelo **Caminho rápido** (o pedido já trouxe "usando o modelo X"), pule este passo
> inteiro: o estilo já está escolhido e o catálogo não precisa ser lido.

### A biblioteca de estilos e quando ela entra

O carrossel tem duas rotas, e a precedência do formato decide qual manda:

- **Peça com modelo travado do catálogo** (`templates/carrossel/estilos.md`, linhas vkos01 a
  vkos09): o modelo manda e a biblioteca de estilos (`templates/design/estilos/`) NÃO se aplica.
  A estrutura, a tipografia e o tom são do modelo; a cartela e o design-guide no máximo orientam a
  recoloração pela paleta da marca, como já é hoje. Não leia o índice de estilos nesse caso.
- **Criação livre** (sem modelo travado, ou um modelo aberto tipo editorial, declaração ou produto
  sem linha fixa): aí entra a leitura de design completa, igual ao padrão da skill `/site`. Leia
  `templates/design/cartela.md` e `templates/design/estilos/indice.md`, escolha UMA direção e UM
  estilo que casem com o Cérebro, leia o arquivo do estilo INTEIRO
  (`templates/design/estilos/<nome>.md`), some o estilo à declaração da leitura de design (direção
  mais estilo), aplique o sistema do estilo inteiro (cores, escala tipográfica, spacing, motion) e
  rode o teste final "parece IA?" do princípios antes de renderizar. Nunca cite a marca de origem
  do estilo. O design-guide do negócio manda mais que tudo isso.

**Se o `design-guide.md` já tem um estilo travado, use esse**: é a cara do negócio, não fique
perguntando toda vez. Só confirme numa linha ("vou no seu estilo Editorial, tá?").

Se ainda não tem estilo definido, consulte o catálogo em `templates/carrossel/estilos.md` (a
biblioteca completa, com a descrição de cada modelo) e ofereça a escolha em linguagem simples,
recomendando 1-2 que combinam com a sensação da marca.

> **Princípios dos modelos.** Pra entender a anatomia comum de um bom carrossel, como recolorir
> um modelo inteiro pra outra marca trocando poucas variáveis CSS, e o cuidado com multi-perfil
> (mais de um @ no mesmo negócio), leia `templates/carrossel/principios-modelos.md`. É o destilado
> de uma instalação real e vale pra qualquer marca.

- **Escolha padrão: a biblioteca VKOS01 a VKOS09** (arquivos `modelo-vkos01.html` a
  `modelo-vkos09.html`). É a linha atual, já recolorida pra marca. O catálogo `estilos.md`
  descreve cada um e diz quando usar (uns são escuros, outros claros, uns pedem imagem, outros não).
- **Alternativas clássicas: os 5 legados**: **Dark** (dia a dia, rápido, sem imagem),
  **Editorial** (capa com imagem IA + corpo claro de revista), **Declaração** (foto + frase forte,
  pra manifesto), **Claro** (fundo claro leve e premium), **Produto** (escuro com destaque neon,
  pra lançar oferta). Seguem valendo pra quem prefere.

Sem preferência e sem estilo travado → use o **VKOS02 sem imagem** (escuro, sai na hora, não pede
imagem nenhuma). E sugira: *"Quer que a gente trave o seu visual com o `/estilo`? Aí todo carrossel
já sai com a sua cara, sem escolher toda vez."*

## Passo 4: Montar o HTML

1. Crie a pasta `conteudo/<AAAA-MM-DD>-<tema-curto>/`.
2. Copie o modelo do estilo escolhido pra lá como `carrossel.html`.
3. Preencha os slides com o texto do passo 2, usando os TIPOS de slide daquele modelo (cada um
   documenta os seus no topo do arquivo). Siga a regra de ritmo do feed do próprio modelo.
4. Ajuste `:root` com as cores do `design-guide.md` (ou do Cérebro). Troque `@seunegocio` pelo @
   real (e, no Dark, o `.counter` pro total certo, ex: `01 / 07`).
5. **Imagem-herói (estilos com capa de imagem):** a capa puxa uma imagem de `img/capa.png`. Usam
   imagem os VKOS **01, 03, 06, 07, 08 e 09** (o 06 é um render 3D na capa) e, entre os legados,
   **Editorial**, **Declaração** e **Produto** (no Produto o arquivo é `img/produto.png`). O
   **VKOS02** aceita imagem, mas funciona liso sem ela (é o padrão sem imagem). Os VKOS **04 e 05**
   e os legados **Dark** e **Claro** não dependem de imagem. Quando o estilo pede imagem, peça pro
   comprador gerar no Gemini (Nano Banana) uma imagem que represente o tema por metáfora, retrato
   4:5, cores da marca, **sem texto/letras**, com espaço pro título, e salvar na pasta `img/`. Sem
   a imagem, a capa cai no fundo escuro sozinha e continua legível. Se houver algo útil em
   `identidade/inspiracoes/`, use de guia pro prompt.
6. Logo: se o comprador tiver um `identidade/logo/logo.png`, use no lugar certo. Se não tiver,
   remova as tags `<img class="logo">` / `<img class="cta-mark">` (o layout aguenta sem).

## Passo 5: Renderizar

**Antes de rodar o render, rode o teste final** do `templates/carrossel/principios-visuais.md`
no HTML pronto: a pergunta "alguém diria que foi IA?", o reflexo de categoria em duas ordens e o
checklist de saída. Só renderize o que passar.

Garanta que o Playwright está instalado (se `node_modules` não existe, rode `npm install`; se o
navegador faltar, `npx playwright install chromium`). Então:

```
node templates/carrossel/render.js conteudo/<AAAA-MM-DD>-<tema-curto>
```

As imagens saem em `.../instagram/slide-01.png`, etc. Confira os PNGs começando pela capa: é
onde erro de cor e de contraste mais aparece. O que falhar, corrija no HTML e renderize de novo.

## Passo 6: Entregar

- Diga o caminho das imagens.
- Ofereça gerar a legenda: "Quer a legenda pra postar? É só pedir `/legenda`."
- Se o comprador quiser ajustar algum slide, edite o `carrossel.html` e rode o render de novo.

## Princípios

1. **Pronto pra postar, não rascunho.** Texto + imagem renderizada.
2. **Com a cara do negócio.** Cores, voz e @ vêm do Cérebro, sempre.
3. **Capa é tudo.** Se a capa não prende, o resto não é visto.
