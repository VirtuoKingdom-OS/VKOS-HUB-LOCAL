# Princípios visuais do site VKOS (destilado de uma instalação real)

> Documento de referência pra qualquer operador (humano ou IA) montar um site de negócio dentro
> de uma instalação VKOS. Nasceu do site de uma instalação real (psicanalista), um Astro estático
> que ficou muito bem avaliado. A ideia aqui não é copiar as cores dela, e sim entender POR QUE
> cada decisão funcionou, pra reaplicar com outra marca, outra paleta e outro ramo.

**Regra de leitura:** cada princípio tem três partes. "O princípio" (a regra genérica, serve pra
qualquer marca), "Como foi feito aqui" (o código real do repo, curto) e "Como adaptar" (o que
você troca quando a marca é outra). Copie a estrutura, troque os valores.

**Aviso de estilo deste documento:** nenhum travessão em lugar nenhum. Use vírgula, dois-pontos
ou parênteses.

**Stack usada:** Astro (site estático), um único CSS global em `src/styles/global.css`, um layout
`Base.astro` que carrega header, footer, fontes e os scripts, e as páginas em `src/pages/`. Fontes
via Google Fonts (Inter + Playfair Display). Nada de framework de CSS, nada de biblioteca pesada:
CSS puro com variáveis.

---

## 1. Arquitetura de tokens (as cores viram variáveis, e uma segunda frente ganha paleta isolada)

### O princípio
Toda cor, fonte e medida-chave da marca vira uma variável CSS em `:root`. Você nunca escreve o
hexadecimal solto no meio do código: escreve o nome do token. Isso faz três coisas: recolorir a
marca inteira é mudar cinco linhas, o código fica legível (`var(--gold)` diz mais que `#C8A24C`),
e o site inteiro fica consistente por construção.

Quando o negócio tem duas frentes com identidades diferentes (no caso, o consultório em
verde/dourado/creme e a frente corporativa NR-1 em marinho/amarelo), a segunda frente ganha o
seu próprio conjunto de tokens com prefixo (`--nr-*`), e é ativada por uma classe de escopo numa
`div` que embrulha a página. Assim a segunda paleta nunca "vaza" pro resto do site.

### Como foi feito aqui
Tokens no `:root` (`global.css`), com a paleta oficial e a paleta da segunda frente separadas e
comentadas:

```css
:root{
  --cream:#F5F0E6; --cream2:#FAF7F0; --paper:#EFE7D6;
  --green:#1C3B2A; --green-2:#22412f; --green-deep:#122619;
  --gold:#C8A24C; --gold-dk:#9C7B33; --gold-lt:#E4C877;
  /* paleta da frente NR-1 (azul-marinho + amarelo, do perfil corporativo) */
  --nr-navy:#14264A; --nr-navy-2:#1D3566; --nr-navy-deep:#0E1B38;
  --nr-blue:#2F6FE0; --nr-yellow:#F5C020; --nr-yellow-lt:#FFD24D;
  --ink:#1C3B2A; --soft:#5c6b60; --line:#e4dccb;
  --serif:'Playfair Display', Georgia, serif;
  --sans:'Inter', system-ui, sans-serif;
  --maxw:1160px;
}
```

O escopo da segunda paleta: a página `empresas.astro` embrulha todo o conteúdo numa
`<div class="nr1">`, e o CSS só recolore o que está dentro dela:

```css
.nr1 .eyebrow{color:var(--nr-blue);}
.nr1 .title{color:var(--nr-navy);}
.nr1 .cta-final{background:radial-gradient(100% 120% at 50% 0%, var(--nr-navy-2), var(--nr-navy-deep));}
/* a seção dos fatores fica marinho, virando um "cartaz" NR-1 */
.nr1 .section--paper{background:var(--nr-navy);}
.nr1 .section--paper .title{color:#fff;}
```

Repare no padrão de tons: cada cor principal tem três variações (base, escura, clara). Verde tem
`--green`, `--green-deep`, e um `--green-2` intermediário. Dourado tem `--gold`, `--gold-dk`,
`--gold-lt`. Isso dá contraste suficiente pra hierarquia sem sair da paleta.

### Como adaptar
- Troque os hexadecimais dos tokens pela paleta da nova marca (isso está no
  `identidade/design-guide.md` de cada instalação). Mantenha os NOMES dos tokens sempre que der,
  porque o resto do CSS depende deles.
- Regra prática de tokens por marca: uma cor de fundo clara (mais uma variação ainda mais clara e
  uma "papel"), uma cor de texto escura, uma cor de destaque (com uma variação escura pra texto
  sobre fundo claro e uma clara pra texto sobre fundo escuro), mais cinza-texto (`--soft`) e cor
  de linha (`--line`).
- Só crie a segunda paleta (`--nr-*` e a classe de escopo) se o negócio realmente tiver duas
  frentes distintas. Se tiver, use um prefixo que faça sentido pra frente (não precisa ser `nr`).
- `--maxw` controla a largura máxima do conteúdo. 1160px é confortável pra um site de serviço.

---

## 2. O fundo de vidro borrado (`.blurbg`): a técnica das duas pseudo-camadas

### O princípio
Um fundo com foto borrada dá profundidade e clima sem custar legibilidade, DESDE QUE tenha um
overlay por cima segurando o contraste do texto. A técnica: uma camada de baixo com a foto
borrada e ampliada, e uma camada de cima com um gradiente semitransparente. O texto fica numa
terceira camada, por cima das duas.

Dois cuidados que fazem ou quebram o efeito:
1. **A foto borrada precisa ser ampliada** (`scale`) e sangrar pra fora da caixa (`inset` negativo),
   senão o `blur` deixa as bordas transparentes/vazias aparecerem.
2. **O overlay precisa de opacidade entre ~55% e ~90%.** Muito transparente e o texto some sobre a
   foto; muito opaco e o blur desaparece (vira um fundo chapado e você perde o efeito que queria).
   O ponto doce é um gradiente que vai de ~60% no topo a ~90% embaixo.

### Como foi feito aqui
Camada base (foto borrada) no `::before`, overlay no `::after`, e `isolation:isolate` pra os
`z-index` negativos ficarem contidos na caixa:

```css
.blurbg{position:relative;overflow:hidden;isolation:isolate;}
.blurbg::before{
  content:"";position:absolute;inset:-10%;
  background:url('/img/hero-bg.png') center/cover;
  filter:blur(38px) saturate(115%);
  transform:scale(1.15);z-index:-2;
}
.blurbg::after{
  content:"";position:absolute;inset:0;
  background:
    radial-gradient(120% 90% at 85% 10%, rgba(200,162,76,.22), transparent 60%),
    linear-gradient(180deg, rgba(245,240,230,.62) 0%, rgba(245,240,230,.7) 55%, rgba(245,240,230,.82) 100%);
  backdrop-filter:blur(2px);z-index:-1;
}
```

O overlay tem duas camadas empilhadas: um `radial-gradient` sutil da cor de destaque (dá um
brilho no canto, 22% de opacidade) por cima de um `linear-gradient` da cor de fundo que faz o
trabalho pesado de contraste (62% a 82%).

As variantes trocam só o `::after`, mantendo a mesma foto de base. A variante clara deixa o fundo
creme aparecendo; a `--green` e a `--navy` cobrem com a cor escura pra virar seção de contraste:

```css
.blurbg--green::after{
  background:
    radial-gradient(120% 90% at 85% 10%, rgba(200,162,76,.24), transparent 60%),
    linear-gradient(180deg, rgba(18,38,25,.74) 0%, rgba(28,59,42,.82) 55%, rgba(28,59,42,.9) 100%);
}
.blurbg--navy::after{
  background:
    radial-gradient(120% 90% at 85% 10%, rgba(245,192,32,.20), transparent 60%),
    linear-gradient(180deg, rgba(14,27,56,.80) 0%, rgba(20,38,74,.88) 55%, rgba(14,27,56,.94) 100%);
}
```

Uso real: o hero da home é `class="hero blurbg"` (overlay claro, texto escuro); o hero de
empresas é `class="emp-hero blurbg blurbg--navy"` (overlay marinho, texto branco); e o card do
Instagram na página NR-1 reusa o mesmo `blurbg blurbg--navy` como fundo de um card pequeno.

### Como adaptar
- Troque `url('/img/hero-bg.png')` por uma foto da marca (ambiente, textura, algo com clima). Foto
  com áreas de cor uniforme borra melhor que foto cheia de detalhe fino.
- Ajuste as cores dos gradientes pra `rgba` da nova paleta, mas **mantenha as opacidades na faixa
  55-90%**. Essa é a lição que não se negocia: se o efeito "sumiu", quase sempre é overlay opaco
  demais (baixe a opacidade) ou foto que não sangra (aumente o `scale` e o `inset` negativo).
- `blur(38px)` é bem forte, dá aquele clima de vidro fosco. Entre 24px e 40px funciona; abaixo
  disso a foto compete com o texto.
- Crie uma variante escura (tipo `--green`/`--navy`) sempre que precisar de uma seção de contraste
  usando a mesma foto base.

---

## 3. Tipografia (sans forte + serifada itálica só no acento)

### O princípio
Duas famílias, papéis opostos. Uma sans forte e apertada carrega tudo (títulos em peso máximo,
`letter-spacing` negativo pra "fechar" as letras e dar ar de confiança) e uma serifada itálica
entra SÓ em uma ou duas palavras de destaque dentro do título, pra dar emoção e elegância no ponto
exato. O contraste entre as duas é o que dá personalidade; se tudo fosse serifado seria mole, se
tudo fosse sans seria duro.

As "sobrancelhas" (eyebrows) são o terceiro nível: texto pequeno, caixa alta, `letter-spacing`
largo, na cor de destaque. Elas rotulam a seção antes do título e criam ritmo de leitura.

### Como foi feito aqui
Títulos em Inter 900 com tracking negativo; a palavra de acento em Playfair itálica via `.serif-it`:

```css
h1,h2,h3{line-height:1.1;letter-spacing:-.02em;font-weight:900;color:var(--green);}
h2.title{font-size:clamp(34px,5vw,56px);margin-bottom:20px;}
.serif-it{font-family:var(--serif);font-style:italic;color:var(--gold-dk);}
.eyebrow{
  display:inline-block;font-size:14px;font-weight:800;letter-spacing:.18em;
  text-transform:uppercase;color:var(--gold-dk);margin-bottom:10px;
}
```

No HTML, o acento entra dentro do próprio título:

```html
<h1>Um espaço seguro pra você <span class="serif-it">se reencontrar</span></h1>
```

Detalhe importante de performance: a fonte é carregada só nos pesos usados. Playfair vem apenas em
itálico 600/700 (é usada só pro acento), enquanto Inter vem na régua completa:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@1,600;1,700&display=swap" rel="stylesheet" />
```

Todos os tamanhos grandes usam `clamp(min, vw, max)` pra escalar sozinhos do celular ao desktop
sem media query. Exemplo do hero: `font-size:clamp(40px,6vw,68px)`.

### Como adaptar
- Escolha uma sans de caráter forte pro corpo/títulos e uma serifada elegante pro acento. O
  `design-guide.md` da instalação diz quais. Se a marca for mais moderna/tech, o acento pode ser
  a mesma sans em itálico ou outra cor, em vez de serifada.
- Regra do acento: uma ou duas palavras por título, no máximo. Se você grifar meia frase, perde o
  efeito. Escolha a palavra que carrega a emoção da promessa.
- Mantenha o tracking negativo nos títulos (`-.02em`) e o tracking largo nas eyebrows (`.16em` a
  `.18em`). Esse contraste de espaçamento é metade da identidade.
- Carregue só os pesos que você usa. Baixa o tempo de carregamento e evita a fonte "piscar".

---

## 4. Sistema de componentes (botões, cards, seções, bandas e CTA)

### O princípio
Um punhado de componentes reutilizáveis, cada um com um comportamento visual consistente:

- **Botão pílula** (`border-radius:999px`) com sombra COLORIDA da própria cor do botão (não sombra
  cinza genérica) e um leve `translateY` no hover. A sombra colorida é o que faz o botão "brilhar"
  e parecer clicável.
- **Card** com borda de 1px na cor de linha, cantos arredondados generosos, e hover que sobe
  (`translateY(-4px)`) com sombra. O hover é o convite ao clique.
- **Eyebrow + título** sempre colados (margem de 10px entre eles), formando um bloco de cabeçalho
  de seção. Título e sobrancelha andam juntos.
- **Seções alternando fundos** (`--cream`, `--cream2`, `--paper`) pra separar blocos sem
  precisar de linhas divisórias. O olho percebe a troca sutil de tom.
- **Banda escura de contraste** no meio da página (a seção "empresas" na home usa `--green` cheio),
  pra quebrar o ritmo claro e destacar uma chamada.
- **CTA final em gradiente radial escuro**, fechando a página com peso e foco total no botão.

### Como foi feito aqui
Botão com sombra da própria cor e o hover que sobe:

```css
.btn{
  display:inline-flex;align-items:center;gap:10px;
  font-weight:800;font-size:17px;border-radius:999px;padding:16px 30px;
  transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
}
.btn--gold{background:var(--gold);color:#211803;box-shadow:0 12px 30px -12px rgba(200,162,76,.7);}
.btn--gold:hover{transform:translateY(-2px);box-shadow:0 16px 36px -12px rgba(200,162,76,.85);}
.btn--outline{background:transparent;color:var(--green);border:2px solid var(--green);}
.btn--outline:hover{background:var(--green);color:var(--cream);}
```

Card com hover que sobe:

```css
.card{
  background:var(--cream);border:1px solid var(--line);border-radius:20px;padding:34px;
  transition:transform .15s ease, box-shadow .15s ease;
}
.card:hover{transform:translateY(-4px);box-shadow:0 24px 50px -30px rgba(28,59,42,.4);}
```

Espaçamento padrão de seção, os fundos alternados, e o bloco eyebrow+título:

```css
.section{padding:96px 0;}
.section--cream2{background:var(--cream2);}
.section--paper{background:var(--paper);}
.eyebrow{ /* ... */ margin-bottom:10px;}   /* colado no título */
h2.title{ /* ... */ margin-bottom:20px;}
```

A banda escura de contraste (seção "empresas" na home):

```css
.band{background:var(--green);color:var(--cream);}
.band .eyebrow{color:var(--gold-lt);}
.band h2{color:var(--cream);}
```

O CTA final em gradiente radial escuro:

```css
.cta-final{
  background:radial-gradient(100% 120% at 50% 0%, var(--green-2), var(--green-deep));
  color:var(--cream);text-align:center;
}
.cta-final .serif-it{color:var(--gold-lt);}
```

### Como adaptar
- Botões: troque a cor de fundo e a cor da SOMBRA junto (a sombra é `rgba` da mesma cor, uns 70%
  de opacidade, com blur alto e spread negativo pra ficar embaixo). Nunca use sombra cinza num
  botão colorido, some o brilho.
- Sobre fundo escuro, o botão principal muda de cor pra contrastar (na home o botão do menu vira
  verde sobre creme; na página NR-1 o botão vira amarelo `--btn--alert`). Tenha uma variante de
  botão pra fundo claro e outra pra fundo escuro.
- Cards: mantenha o hover `translateY` sutil (2px a 4px). É o que dá vida sem exagero.
- Alterne no máximo três tons de fundo claro. Se cada seção tiver uma cor diferente vira circo.
- Use UMA banda escura por página e UM CTA final escuro. São os pontos de peso; se repetir, deixam
  de pesar.

---

## 5. Motion (reveal on-scroll leve, escalonado, e com respeito a quem não quer animação)

### O princípio
Os blocos entram suavemente conforme a pessoa rola a página: começam invisíveis e um pouco pra
baixo, e sobem pra posição ao aparecer na tela. Num grupo (cards, pilares), cada item entra com um
atraso um pouco maior que o anterior, criando um efeito de cascata. Tudo isso é leve e rápido, e
DESLIGA por completo pra quem tem "reduzir movimento" ligado no sistema (acessibilidade e conforto).

O mecanismo é barato: um `IntersectionObserver` que só adiciona uma classe quando o elemento entra
na tela, e o CSS faz o resto. Nada de biblioteca de animação.

### Como foi feito aqui
CSS: o `.reveal` começa apagado e deslocado, e a classe `.is-visible` (adicionada por JS) o traz.
O atraso de cada item vem de uma variável `--d`:

```css
@media (prefers-reduced-motion: no-preference){
  .reveal{
    opacity:0;transform:translateY(28px);
    transition:opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1);
    transition-delay:var(--d, 0s);
  }
  .reveal.is-visible{opacity:1;transform:translateY(0);}
  .cards .card:nth-child(2){--d:.08s;}
  .cards .card:nth-child(3){--d:.16s;}
  .cards .card:nth-child(4){--d:.24s;}
}
@media (prefers-reduced-motion: reduce){
  .reveal{opacity:1;transform:none;}   /* desliga tudo, mostra estático */
}
```

O JS (no `Base.astro`, roda em toda página) só liga e desliga a classe:

```js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
```

O escalonamento também pode ser feito no HTML, item por item, com `style="--d:.12s"` (o hero usa
isso pra a foto entrar depois do texto):

```html
<div class="hero__photo reveal" style="--d:.12s"> ... </div>
```

### Como adaptar
- Isso é praticamente plug-and-play: copie o CSS do `.reveal` e o script do observer, e ponha a
  classe `reveal` em cada bloco que deve animar. Funciona com qualquer paleta.
- Ajuste o gosto no `translateY` inicial (20px a 30px) e na duração (0.6s a 0.8s). Passou disso
  fica lento e irrita.
- Escalone com incrementos de 0.06s a 0.1s. Muito atraso e o último item demora demais.
- `threshold: 0.15` dispara quando 15% do bloco aparece. `unobserve` depois de revelar é o que
  mantém barato (não fica observando o que já apareceu).
- Nunca esqueça o bloco `prefers-reduced-motion: reduce` mostrando tudo estático. Sem ele, quem
  desliga animação pode ver a página em branco.

---

## 6. Padrões de página (hero, página corporativa, localização, página oculta)

### O princípio
Alguns arranjos de página se repetem porque convertem bem. Vale ter cada um pronto pra encaixar.

**Hero em grid de 2 colunas:** texto + CTA de um lado, foto do outro, com um "badge" flutuante
sobre a foto pra ancorar uma prova rápida (ano de fundação, número, selo). No celular a foto sobe
pra cima do texto.

**Página corporativa (a NR-1):** hero centralizado com uma "tag de urgência" pulsante no topo (dá
o senso de "isto é agora, tem prazo"), depois um grid de fatores/itens numerados, e um card-ponte
pro Instagram da frente (leva quem chegou no site pro perfil que aprofunda o assunto).

**Seção de localização sutil:** endereço curto de um lado, um mapa pequeno e dessaturado do outro.
Presença sem roubar a cena (o mapa fica com saturação e opacidade reduzidas pra não brigar com a
paleta).

**Página oculta de apresentação:** uma página `noindex` e sem link no menu, usada pra mostrar
entregas ao cliente (aqui, os carrosséis prontos). Tem um grid de capas, um lightbox horizontal
pra ver todos os slides, e download direto num `.zip` (sem abrir a tela de compartilhar do
sistema).

### Como foi feito aqui
Hero em grid 2 colunas com badge flutuante:

```css
.hero__grid{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;}
.hero__photo img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:24px;
  box-shadow:0 40px 90px -40px rgba(28,59,42,.5);}
.hero__badge{position:absolute;left:-18px;bottom:28px;background:var(--green);color:var(--cream);
  padding:16px 22px;border-radius:16px;box-shadow:0 20px 44px -20px rgba(28,59,42,.6);max-width:240px;}
@media(max-width:860px){
  .hero__grid{grid-template-columns:1fr;gap:36px;}
  .hero__photo{order:-1;}   /* a foto sobe no celular */
}
```

A tag de urgência pulsante da página corporativa:

```css
.urg{display:inline-flex;align-items:center;gap:10px; /* ... pílula com borda e fundo translúcido */ }
.urg .dot{width:8px;height:8px;border-radius:50%;background:var(--nr-yellow);animation:pulse 2s infinite;}
@keyframes pulse{
  0%{box-shadow:0 0 0 0 rgba(245,192,32,.6);}
  70%{box-shadow:0 0 0 10px rgba(245,192,32,0);}
  100%{box-shadow:0 0 0 0 rgba(245,192,32,0);}
}
@media(prefers-reduced-motion:reduce){.urg .dot{animation:none;}}
```

O mapa dessaturado da seção de localização:

```css
.local__map iframe{width:100%;height:180px;border:0;display:block;filter:saturate(.9) opacity(.94);}
```

A página oculta: no front-matter da página, `noindex`, e ela não aparece no menu do `Base.astro`.
O lightbox é uma tira horizontal com scroll-snap, e o download monta um `.zip` no navegador:

```astro
<Base title={title} noindex={true}>
```

```css
.lightbox__strip{display:flex;flex-direction:row;gap:20px;overflow-x:auto;
  scroll-snap-type:x proximity;background:var(--green-deep);}
.lightbox__strip img{flex:0 0 auto;height:62vh;scroll-snap-align:center;}
```

```js
const zip = new JSZip();
for (let i = 0; i < urls.length; i++) {
  const blob = await (await fetch(urls[i])).blob();
  zip.file(`${slug}-${String(i + 1).padStart(2, '0')}.png`, blob);
}
```

O `Base.astro` já suporta `noindex` via prop, injetando a meta tag:

```astro
{noindex && <meta name="robots" content="noindex, nofollow" />}
```

### Como adaptar
- Hero: a proporção `1.05fr .95fr` dá quase 50/50 com leve vantagem pro texto. A foto em
  `aspect-ratio:4/5` (retrato) funciona pra pessoa/serviço; troque pra `16/9` ou `1/1` conforme a
  imagem. O badge deve trazer UMA prova curta, não uma frase.
- A tag de urgência só faz sentido quando existe urgência real (prazo legal, promoção com data).
  Não invente urgência falsa; num negócio sem prazo, corte a tag.
- Mapa: mantenha pequeno e dessaturado. É contexto, não protagonista.
- Página oculta: use o padrão `noindex + fora do menu` pra qualquer entrega privada ao cliente
  (proposta, prévia, portfólio restrito). O download em `.zip` pelo navegador é ótimo pra celular,
  onde o download normal de várias imagens abre a tela de compartilhar e atrapalha.

---

## 7. Mobile (menu hambúrguer, botão de telefone que quebra, breakpoints)

### O princípio
O menu vira um hambúrguer (as três barras que viram X) que abre um painel deslizante animado por
`max-height`. Botões que contêm um número de telefone longo quebram o número pra uma segunda linha
inteira no celular, em vez de espremer ou vazar. E os breakpoints são poucos e consistentes, cada
um resolvendo uma quebra real de layout, não um número mágico aleatório.

### Como foi feito aqui
O hambúrguer: três `<span>` que viram X pela classe `.is-open`:

```css
.nav__burger span{width:100%;height:2px;background:var(--green);transition:transform .25s,opacity .2s;}
.nav__burger.is-open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
.nav__burger.is-open span:nth-child(2){opacity:0;}
.nav__burger.is-open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
```

O painel do menu abre animando `max-height` (truque pra animar altura sem saber a altura exata):

```css
@media(max-width:860px){
  .nav__burger{display:flex;}
  .nav__links{
    position:fixed;top:76px;left:0;right:0;flex-direction:column;
    max-height:0;overflow:hidden;transition:max-height .28s ease;
  }
  .nav__links.is-open{max-height:400px;}
}
```

O JS (no `Base.astro`) alterna as classes, atualiza `aria-expanded` e trava o scroll do body:

```js
burger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('is-open');
  burger.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
});
```

O botão com telefone que quebra pra linha inteira só no celular:

```css
.btn--wa{flex-wrap:wrap;justify-content:center;text-align:center;}
@media(max-width:480px){
  .btn--wa{flex-direction:column;gap:2px;padding:16px 22px;}
  .btn--wa .btn__num{width:100%;}
}
```

Os breakpoints usados no projeto, cada um com um papel:
- **860px:** troca principal (menu vira hambúrguer, grids de 2 colunas viram 1, hero empilha).
- **760px:** grids de 3 colunas (pilares, passos, fatores) viram 1.
- **680px:** grid de cards de 2 colunas vira 1.
- **560px:** grid de fatores (que aos 860 virou 2) finalmente vira 1.
- **480px:** ajustes finos (o botão de telefone quebra).

### Como adaptar
- Copie o hambúrguer e o script como estão; trocam só as cores das barras. O truque do
  `max-height` animado é genérico; deixe o `max-height` aberto folgado (400px) pra caber os itens.
- Sempre atualize `aria-expanded` e trave o scroll do body quando o menu abre. É acessibilidade e
  evita a página rolar por trás do menu.
- Reaproveite os breakpoints (860/760/680/560/480). Eles cobrem as quebras reais de grid. Não crie
  breakpoint novo sem uma quebra de layout de verdade pedindo.
- O padrão do botão de telefone (`flex-wrap` + `flex-direction:column` no menor) evita o número
  vazar. Vale pra qualquer botão com dois textos (rótulo + número/valor).

---

## 8. Armadilhas encontradas (bugs reais deste projeto e como não repetir)

### Armadilha 1: especificidade de CSS com seletor de elemento genérico

**O que aconteceu:** a regra genérica `.factor span` (todos os `<span>` dentro de um fator) estava
vencendo a regra específica do número `.factor__n`, porque tinham a mesma especificidade e a
genérica vinha depois. Resultado: o número do fator herdava a cor errada e ficava invisível dentro
do quadradinho.

**A solução:** classes dedicadas pra cada parte, nada de seletor de elemento solto. Cada `<span>`
tem a sua classe (`.factor__n` pro número, `.factor__label` pro texto), e o número força a cor
onde precisa:

```css
.factor__n{ /* ... */ background:var(--nr-yellow);color:var(--nr-navy-deep)!important; }
.factor__label{font-size:15.5px;font-weight:600;color:#fff;}
```

**A lição:** nunca estilize por tipo de elemento (`.card span`, `.factor a`) quando há mais de um
daquele elemento com papéis diferentes. Dê classe a cada parte. O `!important` ali é o remendo do
sintoma; a cura de verdade é a classe dedicada.

### Armadilha 2: overlay opaco demais matando o blur

**O que aconteceu:** ao ajustar o `.blurbg`, é tentador subir a opacidade do overlay pra garantir
o contraste do texto. Passando de ~90% a foto borrada desaparece e o efeito de vidro vira um fundo
chapado, perdendo toda a graça.

**A solução:** manter o overlay na faixa 55-90% (o projeto usa 62-82% na variante clara, 74-90% na
verde, 80-94% na marinho, que é a mais escura de propósito). Se o texto ainda estiver difícil de
ler, aumente o peso/tamanho do texto ou escureça só o pé do gradiente, em vez de opacar tudo.

**A lição:** contraste de texto sobre `.blurbg` se resolve no gradiente (que ponta escurecer) e no
texto, não em afogar a foto. Se o efeito "sumiu", quase sempre é overlay opaco demais.

### Armadilha 3: logo com fundo aparecendo

**O que aconteceu:** o logo entrou como imagem com fundo (não recortado), e o fundo apareceu como
um retângulo por cima do header.

**A solução real:** um PNG com fundo transparente (foi o que ficou, `logo-removebg-preview.png`).
O paliativo, quando não dá pra reexportar na hora, é `mix-blend-mode:multiply`, que "descarta" o
branco do fundo do logo misturando com o fundo claro do site. Funciona só sobre fundo claro e não
é confiável sobre fundo escuro.

**A lição:** logo sempre em PNG (ou SVG) com fundo transparente. `mix-blend-mode:multiply` é
tapa-buraco temporário, não solução.

### Armadilha 4 (bônus): confiar em `z-index` sem contexto de empilhamento

No `.blurbg` os pseudos usam `z-index:-1` e `-2`. Sem `isolation:isolate` na caixa, esses valores
negativos poderiam mandar as camadas pra trás de outros elementos da página. O `isolation:isolate`
cria um contexto de empilhamento próprio, prendendo os `z-index` negativos dentro da caixa. Se for
copiar o `.blurbg`, copie o `isolation:isolate` junto.

---

## Checklist de aplicação rápida (subir um site novo com esses princípios)

1. Leia o `identidade/design-guide.md` da instalação e pegue a paleta e as fontes da marca. Não
   invente cor.
2. Monte o `:root` com os tokens: fundo(s) claro(s), texto escuro, cor de destaque (com variação
   escura e clara), `--soft`, `--line`, as duas famílias de fonte e `--maxw`.
3. Se o negócio tem duas frentes, crie a segunda paleta com prefixo e uma classe de escopo
   (`.frente2 ...`) que recolore só o que está dentro dela. Se não tem, pule.
4. Carregue as fontes só nos pesos usados (sans na régua completa, serifada só no estilo do acento).
5. Configure a tipografia: títulos na sans forte com `letter-spacing:-.02em`, `.serif-it` pro
   acento, eyebrow em caixa alta com tracking largo, tudo em `clamp()` pra escalar sozinho.
6. Copie o `.blurbg` com as duas pseudo-camadas (foto no `::before` com `scale` e `inset` negativo;
   overlay no `::after` entre 55-90%; `isolation:isolate` na caixa). Crie a variante escura.
7. Monte os componentes base: botão pílula com sombra colorida da própria cor + hover `translateY`,
   card com borda de linha + hover que sobe, bloco eyebrow+título colados (10px).
8. Estruture as seções com `padding:96px 0` alternando os fundos claros; reserve uma banda escura
   de contraste e um CTA final em gradiente radial escuro.
9. Copie o motion: CSS do `.reveal` + `--d` escalonado, o script do `IntersectionObserver` no
   layout, e o bloco `prefers-reduced-motion: reduce` que mostra tudo estático.
10. Monte o hero em grid 2 colunas (texto + foto com badge flutuante), empilhando no celular com a
    foto em cima (`order:-1`).
11. Coloque o header com hambúrguer (barras que viram X, painel animado por `max-height`, script
    que atualiza `aria-expanded` e trava o scroll do body).
12. Aplique os breakpoints padrão (860/760/680/560/480), cada um resolvendo uma quebra de grid
    real. Faça botões com telefone/valor quebrarem pra linha inteira no menor.
13. Se houver urgência real (prazo, data), use a tag pulsante; senão, corte. Seção de localização
    com mapa pequeno e dessaturado.
14. Para entregas privadas ao cliente, use uma página `noindex` fora do menu (lightbox horizontal
    + download em `.zip` pelo navegador).
15. Revisão final de armadilhas: nenhum estilo por elemento genérico (só classes dedicadas), logo
    em PNG/SVG transparente, overlay do `.blurbg` sem afogar a foto, e o crédito VirtuoKingdom no
    rodapé.
