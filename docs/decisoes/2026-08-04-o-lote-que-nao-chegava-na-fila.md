# O lote que não chegava na fila

Data: 2026-08-04

## Contexto

Primeira conversa real na tela do Assistente. O assistente respondeu "criei o
lote.json", e do lado a fila continuou vazia. Nenhuma tarefa, nenhuma linha no
rastro, nenhum erro na tela.

O `lote.json` estava lá, no disco, com duas tarefas de carrossel bem escritas.
O que ele tinha dentro de `dados` era isto:

```json
{ "tema": "O que é Gamiologia", "briefing": "Carrossel explicativo sobre..." }
```

E o que o schema exigia eram catorze campos: `tema`, `detalhes`, `paginas`,
`estilo`, `estiloCapa`, `estiloPaginas`, `formato`, `proporcao`, `modoImagem`,
`origemImagem`, `caminhosImagens`, `visual`, `aprimorarComIA`. A validação
recusou com 22 problemas, e a exceção morreu num `catch` vazio.

Três defeitos, em camadas.

**1. O contrato do lote não listava campo nenhum.** O texto dizia "dados deve
seguir exatamente os campos do tipo escolhido" e parava aí. A única linha que
tentava derivar do schema era esta:

```ts
`O contrato de estado do servidor é: ${Object.keys(TarefaSchema.shape ?? {}).join(", ")}.`
```

`TarefaSchema` é uma interseção (`.and()`), e interseção não tem `.shape`. O
`?? {}` transformava isso em lista vazia, e a frase chegava na IA como "O
contrato de estado do servidor é: .". O teste da época passava porque afirmava
uma lista de chaves escrita à mão, e não o que o schema realmente exige. É
exatamente o teste que a regra da casa proíbe: ele passaria com a injeção
apagada.

**2. O schema pedia da IA o que só o dono sabe.** Os catorze campos existem
porque a criação guiada os colhe em cinco etapas, com o dono escolhendo
proporção, estilo de capa, modo de imagem e paleta. Numa conversa de texto o
assistente não tem nada disso. Exigir os catorze é exigir que ele invente doze.

**3. A recusa era muda.** Três chamadas sincronizam o rascunho, e as três
engoliam a exceção. Só o endpoint explícito de sincronização devolvia o motivo,
e a tela nunca o chamava.

## Decisão

**Entrada e dados completos passam a ser duas formas diferentes.**
`assistente/entrada.ts` declara o que o assistente escreve: para um carrossel,
`tema` e `detalhes` obrigatórios, e cinco opcionais que ele só manda quando o
dono falou deles na conversa. O servidor completa o resto com os MESMOS valores
iniciais da criação guiada, reunidos em `PADRAO_CARROSSEL` e `PADRAO_SITE`.

**Anúncio não ganha padrão** para oferta, destino, praça e orçamento por dia:
são justamente as quatro perguntas que a criação guiada faz porque o Cérebro
não as responde. Um padrão ali seria o Hub inventando para onde vai o clique e
quanto o dono pode gastar.

**Os schemas de entrada são fechados** (`.strict()`). Nome inventado reprova
dizendo o nome inventado. Sem isso, o Zod descartaria `briefing` em silêncio e
reclamaria de "detalhes obrigatório", e a IA leria "faltou um campo" em vez de
"você chamou detalhes de briefing".

**O contrato do prompt é gerado a partir dos schemas**, campo a campo, com os
valores aceitos de cada enum escritos por extenso e o padrão do Hub dito por
extenso em cada opcional. Ele leva junto um exemplo de lote válido, gerado e
conferido contra o próprio schema na hora de montar o prompt.

**A recusa aparece na tela.** A conversa passa a guardar `erroLote` com o texto
literal, e a tela mostra uma faixa acima do campo com um botão "Pedir correção"
que devolve o erro cru para a IA que escreveu o arquivo.

**`tarefa.ts` parou de redeclarar os dados da geração** e passou a importar de
`geracao/modelo.ts`. Eram duas cópias do mesmo contrato: o executor monta o
prompt com o modelo de lá, então quem manda na forma real é aquele arquivo, e
este aqui aprovaria ou reprovaria a coisa errada no primeiro campo novo.

## Por quê

O erro de fundo é um só, e ele vale além desta tela: **o contrato existia no
código e não existia no texto que a IA lia**. Schema não ensina ninguém. Se o
prompt não escreve o campo, a IA inventa um nome plausível, e `briefing` é um
nome plausível para o campo que se chama `detalhes`.

Sobre a falha muda: numa tela que promete execução, falha silenciosa é pior que
falha barulhenta, porque parece que funcionou. O dono leu "criei o lote.json" e
não tinha como saber que o Hub tinha recusado o arquivo. Nenhuma camada pode
escolher esconder isso; ela pode, no máximo, escolher não derrubar a resposta
por causa disso.

## Como ficou provado

Num Hub isolado, com `VKOS_DADOS_TESTE` e `VKOS_PORT`, montado com a sessão e o
`lote.json` reais daquela conversa:

- O arquivo original, com `briefing`, continua recusado, e agora o motivo chega
  na tela nomeando o campo inventado.
- O mesmo conteúdo escrito no contrato novo entra: duas tarefas em proposta, no
  workspace `w-ms3li5tp9mu`, com `paginas` 8 na primeira, `null` na segunda, e
  `proporcao` `4x5` nas duas, vinda do padrão do Hub. O rastro registrou
  `lote:proposto` com quantidade 2, e o `erroLote` da conversa foi limpo.

Trinta e três testes novos, entre `entrada.test.ts`, `lote.test.ts` e
`prompt.test.ts`. O que teria pego este defeito é o de `prompt.test.ts`, que
percorre as chaves dos schemas de entrada e reprova se alguma não aparecer no
texto do contrato.

**Nada disto substitui a medição da Fase 5**, que continua devendo: seis provas
com IA real, em disco, e não por relato.
