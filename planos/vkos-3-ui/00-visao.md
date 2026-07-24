# VKOS 3.0 UI, visão

Plano criado em 2026-07-22 para execução por IA (GPT 5.6). Três objetivos, nesta ordem:

1. **Consertar o que está quebrado agora** (bugs P0 encontrados no primeiro uso real do 3.0, diagnóstico completo em `01-diagnostico.md`).
2. **Modernizar a interface inteira**: dois temas (Escuro e Claro off-white), visual minimalista e usual, inspiração Apple e Google no sentido de clareza, hierarquia e acabamento, nunca no sentido de copiar.
3. **Varrer as telas de ponta a ponta** com checklist por tela, estado e largura, usando `interno/mapa-telas.json` como inventário. Nada fecha sem evidência visual.

## Direção de design (o contrato)

- **Registro**: produto, não marketing. O design serve o uso. Densidade confortável, zero decoração gratuita.
- **Temas**: dois. Escuro (padrão, grafite neutro) e Claro (off-white, nunca branco puro, para descanso visual). O tema Dark VKOS sai da interface. Decisão registrada em `decisoes/2026-07-22-dois-temas-off-white.md`.
- **Cor**: estratégia contida. Neutros levemente tingidos e um único acento, o menta `#2fd4a7`, cobrindo no máximo 10% de qualquer tela. Toda cor por token, como sempre.
- **Tipografia**: uma família só em vários pesos. Hierarquia por peso e tamanho, não por enfeite. Letter-spacing nunca mais apertado que -0.04em. `text-wrap: balance` em títulos.
- **Espaçamento**: escala fixa de 4px (4, 8, 12, 16, 24, 32, 48, 64). Raio de borda em dois valores (ex.: 10px e 14px), consistentes no app inteiro.
- **Motion**: sutil e intencional. 150 a 250ms, curvas ease-out, sem bounce. `prefers-reduced-motion` respeitado em tudo.
- **Componentes**: uma camada comum de botão, campo, cartão, aba, tabela, modal e aviso, usada por todas as telas. Hoje cada tela tem CSS próprio e o resultado é inconsistência; a varredura migra tela a tela pra camada comum.

## Proibições duras (aplicar na varredura, remover onde já existe)

- Branco puro `#fff` como fundo no tema Claro (exceção única: o fundo do QR code, que precisa de branco pra escanear).
- Cor hardcoded em componente. Token sempre.
- Borda lateral colorida grossa como acento em cartão ou item de lista.
- Texto em gradiente.
- Vidro fosco (blur) como padrão decorativo.
- Rótulo pequeno em caixa alta com tracking largo acima de toda seção (o "eyebrow"). Um por tela no máximo, quando fizer sentido de verdade.
- Grades de cartões idênticos como resposta padrão de layout.
- Qualquer tela que estoure a largura da viewport ou esconda conteúdo sem scroll.
- Contraste de texto abaixo de 4.5:1 (corpo) ou 3:1 (texto grande).
- z-index arbitrário (999, 9999). Usar a escala semântica definida em `02-design.md`.

## Critério de sucesso do plano

Toda tela do inventário (incluindo as novas, Acesso e Administração) funciona e fica bonita nos dois temas e nas três larguras de referência (390, 768, 1440), com evidência em screenshot, sem overflow horizontal, sem estado quebrado, e o Jesse consegue completar o ciclo do 3.0 (bootstrap, login, modelo, workspace, convite, cliente) sem encontrar nenhuma tela quebrada.
