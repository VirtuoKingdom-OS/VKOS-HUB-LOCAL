# Manipulação direta no Studio, no nível do Canva

## Contexto

O Studio já editava peça de verdade, mas o uso real mostrou onde ele travava. Medido dirigindo o app numa sessão de navegador, não deduzido:

- Não existia Refazer. Um Ctrl+Z a mais e a edição sumia para sempre.
- Delete e Backspace não faziam nada com um elemento selecionado.
- Esc não soltava a seleção quando o foco estava dentro do iframe, que é onde ele fica logo depois de clicar numa página. O keydown não atravessa a fronteira do documento, e só a tela tinha o atalho.
- No zoom de 100% o slide ficava mais alto que a área visível e não havia como ver o topo nem o pé: a roda só andava na horizontal.
- O contorno de seleção pintava em `#00c896`, o menta histórico, e não no `#2fd4a7` dos temas. Estava assim desde julho, hardcoded nos dois motores.
- O painel abria por Camadas e Cores do tema. A seção do elemento que a pessoa acabou de clicar ficava a mais de 700 px de rolagem.
- As guias de arrasto só existiam para o centro do slide. Não havia alinhar com outro elemento.
- Cada toque de seta virava um passo de desfazer. Vinte toques comiam metade da pilha.

## Decisão

O Studio passa a ser um editor de manipulação direta calibrado pelo Canva, não pelo Figma.

**Histórico com refazer.** `Historico<T>` em `editor/nucleo.ts` substitui a `PilhaSnapshots`. Desfazer e refazer recebem o estado atual e devolvem o que restaurar. Ação nova mata o refazer pendente. Profundidade 50, o padrão do Photoshop: cada passo aqui é o documento inteiro serializado, mais pesado que o diff de texto das bibliotecas que usam 100. Os dois motores usam a mesma classe.

**Gesto contínuo é um passo só.** `deveAgruparPasso` em `editor/alinhamento.ts` agrupa toques da mesma ação, no mesmo elemento, dentro de 500 ms. 500 ms é o número de consenso: `newGroupDelay` do prosemirror-history e do @codemirror/commands, `captureTimeout` do Yjs. Vinte setas voltam com um Ctrl+Z para a posição de antes do gesto.

**Guias de alinhamento contra vizinhos.** `calcularAlinhamento` em `editor/alinhamento.ts` compara as três âncoras de cada eixo do elemento arrastado (dois lados e o meio) contra as do palco e as dos vizinhos, e gruda no encaixe mais próximo. Um eixo gruda no máximo uma vez, nunca soma dois encaixes. A tolerância é 8 px de tela dividida pela escala, o valor que o tldraw documenta: a tolerância é do olho, não do documento. A guia é um segmento cobrindo os dois envolvidos, não uma linha atravessando a página, e a de centro sai pontilhada para separar "alinhei pelo meio" de "encostei numa borda".

**Teclado completo, nos dois lados da fronteira.** Todo atalho existe no documento do iframe e na janela do app: Ctrl+Z, Ctrl+Shift+Z e Ctrl+Y, Ctrl+S, Ctrl+D, Delete, Esc, Enter, setas e Shift+setas. Esc durante um arrasto ou redimensionamento cancela o gesto.

**Delete pede confirmação, não apaga direto.** A confirmação subiu do painel para a tela, e a tecla cai na mesma janela do botão. É o único ponto em que não se copia o Canva, e de propósito: lá o desfazer é infinito e sobrevive à sessão; aqui a pilha é cortada na gravação, por decisão anterior. Apagar por tecla sem aviso seria perda silenciosa.

**Cor do editor por token, atravessando a fronteira do iframe.** `editor/tema.ts` lê o `--menta` computado no `:root` do documento do Hub e injeta o literal no CSS do iframe. O documento da peça não participa da cascata em `@layer` do app e não enxerga `var(--menta)`; a fonte da verdade continua sendo o token. Um `MutationObserver` no `data-theme` reinjeta quando o tema muda.

**Alça com desenho de 10 px e alvo de clique de 24 px.** O quadradinho visível fica no `::after`; a caixa que recebe o gesto é maior e transparente. 24 px é o mínimo do WCAG 2.5.8 (AA). Elemento com menos de cinco alças de largura ou altura perde as alças de lado do eixo apertado, a regra `minimumSizeForEightHandles` do Excalidraw.

**O elemento selecionado é a primeira seção do painel.** Ordem fixa, sem reorganizar a cada clique: Elemento, Imagem, aplicar em todas, Camadas, Cores do tema, Adicionar imagem. Camadas e cores são biblioteca, não resposta ao gesto que a pessoa acabou de fazer.

**Estado de gravação escrito, num lugar só.** "Salvando...", "Não salvo" e "Salvo" ao lado do nome, no padrão do Google Docs e do Canva. Sem spinner: o guia do NN/g dispensa indicador abaixo de 1 segundo, e gravar arquivo local é mais rápido que isso. O que faltava não era a espera, era a confirmação.

**Folha de atalhos atrás de um botão.** Manipulação direta só ajuda quem descobre que ela existe, e nada na tela contava. Fica escondida, no espírito de progressive disclosure, sem ocupar espaço de trabalho.

**A roda anda na vertical quando o slide não cabe.** `align-items: safe center` no canvas: centralizado enquanto cabe, alinhado ao início quando transborda, porque com `center` puro o excesso de cima fica inalcançável. E a roda usa um `scrollBy` instantâneo: com `scroll-behavior: smooth`, duas atribuições seguidas viram duas animações e a segunda cancela a primeira.

## Por quê

O pedido foi "um Canva da vida". O eixo que separa Canva de Figma não é quantidade de recurso, é quem paga o custo da estrutura. O Figma expõe a árvore e pede que o usuário administre; o Canva absorve a estrutura e entrega comandos rasos. Os princípios publicados no `canva.dev` dizem isso em três linhas: Great Defaults, Just Simple Enough e Beginners Become Experts. O NN/g dá o número que fecha o argumento: as interações entre recursos crescem com o quadrado do número de recursos. O público do Hub é dono de negócio, não designer, então cada recurso novo aqui precisou pagar o próprio custo.

Por isso entrou o que tira medo e devolve tempo (refazer, guias, atalhos, estado visível) e não entrou o que o Figma tem e o Canva deliberadamente não tem: auto layout, constraints, componentes, vector networks, tipos de máscara.

Os números não foram inventados. 8 px de snap vêm do tldraw, 500 ms de agrupamento do prosemirror e do codemirror, 50 passos de pilha do Photoshop, 24 px de alvo do WCAG, a regra de esconder alça de lado do Excalidraw. Figma e Canva não publicam essas medidas; as bibliotecas de código aberto publicam.

A decisão de manter a confirmação no Delete contraria o Canva de propósito e fica registrada aqui para não ser reaberta: enquanto a pilha de desfazer for cortada na gravação, apagar por tecla sem aviso é irreversível na prática.
