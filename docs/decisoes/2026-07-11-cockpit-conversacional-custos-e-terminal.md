# Cockpit conversacional, custos visíveis e terminal no canvas

## Contexto
O Jesse testou o cockpit de verdade e apontou: o popover do Cérebro fica fixo na tela em vez de acompanhar o canvas e não tem como fechar; o boot é obscuro (as coisas aparecem aos poucos, sem aviso); o nó de sessão esconde que existe uma conversa com IA acontecendo; não há visibilidade de custo nem escolha de modelo; o fluxo de carrossel ignora os modelos que o VKOS tem; e falta um terminal de verdade dentro do canvas.

## Decisão
1. Popover do Cérebro ancorado ao NÓ, não à tela: acompanha pan e zoom, vira pra cima quando não cabe embaixo, tem botão de fechar.
2. Botão de recarregar na moldura do cockpit (fora do canvas infinito): refaz a leitura de gerações, fontes, sessões e layout. Canvas mostra estado de carregamento no boot.
3. O nó de sessão é uma conversa: histórico de turnos (usuário e IA), campo de mensagem sempre disponível, streaming ao vivo. O backend grava a transcrição de cada sessão em `app/dados/transcricoes/` pra conversa sobreviver a reload.
4. Custo transparente: cada sessão mostra custo em dólar e tokens de entrada e saída. O total acumulado fica visível no shell. O modelo (Opus, Sonnet, Haiku) é escolhido no composer, com padrão configurável. Nunca mais gerar sem saber com o quê e por quanto.
5. O fluxo de carrossel expõe os modelos reais do VKOS (lidos de `templates/carrossel/estilos.md`) pra escolher o estilo antes de disparar.
6. Terminal de verdade no canvas: PTY real no backend (node-pty), xterm no frontend, criado pelo popover do Cérebro. Modo centralizado estilo Notion e dois visuais: Clássico (terminal cru) e Suave (dark no padrão VK, como o terminal do VSCode).

## Por quê
O produto é um cockpit de operação, não um formulário. Operação exige ver o que está acontecendo (conversa, custo, modelo), controlar (escolher modelo e estilo) e ter a saída de emergência do operador (o terminal). E popover que não acompanha o canvas é bug, não escolha.
