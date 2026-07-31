# Anexos no Ajustar com IA

## Contexto

O pedido de ajuste de carrossel e site aceitava somente texto. Materiais de referência precisavam ser descritos, o que perdia precisão.

## Decisão

Cada peça recebe anexos em `conteudo/<peça>/anexos/`. O painel de ajuste envia os caminhos relativos no próprio pedido. A publicação ignora essa pasta.

Quando existe anexo, o pedido não passa pela heurística dedicada de geração de imagem. Ele segue sempre para o ajuste confinado. O prompt rotula o anexo como fonte preferencial: imagem pronta é copiada de `anexos/` para `img/` e referenciada no HTML; outra imagem não é gerada quando o arquivo atende ao pedido.

## Por quê

O escopo do ajuste permite leitura e escrita apenas dentro da peça. Guardar o material no workspace geral quebraria esse confinamento. O anexo é referência de IA, não ativo publicável do cliente.

O desvio também corrige a intenção: pedir para usar uma imagem enviada é edição com material fornecido, não autorização para criar um bitmap novo.
