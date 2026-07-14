# Nós de contexto tipificados e navegação lateral

## Contexto
O Jesse testou os nós de contexto e pediu três evoluções: o texto do nó como bloco de notas de verdade (redimensionável e com tela cheia centralizada, como no Notion), tipificação única por nó (o mesmo nome pode existir como tipo texto e como tipo imagens), e a UI geral mais familiar: menu na esquerda com a tela do cockpit e telas por fluxo mostrando o que já foi gerado.

## Decisão
1. Todo nó de contexto tem um tipo imutável, definido na criação: `texto` ou `imagens`.
   - Texto: bloco de notas. Redimensionável no canvas, tela cheia centralizada pra escrever com conforto, autosave contínuo.
   - Imagens: grade de miniaturas pra indexar referências visuais. Colar, arrastar ou botão. Lightbox e tela cheia em grade.
2. Pastas adotadas do disco inferem o tipo: tem imagem, vira `imagens`, senão `texto`.
3. A linha de referência no prompt indica o tipo: `- materiais/cockpit/<slug>/ (<nome>, tipo <tipo>)`.
4. Shell de navegação: menu lateral esquerdo fixo. Item Cockpit (o canvas) e seção Fluxos dinâmica: aparece um item por tipo de peça que existe (Carrossel, Stories, Site, Post). Cada item abre uma tela com as gerações daquele fluxo, agrupadas por pedido (a subpasta de conteudo/).
5. O painel recolhível de peças sai do cockpit: a galeria vive nas telas de fluxo.

## Por quê
Tipificar o nó deixa cada insumo com a interface certa (escrever não é o mesmo que indexar imagem) sem quebrar a economia de tokens: continua tudo virando arquivo em materiais/cockpit/. O menu lateral dá o padrão familiar de ferramenta que o público espera, e as telas por fluxo respondem a pergunta real do dono: "o que eu já gerei disso?".
