# Campo pastoral
> Revista editorial pastoral sobre um campo cor de creme

**Tema:** claro

Este estilo usa uma linguagem editorial pastoral: uma tela cor de creme quente substitui o branco puro, um verde floresta profundo ancora a marca, e superfícies pastel em mosaico (azul céu, pêssego, sálvia, osso) se espalham pelas seções de conteúdo como campos vistos do alto. A tipografia combina uma serifa editorial refinada com uma sem serifa neutra, dando ao site uma sensação de revista impressa em vez do visual típico de SaaS. Botões são pílulas dramáticas (raio de 100 a 110px), a fotografia domina o topo da página em sangria total, e a única cor saturada além do verde da marca aparece como uma faixa em lima vibrante: um único acento de alta energia contra um sistema quieto e em tons terrosos.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Tinta Floresta | `#07503f` | `--color-forest-ink` | Cor primária da marca, fundo do cabeçalho, preenchimento da barra de navegação, divisores de seção, rodapé. Verde teal profundo contra o creme quente cria uma gravidade agrícola |
| Lima Vívido | `#e8fe85` | `--color-vivid-lime` | Faixa promocional, barras de destaque de anúncio, ocasional realce de hover em links. O único acento de alta energia da paleta |
| Osso | `#f1efdf` | `--color-bone` | Tela da página, fundo base. Branco quebrado quente no lugar do branco puro, para uma sensação orgânica e impressa |
| Branco Puro | `#ffffff` | `--color-pure-white` | Superfícies de card, preenchimento de input, texto de botão, fundo de ícone. O contraponto claro contra a tela osso |
| Cinza Cinza | `#efefef` | `--color-ash-gray` | Superfície secundária de card, divisores de seção sutis |
| Carvão | `#212529` | `--color-charcoal` | Texto principal do corpo, títulos sobre fundo claro, traços de ícone. Quase preto para alto contraste sobre o creme |
| Grafite | `#353535` | `--color-graphite` | Texto secundário, bordas de link, bordas de botão, contornos de UI discretos |
| Peltre | `#6d6d6d` | `--color-pewter` | Texto de apoio discreto, texto e bordas de botão terciário |
| Card Céu | `#b2cee7` | `--color-sky-card` | Superfície decorativa de card, um dos ladrilhos pastel em mosaico usado em depoimentos de parceiros e blocos de categoria |
| Card Pêssego | `#fceace` | `--color-peach-card` | Superfície decorativa de card, ladrilho pastel quente alternando com os cards céu e sálvia |
| Card Sálvia | `#e6ecd5` | `--color-sage-card` | Superfície decorativa de card, ladrilho pastel verde suave para blocos de categoria agrária |
| Musgo | `#c3cda7` | `--color-moss` | Bordas sutis, contornos de input, divisores decorativos dentro do conteúdo do corpo |

## Tokens de tipografia

### Sem serifa principal. Cuida da interface e do corpo, de textos de 12px na navegação até displays de 80 a 90px no hero. Tracking negativo aperta os tamanhos de display; tracking positivo (+0,025 a 0,029em) abre versaletes e textos de badge. `--font-sans-principal`
- **Substituto:** Inter (já gratuita), ou DM Sans como alternativa
- **Pesos:** 100, 200, 300, 400, 500, 600
- **Tamanhos:** 12, 13, 14, 15, 16, 17, 18, 80, 90px
- **Altura de linha:** 0,97 a 2,20
- **Tracking:** -0,037em em 80 a 90px, -0,022em em 17 a 18px, 0,025 a 0,029em em 12 a 15px
- **Papel:** Sem serifa principal de interface e corpo. Cuida de tudo, de textos de 12px na navegação até displays de 80 a 90px no hero. Tracking negativo aperta os tamanhos de display; tracking positivo (+0,025 a 0,029em) abre versaletes e textos de badge.

### Serifa de display para títulos editoriais. Em 57px o peso leve (300) tem um clima literário e sereno; em 500 a 600 vira âncora de seção. Tracking apertado (-0,012em) mantém a serifa afiada em tamanhos grandes. `--font-serif-titulo`
- **Substituto:** Cormorant Garamond, GT Sectra, Source Serif Pro
- **Pesos:** 300, 500, 600
- **Tamanhos:** 24, 28, 37, 43, 45, 57px
- **Altura de linha:** 1,00 a 1,24
- **Tracking:** -0,012em
- **Papel:** Serifa de display para títulos editoriais. Em 57px o peso leve (300) tem um clima literário e sereno; em 500 a 600 vira âncora de seção. Tracking apertado (-0,012em) mantém a serifa afiada em tamanhos grandes.

### Variante serifa ultraleve para títulos com corpo de destaque e citações de apoio. O peso 100 em 25 a 28px cria uma voz editorial delicada nas seções de suporte. `--font-serif-titulo-leve`
- **Substituto:** Cormorant Garamond Light, Source Serif ExtraLight
- **Pesos:** 100, 300
- **Tamanhos:** 24, 25, 28, 37, 45, 49, 57px
- **Altura de linha:** 1,00, 1,06, 1,22, 1,24
- **Tracking:** normal
- **Papel:** Variante serifa ultraleve para títulos com corpo de destaque e citações de apoio. O peso 100 em 25 a 28px cria uma voz editorial delicada nas seções de suporte.

### sem serifa: detectada nos dados extraídos, mas sem descrição da IA. `--font-sans-serif`
- **Pesos:** 300, 400, 500
- **Tamanhos:** 17px
- **Altura de linha:** 1,1, 1,35
- **Papel:** Sem serifa detectada nos dados extraídos, sem descrição da IA

### Helvetica: detectada nos dados extraídos, mas sem descrição da IA. `--font-helvetica`
- **Pesos:** 300, 400
- **Tamanhos:** 12px, 17px
- **Altura de linha:** 1,35, 1,92
- **Papel:** Helvetica detectada nos dados extraídos, sem descrição da IA

### FKGrotesk: detectada nos dados extraídos, mas sem descrição da IA. `--font-fkgrotesk`
- **Pesos:** 300
- **Tamanhos:** 12px, 16px
- **Altura de linha:** 1,24
- **Papel:** FKGrotesk detectada nos dados extraídos, sem descrição da IA

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.5 | 0.025px | `--text-caption` |
| body-sm | 14px | 1.5 | 0.025px | `--text-body-sm` |
| body | 16px | 1.52 | -0.022px | `--text-body` |
| subheading | 24px | 1.24 | -0.012px | `--text-subheading` |
| heading-sm | 37px | 1.22 | -0.012px | `--text-heading-sm` |
| heading | 45px | 1.06 | -0.012px | `--text-heading` |
| heading-lg | 57px | 1.06 | -0.022px | `--text-heading-lg` |
| display | 80px | 1 | -2.96px | `--text-display` |

## Espaçamento e formas

**Densidade:** confortável

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 5 | 5px | `--spacing-5` |
| 6 | 6px | `--spacing-6` |
| 8 | 8px | `--spacing-8` |
| 9 | 9px | `--spacing-9` |
| 10 | 10px | `--spacing-10` |
| 12 | 12px | `--spacing-12` |
| 15 | 15px | `--spacing-15` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 27 | 27px | `--spacing-27` |
| 30 | 30px | `--spacing-30` |
| 38 | 38px | `--spacing-38` |
| 40 | 40px | `--spacing-40` |
| 50 | 50px | `--spacing-50` |
| 64 | 64px | `--spacing-64` |
| 193 | 193px | `--spacing-193` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 20px |
| links | 26px |
| inputs | 33px |
| buttons | 100px |
| nav-pills | 110px |
| hero-cards | 30px |

### Layout

- **Largura máxima:** 1200px
- **Gap de seção:** 50px
- **Padding de card:** 30px
- **Gap de elemento:** 8px

## Componentes

### Botão pílula CTA (preenchido em verde floresta)
**Papel:** Botão de ação primária

Fundo #07503f, texto #ffffff, raio de 100px, padding de 10px 24px, sem serifa peso 500 a 600 em 14 a 15px com tracking de 0,025em. Caixa alta ou frase normal, ambos observados.

### Botão pílula contornado (creme/fantasma)
**Papel:** Botão de ação secundária

Preenchimento transparente, borda de 1px em #353535 ou currentColor, raio de 100px, padding de 10px 24px, sem serifa em 14px. Usado para uma ação secundária pareada com o botão primário preenchido.

### Elemento de navegação em pílula
**Papel:** Link de navegação do cabeçalho e gatilho de dropdown

Fica sobre o cabeçalho verde floresta #07503f. Texto branco, sem serifa em 15px, sem fundo. Chevrons de dropdown em 8px. Estados ativos mudam para leve opacidade branca ou sublinhado.

### Pílula de contato
**Papel:** CTA do cabeçalho

Forma de pílula, raio de 110px, fundo #ffffff sobre o cabeçalho floresta, texto #212529, padding de 10px 20px, sem serifa peso 500.

### Hero de sangria total com fotografia
**Papel:** Seção acima da dobra

Fotografia de paisagem em viewport total (vista aérea de campo, verdes quentes), título serifado branco centralizado em 57 a 80px, dois botões pílula abaixo, indicação de rolagem com seta para baixo no centro inferior. Sem sobreposição: a imagem é o próprio fundo.

### Faixa lima promocional
**Papel:** Banner promocional superior

Barra de fundo #e8fe85 em sangria total, texto escuro repetido (sem serifa em 12 a 14px) anunciando guias e recursos, separado por ícones de check contornados. Ocupa toda a largura da viewport acima da navegação principal.

### Card em mosaico pastel
**Papel:** Tile de depoimento ou categoria

Superfície em um dos quatro tons pastel (#b2cee7 céu, #fceace pêssego, #e6ecd5 sálvia, #efefef osso), raio de 20px, padding de 30px, conteúdo centralizado com logo no topo, citação no corpo, nome do autor e cargo embaixo. Cards ficam lado a lado em uma fileira de 3 colunas.

### Banner de seção floresta
**Papel:** Seção interstitial escura

Fundo #07503f em sangria total, título serifado branco, corpo de texto branco, pequenos blocos de benefício com ícone e texto brancos organizados em grade 2x2 com ícones em contêineres circulares de 30 a 40px.

### Campo de input
**Papel:** Campo de formulário

Preenchimento branco, borda de 1px em #c3cda7 (musgo) ou #353535, raio de 33px (mais pílula do que card), padding vertical de 12px, sem serifa em 16px. Anel de foco em #07503f.

### Bloco de logo do cabeçalho
**Papel:** Marca

Wordmark branco em minúsculas com um ícone de folha triangular verde à esquerda. Fica centralizado no cabeçalho floresta em aproximadamente 28 a 32px de altura.

### Cabeçalho de divisor de seção
**Papel:** Bloco de título de seção

Título serifado alinhado à esquerda (serifa de display em 45 a 57px, #212529) sobre a tela osso, com introdução opcional de 1 a 2 linhas em sem serifa 17px abaixo. Sem elemento decorativo: a tipografia carrega a hierarquia.

### Card de logo de parceiro
**Papel:** Tile de parceiro em destaque

Raio de 20px, superfície branca ou pastel, logo centralizado no topo (raster, cor cheia), citação em sem serifa 14 a 15px, nome do autor e cargo em sem serifa peso 500 a 600 em 14px. Cards têm padding generoso de 30px ou mais.

### Rodapé (floresta)
**Papel:** Rodapé do site

Fundo #07503f, texto e links brancos, grade de links em múltiplas colunas, sem serifa em 14 a 15px, bloco de logo repetido. Padding superior de 110px ou mais para respiro.

## Faça e não faça

### Faça
- Use #f1efdf (Osso) como tela da página em toda seção clara. Nunca substitua pelo branco puro #ffffff como base
- Aplique o raio de pílula de 100px em todo botão, independente da variante. A consistência da pílula é uma marca registrada do sistema
- Combine a serifa de display em 45 a 57px para títulos de seção com a sem serifa em 14 a 17px para o corpo. A tensão entre serifa e sem serifa define a voz editorial
- Deixe o lima #e8fe85 aparecer só na faixa promocional e em microacentos de destaque. Ele ganha atenção pela escassez
- Use as quatro superfícies pastel de card (céu, pêssego, sálvia, osso) como paleta rotativa dentro de uma única fileira, como uma série em mosaico, nunca distribuída ao acaso
- Preencha a barra de navegação e os divisores de seção de forma sólida com #07503f (Tinta Floresta). As faixas verde escuro são a espinha estrutural do ritmo da página
- Defina títulos de hero em 57 a 80px na serifa peso 300 ou na sem serifa peso 600, centralizados, sobre fotografia de paisagem em sangria total

### Não faça
- Não use #ffffff como fundo da página. Sempre sobreponha ao #f1efdf para preservar a sensação impressa e quente
- Não aplique raios pequenos (4 a 8px) a botões ou cards. Os raios de 20px ou mais e 100px ou mais são inegociáveis
- Não introduza novas cores saturadas além da Tinta Floresta e do Lima Vívido. Os ladrilhos pastel carregam a carga cromática
- Não use a serifa de display abaixo de 24px nem no corpo do texto. A serifa é só para títulos e citações de destaque
- Não aplique sombras ou elevação aos cards. A profundidade vem de mudanças de cor de superfície pastel, não de box-shadow
- Não misture vários pastéis dentro de um mesmo card. Uma cor de superfície por tile
- Não centralize parágrafos de corpo. Títulos e texto de hero podem ser centralizados, mas o texto de apoio fica alinhado à esquerda com no máximo 60 caracteres por linha

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Tela Osso | `#f1efdf` | Fundo da página, camada base quente |
| 1 | Branco Puro | `#ffffff` | Superfícies de card, campos de input, texto de botão |
| 2 | Ladrilhos Pastel | `#b2cee7` | Variantes de card em mosaico: céu, pêssego (#fceace), sálvia (#e6ecd5), osso (#efefef) |
| 3 | Tinta Floresta | `#07503f` | Cabeçalho, banners de seção, rodapé: camada interstitial escura |
| 4 | Lima Vívido | `#e8fe85` | Faixa promocional: acento único de alta energia |

## Elevação

A elevação é obtida por contraste de cor e mudanças de superfície, não por sombras. Cards ganham visibilidade ao trocar para uma superfície pastel ou branco puro contra a tela osso; transições de seção são marcadas trocando para verde floresta sólido. Nenhum box-shadow é usado no sistema.

## Imagem

Fotografia de paisagem e agricultura em sangria total domina o sistema: vistas aéreas de drone de campos de cultivo em verde vibrante e marrom dourado, retratos no local de trabalhadores em plantações de milho, closes de produto ou paisagem agrícola. As fotos são de alta resolução, naturalistas, levemente saturadas e sempre em tons quentes. Sem ilustrações ou gráficos abstratos; sem ícones além de check simples em traço fino e glifos de benefício. O tratamento fotográfico é cru (sem duotone, sem filtros pesados, sem caixas de texto sobrepostas com fundo). Ícones são minimalistas e em estilo de linha quando presentes.

## Layout

Seções em sangria total empilhadas verticalmente, sem contêiner de largura máxima no nível da seção: cada faixa vai até a borda da viewport. O conteúdo interno é centralizado em largura máxima de 1200px. O hero é uma imagem em altura total de viewport com título centralizado, dois botões empilhados e indicação de rolagem. Abaixo do hero, o conteúdo alterna entre seções de tela osso com títulos centralizados, faixas interstitial verde floresta com texto branco, e uma grade de 3 colunas de cards em mosaico para depoimentos e parceiros. A navegação é uma barra de cabeçalho verde floresta com logo centralizado, links à esquerda, CTA e seletor de idioma à direita. Uma faixa lima fica acima do cabeçalho. Os gaps de seção ficam em torno de 50px; o conteúdo é espaçoso e editorial, não denso em informação.

## Guia de aplicação

ação primária: #07503f (ação preenchida)
Crie um botão de ação primária: fundo #07503f, texto #ffffff, raio de 9999px, padding compacto de pílula. Use esse tratamento preenchido para o CTA principal.
**Referência rápida de cor**
- texto: #212529
- fundo: #f1efdf
- superfície de card: #ffffff
- borda: #c3cda7 ou #353535
- acento de marca: #07503f
- destaque promocional: #e8fe85

**Exemplos de componente**

1. Construa um hero em sangria total: fundo é uma foto de paisagem de campo em 100vh. Título branco centralizado 'Cadeias de suprimento regenerativas para um mundo melhor' na serifa peso 300 em 57px, tracking -0,012em. Abaixo: dois botões pílula lado a lado, um preenchido em #07503f com texto branco (raio de 100px, padding de 10px 24px, sem serifa 14px peso 600), e outro contornado fantasma (borda branca de 1px, raio de 100px). No centro inferior: indicação de rolagem em sem serifa 13px.

2. Construa uma fileira de depoimento de parceiro: 3 cards em fileira sobre a tela #f1efdf. Cada card tem raio de 20px com padding de 30px. Card 1 com superfície #b2cee7, Card 2 #fceace, Card 3 #e6ecd5. Cada card: logo centralizado (raster, ~120px de largura), citação de corpo em sem serifa 15px, nome do autor em sem serifa peso 600 14px, cargo em sem serifa peso 400 13px. Gap de 24px entre cards.

3. Construa uma seção interstitial floresta: fundo #07503f em sangria total, padding vertical de 80px. Título branco na serifa peso 300 em 45px, parágrafo de corpo branco em sem serifa 17px (máximo 60 caracteres por linha, alinhado à esquerda). Abaixo: grade 2x2 de blocos de benefício, cada um com um pequeno contêiner circular branco de ícone, título em negrito sem serifa 15px, corpo em sem serifa 14px. Gap de 30px entre itens da grade.

4. Construa uma barra de cabeçalho: fundo #07503f, altura de 60px, wordmark branco centralizado com ícone de folha verde. Lado esquerdo: links de navegação em sem serifa 15px branco. Lado direito: pílula branca (raio de 110px, padding de 10px 20px) e seletor de idioma.

5. Construa uma faixa marquee: fundo #e8fe85 em sangria total, altura de 32px, texto repetido horizontalmente em sem serifa 13px #212529, separado por pequenos ícones de check contornados. Fica logo acima da barra de cabeçalho.

## Filosofia de cor

A paleta é deliberadamente contida em quatro famílias de superfície: osso quente (a tela), branco puro (cards), tons pastel (ladrilhos em mosaico) e verde floresta profundo (faixas estruturais). O lima vívido fica reservado para uma única faixa promocional. Essa escassez faz com que, quando um ladrilho pastel aparece, ele pareça intencional e quente, como um campo de cultivo visto do alto. Nunca introduza azuis, vermelhos ou roxos além dos quatro pastéis designados.

## Filosofia de tipografia

A serifa de display (ou um substituto de alta qualidade como GT Sectra) carrega a voz editorial em 24px e acima. A sem serifa cuida de tudo que é funcional abaixo de 24px. A combinação de duas fontes substitui a pilha típica só-sem-serifa do SaaS por uma sensibilidade de revista: os títulos parecem escritos, não projetados. O peso ultraleve (100 a 300) da serifa é uma escolha deliberadamente contrária à convenção: a maioria dos sites empurra para o peso 700 em busca de autoridade, mas este sistema sussurra. A serifa no peso 300 em 57px é mais confiante do que uma sem serifa em negrito seria.

## Linguagem de forma

Os raios são desproporcionalmente grandes para o tamanho do sistema. Cards em 20px, botões em 100 a 110px, inputs em 33px. A pílula é a forma dominante: aparece em todo elemento interativo, deixando o site suave, acessível e claramente não corporativo. Não há cantos retos de 90 graus em nenhuma superfície interativa. A linguagem de forma comunica: isto é um campo, não um painel de controle.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-forest-ink: #07503f;
  --color-vivid-lime: #e8fe85;
  --color-bone: #f1efdf;
  --color-pure-white: #ffffff;
  --color-ash-gray: #efefef;
  --color-charcoal: #212529;
  --color-graphite: #353535;
  --color-pewter: #6d6d6d;
  --color-sky-card: #b2cee7;
  --color-peach-card: #fceace;
  --color-sage-card: #e6ecd5;
  --color-moss: #c3cda7;

  /* Typography: Font Families */
  --font-sans-principal: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif-titulo: 'Cormorant Garamond', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif-titulo-leve: 'Cormorant Garamond Light', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sans-serif: 'sans-serif', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-helvetica: 'Helvetica', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-fkgrotesk: 'FKGrotesk', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --tracking-caption: 0.025px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.5;
  --tracking-body-sm: 0.025px;
  --text-body: 16px;
  --leading-body: 1.52;
  --tracking-body: -0.022px;
  --text-subheading: 24px;
  --leading-subheading: 1.24;
  --tracking-subheading: -0.012px;
  --text-heading-sm: 37px;
  --leading-heading-sm: 1.22;
  --tracking-heading-sm: -0.012px;
  --text-heading: 45px;
  --leading-heading: 1.06;
  --tracking-heading: -0.012px;
  --text-heading-lg: 57px;
  --leading-heading-lg: 1.06;
  --tracking-heading-lg: -0.022px;
  --text-display: 80px;
  --leading-display: 1;
  --tracking-display: -2.96px;

  /* Typography: Weights */
  --font-weight-thin: 100;
  --font-weight-extralight: 200;
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Spacing */
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-15: 15px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-27: 27px;
  --spacing-30: 30px;
  --spacing-38: 38px;
  --spacing-40: 40px;
  --spacing-50: 50px;
  --spacing-64: 64px;
  --spacing-193: 193px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 50px;
  --card-padding: 30px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-2xl: 20px;
  --radius-3xl: 26px;
  --radius-3xl-2: 30px;
  --radius-3xl-3: 33px;
  --radius-3xl-4: 45px;
  --radius-full: 60px;
  --radius-full-2: 100px;
  --radius-full-3: 110px;
  --radius-full-4: 9999px;

  /* Named Radii */
  --radius-cards: 20px;
  --radius-links: 26px;
  --radius-inputs: 33px;
  --radius-buttons: 100px;
  --radius-nav-pills: 110px;
  --radius-hero-cards: 30px;

  /* Surfaces */
  --surface-bone-canvas: #f1efdf;
  --surface-pure-white: #ffffff;
  --surface-pastel-tiles: #b2cee7;
  --surface-forest-ink: #07503f;
  --surface-vivid-lime: #e8fe85;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-forest-ink: #07503f;
  --color-vivid-lime: #e8fe85;
  --color-bone: #f1efdf;
  --color-pure-white: #ffffff;
  --color-ash-gray: #efefef;
  --color-charcoal: #212529;
  --color-graphite: #353535;
  --color-pewter: #6d6d6d;
  --color-sky-card: #b2cee7;
  --color-peach-card: #fceace;
  --color-sage-card: #e6ecd5;
  --color-moss: #c3cda7;

  /* Typography */
  --font-sans-principal: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif-titulo: 'Cormorant Garamond', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif-titulo-leve: 'Cormorant Garamond Light', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sans-serif: 'sans-serif', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-helvetica: 'Helvetica', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-fkgrotesk: 'FKGrotesk', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --tracking-caption: 0.025px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.5;
  --tracking-body-sm: 0.025px;
  --text-body: 16px;
  --leading-body: 1.52;
  --tracking-body: -0.022px;
  --text-subheading: 24px;
  --leading-subheading: 1.24;
  --tracking-subheading: -0.012px;
  --text-heading-sm: 37px;
  --leading-heading-sm: 1.22;
  --tracking-heading-sm: -0.012px;
  --text-heading: 45px;
  --leading-heading: 1.06;
  --tracking-heading: -0.012px;
  --text-heading-lg: 57px;
  --leading-heading-lg: 1.06;
  --tracking-heading-lg: -0.022px;
  --text-display: 80px;
  --leading-display: 1;
  --tracking-display: -2.96px;

  /* Spacing */
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-15: 15px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-27: 27px;
  --spacing-30: 30px;
  --spacing-38: 38px;
  --spacing-40: 40px;
  --spacing-50: 50px;
  --spacing-64: 64px;
  --spacing-193: 193px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-2xl: 20px;
  --radius-3xl: 26px;
  --radius-3xl-2: 30px;
  --radius-3xl-3: 33px;
  --radius-3xl-4: 45px;
  --radius-full: 60px;
  --radius-full-2: 100px;
  --radius-full-3: 110px;
  --radius-full-4: 9999px;
}
```
