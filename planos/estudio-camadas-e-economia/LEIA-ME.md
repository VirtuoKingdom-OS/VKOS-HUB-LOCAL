# Plano: camadas no editor e modo econômico de geração

Rodada dupla. Primeira metade: consertar a edição de carrossel (aspas e imagens inalcançáveis), dar ao editor um painel de camadas com ordem (acima/abaixo) e permitir adicionar imagem própria posicionável, no carrossel e no site. Segunda metade: cortar custo de IA com modelos mais baratos nas tarefas simples e um interruptor "Aprimorar com IA" nas instruções finais dos dois wizards.

## Os dois bugs relatados, com causa confirmada em código

1. **Aspas da capa não clicáveis**: o template gerado marca `.aspas` com `pointer-events:none` e o clique do editor de carrossel usa `e.target` puro (`motor.ts:664`), que respeita `pointer-events`. O clique atravessa a aspa e cai no fundo. O editor de SITE não tem esse problema porque usa descida geométrica `alvoNoPonto` (`nucleo.ts:89`), que ignora `pointer-events`. O conserto de raiz é portar esse hit-test pro carrossel.
2. **Imagens das páginas não clicáveis**: a imagem inserida nasce com `z-index:1` atrás do conteúdo (`motor.ts:855`), então o clique acerta o texto por cima. E imagem como `background-image` de `div` nem entra no override de `pointer-events` que só cobre `<img>`. Mesmo conserto de raiz: hit-test geométrico, mais o painel de camadas que permite selecionar pela lista sem depender do clique no canvas.

## O que entra

1. **Conserto do hit-test do carrossel**: clique passa a usar `alvoNoPonto`, alcançando qualquer elemento visível, inclusive decorativos com `pointer-events:none`.
2. **Painel de camadas** no Studio de carrossel: lista dos elementos visíveis do slide selecionado, seleção pela lista, subir/descer camada (z-index e ordem no DOM), com ids estáveis `data-vk` (o mesmo alicerce que o site já usa).
3. **Adicionar imagem própria**: botão manual de inserir imagem (do computador ou das fontes de dados) como elemento posicionável (arrastável, redimensionável pela largura, camada controlável). No carrossel e no site.
4. **Revisão de paridade no editor de site**: o site já tem lista de seções; ganha as mesmas ações de camada dentro da seção e o inserir imagem própria.
5. **Modelos baratos por tarefa**: o Ajustar com IA passa a sugerir por padrão o modelo barato do provedor (Haiku no Claude, GPT-5.4 mini no Codex), mantendo a escolha manual. Geração completa continua no padrão atual.
6. **Interruptor "Aprimorar com IA"** na etapa de instruções finais do wizard de carrossel e do Site Guiado. Ligado (padrão): fluxo atual, com toda a camada de design. Desligado: montagem direta num modelo muito mais barato, seguindo o template e as instruções finais ao pé da letra, sem liberdade criativa.

## Custo dos modelos (preço de API por 1M de tokens, a régua de consumo)

| Provedor | Modelo | Entrada | Saída | Uso previsto |
|---|---|---|---|---|
| Claude | Opus | $5,00 | $25,00 | tarefas difíceis, escolha manual |
| Claude | Sonnet | $3,00 | $15,00 | geração completa (padrão atual) |
| Claude | Haiku | $1,00 | $5,00 | ajustes simples e montagem econômica |
| Codex | GPT-5.6 Sol | $5,00 | $30,00 | escolha manual |
| Codex | GPT-5.6 Terra | $2,50 | $15,00 | geração completa |
| Codex | GPT-5.6 Luna | $1,00 | $6,00 | alternativa econômica |
| Codex | GPT-5.4 mini | $0,75 | $4,50 | ajustes simples e montagem econômica |

Um ajuste no Haiku custa cerca de 5 vezes menos que no Opus. A montagem econômica de carrossel (Haiku copiando template e preenchendo) deve custar em torno de 10 vezes menos que uma geração caprichada no Opus.

## O que fica de fora desta rodada

- Sanitização de HTML no save (o conteúdo é gerado internamente e servido same-origin; registrado como pendência de segurança pra quando houver conteúdo de terceiros).
- Redimensionamento livre com alças de canto (entra só largura por campo numérico nesta rodada; alças são refinamento futuro).
- Modo econômico com montagem 100% determinística sem IA (não existe montador determinístico hoje; fica anotado como evolução futura se o modo barato se provar).

## Como executar

Quando o Jesse mandar:

> Execute o plano da pasta planos/estudio-camadas-e-economia

O executor deve ler 01-visao e 02-arquitetura inteiros, verificar se os arquivos citados ainda batem (código auditado em 2026-07-20), seguir as fases do 03-execucao e cumprir o checklist de fechamento.

## Estado

- Plano escrito em 2026-07-20, com auditoria de código desta data (motor do editor e camada de provedores).
- Nada executado ainda.
- Custo estimado: 3 Opus de execução (A: motor carrossel, B: motor site, C: economia e wizard) mais 1 Opus de QA. As sessões de teste de geração econômica rodam em workspace de teste com modelo barato, custo pequeno.

## Regras duras da rodada

- Dados reais do Jesse (OJESSEGOMES, Estúdio Aura) são sagrados: teste de edição e de geração só em workspace de teste. A peça "2026-07-20-7-ferramentas-do-google" NÃO deve ser editada pelo QA; ela é o caso real que o Jesse vai validar depois.
- Qualidade da geração caprichada é intocável: nenhum prompt do fluxo atual muda de conteúdo nesta rodada, só ganham o desvio pro modo econômico quando o interruptor estiver desligado.
- O laço de conformidade de site continua rodando nos dois modos (é a rede que segura a qualidade mínima do modo barato).
- Cores por token, 3 temas, motion sutil, sem travessão, sem commit sem ordem.
