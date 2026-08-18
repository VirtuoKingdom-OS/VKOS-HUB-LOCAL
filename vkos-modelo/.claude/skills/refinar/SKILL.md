---
name: refinar
description: >
  Melhoria pontual de uma peça visual, um gesto de cada vez, em modos: tipografia, cor,
  layout, motion, ousado, quieto, clareza e polir. Aplica o gesto na peça aberta sem
  redesenhar o resto. Use quando o comprador disser /refinar <modo> (ex: /refinar cor),
  "melhora a tipografia", "esse layout tá apertado", "deixa mais ousado", "acalma esse
  visual", "arruma os textos dos botões", ou "dá um polimento final". Sem modo indicado,
  a skill pergunta qual gesto (uma pergunta só).
---

# /refinar: um gesto de cada vez

Não é redesign. É um gesto cirúrgico na peça que está aberta: a menor mudança que realiza a
intenção do modo pedido. O resto da peça fica em paz.

## Antes de qualquer modo

1. Identifique a peça: a que está aberta na conversa, ou a mais recente em `conteudo/`. Na
   dúvida, UMA pergunta.
2. Leia `identidade/design-guide.md` e o `templates/<formato>/principios-visuais.md` do
   formato (pra interface de projeto, o de site). Se a peça segue uma direção da cartela
   (`templates/design/cartela.md`), o gesto refina DENTRO dela, nunca contra ela.
3. Aplique o gesto. Depois: rode o teste "parece IA?" do princípios do formato, renderize de
   novo se a peça é renderizada, e diga o que mudou e onde salvou.

## Como usar

`/refinar <modo>`. Os modos:

| Modo | O gesto |
|---|---|
| `tipografia` | Hierarquia e fontes mais claras e intencionais |
| `cor` | Cor estratégica, com papel e contraste |
| `layout` | Espaço, ritmo e hierarquia espacial |
| `motion` | Movimento que comunica estado, sem enfeite |
| `ousado` | Mais impacto por decisão, não por efeito |
| `quieto` | Menos intensidade, mais refino |
| `clareza` | Textos de interface que qualquer um entende |
| `polir` | O passe geral final, detalhe por detalhe |

Sem modo, pergunte uma vez só: *"Qual gesto: tipografia, cor, layout, motion, ousado, quieto,
clareza ou polir?"* E siga com a resposta.

---

## tipografia

O tipo carrega a maior parte da informação da peça. O gesto é deixar o texto mais claro e
mais intencional, nunca mais enfeitado. Boa tipografia é invisível; a ruim distrai.

Regras:

1. Poucos tamanhos, com contraste de verdade: 5 papéis bastam (legenda, apoio, corpo,
   subtítulo, título), razão constante de 1.25 ou mais. Tamanhos vizinhos (14, 15, 16px)
   fazem hierarquia turva.
2. Corpo legível: mínimo 16px, linha de 45 a 75 caracteres (max-width em `ch`), line-height
   1.5 a 1.7 no corpo e 1.1 a 1.2 no título.
3. Par de fontes com contraste real (serif com sans, geométrica com humanista), ou UMA
   família em vários pesos. Nunca duas quase iguais.
4. Peso com papel fixo: 3 ou 4 pesos no máximo, e o mesmo papel usa o mesmo peso na peça
   inteira.
5. Texto claro sobre fundo escuro pede compensação tripla: line-height um pouco maior,
   letter-spacing leve, peso um ponto acima.
6. Caixa alta curta pede letter-spacing de 0.05 a 0.12em. Display grande vai de tracking
   normal a levemente negativo, nunca abaixo de -0.04em.
7. `text-wrap: balance` em títulos; `tabular-nums` em números que se alinham.

Não fazer: mais de 2 ou 3 famílias; tamanho arbitrário fora da escala; fonte decorativa em
texto corrido; corpo abaixo de 16px; "deixar chique" um texto que só precisava ficar claro.

## cor

Mais cor não é melhor. O gesto é dar papel a cada cor: a paleta da marca aplicada com
intenção, hierarquia e significado. Cor estratégica ganha de arco-íris sempre.

Regras:

1. A paleta do design-guide (ou da direção da cartela) manda. 2 a 4 cores além dos neutros,
   nunca mais.
2. Peso visual 60-30-10: neutros dominam, o acento é raro. O acento funciona PORQUE é raro.
3. Contraste inegociável: corpo 4.5:1, texto grande e componente 3:1. Nunca cinza sobre
   fundo colorido: use um tom escuro da própria cor do fundo, ou transparência da tinta.
4. Significado consistente: o acento sempre marca ação, verde sempre é sucesso, o mesmo
   estado sempre tem a mesma cor.
5. Neutro tingido pro lado da cor DESTA marca (um fiapo de saturação), não pro "quentinho"
   por reflexo: o creme genérico é o default de IA.
6. Cor nunca é o único indicador: ícone, rótulo ou forma acompanham (acessibilidade).
7. Em fundo escuro, profundidade vem de superfície mais clara, não de sombra; acento um
   pouco dessaturado, texto um peso abaixo.

Não fazer: gradiente roxo-azul de IA; faixa lateral colorida grossa em card; colorir tudo
(mata a hierarquia); quebrar contraste em nome de estética.

## layout

Espaço é material de design, não sobra. O gesto é dar ritmo: agrupamento apertado no que é
junto, respiro generoso no que separa, e hierarquia que aparece em 2 segundos.

Regras:

1. Escala de espaçamento fixa (base 4: 4, 8, 12, 16, 24, 32, 48, 64, 96px). Nenhum valor
   fora dela.
2. Irmãos juntos (8 a 12px), seções separadas (48 a 96px). A variação é o ritmo; espaçamento
   tudo igual é monotonia.
3. Teste do olho apertado: desfocando a vista, o principal, o secundário e os grupos ainda
   se distinguem. Se não, a hierarquia falhou.
4. Hierarquia forte combina 2 ou 3 dimensões: tamanho (3:1 ou mais), peso e espaço ao redor.
5. Card só quando é a melhor resposta. Nunca card dentro de card. Nunca grade infinita de
   cards idênticos (ícone + título + texto repetidos).
6. Flexbox pra uma dimensão, grid pra duas. Grade responsiva sem breakpoint:
   `repeat(auto-fit, minmax(280px, 1fr))`.
7. Alvo de toque de 44x44px no mínimo, mesmo quando o desenho é menor.

Não fazer: valor de espaçamento arbitrário; embrulhar tudo em card; métrica-herói decorativa
(número grande inventado com gradiente); z-index mágico (999).

## motion

Movimento existe pra comunicar estado, dar feedback e guiar o olho. O gesto é colocar motion
onde ele trabalha e cortar onde ele só decora. Fadiga de animação é custo real.

Regras:

1. Regra 100/300/500: feedback em 100 a 150ms, mudança de estado em 200 a 300ms, mudança de
   layout em 300 a 500ms, entrada em 500 a 800ms. Saída em ~75% do tempo da entrada.
2. Easing de desaceleração (ease-out quart, quint ou expo). Nunca bounce, nunca elastic.
3. UM momento-herói por peça. O resto é micro-feedback discreto.
4. Anime transform e opacity por padrão. Nunca propriedade de layout (width, height, top,
   left) sem necessidade real.
5. Stagger só em lista de verdade: ~50ms por item, teto total de ~500ms. Fade-e-sobe em toda
   seção rolada é o tell de IA, não coreografia.
6. Reveal melhora o que já está visível: nada nasce escondido esperando JS pra aparecer.
7. `prefers-reduced-motion: reduce` desliga tudo. Sem exceção.

Não fazer: animar tudo; feedback acima de 500ms (parece travado); bloquear a interação
durante a animação; motion sem motivo nomeável.

## ousado

Quando pedem "mais ousado", o reflexo de IA entrega gradiente ciano-roxo, glassmorphism e
neon. Isso é o contrário de ousado. Ousado é distinto e comprometido: uma ideia visual forte
executada com decisão, dentro da linguagem que a peça já tem.

Regras:

1. Escolha UM ponto focal que a pessoa vai lembrar. Todo o resto passa a servir a ele.
2. Amplie a hierarquia existente: o título muito maior, o apoio muito mais quieto. Contraste
   entre os níveis, não volume geral.
3. Use a paleta que já existe com mais decisão (proporção, posição, área) antes de inventar
   cor nova.
4. Deixe o conteúdo real carregar a atenção: a foto de verdade, o número do Cérebro, a
   história do dono. Efeito não substitui substância.
5. Dê ponto de vista ao layout: denso contra respiro, proporção assimétrica intencional,
   sequência que conta uma ordem.
6. Se couber motion, UM momento com intenção, ensaiado, não efeitos espalhados.

Não fazer: gradiente ciano-roxo, glassmorphism, neon sobre escuro, gradient text em métrica
(o "ousado" default de IA); deixar tudo mais alto (se tudo grita, a peça fica mais chata, não
mais ousada); esconder hierarquia fraca atrás de decoração.

## quieto

Quieto é mais difícil que ousado: sutileza exige precisão. O gesto é reduzir a intensidade
sem apagar a personalidade. Pense luxo, não preguiça.

Regras:

1. Dessature: das cores gritantes pra 70 a 85% da saturação. Menos cores, neutros
   trabalhando mais, o acento de volta aos 10%.
2. Reduza peso tipográfico um degrau (900 vira 600, 700 vira 500). Hierarquia passa a vir de
   espaço e tamanho, não de grito.
3. Mais respiro: aumente o espaço em branco, afine ou remova bordas, aplaine camadas.
4. Corte o decorativo que não trabalha: gradiente, sombra dupla, brilho, textura de enfeite.
5. Encolha o motion: distâncias menores (10 a 20px), easing suave, só o funcional fica.
6. Contraste alto só onde importa de verdade. Um ponto forte numa peça calma vale por dez.

Não fazer: deixar tudo do mesmo tamanho e peso (hierarquia continua obrigatória); tirar toda
a cor (quieto não é cinza); apagar o que dava caráter à peça; tirar affordance de botão e
link em nome da calma.

## clareza

O gesto é reescrever os textos de interface (botão, erro, rótulo, estado vazio, aviso) até
qualquer pessoa entender de primeira. Texto claro é invisível; texto vago vira dúvida,
abandono e mensagem no suporte.

Regras:

1. Botão diz a ação: "Salvar alterações", "Pedir orçamento". Nunca "OK", "Enviar", "Clique
   aqui".
2. Erro em três partes: o que houve, por quê, como resolver. Sem culpar: "Falta o email",
   nunca "Você errou".
3. Estado vazio é convite: por que está vazio e qual o próximo passo. "Nenhum pedido ainda.
   Divulgue seu link pra receber o primeiro."
4. Voz ativa e concreta. Corte toda palavra que não trabalha.
5. Um termo por conceito na peça inteira: escolheu "pedido", é "pedido" até o fim.
6. Carregando com expectativa ("Gerando as imagens, leva uns 30 segundos"); sucesso
   confirmando o que aconteceu e o que vem depois.
7. Campo de formulário tem rótulo de verdade. Placeholder some quando a pessoa digita: ele
   dá exemplo, não substitui rótulo.

Não fazer: jargão sem explicação; humor em mensagem de erro (a pessoa já está frustrada);
"Algo deu errado" sem caminho de saída; explicar duas vezes o que já estava claro.

## polir

O passe final: a diferença entre entregue e caprichado. Só entra quando a peça está completa;
polir coisa pela metade é decorar rascunho.

Regras:

1. Alinhamento e espaçamento na escala, em todos os tamanhos de tela. Nenhum 13px perdido,
   nenhum texto vazando.
2. Todo elemento interativo com todos os estados: hover, focus visível, ativo, desabilitado,
   carregando, erro, sucesso.
3. Consistência total: mesmo elemento com mesmo estilo, mesmo termo, mesma capitalização, do
   começo ao fim.
4. Acessibilidade conferida: contraste WCAG, alt em imagem, navegação por teclado,
   `prefers-reduced-motion`.
5. Casos de borda: nome comprido, lista vazia, dado faltando, erro de rede. A peça se
   comporta em todos.
6. Lixo zero: console.log, código comentado, import morto, arquivo órfão.
7. Feche com o teste final do formato ("parece IA?" e o checklist do princípios-visuais) e
   conserte o que reprovar antes de entregar.

Não fazer: polir o incompleto; deixar um canto perfeito e o resto tosco (a qualidade é
pareja ou não é); inventar padrão novo durante o polimento; tratar "nenhum erro no console"
como prova de que ficou bom.

---

Modos destilados dos gestos do impeccable (Apache-2.0, Paul Bakaus): typeset, colorize,
layout, animate, bolder, quieter, clarify e polish, reescritos em português pro VKOS.
Crédito completo em `CREDITOS.md`.
