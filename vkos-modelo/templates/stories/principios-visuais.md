# Princípios visuais dos stories VKOS

> Destilado de impeccable (Apache 2.0), taste-skill (MIT), ui-ux-pro-max (MIT) e do princípios visuais do site VKOS. Reescrito em uma voz só pro formato 1080x1920 dentro de uma instalação VKOS.

Este documento guia qualquer sessão (humana ou IA) que monte telas de stories prontas pra postar. Ele trabalha junto com o método da skill /stories (o roteiro e o arco vêm de lá e do Cérebro) e com o `modelo-stories.html`, que é a base de marcação de toda tela. Leia inteiro antes de preencher a primeira tela.

Divisão de papéis: o `modelo-stories.html` é dono da anatomia (as classes de tela, a área segura marcada, os blocos de enquete e CTA). Este documento é a camada de gosto e anti-slop por cima dele. Um não contradiz o outro: o modelo diz o que existe, este arquivo diz como fica bom.

Regra de escrita que vale pra toda tela: português brasileiro, frase curta, e NUNCA travessão nem o caractere de ponto centrado. Vírgula, ponto ou dois-pontos.

---

## 1. A leitura de design (antes de qualquer tela)

Antes de preencher o modelo, declare em UMA linha:

> Lendo isto como: [sequência de stories sobre o tema] para [público do Cérebro], linguagem [vibe], direção [nome da direção da cartela].

A cartela vive em `templates/design/cartela.md`. A precedência é a de sempre: o design-guide do negócio (`identidade/design-guide.md`) manda mais que a cartela; a estrutura do `modelo-stories.html` manda mais que tudo. Na prática: a anatomia é do modelo, a paleta e as fontes são da marca (recolorindo o `:root` do modelo), e a direção da cartela entra como personalidade e calibragem quando o design-guide estiver em branco.

Regras da leitura:

1. Nunca pergunte. Leia o Cérebro e o design-guide, decida e declare. Uma leitura razoável declarada vale mais que a perfeita que nunca chega.
2. Declarada a leitura, ela vira lei pra sequência inteira. As telas de uma sequência são UMA peça: mesma paleta, mesmas fontes, mesmo clima do início ao fim.
3. Se duas direções servem igual, escolha a mais sóbria.

### A biblioteca de estilos

A cartela dá a personalidade: segmento, vibe, paleta de partida, par de fontes e os 3 dials. A biblioteca de estilos em `templates/design/estilos/` dá o sistema concreto: cada estilo é um conjunto completo de tokens de cor, escala tipográfica, spacing, componentes e motion, com nome neutro e sem marca de origem. A cartela decide o clima; o estilo entrega o material que mata o mingau genérico.

Leia `templates/design/estilos/indice.md`: a tabela com tema, vibe e quando usar, e a regra de escolha. UM estilo por sequência, escolhido pelo Cérebro e pelo tema, executado inteiro (adaptado ao vertical 1080x1920). Misturar estilos é proibido, a mesma lógica anti-mingau. Some o estilo à declaração da leitura de design: direção da cartela mais estilo do índice. O design-guide da marca manda mais: nesse caso as cores da marca ocupam os papéis e o estilo entra como sistema de execução.

---

## 2. Regras do formato 1080x1920

### A área segura é sagrada

O Instagram desenha a interface dele por cima da sua arte: nome e horário no topo, barra de mensagem e botões no rodapé. O `modelo-stories.html` já marca essas faixas (cerca de 230px no topo e 250px no rodapé) com as guias `.safe-guide`, que o render remove da imagem final.

- Todo conteúdo crítico (título, oferta, CTA, o @) vive DENTRO da faixa central segura.
- O que pode encostar nas bordas: fundo, textura, foto de ambiência. Nunca texto que precisa ser lido.
- Não invente margens novas: use a estrutura `.safe` do modelo, ela já resolve.

### Um pensamento por tela

Story é consumido com o dedo no gatilho. Cada tela carrega UMA ideia: um gancho, uma dica, uma pergunta, um convite. Se a tela precisa de dois parágrafos pra se explicar, são duas telas. Parede de texto numa tela vertical é a morte da sequência.

### Hierarquia que se lê em 3 segundos

É o tempo que a pessoa dá antes de pular. Em cada tela, um elemento manda e os outros obedecem:

- Um título grande que se entende sozinho, sem ler o resto.
- No máximo um bloco de apoio (frase curta ou lista de até 3 itens).
- Se tudo na tela grita, nada grita. Um destaque por tela.

### Texto grande, contraste real

- A tela tem 1080px de largura vista num celular: texto crítico nunca abaixo de 30px no quadro; corpo confortável vive na casa dos 40px, título na casa dos 80px pra cima (os tamanhos do modelo já estão calibrados, não encolha pra caber mais texto, corte texto).
- Contraste de corpo 4.5:1 contra o fundo, texto grande 3:1. Texto sobre foto exige um véu escuro ou claro por trás: foto crua atrás de texto é loteria.
- Cinza claro sobre cor, nunca. Sobre fundo colorido, use um tom mais escuro do próprio matiz ou a tinta da direção.

### A sequência tem arco: 4 a 7 telas

- **Abertura:** o gancho que segura o dedo. Uma promessa ou pergunta, não um "oi gente".
- **Desenvolvimento:** o miolo em 2 a 4 telas, um pensamento por tela.
- **Interação:** uma tela com enquete ou caixinha (os blocos `.poll` e `.askbox` do modelo só reservam o lugar; o adesivo real é adicionado no app do Instagram na hora de postar).
- **CTA na última tela, um só:** chama no direct, link na bio, ou responde a caixinha. Um convite claro, não três.

### Recoloração e fontes

- Toda cor entra pelas variáveis do `:root` do modelo. Nenhum hexadecimal solto no meio das telas.
- Com design-guide preenchido, as cores e fontes do negócio ocupam os papéis (fundo, acento, tinta). Em branco, a paleta da direção escolhida da cartela ocupa esses papéis.
- Par de fontes com contraste real, do Google Fonts, só nos pesos usados. A fonte de acento (a palavra em itálico serifado do modelo) entra poucas vezes por sequência, não em toda tela.

---

## 3. Proibições absolutas

Os cacoetes que denunciam story feito por IA. Prestes a escrever um deles, pare e use a alternativa da mesma linha.

1. **Texto crítico encostado nas faixas do Instagram**: tudo que precisa ser lido vive dentro da área segura do modelo.
2. **Parede de texto numa tela**: quebre em mais telas, um pensamento por tela.
3. **Gradient text** (gradiente dentro da letra): cor sólida; ênfase se faz com peso e tamanho.
4. **Glassmorphism decorativo** (vidro e blur como enfeite): superfície sólida da paleta; o leve vidro dos blocos de enquete do modelo já é o teto.
5. **Kicker idêntico em toda tela** (o mesmo rótulo em caps repetido mecanicamente): o kicker muda com a função da tela (DICA, RESPONDE AÍ, PRÓXIMO PASSO) ou sai.
6. **Emoji como decoração mecânica** (um em cada linha, sempre nos mesmos lugares): emoji só quando a voz do Cérebro pede, e com propósito.
7. **CTA em toda tela**: o convite de negócio mora na última tela; no meio, no máximo um "arrasta" ou "toque" de navegação.
8. **Simular foto com desenho** (SVG desenhado à mão fingindo ser foto, mockup falso de conversa): sem imagem boa, resolva com tipografia, cor e composição.
9. **Número inventado** ("97% dos clientes" que ninguém mediu): número só se vem do Cérebro ou dos materiais; senão, prova em palavras.
10. **Enquete ou caixinha desenhada como se fosse real** sem avisar: os blocos do modelo são reserva de lugar, e a tela deve deixar isso claro pro dono na hora de postar (o modelo já traz a etiqueta).

---

## 4. O teste final

Antes de renderizar, três verificações. Nesta ordem.

### A pergunta

Olhe a sequência pronta e pergunte: **alguém veria estas telas e diria "foi IA que fez" sem hesitar?** Se sim, falhou. O que denuncia não é feiura, é mesmice: a sequência que qualquer modelo geraria pro mesmo segmento.

### O teste de reflexo, em duas ordens

- **Primeira ordem:** se dá pra adivinhar a paleta e o clima só pelo segmento (nutricionista = verde com prato de salada, advogado = navy com balança), você entregou o primeiro reflexo do treinamento. Execute a direção com as particularidades DESTE negócio.
- **Segunda ordem:** o anti-óbvio também virou clichê. Fugir do primeiro reflexo e cair no "minimalismo editorial de sempre" é a armadilha um andar abaixo. O que salva é o específico: a cidade, a história do Cérebro, o jeito de falar do dono.

### Checklist de saída

- [ ] A leitura de design foi declarada e a sequência obedece a ela.
- [ ] 4 a 7 telas, com arco: gancho, miolo, interação, CTA.
- [ ] Todo conteúdo crítico dentro da área segura (as guias do modelo confirmam).
- [ ] Um pensamento por tela; cada tela se lê em 3 segundos.
- [ ] Contraste conferido: corpo 4.5:1, texto grande 3:1, nenhum texto sobre foto crua.
- [ ] CTA único, na última tela, concreto.
- [ ] Cores e fontes pelas variáveis do `:root`, da marca ou da direção declarada.
- [ ] Nenhuma proibição da seção 3 presente.
- [ ] Nenhum travessão nem ponto centrado em texto nenhum.
- [ ] Renderizado com `node templates/stories/render.js conteudo/<AAAA-MM-DD>-<tema>` e os PNGs conferidos em `instagram-stories/` (as guias somem sozinhas no render).

---

Resumo de bolso: declare a leitura, recolore o modelo pela marca ou pela direção, um pensamento por tela dentro da área segura, arco de 4 a 7 telas com um CTA só no fim, rode o teste final e só então renderize. Capriche: essas telas são a cara de um negócio de verdade.
