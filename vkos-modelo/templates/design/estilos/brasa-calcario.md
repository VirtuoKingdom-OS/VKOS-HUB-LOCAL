# Brasa no calcário
> Fogo de forja sobre calcário quente. A tela é gesso quente cru, e cada elemento laranja se lê como brasa incandescente pressionada na superfície.

**Tema:** claro

O sistema roda sobre uma tela de calcário quente inundada de laranja incandescente. A interface é plana e sem sombra, deixando que a tipografia ultra-bold condensada em escala quase arquitetônica (até 189px) carregue todo o peso estrutural. Um único laranja vívido (#fc5000) funciona como o único acento cromático agressivo contra cinzas quentes monocromáticos, com um violeta plasma reservado para o halftone do herói e um amarelo sulfuroso para as tags. A linguagem visual é vulcânica: letras condensadas pesadas, padrões de pontos em halftone, raios de 40px em cards e botões, e controles em pílula de 800px: calor contido dentro de uma superfície suave, quase de papel.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Ember | `#fc5000` | `--color-ember` | Botões de ação primária, cards de estatística em destaque, realces visuais principais: o único acento cromático agressivo. Sua saturação vívida contra os cinzas quentes cria urgência sem precisar de peso decorativo adicional |
| Plasma Violet | `#524ae9` | `--color-plasma-violet` | Gradiente de base do halftone no herói, superfície de um único card secundário: aparece quase só no padrão de pontos do herói e em um card de destaque. Nunca usado em controles |
| Sulfur | `#f5f28e` | `--color-sulfur` | Fundos de tag e selo de categoria, realces suaves: o amarelo suave que rotula categorias de post de blog e anúncios de programa |
| Limestone | `#f7f6f2` | `--color-limestone` | Superfícies de card, fundos de bloco de conteúdo, preenchimentos de botão secundário: o off-white quente mais claro que eleva os elementos sobre a tela da página |
| Pumice | `#e2e2df` | `--color-pumice` | Tela de fundo da página, fundo dominante: o cinza-médio quente que sustenta cada seção. Levemente mais escuro que as superfícies de card, para criar separação sutil de figura/fundo sem sombras |
| Obsidian | `#070607` | `--color-obsidian` | Texto primário, títulos, texto de link, bordas de botão: preto quase puro com um tom levemente quente, alinhado ao calor da tela |
| Chalk | `#ffffff` | `--color-chalk` | Texto em seções escuras, texto de campo em fundos escuros, sobreposições de alto contraste: branco puro usado só onde o contraste máximo contra superfícies escuras é necessário |

## Tokens de tipografia

### PP Neue Corp Compact: todos os títulos e texto de destaque. Uma fonte condensada ultra-bold sob medida que dá aos títulos um peso industrial, quase de placa pintada à mão. O tamanho de destaque de 189px no herói é a assinatura: comprimido, quase estrutural em vez de tipográfico. As feature settings "ss06" e "ss10" ativam formas de letra e espaçamento alternativos para um ritmo condensado mais agressivo. O tracking positivo (+0,02em) é incomum para tamanhos de destaque e evita que os traços pesados fiquem claustrofóbicos entre 80 e 189px. `--font-pp-neue-corp-compact`
- **Substituto:** Bebas Neue, Anton, Druk Wide Bold
- **Pesos:** 400 (corte Ultrabold)
- **Tamanhos:** 26px, 32px, 40px, 48px, 56px, 64px, 80px, 96px, 189px
- **Altura de linha:** 0.94–1.20
- **Tracking:** 0,64px em 32px (0,02em), escalando proporcionalmente até cerca de 3,78px no destaque de 189px
- **Recursos OpenType:** `"ss06", "ss10"`
- **Papel:** todos os títulos e texto de destaque. Uma fonte condensada ultra-bold sob medida que dá aos títulos um peso industrial, quase de placa pintada à mão. O tamanho de destaque de 189px no herói é a assinatura: comprimido, quase estrutural em vez de tipográfico.

### DM Sans: texto de corpo, links de navegação, rótulos de botão, títulos de apoio até 30px. O peso Medium constante é deliberado: Regular pareceria fino demais contra o tipo de destaque ultra-bold, e Bold competiria com ele. DM Sans traz um contraponto humanista e levemente geométrico à fonte industrial de destaque. `--font-dm-sans`
- **Substituto:** Inter, Manrope
- **Pesos:** 500 (só Medium, nunca Regular ou Bold)
- **Tamanhos:** 14px, 16px, 18px, 30px
- **Altura de linha:** 1.20–1.55
- **Papel:** texto de corpo, links de navegação, rótulos de botão, títulos de apoio até 30px. O peso Medium constante é deliberado: Regular pareceria fino demais contra o tipo de destaque ultra-bold, e Bold competiria com ele.

### System sans-serif: legendas, texto de metadado, datas, microrrótulos. Usada só em 12px, onde peso e presença de marca importam menos que economia de tamanho. `--font-system-sans-serif`
- **Pesos:** 400
- **Tamanhos:** 12px
- **Altura de linha:** 1.20
- **Papel:** legendas, texto de metadado, datas, microrrótulos. Usada só em 12px, onde peso e presença de marca importam menos que economia de tamanho.

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.2 | normal | `--text-caption` |
| body-sm | 14px | 1.2 | normal | `--text-body-sm` |
| body | 16px | 1.55 | normal | `--text-body` |
| subheading | 26px | 1.2 | normal | `--text-subheading` |
| heading-sm | 30px | 1.5 | normal | `--text-heading-sm` |
| heading | 32px | 1 | 0.64px | `--text-heading` |
| heading-lg | 48px | 1 | normal | `--text-heading-lg` |
| heading-2xl | 80px | 1.1 | normal | `--text-heading-2xl` |
| heading-3xl | 96px | 0.95 | normal | `--text-heading-3xl` |
| display | 189px | 0.94 | normal | `--text-display` |

## Espaçamento e formas

**Densidade:** confortável

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 9 | 9px | `--spacing-9` |
| 10 | 10px | `--spacing-10` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 18 | 18px | `--spacing-18` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 56 | 56px | `--spacing-56` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |
| 92 | 92px | `--spacing-92` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 40px |
| pílulas | 800px |
| pequeno | 16px |
| campos | 100px |
| médio | 20px |
| botões | 40px |

### Layout

- **Largura máxima:** 1280px
- **Gap de seção:** 80px
- **Padding de card:** 40px
- **Gap de elemento:** 16px

## Componentes

### Botão CTA primário
**Papel:** ação principal de conversão

Preenchido em Ember (#fc5000) com texto Obsidian (#070607). Raio de 800px (pílula completa). Padding 12px vertical, 24px horizontal. DM Sans peso 500 em 16px. Sem sombra. O formato de pílula é o controle mais distinto do sistema: nunca retangular.

### Botão secundário em pílula
**Papel:** ação alternativa ou CTA pareado

Fundo transparente, borda Obsidian (#070607) de 1,5px, texto Obsidian. Raio de 40px. Padding de 16px em todos os lados. DM Sans 500 em 16px. O estilo de borda aqui é sólido, não pontilhado. Fica ao lado do CTA primário como a contraparte mais discreta.

### Link fantasma com contorno
**Papel:** link de texto ou item de navegação de baixa ênfase

Fundo transparente, sem borda visível, texto Obsidian. Raio de pílula de 800px. Padding 0 vertical, 12px horizontal. DM Sans 500 em 16px. Usado em itens de navegação e links inline: depende de cor e posição, não do peso do contêiner.

### Card de estatística em destaque
**Papel:** realçar métricas-chave

Fundo sólido Ember (#fc5000), texto Chalk (#ffffff). Raio de 40px. Padding de 40px em todos os lados. Sem sombra. O número grande da métrica usa PP Neue Corp Compact em 80px+; o rótulo acima usa DM Sans 500 em 14–16px. Esses cards são os elementos mais dominantes visualmente depois do herói.

### Card de conteúdo
**Papel:** posts de blog, anúncios, entradas de programa

Fundo Limestone (#f7f6f2), sem borda, sem sombra. Raio de 40px. Padding de 40px em todos os lados. Contém uma tag de categoria, título (PP Neue Corp Compact 26–32px em Obsidian) e metadado de data. A área de imagem no topo pode ser um bloco halftone ou sólido em Ember.

### Card de herói em plasma
**Papel:** superfície de conteúdo de destaque único

Fundo Plasma Violet (#524ae9) com padrão de pontos em halftone branco sobreposto. Raio de 40px. Usado com moderação: aparece uma vez como âncora visual de assinatura. Sem sombra.

### Selo de tag de categoria
**Papel:** rotular posts de blog e anúncios

Fundo Sulfur (#f5f28e), texto Obsidian (#070607). Formato de pílula (raio 800px). DM Sans 500 em 12–14px. Padding de cerca de 3–4px vertical, 8–10px horizontal. Pequeno, vibrante e funcionalmente puro: o único elemento amarelo do sistema.

### Barra de navegação
**Papel:** navegação principal do site

O fundo de página Pumice (#e2e2df) continua por trás. Os itens de navegação são texto Obsidian em DM Sans 500 em 16px, separados por gaps de 9px. A linha inteira de navegação pode ficar dentro de um contêiner em pílula Limestone (#f7f6f2) com raio de 800px: um elemento de assinatura. Logo (ícone de montanha + logotipo) à esquerda, ícones sociais e CTA à direita.

### Bloco de halftone no herói
**Papel:** centro visual da seção de herói

Grande retângulo arredondado preenchido com gradiente de Plasma Violet (#524ae9) para Ember (#fc5000), sobreposto por um padrão de pontos laranja em halftone. Raio de 40px. Dimensões em escala de herói (cerca de 50% da largura da viewport). O efeito halftone é a assinatura visual mais distinta do sistema: uma grade de pontos densa, tipo pixel art, que desvanece para laranja sólido no canto superior direito.

### Campo de entrada
**Papel:** campo de formulário em seções escuras

Fundo transparente, borda Chalk (#ffffff) de 1,5px. Raio de 100px (pílula). Padding 24px vertical, 32px esquerda, 64px direita. Texto Chalk. DM Sans 500. Usado só em seções escuras/de contraste.

### Faixa de logos de parceiros
**Papel:** exibir parceiros ou integrações do ecossistema

Card com fundo Limestone (#f7f6f2), raio de 40px, padding de 40px. Logos organizados em uma única linha com altura consistente, separados por divisores pontilhados verticais Obsidian de 1,5px. Sem contêineres individuais por logo: tratamento inline plano.

### Divisor pontilhado
**Papel:** separador de seção e detalhe decorativo

Linha pontilhada de 1,5px em Obsidian (#070607). Usada como divisor vertical em navegação e faixas de parceiros, e ocasionalmente como quebra horizontal de seção. O estilo pontilhado (não tracejado, não sólido) é um detalhe de assinatura pequeno, porém consistente.

## Faça e não faça

### Faça
- Use PP Neue Corp Compact em 48px ou mais para qualquer título que precise soar estrutural: abaixo de 40px o peso ultra-bold satura e perde o caráter industrial.
- Aplique raio de 40px a todos os cards, blocos de conteúdo e botões não-pílula como o raio de superfície padrão.
- Use raio de 800px (pílula completa) para todos os botões, tags, contêineres de navegação e pequenos elementos interativos.
- Configure os CTAs primários em Ember (#fc5000) com texto Obsidian (#070607), padding de 12px/24px: nunca retangular, sempre em pílula.
- Mantenha o texto de corpo em DM Sans 500 (Medium): nunca caia para o peso Regular, que fica raso contra o tipo de destaque ultra-bold.
- Use o padrão de pontos halftone (pontos laranja sobre violeta) como tratamento visual de herói/assinatura: é o motivo mais reconhecível do sistema.
- Camadas de superfície por contraste de cor (tela Pumice, cards Limestone, destaques Ember), não por sombras ou bordas.

### Não faça
- Não adicione sombra projetada a nenhum elemento: o sistema é deliberadamente plano; sombras prejudicariam o calor de papel.
- Não use botões retangulares (raio baixo): o tratamento em pílula/raio 40px é inegociável.
- Não introduza cores de acento além de Ember, Plasma Violet e Sulfur: a paleta é deliberadamente limitada a três tons cromáticos.
- Não use pesos Regular ou Bold do DM Sans no corpo: Medium (500) é o único peso correto.
- Não configure títulos abaixo de 26px ou acima de 189px: o tipo de destaque só funciona em escala arquitetônica.
- Não use Plasma Violet em botões ou controles: é reservado ao halftone do herói e a um único card de destaque.
- Não aplique tracking negativo ao PP Neue Corp Compact: o tracking positivo de +0,02em é intencional em tamanhos de destaque para evitar colisão dos traços.

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Pumice Canvas | `#e2e2df` | Fundo da página: cinza-médio quente que sustenta todo o conteúdo |
| 1 | Limestone Surface | `#f7f6f2` | Cards, blocos de conteúdo, botões secundários: off-white quente mais claro |
| 2 | Ember Feature | `#fc5000` | Cards de estatística em destaque e superfícies de ênfase: a única elevação de superfície cromática |
| 3 | Plasma Hero | `#524ae9` | Bloco de halftone do herói: reservado à sobreposição de gradiente do herói da página inicial |

## Elevação

Deliberadamente sem sombra. O design depende de contraste de cor (cinza quente versus off-white mais claro versus laranja vívido) e raios generosos de 40px para criar hierarquia de superfície. Nenhum elemento projeta sombra em nenhum lugar do sistema: a planura mantém o tipo pesado e o laranja vibrante longe do exagero.

## Imagem

A imagem é mínima e deliberada. O herói usa um padrão abstrato de pontos halftone (pontos laranja sobre um gradiente violeta para laranja) em vez de fotografia: funciona como arte de marca, não decoração. Cards de produto e anúncio usam blocos sólidos Ember ou o halftone Plasma Violet como preenchimento de área de imagem, mantendo um sistema gráfico consistente. Logos de parceiros/integrações são renderizados como marcas monocromáticas sobre fundos claros. Sem fotografia, sem renders 3D, sem imagem de estilo de vida em lugar nenhum. Os ícones são pequenos, monocromáticos e minimalistas: Discord, X e Telegram aparecem na navegação como glifos simples. A linguagem visual é gráfica e editorial, não fotográfica: pense em design de pôster, não em banco de imagens.

## Guia de aplicação

## Referência rápida de cor
- Fundo de página: #e2e2df (Pumice)
- Superfície de card/conteúdo: #f7f6f2 (Limestone)
- Texto primário/títulos: #070607 (Obsidian)
- ação primária: #fc5000 (preenchimento de ação)
- Acento: #524ae9 (Plasma Violet), só no halftone do herói
- Tag/selo: #f5f28e (Sulfur)
- Borda de campo (seções escuras): #ffffff (Chalk)

## Exemplos de componente
1. Crie um botão de ação primária: fundo #fc5000, texto #000000, raio 9999px, padding compacto em pílula. Use esse tratamento preenchido para o CTA principal.

2. **Linha de estatísticas**: quatro cards Ember (#fc5000) em linha, cada um com raio 40px, padding 40px. Rótulo em DM Sans 500 em 14px, texto Chalk (#ffffff). Valor da métrica em PP Neue Corp Compact em 80px peso 400, texto Chalk, altura de linha 1.1.

3. **Card de conteúdo**: fundo Limestone (#f7f6f2), raio 40px, padding 40px. Tag em pílula Sulfur (#f5f28e) no topo com texto DM Sans 500 12px Obsidian, raio 800px. Título em 32px PP Neue Corp Compact, Obsidian, tracking 0,64px. Data em 12px system sans-serif, Obsidian.

4. **Seção de campo escuro**: fundo Obsidian (#070607). Campo em pílula Chalk (#ffffff) com raio 100px, padding 24px/32px, borda Chalk de 1,5px. DM Sans 500 16px texto Chalk. Botão de envio: preenchimento Ember, raio 800px, padding 12px/24px.

## Motivos de assinatura

Três assinaturas visuais definem a identidade do sistema e devem se repetir em novas páginas: (1) o padrão de pontos halftone, pontos laranja sobre gradiente violeta para laranja, sempre em escala de herói com raio de 40px, é o motivo mais reconhecível. (2) O título de destaque em 189px, tipo condensado ultra-bold em escala quase arquitetônica, com altura de linha apertada de 0,94, sinaliza que a página segue esse sistema. (3) O sistema de raio triplo, 100px para campos, 40px para cards e botões retangulares, 800px para pílulas, cria arredondamento consistente sem monotonia.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-ember: #fc5000;
  --color-plasma-violet: #524ae9;
  --color-sulfur: #f5f28e;
  --color-limestone: #f7f6f2;
  --color-pumice: #e2e2df;
  --color-obsidian: #070607;
  --color-chalk: #ffffff;

  /* Typography: Font Families */
  --font-pp-neue-corp-compact: 'PP Neue Corp Compact', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-dm-sans: 'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-system-sans-serif: 'System sans-serif', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.2;
  --text-body-sm: 14px;
  --leading-body-sm: 1.2;
  --text-body: 16px;
  --leading-body: 1.55;
  --text-subheading: 26px;
  --leading-subheading: 1.2;
  --text-heading-sm: 30px;
  --leading-heading-sm: 1.5;
  --text-heading: 32px;
  --leading-heading: 1;
  --tracking-heading: 0.64px;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1;
  --text-heading-2xl: 80px;
  --leading-heading-2xl: 1.1;
  --text-heading-3xl: 96px;
  --leading-heading-3xl: 0.95;
  --text-display: 189px;
  --leading-display: 0.94;

  /* Typography: Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-18: 18px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-92: 92px;

  /* Layout */
  --page-max-width: 1280px;
  --section-gap: 80px;
  --card-padding: 40px;
  --element-gap: 16px;

  /* Border Radius */
  --radius-2xl: 16px;
  --radius-2xl-2: 20px;
  --radius-3xl: 24px;
  --radius-3xl-2: 32px;
  --radius-3xl-3: 40px;
  --radius-full: 100px;
  --radius-full-2: 800px;

  /* Named Radii */
  --radius-cards: 40px;
  --radius-pills: 800px;
  --radius-small: 16px;
  --radius-inputs: 100px;
  --radius-medium: 20px;
  --radius-buttons: 40px;

  /* Surfaces */
  --surface-pumice-canvas: #e2e2df;
  --surface-limestone-surface: #f7f6f2;
  --surface-ember-feature: #fc5000;
  --surface-plasma-hero: #524ae9;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-ember: #fc5000;
  --color-plasma-violet: #524ae9;
  --color-sulfur: #f5f28e;
  --color-limestone: #f7f6f2;
  --color-pumice: #e2e2df;
  --color-obsidian: #070607;
  --color-chalk: #ffffff;

  /* Typography */
  --font-pp-neue-corp-compact: 'PP Neue Corp Compact', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-dm-sans: 'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-system-sans-serif: 'System sans-serif', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.2;
  --text-body-sm: 14px;
  --leading-body-sm: 1.2;
  --text-body: 16px;
  --leading-body: 1.55;
  --text-subheading: 26px;
  --leading-subheading: 1.2;
  --text-heading-sm: 30px;
  --leading-heading-sm: 1.5;
  --text-heading: 32px;
  --leading-heading: 1;
  --tracking-heading: 0.64px;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1;
  --text-heading-2xl: 80px;
  --leading-heading-2xl: 1.1;
  --text-heading-3xl: 96px;
  --leading-heading-3xl: 0.95;
  --text-display: 189px;
  --leading-display: 0.94;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-18: 18px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-92: 92px;

  /* Border Radius */
  --radius-2xl: 16px;
  --radius-2xl-2: 20px;
  --radius-3xl: 24px;
  --radius-3xl-2: 32px;
  --radius-3xl-3: 40px;
  --radius-full: 100px;
  --radius-full-2: 800px;
}
```
