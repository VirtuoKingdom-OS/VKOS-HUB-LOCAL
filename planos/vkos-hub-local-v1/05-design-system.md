# Design system do VKOS Hub

Documento da Fase 5 da rodada, "Design system e nova pele". Escrito em 2026-07-27.

Esta rodada foi de pesquisa e medição. Nenhum arquivo de `app/` foi tocado. O que está aqui é o
contrato que a implementação vai seguir, com valor concreto em cada linha, para a fase seguinte
não precisar decidir nada de novo.

O pedido do dono foi "algo bem padrão Apple e minimalista". Vale registrar o que isso significa
aqui, porque a palavra minimalista engana. O VKOS Hub é ferramenta de trabalho pesado, usada
horas por dia, com muita informação na tela. Minimalismo aqui é tirar ruído, não tirar
informação. A régua da Apple para aplicação de desktop é justamente essa: o corpo de texto do
macOS é 13pt e a escala inteira mora entre 10 e 26pt. Denso e calmo ao mesmo tempo.

---

## 1. O diagnóstico

Tudo abaixo foi medido no código em 2026-07-27, não estimado.

### 1.1 O tamanho do problema

| Medida | Número |
|---|---|
| Arquivos de CSS | 18 |
| Linhas de CSS | 16.417 |
| Regras CSS | 2.504 |
| Classes distintas | 1.124 |
| Componentes React | 64 |
| Componentes em `comum/`, ou seja, compartilhados | 7 |

Sete componentes compartilhados para 64. O resto é cópia com nome diferente.

### 1.2 Tokens

- **51 tokens únicos** definidos, e **51 usados** via `var()`.
- **199 declarações** de token no total: 98 em `global.css`, 90 em `visual-hub.css`, 11 locais em
  `mapa.css`.
- **19 tokens de cor são declarados 6 vezes cada**, três temas vezes duas camadas.
- **2 órfãos**, declarados e nunca usados: `--raio-g` e `--z-toast`.
- **2 fantasmas**, usados e nunca declarados:
  - `--aviso` em `app/web/src/estilos/crm.css:1539`. O ícone do aviso de leads fica sem cor.
  - `--crm-altura-arrasto`, usado no cálculo de altura do arrasto do kanban.

O número de tokens é saudável. O problema não é quantidade, é cobertura: os 51 tokens cobrem
cor e quase nada mais. Não existe token de tipografia, de espaçamento, de elevação nem de
movimento. É por isso que as escalas explodiram.

### 1.3 A camada de tema está quebrada em produção

Este é o achado mais grave da rodada, e ele muda a ordem das fases.

O contrato do `CLAUDE.md` diz que `visual-hub.css` carrega por último e fixa o valor final. Isso
é verdade em `main.tsx`. **Não é verdade no build.**

`main.tsx` importa só três folhas: `global.css`, `canvas.css` e `visual-hub.css`. As outras 15
são importadas pelos componentes. Sete delas entram por componentes carregados com `React.lazy`,
e o Vite emite um CSS separado para cada chunk. Esse CSS entra como `<link>` no fim do `<head>`
quando a tela abre, ou seja, **depois** do `visual-hub.css`. Mesma especificidade, quem chega
depois vence.

Prova, tirada do build atual em `app/web/dist/assets/`:

```
/* index-ws9pKCQK.css, carregado no boot, offset 144840, camada oficial */
.studio-palco,.site-moldura,.editor-palco{
  box-shadow:0 24px 64px rgba(var(--scrim-rgb),.42),0 0 0 1px rgba(var(--realce-rgb),.055)}

/* TelaSite-yV1Byq_h.css, carregado ao abrir a tela do site, offset 2736 */
.site-moldura{...box-shadow:0 24px 70px rgba(var(--scrim-rgb),.5),0 0 0 1px rgba(var(--menta-rgb),.06)...}
```

O segundo vence. Na tela do site, a camada oficial de tema está morta.

Tamanho do estrago, contado por comparação de seletor e propriedade entre `visual-hub.css` e as
folhas de carga tardia:

- **95 seletores** em conflito.
- **181 pares de propriedade** que o `visual-hub.css` declara e perde.
- **7 chunks** de CSS tardio, e o `visual-hub.css` perde em todos os sete: Site, Studio, IDE,
  Conexões, Mapa, CRM e o painel de editor compartilhado.

Alguns exemplos, todos verificados no build:

| Seletor | Quem vence hoje | Quem deveria vencer |
|---|---|---|
| `.tela-site`, `.tela-studio`, `.tela-dashboard` (fundo) | `site.css:1`, `studio.css:1` | `visual-hub.css:419` |
| `.site-topo`, `.studio-topo`, `.editor-topo` | `site.css:11`, `studio.css:11` | `visual-hub.css:919` |
| `.crm-cartao` (padding, fundo) | `crm.css:232` | `visual-hub.css:743` |
| `.conx-cartao` (raio, padding) | `conexoes.css:210` | `visual-hub.css:807` |
| `.tela-ide` (raio, sombra) | `ide.css:1` | `visual-hub.css:993` |
| `.sw-painel` (fundo, sombra, z-index) | `workspaces.css:76` | `visual-hub.css:1040` |

Há também o inverso, igualmente frágil: `criacao.css` aparece no bundle no offset **216**, antes
do `global.css` no 8843. Ou seja, a folha da tela de criação carrega antes da base. Ninguém
escreveu isso, é efeito de hoisting de import do ES module.

**Consequência para o plano.** A Fase 4 do `01-fases.md` prevê "uma camada só, sem a herança de
duas camadas de CSS de hoje". Consolidar em um arquivo resolveria, mas resolve pelo motivo
errado e por acidente. A causa não é ter duas camadas, é a ordem de carga ser acidental. Se as
duas camadas viram uma e o novo arquivo continua sendo importado por `main.tsx` enquanto as
folhas de tela são importadas por componente lazy, o mesmo bug volta na primeira tela nova. O
conserto está na seção 4.

### 1.4 Cor fora do token

O CSS está quase limpo. São **114 hex** no total, e **108 deles vivem dentro dos blocos de
declaração de token**, o que é o lugar certo. Sobram 5 de verdade:

| Arquivo e linha | Valor | O que é |
|---|---|---|
| `app/web/src/estilos/canvas.css:1152` | `#2a0d0d` | texto do balão de confirmação de remoção |
| `app/web/src/estilos/canvas.css:2350` | `#fff` | fundo da moldura de preview de site |
| `app/web/src/estilos/canvas.css:2712` | `#fff` | fundo do preview customizado |
| `app/web/src/estilos/site.css:186` | `#fff` | fundo da moldura do viewport do site |
| `app/web/src/estilos/criacao.css:310` | `#fff` | fundo da miniatura de modelo |

Os quatro `#fff` são defensáveis: representam papel branco de site, não superfície do app. Vale
transformar em um token próprio, `--papel`, para ficar explícito que não é tema.

O problema real está no TypeScript. São **24 ocorrências de hex** em `.tsx` e `.ts`, e **8 delas
usam `#00c896`, o menta histórico, não o menta atual `#2fd4a7`**:

| Arquivo e linha | O que é |
|---|---|
| `app/web/src/componentes/cockpit/Cockpit.tsx:201` | cor da seta das arestas do canvas |
| `app/web/src/componentes/cockpit/Cockpit.tsx:1250` | cor dos pontos do fundo do canvas, `#1a2621`, ignora `--pontos-canvas` |
| `app/web/src/componentes/criacao/EtapasCriacao.tsx:83-85` | cor padrão do carrossel |
| `app/web/src/componentes/criacao/EtapasSite.tsx:67-69` | cor padrão do site |
| `app/web/src/componentes/editor/motor.ts:325,326,338,344` | contorno de seleção e guias do Studio |
| `app/web/src/componentes/editor/motorSite.ts:345,346` | contorno de seleção do Studio de site |

Os de `EtapasCriacao` e `EtapasSite` são cor da peça do cliente, não da interface, então podem
ficar. Os de `Cockpit.tsx`, `motor.ts` e `motorSite.ts` são interface do Hub e estão errados: o
canvas e o contorno de seleção pintam num verde que não é o verde do app desde 2026-07-17.

Há ainda **56 usos de `style={{ }}` inline** nos componentes. A maioria é geometria calculada,
que é uso legítimo. Um deles pinta cor: `comum/Telas.tsx:37`.

### 1.5 As escalas que não são escalas

| Propriedade | Declarações | Valores distintos |
|---|---|---|
| `font-size` | 557 | **24** em px, mais 6 em `em` |
| `font-weight` | 245 | **16** |
| `line-height` | 100 | **17** |
| `letter-spacing` | 61 | **21** |
| Espaçamento (`padding`, `gap`, `margin`) | 1.600+ | **42** |
| `border-radius` | 400+ | **31** |
| `box-shadow` | 203 | **117** (só 51 usam token) |
| `z-index` | 62 | **31** (só 8 usam o token `--z-*`) |
| Duração de transição e animação | 200+ | **41** |
| Curva de easing | 134 | 7 |
| `@keyframes` | | **36** |
| **Valores em px distintos em todo o CSS** | | **146** |

Detalhes que doem:

- Tamanhos de fonte com meio pixel: `9.5px`, `10.5px`, `11.5px`, `12.5px`, `13.5px`. São 68
  declarações no total. Meio pixel não existe na tela, o navegador arredonda, e o resultado
  varia com o zoom.
- Pesos de fonte em `590`, `620`, `650`, `660`, `680`, `720`, `730`, `760`. Isso só funciona com
  fonte variável. **O app não embarca nenhuma fonte**, não existe um único `@font-face` no
  projeto. O stack pede `"Segoe UI Variable Text"` e depois `"Inter"`. No Windows 11 a primeira
  existe e os pesos funcionam. Fora dali, os oito pesos intermediários colapsam em 400 ou 700 e
  a hierarquia inteira achata sem aviso.
- 117 sombras distintas em 203 declarações. Não existe escala de elevação, existe 117 decisões
  independentes.

### 1.6 Duplicação de componente, o custo real do redesenho

Contando só a regra raiz, sem pseudo e sem seletor descendente:

| Arquétipo | Implementações independentes |
|---|---|
| Superfície com fundo, borda e raio na mesma regra | **252** |
| Barra de topo de tela ou de painel | **41** |
| Véu, overlay ou visor | **36** |
| Botão com estilo próprio completo | **45** |
| Estado vazio | **22** |
| Chip, selo ou badge | **21** |
| Faixa de erro | **20** |
| Caixa ou balão de confirmação | **18** |
| Painel lateral | **12** |
| Modal, popover ou menu | **9** |
| Campo de formulário estilizado à parte | **22** seletores |
| Interruptor | **3** |

E o número que resume tudo:

> **Existem 352 elementos `<button>` nos componentes. Só 143 usam a classe base `.botao`.
> 209 botões, ou 59%, têm estilo próprio.**

O componente compartilhado `comum/Confirmacao.tsx` existe e é usado em 4 arquivos. Ao lado dele
convivem 18 confirmações escritas à mão.

### 1.7 Alpha, o custo escondido dos canais RGB

O padrão `rgba(var(--menta-rgb), 0.12)` foi criado para o alpha acompanhar o tema. Funciona, mas
como não existe token para o resultado, cada componente escolheu o seu alpha:

- **565 chamadas** de `rgba(var(--X-rgb), a)` no CSS.
- **154 combinações distintas** de cor mais alpha.
- Só o menta tem **49 valores de alpha diferentes**: `0.035`, `0.04`, `0.045`, `0.05`, `0.055`,
  `0.06`, `0.065`, `0.07`, `0.075`, `0.08`, `0.09`, `0.1`, `0.105`, `0.11`, `0.12`, `0.13`,
  `0.14` e por aí vai até `0.75`.
- O `--scrim-rgb` tem 34 alphas. O `--alerta-rgb` tem 23.

Quinze alphas entre 0,035 e 0,14 são visualmente a mesma coisa. São quinze decisões que ninguém
consegue manter coerentes à mão.

### 1.8 O que quebra em cada tema

Contraste medido por script contra a fórmula do WCAG 2.2, com os valores reais de
`visual-hub.css`. São 16 pares críticos vezes 3 temas, ou seja, 48 verificações. A tabela
completa está em `provas-design/contraste.md`.

> **A paleta de hoje falha em 13 das 48 verificações.**

**Escuro e Dark VKOS: 3 falhas cada.** O texto passa, mas sem folga, e o que falha é o que
ninguém testou.

| Par | Escuro | Dark VKOS | Mínimo | O que é |
|---|---|---|---|---|
| `--texto-fraco` sobre `--superficie-2` | **4,07:1** | **4,17:1** | 4,5:1 | metadado em linha selecionada ou hover |
| `--borda` sobre `--superficie` | **1,55:1** | **1,87:1** | 3:1 | borda de campo dentro de cartão |
| `--borda` sobre `--fundo` | **1,79:1** | **2,16:1** | 3:1 | borda de campo na tela |

O `--texto-fraco` sobre `--superficie` está em 4,51:1 no Escuro e 4,56:1 no Dark VKOS. Passa por
um centésimo. Assim que o fundo do cartão muda de hover, cai para 4,07:1 e falha.

**Claro: 7 falhas, e a pior é o botão principal.**

| Par | Medido | Mínimo | O que é |
|---|---|---|---|
| `--menta-escura` sobre `--menta` | **3,69:1** | 4,5:1 | rótulo do botão principal |
| `--amarelo` sobre `--superficie` | **3,61:1** | 4,5:1 | texto de aviso |
| `--menta` sobre `--fundo` | **3,73:1** | 4,5:1 | menta sobre o canvas |
| `--menta` sobre `--superficie` | **3,97:1** | 4,5:1 | menta como texto ou ícone |
| `--alerta` sobre `--superficie` | **3,99:1** | 4,5:1 | texto de erro |
| `--borda` sobre `--superficie` | **1,68:1** | 3:1 | borda de campo dentro de cartão |
| `--borda` sobre `--fundo` | **1,58:1** | 3:1 | borda de campo na tela |

**Borda de controle falha nos três temas, sem exceção.** O critério 1.4.11 do WCAG 2.2 exige 3:1
para a borda que é o único indicador de um controle, e é exatamente o caso do campo de texto do
Hub. Os valores vão de 1,55:1 a 2,16:1. Nenhum chega perto.

Isso não é detalhe de conformidade. É o que o estudo de eyetracking do Nielsen Norman Group
mediu: com sinalizadores fracos, as pessoas gastaram **22% mais tempo** e tiveram **25% mais
fixações** na mesma tarefa, com p < 0,05. O problema não é não ver o campo, é ver e não ter
certeza de que aquilo é um campo.

**O que só foi pensado no Escuro.** Encontrei três coisas:

1. `--confirmar-perigo-fundo` e `--confirmar-perigo-botao` são `rgba(60, 16, 16, 0.97)` no
   Escuro **e no Dark VKOS**, valor literal copiado, não derivado do tema. No Claro alguém
   lembrou e trocou.
2. `--grad-cerebro` tem override no Escuro e no Claro, mas não no Dark VKOS, que cai no valor
   base de `global.css`. Como o `visual-hub.css` mudou todos os fundos do Dark VKOS e não mexeu
   nesse gradiente, o nó do Cérebro está fora de sintonia com o resto do tema.
3. `--overlay-imagem-leve` e `--overlay-imagem-forte` são declarados só no `global.css` e nunca
   revisados depois que o `visual-hub.css` mudou os fundos. Os três valores estão calibrados
   para uma paleta que não existe mais.

### 1.9 Acessibilidade

- **13 véus** com `position: fixed` e `inset: 0`. Apenas **5** têm `role="dialog"` e **5** têm
  `aria-modal`. **Nenhum** usa o `<dialog>` nativo. Não há trap de foco em nenhum, incluindo o
  `comum/Confirmacao.tsx` compartilhado.
- **8 elementos `<img>` sem `alt`.**
- `prefers-reduced-motion` aparece em **7 dos 18** arquivos. O bloco global em
  `visual-hub.css:1190` zera a duração de tudo com `0.01ms !important`. Isso viola a
  recomendação da MDN, que é **substituir** movimento por opacidade, não apagar o feedback. Há
  **17 animações infinitas** no CSS, e o usuário com movimento reduzido perde o sinal de que a
  sessão está rodando.
- **Alvo de clique abaixo de 24px** (critério 2.5.8): três alvos reais, fora ícones dentro de
  botões maiores. `.chip-anexo .remover-anexo` em `composer.css:98` com 16px,
  `.criacao-remover-anexo` em `criacao.css:449` com 17px, `.toggle-marca` em `editor.css:397`
  com 20px.
- **35 usos de `backdrop-filter`.** Cada um força uma camada de composição própria. Numa tela
  com canvas React Flow animando, isso é custo de quadro por decoração.

---

## 2. Os princípios

Cinco. Cada um muda uma decisão concreta. Princípio que não muda decisão nenhuma ficou de fora.

### 2.1 Profundidade vem de camada, nunca de sombra

A Apple diz isso literalmente: o material "cria sensação de profundidade deixando a cor do fundo
atravessar", e no modo escuro o sistema usa dois conjuntos de fundo, **base** e **elevated**, com
o elevado mais claro para parecer que avança. A Linear e o Raycast fazem o mesmo e **não usam
sombra nenhuma**: escada de quatro superfícies mais um fio de 1px.

**Consequência prática:** as 117 sombras viram 3, e as 3 só existem para o que flutua de verdade
sobre outro conteúdo: popover, modal e elemento sendo arrastado. Cartão não tem sombra. Painel
não tem sombra. Barra de topo não tem sombra. A hierarquia sai de quatro níveis de superfície e
de um fio de 1px. Item selecionado sobe um degrau de superfície, não ganha sombra.

### 2.2 A borda tem dois trabalhos e eles não podem usar a mesma cor

O critério 1.4.11 exige 3:1 só onde a borda **é o único indicador do controle**. Onde ela é
decoração ou separação, pode ser sutil. Hoje o app usa `--borda` para as duas coisas, então
escolheu ser sutil em tudo, e falhou nos três temas.

**Consequência prática:** dois tokens com nome que não deixa confundir.

- `--linha`: separador, borda de cartão, divisória. Sutil de propósito, cerca de 1,3:1. Não
  precisa passar em nada.
- `--linha-forte`: borda de campo, de botão fantasma, de trilho de interruptor, de caixa de
  seleção. **Obrigada a 3:1 contra a superfície em que se apoia.** No Escuro isso significa
  `#59677c`, bem mais claro que o `#3a4552` de hoje. Sim, vai parecer menos macio. É o preço de
  o campo parecer um campo.

### 2.3 O menta é sinal, não decoração

A regra da Linear é explícita: a cor de destaque fica reservada para marca, ação primária, anel
de foco e ênfase de link, e **nunca preenche cartão nem vira fundo de seção**. A Apple diz o
mesmo: "aplique cor com parcimônia, reserve para ações primárias e indicadores de estado".

Hoje o menta aparece em 279 chamadas com 49 alphas diferentes, incluindo gradiente ambiente no
`body`, no `.shell-conteudo`, na `.tela-fluxo`, na `.area-canvas`, no `.studio-canvas` e no
`.site-viewport`. São seis gradientes de menta no fundo, empilhados, que ninguém enxerga
conscientemente e que todo mundo paga em contraste.

**Consequência prática:** os gradientes ambientais de menta saem. O menta fica em cinco lugares
e só: botão principal, anel de foco, item de navegação ativo, indicador de estado (sessão
rodando, conexão ligada) e a palavra HUB da marca. O glow deixa de ser enfeite e vira sinal de
sessão viva, que é o único lugar onde ele carrega informação.

### 2.4 Densidade é escolha do usuário, não do designer

Os quatro produtos mais elogiados em design que pesquisei chegaram na mesma resposta. A Linear
expõe contraste de 30 a 100 e gera o tema inteiro de três variáveis em LCH. O Radix expõe
`scaling` de 90% a 110% multiplicando espaçamento, fonte e entrelinha juntos. O Things 3 expõe
14 tamanhos de texto e reflui o layout inteiro. O Tailwind v4 reduziu o espaçamento a uma
variável `--spacing` única.

**Consequência prática:** toda a escala de espaçamento e de tipografia sai de `calc()` sobre uma
variável base, não de valores fixos. Isso não custa nada agora e abre o controle de densidade
depois sem refazer nada. É a diferença entre `--esp-8: 8px` e
`--esp-8: calc(var(--base) * 2)`.

### 2.5 Minimalismo que apaga sinalizador é regressão medida

O estudo do NN/g com 71 participantes e eyetracking mediu 22% mais tempo e 25% mais fixações
quando o sinalizador é fraco. A conclusão deles: "o problema não é o usuário nunca ver o
elemento, é que mesmo vendo ele não fica confiante de que é aquilo que quer, então continua
procurando".

**Consequência prática:** nenhum controle perde o sinalizador em nome da limpeza. O que se corta
é o que não carrega informação: gradiente ambiente, glow decorativo, sombra em elemento que não
flutua, borda dupla, animação de entrada em conteúdo que já estava lá. O que fica é borda de
campo visível, foco de teclado forte, estado ativo óbvio e alvo de clique de pelo menos 24px.

---

## 3. As escalas

Todos os valores prontos para virar token. A régua é a base 4, que é onde Linear, Radix, Tailwind
e Notion convergem. Nenhum sistema de interface densa usa base 8.

### 3.1 Tipografia

Sete degraus. Hoje são 24. A escala é apertada de propósito, no espírito do macOS, onde o corpo
é 13pt e tudo cabe entre 10 e 26.

| Token | Tamanho | Entrelinha | Peso | Tracking | Onde se usa |
|---|---|---|---|---|---|
| `--txt-micro` | 11px | 14px | 600 | +0,01em | rótulo de seção em maiúscula, contagem, selo |
| `--txt-legenda` | 12px | 16px | 400 | 0 | subtítulo, data, texto de ajuda |
| `--txt-corpo` | 13px | 18px | 400 | -0,005em | **o padrão do app** |
| `--txt-leitura` | 15px | 22px | 400 | -0,01em | markdown da IA, texto longo, editor |
| `--txt-titulo-p` | 17px | 22px | 600 | -0,015em | título de cartão, cabeçalho de painel |
| `--txt-titulo` | 22px | 28px | 600 | -0,02em | título de tela |
| `--txt-display` | 28px | 34px | 700 | -0,025em | saudação do Dashboard |

Regras que acompanham a escala:

- **Entrelinha em px absoluto**, nunca em número, e sempre par. É o padrão do Radix e evita o
  arredondamento diferente por tamanho.
- **Tracking negativo cresce com o tamanho, e o menor abre um pouco.** É a regra combinada de
  Linear (aperta quando cresce) e Raycast (abre quando é miúdo). O Radix faz as duas.
- **Quatro pesos e só quatro: 400, 500, 600, 700.** Os oito pesos intermediários de hoje (590,
  620, 650, 660, 680, 720, 730, 760) dependem de fonte variável que o app não embarca. Quatro
  pesos funcionam em qualquer máquina. Se um dia o Inter Variable for embarcado localmente, os
  intermediários voltam sem quebrar nada.
- **Tamanho óptico pelo nome da fonte, de graça no Windows.** O Segoe UI Variable tem três
  cortes reais: Small até 12px, Text de 13 a 20px, Display acima de 20px. Três variáveis de
  família, uma por faixa, entregam o efeito de optical size da Apple sem embarcar nada:
  ```css
  --fonte-mini:    "Segoe UI Variable Small Semibold", "Segoe UI Variable Small", var(--fonte);
  --fonte:         "Segoe UI Variable Text", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --fonte-display: "Segoe UI Variable Display", var(--fonte);
  ```
- `font-variant-numeric: tabular-nums` em tudo que é número que muda: custo, contagem, data,
  dimensão. Já existe em 6 lugares hoje, precisa virar regra.

### 3.2 Espaçamento

Oito degraus, base 4. Hoje são 42 valores.

| Token | Valor | Onde se usa |
|---|---|---|
| `--esp-2` | 2px | folga entre ícone e rótulo colados |
| `--esp-4` | 4px | folga interna de chip, entre linhas de um bloco |
| `--esp-8` | 8px | folga padrão entre irmãos, padding de controle pequeno |
| `--esp-12` | 12px | padding de cartão compacto, folga entre grupos |
| `--esp-16` | 16px | padding de cartão, folga entre blocos |
| `--esp-24` | 24px | padding de painel, folga entre seções |
| `--esp-32` | 32px | margem lateral de tela |
| `--esp-48` | 48px | respiro de topo e de rodapé de tela |

O `6px` sai. Hoje ele aparece 125 vezes e sempre podia ser 4 ou 8. Manter o 6 é manter a porta
aberta para o 5, o 7 e o 9, que também estão lá.

Todos derivam de `--base: 4px`, então `--esp-12: calc(var(--base) * 3)`. Trocar `--base` para
`4.4px` deixa a interface inteira 10% mais folgada, sem tocar em nenhum componente. É o
mecanismo do Radix.

### 3.3 Raio

Cinco degraus. Hoje são 31.

| Token | Valor | Onde se usa |
|---|---|---|
| `--raio-p` | 6px | chip, selo, miniatura, caixa de seleção |
| `--raio` | 8px | **botão, campo, item de lista, item de navegação** |
| `--raio-g` | 12px | cartão, popover, menu |
| `--raio-gg` | 16px | modal, painel flutuante, janela da IDE |
| `--raio-pilula` | 999px | badge de status, contador, avatar |

O 8px para botão e campo é convergência total: Linear, Raycast e Notion usam 8 nos dois. `50%`
continua existindo para ponto e avatar, mas é forma, não raio, e não vira token.

### 3.4 Elevação

Quatro superfícies e três sombras. Hoje são 117 sombras.

**A escada de superfície é a hierarquia principal.** Cada degrau é uma cor sólida do tema, não
uma transparência empilhada:

| Nível | Token | O que fica aqui |
|---|---|---|
| 0 | `--fundo` | o canvas do app, a área de trabalho |
| 1 | `--superficie` | sidebar, cartão, painel, barra de topo |
| 2 | `--superficie-alta` | hover de linha, item selecionado, campo, cabeçalho de coluna |
| 3 | `--superficie-flutuante` | popover, menu, modal, elemento arrastado |

**A sombra só entra quando o elemento realmente flutua sobre outro conteúdo:**

| Token | Valor | Onde se usa |
|---|---|---|
| `--sombra-popover` | `0 4px 12px` no scrim a 0,18 | menu, popover, autocomplete |
| `--sombra-modal` | `0 16px 48px` no scrim a 0,28 | modal, janela da IDE, painel flutuante |
| `--sombra-arrasto` | `0 8px 24px` no scrim a 0,32 | cartão sendo arrastado no kanban |

Cartão, painel, barra de topo e botão perdem a sombra. Ganham o fio de `--linha` de 1px.

O `--glow` sobrevive num lugar só: `--glow-vivo`, o halo do estado "sessão rodando" e do ponto
de conexão ligada. Deixa de ser fundo do botão principal e de todo hover.

### 3.5 Movimento

Três durações e duas curvas. Hoje são 41 durações, 7 curvas e 36 keyframes.

| Token | Valor | Onde se usa |
|---|---|---|
| `--mov-rapido` | 120ms | cor, borda, opacidade, hover, foco |
| `--mov-padrao` | 200ms | popover abrindo, painel deslizando, modal entrando |
| `--mov-lento` | 320ms | troca de tela, camada de tela cheia |
| `--curva` | `cubic-bezier(0.32, 0.72, 0, 1)` | tudo que entra ou se move |
| `--curva-simetrica` | `cubic-bezier(0.4, 0, 0.2, 1)` | o que vai e volta, tipo interruptor |

A Apple não publica número de duração nem de curva em lugar nenhum da HIG, então esses valores
vêm da prática comum de interface de desktop e do que a própria HIG pede em prosa: "brevidade e
precisão no movimento de feedback".

**Movimento reduzido.** O bloco global de hoje mata tudo com `0.01ms !important`. A MDN é
explícita: `reduce` significa "remover, reduzir **ou substituir**", e o exemplo canônico troca
uma animação de `transform: scale()` por uma de `opacity`. A Apple pede a mesma coisa: trocar
transição de eixo por fade, não animar blur, não animar profundidade.

A regra nova, em três linhas:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-property: opacity, background-color, border-color, color, fill;
    animation-duration: var(--mov-padrao);
  }
  .glow-vivo, [data-mov="pulso"] { animation-name: fade-suave; }
}
```

Ou seja: o movimento de posição some, o feedback de cor e opacidade fica, e o pulso da sessão
rodando vira um fade em vez de sumir. Quem liga movimento reduzido continua sabendo que a IA
está trabalhando.

### 3.6 Camadas de empilhamento

Seis níveis. Hoje são 31 valores literais e só 8 usam token.

| Token | Valor | O que fica aqui |
|---|---|---|
| `--z-base` | 0 | conteúdo normal |
| `--z-fixo` | 10 | barra de topo grudada, coluna congelada |
| `--z-popover` | 100 | menu, popover, autocomplete, dica |
| `--z-camada` | 200 | painel lateral, IDE, camada de tela |
| `--z-veu` | 300 | véu de modal |
| `--z-modal` | 310 | conteúdo do modal, sempre véu mais 10 |
| `--z-aviso` | 400 | toast, aviso de sistema |

Regra: nenhum `z-index` literal fora deste conjunto. O `3000` que existe hoje no `mapa.css` e o
`2147483646` do motor do editor ficam de fora do sistema, porque vivem dentro de iframe da peça,
que é outro contexto de empilhamento.

---

## 4. A camada de tokens

### 4.1 A arquitetura, e o conserto que falta

O `CLAUDE.md` define duas camadas, e elas continuam. A mudança é fazer a ordem ser **declarada**
em vez de acidental.

```
Camada 1  base   global.css      as escalas e o contrato de nome. Nenhum valor final de cor.
Camada 2  tela   crm.css, site.css, studio.css e as outras 15
Camada 3  tema   visual-hub.css  o valor final de cada token por tema. Sempre por cima.
```

A ferramenta é `@layer`, nativa do CSS e suportada em Chrome 99, Safari 15.4 e Firefox 97. A
ordem das camadas passa a ser declarada uma vez e vale para sempre, independente de qual arquivo
o Vite injeta primeiro:

```css
/* primeira linha de global.css */
@layer base, tela, tema;
```

E cada arquivo se anuncia:

```css
/* global.css  */  @layer base { ... }
/* crm.css     */  @layer tela { ... }
/* visual-hub  */  @layer tema { ... }
```

Isso resolve os 95 seletores e os 181 pares de propriedade da seção 1.3 com uma linha por
arquivo. Sem mover código, sem mudar seletor, sem mexer em componente.

**Por que não consolidar em um arquivo só, como o `01-fases.md` previa.** Consolidar resolve
hoje e volta a quebrar na primeira tela nova, porque a causa é a ordem de injeção do bundler,
não a quantidade de arquivos. O `@layer` resolve a causa. E vale registrar o trade-off honesto:
consolidar num arquivo é mais simples de ler, mas um arquivo de 3.000 linhas com três temas
dentro é pior de manter do que dois arquivos com responsabilidade clara. Recomendo `@layer` e
manter as duas camadas.

Se o Jesse preferir mesmo o arquivo único, o `@layer` continua sendo necessário para as 15
folhas de tela. Ele não é alternativa à consolidação, é pré-requisito das duas opções.

### 4.2 Quantas camadas de token

Duas: primitivo e semântico. **Não haverá token de componente.**

A pesquisa é clara sobre o custo. Nate Baldwin, que trabalhou no Spectrum da Adobe, mediu: um
componente com 3 variações, 3 tamanhos e 4 estados gera **432 tokens**, e o Spectrum chegou a
**210.180 tokens num JSON de 18MB**. Nome real do sistema deles:
`spectrum-button-m-warning-quiet-overbackground-textonly-focus-ring-animation-duration`.

O que a camada de componente compra é isolamento quando existem vários consumidores que você não
controla. O VKOS Hub tem um front React só, num repositório só, com um dono só. O terceiro nível
cobraria nome longo e token morto e não entregaria isolamento nenhum. Primer e Polaris, dois
sistemas grandes, também expõem duas camadas ao consumidor.

A regra de promoção do Nathan Curtis fica como válvula: nasce local no componente, sobe para
semântico quando **três ou mais** componentes usam. "Don't globalize decisions prematurely."

**Divisão prática:** as escalas que não mudam por tema (espaçamento, raio, tipografia,
movimento, z-index) ficam só no primitivo, declaradas uma vez em `@layer base`. A cor vai direto
para o semântico com valor por tema, que é o que o `visual-hub.css` já faz e funciona bem.

### 4.3 Alpha: o que muda

Os canais `-rgb` ficam, mas encolhem de nove para dois. Só `--scrim-rgb` (véu de modal, sombra)
e `--menta-rgb` (anel de foco, glow vivo) precisam de alpha variável. Os outros sete somem.

Todo o resto vira token sólido declarado por tema. As 154 combinações de cor mais alpha viram 9
tokens de superfície tingida:

- `--menta-tenue`, `--menta-linha`
- `--alerta-tenue`, `--alerta-linha`
- `--aviso-tenue`, `--aviso-linha`
- `--neutro-tenue` (o `rgba(var(--suave-rgb), 0.06)` de hover)
- `--papel` (o `#fff` que representa papel de site, não superfície do app)
- `--pontos-canvas`

Considerei `color-mix()` e a sintaxe de cor relativa. `color-mix()` é Baseline desde maio de
2023 e cor relativa tem 88,4% global. Os dois funcionam no Edge e no Chrome do Windows 11, que
é onde o Hub roda. Mas nenhum dos dois resolve o problema real, que não é a técnica de alpha, é
não existir nome para o resultado. Com nove tokens nomeados, ninguém precisa de alpha no local
da chamada. Fica registrado que `color-mix()` é a ferramenta certa quando o Hub precisar gerar
tom derivado em tempo de execução, tipo um tema por cliente.

### 4.4 Os tokens de cor, valor por tema

Todos os valores abaixo foram verificados por script contra a fórmula do WCAG 2.2. **48
verificações nos três temas: a paleta de hoje falha em 13, a proposta falha em zero.** A tabela
com os dois lados lado a lado está em `provas-design/contraste.md`.

#### Superfícies

| Token | Escuro | Dark VKOS | Claro |
|---|---|---|---|
| `--fundo` | `#101318` | `#08100e` | `#f2f5f4` |
| `--superficie` | `#171b21` | `#101b17` | `#fcfdfd` |
| `--superficie-alta` | `#1e232b` | `#17251f` | `#eaefed` |
| `--superficie-flutuante` | `#262d37` | `#1e2f28` | `#fcfdfd` |
| `--papel` | `#ffffff` | `#ffffff` | `#ffffff` |

O degrau entre superfícies fica entre 1,08:1 e 1,14:1, que é o mesmo espírito do `systemGray6`
da Apple. É separação percebida, não contraste medido, e por isso o fio de `--linha` é
obrigatório junto. No Claro o flutuante é igual à superfície de propósito: um popover branco
sobre fundo cinza já se separa, e quem completa é a sombra.

#### Linhas

| Token | Escuro | Dark VKOS | Claro | Regra |
|---|---|---|---|---|
| `--linha` | `#2b323c` | `#22362f` | `#dce4e1` | decoração, 1,3:1, sem exigência |
| `--linha-forte` | `#59677c` | `#446d5f` | `#748f84` | **controle, 3:1 obrigatório** |

Contraste medido de `--linha-forte` sobre `--superficie`: 3,01:1 no Escuro, 3,02:1 no Dark VKOS,
3,43:1 no Claro. Sobre `--fundo`: 3,24:1, 3,30:1 e 3,19:1.

#### Texto

| Token | Escuro | Dark VKOS | Claro |
|---|---|---|---|
| `--texto` | `#f0f3f7` | `#f0f7f4` | `#141f1b` |
| `--texto-suave` | `#b3bcc9` | `#adbfb8` | `#4c5c56` |
| `--texto-fraco` | `#8a94a3` | `#83968f` | `#5d6d66` |

O `--texto-fraco` foi clareado para ter folga real. Sobre `--superficie`: 5,63:1, 5,65:1 e
5,36:1, contra os 4,51:1 sem margem de hoje. Ele também passa sobre `--superficie-alta`, que é o
caso que hoje falha nos dois temas escuros: 5,15:1, 5,09:1 e 4,70:1, contra 4,07:1, 4,17:1 e
4,59:1.

#### Menta

| Token | Escuro | Dark VKOS | Claro |
|---|---|---|---|
| `--menta` | `#2fd4a7` | `#21d6a4` | `#03795e` |
| `--menta-tenue` | `#1a3131` | `#123128` | `#e1eeec` |
| `--menta-linha` | `#2fd4a7` | `#21d6a4` | `#03795e` |
| `--sobre-menta` | `#04231b` | `#03211a` | `#ffffff` |
| `--menta-rgb` | `47 212 167` | `33 214 164` | `3 121 94` |

O `#2fd4a7` do Escuro é o menta oficial da identidade, intocado. O do Claro escureceu de
`#078f70` para `#03795e` por necessidade: era a única forma de o rótulo do botão principal
passar em 4,5:1. Agora dá 5,38:1 com rótulo branco, contra 3,69:1 hoje.

#### Estado

| Token | Escuro | Dark VKOS | Claro |
|---|---|---|---|
| `--alerta` | `#ff7b7b` | `#ff7b7b` | `#cf3b3b` |
| `--alerta-tenue` | `#33272c` | `#2d2723` | `#f7e8e8` |
| `--alerta-linha` | `#ff7b7b` | `#ff7b7b` | `#cf3b3b` |
| `--aviso` | `#e8bd6d` | `#f0c674` | `#8e6a19` |
| `--aviso-tenue` | `#302e2a` | `#2b3022` | `#f0ede4` |
| `--aviso-linha` | `#e8bd6d` | `#f0c674` | `#8e6a19` |

O `--aviso` resolve o token fantasma de `crm.css:1539`. Não existe `--ok` separado: verde de
sucesso é o próprio menta, que já é a cor de acerto do app.

#### Utilidade

| Token | Escuro | Dark VKOS | Claro |
|---|---|---|---|
| `--neutro-tenue` | `#1c2129` | `#152019` | `#e9eeec` |
| `--pontos-canvas` | `#252c35` | `#183128` | `#d3ddd8` |
| `--scrim-rgb` | `4 7 10` | `2 8 6` | `18 29 25` |

O véu de modal usa `rgb(var(--scrim-rgb) / 0.55)` nos escuros e `/ 0.35` no Claro. São dois
valores, não 34.

#### O que morre

Estes tokens somem, com destino:

| Token de hoje | Vira |
|---|---|
| `--fundo-2`, `--fundo-3` | `--superficie` e `--superficie-alta` |
| `--superficie-2` | `--superficie-alta` |
| `--borda`, `--borda-forte` | `--linha` e `--linha-forte`, com significado novo |
| `--menta-clara`, `--menta-escura` | `--menta` e `--sobre-menta` |
| `--alerta-suave`, `--amarelo` | `--alerta` e `--aviso` |
| `--painel-rgb`, `--realce-rgb`, `--suave-rgb`, `--fraco-rgb`, `--alerta-rgb`, `--amarelo-rgb`, `--fundo-rgb` | tokens sólidos tingidos |
| `--confirmar-perigo-*` (4 tokens) | `--alerta-tenue` e `--alerta-linha` |
| `--overlay-imagem-leve`, `--overlay-imagem-forte` | dois valores de `--scrim-rgb` com alpha |
| `--glow`, `--glow-forte` | `--glow-vivo`, só no estado de sessão rodando |
| `--grad-cerebro` | fica, mas ganha valor nos três temas |
| `--raio-g` (órfão), `--z-toast` (órfão) | apagados |

De 51 tokens vamos para cerca de 62, mas com cobertura completa: cor, tipografia, espaçamento,
raio, elevação, movimento e camada. Hoje 51 tokens cobrem só cor, e 146 valores de px soltos
cobrem o resto.

---

## 5. Inventário de componentes

A regra de leitura: **um componente único** significa um arquivo em `app/web/src/componentes/comum/`
com uma implementação de CSS. **Morre** significa que o CSS some e o uso é substituído.

### 5.1 O que vira componente único

| Componente | Substitui | Variantes |
|---|---|---|
| **`Botao`** | 45 botões com estilo próprio, 209 `<button>` sem base | `principal`, `neutro`, `fantasma`, `perigo`, mais `tamanho` em `p` e `m`, mais `soIcone` |
| **`Campo`** | 22 seletores de campo espalhados por 9 arquivos | `texto`, `area`, `selecao`, `busca`, `cor`, mais estados de erro e desabilitado |
| **`Superficie`** | 252 regras com fundo, borda e raio | `nivel` de 1 a 3, mais `interativa` |
| **`Cartao`** | `.cartao-peca`, `.cartao-fonte`, `.cartao-site`, `.crm-cartao`, `.conx-cartao`, `.criacao-card`, `.dash-hero`, `.setup-cartao`, `.fontes-hub-card`, `.crm-lead-cartao` | `compacto` e `normal` |
| **`Chip`** | 21 chips, selos, tags e badges | `neutro`, `menta`, `alerta`, `aviso`, mais `removivel` |
| **`Selo`** | `.badge` e as 6 classes de `.status-*` | um por estado de sessão |
| **`BarraTopo`** | 41 barras de topo de tela e de painel | `tela`, `painel`, `coluna` |
| **`Modal`** | 9 modais e popovers, mais 13 véus | usa `<dialog>` nativo, com trap de foco e Esc de graça |
| **`Popover`** | `.tema-menu`, `.sw-painel`, `.studio-baixar-menu`, `.editor-imagem-menu`, `.menu-contexto`, `.popover-fluxos`, `.ide-controle-popover`, `.crm-adiar-menu`, `.crm-autocomplete-lista` | ancorado, com `ancora` e `alinhamento` |
| **`PainelLateral`** | 12 painéis laterais | `lado`, `largura`, `flutuante` |
| **`Confirmacao`** | 18 confirmações, incluindo o componente atual que só 4 arquivos usam | `perigo` e `neutra`, mais a forma de balão ancorado |
| **`EstadoVazio`** | 22 estados vazios | ícone, título, texto, ação |
| **`Carregando`** | 21 estados de carregamento | `giro`, `esqueleto`, `linha` |
| **`Faixa`** | 20 faixas de erro | `erro`, `aviso`, `informacao`, `sucesso` |
| **`Interruptor`** | `.conx-switch`, `.criacao-switch`, `.ide-chat-toggle` | um só |
| **`Rotulo`** | `.rotulo-secao` e as 9 cópias dele | um só |
| **`Grupo`** | os 12 grupos de botão segmentado (`.site-modo`, `.ps-escopo`, `.site-presets`, `.crm-abas`, `.crm-leads-subabas`, `.criacao-stepper` e outros) | `abas` e `segmentado` |

Dezessete componentes cobrem os 252 arquétipos de superfície de hoje.

### 5.2 O que morre e não é substituído

| O que sai | Motivo |
|---|---|
| Os 6 gradientes ambientais de menta (`body`, `.shell-conteudo`, `.tela-fluxo`, `.area-canvas`, `.studio-canvas`, `.site-viewport`) | ruído que custa contraste e não carrega informação |
| `--glow` e `--glow-forte` como fundo de botão e de hover | vira `--glow-vivo`, só no estado de sessão rodando |
| 35 usos de `backdrop-filter` | camada de composição por decoração, com canvas animando ao lado. Fica em zero ou um lugar, no véu de modal |
| A sombra de `.cartao-*`, `.crm-cartao`, `.conx-cartao`, `.dash-hero`, `.no-sessao`, `.fontes-hub-card` e mais 240 regras | profundidade vem da escada de superfície |
| `transform: translateY(-1px)` e `-2px` no hover de cartão | 34 ocorrências. Cartão que pula no hover é ruído numa tela com 40 cartões |
| `.botao-perigo-solido` | vira `Botao` com `perigo` e `solido` |
| Os 36 `@keyframes` | ficam 6: `entrar`, `sair`, `girar`, `pulsar`, `fade-suave`, `surgir` |
| `--raio-g` e `--z-toast` órfãos | nunca foram usados |

### 5.3 Para onde vai cada variação de hoje

| Hoje | Amanhã |
|---|---|
| `.botao`, `.botao-principal`, `.botao-neutro`, `.botao-fantasma`, `.botao-perigo`, `.botao-perigo-solido` | `Botao` com `variante` |
| `.botao-icone-perigo`, `.botao-excluir-peca`, `.crm-botao-excluir`, `.bv-botao`, `.fluxo-botao`, `.esq-botao` | `Botao` com `soIcone` |
| `.botao-baixar-tudo`, `.botao-editar-peca`, `.botao-abrir-site`, `.abrir-nova-aba`, `.mini-abrir` | `Botao` com `tamanho="p"` |
| `.studio-zoom-btn`, `.site-zoom-btn`, `.editor-nav-btn`, `.preset-btn`, `.site-preset-btn`, `.site-modo-btn`, `.ps-escopo-btn` | `Grupo` com `segmentado` |
| `.crm-abas`, `.crm-leads-subabas`, `.criacao-stepper`, `.mapa-modos` | `Grupo` com `abas` |
| `.chip`, `.chip-alvo`, `.chip-anexo`, `.chip-imagem`, `.chip-filtro`, `.criacao-chip`, `.crm-tag`, `.ps-chip`, `.mapa-skill-chip` | `Chip` |
| `.badge`, `.status-fila`, `.status-iniciando`, `.status-rodando`, `.status-concluida`, `.status-erro`, `.status-parada`, `.cerimonia-selo`, `.criacao-selo`, `.site-selo`, `.dash-card-selo`, `.crm-lead-selo`, `.ide-chat-selo`, `.setup-motor-selo` | `Selo` |
| `.overlay`, `.visor`, `.lightbox`, `.overlay-fonte`, `.overlay-preview`, `.overlay-tela-cheia`, `.overlay-cerebro`, `.criacao-fundo`, `.cerimonia-fundo`, `.crm-modal-fundo`, `.dash-overlay-wizard`, `.galeria-fontes-camada`, `.ps-fundo` | `Modal` (o véu vira parte do `<dialog>`) |
| `.cartao-confirmacao`, `.criacao-confirma`, `.editor-confirm`, `.site-confirm`, `.studio-confirm`, `.ps-confirma`, `.conx-motor-confirmacao`, `.crm-aviso-confirmar`, `.ide-balao-excluir`, `.aviso-confirmar`, `.aviso-remover-fluxo`, `.sw-balao` | `Confirmacao` |
| `.crm-painel`, `.editor-painel`, `.ps-painel`, `.site-ajuste`, `.studio-ajuste`, `.mapa-painel`, `.cerimonia-painel`, `.pagina-ampliada-painel`, `.sw-painel` | `PainelLateral` |
| `.fluxo-vazio`, `.galeria-vazia`, `.grade-vazia`, `.crm-lista-vazia`, `.crm-coluna-vazia`, `.crm-leads-vazio`, `.recentes-vazio`, `.ide-editor-vazio`, `.mapa-painel-vazio`, `.sw-vazio`, `.painel-vazio`, `.container-vazio`, `.ps-vazio`, `.galeria-fontes-vazia`, `.cartao-peca-vazio`, `.cartao-site-vazio` | `EstadoVazio` |
| `.giro`, `.conx-carregando`, `.crm-carregando`, `.crm-leads-carregando`, `.site-carregando`, `.studio-carregando`, `.sw-carregando`, `.tela-hub-carregando`, `.ide-editor-carregando`, `.dash-wizard-carregando`, `.site-exportar-carregando` | `Carregando` |
| `.conx-erro`, `.crm-painel-erro`, `.crm-leads-erro`, `.editor-erro`, `.galeria-fontes-erro`, `.ide-arvore-erro`, `.ide-chat-erro`, `.ide-editor-erro`, `.setup-erro`, `.site-ajuste-erro`, `.studio-ajuste-erro`, `.sw-erro`, `.cerimonia-erro`, `.crm-erro-faixa`, `.conx-erro-topo`, `.site-erro-barra`, `.studio-erro-barra`, `.ps-erro`, `.geracao-flutuante-erro`, `.editor-imagem-erro` | `Faixa` |

### 5.4 Os três arquivos de ícone

Existem `comum/Icones.tsx` com 25 ícones, `cockpit/iconesCockpit.tsx` com 1 e `telas/icones.tsx`
com 5. Além deles há 24 `<svg>` inline em 13 componentes. Tudo vai para `comum/Icones.tsx`, com
um tamanho padrão de 16px e `currentColor` obrigatório, para o ícone acompanhar o token do texto
sem prop de cor.

---

## 6. A ordem de implementação

Nove etapas. Cada uma fecha com os três verdes do `CONTRIBUTING.md` e com a interface funcionando.
Nenhuma delas deixa o app pela metade.

### Etapa 1: consertar a ordem da cascata

Uma linha por arquivo de CSS. `@layer base, tela, tema;` no topo do `global.css`, e cada folha se
declara na sua camada.

**Entrega:** a camada oficial de tema volta a vencer nas sete telas onde ela perde hoje.
**Mudança visual esperada:** os 181 pares de propriedade da seção 1.3 passam a aplicar o valor do
`visual-hub.css`. Isso é o comportamento que sempre foi o pretendido, mas na prática vai mudar
pixel em Site, Studio, IDE, Conexões, Mapa e CRM. Precisa de uma passada de olho tela a tela.
**Trava:** um teste que lê o CSS do build e afirma que a primeira regra é a declaração de ordem
das camadas, e que nenhum arquivo de tela declara fora de `@layer tela`.
**Por que primeiro:** enquanto essa ordem for acidental, qualquer token novo entra numa base que
o bundler pode inverter. Toda etapa seguinte depende desta.

### Etapa 2: as escalas entram, sem consumidor

Adiciona ao `@layer base` os tokens de tipografia, espaçamento, raio, elevação, movimento e
z-index das seções 3.1 a 3.6. Ninguém consome ainda.

**Entrega:** zero mudança visual. O app fica idêntico.
**Trava:** um teste que afirma que os tokens existem e que a base é `calc()` sobre `--base`.

### Etapa 3: as cores novas entram como apelido

Os tokens de cor da seção 4.4 entram com os valores novos. Os nomes antigos viram apelido do
novo: `--borda: var(--linha)`, `--superficie-2: var(--superficie-alta)` e assim por diante.

**Entrega:** o app inteiro continua funcionando sem tocar em componente. Muda a cor, não a
estrutura. As seis falhas de contraste do tema Claro somem.
**Trava:** um teste que calcula a razão de contraste dos 16 pares críticos nos três temas e falha
se algum descer do mínimo. É o mesmo script que gerou a tabela da seção 4.4.
**Cuidado:** as 8 cores hardcoded de `Cockpit.tsx`, `motor.ts` e `motorSite.ts` precisam ler o
token nesta etapa, senão o canvas e o contorno de seleção ficam num verde diferente do resto.

### Etapa 4: os primitivos, provados numa tela pequena

Constrói `Botao`, `Campo`, `Chip`, `Selo`, `Rotulo` e `Superficie` em `comum/`. Aplica só na tela
de Conexões, que é a menor do app com 539 linhas de componente e 465 de CSS.

**Entrega:** Conexões inteira no sistema novo. O resto do app intocado.
**Por que Conexões:** é pequena, tem botão, campo, cartão, interruptor, chip e faixa de erro,
então exercita quase todos os primitivos. Se o sistema não serve para ela, serve para nada.

### Etapa 5: as camadas

Constrói `Modal` sobre o `<dialog>` nativo, `Popover`, `PainelLateral` e `Confirmacao`. Substitui
os 9 modais, os 13 véus, os 12 painéis e as 18 confirmações.

**Entrega:** trap de foco, Esc e véu de graça em toda camada, que hoje não existe em lugar
nenhum. Resolve o critério 2.4.11 do WCAG 2.2.
**Trava:** teste que abre cada camada, dispara Tab e afirma que o foco não escapa.

### Etapa 6: os estados

`EstadoVazio`, `Carregando` e `Faixa`. Substitui as 22, 21 e 20 implementações.

**Entrega:** todo estado vazio do app passa a ter ícone, título, texto e ação, que hoje varia.

### Etapa 7: tela a tela, na ordem do uso

Uma tela por vez, cada uma fechando verde. A ordem sai de quanto o Jesse usa e de quanto a tela
custa:

1. **Dashboard**, a porta de entrada, 446 linhas de componente e 488 de CSS.
2. **CRM**, a tela de trabalho diário, 1.152 linhas e 1.851 de CSS. É a maior folha depois do
   canvas.
3. **Cockpit e canvas**, 1.370 linhas e 2.734 de CSS. A maior folha do app.
4. **Studio de carrossel**, 706 linhas.
5. **Tela de site e Studio de site**, 1.629 linhas.
6. **IDE**, 297 linhas de tela mais o chat.
7. **Criação**, os dois wizards.
8. **Mapa** e **Setup**, que são as menos usadas.

**Regra em cada tela:** a folha de CSS da tela só pode conter layout, ou seja, `grid`, `flex`,
posição e dimensão. Cor, tipografia, raio, sombra e movimento vêm do componente. Se a tela
precisa de uma cor, ou ela usa um token ou o componente ganha uma variante.

### Etapa 8: acessibilidade, o que sobrou

- `alt` nas 8 imagens sem.
- `aria-label` em todo botão só com ícone.
- Os 3 alvos abaixo de 24px sobem, ou ganham espaçamento de 24px entre centros, que é a exceção
  do critério 2.5.8.
- `scroll-padding-top` igual à altura da barra grudada, para o foco de teclado não ficar embaixo
  dela.
- O bloco de `prefers-reduced-motion` troca de "matar tudo" para "trocar por fade", como na
  seção 3.5.

### Etapa 9: apagar

Remove os apelidos da Etapa 3, os tokens mortos, as classes que nenhum componente usa mais e os
30 `@keyframes` que sobraram.

**Trava:** um teste que varre o CSS e falha se achar hex fora dos blocos de token, `z-index`
literal fora da escala, `font-size` fora dos sete degraus ou valor de espaçamento fora dos oito.
Sem essa trava, em três meses o sistema volta a ter 146 valores de px.

**Ordem entre a Etapa 9 e a Fase 6 (Studio).** A Etapa 9 só fecha depois que todas as telas
passaram. Se o Studio da Fase 6 começar antes, ele nasce em cima do sistema novo de qualquer
jeito, porque a Etapa 4 já entregou os primitivos. Não há bloqueio.

---

## 7. O que NÃO fazer

**Não consolidar as duas camadas de CSS antes da Etapa 1.** Consolidar sem `@layer` resolve o
sintoma e devolve o bug na primeira tela nova. A causa é a ordem de injeção do bundler.

**Não trocar de biblioteca de componente.** Radix Themes, shadcn e Mantine resolveriam parte do
trabalho e trariam junto uma paleta, uma escala e um jeito de nomear que não são os do VKOS. O
app tem 64 componentes que já funcionam e uma identidade fechada. O custo de portar é maior que
o de escrever 17 componentes próprios, e o `CONTRIBUTING.md` já pede recurso nativo antes de
biblioteca. O `<dialog>` nativo, o `@layer` nativo e o `:focus-visible` nativo cobrem o que
importa.

**Não criar camada de token de componente.** O número da Adobe é 210.180 tokens e 18MB de JSON.
O Hub tem um front, um repositório e um dono. O terceiro nível cobra nome longo e entrega
isolamento que ninguém precisa aqui.

**Não usar `!important` para fazer o tema vencer.** É a tentação óbvia quando se descobre o bug
da seção 1.3, e resolve por um dia. Depois vira guerra de `!important`. Existem 9 hoje, e o
número certo continua sendo perto de zero. O `@layer` faz o mesmo trabalho sem dívida.

**Não apagar movimento sob `prefers-reduced-motion`.** A MDN pede remover, reduzir **ou
substituir**. Zerar a duração de tudo, que é o que o `visual-hub.css:1190` faz hoje, apaga o
sinal de "a IA está trabalhando" para quem mais precisa dele. Trocar por fade custa três linhas.

**Não deixar o menta virar fundo de área.** A regra da Linear é literal: a cor de destaque nunca
preenche cartão nem vira fundo de seção. Os seis gradientes ambientais de menta de hoje são
exatamente isso, e cada um deles empurra o contraste do texto para baixo.

**Não subir a densidade cortando o texto.** O corpo vai para 13px, que é o corpo do macOS, mas o
`--texto-fraco` vai ficar mais claro, não mais escuro, e o padding de cartão continua em 16px. O
que encolhe é o espaço morto entre blocos, não a legibilidade. Densidade que obriga a apertar os
olhos não é densidade, é economia mal feita.

**Não usar peso de fonte intermediário enquanto não houver fonte embarcada.** Os oito pesos de
hoje entre 560 e 760 só funcionam com Segoe UI Variable presente. Em qualquer outra máquina a
hierarquia inteira achata e ninguém percebe, porque o navegador não avisa.

**Não medir contraste no olho.** Todos os 48 pares da seção 4.4 foram medidos por script. A
Etapa 3 leva esse script como teste. Cor aprovada no olho foi como o tema Claro chegou a um
botão principal de 3,69:1.

**Não redesenhar o canvas do cockpit junto com o resto.** São 2.734 linhas de CSS, com React
Flow por baixo e regras de posicionamento acopladas ao motor de nós. Ele entra na Etapa 7 no
terceiro lugar, depois de Dashboard e CRM, quando o sistema já provou que aguenta.

---

## 8. As fontes

Todas foram abertas e lidas na pesquisa desta rodada.

### Apple Human Interface Guidelines

As páginas de HIG são aplicação em JavaScript, então o conteúdo real veio dos endpoints JSON
oficiais que alimentam as próprias páginas.

- Tipografia, escala do macOS e tamanho mínimo por plataforma:
  https://developer.apple.com/design/human-interface-guidelines/typography
- Layout, densidade e agrupamento:
  https://developer.apple.com/design/human-interface-guidelines/layout
- Materiais, camada funcional e camada de conteúdo, Liquid Glass:
  https://developer.apple.com/design/human-interface-guidelines/materials
- Cor e uso parcimonioso do destaque:
  https://developer.apple.com/design/human-interface-guidelines/color
- Movimento com propósito:
  https://developer.apple.com/design/human-interface-guidelines/motion
- Modo escuro, base e elevated, mínimo 4,5:1 e alvo de 7:1:
  https://developer.apple.com/design/human-interface-guidelines/dark-mode
- Acessibilidade, tabela de contraste e alvo de 28x28pt no macOS:
  https://developer.apple.com/design/human-interface-guidelines/accessibility
- Densidade em tela grande:
  https://developer.apple.com/design/human-interface-guidelines/designing-for-macos

Registro honesto do que a Apple **não** publica: a página de Movimento não traz nenhuma duração,
nenhuma curva e nenhum valor de mola, e não tem sequer seção de macOS. A página de Layout não
traz margem nem grade para desktop. A largura de sidebar e o raio de janela não existem em
lugar nenhum. Nenhuma espessura de anel de foco é publicada. E a Apple não escreve que evita
preto puro: isso é dedução dos valores, `systemGray6` no escuro é `#1C1C1E`.

### Produtos de referência

- Linear, como redesenharam a interface: https://linear.app/now/how-we-redesigned-the-linear-ui
- Linear, o refresh recente: https://linear.app/now/behind-the-latest-design-refresh
- Linear, detalhes invisíveis: https://medium.com/linear-app/invisible-details-2ca718b41a44
- Raycast, componente de lista: https://developers.raycast.com/api-reference/user-interface/list
- Raycast, cores e `adjustContrast`: https://developers.raycast.com/api-reference/user-interface/colors
- Things 3, tipografia escalável: https://culturedcode.com/things/blog/2023/09/things-big-and-small/
- Maestri, grade de canvas de 20pt: https://www.themaestri.app/en/docs/canvas

Sobre o AIOX-CORE, citado como inspiração: o repositório `SynkraAI/aiox-core` é de linha de
comando, sem interface gráfica. A inspiração dele para o Hub é a orquestração de agentes, não o
visual, e não há o que extrair em design.

Os valores em px de Linear, Raycast e Notion citados na pesquisa vieram de extração automática
do **site de marketing** deles, não do aplicativo. Estão marcados como pista de identidade, e
nenhuma decisão deste documento se apoia neles sozinhos. As empresas não publicam a escala.

### Sistemas de design com números publicados

- Radix Colors, os 12 passos e o significado de cada um:
  https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix Themes, espaçamento: https://www.radix-ui.com/themes/docs/theme/spacing
- Radix Themes, tipografia com entrelinha e tracking casados:
  https://www.radix-ui.com/themes/docs/theme/typography
- Radix Themes, raio: https://www.radix-ui.com/themes/docs/theme/radius
- Tailwind CSS v4, escala e `--spacing` único: https://tailwindcss.com/blog/tailwindcss-v4
- Material Design 3, as três camadas ref, sys e comp:
  https://github.com/material-foundation/material-tokens/blob/main/tokens.md
- Primer do GitHub, tokens funcionais: https://primer.style/foundations/primitives/color
- Shopify Polaris, a fórmula de nome: https://polaris-react.shopify.com/tokens/color
- Atlassian, tokens e tema: https://developer.atlassian.com/platform/forge/design-tokens-and-theming/

### Tokens, nomeação e o custo das camadas

- W3C Design Tokens Community Group, o formato: https://www.designtokens.org/TR/drafts/format/
- Nathan Curtis, nomear tokens e a regra de promoção:
  https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676
- Nate Baldwin, o custo real do token de componente:
  https://medium.com/@NateBaldwin/component-level-design-tokens-are-they-worth-it-d1ae4c6b19d4

### Acessibilidade

- WCAG 2.2, o texto normativo: https://www.w3.org/TR/WCAG22/
- 1.4.3 Contraste mínimo, 4,5:1 e a definição de texto grande:
  https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- 1.4.11 Contraste de não texto, 3:1 e o que exatamente exige:
  https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- 2.4.11 Foco não obscurecido: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- 2.4.13 Aparência do foco, perímetro de 2px e 3:1 entre estados:
  https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- 2.5.8 Tamanho de alvo, 24x24px e a exceção de espaçamento:
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- `prefers-reduced-motion`, remover, reduzir ou substituir:
  https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- NN/g, o estudo de eyetracking com 71 participantes, 22% mais tempo e 25% mais fixações:
  https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty
- NN/g, flat design e sinalizadores: https://www.nngroup.com/articles/flat-design/
- WebAIM, como o contraste é calculado: https://webaim.org/articles/contrast/
- APCA, por que o WCAG 2 erra em modo escuro: https://git.apcacontrast.com/documentation/WhyAPCA

### Técnicas de cor em CSS

- `color-mix()`, Baseline desde maio de 2023:
  https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix
- Cor relativa, `rgb(from ... )`: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Relative_colors
- Suporte de cor relativa, 88,4% global: https://caniuse.com/css-relative-colors
- `oklch()`: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch
- `rgb()` com barra de alpha: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb

---

## 9. As provas

Em `provas-design/`, fora de `app/`:

- `tokens.css`: a camada de token completa, nos três temas, pronta para copiar.
- `prova.html`: página autônoma que mostra os 17 componentes nos três temas, com o seletor de
  tema funcionando. Abre com dois cliques, sem servidor.
- `contraste.md`: a tabela das 48 verificações de contraste, com o número medido de cada par.
