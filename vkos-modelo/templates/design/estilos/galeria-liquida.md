# Galeria líquida
> iridescência líquida atrás do silêncio editorial, uma galeria editorial monocromática flutuando sobre luz derretida.

**Tema:** claro

O sistema roda em disciplina monocromática radical: preto e branco puros com cinzas quase imperceptíveis, envolvendo uma tipografia enorme que respira em telas de sangria total. O contraste de assinatura vive entre a contenção editorial austera (cantos afiados de 0px em navegação e links de texto, espaço em branco generoso, ritmo baseado em 4px) e um único gesto expressivo: botões em pílula total de raio 75px que flutuam como líquido sobre a imagem. Os ambientes de hero mergulham em atmosferas iridescentes, fluidas e cromáticas (verdes se dissolvendo em âmbar até um vinho profundo), enquanto a interface em si nunca assume uma cor, criando a sensação de uma galeria editorial em preto e branco flutuando sobre um rio de luz líquida. A tipografia define a temperatura: peso 300 a 78px sussurra, peso 400 a 225px preenche o viewport, e peso 400 a 11px rotula tudo o mais com minimalismo confiante. O movimento é expressivo mas paciente, curvas cubic-bezier(0.19, 1, 0.22, 1) esticando transições de transform de até 1.25s, deixando os elementos deslizarem em vez de saltar.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Obsidian | `#000000` | `--color-obsidian` | Texto primário, traços de SVG, preenchimentos de overlay: o preto puro carrega toda a informação de primeiro plano e as marcas gráficas |
| Paper | `#ffffff` | `--color-paper` | Texto claro sobre superfícies escuras, rótulos inversos e legendas de alto contraste. Não promova essa cor a cor de CTA primário |
| Inkstone | `#181818` | `--color-inkstone` | Texto de corpo do rodapé e títulos secundários: preto suavizado para blocos de leitura longa |
| Felt Gray | `#6d6d6d` | `--color-felt-gray` | Texto de apoio discreto, blocos de endereço, texto legal: anotações quietas que recuam sem desaparecer |
| Slate Pill | `#636363` | `--color-slate-pill` | Fundo de botão neutro preenchido: o único preenchimento sólido usado para ações como Aceitar |
| Ash Mist | `#9a9a9a` | `--color-ash-mist` | Neutro de tom médio para superfícies desabilitadas ou de baixo contraste na pilha de superfície |
| Pewter | `#808080` | `--color-pewter` | Neutro de tom médio secundário para camadas de hover ou estado discreto |
| Iridescent Fade | `linear-gradient(90deg, rgb(160, 224, 171), rgb(255, 172, 46) 50%, rgb(165, 45, 37))` | `--color-iridescent-fade` | Acento cromático que aparece somente dentro da lavagem de gradiente do hero: âncora de vinho derretido da atmosfera iridescente, não usado em controles de interface |

## Tokens de tipografia

### Roobert, tipografia primária em todo o texto de interface, navegação, títulos de hero, corpo, listas e rodapés. A sans customizada carrega clareza geométrica com calor humanista; sua faixa de peso larga (300 sussurro até 600 âncora) deixa o sistema respirar de títulos monumentais de 225px até rótulos de 11px. `--font-roobert`
- **Substituto:** Inter ou Söhne, ambas compartilham o equilíbrio geométrico-humanista de Roobert e a abertura limpa
- **Pesos:** 300, 400, 600
- **Tamanhos:** 11px, 12px, 16px, 18px, 29px, 30px, 39px, 45px, 54px, 78px, 94px, 225px
- **Altura de linha:** 0.70 a 2.34 (apertada de 0.70 a 0.76 em tamanhos de destaque, generosa de 1.58 no corpo)
- **Papel:** Tipografia primária em todo o texto de interface, navegação, títulos de hero, corpo, listas e rodapés. A sans customizada carrega clareza geométrica com calor humanista; sua faixa de peso larga (300 sussurro até 600 âncora) deixa o sistema respirar de títulos monumentais de 225px até rótulos de 11px.

### Raleway, reservada para contextos específicos de título onde uma sans um pouco mais elegante e estreita introduz contraste. Aparece com moderação como contraponto à presença mais forte de Roobert. `--font-raleway`
- **Substituto:** Montserrat ou Jost
- **Pesos:** 400
- **Tamanhos:** 54px
- **Altura de linha:** 1.39
- **Papel:** Reservada para contextos específicos de título onde uma sans um pouco mais elegante e estreita introduz contraste. Aparece com moderação como contraponto à presença mais forte de Roobert.

### system-ui, rótulos micro de UI, corpo do banner de cookies, letras miúdas. Fallback padrão do navegador garantindo legibilidade na menor escala sem comprometer-se com uma fonte customizada. `--font-system-ui`
- **Pesos:** 400
- **Tamanhos:** 9px, 16px
- **Altura de linha:** 1.15 a 1.32
- **Papel:** Rótulos micro de UI, corpo do banner de cookies, letras miúdas. Fallback padrão do navegador garantindo legibilidade na menor escala sem comprometer-se com uma fonte customizada.

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.19 | - | `--text-caption` |
| body-sm | 16px | 1.15 | - | `--text-body-sm` |
| body | 18px | 1.21 | - | `--text-body` |
| subheading | 39px | 1.19 | - | `--text-subheading` |
| subheading-lg | 45px | 1.15 | - | `--text-subheading-lg` |
| heading-sm | 54px | 1.39 | - | `--text-heading-sm` |
| heading | 78px | 1.1 | - | `--text-heading` |
| heading-lg | 94px | 0.76 | - | `--text-heading-lg` |
| display | 225px | 1.25 | - | `--text-display` |

## Espaçamento e formas

**Unidade base:** 4px

**Densidade:** espaçosa

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 28 | 28px | `--spacing-28` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 68 | 68px | `--spacing-68` |
| 152 | 152px | `--spacing-152` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| tags | 75px |
| cards | 0px |
| imagens | 0px |
| inputs | 0px |
| botões | 75px |

### Layout

- **Largura máxima:** 1078px
- **Gap de seção:** 46px
- **Padding de card:** 34px
- **Gap de elemento:** 14px

## Componentes

### Botão Pílula Fantasma (Superfície Escura)
**Papel:** Botão de ação primária usado sobre mídia de hero iridescente ou escura

Fundo transparente, borda sólida de 1px rgba(255,255,255,0.3), texto #ffffff, border-radius de 75px (pílula total), padding vertical de 11px e horizontal de 33px, Roobert 16px peso 400. A borda translúcida se dissolve no fundo iridescente enquanto a silhueta da pílula permanece inconfundível.

### Botão Pílula Fantasma (Superfície Clara)
**Papel:** Ação secundária em seções brancas ou cinza claro

Fundo transparente, borda sólida de 1px #000000, texto #000000, border-radius de 75px, padding vertical de 11px e horizontal de 33px, Roobert 16px peso 400. Espelha a variante de superfície escura: mesma geometria, paleta invertida.

### Pílula Neutra Preenchida
**Papel:** Consentimento de cookies e confirmações utilitárias

Fundo rgba(55,55,55,0.78) (funcionalmente Slate Pill #636363), texto #ffffff, borda sólida de 1px #ffffff, border-radius de 75px, padding vertical de 11px e horizontal de 33px. A única ação preenchida com sólido no sistema, usada com moderação para conformidade e consentimento, nunca para CTAs de marketing primário.

### Link de Texto Sem Sublinhado
**Papel:** Navegação inline, itens de menu, seletor de idioma, links de rodapé

Sem fundo, sem borda, raio de 0px. Roobert 12 a 16px peso 400, a cor alterna entre #ffffff (sobre escuro) e #000000 (sobre claro). Sublinhados estão ausentes: contexto e peso separam o link do texto de corpo. Altura de linha generosa (1.36 a 11px, 1.19 a 12px) mantém os menus empilhados arejados.

### Título de Destaque do Hero
**Papel:** Título editorial de viewport completo

Roobert 225px peso 400, altura de linha 1.25, #ffffff sobre mídia escura iridescente. Tracking normal. O título é o hero: sem subtítulo, sem CTA, apenas uma frase monumental centralizada no viewport respirando contra a luz fluida.

### Título de Seção (Peso Sussurro)
**Papel:** Título atmosférico para seções de manifesto ou recurso

Roobert 78px peso 300, altura de linha 1.10. O peso 300 nessa escala é anticonvencional: a maioria dos sites usa 600 a 700 aqui. O peso sussurro faz o título parecer falado, não gritado, dando à câmara editorial sua autoridade discreta.

### Título de Seção (Peso Âncora)
**Papel:** Divisor ou afirmação editorial em negrito

Roobert 94px peso 400, altura de linha 0.76. A altura de linha apertada (0.76) é dramática: as linhas de texto quase se tocam, criando um bloco tipográfico denso que se lê como objeto de arte. Usado para grandes momentos de afirmação onde o próprio texto é visual.

### Card de Projeto / Linha de Lista
**Papel:** Entrada de trabalho em destaque, imagem e título pareados

Fundo transparente, border-radius de 0px, sem sombra. A imagem sangra em largura total dentro do container de 1078px; o título fica abaixo em Roobert 16 a 18px peso 400. Sem chrome de card: o card é o conteúdo, não um container. O espaçamento entre linhas é controlado por gaps de 14 a 46px dependendo da densidade da seção.

### Seletor de Idioma
**Papel:** Seletor de localidade na barra superior

Três links de texto inline em Roobert 12px peso 400, cor #ffffff ou #000000 dependendo da superfície, raio de 0px, separados por espaço em branco em vez de divisores. A localidade ativa carrega a mesma cor mas peso visual um pouco mais forte, só pelo espaçamento.

### Indicador de Rolagem Rotativo
**Papel:** Emblema circular no canto inferior esquerdo convidando à exploração para baixo

Emblema SVG circular com texto contornando a circunferência ('SCROLL DOWN, SCROLL DOWN'), girando continuamente em ritmo lento. Fica no canto inferior esquerdo com um pequeno deslocamento. Traço preto tinta sobre preenchimento transparente: uma marca de pontuação tipográfica, não um botão.

### Bloco de Endereço do Rodapé
**Papel:** Informação de contato do estúdio

Roobert 11px peso 400, altura de linha 1.36, texto Felt Gray #6d6d6d. Margens superiores estreitas de 8px entre linhas criam uma pilha de endereço compacta que recua na página. Sem divisores ou rótulos: o cinza discreto faz o trabalho.

### Banner de Cookies
**Papel:** Aviso de conformidade com uma única ação de aceite

Barra inferior fixa, fundo Slate Pill rgba(55,55,55,0.78), texto de corpo branco em system-ui 9 a 16px, junto de um botão Pílula Neutra Preenchida 'Aceitar'. Texto mínimo, ação única, sem configurações: o banner respeita a atenção pedindo apenas o consentimento.

### Barra de Navegação Superior
**Papel:** Cabeçalho persistente com logo, localidade e menu

Cabeçalho transparente fixo com 66px de altura. Wordmark do logo no canto superior esquerdo (Roobert 16px peso 400, o nome do produto), seletor de idioma centralizado, pilha de menu alinhada à direita (WORK / MANIFESTO / STORIES / TEAM / CONTACT a 11 a 12px peso 400). Sem preenchimento de fundo: o cabeçalho é invisível até o conteúdo rolar atrás dele.

### Fundo de Hero Iridescente
**Papel:** Mídia atmosférica atrás dos títulos do hero

Gradiente orgânico ou vídeo de viewport completo: verde-sálvia suave (rgb 160,224,171) se dissolvendo através de âmbar derretido (rgb 255,172,46) até um vinho profundo (rgb 165,45,37). Aplicado como uma textura líquida e fluida, nunca como um gradiente plano. Essa é a única superfície cromática de todo o sistema e existe somente atrás do texto, nunca como preenchimento de UI.

## Faça e não faça

### Faça
- Defina títulos de destaque a 225px Roobert peso 400 e deixe-os dominar o viewport: nunca os sobrecarregue com subtítulos ou CTAs
- Use o raio de pílula de 75px exclusivamente para botões e tags: mantenha todos os outros elementos (cards, imagens, inputs) em raio 0px para contraste editorial afiado
- Reserve cor para um único fundo de hero iridescente por página: mantenha todo texto de interface, bordas e preenchimentos estritamente na escala preto/branco/cinza
- Use peso 300 a 78px para títulos de manifesto e atmosféricos para criar autoridade sussurrada: nunca passe do peso 400 nessa escala
- Defina a altura de linha em 0.70 a 0.76 em tamanhos de destaque acima de 78px para deixar as linhas se travarem como objetos de arte tipográficos
- Aplique easing cubic-bezier(0.19, 1, 0.22, 1) a transições de transform e cor com durações de 0.8 a 1.25s para um movimento paciente e deslizante
- Mantenha todos os links de texto interativos em raio 0px sem sublinhado: deixe o espaçamento, a cor e o contexto sinalizarem a interação

### Não faça
- Nunca introduza uma cor de UI cromática: preto, branco e cinza são a paleta de interface; o gradiente iridescente é só mídia
- Nunca use box-shadow ou elevação em cards, botões ou imagens: o sistema depende de superfícies planas e bordas finas de 1px
- Nunca defina border-radius entre 1px e 74px: o sistema pula do 0px afiado direto para a pílula total de 75px, sem arredondamento intermediário
- Nunca use pesos negrito ou pesados (600 ou mais) acima de 45px: tamanhos grandes devem sussurrar em 300 ou falar em 400, nunca gritar
- Nunca centralize o texto de corpo em blocos de endereço, listas ou descrições de projeto: alinhe à esquerda com gaps de linha de 8 a 14px para fluxo editorial
- Nunca adicione gradientes a botões, badges ou controles de UI: gradientes pertencem somente à mídia atmosférica do hero
- Nunca use Raleway para corpo ou navegação: é só um acento de título, e mesmo ali aparece com moderação
- Nunca preencha a tela inteira com imagem: o sistema é dominado por texto com um único gesto visual do tamanho do hero por página

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 1 | Paper | `#ffffff` | Tela primária: a maioria das seções fica sobre branco puro |
| 2 | Slate Pill | `#636363` | Superfície de botão preenchido para consentimento de cookies e ações neutras |
| 3 | Obsidian | `#000000` | Overlay escuro e seção inversa: faixas escuras de sangria total atrás da mídia iridescente |
| 4 | Ash Mist | `#9a9a9a` | Camada quieta de tom médio para painéis embutidos ou zonas desabilitadas |

## Elevação

O sistema evita deliberadamente elevação por sombra. As superfícies se distinguem por inversão de cor (faixas de branco para preto) e bordas finas de 1px em vez de sombras empilhadas. O único gesto de 'elevação' é a pílula slate translúcida no banner de cookies, que usa opacidade de fundo em vez de sombra para se separar do conteúdo.

## Imagem

A imagem é teatral e singular: uma textura fluida iridescente enorme domina o hero, verdes orgânicos se dissolvendo através de âmbar até vinho como óleo na água ou vidro derretido. Se lê como mídia atmosférica de sangria total, possivelmente vídeo ou canvas orientado a shader, e ocupa o viewport inteiro como um momento sensorial único em vez de um padrão repetido. As vitrines de projeto usam fotografia editorial contida (recortes justos de produto, still de campanha) apresentada sem molduras ou bordas: a imagem é o conteúdo. Sem ilustração, sem ícones além de pequenos glifos de UI, sem formas decorativas. A iconografia é mínima ou ausente; o emblema circular de texto rotativo funciona como o único ornamento tipográfico do sistema. Densidade geral: dominada por texto, com um único gesto visual do tamanho do hero, seguido de longos trechos editoriais quietos de tipografia e imagem de produto.

## Layout

O layout é contido em largura máxima de 1078px, centralizado, com seções de hero escuras de sangria total quebrando o container. O hero é de viewport completo: título monumental centralizado flutuando sobre a mídia iridescente, navegação mínima flutuando no topo, um único emblema rotativo no canto inferior esquerdo. As seções de corpo seguem um ritmo editorial espaçoso: gaps de seção generosos de 46px criam espaço de respiro entre blocos, alternando entre faixas brancas e escuras (preto com tipo branco). O arranjo de conteúdo é assimétrico: alternâncias de texto à esquerda com imagem à direita e imagem à esquerda com texto à direita dominam, sem pilhas centralizadas fora do hero. As grades de card aparecem como listas de projeto de coluna única em vez de grades multicoluna: cada projeto ganha a largura total com sua imagem e título. A navegação é uma barra superior transparente com logo à esquerda, localidade ao centro, menu à direita: sem mudança de cor fixa, sem sombra, apenas persistência invisível. O rodapé é um bloco de endereço compacto de três colunas (Tóquio, Xangai, Londres) com texto discreto de 11px. No geral: ritmo de revista editorial num quadro digital.

## Guia de aplicação

**Referência rápida de cor**
- texto primário: #000000
- texto discreto: #6d6d6d
- fundo: #ffffff
- overlay escuro / seção inversa: #000000
- borda (superfície clara): #000000
- borda (superfície escura): rgba(255,255,255,0.3)
- acento: nenhum, a única cor cromática é o gradiente iridescente do hero, que é só mídia
- ação primária: sem cor de CTA distinta

**Exemplos de componente**
Nenhuma cor de ação primária distinta foi observada; use os tratamentos de botão neutros extraídos em vez de inventar uma cor de CTA preenchida.

2. Construa uma linha de lista de projeto: fundo transparente, raio 0px, sem sombra. Imagem de sangria total no topo dentro do container de 1078px, cantos afiados. Título do projeto abaixo em Roobert 16px peso 400, cor #000000. Gap de 46px até a próxima linha. Sem chrome de card, sem bordas, sem padding ao redor do próprio conteúdo.

3. Construa um Botão Pílula Fantasma sobre superfície clara: fundo transparente, borda sólida de 1px #000000, border-radius de 75px, padding superior e inferior de 11px, padding esquerdo e direito de 33px. Rótulo em Roobert 16px peso 400, cor #000000. Sem preenchimento no hover: anime a opacidade da borda e o tracking na transição com cubic-bezier(0.19, 1, 0.22, 1) ao longo de 0.8s.

## Personalidade de movimento

O movimento é expressivo mas sem pressa: o sistema trata as transições como movimentos de câmera lentos, não como saltos de UI. A curva de assinatura é cubic-bezier(0.19, 1, 0.22, 1) (um ease-out suave) aplicada a transform, cor e opacidade em durações de 0.8s e 1.25s. Easing mais curto usa 'ease' simples a 0.4s para microtransições de cor e opacidade. Uma animação rotativa roda continuamente no emblema indicador de rolagem em ritmo lento. Transforms dominam sobre animação posicional: os elementos deslizam, escorregam e revelam através de transform em vez de reposicionamento de layout. A duração de 1.25s em transforms (69 ocorrências) sinaliza que o estúdio prefere paciência a responsividade; nada deve parecer abrupto. Transições de borda (6 ocorrências) e mudanças de flex-basis são raras e reservadas para revelações de layout, não microinterações.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-obsidian: #000000;
  --color-paper: #ffffff;
  --color-inkstone: #181818;
  --color-felt-gray: #6d6d6d;
  --color-slate-pill: #636363;
  --color-ash-mist: #9a9a9a;
  --color-pewter: #808080;
  --color-iridescent-fade: #a02d25;
  --gradient-iridescent-fade: linear-gradient(90deg, rgb(160, 224, 171), rgb(255, 172, 46) 50%, rgb(165, 45, 37));

  /* Typography - Font Families */
  --font-roobert: 'Roobert', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-raleway: 'Raleway', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-system-ui: 'system-ui', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.19;
  --text-body-sm: 16px;
  --leading-body-sm: 1.15;
  --text-body: 18px;
  --leading-body: 1.21;
  --text-subheading: 39px;
  --leading-subheading: 1.19;
  --text-subheading-lg: 45px;
  --leading-subheading-lg: 1.15;
  --text-heading-sm: 54px;
  --leading-heading-sm: 1.39;
  --text-heading: 78px;
  --leading-heading: 1.1;
  --text-heading-lg: 94px;
  --leading-heading-lg: 0.76;
  --text-display: 225px;
  --leading-display: 1.25;

  /* Typography - Weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-28: 28px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-68: 68px;
  --spacing-152: 152px;

  /* Layout */
  --page-max-width: 1078px;
  --section-gap: 46px;
  --card-padding: 34px;
  --element-gap: 14px;

  /* Border Radius */
  --radius-lg: 10px;
  --radius-full: 75.024px;

  /* Named Radii */
  --radius-tags: 75px;
  --radius-cards: 0px;
  --radius-images: 0px;
  --radius-inputs: 0px;
  --radius-buttons: 75px;

  /* Surfaces */
  --surface-paper: #ffffff;
  --surface-slate-pill: #636363;
  --surface-obsidian: #000000;
  --surface-ash-mist: #9a9a9a;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-obsidian: #000000;
  --color-paper: #ffffff;
  --color-inkstone: #181818;
  --color-felt-gray: #6d6d6d;
  --color-slate-pill: #636363;
  --color-ash-mist: #9a9a9a;
  --color-pewter: #808080;
  --color-iridescent-fade: #a02d25;

  /* Typography */
  --font-roobert: 'Roobert', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-raleway: 'Raleway', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-system-ui: 'system-ui', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography - Scale */
  --text-caption: 12px;
  --leading-caption: 1.19;
  --text-body-sm: 16px;
  --leading-body-sm: 1.15;
  --text-body: 18px;
  --leading-body: 1.21;
  --text-subheading: 39px;
  --leading-subheading: 1.19;
  --text-subheading-lg: 45px;
  --leading-subheading-lg: 1.15;
  --text-heading-sm: 54px;
  --leading-heading-sm: 1.39;
  --text-heading: 78px;
  --leading-heading: 1.1;
  --text-heading-lg: 94px;
  --leading-heading-lg: 0.76;
  --text-display: 225px;
  --leading-display: 1.25;

  /* Spacing */
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-28: 28px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-68: 68px;
  --spacing-152: 152px;

  /* Border Radius */
  --radius-lg: 10px;
  --radius-full: 75.024px;
}
```
