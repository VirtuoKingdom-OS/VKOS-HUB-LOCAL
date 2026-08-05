# VKOS Hub

Este é o braço de desenvolvimento do VKOS Hub. Pasta autônoma, separada do workspace principal da VirtuoKingdom de propósito: aqui não se gasta contexto nem token com o resto da operação da VK. Só se desenvolve o app.

## O que é o VKOS Hub

Workspace multi-IA vertical. Um canvas ou cockpit onde várias sessões de Claude trabalham em paralelo, todas lendo o mesmo Cérebro (a identidade do negócio em markdown, o mecanismo do produto VKOS atual). O Cérebro como contexto compartilhado é o diferencial.

Público: dono de negócio ou prestador de serviço, não desenvolvedor. Local-first, pagamento único, nada hospedado. Também é a ferramenta de produtividade do próprio Jesse. Referências de inspiração: AIOX-CORE e Maestri.

## Leitura de contexto

No início de cada sessão, ler:

- `docs/contexto/visao.md`
- `docs/contexto/arquitetura.md`
- `docs/contexto/roadmap.md`

Ler `docs/contexto/ecossistema.md` só quando a tarefa tocar o produto VKOS ou o posicionamento.

Não confirmar a leitura. Só usar o que leu.

## Registro de decisões

Toda decisão de produto ou técnica tomada junto com o Jesse vira um arquivo curto em `docs/decisoes/AAAA-MM-DD-titulo.md`. Cada arquivo tem três partes: contexto, decisão, por quê.

Antes de reabrir um debate já fechado, checar a pasta `docs/decisoes/`. Se já existe decisão registrada, seguir ela em vez de discutir de novo.

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

Motion e UI caprichados importam muito para ele.

**A IDENTIDADE VISUAL VIGENTE É A V3, DE 2026-08-05.** Ela substitui o
redesign v2 e as decisões visuais anteriores onde houver conflito. Ver
`docs/decisoes/2026-08-05-identidade-v3.md`.

**O contrato de interface agora é um arquivo só: `docs/contexto/identidade-visual.md`.**
Leia ele inteiro antes de tocar em qualquer tela. Ele traz a paleta dos dois
temas com contraste medido, as escalas com valor exato e quando usar cada
degrau, a camada de primitivas com a receita de cada componente, as regras de
densidade, de motion e de canvas, as proibições e o checklist de migração por
tela.

O resumo em seis pontos, que não substitui a leitura:

- **O Escuro é o padrão, quase preto e quente; o Claro é creme de laboratório.**
  Os dois temas usam a mesma gramática e são conferidos juntos.
- **O menta sinaliza marca e estado vivo, nunca clique genérico.** Carvão,
  textura de pontos e papéis próprios completam a identidade sem invadir os
  canvas do Cockpit e do Mapa.
- **Geist é embarcada e título ganha autoridade por tamanho e tracking.**
  Título usa peso 400; navegação ativa usa 500; pesos maiores ficam restritos
  a dado numérico e wordmark.
- **A tela não inventa componente.** Ela compõe `app/web/src/estilos/primitivas.css`
  e escreve só o layout dela. Primitiva faltando sobe pra lá, nunca vira classe
  local.
- **Conteúdo não nasce dentro de cartão**, e cartão dentro de cartão nunca é
  certo. A densidade se decide na altura de controle (28/32/40px), não no
  tamanho da letra (o corpo é 14px).
- **Cor só por token, sempre.** Nenhum hex em folha de componente, e as travas
  em `app/web/src/estilos/*.test.ts` reprovam.

A migração da identidade v3 terminou em 2026-08-05: as folhas estão cobertas
pelas travas, `estilos/legado.css` foi demolido classe por classe e a constante `PENDENTES`,
em `app/web/src/estilos/folhas.ts`, está vazia. As travas de conteúdo varrem o
app inteiro. O registro do que saiu está em
`docs/decisoes/2026-07-30-a-demolicao-do-legado.md` e em
`docs/decisoes/2026-08-05-identidade-v3.md`. `PENDENTES` continua
existindo para dívida DECLARADA: folha nova que precise ficar fora das travas
por uma rodada entra ali com data e motivo, nunca em silêncio.

A cascata do CSS tem quatro camadas declaradas com `@layer`, da que perde pra
que vence: `base` (`estilos/global.css`, o reset, as escalas e o contrato de
nome dos tokens, mais `estilos/primitivas.css`, os componentes
compartilhados), `externo` (o CSS do React Flow, que entra por
`estilos/externo.css`), `tela` (a folha de cada tela, mais `canvas.css`, que
veste o canvas de grafo do Cockpit e do Mapa) e `tema`
(`estilos/visual-hub.css`, que declara COR e só cor).

Duas regras que não se quebram, e `estilos/camadas.test.ts` trava as duas. A
linha `@layer base, externo, tela, tema;` fica no topo de toda folha, antes de
qualquer regra: as telas carregam sob demanda, e a primeira declaração que o
navegador lê é a que fixa a ordem. E cada folha declara todo o conteúdo dela
dentro da camada dela, porque regra fora de camada vence qualquer camada.

## Onde as coisas moram

Reorganizado em 2026-07-27. Ver `docs/decisoes/2026-07-27-onde-as-coisas-moram.md`.

```
app/                    o produto. O nome não muda: o instalador e o
  server/src/           integrado.ts procuram app/ ao lado de VKOS/
    index.ts            entrada
    tipos.ts            contrato compartilhado
    nucleo/             transporte: ws.ts e spa.ts
    crm/ sessoes/ ...   um módulo por domínio, sempre com rotas.ts
  web/src/
    estilos/            a fundação: global, primitivas, externo, tema
                        (mais legado e canvas, os dois sacos temporários)
    componentes/<area>/ o componente e a folha de estilo dele, juntos
docs/                   contexto, decisões e planos
interno/                dados que o app LÊ rodando. Não é documentação.
ferramentas/            scripts de conferência, fora do produto
```

Três regras que decorrem disso:

- **Folha de estilo mora ao lado do componente que ela veste.** `crm.css` fica em `componentes/crm/`. Em `estilos/` só entra o que é de todo mundo. As travas de cascata e de escala varrem `web/src` inteiro por `estilos/folhas.ts`, então folha nova em qualquer pasta já nasce coberta.
- **Módulo do servidor é uma pasta com `rotas.ts`**, nunca um arquivo solto na raiz de `src/`.
- **`interno/` não é `docs/`.** O `mapa/rotas.ts` lê aqueles JSON em execução. Documentação é o que se lê; aquilo o app carrega.

## Código

O código do app vive em `app/` (server Fastify + web React/Vite). O contrato técnico das rodadas fica em `app/CONTRATO.md`. O fluxo completo de trabalho, o portão de qualidade e as regras de código estão em `CONTRIBUTING.md`.

Regras que já custaram caro e não se repetem:

- **Nenhum valor multilinha em argumento de processo filho.** No Windows, sob shell, o `cmd.exe` corta na primeira quebra de linha e leva junto o resto da linha de comando, em silêncio. Use stdin ou arquivo. Ver `docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.
- **Teste de injeção afirma o conteúdo injetado**, não só o entorno. Teste que passaria com a injeção apagada não é teste.

## Licença e repositório

Repositório privado `OJESSEGOMES-VKOS/VKOS-HUB-LOCAL`, sob Business Source License 1.1 com atribuição obrigatória. Ver `LICENSE` e `NOTICE`. Arquivo novo de código nasce dentro dessa licença, sem cabeçalho por arquivo.
