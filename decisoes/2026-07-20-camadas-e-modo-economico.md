# Camadas no editor e modo econômico de geração

## Contexto

Caso real do Jesse no carrossel "7 ferramentas do google": as aspas decorativas da capa não respondiam a clique e as imagens das páginas eram inalcançáveis. Causa confirmada em código: o template marca `.aspas` com `pointer-events:none` e o clique do editor de carrossel usava `e.target` puro, que respeita essa regra; a imagem de página nasce com `z-index:1` atrás do conteúdo, então o clique sempre acertava o texto por cima. O editor de site já não sofria disso porque usa descida geométrica no ponto do clique.

No custo, toda tarefa de IA rodava no modelo escolhido pelo usuário com padrão médio, sem distinguir exigência: um ajuste pontual custava o mesmo caminho de uma geração completa. Régua de preços por 1M de tokens: Opus 5/25, Sonnet 3/15, Haiku 1/5; Codex do Sol (5/30) ao GPT-5.4 mini (0.75/4.50). Ajuste no Haiku custa cerca de 5 vezes menos que no Opus.

## Decisão

Editor: o clique do carrossel passa a usar o hit-test geométrico do núcleo (menor elemento sob o ponteiro, ignorando `pointer-events`), com clique repetido alternando os empilhados. Todo elemento do slide ganha id estável `data-vk` (o mesmo alicerce do site). Nasce o `PainelCamadas` compartilhado entre os dois editores: lista por ordem de empilhamento, seleção pela lista e subir/descer camada (carrossel: ordem no DOM + z-index; site: só ordem no DOM, porque é fluxo). Os dois editores ganham "Adicionar imagem" própria (computador ou fontes de dados): no carrossel como elemento livre absoluto arrastável com largura ajustável, no site como imagem de bloco no fim da seção selecionada.

Economia: campo `economico: true` marca um modelo por provedor (Haiku, GPT-5.4 mini) no contrato do backend. O painel Ajustar com IA abre pré-selecionado no econômico, com dica honesta e escolha manual mantida. Nos dois wizards entra o interruptor "Aprimorar com IA", ligado por padrão. Ligado: fluxo atual, byte a byte (provado por snapshot). Desligado: o payload força o modelo econômico da tarefa (carrossel Haiku/GPT-5.4 mini; site Sonnet/GPT-5.6 Terra, o degrau do meio) e o prompt vira montagem: no carrossel um bloco anexado manda seguir o template sem inventar nada; no site o Bloco 1 de design é substituído por um estilo fixo da biblioteca (Grade de zinco), com Blocos 2 e 3 intactos.

## Por quê

O conserto de raiz do editor era portar o que o site já tinha, não remendar templates: qualquer template futuro com decoração `pointer-events:none` já nasce editável. O painel de camadas resolve a classe inteira de problemas de alcance (elemento atrás de elemento) sem depender do clique no canvas.

Na economia, a régua de preços justifica o desvio: a maioria dos ajustes é mecânica e o modelo barato resolve. A qualidade fica protegida por três muros: o modo caprichado não muda uma linha (teste de snapshot), o modo econômico é desvio explícito escolhido pelo usuário com expectativa ajustada na UI (inclusive aviso quando não há instruções), e o laço de conformidade de site continua auditando nos dois modos. O site econômico usa o degrau do meio porque não há template HTML pra copiar: no mínimo absoluto a qualidade despencaria.

Montagem 100% determinística sem IA não existe hoje e ficou como evolução futura se o modo barato se provar.
