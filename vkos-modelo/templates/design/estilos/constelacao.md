# Constelação
> constelação flutuando sobre veludo negro

**Tema:** escuro

O sistema opera como um ambiente de palco escuro, onde vazios pretos encontram um único acento violeta vívido, pontuado por faíscas âmbar. A tipografia é monolítica e leve: PPNeueMontreal em peso 400 domina todos os títulos em escalas avantajadas (78–113px) com tracking negativo agressivo, fazendo os títulos parecerem esculturais em vez de informativos. O centro visual é uma constelação de minúsculas partículas triangulares multicoloridas formando uma silhueta de cérebro orgânico, que funciona como o gesto de assinatura da marca: conhecimento visualizado como inteligência distribuída, não como dado hierárquico. O layout segue um ritmo espaçoso em duas colunas: títulos grandes alinhados à esquerda pareados com texto de corpo generoso, flutuando sobre preto puro sem painéis, bordas ou cards. Os componentes são intencionalmente reduzidos à forma mais essencial: um botão em pílula violeta, links fantasma e blocos de texto em formato grande.

## Tokens de cor

| Nome | Valor | Token | Papel |
|------|-------|-------|------|
| Void | `#000000` | `--color-void` | Tela de fundo da página, fundos de seção, espaço negativo: preto puro é a superfície dominante, não cinza-escuro, criando o vazio que deixa os acentos cromáticos flutuarem |
| Bone White | `#ffffff` | `--color-bone-white` | Títulos, texto de corpo, preenchimentos de ícone, estado ativo de navegação: a única cor tipográfica, carregando a hierarquia máxima sobre o preto |
| Ash Gray | `#9a9a9a` | `--color-ash-gray` | Texto de navegação discreto, cor de link fantasma, rótulos secundários: recua atrás do texto primário sem ficar invisível |
| Silver Mist | `#bdbdbd` | `--color-silver-mist` | Texto de corpo terciário, informação em nível de legenda: o cinza legível mais discreto, para contexto de apoio |
| Electric Iris | `#8052ff` | `--color-electric-iris` | Botões de ação primária, marca do logotipo, acentos de marca: o único violeta saturado que sinaliza interatividade e identidade de marca contra o vazio preto |
| Saffron Spark | `#ffb829` | `--color-saffron-spark` | Texto de ênfase em destaque, links de acento, pontuação de atenção: amarelo quente que, contra o violeta, cria a tensão cromática da marca |
| Deep Verdant | `#15846e` | `--color-deep-verdant` | Tinta de superfície secundária, ponto de parada do gradiente do logotipo: aparece como a extremidade mais profunda do gradiente de marca e em lavagens de acento sutis |

## Tokens de tipografia

### PPNeueMontreal: fonte única em todos os contextos de interface. Tamanhos de destaque (78–113px) carregam títulos em peso 400 com tracking de -0,04em: o mesmo peso do texto de corpo, mas a escala massiva cria a hierarquia. O peso 200 (ultra-light) é reservado para o corpo de texto de 18px, uma escolha de assinatura: a maioria dos sites de IA/SaaS usa peso 400 no corpo, mas aqui o peso é reduzido para deixar os parágrafos leves e não agressivos. O peso 600 em 14px com tracking de 0,025em e caixa alta serve à navegação e rótulos pequenos. O peso 400 fazendo tanto o destaque de 113px quanto o corpo de 15px é incomum: significa que o sistema confia na escala, não no peso, para hierarquia. `--font-ppneuemontreal`
- **Substituto:** Inter
- **Pesos:** 200, 400, 600, 700
- **Tamanhos:** 12, 14, 15, 18, 24, 27, 36, 42, 48, 78, 113px
- **Altura de linha:** 0.81, 0.90, 1.00, 1.10, 1.20, 1.25, 1.30, 1.50
- **Tracking:** -4.52px em 113px, -3.12px em 78px, -1.68px em 42px, -0.48px em 24px, normal em corpo de 18px; 0,025em em navegação de 14px caixa alta
- **Recursos OpenType:** `"ss01" on`
- **Papel:** fonte única em todos os contextos de interface. Tamanhos de destaque (78–113px) carregam títulos em peso 400 com tracking de -0,04em. O peso 200 (ultra-light) é reservado para o corpo de texto de 18px. O peso 600 em 14px com tracking de 0,025em e caixa alta serve à navegação e rótulos pequenos.

### Escala tipográfica

| Papel | Tamanho | Altura de linha | Tracking | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.5 | normal | `--text-caption` |
| nav-label | 14px | 1.2 | 0.35px | `--text-nav-label` |
| body | 18px | 1.5 | normal | `--text-body` |
| heading-2xs | 24px | 1.25 | -0.48px | `--text-heading-2xs` |
| heading-xs | 27px | 1 | normal | `--text-heading-xs` |
| subheading | 36px | 1.2 | normal | `--text-subheading` |
| heading-sm | 42px | 1.2 | -1.68px | `--text-heading-sm` |
| heading | 48px | 1.1 | -1.68px | `--text-heading` |
| heading-lg | 78px | 1.1 | -3.12px | `--text-heading-lg` |
| display | 113px | 1.1 | -4.52px | `--text-display` |

## Espaçamento e formas

**Unidade base:** 6px

**Densidade:** confortável

### Escala de espaçamento

| Nome | Valor | Token |
|------|-------|-------|
| 6 | 6px | `--spacing-6` |
| 12 | 12px | `--spacing-12` |
| 18 | 18px | `--spacing-18` |
| 24 | 24px | `--spacing-24` |
| 30 | 30px | `--spacing-30` |
| 36 | 36px | `--spacing-36` |
| 60 | 60px | `--spacing-60` |
| 96 | 96px | `--spacing-96` |
| 120 | 120px | `--spacing-120` |

### Raio de borda

| Elemento | Valor |
|---------|-------|
| navegação | 24px |
| tags | 9999px |
| cards | 24px |
| botões | 24px |

### Layout

- **Largura máxima:** 1280px
- **Gap de seção:** 60-120px
- **Padding de card:** 24-38px
- **Gap de elemento:** 6-18px

## Componentes

### Botão de ação primária
**Papel:** pílula violeta preenchida, o único CTA interativo

Fundo #8052ff (Electric Iris), texto branco, raio de borda de 22,5px (pílula), padding vertical de 14,4px por padding horizontal de 15,96px. PPNeueMontreal 14px peso 400 ou 600, caixa alta com tracking de 0,025em. O raio alto (22,5px sobre uma altura de ~45px) cria um formato de pílula completo: suave, amigável, inconfundível como a ação primária.

### Botão de texto fantasma
**Papel:** link de texto sublinhado ou nu, ação secundária

Sem fundo, sem borda, cor #ffffff ou #9a9a9a. PPNeueMontreal 14px peso 400. Usado em itens de navegação e links inline. A ausência de qualquer contêiner faz a hierarquia visual vir inteiramente do peso e do tracking da tipografia.

### Composição de logotipo
**Papel:** marca + logotipo no cabeçalho

Pequeno ícone triangular em #8052ff (violeta) com um desvanecimento em gradiente até #15846e (verde-azulado), pareado com o logotipo em branco ao lado. O ícone é um fragmento angular estilizado, geométrico, de bordas afiadas, ecoando as partículas triangulares da visualização do herói.

### Card de membro de equipe
**Papel:** exibição de retrato + nome + função

Sem fundo, sem borda, sem sombra. Foto de retrato grande em retângulo arredondado (raio de cerca de 24px) com rótulo de função em 12px caixa alta #8052ff e nome em tipografia grande de destaque branca abaixo. Ícones sociais (Twitter, LinkedIn) aparecem como pequenos glifos inline. Os cards flutuam sobre a tela preta, separados apenas por espaço em branco.

### Ponto indicador de carrossel
**Papel:** indicador de posição de slide em carrosséis de equipe/investidores

Pequeno círculo preenchido de cerca de 8px de diâmetro, violeta #8052ff para o estado ativo. Pontos inativos são mais escuros ou omitidos. O padding é mínimo: fica direto no fluxo de conteúdo, sem contêiner.

### Visualização de constelação no herói
**Papel:** imagem de marca de assinatura, nuvem de partículas em formato de cérebro

Milhares de pequenos glifos triangulares (contornados, de 1 a 2px) em um espectro completo de cores vívidas (violeta, âmbar, verde-azulado, magenta, azul) formando uma silhueta orgânica de cérebro ou nuvem contra o preto puro. Partículas individuais também se espalham de forma ambiente pelo espaço ao redor. Essa é a imagem definidora do site: não uma imagem estática, mas um campo animado de pontos de luz.

### Bloco de título de seção
**Papel:** título avantajado alinhado à esquerda + texto de apoio

Layout assimétrico em duas colunas: título em 78–113px peso 400 PPNeueMontreal em branco com tracking de -0,04em, ocupando a metade esquerda. Texto de corpo em 18px peso 200 (ultra-light) em branco ou prata, com um pequeno rótulo em caixa alta (âmbar #ffb829) acima do texto. Sem caixas, sem bordas: composição tipográfica pura sobre o preto.

### Barra de navegação
**Papel:** navegação principal do site, alinhada ao topo

Fundo transparente, direto sobre a tela preta. Logo à esquerda, links de navegação ao centro/direita (Manifesto, Equipe, Blog) em 14px caixa alta PPNeueMontreal com tracking de 0,025em. Estado ativo ou hover: branco. Inativo: #9a9a9a. Um botão de acesso (pílula violeta preenchida) ancora a borda direita. Sem borda, sem desfoque de fundo na própria navegação.

### Campo ambiente de partículas
**Papel:** glifos triangulares espalhados decorativos

Pequenos triângulos contornados em várias cores cromáticas (#8052ff violeta, #ffb829 âmbar, #15846e verde-azulado, além de roxos e azuis diversos) espalhados em baixa opacidade pelo fundo, fora da constelação principal. Cria profundidade atmosférica sem competir com a visualização central.

## Faça e não faça

### Faça
- Use #8052ff (Electric Iris) exclusivamente em botões de ação preenchidos: nenhuma outra cor saturada deve aparecer como fundo de botão.
- Configure todo título em peso 400, nunca bold: a hierarquia vem da escala (78–113px) e do tracking (-0,04em), não do peso da fonte.
- Use PPNeueMontreal peso 200 no texto de corpo de 18px: o peso ultra-light é uma assinatura, não o substitua pelo peso 400.
- Mantenha o preto puro #000000 como fundo de toda seção: nunca use painéis em cinza-escuro ou superfícies de card; o vazio é o design.
- Aplique tracking de -0,04em em todos os tamanhos de destaque a partir de 42px, convertendo para aproximadamente -4,52px em 113px.
- Use raio de borda de 24px para botões, cards e elementos de navegação como token consistente: formatos em pílula só em tamanhos bem pequenos.
- Deixe a constelação de partículas ser a única imagem do herói: não introduza fotografia, ilustração ou captura de produto na região do herói.

### Não faça
- Não use violeta preenchido (#8052ff) em grandes blocos de fundo ou seções inteiras: é cor de botão e acento, não de superfície.
- Não configure texto de corpo em peso 400: o corpo em ultra-light (200) é o que distingue a experiência de leitura.
- Não introduza contêineres de card com bordas, sombras ou preenchimento de fundo: os elementos flutuam sobre o preto, só com espaço em branco.
- Não use a cor #0000ee (azul padrão de link de navegador): nunca especifique essa cor; use âmbar #ffb829 ou branco #ffffff para links.
- Não adicione gradientes a componentes de interface: a paleta é plana; gradientes pertencem só ao logotipo e à visualização de partículas.
- Não use fontes de sistema como substituto quando a geometria equivalente à PPNeueMontreal importar: use Inter como fallback, mas preserve a convenção de corpo em peso 200 e título em peso 400.
- Não coloque múltiplos botões preenchidos próximos: a pílula violeta é reservada para uma ação primária única por tela.

## Superfícies

| Nível | Nome | Valor | Propósito |
|-------|------|-------|---------|
| 0 | Void Canvas | `#000000` | Fundo de página inteira, todos os fundos de seção, o vazio base |
| 1 | Deep Verdant Tint | `#15846e` | Superfície de acento sutil para o gradiente de marca e a profundidade do logotipo |
| 2 | Electric Iris | `#8052ff` | Superfície mais alta: só botões preenchidos e elementos interativos ativos |

## Elevação

O sistema não usa sombras nem elevação. Toda hierarquia vem de escala, contraste de cor e espaço em branco sobre uma tela preta plana. A ausência de cards com sombra é deliberada: o vazio é o design, e qualquer sombra quebraria a qualidade de flutuação da tipografia e da constelação de partículas.

## Imagem

A imagem é inteiramente procedural e abstrata: sem fotografia, exceto retratos de equipe. A imagem de assinatura é uma nuvem densa de milhares de pequenas partículas triangulares contornadas em um espectro vívido completo (violetas, âmbares, verde-azulados, magentas, azuis) formando uma silhueta orgânica de cérebro ou rede neural. Esse campo de partículas é animado e funciona como arte de herói e identidade de marca. Partículas ambientes ao redor derivam em densidade menor pelo fundo da página. Os triângulos são contornados, com traço de 1 a 2px, bordas afiadas, em cores cromáticas saturadas: nunca em escala de cinza. Retratos de equipe aparecem como recortes grandes em retângulo arredondado (raio 24px), sem molduras ou sobreposições. Sem captura de produto, sem fotografia de estilo de vida, sem renders 3D: o sistema de partículas É a marca visual.

## Layout

Seções de sangria total sobre tela preta pura, largura máxima de conteúdo de cerca de 1280px centralizada. O herói é uma divisão assimétrica em duas colunas: título avantajado alinhado à esquerda (113px) com texto de corpo e CTA na metade esquerda, visualização de cérebro em partículas ocupando a metade direita em escala massiva. As seções seguintes alternam a composição em duas colunas (visual à esquerda/texto à direita, depois texto à esquerda/visual à direita), criando um ritmo de leitura em zigue-zague. Os gaps de seção são generosos (60–120px verticais). Sem grades de card, sem tabelas de preço, sem blocos de recursos multicoluna: o conteúdo vive em arranjos espaçosos de texto e visual em duas colunas. A navegação é uma barra superior mínima e transparente, sem barra lateral, sem mega-menu. A densidade é extremamente espaçosa: um ou dois elementos por viewport, nunca denso em informação.

## Guia de aplicação

## Referência rápida de cor
- Texto: #ffffff (primário), #9a9a9a (secundário), #bdbdbd (terciário)
- Fundo: #000000 (só a tela)
- Borda: nenhuma, o sistema não usa bordas ou divisores visíveis
- Acento: #ffb829 (Saffron Spark) para realces de ênfase
- ação primária: #8052ff (preenchimento de ação)

## Exemplos de componente

1. **Seção de herói**: tela #000000 de sangria total. Divisão em duas colunas. Esquerda: título em 78px PPNeueMontreal peso 400, #ffffff, tracking -3,12px, com o texto "Desbloqueie a sabedoria coletiva." Texto de corpo em 18px peso 200 PPNeueMontreal, #ffffff, largura máxima 480px. Acima do corpo, um pequeno rótulo em caixa alta em 14px peso 600, âmbar #ffb829, tracking 0,35px. Abaixo do corpo, um botão em pílula violeta preenchido: fundo #8052ff, texto branco, 14px peso 600 caixa alta, raio de borda 22,5px, padding vertical de 14,4px por padding horizontal de 16px. Direita: grande visualização de constelação de partículas (milhares de pequenos triângulos coloridos formando uma silhueta de cérebro).

2. **Título de seção + corpo**: fundo #000000. Título alinhado à esquerda em 42px PPNeueMontreal peso 400, #ffffff, tracking -1,68px. Texto de corpo de apoio em 18px peso 200 PPNeueMontreal, #bdbdbd, largura máxima 520px. Sem caixas, sem bordas, sem cards: o texto flutua sobre o vazio.

3. **Barra de navegação**: fundo transparente sobre preto. Esquerda: pequeno ícone triangular violeta (#8052ff) + logotipo em #ffffff 14px. Direita: links de navegação "Manifesto", "Equipe", "Blog" em 14px PPNeueMontreal peso 600, caixa alta, tracking de 0,025em, cor #9a9a9a (inativo) ou #ffffff (ativo). Extrema direita: pílula violeta preenchida com botão de acesso, fundo #8052ff, texto branco, raio 22,5px, 14px peso 600 caixa alta.

4. **Card de equipe**: sem fundo, sem borda. Foto de retrato grande com raio de borda de 24px. Acima do nome: rótulo de função "CO FOUNDER & CTO" em 12px PPNeueMontreal peso 400, #8052ff, caixa alta. Abaixo da foto: nome em 27px PPNeueMontreal peso 400, #ffffff. Ícones sociais inline em pequenos glifos na cor #9a9a9a.

5. **Indicador de carrossel**: dois pontos pequenos de cerca de 8px, preenchidos em #8052ff para a posição ativa, sem fundo ou borda ao redor do contêiner do ponto. Centralizado abaixo do conteúdo do carrossel, com gap de 30px.

## Início rápido

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-void: #000000;
  --color-bone-white: #ffffff;
  --color-ash-gray: #9a9a9a;
  --color-silver-mist: #bdbdbd;
  --color-electric-iris: #8052ff;
  --color-saffron-spark: #ffb829;
  --color-deep-verdant: #15846e;

  /* Typography: Font Families */
  --font-ppneuemontreal: 'PPNeueMontreal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --text-nav-label: 14px;
  --leading-nav-label: 1.2;
  --tracking-nav-label: 0.35px;
  --text-body: 18px;
  --leading-body: 1.5;
  --text-heading-2xs: 24px;
  --leading-heading-2xs: 1.25;
  --tracking-heading-2xs: -0.48px;
  --text-heading-xs: 27px;
  --leading-heading-xs: 1;
  --text-subheading: 36px;
  --leading-subheading: 1.2;
  --text-heading-sm: 42px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -1.68px;
  --text-heading: 48px;
  --leading-heading: 1.1;
  --tracking-heading: -1.68px;
  --text-heading-lg: 78px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -3.12px;
  --text-display: 113px;
  --leading-display: 1.1;
  --tracking-display: -4.52px;

  /* Typography: Weights */
  --font-weight-extralight: 200;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 6px;
  --spacing-6: 6px;
  --spacing-12: 12px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-36: 36px;
  --spacing-60: 60px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* Layout */
  --page-max-width: 1280px;
  --section-gap: 60-120px;
  --card-padding: 24-38px;
  --element-gap: 6-18px;

  /* Border Radius */
  --radius-3xl: 24px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-nav: 24px;
  --radius-tags: 9999px;
  --radius-cards: 24px;
  --radius-buttons: 24px;

  /* Surfaces */
  --surface-void-canvas: #000000;
  --surface-deep-verdant-tint: #15846e;
  --surface-electric-iris: #8052ff;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-void: #000000;
  --color-bone-white: #ffffff;
  --color-ash-gray: #9a9a9a;
  --color-silver-mist: #bdbdbd;
  --color-electric-iris: #8052ff;
  --color-saffron-spark: #ffb829;
  --color-deep-verdant: #15846e;

  /* Typography */
  --font-ppneuemontreal: 'PPNeueMontreal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography: Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --text-nav-label: 14px;
  --leading-nav-label: 1.2;
  --tracking-nav-label: 0.35px;
  --text-body: 18px;
  --leading-body: 1.5;
  --text-heading-2xs: 24px;
  --leading-heading-2xs: 1.25;
  --tracking-heading-2xs: -0.48px;
  --text-heading-xs: 27px;
  --leading-heading-xs: 1;
  --text-subheading: 36px;
  --leading-subheading: 1.2;
  --text-heading-sm: 42px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -1.68px;
  --text-heading: 48px;
  --leading-heading: 1.1;
  --tracking-heading: -1.68px;
  --text-heading-lg: 78px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -3.12px;
  --text-display: 113px;
  --leading-display: 1.1;
  --tracking-display: -4.52px;

  /* Spacing */
  --spacing-6: 6px;
  --spacing-12: 12px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-36: 36px;
  --spacing-60: 60px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* Border Radius */
  --radius-3xl: 24px;
  --radius-full: 9999px;
}
```
