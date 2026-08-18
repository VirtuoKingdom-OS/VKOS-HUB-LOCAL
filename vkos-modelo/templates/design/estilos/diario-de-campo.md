# Diário de campo
> caderno de campo científico sobre papel pergaminho quente: superfícies cor de marfim, títulos serifados editoriais e um único destaque cor de argila que só aparece quando é preciso agir

**Tema:** claro

A interface lê como uma publicação de pesquisa cuidada, sobre papel pergaminho quente. Neutros marfim e aveia substituem a paleta cinza fria típica de tecnologia, dando a cada superfície uma textura de papel que combina com uma serifada usada em escala incomum tanto no corpo quanto no display. Um único destaque cor de argila aparece só nos momentos de ação. O resto fica quieto e editorial. Componentes são planos: bordas finas e cantos inferiores arredondados substituem sombras como linguagem de elevação, a sans cuida do chrome de interface, e a serifada carrega a voz.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|-------|
| Slate Dark | `#141413` | `--color-slate-dark` | Texto primário, títulos, fundo do rodapé, bordas finas. Preto quase puro com um toque quente, nunca preto puro |
| Ivory Medium | `#f0eee6` | `--color-ivory-medium` | Fundo da página e grandes superfícies preenchidas: o pergaminho que define o tom quente geral |
| Ivory Light | `#faf9f5` | `--color-ivory-light` | Superfícies de card, painéis elevados, botões de skip-link. Um tom mais claro que o fundo, pra camadas sutis sem sombra |
| Cloud Medium | `#b0aea5` | `--color-cloud-medium` | Texto auxiliar apagado, itens de navegação inativos, rótulos secundários. O neutro que recua sem sumir |
| Cloud Dark | `#87867f` | `--color-cloud-dark` | Bordas de botão com contorno, divisórias de contraste médio |
| Stone | `#cccbc8` | `--color-stone` | Bordas finas e divisórias entre seções. Visíveis, mas nunca assertivas |
| Slate Medium | `#3d3d3a` | `--color-slate-medium` | Bordas escuro sobre escuro dentro do rodapé |
| Oat Warm | `#e3dacc` | `--color-oat-warm` | Superfície quente secundária pra painéis agrupados e contêineres de destaque: um tom de papel mais profundo pra variedade |
| Manilla | `#f5e3c7` | `--color-manilla` | Fundo do card de destaque principal: tom de papel vintage que sinaliza importância editorial sem gritar cor |
| Clay | `#d97757` | `--color-clay` | Botões de CTA preenchidos (ex: aceitar de aviso de cookies): o único destaque cromático do sistema, um calor terracota que pertence à família de tons de terra em vez do azul de UI comum |
| Clay Deep | `#c6613f` | `--color-clay-deep` | Estado de hover/pressionado dos CTAs em Clay e o token canônico de destaque: versão mais profunda do destaque primário |

## Tokens de tipografia

### Serifada editorial. Usada para o título de display a 68px, todo o texto de corpo a 20px, títulos de card e parágrafos de apoio. A serifada carrega a personalidade; sua presença no corpo de texto (incomum em sites de tecnologia) sinaliza DNA de publicação de pesquisa. Peso 400 é o padrão, 600 pra ênfase. `--font-serif-editorial`
- **Substituto:** Georgia, Source Serif Pro, Charter
- **Pesos:** 400, 600
- **Tamanhos:** 14px, 18px, 20px, 24px, 68px
- **Altura de linha:** 1.10, 1.40, 1.43
- **Tracking:** normal
- **Papel:** Voz editorial, usada no título de display a 68px, todo o corpo de texto a 20px, títulos de card e parágrafos de apoio. A serifada carrega a personalidade; sua presença no corpo de texto (incomum em sites de tecnologia) sinaliza DNA de publicação de pesquisa. Peso 400 é o padrão, 600 pra ênfase.

### Sans de interface. Chrome de UI e display sans: links de navegação, botões, rodapés, badges, e o título de display sans em negrito a 61px peso 700. O display sans de 61px fica ao lado do display serifado de 68px como um sistema duplo deliberado: a sans grita declarações, a serifada lê como ensaio editorial. `--font-sans-ui`
- **Substituto:** Inter, system-ui, Arial
- **Pesos:** 400, 500, 600, 700
- **Tamanhos:** 12px, 15px, 16px, 20px, 24px, 61px
- **Altura de linha:** 1.00, 1.10, 1.25, 1.30, 1.40
- **Tracking:** -0.0200em a 12px (tracking apertado de nav/legenda), -0.0050em a 15-16px (aperto sutil de UI), -0.0020em em tamanhos maiores
- **Papel:** Chrome de UI e display sans: links de navegação, botões, rodapés, badges, e o título de display sans em negrito a 61px peso 700. O display sans de 61px fica ao lado do display serifado de 68px como um sistema duplo deliberado: a sans grita declarações, a serifada lê como ensaio editorial.

### Mono técnica. Reservada pra código ou trechos técnicos, aparece raramente. `--font-mono-tecnica`
- **Substituto:** JetBrains Mono, SF Mono, Menlo
- **Pesos:** 400
- **Tamanhos:** 16px
- **Altura de linha:** 1.40
- **Papel:** Reservada pra código ou trechos técnicos, aparece raramente

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.4 | -0.24px | `--text-caption` |
| body-sm | 16px | 1 | -0.08px | `--text-body-sm` |
| body | 20px | 1.4 | normal | `--text-body` |
| subheading | 24px | 1.3 | -0.05px | `--text-subheading` |
| heading | 61px | 1.1 | -0.12px | `--text-heading` |
| display | 68px | 1.1 | normal | `--text-display` |

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
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 76 | 76px | `--spacing-76` |
| 100 | 100px | `--spacing-100` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| nav | 0px |
| cards | 24px |
| links | 0px |
| badges | 0px |
| botões | 8px (só na base das variantes preenchidas), 12px (contornadas) |

### Layout

- **Largura máxima:** 1280px
- **Gap de seção:** 80-120px
- **Padding de card:** 24-32px
- **Gap de elemento:** 8px

## Componentes

### Botão link de texto
**Papel:** Link primário em linha estilizado como botão. Usado pra navegação e ações em linha

Fundo transparente, cor de texto #141413, sem borda, raio 0px, padding 22px 12px. Sublinhado aparece no hover. Nenhum preenchimento em qualquer estado: é texto que por acaso é clicável, não um contêiner.

### Botão preenchido marfim
**Papel:** Botão de ação primária em superfícies claras

Fundo #faf9f5, texto #141413, raio de borda só na base 8px (cantos superiores retos), padding 12px 31px. O raio só na base é uma escolha de assinatura: o botão lê como uma aba ou card puxado de uma pilha, não como uma pílula genérica. Sem borda, sem sombra.

### Botão contornado escuro
**Papel:** Ação secundária em fundos escuros (aviso de cookies, rodapé de modal)

Fundo transparente, texto #ffffff, borda de 1px em #87867f, raio 12px, padding 8px 16px. Tamanho compacto, tratamento fantasma que deixa o fundo escuro aparecer.

### Botão preenchido de destaque
**Papel:** O único CTA cromático, usado com moderação pras ações mais importantes

Fundo #d97757, texto branco, raio 8px, padding igual ao do botão preenchido marfim. Reservado pra momentos em que a aceitação precisa se destacar visualmente do resto da interface editorial. Aprofunda pra #c6613f no hover.

### Card de destaque principal
**Papel:** Card editorial grande pra anúncios e destaques de história

Fundo #f5e3c7 (manilla), raio de borda 24px, sem sombra, sem borda. Padding interno generoso (~48-64px) pra acomodar texto de display serifado grande e ilustração editorial. O tom de papel quente separa esse card dos cards marfim sem usar cor.

### Card de lançamento
**Papel:** Card compacto pra grade de últimos lançamentos

Fundo #faf9f5, raio 24px, borda de 1px em #cccbc8 ou sem borda, padding ~24px. Título na sans de interface a 24px peso 600 ou serifada a 20px, corpo em serifada 20px. Layout de grade em três colunas.

### Barra de navegação superior
**Papel:** Navegação fixa do site

Fundo transparente ou #f0eee6, logo à esquerda na sans de interface a 12px peso 700 tudo em maiúsculas com tracking espaçado, links de navegação alinhados à direita a 12px sans com transição de hover de #b0aea5 pra #141413. Indicadores de dropdown como chevrons. O botão de ação principal à direita usa o estilo do botão preenchido marfim. Sem blur de fundo, sem sombra.

### Rodapé
**Papel:** Seção final escura com colunas de link

Fundo #141413 de sangria total, texto #faf9f5, grade multi-coluna de links com gap de 8px. Títulos de seção em sans peso 600 a 12px, itens de link em sans a 12px em #b0aea5. O rodapé escuro é a única inversão do sistema: uma âncora final depois de todo o pergaminho acima.

### Bloco de título de herói
**Papel:** Composição assimétrica da primeira tela

Layout de duas colunas: esquerda tem o título na sans de interface a 61px peso 700 com links sublinhados em linha no meio da frase; direita tem parágrafo serifado de apoio a 20px. Espaço em branco generoso ao redor do bloco. Títulos em #141413, texto de apoio em #141413 com peso visual reduzido.

### Link sublinhado em linha
**Papel:** Link de texto embutido em parágrafos e títulos

Sem fundo, o texto herda a cor do pai (#141413), sublinhado de 1px sempre visível (não só no hover) em #141413. O sublinhado persistente é editorial: segue a convenção impressa em que links são tipografados com sublinhado, não a convenção de UI de revelar no hover.

### Badge / rótulo em linha
**Papel:** Etiqueta pequena pra categorias e metadados

Fundo transparente, texto #141413, raio 0px, sem padding acima/abaixo da linha de base do texto. Na prática é só texto em negrito ou com peso dentro do fluxo, não um contêiner. Usado com moderação.

### Barra de consentimento de cookies
**Papel:** Prompt de consentimento fixado embaixo

Faixa escura (fundo #141413) ou sobreposição escura contendo texto de corpo e três botões de ação: botão preenchido marfim (aceitar), botão contornado escuro (personalizar, rejeitar). A inversão de contraste torna o consentimento legível contra o pergaminho acima.

### Link de pular conteúdo
**Papel:** Utilitário de acessibilidade pra navegação por teclado

Fundo #faf9f5, texto #141413, padding pequeno, visível só no foco. Posicionado de forma absoluta na borda superior.

## Faça e não faça

### Faça
- Use a serifada editorial a 20px pra todo o corpo de texto e a sans de interface a 12-16px pro chrome de UI: a divisão serifada/sans define a voz do sistema.
- Use #f0eee6 como fundo de página e #faf9f5 pra cards; recorra a #f5e3c7 só quando um card precisar parecer um destaque editorial.
- Use o raio de 8px só na base nos botões preenchidos (botão preenchido marfim); esse tratamento de canto de assinatura substitui a pílula genérica.
- Use #d97757 (Clay) exclusivamente pro CTA único mais importante de cada página; nunca aplique em múltiplas ações ou elementos decorativos.
- Mantenha os sublinhados persistentes nos links em linha: convenção editorial impressa, não revelação no hover.
- Recorra ao raio de 24px em todas as superfícies de nível card pra manter a sensação de pilha de papel.
- Use a sans de 61px peso 700 junto com a serifada de 68px peso 400 como sistema de display duplo: sans pra declarações, serifada pra reflexão editorial.

### Não faça
- Não introduza cinzas frios, azuis, nem nenhuma cor fora da família de tons de terra quentes: a paleta é marfim/aveia/argila, ponto.
- Não use sombra pra elevação: esse sistema eleva através do tom de superfície (#f0eee6 para #faf9f5 para #f5e3c7) e bordas de 1px, só isso.
- Não use o destaque Clay pra decoração, ícones, estados de hover ou elementos que não sejam CTA; reserve #d97757 só pros botões de ação preenchidos.
- Não defina o texto de corpo em sans-serif: o corpo deve ser serifado a 20px; sans é só chrome de UI.
- Não aplique raio de borda uniforme nos botões; o raio de 8px só na base é uma assinatura, não um padrão pra arredondar tudo.
- Não use branco puro (#ffffff) como superfície: o sistema é tingido de marfim em todo o percurso (#faf9f5, #f0eee6, #f5e3c7); branco puro pareceria clínico e quebraria a metáfora do papel.
- Não adicione gradientes, brilhos ou lavagens de cor aos fundos; as superfícies são preenchimentos sólidos e planos, só isso.

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Fundo | `#f0eee6` | Fundo em nível de página: o pergaminho onde tudo se apoia |
| 1 | Superfície de card | `#faf9f5` | Card padrão e painel elevado: um passo tonal acima do fundo |
| 2 | Superfície de destaque quente | `#f5e3c7` | Card de destaque principal e realces editoriais: tom manilla pra ênfase visual |
| 3 | Superfície quente profunda | `#e3dacc` | Painéis agrupados secundários e contêineres quentes mais profundos |
| 4 | Superfície de inversão | `#141413` | Rodapé e faixas utilitárias escuras: a única superfície escura do sistema |

## Elevação

- **Card:** nenhuma, elevado através da mudança de tom de superfície, não de sombra
- **Botão:** nenhuma, identidade através da cor de preenchimento e do raio no canto inferior
- **Navegação:** nenhuma, plana, depende da diferença tonal em relação ao fundo da página

## Imagem

A imagética se apoia fortemente em ilustração científica vintage: o card de destaque principal contém uma colagem densa botânica/zoológica de borboletas e mariposas em estilo clássico de prancha naturalista, evocando guias de campo do século 19. As ilustrações têm tom quente pra harmonizar com o fundo pergaminho em vez de contrastar com ele. Sem fotografia, sem capturas de produto, sem gradientes abstratos. A iconografia é mínima: pequenos chevrons pra dropdowns e indicadores de linha esparsos, sempre na mesma família de neutro quente do texto. A densidade visual é baixa: grandes blocos de texto e espaço em branco dominam, com imagens aparecendo só na escala do destaque principal.

## Guia de aplicação

## Referência rápida de cor
- texto: #141413 (Slate Dark)
- fundo: #f0eee6 (Ivory Medium)
- superfície de card: #faf9f5 (Ivory Light)
- borda: #cccbc8 (Stone)
- texto apagado: #b0aea5 (Cloud Medium)
- ação primária: #d97757 (ação preenchida)

## Exemplos de componente

1. **Seção de herói**: fundo #f0eee6. Coluna esquerda: título a 61px na sans de interface peso 700, #141413, tracking -0.12px. Links em linha dentro do título sublinhados persistentemente em #141413. Coluna direita: parágrafo de apoio a 20px na serifada editorial peso 400, #141413. Layout de duas colunas, largura máxima 1280px centralizada, padding vertical generoso (~120px no topo).

2. Crie um botão de ação primária: fundo #d97757, texto #141413, raio 9999px, padding compacto de pílula. Use esse tratamento preenchido pro CTA principal.

3. **Grade de lançamentos em três colunas**: três cards no fundo #f0eee6, cada card #faf9f5 com raio de 24px e padding de 24px. Título do card a 24px na sans de interface peso 600, #141413. Corpo do card a 20px na serifada editorial peso 400, #141413. Link em linha embaixo: "Detalhes do modelo →" em #141413 com sublinhado persistente.

4. **Rodapé escuro**: fundo #141413 de sangria total, texto #faf9f5, largura máxima 1280px de conteúdo centralizado. Títulos de coluna a 12px na sans de interface peso 600, #faf9f5. Itens de link a 12px sans peso 400, #b0aea5 com gaps verticais de 8px.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-slate-dark: #141413;
  --color-ivory-medium: #f0eee6;
  --color-ivory-light: #faf9f5;
  --color-cloud-medium: #b0aea5;
  --color-cloud-dark: #87867f;
  --color-stone: #cccbc8;
  --color-slate-medium: #3d3d3a;
  --color-oat-warm: #e3dacc;
  --color-manilla: #f5e3c7;
  --color-clay: #d97757;
  --color-clay-deep: #c6613f;

  /* Typography - Font Families */
  --font-serif-editorial: 'Serif Editorial', ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans-ui: 'Sans UI', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono-tecnica: 'Mono Tecnica', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.4;
  --tracking-caption: -0.24px;
  --text-body-sm: 16px;
  --leading-body-sm: 1;
  --tracking-body-sm: -0.08px;
  --text-body: 20px;
  --leading-body: 1.4;
  --text-subheading: 24px;
  --leading-subheading: 1.3;
  --tracking-subheading: -0.05px;
  --text-heading: 61px;
  --leading-heading: 1.1;
  --tracking-heading: -0.12px;
  --text-display: 68px;
  --leading-display: 1.1;

  /* Typography - Weights */
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
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-76: 76px;
  --spacing-100: 100px;

  /* Layout */
  --page-max-width: 1280px;
  --section-gap: 80-120px;
  --card-padding: 24-32px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;

  /* Named Radii */
  --radius-nav: 0px;
  --radius-cards: 24px;
  --radius-links: 0px;
  --radius-badges: 0px;
  --radius-buttons: 8px (bottom-only on filled variants), 12px (outlined);

  /* Surfaces */
  --surface-canvas: #f0eee6;
  --surface-card-surface: #faf9f5;
  --surface-warm-feature-surface: #f5e3c7;
  --surface-deep-warm-surface: #e3dacc;
  --surface-inversion-surface: #141413;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-slate-dark: #141413;
  --color-ivory-medium: #f0eee6;
  --color-ivory-light: #faf9f5;
  --color-cloud-medium: #b0aea5;
  --color-cloud-dark: #87867f;
  --color-stone: #cccbc8;
  --color-slate-medium: #3d3d3a;
  --color-oat-warm: #e3dacc;
  --color-manilla: #f5e3c7;
  --color-clay: #d97757;
  --color-clay-deep: #c6613f;

  /* Typography */
  --font-serif-editorial: 'Serif Editorial', ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans-ui: 'Sans UI', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono-tecnica: 'Mono Tecnica', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.4;
  --tracking-caption: -0.24px;
  --text-body-sm: 16px;
  --leading-body-sm: 1;
  --tracking-body-sm: -0.08px;
  --text-body: 20px;
  --leading-body: 1.4;
  --text-subheading: 24px;
  --leading-subheading: 1.3;
  --tracking-subheading: -0.05px;
  --text-heading: 61px;
  --leading-heading: 1.1;
  --tracking-heading: -0.12px;
  --text-display: 68px;
  --leading-display: 1.1;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-76: 76px;
  --spacing-100: 100px;

  /* Border Radius */
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;
}
```
