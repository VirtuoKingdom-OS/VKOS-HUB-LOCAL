# Cérebro opcional na criação visual e no Site Guiado

## Contexto

Gerar carrossel, post, story ou site exigia o Cérebro preenchido. A obrigação vinha de quatro camadas: a trava de 409 no `POST /api/sessoes`, os prompts do wizard que mandavam ler o Cérebro, as skills do workspace que chamavam `/instalar` quando ele estava em branco, e as portas de entrada que só ofereciam a entrevista. Alguns donos querem gerar uma primeira peça antes de montar a identidade, tanto pelo Cockpit quanto pelo Dashboard.

## Decisão

O Cérebro continua sendo o caminho recomendado e o padrão quando existe. Seguir sem ele passa a ser uma escolha explícita do usuário, carregada de ponta a ponta como contrato: o wizard declara, o servidor autoriza pelo flag `semCerebro`, o prompt neutraliza a leitura com um bloco de topo "MODO SEM CÉREBRO", e a skill ganha uma ressalva pra pular a leitura. Com o Cérebro preenchido, nada muda em lugar nenhum: os prompts do modo ligado ficam idênticos byte a byte (travado por fixture) e o flag é ignorado.

## Por quê

Um flag explícito, e não "o servidor deixa passar quando vazio", porque aba antiga ou bundle em cache continuariam gerando sem aviso e cairiam no buraco que a trava fecha (sessão concluída sem peça). Sem o flag, o comportamento atual fica preservado: 409 com a mensagem de montar o Cérebro. Compatível por construção. As skills existentes nos workspaces de clientes não são migradas: o prompt explícito prevalece sobre o passo genérico da skill, e a ressalva no seed é reforço pra workspaces novos.
