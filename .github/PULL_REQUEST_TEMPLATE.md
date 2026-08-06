# English

## Effect of this change

Describe what changes for the person using the Hub, or for the developer reading the code. Describe the effect, not the list of files. The diff already shows the files.

## Why

What problem this solves. Link the issue or the decision file when there is one.

## How to verify

The steps a reviewer runs to see the effect with their own eyes.

## Checklist

- [ ] Typecheck passed: `npm run checar -w server` and `npm run checar -w web`, from `app/`
- [ ] Tests passed: `npm run testar -w server` and `npm run testar -w web`
- [ ] Build passed: `npm run build -w web`
- [ ] New behavior comes with a new test
- [ ] Product or technical choice is recorded in `docs/decisoes/`
- [ ] `interno/mapa-sistema.json` is updated if a module or a flow changed
- [ ] No personal data and no secret entered the diff

# Portugues do Brasil

## Efeito desta mudanca

Descreva o que muda para quem usa o Hub, ou para quem le o codigo. Descreva o efeito, nao a lista de arquivos. O diff ja mostra os arquivos.

## Por que

Que problema isso resolve. Ligue a issue ou o arquivo de decisao, quando houver.

## Como conferir

Os passos que quem revisa roda para ver o efeito com os proprios olhos.

## Checklist

- [ ] Typecheck passou: `npm run checar -w server` e `npm run checar -w web`, a partir de `app/`
- [ ] Testes passaram: `npm run testar -w server` e `npm run testar -w web`
- [ ] Build passou: `npm run build -w web`
- [ ] Comportamento novo veio acompanhado de teste novo
- [ ] A escolha de produto ou tecnica foi registrada em `docs/decisoes/`
- [ ] O `interno/mapa-sistema.json` foi atualizado se um modulo ou fluxo mudou
- [ ] Nenhum dado pessoal e nenhum segredo entrou no diff
