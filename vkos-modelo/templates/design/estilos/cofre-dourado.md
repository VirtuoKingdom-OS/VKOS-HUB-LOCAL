# Cofre dourado
> Cofre-forte da meia-noite com linhas douradas de livro contábil.

**Tema:** escuro

O sistema opera em modo de galeria da meia-noite: uma tela quase preta, tipografia branca e um único acento quente de cobre que funciona como pontuação editorial. Os títulos de destaque são compostos em Ivy Presto, uma serifa didona de alto contraste usada em tamanhos extremos (até 88px). Esse encontro entre serifa e sem serifa é a assinatura do sistema, trazendo seriedade financeira sem a gravidade tradicional de banco. O resto da interface é deliberadamente discreto: bordas finas, controles em formato de pílula, texto de corpo compacto de 16px e uma elevação quase imperceptível que deixa a serifa respirar. Um único gradiente dourado (linha de gráfico, microacentos) injeta calor num sistema por outro lado monocromático, evocando o brilho quente de um terminal financeiro pensado para uma audiência de design.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Obsidian | `#08080a` | `--color-obsidian` | Tela de fundo da página, fundo do rodapé, superfície mais profunda: quase preto com o mais leve tom azulado |
| Onyx | `#040406` | `--color-onyx` | Superfície de card, fundo secundário: um degrau mais fundo que a página para dar peso visual |
| Carbon | `#121317` | `--color-carbon` | Painéis elevados, preenchimentos sutis de interface: o primeiro degrau claramente mais claro na pilha de superfícies |
| Graphite | `#1c1d22` | `--color-graphite` | Bordas, divisores, contêineres de ícone, controles de slider: a cor de linha fina que define a estrutura |
| Slate | `#2e3038` | `--color-slate` | Bordas secundárias, traços de ícone discretos, divisores sutis entre blocos de conteúdo |
| Smoke | `#464853` | `--color-smoke` | Bordas terciárias, itens de navegação inativos: linhas estruturais quase invisíveis |
| Ash | `#5e616e` | `--color-ash` | Texto de corpo discreto, conteúdo de placeholder, metadados secundários |
| Steel | `#777a88` | `--color-steel` | Bordas de botão, traços de ícone, texto secundário, contornos de botão fantasma |
| Fog | `#9194a1` | `--color-fog` | Texto de navegação, descrições de corpo, texto de apoio: o cinza legível de uso geral |
| Mist | `#acafb9` | `--color-mist` | Texto de corpo discreto, texto complementar, parágrafos de menor ênfase |
| Silver | `#c7c9d1` | `--color-silver` | Texto de corpo claro, parágrafos de média ênfase, títulos secundários |
| Bone | `#e2e3e9` | `--color-bone` | Texto de corpo de alta ênfase, rótulos densos de dados, o tom de texto padrão na maior parte da interface |
| Paper White | `#ffffff` | `--color-paper-white` | Preenchimento do botão de ação primária, títulos, estado ativo de navegação: a cor de maior contraste, reservada para elementos que precisam de atenção máxima |
| Copper | `#cc9166` | `--color-copper` | Rótulos de categoria, links editoriais, pontuação de acento quente: a única cor cromática, usada com moderação para marcar conteúdo curado e tags de categoria |
| Gilded Gradient | `linear-gradient(103deg, rgb(174, 147, 87), rgb(255, 240, 204) 40%, rgb(174, 147, 87) 70%, rgba(189, 157, 79, 0))` | `--color-gilded-gradient` | Traço de linha de gráfico, acento de visualização de dados financeiros: um gradiente quente de dourado para creme que traz a única energia de cor às exibições de dados |

## Tokens de tipografia

### Ivy Presto: serifa de destaque e título, usada exclusivamente em títulos de herói e de seção a partir de 28px. Os traços didones de alto contraste com serifas finas criam luxo editorial. O leve tracking positivo de 0,01em é incomum e dá ao tipo uma sensação impressa, de livro contábil. Essa serifa é a assinatura principal do sistema: ela separa esse estilo de qualquer outro fintech SaaS que recorre, por padrão, a uma sem serifa geométrica. `--font-ivy-presto`
- **Substituto:** Playfair Display, DM Serif Display, Libre Caslon Display
- **Pesos:** 400, 500
- **Tamanhos:** 28px, 44px, 52px, 64px, 88px
- **Altura de linha:** 1.0–1.38
- **Tracking:** 0.0100em
- **Papel:** serifa de destaque e título, usada exclusivamente em títulos de herói e de seção a partir de 28px. Os traços didones de alto contraste com serifas finas criam luxo editorial. O leve tracking positivo de 0,01em é incomum e dá ao tipo uma sensação impressa, de livro contábil. Essa serifa é a assinatura principal do sistema.

### Inter: sem serifa de interface, usada em corpo, navegação, botões, rótulos, links, campos de formulário e no nível de subtítulo de 48px. O peso 300 aparece em corpo de 18px para texto secundário bem discreto; 500 domina em texto de média ênfase e rótulos de botão; 600 é reservado para rótulos de categoria em versalete. O tracking negativo aperta em 20px (−0,04em) e afrouxa conforme o tamanho diminui, característico do dimensionamento ótico do Inter. `--font-inter`
- **Substituto:** Inter (auto-hospedada via Google Fonts)
- **Pesos:** 300, 400, 500, 600, 700
- **Tamanhos:** 12px, 13px, 14px, 15px, 16px, 18px, 20px, 24px, 48px
- **Altura de linha:** 1.0–1.56
- **Tracking:** -0.0400em, -0.0250em, -0.0200em, -0.0130em, -0.0070em, 0.0100em
- **Papel:** sem serifa de interface, usada em corpo, navegação, botões, rótulos, links, campos de formulário e no nível de subtítulo de 48px. O peso 300 aparece em corpo de 18px para texto secundário bem discreto; 500 domina em texto de média ênfase e rótulos de botão; 600 é reservado para rótulos de categoria em versalete.

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| eyebrow | 13px | 1 | -0.26px | `--text-eyebrow` |
| body-xs | 16px | 1.5 | normal | `--text-body-xs` |
| body-sm | 18px | 1.38 | -0.36px | `--text-body-sm` |
| body | 20px | 1.38 | -0.8px | `--text-body` |
| subheading | 24px | 1 | -0.31px | `--text-subheading` |
| heading-sm | 44px | 1.38 | 0.44px | `--text-heading-sm` |
| heading | 52px | 1.13 | 0.52px | `--text-heading` |
| heading-lg | 64px | 1.13 | 0.64px | `--text-heading-lg` |
| display | 88px | 1 | 0.88px | `--text-display` |

## Espaçamento e formas

**Densidade:** compacta

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 6 | 6px | `--spacing-6` |
| 8 | 8px | `--spacing-8` |
| 9 | 9px | `--spacing-9` |
| 10 | 10px | `--spacing-10` |
| 12 | 12px | `--spacing-12` |
| 14 | 14px | `--spacing-14` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 22 | 22px | `--spacing-22` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 105 | 105px | `--spacing-105` |
| 224 | 224px | `--spacing-224` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| navegação | 2px |
| tags | 9999px |
| cards | 10px |
| ícones | 9999px |
| campos | 9999px |
| botões | 9999px |

### Sombras

| Nome | Valor | Token |
|------|-------|-------|
| subtle | `rgba(255, 255, 255, 0.2) 0px 0px 0px 1px` | `--shadow-subtle` |

### Layout

- **Largura máxima:** 1216px
- **Gap de seção:** 160px
- **Padding de card:** 24px
- **Gap de elemento:** 8px

## Componentes

### Botão de ação primária
**Papel:** elemento interativo de maior ênfase, conversão final

Formato de pílula, raio 9999px. Preenchimento branco (#ffffff), texto preto (#000000) em 14px Inter peso 500. Padding 10px 20px. Usado nos CTAs "Get Started" do cabeçalho e do herói. Sem borda. A inversão branco sobre preto é o único sinal visual forte do sistema: trate como recurso raro.

### Botão fantasma com contorno
**Papel:** ação secundária, ao lado da primária no cabeçalho

Preenchimento transparente com borda branca (#ffffff) de 1px, raio 9999px. Texto branco em 14px Inter peso 500. Padding 10px 20px. O contorno de 1px define a forma sem preenchê-la: usado para "Sign in" e ações menos críticas.

### Botão de tag em pílula
**Papel:** filtro de categoria, indicador de status, ação inline pequena

Fundo transparente, borda de 1px em #777a88, raio 9999px, padding 6px 10px. Texto branco em 12–14px Inter. Menor e mais discreto que os botões de ação: a cor da borda é propositalmente cinza-frio, não branca, para se ler como secundária.

### Card de gráfico no herói
**Papel:** exibir visualização de produto no herói

Superfície escura (#040406) com raio 10px. Sem borda visível. Contém um cabeçalho de saldo, uma pílula de filtro de período, um gráfico de linha em gradiente dourado e um campo de limite de gasto. A linha do gráfico usa o gradiente dourado (linear-gradient 103deg) como traço: é o único lugar onde o acento cobre/dourado ganha movimento na página.

### Card de lista de transações
**Papel:** painel de exibição de dados densos

Painel do lado direito no herói, raio 10px, preenchimento transparente. Contém linhas com avatares de ícone colorido (azul, vermelho, roxo, laranja) e nome do comerciante com valor alinhado à direita. Ritmo vertical denso com 2px de padding interno.

### Card de depoimento em vídeo
**Papel:** prova social com vídeo ou foto incorporados

Raio 10px, fundo preenchido por imagem com gradiente escuro sobreposto para legibilidade do texto. Texto branco sobreposto na base: nome em 16px Inter peso 500, cargo/empresa em texto menor e mais discreto. Sem borda. A imagem preenche 100% da área do card, com o texto sobre uma máscara de gradiente ancorada embaixo.

### Card de post de blog
**Papel:** card de conteúdo editorial para artigos

Raio 10px, preenchimento transparente. No topo: imagem na proporção nativa. Abaixo: rótulo de categoria em Copper (#cc9166) em 13px Inter peso 600, separador de data, depois título em 18–20px Inter peso 500 em branco. Metadado de tempo de leitura embaixo em #acafb9. Sem borda: os cards se separam só pelo espaço em branco.

### Campo de captura de e-mail
**Papel:** campo de e-mail do CTA no herói

Preenchimento transparente, borda branca (#ffffff) de 1px, raio 9999px. Padding 10px 10px 10px 20px. Texto de placeholder em #777a88. O formato de pílula combina com o botão primário: o campo e o botão "Get Started" foram desenhados para se ler como uma unidade só, com o padding esquerdo do campo maior para equilibrar o peso visual do botão à direita.

### Link de navegação
**Papel:** item de menu de nível superior

Sem fundo, sem borda. Texto em 14px Inter em #9194a1 (inativo) ou #ffffff (ativo/hover). Seta de dropdown para itens com submenu (Empresa, Produtos, Soluções). Padding 6px 10px para a área de clique. Raio de sublinhado de 2px no indicador de hover.

### Selo de status ativo
**Papel:** indicador de estado positivo em tabelas de dados

Pílula pequena, preenchimento transparente com borda verde de 1px. Texto em verde em 12px Inter peso 500. Raio 9999px, padding vertical de 2px. O verde é um verde-sálvia dessaturado que funciona bem sobre fundo escuro, sem vibrar.

### Exibição de estatística
**Papel:** grande ponto de prova numérico

Número em 28–44px Ivy Presto peso 400, branco. Legenda abaixo em 14px Inter peso 400 em #9194a1. Exemplo: número de destaque "10.000+" com legenda "negócios". O numeral em serifa cria gravidade editorial para as estatísticas.

### Category eyebrow
**Papel:** rótulo acima de seção, categoria de artigo

13px Inter peso 600, tracking -0.02em. Copper (#cc9166) para categorias de blog, #9194a1 para tipos de seção. Funciona como um ponto tipográfico antes de cada bloco de conteúdo: um rótulo pequeno e preciso que introduz o que vem a seguir.

### Linha de tabela de dados
**Papel:** tabela de limite de gastos, conta virtual ou transações

Preenchimento transparente, borda inferior de 1px em #1c1d22. Sem padding entre células: a densidade é alta. Cabeçalhos de coluna em #9194a1 em 14px. Valores das células em #e2e3e9 em 14–15px. Números alinhados à direita. A tabela depende de divisores de linha fina, não de contêineres de card.

## Faça e não faça

### Faça
- Use Ivy Presto para todo texto de destaque e título a partir de 28px. Nunca em corpo de texto abaixo de 20px.
- Defina o corpo de texto em 16px Inter peso 400 com altura de linha 1.5 em #e2e3e9 (Bone): esse é o tom legível padrão.
- Use o botão em pílula preenchido de branco (#ffffff) exclusivamente para a ação mais importante de cada tela: é um recurso visual escasso.
- Aplique Copper (#cc9166) só em rótulos de categoria e links editoriais. Nunca em botões, ícones ou blocos grandes de texto.
- Use bordas de 1px em #1c1d22 ou #2e3038 para bordas de card e tabela. Nunca use sombra projetada para elevação.
- Espace as seções com gaps verticais de 160px no desktop: o respiro generoso deixa os títulos em serifa dominarem.
- Use raio de borda 9999px para todos os botões, campos, tags e indicadores de status. Use 10px para cards e 2px para sublinhados de navegação.

### Não faça
- Não substitua Inter por Ivy Presto em texto de destaque: o contraste serifa/sem serifa é a identidade do sistema, não decoração.
- Não introduza azul, verde ou qualquer cor cromática como acento principal: Copper é a única nota quente na paleta.
- Não use o botão preenchido de branco mais de uma vez por viewport: sua força diminui com a repetição.
- Não adicione sombra projetada a cards, modais ou popovers. Use degraus de cor de superfície e bordas de 1px.
- Não defina corpo de texto maior que 20px em Inter: tamanhos maiores pertencem à Ivy Presto.
- Não use #ffffff para texto longo de corpo: mude para #e2e3e9 (Bone) para reduzir o cansaço visual em fundos escuros.
- Não aplique o gradiente dourado fora de contextos de visualização de dados: ele é reservado para linhas de gráfico e acentos de dados financeiros.

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Void | `#08080a` | Tela de fundo da página, plano de fundo geral |
| 1 | Card | `#040406` | Superfícies de card, blocos de conteúdo contidos |
| 2 | Panel | `#121317` | Painéis elevados, superfícies de dropdown, fundos de campo |
| 3 | Floating | `#1c1d22` | Bordas, divisores, elementos de interface flutuantes, contêineres de ícone |

## Elevação

- **Anéis de ícone:** `rgba(255, 255, 255, 0.2) 0px 0px 0px 1px`

## Imagem

A fotografia é editorial e naturalista: fotos de retrato em tons quentes de fundadores e membros de equipe em seus ambientes reais de trabalho (escritórios, salas de estar, canteiros de obra). As imagens preenchem os quadros do card de ponta a ponta, sem padding. Um gradiente escuro é aplicado na parte inferior dos cards de depoimento para legibilidade do texto. A estética lembra "LinkedIn cruzado com revista editorial": espontânea, humana, levemente dessaturada, nunca com acabamento de banco de imagens. As miniaturas de artigo misturam fotografia com conceitos ilustrados (um homem em um labirinto, uma lareira com sacos de dinheiro). A interface de produto aparece em modo escuro, com opacidade total, flutuando sobre superfícies escuras discretas: essas são a peça central do herói. Os ícones são monocromáticos, com traços de 1px em #2e3038 ou #777a88, nunca preenchidos com a cor de acento.

## Layout

Largura máxima de 1216px, conteúdo centralizado, com gaps verticais de seção de 160px. O herói é uma tela escura de largura total com composição dividida: título em serifa alinhado à esquerda em 64–88px com campo de captura de e-mail abaixo, e um grande card de interface de produto (a captura do painel) à direita, ocupando 50% da largura. As seções seguintes usam um título centralizado em coluna única (serifa em 44–64px) com subtítulo em Inter, seguido de grades de card em 3 colunas para recursos, depoimentos e posts de blog. A navegação é uma barra superior fixa: logo à esquerda, menu central (Empresa, Produtos, Soluções, Clientes, Preços, FAQ), à direita "Sign in" (fantasma) e "Get Started" (pílula preenchida de branco). O rodapé é uma grade densa de 5 colunas com informações da empresa e conteúdo legal. A página alterna entre seções de grade ricas em conteúdo e chamadas de estatística de sangria total: o ritmo é estabelecido por espaço em branco generoso entre as faixas, não por alternância de cor de fundo (a página inteira é uma única tela contínua em #08080a).

## Guia de aplicação

Referência rápida de cor:
- texto: #e2e3e9 (corpo) / #ffffff (títulos, ênfase)
- fundo: #08080a (página) / #040406 (card) / #121317 (painel)
- borda: #1c1d22 (linha fina) / #2e3038 (secundária)
- acento: #cc9166 (Copper: links editoriais, rótulos de categoria)
- ação primária: #ffffff (preenchimento de ação)
- acento de gráfico: gradiente dourado (rgb(174,147,87) até rgb(255,240,204))

Exemplos de componente:

1. Crie uma seção de herói: fundo #08080a, largura máxima 1216px centralizada. Coluna esquerda: título de 88px Ivy Presto peso 400 branco com tracking de 0,01em, subtexto de 20px Inter peso 400 #9194a1. Abaixo: um campo de e-mail em pílula (preenchimento transparente, borda branca de 1px, raio 9999px, padding 10px 20px, placeholder #777a88) unido a um botão em pílula preenchido de branco (raio 9999px, texto #000000 em 14px Inter peso 500, padding 10px 20px). Coluna direita: um card de painel em #040406 com raio 10px mostrando um número de saldo (48px Inter peso 500 branco), pílula de filtro e um gráfico de linha em gradiente dourado.

2. Crie uma grade de cards de blog em 3 colunas: cada card com raio 10px, preenchimento transparente, sem borda. Topo: imagem preenchendo a largura do card. Abaixo: rótulo de categoria em Copper (#cc9166) em 13px Inter peso 600, data em #9194a1 em 13px, título em 20px Inter peso 500 branco com altura de linha 1.38. Metadado de tempo de leitura embaixo em #acafb9. Cards separados por gap de coluna de 16px e gap de linha de 32px.

3. Crie um card de depoimento em vídeo: raio 10px, foto de fundo em sangria total com gradiente de preto para transparente de 40% na parte inferior. Texto sobreposto: nome em 16px Inter peso 500 branco, cargo/empresa em 14px Inter peso 400 #acafb9. Proporção do card 4:3. Sem borda, sem sombra.

4. Crie uma tabela de dados para limites de gasto: fundo transparente, borda inferior de 1px em #1c1d22 em cada linha. Cabeçalhos de coluna em #9194a1 em 14px Inter peso 500, valores de célula em #e2e3e9 em 15px Inter peso 400. Valores monetários alinhados à direita. A coluna de status usa um selo em pílula: raio 9999px, borda de 1px, texto de 12px Inter peso 500.

5. Crie uma seção de chamada de estatística: layout centralizado. Número grande em 44px Ivy Presto peso 400 branco, legenda abaixo em 14px Inter peso 400 #9194a1. Padding vertical de 160px acima e abaixo. Coluna única, largura máxima 600px.

## Sistema de colisão serifa/sem serifa

A escolha estrutural definidora é o pareamento de Ivy Presto (uma serifa didona de alto contraste) exclusivamente para títulos a partir de 28px, com Inter para todo o texto de interface abaixo desse limiar. Isso cria um registro tipográfico de dois níveis: a serifa fala aos momentos editoriais e aspiracionais (herói, títulos de seção, números grandes), a sem serifa cuida dos momentos funcionais e informativos (corpo, rótulos, botões). Nunca cruze essa fronteira: a serifa nunca desce abaixo de 28px, a sem serifa nunca sobe além de 48px. O leve tracking positivo da Ivy Presto (0,01em) dá a ela uma qualidade impressa, quase gravada, reforçada pelo acento de cobre e pelo gradiente dourado que evocam livros contábeis financeiros e folha de ouro.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-obsidian: #08080a;
  --color-onyx: #040406;
  --color-carbon: #121317;
  --color-graphite: #1c1d22;
  --color-slate: #2e3038;
  --color-smoke: #464853;
  --color-ash: #5e616e;
  --color-steel: #777a88;
  --color-fog: #9194a1;
  --color-mist: #acafb9;
  --color-silver: #c7c9d1;
  --color-bone: #e2e3e9;
  --color-paper-white: #ffffff;
  --color-copper: #cc9166;
  --color-gilded-gradient: #ae9357;
  --gradient-gilded-gradient: linear-gradient(103deg, rgb(174, 147, 87), rgb(255, 240, 204) 40%, rgb(174, 147, 87) 70%, rgba(189, 157, 79, 0));

  /* Typography: Font Families */
  --font-ivy-presto: 'Ivy Presto', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-eyebrow: 13px;
  --leading-eyebrow: 1;
  --tracking-eyebrow: -0.26px;
  --text-body-xs: 16px;
  --leading-body-xs: 1.5;
  --text-body-sm: 18px;
  --leading-body-sm: 1.38;
  --tracking-body-sm: -0.36px;
  --text-body: 20px;
  --leading-body: 1.38;
  --tracking-body: -0.8px;
  --text-subheading: 24px;
  --leading-subheading: 1;
  --tracking-subheading: -0.31px;
  --text-heading-sm: 44px;
  --leading-heading-sm: 1.38;
  --tracking-heading-sm: 0.44px;
  --text-heading: 52px;
  --leading-heading: 1.13;
  --tracking-heading: 0.52px;
  --text-heading-lg: 64px;
  --leading-heading-lg: 1.13;
  --tracking-heading-lg: 0.64px;
  --text-display: 88px;
  --leading-display: 1;
  --tracking-display: 0.88px;

  /* Typography: Weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-22: 22px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-105: 105px;
  --spacing-224: 224px;

  /* Layout */
  --page-max-width: 1216px;
  --section-gap: 160px;
  --card-padding: 24px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-lg: 10px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-nav: 2px;
  --radius-tags: 9999px;
  --radius-cards: 10px;
  --radius-icons: 9999px;
  --radius-inputs: 9999px;
  --radius-buttons: 9999px;

  /* Shadows */
  --shadow-subtle: rgba(255, 255, 255, 0.2) 0px 0px 0px 1px;

  /* Surfaces */
  --surface-void: #08080a;
  --surface-card: #040406;
  --surface-panel: #121317;
  --surface-floating: #1c1d22;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-obsidian: #08080a;
  --color-onyx: #040406;
  --color-carbon: #121317;
  --color-graphite: #1c1d22;
  --color-slate: #2e3038;
  --color-smoke: #464853;
  --color-ash: #5e616e;
  --color-steel: #777a88;
  --color-fog: #9194a1;
  --color-mist: #acafb9;
  --color-silver: #c7c9d1;
  --color-bone: #e2e3e9;
  --color-paper-white: #ffffff;
  --color-copper: #cc9166;
  --color-gilded-gradient: #ae9357;

  /* Typography */
  --font-ivy-presto: 'Ivy Presto', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-eyebrow: 13px;
  --leading-eyebrow: 1;
  --tracking-eyebrow: -0.26px;
  --text-body-xs: 16px;
  --leading-body-xs: 1.5;
  --text-body-sm: 18px;
  --leading-body-sm: 1.38;
  --tracking-body-sm: -0.36px;
  --text-body: 20px;
  --leading-body: 1.38;
  --tracking-body: -0.8px;
  --text-subheading: 24px;
  --leading-subheading: 1;
  --tracking-subheading: -0.31px;
  --text-heading-sm: 44px;
  --leading-heading-sm: 1.38;
  --tracking-heading-sm: 0.44px;
  --text-heading: 52px;
  --leading-heading: 1.13;
  --tracking-heading: 0.52px;
  --text-heading-lg: 64px;
  --leading-heading-lg: 1.13;
  --tracking-heading-lg: 0.64px;
  --text-display: 88px;
  --leading-display: 1;
  --tracking-display: 0.88px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-22: 22px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-105: 105px;
  --spacing-224: 224px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-lg: 10px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-subtle: rgba(255, 255, 255, 0.2) 0px 0px 0px 1px;
}
```
