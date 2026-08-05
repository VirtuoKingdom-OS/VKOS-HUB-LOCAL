# Identidade v3: o Hub e o VKOSHUB usam a mesma linguagem

## Contexto

O Hub tinha uma fundação coerente, mas ainda usava neutros frios, Inter e o
tema Claro como padrão. A página de identidade do VKOSHUB já definia outra
linguagem: Minimalista Editorial, laboratório creme, quase preto, menta da
marca, Geist, carvão e textura de pontos.

O objetivo desta rodada foi adotar os valores dessa identidade sem transformar
um cockpit denso em página de marketing e sem enfraquecer as travas executáveis
que protegem a interface.

O contrato completo e durável está em
`docs/contexto/identidade-visual.md`.

## Decisão

As quatro decisões tomadas pelo Jesse em 2026-08-05 ficam registradas e não se
reabrem nesta migração:

1. **Pele nova, densidade do Hub.** Entram cor, fonte, forma, movimento e voz.
   Permanecem o corpo de 14px, a régua de 4px e os controles de 28, 32 e 40px.
   A escala editorial de 30px aparece somente nos momentos nomeados pelo
   contrato.
2. **O Escuro passa a ser o padrão.** O Claro continua completo e obrigatório.
   O fallback do HTML, o fallback do seletor de tema e os tokens de raiz usam
   a mesma decisão.
3. **Entram textura, carvão e Geist embarcada.** A textura pinta o plano de
   trabalho e não entra nos canvas do Cockpit e do Mapa. O carvão é escuro nos
   dois temas e tem papéis próprios. Geist e Geist Mono ficam no repositório
   com a licença, sem CDN.
4. **As travas mudam junto e nenhuma é afrouxada.** Camadas, contraste,
   densidade e escalas continuam varrendo o app inteiro.

## Valores calibrados

A página de identidade não contém todos os empilhamentos de controle que o Hub
usa. Três calibrações fecham os pisos do WCAG 2.2 sem mudar a direção visual:

- No Claro, `--linha-forte` muda de `#857f6e` para `#7d7768`, chegando a
  3,21:1 sobre a lavagem.
- No Escuro, `--linha-forte` muda de `#726e66` para `#7b776e`, chegando a
  3,22:1 sobre a superfície alta.
- No Claro, `--menta-viva` usa `#1f8a63` em vez da menta da marca, chegando a
  3,11:1 no pior plano. A menta `#7ed9b2` permanece sobre o carvão como
  `--menta-painel`.

O canvas mantém ainda `--ligacao: #655f52` no Claro, com 5,03:1. Esse valor é
específico do grafo e não é uma calibração da cartela da página.

## Por quê

A identidade passa a ser reconhecível pelos valores e pela hierarquia, sem
perder a velocidade de leitura de uma ferramenta de mesa. O tema Escuro é onde
a cartela foi desenhada para viver; o Claro continua confortável para trabalho
diurno. A textura e o carvão têm limites de superfície explícitos para não
criar duas grades sobrepostas nem inverter texto de forma acidental.

As travas tornam a decisão verificável: 51 pares críticos por tema, escalas
fechadas, títulos até peso 400, cor somente por token e camadas de cascata
declaradas.

## Consequências

- O sistema visual anterior permanece apenas como histórico.
- Qualquer tela nova lê `docs/contexto/identidade-visual.md` antes de criar CSS.
- Mudança de paleta atualiza contraste e fotos nos dois temas na mesma tarefa.
- Fonte externa, textura fixa na viewport e título pesado são regressões.
