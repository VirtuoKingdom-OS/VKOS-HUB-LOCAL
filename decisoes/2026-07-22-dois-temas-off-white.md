# Dois temas: Escuro e Claro off-white

## Contexto

Desde 2026-07-14 o app tinha três temas: Escuro (padrão), Dark VKOS (identidade original) e Claro. No primeiro uso real do 3.0, o Jesse pediu a modernização da interface inteira, com visual minimalista e usual, e definiu a paleta de temas.

## Decisão

Ficam dois temas: **Escuro** (padrão, grafite neutro com menta) e **Claro**, que passa a ser **off-white**, nunca branco puro, para descanso visual. O Dark VKOS sai do seletor; quem tiver ele salvo cai no Escuro. Especificação de cores e contraste em `planos/vkos-3-ui/02-design.md` (após a execução, no contexto de arquitetura).

## Por quê

- Três temas triplicam o custo de manutenção visual de cada tela; dois já cobrem os dois modos reais de uso.
- Branco puro cansa a vista em uso longo; off-white neutro mantém a leveza sem o brilho.
- O menta continua o acento único nos dois temas, com variante escurecida no Claro pra passar no contraste.
