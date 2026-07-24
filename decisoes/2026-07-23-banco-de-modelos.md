# Banco central de modelos de carrossel

Data: 2026-07-23

## Contexto

Os modelos de carrossel viviam dentro de cada workspace. Um cliente novo recebia uma cópia da semente, mas modelos criados depois não chegavam aos clientes existentes. Atualizar todas as pastas seria destrutivo e misturaria a biblioteca do sistema com alterações locais.

## Decisão

O VKOS usa um banco central em filesystem, fora dos workspaces. Cada modelo guarda `modelo.html` e `modelo.json` em `app/dados/modelos-carrossel/<id>/`, ou no caminho definido por `DADOS_MODELOS`. Os ids começam com `b-`.

A lista do wizard une os modelos locais com os modelos centrais. O tipo do modelo controla se ele aparece em Capa, Páginas ou Fecho. Quando uma geração usa um modelo central, o servidor copia o HTML para o workspace antes de criar a sessão. A IA continua lendo um arquivo local.

O CORE administra o banco na área Banco visual. O operador pode colar HTML pronto ou gerar uma cópia reutilizável a partir de uma imagem de referência. O resultado gerado pode ser refinado no Studio antes de entrar no banco.

## Por quê

A cópia no uso distribui modelos novos sem alterar workspaces que não os escolheram. Também preserva o contrato atual das skills, mantém a geração independente do armazenamento central durante a execução e evita que a exclusão de um modelo apague arquivos de clientes.

O filesystem é suficiente porque o conteúdo é um artefato versionável e o CRUD pertence somente ao operador. CORE e Hub montam a mesma pasta central para que a listagem, o preview e a cópia funcionem nos dois processos.
