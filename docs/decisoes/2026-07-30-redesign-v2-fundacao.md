# A fundação v2, e o sistema anterior revogado

## Contexto

O Jesse olhou o app depois da rodada de design de 2026-07-27 e disse duas
coisas: que o design está feio, e que ele vê os mesmos erros se repetindo desde
o começo. Ele autorizou reescrever o design system inteiro, e revogou
explicitamente, para efeito deste trabalho, as regras de design escritas no
CLAUDE.md e todas as decisões `docs/decisoes/2026-07-27-*`: elas não devem ser
seguidas, citadas como justificativa, nem ter os valores herdados. A única
exigência que permanece é dois temas, um claro e um escuro, alternáveis.

O diagnóstico técnico por trás do "mesmos erros se repetindo" foi levantado
antes de qualquer decisão estética. Ele não é de gosto: **o app tinha UMA
primitiva compartilhada, o botão, e dezenove folhas de tela onde cada tela
reinventava campo, pílula, cartão, faixa de aviso, aba, lista e estado vazio**,
cada uma com uma variação pequena. Vinte variações pequenas do mesmo componente
é o que faz uma interface parecer mal-acabada sem que se consiga apontar onde. A
rodada de 2026-07-27 tratou isso escrevendo regras e limpando tela por tela com
sete agentes. A limpeza durou o que durou, porque regra escrita não impede erro
que se repete: a varredura daquele mesmo dia achou 66 sombras cruas, 203 pesos
700 e 36 caixas altas DEPOIS de as regras já estarem no CLAUDE.md.

## Decisão

**1. A regra estética única: a interface é acromática e o conteúdo do usuário é
a única coisa colorida na tela.** O Hub mostra carrossel, site, imagem e galeria
o tempo todo. Cor na moldura briga com a peça ao lado. Sai o canvas tingido de
menta, entra neutro frio nos dois temas.

**2. O menta continua, com um emprego só: dizer o que está vivo.** Ponto de
sessão rodando, barra de progresso, contorno de campo em foco, e texto que diz
explicitamente um estado vivo. Não pinta botão, título, ícone de menu, hover,
cartão selecionado nem aba ativa. No tema Claro ele não é o hex da marca:
`#2fd4a7` sobre papel dá 1,7:1, então o vivo do Claro é `#0b9776` e o do Escuro é
`#2fd4a7`.

**3. Existe uma camada de primitivas de verdade**, em
`app/web/src/estilos/primitivas.css`, implementada e pronta: estrutura de tela,
botão em quatro níveis e três tamanhos, campo, select, caixa de seleção,
interruptor, grupo de opções, segmentado, selo, contagem, ponto vivo, lista
densa, tabela, abas, faixa, modal, popover, menu, estado vazio, esqueleto,
progresso. A tela não inventa componente: ela compõe e escreve só o layout dela.

**4. A densidade se decide na altura de controle, nunca no tamanho da letra.**
28 / 32 / 40px, e corpo de 14px. Quem usa o Hub não é desenvolvedor e fica horas
ali; 13px é medida de IDE.

**5. Conteúdo não nasce dentro de cartão.** Ele se apoia direto no plano de
trabalho, e a separação vem de espaço e de um fio. Cartão é para objeto repetido
e independente. Cartão dentro de cartão nunca é certo.

**6. As travas foram reescritas para o contrato novo, e ganharam as duas que
faltavam**: cor só por token (nenhum hex em folha de componente) e empilhamento
só pela escala. São 31 testes na fundação, todos verdes.

**7. As folhas de tela migram na Fase 2, uma por agente.** Enquanto isso, elas
ficam numa lista `PENDENTES` em `folhas.ts`, e as travas de conteúdo não as
varrem. A trava de cascata varre todas, sempre. O mapa está em
`docs/planos/redesign-v2/01-pendencias-por-tela.md`.

O contrato completo, com o valor medido de cada decisão, está em
`docs/planos/redesign-v2/00-fundacao.md`.

## Por quê

**Por que acromático, e não outra cor.** A checagem de reflexo de categoria dá
duas respostas erradas de saída: "cockpit de IA" pede escuro com neon, e fugir
disso pede papel claro com tingimento, que é exatamente o sistema que o Jesse
está reprovando. As duas estão queimadas. A terceira resposta não veio de
estética, veio da função: **a tela do Hub quase nunca está vazia de cor, porque
o conteúdo do usuário é colorido.** Uma moldura neutra é a única que não compete
com ele. Isso é argumento verificável, não pose.

**Por que a camada de primitivas é o entregável central, e não a paleta.** Trocar
cor conserta a tela de hoje. A camada de primitivas conserta a tela que ainda não
foi escrita. O erro que se repete não é uma escolha errada de cor: é vinte telas
decidindo sozinhas o que é um campo. Nenhum documento resolve isso, porque
ninguém consulta documento enquanto escreve CSS. Só resolve quando usar a
primitiva é mais fácil que reinventar.

**Por que trava executável em vez de mais regra escrita.** É a lição direta da
rodada anterior: as quatro regras de densidade já estavam escritas em dois
documentos e mesmo assim foram violadas 316 vezes. Toda regra deste sistema que
dá para medir em CSS virou teste, com exceção por lista branca nomeada e mensagem
que diz arquivo, linha, seletor e valor. Heurística por nome de classe está
proibida: ela falha em silêncio, e já falhou aqui.

**Por que os números não foram escolhidos no olho.** Antes de decidir escala,
densidade, tema escuro, canvas, movimento e contraste, foram levantados os
arquivos de token publicados e o CSS de produção de Radix, Carbon, Primer,
Atlassian, Material 3, Linear, Vercel, Ant Design, Fluent, shadcn, MUI, AG Grid,
React Flow, tldraw, n8n e Excalidraw. Três resultados mudaram decisão de fato:
o tracking da escala saiu da fórmula de métrica dinâmica que o próprio Inter
publica, em vez de arbitrado; o texto do tema Escuro não é branco puro, porque
nenhum produto de referência usa e a fórmula do WCAG 2 não avisa; e a linha de
conexão do canvas ganhou token próprio que ignora o tema, que é o que o React
Flow faz. As referências estão citadas na seção 13 da fundação.

**Por que o mecanismo de cascata com `@layer` foi mantido.** As folhas de tela
carregam sob demanda, e a ordem da cascata precisa ser determinística por
construção. O mecanismo atual resolve isso, está travado por teste e não custa
nada. Substituir só por substituir seria trocar um problema resolvido por um
problema novo. O que mudou foi o conteúdo de cada camada, não o mecanismo.

**Por que existe um `legado.css`.** Reescrever `global.css` sem tirar o CSS de
casca de dentro dele deixaria o app sem barra lateral até a Fase 2 terminar. O
legado foi movido inteiro, sem edição, para um arquivo com nome que diz o que ele
é e um comentário no topo dizendo que ele existe para ser esvaziado. É a única
forma de a fundação nascer limpa e o app continuar de pé no mesmo commit.

**Sobre o que foi revogado.** Este documento substitui, para efeito de design de
interface, as decisões `2026-07-27-luz-como-identidade`,
`2026-07-27-a-textura-do-canvas`, `2026-07-27-o-no-de-grafo-nao-flutua`,
`2026-07-27-a-camada-de-tema-so-declara-cor`, `2026-07-27-o-rotulo-de-grupo-recua`,
`2026-07-27-o-glow-so-marca-estado`, `2026-07-27-a-escala-de-opacidade`,
`2026-07-27-o-piso-da-escala-tipografica`, `2026-07-27-a-tela-nunca-entra-transparente`
e `2026-07-27-a-fonte-embarcada`. Três princípios daquelas decisões sobreviveram
por mérito próprio, reexaminados do zero e confirmados pela pesquisa, e estão
reescritos na fundação nova com justificativa própria: a profundidade vem da
escada de superfície e não de sombra, o rótulo de grupo é o único texto abaixo de
4,5:1, e a fonte é embarcada. Nenhum valor numérico foi herdado.
