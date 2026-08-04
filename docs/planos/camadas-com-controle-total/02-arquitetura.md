# Camadas com controle total: a arquitetura

Três fases, cada uma deixando o app funcionando. A ordem importa: a fase 1
conserta o significado de "reordenar", e só depois disso o arrasto da fase 3
tem o que fazer.

## A decisão que sustenta tudo

**Reordenar camada tem dois significados legítimos, e o painel passa a declarar
qual está em uso.**

```ts
export type ModoCamadas = "empilhamento" | "fluxo";
```

- **`empilhamento`** (carrossel, Studio): a página é tela fixa. Reordenar muda
  QUEM PINTA POR CIMA e nada mais. Nunca mexe na ordem do DOM.
- **`fluxo`** (site): a página é documento que corre. Reordenar muda a ORDEM
  NA PÁGINA, que é o que já acontece hoje e está certo.

Sem essa distinção declarada, qualquer conserto vira remendo: é a mesma função
tentando servir a dois donos com expectativas opostas.

---

## Fase 1: no carrossel, empilhamento é z-index e ponto

### O que muda

`moverCamada` do `motor.ts` **para de mexer no DOM**. A nova
`reordenarCamada(id, indiceDestino)` reescreve `z-index` dos irmãos.

### Como z-index passa a valer sempre

`z-index` só tem efeito em elemento posicionado, item de flex ou item de grid.
Os filhos de `.wrap` são itens de flex, então já valem. Para um filho de bloco
comum, o motor **já tem** a peça certa: `garantirPosicionavel`
(`motor.ts:718`) põe `position: relative` e marca `data-ed-relpos`.
`position: relative` sem `left`/`top` não move nada.

### Como a mudança fica contida

Renumerar irmãos só é seguro se os valores não competirem com elementos de
fora. A garantia é o pai estabelecer contexto de empilhamento.

- `.wrap` **já estabelece** um, porque `backdrop-filter` cria contexto.
- Quando o pai não estabelece, o motor põe `isolation: isolate` nele, marcado
  com `data-ed-isola`. `isolation: isolate` não muda pixel nenhum sozinho.

**Risco declarado, a conferir no navegador antes de fechar a fase:**
`isolation: isolate` num ancestral pode mudar o Backdrop Root e portanto o que
o `backdrop-filter` do `.wrap` enxerga. A conferência é foto antes e foto
depois do mesmo slide, comparadas pixel a pixel. Se mudar, o plano B é
renumerar sem isolar e provar, medindo, que nenhum elemento de fora do grupo
trocou de ordem.

### A numeração

Função pura, testável sem DOM:

```ts
reordenarZ(atuais: number[], de: number, para: number): number[]
```

Regra: preserva o conjunto de valores que o template já usava, permutado pela
nova ordem. Havendo empate (todos `auto`, que lê 0), expande para uma escala
contígua decrescente a partir do maior valor do grupo. `definirZ`
(`motor.ts:1729`) já remove o inline quando o CSS entrega o valor sozinho,
então o HTML salvo não incha.

### O que isso conserta

O texto não anda mais no eixo Y. Nunca, em nível nenhum.

**Efeito colateral honesto:** para os filhos de `.wrap`, que não se
sobrepõem, mudar o empilhamento passa a não ter efeito visível. Isso é
correto, e é por isso que a fase 2 existe: quem quer mover o texto na página
quer soltar ele da caixa, não trocar a camada dele.

---

## Fase 2: uma primitiva, três ações

O `.wrap` é pele, caixa e pai. As três operações abaixo atacam uma parte cada,
e as três nascem do mesmo lugar: o painel de propriedades do elemento
selecionado, não a lista de camadas. Pele de contêiner é PROPRIEDADE do
contêiner, não uma camada separada.

### 2.1 Limpar o fundo

Zera `background`, `border`, `backdrop-filter` e `box-shadow` do contêiner.
Layout intacto, filhos intactos. Marca `data-ed-sem-fundo="1"`, e o mesmo botão
desfaz removendo as propriedades inline.

O botão só aparece quando o selecionado **tem mesmo** pele visível (fundo, fio,
blur ou sombra computados). Botão que às vezes não faz nada é pior que botão
nenhum.

**É este o conserto direto do que o Jesse pediu.** É a operação de menor risco
das três: não toca em uma linha de layout.

### 2.2 Soltar do contêiner (a primitiva)

```ts
soltarNoSlide(el: HTMLElement): void
```

1. Mede o retângulo do elemento em relação ao `.slide`, ANTES de mexer.
2. Move o nó para o `.slide`.
3. Aplica `position: absolute` com `left`, `top` e `width` da medição.
4. Dá a ele um `z-index` no topo do grupo.

O elemento fica exatamente onde estava na tela, agora como camada
independente: arrastável, redimensionável, apagável sozinha. É o "controle
total" que o Jesse pediu.

**Trade-off declarado:** o texto sai do fluxo flex e passa a ter posição
congelada. Ganha controle manual, perde o rearranjo automático da coluna. Para
uma peça de carrossel, que é tela de tamanho fixo, é a troca certa. Para o site
não, e é por isso que esta primitiva **não existe no `motorSite`**.

### 2.3 Desagrupar

`soltarNoSlide` em cada filho, na ordem de empilhamento, e depois remove o
contêiner vazio. A caixa some, o blur some, e os textos ficam onde estavam.

### E o excluir?

`excluirSelecionado` ganha um aviso quando o alvo tem filhos com conteúdo:
diz quantos elementos vão junto e oferece "Desagrupar" como saída. Hoje ele
apaga em silêncio, que foi o que o Jesse encontrou.

---

## Fase 3: arrastar em vez de setas

### O contrato novo do painel

```ts
export interface PropsPainelCamadas {
  itens: ItemCamada[];
  modo: ModoCamadas;
  selecionadoId: string | null;
  aoSelecionar: (id: string) => void;
  aoReordenar: (id: string, destino: Destino) => void;
}
export interface Destino {
  // Contêiner de destino: null é a raiz da página.
  paiId: string | null;
  // Posição dentro do pai, contada de cima (o mais alto no empilhamento).
  indice: number;
}
```

`aoMover` sai. Os dois motores implementam `reordenarCamada(id, destino)`:
o do carrossel escreve `z-index` e, quando `paiId` muda, chama
`soltarNoSlide`; o do site continua reordenando o DOM, que é o certo lá.

### O gesto

Alça de arrasto na borda do cartão, a grade de pontinhos, com `cursor: grab`.
Pointer Events, não HTML5 drag-and-drop: o nativo não funciona em toque e não
dá controle sobre o marcador de destino.

Enquanto arrasta: uma linha fina marca onde vai cair, e soltar EM CIMA de um
contêiner entra nele.

### Acessibilidade, que é onde as setas ainda tinham razão

Arrasto não existe pro teclado. A alça é focável e, no Espaço ou Enter, entra
em modo de mover: as setas do teclado movem o item, Enter confirma, Esc
cancela. É o padrão acessível de lista reordenável, e ele preserva o que as
setas faziam sem gastar espaço com dois controles.

### O limite de dois níveis

`listarCamadas` mostra dois níveis. Um destino que criaria um terceiro nível
é recusado durante o arrasto, com o marcador em estado inválido em vez de
aceitar e sumir da lista.

---

## Provas

- **Unitário:** `reordenarZ` é função pura, testada sem DOM (permutação,
  empate, borda).
- **No navegador, contra o carrossel real:** medir o retângulo de cada texto do
  slide 2 antes e depois de reordenar. **`top` e `left` idênticos** é a
  condição de aceite do que o Jesse relatou. Só a ordem de pintura muda.
- **Foto pixel a pixel** do slide antes e depois de isolar o pai, pra fechar o
  risco do `backdrop-filter`.
- **Desagrupar:** medir os quatro textos antes e depois. Mesmos retângulos,
  contêiner fora do DOM, nenhum texto perdido.
- **O site não regride:** reordenar seção continua trocando a ordem na página.
- Portão do projeto inteiro em cada fase.
