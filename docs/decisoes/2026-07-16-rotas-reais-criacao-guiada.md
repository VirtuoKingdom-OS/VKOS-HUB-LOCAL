# Rotas reais para a criação guiada

## Contexto

O Site Guiado vivia apenas em estado local dentro do Dashboard. Quando uma ação externa levava
para `#/dashboard`, a URL mudava sem carregar o assistente. O botão Voltar então recuperava a
tela anterior, muitas vezes um site já criado, porque o navegador nunca recebeu uma entrada que
representasse a criação.

## Decisão

Carrossel, post, story e site passam a ter rotas próprias em `#/criar/<tipo>`. O Shell monta o
Dashboard como base e o assistente correspondente por cima. A rota é a fonte da verdade para
abertura direta, atualização da página e navegação pelo histórico.

Ao abrir, o Shell registra um retorno interno seguro. Cancelar ou minimizar substitui a entrada
de criação pelo retorno. Concluir substitui a criação pelo Studio ou pela tela do site, evitando
que Voltar reabra um assistente encerrado. Destinos de recuperação, como Cockpit e Galerias,
também passam pelo Shell e não competem com o fechamento do modal.

## Verificação

As quatro rotas têm conversão reversível entre tela e hash. Tipos desconhecidos caem no
Dashboard. Rotas existentes de site e Studio continuam preservadas.
