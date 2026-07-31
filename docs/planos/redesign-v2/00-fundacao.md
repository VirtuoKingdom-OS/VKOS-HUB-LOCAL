# VKOS Hub, fundação v2

> Contrato de interface. Escrito em 2026-07-30, na Fase 1 do redesign completo.
> O Jesse revogou o sistema anterior por inteiro: nenhuma regra, nenhum valor e
> nenhuma decisão de `docs/decisoes/2026-07-27-*` vale mais como precedente.
> Este arquivo é a única fonte. Se algo aqui não responde sua pergunta, é falha
> deste arquivo, e a resposta certa é escrever aqui, não improvisar na tela.

---

## 1. A filosofia, em um parágrafo

O Hub é um cockpit onde um dono de negócio, que não é desenvolvedor, opera o
próprio negócio por horas seguidas, e onde a tela está quase sempre cheia do
conteúdo COLORIDO dele: carrossel, site, imagem, galeria, peça pronta. Disso
sai a única regra estética do sistema, e todo o resto é consequência dela: **a
interface é acromática e o conteúdo do usuário é a única coisa colorida na
tela.** Cor na moldura briga com a peça ao lado dela, então a moldura não tem
cor: tem tinta, papel, fio e espaço. O menta da marca não sumiu, mudou de
emprego: ele deixou de pintar botão, cartão selecionado, ícone e título, e
passou a dizer uma coisa só, que é o que está VIVO agora. A densidade vem da
altura dos controles e do ritmo do espaço, nunca de encolher a letra, porque
quem lê isso o dia inteiro não deve gastar atenção com o tamanho da fonte. E a
profundidade vem de uma escada de quatro superfícies mais um fio, nunca de
sombra, porque sombra empilha e uma ferramenta densa já tem camada demais.

**O que mudou de fato em relação ao sistema anterior**, e é o que vai se ver na
tela: o canvas perdeu o tingimento de menta e ficou neutro frio; o conteúdo
parou de nascer dentro de cartão e passou a se apoiar direto no plano de
trabalho; o raio caiu (8px virou 6px) e a interface passou a ler como
instrumento em vez de cartão de marketing; o cabeçalho de tela virou uma linha
de 56px em vez de uma faixa de 96px; selecionado virou contorno e superfície em
vez de preenchimento verde; e existe uma camada de primitivas de verdade, então
não há mais quinze campos de busca ligeiramente diferentes.

---

## 2. Onde cada coisa mora, e a cascata

```
app/web/src/estilos/
  global.css        camada base.  reset, fonte, ESCALAS, contrato de nome dos tokens
  primitivas.css    camada base.  TODO componente compartilhado
  externo.css       camada externo. o CSS do React Flow, importado com layer()
  canvas.css        camada tela.  o canvas de grafo, do Cockpit e do Mapa
  visual-hub.css    camada tema.  o VALOR de cada token de cor, por tema
app/web/src/componentes/<area>/<area>.css   camada tela. a folha de cada tela
```

> O `legado.css` saiu desta lista em 2026-07-30, na varredura final da Fase 2:
> ele foi demolido classe por classe e o arquivo não existe mais. Ver
> `docs/decisoes/2026-07-30-a-demolicao-do-legado.md`.

**A ordem da cascata, da que perde para a que vence: `base` → `externo` →
`tela` → `tema`.**

Toda folha do app, sem exceção, começa exatamente assim:

```css
@layer base, externo, tela, tema;

@layer tela {
  /* tudo da folha vive aqui dentro, e o bloco só fecha no fim do arquivo */
}
```

Por que a linha se repete em toda folha: as telas carregam sob demanda, por
import dinâmico de rota. Qual folha o navegador lê primeiro depende de qual tela
o usuário abriu primeiro. A primeira declaração de `@layer` que ele lê é a que
fixa a ordem, então repetir a linha em todas torna a ordem independente do
caminho que a pessoa fez pelo app. Sem isso, o bug muda de forma a cada sessão e
não reproduz. `camadas.test.ts` reprova quem esquecer, e reprova também quem
deixar uma regra FORA do bloco de camada: regra sem camada vence todas as
camadas.

**Por que as primitivas ficam em `base` e não numa camada própria.** Assim uma
folha de tela (`@layer tela`) sobrescreve uma primitiva sem `!important`, e a
exceção fica visível: ela aparece na folha da tela, com nome e comentário
dizendo por quê. Dentro da camada `base`, quem vence é quem é importado depois,
e `main.tsx` importa `primitivas.css` logo depois de `global.css`. A ordem dos
imports de `main.tsx` é travada por teste.

**A regra que nunca se quebra na camada `tema`:** `visual-hub.css` declara
custom property de cor, e nada mais. Nem tamanho, nem peso, nem raio, nem
espaço, nem `z-index`, nem duração. A camada `tema` vence a `tela` por ordem de
camada, não por especificidade: o que for declarado lá é inegociável para toda
folha do app, para sempre, e nenhum seletor mais específico traz de volta. Foi
exatamente assim que o tamanho pequeno de botão do design system anterior deixou
de existir sem ninguém entender por quê. `densidade.test.ts` reprova qualquer
propriedade não-cor nesse arquivo.

---

## 3. A paleta

Dois temas. **Claro é o padrão** (a cena que decide: um dono de negócio na mesa
dele, perto de uma janela, das 9 às 19, com o cômodo iluminado de dia). Escuro é
para trabalho noturno, com a mesma gramática em grafite frio.

O tema vive em `data-theme` na raiz do documento, estampado por um script inline
em `app/web/index.html` ANTES do bundle carregar, lendo `localStorage`
`"vkos-tema"`. Valores: `"claro"` e `"escuro"`. Não mexa nesse mecanismo sem
atualizar o `index.html` junto, senão a tela pisca no tema errado por um quadro.

### 3.1 Tema Claro

| token | valor | trabalho |
|---|---|---|
| `--chassi` | `#f1f2f4` | barra lateral e barra de topo. A moldura recua |
| `--fundo` | `#f6f7f8` | o plano de trabalho. O conteúdo se apoia AQUI |
| `--superficie` | `#ffffff` | painel, cartão, cabeçalho fixo |
| `--superficie-alta` | `#eceef1` | hover, linha selecionada, campo, aba ativa |
| `--superficie-flutuante` | `#ffffff` | popover, menu, modal |
| `--papel` | `#ffffff` | papel do site do CLIENTE. Não acompanha o tema |
| `--linha` | `#e4e7ea` | separação e decoração |
| `--linha-forte` | `#7a828a` | contorno de CONTROLE. Obrigada a 3:1 |
| `--texto` | `#14171a` | conteúdo, título, valor |
| `--texto-suave` | `#4d545b` | descrição, subtítulo, rótulo de campo |
| `--texto-fraco` | `#616970` | metadado, dica, placeholder |
| `--texto-rotulo` | `#7b838b` | SÓ rótulo de grupo de navegação |
| `--menta` | `#00715a` | menta legível: texto, ícone de estado, link |
| `--menta-viva` | `#0b9776` | o SINAL. Nunca texto |
| `--menta-tenue` | `#dff3ec` | preenchimento de selo e de faixa boa |
| `--menta-linha` | `#00715a` | contorno de campo em foco |
| `--sobre-menta` | `#ffffff` | tinta sobre menta cheio |
| `--acao` | `#16191d` | a ação principal. Uma por tela |
| `--acao-hover` | `#282d33` | |
| `--sobre-acao` | `#ffffff` | |
| `--alerta` | `#c32f2f` | erro, destrutivo |
| `--sobre-alerta` | `#ffffff` | |
| `--alerta-tenue` | `#fbeaea` | |
| `--alerta-linha` | `#c32f2f` | |
| `--aviso` | `#8a6100` | atenção, ainda não é erro |
| `--aviso-tenue` | `#f8efdb` | |
| `--aviso-linha` | `#8a6100` | |
| `--neutro-tenue` | `#eceef1` | selo neutro, contagem |
| `--canvas-fundo` | `#f1f2f4` | o plano do grafo |
| `--pontos-canvas` | `#cbd0d6` | a grade do grafo |
| `--ligacao` | `#82898f` | aresta em repouso |
| `--ligacao-viva` | `#0b9776` | aresta sendo arrastada |

### 3.2 Tema Escuro

| token | valor | nota |
|---|---|---|
| `--chassi` | `#0e1013` | |
| `--fundo` | `#131619` | |
| `--superficie` | `#1a1e22` | |
| `--superficie-alta` | `#242930` | |
| `--superficie-flutuante` | `#23282e` | |
| `--papel` | `#ffffff` | não acompanha o tema |
| `--linha` | `#2a2f36` | |
| `--linha-forte` | `#727a84` | |
| `--texto` | `#e9ecef` | **não é branco puro**, ver 3.4 |
| `--texto-suave` | `#a7aeb6` | |
| `--texto-fraco` | `#8f97a0` | |
| `--texto-rotulo` | `#727a83` | |
| `--menta` | `#3fd6a8` | |
| `--menta-viva` | `#2fd4a7` | aqui o vivo É o hex da marca |
| `--menta-tenue` | `#12302a` | |
| `--menta-linha` | `#3fd6a8` | |
| `--sobre-menta` | `#08201a` | |
| `--acao` | `#e9ecef` | inverte: tinta clara sólida |
| `--acao-hover` | `#ffffff` | |
| `--sobre-acao` | `#14171a` | |
| `--alerta` | `#f47070` | |
| `--sobre-alerta` | `#2a0d0d` | |
| `--alerta-tenue` | `#3a1b1b` | |
| `--alerta-linha` | `#f47070` | |
| `--aviso` | `#e0b04a` | |
| `--aviso-tenue` | `#33280f` | |
| `--aviso-linha` | `#e0b04a` | |
| `--neutro-tenue` | `#242930` | |
| `--veu` | `rgba(0, 0, 0, 0.66)` | fecha mais que no Claro |
| `--canvas-fundo` | `#0e1013` | |
| `--pontos-canvas` | `#262b33` | |
| `--ligacao` | `#616973` | |
| `--ligacao-viva` | `#2fd4a7` | mesma cor dos dois temas, de propósito |

O escuro é grafite frio, não preto puro. Preto puro não tem para onde descer, e
a escada de superfície é justamente o que dá profundidade sem sombra. Os valores
verificados de referência ficam todos entre `#080909` e `#1f1f21`: Linear
`#08090a`, Vercel `#0a0a0a`, GitHub `#0d1117`, Radix gray dark 1 `#111111`,
Material 3 `#141218`, Carbon g100 `#161616`, VS Code Dark Modern `#1f1f1f`.

### 3.3 Contraste medido, os pares que importam

Todos calculados pela fórmula do WCAG 2.2 e travados em `contraste.test.ts`, que
mede **46 pares em cada tema**. Piso de 4,5:1 para texto (critério 1.4.3) e de
3:1 onde a cor é o único indicador de um controle ou de um gráfico com
significado (1.4.11).

| par | claro | escuro | piso |
|---|---|---|---|
| `--texto` / `--superficie` | 17,99 | 14,14 | 4,5 |
| `--texto` / `--fundo` | 16,77 | 15,31 | 4,5 |
| `--texto` / `--superficie-alta` | 15,48 | 12,34 | 4,5 |
| `--texto` / `--chassi` | 16,06 | 16,07 | 4,5 |
| `--texto-suave` / `--superficie` | 7,68 | 7,48 | 4,5 |
| `--texto-suave` / `--superficie-alta` | 6,61 | 6,53 | 4,5 |
| `--texto-fraco` / `--superficie` | 5,58 | 5,67 | 4,5 |
| `--texto-fraco` / `--superficie-alta` | **4,80** | 4,95 | 4,5 |
| `--texto-fraco` / `--chassi` | **4,98** | 6,44 | 4,5 |
| `--texto-rotulo` / `--chassi` | 3,43 | 4,38 | 3 |
| `--texto-rotulo` / `--superficie` | 3,85 | 3,85 | 3 |
| `--menta` / `--superficie` | 5,98 | 9,10 | 4,5 |
| `--menta` / `--menta-tenue` | 5,18 | 7,69 | 4,5 |
| `--sobre-menta` / `--menta` | 5,98 | 9,25 | 4,5 |
| `--menta-viva` / `--chassi` | **3,29** | 10,07 | 3 |
| `--menta-viva` / `--superficie-alta` | **3,17** | 7,73 | 3 |
| `--sobre-acao` / `--acao` | 17,63 | 15,17 | 4,5 |
| `--acao` / `--superficie` | 17,63 | 14,14 | 3 |
| `--acao` / `--superficie-alta` | 15,17 | 12,34 | 3 |
| `--sobre-alerta` / `--alerta` | 5,57 | 6,37 | 4,5 |
| `--alerta` / `--alerta-tenue` | **4,79** | 5,47 | 4,5 |
| `--aviso` / `--superficie` | 5,54 | 8,36 | 4,5 |
| `--aviso` / `--aviso-tenue` | **4,84** | 7,22 | 4,5 |
| `--linha-forte` / `--superficie` | 3,90 | 3,86 | 3 |
| `--linha-forte` / `--superficie-alta` | **3,35** | 3,37 | 3 |
| `--linha-forte` / `--canvas-fundo` | 3,48 | 4,38 | 3 |
| `--ligacao` / `--canvas-fundo` | **3,16** | 3,43 | 3 |
| `--ligacao-viva` / `--canvas-fundo` | **3,29** | 10,07 | 3 |

Os valores em negrito são os que têm menos folga. Se você mexer em qualquer
token, é neles que a trava vai quebrar primeiro.

**A grade de pontos do canvas não entra na trava, de propósito.** Ela fica em
1,39:1 no Claro e 1,34:1 no Escuro. Grade é referência espacial, não carrega
informação, e ninguém precisa lê-la. É a mesma faixa em que React Flow, tldraw e
n8n a colocam.

### 3.4 As três decisões de cor que precisam de justificativa

**O menta continua, mas fala pouco, e no Claro ele não é o hex da marca.**
`#2fd4a7` sobre papel dá 1,7:1. Um sinal que não se enxerga não sinaliza, então
no Claro o vivo escurece para `#0b9776`, que passa em 3:1 contra os quatro
planos claros, e no Escuro ele volta a ser `#2fd4a7`. A marca (o logo) continua
sendo o hex original: ele é imagem, não token.

**O menta agora só aparece em quatro lugares, e em nenhum outro:** ponto de
sessão viva ou conexão ligada, barra de progresso, contorno de campo em foco, e
texto ou ícone que diz explicitamente um estado vivo. **Não aparece** em botão,
em título, em ícone de menu, em hover, em cartão selecionado, em aba ativa, em
borda decorativa, nem em nome de negócio.

**A ação principal é tinta sólida escura, e isso é convergência, não falta de
ideia.** Linear, Vercel, Stripe, GitHub e Notion fazem o mesmo, e no registro de
produto familiaridade é uma vantagem, não um demérito. Mas o motivo aqui é
funcional antes de ser convencional: tinta sólida é a única cor de botão que não
briga com o carrossel colorido ao lado dele. **Uma por tela.**

**No Escuro, texto de corpo não é `#ffffff`.** Sobre grafite, o branco cheio
florece e cansa em uso longo, e a fórmula do WCAG 2 não avisa, porque ela sempre
premia o contraste máximo. Nenhum produto de referência usa branco puro: Linear
`#f7f8f8`, Primer `#f0f6fc`, Radix gray dark 12 `#eeeeee`, Carbon g100
`#f4f4f4`. O Hub usa `#e9ecef`.

---

## 4. As escalas

Todas em `global.css`, camada base. Travadas em `escalas.test.ts`.

### 4.1 Régua e espaçamento

`--base: 4px`. Todo espaço e toda altura de controle derivam dela, então trocar
`--base` afrouxa ou aperta a interface inteira sem tocar em componente nenhum.

| token | px | quando |
|---|---|---|
| `--esp-2` | 2 | fio entre ícone e rótulo colados |
| `--esp-4` | 4 | respiro dentro de um controle pequeno |
| `--esp-8` | 8 | entre elementos irmãos do mesmo bloco. **O mais usado** |
| `--esp-12` | 12 | padding de linha de lista, célula de tabela |
| `--esp-16` | 16 | padding de painel, distância entre blocos irmãos |
| `--esp-24` | 24 | entre seções de uma tela, margem lateral do corpo |
| `--esp-32` | 32 | margem lateral em tela larga |
| `--esp-48` | 48 | respiro de estado vazio e de tela de foco único |

Não existe 6, não existe 20, não existe 40. Abrir um degrau novo abre a porta
para o próximo, e a interface volta a ter 42 espaçamentos, que foi a contagem
real antes das escalas existirem.

### 4.2 Altura de controle

**É aqui que a densidade se decide, não no tamanho da fonte.**

| token | px | quando |
|---|---|---|
| `--alt-p` | 28 | ação dentro de linha de lista, barra de ferramenta, chip |
| `--alt` | 32 | **o padrão.** botão, campo, select, aba, item de menu |
| `--alt-g` | 40 | a ação principal de uma tela, campo de formulário longo |

28 / 32 / 40 é exatamente o `small` / `medium` / `large` do GitHub Primer, e 32 e
40 são o ponto de convergência de Radix, Ant Design, Fluent v9 e shadcn. 28px
passa com folga no critério 2.5.8 do WCAG 2.2, que pede 24px. **Abaixo de 28px
não existe controle clicável neste app.**

Linha de lista e linha de tabela ficam entre **32 e 36px de altura real** (piso
de `--alt` mais `--esp-8` em cima e embaixo da linha de 20px do corpo). Acima de
40px a lista deixa de ser densa e vira confortável.

### 4.3 Tipografia

| token | px / entrelinha | tracking | quando |
|---|---|---|---|
| `--txt-micro` | 11 / 16 | +0,005em | contagem, carimbo de hora, tag de canto |
| `--txt-legenda` | 12 / 16 | 0 | rótulo de campo, cabeçalho de coluna, metadado |
| `--txt-corpo` | 14 / 20 | -0,006em | **o padrão.** menu, botão, célula, parágrafo curto |
| `--txt-leitura` | 16 / 24 | -0,011em | prosa longa: markdown do Cérebro, descrição |
| `--txt-titulo-p` | 18 / 24 | -0,014em | título de seção e de cartão |
| `--txt-titulo` | 22 / 28 | -0,018em | título de tela |
| `--txt-display` | 30 / 36 | -0,021em | número grande de painel, saudação do início |

Cada degrau tem `--txt-*`, `--lh-*` e `--tr-*`. Usar um sem os outros dois é
como não usar a escala.

**O padrão é 14px, não 13.** 13px é medida de IDE e cobra uma atenção que o dono
do negócio está gastando com o negócio. 14px é o corpo do Primer, do Carbon
(`body-compact-01`), do Atlassian, do Material (`body-medium`), do Vercel
(`copy-14`) e do Radix (size 2). O piso de 11px é o `label-small` do Material 3 e
o Subheadline do macOS, e nenhuma folha escreve abaixo dele.

**O tracking não foi escolhido no olho.** Ele sai do modelo de métrica dinâmica
que o próprio Inter publica:

```
tracking(z) = -0,0223 + 0,185 * e^(-0,1745 * z)     z = tamanho em px, resultado em em
```

A curva cruza o zero em 12px (abaixo disso o certo é ABRIR, acima é FECHAR) e
satura em -0,0223em, então passado uns 40px não adianta mais apertar. Degrau
novo calcula pela fórmula.

Entrelinha é sempre px absoluto e par. Número relativo arredonda diferente em
cada tamanho e a grade de 4px deixa de fechar: duas colunas com o mesmo conteúdo
saem desalinhadas e ninguém descobre por quê.

### 4.4 Peso

| token | valor | quando |
|---|---|---|
| `--peso-normal` | 400 | texto corrido, descrição, rótulo |
| `--peso-medio` | 500 | título de tela, título de seção, rótulo de botão, item de menu |
| `--peso-forte` | 600 | título de cartão, nome próprio, item ativo, coluna de tabela |
| `--peso-pesado` | 700 | **só número e wordmark** |

Título nunca é bold. Carbon, Primer, Material e Linear não têm 700 na escala
deles; o Hub tem, e ele existe para ênfase de DADO, que não é título.
`densidade.test.ts` reprova 700 fora da lista branca, tanto escrito como `700`
quanto como `var(--peso-pesado)`.

### 4.5 Raio

| token | px | quando |
|---|---|---|
| `--raio-p` | 4 | chip, selo, miniatura, caixa de seleção |
| `--raio` | 6 | **o padrão.** botão, campo, aba, item de menu |
| `--raio-g` | 10 | painel, cartão, popover |
| `--raio-gg` | 14 | modal, camada de tela cheia |
| `--raio-pilula` | 999px | só onde a forma É pílula: contagem, ponto, avatar |

Menor que a versão anterior de propósito. Raio grande lê como cartão de
marketing; raio pequeno lê como instrumento.

### 4.6 Movimento

| token | valor | quando |
|---|---|---|
| `--mov-rapido` | 110ms | hover, foco, pressão, mudança de cor |
| `--mov-padrao` | 180ms | popover, aba, painel, faixa: algo aparece ou some |
| `--mov-lento` | 280ms | modal, gaveta, camada de tela cheia |
| `--curva` | `cubic-bezier(0, 0, 0.38, 0.9)` | ENTRADA e resposta a clique |
| `--curva-simetrica` | `cubic-bezier(0.2, 0, 0.38, 0.9)` | ida e volta contínua |
| `--curva-saida` | `cubic-bezier(0.2, 0, 1, 0.9)` | SAÍDA |

As três curvas são uma família só, no método do Carbon (as produtivas): a
padrão, a padrão com a alça de entrada zerada, e a padrão com a alça de saída
empurrada para 1.

Três regras:

- **O que a pessoa dispara dezenas de vezes por dia fica abaixo de 150ms**
  (regra da Atlassian). Num cockpit, isso é quase tudo.
- **Saída é um degrau mais rápida que entrada.** Sair de um popover é trabalho
  terminado, e esperar a animação de saída bloqueia o próximo passo. O Primer
  codifica isso no próprio token (enter 300ms, exit 200ms).
- **Nada passa de 280ms**, e nada tem quique nem elástico. Quique é
  expressividade, e numa ferramenta de trabalho ela custa atenção sem devolver
  informação. O Material 3 Expressive, que é o sistema mais permissivo com
  movimento em 2026, usa molas **criticamente amortecidas** para cor e opacidade
  nos dois esquemas dele.

### 4.7 Empilhamento, opacidade, elevação

Sete níveis: `--z-base` 0, `--z-fixo` 10, `--z-popover` 100, `--z-camada` 200,
`--z-veu` 300, `--z-modal` 310, `--z-aviso` 400. **Nenhum `z-index` literal em
folha nenhuma**, e `densidade.test.ts` reprova.

Cinco degraus de opacidade: `--op-plena` 1, `--op-secundaria` 0.72, `--op-fraca`
0.5, `--op-apagada` 0.32, `--op-fantasma` 0.16 (só para o que está fora de foco
em canvas denso). **Opacidade nunca encosta em texto**: medido, `--texto-fraco` a
0,72 cai para cerca de 3:1 e a trava de cor não pega, porque ela mede o token e
não a composição final. Rótulo que precisa recuar usa peso, tracking ou um token
de cor mais fraco.

Três sombras, e só três: `--sombra-popover`, `--sombra-modal`, `--sombra-arrasto`.
**A régua: flutua o que fica parado enquanto o conteúdo atrás se move.** Nó de
grafo acompanha o pan e o zoom, então é conteúdo e não tem sombra. Cartão parado
no fluxo da página não tem sombra. Item de lista não tem sombra. Cabeçalho não
tem sombra. Se um elemento precisa se destacar, ele sobe um degrau de superfície
e ganha um fio.

Quatro glows, e só quatro: `--glow-vivo` (o único que pulsa), `--glow-foco`,
`--glow-acao`, `--glow-alerta` (o anel de foco de um campo inválido, porque anel
de menta ao lado de uma mensagem de erro diz a coisa errada). `inset` é fio, não
profundidade, e está sempre liberado.

---

## 5. A camada de primitivas

`app/web/src/estilos/primitivas.css`. **A tela não inventa componente.** Ela
compõe estas classes e escreve, na folha dela, só o que é layout daquela tela:
quantas colunas, quanto de largura, o que gruda no topo. Cor, altura, raio, peso
e movimento já vêm daqui.

Se você precisa de algo que não está aqui e que três telas vão usar, o certo é
adicionar aqui, com comentário dizendo por quê. Se é de uma tela só, mora na
folha dela.

### 5.1 Estrutura de tela

| classe | o que é |
|---|---|
| `.tela` | a moldura de uma tela inteira. Nasce OPACA |
| `.tela-topo` | cabeçalho: UMA linha de 56px, título + ação principal |
| `.tela-topo-texto` / `.tela-topo-acoes` | os dois lados do cabeçalho |
| `.tela-corpo` | o corpo rolante, padding de 24px |
| `.tela-corpo-estreito` | trava em 720px. Formulário, wizard e prosa param aqui |
| `.secao` / `.secao-topo` | **o substituto do cartão**: título, fio e espaço |
| `.painel` / `.painel-topo` / `.painel-corpo` | área de trabalho delimitada que NÃO repete |
| `.cartao` / `.cartao-alvo` | objeto repetido e independente numa coleção |
| `.grade-cartoes` | `auto-fill minmax(260px, 1fr)`, sem breakpoint |
| `.barra-ferramentas` | filtros, busca e ações secundárias |
| `.divisor` | um fio horizontal |
| `.rotulo-grupo` | rótulo que agrupa itens de navegação |

Receita do cabeçalho de tela:

```html
<header class="tela-topo">
  <div class="tela-topo-texto">
    <h1>CRM</h1>
    <p>Contatos, negócios e próximos passos.</p>
  </div>
  <div class="tela-topo-acoes">
    <button class="botao botao-neutro">Importar</button>
    <button class="botao botao-principal">Novo contato</button>
  </div>
</header>
```

**A regra mais importante do sistema:** conteúdo não nasce dentro de cartão. Ele
se apoia direto no plano de trabalho, e a separação vem de espaço e de um fio.
Cartão é para objeto repetido e independente: uma peça da galeria, um workspace,
um lead do quadro. **Cartão dentro de cartão nunca é certo**, e cartão único
numa tela não é cartão, é seção.

`.tela` nasce opaca, sem fade de entrada. Enquanto um `opacity: 0` fecha, a tela
é uma janela para o que está atrás, e o que está atrás é a tela anterior. O
movimento de entrada mora no conteúdo interno.

### 5.2 Botão

`.botao` mais uma variante, mais um tamanho opcional. O componente React
`componentes/comum/Botao.tsx` monta isso e é a porta de entrada: **tela nova usa
ele, nunca uma classe nova de botão.**

| classe | quando |
|---|---|
| `.botao-principal` | tinta sólida. A ação com mais consequência. **Uma por tela** |
| `.botao-neutro` | superfície com fio forte. O padrão de todo o resto |
| `.botao-fantasma` | sem caixa. Terciária, e ação dentro de linha de lista |
| `.botao-perigo` | contorno vermelho. Só onde apaga ou desconecta |
| `.botao-p` / `.botao-g` | 28px / 40px. Sem sufixo é 32px |
| `.botao-icone` | quadrado. Exige `aria-label` |

Estados que já vêm prontos: hover, foco (anel de `:focus-visible`), pressão,
desabilitado e trabalhando.

**Desabilitado não é apagado.** O rótulo continua legível (`--texto-fraco` sobre
`--superficie-alta`, 4,8:1); o que muda é a superfície. Botão cinza sobre cinza
faz a pessoa clicar de novo achando que não pegou, e foi o que aconteceu com o
"Continuar" do wizard de site.

**Trabalhando é `aria-busy="true"`, e o rótulo NÃO some.** O giro entra ao lado.
Trocar "Publicar" por um spinner apaga a informação de qual ação está em curso.

### 5.3 Campo e formulário

| classe | quando |
|---|---|
| `.grupo-campo` | o bloco rótulo + controle + dica ou erro |
| `.rotulo` | 12px, peso 500, `--texto-suave` |
| `.dica` | 12px, `--texto-fraco`. Abaixo do campo |
| `.erro-campo` | 12px, `--alerta`. Colado no campo, nunca no topo da tela |
| `.campo` | input, textarea e select. `.campo-p` 28px, `.campo-g` 40px |
| `.campo-com-icone` | campo de busca com ícone decorativo dentro |
| `.caixa` | checkbox e radio nativos, estilizados |
| `.linha-escolha` | o alvo clicável é a LINHA, não o quadradinho de 16px |
| `.interruptor` | liga e desliga na hora, sem confirmar |
| `.opcoes` / `.opcao` | escolha única de 2 a 4 opções COM descrição |
| `.segmentado` / `.segmento` | escolha única entre opções curtas, sem descrição |
| `.acoes-formulario` | rodapé: a ação principal sempre à direita |

Receita do campo:

```html
<div class="grupo-campo">
  <label class="rotulo" for="nome">Nome do contato</label>
  <input class="campo" id="nome" aria-invalid="true" aria-describedby="e-nome" />
  <span class="erro-campo" id="e-nome">Escreva pelo menos o primeiro nome.</span>
</div>
```

Receita do grupo de opções, que é o que os três wizards reinventavam cada um do
seu jeito. São radios de verdade por baixo, então teclado e leitor de tela
funcionam de graça:

```html
<fieldset class="opcoes">
  <label class="opcao">
    <input type="radio" name="formato" value="unica" checked />
    <span class="opcao-titulo">Página única</span>
    <span class="opcao-descricao">Landing page de uma tela.</span>
  </label>
  <label class="opcao">
    <input type="radio" name="formato" value="paginas" />
    <span class="opcao-titulo">Site com páginas</span>
    <span class="opcao-descricao">Início, sobre, serviços, contato.</span>
  </label>
</fieldset>
```

**A opção escolhida se lê por contorno e superfície, nunca por preenchimento
colorido.** Preenchimento verde na opção escolhida foi exatamente o que
transformou o menta em decoração na versão anterior. O contorno engrossa com um
fio `inset`, que não muda a caixa: sem isso a opção pula 1px ao ser escolhida.

O campo marca o foco no próprio contorno (`--menta-linha` mais `--glow-foco`),
não no anel genérico: o anel genérico sairia por fora e daria dois anéis
concêntricos.

### 5.4 Selo, contagem e sinal de vida

| classe | quando |
|---|---|
| `.selo` | estado de uma coisa, em uma palavra. Neutro por padrão |
| `.selo-vivo` / `.selo-alerta` / `.selo-aviso` | os três tons semânticos |
| `.contagem` | número ao lado de um rótulo. É o único uso de peso 700 autorizado |
| `.ponto-vivo` | o ponto que pulsa. `.parado` e `.erro` desligam o pulso |

Selo não é botão e não é enfeite. Preenchimento tênue mais tinta escura do mesmo
matiz, os dois medidos em 4,5:1.

### 5.5 Lista densa e tabela

| classe | quando |
|---|---|
| `.lista` | a moldura: superfície, fio e raio |
| `.item-lista` | uma linha por registro. 32px de piso, 36px de altura real |
| `.item-lista-texto` / `.item-lista-titulo` / `.item-lista-meta` | o conteúdo |
| `.item-lista-acoes` | as ações da linha, e elas nascem VISÍVEIS |
| `.tabela` | tabela densa com cabeçalho grudado no topo |

**Lista é o formato de dado padrão do Hub.** Grade de cartões só quando o
registro tem imagem de verdade para mostrar.

**Linha selecionada** se lê por superfície mais um fio `inset` de 2px à esquerda,
em `--acao`. Não é uma barra colorida decorativa: é o marcador de qual linha está
aberta, e ele nasce visível.

**Ação de linha nunca aparece só no hover.** O que só aparece no hover não existe
para o teclado, não existe para o toque, e some para quem não sabe que está ali.

### 5.6 Abas

`.abas` mais `.aba`. A aba ativa se marca por `aria-selected="true"` (ou
`.ativa`) e ganha um fio `inset` de 2px embaixo, na cor da tinta, mais peso 600.
**Pílula menta na aba ativa é proibido**, e foi o que transformou o menta em
decoração na barra de abas do CRM.

### 5.7 Faixa de aviso, erro e sucesso

`.faixa` mais `.faixa-alerta`, `.faixa-aviso` ou `.faixa-boa`. Uma linha na
largura do conteúdo, com um ícone, o texto e, quando existe, UMA ação. Ela é
ancorada onde o problema está, não no topo da tela.

```html
<div class="faixa faixa-aviso" role="status">
  <svg aria-hidden="true">...</svg>
  <div class="faixa-texto">A conexão com o Instagram expirou ontem.</div>
  <div class="faixa-acoes">
    <button class="botao botao-p botao-neutro">Reconectar</button>
  </div>
</div>
```

### 5.8 Modal, popover e menu

| classe | quando |
|---|---|
| `.veu-modal` | o véu de fundo |
| `.modal` / `.modal-g` | 560px / 880px |
| `.modal-topo` / `.modal-corpo` / `.modal-rodape` | as três faixas |
| `.popover` | ancorado, com `--sombra-popover` |
| `.menu` / `.menu-item` / `.menu-separador` | lista de ações dentro do popover |

**Modal é o último recurso, não o primeiro.** Ele existe para o que EXIGE uma
decisão antes de continuar: confirmar algo destrutivo, ou um fluxo com passos.
Para editar um campo, o certo é editar no lugar.

Armadilha real e já paga no projeto: popover com `position: absolute` dentro de
um ancestral com `overflow: hidden` ou `auto` é recortado. Se o pai rola, o
popover sai por `position: fixed` ou por portal.

### 5.9 Estado vazio, carregando e progresso

| classe | quando |
|---|---|
| `.vazio` | estado vazio. Ícone, título, uma frase e a próxima ação |
| `.esqueleto` / `.esqueleto-linha` | o formato do que vem, no lugar onde ele vem |
| `.girinho` | giro. SÓ dentro de controle, nunca no meio do conteúdo |
| `.progresso` / `.progresso-barra` | progresso determinado, com o vivo da marca |
| `.so-leitor` | texto só para leitor de tela |

**Estado vazio ENSINA a interface**: o que aquilo é e qual é a próxima ação.
Nunca "nada aqui". E **nunca com borda tracejada**: tracejado lê como área de
soltar arquivo ou placeholder de obra, e estado vazio não é nem uma coisa nem
outra.

**Área de conteúdo carregando usa esqueleto, não giro.** Um giro no meio da tela
não diz nada sobre o que está chegando.

---

## 6. Densidade: as regras que decidem no dia a dia

- **Altura de controle antes de tamanho de fonte.** Se a tela está frouxa, o
  primeiro lugar de olhar é `--alt` e o padding, não a tipografia.
- **A margem lateral do corpo é `--esp-24`, e ela é a mesma do cabeçalho**, para
  o título e o conteúdo alinharem na mesma coluna.
- **Formulário e prosa param em 720px** (`.tela-corpo-estreito`). Campo de 900px
  de largura obriga o olho a viajar da etiqueta até o valor. Tabela e canvas
  usam a largura toda.
- **Prosa longa fica entre 65 e 75 caracteres por linha**; dado e UI compacta
  podem passar disso.
- **Duas colunas de informação valem mais que dois cartões empilhados.** Se a
  tela tem espaço horizontal sobrando e rolagem vertical, a leitura está errada.
- **Nada de faixa vazia.** O cabeçalho de tela custa 56px porque é uma linha. Se
  uma tela precisa de mais, é porque tem informação lá, não ar.
- **Alvo clicável mínimo de 28px** de altura no app inteiro. O critério 2.5.8 do
  WCAG 2.2 pede 24px; ícone menor que isso só é conforme se nenhum outro alvo
  cruzar um círculo de 24px em volta dele, ou seja, **passo de 24px entre
  centros**. Na dúvida, use `.botao-p`.
- **Tela baixa (`max-height: 780px`) aperta a moldura, nunca o conteúdo.** O que
  sai é folga, nunca informação.

---

## 7. Motion: o que anima, e como

O que pode animar: opacidade, `transform` (translate e scale), cor, borda,
`box-shadow`, e `width` ou `height` só quando não há alternativa. O que não
anima: layout (`top`, `left`, `margin`), porque cada quadro recalcula a página.

| o que | duração | curva |
|---|---|---|
| hover, foco, pressão, troca de cor | `--mov-rapido` | `--curva` |
| popover, menu, aba, faixa entrando | `--mov-padrao` | `--curva` |
| popover, menu, faixa saindo | `--mov-rapido` | `--curva-saida` |
| modal, gaveta, camada de tela cheia entrando | `--mov-lento` | `--curva` |
| modal saindo | `--mov-padrao` | `--curva-saida` |
| pulso de sessão viva, progresso indeterminado | 1,6s | `--curva-simetrica` |

Animações compartilhadas, todas em `primitivas.css`: `surgir`,
`surgir-ancorado`, `girar`, `pulsar`, `varrer`. Use essas antes de escrever uma
nova.

**Movimento reduzido SUBSTITUI, não apaga.** É a formulação do MDN, e é a regra
da casa. O deslocamento e a escala somem; a mudança de cor e de opacidade fica;
o que pulsa vira fade. Quem liga movimento reduzido continua precisando saber
que a IA está trabalhando, que o botão respondeu ao clique e onde está o foco.

`global.css` tem uma rede geral que encurta duração e corta iteração, para que
nenhuma animação esquecida escape. **Ela não substitui o seu bloco.** Se a sua
folha anima `transform` dentro de `@keyframes`, ela precisa declarar o próprio
`@media (prefers-reduced-motion: reduce)`, e `densidade.test.ts` reprova quem não
declarar.

---

## 8. Canvas de grafo (Cockpit e Mapa)

O canvas não é uma tela: é uma janela para um espaço que se move. Por isso ele
tem plano próprio.

```css
.area-canvas {
  background:
    radial-gradient(circle at 1px 1px, var(--pontos-canvas) 1px, transparent 0)
      0 0 / 20px 20px,
    var(--canvas-fundo);
}
```

O CSS do React Flow entra por `estilos/externo.css`, com
`@import "@xyflow/react/dist/style.css" layer(externo);`. **Nunca importe ele em
outro lugar**, senão ele volta a ficar fora de camada e passa a vencer a folha da
tela. Sobrescreva as variáveis `--xy-*` (sem o sufixo `-default`) apontando para
os tokens do Hub:

```css
.area-canvas {
  --xy-background-color: var(--canvas-fundo);
  --xy-edge-stroke: var(--ligacao);
  --xy-connectionline-stroke: var(--ligacao-viva);
  --xy-node-background-color: var(--superficie);
  --xy-node-border: 1px solid var(--linha-forte);
  --xy-handle-background-color: var(--linha-forte);
  --xy-handle-border-color: var(--canvas-fundo);
}
```

As regras do canvas nos dois temas:

- **Nó de grafo não flutua, então não tem sombra.** Ele acompanha o pan e o
  zoom, logo é conteúdo. A separação dele vem de `--superficie` mais o fio de
  `--linha-forte`, que passa em 3:1 contra o canvas nos dois temas.
- **A grade fica quase invisível, e isso é certo.** 1,39:1 no Claro e 1,34:1 no
  Escuro. Ninguém precisa ler a grade; ela é referência espacial. `gap` de 20px,
  ponto de 1px.
- **Aresta em repouso usa `--ligacao`; aresta sendo arrastada usa
  `--ligacao-viva`, que é a MESMA cor nos dois temas.** A linha que está sendo
  puxada é a única do canvas que precisa saltar, então ela não segue o tema da
  aresta parada. É o que o React Flow faz com o `--xy-connectionline-stroke`.
- **Port é desenhado pequeno e clicado grande.** O visual fica entre 6 e 8px,
  com anel de 1px na cor do canvas (é o anel que separa o ponto da borda do nó),
  e o alvo se recompra com o `connectionRadius` do React Flow (padrão 20) mais
  hitbox invisível na aresta (`interactionWidth`, padrão 20).
- **Nó selecionado usa anel, não sombra.** Anel de 0px de desfoque não é sombra,
  é fio. Se o anel precisar manter a mesma espessura na tela em qualquer zoom, o
  caminho é dividir a espessura pelo fator de zoom, como o n8n faz.
- **O que flutua SOBRE o canvas (barra de controles, minimapa, popover de nó)
  esse sim tem sombra**, porque fica parado enquanto o canvas se move. É
  exatamente a régua da seção 4.7.

---

## 9. Proibições explícitas

Estas não são preferência. Se você está prestes a escrever uma delas, o
componente está errado e precisa de outra estrutura.

**De cor**

1. Cor literal em folha de componente. Hex, `rgb()`, `hsl()`, `oklch()`: nada.
   Só `global.css` e `visual-hub.css` escrevem valor de cor. Para compor
   transparência, `rgba(var(--menta-rgb), 0.2)`, que acompanha a troca de tema.
   `densidade.test.ts` reprova.
2. Menta em botão, título, ícone de menu, hover, cartão selecionado, aba ativa
   ou borda decorativa.
3. Preenchimento colorido para marcar "selecionado". Selecionado é superfície
   mais contorno.
4. Mais de uma ação principal por tela.
5. Opacidade em cima de cor de texto.

**De forma**

6. Sombra em qualquer coisa que não flutue sobre outro conteúdo. Cartão parado,
   item de lista, cabeçalho, nó de grafo: sem sombra.
7. Cartão dentro de cartão. E cartão único numa tela, que é seção.
8. Borda tracejada fora do estado de arraste de arquivo.
9. Borda lateral colorida de mais de 1px como acento em cartão, item de lista ou
   faixa.
10. Caixa alta fora de `.rotulo-grupo`. Escreva "Token de API", não "TOKEN DE
    API".
11. Peso 700 em texto. Título é 500; título de cartão e nome são 600.
12. Texto com gradiente, vidro fosco decorativo, e glow em superfície grande.
13. `z-index` literal.
14. Fonte abaixo de 11px.

**De comportamento**

15. Ação que só aparece no hover.
16. Modal para editar um campo. Exaure a edição no lugar primeiro.
17. Giro no meio de uma área de conteúdo. Use esqueleto.
18. Botão que troca o rótulo por um spinner enquanto trabalha.
19. Estado vazio que diz "nada aqui" sem ensinar a próxima ação.
20. Animação de entrada na `.tela` inteira.
21. Animação de `transform` sem bloco de `prefers-reduced-motion` na mesma
    folha.
22. Biblioteca de UI de terceiro. O que existe hoje é React, React Flow,
    react-markdown e remark-gfm. Nada entra sem justificar por que o nativo não
    resolve.
23. Fonte ou asset por CDN. O Hub roda sem internet.

---

## 10. Checklist de migração por tela (Fase 2)

Siga na ordem. Cada passo pressupõe o anterior.

**Antes de escrever CSS**

1. Leia este arquivo inteiro e a folha atual da tela.
2. Abra `docs/planos/redesign-v2/01-pendencias-por-tela.md` e veja o que a sua
   tela já viola hoje.
3. Liste os componentes da tela e case cada um com uma primitiva da seção 5. O
   que não casar é ou layout da tela, ou uma primitiva faltando. **Primitiva
   faltando sobe para `primitivas.css`, não vira classe local.**

**Estrutura**

4. Troque a moldura por `.tela` + `.tela-topo` + `.tela-corpo`.
5. Um `<h1>` por tela, no `.tela-topo`. Uma ação principal, à direita.
6. Apague todo cartão que não seja objeto repetido. Vira `.secao`.
7. Formulário e prosa recebem `.tela-corpo-estreito`.

**Componentes**

8. Todo botão passa a usar o componente `Botao.tsx`. Nenhuma classe de botão
   nova.
9. Todo campo passa a usar `.grupo-campo` + `.rotulo` + `.campo`.
10. Toda pílula de estado vira `.selo`. Toda aba vira `.aba`. Toda faixa vira
    `.faixa`. Todo estado vazio vira `.vazio`.
11. Lista de registros vira `.lista` + `.item-lista`, ou `.tabela`. Grade de
    cartões só se o registro tem imagem.

**Token e escala**

12. Apague da folha todo hex e todo `rgb()`. Se falta um token para o seu caso,
    crie no `global.css` e dê valor nos DOIS temas.
13. Troque todo px solto de espaço por `--esp-*`, toda altura de controle por
    `--alt*`, todo raio por `--raio*`, toda duração por `--mov-*`, todo
    `z-index` por `--z-*`.
14. Troque todo `font-size` por um degrau da escala, e traga junto o `--lh-*` e o
    `--tr-*` correspondentes.
15. Os apelidos legados de token (`--fundo-2`, `--borda`, `--menta-clara`,
    `--amarelo`, `--realce-rgb` e os outros dezessete) não existem mais desde
    2026-07-30: eles saíram do `global.css` junto com o `legado.css`. Se você
    escrever um deles, `camadas.test.ts` reprova dizendo que ninguém declara.

**Limpeza**

16. Apague do `estilos/canvas.css` os blocos que pertenciam à sua tela. O
    `estilos/legado.css` foi demolido em 2026-07-30 e não existe mais.
17. Se a sua folha estava em `PENDENTES`, em `app/web/src/estilos/folhas.ts`,
    tire o nome dela de lá. **Se você não tirou, a tela não está migrada.** A
    lista está vazia desde 2026-07-30, e o certo é que continue.

**Prova**

19. `cd app && npm run checar -w web && npm run testar -w web && npm run build -w web`.
20. Abra a tela nos dois temas. Confira: o menta só aparece em estado vivo,
    existe uma ação principal, nenhum cartão dentro de cartão, e o foco de
    teclado é visível em todo controle percorrendo a tela só com Tab.
21. Confira em 1440px e em 1280px de largura, e em 780px e 660px de altura, que
    são as faixas de notebook onde a barra lateral já sufocou antes.
22. Ligue movimento reduzido no sistema e confira que o feedback continua
    existindo, só que sem deslocamento.
23. Se a tela toca módulo, integração ou fluxo entre sistemas, confira
    `interno/mapa-sistema.json` antes de fechar.

---

## 11. As travas, e o que cada uma protege

Rodam em `npm run testar -w web`. São 32 testes na fundação.

| arquivo | protege |
|---|---|
| `camadas.test.ts` | a ordem da cascata em TODA folha, a camada de cada arquivo, a ordem dos imports de `main.tsx`, que nenhuma folha use token que ninguém declara, e que a pasta `estilos/` só tenha o contrato |
| `contraste.test.ts` | 46 pares críticos por tema, a escada de superfície, e que os dois temas declarem o mesmo conjunto de tokens |
| `escalas.test.ts` | que as escalas existam, derivem de `--base`, sejam crescentes, e que a camada tema não redeclare nenhuma |
| `densidade.test.ts` | cor só por token, sombra só nos três, glow só nos quatro, `z-index` só na escala, caixa alta só em `.rotulo-grupo`, peso 700 só em número, tracejado só em arraste, tema só com cor, e movimento reduzido declarado |

As travas de folha varrem `folhasMigradas()`, ou seja, tudo que NÃO está em
`PENDENTES`. A trava de cascata varre tudo, sempre: a ordem das camadas não é
assunto de estética, é o que faz o app ser o mesmo app em toda máquina.

**Toda exceção é lista branca nomeada, com o seletor exato e o motivo.**
Heurística por nome de classe falha em silêncio, e isso já custou caro aqui. Se
o seu caso é legítimo, nomeie ele na lista, com comentário. Nomear é barato.

---

## 12. Fronteiras de engenharia que quebram runtime

**Tokens lidos pelo TypeScript.** `componentes/editor/tema.ts` lê token do
`:root` com `getComputedStyle` e manda o LITERAL para dentro do iframe da peça, e
`comum/useCorDoTema.ts` faz o mesmo para o marcador de seta do React Flow (um id
de `<marker>` com parênteses quebra o `url(#...)` que aponta para ele). Duas
consequências:

- **Token de cor tem que continuar sendo hex de 6 dígitos.** `canaisRgb()` em
  `tema.ts` converte hex para canais, e `contraste.test.ts` também exige hex.
  Não troque por `oklch()` sem reescrever os dois.
- **Nome de token não some sem o consumidor ir junto.** Rode
  `grep -rhoE '"--[a-z0-9-]+"' --include=*.ts --include=*.tsx app/web/src` antes
  de renomear qualquer coisa.

**O iframe da peça é outro documento.** Ele não herda o `:root` do Hub, não
participa da cascata em `@layer` e não enxerga `var(--menta)`. Instrumentação de
editor (contorno de seleção, alça, guia) tem que passar por `corDoTema()`. A cor
da peça do usuário nunca passa por lá.

**O boot do tema.** `app/web/index.html` estampa `data-theme` na raiz antes do
bundle. Mudar nome de tema exige mudar o script inline junto.

**Local-first.** Nenhuma fonte, nenhum asset e nenhuma biblioteca por CDN. O
Inter variável está embarcado em `app/web/src/fontes/`, sob SIL Open Font License
1.1, com a licença ao lado.

---

## 13. Referências, com o que veio de cada uma

Levantadas em 2026-07-30, de arquivo de token publicado e CSS de produção, não
de post de blog.

- **Escala tipográfica e tracking**: métrica dinâmica do Inter
  (`d.rsms.me/inter-website/v3/dynmetrics/`), Radix Themes typography, IBM Carbon
  `@carbon/type`, GitHub Primer typography, Material 3 `_md-sys-typescale.scss`,
  macOS HIG.
- **Densidade e altura de controle**: Primer `size.json5` (24/28/32/40/48),
  Carbon `_layout.scss`, Radix Themes `styles.css`, Ant Design
  `genControlHeight.ts`, Fluent v9 `useInputStyles.styles.ts`, shadcn/ui
  `button.tsx`, MUI DataGrid `densitySelector.ts`, AG Grid `core-css.ts`.
- **Tema claro e escuro**: CSS de produção do Linear e do Vercel, `@primer/primitives`,
  `@radix-ui/colors`, `@carbon/themes`, `atlassian-light.js` e `atlassian-dark.js`,
  Material 3 `PaletteTokens.kt`, VS Code `dark_modern.json`.
- **Canvas e grafo**: `@xyflow/react/dist/style.css`, tldraw `editor.css`, n8n
  `_tokens.scss` e `_canvasNodeStyles.scss`, Figma (documentação de ajuda),
  Excalidraw `theme.scss`.
- **Movimento**: Carbon `@carbon/motion`, Primer `motion.css`, Material 3
  `_md-sys-motion.scss` e `StandardMotionTokens.kt`, Atlassian motion, Apple
  SwiftUI `Animation` (DocC), NN/g sobre duração de animação, MDN sobre
  `prefers-reduced-motion`.
- **Contraste**: WCAG 2.2 (1.4.3, 1.4.11, 1.4.12, 2.4.13, 2.5.8), rascunho do
  WCAG 3.0 de março de 2026, documentação do APCA.

**Por que a trava mede WCAG 2 e não APCA.** O APCA é mais fiel à percepção, mas
em 2026 ele não é normativo em lugar nenhum: foi retirado do rascunho do WCAG 3
em julho de 2023 e não voltou, e o rascunho de março de 2026 não o menciona. O
algoritmo de contraste do WCAG 3 continua indefinido, e a conclusão está estimada
para 2030 no mínimo. A conformidade que se cobra de um produto continua sendo a
do WCAG 2.2. O APCA entra como segunda opinião de projeto, principalmente no tema
Escuro, onde a fórmula do WCAG 2 sabidamente engana, e foi ele que decidiu o
`--texto` do Escuro não ser branco puro.
