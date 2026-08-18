# Princípios visuais do carrossel VKOS

> Destilado de impeccable (Apache 2.0) e taste-skill (MIT). Reescrito em uma voz só pro slide de carrossel dentro de uma instalação VKOS.

Este documento guia qualquer sessão (humana ou IA) que monte um carrossel de Instagram no VKOS. Leia inteiro antes de escrever o primeiro slide.

Regra de escrita que vale pro carrossel inteiro: português brasileiro, frase curta, e NUNCA travessão nem ponto centrado. Vírgula, ponto ou dois-pontos.

---

## 0. Divisão de papéis (o que este arquivo é, e o que ele não é)

O sistema de carrossel tem três documentos. Cada um é dono de uma coisa, e nenhum repete o outro:

- **`estilos.md` é o dono do catálogo.** Quais modelos existem, o tom de cada um, quando usar, qual exige imagem. Escolha de modelo se resolve lá.
- **`principios-modelos.md` é o dono da anatomia.** O esqueleto do slide, o scrim da capa, os recursos de ênfase, as 6 variáveis de recoloração, o multi-perfil e o pipeline de render. O "como funciona por dentro" se resolve lá.
- **Este arquivo é a camada de gosto.** O que separa um carrossel bonito de um carrossel com cara de IA: a leitura de design, o critério de execução, as proibições e o teste final.

Os três se leem juntos e não conflitam: os outros dois dizem o que montar, este diz como não estragar.

---

## 1. A leitura de design (antes de qualquer slide)

Todo carrossel ruim de IA nasce do mesmo jeito: a sessão pula direto pro estilo padrão dela em vez de ler quem é o negócio. Por isso a primeira entrega do trabalho não é um slide, é uma frase.

Antes de escrever o primeiro slide, declare em UMA linha:

> Lendo isto como: carrossel de [ângulo] para [público do Cérebro], linguagem [vibe], modelo [modelo escolhido], paleta [da marca ou direção da cartela].

Exemplos reais:

> Lendo isto como: carrossel de lista para donas de pet que adiam a tosa, linguagem leve e direta, modelo VKOS05, paleta do design-guide.

> Lendo isto como: carrossel de manifesto para síndicos que empurram o laudo elétrico, linguagem firme e técnica, modelo VKOS01, direção Aço e Sinal da cartela.

### De onde vem cada pedaço e quem manda em quê

A cartela de direções visuais vive em `templates/design/cartela.md`. A precedência tem três degraus, do mais forte pro mais fraco:

1. **O modelo travado manda mais que tudo.** Escolhido o modelo (pelo design-guide, pelo pedido ou pelo catálogo), a estrutura, a tipografia e o tom são dele. Ninguém redesenha o modelo no meio da peça: a estrutura é do modelo, a paleta é da marca.
2. **O design-guide do negócio manda mais que a cartela.** Se `identidade/design-guide.md` tem paleta e fontes travadas, elas ocupam as variáveis de cor. A cartela nem entra em cena.
3. **A cartela entra quando não há visual travado.** Sem design-guide preenchido, escolha uma direção da cartela pela vibe do Cérebro e use a paleta dela nas variáveis. É ponto de partida calibrado, não algema.

### Regras da leitura

1. Nunca pergunte. Leia o Cérebro e o design-guide, decida e declare. Uma leitura razoável declarada vale mais que a leitura perfeita que nunca chega.
2. Declarada a leitura, ela vira lei. Toda decisão de texto, cor e ênfase responde a ela. Se uma escolha no meio do caminho contradiz a leitura, a escolha está errada, não a leitura.
3. Se duas opções servem igual, escolha a mais sóbria. Sobriedade envelhece melhor que ousadia mal calibrada.

### A biblioteca de estilos

A cartela dá a personalidade: segmento, vibe, paleta de partida, par de fontes e os 3 dials. A biblioteca de estilos em `templates/design/estilos/` dá o sistema concreto: cada estilo é um conjunto completo de tokens de cor, escala tipográfica, spacing, componentes e motion, com nome neutro e sem marca de origem. A cartela decide o clima; o estilo entrega o material que mata o mingau genérico.

A precedência do formato decide se ela entra. Com **modelo travado do catálogo** (`estilos.md`, linhas vkos01 a vkos09), o modelo manda e a biblioteca NÃO se aplica: a cartela e o design-guide só orientam a recoloração pela paleta da marca. Na **criação livre** (sem modelo travado, ou modelo aberto sem linha fixa), leia `templates/design/estilos/indice.md`, escolha UM estilo pelo Cérebro e pelo tema, execute ele inteiro e some o estilo à declaração da leitura de design (direção mais estilo). Misturar estilos é proibido, a mesma lógica anti-mingau. O design-guide da marca manda mais: nesse caso as cores da marca ocupam os papéis e o estilo entra como sistema de execução.

---

## 2. Regras de execução do slide 1080x1350

O carrossel não é uma página: é uma sequência de quadros fixos de 1080x1350 vistos num celular, um dedo decidindo em segundos se arrasta ou passa. Tudo abaixo deriva disso.

### Hierarquia num quadro fixo

- O slide não rola. O que não coube não existe: reescreva mais curto, nunca aperte pra caber.
- **Um pensamento por slide.** Dois assuntos no mesmo quadro é um slide a mais que você não escreveu.
- **O título se lê em 2 segundos.** No feed o slide aparece com um terço do tamanho: se o título precisa de esforço, o dedo já passou.
- No máximo três alturas de texto por quadro: título, apoio, rodapé. Dois textos do mesmo peso competindo é defeito (a anatomia chama de `lead` e `support`, ver `principios-modelos.md`, seção 3).
- Um destaque por slide, e só um: canetada, número de fundo ou traço. Os recursos são da anatomia; o limite de um por quadro é regra de gosto.

### Tipografia de display

- O quadro de 1080px dá teto e piso. Título de capa na casa de 72px a 120px: abaixo disso não para o dedo, acima disso grita e estoura linha. Corpo de apoio nunca abaixo de 36px: no celular ele vira 13px, o limite do legível.
- Line-height apertado em título: entre 1.0 e 1.15. Título com line-height de parágrafo parece texto perdido. O corpo respira mais, na casa de 1.4.
- Letter-spacing negativo em display tem piso: nunca mais apertado que -0.04em. Além disso as letras se tocam.
- Largura de linha é o próprio quadro: o padding generoso da anatomia (74px a 88px) já resolve. Título de capa em até 3 linhas; passou disso, corte palavras, não a fonte.
- O par de fontes tem contraste de verdade (display com serifa, condensada com neutra). Os papéis de cada fonte vêm do modelo; não adicione uma terceira família por conta.

### Recoloração pelas 6 variáveis

Toda cor do carrossel passa pelas variáveis do `:root`. As 6 variáveis, o passo a passo de recoloração e os cuidados com a capa-hero vivem em `principios-modelos.md`, seção 4: siga de lá, não daqui. O que este arquivo acrescenta é o critério:

- A paleta é a da marca (design-guide, ou direção da cartela na falta dele). Nenhuma cor de fora da paleta "pra dar um destaque".
- Cada variável no seu papel: texto é `--ink` sobre `--paper`, destaque é `--accent-ink`. Inverter papel de variável quebra a recoloração futura.
- Recolorido o carrossel, olhe a capa primeiro no PNG: é onde erro de cor grita.

### Imagem-herói

- Quando o modelo pede imagem (o catálogo diz quais), a imagem é **real**: foto do negócio ou imagem gerada por IA de verdade, salva em `img/`. Nunca simule: nada de ilustração SVG desenhada pela sessão, nada de foto montada com divs, nada de gradiente fingindo fotografia.
- Sem imagem boa disponível, use o fallback honesto do próprio modelo (fundo escuro, watermark de palavra). Um fundo assumido é melhor que uma foto falsa.
- A imagem serve o tema por metáfora, com espaço pro título e sem texto nenhum dentro dela. O scrim da anatomia garante a legibilidade por cima.

### Contraste

- Corpo de texto: no mínimo 4.5:1 contra o fundo dele. Texto grande (título, número): no mínimo 3:1. Perto do limite, escureça o texto: cinza claro "pra ficar elegante" é o defeito número um.
- Texto cinza sobre fundo colorido, nunca. Use um tom mais escuro do próprio matiz do fundo, ou a cor do texto com transparência.
- Sobre foto, quem garante o contraste é o scrim. Confira no PNG renderizado, não no HTML: a foto real muda tudo.

### Ritmo entre slides

- **Capa forte.** O slide 1 é um anúncio do carrossel, não o primeiro parágrafo. Gancho de uma linha, palavra-chave em destaque, o resto caladinho.
- **Desenvolvimento legível.** Os slides internos servem a leitura, não competem com a capa. O ritmo visual vem da alternância de papel (`--paper` e `--paper-alt`, ver anatomia), não de cada slide tentar ser capa.
- **Final com um CTA só.** Um pedido único, o CTA do Cérebro. Dois pedidos no último slide é nenhum.

---

## 3. Proibições (o anti-slop do carrossel)

Estes são os cacoetes que denunciam carrossel feito por IA. Se estiver prestes a escrever um deles, pare e use a alternativa da mesma linha. Não existe caso especial.

1. **Gradient text** (background-clip: text com gradiente no título): cor sólida da paleta; ênfase se faz com peso, tamanho ou a canetada do modelo.
2. **Glassmorphism decorativo** (cartão de vidro com blur como enfeite do slide): superfície sólida da paleta; num quadro estático o vidro não tem camada real atrás pra justificar.
3. **Marcador 01/02/03 como muleta em todo slide**: número só quando o carrossel É uma lista de verdade e a ordem informa ("5 erros" numera, manifesto não). Nesses casos o número gigante de fundo da anatomia é o jeito certo, um por slide.
4. **Eyebrow repetido** (rótulo em caps acima do título de todo slide interno): o chip de contexto da capa é anatomia, não licença pra carimbar rótulo em cada quadro; nos internos, o título sozinho basta.
5. **Emoji como decoração mecânica** (um emoji abrindo cada slide ou cada linha): ênfase se faz com o recurso do modelo; emoji só quando a voz do Cérebro pede, e pontual.
6. **Texto vazando do quadro** (título cortado na borda, corpo colado no rodapé): reescreva o texto mais curto ou desça um degrau de fonte dentro do piso; o quadro é parte do design, confira no PNG.
7. **Sombra fantasma** (borda de 1px E sombra de 16px no mesmo cartão): escolha um dos dois; o cartão que precisa dos dois pra existir não devia ser cartão.
8. **Número inventado** ("97% das pessoas erram isso"): número só se vem do Cérebro ou de fonte que o dono deu; senão, a prova é em palavras concretas.

E dois reforços que caem na mesma vala:

- CTA duplicado com rótulos diferentes no último slide ("chama no direto" e "link na bio" juntos): um pedido só.
- Terceira cor forte "pra variar" num slide interno: a variedade vem do ritmo de papel, não de cor nova.

---

## 4. O teste final

Antes de renderizar, três verificações. Nesta ordem.

### A pergunta

Olhe os slides prontos e pergunte: **alguém olharia isto e diria "foi IA que fez" sem hesitar?** Se sim, falhou. O que denuncia não é feiura, é mesmice: o carrossel que qualquer modelo geraria pro mesmo segmento.

### O reflexo de categoria, em duas ordens

- **Primeira ordem:** se dá pra adivinhar a cara do carrossel só pelo segmento (nutricionista = verde com foto de salada, advogado = navy com serifa), você entregou o primeiro reflexo do treinamento. O modelo e a paleta da marca existem pra te tirar daí: execute com as particularidades DESTE negócio, não da categoria.
- **Segunda ordem:** o anti-óbvio também virou clichê. "Pet shop que não é colorido fofinho, então virou editorial minimalista" é a armadilha um andar abaixo. Se a estética é adivinhável a partir de "categoria mais o que a IA evitaria", retrabalhe. O que salva é o específico: a cidade, a dor real, o jeito de falar do dono.

### Checklist de saída

Confira item por item antes de dizer que terminou:

- [ ] A leitura de design foi declarada no início e os slides obedecem a ela.
- [ ] Contraste checado: corpo 4.5:1, texto grande 3:1, nenhum cinza sobre cor. Conferido no PNG, capa primeiro.
- [ ] Nenhum texto vazando do quadro em nenhum slide.
- [ ] Paleta da marca aplicada pelas 6 variáveis, nenhuma cor de fora.
- [ ] Imagem-herói real quando o modelo exige, ou o fallback honesto do modelo. Nada simulado.
- [ ] CTA único no último slide, @ certo no rodapé de todos.
- [ ] Nenhuma proibição da seção 3 presente.
- [ ] Nenhum travessão nem ponto centrado em texto nenhum dos slides.

---

Resumo de bolso: declare a leitura, respeite os três degraus de precedência (modelo, design-guide, cartela), um pensamento por quadro com título de 2 segundos, recolora pelas 6 variáveis, imagem-herói real ou fallback honesto, nenhuma proibição, rode o teste final antes do render. Capriche: este carrossel é a cara de um negócio de verdade.
