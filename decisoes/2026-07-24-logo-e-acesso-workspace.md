# Logo e acesso por workspace no CORE

## Contexto

A área Workspace listava os workspaces só por nome, status, motor e consumo. Não
dava pra distinguir um cliente do outro de relance nem ver, sem abrir o detalhe,
quem tinha login liberado em cada um.

## Decisão

Cada workspace ganhou uma logo e a lista passou a mostrar quem tem acesso. A logo
é escolhida no Gerenciar, rebaixada pra 256 px no navegador via canvas e guardada
como data URL numa coluna `logo` da tabela workspaces. Sem logo, a lista e o
detalhe mostram as iniciais do nome num quadrado menta. O acesso vem de um resumo
agregado na própria consulta de workspaces (`membros_resumo`, os emails e papéis
dos membros), então a lista não faz uma chamada por linha. Sem nenhum login, a
linha diz "Sem acesso liberado".

## Por quê

Guardar a logo como data URL na coluna evita montar rota de arquivo estático e
volume novo pra uma imagem pequena, e o rebaixamento no cliente mantém o banco
leve e ainda rasteriza SVG, descartando qualquer script embutido. Agregar os
membros na consulta que já lista os workspaces mostra o acesso na hora, sem N
chamadas nem estado extra no cliente. As duas coisas juntas dão identidade visual
e contexto de acesso na leitura da lista, que é onde o operador decide o que fazer.
