# Grade de zinco
> Grade editorial em zinco com pontuação laranja confete

**Tema:** claro

Este estilo opera num registro visual contido e neutro em primeiro lugar: uma escala cinza-zinco carrega quase toda a interface, com um único acento laranja vívido em badges e quase nenhuma outra intrusão cromática. A geometria é definida por um arredondamento generoso de cantos (cards de 36px, botões de 14px, pílulas de 10000px), e bordas finas de 1px substituem sombras como principal ferramenta de elevação. A tipografia é uma única família sem serifa geométrica personalizada, usada em pesos de display robustos (56 a 64px, peso 600) para títulos editoriais, combinada com texto de corpo compacto de 14px que sinaliza eficiência. A atmosfera é a de um marketplace confiante, de nível de infraestrutura: superfícies quietas, densidade precisa e cor usada como pontuação funcional em vez de decoração.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Obsidiana | `#09090b` | `--color-obsidian` | Botões de ação primária, títulos de hero, texto dominante. O preto quase absoluto que ancora todo CTA escuro e título de display sobre a tela clara |
| Grafite | `#18181b` | `--color-graphite` | Texto do corpo, texto de navegação, texto de badge. A cor de tinta usada em parágrafos, links e rótulos |
| Ardósia | `#27272a` | `--color-slate` | Títulos secundários e superfícies de card elevadas. Um cinza médio-escuro para cards que precisam de peso visual |
| Ferro | `#3f3f46` | `--color-iron` | Texto discreto, rótulos de botão sobre superfícies claras, texto de badge. O cinza médio usado em rótulos secundários de UI e texto de botão contornado |
| Aço | `#52525b` | `--color-steel` | Traços de ícone, metadados de apoio. Bordas e contornos de ícone em contextos mais escuros |
| Névoa | `#71717a` | `--color-fog` | Texto de apoio, rótulos terciários. Texto discreto e metadados de suporte |
| Cinza Claro | `#a1a1aa` | `--color-ash` | Texto de placeholder, rótulos desabilitados, traços de ícone claros. O cinza legível mais claro |
| Neblina | `#d4d4d8` | `--color-mist` | Bordas sutis, preenchimentos secundários de card, fundos de pílula de link. Cor divisória estrutural |
| Nuvem | `#ececee` | `--color-cloud` | Cor de borda primária em todo o sistema. Regras finas de 1px em cards, badges e inputs |
| Papel | `#f4f4f5` | `--color-paper` | Fundo de tela, superfícies de card, preenchimento de badge. O cinza quente-frio que carrega a superfície da página |
| Neve | `#ffffff` | `--color-snow` | Superfícies elevadas (cards sobre a tela), campos de input, fundo de botão para ações neutras ou fantasma |
| Brasa | `#ff5a00` | `--color-ember` | Badges de destaque (selos de programa, chips de destaque). A única cor vívida do sistema, usada com moderação para sinais de credibilidade e ênfase de categoria |
| Faísca Magenta | `#fe45e2` | `--color-magenta-spark` | Acento decorativo raro de card. Usado em um único card de hero como pontuação visual contra a grade monocromática |

## Tokens de tipografia

### Sistema tipográfico de família única para tudo: títulos de display de 56 a 64px peso 600 com altura de linha apertada de 1,12 a 1,28, títulos de seção de 32 a 40px peso 600 a 700, corpo e texto de UI de 14 a 16px peso 400, rótulos de badge e meta de 12 a 13px peso 400. `--font-sans-principal`
- **Substituto:** DM Sans
- **Pesos:** 300, 400, 500, 600, 700
- **Tamanhos:** 10, 12, 13, 14, 15, 16, 18, 20, 32, 40, 56, 64
- **Altura de linha:** 1,0 a 1,8
- **Tracking:** normal em todos os degraus (nenhum ajuste de tracking detectado)
- **Papel:** Sistema tipográfico de família única para tudo: títulos de display de 56 a 64px peso 600 com altura de linha apertada de 1,12 a 1,28, títulos de seção de 32 a 40px peso 600 a 700, corpo e texto de UI de 14 a 16px peso 400, rótulos de badge e meta de 12 a 13px peso 400

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.64 | . | `--text-caption` |
| body | 15px | 1.45 | . | `--text-body` |
| body-lg | 18px | 1.45 | . | `--text-body-lg` |
| subheading | 20px | 1.5 | . | `--text-subheading` |
| heading-sm | 32px | 1.5 | . | `--text-heading-sm` |
| heading | 40px | 1.28 | . | `--text-heading` |
| heading-lg | 56px | 1.28 | . | `--text-heading-lg` |
| display | 64px | 1.12 | . | `--text-display` |

## Espaçamento e formas

**Unidade base:** 4px

**Densidade:** compacta

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 28 | 28px | `--spacing-28` |
| 32 | 32px | `--spacing-32` |
| 36 | 36px | `--spacing-36` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 68 | 68px | `--spacing-68` |
| 80 | 80px | `--spacing-80` |
| 120 | 120px | `--spacing-120` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 36px |
| icons | 40px |
| pills | 10000px |
| badges | 12px |
| inputs | 14px |
| buttons | 14px |

### Sombras

| Nome | Valor | Token |
|------|-------|-------|
| subtle | `rgba(255, 255, 255, 0.5) 0px 0.5px 0px 0px inset, rgba(11...` | `--shadow-subtle` |
| subtle-2 | `rgb(228, 228, 231) 0px 1px 0px 0px inset` | `--shadow-subtle-2` |
| subtle-3 | `rgb(255, 255, 255) 0px 0.5px 0px 0px inset` | `--shadow-subtle-3` |
| subtle-4 | `rgb(255, 255, 255) 0px -0.5px 0px 0px` | `--shadow-subtle-4` |
| subtle-5 | `rgb(228, 228, 231) 0px -1px 0px 0px` | `--shadow-subtle-5` |
| md | `rgba(0, 0, 0, 0.04) 0px 4px 12px 0px` | `--shadow-md` |

### Layout

- **Largura máxima:** 1200px
- **Gap de seção:** 80px
- **Padding de card:** 28px
- **Gap de elemento:** 8px

## Componentes

### Botão de ação primária (preenchido escuro)
**Papel:** CTA principal, tipo "Agendar demonstração" ou "Começar"

Fundo #09090b, texto branco (#ffffff), borda sólida de 1,5px em #2c2e34 com sombra de destaque interno sutil, raio de borda de 14px, padding vertical de 12px e horizontal de 16px, 14px peso 400. O preenchimento quase preto com borda fina cria profundidade sem sombra projetada.

### Botão de ação fantasma (branco)
**Papel:** CTA secundário sobre fundos escuros

Fundo #ffffff, texto escuro (#3f3f46), borda sólida de 1px em #3f3f46, raio de pílula de 36px, padding de 20px em todos os lados, 14px. Usado na navegação e em contraste sobre seções escuras.

### Botão pílula neutro (claro)
**Papel:** Ação discreta sobre fundos claros, tipo "Nosso trabalho"

Fundo #fafafa, texto #18181b, raio de borda de 14px, padding vertical de 12px e horizontal de 16px, 14px peso 400. Sem borda visível: depende do contraste sutil do fundo.

### Card de categoria (imagem no topo)
**Papel:** Vitrine de categoria de serviço, tipo "Web e produto" ou "Motion design"

Imagem em largura total preenche a metade superior, raio de borda de 36px, padding inferior de 28px, sem sombra. Título sobreposto ou abaixo da imagem em 20px peso 600. Pílulas de tag ficam dentro do card na parte inferior.

### Card de destaque escuro
**Papel:** Listagem de pontos de dor com marcadores em seta

Fundo #27272a ou #18181b, texto branco, raio de borda de 28 a 36px, padding de 24px. Cada item de lista tem 20px peso 500 com acento de seta à direita. Cria uma faixa escura que contrasta com a página clara.

### Badge de tag
**Papel:** Tags de categoria, tipo "Web", "UX/UI design", "Aplicativo móvel"

Fundo transparente com borda sólida de 1px em #ececee, texto #18181b, raio de borda de 12px, padding vertical de 4px e horizontal de 8px, 12 a 13px peso 400. O tratamento de borda fina mantém as tags discretas.

### Badge de tag preenchido
**Papel:** Tags de destaque, tipo "Desenvolvimento de software", "Marketing"

Fundo #3f3f46, texto #fafafa, raio de borda de 12px, padding de 4px/8px. Usado para rótulos de habilidade ou categoria que precisam de mais peso visual do que tags contornadas.

### Badge de acento laranja
**Papel:** Selos de programa, chips de destaque

Fundo #ff5a00, texto branco, raio de borda de 12px, padding de 4px/8px. O único badge cromático, reservado para sinais de credibilidade e ênfase de categoria.

### Campo de input de e-mail
**Papel:** Captura de e-mail no hero, cadastro de newsletter

Fundo branco (#ffffff), texto #333333, raio de borda de 14px, padding vertical de 12px e horizontal de 16px, borda transparente de 1px. Combina diretamente com um CTA escuro à direita.

### Faixa de logos
**Papel:** Prova social, logos de parceiros e clientes

Logos em escala de cinza renderizados em #71717a a 60 a 70% de opacidade, centralizados horizontalmente com espaçamento uniforme. Sem contêiner de fundo.

### Bloco de estatísticas
**Papel:** Métricas de destaque, tipo "20.000+ projetos concluídos"

Número grande em 40 a 56px peso 600 em #09090b, descritor adjacente em 14px peso 400 em #52525b. Espaçamento mínimo entre número e rótulo.

### Seção de imagem de destaque
**Papel:** Divisor visual em sangria total, paisagem ou musgo

Imagem fotográfica em largura total (sem sobreposição, sem texto), raio de canto de 48px ou 64px nos cantos superiores, funciona como um respiro visual entre seções de conteúdo.

### Barra de navegação
**Papel:** Navegação principal do site

Cabeçalho branco fixo, logo à esquerda, links de navegação centralizados (14px), login e botão CTA escuro à direita. Sem borda visível: flutua sobre a tela.

## Faça e não faça

### Faça
- Use #09090b em todo botão de ação primária. O CTA escuro preenchido é o elemento interativo mais importante do sistema
- Defina o raio de borda dos cards em 36px e dependa de bordas sólidas de 1px em #ececee no lugar de sombras para elevação
- Mantenha o corpo de texto em 14 a 15px peso 400 em #18181b: compacto, denso, no padrão de marketplace
- Reserve #ff5a00 exclusivamente para badges de destaque e chips de credencial. Nunca use para UI geral
- Use 56 a 64px peso 600 com altura de linha de 1,12 a 1,28 para títulos de display de hero e seção
- Aplique padding de 28px dentro dos cards e ritmo vertical de 80px entre seções principais da página
- Use raio de borda de 10000px para CTAs em forma de pílula na navegação, e 14px para botões de ação inline

### Não faça
- Não introduza novos acentos de cor. O sistema é 99% acromático; adicionar azuis, verdes ou roxos quebraria o registro editorial contido
- Não use sombras projetadas em cards. Bordas finas sólidas de 1px em #ececee são a única elevação permitida em superfícies de conteúdo
- Não defina títulos de display abaixo do peso 600. O peso robusto é o que faz a tipografia editorial parecer autoritativa
- Não use #ff5a00 em texto de corpo, links ou preenchimentos grandes. É uma cor de badge, não uma cor de marca para UI geral
- Não use raio de borda abaixo de 12px em nenhum contêiner. A geometria do sistema é definida pelo arredondamento generoso
- Não quebre a regra de fonte única. A família principal cuida de todo papel tipográfico, de badges de 10px a displays de 64px
- Não use preto puro (#000000). #09090b é a tinta mais profunda permitida, mantendo calor nos neutros

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Tela | `#f4f4f5` | Fundo da página, o cinza quente-frio que preenche a viewport |
| 1 | Card | `#ffffff` | Superfícies de conteúdo elevadas sobre a tela |
| 2 | Card Discreto | `#fafafa` | Superfícies levemente recuadas dentro de áreas de conteúdo |
| 3 | Superfície Escura | `#18181b` | Blocos de destaque escuros e seções invertidas |
| 4 | Escuro Profundo | `#27272a` | Cards de destaque mais escuros e acentos de modo escuro |

## Elevação

- **Botão escuro primário:** `inset 0 0.5px 0 0 rgba(255,255,255,0.5), inset 0 9px 14px -5px rgba(117,123,133,0.4), 0 0 0 1.5px rgb(44,46,52), 0 4px 6px 0 rgba(0,0,0,0.14)`
- **Card:** `nenhuma, usa borda fina sólida de 1px em #ececee`
- **Link/Pílula:** `inset 0 1px 0 0 rgb(228,228,231)`

## Imagem

A fotografia tem papel estrutural, não decorativo: fotos de paisagem e macro em sangria total (musgo verde, texturas orgânicas) servem como divisores visuais entre seções de conteúdo, criando respiro e calor numa grade monocromática. Cards de categoria usam imagens reais de produto e trabalho: capturas de tela de aplicativos, miniaturas de vídeo, portfólios de design. Sem ilustrações ou gráficos abstratos; sem renders 3D. Logos em faixas de prova social são dessaturados para escala de cinza. Tratamento de imagem: sem sobreposições, sem duotone, sem máscaras. Fotografia crua com raio de canto generoso (48 a 64px) para integrar com a geometria arredondada de cards e seções. A densidade geral é média em imagem: cerca de 30 a 40% da viewport é fotográfica, concentrada em vitrines de categoria e seções de destaque.

## Layout

A página segue um contêiner centralizado de largura máxima (1200px) com ritmo vertical generoso (gaps de seção de 80px). O hero é uma composição dividida: título massivo alinhado à esquerda (56 a 64px) com animação de palavra-chave rotativa, pareado com um formulário compacto de captura de e-mail alinhado à direita e parágrafo de apoio. Abaixo do hero, uma rolagem horizontal de cards de imagem de categoria cria uma faixa de portfólio. O meio da página alterna seções de card claras com blocos de destaque escuros: um ritmo de tela #f4f4f5, cards brancos, depois superfície escura invertida para listas de pontos de dor. Estatísticas aparecem como uma fileira horizontal de três blocos de número grande. Uma foto de natureza em sangria total quebra a grade antes das seções de depoimento e prova social. A navegação é uma barra superior branca fixa com logo à esquerda, links de navegação centralizados e um CTA escuro à direita. A sensação geral é de revista editorial encontrando painel de marketplace: gaps de seção espaçosos mas densidade interna de card compacta.

## Guia de aplicação

**Referência rápida de cor**
- Fundo: #f4f4f5
- Superfície de card: #ffffff
- Texto primário: #09090b
- Texto secundário: #18181b
- Texto discreto: #52525b
- Borda: #ececee
- Acento: #ff5a00
- ação primária: #09090b (ação preenchida)

**Exemplos de componente**

1. *Seção de hero*: fundo de tela #f4f4f5. Título em 64px peso 600, #09090b, altura de linha 1,12. Abaixo, parágrafo de apoio em 15px peso 400, #52525b. Input de e-mail: fundo branco, raio de borda de 14px, padding de 12px/16px, pareado com CTA escuro (preenchimento #09090b, texto branco, raio de 14px, padding de 12px/16px). Padding vertical de 80px acima e abaixo.

2. *Grade de cards de categoria*: cada card é branco (#ffffff) com raio de borda de 36px e borda sólida de 1px em #ececee. A imagem preenche a metade superior (sem padding, rente às bordas do card). A área inferior tem padding de 28px contendo um título de 20px peso 600 em #09090b e pílulas de tag abaixo (fundo transparente, borda de 1px #ececee, raio de 12px, padding de 4px/8px, texto de 13px em #18181b). 3 a 4 cards em fileira horizontal com gap de 16px.

3. *Bloco de destaque escuro*: fundo #27272a, raio de borda de 28px, padding de 24px em todos os lados. Título branco em 32px peso 700. Itens de lista abaixo: cada um prefixado com um ícone de seta à direita, 20px peso 500 em branco, gap vertical de 16px entre itens.

4. *Badge de acento laranja*: fundo #ff5a00, texto branco, raio de borda de 12px, padding de 4px/8px, 12px peso 500. Use só para selos de programa ou destaques de categoria de uma palavra.

5. *Fileira de estatísticas*: três blocos lado a lado. Número grande em 56px peso 600 em #09090b. Rótulo adjacente em 14px peso 400 em #52525b, à direita do número na mesma linha de base.

## Filosofia de geometria

A linguagem espacial do sistema é definida por três raios que se repetem em toda parte: 12px para tags e controles pequenos, 14px para botões e inputs, e 36px para cards e superfícies grandes. Formas de pílula (10000px) aparecem só nos CTAs de navegação. Isso cria um ritmo visual consistente em que os cantos curvam generosamente em contêineres mas ficam controlados em elementos interativos. Nenhum canto reto (0px) é usado em UI visível, até o menor chip recebe arredondamento de 12px. A assimetria entre 14px (botões) e 36px (cards) é deliberada: botões parecem precisos e contidos, cards parecem convidativos e espaçosos.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-obsidian: #09090b;
  --color-graphite: #18181b;
  --color-slate: #27272a;
  --color-iron: #3f3f46;
  --color-steel: #52525b;
  --color-fog: #71717a;
  --color-ash: #a1a1aa;
  --color-mist: #d4d4d8;
  --color-cloud: #ececee;
  --color-paper: #f4f4f5;
  --color-snow: #ffffff;
  --color-ember: #ff5a00;
  --color-magenta-spark: #fe45e2;

  /* Typography: Font Families */
  --font-sans-principal: 'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.64;
  --text-body: 15px;
  --leading-body: 1.45;
  --text-body-lg: 18px;
  --leading-body-lg: 1.45;
  --text-subheading: 20px;
  --leading-subheading: 1.5;
  --text-heading-sm: 32px;
  --leading-heading-sm: 1.5;
  --text-heading: 40px;
  --leading-heading: 1.28;
  --text-heading-lg: 56px;
  --leading-heading-lg: 1.28;
  --text-display: 64px;
  --leading-display: 1.12;

  /* Typography: Weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-68: 68px;
  --spacing-80: 80px;
  --spacing-120: 120px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 80px;
  --card-padding: 28px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-md: 6px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-2xl-2: 20px;
  --radius-3xl: 24px;
  --radius-3xl-2: 28px;
  --radius-3xl-3: 36px;
  --radius-3xl-4: 40px;
  --radius-full: 48px;
  --radius-full-2: 56px;
  --radius-full-3: 64px;
  --radius-full-4: 80px;
  --radius-full-5: 1000px;
  --radius-full-6: 10000px;

  /* Named Radii */
  --radius-cards: 36px;
  --radius-icons: 40px;
  --radius-pills: 10000px;
  --radius-badges: 12px;
  --radius-inputs: 14px;
  --radius-buttons: 14px;

  /* Shadows */
  --shadow-subtle: rgba(255, 255, 255, 0.5) 0px 0.5px 0px 0px inset, rgba(117, 123, 133, 0.4) 0px 9px 14px -5px inset, rgb(44, 46, 52) 0px 0px 0px 1.5px, rgba(0, 0, 0, 0.14) 0px 4px 6px 0px;
  --shadow-subtle-2: rgb(228, 228, 231) 0px 1px 0px 0px inset;
  --shadow-subtle-3: rgb(255, 255, 255) 0px 0.5px 0px 0px inset;
  --shadow-subtle-4: rgb(255, 255, 255) 0px -0.5px 0px 0px;
  --shadow-subtle-5: rgb(228, 228, 231) 0px -1px 0px 0px;
  --shadow-md: rgba(0, 0, 0, 0.04) 0px 4px 12px 0px;

  /* Surfaces */
  --surface-canvas: #f4f4f5;
  --surface-card: #ffffff;
  --surface-subtle-card: #fafafa;
  --surface-dark-surface: #18181b;
  --surface-deep-dark: #27272a;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-obsidian: #09090b;
  --color-graphite: #18181b;
  --color-slate: #27272a;
  --color-iron: #3f3f46;
  --color-steel: #52525b;
  --color-fog: #71717a;
  --color-ash: #a1a1aa;
  --color-mist: #d4d4d8;
  --color-cloud: #ececee;
  --color-paper: #f4f4f5;
  --color-snow: #ffffff;
  --color-ember: #ff5a00;
  --color-magenta-spark: #fe45e2;

  /* Typography */
  --font-sans-principal: 'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.64;
  --text-body: 15px;
  --leading-body: 1.45;
  --text-body-lg: 18px;
  --leading-body-lg: 1.45;
  --text-subheading: 20px;
  --leading-subheading: 1.5;
  --text-heading-sm: 32px;
  --leading-heading-sm: 1.5;
  --text-heading: 40px;
  --leading-heading: 1.28;
  --text-heading-lg: 56px;
  --leading-heading-lg: 1.28;
  --text-display: 64px;
  --leading-display: 1.12;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-68: 68px;
  --spacing-80: 80px;
  --spacing-120: 120px;

  /* Border Radius */
  --radius-md: 6px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-2xl-2: 20px;
  --radius-3xl: 24px;
  --radius-3xl-2: 28px;
  --radius-3xl-3: 36px;
  --radius-3xl-4: 40px;
  --radius-full: 48px;
  --radius-full-2: 56px;
  --radius-full-3: 64px;
  --radius-full-4: 80px;
  --radius-full-5: 1000px;
  --radius-full-6: 10000px;

  /* Shadows */
  --shadow-subtle: rgba(255, 255, 255, 0.5) 0px 0.5px 0px 0px inset, rgba(117, 123, 133, 0.4) 0px 9px 14px -5px inset, rgb(44, 46, 52) 0px 0px 0px 1.5px, rgba(0, 0, 0, 0.14) 0px 4px 6px 0px;
  --shadow-subtle-2: rgb(228, 228, 231) 0px 1px 0px 0px inset;
  --shadow-subtle-3: rgb(255, 255, 255) 0px 0.5px 0px 0px inset;
  --shadow-subtle-4: rgb(255, 255, 255) 0px -0.5px 0px 0px;
  --shadow-subtle-5: rgb(228, 228, 231) 0px -1px 0px 0px;
  --shadow-md: rgba(0, 0, 0, 0.04) 0px 4px 12px 0px;
}
```
