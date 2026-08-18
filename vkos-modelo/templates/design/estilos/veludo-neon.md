# Veludo neon
> veludo preto com néon violeta

**Tema:** escuro

A interface vive numa escuridão quase total: fundo preto puro, bordas grafite finas e tipografia branco sobre preto que parece texto impresso em vidro fosco. O herói é anti-decorativo: um único título serifado grande a 96px ao lado de um cubo preto em 3D, sem lavagem de gradiente e sem ilustração de marketing. A marca é um violeta compacto (#9281f7) que aparece em strings de endereço de email, ícones de status e amostras de código, nunca em botões. Uma fonte monoespaçada carrega a identidade de desenvolvedor em cada bloco de código, badge e rótulo em linha, fazendo a página ler como um terminal envolto numa interface de luxo. Os componentes têm cantos afiados ou suavemente arredondados (6px / 16px), elevação baixa, e dependem de bordas de 1px em vez de sombras pra separar camadas. O movimento é contido mas expressivo: texto de herói com fade e slide, rotação sutil em WebGL no cubo do herói, e transições curtas de 150ms ease-out no hover.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|-------|
| Void Black | `#000000` | `--color-void-black` | Fundo de página, superfícies de card, scrims de overlay: o canvas inteiro |
| Graphite Hairline | `#292d30` | `--color-graphite-hairline` | Bordas de 1px em cards, inputs, botões, blocos de código, divisórias: define toda separação de camada |
| White | `#ffffff` | `--color-white` | Títulos primários, texto de herói, rótulos de botão, preenchimentos de ícone em superfícies escuras |
| Bone White | `#f0f0f0` | `--color-bone-white` | Texto de corpo, títulos secundários, contornos de traço em ícones: a cor de leitura primária |
| Ash Gray | `#a1a4a5` | `--color-ash-gray` | Texto de corpo apagado, rótulos de badge, traços de ícone: texto e metadado de terceiro nível |
| Smoke Gray | `#abafb4` | `--color-smoke-gray` | Cor de link, texto de botão inativo, legendas de apoio: texto de quarto nível |
| Iron | `#6e727a` | `--color-iron` | Traços decorativos sutis, estados desabilitados, bordas de baixa ênfase |
| Charcoal | `#464a4d` | `--color-charcoal` | Texto de código em linha, rótulos apagados: texto que deve desaparecer na superfície |
| Iris Violet | `linear-gradient(to right bottom in oklab, rgb(146, 129, 247) 0%, rgb(154, 84, 220) 100%)` | `--color-iris-violet` | Destaque de texto violeta pra links, tags e frases curtas enfatizadas; gradiente diagonal violeta-magenta em contêineres de ícone e badges de marca |
| Iris Violet Glow | `#baa7ff` | `--color-iris-violet-glow` | Destaque de texto violeta pra links, tags e frases curtas enfatizadas |
| Signal Blue | `#3b9eff` | `--color-signal-blue` | Cor de ação azul pra botões preenchidos, estados de navegação selecionados e momentos de conversão em foco |
| Sky Blue | `#70b8ff` | `--color-sky-blue` | Destaque de texto azul pra links, tags e frases curtas enfatizadas |
| Pulse Green | `#3ad389` | `--color-pulse-green` | Destaque de texto verde pra links, tags e frases curtas enfatizadas. Usar como destaque de apoio, não como cor de status |
| Alarm Red | `#ff9592` | `--color-alarm-red` | Destaque de texto vermelho pra links, tags e frases curtas enfatizadas. Usar como destaque de apoio, não como cor de status |
| Crimson | `#ff6465` | `--color-crimson` | Lavagem vermelha pra fundos de destaque, faixas decorativas e ênfase suave atrás de conteúdo. Usar como destaque de apoio, não como cor de status |
| Amber | `#ffca16` | `--color-amber` | Destaque de texto amarelo pra links, tags e frases curtas enfatizadas. Usar como destaque de apoio, não como cor de status |
| Amber Glow | `#ffd60a` | `--color-amber-glow` | Lavagem amarela pra fundos de destaque, faixas decorativas e ênfase suave atrás de conteúdo. Usar como destaque de apoio, não como cor de status |
| Surface Gradient | `linear-gradient(rgb(27, 27, 27), rgb(3, 3, 3))` | `--color-surface-gradient` | Elevação sutil de card pro fundo: usado em desvanecimentos de borda e painéis elevados |

## Tokens de tipografia

### Sans de corpo. Corpo de texto, rótulos de UI, navegação, botões, links. O cavalo de batalha: aparece 1280 vezes em toda superfície fora de código. `--font-sans-corpo`
- **Substituto:** Inter (Google Fonts), Söhne, system-ui
- **Pesos:** 400, 500, 600
- **Tamanhos:** 12px, 14px, 16px, 18px, 24px
- **Altura de linha:** 1.00, 1.33, 1.43, 1.50, 1.60
- **Papel:** Corpo de texto, rótulos de UI, navegação, botões, links. O cavalo de batalha: aparece 1280 vezes em toda superfície fora de código.

### Serifada de display. Tipo de display do herói: peso 400 a 96px com tracking de -0.01em cria uma sensação editorial, quase impressa. Usada só duas vezes na página inteira, pra maior declaração de herói. `--font-serifada-display`
- **Substituto:** GT Sectra, Tiempos Headline, Playfair Display
- **Pesos:** 400
- **Tamanhos:** 77px, 96px
- **Altura de linha:** 1.00
- **Tracking:** -0.01em
- **Recursos OpenType:** `"ss01", "ss04", "ss11"`
- **Papel:** Tipo de display do herói: peso 400 a 96px com tracking de -0.01em cria uma sensação editorial, quase impressa. Usada só duas vezes na página inteira, pra maior declaração de herói.

### Grotesca de seção. Títulos de seção e subtítulos. O peso 400 a 56px com tracking de -0.05em é a assinatura: tracking negativo extremo numa sans geométrica cria uma sensação de display comprimida e confiante que contrasta com a serifada editorial do herói. `--font-grotesca-secao`
- **Substituto:** Inter Display, Söhne Breit, GT America
- **Pesos:** 400, 500
- **Tamanhos:** 14px, 16px, 20px, 56px
- **Altura de linha:** 1.00, 1.20, 1.30, 1.50
- **Tracking:** -0.05em a 56px, +0.025em a 14px
- **Recursos OpenType:** `"ss01", "ss04", "ss11"; "ss01", "ss03", "ss04"`
- **Papel:** Títulos de seção e subtítulos. O peso 400 a 56px com tracking de -0.05em é a assinatura: tracking negativo extremo numa sans geométrica cria uma sensação de display comprimida e confiante que contrasta com a serifada editorial do herói.

### Mono de commit. Blocos de código, código em linha, badges estilo terminal, rótulos de API. A presença monoespaçada é o sinal de identidade do desenvolvedor: aparece 814 vezes, rivalizando com a sans de corpo. `--font-mono-commit`
- **Substituto:** JetBrains Mono, Berkeley Mono, IBM Plex Mono
- **Pesos:** 400
- **Tamanhos:** 12px, 14px, 16px
- **Altura de linha:** 1.33, 1.43, 1.50
- **Papel:** Blocos de código, código em linha, badges estilo terminal, rótulos de API. A presença monoespaçada é o sinal de identidade do desenvolvedor: aparece 814 vezes, rivalizando com a sans de corpo.

### Helvetica. Detectada em dados extraídos mas não descrita pela IA. `--font-helvetica`
- **Pesos:** 400, 600, 700
- **Tamanhos:** 14px
- **Altura de linha:** 1, 1.71
- **Papel:** Detectada em dados extraídos mas não descrita pela IA

### -apple-system. Detectada em dados extraídos mas não descrita pela IA. `--font-apple-system`
- **Pesos:** 400
- **Tamanhos:** 14px
- **Altura de linha:** 1.5, 1.55
- **Recursos OpenType:** `"liga" 0`
- **Papel:** Detectada em dados extraídos mas não descrita pela IA

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.33 | normal | `--text-caption` |
| body-sm | 14px | 1.43 | normal | `--text-body-sm` |
| body | 16px | 1.5 | normal | `--text-body` |
| subheading | 20px | 1 | normal | `--text-subheading` |
| heading-sm | 24px | 1.5 | normal | `--text-heading-sm` |
| heading | 56px | 1.2 | -2.8px | `--text-heading` |
| heading-lg | 77px | 1 | -0.77px | `--text-heading-lg` |
| display | 96px | 1 | -0.96px | `--text-display` |

## Espaçamento e formas

**Unidade base:** 4px

**Densidade:** confortável

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
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |
| 96 | 96px | `--spacing-96` |
| 104 | 104px | `--spacing-104` |
| 144 | 144px | `--spacing-144` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 16px |
| badges | 6px |
| inputs | 6px |
| botões | 6px |
| large-panels | 24px |

### Shadows

| Nome | Valor | Token |
|------|-------|-------|
| subtle | `rgba(176, 199, 217, 0.145) 0px 0px 0px 1px` | `--shadow-subtle` |
| subtle-2 | `rgb(0, 0, 0) 0px 0px 0px 8px` | `--shadow-subtle-2` |
| subtle-3 | `rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0p...` | `--shadow-subtle-3` |

### Layout

- **Largura máxima:** 1200px
- **Gap de seção:** 96px
- **Padding de card:** 32px
- **Gap de elemento:** 16px

## Componentes

### Botão primário (fantasma sobre preto)
**Papel:** CTA padrão, "Começar", "Entrar"

Fundo transparente, borda de 1px em #292d30, texto branco (#ffffff), raio 6px, padding 12px 16px. Hover aumenta a opacidade da borda pra branco. Esse é o botão de assinatura: nunca preenchido, nunca colorido.

### Botão de link de navegação
**Papel:** Itens de navegação principal, "Recursos", "Empresa", "Documentação"

Fundo transparente, sem borda, cor de texto #f0f0f0 a 14px sans de corpo peso 400, padding 0px. Sublinhado ou mudança de cor no hover pra #ffffff.

### Link de texto com chevron
**Papel:** CTAs em linha, "Documentação", "Começar >"

Sem fundo, sem borda, texto branco ou #f0f0f0 a 16px sans de corpo, ícone de chevron ao final na mesma cor. Contido, estilo terminal.

### Pílula de anúncio do herói
**Papel:** Badge acima do título do herói

Preenchimento transparente, borda de 1px em #292d30, texto #f0f0f0 a 14px sans de corpo, raio de pílula 9999px, padding 6px 12px. Pequeno chevron de destaque cromático.

### Card de seção
**Papel:** Cards de conteúdo em seções de recursos e grade de depoimentos

Fundo preto (#000000), borda de 1px em #292d30, raio 16px, padding 32px, sem sombra. Os cards dependem da borda pra se separar do fundo preto.

### Card de depoimento
**Papel:** Cards de citação de cliente na seção de depoimentos

Fundo preto, borda de 1px em #292d30, raio 16px, padding 24px. Contém texto citado a 16px sans de corpo, avatar (círculo de 32px), nome a 14px peso 500 em #f0f0f0, cargo/título em #a1a4a5.

### Bloco de código / janela de terminal
**Papel:** Trechos de código e exemplos de API voltados pro desenvolvedor

Fundo preto, borda de 1px em #292d30, raio 16px, mono de commit a 12-14px. O destaque de sintaxe usa #9281f7 pra strings/palavras-chave, #3b9eff pra nomes de arquivo, #3ad389 pra valores de sucesso, #ff9592 pra erros. Pontos estilo semáforo opcionais no canto superior esquerdo pra estética de terminal.

### Grade de logos
**Papel:** Logos de clientes

Logos em exibição inline nas cores nativas sobre fundo preto, centralizados numa grade de 4 colunas com gap de linha de 60px. Sem envoltório de card, sem rótulos: só as marcas respirando contra o preto.

### Ponto indicador de status
**Papel:** Status de evento de email: entregue, aberto, clicado, retornado, reclamado

Ponto preenchido de 2-3px de diâmetro, sem borda, pareado com texto de rótulo em mono de commit. Cores mapeiam pra semântica: #3ad389 entregue, #70b8ff aberto, #baa7ff clicado, #ff9592 retornado, #ffca16 reclamado.

### Badge de endereço de email
**Papel:** Endereços "de:" em amostras de código e UI

Sem fundo, mono de commit a 12-14px, cor de texto #9281f7 (Iris Violet). O violeta sobre preto torna identificadores de email o elemento de código mais legível: uma escolha deliberada de UX pra desenvolvedores.

### Contêiner de ícone
**Papel:** Contêineres de quadrado arredondado pra ícones de app na grade de integrações

Quadrado arredondado de 32x32 ou 48x48 (raio de 16px), preenchimento em gradiente sutil (violeta para magenta em oklab), ícone de traço branco ou violeta dentro. Cria a única superfície cromática da página.

### Cubo 3D do herói
**Papel:** Cubo geométrico preto renderizado em WebGL no herói

Cubo preto de opacidade total com destaques de borda sutis em #292d30, girando lentamente. Sem brilho, sem cor: um objeto escultural que ancora o lado direito do herói contra o fundo preto.

### Linha de link do rodapé
**Papel:** Rodapé minimalista com dois links de texto

Dois links de texto ("Privacidade", "Termos") a 14px sans de corpo em #a1a4a5, separados por espaço, sem elementos decorativos. O rodapé é intencionalmente mínimo: sem logo, sem colunas.

## Faça e não faça

### Faça
- Use #000000 puro como fundo de página: nunca preto suave ou cinzas escuros tingidos pro fundo.
- Separe todas as camadas de UI com bordas de 1px em #292d30, não com sombras. Cards, inputs e blocos de código dependem todos de bordas finas contra o fundo preto.
- Use a mono de commit pra qualquer código, endereço de email ou string voltada pro desenvolvedor. Mantenha a sans de corpo pra prosa e chrome de UI.
- Mantenha os botões fantasma/contornados: preenchimento transparente, borda de 1px, texto branco. Nunca use um botão preenchido colorido como CTA primário.
- Use raio de 6px pra botões, badges, inputs. Use raio de 16px pra cards e janelas de código. Nunca misture: a escala de raio é de dois valores.
- Deixe o Iris Violet (#9281f7) marcar strings de código e identificadores de desenvolvedor. É a única cor de marca e deve parecer destaque de sintaxe, não decoração.
- Aplique tracking apertado de -0.05em em tamanhos de display de 56px e -0.01em a 96px no herói. O tracking comprimido é o que faz os títulos parecerem confiantes.

### Não faça
- Não adicione gradientes, brilhos ou lavagens cromáticas ao fundo do herói ou das seções. O fundo é preto plano.
- Não use botões de cor de destaque preenchidos (azul, violeta, verde) como ações primárias. Os botões ficam fantasma ou texto branco sobre preto.
- Não use múltiplos raios de borda numa única superfície. Cards são 16px, botões/badges/inputs são 6px: escolha um por componente.
- Não introduza fundos de card coloridos. Os cards ficam em preto com bordas finas; sem preenchimentos em #292d30.
- Não use sombra pra elevação. O design depende de bordas de 1px e blurs de fundo sutis, não de sombras projetadas.
- Não combine o Iris Violet com tipo grande como cor de título decorativa. Ele pertence só a código e identificadores de desenvolvedor.
- Não quebre a disciplina monocromática com um violeta ao adicionar múltiplos tons de destaque ao chrome de UI. As cores de status (verde, azul, vermelho, âmbar) são reservadas pra indicadores de dados/status.

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Void | `#000000` | Fundo de página primário, preto de sangria total |
| 1 | Graphite | `#292d30` | Bordas finas que definem superfícies de card e input contra o vazio |
| 2 | Elevação de superfície | `#0b0e14` | Painéis elevados e scrims de overlay via gradiente sutil |
| 3 | Blur de fundo | `#000000f2` | Overlays de modal e navegação com blur(25px) |

## Elevação

A elevação é alcançada através de bordas finas (#292d30) contra um fundo preto plano, nunca através de sombras projetadas. O único token de sombra em uso ativo é um anel fino de 1px (rgba(176, 199, 217, 0.145)) em contêineres de ícone, usado com moderação pra sugerir uma fonte de luz sutil em vez de profundidade.

## Imagem

A imagética é quase inteiramente objetos 3D renderizados em WebGL (cubo preto no herói, formas geométricas girando) e capturas de tela de produto inline mostradas dentro de janelas de código escuras. Sem fotografia, sem ilustrações, sem imagem de estilo de vida. Os logos na faixa de confiança são SVGs inline nas cores nativas. Os ícones são contornos de traço de 1px-1.5px em #f0f0f0 ou #a1a4a5. A linguagem visual é: fundo preto, objeto 3D como âncora do herói, janelas de código escuras como prova de produto, logos SVG brancos como prova social. Nada decorativo: todo elemento visual é estrutural (cubo) ou demonstrativo (janela de código, logo).

## Guia de aplicação

Referência rápida de cor:
- texto/título: #ffffff
- texto/corpo: #f0f0f0
- texto/apagado: #a1a4a5
- fundo/canvas: #000000
- borda/fina: #292d30
- destaque/código: #9281f7
- ação primária: #3b9eff (ação preenchida)

3-5 exemplos de componente:

1. Crie um título de seção: "Integre hoje à noite" a 56px na grotesca de seção peso 400, cor #ffffff, tracking -2.8px, altura de linha 1.2. Abaixo, texto de corpo a 18px sans de corpo peso 400, cor #a1a4a5. A seção fica sobre fundo #000000 sem borda.

2. Crie uma janela de terminal de código: fundo #000000, borda de 1px em #292d30, raio 16px, padding 24px. Conteúdo em mono de commit a 14px. Strings de endereço de email coloridas em #9281f7, palavras-chave coloridas em #f0f0f0, valores de sucesso coloridos em #3ad389. Três pontos opcionais estilo semáforo (círculos de 8px) no canto superior esquerdo.

3. Crie uma barra de navegação: fundo transparente, logotipo à esquerda (branco), itens de navegação ("Recursos", "Empresa", "Documentação") em sans de corpo 14px peso 400, cor #f0f0f0. À direita, um botão "Começar": preenchimento transparente, borda de 1px em #292d30, texto branco, raio 6px, padding 8px 16px. A barra fica sobre #000000 sem separador.

4. Crie um card de depoimento: fundo #000000, borda de 1px em #292d30, raio 16px, padding 32px. Texto de citação em sans de corpo 16px peso 400, cor #f0f0f0. Abaixo: avatar circular de 32px, nome em sans de corpo 14px peso 500 #f0f0f0, cargo/título em #a1a4a5. Sem sombra.

5. Crie uma linha de indicador de status: pílula inline com um ponto circular de 2px em #3ad389 seguido do rótulo "Entregue" em mono de commit 12px, cor #a1a4a5. O ponto indica o status do evento de email. Sem fundo, sem borda, fica em linha dentro de uma janela de código escura.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-void-black: #000000;
  --color-graphite-hairline: #292d30;
  --color-white: #ffffff;
  --color-bone-white: #f0f0f0;
  --color-ash-gray: #a1a4a5;
  --color-smoke-gray: #abafb4;
  --color-iron: #6e727a;
  --color-charcoal: #464a4d;
  --color-iris-violet: #9281f7;
  --gradient-iris-violet: linear-gradient(to right bottom in oklab, rgb(146, 129, 247) 0%, rgb(154, 84, 220) 100%);
  --color-iris-violet-glow: #baa7ff;
  --color-signal-blue: #3b9eff;
  --color-sky-blue: #70b8ff;
  --color-pulse-green: #3ad389;
  --color-alarm-red: #ff9592;
  --color-crimson: #ff6465;
  --color-amber: #ffca16;
  --color-amber-glow: #ffd60a;
  --color-surface-gradient: #0b0e14;
  --gradient-surface-gradient: linear-gradient(rgb(27, 27, 27), rgb(3, 3, 3));

  /* Typography - Font Families */
  --font-sans-corpo: 'Sans Corpo', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serifada-display: 'Serifada Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-grotesca-secao: 'Grotesca Secao', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono-commit: 'Mono Commit', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-helvetica: 'Helvetica', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-apple-system: '-apple-system', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.5;
  --text-heading: 56px;
  --leading-heading: 1.2;
  --tracking-heading: -2.8px;
  --text-heading-lg: 77px;
  --leading-heading-lg: 1;
  --tracking-heading-lg: -0.77px;
  --text-display: 96px;
  --leading-display: 1;
  --tracking-display: -0.96px;

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
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-96: 96px;
  --spacing-104: 104px;
  --spacing-144: 144px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 96px;
  --card-padding: 32px;
  --element-gap: 16px;

  /* Border Radius */
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;

  /* Named Radii */
  --radius-cards: 16px;
  --radius-badges: 6px;
  --radius-inputs: 6px;
  --radius-buttons: 6px;
  --radius-large-panels: 24px;

  /* Shadows */
  --shadow-subtle: rgba(176, 199, 217, 0.145) 0px 0px 0px 1px;
  --shadow-subtle-2: rgb(0, 0, 0) 0px 0px 0px 8px;
  --shadow-subtle-3: rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px;

  /* Surfaces */
  --surface-void: #000000;
  --surface-graphite: #292d30;
  --surface-surface-lift: #0b0e14;
  --surface-backdrop-blur: #000000f2;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-void-black: #000000;
  --color-graphite-hairline: #292d30;
  --color-white: #ffffff;
  --color-bone-white: #f0f0f0;
  --color-ash-gray: #a1a4a5;
  --color-smoke-gray: #abafb4;
  --color-iron: #6e727a;
  --color-charcoal: #464a4d;
  --color-iris-violet: #9281f7;
  --color-iris-violet-glow: #baa7ff;
  --color-signal-blue: #3b9eff;
  --color-sky-blue: #70b8ff;
  --color-pulse-green: #3ad389;
  --color-alarm-red: #ff9592;
  --color-crimson: #ff6465;
  --color-amber: #ffca16;
  --color-amber-glow: #ffd60a;
  --color-surface-gradient: #0b0e14;

  /* Typography */
  --font-sans-corpo: 'Sans Corpo', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serifada-display: 'Serifada Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-grotesca-secao: 'Grotesca Secao', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono-commit: 'Mono Commit', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-helvetica: 'Helvetica', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-apple-system: '-apple-system', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.5;
  --text-heading: 56px;
  --leading-heading: 1.2;
  --tracking-heading: -2.8px;
  --text-heading-lg: 77px;
  --leading-heading-lg: 1;
  --tracking-heading-lg: -0.77px;
  --text-display: 96px;
  --leading-display: 1;
  --tracking-display: -0.96px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-96: 96px;
  --spacing-104: 104px;
  --spacing-144: 144px;

  /* Border Radius */
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;

  /* Shadows */
  --shadow-subtle: rgba(176, 199, 217, 0.145) 0px 0px 0px 1px;
  --shadow-subtle-2: rgb(0, 0, 0) 0px 0px 0px 8px;
  --shadow-subtle-3: rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px;
}
```
