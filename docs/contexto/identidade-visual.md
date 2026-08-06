# Identidade v3: a fundação

**Este arquivo é o contrato durável da identidade visual.** Ele substitui a
fundação do redesign v2 por inteiro. Toda cor, escala, forma e regra sai daqui.
O registro da decisão está em
`docs/decisoes/2026-08-05-identidade-v3.md`.

Origem dos valores:
`<repositorio vkoshub>/src/styles/tokens.css`.

---

## 1. O que NÃO muda

Escrito primeiro de propósito, porque é a maior parte e é o que evita
retrabalho.

- **A cascata.** Quatro camadas declaradas com `@layer`, da que perde para a que
  vence: `base` (global.css e primitivas.css), `externo` (o CSS do React Flow),
  `tela` (a folha de cada tela, mais canvas.css) e `tema` (visual-hub.css, que
  declara COR e só cor). A linha `@layer base, externo, tela, tema;` continua no
  topo de toda folha, antes de qualquer regra.
- **A régua e o espaçamento.** `--base: 4px` e os oito degraus
  (2, 4, 8, 12, 16, 24, 32, 48). Não abre degrau novo.
- **A altura de controle.** 28 / 32 / 40. É aqui que a densidade se decide, e
  ela não muda.
- **Os tamanhos de texto.** Os sete degraus, de 11px a 30px, com o corpo em
  14px. Entrelinha em px absoluto e par.
- **O empilhamento.** Os sete níveis de `--z-*`.
- **A opacidade.** Os cinco degraus.
- **Onde as folhas moram.** Folha ao lado do componente que ela veste. Em
  `estilos/` só o que é de todo mundo.
- **As quatro travas.** `camadas`, `contraste`, `densidade` e `escalas`. Elas
  são atualizadas, nunca afrouxadas.

---

## 2. O tema

Dois temas: `claro` e `escuro`. **O padrão passa a ser `escuro`.**

O tema vive em `data-theme` na raiz do documento, estampado por um script inline
em `app/web/index.html` ANTES do bundle carregar, lendo `localStorage`
`"vkos-tema"`. Não mexa nesse mecanismo sem atualizar o `index.html` junto,
senão a tela pisca no tema errado por um quadro.

O padrão de tema está escrito em DOIS lugares do app, e os dois mudam:
`app/web/index.html`, no script inline, e
`app/web/src/componentes/layout/Sidebar.tsx`, na função `lerTema()`, que tem o
próprio fallback para `"claro"`. Esquecer o segundo deixa o menu marcando o tema
errado. Uma varredura confirmou que não há um terceiro.

Em `visual-hub.css` o bloco do claro continua escrito como
`:root, :root[data-theme="claro"]`? **Não.** Ele passa a ser
`:root[data-theme="claro"]`, e o bloco do escuro passa a ser
`:root, :root[data-theme="escuro"]`. Quem não tem atributo cai no escuro.

---

## 3. A paleta

Três cores são da marca e são as mesmas nos dois temas: o quase preto
`#0a0a0a`, o off-white `#f0eee6` e a menta `#7ed9b2`. O que gira é o papel de
cada uma. No escuro o quase preto vira o fundo e o off-white vira a letra.

**Os 36 tokens, nos dois temas.** Este é o conteúdo de `visual-hub.css`.

| token | claro | escuro | trabalho |
|---|---|---|---|
| `--chassi` | `#e8e5da` | `#050505` | barra lateral e barra de topo. A moldura recua |
| `--fundo` | `#f0eee6` | `#0a0a0a` | o plano de trabalho. O conteúdo se apoia AQUI |
| `--superficie` | `#faf9f5` | `#171717` | painel, cartão, cabeçalho fixo |
| `--superficie-alta` | `#dfdbcc` | `#2a2a2a` | hover, linha selecionada, campo, aba ativa |
| `--superficie-flutuante` | `#faf9f5` | `#1c1c1c` | popover, menu, modal |
| `--papel` | `#ffffff` | `#ffffff` | papel do site do CLIENTE. Não acompanha o tema |
| `--carvao` | `#151515` | `#000000` | terminal, capa, rodapé. Escuro nos dois temas |
| `--linha` | `#d8d3c4` | `#2e2e2e` | separação e decoração |
| `--linha-forte` | `#7d7768` | `#7b776e` | contorno de CONTROLE. Obrigada a 3:1 |
| `--texto` | `#0a0a0a` | `#f0eee6` | conteúdo, título, valor |
| `--texto-suave` | `#3b3b3b` | `#c9c6bc` | descrição, subtítulo, rótulo de campo |
| `--texto-fraco` | `#5a5750` | `#a5a199` | metadado, dica, placeholder |
| `--texto-rotulo` | `#6e6a60` | `#8b8781` | SÓ rótulo de grupo de navegação |
| `--sobre-painel` | `#f0eee6` | `#f0eee6` | texto sobre o carvão. Não segue o tema |
| `--apoio-painel` | `#a8a49a` | `#a5a199` | apoio sobre o carvão |
| `--menta-painel` | `#7ed9b2` | `#7ed9b2` | a menta da marca, sobre o carvão. Não segue o tema |
| `--menta` | `#0f6b4a` | `#7ed9b2` | menta legível: texto, ícone de estado, link |
| `--menta-viva` | `#1f8a63` | `#7ed9b2` | o SINAL. Nunca texto |
| `--menta-tenue` | `#dcefe4` | `#16302a` | preenchimento de selo e de faixa boa |
| `--menta-linha` | `#0f6b4a` | `#7ed9b2` | contorno de campo em foco |
| `--sobre-menta` | `#f0eee6` | `#0a0a0a` | tinta sobre menta cheia |
| `--acao` | `#0a0a0a` | `#f0eee6` | a ação principal. Uma por tela |
| `--acao-hover` | `#1f1f1f` | `#ffffff` | |
| `--sobre-acao` | `#f0eee6` | `#0a0a0a` | |
| `--alerta` | `#9b2c20` | `#ff8f80` | erro, destrutivo |
| `--sobre-alerta` | `#f0eee6` | `#2a0d0d` | |
| `--alerta-tenue` | `#f7e3e0` | `#3a1b1b` | |
| `--alerta-linha` | `#9b2c20` | `#ff8f80` | |
| `--aviso` | `#7a5310` | `#e8c06a` | atenção, ainda não é erro |
| `--aviso-tenue` | `#f4ebd8` | `#332a12` | |
| `--aviso-linha` | `#7a5310` | `#e8c06a` | |
| `--neutro-tenue` | `#dfdbcc` | `#2a2a2a` | selo neutro, contagem |
| `--canvas-fundo` | `#e8e5da` | `#050505` | o plano do grafo |
| `--pontos-canvas` | `#c7c1b0` | `#262626` | a grade do grafo |
| `--ligacao` | `#655f52` | `#7b776e` | aresta em repouso |
| `--ligacao-viva` | `#0f6b4a` | `#7ed9b2` | aresta sendo arrastada |

### 3.1 Os canais RGB

Continuam existindo, para os usos com alpha (glow, véu, sobreposição). Cada um
é o mesmo hex da tabela acima, em canal:

| token | claro | escuro |
|---|---|---|
| `--menta-rgb` | `15, 107, 74` | `126, 217, 178` |
| `--menta-viva-rgb` | `31, 138, 99` | `126, 217, 178` |
| `--acao-rgb` | `10, 10, 10` | `240, 238, 230` |
| `--scrim-rgb` | `10, 10, 10` | `0, 0, 0` |
| `--alerta-rgb` | `155, 44, 32` | `255, 143, 128` |
| `--aviso-rgb` | `122, 83, 16` | `232, 192, 106` |
| `--fundo-rgb` | `240, 238, 230` | `10, 10, 10` |
| `--superficie-rgb` | `250, 249, 245` | `23, 23, 23` |
| `--texto-rgb` | `10, 10, 10` | `240, 238, 230` |
| `--suave-rgb` | `59, 59, 59` | `201, 198, 188` |
| `--fraco-rgb` | `90, 87, 80` | `165, 161, 153` |
| `--linha-forte-rgb` | `125, 119, 104` | `123, 119, 110` |

**`--veu` passa a ser declarado NOS DOIS blocos, e isso não é detalhe.** Hoje
ele existe só no bloco escuro, e `contraste.test.ts` isenta ele por escrito, com
a justificativa de que no Claro ele é composto a partir de `--scrim-rgb` no
`global.css`. Com a inversão dos seletores da seção 2, o bloco escuro passa a
casar em `:root`, e todo token declarado só nele passaria a valer também no
claro: o véu do Claro viraria o do Escuro, em silêncio, com os testes verdes.

Então: `--veu: rgba(var(--scrim-rgb), 0.4)` no claro e
`--veu: rgba(0, 0, 0, 0.66)` no escuro, os dois em `visual-hub.css`. A isenção
nomeada em `contraste.test.ts` sai junto, e o teste "os dois temas declaram
exatamente o mesmo conjunto de tokens" passa a valer sem exceção nenhuma.

**A regra geral que fica:** depois da inversão, nenhum token pode existir em um
bloco só.

### 3.2 O contraste, medido

A paleta acima foi medida par a par antes deste plano existir, pela fórmula do
WCAG 2.2. **122 medições, 61 por tema, zero reprovação.**

Atenção ao número, porque ele não é o do teste. `contraste.test.ts` tem hoje
**46 pares por tema**. As 61 medições são um superconjunto: elas cobrem os
mesmos 46 e acrescentam o que a paleta nova trouxe. Com os tokens novos, o teste
passa a ter **51 pares por tema**: os 46 de hoje mais os três papéis do carvão
sobre o carvão, mais `--aviso` e `--menta` contra os planos que ainda não eram
medidos. **O número que a fase 1 tem que fechar é 51 por tema, e a lista nunca
encolhe.**

Os pisos aplicados:

- Texto contra os quatro planos: 4,5:1.
- `--texto-rotulo` contra os quatro planos: 3:1. É a única exceção de texto, e
  ela existe porque rótulo de grupo de navegação é orientação, não conteúdo.
- `--menta` como texto: 4,5:1. `--menta-viva` como sinal: 3:1, critério 1.4.11.
- `--linha-forte` contra os quatro planos: 3:1.
- `--sobre-acao` sobre `--acao` e sobre `--acao-hover`: 4,5:1.
- Cada `X` sobre o `X-tenue` dele: 4,5:1.
- Os três papéis do carvão sobre o carvão: 4,5:1.
- Texto, contorno e aresta sobre `--canvas-fundo`: 4,5:1 e 3:1.

Os números mais apertados, que são os que vão quebrar primeiro se alguém mexer:

| par | claro | escuro | piso |
|---|---|---|---|
| `--linha-forte` sobre `--superficie-alta` | 3,21:1 | 3,22:1 | 3 |
| `--menta-viva` sobre `--superficie-alta` | 3,11:1 | 8,51:1 | 3 |
| `--menta` sobre `--superficie-alta` | 4,70:1 | 8,51:1 | 4,5 |
| `--texto-rotulo` sobre `--superficie-alta` | 3,89:1 | 4,02:1 | 3 |
| `--aviso` sobre `--superficie-alta` | 4,93:1 | 8,32:1 | 4,5 |

### 3.3 Os três valores que a identidade não podia entregar direto

A identidade foi desenhada para uma página, e a página não põe controle com
contorno em cima da lavagem. O Hub põe: aba ativa, campo dentro de linha
selecionada, botão neutro sobre hover. Três valores tiveram que ser calibrados,
e o motivo fica registrado:

**`--linha-forte` claro: `#857f6e` virou `#7d7768`.** O original dava 2,88:1
sobre a lavagem `#dfdbcc`, abaixo do piso de 3:1 de componente. O ajuste é o
menor passo que fecha em 3,21:1.

**`--linha-forte` escuro: `#726e66` virou `#7b776e`.** Mesmo caso, 2,83:1 sobre
`#2a2a2a`. Fecha em 3,22:1.

**`--menta-viva` claro: a menta da marca `#7ed9b2` NÃO pode ser o sinal.** Ela
dá 1,45:1 sobre a página, e o ponto de estado pulsante do Hub é componente de
interface, não decoração: o critério 1.4.11 pede 3:1. O sinal no claro passa a
ser `#1f8a63`, um degrau acima da menta de texto `#0f6b4a`, fechando 3,11:1 no
pior plano.

**A menta da marca continua aparecendo no tema claro**, e no lugar certo: sobre
o carvão, como `--menta-painel`. É exatamente o que a identidade diz, com o
número dela: contra o carvão ela dá 10,83:1 e aí sim carrega texto.

**Um quarto valor, que não vem da identidade: `--ligacao` no claro é `#655f52`.**
A aresta do canvas de grafo não existe na página de identidade, e o piso do
teste para ela é 3:1. Mas a versão anterior do Hub já tinha subido essa cor de
propósito, com o motivo escrito na folha: aresta de 2px se perde no meio do
canvas com 3:1. O valor novo mantém a mira de 4,5:1 daquela decisão e fecha em
5,03:1. Não baixe ele para casar com `--linha-forte`.

---

## 4. A tipografia

### 4.1 As três vozes

| token | valor | quando |
|---|---|---|
| `--fonte-display` | `"Geist", ui-sans-serif, system-ui, sans-serif` | título e display |
| `--fonte` | `"Geist", ui-sans-serif, system-ui, sans-serif` | corpo, botão, rótulo, link |
| `--mono` | `"Geist Mono", ui-monospace, "Cascadia Code", Consolas, monospace` | terminal, token, metadado, dado numérico |

Display e interface são a mesma família de propósito. O que separa as duas vozes
é tamanho, tracking e peso, não desenho de letra.

**Os arquivos são embarcados, nunca CDN.** Eles vêm de
`@fontsource-variable/geist` e `@fontsource-variable/geist-mono`, sob SIL Open
Font License 1.1, e moram em `app/web/src/fontes/`:

```
geist-latin-wght-normal.woff2          29 KB
geist-latin-ext-wght-normal.woff2      17 KB
geist-mono-latin-wght-normal.woff2     23 KB
LICENSE-Geist.txt
```

O `@font-face` declara `font-weight: 100 900` e `font-display: swap`, igual o
Inter fazia. O `latin-ext` entra com `unicode-range` para não baixar sem
precisar.

### 4.2 A regra que muda a cara de tudo

**Título não é negrito. Nunca.**

A autoridade vem do tamanho e do tracking apertado. Título de tela, título de
seção e título de cartão passam a ser `--peso-normal` (400). O peso 500 fica
para ênfase dentro de texto, rótulo de botão e item de menu ativo.

**O padrão de peso de título não mora na primitiva, mora no reset.**
`global.css` tem `h1, h2, h3 { font-weight: var(--peso-medio) }`, e é daí que
vem o peso de todo título do app. É essa linha que vira `--peso-normal`.
Trocar só os cinco seletores de `primitivas.css` e esquecer o reset deixa a
metade dos títulos em 500.

Isso derruba o uso de `--peso-forte` (600) em título. Ele continua existindo,
para nome próprio e coluna de tabela.

`--peso-pesado` (700) continua só em número e wordmark, e `densidade.test.ts`
continua reprovando fora disso.

### 4.3 A escala, que não muda de tamanho

Os sete degraus continuam com os mesmos px, entrelinha e tracking da fundação
anterior. O que muda é quem usa peso 400.

O degrau de topo, `--txt-display` (30 / 36, tracking -0,021em), passa a ser **a
voz editorial**: peso 400, e ele aparece no título de tela do CORE, no estado
vazio, na Cerimônia e no topo do Assistente. É o mais perto que o Hub chega do
display de 4.5rem da identidade sem virar site.

---

## 5. A forma

O raio da identidade é binário: pílula ou card, sem meio-termo inventado. A
tradução para os cinco degraus do Hub:

| token | antes | agora | quando |
|---|---|---|---|
| `--raio-p` | 4px | **6px** | chip, selo, miniatura, caixa de seleção, campo |
| `--raio` | 6px | **8px** | item de menu, cartão pequeno, item de lista |
| `--raio-g` | 10px | **12px** | painel, popover, mídia, bloco de terminal |
| `--raio-gg` | 14px | **16px** | modal, cartão grande, camada de tela cheia |
| `--raio-pilula` | 999px | `9999px` | botão, tag, aba, contagem, ponto, avatar |

**Os nomes do Hub ficam.** As 29 folhas já escrevem `--raio-p`, `--raio`,
`--raio-g`, `--raio-gg` e `--raio-pilula`, e renomear tudo isso seria 126
edições para não mudar um pixel. O que muda é o VALOR, num arquivo só. Os cinco
degraus da identidade caem em cima dos cinco do Hub, um a um: `--raio-campo` 6
vira `--raio-p`, `--raio-card-sm` 8 vira `--raio`, `--raio-media` 12 vira
`--raio-g`, `--raio-card` 16 vira `--raio-gg`. São 189 usos espalhados pelas
folhas, e nenhum deles precisa ser tocado.

**A pílula ganha trabalho, com duas exceções escritas.**

Na identidade ela é a forma de assinatura: botão, tag e aba são pílula. No Hub,
**o botão com texto passa a ser pílula**. Campo, painel e modal continuam com
raio.

**`.botao-icone` NÃO vira pílula.** Ele é quadrado por definição
(`width: var(--alt); padding: 0`), então pílula nele é círculo, e um círculo de
28px ao lado de um retângulo de 28px na mesma barra de ferramentas lê como dois
sistemas. Ele fica com `--raio`.

**`.aba` NÃO vira pílula, e não muda.** Ela não tem raio nenhum hoje: a aba
ativa se marca por um fio embaixo, `box-shadow: inset 0 -2px 0 0 var(--acao)`, e
o comentário na primitiva registra que pílula na aba ativa foi o que transformou
o menta em decoração na versão anterior. Dar raio a uma aba sem preenchimento
não muda um pixel, e dar preenchimento reabre um erro já pago.

---

## 6. A profundidade

A identidade tem dois recursos e **eles nunca se empilham**: o tom da superfície
separa camada em fundo liso, e uma sombra larga e rasa levanta o card quando o
fundo tem textura.

O Hub ganha o anel de um pixel como recurso padrão, que ele não tinha:

| token | claro | escuro | quando |
|---|---|---|---|
| `--anel` | `0 0 0 1px rgba(10,10,10,.12)` | `0 0 0 1px rgba(240,238,230,.1)` | separar em fundo liso, sem sugerir que levantou |
| `--anel-foco` | `0 0 0 1px rgba(10,10,10,.2)` | `0 0 0 1px rgba(240,238,230,.22)` | o mesmo anel, mais forte, em hover e foco |

**Os dois anéis moram em `visual-hub.css`**, um valor por tema. Eles podem: não
estão em nenhuma lista de `escalas.test.ts`, e `densidade.test.ts` aceita
qualquer `--propriedade` na camada tema desde que seja cor. E eles precisam: o
anel do claro é tinta escura, o do escuro é tinta clara, e isso não se compõe de
um token só.

**As três sombras continuam em `global.css`, e continuam compostas.** Elas são
`--sombra-popover`, `--sombra-modal` e `--sombra-arrasto`, e as três estão na
lista `ELEVACAO` de `escalas.test.ts`, que exige que elas sejam declaradas na
base E proíbe que a camada tema as redeclare. Por isso elas não podem ganhar
valor por tema: elas seguem sendo escritas com `rgba(var(--scrim-rgb), α)`, e
quem gira com o tema é o `--scrim-rgb`.

Os valores novos, mais rasos e mais largos, no espírito da identidade:

```css
--sombra-popover: 0 10px 28px -16px rgba(var(--scrim-rgb), 0.3);
--sombra-modal: 0 16px 36px -18px rgba(var(--scrim-rgb), 0.36);
--sombra-arrasto: 0 12px 24px -20px rgba(var(--scrim-rgb), 0.5);
```

**Sombra quase não lê sobre escuro**, e é por isso que o anel existe. No tema
Escuro, o que separa o que flutua é o anel mais a superfície um degrau acima,
não a sombra. Quem precisa dos dois escreve os dois:
`box-shadow: var(--anel), var(--sombra-modal)`.

`densidade.test.ts` reprova `box-shadow` fora dos tokens autorizados, e a lista
passa a incluir `--anel` e `--anel-foco`. Continua sendo proibido inventar um
quarto token de sombra.

**Uma regra escrita muda com isto, e ela precisa ser reescrita junto.**
`densidade.test.ts`, por volta da linha 178, diz que anel externo de 0px de
desfoque não entra, porque `0 0 0 1px` somado a uma `border` é uma borda de 2px
escrita em duas propriedades. A frase continua verdadeira, e vira condição:
**anel e `border` nunca no mesmo elemento.** Quem tem `--anel` não tem borda, e
quem tem borda não tem anel. O comentário do `global.css` que diz que a
profundidade vem da escada mais o fio de `--linha` ganha o anel como terceiro
recurso.

---

## 7. O movimento

Uma curva só, de saída exponencial. Nada de salto, nada de elástico.

| token | valor | quando |
|---|---|---|
| `--curva` | `cubic-bezier(0.16, 1, 0.3, 1)` | tudo |
| `--mov-rapido` | `110ms` | hover, foco, pressão, mudança de cor |
| `--mov-padrao` | `180ms` | popover, aba, painel, faixa |
| `--mov-lento` | `280ms` | modal, gaveta, camada de tela cheia |

A identidade usa 180 / 260 / 620. O Hub fica com 110 / 180 / 280, porque o que a
pessoa dispara dezenas de vezes por dia fica abaixo de 150ms e num cockpit isso
é quase tudo. **O teto de 280ms continua travado.**

`--curva-simetrica` e `--curva-saida` são apagadas. A identidade tem uma curva
só, e ter três era herança do método do Carbon que a identidade nova não segue.
Quem usava as duas passa a usar `--curva`.

---

## 8. A textura

A grade pontilhada de fundo. Ela fica **parada**: o conteúdo sobe por cima, e é
o efeito de janela.

### 8.1 O jeito da identidade não serve aqui, e isso já estava escrito

A identidade monta a textura como `position: fixed; inset: 0; z-index: -1`, uma
camada presa na viewport atrás do site inteiro. **No Hub isso é proibido, e a
proibição é anterior a este plano.**

`app/web/src/estilos/global.css`, no bloco que documenta `--pontos-canvas`, diz
com todas as letras: a grade pinta o background de QUEM É o plano de fundo,
**nunca um pseudo-elemento fixo de viewport**, porque fixo ela vaza por toda
superfície translúcida e pontilha a interface inteira. `camadas.test.ts` guarda o
registro de que `--pontos-fundo`, `--grao` e `--vidro` saíram do sistema quando a
textura anterior saiu. E `docs/decisoes/2026-07-30-a-grade-do-canvas-vem-do-react-flow.md`
fechou o assunto.

Um site tem uma superfície translúcida. O Hub tem popover, menu, modal, véu,
gaveta, lightbox e o painel flutuante do Studio. Camada fixa atrás de tudo
aparece dentro de cada um deles.

Some-se a isso um fato de execução: `componentes/layout/barra.css` pinta
`background: var(--fundo)` em `.shell` e em `.shell-conteudo`, e o segundo é
posicionado. Uma camada fixa com `z-index: 0` nasceria coberta. Dezesseis folhas
pintam `var(--fundo)`.

### 8.2 O jeito que vale

**A textura pinta o background do elemento que É o plano de trabalho.** Nada de
camada nova, nada de elemento novo, nada de `position: fixed`.

```css
/* em barra.css, no .shell-conteudo, que JA e o plano de trabalho */
background-color: var(--fundo);
background-image: radial-gradient(circle, var(--ponto-cor) 0.5px, transparent 0.5px);
background-size: var(--ponto-tamanho) var(--ponto-tamanho);
```

Os tokens:

```css
--ponto-tamanho: 22px;                       /* global.css, camada base   */
--ponto-cor: rgba(var(--linha-forte-rgb), 0.2);   /* visual-hub.css, claro  */
--ponto-cor: rgba(var(--linha-forte-rgb), 0.12);  /* visual-hub.css, escuro */
```

12% é o piso útil no escuro. Abaixo de 8% a textura some e o fundo vira liso.

**Onde ela vale:** o plano de trabalho das telas de lista, do Dashboard, do
Assistente e dos estados vazios. O `.shell-conteudo` é esse plano. A classe
`.textura` também pode compor uma ilha que já tenha material próprio, como a
capa do cartão de workspace sobre `--carvao`. Ela declara só o padrão: a cor
continua sendo responsabilidade do plano ou da ilha.

**Onde ela NÃO vale, e isso é trava:** dentro do canvas do Cockpit e do Mapa,
que já têm a grade do React Flow vinda de `--pontos-canvas`. Os dois cobrem o
plano com `--canvas-fundo` opaco, e isso já é o comportamento de hoje: o do
Cockpit está em `estilos/canvas.css`, o do Mapa em `componentes/mapa/mapa.css`.
Confira os dois, não presuma.

E ela não vale em popover, menu, modal nem em nenhuma superfície que flutua.
Como ela pinta o plano e não a viewport, isso sai de graça.

---

## 9. O carvão

O painel mais fundo do sistema, e o único que desce em vez de subir. Escuro nos
dois temas.

**Onde ele é usado no Hub:** o terminal da VKOS-IDE, o bloco de saída de sessão,
o rodapé de status da barra lateral e a capa do cartão de workspace.

Dentro dele, três tokens de papel que não seguem o tema: `--sobre-painel` para o
texto, `--apoio-painel` para o apoio, e `--menta-painel` para o que sinaliza. É
o único lugar do tema Claro onde a menta da marca carrega texto.

**A regra que vem junto, e que a identidade paga caro para dizer:** a elevação
nunca mora dentro da ilha. Sombra e anel são relativos ao que está atrás, e o
que está atrás é a página. Se a sombra nascer dentro do bloco carvão, ela usa o
tema errado e a silhueta some no fundo.

---

## 10. A composição das primitivas

Três réguas decidem como o conteúdo se agrupa. Elas não criam cor, escala,
curva, raio nem duração nova.

**Chassi segura. Plano é onde se trabalha. Unidade é o que se compara.** Chassi
usa `--chassi` e um fio no lado que encosta. O plano usa `--fundo` com a textura
de pontos. Unidade comparável usa `--superficie`, fio e `--raio-g`. Antes de dar
material próprio a alguma coisa, pergunte: ela segura, é onde se trabalha ou é
uma entre várias que se comparam? Se não for nenhuma das três, ela mora no
plano.

**A caixa é para o que se compara. O plano é para o que se lê.** Coleções de
unidades independentes usam cartão ou painel. Uma região de trabalho contínua
não ganha moldura só para separar layout. O critério de cartão é conteúdo que
sustente a própria área, não a existência de imagem.

**Cor e espaço separam primeiro.** Fio entra quando a cor não basta. Moldura
entra somente quando o conteúdo é uma unidade comparável. Fio sem informação
sai.

**Caixa dentro de caixa é proibida.** Lista dentro de painel usa
`.lista.embutida` e perde a própria moldura. Estado vazio, cabeçalho, barra de
ferramentas e faixa vivem no plano ou na unidade que já os contém.

---

## 10b. Os dois registros: denso e editorial

Criado em 2026-08-05. Ver
[a decisão](../decisoes/2026-08-05-o-modo-editorial.md).

A fundação descrevia um tipo de tela, e o Hub tem dois. Este é o segundo.

**Operação densa** é o CRM, a fila, o inspetor, o canvas, a IDE, o editor. A
pessoa fica ali horas e compara linha com linha. Controle de 28, 32 e 40px,
corpo de 14px, `--raio-g` e **nenhuma sombra**. É o padrão: tela que não declara
o contrário é densa.

**Painel editorial** é o Dashboard do CORE, a tela de Workspaces, o Início do
workspace e o Instagram. A pessoa chega, lê o que manda e decide. Ela não compara
linha com linha.

| | denso | editorial |
|---|---|---|
| unidade | `.painel`, `.cartao` | `.cartao-editorial` |
| grade | própria da folha | `.grade-editorial` |
| número | `--txt-display`, peso 600 | `.numero-editorial` (40px), `.numero-capa` (52px), peso 700 |
| rótulo do número | `.rotulo` | `.rotulo-caps` |
| raio | `--raio-g` | `--raio-ggg` |
| respiro interno | `--esp-16` | `--esp-24`, `--esp-32` na capa |
| sombra | nenhuma | `--sombra-cartao` |

**O que o modo editorial NÃO afrouxa.** Cor continua só por token. Régua de 4px
continua. Teto de 280ms continua. E **título continua no peso 400**: a
autoridade dele vem de tamanho e tracking, e o peso 700 é do NÚMERO, que a
seção 4 já autorizava. Se o seu título precisa engordar, o problema é a escala.

**A única regra que este modo derruba** é "não flutua, tire a sombra".
`--sombra-cartao` é elevação em repouso, e existe porque no tema Claro `--fundo`
e `--superficie` estão a 10 pontos: a caixa some sem ela. Ela vale **só aqui**.
Em tela densa a regra antiga continua, e a trava continua reprovando sombra em
cartão de lista, linha de tabela e nó de canvas.

**Como escolher.** Se a sua tela tem tabela, fila ou canvas, ela é densa, e usar
o modo editorial vai deixar ela pior. Se ela é lida de relance e o que manda
nela é um punhado de números ou uma imagem, ela é editorial.

**Editorial não quer dizer "tem capa".** O Início do workspace é editorial e
**não tem capa**, de propósito: o que manda nele é imagem, não número, e a única
capa possível ali seria "5 peças esta semana", que é dado de enfeite. Capa se põe
quando existe número que muda uma decisão. Ver
[a decisão](../decisoes/2026-08-05-a-moldura-tambem-tem-registro.md).

**Imagem nunca vira lista.** Este erro já foi cometido duas vezes em telas
diferentes na mesma semana: miniatura de 40px na primeira aba do Instagram, e
tira horizontal de 156px nas criações recentes do workspace. Quando o registro
tem foto, a foto manda, e o formato é grade de quadrados com no mínimo 220px de
coluna. As duas telas têm trava para isso.

**Uma tela pode ter os dois registros, e a campanha de anúncios tem.** O corpo
dela é denso e continua denso, com razão: são 45 linhas de campo com contador de
caracteres e botão de copiar, e quem está ali confere campo a campo antes de
colar no painel do Google. Uma linha dessas em 40px caberia em quatro por tela.
Mas o bloco de orçamento é numérico, e a capa responde "quanto isso vai me
custar", que é a primeira pergunta de quem abre uma campanha.

A regra que faz os dois conviverem: **escala de número só onde há número.** Não
se espalha o degrau de 52px pelos blocos de texto, e não se "padroniza" a capa
para o corpo de 14px. `composicao-anuncio.test.ts` trava os dois lados, porque
essa mistura estraga nas duas direções.

**A capa.** `.capa-editorial` é a ilha carvão no topo de uma tela editorial, onde
mora o dado principal, no degrau de 52px. Sobre carvão os papéis não seguem o
tema: use `--sobre-painel`, `--apoio-painel` e `--menta-painel`, nunca `--texto`.

**A aba do Instagram fica FORA deste contrato**, inteira, por decisão do Jesse em
2026-08-05. Ela tem paleta, escala e densidade próprias em `PENDENTES`. Já foi
tentado migrar ela para o modo editorial e a tela ficou pior; o registro do que
se perdeu está na decisão. **Não migre sem provar antes, em foto, que não perde
nada, e sem mostrar para ele.**

O gradiente da marca dela também não se empresta: o Dashboard do CORE usa a nossa
capa, em carvão e menta.

---

## 10c. A moldura: a barra lateral

Criada em 2026-08-05. Ver
[a decisão](../decisoes/2026-08-05-a-moldura-tambem-tem-registro.md).

A barra é o terceiro registro, e ela não é nem densa nem editorial: ela é
**moldura**. Ela apresenta o trabalho, então ganha ar e forma para não parecer de
outro produto ao lado de uma tela editorial, mas nunca ganha autoridade.

| | valor | por quê |
|---|---|---|
| largura | `calc(var(--base) * 66)`, 264px | fecha na régua de 4px |
| recuo lateral | `--esp-12` | 8px sufocava a coluna |
| item | `--alt-g`, `--raio-g`, vão de `--esp-2` | 1px de vão não é respiro, é falha de renderização |
| hover | `--superficie` | **nunca igual ao selecionado** |
| selecionado | `--superficie-alta` + fio inset em `--acao` | dois degraus acima do parado |
| peso do item ativo | `--peso-medio` | a v3 reserva peso maior a número e wordmark |
| rodapé | `--carvao`, `--raio-ggg`, `--esp-12` | a mesma ilha da capa e do cartão |
| gasto do projeto | `--txt-titulo`, `--peso-forte`, tabular | é o único dado da coluna |

**A regra que a trava afirma, e ela existe porque o defeito durou meses:** hover e
selecionado **não podem pintar a mesma superfície**. Enquanto pintaram, a única
diferença entre "o mouse está em cima" e "você está nesta tela" era um fio de 2px,
e com o ponteiro parado sobre um vizinho a barra dizia que havia duas telas
abertas. Ninguém escreve isso de propósito: acontece quando se copia o bloco do
hover para fazer o do ativo e se troca só o `box-shadow`.

**O gasto do rodapé pesa 600, e não 700.** 700 é de número de painel de leitura e
do wordmark. Moldura não é painel.

Sobre o carvão do rodapé valem os papéis do painel: `--sobre-painel` para o valor
e `--apoio-painel` para o resto, nunca `--texto`.

---

## 10d. O estilo do dono: cor e forma viram dado de execução

Criado em 2026-08-05. Ver
[a decisão](../decisoes/2026-08-05-o-criador-de-estilos.md).

Este arquivo continua sendo o contrato da identidade **VKOS**, que é o padrão do
Hub e o que o produto entrega instalado. O que muda é que o dono passa a poder
criar estilos dele, no nível CORE, e um estilo aprovado veste o Hub inteiro.

**O que um estilo alcança:** os 35 tokens de cor, por tema, e os cinco degraus de
raio em três conjuntos (reto, padrão, redondo). O que ele troca é o VALOR, e os
degraus continuam sendo cinco: a proibição 5 segue de pé.

**O que ele não alcança, e isso é decisão:** escala de texto, régua de 4px,
altura de controle, movimento, peso e `--papel`. São eles que seguram a densidade
do cockpit, e nenhuma trava executável cobriria um estilo que os mexesse. A seção
1 deste arquivo continua descrevendo o que não muda para ninguém.

**A régua é a mesma.** `server/src/estilos/contraste.ts` tem a fórmula do WCAG
2.2, a lista de pares e os pisos da seção 3.2, e `server/src/estilos/regua.test.ts`
afirma que o Escuro e o Claro de fábrica passam nela. Régua frouxa deixa passar
cor ruim; régua rígida reprova o próprio Escuro e o teste cai.

**Ela mede também as sete capas de workspace.** As capas são fixas em
`global.css`, mas quem vai por cima delas (`--sobre-painel`, `--apoio-painel`,
`--menta-painel`) é do estilo, e um estilo que escurecesse os papéis do carvão
apagaria o nome do projeto em todo cartão.

**Um estilo tem sempre os dois lados.** O dono edita um, o Hub deriva o outro, e
o botão de sol e lua continua fazendo o que fazia. Os três papéis do carvão
atravessam sem mudar: a ilha é escura nos dois temas, então a tinta dela é a
mesma nos dois.

**O mecanismo não toca a cascata.** Os tokens entram como propriedade
customizada inline na raiz do documento: inline vence toda camada por definição,
tudo herda por `var()`, e tirar as propriedades devolve o app à identidade de
fábrica. As quatro camadas continuam exatamente como estão.

**`data-estilo` entra junto com `data-theme`, e isso é obrigatório.** Três
lugares do app leem o valor computado de um token e mandam o literal para dentro
de um iframe (o motor de carrossel, o palco do Studio e o marcador de seta do
React Flow). Quem precisar reagir a troca de paleta usa `aoTrocarPaleta`, de
`web/src/estilos/paleta.ts`, e nunca escreve `attributeFilter` na mão:
`estilos/paleta.test.ts` varre o app por padrão e reprova quem escrever.

---

## 11. As proibições

As da fundação anterior continuam valendo. Estas são as que a identidade nova
acrescenta ou aperta:

1. **Nenhum título em negrito.** Peso 400 em título de tela, de seção e de
   cartão. A autoridade vem do tamanho.
2. **Nenhum botão colorido.** A ação principal é tinta sólida. A menta nunca é
   fundo de botão.
3. **Menta como texto sobre claro só na `--menta` (`#0f6b4a`).** A menta da
   marca `#7ed9b2` sobre fundo claro é 1,45:1: ela marca e decora, nunca
   escreve.
4. **Nenhuma cor fora de token.** Nenhum hex, `rgb()` ou nome de cor em folha de
   componente. Só `var(--token)` e `rgba(var(--token-rgb), α)`.
5. **Nenhum raio fora dos cinco.**
6. **Nenhuma duração acima de 280ms, e uma curva só.**
7. **Nenhuma sombra fora dos cinco tokens** (as três sombras mais os dois
   anéis).
8. **A textura não entra em canvas de grafo.**
9. **Caixa alta só em `.rotulo-grupo`.**
10. **Elevação nunca dentro de ilha de tema.**
11. **Anel e `border` nunca no mesmo elemento.** Os dois somados são uma borda
    de 2px escrita em duas propriedades.
12. **Barra de navegação horizontal separa por FIO, nunca por uma faixa de
    superfície.** Acrescentada em 2026-08-05, depois de o mesmo defeito
    aparecer quatro vezes: `.tela-topo`, `.anuncio-indice` e `.telas-abas` todos
    pintavam `--superficie` com um fio embaixo, e o resultado é uma faixa cinza
    atravessada logo abaixo do cabeçalho, que é literalmente a leitura de "corta
    uma fatia lá em cima" que abriu a rodada de composição. Quatro ocorrências
    não são azar: quem escreve uma barra horizontal quer separá-la do conteúdo,
    e alcança o `background` antes de alcançar o fio. Numa tela de galeria isso
    custa mais ainda, porque a faixa vira a maior mancha lisa de uma tela cuja
    moldura é acromática justamente para a peça colorida do usuário mandar.
    `telas/composicao-colecoes.test.ts` varre as folhas por padrão, e não por
    nome de classe: barra nova nasce com nome novo.
13. **Alvos iguais lado a lado não têm primeiro.** Acrescentada em 2026-08-05,
    depois de o mesmo defeito aparecer em três telas na mesma semana: quatro
    botões idênticos no rodapé do cartão de workspace, três pílulas idênticas no
    cabeçalho do Início, e hover com a mesma superfície do selecionado na barra.
    Se um alvo é o principal, ele tem tamanho, posição ou peso diferente dos
    outros. Se todos têm o mesmo, nenhum é o principal, **e quem paga é o
    conteúdo ao lado**: no cartão de workspace, quatro botões iguais em todos os
    cartões competiam com o número, que era o único que mudava de um pro outro.
14. **Cor de estilo do dono nunca é escrita em folha de componente.** Ela é dado
    de execução e entra por token na raiz. Uma cor literal numa folha
    sobreviveria à troca de estilo, e o pedaço de tela que ela pinta passaria a
    mentir justamente sobre a cor que o dono acabou de escolher. Acrescentada em
    2026-08-05, com o Criador de Estilos. A proibição 4 já cobre o app inteiro; o
    que esta acrescenta é a razão nova para ela, e a varredura da folha da
    vitrine em `componentes/estilos/composicao-estilos.test.ts`.

---

## 12. O checklist de migração por folha

Para cada folha de tela, na onda dela:

- [ ] A linha `@layer base, externo, tela, tema;` está no topo, antes de tudo.
- [ ] Todo o conteúdo está dentro do bloco `@layer tela`.
- [ ] Nenhuma cor literal. Nenhum `z-index` literal.
- [ ] Nenhum raio literal: só os cinco tokens.
- [ ] Título com peso 400. Nenhum 600 em título.
- [ ] Nenhuma duração acima de 280ms, e só `--curva`.
- [ ] Nada que a folha declare já existe em `primitivas.css`.
- [ ] A tela abre nos dois temas, sem erro de console e sem rolagem horizontal.
- [ ] Foto de antes e de depois, nos dois temas, com toda diferença explicável.
