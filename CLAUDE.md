# VKOS Hub

Este é o braço de desenvolvimento do VKOS Hub. Pasta autônoma, separada do workspace principal da VirtuoKingdom de propósito: aqui não se gasta contexto nem token com o resto da operação da VK. Só se desenvolve o app.

## O que é o VKOS Hub

Workspace multi-IA vertical. Um canvas ou cockpit onde várias sessões de Claude trabalham em paralelo, todas lendo o mesmo Cérebro (a identidade do negócio em markdown, o mecanismo do produto VKOS atual). O Cérebro como contexto compartilhado é o diferencial.

Público: dono de negócio ou prestador de serviço, não desenvolvedor. Local-first, pagamento único, nada hospedado. Também é a ferramenta de produtividade do próprio Jesse. Referências de inspiração: AIOX-CORE e Maestri.

## Leitura de contexto

No início de cada sessão, ler:

- `contexto/visao.md`
- `contexto/arquitetura.md`
- `contexto/roadmap.md`

Ler `contexto/ecossistema.md` só quando a tarefa tocar o produto VKOS ou o posicionamento.

Não confirmar a leitura. Só usar o que leu.

## Registro de decisões

Toda decisão de produto ou técnica tomada junto com o Jesse vira um arquivo curto em `decisoes/AAAA-MM-DD-titulo.md`. Cada arquivo tem três partes: contexto, decisão, por quê.

Antes de reabrir um debate já fechado, checar a pasta `decisoes/`. Se já existe decisão registrada, seguir ela em vez de discutir de novo.

## Manter o contexto vivo

Quando uma fase do roadmap concluir, ou a arquitetura mudar, atualizar o arquivo de contexto correspondente na linha certa. Editar o ponto que mudou, não reescrever o arquivo inteiro.

Toda tarefa que criar, remover, renomear ou mudar a responsabilidade de um módulo, tela, integração ou fluxo entre sistemas deve conferir `interno/mapa-sistema.json` antes de fechar. Se a mudança altera quem alimenta quem, atualizar os nós e ligações na mesma tarefa. O Mapa é parte do contrato vivo da arquitetura, não documentação opcional.

## Git

NUNCA fazer commit, push ou PR sem ordem explícita do Jesse. Sem exceção.

## Escrita

Vale para qualquer texto do projeto: código, comentários, docs, decisões, mensagens.

- Português brasileiro.
- NUNCA usar travessão "—" nem o caractere "·". Usar vírgula, ponto ou dois-pontos.
- Frase curta e direta.
- Sem jargão de startup.

## Como o Jesse trabalha

Em decisões estratégicas ele gosta de debater antes de travar. Apresentar opções fundamentadas com um recomendado, nunca uma resposta única fechada. Deixar o trade-off de cada opção claro.

Em execução ele quer velocidade e iteração. Quando ele disser "bora torar", é pra construir, não pra planejar mais.

Motion e UI caprichados importam muito para ele. A identidade da VK é minimalista, verde-menta (o menta real dos temas é #2fd4a7, mais suave que o histórico #00C896), glow sutil, contraste confortável (nunca extremo). O app tem três temas: Escuro (o padrão, grafite neutro com menta de destaque), Dark VKOS (o escuro original da identidade) e Claro. Toda cor passa pelos tokens de tema, nunca hardcoded no componente. Toda interface nasce dentro desse padrão e funciona nos três temas.

Desde 2026-07-27 o padrão tem regras concretas, e elas valem para toda tela nova:

- **A profundidade vem da escada de superfície, nunca de sombra.** Quatro degraus sólidos: `--fundo` (área de trabalho), `--superficie` (sidebar, cartão, painel, barra de topo), `--superficie-alta` (hover, item selecionado, campo) e `--superficie-flutuante` (popover, menu, modal). Junto vem o fio de `--linha`. Sombra só onde o elemento flutua de verdade sobre outro conteúdo, e são três tokens: `--sombra-popover`, `--sombra-modal` e `--sombra-arrasto`.
- **A borda tem dois trabalhos e duas cores.** `--linha` é decoração e separação, sutil de propósito. `--linha-forte` é o contorno de controle, obrigada a 3:1 contra a superfície. Campo, botão neutro, trilho de interruptor e caixa de seleção usam a forte, sem exceção. `estilos/contraste.test.ts` trava 48 verificações nos três temas.
- **O glow marca estado, nunca decora.** São três: `--glow-vivo` (sessão rodando, conexão ligada), `--glow-foco` (foco de teclado) e `--glow-acao` (a ação principal da tela, uma por tela). Nunca em superfície grande, texto corrido, borda decorativa, hover de cartão ou item selecionado. Ver `decisoes/2026-07-27-o-glow-so-marca-estado.md`.
- **As escalas são fechadas e moram no `global.css`, na camada base.** Espaçamento em 8 degraus derivados de `--base`, tipografia em 7, peso em 4 (400, 500, 600, 700), raio em 5, movimento em 3 durações e 2 curvas, empilhamento em 7 níveis. `estilos/escalas.test.ts` trava, inclusive que o `visual-hub.css` não redeclare escala: lá só entra cor.
- **A fonte é embarcada**, o Inter variável em `web/src/fontes/`, sob SIL OFL 1.1. Nada de CDN e nada de depender de fonte do sistema, que falha em silêncio. Ver `decisoes/2026-07-27-a-fonte-embarcada.md`.
- **Movimento reduzido substitui, não apaga.** O movimento de posição some, o feedback de cor e opacidade fica, e o que pulsa vira fade. Quem liga movimento reduzido continua sabendo que a IA está trabalhando.
- **Minimalismo aqui é tirar ruído, não tirar informação.** O Hub é ferramenta de trabalho pesado com muita coisa na tela. Nenhum controle perde sinalizador em nome da limpeza.

O contrato completo, com o número medido de cada decisão, está em `planos/vkos-hub-local-v1/05-design-system.md`.

A cascata do CSS tem quatro camadas declaradas com `@layer`, da que perde para a que vence: `base` (`app/web/src/estilos/global.css`, o reset e a base dos tokens), `externo` (o CSS do React Flow, que entra por `estilos/externo.css`), `tela` (as 16 folhas de tela) e `tema` (`app/web/src/estilos/visual-hub.css`, o valor final de cada token por tema).

Duas regras que não se quebram, e `estilos/camadas.test.ts` trava as duas. A linha `@layer base, externo, tela, tema;` fica no topo de toda folha, antes de qualquer regra: a primeira que o navegador lê é a que fixa a ordem, e o bundler não garante qual vem primeiro. E cada folha declara todo o seu conteúdo dentro da camada dela, porque regra fora de camada vence qualquer camada. Folha nova nasce assim. Ver `decisoes/2026-07-27-ordem-da-cascata-com-layer.md`.

## Código

O código do app vive em `app/` (server Fastify + web React/Vite). O contrato técnico das rodadas fica em `app/CONTRATO.md`. O fluxo completo de trabalho, o portão de qualidade e as regras de código estão em `CONTRIBUTING.md`.

Regras que já custaram caro e não se repetem:

- **Nenhum valor multilinha em argumento de processo filho.** No Windows, sob shell, o `cmd.exe` corta na primeira quebra de linha e leva junto o resto da linha de comando, em silêncio. Use stdin ou arquivo. Ver `decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.
- **Teste de injeção afirma o conteúdo injetado**, não só o entorno. Teste que passaria com a injeção apagada não é teste.

## Licença e repositório

Repositório privado `OJESSEGOMES-VKOS/VKOS-HUB-LOCAL`, sob Business Source License 1.1 com atribuição obrigatória. Ver `LICENSE` e `NOTICE`. Arquivo novo de código nasce dentro dessa licença, sem cabeçalho por arquivo.
