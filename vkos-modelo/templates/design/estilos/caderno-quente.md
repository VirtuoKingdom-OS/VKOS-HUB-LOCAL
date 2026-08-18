# Caderno quente
> caderno de papel morno sob luz de tarde

**Tema:** claro

O sistema lembra um caderno de papel bem usado sob luz de tarde: uma tela off-white morna (#f6f5f4) que parece tátil, não clínica, tipografia sans generosa que dá peso editorial ao texto de produto, e cor usada como pontuação escassa: pílulas cor de pêssego destacam verbos, um único azul ancora a ação primária, e um elenco rotativo de tons de destaque (coral, âmbar, céu, meia-noite) pinta os fundos dos cards de recurso como post-its. Os cards ficam sobre a tela com bordas finas de 1px e cantos de 12px, sem sombra, sem chrome, como seções pautadas de um bloco de notas. O movimento é lúdico e elástico, com transições de 200ms em ease e animações saltitantes nas marcas de personagem que fazem a interface parecer viva sem nunca virar decoração.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Azul Primário | `#0075de` | `--color-azul-primario` | Preenchimento do CTA primário, destaque de nav ativo, botões de ação preenchidos: o único compromisso cromático num sistema quase monocromático, saturado o bastante para se ler como um interruptor |
| Calor de Papel | `#f6f5f4` | `--color-paper-warmth` | Tela da página, fundo do hero, fundos de seção: o off-white morno dá ao sistema seu clima tátil, analógico |
| Branco Puro | `#ffffff` | `--color-pure-white` | Superfícies de card, painéis elevados, fundo do mural de logos, texto de contraste em cards escuros |
| Preto Tinta | `#000000` | `--color-ink-black` | Texto primário, links de nav, títulos: aplicado em alfas variados (100%, 95%, 90%, 60%, 40%, 20%) para construir hierarquia sem novas cores |
| Grafite | `#111111` | `--color-charcoal` | Variante de texto escuro para momentos específicos de UI onde o preto puro seria pesado demais |
| Pedra | `#757575` | `--color-stone` | Texto secundário de nav, texto de apoio discreto, rótulo de botão desativado: o alfa de 60% da tinta |
| Grafite Morno | `#615d59` | `--color-graphite` | Texto de corpo com matiz morno: o cinza com tom de marrom que harmoniza com a tela quente |
| Ardósia | `#696969` | `--color-slate` | Texto de corpo dentro de card, conteúdo secundário dentro de cards, um pouco mais claro que Pedra |
| Toque de Céu | `#e6f3fe` | `--color-sky-tint` | Fundo do CTA fantasma, lavagem azul suave para ações secundárias, estados de hover tingidos |
| Marigold | `#ffb110` | `--color-marigold` | Destaques de pílula no hero, fundo de card de recurso, acento morno para chamadas, a primeira cor que o olho encontra |
| Coral | `#f64932` | `--color-coral` | Fundos de card decorativo, alternativas de pílula no hero, acento entre morno e quente no elenco rotativo |
| Saffron | `#e89d01` | `--color-saffron` | Painéis de acento de seção de corpo, amarelo morno secundário para lavagens de fundo |
| Vermillion | `#e32d14` | `--color-vermillion` | Coral profundo para fundos saturados de seção de corpo, acento sinalizador quente |
| Mocha | `#b18164` | `--color-mocha` | Acento marrom morno para painéis de seção de corpo: o membro terroso do elenco de acentos |
| Azul Sinal | `#097fe8` | `--color-signal-blue` | Fundos de card decorativo, destaques decorativos do hero, azul secundário para variedade visual |
| Lavagem de Céu | `#62aef0` | `--color-sky-wash` | O azul mais claro do elenco: fundos decorativos, destaques de acento em título, lavagens leves |
| Tinta Meia-Noite | `#02093a` | `--color-midnight-ink` | Lavagem violeta para fundos de destaque, faixas decorativas e ênfase suave atrás do conteúdo |

## Tokens de tipografia

### Sans principal, geométrica humanista com leves excentricidades, aplicada em 400 para corpo, 500 para nav/UI, 600 a 700 para títulos de destaque. A escala tipográfica usa tracking negativo agressivo em tamanhos grandes (-4.6px em 96px, -2px em 72px) que aperta o título para parecer confiante e compacto em vez de arejado. `--font-sans-principal`
- **Substituto:** Inter
- **Pesos:** 400, 500, 600, 700
- **Tamanhos:** 12px, 14px, 16px, 20px, 22px, 24px, 40px, 42px, 48px, 54px, 72px, 96px
- **Altura de linha:** 0.83, 1.00, 1.04, 1.14, 1.21, 1.27, 1.33, 1.40, 1.43, 1.50
- **Tracking:** -0.048em em 96px, -0.036em em 42px, -0.035em em 54px, -0.028em em 72px, -0.011em em 22px, +0.01em em 12px, normal nos tamanhos de corpo
- **Recursos OpenType:** `"lnum", "locl" 0`
- **Papel:** Sans principal, geométrica humanista com leves excentricidades, aplicada em 400 para corpo, 500 para nav/UI, 600 a 700 para títulos de destaque. A escala tipográfica usa tracking negativo agressivo em tamanhos grandes (-4.6px em 96px, -2px em 72px) que aperta o título para parecer confiante e compacto em vez de arejado.

### Lyon Text, serif editorial reservada a momentos específicos de texto de corpo e aberturas de seção, usada com moderação (4 ocorrências) para dar voz um peso literário, como uma citação de destaque em layout de revista. Funciona como acento do sistema, não como hierarquia paralela. `--font-lyon-text`
- **Substituto:** Source Serif Pro
- **Pesos:** 400
- **Tamanhos:** 18px, 32px
- **Altura de linha:** 1.25, 1.56
- **Papel:** Serif editorial reservada a momentos específicos de texto de corpo e aberturas de seção, usada com moderação (4 ocorrências) para dar voz um peso literário, como uma citação de destaque em layout de revista. Funciona como acento do sistema, não como hierarquia paralela.

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.33 | 0.12px | `--text-caption` |
| body-sm | 14px | 1.43 | - | `--text-body-sm` |
| body | 16px | 1.5 | - | `--text-body` |
| subheading | 20px | 1 | - | `--text-subheading` |
| heading-sm | 22px | 1.27 | -0.242px | `--text-heading-sm` |
| heading | 40px | 1.5 | - | `--text-heading` |
| heading-lg | 48px | 1.5 | - | `--text-heading-lg` |
| display-sm | 54px | 1.04 | -1.89px | `--text-display-sm` |
| display | 72px | 1.21 | -2.016px | `--text-display` |
| display-lg | 96px | 1.04 | -4.608px | `--text-display-lg` |

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
| 36 | 36px | `--spacing-36` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 12px |
| pílulas | 9999px |
| pequeno | 4px |
| botões | 8px |

### Layout

- **Largura máxima:** 1440px
- **Gap de seção:** 80px
- **Padding de card:** 24px
- **Gap de elemento:** 8px

## Componentes

### Botão CTA Primário
**Papel:** Botão de ação azul preenchido para o objetivo principal de conversão

Fundo #0075de, texto #ffffff em 14px peso 500 da sans principal, border-radius 8px, padding 6px 15px. O único botão preenchido cromático do sistema: toda outra ação recorre a estilos fantasma ou de texto.

### Botão CTA Fantasma
**Papel:** Ação secundária com tingimento azul sutil

Fundo #e6f3fe (toque de céu), texto #0075de em 14px peso 500, border-radius 8px, padding 6px 15px. Fica ao lado do CTA primário como a alternativa de menor compromisso.

### Botão de Texto Fantasma
**Papel:** Botão de ação mínimo sem preenchimento ou borda

Fundo transparente, texto #000000 em 95% de alfa, border-radius 8px, padding 6px 15px. Padrão para ações terciárias no hero e nos cards de recurso.

### Botão de Texto Contornado
**Papel:** Botão com borda e sem preenchimento para ações de prioridade média

Fundo transparente, texto #000000 em 90% de alfa, borda de 1px na mesma cor, border-radius 4px, padding 5px 10px. Usado para ações compactas inline como links de ver tudo.

### Link de Nav Discreto
**Papel:** Item de navegação de baixa ênfase

Fundo transparente, texto #000000 em 54% de alfa, border-radius 8px, padding 12px 16px. Estado padrão de item de nav: o texto escurece para alfa total no hover, nunca ganha sublinhado.

### Pílula de Tag
**Papel:** Rótulo de categoria ou indicador de status

Fundo com preenchimento colorido (variável), texto #000000 ou #ffffff, border-radius 9999px, padding 4px 12px. Usada para rótulos de status como 'Em andamento', 'A fazer', 'Concluído' em mockups de produto.

### Card de Recurso Branco
**Papel:** Card de conteúdo padrão sobre a tela quente

Fundo #ffffff, border-radius 12px, padding 24px, borda de 1px sólida em rgba(0,0,0,0.08), sem sombra. O card padrão: fica sobre a tela quente como um post-it.

### Card de Recurso com Acento
**Papel:** Card colorido de sangria total para blocos de recurso

Fundo com um dos tons de acento (#ffb110, #f64932, #62aef0, #e6f3fe, etc.), border-radius 12px, padding 24px, sem borda. Funciona como um painel colorido que pinta a tela: o texto dentro usa #000000 ou #ffffff dependendo do contraste.

### Card de Recurso Escuro
**Papel:** Card invertido para momentos de contraste escuro sobre claro

Fundo #02093a (meia-noite), texto #ffffff, border-radius 12px, padding 24px. O sistema usa isso com moderação como uma 'ilha modo escuro' na página clara, não como um tema escuro completo.

### Pílula de Destaque no Hero
**Papel:** Pílula colorida posicionada atrás de um verbo no texto do hero

Fundo em cor de acento (pêssego #f6d5b8, amarelo #ffb110, ou coral #f64932), texto #000000, border-radius 9999px, padding 8px 24px. O recurso tipográfico de assinatura: envolve uma única palavra numa frase para atrair o olhar e dar peso a ela.

### Marca de Personagem Avatar
**Papel:** Personagem ilustrado decorativo dentro de um círculo

Círculo de 40 a 48px com borda colorida de 2px (azul, vermelho, amarelo), ilustração flat dentro, fundo branco. Usado em arranjos de hero e espalhado como marca decorativa junto de rabiscos e brilhos.

### Card de Tarefa Kanban
**Papel:** Item de tarefa de UI de produto dentro do mockup de produto embutido

Fundo #ffffff, border-radius 8px, padding 8px 12px, borda de 1px em rgba(0,0,0,0.08), texto de status pequeno e emoji. Reproduz a estética de cartão de tarefa da interface do produto dentro do screenshot de marketing.

### Título de Seção
**Papel:** Título grande que abre uma nova seção de conteúdo

Sans principal peso 500 a 700, 48 a 54px, altura de linha 1.04 a 1.5, tracking -1.89 a -2.016px. Cor #000000. Seguido opcionalmente por um subtítulo em Lyon Text a 18px para voz editorial.

### Item do Mural de Logos
**Papel:** Logo de parceiro ou cliente em escala de cinza

Logo SVG em proporção nativa, cor dessaturada para quase preto (#000000 em 60% de alfa), sem bordas ou fundos individuais. Grade centralizada com espaçamento generoso: os logos são tratados como tipografia, não como imagem.

## Faça e não faça

### Faça
- Use #f6f5f4 como tela da página e #ffffff para superfícies de card: nunca inverta essa hierarquia colocando um card quente sobre uma página branca
- Reserve #0075de para a única ação primária por tela; todas as ações secundárias devem usar fantasma (fundo #e6f3fe) ou estilos de texto
- Aplique tracking negativo a todos os tamanhos de destaque: -4.6px em 96px, -2px em 72px, -1.9px em 54px. O texto de corpo fica em tracking normal
- Use bordas sólidas de 1px em rgba(0,0,0,0.08) em vez de sombras para separar cards da tela
- Use border-radius de 12px para cards e 8px para botões; reserve 9999px só para pílulas e pílulas de destaque no hero
- Pinte os fundos de bloco de recurso com tons de acento (#ffb110, #f64932, #62aef0, #02093a) em vez de adicionar bordas ou sombras para criar variedade visual
- Mantenha o movimento em 200ms com timing ease para hovers e transições; reserve animações de mola/salto para marcas de personagem e elementos do hero

### Não faça
- Não use #ffffff puro como fundo da página: a tela morna #f6f5f4 é o calor de assinatura do sistema
- Não adicione sombras a cards de conteúdo: o sistema usa apenas bordas finas, sombras aparecem só no mockup de UI de produto e na barra de nav
- Não use múltiplas cores cromáticas de botão na mesma tela: #0075de é o único botão preenchido; a variedade de cor pertence aos fundos de card
- Não use #000000 em 100% para todo o texto: construa hierarquia através do alfa (100%, 95%, 60%, 40%) na mesma cor
- Não use Lyon Text para rótulos de UI ou navegação: ela é reservada para momentos de texto editorial a 18px
- Não aplique border-radius maior que 12px em conteúdo retangular: pílulas (9999px) e cards (12px) são as duas formas
- Não use gradientes: o sistema é estritamente de preenchimento flat; a profundidade visual vem do contraste entre superfície quente e branca e dos fundos de card de acento

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Tela da Página | `#f6f5f4` | Base off-white morna para a página inteira: o clima de papel analógico começa aqui |
| 1 | Superfície de Card | `#ffffff` | Cards brancos sobre a tela quente: o branco puro é reservado para superfícies que precisam se ler como 'acima da página' |
| 2 | Superfície de Card com Acento | `#ffb110` | Fundos de card coloridos (amarelo, coral, azul, meia-noite): blocos de recurso pintam a tela com preenchimentos de matiz única |
| 3 | Superfície de Card Escuro | `#02093a` | Painéis azul-marinho profundos para blocos de recurso estilo modo escuro: inverte a pilha de superfície com texto branco sobre meia-noite |

## Elevação

- **Nav (fixa):** `0px 0.7px 1.462px 0px rgb(0% 0% 0%/0.015), 0px 3px 9px 0px rgb(0% 0% 0%/0.03)`
- **Mockup de UI de Produto:** `0px 4px 12px rgba(0, 0, 0, 0.1)`

## Imagem

Ilustração em primeiro plano, sem fotografia. A linguagem visual é construída a partir de marcas de personagem ilustradas flat (rostos redondos em círculos coloridos de 2px), elementos decorativos abstratos (rabiscos desenhados à mão, brilhos, setas, formas de flor) e mockups de UI de produto. As marcas de personagem aparecem no hero como uma fileira horizontal de 7 avatares e se espalham pela página como pontuação lúdica. Os screenshots de produto são os únicos visuais 'reais': mostram a interface do produto (quadros kanban, visões de documento, painéis de agente de IA) com chrome completo e dados reais. O mockup de produto no hero é grande, centralizado, e projeta uma única sombra para se separar da tela. Não há fotos de estilo de vida, imagem de banco de imagens, nem renders 3D abstratos.

## Layout

Centralizado, contido em largura máxima de aproximadamente 1440px. O hero é uma pilha centralizada: fileira de marcas de personagem, título grande de duas linhas com uma pílula colorida embutida, subtítulo, fileira de dois botões de CTA, mockup grande de UI de produto. Abaixo do hero, as seções alternam entre grades de card branco e painéis de acento coloridos de sangria total. O mural de logos é uma grade centralizada de uma linha só com logos de parceiro em escala de cinza. Os blocos de recurso usam layout de 2 colunas (texto à esquerda, painel colorido à direita) que alterna esquerda-direita entre seções. A seção de assistentes sob demanda usa uma grade de card 2x2 onde o card do topo é de largura total e a linha de baixo se divide em duas colunas iguais. Os gaps de seção são generosos (cerca de 80px) criando um ritmo vertical calmo. A navegação é uma barra fixa no topo com 64px de altura, itens de nav centralizados e botões de ação alinhados à direita.

## Guia de aplicação

## Referência rápida de cor
- texto: #000000 (construa hierarquia através do alfa: 100% / 95% / 60% / 40%)
- fundo: #f6f5f4 (tela off-white morna)
- superfície de card: #ffffff
- borda: rgba(0, 0, 0, 0.08)
- ação primária: #0075de (ação preenchida)
- acento: #ffb110, #f64932, #62aef0, #02093a (revezar entre esses para fundos de card)

## Exemplos de componente

1. **Título de hero com pílula de destaque**: Renderize um hero centralizado sobre #f6f5f4. Título: 'Onde equipes e agentes criam juntos.' em 72px peso 500 da sans principal, #000000, altura de linha 1.21, tracking -2.016px. Envolva a palavra 'criam' numa pílula: fundo #f6d5b8, texto #000000, border-radius 9999px, padding 8px 24px, inline dentro da frase. Subtítulo abaixo em 18px Lyon Text peso 400, #615d59, altura de linha 1.56.

2. **Card de recurso branco**: Crie um card sobre a tela quente. Fundo #ffffff, border-radius 12px, padding 24px, borda sólida de 1px rgba(0,0,0,0.08). Sem sombra. Título em 22px peso 700 da sans principal, #000000, tracking -0.242px. Corpo em 16px peso 400, #615d59, altura de linha 1.5.

3. **Bloco de recurso com acento**: Crie um painel colorido de sangria total. Fundo #ffb110, border-radius 12px, padding 24px. Título em 40px peso 400 da sans principal, #000000, altura de linha 1.5. Um screenshot de UI de produto fica dentro com uma sombra em 0px 4px 12px rgba(0,0,0,0.1) para criar profundidade contra o fundo colorido.

4. Crie um Botão de Ação Primária: fundo #0075de, texto #ffffff, raio 9999px, padding compacto de pílula. Use esse tratamento preenchido para o CTA principal.

5. **Card de tarefa Kanban (mockup de produto)**: Crie um card de tarefa dentro de um screenshot de produto. Fundo #ffffff, border-radius 8px, padding 8px 12px, borda sólida de 1px rgba(0,0,0,0.08). Texto da tarefa em 14px peso 500 da sans principal, #000000. Pílula de status opcional acima: fundo com preenchimento colorido, texto #ffffff, border-radius 9999px, padding 2px 8px, fonte 12px.

## Marcas decorativas

Marcas de personagem (rostos ilustrados flat em círculos coloridos de 2px) e elementos decorativos abstratos (rabiscos, brilhos, setas, formas de flor) são usados como pontuação visual, não como ilustrações com conteúdo próprio. Eles se aglomeram perto do texto do hero, se espalham perto dos cards de recurso e animam ao rolar a página. As cores das bordas dos círculos revezam entre a paleta de acento: #097fe8 (azul), #f64932 (coral), #ffb110 (amarelo), #62aef0 (céu). As marcas são círculos de 40 a 48px com ilustrações de cor flat dentro, sempre sobre preenchimento branco. Elas nunca carregam informação nem levam a conteúdo: existem puramente para deixar a interface viva e artesanal.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-azul-primario: #0075de;
  --color-paper-warmth: #f6f5f4;
  --color-pure-white: #ffffff;
  --color-ink-black: #000000;
  --color-charcoal: #111111;
  --color-stone: #757575;
  --color-graphite: #615d59;
  --color-slate: #696969;
  --color-sky-tint: #e6f3fe;
  --color-marigold: #ffb110;
  --color-coral: #f64932;
  --color-saffron: #e89d01;
  --color-vermillion: #e32d14;
  --color-mocha: #b18164;
  --color-signal-blue: #097fe8;
  --color-sky-wash: #62aef0;
  --color-midnight-ink: #02093a;

  /* Typography - Font Families */
  --font-sans-principal: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-lyon-text: 'Lyon Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --tracking-caption: 0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 22px;
  --leading-heading-sm: 1.27;
  --tracking-heading-sm: -0.242px;
  --text-heading: 40px;
  --leading-heading: 1.5;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1.5;
  --text-display-sm: 54px;
  --leading-display-sm: 1.04;
  --tracking-display-sm: -1.89px;
  --text-display: 72px;
  --leading-display: 1.21;
  --tracking-display: -2.016px;
  --text-display-lg: 96px;
  --leading-display-lg: 1.04;
  --tracking-display-lg: -4.608px;

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
  --spacing-36: 36px;
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Layout */
  --page-max-width: 1440px;
  --section-gap: 80px;
  --card-padding: 24px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-cards: 12px;
  --radius-pills: 9999px;
  --radius-small: 4px;
  --radius-buttons: 8px;

  /* Surfaces */
  --surface-page-canvas: #f6f5f4;
  --surface-card-surface: #ffffff;
  --surface-accent-card-surface: #ffb110;
  --surface-dark-card-surface: #02093a;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-azul-primario: #0075de;
  --color-paper-warmth: #f6f5f4;
  --color-pure-white: #ffffff;
  --color-ink-black: #000000;
  --color-charcoal: #111111;
  --color-stone: #757575;
  --color-graphite: #615d59;
  --color-slate: #696969;
  --color-sky-tint: #e6f3fe;
  --color-marigold: #ffb110;
  --color-coral: #f64932;
  --color-saffron: #e89d01;
  --color-vermillion: #e32d14;
  --color-mocha: #b18164;
  --color-signal-blue: #097fe8;
  --color-sky-wash: #62aef0;
  --color-midnight-ink: #02093a;

  /* Typography */
  --font-sans-principal: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-lyon-text: 'Lyon Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --tracking-caption: 0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 22px;
  --leading-heading-sm: 1.27;
  --tracking-heading-sm: -0.242px;
  --text-heading: 40px;
  --leading-heading: 1.5;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1.5;
  --text-display-sm: 54px;
  --leading-display-sm: 1.04;
  --tracking-display-sm: -1.89px;
  --text-display: 72px;
  --leading-display: 1.21;
  --tracking-display: -2.016px;
  --text-display-lg: 96px;
  --leading-display-lg: 1.04;
  --tracking-display-lg: -4.608px;

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
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```
