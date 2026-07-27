# A ordem da cascata do CSS passa a ser declarada, com @layer

## Contexto

O `CLAUDE.md` e o `contexto/arquitetura.md` diziam que `visual-hub.css` carrega por último e fixa o valor final de cada token por tema. Isso era verdade em `main.tsx` e mentira no build.

Só três folhas entram por `main.tsx`. As outras quinze entram por componente, e sete delas por componente carregado com `React.lazy`. O Vite emite um CSS separado para cada pedaço, e esse CSS vira um `<link>` no fim do `<head>` quando a tela abre, ou seja, depois do `visual-hub.css`. Mesma especificidade, quem chega depois vence.

Medido no pacote de entrada do build de 2026-07-27, por deslocamento em bytes, a ordem real era:

```
criacao.css, markdown.css, cerimonia.css, composer.css, workspaces.css,
dashboard.css, setup.css, xyflow, global.css, visual-hub.css, canvas.css, cerebro.css
```

Ninguém escreveu essa ordem. Ela é efeito de içamento de import do ES module. `criacao.css` no deslocamento 0, antes da base. E depois de tudo isso vinham, em pedaços separados, conexoes, crm, editor, ide, mapa, site e studio, todos por cima da camada de tema.

Efeito medido por simulação da cascata sobre o CSS construído: em **58 seletores e 90 pares de propriedade** a camada oficial de tema declarava um valor e perdia para uma folha de tela, por ordem de carga, com a mesma especificidade. Em Site, Studio, IDE, Conexões, Mapa, CRM, Criação, Dashboard e no painel de editor compartilhado.

## Decisão

A ordem das camadas passa a ser declarada em CSS, com `@layer`, e não mais deduzida da ordem de carga:

```
base     global.css, o reset, as escalas e o contrato de nome dos tokens
externo  o CSS do React Flow, que vem de fora e o app sobrescreve
tela     as 16 folhas de tela
tema     visual-hub.css, o valor final de cada token por tema
```

Três coisas concretas:

1. **`@layer base, externo, tela, tema;` no topo de toda folha**, não só de uma. A ordem é fixada pela primeira declaração que o navegador lê, e o bundler não garante qual folha vem primeiro. Uma folha só com a declaração não bastaria: se ela chegasse depois de um `@layer tela { }`, `tela` já estaria fixada na frente.

2. **Cada folha declara todo o seu conteúdo dentro da camada dela.** Regra fora de camada vence qualquer camada, então nada pode ficar de fora.

3. **O CSS do React Flow entra por `estilos/externo.css`**, que faz `@import "@xyflow/react/dist/style.css" layer(externo)`. Antes ele entrava direto por `main.tsx`, sem camada. Estilo sem camada ganha de toda camada, então o `canvas.css` e o `mapa.css` perderiam as suas próprias sobrescritas de `.react-flow__*`.

A camada `externo` fica **acima de `base` e abaixo de `tela`**. Acima de `base` porque o reset universal `* { margin: 0; padding: 0 }` de `global.css` não pode zerar a margem e o padding que o React Flow precisa nos elementos dele: medido, isso quebrava a caixa de controles, o rodapé de atribuição e o painel do canvas em 104 propriedades. Abaixo de `tela` porque o canvas e o mapa sobrescrevem o React Flow de propósito.

Um teste em `estilos/camadas.test.ts` trava as três coisas: toda folha declara a ordem antes de qualquer regra, nada fica fora da camada da folha, e o React Flow só entra por `externo.css`.

## Por quê

A causa do problema nunca foi ter duas camadas de CSS. Foi a ordem de carga ser acidental. Consolidar as duas folhas numa só, como a Fase 4 previa, resolveria hoje e devolveria o bug na primeira tela nova que fosse carregada sob demanda.

`@layer` é nativo, sem dependência, e resolve a causa: uma linha por arquivo, sem mover código, sem mudar seletor, sem mexer em componente.

A alternativa óbvia, `!important` na camada de tema, resolve por um dia e vira guerra de `!important` depois. Existem nove no projeto e o número certo continua sendo perto de zero.

## O que a mudança custou, e o que ela consertou

Medido com o navegador de verdade: o Edge sem janela sobre uma página sintética com um elemento por seletor do CSS construído, nos três temas, antes e depois. **98 seletores mudaram de 2355, em 583 pares de seletor e propriedade, iguais nos três temas.** Nenhum token mudou de valor. Toda mudança é a camada de tema passando a valer, que é o comportamento que sempre foi o pretendido.

Duas coisas dependiam da ordem acidental para funcionar e foram consertadas na camada certa:

- **`h1, h2, h3 { text-wrap: balance }` e `p { text-wrap: pretty }` moraram no `visual-hub.css`.** Não são valor de tema, são padrão de elemento. Na camada de tema passavam a vencer, por camada, o `white-space: nowrap` de classe de quem trunca título numa linha só, e cinco títulos voltavam a quebrar. Foram para `global.css`, na camada base, onde padrão de elemento pertence.
- **`.react-flow__controls-button:last-child { border-bottom: none }` era do React Flow.** Com o React Flow numa camada abaixo, a borda do `canvas.css` venceria e sobraria um fio no pé da caixa de controles, nas três telas que usam `Controls`. A regra foi repetida no `canvas.css`.
