# Clicar num nó do Mapa centraliza, e não mexe no zoom

## Contexto

Nas duas visões do Mapa, a de Sistema e a de Telas, clicar num nó chamava
`setCenter` com um zoom fixo: 0.9 na visão Sistema, 0.85 na de Telas.

O efeito era que o clique roubava o enquadramento. Quem tinha afastado a câmera
pra ler a rede inteira levava um salto pra perto a cada nó aberto, e precisava
afastar de novo pra continuar de onde parou. Explorar o mapa vira uma sequência
de cliques, então o incômodo se repetia a cada passo.

## Decisão

O clique num nó continua trazendo ele pro centro, com a mesma animação de 400ms,
mas o nível de zoom fica onde a pessoa deixou.

Vale nos dois arquivos, `TelaMapa.tsx` e `TelaMapaTelas.tsx`.

## Por quê

Centralizar e aproximar são dois gestos, e só um foi pedido. Centralizar tem
função: no modo skills da visão Sistema, o clique não abre painel nenhum, então
trazer o nó pro centro é o único retorno visual que a pessoa recebe. Tirar isso
deixaria o clique mudo.

O zoom é diferente: é a escolha de leitura de quem está olhando. Longe pra ver a
rede, perto pra ler um trecho. Reescrever essa escolha a cada clique é o app
decidindo por cima do usuário algo que ele já tinha decidido.

Uma armadilha da API que o código registra em comentário: passar `getZoom()` é
obrigatório, não decorativo. Omitir a opção `zoom` no `setCenter` não preserva o
zoom atual, o React Flow assume o `maxZoom`. A correção ingênua, apagar a linha
do zoom, deixaria o salto pior do que era.
