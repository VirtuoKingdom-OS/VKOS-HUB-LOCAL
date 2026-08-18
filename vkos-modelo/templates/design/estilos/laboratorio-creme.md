# Laboratório creme
> laboratório de creme quente com uma pílula preta

**Tema:** claro

A interface roda um sistema editorial quase monocromático e contido sobre um canvas branco quente. O tipo lidera a hierarquia visual: títulos de display superdimensionados com altura de linha próxima de 100% e tracking negativo apertado ficam acima de um respiro generoso, enquanto uma mono técnica pontua a interface com fragmentos de terminal/código. A interação definidora é um botão único preenchido em preto puro, formato pílula; tudo o mais é fantasma, contornado ou tonal de superfície. Os cards são planos, sem borda, e em creme quente (#f9f8f6); a profundidade vem de um único anel fino em vez de pilhas de sombra. A cor é racionada: uma página branco-quente, cards em creme, tinta quase preta, e o destaque vívido ocasional (pílula de novidade, pontos de terminal estilo semáforo, orbes de gradiente) que ganha atenção justamente porque o resto da página se recusa a chamar atenção.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|-------|
| Jet Ink | `#0a0a0a` | `--color-jet-ink` | Texto primário, botões de CTA preenchidos, marca do logotipo: quase preto ancora a hierarquia sem a aspereza do preto puro |
| Charcoal | `#151515` | `--color-charcoal` | Superfície escura de bloco de código atrás de demos de terminal (usado onde o preto parece duro demais contra o branco quente) |
| Fog | `#858585` | `--color-fog` | Texto secundário, traços de ícone, itens de nav inativos: o cinza mais usado; carrega a maior parte do corpo e do texto de link |
| Pewter | `#9d9d9d` | `--color-pewter` | Texto terciário, rótulos de metadado, preenchimentos decorativos: mais suave que Fog pra texto utilitário apagado |
| Steel | `#545454` | `--color-steel` | Texto de corpo de peso médio onde Fog lê apagado demais (estatísticas em linha, linhas de especificação) |
| Dove | `#d5d9e2` | `--color-dove` | Bordas finas, anéis de input, contornos de foco de botão: a única cor de borda do sistema |
| Cream | `#f9f8f6` | `--color-cream` | Superfícies de card, painéis secundários, fundos de tag: branco quente apagado que distingue camadas sobrepostas da página pura branca |
| Paper | `#ffffff` | `--color-paper` | Fundo de página, texto de botão em CTAs preenchidos, primeiro plano de ícone em superfícies escuras |
| Sand | `#f2ede5` | `--color-sand` | Fundos de lavagem quente, zonas de destaque sutis, tingimentos de seção |
| Slate | `#3b3b3b` | `--color-slate` | Variante de título apagada pra títulos secundários e rótulos de seção |
| Ember | `#ff5f57` | `--color-ember` | Ponto de semáforo de terminal (vermelho): destaque decorativo só dentro de mockups de bloco de código |
| Sunbeam | `#ffbd2e` | `--color-sunbeam` | Ponto de semáforo de terminal (amarelo), e fundo da pílula de novidade: o único destaque quente que sinaliza novidade |
| Sprout | `#28c840` | `--color-sprout` | Ponto de semáforo de terminal (verde): destaque decorativo só dentro de mockups de bloco de código |

## Tokens de tipografia

### Sans universal. Fonte primária de UI: usada em nav, corpo, botões, cards, rótulos e links em linha. A escala de peso duplo (400 pro texto, 500 pra ênfase) é a única ferramenta de hierarquia pro texto corrido. O tracking negativo em tamanhos pequenos aperta os títulos sem comprimir a legibilidade. `--font-sans-universal`
- **Substituto:** Inter, system-ui
- **Pesos:** 400, 500
- **Tamanhos:** 10, 11, 12, 13, 14, 16, 18
- **Altura de linha:** 1.00–1.63
- **Tracking:** -0.025em no display, 0 no corpo
- **Papel:** Fonte primária de UI: usada em nav, corpo, botões, cards, rótulos e links em linha. A escala de peso duplo (400 pro texto, 500 pra ênfase) é a única ferramenta de hierarquia pro texto corrido. O tracking negativo em tamanhos pequenos aperta os títulos sem comprimir a legibilidade.

### Sans universal display. Face de display editorial só pra H1/H2, definida em altura de linha próxima de 100% (-1.8px a 72px) pra travar o tipo numa grade e criar os blocos de título confiantes e monolíticos. Peso 400 a 48–72px é a assinatura: os títulos sussurram em vez de gritar. `--font-sans-universal-display`
- **Substituto:** Söhne, GT America, Inter Display
- **Pesos:** 400, 500
- **Tamanhos:** 24, 30, 48, 60, 72
- **Altura de linha:** 1.00–1.33
- **Tracking:** -0.025em em toda a escala
- **Papel:** Face de display editorial só pra H1/H2, definida em altura de linha próxima de 100% (-1.8px a 72px) pra travar o tipo numa grade e criar os blocos de título confiantes e monolíticos. Peso 400 a 48–72px é a assinatura: os títulos sussurram em vez de gritar.

### Mono técnica. Monoespaçada técnica: mockups de terminal, trechos de código, rótulos de metadado, rótulos de aba (Python/TypeScript/cURL). Define o tom de engenharia de desenvolvedor; contrasta com a sans universal pra marcar voz técnica versus editorial. `--font-mono-tecnica`
- **Substituto:** Geist Mono, JetBrains Mono
- **Pesos:** 400, 700
- **Tamanhos:** 10, 11, 12, 13
- **Altura de linha:** 1.50–1.85
- **Tracking:** -0.01em
- **Papel:** Monoespaçada técnica: mockups de terminal, trechos de código, rótulos de metadado, rótulos de aba (Python/TypeScript/cURL). Define o tom de engenharia de desenvolvedor; contrasta com a sans universal pra marcar voz técnica versus editorial.

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 20 | -0.12px | `--text-caption` |
| body-sm | 14px | 20 | normal | `--text-body-sm` |
| body | 16px | 24 | normal | `--text-body` |
| heading-sm | 24px | 32 | -0.6px | `--text-heading-sm` |
| subheading | 30px | 36 | -0.75px | `--text-subheading` |
| heading | 48px | 48 | -1.2px | `--text-heading` |
| heading-lg | 60px | 60 | -1.5px | `--text-heading-lg` |
| display | 72px | 72 | -1.8px | `--text-display` |

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
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 96 | 96px | `--spacing-96` |
| 144 | 144px | `--spacing-144` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 16px |
| pills | 9999px |
| inputs | 6px |
| botões | 9999px |
| smallCards | 8px |

### Shadows

| Nome | Valor | Token |
|------|-------|-------|
| subtle | `rgba(10, 10, 10, 0.15) 0px 0px 0px 1px` | `--shadow-subtle` |
| xl | `rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1)...` | `--shadow-xl` |
| subtle-2 | `rgba(0, 0, 0, 0.06) 0px 0px 0px 1px, rgba(15, 23, 42, 0.1...` | `--shadow-subtle-2` |

### Layout

- **Largura máxima:** 1200px
- **Gap de seção:** 80px
- **Padding de card:** 40px
- **Gap de elemento:** 12px

## Componentes

### Botão primário preenchido
**Papel:** Chamada de ação principal

Fundo #0a0a0a, texto #ffffff, raio 9999px, padding 12px 20px, fonte 14px/20 sans universal peso 500. Usado pra "Obter acesso à API", "Começar a construir", "Testar grátis". O único elemento de alto contraste na página; sem borda, sem sombra.

### Botão secundário fantasma
**Papel:** Ação terciária

Fundo transparente, texto #0a0a0a, raio 9999px, padding 12px 20px, fonte 14px/20 sans universal peso 500. Fica diretamente ao lado de um botão primário preenchido como alternativa suave. Sem borda visível por padrão; hover adiciona anel de 1px em #d5d9e2.

### Botão compacto de navegação
**Papel:** Utilitário da barra superior (Contatar vendas)

Fundo #ffffff, texto #0a0a0a, raio 9999px, padding 6px 12px, borda de 1px em #d5d9e2. Escala menor que os botões do herói; fica no cabeçalho fixo junto do botão primário preenchido.

### Pílula de novidade
**Papel:** Selo de lançamento de recurso

Fundo #f2ede5 (lavagem quente), texto #0a0a0a, raio 9999px, padding 2px 8px, fonte 12px sans universal peso 500. Usado em linha antes de um rótulo de recurso ("Novidade: Construtor de agente de voz"). A única pílula colorida do sistema.

### Card creme plano
**Papel:** Bloco de vitrine de produto (Chat, Voz, Construir, Imaginar)

Fundo #f9f8f6, raio 8–16px (assimétrico: o raio do mockup interno difere do raio do card), padding 0, sem sombra, sem borda. O card carrega um elemento de mídia (mockup de código, forma de onda de áudio, imagem) rente às bordas; o tom de superfície sozinho separa o card da página.

### Card de faixa de preço
**Papel:** Painel grande de comparação

Fundo #f9f8f6, raio 16px, padding 40px em todos os lados, sem sombra. Interior espaçoso com proporção generosa de título pra corpo. Usa sans universal peso 500 pro nome da faixa, peso 400 pras linhas de especificação.

### Bloco de código terminal
**Papel:** Mockup voltado pro desenvolvedor (demos de chat/código)

Fundo #151515, raio 12px, padding não padronizado, fonte mono técnica 12–13px. Pontos de semáforo (#ff5f57, #ffbd2e, #28c840) ficam no canto superior esquerdo a ~8px. O destaque de sintaxe usa uma paleta de código apagada (#032f62 chaves, #91c17a strings, #d73a49 erros): são internas ao mockup, não tokens do sistema.

### Pílula de aba de linguagem
**Papel:** Seletor de linguagem de trecho de código (Python/TypeScript/cURL)

Raio 9999px, padding 6px 12px, fonte 13px mono técnica. Estado ativo: fundo #0a0a0a, texto #ffffff. Inativo: fundo transparente, texto #858585. Fica abaixo dos mockups de bloco de código.

### Link de navegação
**Papel:** Item de menu de navegação superior

Fonte 14px/20 sans universal peso 500, texto #858585 por padrão para #0a0a0a no hover, sem sublinhado, sem fundo. Sublinhado aparece só no foco. Indicadores de dropdown (▾) desenhados com traço #858585.

### Card de notícia
**Papel:** Bloco de última notícia em grade de 4 colunas

Fundo transparente (herda a página), sem borda, sem raio, sem padding. Imagem no topo com raio padrão, depois metadado de data a 11px sans universal peso 400 #858585, depois título a 16px peso 500 #0a0a0a. A ausência de superfície de card é intencional: a notícia parece um índice, não uma galeria.

### Bloco de estatística de recurso
**Papel:** Métrica do herói (1M+ chamadas de API/dia, <200ms de latência mediana)

Número grande a 18px sans universal peso 400 #0a0a0a empilhado sobre rótulo de 11px #9d9d9d. Sem envoltório de card; fica em linha dentro de uma coluna de recurso.

### Linha de checklist
**Papel:** Linha de marcador de faixa de preço

Sans universal 14px/20 peso 400 #0a0a0a. Glifo de checagem à esquerda em traço #0a0a0a. Pilha vertical com gap de linha de 8px; sem divisores entre as linhas.

## Faça e não faça

### Faça
- Use #0a0a0a pro botão primário preenchido: nunca substitua por uma cor de CTA cromática; o sistema é intencionalmente monocromático
- Defina todos os títulos (24px+) com tracking de -0.025em e altura de linha 1.0–1.33; trave-os na grade de tipo em vez de centralizar visualmente
- Aplique raio 9999px em todo botão, tag e aba de linguagem; a pílula é a forma de assinatura do sistema
- Use #f9f8f6 pra qualquer superfície que fique acima da página; deixe o creme quente sozinho separar as camadas, evite sombras
- Recorra à mono técnica sempre que o conteúdo for técnico (código, terminal, abas, metadado); reserve a sans universal pro editorial e pra UI
- Mantenha a pílula de novidade só pra momentos de lançamento de recurso (fundo #f2ede5, 12px peso 500); não introduza outras pílulas de destaque
- Prefira botões fantasma/contornados pra qualquer ação que não seja a única conversão primária da página

### Não faça
- Não use cores cromáticas em botões ou links: a única cor saturada numa página deve ser uma única pílula de novidade ou um ponto de terminal
- Não empilhe sombras; o sistema usa um único anel fino (1px sólido #d5d9e2) como única pista de profundidade
- Não defina texto de corpo abaixo de 14px ou acima de 18px na tela; a escala de tipo salta de 18 para 24 para 30 para 48 pra preservar a hierarquia só pelo tamanho
- Não adicione cores de fundo a links de nav, cards de notícia ou itens de lista em linha; a página deve ler como espaço em branco silencioso
- Não use alturas de linha acima de 1.63 pro texto corrido; os títulos de display devem ficar em 1.0–1.33 pra manter o travamento editorial
- Não introduza novos raios; o sistema é binário: pílulas (9999px) ou cards creme (16px), sem arredondamento intermediário
- Não use preto puro (#000000); use sempre #0a0a0a; o leve ajuste mantém as superfícies escuras quentes e alinhadas à marca em vez de frias como um monitor CRT

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Paper | `#ffffff` | Fundo de página, canvas de modal, superfícies brancas em linha |
| 1 | Cream | `#f9f8f6` | Superfícies de card, painéis secundários, fundos de tag: a camada elevada dominante |
| 2 | Sand | `#f2ede5` | Lavagem quente pra zonas de destaque, pílula de novidade, tingimentos sutis de seção |
| 3 | Charcoal | `#151515` | Superfície invertida pra mockups de bloco de código, demos de terminal: aparece só dentro de ilustrações de produto |

## Elevação

- **Botão compacto de navegação, estado de foco do botão fantasma:** `0 0 0 1px rgba(10, 10, 10, 0.15)`
- **Cabeçalho fixo (ao rolar):** `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
- **Card creme elevado (preço, superfícies estilo modal):** `0 0 0 1px rgba(0, 0, 0, 0.06), 0 18px 40px -24px rgba(15, 23, 42, 0.18)`

## Imagem

A imagética é guiada por captura de tela de produto, não por estilo de vida. O herói e os blocos de recurso contêm capturas de produto em contexto: uma conversa de chat renderizada como mockup de UI, um editor de código com TypeScript com destaque de sintaxe, uma forma de onda de voz num card creme, um painel de trecho de código num fundo de gradiente quente. Todos os visuais de produto ficam dentro de contêineres creme planos sem cantos internos arredondados mascarando a mídia. O calor decorativo vem de grandes orbes de gradiente radial (pêssego/coral) que sangram atrás dos painéis de código: borrados a 64px, lêem como brilho ambiente em vez de imagem. Fotografia está ausente; o sistema é UI pura + ilustração + gradiente. Os ícones são baseados em traço, peso 1.5px, Fog (#858585) por padrão com Jet (#0a0a0a) no hover. Sem renders 3D, sem fotografia de banco de imagens, sem figuras humanas.

## Layout

O layout é centralizado com largura máxima (~1200px) sobre um canvas branco de sangria total, com ritmo vertical generoso (80px de gap de seção). O herói é primeiro-texto: uma pilha de título centralizada em branco com dois CTAs abaixo, seguida de uma linha de card de produto de 2 colunas (Chat / Código) em densidade confortável. Abaixo do herói, a página alterna pra blocos de recurso de coluna única (Uma API. Toda modalidade.) com divisões texto-esquerda e painel-de-código-direita, depois um índice de notícias de 4 colunas, depois uma faixa de preço/CTA de 2 colunas. A navegação é uma única barra superior fixa (64px) com logo + menu horizontal + dois botões de ação alinhados à direita. A página nunca usa barra lateral; a densidade de conteúdo fica baixa. Os cards são planos e sem borda: a superfície creme sozinha carrega o agrupamento. O cabeçalho fixo adota um blur de fundo (12px) e borda fina inferior ao rolar.

## Guia de aplicação

## Referência rápida de cor
- Texto: #0a0a0a (primário), #858585 (secundário), #9d9d9d (terciário), #3b3b3b (título apagado)
- Fundo: #ffffff (página), #f9f8f6 (card), #f2ede5 (lavagem quente), #151515 (mockup de código)
- Borda: #d5d9e2 (anel fino)
- Destaque: #ffbd2e (pílula de novidade, amarelo de terminal)
- Ação primária: #0a0a0a (ação preenchida)

## Exemplos de componente

1. Crie um botão de ação primária: fundo #0a0a0a, texto #ffffff, raio 9999px, padding compacto de pílula. Use esse tratamento preenchido pro CTA principal.

2. **Card de produto creme**: fundo #f9f8f6, raio 16px, padding 0 (mídia rente às bordas). A mídia interna é um mockup de terminal: fundo #151515, raio 12px, mono técnica 13px com pontos de semáforo (#ff5f57, #ffbd2e, #28c840) no canto superior esquerdo.

3. **Card de faixa de preço**: fundo #f9f8f6, raio 16px, padding 40px. Nome da faixa a 24px sans universal display peso 500, #0a0a0a. Linhas de especificação a 14px sans universal peso 400, #858585. Linhas de checagem: 14px peso 400 #0a0a0a com traço de checagem #0a0a0a à esquerda, gap de linha de 8px.

4. **Tira de aba de linguagem**: pílulas com raio 9999px, padding 6px 12px, mono técnica 13px. Ativa: fundo #0a0a0a, texto #ffffff. Inativa: fundo transparente, texto #858585. Fica logo abaixo de um mockup de bloco de código.

5. **Card de índice de notícia**: sem superfície, sem borda, sem raio. Imagem no topo (raio padrão), depois metadado de data a 11px sans universal peso 400 #858585, depois título a 16px peso 500 #0a0a0a. Fica numa grade de 4 colunas com gap de coluna de 24px.

## Sistema tipográfico editorial

A escolha de tipo definidora é o pareamento da sans universal display (peso 400, não 500 ou 700) em tamanhos de herói com altura de linha travada em ~1.0. Os títulos não são negrito: são grandes e contidos. O tracking negativo (-0.025em) os aperta sem comprimir as formas das letras, e a altura de linha de 1.0 faz o bloco virar uma laje tipográfica em vez de uma coluna de texto. Esse é o sistema antitítulo-em-negrito: autoridade pelo tamanho e pela contenção, não pelo peso. Em tamanhos menores a mesma família em peso 500 carrega ênfase; a mono técnica interrompe pra marcar território técnico. O sistema de três fontes (sans universal / sans universal display / mono técnica) é intencionalmente estreito: não há uma quarta voz.

## Vocabulário de orbe e gradiente

O calor decorativo vem de dois padrões de gradiente específicos, usados com moderação: (1) um orbe radial coral/pêssego (#ff8868 para transparente, ou #ffa888 para transparente) borrado a 64px que sangra atrás dos painéis de bloco de código, dando à superfície de desenvolvedor um brilho de pôr do sol sem se comprometer com uma cor de marca; (2) um espectro linear índigo→rosa→laranja→âmbar usado como uma única faixa de destaque atrás de logotipos ou barras de progresso. Esses são gradientes de atmosfera de página, nunca usados em botões, texto ou UI funcional. Trate-os como uma terceira camada de superfície: profundidade visual sem compromisso cromático.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-jet-ink: #0a0a0a;
  --color-charcoal: #151515;
  --color-fog: #858585;
  --color-pewter: #9d9d9d;
  --color-steel: #545454;
  --color-dove: #d5d9e2;
  --color-cream: #f9f8f6;
  --color-paper: #ffffff;
  --color-sand: #f2ede5;
  --color-slate: #3b3b3b;
  --color-ember: #ff5f57;
  --color-sunbeam: #ffbd2e;
  --color-sprout: #28c840;

  /* Typography - Font Families */
  --font-sans-universal: 'Sans Universal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sans-universal-display: 'Sans Universal Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono-tecnica: 'Mono Tecnica', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 20;
  --tracking-caption: -0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 20;
  --text-body: 16px;
  --leading-body: 24;
  --text-heading-sm: 24px;
  --leading-heading-sm: 32;
  --tracking-heading-sm: -0.6px;
  --text-subheading: 30px;
  --leading-subheading: 36;
  --tracking-subheading: -0.75px;
  --text-heading: 48px;
  --leading-heading: 48;
  --tracking-heading: -1.2px;
  --text-heading-lg: 60px;
  --leading-heading-lg: 60;
  --tracking-heading-lg: -1.5px;
  --text-display: 72px;
  --leading-display: 72;
  --tracking-display: -1.8px;

  /* Typography - Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-96: 96px;
  --spacing-144: 144px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 80px;
  --card-padding: 40px;
  --element-gap: 12px;

  /* Border Radius */
  --radius-sm: 3px;
  --radius-md: 6px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-cards: 16px;
  --radius-pills: 9999px;
  --radius-inputs: 6px;
  --radius-buttons: 9999px;
  --radius-smallcards: 8px;

  /* Shadows */
  --shadow-subtle: rgba(10, 10, 10, 0.15) 0px 0px 0px 1px;
  --shadow-xl: rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px;
  --shadow-subtle-2: rgba(0, 0, 0, 0.06) 0px 0px 0px 1px, rgba(15, 23, 42, 0.18) 0px 18px 40px -24px;

  /* Surfaces */
  --surface-paper: #ffffff;
  --surface-cream: #f9f8f6;
  --surface-sand: #f2ede5;
  --surface-charcoal: #151515;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-jet-ink: #0a0a0a;
  --color-charcoal: #151515;
  --color-fog: #858585;
  --color-pewter: #9d9d9d;
  --color-steel: #545454;
  --color-dove: #d5d9e2;
  --color-cream: #f9f8f6;
  --color-paper: #ffffff;
  --color-sand: #f2ede5;
  --color-slate: #3b3b3b;
  --color-ember: #ff5f57;
  --color-sunbeam: #ffbd2e;
  --color-sprout: #28c840;

  /* Typography */
  --font-sans-universal: 'Sans Universal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sans-universal-display: 'Sans Universal Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono-tecnica: 'Mono Tecnica', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 20;
  --tracking-caption: -0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 20;
  --text-body: 16px;
  --leading-body: 24;
  --text-heading-sm: 24px;
  --leading-heading-sm: 32;
  --tracking-heading-sm: -0.6px;
  --text-subheading: 30px;
  --leading-subheading: 36;
  --tracking-subheading: -0.75px;
  --text-heading: 48px;
  --leading-heading: 48;
  --tracking-heading: -1.2px;
  --text-heading-lg: 60px;
  --leading-heading-lg: 60;
  --tracking-heading-lg: -1.5px;
  --text-display: 72px;
  --leading-display: 72;
  --tracking-display: -1.8px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-96: 96px;
  --spacing-144: 144px;

  /* Border Radius */
  --radius-sm: 3px;
  --radius-md: 6px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-subtle: rgba(10, 10, 10, 0.15) 0px 0px 0px 1px;
  --shadow-xl: rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px;
  --shadow-subtle-2: rgba(0, 0, 0, 0.06) 0px 0px 0px 1px, rgba(15, 23, 42, 0.18) 0px 18px 40px -24px;
}
```
