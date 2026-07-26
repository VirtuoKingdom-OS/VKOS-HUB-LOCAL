# Rodada VKOS Hub Local v1

Plano mestre da virada do VKOS Hub em produto organizado. Escrito em 2026-07-26.

## Como retomar esta rodada

Se o contexto se perdeu no meio, leia nesta ordem e continue de onde o quadro parou:

1. `00-visao.md`, o que estamos construindo e por quê.
2. `01-fases.md`, as fases em ordem, com escopo e critério de saída de cada uma.
3. `02-estado.md`, o quadro vivo. Diz qual fase está aberta e o que já fechou.

Cada fase é independente e fecha verde. Se os tokens acabarem no meio da Fase 3, a Fase 4 começa do zero sem dívida.

## Regra de ouro desta rodada

Nenhuma fase fecha sem os três verdes:

```bash
cd app
npm run checar -w server && npm run checar -w web
npm run testar -w server && npm run testar -w web
npm run build -w web
```

E sem o mapa atualizado: `interno/mapa-sistema.json` reflete o sistema depois da fase, não antes.

## Ordem das fases e por que ela é essa

```
Fase 1  Amputação        remove o que sai
Fase 2  Verdade do gasto corrige o número
Fase 3  HUB CORE         reorganiza a arquitetura
Fase 4  Nova pele        redesenha a interface inteira
Fase 5  Studio           aprofunda a edição visual
```

A ordem não é gosto, é economia. Redesenhar tela que vai ser apagada é trabalho jogado fora, então a amputação vem antes da pele. O Dashboard da Fase 3 mostra o gasto, então o gasto precisa estar correto antes, na Fase 2. O Studio da Fase 5 é a tela mais densa do produto, e ela nasce em cima do design system que a Fase 4 entrega.
