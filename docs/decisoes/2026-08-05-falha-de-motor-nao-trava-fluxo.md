# Falha de motor de IA não trava o fluxo

## Contexto

Em 2026-08-05, no meio da Cerimônia do Cérebro do workspace OJESSEGOMES, a cota
do Codex acabou. A tela mostrou isto, dentro da conversa, como se fosse uma
resposta da IA:

> O Codex encontrou um erro: You've hit your usage limit. Upgrade to Pro
> (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage
> to purchase more credits or try again at Aug 8th, 2026 1:02 AM.

E a entrevista travou. Não por causa da cota, que é da OpenAI e o Hub não
controla, mas por causa de duas decisões nossas.

**A mensagem era o texto cru do provedor, em inglês.** `normalizarErro`, em
`provedores/codex.ts`, traduzia três casos conhecidos (não logado, CLI ausente,
tempo esgotado) e jogava todo o resto num genérico com a frase original colada
no fim. Cota estourada caía ali.

**A tela não sabia que a sessão tinha morrido.** O servidor fazia a parte dele:
marcava `status: "erro"` e guardava o motivo em `sessao.erro`. Mas
`CerimoniaCerebro` só distinguia "rodando" de "não rodando". Falha parecia turno
terminado: o campo de resposta continuava aberto, escrever nele mandava uma
mensagem que não ia a lugar nenhum, e não havia uma só ação na tela. A tarefa
mais longa do produto parava sem saída.

## Decisão

**Falha de motor é um estado da tela, com nome e com saída.** Três partes:

**1. A mensagem de cota vira português e diz quando volta.** `normalizarErro`
passa a reconhecer limite de uso em todas as formas que a OpenAI usa (`usage
limit`, `rate limit`, `quota`, `429`, `too many requests`) e extrai da mensagem
a hora de voltar, que é a única informação acionável dela. O reconhecimento de
cota vem ANTES do de login: a resposta às vezes carrega as duas palavras, e
mandar refazer o login quando o problema é crédito faz a pessoa perder tempo no
lugar errado.

**2. A cerimônia mostra a falha e oferece as saídas reais.** Uma faixa de alerta
acima do campo, com o motivo e o que dá pra fazer:

- **Com id de conversa do provedor**, responder de novo retoma de onde parou, por
  `--resume`. O campo continua aberto e o texto dele diz isso. Foi o caso real: a
  conversa existia do outro lado, o que faltou foi crédito.
- **Sem id de conversa**, não há o que retomar, o campo desliga e sobra
  "Começar de novo".
- **Quando o outro motor está instalado**, aparece "Recomeçar com o Claude" (ou
  Codex). O rótulo diz *recomeçar* de propósito: a conversa pertence ao motor que
  a abriu, e o outro não continua de onde este parou. Prometer continuidade ali
  seria mentir.

**3. A decisão virou função pura, testada.** `saidaDaFalha`, em
`cerebroConversa.ts`, responde as três perguntas (falhou, dá pra retomar, existe
outro motor) a partir de dados, sem React. `cerebroFalha.test.ts` cobre os
casos, incluindo o que importa mais: **não oferecer um motor que não está
instalado**, porque isso mandaria a pessoa num beco onde ela clica e falha de
novo, agora por outro motivo.

## Por quê

O Hub não pode impedir a OpenAI de cortar a cota, e prometer isso seria mentira.
O que ele pode, e não estava fazendo, é **não transformar uma falha externa
previsível numa parede**.

O erro de fundo era de modelo: o Hub tratava "a IA respondeu" e "a IA falhou"
como o mesmo evento na tela, porque os dois terminam a sessão. São coisas
diferentes, e a diferença é justamente a que o dono precisa para decidir o que
fazer em seguida.

A regra que fica, e que vale para qualquer motor e qualquer fluxo longo:
**falha de provedor tem que chegar na tela com nome, motivo e saída.** Nome, pra
não se confundir com resposta. Motivo, em português, porque quem lê é dono de
negócio e não desenvolvedor. Saída, porque estado sem ação é fluxo travado, e
fluxo travado numa entrevista de identidade custa o trabalho inteiro.

## O que isto não cobre

As outras telas de conversa longa (o nó de sessão do Cockpit, o Chat da IDE, o
Assistente) continuam sem esse tratamento. O caso que apareceu foi o da
cerimônia, e a correção foi feita onde doeu, com a parte pura extraída para
poder ser reaproveitada. Levar `saidaDaFalha` às outras telas é rodada própria, e
está declarada aqui em vez de ficar por descobrir.
