# Ajustes e princípios dos modelos de carrossel (destilado de uma instalação real)

> Documento de atualização pros templates de carrossel do VKOS. Escrito pra um operador (humano
> ou IA) de OUTRA instalação VKOS aplicar na marca dele. Tudo aqui é princípio genérico: as cores
> citadas são exemplos de UMA instalação, a sua marca terá as suas.

## De onde isto veio

Uma instalação real (psicanalista) com dois perfis de Instagram distintos da mesma pessoa. Nela
foram produzidos 7 carrosséis num mesmo dia:

- **Perfil do consultório:** paleta creme/verde/dourado.
- **Perfil corporativo** (saúde mental no trabalho / NR-1): paleta marinho/branco/amarelo.

Os 7 carrosséis:

| Pasta | Família de template | Perfil |
|---|---|---|
| `quem-cuida-de-voce-editorial` | Editorial (flex + variáveis paper/ink) | consultório |
| `problemas-viram-muros` | Editorial (idem) | consultório |
| `dois-estranhos-mesma-casa` | Declaração (foto + frase forte) | consultório |
| `mesa-e-pra-conversa` | VKOS05 Editorial Claro (absoluto) | consultório |
| `amar-e-uma-decisao` | VKOS05 Editorial Claro (absoluto) | consultório |
| `nao-e-so-pra-crise` | VKOS04 Tech Claro (absoluto) | consultório |
| `lideranca-que-acolhe` | Editorial recolorido pra outra marca | corporativo (NR-1) |

Comparando os 7 entre si e contra o catálogo `templates/carrossel/estilos.md`, emergiram os
padrões abaixo. O ganho principal: **um carrossel inteiro se recolore pra outra marca trocando
umas poucas variáveis CSS**, e onde isso não acontece é justamente o que os templates base
precisam melhorar.

> Regra deste documento: nunca use o travessão. Aqui só entram vírgula, dois-pontos ou parênteses.

---

## 1. A anatomia comum que emergiu

**O princípio.** Independente do estilo, todo carrossel bom convergiu pra uma mesma anatomia de
slide. Vale a pena tratá-la como o esqueleto padrão de qualquer template novo.

- **Slide 1080x1350** (proporção 4:5 do feed), `overflow:hidden`, com padding interno generoso
  (na casa dos 74px a 88px).
- **Capa-hero de foto em tela cheia** com um **scrim** (gradiente vertical) por cima: mais escuro
  no topo e no rodapé, aberto (transparente) no meio. Isso deixa o título legível em cima e o @
  legível embaixo, sem escurecer o rosto no centro da foto.
- **Chip / tag de contexto** no topo (ex: "PRA EMPRESAS", "RELACIONAMENTO", "TIRANDO DÚVIDAS"):
  diz num relance de que assunto é o post.
- **Rodapé** com o **@ do perfil** à esquerda e **"Arraste →"** à direita, repetido em todo slide
  (menos o último, onde o "Arraste" some).
- **Último slide sempre CTA**, com um elemento de destaque (borda lateral, botão-pílula ou
  bio-tag) e o "Toque no link na bio".

**Como foi feito aqui.** O scrim padrão da família Editorial:

```css
.scrim{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,
    rgba(15,26,20,0.45) 0%,
    rgba(15,26,20,0.10) 32%,
    rgba(15,26,20,0.30) 56%,
    rgba(12,22,17,0.92) 100%);}
```

Rodapé repetido em cada slide:

```html
<div class="foot"><span>@perfil</span><span class="swipe">Arraste &rarr;</span></div>
```

**Como aplicar em outro VKOS.** Mantenha a estrutura (slide 1080x1350, capa-hero com scrim,
chip, rodapé com @, último = CTA). Troque só as cores do scrim pra tons escuros da SUA paleta
(as 4 paradas do gradiente devem usar um escuro da marca, não verde). O formato do gradiente
(escuro-claro-médio-escuro) não muda: é ele que garante legibilidade em cima e embaixo.

---

## 2. Tema claro alternado (ritmo sem trocar de paleta)

**O princípio.** Pra dar ritmo visual ao longo do carrossel sem sair da identidade, alterne dois
tons MUITO próximos da mesma paleta entre um slide e outro. O olho percebe que "virou a página",
mas a marca continua a mesma. Não é mudar de cor: é mudar de "papel".

**Como foi feito aqui.** Na família Editorial, `.theme-paper` (creme) e `.theme-paper-alt`
(creme levemente mais claro). Na versão NR-1, o mesmo mecanismo com `.theme-a` (marinho) e
`.theme-b` (marinho um tom acima):

```css
.theme-a{background:var(--paper);}      /* #14264A */
.theme-b{background:var(--paper-alt);}  /* #1D3566 */
```

O HTML só alterna a classe slide a slide: `theme-a`, `theme-b`, `theme-a`, `theme-b`...

**Como aplicar em outro VKOS.** Defina `--paper` e `--paper-alt` como duas variações discretas do
seu fundo (uma leve diferença de luminosidade basta). Alterne as classes entre os slides internos.
Se sua paleta é escura, os dois "papéis" são dois escuros próximos; se é clara, dois claros
próximos.

---

## 3. Recursos de ênfase (o que dá alma ao slide)

**O princípio.** Uma ideia por slide precisa de UM ponto de foco. Estes quatro recursos criam
esse foco sem poluir. Use com parcimônia: um destaque por slide.

1. **`.serif .pen` (palavra serifada com canetada):** a palavra-chave da frase vira serifa itálica
   com um "grifo de caneta" por trás, feito via `::after`. É o gesto manual que quebra a frieza.
2. **`.num-bg` (número gigante de fundo):** numeração do item em corpo enorme, com opacidade baixa
   (~0.10), atrás do texto. Dá escala e organiza "item 1, 2, 3" sem ocupar linha.
3. **`.rule` (traço curto):** um filete curto de respiro entre o título e o texto de apoio.
4. **Hierarquia `lead` / `support`:** um texto-guia maior (`lead`) e um texto de apoio menor e mais
   suave (`support`). Nunca dois textos do mesmo peso competindo.

**Como foi feito aqui.** A canetada com pseudo-elemento:

```css
.serif{font-family:'Playfair Display',serif;font-style:italic;font-weight:700;}
.pen{position:relative;display:inline-block;white-space:nowrap;padding-bottom:6px;}
.pen::after{content:"";position:absolute;left:-4px;right:-4px;bottom:2px;height:12px;
  background:var(--accent-ink);border-radius:999px;opacity:0.92;z-index:-1;}
```

O número de fundo:

```css
.num-bg{position:absolute;z-index:1;font-family:'Sora',sans-serif;font-weight:800;
  font-size:520px;color:var(--accent-ink);opacity:0.10;}
```

(Na família VKOS04/05 o mesmo efeito de grifo aparece como `.l2::after` no título e `.pbody b::after`
no corpo, e o número de fundo vira uma "watermark" de palavra, `.wm`. Mesmo princípio, nomes
diferentes.)

**Como aplicar em outro VKOS.** Os efeitos já leem `var(--accent-ink)`, então a canetada e o
número gigante recolorem sozinhos ao trocar a variável. Cuide só do contraste: a canetada precisa
aparecer atrás do texto sem apagá-lo (ajuste `opacity` se seu destaque for muito saturado). Guarde
a regra de "um destaque por slide".

---

## 4. Recoloração por variáveis (a lição mais importante)

**O princípio.** Um template bem-feito guarda TODA cor em variáveis no `:root`. Recolorir o
carrossel inteiro pra outra marca vira trocar um punhado de variáveis, não caçar cor espalhada
pelo arquivo. A família Editorial converge em **6 variáveis**:

```css
:root{
  --paper: ...;      /* fundo dos slides internos */
  --paper-alt: ...;  /* fundo alternado (ritmo) */
  --ink: ...;        /* texto principal */
  --ink-soft: ...;   /* texto de apoio, rodapé */
  --accent-ink: ...; /* destaque: canetada, traço, número, swipe */
  --line: ...;       /* filetes e bordas */
}
```

**Como foi feito aqui (caso real: "liderança que acolhe" migrando de marca).** O mesmo template
Editorial foi usado pro perfil corporativo NR-1. A troca das 6 variáveis, antes e depois:

| Variável | Consultório (creme/verde/dourado) | NR-1 (marinho/branco/amarelo) |
|---|---|---|
| `--paper` | `#F5F0E6` | `#14264A` |
| `--paper-alt` | `#FAF7F0` | `#1D3566` |
| `--ink` | `#1C3B2A` | `#FFFFFF` |
| `--ink-soft` | `#5c6b60` | `rgba(255,255,255,.74)` |
| `--accent-ink` | `#9C7B33` | `#F5C020` |
| `--line` | `#2b4a37` | `rgba(255,255,255,.16)` |

Repare na inversão de claro/escuro: o consultório é texto escuro sobre papel claro; o NR-1 é texto
branco sobre papel escuro. As MESMAS variáveis cobrem os dois casos, porque o texto é sempre
`--ink` sobre `--paper`. É por isso que o esquema aguenta virar do claro pro escuro sem tocar no
HTML dos slides internos.

**O ponto de atenção (os hardcodes que NÃO eram variáveis).** A **capa-hero** foi escrita com cores
cravadas na mão, fora do `:root`, e por isso precisou de edição manual na recoloração. Foram estes
pontos:

```css
/* estes valores NÃO leem variável e tiveram que ser editados um a um */
body{background:#0E1B38;}                    /* antes #000 */
.slide.capa-hero{background:#0E1B38;}
.capa-hero .scrim{background:linear-gradient(180deg,
  rgba(9,15,32,.74),rgba(14,27,56,.48) 30%,rgba(14,27,56,.20) 50%,rgba(9,15,32,.78));}
.capa-hero .chip-abs{color:#0E1B38;background:var(--accent-ink);}  /* texto do chip = fundo escuro */
.capa-hero .hh h1{color:#FFFFFF;}
.capa-hero .hh .serif{color:#F5C020;}
.capa-hero .hh .pen::after{background:rgba(245,192,32,.32);}
.capa-hero .foot-abs{color:#F0F3FA;}
.capa-hero .foot-abs .swipe{color:#F5C020;}
```

Ou seja: os slides internos recoloriram sozinhos (6 variáveis), mas a capa exigiu mexer em ~8
lugares na mão. **Essa é a melhoria a propor** (ver seção final): mover esses hardcodes da capa
pra variáveis também.

**Como aplicar em outro VKOS.** Preencha as 6 variáveis do `:root` com a paleta do seu Cérebro
(bloco 13) ou do `design-guide.md`. Se o seu fundo é escuro, `--ink` é claro e vice-versa: pense
sempre em "texto sobre papel". Depois, confira a capa-hero e troque na mão os hardcodes de scrim,
chip, título e rodapé pra tons da sua marca. Rode o render e olhe a capa primeiro: é onde o erro
de cor mais aparece.

---

## 5. Multi-perfil / multi-frente (perguntar ANTES de escolher a paleta)

**O princípio.** Um mesmo negócio pode ter mais de um perfil de Instagram, cada um com identidade
própria. A peça de um perfil não pode sair com a cara do outro. Então, antes de escolher paleta e
@, o operador tem que saber **pra qual perfil** a peça vai.

**Como foi feito aqui.** Dois perfis do mesmo negócio:

- Perfil do consultório: creme/verde/dourado, tom acolhedor.
- Perfil corporativo (NR-1): marinho/branco/amarelo, tom institucional.

O `design-guide.md` desta instalação já registra as duas paletas separadas e avisa: "antes de
criar, veja pra qual perfil é". Cada carrossel carrega o @ certo no rodapé de TODOS os slides.

**Como aplicar em outro VKOS.** Se a instalação tem mais de um perfil, o `design-guide.md` deve
listar uma paleta e um @ por perfil. Antes de montar o carrossel, pergunte (ou detecte pelo tema)
qual perfil, e só então escolha paleta + @. Erro clássico a evitar: gerar a peça corporativa com
as cores do perfil pessoal, ou deixar o @ errado no rodapé.

---

## 6. O pipeline de render (e o fluxo de edição)

**O princípio.** O HTML é a fonte; as imagens PNG são geradas por um render headless, sempre igual.
Editar é mexer no HTML e rodar o render de novo. Nunca se edita a imagem final.

**Como foi feito aqui.** `templates/carrossel/render.js` usa Playwright/Chromium:

- viewport **1080x1350**, **deviceScaleFactor 2** (sai em 2160x2700, nítido pro Instagram).
- espera `document.fonts.ready` e um `waitForTimeout(400)` antes de printar (garante que as fontes
  do Google carregaram, senão o print sai com fonte-fallback).
- tira um screenshot **por elemento `.slide`** (não da página inteira), salvando em
  `instagram/slide-01.png`, `slide-02.png`, ...

```
node templates/carrossel/render.js conteudo/<pasta-do-carrossel>
```

**Fluxo de edição:** mexeu no `carrossel.html`, roda o render de novo, confere o PNG. Repete.

**Como aplicar em outro VKOS.** O `render.js` é agnóstico de estilo: lê qualquer `carrossel.html`
que tenha elementos `.slide` a 1080x1350. Não precisa mudar nada nele. Só garanta o Playwright
instalado (`npm install`, e se faltar o navegador, `npx playwright install chromium`). Se sua
fonte não aparecer no PNG, quase sempre é a espera de fontes: mantenha o `fonts.ready` + timeout.

---

## 7. Regras de conteúdo que os 7 carrosséis seguiram

**O princípio.** O template resolve a forma; o conteúdo tem regras próprias, e os 7 obedeceram
todas.

- **Uma ideia por slide.** Nada de empilhar dois assuntos no mesmo card.
- **Capa que prende em 1 linha de leitura** (uma frase-gancho forte, com a palavra-chave em
  destaque). Ex: "O que você não resolve hoje vira muro amanhã."
- **Último slide sempre CTA**, com "Toque no link na bio" (imagem não clica, então direciona pra
  bio, nunca link cravado na arte).
- **@ correto no rodapé de todo slide** (e batendo com o perfil da peça, ver seção 5).
- **Texto na voz do negócio, concreto, não genérico.** Cidade com nome (Governador Valadares),
  serviço com nome (terapia de casal, consultoria/palestra), dor real. Nada de promessa subjetiva.
- **6 slides foi o tamanho mais comum** (variando de 5 a 6), com estrutura capa → desenvolvimento
  → CTA.

**Como aplicar em outro VKOS.** Estas regras não mudam de marca pra marca. O que muda é a voz (vem
do Cérebro) e o CTA (vem do Cérebro). Profissão regulamentada: pesquise as regras do conselho antes
de escrever (nesta instalação, psicanálise não é regulamentada, mas o cuidado com promessa se
mantém).

---

## 8. Outros padrões observados comparando os 7

**Duas famílias de template convivem.** Vale saber diferenciar, porque a recoloração muda entre
elas:

- **Família Editorial / Declaração** (flex, variáveis `--paper/--ink/--accent-ink...`): layout por
  fluxo vertical, `justify-content:center`. Recolore por variáveis (seção 4). É a mais fácil de
  migrar de marca. Usada em `quem-cuida`, `problemas-viram-muros`, `dois-estranhos` (variante
  Declaração, com aspas gigantes `.aspas` e botão `.link-bio`) e `lideranca` (NR-1).
- **Família VKOS04/05** (posicionamento absoluto, variáveis `--cream/--cream2/--accent/--accent-dk/
  --ink/--soft/--on-accent`): cada elemento cravado com `top/left/right` em px. Dá controle fino de
  layout, mas é mais trabalhosa de recolorir (mais variáveis, e o texto sobre foto usa hardcodes).
  Usada em `mesa-e-pra-conversa`, `amar-e-uma-decisao` e `nao-e-so-pra-crise` (este com foto na capa
  E no final).

**Variações de capa observadas:**

- Capa de foto tela cheia com scrim (a mais comum, prende mais).
- Capa sem foto, com "watermark" de palavra gigante ao fundo (`.wm`) quando não há imagem pronta
  (ex: `amar-e-uma-decisao`, palavra "AMAR" atrás). Bom fallback: nunca trava por falta de imagem.
- Capa-declaração: foto + frase entre aspas gigantes semi-transparentes.

**Fontes e seus papéis (constantes nas duas famílias):**

- **Sora** (ou Inter 900 na VKOS04/05): títulos, peso 800, `letter-spacing` negativo. É a voz alta.
- **Playfair Display itálico:** a palavra de acento (a canetada). É o toque humano, elegante.
- **Inter:** corpo de texto (lead/support/pbody). É a leitura confortável.
- **Anton:** só a watermark gigante de fundo na VKOS05 (`.wm`).

**Numeração de slides:** a família VKOS04/05 mostra um contador `.cnt` ("02 / 06") no canto; a
família Editorial não usa contador, conta pela sequência visual. As duas abordagens funcionam;
se usar contador, lembre de bater o total com o número real de slides.

---

## Checklist: recolorir um carrossel pra outra marca (em menos de 10 passos)

1. Confirme **pra qual perfil** é a peça e pegue a paleta + o @ desse perfil no `design-guide.md`.
2. Abra o `carrossel.html` e localize o `:root`.
3. Troque as 6 variáveis: `--paper`, `--paper-alt`, `--ink`, `--ink-soft`, `--accent-ink`, `--line`
   (lembre: texto = `--ink` sobre papel = `--paper`; se o fundo é escuro, o texto é claro).
4. Ajuste o `body{background:...}` pro tom escuro da marca (fundo de segurança da capa).
5. Na **capa-hero**, troque os hardcodes na mão: o scrim (4 paradas do gradiente pra um escuro da
   marca), a cor do chip, a cor do `h1`, a cor da `.serif`, o `.pen::after` e o rodapé.
6. Troque o **@** em TODOS os rodapés (`@perfil` certo) e, se houver contador `.cnt`, confira o total.
7. Se a marca não tem foto de capa, deixe o fallback escuro agir (ou use a watermark de palavra).
8. Rode o render: `node templates/carrossel/render.js conteudo/<pasta>`.
9. Abra o `slide-01.png` primeiro (a capa é onde erro de cor grita) e depois passe os demais.
10. Ajuste o que destoar, rode o render de novo.

## Melhorias sugeridas pros templates base

> **Status (jul/2026):** já aplicado o item 1 no modelo Editorial (fundo e scrim viram variável,
> via `--scrim-rgb`), o item 4 (scrim virou padrão parametrizado, ver abaixo) e o item 5 (bloco
> "Mais de um perfil?" no design-guide). Os itens 1 (demais modelos), 2 e 3 seguem pendentes, pra
> rolar modelo a modelo com render de conferência.

1. **Promover os hardcodes da capa-hero a variáveis.** Padrão aplicado no Editorial: o fundo de
   segurança do slide usa `var(--bg)` e o scrim usa uma base RGB única `--scrim-rgb` (ex: `8,8,8`)
   em todas as paradas do gradiente: `rgba(var(--scrim-rgb),0.50)`, `...,0.14`, `...,0.34`,
   `...,0.95`. Assim a capa recolore junto com os slides trocando uma linha só, sem caçar cor
   cravada. Falta levar o mesmo pros outros modelos com capa de foto (chip, título e rodapé sobre
   foto também).
2. **Padronizar os nomes de variáveis entre as duas famílias.** Hoje a Editorial usa
   `--paper/--ink/--accent-ink` e a VKOS04/05 usa `--cream/--ink/--accent-dk`. Unificar num só
   vocabulário (ex: sempre `--paper/--paper-alt/--ink/--ink-soft/--accent/--accent-strong`) faria a
   recoloração ser idêntica em qualquer estilo.
3. **Deixar a família Declaração usar o mesmo conjunto de variáveis.** Hoje ela só tem
   `--bg/--accent/--text/--soft`, fora do padrão de 6. Alinhar facilita trocar de estilo sem
   reaprender o esquema.
4. **Scrim como componente reutilizável (aplicado no Editorial).** O gradiente
   escuro-claro-médio-escuro da capa de foto agora sai de uma base `--scrim-rgb`: mesma forma
   (escuro no topo e no pé, aberto no meio), recolorindo só a variável. Reaproveite nas outras
   capas de foto.
5. **Registrar o multi-perfil no design-guide como padrão do sistema (aplicado).** O template do
   design-guide ganhou o bloco "Mais de um perfil?" (paleta + @ por perfil), que o `/estilo`
   preenche e o `/carrossel` confere antes de montar.
