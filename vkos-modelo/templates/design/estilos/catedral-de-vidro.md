# Catedral de vidro
> Vidro fosco de catedral à meia-noite

**Tema:** escuro

Este estilo constrói uma estética de lançamento de produto à meia-noite: uma tela quase preta com superfícies de vidro fosco, uma grade de linhas de projeto tênues, e texto luminoso que parece iluminado por trás de uma camada de vidro. O tipo é quase todo branco sobre escuro, com um único violeta vívido como acento funcional. Toda superfície interativa usa um filete fino frio azul-esbranquiçado embutido em vez de uma borda dura. Os componentes ficam sobre camadas translúcidas empilhadas acima de brilhos ambientes, com cards que parecem placas de vidro iluminadas por baixo, não painéis de papel. O espaçamento é generoso e rítmico; o hero é um único wordmark iluminado em sangria total cercado por cards de vidro flutuantes, em vez de um layout dividido convencional.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Tela Meia-noite | `#05060f` | `--color-midnight-canvas` | Fundo da página, superfície de card mais profunda, preenchimento de badge. A base quase preta sobre a qual tudo flutua |
| Placa de Aço | `#2f343e` | `--color-steel-plate` | Superfície elevada, preenchimento de botão para ações fantasma ou secundárias, fundo sutil de painel |
| Véu de Névoa | `#9da7ba` | `--color-fog-veil` | Corpo de texto discreto, texto de card. Legível mas recuado em relação aos títulos |
| Névoa Lunar | `#c7d3ea` | `--color-moon-mist` | Texto de corpo, rótulos secundários, texto de apoio discreto |
| Brilho de Gelo | `#d1e4fa` | `--color-frost-glow` | Preenchimento de texto primário para corpo e links, texto de badge, preenchimento de ícone. O primeiro plano luminoso padrão |
| Destaque Lua Clara | `linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%)` | `--color-ice-highlight` | Texto claro sobre superfícies escuras, rótulos inversos e legendas de alto contraste. Não promova essa cor para o CTA principal; gradiente de título usado do topo à base, de Destaque Lua Clara até azul suave, usado no wordmark e nos títulos principais |
| Branco Puro | `#ffffff` | `--color-pure-white` | Texto de botão, texto de input, primeiro plano de máxima ênfase |
| Violeta Vazio | `#663af3` | `--color-void-violet` | Preenchimento do CTA primário. O único acento cromático, usado exclusivamente no botão de continuar ou enviar dentro dos formulários de autenticação; violeta vívido contra o quase preto cria urgência focada sem quebrar o clima monocromático |
| Azul de Projeto | `#b6d9fc` | `--color-blueprint-blue` | Acento decorativo de ícone, realce suave sobre ilustrações de funcionalidade |
| Brilho Âmbar | `#e46d4c` | `--color-ember-glow` | Acento secundário, aparece em contextos de demonstração ou vitrine (amostras de recoloração de logo) para exibir personalização de cor de marca |
| Azul Sinal | `#027dea` | `--color-signal-blue` | Acento secundário, aparece em grades de amostra de personalização para demonstrar opções de cor de marca |
| Teal Profundo | `#269684` | `--color-deep-teal` | Acento secundário, aparece em grades de amostra de personalização |
| Azul de Linha de Grade | `#3f4959` | `--color-gridline-blue` | Cor de sombra para sombras externas de card. O azul-acinzentado escuro e frio dá à elevação uma sensação tingida, alinhada à marca, em vez de preto neutro |
| Filete de Vidro | `#bad7f71f` | `--color-glass-edge` | Bordas finas em botões, inputs e links. Traço embutido de 1px em azul-esbranquiçado fosco que define bordas sem linhas duras |
| Preenchimento Luminoso | `#c7d3ea1f` | `--color-luminous-fill` | Preenchimento de badge e tingimento suave de superfície. Branco frio translúcido para fundos de tag e lavagens sutis de UI |

## Tokens de tipografia

### Sem serifa para corpo, UI, botões, inputs, badges, títulos pequenos. A fonte de trabalho para tudo que é funcional. `--font-untitled-sans`
- **Substituto:** Inter
- **Pesos:** 400, 500, 600, 700
- **Tamanhos:** 12px, 14px, 16px, 18px, 24px
- **Altura de linha:** 1,17, 1,20, 1,33, 1,43, 1,50, 2,29, 2,57
- **Tracking:** -0,0100em
- **Papel:** Sem serifa para corpo, UI, botões, inputs, badges, títulos pequenos. A fonte de trabalho para tudo que é funcional

### Serifa de display, só para títulos: o wordmark principal, títulos de seção, texto de hero; peso 500 em 44 a 48px dá ao wordmark uma presença ampla e serena em vez de um grito em negrito. `--font-aeonikpro`
- **Substituto:** Space Grotesk
- **Pesos:** 400, 500
- **Tamanhos:** 28px, 44px, 48px
- **Altura de linha:** 1,14, 1,16, 1,17, 1,20
- **Tracking:** normal
- **Papel:** Serifa de display, só para títulos: o wordmark principal, títulos de seção, texto de hero; peso 500 em 44 a 48px dá ao wordmark uma presença ampla e serena em vez de um grito em negrito

### Rótulos de introdução em caixa alta ('Apresentando', 'Extensível por natureza', 'Brilhe forte'). Caixa alta com tracking de 0,10em e tom monoespaçado atuam como marcadores discretos de seção entre o tipo de display e o corpo de texto. `--font-dotdigital`
- **Pesos:** 400
- **Tamanhos:** 15px
- **Altura de linha:** 1,20
- **Tracking:** 0,1000em
- **Recursos OpenType:** `"tnum" on`
- **Substituto:** JetBrains Mono
- **Papel:** Rótulos de introdução em caixa alta ('Apresentando', 'Extensível por natureza', 'Brilhe forte'). Caixa alta com tracking de 0,10em e tom monoespaçado atuam como marcadores discretos de seção entre o tipo de display e o corpo de texto

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.33 | . | `--text-caption` |
| body-sm | 14px | 1.43 | . | `--text-body-sm` |
| body | 16px | 1.5 | -0.16px | `--text-body` |
| subheading | 18px | 1.33 | . | `--text-subheading` |
| heading-sm | 24px | 1.17 | -0.24px | `--text-heading-sm` |
| heading | 28px | 1.14 | . | `--text-heading` |
| heading-lg | 44px | 1.16 | . | `--text-heading-lg` |
| display | 48px | 1.17 | . | `--text-display` |

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
| 36 | 36px | `--spacing-36` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 56 | 56px | `--spacing-56` |
| 100 | 100px | `--spacing-100` |
| 120 | 120px | `--spacing-120` |
| 200 | 200px | `--spacing-200` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| cards | 16px |
| badges | 6px |
| inputs | 6px |
| modals | 16px |
| buttons | 999px |
| iconContainers | 9999px |

### Sombras

| Nome | Valor | Token |
|------|-------|-------|
| sm | `rgba(186, 207, 247, 0.32) 0px 0px 6px 0px` | `--shadow-sm` |
| md | `rgba(238, 186, 247, 0.24) 0px 0px 12px 0px` | `--shadow-md` |
| subtle | `rgba(186, 215, 247, 0.12) 0px 0px 0px 1px inset` | `--shadow-subtle` |
| subtle-2 | `rgba(199, 211, 234, 0.12) -0.5px 0.5px 1px 0px inset, rgb...` | `--shadow-subtle-2` |
| subtle-3 | `rgba(186, 214, 247, 0.06) 0px 0px 0px 1px inset` | `--shadow-subtle-3` |
| subtle-4 | `rgba(199, 211, 234, 0.12) 0px 1px 1px 0px inset, rgba(199...` | `--shadow-subtle-4` |
| subtle-5 | `rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset` | `--shadow-subtle-5` |
| subtle-6 | `rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168,...` | `--shadow-subtle-6` |
| subtle-7 | `rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168,...` | `--shadow-subtle-7` |
| subtle-8 | `rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168,...` | `--shadow-subtle-8` |
| subtle-9 | `rgba(186, 214, 247, 0.24) 0px 0px 0px 1px inset` | `--shadow-subtle-9` |

### Layout

- **Largura máxima:** 1200px
- **Gap de seção:** 120px
- **Padding de card:** 24px
- **Gap de elemento:** 16px

## Componentes

### Botão pílula (fantasma primário)
**Papel:** Botão padrão, usado para 'Começar', 'Continuar com Google/Microsoft', links de 'Saiba mais'

Raio de 999px, padding de 8px 16px, fundo rgba(186,214,247,0.06) (lavagem fosca tênue), texto #ffffff, borda embutida de 1px rgba(186,215,247,0.12) em azul-esbranquiçado fosco. Peso 500, 14px. O hover clareia a lavagem fosca para rgba(186,214,247,0.12).

### Botão pílula (contornado)
**Papel:** Botão secundário de navegação, ícone do cabeçalho, CTAs secundários

Raio de 999px, padding de 8px 16px, fundo transparente, texto #d1e4fa, borda embutida de 1px rgba(186,215,247,0.12). Mesma geometria do fantasma primário, só o preenchimento muda.

### Botão CTA violeta
**Papel:** CTA cromático único, aparece só dentro de mockups de formulário de autenticação como o botão de envio 'Continuar'

Preenchimento sólido #663af3, texto branco, raio de 6px, padding de 12px 24px, peso 500. O único lugar onde aparece um botão não monocromático; seu violeta vívido contrasta com a paleta meia-noite.

### Card de vidro (funcionalidade)
**Papel:** Cards de funcionalidade, contêineres de ícone, painéis de seção

Raio de 16px, fundo rgba(186,214,247,0.03) (tingimento fosco quase invisível), padding de 24px, sem borda dura. Elevação construída a partir de destaque fosco embutido e um halo suave externo; parece uma placa de vidro iluminada por trás.

### Card modal de formulário de autenticação
**Papel:** O produto principal: cards de login e cadastro flutuantes no hero

Raio de 16px, fundo rgba(5,6,15,0.97), padding de 24 a 32px. Pilha de três camadas de sombra: destaque fosco superior embutido (#d8ecf8 20%), brilho médio embutido (#a8d8f5 6%), sombra projetada inferior (#000 30%). Flutua acima do hero com o card central em escala maior que os vizinhos.

### Campo de texto
**Papel:** Campos de e-mail, senha e texto dentro dos formulários de autenticação

Raio de 6px, fundo rgba(199,211,234,0.06), texto #ffffff, placeholder #c7d3ea a cerca de 60% de opacidade, borda embutida de 1px rgba(186,215,247,0.12). Padding horizontal de 10px. O estado de foco aumenta a opacidade da borda para 0,24.

### Botão de provedor (login social)
**Papel:** Botões de continuar com Google, Microsoft ou SSO

Pílula em largura total (variante de 999px ou 6px de raio), padding de 12px 16px, fundo rgba(199,211,234,0.06), texto branco, ícone do provedor alinhado à esquerda. Um divisor 'OU' fica entre o envio por e-mail e as opções sociais em caixa alta discreta de 12px.

### Rótulo de introdução de seção
**Papel:** Marcadores de seção em caixa alta ('Apresentando', 'Extensível por natureza', 'Brilhe forte', 'Modo claro e escuro suportados')

15px, peso 400, tracking de 0,10em, cor #c7d3ea, centralizado. Ladeado por linhas horizontais finas que desvanecem de transparente para rgba(186,215,247,0.12) e voltam.

### Bloco de ícone de funcionalidade
**Papel:** Contêineres de ícone na fileira de funcionalidades (login único, senha, autenticação multifator, login social, controle de acesso por papel, autenticação mágica)

Raio de 9999px (círculo perfeito), aproximadamente 56 a 64px quadrado, fundo com tingimento fosco, glifo de ícone contornado em #d1e4fa. Ícones são em traço fino (1,5px), monocromáticos, sem preenchimento nem variação de cor entre tiles.

### Badge / tag
**Papel:** Tags de categoria em cards de integração (e-mail e senha, login social, autenticação multifator, SSO)

Raio de 6px, fundo rgba(199,211,234,0.12), texto #d1e4fa, padding de 4px 8px, 12px peso 500. Sombra interna em múltiplas camadas dá um brilho interno tênue.

### Marca (wordmark)
**Papel:** Wordmark no cabeçalho e no hero

O wordmark do cabeçalho está na sem serifa peso 500 em 16px em #d1e4fa. O wordmark do hero está na serifa de display peso 500 em aproximadamente 140 a 180px (tamanho de display extrapolado), preenchido com o gradiente vertical Destaque Lua Clara (#d8ecf8 até #98c0ef).

### Camada de grade de fundo
**Papel:** Atmosfera ambiente da página, grade de projeto atrás de todas as seções

Camada full-bleed em SVG ou div com linhas de 1px em rgba(186,215,247,0.06), espaçamento de célula de aproximadamente 80 a 100px, mascarada para desvanecer nas bordas. Um halo em gradiente cônico fica no centro superior criando um efeito de spotlight.

### Alternador de tema (claro/escuro)
**Papel:** Demonstra o suporte a modo claro e escuro do produto

Controle segmentado em forma de pílula, raio de 999px, dois segmentos (ícone de lua/sol), 32px de altura. O segmento ativo tem fundo fosco levemente mais claro; o inativo é transparente.

### Amostra de personalização
**Papel:** Tiles de seletor de cor na seção de personalização de marca

Quadrados pequenos de 20 a 24px, raio de 4 a 6px, preenchidos com a cor de marca (violeta, azul, teal, laranja). Organizados em fileira com gaps de 4px. Rotulado 'Cor' em texto discreto de 12px.

## Faça e não faça

### Faça
- Use raio de 999px para todos os elementos interativos (botões, botões de login social, toggles de tag); reserve o raio de 16px exclusivamente para cards e modais, 6px para badges e inputs, e 9999px para contêineres circulares de ícone.
- Construa a elevação a partir de destaques foscos embutidos e halos externos suaves em vez de sombras projetadas convencionais: combine um destaque embutido de 1px rgba(216,236,248,0.2) no topo com um brilho embutido de 24 a 48px e uma sombra projetada escura e fria.
- Use o Violeta Vazio (#663af3) exclusivamente para o CTA de continuar ou enviar do formulário de autenticação. Nunca como acento decorativo ou fundo de botão fora do fluxo de autenticação.
- Defina o texto de título na serifa de display peso 500 em 44 a 48px com o gradiente vertical Destaque Lua Clara (#d8ecf8 até #98c0ef); corpo e UI na sem serifa peso 400 a 500.
- Coloque rótulos de introdução em caixa alta (15px, tracking de 0,10em, #c7d3ea) centralizados e ladeados por linhas horizontais que desvanecem em rgba(186,215,247,0.12) para marcar a abertura de cada seção.
- Use rgba(186,215,247,0.12) como o filete universal. Nunca traços sólidos; a borda embutida fosca é a linguagem de borda do sistema.
- Defina gaps de seção em 120px e padding de card em 24px; o ritmo deve parecer de catedral, não denso como SaaS comum.
- Renderize o texto na progressão Destaque Lua Clara para Brilho de Gelo para Névoa Lunar para Véu de Névoa (#d8ecf8 até #d1e4fa até #c7d3ea até #9da7ba) para título, corpo, corpo discreto e texto de apoio, respectivamente.
- Use o halo de spotlight em gradiente cônico (rgba(124,145,182,0.5) no centro, desvanecendo para fora) no topo de todo hero em sangria total para ancorar a composição.

### Não faça
- Não introduza acentos cromáticos adicionais. A paleta é monocromática com um único CTA violeta; qualquer tom extra quebra o sistema.
- Não use bordas coloridas sólidas; substitua por traços embutidos de 1px rgba(186,215,247,0.12) para preservar a estética de vidro.
- Não use pesos robustos (600 ou mais) nos títulos de display. A autoridade do wordmark vem do peso 500 em tamanho grande, não do volume.
- Não aplique sombras projetadas convencionais; o sistema lê elevação por brilho embutido e halo escuro.
- Não misture famílias de raio no mesmo tipo de componente: todo botão é pílula, todo card é 16px, todo badge é 6px.
- Não posicione branco (#ffffff) sobre tingimentos de fundo mais brilhantes que rgba(186,214,247,0.12). O piso de contraste desaba.
- Não use o gradiente Destaque Lua Clara em texto de corpo ou botões; reserve-o para o wordmark de display e para os títulos maiores.
- Não introduza cores de tema claro nos tokens principais, mesmo que o produto suporte modo claro; o site de marketing é escuro por padrão, e demonstrações em modo claro são um recurso de produto, não uma paleta do sistema de design.

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Tela Meia-noite | `#05060f` | Fundo de página em sangria total, camada mais profunda |
| 1 | Placa de Aço | `#2f343` | Painéis elevados, preenchimento de botão fantasma |
| 2 | Vidro Fosco | `#bad6f708` | Superfície translúcida de card, tingimento quase invisível que lê como vidro sobre a tela |
| 3 | Vidro Profundo | `#05060ff7` | Superfície do modal de formulário de autenticação, meia-noite quase opaca com pilha de sombra de borda fosca |

## Elevação

- **Card modal de formulário de autenticação:** `inset 0 1px 1px rgba(216, 236, 248, 0.2), inset 0 24px 48px rgba(168, 216, 245, 0.06), 0 16px 32px rgba(0, 0, 0, 0.3)`
- **Card de funcionalidade:** `inset 0 1px 1px rgba(199, 211, 234, 0.12), inset 0 24px 48px rgba(199, 211, 234, 0.05), 0 24px 32px rgba(6, 6, 14, 0.7)`
- **Card de autenticação flutuante (hero):** `inset 0 1px 1px rgba(216, 236, 248, 0.2), inset 0 24px 48px rgba(168, 216, 245, 0.06), 0 16px 32px rgba(0, 0, 0, 0.3)`
- **Halo de brilho (atrás do wordmark do hero):** `0 0 6px rgba(186, 207, 247, 0.32), 0 0 12px rgba(238, 186, 247, 0.24)`

## Imagem

As imagens são dominadas por mockups de formulário de autenticação em vidro fosco (campos de e-mail e senha, botões de login social, entrada de código sem senha) renderizados como cards translúcidos flutuantes sobre a tela meia-noite. Os ícones de funcionalidade são glifos em traço fino monocromático em #d1e4fa dentro de tiles circulares foscos. Uma grade de projeto tênue (linhas de 1px em rgba(186,215,247,0.06)) cobre a página inteira como atmosfera ambiente, e um halo de spotlight em gradiente cônico brilha no topo do hero. Sem fotografia, sem imagem lifestyle, sem capturas de tela de produto: o próprio produto é o visual, caixas de login organizadas como protótipos de vidro num estúdio escuro.

## Layout

Tela escura em sangria total, contêiner de conteúdo de largura máxima de 1200px centralizado. O hero é um único wordmark iluminado centralizado (em tipo de display com gradiente) sob um pequeno rótulo de introdução, com três cards de vidro flutuantes de formulário de autenticação em camadas atrás ou abaixo, num leque sobreposto (card esquerdo inclinado para a esquerda, card central em escala maior, card direito inclinado para a direita). Abaixo do hero, um alternador de tema claro e escuro fica centralizado. A fileira de funcionalidades é uma linha do tempo horizontal de 6 ícones com linhas finas conectando os tiles circulares. Ritmo de seção: toda seção abre com um rótulo de introdução centralizado ladeado por linhas horizontais que desvanecem, depois um título grande centralizado (44 a 48px), depois uma linha de corpo de texto discreto (16 a 18px), com no máximo cerca de 640px de largura. A seção de personalização traz uma moldura de janela de navegador simulada com o card de autenticação centralizado, cercado por painéis inspetores de UI flutuantes (amostras de cor, controles de raio, seletor de ícone de logo, campo de texto de botão, campo de fundo de página) posicionados nos cantos da tela como uma área de trabalho de ferramenta de design.

## Guia de aplicação

Referência rápida de cor:
- tela: #05060f
- superfície (card de vidro fosco): rgba(186,214,247,0.03)
- superfície (modal elevado): rgba(5,6,15,0.97)
- texto (título): #d8ecf8
- texto (corpo): #d1e4fa
- texto (discreto): #c7d3ea
- texto (apoio): #9da7ba
- borda (filete): rgba(186,215,247,0.12)
- acento / ação primária: #663af3 (ação preenchida)

Exemplos de componente:

1. Crie um botão de ação primária: fundo #663af3, texto #ffffff, raio de 9999px, padding compacto de pílula. Use esse tratamento preenchido para o CTA principal.

2. Bloco de introdução e título de seção: a introdução está em 15px, peso 400, tracking de 0,10em, cor #c7d3ea, centralizada, ladeada por linhas horizontais que desvanecem (gradiente de transparente para rgba(186,215,247,0.12) e de volta a transparente). Abaixo, o título está em 44px na serifa de display peso 500 em #d8ecf8, centralizado. O corpo abaixo está em 16px sem serifa peso 400 em #c7d3ea, com largura máxima de 640px centralizada.

3. Fileira de ícones de funcionalidade: seis tiles circulares (raio de 9999px, 56px), fundo rgba(186,214,247,0.06), ícone em traço fino centralizado em #d1e4fa, rótulo abaixo em 14px sem serifa #c7d3ea. Tiles conectados por linha horizontal de 1px em rgba(186,215,247,0.12).

4. Botão pílula fantasma: raio de 999px, padding de 8px 16px, fundo rgba(186,214,247,0.06), borda embutida de 1px rgba(186,215,247,0.12), texto #ffffff, 14px peso 500.

5. Tela de fundo com grade: base #05060f, linhas de grade de 1px em rgba(186,215,247,0.06) a intervalos de 80px, sangria total, mascarada para desvanecer nas bordas. Spotlight em gradiente cônico no centro superior: conic-gradient(at 50% -5%, transparent 45%, rgba(124,145,182,0.3) 49%, rgba(124,145,182,0.5) 50%, rgba(124,145,182,0.3) 51%, transparent 55%).

## Sistema de gradiente

O sistema usa três camadas de gradiente empilhadas verticalmente: (1) o gradiente linear Destaque Lua Clara (#d8ecf8 até #98c0ef, 0deg) preenche o wordmark de display e os maiores títulos; (2) gradientes de filete que desvanecem (transparente até rgba(186,215,247,0.12) até transparente) criam as linhas divisórias de seção que ladeiam todo rótulo de introdução; (3) halos em gradiente cônico de spotlight (transparente até rgba(124,145,182,0.5) até transparente) ficam no topo das seções em sangria total como iluminação ambiente. Todos os gradientes têm tom frio; nunca introduza gradientes quentes, a paleta se mantém no espectro azul-violeta.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-midnight-canvas: #05060f;
  --color-steel-plate: #2f343e;
  --color-fog-veil: #9da7ba;
  --color-moon-mist: #c7d3ea;
  --color-frost-glow: #d1e4fa;
  --color-ice-highlight: #d8ecf8;
  --gradient-ice-highlight: linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%);
  --color-pure-white: #ffffff;
  --color-void-violet: #663af3;
  --color-blueprint-blue: #b6d9fc;
  --color-ember-glow: #e46d4c;
  --color-signal-blue: #027dea;
  --color-deep-teal: #269684;
  --color-gridline-blue: #3f4959;
  --color-glass-edge: #bad7f71f;
  --color-luminous-fill: #c7d3ea1f;

  /* Typography: Font Families */
  --font-untitled-sans: 'Untitled Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-aeonikpro: 'aeonikPro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-dotdigital: 'dotDigital', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --tracking-body: -0.16px;
  --text-subheading: 18px;
  --leading-subheading: 1.33;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.17;
  --tracking-heading-sm: -0.24px;
  --text-heading: 28px;
  --leading-heading: 1.14;
  --text-heading-lg: 44px;
  --leading-heading-lg: 1.16;
  --text-display: 48px;
  --leading-display: 1.17;

  /* Typography: Weights */
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
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-100: 100px;
  --spacing-120: 120px;
  --spacing-200: 200px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 120px;
  --card-padding: 24px;
  --element-gap: 16px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;
  --radius-3xl-2: 28px;
  --radius-3xl-3: 44px;
  --radius-full: 999px;
  --radius-full-2: 4999.5px;
  --radius-full-3: 9999px;

  /* Named Radii */
  --radius-cards: 16px;
  --radius-badges: 6px;
  --radius-inputs: 6px;
  --radius-modals: 16px;
  --radius-buttons: 999px;
  --radius-iconcontainers: 9999px;

  /* Shadows */
  --shadow-sm: rgba(186, 207, 247, 0.32) 0px 0px 6px 0px;
  --shadow-md: rgba(238, 186, 247, 0.24) 0px 0px 12px 0px;
  --shadow-subtle: rgba(186, 215, 247, 0.12) 0px 0px 0px 1px inset;
  --shadow-subtle-2: rgba(199, 211, 234, 0.12) -0.5px 0.5px 1px 0px inset, rgba(186, 215, 247, 0.08) 0px 0px 96px 0px inset;
  --shadow-subtle-3: rgba(186, 214, 247, 0.06) 0px 0px 0px 1px inset;
  --shadow-subtle-4: rgba(199, 211, 234, 0.12) 0px 1px 1px 0px inset, rgba(199, 211, 234, 0.05) 0px 24px 48px 0px inset, rgba(6, 6, 14, 0.7) 0px 24px 32px 0px;
  --shadow-subtle-5: rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset;
  --shadow-subtle-6: rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168, 216, 245, 0.06) 0px 24px 48px 0px inset, rgba(0, 0, 0, 0.3) 0px 16px 32px 0px;
  --shadow-subtle-7: rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168, 216, 245, 0.06) 0px 24px 48px 0px inset;
  --shadow-subtle-8: rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168, 216, 245, 0.06) 0px 24px 48px 0px inset, rgba(199, 211, 234, 0.08) 0px 0px 0px 1px inset;
  --shadow-subtle-9: rgba(186, 214, 247, 0.24) 0px 0px 0px 1px inset;

  /* Surfaces */
  --surface-midnight-canvas: #05060f;
  --surface-steel-plate: #2f343;
  --surface-frosted-glass: #bad6f708;
  --surface-deep-glass: #05060ff7;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-midnight-canvas: #05060f;
  --color-steel-plate: #2f343e;
  --color-fog-veil: #9da7ba;
  --color-moon-mist: #c7d3ea;
  --color-frost-glow: #d1e4fa;
  --color-ice-highlight: #d8ecf8;
  --color-pure-white: #ffffff;
  --color-void-violet: #663af3;
  --color-blueprint-blue: #b6d9fc;
  --color-ember-glow: #e46d4c;
  --color-signal-blue: #027dea;
  --color-deep-teal: #269684;
  --color-gridline-blue: #3f4959;
  --color-glass-edge: #bad7f71f;
  --color-luminous-fill: #c7d3ea1f;

  /* Typography */
  --font-untitled-sans: 'Untitled Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-aeonikpro: 'aeonikPro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-dotdigital: 'dotDigital', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --tracking-body: -0.16px;
  --text-subheading: 18px;
  --leading-subheading: 1.33;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1.17;
  --tracking-heading-sm: -0.24px;
  --text-heading: 28px;
  --leading-heading: 1.14;
  --text-heading-lg: 44px;
  --leading-heading-lg: 1.16;
  --text-display: 48px;
  --leading-display: 1.17;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-56: 56px;
  --spacing-100: 100px;
  --spacing-120: 120px;
  --spacing-200: 200px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;
  --radius-3xl-2: 28px;
  --radius-3xl-3: 44px;
  --radius-full: 999px;
  --radius-full-2: 4999.5px;
  --radius-full-3: 9999px;

  /* Shadows */
  --shadow-sm: rgba(186, 207, 247, 0.32) 0px 0px 6px 0px;
  --shadow-md: rgba(238, 186, 247, 0.24) 0px 0px 12px 0px;
  --shadow-subtle: rgba(186, 215, 247, 0.12) 0px 0px 0px 1px inset;
  --shadow-subtle-2: rgba(199, 211, 234, 0.12) -0.5px 0.5px 1px 0px inset, rgba(186, 215, 247, 0.08) 0px 0px 96px 0px inset;
  --shadow-subtle-3: rgba(186, 214, 247, 0.06) 0px 0px 0px 1px inset;
  --shadow-subtle-4: rgba(199, 211, 234, 0.12) 0px 1px 1px 0px inset, rgba(199, 211, 234, 0.05) 0px 24px 48px 0px inset, rgba(6, 6, 14, 0.7) 0px 24px 32px 0px;
  --shadow-subtle-5: rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset;
  --shadow-subtle-6: rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168, 216, 245, 0.06) 0px 24px 48px 0px inset, rgba(0, 0, 0, 0.3) 0px 16px 32px 0px;
  --shadow-subtle-7: rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168, 216, 245, 0.06) 0px 24px 48px 0px inset;
  --shadow-subtle-8: rgba(216, 236, 248, 0.2) 0px 1px 1px 0px inset, rgba(168, 216, 245, 0.06) 0px 24px 48px 0px inset, rgba(199, 211, 234, 0.08) 0px 0px 0px 1px inset;
  --shadow-subtle-9: rgba(186, 214, 247, 0.24) 0px 0px 0px 1px inset;
}
```
