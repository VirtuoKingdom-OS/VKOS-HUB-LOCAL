# Ajuste fino das telas

Contrato único da passada de ajuste fino de 2026-07-27. Toda tela obedece a
isto. Quem for mexer numa folha de estilo lê este arquivo antes.

O pedido do Jesse foi: "está tudo extremamente carregado e não estou conseguindo
enxergar hierarquia visual correta na UI o que está comprometendo a UX também.
os poucos níveis de profundidade estão deixando um contraste alto e interfaces
sobrecarregadas".

Ele está certo, e dá pra medir.

## O diagnóstico, medido em 2026-07-27

Varredura em `app/web/src`, 21 folhas de estilo:

| sintoma | ocorrências |
| --- | --- |
| `box-shadow` cru, fora dos 3 tokens de sombra | 66 |
| `font-weight: 700` | 203 |
| `text-transform: uppercase` | 36, em 14 folhas |
| borda `dashed` | 11 |

Nenhuma dessas regras é nova. Todas já estavam no `CLAUDE.md` e no
`05-design-system.md`. As telas é que nunca foram passadas a limpo depois que a
identidade Clara entrou. Esta rodada é a limpeza, não uma direção nova.

A referência do que é "certo" já existe na tela: o cartão de workspace e os
blocos do Dashboard, refeitos nesta mesma data. Quando estiver em dúvida sobre
peso ou espaço, abra `componentes/core/core.css` e copie a gramática de lá.

## As oito regras

### 1. Sombra não empilha, superfície empilha

A profundidade sai da escada de quatro degraus: `--fundo`, `--superficie`,
`--superficie-alta`, `--superficie-flutuante`, mais o fio de `--linha`.

Sombra existe só onde o elemento flutua DE VERDADE sobre outro conteúdo, e são
três tokens, nenhum a mais: `--sombra-popover`, `--sombra-modal` e
`--sombra-arrasto`.

Cartão parado no fluxo da página NÃO tem sombra. Item de lista não tem sombra.
Cabeçalho não tem sombra. Se o elemento precisa se destacar do fundo, ele sobe
um degrau de superfície e ganha um fio, não uma sombra.

Exceção única: `box-shadow: inset` usado como fio (borda que não ocupa caixa)
continua valendo, porque é fio e não profundidade.

### 2. Caixa alta só para rótulo de grupo de navegação

`text-transform: uppercase` é autorizado em UM lugar: o rótulo que agrupa itens
na barra lateral (CORE, GESTÃO, SISTEMA), que tem regra própria e decisão
própria em `2026-07-27-o-rotulo-de-grupo-recua.md`.

Em qualquer outro lugar, caixa alta vira frase normal. Rótulo de campo de
formulário, título de seção dentro de painel, nome de coluna e etiqueta de dado
se escrevem como se escreve: "Token de API", não "TOKEN DE API".

Motivo: caixa alta adensa a mancha e grita. Numa tela com seis rótulos assim, o
olho não acha o que importa porque tudo tem o mesmo volume.

### 3. Peso 700 é para número e wordmark, não para texto

Título pesa 500, com tracking negativo. Título de cartão e nome pequeno pesam
600. Número e wordmark podem pesar 700, porque ênfase de dado não é título.

Texto corrido, rótulo, item de menu e descrição nunca passam de 500.

### 4. Estado vazio não usa borda tracejada

Tracejado lê como área de arrastar arquivo ou como placeholder de construção.
Estado vazio é conteúdo legítimo: usa superfície e fio normais, ou nada.

### 5. Um dado forte por bloco

Este é o erro que o Jesse nomeou primeiro, no cartão de workspace: "você colocou
3 informações do mesmo jeito".

Dentro de um bloco, um dado manda e os outros são subordinados a ele. Três pares
de rótulo e valor com o mesmo tamanho, o mesmo peso e a mesma cor não formam
hierarquia, formam uma tabela sem cabeçalho.

O desenho que funcionou, e que é a referência: um dado principal forte, uma
sublinha fraca que concatena o contexto em frase, e no máximo um valor isolado
com tratamento de número.

### 6. Subtítulo não repete o título

Se o título já diz, o subtítulo cala. Linha que só reformula a de cima é ruído
com custo de altura.

### 7. Ícone de alerta só para o que é alerta

Aviso tranquilizador, dica e nota de rodapé não usam o triângulo. Quando tudo é
alerta, nada é. Informação neutra é texto, e se precisar de marca visual, usa a
marca discreta e neutra.

Dois avisos empilhados com o mesmo peso viram um bloco só de ruído: se os dois
são mesmo necessários, um deles é subordinado ao outro e mostra isso.

### 8. Alvo clicável se anuncia parado

Regra que já valia e continua valendo: linha ou cartão que abre alguma coisa
nasce com superfície e fio próprios. O hover reforça, nunca revela.

## O que esta rodada NÃO faz

- **Não muda navegação, rota, nem fluxo.** O pedido foi explícito: "sem
  comprometer nosso fluxo (arquitetura)". Nenhuma tela ganha ou perde passo,
  nenhum botão muda de lugar na jornada.
- **Não remove informação.** Minimalismo aqui é tirar ruído, não tirar dado. O
  Hub é ferramenta de trabalho pesado. Estado de carregamento, de erro e de
  ressalva continuam todos na tela.
- **Não mexe em `estilos/global.css` nem em `estilos/visual-hub.css`.** As
  escalas e os valores de token por tema estão fechados e travados por teste.
  Quem precisar de algo compartilhado que não existe, para e pede.

  > **Fechado em 2026-07-27, na última etapa da rodada.** Esta regra existia para
  > os sete agentes que passaram pelas telas em paralelo não colidirem nos dois
  > arquivos compartilhados. Todos os sete pediram a mesma coisa: a camada `tema`
  > vence a camada `tela` por ordem de camada, então boa parte do trabalho deles
  > estava escrito e morto. Uma etapa final, sozinha no repositório, passou os
  > dois arquivos a limpo. A camada `tema` agora declara cor e só cor, e as
  > quatro regras mensuráveis deste contrato têm trava em
  > `estilos/densidade.test.ts`. Ver
  > `docs/decisoes/2026-07-27-a-camada-de-tema-so-declara-cor.md`.
- **Não introduz cor literal.** Toda cor passa por token, e a tela funciona nos
  dois temas.

## Como conferir

O portão de sempre, mais os olhos:

```
npm run checar -w web
npm run testar -w web
npm run build -w web
```

Depois `ferramentas/olhar-telas.mjs`, e ABRIR as fotos das telas mexidas, nos
dois temas. Alvo clicável abaixo de 24px reprova. Erro ou alerta de console
reprova.
