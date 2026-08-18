---
name: enxuto-revisao
description: >
  Revisa um diff ou o projeto inteiro procurando over-engineering: o que apagar, encolher
  ou trocar pela biblioteca padrão ou pelo recurso nativo. Uma linha por achado, com tag
  (apagar, stdlib, nativo, yagni, encolher) e a economia estimada, ranqueado do maior corte
  pro menor. Não aplica nada sem aprovação. Use quando o comprador disser /enxuto-revisao,
  "revisa esse código atrás de excesso", "o que dá pra cortar?", "esse projeto tá inchado",
  ou depois de uma rodada grande de código.
---

# /enxuto-revisao: a caça ao excesso

Revisão com um objetivo só: o melhor destino de um código é ficar menor. Uma linha por
achado: onde, o que cortar, o que entra no lugar, quanto economiza.

**Escopo fechado:** só complexidade desnecessária. Bug de correção, falha de segurança e
problema de performance ficam FORA desta revisão: apontou um no caminho, anote em uma linha
separada no fim ("fora do escopo, revisar à parte") e siga a caça.

## Passo 1: definir o alvo

- Pediram um trecho ou arquivo? Revise ele.
- Tem mudança recente não commitada? O diff é o alvo natural.
- Pediram "o projeto inteiro"? Varra a árvore toda.
- Na dúvida entre diff e projeto, UMA pergunta.

## Passo 2: caçar

O que procurar, em qualquer alvo:

- Dependência fazendo o que a biblioteca padrão ou a plataforma já faz.
- Interface ou classe abstrata com uma implementação só.
- Factory de um produto só; camada com um chamador só.
- Wrapper que só delega pra outra função.
- Arquivo que exporta uma coisa só.
- Flag, config e código morto que ninguém liga.
- Reimplementação artesanal do que a stdlib entrega pronto.
- Lógica que encolhe: o mesmo resultado em bem menos linhas.

## Passo 3: reportar, uma linha por achado

Formato: `arquivo:linha: tag: o que cortar. O que entra no lugar. (~ -N linhas)`

As tags:

- `apagar:` código morto, flexibilidade que ninguém usa, feature especulativa. No lugar:
  nada.
- `stdlib:` coisa artesanal que a biblioteca padrão já entrega. Nomeie a função.
- `nativo:` dependência ou código fazendo o que a plataforma já faz. Nomeie o recurso.
- `yagni:` abstração com uma implementação, config que ninguém seta, camada com um chamador.
- `encolher:` mesma lógica em menos linhas. Mostre a forma curta.

Exemplos do tom certo:

- Errado: "Essa classe de validação de email talvez esteja mais complexa que o necessário,
  considere avaliar se todas as regras são mesmo precisas nesta fase."
- Certo: `validacao.js:12-38: stdlib: classe de 27 linhas validando email. "@" no texto
  resolve, 1 linha; a validação real é o email de confirmação. (~ -26 linhas)`
- Certo: `datas.js:4: nativo: moment.js importado pra UMA formatação. Intl.DateTimeFormat,
  zero dependência. (~ -1 dep)`
- Certo: `repositorio.js:88: yagni: RepositorioAbstrato com uma implementação só. Inline até
  existir a segunda. (~ -40 linhas)`
- Certo: `api.js:52-71: apagar: retry em volta de chamada local idempotente. Nada entra no
  lugar. (~ -20 linhas)`

## Passo 4: ranquear e fechar o saldo

- **Diff:** achados na ordem do diff.
- **Projeto inteiro:** ranqueado do maior corte pro menor. O primeiro item é o que mais
  emagrece o projeto.

Feche sempre com a única métrica que importa:

> `saldo: -N linhas, -M dependências possíveis.`

Nada a cortar? Diga `Já está enxuto. Pode seguir.` e pare.

## Limites

- **Só lista, não aplica.** Nenhum corte acontece sem aprovação. Aprovado ("aplica tudo",
  "aplica 1 e 3"), aí sim edite, item por item, e confira que continua funcionando.
- **Não marque o teste mínimo pra deleção.** O cheque rodável que o `/enxuto` exige é piso,
  não gordura.
- Desliga com "modo normal".

---

Destilada do ponytail-review e do ponytail-audit (MIT, DietrichGebert), reescrita em
português pro VKOS. Crédito completo em `CREDITOS.md`.
