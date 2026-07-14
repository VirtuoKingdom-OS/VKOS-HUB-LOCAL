---
name: atualizar
description: >
  Reconcilia os arquivos de contexto do desenvolvimento do VKOS Hub (visao, arquitetura, roadmap,
  ecossistema, as decisoes, o CLAUDE.md, o CONTRATO.md e a memoria, tudo que a sessao le antes de
  agir) com o estado real do codigo em app/. Faz duas coisas: atualiza o que mudou e enxuga o que
  virou peso morto (referencia pra coisa que nao existe mais, dado velho, informacao repetida). Um
  contexto fiel e enxuto deixa cada sessao trabalhar com a verdade e gastar menos leitura, menos
  token, menos custo. Use quando o Jesse disser /atualizar, "coloca o contexto em dia", "reconcilia
  o projeto", "reflete o que mudou", ou depois de uma rodada grande de codigo.
---

# /atualizar, coloca o contexto do desenvolvimento em dia e enxuto

Toda sessao aqui le alguns arquivos antes de agir, definido no `CLAUDE.md`: `contexto/visao.md`,
`contexto/arquitetura.md`, `contexto/roadmap.md` (e `contexto/ecossistema.md` quando a tarefa toca o
produto), a pasta `decisoes/`, o proprio `CLAUDE.md`, o `MEMORY.md` da memoria e o
`app/CONTRATO.md`. Esse e o **contexto** do desenvolvimento, a memoria que a sessao consulta antes
de escrever qualquer linha.

Com o tempo esse contexto desafina da realidade do codigo de dois jeitos, e os dois custam caro:

1. **Fica desatualizado.** Uma fase do roadmap fechou mas continua marcada como pendente, a
   arquitetura mudou e o `arquitetura.md` ainda descreve o desenho antigo, uma decisao foi tomada no
   chat com o Jesse e nunca virou arquivo em `decisoes/`. Ai a proxima sessao trabalha em cima de
   informacao velha e refaz discussao ja fechada.
2. **Fica inchado.** Sobra referencia a modulo ou fluxo que foi removido (o terminal, por exemplo), o
   mesmo fato aparece repetido em dois arquivos de contexto, uma lista antiga nao bate mais com o
   codigo. Como esse contexto e lido a **cada sessao**, todo peso morto e leitura desperdicada: gasta
   token, custa dinheiro e ainda corre o risco de confundir a sessao com informacao errada.

O `/atualizar` faz a faxina do contexto. Ele compara o que os arquivos guardam com o que o codigo
real mostra, **atualiza o que mudou** e **enxuga o que sobrou**, pra deixar o desenvolvimento fiel e
leve. Nao muda nada sem o Jesse ver antes e aprovar.

## Antes

Leia `contexto/roadmap.md`, `contexto/arquitetura.md` e `contexto/visao.md`. Se a pasta `contexto/`
estiver vazia ou o projeto ainda nao tiver codigo em `app/`, nao ha o que reconciliar. Diga isso e
pare. O `/atualizar` so faz sentido quando ja existe desenvolvimento de pe pra manter em dia.

## Passo 1, levantamento (o que o codigo mostra)

Faca um retrato rapido do estado real do repositorio. Nao julgue nada ainda, so levante:

- **Os arquivos de contexto** (os que a sessao le toda vez). Passe o olho no tamanho e no estado de
  `contexto/visao.md`, `contexto/arquitetura.md`, `contexto/roadmap.md`, `contexto/ecossistema.md`,
  do `CLAUDE.md` e do `app/CONTRATO.md`. Repare no que parece longo demais, repetido ou fora de data.
- **O codigo recente.** Olhe o que mudou de fato em `app/`: telas novas em `app/web/src/`, modulos
  novos em `app/server/src/`, o que o `CONTRATO.md` registra nas ultimas rodadas. Sinta o que o
  desenvolvimento andou produzindo.
- **As decisoes.** Liste `decisoes/` pelas datas. Veja se as ultimas decisoes ja estao refletidas no
  roadmap e na arquitetura, ou se ficaram soltas.
- **A memoria.** Leia o `MEMORY.md` e repare se algum aprendizado registrado ja virou codigo (ou
  virou obsoleto). Memoria que aponta pra arquivo, flag ou fluxo que nao existe mais e peso morto.
- **As fases.** Cruze cada fase do `roadmap.md` com o codigo: o que esta marcado "em execucao" ja
  fechou? O que esta marcado "entregue" continua de pe no codigo?

No fim, diga em uma frase o que encontrou (ex: *"A fase 1 ja fechou no codigo mas o roadmap ainda diz
'em execucao', tem 2 decisoes de 14/07 nao refletidas na arquitetura, e o CONTRATO cita o terminal
que foi removido"*). Nao e relatorio longo, e um retrato.

## Passo 2, comparacao (achar a defasagem E o peso morto)

Agora compare o contexto que os arquivos guardam com o que o codigo mostra. Sao dois tipos de
descompasso pra cacar.

### a) O que mudou (atualizar)

- **Roadmap vs. codigo.** Alguma fase marcada "em execucao" ja fechou no codigo? Alguma fase
  "entregue" mudou de forma e a descricao ficou pra tras? Fase que fechou de verdade atualiza a linha
  certa, com a data.
- **Arquitetura vs. codigo.** O `arquitetura.md` descreve um desenho que o codigo ja nao segue?
  Modulo novo no server, tela nova no web, um fluxo que mudou de mecanica? Se o codigo virou e o
  documento nao, e defasagem.
- **Decisoes vs. contexto.** Foi tomada uma decisao com o Jesse (no chat ou numa rodada) que ainda
  nao virou arquivo em `decisoes/`, ou virou arquivo mas o roadmap e a arquitetura nao absorveram?
  Decisao registrada que o contexto ignora e defasagem.
- **CLAUDE.md vs. realidade.** As instrucoes do `CLAUDE.md` (temas, fluxos, regras, nome do projeto)
  ainda batem com o que o codigo faz? Se o app mudou e a instrucao ficou velha, atualiza.

### b) O que sobrou (enxugar)

Este e o lado que mais economiza token em cada sessao. Procure:

- **Referencia morta.** Algum arquivo de contexto cita fluxo, modulo, tela ou arquivo que **nao
  existe mais** no codigo? (ex: o CONTRATO ou a arquitetura ainda falando do terminal removido, uma
  memoria apontando pra um flag que sumiu, o roadmap citando uma pasta que nao existe). Isso engana a
  sessao e ocupa leitura a toa.
- **Informacao repetida.** O mesmo fato em dois arquivos de contexto (ex: a mesma decisao contada por
  extenso no roadmap **e** na arquitetura **e** no arquivo de `decisoes/`). Repetido, pode divergir e
  dobra o que a sessao le. Escolha uma **fonte da verdade** (o arquivo de `decisoes/` costuma ser a
  fonte da decisao) e deixe os outros so apontando pra ela, em vez de copiar.
- **Dado velho.** Contagem, lista, versao, porta, nome ou descricao escrito num arquivo de contexto
  que nao bate mais com o codigo.

Anote cada item, dos dois tipos, com a **evidencia**: qual arquivo mostra o que, qual trecho do
codigo prova. So entra na lista o que tem prova no repositorio. Nada de achismo.

## Passo 3, proposta (a lista curta pra ele decidir)

Se **nao achou nada**, responda simples: *"Ta tudo coerente e enxuto, nada pra atualizar."* E
encerre.

Se achou, monte uma lista curta e numerada, marcando cada item como **atualizar** ou **enxugar**,
sempre com a evidencia entre parenteses. Formato:

```
Encontrei 4 coisas pra ajustar:

1. [atualizar] contexto/roadmap.md (Fase 1): ja fechou no codigo, o terminal foi removido de app/
   e o menu so tem Carrossel e Site. A linha ainda diz "em execucao".
2. [atualizar] contexto/arquitetura.md: o server ganhou app/server/src/meta/ que o documento nao
   descreve (rodada 12).
3. [enxugar] app/CONTRATO.md: ainda cita o backend PTY do terminal, que nao existe mais (referencia
   morta).
4. [enxugar] contexto/roadmap.md + decisoes/2026-07-14-tres-temas.md: a decisao dos 3 temas esta
   contada inteira nos dois. Sugiro o roadmap so apontar pro arquivo de decisao, pra nao divergir.

Quer que eu aplique todas, algumas (me diga os numeros) ou nenhuma?
```

- Uma linha por item: **tipo, arquivo, o que muda (evidencia)**.
- Curto. Se achou 8 coisas, mostre as 8, mas cada uma em uma linha.
- Termine sempre com a pergunta: **todas, algumas ou nenhuma?** Espere ele escolher.
- Se algum item for ambiguo (nao da pra saber qual lado esta certo, se o documento atualiza o codigo
  ou o codigo atualiza o documento; se aquilo e peso morto ou informacao valida), **pergunte** antes
  de propor. Nao decida sozinho.

## Passo 4, aplicacao (cirurgica, com antes/depois)

So aplique os itens que ele aprovou. Para cada um:

- **Edite so a linha ou o bloco relevante.** Nada de reescrever o arquivo inteiro. Se e a Fase 1 do
  roadmap, mexe na Fase 1 e mais nada. Isso vale a regra do `CLAUDE.md`: editar o ponto que mudou,
  nao reescrever o arquivo.
- **Ao atualizar, nunca apague historico bom.** Uma fase que fechou continua registrando o que
  entregou, so muda o status e a data. Decisao antiga fica onde esta.
- **Ao enxugar, tire so o peso morto.** Peso morto e referencia quebrada, duplicacao e dado velho,
  **nunca** decisao real, historico de entrega ou instrucao viva. Removeu uma referencia morta ou
  juntou uma duplicacao? Mostra o antes/depois igual. Na duvida se e lixo ou conteudo valido, nao
  remova: pergunte.
- **Mostre o antes/depois** de cada mudanca, curtinho, pra ele conferir:

```
contexto/roadmap.md, Fase 1
antes:  "## Fase 1: enxugar (em execucao)"
depois: "## Fase 1: enxugar (entregue em 2026-07-14)"
```

- Ao terminar, feche apontando o efeito: *"Pronto, o contexto do desenvolvimento esta em dia e mais
  enxuto. Daqui pra frente toda sessao le a verdade e gasta menos token."*

## Principios

1. **So o que tem evidencia.** Toda proposta aponta um arquivo real e um trecho do codigo. Nada de
   inventar defasagem nem peso morto.
2. **Cirurgico e conservador.** Mexe so na linha/bloco que mudou, nunca apaga o historico bom.
3. **Enxuto e mais certo e mais barato.** O contexto e lido em toda sessao. Cada linha morta, repetida
   ou velha gasta token, custa dinheiro e confunde a sessao. Manter curto e fiel deixa o
   desenvolvimento rodando leve. Essa e a razao de existir do comando, nao um bonus.
4. **Uma fonte da verdade por informacao.** Decisao que vive por extenso em tres arquivos vira
   divergencia. A decisao mora em `decisoes/`, o roadmap e a arquitetura so apontam.
5. **Quem decide e o Jesse.** Voce propoe e espera o "todas/algumas/nenhuma". Ambiguo? Pergunte.
6. **Silencio quando esta tudo certo.** Se nada mudou e nada sobra, diga que esta coerente e enxuto,
   e pare. Sem inventar trabalho.
7. **Sem git por conta propria.** Reconciliar arquivos de contexto nao e fazer commit. Segue a regra
   do `CLAUDE.md`: nunca commit, push ou PR sem ordem explicita do Jesse.
