# Princípios visuais do site VKOS

> Destilado de impeccable (Apache 2.0), taste-skill (MIT), ui-ux-pro-max (MIT) e dos temas do astryx (MIT). Reescrito em uma voz só pra sites de negócio dentro de uma instalação VKOS.

Este documento guia qualquer sessão (humana ou IA) que construa um site em HTML e CSS puro pra um prestador de serviço ou dono de negócio local. Ele trabalha junto com o método da skill /site (o texto de cada seção vem de lá e do Cérebro) e com a marcação amigável ao Studio (seção 6, inegociável). Leia inteiro antes da primeira linha de código.

Regra de escrita que vale pro site inteiro: português brasileiro, frase curta, e NUNCA travessão nem o caractere de ponto centrado. Vírgula, ponto ou dois-pontos.

---

## 1. A leitura de design (antes de qualquer código)

Todo site ruim de IA nasce do mesmo jeito: o modelo pula direto pro estilo padrão dele em vez de ler quem é o negócio. Por isso a primeira entrega do trabalho não é código, é uma frase.

Antes de escrever qualquer HTML, declare em UMA linha:

> Lendo isto como: [tipo de página] para [público do Cérebro], linguagem [vibe], direção [nome da direção da cartela].

Exemplos reais:

> Lendo isto como: página única para mulheres 30+ que buscam terapia em Sorocaba, linguagem calma e acolhedora, direção Serra Matcha.

> Lendo isto como: site com páginas para síndicos e construtoras que precisam de laudo elétrico, linguagem técnica e confiável, direção Aço e Sinal.

De onde vem cada pedaço:

- O tipo de página vem do wizard (página única, site com páginas, link na bio).
- O público e a vibe vêm do Cérebro: a dor, o desejo, a cidade, a voz do negócio. Se o usuário escolheu cores e fontes no wizard, elas mandam mais que a cartela: a direção vira só guia de personalidade.
- A direção vem da cartela da seção 2, escolhida pelo segmento e pela vibe.

Regras da leitura:

1. Nunca pergunte. A sessão não tem direito a dúvida: leia o Cérebro, decida e declare. Uma leitura razoável declarada vale mais que a leitura perfeita que nunca chega.
2. Declarada a leitura, ela vira lei pro resto do trabalho. Toda decisão de cor, fonte, espaçamento e motion responde a ela. Se no meio do caminho uma escolha contradiz a leitura, a escolha está errada, não a leitura.
3. Se duas direções servem igual, escolha a mais sóbria. Sobriedade envelhece melhor que ousadia mal calibrada.

---

## 2. A cartela de direções

A cartela vive em `templates/design/cartela.md`, a fonte única de direções visuais de todos os formatos. Leia de lá: o que é uma direção, os 3 dials de personalidade (variância, motion, densidade), as direções completas (paleta, par de fontes, nota de execução) e o como escolher.

A regra continua a mesma: escolha UMA direção pela leitura de design e execute ela inteira. Não misture metade de uma com metade de outra: o resultado de misturar direções é exatamente o mingau genérico que este documento existe pra evitar. E a paleta escolhida obedece ao contraste da seção 3.

### A biblioteca de estilos

A cartela dá a personalidade: segmento, vibe, paleta de partida, par de fontes e os 3 dials. A biblioteca de estilos em `templates/design/estilos/` dá o sistema concreto: cada estilo é um conjunto completo de tokens de cor, escala tipográfica, spacing, componentes e motion, com nome neutro e sem marca de origem. A cartela decide o clima; o estilo entrega o material que mata o mingau genérico.

Leia `templates/design/estilos/indice.md`: a tabela com tema, vibe e quando usar, e a regra de escolha. UM estilo por site, escolhido pelo Cérebro e pelo tema, executado inteiro. Misturar estilos é proibido, a mesma lógica anti-mingau. Some o estilo à declaração da leitura de design: direção da cartela mais estilo do índice. O design-guide da marca e o visual personalizado do wizard mandam mais: nesse caso as cores da marca ocupam os papéis e o estilo entra como sistema de execução.

---

## 3. Regras de execução

Escolhida a direção, estas regras valem pra qualquer uma delas. São o piso de qualidade, não o teto.

### Cor e contraste

- Toda cor vira variável CSS em `:root` (fundo, tinta, acento, e as variações que precisar). Nenhum hexadecimal solto no meio do código. O esqueleto:

```css
:root{
  --fundo:#F7FBFA; --fundo-2:#EFF6F4;      /* base e um degrau pra alternar seções */
  --tinta:#12312B; --suave:#3D554E;        /* texto forte e texto de apoio (ainda 4.5:1) */
  --acento:#0E7C66; --acento-escuro:#0A5A4A; --acento-claro:#DFF0EB;
  --linha:#D8E5E1;
  --titulos:'Sora', system-ui, sans-serif;
  --corpo:'Source Sans 3', system-ui, sans-serif;
  --maxw:1160px;
}
```
- Texto de corpo precisa de contraste de no mínimo 4.5:1 contra o fundo dele. Texto grande (24px ou mais, ou 19px em negrito) precisa de 3:1. Se estiver perto do limite, escureça o texto: cinza claro "pra ficar elegante" é o motivo número um de site de IA ser difícil de ler.
- Texto cinza sobre fundo colorido, nunca. Sobre fundo colorido, use um tom mais escuro do próprio matiz do fundo, ou a cor do texto com transparência. Cinza sobre cor fica lavado.
- Cada cor principal em três alturas: base, escura e clara. É o suficiente pra hierarquia sem sair da paleta.
- Um acento por página, usado no site inteiro. O CTA da última seção tem a mesma cor do CTA do herói. Acento que muda no meio da rolagem é defeito, não variedade.
- O tema (claro ou escuro) é da página inteira. Seções podem variar o tom dentro da mesma família (um fundo um degrau mais escuro pra separar blocos), mas nunca inverter de claro pra escuro no meio da rolagem, salvo UMA banda escura de contraste deliberada.

### Tipografia

- Display do herói tem teto: `clamp()` com máximo de 6rem. Acima disso a página está gritando.
- Letter-spacing de display tem piso: nunca mais apertado que -0.04em. Entre -0.02em e -0.03em já dá o ar fechado e confiante; além do piso as letras se tocam.
- Corpo de texto entre 65 e 75ch de largura de linha. Use `max-width` em `ch` no bloco de texto.
- `text-wrap: balance` nos títulos (h1 a h3); `text-wrap: pretty` na prosa longa.
- Escala modular com passos de pelo menos 1.25 entre os tamanhos. Escala achatada (títulos 10% maiores que o corpo) lê como indecisão.
- Texto claro sobre fundo escuro pede line-height um pouco maior (some 0.05 a 0.1): tipo claro parece mais fino e precisa de mais ar.
- Carregue do Google Fonts só os pesos usados, com `display=swap`.
- O esqueleto de escala, fluido do celular ao desktop sem media query:

```css
h1{ font-size:clamp(2.4rem, 6vw, 4.5rem); line-height:1.08; letter-spacing:-0.02em; text-wrap:balance; }
h2{ font-size:clamp(1.8rem, 4vw, 2.8rem); line-height:1.15; text-wrap:balance; }
p{ max-width:70ch; line-height:1.6; text-wrap:pretty; }
```

### Imagem

- Uma foto decisiva vale mais que cinco medianas. A imagem do herói compromete com um clima; empilhar mais foto não salva uma indecisa.
- A imagem responde ao conteúdo da seção: foto de contexto no herói, foto de produto ou serviço na seção de serviços, rosto ou ambiente no sobre. A mesma imagem repetida pelo site inteiro é preguiça, não continuidade.
- Alt text na voz do negócio: "corte de precisão finalizado na cadeira da janela" diz mais que "foto de barbearia".
- Nunca simule: nada de screenshot falso montado com divs, nada de ilustração SVG desenhada à mão pela sessão. Sem imagem boa disponível, resolva com tipografia, cor e composição, que é uma página honesta.
- Imagem sempre com dimensão reservada (`aspect-ratio` ou width e height) pra página não pular durante o carregamento.

### Layout

- Espaçamento com ritmo: separações generosas entre seções (na casa de 96px no desktop, fluido com `clamp()`), agrupamentos apertados dentro delas. Tudo com o mesmo gap vira papel de parede.
- Grid responsivo sem breakpoint sempre que der: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`. Media query só quando existe uma quebra real de layout que o auto-fit não resolve.
- Flexbox pra uma dimensão, Grid pra duas. Não comece pelo Grid quando `flex-wrap` resolve.
- Card só quando é a melhor forma de agrupar, não como resposta automática. Muitas vezes uma borda superior, um `divide` ou espaço em branco agrupam melhor. Card dentro de card, nunca.
- Escala semântica de z-index em variáveis: dropdown, sticky, backdrop de modal, modal, toast, tooltip. Nunca 999 nem 9999 soltos.

```css
:root{ --z-dropdown:10; --z-sticky:20; --z-backdrop:30; --z-modal:40; --z-toast:50; --z-tooltip:60; }
```

- A largura máxima do conteúdo em uma variável (1100px a 1200px é confortável pra site de serviço).
- Ritmo de seção fluido, sem media query:

```css
.section{ padding-block: clamp(64px, 10vw, 112px); }
.section + .section--colada{ padding-block-start: 0; }  /* agrupamento apertado quando duas seções são uma ideia só */
```

### Componentes que funcionam

Padrões testados em instalação real. Use como base, ajuste à direção.

- **Botão com sombra da própria cor.** A sombra de um botão colorido é rgba da mesma cor, com blur alto e spread negativo. Sombra cinza mata o brilho.

```css
.btn{
  display:inline-flex; align-items:center; gap:10px;
  font-weight:700; border-radius:999px; padding:16px 30px;
  background:var(--acento); color:var(--fundo);
  box-shadow:0 12px 30px -12px color-mix(in srgb, var(--acento) 70%, transparent);
  transition:transform .15s ease, box-shadow .15s ease;
}
.btn:hover{ transform:translateY(-2px); }
```

- **Duas variantes de botão, uma pra fundo claro e uma pra fundo escuro.** Sobre a banda escura o botão troca de cor pra continuar contrastando. Verifique o texto do botão contra o fundo do botão: CTA branco com texto branco é defeito de saída.
- **Hero em grid de duas colunas** quando há foto: texto e CTA de um lado, imagem do outro, e no mobile a foto sobe (`order:-1`). Proporção levemente a favor do texto (1.05fr e 0.95fr). O herói cabe na primeira tela: título de até 2 linhas no desktop, subtítulo curto, CTA visível sem rolar.
- **Uma banda escura de contraste por página, no máximo.** E um CTA final com peso (fundo escuro ou acento cheio) fechando a página. São os pontos de ênfase: repetiu, deixou de pesar.
- **Card com hover discreto**: borda de 1px na cor de linha, raio entre 12px e 16px (nunca 24px pra cima), hover subindo 2px a 4px. É convite ao clique, não pirueta.
- **Menu mobile com hambúrguer honesto**: painel que abre animando max-height, `aria-expanded` atualizado no botão, scroll do body travado enquanto aberto.
- **Seção de localização discreta** quando o negócio é físico: endereço curto e mapa pequeno dessaturado (`filter:saturate(.9)`). O mapa é contexto, não protagonista.

### Motion

- Curva de easing: ease-out exponencial, tipo `cubic-bezier(0.16, 1, 0.3, 1)`. Nada de bounce, nada de elastic.
- Micro-interações entre 150ms e 300ms. Reveal de seção entre 500ms e 800ms. Mais que isso arrasta.
- `prefers-reduced-motion: reduce` sempre, desligando toda animação e mostrando tudo estático. Não é opcional.
- **Reveal nunca esconde conteúdo por padrão.** A seção existe visível sem o JS da animação. O padrão certo: o JS adiciona uma classe no `<html>` (por exemplo `js-anima`) quando carrega, e só com essa classe presente o CSS aplica o estado inicial invisível. Sem JS, a página nasce inteira. CSS que começa com `opacity: 0` esperando um script é uma seção em branco esperando pra acontecer.

```js
document.documentElement.classList.add('js-anima');
const obs = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
```

```css
/* so esconde quando o JS confirmou presenca E o usuario aceita animacao */
@media (prefers-reduced-motion: no-preference){
  html.js-anima .reveal{
    opacity:0; transform:translateY(24px);
    transition:opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1);
    transition-delay:var(--d, 0s);
  }
  html.js-anima .reveal.is-visible{ opacity:1; transform:none; }
}
```
- Escalonamento em grupo (cards entrando em cascata) é legítimo, com atrasos de 0.06s a 0.1s entre itens. O defeito é o reflexo uniforme: o MESMO fade-up aplicado a toda seção da página. Cada reveal serve ao que revela.
- Motion precisa de motivo dizível em uma frase: hierarquia, narrativa, resposta a ação. "Ficou bonito" não é motivo.
- Anime `transform` e `opacity`. Propriedade de layout (width, height, top) só quando for realmente necessário.

---

## 4. Proibições absolutas

Estes são os cacoetes que denunciam site feito por IA. Se estiver prestes a escrever um deles, pare e use a alternativa da mesma linha. Não existe caso especial.

1. **Barra lateral colorida como destaque em card** (border-left grossa colorida em card, item de lista ou aviso): use borda completa fina, fundo levemente tingido, ou nada.
2. **Gradient text** (background-clip: text com gradiente): use uma cor sólida; ênfase se faz com peso e tamanho.
3. **Glassmorphism decorativo** (blur e vidro espalhados como enfeite): superfície sólida da paleta; vidro só quando há de fato camadas sobrepostas com conteúdo real atrás.
4. **Hero de número gigante com label** (o template de métrica: número enorme, legenda pequena, estatísticas de apoio): abra com a promessa do negócio em palavras; número entra como prova na seção de provas.
5. **Grade de cards idênticos** (mesmo card com ícone, título e texto repetido sem fim): varie o tamanho e a forma dos itens, ou troque a grade por lista com hierarquia real.
6. **Eyebrow em caps em toda seção** (o rótulo pequeno em caixa alta com tracking largo acima de cada título): no máximo um a cada três seções; nas outras, o título sozinho basta.
7. **Marcador numerado 01/02/03 como muleta** (número decorativo acima de cada seção): número só quando a ordem carrega informação de verdade (um processo real de 3 passos); senão, corte.
8. **Creme ou bege como fundo padrão de brief "acolhedor"**: acolhimento se carrega no acento, na tipografia e na foto, não no fundo cor de papel. Use um off-white de verdade, um tom da própria marca, ou um fundo escuro assumido. (Forno e Cacau e Manteiga usam fundo quente por decisão de direção declarada na leitura, que é o oposto de usar por reflexo.)
9. **Texto vazando do container no mobile**: teste todo título em 390px; se vazar, reduza o máximo do clamp ou reescreva o texto. O viewport faz parte do design.

E três reforços que caem na mesma vala:

- Dois CTAs com a mesma intenção e rótulos diferentes na mesma página ("Fale conosco" e "Entre em contato"): um rótulo por intenção, repetido igual.
- Sombra cinza em botão colorido: a sombra é rgba da própria cor do botão.
- Número fake de precisão ("97% de satisfação" inventado): número só se vem do Cérebro; senão, prova em palavras.

---

## 5. O teste final

Antes de entregar, três verificações. Nesta ordem.

### A pergunta

Olhe a página pronta e pergunte: **alguém olharia isto e diria "foi IA que fez" sem hesitar?** Se sim, falhou. O padrão que denuncia não é feiura, é mesmice: a página que qualquer modelo geraria pro mesmo segmento.

### O teste de reflexo, em duas ordens

- **Primeira ordem:** se dá pra adivinhar o tema e a paleta só pelo segmento (dentista = azul clínico com foto de sorriso, advogado = navy com serifada e coluna grega), você entregou o primeiro reflexo do treinamento. A direção da cartela existe pra te tirar daí, mas execute ela com as particularidades DESTE negócio, não da categoria.
- **Segunda ordem:** o anti-óbvio também virou clichê. "Restaurante que não é vermelho, então virou editorial minimalista com serifada itálica" é a armadilha um andar abaixo: fugiu do primeiro reflexo e caiu no segundo. Se a estética é adivinhável a partir de "categoria mais o que a IA evitaria", retrabalhe. O que salva é o específico: a cidade, a história do Cérebro, o jeito de falar do dono.

### Checklist de saída

Confira item por item antes de dizer que terminou:

- [ ] A leitura de design foi declarada no início e a página obedece a ela.
- [ ] Contraste conferido: corpo 4.5:1, texto grande 3:1, nenhum cinza sobre cor.
- [ ] Mobile 390px sem estouro: nenhum texto vazando, nenhuma rolagem horizontal.
- [ ] Navegação, CTA e cartão que levam a outro destino são `<a>`; ações na própria página são `<button type="button">`.
- [ ] Item "em breve" ou desativado: `<a>` SEM href e com `aria-disabled="true"`. Nunca pointer-events pra desativar.
- [ ] Camada decorativa (partículas, orbs, fundo animado) com `aria-hidden="true"`.
- [ ] A página inteira aparece com JS desligado (reveal não esconde nada por padrão).
- [ ] `prefers-reduced-motion: reduce` desliga todas as animações.
- [ ] Nenhuma proibição da seção 4 presente.
- [ ] Nenhum travessão nem ponto centrado em texto nenhum, nem no `<title>`.
- [ ] Todo recurso é local e relativo: nenhuma imagem de stock externa, nenhum link pra arquivo que não existe.

---

## 6. O contrato de marcação amigável ao Studio

O Studio de Site é o editor visual do app: ele seleciona, edita e exclui elementos da página pronta. Ele só funciona se a marcação seguir este contrato. Estas exigências vêm do prompt do Site Guiado e são inegociáveis: um site lindo que o Studio não consegue editar é um site entregue pela metade.

1. **Filhos diretos do `<body>` são as seções semânticas da página** (header, main, section, footer) sempre que o layout permitir. Nada de um div wrapper genérico engolindo a página inteira.
2. **Camada decorativa sempre com `aria-hidden="true"`**: partículas, orbs, fundo animado, qualquer coisa que não é conteúdo.
3. **A semântica da interação acompanha a função.** Navegação, CTA e cartão que levam a um destino são `<a>`. Filtros, menu hambúrguer, abrir ou fechar diálogo, favoritos, accordions e demais ações na própria página são `<button type="button">`. Um destino desativado ou "em breve" é `<a>` SEM href e com `aria-disabled="true"`. Nunca use `pointer-events` pra fingir estado desativado.
4. **Toda imagem de conteúdo fica em um elemento HTML real**: `<img>` ou background-image em um elemento de verdade. Nunca imagem de conteúdo em pseudo-elemento CSS: o Studio não consegue selecionar o que não existe no DOM.
5. **Borda, máscara, sombra e overlay ligados a uma imagem ficam no próprio elemento ou no container real que envolve essa imagem**, pra o Studio selecionar e excluir o conjunto inteiro de uma vez.
6. **Todos os caminhos de recurso são relativos** (img/foto.jpg), tudo salvo dentro da pasta da peça. Nenhuma referência a caminho absoluto da máquina nem URL externa de imagem.
7. **Nenhum arquivo .md na pasta do site e nenhum arquivo chamado carrossel.html**: o app classifica a peça pelo conteúdo da pasta.
8. **Escrita em todo texto do site**: português brasileiro, frase curta e direta, sem travessão e sem ponto centrado, nem no `<title>`.

Se alguma dessas regras conflitar com uma ideia visual, a regra vence e a ideia se adapta. O Studio depende dela.

---

Resumo de bolso: declare a leitura, escolha uma direção e execute ela inteira, respeite o piso de contraste e o teto de display, não cometa nenhuma proibição, rode o teste final, entregue marcação que o Studio edita. Capriche: este site é a cara de um negócio de verdade.
