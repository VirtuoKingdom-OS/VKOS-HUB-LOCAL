# Plano: Mapa de Telas (segunda tela do Mapa)

Dentro da tela Mapa nasce uma segunda visão chamada "Telas". Um canvas infinito com um nó para cada tela, rota e estado do app, de ponta a ponta, mostrando a jornada e a conexão entre elas. Cada nó mostra a tela em detalhe e tem um botão "Abrir" que leva direto pra tela real. É espelho e reflexo do sistema: não altera nada no funcionamento do app.

## Pra que serve

1. Base visual pra reescrita futura do design: o Jesse vê todas as telas que existem, uma a uma, num lugar só.
2. Entendimento do fluxo na prática: quem leva pra quem, por qual gesto, em qual jornada.
3. Didática acima de purismo: repetir nó é permitido quando deixa a jornada mais clara.

## O que entra

1. **Inventário completo em dado**: `interno/mapa-telas.json` com todas as telas, rotas, estados, zonas e jornadas (auditado do código em 2026-07-21: `rotas.ts`, `Shell.tsx`, `App.tsx`). Servido pelo backend com validação Zod, no mesmo padrão do `mapa-sistema.json`.
2. **Seletor no topo do Mapa**: "Sistema | Telas". Cada visão com seu próprio canvas React Flow. A visão Telas só monta quando aberta.
3. **Nó de tela**: cartão com zona, nome, rota, resumo, mini-esqueleto visual da tela (desenhado em CSS, tema-aware, sem screenshot) e os estados internos. Botão "Abrir" navega por hash.
4. **Painel lateral de detalhe**: clicar num nó abre descrição completa, estados internos, de onde se chega e pra onde se vai, e o botão Abrir grande.
5. **Jornadas selecionáveis**: chips no canvas (mesmo padrão do Percurso das skills): "Primeira vez no Hub", "Criar um carrossel", "Criar e publicar um site", "Editar uma peça", "Cuidar do CRM". Selecionar acende o caminho com números de passo e atenua o resto.
6. **Ligações com rótulo de gesto**: cada aresta diz o gesto que causa a navegação ("clica em Criar", "conclui o wizard", "botão Voltar").

## Decisões propostas (com recomendado)

1. **Onde vive o dado**: (a recomendada) JSON em `interno/` + rota `/api/mapa/telas`, igual ao mapa do sistema: editável sem rebuild, opcional por instalação, validado por Zod. Alternativa: módulo TS no web, mais simples, mas quebra o padrão já estabelecido e engessa edição.
2. **Rotas parametrizadas** (studio:pasta, site:pasta, fluxo:tipo, fonte:tipo): o nó representa a tela genérica. O botão Abrir usa a peça ou fonte mais recente do cliente ativo; sem nenhuma, o botão desabilita com aviso ("nenhuma peça deste tipo no cliente ativo"). Criação (`criar:tipo`) e telas fixas abrem sempre.
3. **Sem screenshot**: o detalhe visual do nó é um mini-esqueleto em CSS (barras, blocos, cores por token). Screenshot real seria pesado, manual de manter e quebraria nos 3 temas.
4. **Performance desde o desenho**: grafo estático (sem tracejado marchando, sem drop-shadow animado, sem pulso em massa), `onlyRenderVisibleElements` ligado. Lições da otimização de 2026-07-21 já aplicadas de nascença.

## O que fica de fora desta rodada

- Screenshot ou preview ao vivo das telas dentro dos nós.
- Modo discreto na visão Telas (o do Sistema continua como está).
- Anotações do Jesse por cima dos nós (comentários de redesign); fica anotado como evolução natural quando a reescrita do design começar.
- Detecção automática de rotas por análise de código; o inventário é curado à mão no JSON, com teste que confere contra as rotas reais.

## Como executar

Quando o Jesse mandar:

> Execute o plano da pasta planos/mapa-telas

O executor deve ler 01-visao e 02-arquitetura inteiros, conferir se `rotas.ts`, `Shell.tsx` e `App.tsx` ainda batem com o inventário (auditados em 2026-07-21), seguir as fases do 03-execucao e cumprir o checklist de fechamento.

## Estado

- Plano escrito em 2026-07-21, com auditoria de código desta data (rotas, Shell, App, TelaMapa).
- Nada executado ainda.
- Custo estimado: 1 sessão de execução (a visão inteira num arquivo novo + dado + rota) mais QA com Playwright em build de teste. Rodada menor que a de camadas.

## Regras duras da rodada

- Puramente visual: nenhum comportamento de navegação, rota ou estado do app muda. Só nasce a visão nova e o dado que a alimenta.
- Workspaces reais (OJESSEGOMES, Estúdio Aura) são sagrados: o QA dos botões Abrir roda em workspace de teste, apagado no fim.
- Cores por token, 3 temas, motion sutil, `prefers-reduced-motion` respeitado, sem travessão, sem commit sem ordem.
- `interno/mapa-sistema.json` e `contexto/arquitetura.md` atualizados na mesma tarefa (o Mapa ganha responsabilidade nova).
