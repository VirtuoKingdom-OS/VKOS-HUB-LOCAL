---
name: atualizar
description: >
  Reconcilia os arquivos de contexto do VKOS (o Cérebro, o guia de estilo, os LEIA das pastas e o
  mapa de comandos, tudo que o sistema lê antes de agir) com o estado real do repositório. Faz
  duas coisas: atualiza o que mudou e enxuga o que virou peso morto (referência pra coisa que não
  existe mais, dado velho, informação repetida). Um contexto fiel e enxuto deixa o sistema
  trabalhar com a verdade e gastar menos leitura em cada comando. Use quando o comprador disser
  /atualizar, "reconcilia meu sistema", "coloca meu VKOS em dia", "mudou coisa aqui e quero
  refletir", ou depois de um tempo sem mexer no sistema.
---

# /atualizar: Coloca o contexto em dia e enxuto

O VKOS lê alguns arquivos toda vez que você usa um comando: o Cérebro (`cerebro/cerebro.md`), o
guia de estilo (`identidade/design-guide.md`), a estratégia em `marca/`, os `LEIA.md` das pastas e
o mapa de comandos. Esse é o **contexto** do sistema, a memória que ele consulta antes de gerar
qualquer coisa.

Com o tempo esse contexto desafina da realidade de dois jeitos, e os dois custam caro:

1. **Fica desatualizado.** O dono jogou um depoimento novo, o preço mudou, o estilo das peças
   recentes virou outro, apareceu um posicionamento que o Cérebro ainda não reflete. Aí o sistema
   gera em cima de informação velha.
2. **Fica inchado.** Sobra referência pra comando ou arquivo que não existe mais, o mesmo dado
   aparece repetido em dois lugares, uma lista antiga não bate mais. Como esse contexto é lido a
   **cada comando**, todo peso morto é leitura desperdiçada: o sistema fica mais lento e mais caro
   pra você, e ainda corre o risco de se confundir com a informação errada.

O `/atualizar` faz a faxina do contexto. Ele compara o que o sistema guarda com o que a realidade
do repositório mostra, **atualiza o que mudou** e **enxuga o que sobrou**, pra deixar o sistema
fiel e leve. Você não muda nada sem ver antes e aprovar.

## Antes

Leia `cerebro/cerebro.md`. Se estiver em branco (só com marcadores `✍️ [...]`), não há o que
reconciliar ainda. Diga que o Cérebro nem foi montado e chame o `/instalar`. O `/atualizar` só faz
sentido quando já existe um sistema de pé pra manter em dia.

## Passo 1: Levantamento (o que a realidade mostra)

Faça um retrato rápido do estado atual do repositório. Não julgue nada ainda, só levante:

- **Os arquivos de contexto** (os que o sistema lê toda vez). Passe o olho no tamanho e no estado
  de `cerebro/cerebro.md`, `identidade/design-guide.md`, os arquivos de `marca/` e os `LEIA.md` das
  pastas. Repare no que parece longo demais, repetido ou fora de data.
- **Peças recentes.** Liste as subpastas mais novas de `conteudo/` (as `AAAA-MM-DD-tema-curto/`)
  pelas datas. Olhe as últimas geradas pra sentir o que o negócio andou produzindo.
- **Estratégia.** Veja o que existe em `marca/`. Tem `posicionamento.md` (de `/posicionamento`)?
  Tem `ikigai.md` (de `/ikigai`)? Leia o conteúdo deles.
- **Insumos crus.** Veja o que o dono jogou em `materiais/`: textos, fotos, depoimentos, prints,
  tabelas de preço. Repare no que é novo (datas dos arquivos) e no que pode ainda não estar
  refletido no Cérebro.
- **Identidade.** Abra `identidade/design-guide.md` (o estilo travado) e conte quantas imagens de
  referência existem em `identidade/inspiracoes/`.
- **Comandos.** Liste as skills que existem hoje em `.claude/skills/`.

No fim, diga em uma frase o que encontrou (ex: *"Você tem 6 peças recentes, um posicionamento em
`marca/`, 2 depoimentos novos em `materiais/` e 4 inspirações de estilo"*). Não é relatório longo,
é um retrato.

## Passo 2: Comparação (achar a defasagem E o peso morto)

Agora compare o contexto que o sistema guarda com o que a realidade mostra. São dois tipos de
descompasso pra caçar.

### a) O que mudou (atualizar)

- **Cérebro vs. realidade.** Passe pelos 13 blocos de `cerebro/cerebro.md` e cruze com o
  levantamento:
  - Bloco 9 (Provas): apareceu **depoimento ou resultado novo** em `materiais/` que o Cérebro
    ainda não lista? É a defasagem mais comum.
  - Bloco 2 (Oferta) e outros que citam preço/serviço: os **preços ou serviços** nos materiais
    batem com o que o Cérebro diz? Tabela nova pode ter mudado.
  - Blocos 8/10/11 (Voz, Pilares, Termos): os temas das peças recentes de `conteudo/` ainda
    refletem os pilares do Cérebro, ou o negócio andou falando de coisa que nem está listada?
- **Guia de estilo vs. peças recentes.** As peças recentes seguem o que o `design-guide.md` manda
  (cores, tom visual)? Se o dono vem gerando num estilo diferente do travado, um dos dois ficou pra
  trás.
- **Estratégia vs. Cérebro.** Existe `marca/posicionamento.md` ou `marca/ikigai.md` com um ângulo,
  público ou oferta que o Cérebro ainda **não** absorveu? Se `/posicionamento` achou um ângulo
  único e o Cérebro não menciona, é defasagem.

### b) O que sobrou (enxugar)

Este é o lado que mais economiza leitura em cada comando. Procure:

- **Referência morta.** Algum arquivo de contexto cita comando, arquivo ou pasta que **não existe
  mais**? (ex: um `LEIA.md` listando um tipo de peça que o sistema não gera mais, o Cérebro
  apontando um material que foi apagado, o mapa citando um comando removido). Isso engana o sistema
  e ocupa leitura à toa.
- **Informação repetida.** O mesmo dado em dois arquivos de contexto (ex: cor da marca no bloco 13
  do Cérebro **e** no `design-guide.md`). Repetido, pode divergir e dobra o que o sistema lê.
  Escolha uma **fonte da verdade** e deixe o outro só apontando pra ela, em vez de copiar.
- **Dado velho.** Contagem, lista, preço ou oferta escrito num arquivo de contexto que não bate
  mais com a realidade do repositório.

Anote cada item, dos dois tipos, com a **evidência**: qual arquivo mostra o quê. Só entra na lista
o que tem prova no repositório. Nada de achismo.

## Passo 3: Proposta (a lista curta pra ele decidir)

Se **não achou nada**, responda simples: *"Tá tudo coerente e enxuto, nada pra atualizar."* E
encerre.

Se achou, monte uma lista curta e numerada, marcando cada item como **atualizar** ou **enxugar**,
sempre com a evidência entre parênteses. Formato:

```
Encontrei 4 coisas pra ajustar:

1. [atualizar] cerebro/cerebro.md (bloco 9 Provas): tem um depoimento novo que ainda não está no
   Cérebro (materiais/depoimento-maria.txt, de 12/06).
2. [atualizar] cerebro/cerebro.md (bloco 2 Oferta): o preço mudou de R$ 150 pra R$ 180
   (materiais/tabela-precos.pdf, mais nova que o Cérebro).
3. [enxugar] identidade/design-guide.md: as cores estão repetidas no bloco 13 do Cérebro também.
   Sugiro deixar o design-guide como fonte e o bloco 13 só apontando, pra não divergir.
4. [enxugar] conteudo/LEIA.md: cita um tipo de peça que o sistema não gera mais (referência morta).

Quer que eu aplique todas, algumas (me diga os números) ou nenhuma?
```

- Uma linha por item: **tipo, arquivo, o que muda (evidência)**.
- Curto. Se achou 8 coisas, mostre as 8, mas cada uma em uma linha.
- Termine sempre com a pergunta: **todas, algumas ou nenhuma?** Espere ele escolher.
- Se algum item for ambíguo (não dá pra saber qual lado está certo, se o Cérebro atualiza a peça ou
  a peça atualiza o Cérebro; se aquilo é peso morto ou informação válida), **pergunte** antes de
  propor. Não decida sozinho.

## Passo 4: Aplicação (cirúrgica, com antes/depois)

Só aplique os itens que ele aprovou. Para cada um:

- **Edite só a linha ou o bloco relevante.** Nada de reescrever o arquivo inteiro. Se é o bloco 9 do
  Cérebro, mexe no bloco 9 e mais nada.
- **Ao atualizar, nunca apague conteúdo bom.** Depoimento novo se **soma** aos que já existem, não
  substitui. Preço que mudou se corrige na linha certa, o resto do bloco fica.
- **Ao enxugar, tire só o peso morto.** Peso morto é referência quebrada, duplicação e dado velho,
  **nunca** prova real, oferta ou informação viva do negócio. Removeu uma referência morta ou
  juntou uma duplicação? Mostra o antes/depois igual. Na dúvida se é lixo ou conteúdo válido, não
  remova: pergunte.
- **Mostre o antes/depois** de cada mudança, curtinho, pra ele conferir:

```
cerebro/cerebro.md, bloco 9 (Provas)
antes:  "Mais de 200 clientes atendidos desde 2019."
depois: "Mais de 200 clientes atendidos desde 2019. 'Melhor corte que já fiz', Maria, cliente há 2 anos."
```

- Ao terminar, feche apontando o efeito: *"Pronto, seu VKOS está em dia e mais enxuto. Daqui pra
  frente todo comando lê um contexto certo e leve. Quer que eu refaça alguma peça recente com a
  informação nova?"*

## Princípios

1. **Só o que tem evidência.** Toda proposta aponta um arquivo real. Nada de inventar defasagem nem
   peso morto.
2. **Cirúrgico e conservador.** Mexe só na linha/bloco que mudou, nunca apaga o que estava bom.
3. **Enxuto é mais certo e mais barato.** O contexto é lido em todo comando. Cada linha morta,
   repetida ou velha gasta leitura e confunde o sistema. Manter curto e fiel deixa o VKOS rodando
   leve. Essa é a razão de existir do comando, não um bônus.
4. **Uma fonte da verdade por informação.** Dado que vive em dois arquivos vira divergência. Escolha
   onde ele mora e deixe o resto apontando.
5. **Quem decide é o dono.** Você propõe e espera o "todas/algumas/nenhuma". Ambíguo? Pergunte.
6. **Silêncio quando está tudo certo.** Se nada mudou e nada sobra, diga que está coerente e enxuto,
   e pare. Sem inventar trabalho.
