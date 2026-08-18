# Jornal verde
> jornal editorial numa sala verde

**Tema:** claro

A interface lê como um jornal financeiro impresso reimaginado pra web: títulos serifados e grotescos monumentais dominam a página, microlegendas em versalete conduzem a navegação, e um único verde neon saturado age como caneta marca-texto sobre um canvas por lo demais monocromático. A página é predominantemente tipográfica: fotografias são tratadas como inserções retangulares em tons de cinza e duotone que interrompem o fluxo de texto em vez de flutuar sobre ele. O layout é espaçoso e quase de revista editorial no ritmo: tipo de display superdimensionado, espiro generoso, e um rodapé que vira quase preto com faixas de acento verde. Os botões são suaves como pílula com sombras tingidas de verde; o resto da UI fica reduzido a tipo e estrutura de linha fina.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|-------|
| Bone White | `#fafffa` | `--color-bone-white` | Fundo de página, superfícies de card, texto primário em seções escuras: um branco quase puro com tom quente que mantém a página lendo como papel, não tela |
| Press Black | `#121613` | `--color-press-black` | Cor de título primária, fundo do rodapé, superfície dominante: preto quase verdadeiro com um leve viés esverdeado que o liga ao destaque |
| Typesetter Ink | `#000000` | `--color-typesetter-ink` | Títulos primários, texto de corpo e preenchimentos de ícone em superfícies claras. Não promova essa cor pro CTA primário |
| Slate Verdant | `#232924` | `--color-slate-verdant` | Superfície secundária, seções com borda, destaque escuro apagado: fica entre o preto de imprensa e o canvas branco |
| Newsprint Gray | `#516254` | `--color-newsprint-gray` | Legendas apagadas, texto de apoio e rótulos de UI de menor ênfase |
| Muted Sage | `#c8d2c8` | `--color-muted-sage` | Texto claro em superfícies escuras, rótulos invertidos e legendas de alto contraste |
| Highlighter Green | `#2bee4b` | `--color-highlighter-green` | Preenchimento de ação primária, sublinhado de nav ativo e faixa de rodapé de sangria total: o único destaque vívido, usado como um traço de marca-texto sobre a página monocromática |
| Shadow Moss | `#93b799` | `--color-shadow-moss` | Destaque verde de apoio pra detalhes decorativos e ênfase de baixa frequência. Não promova essa cor pro CTA primário |
| Echo Green | `#c4e4c9` | `--color-echo-green` | Destaque cinza de apoio pra detalhes decorativos e ênfase de baixa frequência. Não promova essa cor pro CTA primário |

## Tokens de tipografia

### Grotesca de interface. Face primária de UI e navegação: microlegendas em versalete (11px / 550 maiúsculas), corpo compacto (16px / 400) e títulos de display grandes (96px e 155px / 550) com tracking apertado de -0.04em. `--font-grotesca-interface`
- **Substituto:** Inter, Söhne, Neue Haas Grotesk
- **Pesos:** 200, 350, 400, 550
- **Tamanhos:** 11px, 14px, 16px, 18px, 72px, 96px, 155px
- **Altura de linha:** 1.0–1.4
- **Tracking:** microlegendas em maiúsculas +0.01em; tamanhos de display -0.04em; tamanhos médios -0.02em
- **Papel:** Face primária de UI e navegação: microlegendas em versalete (11px / 550 maiúsculas), corpo compacto (16px / 400) e títulos de display grandes (96px e 155px / 550) com tracking apertado de -0.04em

### Serifada de display. Serifada de display pros maiores títulos editoriais: leading extremamente apertado (0.9) e tracking agressivo de -0.04em fazem o logotipo ler como um bloco único de tinta. `--font-serifada-display`
- **Substituto:** GT Sectra, Tiempos Headline, Recoleta
- **Pesos:** 400
- **Tamanhos:** 60px, 165px, 295px
- **Altura de linha:** 0.9
- **Tracking:** -0.04em em todos os tamanhos
- **Papel:** Serifada de display pros maiores títulos editoriais: leading extremamente apertado (0.9) e tracking agressivo de -0.04em fazem o logotipo ler como um bloco único de tinta

### Editorial secundária. Face de display secundária pra passagens editoriais com viés itálico: o peso mais leve 300 cria contraste com as serifadas mais pesadas da serifada de display principal. `--font-editorial-secundaria`
- **Substituto:** GT Super, Domaine Display, Canela
- **Pesos:** 300
- **Tamanhos:** 60px, 140px, 240px
- **Altura de linha:** 0.9
- **Tracking:** -0.02em a -0.01em
- **Papel:** Face de display secundária pra passagens editoriais com viés itálico: o peso mais leve 300 cria contraste com as serifadas mais pesadas da serifada de display principal

### Serifada de sistema. Serifada de sistema como fallback pra corpo de texto renderizado pelo navegador e texto adjacente a ícones: deliberadamente antiquada, reforçando a metáfora de jornal impresso. `--font-serifada-sistema`
- **Substituto:** Times New Roman, serifada de sistema
- **Pesos:** 400
- **Tamanhos:** 16px
- **Altura de linha:** 1.2
- **Papel:** Serifada de sistema como fallback pra corpo de texto renderizado pelo navegador e texto adjacente a ícones: deliberadamente antiquada, reforçando a metáfora de jornal impresso

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 11px | 1.1 | 0.11px | `--text-caption` |
| body-sm | 14px | 1.1 | 0.14px | `--text-body-sm` |
| body | 18px | 1 | -0.36px | `--text-body` |
| subheading | 60px | 0.9 | -1.2px | `--text-subheading` |
| heading-sm | 72px | 1 | -1.44px | `--text-heading-sm` |
| heading | 96px | 1 | -1.92px | `--text-heading` |
| heading-lg | 155px | 1 | -6.2px | `--text-heading-lg` |
| display | 295px | 0.9 | -11.8px | `--text-display` |

## Espaçamento e formas

**Densidade:** espaçosa

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 10 | 10px | `--spacing-10` |
| 15 | 15px | `--spacing-15` |
| 20 | 20px | `--spacing-20` |
| 25 | 25px | `--spacing-25` |
| 30 | 30px | `--spacing-30` |
| 32 | 32px | `--spacing-32` |
| 35 | 35px | `--spacing-35` |
| 40 | 40px | `--spacing-40` |
| 45 | 45px | `--spacing-45` |
| 50 | 50px | `--spacing-50` |
| 55 | 55px | `--spacing-55` |
| 60 | 60px | `--spacing-60` |
| 120 | 120px | `--spacing-120` |
| 190 | 190px | `--spacing-190` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| pills | 10px |
| round | 9999px |
| images | 14px |
| botões | 5px |

### Shadows

| Nome | Valor | Token |
|------|-------|-------|
| lg | `rgba(16, 94, 29, 0.45) 1px 8px 20px 0px` | `--shadow-lg` |
| lg-2 | `rgba(18, 146, 39, 0.25) 1px 8px 20px 0px` | `--shadow-lg-2` |

### Layout

- **Largura máxima:** 1400px
- **Gap de seção:** 80px
- **Padding de card:** 0px
- **Gap de elemento:** 20px

## Componentes

### Botão de ação marca-texto verde
**Papel:** CTA primário: o único botão preenchido e saturado do site

Preenchimento #2bee4b, rótulo #000000 na grotesca de interface a 11px / 550 maiúsculas com tracking de +0.01em. Padding 20px 30px, raio 5px. Sombra externa rgba(16,94,29,0.45) 1px 8px 20px 0 (tingida de verde, não cinza) pra que a elevação leia como o mesmo verde sangrando pra fora.

### Botão de contorno fantasma
**Papel:** Ação secundária em seções escuras

Preenchimento transparente, borda de 1px em #fafffa, rótulo #fafffa na grotesca de interface a 11px / 550 maiúsculas. Raio 10px, padding 50px 20px: o padding vertical alto faz esses botões lerem como itens de menu de altura total em vez de botões compactos.

### Link de texto sublinhado
**Papel:** Link em linha padrão e navegação de rodapé

Sem preenchimento, sem borda, serifada de sistema a 16px / 400 com sublinhado de 1px preto ou branco que abraça a linha de base. A espessura do sublinhado é o único tratamento estrutural: os links não mudam de peso ou cor.

### Inserção de foto editorial
**Papel:** Bloco de imagem decorativo colocado em linha com o texto do título

Fotografias em tons de cinza (filter: grayscale(1) saturate(1) invert(0.27) sepia(0.07) saturate(10.67) hue-rotate(80deg) brightness(1.02) contrast(0.83)) cortadas em pequenos blocos retangulares, raio 14px, flutuando entre linhas do tipo de display em vez de numa grade.

### Chamada de estatística
**Papel:** Números de métrica do herói (ex "100 M+")

Definido em Newsprint Gray #516254 na escala de display, sem decoração: a cor apagada é o que faz esse número ler como dado editorial em vez de número de herói.

### Tag de categoria
**Papel:** Rótulos de tópico em grades de seção ("Blockchain", "Finanças", "Dados")

Muted Sage #c8d2c8, grotesca de interface a 14px / 350, tracking de +0.01em. Sem fundo, sem borda: só um rótulo tingido em maiúsculas.

### Logotipo de navegação
**Papel:** Lockup de marca no canto superior esquerdo

Grotesca de interface em negrito com um sublinhado de 2px em Highlighter Green sob a primeira palavra. O sublinhado é todo o tratamento do logotipo: sem ícone, sem moldura de lockup.

### Faixa de acento de sangria total
**Papel:** Divisor de seção de página e assinatura de rodapé

Preenchimento #2bee4b de borda a borda, ~640px de altura, usado como ponto final visual entre conteúdo e rodapé. Contém só a inicial do logotipo em branco no canto superior esquerdo.

### Seção editorial escura
**Papel:** Bloco de conteúdo intermediário sobre quase preto

Fundo #121613, tipo de título em #fafffa a 96px / grotesca de interface 550, corpo em #fafffa a 18px / 200. Botões fantasma substituem os preenchidos nessa superfície.

### Rodapé
**Papel:** Rodapé do site

Fundo #121613, versalete na grotesca de interface a 11px / 550 em #fafffa pras colunas de navegação, corpo 18px / 200 pras linhas de contato. Seguido pela faixa de sangria total Highlighter Green que fecha a página.

## Faça e não faça

### Faça
- Defina o título do herói na serifada de display a 165–295px com altura de linha 0.9 e tracking -0.04em: o tracking apertado é o que faz o tipo ler como tinta impressa
- Use preenchimento #2bee4b + sombra tingida de verde #93b799 pra ação primária; nunca use sombra cinza no botão de destaque
- Aplique o filtro de tons de cinza + hue-rotate(80deg) em todo ativo fotográfico pra que todas as imagens leiam na mesma família tonal da página
- Mantenha o canvas em #fafffa (branco osso quente): não use branco puro #ffffff, o tom quente é o que separa isso de uma superfície SaaS padrão
- Use a grotesca de interface a 11px / 550 maiúsculas com tracking de +0.01em pra toda microlegenda, item de nav e botão: a microtipografia faz o trabalho do chrome aqui
- Flutue blocos de foto editorial (raio 14px) em linha entre linhas de tipo de display em vez de numa grade, espelhando o layout impresso
- Ancore toda página com a faixa de sangria total #2bee4b antes do rodapé; ela funciona como assinatura de fechamento

### Não faça
- Não introduza uma segunda cor de destaque saturada: verde é a única nota cromática numa página por lo demais monocromática
- Não use formas de pílula arredondada (9999px) no botão de ação primária; 5px mantém o formato afiado e retangular, combinando com o tom editorial
- Não defina o corpo de texto maior que 18px: o design depende da diferença de tamanho entre corpo de 18px e display de 96px+ pra criar ritmo
- Não use sombra em cards ou blocos de conteúdo; a elevação vive só no botão verde
- Não renderize fotografias em cores plenas: elas precisam passar pelo filtro de tons de cinza pro verde pra pertencer ao sistema
- Não use sans-serif pros títulos de display; o contraste entre a serifada de display e a editorial secundária é o que dá à página sua voz editorial
- Não exceda uma largura de conteúdo de 1400px: o canvas largo com tipo superdimensionado é o que faz a página parecer um jornal

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 1 | Canvas | `#fafffa` | Fundo padrão de página, lê como papel quente |
| 2 | Seção escura | `#121613` | Quebra editorial no meio da página e fundo de rodapé |
| 3 | Faixa de destaque | `#2bee4b` | Faixa de marca de sangria total, superfície de ação primária, sublinhado de estado ativo |

## Elevação

A elevação é usada com moderação e só na ação primária. O botão verde carrega uma sombra tingida de verde (rgba(16,94,29,0.45) 1px 8px 20px 0) pra que a profundidade pertença ao sistema de destaque em vez de ler como elevação genérica de UI cinza. Todas as outras superfícies (cards, seções, imagens) são planas com bordas finas de 1px ou nenhuma borda: a estrutura vem da tipografia, do espaçamento e do contraste de cor, não da sombra.

## Imagem

Toda a fotografia passa por uma cadeia de filtro (tons de cinza para inversão 0.27 para sépia 0.07 para saturação 10.67 para hue-rotate 80deg) que tinge as sombras em direção ao verde de marca. As imagens são cortadas em pequenos blocos retangulares (cerca de 200×140px), raio 14px, colocadas em linha entre linhas de tipo de display em vez de em células de grade. Sem imagem de herói de sangria total, sem mídia sobreposta, sem fotografia de estilo de vida: toda imagem é uma inserção editorial estilo documentário (arquitetura, pessoas em contextos financeiros) que interrompe o fluxo tipográfico. Os ícones são traços mínimos em #000000 ou #fafffa, sem iconografia multicolorida.

## Layout

Canvas editorial de sangria total limitado a ~1400px de largura de conteúdo. O herói é uma parede tipográfica: título superdimensionado (165–295px) com pequenos blocos de foto em tons de cinza flutuando entre as linhas. A navegação é uma barra superior mínima: logotipo à esquerda, "Menu" com ícone de três barras verdes à direita. Abaixo do herói, o conteúdo alterna entre seções largas em branco osso com 80px de respiro vertical e um bloco editorial quase preto (#121613) contendo botões de contorno fantasma. Uma grade de categoria usa 3–4 colunas com tags em sage apagado e chamadas de estatística em Newsprint Gray. A página fecha com um rodapé escuro seguido de uma faixa de destaque #2bee4b de sangria total. Os gaps de seção são generosos (80px), os gaps de elemento ficam em 20px, e a página lê verticalmente como um jornal impresso, não como um painel SaaS.

## Guia de aplicação

**Referência rápida de cor**
- texto: #121613 em superfícies claras, #fafffa em superfícies escuras
- fundo (canvas): #fafffa
- superfície (seção escura / rodapé): #121613
- borda: #232924 ou fina #000000
- destaque (faixa de rodapé, nav ativo): #2bee4b
- ação primária: #2bee4b (ação preenchida)

**Exemplos de componente**
1. *Bloco de título editorial do herói*: largura máxima 1400px centralizada no canvas #fafffa. Título na serifada de display a 165px, peso 400, altura de linha 0.9, tracking -6.6px, cor #121613. Três blocos de foto em tons de cinza (raio 14px) flutuando em linha entre as linhas, cada um passando pelo filter: grayscale(1) saturate(1) invert(0.27) sepia(0.07) saturate(10.67) hue-rotate(80deg) brightness(1.02) contrast(0.83).
2. *Botão de ação marca-texto verde*: preenchimento #2bee4b, rótulo na grotesca de interface a 11px / 550 maiúsculas, tracking +0.11px, cor #000000. Padding 20px 30px, raio de borda 5px, box-shadow rgba(16,94,29,0.45) 1px 8px 20px 0. Ícone de seta em #000000 fica à direita do rótulo.
3. *Seção editorial escura*: fundo #121613 de largura total, contêiner de conteúdo largura máxima 1400px. Título a 96px na grotesca de interface 550, altura de linha 1.0, tracking -1.92px, cor #fafffa. Corpo de texto 18px na grotesca de interface 200, altura de linha 1.0, tracking -0.36px, cor #fafffa. Botão fantasma: preenchimento transparente, borda sólida de 1px em #fafffa, raio 10px, padding 50px 20px, rótulo 11px maiúsculas #fafffa.
4. *Linha de tag de categoria*: rótulo Muted Sage #c8d2c8, grotesca de interface a 14px / 350, tracking +0.14px. Sem preenchimento, sem borda, gap de 20px entre tags. Usado acima de títulos de seção e em grades de estatística.
5. *Faixa de destaque de sangria total*: preenchimento #2bee4b de borda a borda, 640px de altura. Inicial do logotipo na grotesca de interface em negrito #fafffa, posicionada no canto superior esquerdo com padding de 50px. Sem conteúdo adicional: a faixa é a assinatura de fechamento.

## Empilhamento tipográfico

O sistema depende de três faces de display que interagem entre si: a serifada de display (peso 400, tracking mais apertado -0.04em) pro logotipo e maiores declarações; a editorial secundária (serifada mais leve, peso 300) pras citações editoriais com viés itálico; a grotesca de interface pra tudo de UI e pros títulos de sub-display de 96–155px que se alternam com a serifada. O contraste entre o bloco pesado da serifada de display e a sans afiada da grotesca de interface no mesmo tamanho físico é o que faz a página parecer uma peça impressa, não um site de voz única. O corpo e as microlegendas ficam na grotesca de interface a 11–18px; a serifada de sistema fallback cuida de qualquer texto renderizado pelo navegador.

## Tratamento de imagem

Todo ativo fotográfico passa pela mesma cadeia de filtro: grayscale(1) saturate(1) invert(0.27) sepia(0.07) saturate(10.67) hue-rotate(80deg) brightness(1.02) contrast(0.83). A rotação de matiz de 80 graus depois de uma inversão parcial empurra o monocromático pra família do verde: os pretos viram pretos-esverdeados profundos, os brancos viram osso, os meios-tons ganham um viés de sage. Esse filtro é aplicado no nível do ativo pra funcionar em qualquer imagem enviada sem gradação de cor por ativo. Resultado: o site inteiro lê como um duotone verde de dois tons, independente do conteúdo da fotografia original.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-bone-white: #fafffa;
  --color-press-black: #121613;
  --color-typesetter-ink: #000000;
  --color-slate-verdant: #232924;
  --color-newsprint-gray: #516254;
  --color-muted-sage: #c8d2c8;
  --color-highlighter-green: #2bee4b;
  --color-shadow-moss: #93b799;
  --color-echo-green: #c4e4c9;

  /* Typography - Font Families */
  --font-grotesca-interface: 'Grotesca Interface', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serifada-display: 'Serifada Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-editorial-secundaria: 'Editorial Secundaria', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serifada-sistema: 'Serifada Sistema', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 11px;
  --leading-caption: 1.1;
  --tracking-caption: 0.11px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.1;
  --tracking-body-sm: 0.14px;
  --text-body: 18px;
  --leading-body: 1;
  --tracking-body: -0.36px;
  --text-subheading: 60px;
  --leading-subheading: 0.9;
  --tracking-subheading: -1.2px;
  --text-heading-sm: 72px;
  --leading-heading-sm: 1;
  --tracking-heading-sm: -1.44px;
  --text-heading: 96px;
  --leading-heading: 1;
  --tracking-heading: -1.92px;
  --text-heading-lg: 155px;
  --leading-heading-lg: 1;
  --tracking-heading-lg: -6.2px;
  --text-display: 295px;
  --leading-display: 0.9;
  --tracking-display: -11.8px;

  /* Typography - Weights */
  --font-weight-extralight: 200;
  --font-weight-light: 300;
  --font-weight-w350: 350;
  --font-weight-regular: 400;
  --font-weight-w550: 550;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-15: 15px;
  --spacing-20: 20px;
  --spacing-25: 25px;
  --spacing-30: 30px;
  --spacing-32: 32px;
  --spacing-35: 35px;
  --spacing-40: 40px;
  --spacing-45: 45px;
  --spacing-50: 50px;
  --spacing-55: 55px;
  --spacing-60: 60px;
  --spacing-120: 120px;
  --spacing-190: 190px;

  /* Layout */
  --page-max-width: 1400px;
  --section-gap: 80px;
  --card-padding: 0px;
  --element-gap: 20px;

  /* Border Radius */
  --radius-md: 4.9968px;
  --radius-lg: 9.9936px;
  --radius-xl: 14px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-pills: 10px;
  --radius-round: 9999px;
  --radius-images: 14px;
  --radius-buttons: 5px;

  /* Shadows */
  --shadow-lg: rgba(16, 94, 29, 0.45) 1px 8px 20px 0px;
  --shadow-lg-2: rgba(18, 146, 39, 0.25) 1px 8px 20px 0px;

  /* Surfaces */
  --surface-canvas: #fafffa;
  --surface-dark-section: #121613;
  --surface-accent-band: #2bee4b;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-bone-white: #fafffa;
  --color-press-black: #121613;
  --color-typesetter-ink: #000000;
  --color-slate-verdant: #232924;
  --color-newsprint-gray: #516254;
  --color-muted-sage: #c8d2c8;
  --color-highlighter-green: #2bee4b;
  --color-shadow-moss: #93b799;
  --color-echo-green: #c4e4c9;

  /* Typography */
  --font-grotesca-interface: 'Grotesca Interface', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serifada-display: 'Serifada Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-editorial-secundaria: 'Editorial Secundaria', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serifada-sistema: 'Serifada Sistema', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 11px;
  --leading-caption: 1.1;
  --tracking-caption: 0.11px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.1;
  --tracking-body-sm: 0.14px;
  --text-body: 18px;
  --leading-body: 1;
  --tracking-body: -0.36px;
  --text-subheading: 60px;
  --leading-subheading: 0.9;
  --tracking-subheading: -1.2px;
  --text-heading-sm: 72px;
  --leading-heading-sm: 1;
  --tracking-heading-sm: -1.44px;
  --text-heading: 96px;
  --leading-heading: 1;
  --tracking-heading: -1.92px;
  --text-heading-lg: 155px;
  --leading-heading-lg: 1;
  --tracking-heading-lg: -6.2px;
  --text-display: 295px;
  --leading-display: 0.9;
  --tracking-display: -11.8px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-15: 15px;
  --spacing-20: 20px;
  --spacing-25: 25px;
  --spacing-30: 30px;
  --spacing-32: 32px;
  --spacing-35: 35px;
  --spacing-40: 40px;
  --spacing-45: 45px;
  --spacing-50: 50px;
  --spacing-55: 55px;
  --spacing-60: 60px;
  --spacing-120: 120px;
  --spacing-190: 190px;

  /* Border Radius */
  --radius-md: 4.9968px;
  --radius-lg: 9.9936px;
  --radius-xl: 14px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-lg: rgba(16, 94, 29, 0.45) 1px 8px 20px 0px;
  --shadow-lg-2: rgba(18, 146, 39, 0.25) 1px 8px 20px 0px;
}
```
