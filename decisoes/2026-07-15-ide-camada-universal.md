# VKOS-IDE como camada universal

## Contexto

A IDE era uma rota comum. Abrir o comando mestre desmontava a tela de trabalho ou mudava o contexto visual que precisava ser corrigido.

## Decisão

Montar a IDE uma vez como uma camada contida sobre qualquer tela. A camada usa um painel central com limites de largura e altura, e não substitui visualmente a tela inteira. Fechar usa `visibility`, preservando arquivo, conversa e streams. Qualquer navegação normal fecha a camada para ela não permanecer sobre outra rota. Em telas compactas, Arquivos, Editor e Conversa viram abas locais e somente uma coluna aparece por vez. O chat mantém um controle único de motor, modelo e permissão para sessões novas.

## Por quê

O operador consegue corrigir qualquer parte do workspace e voltar exatamente ao ponto anterior, sem perder a referência da tela que estava usando. A navegação compacta impede overflow horizontal no celular. As regras da conversa ficam explícitas e não mudam uma sessão em andamento.
