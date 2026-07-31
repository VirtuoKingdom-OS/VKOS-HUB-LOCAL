# Contrato visual de sites ponta a ponta

## Contexto

Os três formatos do Site Guiado já recebiam o guia visual v2, mas a garantia terminava no prompt.
A revisão de design rodava confinada dentro da peça e tentava ler um arquivo fora desse limite. O
deploy verificava CSS, recursos e overflow, mas não aplicava as regras visuais que a geração dizia
seguir. A skill /site ainda descrevia uma entrega antiga em Markdown.

## Decisão

A skill /site passa a ser code-first no VKOS Hub e cobre página única, site com páginas e link na
bio. marca/conversao.md vira apoio opcional. A clonagem inclui a pasta marca quando existir. O
prompt comum respeita a intensidade de motion escolhida e separa links de navegação dos botões de
ação local.

A Revisão de design passa a revisar o site inteiro. O servidor lê principios-visuais.md antes de
confinar a sessão, injeta o documento integral no prompt e autoriza editar todas as páginas e os
recursos compartilhados que já estejam dentro da peça.

A publicação ganha uma barreira visual determinística. Todas as páginas são abertas em 390 px e
1440 px, percorridas até o fim e verificadas também sem JavaScript e com prefers-reduced-motion.
Bloqueiam o deploy: CSS ou recurso quebrado, overflow, conteúdo invisível, contraste insuficiente,
wrapper genérico no body, menu com semântica errada, destino desativado inválido, pointer-events
usado para desativar, imagem externa, gradient text, grade extensa de cards idênticos e caracteres
de separação proibidos. Backdrop-filter, borda lateral grossa e excesso de eyebrow geram avisos.

Arquivos Markdown são proibidos pela auditoria estrutural e excluídos da árvore publicável. A
consulta do painel Publicar executa a mesma auditoria completa do clique de deploy. O resultado é
reutilizado por dois minutos somente quando caminho, tamanho e data de modificação de todos os
arquivos continuam idênticos.

## Por quê

Orientação de prompt melhora a probabilidade, mas não garante saída. O contrato precisa ser igual
na geração, na revisão, no preview e na publicação. As verificações bloqueantes foram limitadas a
sinais determinísticos e os padrões mais contextuais ficaram como aviso, reduzindo falso positivo
sem deixar o deploy aceitar defeitos objetivos.
