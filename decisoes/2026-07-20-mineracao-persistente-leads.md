# Mineração persistente de leads

## Contexto

A primeira versão mantinha a resposta da Apify apenas no estado da tela. Trocar de aba desmontava o componente e descartava resultados que já tinham consumido crédito. A grade de cartões também comprimia informações demais em larguras intermediárias.

## Decisão

Toda busca concluída é gravada em `leads.json` antes de responder ao frontend. A ferramenta mantém listas separadas de Minerados e Arquivados. Arquivar e excluir organizam somente a mineração; importar cria um Contato no CRM. O formulário mantém apenas o tipo de negócio como obrigatório e oferece localização, quantidade e enriquecimento de email como controles opcionais.

## Por quê

O resultado pago precisa sobreviver à navegação, recarga e reinício do Hub. Separar mineração de Contatos preserva a decisão humana sobre quem realmente entra no CRM. A lista em linhas adapta melhor nome, endereço, contato e ações sem parecer quebrada em telas estreitas.
