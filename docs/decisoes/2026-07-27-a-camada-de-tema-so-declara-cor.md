# A camada de tema só declara cor, e a densidade ganha trava

## Contexto

Sete agentes passaram por todas as telas do Hub aplicando o contrato de
`docs/planos/vkos-hub-local-v1/06-ajuste-fino-das-telas.md`. Nenhum deles pôde
tocar em `estilos/visual-hub.css` nem em `estilos/global.css`, de propósito,
para não colidirem entre si.

Os sete bateram na mesma parede e reportaram a mesma coisa: **a camada `tema`
vence a camada `tela` por ordem de camada, não por especificidade.** Então boa
parte do trabalho deles estava escrito nas folhas de tela e morto na tela.

Cinco exemplos medidos, todos com a correção já escrita na folha certa e sem
efeito nenhum no navegador:

- O `canvas.css` escrevia `box-shadow: none` no cartão de boas-vindas do
  Cockpit, com um comentário nomeando a `--sombra-forte` do tema como a causa do
  borrão cinza na foto do tema Claro. O borrão continuava lá.
- O `.rotulo-secao` da barra lateral tinha peso 400, tracking 0,14em e
  `--texto-rotulo` no `global.css`, por decisão registrada em
  `2026-07-27-o-rotulo-de-grupo-recua.md`. O tema devolvia peso 600, tracking
  0,095em e `--texto-fraco`. É por isso que CORE, GESTÃO e SISTEMA continuavam
  pesando quase o mesmo que os itens de menu depois de o Jesse pedir recuo três
  vezes.
- O `.no-contexto` pedia `--linha-forte` no `canvas.css`, com comentário
  explicando que o fio inteiro é o que separa o nó de contexto do nó de sessão.
  O tema devolvia `--borda`, e o nó renderizava `#e3eae6` em vez de `#748f84`.
- O tema declarava `.botao { min-height: 38px; padding: 9px 16px }`. Isso matava
  o `.botao-p` do design system inteiro: `Botao tamanho="p"` não encolhia em tela
  nenhuma. O efeito colateral era pior que o tamanho: no campo de token da tela
  de Conexões, o botão do olho tem 28px de largura pela folha da tela e recebia
  38px de altura mais 16px de padding lateral do tema, então o ícone saía da
  caixa e a pessoa não via o controle de revelar o token.
- O tema declarava `--z-modal: 100` e a base declara `--z-modal: 310`. A galeria
  de fontes abria numa camada mais baixa do que o contrato dizia.

Havia também quatro tokens de sombra a mais (`--sombra-suave`, `--sombra-media`,
`--sombra-forte`, `--sombra-flutuante`) convivendo com os três autorizados, em
treze usos. Eram os primeiros na ordem alfabética do autocompletar, então todo
componente novo pegava o errado e nenhum teste reclamava.

## Decisão

**A camada `tema` declara cor, e só cor.** Tamanho, peso, tracking, raio,
espaço, empilhamento e sombra saíram de lá. O que precisava mudar por tema e não
tinha nome virou token: `--acao-hover`, que era um `#24312a` solto dentro de uma
regra presa a um seletor de tema.

Três consequências concretas:

1. **Os quatro tokens de sombra a mais foram apagados**, e os treze usos
   reescritos um a um pela régua de `2026-07-27-o-no-de-grafo-nao-flutua.md`.
   Flutua o que fica parado enquanto o canvas se move: menu, modal, painel que
   desliza, caixa de zoom. Não flutua o cartão parado, o painel encostado, o nó
   de grafo e o palco da peça, e esses perderam a sombra para a escada de
   superfície mais o fio.

2. **O botão inteiro mudou de camada**, de `tema` para `base`. Botão não é valor
   de tema: ele já se escreve em token e troca de cor sozinho. Na base ele
   convive com `.botao-p` e uma tela consegue sobrescrever quando precisa. A
   altura padrão foi de 38px para 36px, que é `--base * 9`, o degrau da escala
   mais perto do que havia; o tamanho pequeno é 28px, acima do mínimo de alvo de
   24px do WCAG 2.2.

3. **O anel de 0px de desfoque saiu do palco.** O `.studio-palco`, a
   `.site-moldura` e o `.editor-palco` eram separados do canvas por um
   `box-shadow: 0 0 0 1px`, que é uma borda escrita na propriedade errada. A
   exceção do contrato é o `inset`, porque fio não ocupa caixa. A espessura
   voltou para a folha de cada tela como `outline: 1px`, que também não entra no
   cálculo do tamanho e portanto não deforma uma peça que tem medida exata em
   pixel.

**E as regras que dão para medir em CSS ganharam trava:
`app/web/src/estilos/densidade.test.ts`.** Seis testes, no mesmo padrão de
`escalas.test.ts` e `camadas.test.ts`, varrendo `web/src` inteiro por
`estilos/folhas.ts`, reprovando com arquivo, linha, seletor e valor.

Toda exceção é **lista branca explícita e nomeada**, nunca heurística por nome
de classe, e cada linha da lista leva o motivo. A caixa alta tem dois seletores
autorizados (`.rotulo-secao` e `.sw-trigger-rotulo`), o peso 700 tem onze (todos
número ou wordmark) e o tracejado tem um (`.criacao-dropzone.arrastando`). Um
bloco só entra na exceção se **todos** os seletores dele estiverem na lista,
senão juntar um seletor autorizado com um qualquer viraria a porta dos fundos.

## Por quê

Porque a alternativa é confiar na disciplina, e ela já falhou de forma medida:
as quatro regras deste contrato estavam escritas no `CLAUDE.md` e no
`05-design-system.md` desde antes da rodada, e a varredura achou 66 sombras
cruas, 203 pesos 700, 36 caixas altas e 11 tracejados.

E porque o custo do problema não era estético. Um controle invisível (o olho do
token), um rótulo que compete com o que ele rotula e um contorno de campo abaixo
de 3:1 são defeitos de uso, não de gosto. O estudo de eyetracking do NN/g com 71
participantes mediu 22% mais tempo e 25% mais fixações na mesma tarefa quando o
sinalizador é fraco, com p < 0,05.

O formato da lista branca também tem motivo registrado. Uma rodada anterior
tentou adivinhar por nome de classe no `escalas.test.ts` e falhou em silêncio:
`.core-linha-seta` era um ícone e não tinha "icone" no nome. Lista branca
reprova pedindo para nomear, e nomear é barato. Adivinhação passa verde sem ver.

## O que a mudança revelou, e o que foi consertado na folha da tela

Cinco folhas de tela precisaram de conserto porque a remoção da regra do tema
expôs o que estava por baixo:

- `componentes/studio/studio.css` e `componentes/editor/editor.css` ganharam o
  `outline` do palco, que antes vinha do anel do tema.
- `estilos/canvas.css`: a caixa de zoom do cockpit passou de `box-shadow: none`
  para `--sombra-popover`, para casar com a do Mapa. As duas são a mesma coisa,
  controle ancorado na viewport, e agora leem igual.
- `componentes/crm/crm.css`: quatro `z-index` que apontavam para tokens que só
  existiam no tema (`--z-dropdown`, `--z-overlay`, e dois `--z-modal` com valor
  de reserva) passaram para os degraus da escala.
- `componentes/core/core.css`, `componentes/workspace/dashboard.css` e
  `estilos/global.css`: os pesos 700 e as caixas altas que o `densidade.test.ts`
  pegou. Onde o 700 era título, ele já era regra morta, porque a regra genérica
  de `h1, h2, h3` na camada tema fixa 500 desde a rodada da pele.

Duas folhas do editor mudaram de casa junto: os controles de imagem
(`.editor-imagem-*`) e a galeria de fontes (`.galeria-fontes-*`) moravam no
`global.css` por acidente de história. Foram para
`componentes/editor/editor.css`, e o `GaleriaFontes.tsx` e o
`ControlesImagem.tsx` passaram a importar a própria folha, porque os dois também
abrem de dentro das telas de Criação, que não carregam o editor inteiro.
