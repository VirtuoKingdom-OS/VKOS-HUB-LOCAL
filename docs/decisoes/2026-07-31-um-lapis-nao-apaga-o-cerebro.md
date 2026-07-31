# Um lápis não apaga o Cérebro inteiro

## Contexto

O Jesse terminou a entrevista no workspace da Mãe Pixel e o Hub continuou
dizendo **"Ainda em branco"** no nó do Cérebro.

O Cérebro estava escrito: 12 KB, os 13 blocos com conteúdo de verdade. O que
derrubava tudo era uma linha, dentro do bloco 12:

```
- **Hub central (link único):** ✍️ [a definir]
```

A heurística era `!conteudo.includes("✍️")`. Um único marcador em qualquer
lugar do arquivo respondia "nem começou".

## O defeito era de contrato, não de digitação

O que torna isto grave não é o falso negativo, é a origem dele: **quem escreve
e quem lê discordavam.**

A skill `/instalar` manda, com todas as letras: *"Se ele não souber responder
algo, tudo bem: ofereça um exemplo do ramo dele pra destravar, ou marque como
'a definir' e siga. Não trave a instalação num campo só."*

Ou seja, o produtor do arquivo produz de propósito exatamente o padrão que o
leitor tratava como arquivo vazio. Não é um caso de borda, é o caminho normal
de qualquer negócio que ainda não tem um link, um preço ou um perfil.

E a consequência passava do rótulo: `cerebroPreenchido` também é o portão das
skills que exigem identidade (`carrossel`, `site`). A pessoa fazia a entrevista
inteira e continuava trancada fora da geração.

## Decisão

**O Cérebro está preenchido quando nenhum bloco dele está vazio.**

Um bloco é um trecho `## `. Ele está vazio quando não sobra nenhuma linha além
de título, separador (`---`), linha em branco e linhas que carregam o marcador.

Um bloco com parágrafo, lista e um detalhe pendente é um bloco respondido com
um detalhe pendente. Um bloco que só tem o lápis é um bloco que a entrevista
não cobriu, e esse continua segurando o Cérebro.

Três decisões menores que vêm junto:

- **Linha que carrega o marcador não conta como conteúdo, mesmo com rótulo do
  lado.** `- **Hub central:** ✍️ [a definir]` é um campo em aberto, não uma
  resposta. Isso deixa a regra conservadora na direção segura: na dúvida ela
  diz que falta, e nunca libera geração em cima de identidade vazia.
- **O preâmbulo não é bloco.** O que vem antes do primeiro `## `, debaixo do
  H1, é área de título, e num Cérebro preenchido de verdade costuma estar
  vazio.
- **Cérebro sem nenhum `## ` cai na regra antiga.** Sem bloco não há o que
  medir, e aí a ausência de marcador volta a ser o único sinal disponível.

## Um defeito que já estava lá

Escrever o teste expôs outro: `cerebroPreenchido("")` respondia **verdadeiro**,
porque string vazia não contém o marcador. Não aparecia porque `lerCerebro`
trata o arquivo ausente antes de chegar na função, mas um arquivo que existe e
está vazio, de uma gravação truncada, passava por Cérebro pronto. Conteúdo
vazio agora nunca conta como preenchido.

## Conferido

`vkos/cerebro.test.ts`, sete casos, entre eles o da Mãe Pixel reproduzido
inteiro. E a regra nova rodada contra os cinco `cerebro.md` que existem no
disco, comparando com a antiga:

| arquivo | lápis | antiga | nova |
| --- | --- | --- | --- |
| workspaces/mae-pixel | 1 | não | **sim** |
| workspaces/jdv (template em branco) | 14 | não | não |
| vkos | 0 | sim | sim |
| estudio-aura | 0 | sim | sim |
| ojessegomes | 0 | sim | sim |

Só o caso relatado muda. Nenhum Cérebro em branco passou a contar como pronto.

Na tela, o nó do Cérebro da Mãe Pixel voltou a dizer **"Identidade
carregada"**.

## Por quê

A lição não é sobre o lápis: **heurística de "está pronto?" tem que ser lida
junto com quem escreve o arquivo.** Esta era uma regra de leitura escrita sem
olhar a instrução de escrita, e as duas moram em repositórios diferentes (a
skill vive no VKOS, o leitor no Hub), que é exatamente o tipo de distância em
que um contrato se desalinha em silêncio.
