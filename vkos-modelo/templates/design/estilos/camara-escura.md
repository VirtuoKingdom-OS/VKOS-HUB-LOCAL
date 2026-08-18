# Câmara escura
> editorial de produto em quarto escuro. Um único objeto flutuando na escuridão morna, tipografia creme como única decoração.

**Tema:** escuro

O sistema visual trata um único objeto de produto como uma peça de museu: tela escura morna de sangria total, tipografia creme flutuando em espaço negativo generoso, e zero chrome de UI competindo com a forma. Todo elemento de texto é maiúsculo em peso 500, com a única exceção do texto de corpo a 29px/400, que é a única voz conversacional do sistema. Um único laranja vívido aparece somente em créditos e no link do estúdio, nunca em botões ou CTAs, ganhando sua raridade. O layout alterna entre dois modos: hero fotográfico (o produto em contexto com ferramentas e materiais) e revelação em modo vazio (o produto isolado sobre o escuro morno), conectados por divisores tracejados finos e controles em formato de pílula.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Creme Morno | `#ffedd7` | `--color-warm-cream` | Texto claro sobre superfícies escuras, rótulos inversos e legendas de alto contraste |
| Sombra de Nogueira | `#100904` | `--color-walnut-shadow` | Tela da página e fundo mais profundo: quase preto morno, não preto puro. O vazio atrás de cada revelação de produto |
| Marrom Casca | `#382416` | `--color-bark-brown` | Superfície elevada e fundo de botão preenchido: o único passo cromático acima da tela, usado no único CTA sólido |
| Borda Cortiça | `#40372e` | `--color-cork-border` | Divisores finos, separadores tracejados de seção, bordas sutis de container: mais mornos que a tela por um passo |
| Madeira à Deriva | `#6c5f51` | `--color-driftwood` | Cinza morno de tom médio para divisores secundários e elementos estruturais discretos: a ponte entre Marrom Casca e Creme |
| Acento Brasa | `#dc5000` | `--color-ember-accent` | Acento laranja de texto para links, tags e frases curtas de ênfase |
| Preto Puro | `#000000` | `--color-pure-black` | Preenchimentos de ícone SVG e elementos vetoriais decorativos apenas: nunca usado como cor de fundo ou de texto |

## Tokens de tipografia

### Fonte display, a única tipografia do sistema. Peso 500 a 51px conduz os títulos de destaque com confiança maiúscula extrema; a mesma família em peso 400 a 29px vira a única voz de corpo em caixa mista do sistema. O tracking permanece normal, as formas geométricas fazem o trabalho sem precisar apertar. `--font-halyard-display-variable`
- **Substituto:** Inter ou Söhne
- **Pesos:** 400, 500
- **Tamanhos:** 8, 10, 12, 14, 15, 18, 24, 29, 41, 51px
- **Altura de linha:** 0.90 a 1.26
- **Tracking:** normal em todos os tamanhos, sem tracking negativo mesmo em escala de destaque, a geometria da fonte cuida do peso visual sem compressão
- **Recursos OpenType:** `"ss01" on`
- **Papel:** A única tipografia do sistema. Peso 500 a 51px conduz os títulos de destaque com confiança maiúscula extrema; a mesma família em peso 400 a 29px vira a única voz de corpo em caixa mista do sistema. O tracking permanece normal, as formas geométricas fazem o trabalho sem precisar apertar.

### Arial, fallback de sistema para rótulos micro-legais (créditos maiúsculos a 8px como "* ADOBE ILLUSTRATOR"). Não é uma escolha de design, é uma necessidade para avisos legais renderizados pelo sistema. `--font-arial`
- **Substituto:** system-ui
- **Pesos:** 400, 500
- **Tamanhos:** 8px
- **Altura de linha:** 1.20
- **Papel:** Fallback de sistema para rótulos micro-legais (créditos maiúsculos a 8px como "* ADOBE ILLUSTRATOR"). Não é uma escolha de design, é uma necessidade para avisos legais renderizados pelo sistema.

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| subheading | 18px | 1 | - | `--text-subheading` |
| heading-sm | 24px | 1.09 | - | `--text-heading-sm` |
| body | 29px | 1.26 | - | `--text-body` |
| heading | 41px | 0.9 | - | `--text-heading` |
| display | 51px | 0.9 | - | `--text-display` |

## Espaçamento e formas

**Densidade:** confortável

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 6 | 6px | `--spacing-6` |
| 8 | 8px | `--spacing-8` |
| 9 | 9px | `--spacing-9` |
| 10 | 10px | `--spacing-10` |
| 12 | 12px | `--spacing-12` |
| 14 | 14px | `--spacing-14` |
| 18 | 18px | `--spacing-18` |
| 24 | 24px | `--spacing-24` |
| 31 | 31px | `--spacing-31` |
| 41 | 41px | `--spacing-41` |
| 45 | 45px | `--spacing-45` |
| 68 | 68px | `--spacing-68` |
| 204 | 204px | `--spacing-204` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 12px |
| inputs | 0px |
| full-round | 9999px |
| buttons-pill | 36px |
| buttons-outlined | 22.5px |

### Layout

- **Padding de card:** 24px
- **Gap de elemento:** 18px

## Componentes

### Botão Pílula (Preenchido)
**Papel:** CTA sólido primário, usado uma única vez na página para o link do estúdio

Border-radius de 36px, fundo Marrom Casca (#382416), texto Creme Morno (#ffedd7), padding vertical/horizontal de 14px 24px, peso 500, maiúsculo, tamanho de 8 a 14px. A única superfície de ação preenchida do sistema: sua raridade é o sinal.

### Botão Fantasma Contornado
**Papel:** Ação secundária ou botão decorativo, borda creme sobre preenchimento transparente

Border-radius de 22.5px, fundo transparente, borda de 1px Creme Morno, texto Creme Morno, padding vertical de 7.5px, padding horizontal de 0px, peso 500, maiúsculo, 8 a 14px. A borda faz o trabalho, sem necessidade de preenchimento.

### Link de Texto Sublinhado
**Papel:** Links inline e itens de navegação, sem borda, apoiado no sublinhado

Raio de 0px, fundo transparente, texto Creme Morno, padding de 0px, peso 500, maiúsculo, 12 a 14px. A interação padrão: sem container, só texto com um indicador de sublinhado.

### Campo de Input (Somente Sublinhado)
**Papel:** Input de formulário minimalista, apenas borda inferior, sem contorno completo

Raio de 0px, fundo transparente, borda inferior de 1px Creme Morno, texto Creme Morno, padding de 1px 2px, padding direito de 36px para uma ação inline. O formulário espelha a contenção do botão fantasma: sem caixas, só uma linha.

### Navegação Superior Fixa
**Papel:** Navegação persistente do site, minimalista, 4 itens, micro-tipografia em maiúsculas

Wordmark do produto alinhado à esquerda em Creme Morno a 12 a 14px peso 500 maiúsculo. Itens de nav alinhados à direita: INTRO (com indicador de sublinhado tracejado para o ativo), FEATURES, PRODUCT, CONTACT, todos a 12px peso 500 maiúsculo, Creme Morno. Fundo transparente sobre a fotografia do hero.

### Rótulo de Barra Lateral Vertical
**Papel:** Marca de borda, texto vertical descendo pela margem direita

Texto rotacionado em 90 graus com o nome do produto e a identificação do modelo, em Creme Morno, 10 a 12px maiúsculo, encostado à direita. Funciona como um número de série de produto, um artefato de produto físico traduzido para a UI.

### Wordmark do Logo
**Papel:** Identificador de marca, a única marca gráfica

O nome do produto na fonte display peso 500 maiúsculo, chegando a 51px ou mais na escala de destaque com altura de linha de 0.9. Usado em dois tamanhos: composição de navegação (12 a 14px) e composição do hero (51px ou mais). Sem ícone, sem símbolo: identidade puramente tipográfica.

### Card de Informação Sobreposto ao Hero
**Papel:** Card de atribuição semitransparente no hero

Border-radius de 12px, preenchimento semitransparente em Creme Morno ou escuro com opacidade baixa, contém um título maiúsculo com o crédito do estúdio de design responsável, mais um divisor tracejado e texto de corpo. Sobrepõe a fotografia do hero no canto inferior esquerdo.

### Seção de Revelação de Produto
**Papel:** Seção de viewport completo em modo vazio, render 3D centralizado com texto nas laterais

Altura de 100vh, fundo Sombra de Nogueira (#100904), render 3D de produto centralizado, título alinhado à esquerda a 41px maiúsculo, texto de corpo alinhado à direita a 29px peso 400 em caixa mista. O padrão de layout de assinatura: três colunas, calhas generosas.

### Divisor de Seção (Linha Tracejada)
**Papel:** Separador visual entre blocos de conteúdo

Linha tracejada de 1px em Borda Cortiça (#40372e) ou Madeira à Deriva (#6c5f51). Usado com moderação entre blocos de texto, nunca como decoração, sempre carregando significado estrutural.

### Card de Miniatura de Vídeo
**Papel:** Prévia de vídeo embutida com indicador de play

Card retangular pequeno, raio de 12px, posicionado no canto inferior direito do hero. Contém um wordmark em miniatura do produto e um ícone de play. Funciona como um ponto de entrada secundário sem competir com o CTA primário.

### Texto Legal/Aviso
**Papel:** Micro-texto renderizado pelo sistema em Arial 8px

Fonte de fallback (Arial 8px peso 500 maiúsculo) para notas de rodapé como "* ADOBE ILLUSTRATOR". Visualmente subordinado: usa intencionalmente uma tipografia diferente para sinalizar que aquilo não é design, é conformidade.

## Faça e não faça

### Faça
- Defina todo texto de UI em #ffedd7 (Creme Morno), nunca use #fff puro; o tom morno é a assinatura do sistema.
- Use #dc5000 (Brasa) somente em linhas de crédito, no rótulo de autoria e no link do estúdio: um único acento ganha sua raridade pela contenção.
- Defina o texto em maiúsculo peso 500 em toda a interface; use peso 400 e caixa mista somente no texto de corpo de 29px que explica o produto.
- Use border-radius de 36px para o único CTA preenchido e 22.5px para botões fantasma contornados; 12px para cards; 0px para inputs e links inline: esses quatro valores são todo o vocabulário de raio.
- Defina os gaps de seção em 100vh; cada seção ganha seu próprio viewport completo, nunca comprima as revelações de produto em faixas.
- Use linhas tracejadas de 1px em #40372e para divisores de seção; evite divisores sólidos e evite qualquer divisor mais espesso que 2px.
- Centralize o render 3D do produto em toda seção de modo vazio, com texto nas laterais simetricamente à esquerda e à direita em calhas de 18px.

### Não faça
- Nunca use #fff puro para texto nem #000 para fundos: o creme morno e a sombra de nogueira são o sistema; a pureza soa errada aqui.
- Nunca aplique #dc5000 em botões, CTAs ou superfícies interativas: o laranja é só crédito editorial.
- Nunca use minúsculas ou caixa de frase em títulos, nav ou rótulos; o único texto em caixa mista é a descrição de corpo a 29px.
- Nunca adicione sombras projetadas a cards, botões ou seções: a profundidade vem da pilha de superfície de dois passos (#100904 a #382416), não de desfoque.
- Nunca use border-radius abaixo de 12px em containers: a geometria é deliberadamente robusta, não afiada.
- Nunca use mais de um botão preenchido por seção; contenção é a linguagem de design.
- Nunca centralize o texto de corpo: títulos e texto de corpo são sempre alinhados à esquerda, mesmo ladeando uma imagem centralizada.

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Sombra de Nogueira | `#100904` | Tela de página de sangria total e fundo de seção |
| 1 | Marrom Casca | `#382416` | Superfície de botão preenchido, o único sólido elevado |
| 2 | Borda Cortiça | `#40372` | Bordas finas, divisores tracejados, contornos de card |
| 3 | Creme Morno | `#ffedd7` | Texto de primeiro plano, navegação, bordas interativas |

## Elevação

O sistema rejeita elevação baseada em sombra por completo. A profundidade é obtida por uma pilha de superfície de dois passos: #100904 (tela) a #382416 (sólido elevado). Não há desfoque, deslocamento ou sombra baseada em opacidade: apenas um passo de luminância de 1 a 2 valores. Isso mantém a interface plana e editorial, deixando os renders 3D de produto fornecerem toda a profundidade visual nas seções em modo vazio.

## Imagem

A fotografia é editorial, vista de cima e em contexto: o objeto de cortiça fica sobre uma base de corte verde cercado por lápis, um estilete e um clipe de papel, ferramentas do ofício visíveis no enquadramento. A base de corte verde (#445231) é um elemento exclusivo do hero, não um token de UI. Os renders 3D dominam as seções de revelação de produto: o objeto de cortiça aparece isolado contra a Sombra de Nogueira, iluminado pela direita superior com uma luz de contorno morna, girando de vista de cima para ângulo de 3/4 entre seções. Sem fotografia de estilo de vida, sem pessoas, sem imagem de banco: o objeto é o protagonista e as ferramentas são seu contexto. As imagens têm sangria total, bordas nítidas (sem máscaras arredondadas), e tratamento de alto contraste com gradação morna.

## Layout

Sangria total ao longo de toda a página, sem container de largura máxima, cada seção ocupa 100vw. Hero: fotografia de viewport completo vista de cima com um wordmark enorme do produto (51px ou mais) no canto superior esquerdo, tagline acima, nav mínima fixa no canto superior direito, rótulo de barra lateral vertical descendo pela borda direita, card de informação semitransparente no canto inferior esquerdo, miniatura de vídeo no canto inferior direito. Seções seguintes: tela de viewport completo em Sombra de Nogueira com um render 3D de produto centralizado ladeado por título alinhado à esquerda e texto de corpo alinhado à direita, uma grade de três colunas (texto / objeto / texto) com calhas generosas de 18px. As transições de seção são contínuas em escuro sobre escuro; as únicas quebras são divisores tracejados finos. A navegação é fixa, transparente, com no máximo 4 itens. Sem barra lateral, sem chrome de rodapé, sem cards dentro de cards: cada tela é uma afirmação única.

## Voz tipográfica

O sistema tem exatamente dois modos tipográficos:

1. MAIÚSCULO PESO 500, o padrão para tudo: nav, títulos, rótulos, links, texto de botão, texto legal. A voz é declarativa, confiante, de etiqueta de museu. Os tamanhos vão de 8px (legal) a 51px (destaque). A altura de linha aperta conforme o tamanho cresce: 1.2 na legenda, 1.0 no corpo pequeno, 0.9 no destaque. Sem ajuste de tracking, a geometria da fonte já é apertada o bastante em qualquer escala.

2. CAIXA MISTA PESO 400, a exceção, usada somente a 29px no texto de corpo descritivo que explica o produto. Essa é a única voz conversacional do sistema, algo como uma frase que descreve como o objeto eleva, isola e firma nos momentos certos. A queda de peso e a troca de caixa são o sinal: quando o texto passa de 500/MAIÚSCULO para 400/misto, o usuário sabe que está lendo uma descrição, não um rótulo.

A assinatura de destaque: altura de linha de 0.9 nos tamanhos de destaque de 41 a 51px. Isso é incomumente apertado, a maioria dos sites editoriais usa 1.0 a 1.1. A 0.9, as letras maiúsculas se sobrepõem aos limites da altura de linha, criando um efeito de bloco escultural. O texto de destaque não se acomoda em linhas, ele se empilha como forma sólida.

## Guia de aplicação

## Referência rápida de cor
- texto: #ffedd7 (Creme Morno)
- fundo: #100904 (Sombra de Nogueira)
- superfície: #382416 (Marrom Casca)
- borda: #40372e (Borda Cortiça)
- acento: #dc5000 (Brasa)
- ação primária: sem cor de CTA distinta

## Exemplos de componente

1. **Composição do hero:** Tela Sombra de Nogueira (#100904) de sangria total. Wordmark do produto a 51px na fonte display peso 500 maiúsculo, altura de linha 0.9, cor #ffedd7, posicionado no canto superior esquerdo com margem de 24px. Tagline curta em maiúsculo a 12px peso 500 acima do wordmark, também #ffedd7.

Nenhuma cor de ação primária distinta foi observada; use os tratamentos de botão neutros extraídos em vez de inventar uma cor de CTA preenchida.

3. **Botão Fantasma Contornado:** Fundo transparente, borda de 1px Creme Morno (#ffedd7), border-radius de 22.5px, padding vertical de 7.5px, texto Creme Morno a 12px peso 500 maiúsculo. O vocabulário de ação secundária.

4. **Seção de Revelação de Produto:** Fundo Sombra de Nogueira (#100904) em viewport completo (100vh). Render 3D de produto centralizado ocupando os 40% médios da largura. Coluna esquerda: título a 41px peso 500 maiúsculo, altura de linha 0.9, #ffedd7, alinhado à esquerda. Coluna direita: texto de corpo a 29px peso 400 em caixa mista, altura de linha 1.26, #ffedd7, alinhado à esquerda dentro da coluna. Calha de 18px entre o objeto centralizado e cada coluna de texto.

5. **Navegação Superior:** Posição fixa, fundo transparente, largura total. Esquerda: wordmark do produto a 12px na fonte display peso 500 maiúsculo #ffedd7. Direita: quatro itens de nav (INTRO, FEATURES, PRODUCT, CONTACT) a 12px peso 500 maiúsculo #ffedd7, com um sublinhado tracejado de 1px #40372e sob o item ativo.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-warm-cream: #ffedd7;
  --color-walnut-shadow: #100904;
  --color-bark-brown: #382416;
  --color-cork-border: #40372e;
  --color-driftwood: #6c5f51;
  --color-ember-accent: #dc5000;
  --color-pure-black: #000000;

  /* Typography - Font Families */
  --font-halyard-display-variable: 'halyard-display-variable', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-arial: 'Arial', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-subheading: 18px;
  --leading-subheading: 1;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.09;
  --text-body: 29px;
  --leading-body: 1.26;
  --text-heading: 41px;
  --leading-heading: 0.9;
  --text-display: 51px;
  --leading-display: 0.9;

  /* Typography - Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;

  /* Spacing */
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-31: 31px;
  --spacing-41: 41px;
  --spacing-45: 45px;
  --spacing-68: 68px;
  --spacing-204: 204px;

  /* Layout */
  --card-padding: 24px;
  --element-gap: 18px;

  /* Border Radius */
  --radius-xl: 12px;
  --radius-2xl: 22.5px;
  --radius-3xl: 36px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-cards: 12px;
  --radius-inputs: 0px;
  --radius-full-round: 9999px;
  --radius-buttons-pill: 36px;
  --radius-buttons-outlined: 22.5px;

  /* Surfaces */
  --surface-walnut-shadow: #100904;
  --surface-bark-brown: #382416;
  --surface-cork-border: #40372;
  --surface-warm-cream: #ffedd7;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-warm-cream: #ffedd7;
  --color-walnut-shadow: #100904;
  --color-bark-brown: #382416;
  --color-cork-border: #40372e;
  --color-driftwood: #6c5f51;
  --color-ember-accent: #dc5000;
  --color-pure-black: #000000;

  /* Typography */
  --font-halyard-display-variable: 'halyard-display-variable', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-arial: 'Arial', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-subheading: 18px;
  --leading-subheading: 1;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.09;
  --text-body: 29px;
  --leading-body: 1.26;
  --text-heading: 41px;
  --leading-heading: 0.9;
  --text-display: 51px;
  --leading-display: 0.9;

  /* Spacing */
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-31: 31px;
  --spacing-41: 41px;
  --spacing-45: 45px;
  --spacing-68: 68px;
  --spacing-204: 204px;

  /* Border Radius */
  --radius-xl: 12px;
  --radius-2xl: 22.5px;
  --radius-3xl: 36px;
  --radius-full: 9999px;
}
```
