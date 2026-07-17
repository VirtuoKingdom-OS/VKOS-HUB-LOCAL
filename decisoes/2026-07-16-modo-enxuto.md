# Modo enxuto nas sessões (ponytail destilado)

## Contexto

O Jesse trouxe o ponytail (regra open source MIT que força a solução mais simples que funciona e corta prosa, com benchmark de economia de tokens) e pediu integração com um cuidado: a regra pode mudar o estilo dos resultados, então precisa de um liga e desliga perto do gasto do cliente.

## Decisão

A regra foi reescrita em português e adaptada ao Hub (vale pra sessão de código e de conteúdo), na constante REGRA_MODO_ENXUTO de server/src/sessoes/modo-enxuto.ts. Um toggle "Modo enxuto" na sidebar, acima do bloco de custo, grava modoEnxuto na config global (default desligado). Na criação da sessão o gerenciador decide uma vez: modo ligado e skill diferente de carrossel e de site recebe a regra (Claude via --append-system-prompt, Codex via bloco <regras-da-sessao> no prompt). A decisão fica travada na sessão: retomada repete a injeção com que ela nasceu.

## Por quê

Sessão é paga por token e a maioria das sessões do Hub é utilitária (IDE, ajustes, fluxos): nelas, resposta direta e diff mínimo só ajudam. A geração guiada de site e carrossel fica fora porque lá o capricho visual é o produto e a camada de design manda o contrário. Default desligado porque mudar o estilo do resultado é gesto do usuário, não do app. Duas garantias na própria regra evitam o barato que sai caro: o entregável pedido vai sempre completo, e validação, tratamento de erro e acessibilidade nunca se cortam. Crédito: destilado do ponytail, MIT.
