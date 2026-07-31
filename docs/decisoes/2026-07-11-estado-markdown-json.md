# Estado local em markdown e JSON

## Contexto
Opções: markdown/JSON como fonte da verdade, ou SQLite.

## Decisão
Estado do app em arquivos: JSON pra índice de sessões e configuração (pasta `app/dados/`), markdown onde couber. Nada de banco. As peças geradas ficam onde o VKOS já salva (`conteudo/`), o app só lê.

## Por quê
Coerente com a cultura do VKOS: versionável, inspecionável, zero lock-in. SQLite só entra como cache de índice se a biblioteca de peças crescer a ponto de doer, e nunca como fonte da verdade.
