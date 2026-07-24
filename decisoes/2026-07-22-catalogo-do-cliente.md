# O que o cliente vê: catálogo enxuto e painel obediente às features

## Contexto

No primeiro uso real do 3.0, o painel do cliente mostrava o mesmo menu do CORE independente das features liberadas (desligar tudo só fazia as telas falharem ao carregar), e o catálogo oferecia a cliente coisas internas da operação do Jesse.

## Decisão

1. O painel do cliente (hub) mostra somente as features liberadas. Feature desligada some do menu e da rota, na hora. Workspace sem nada liberado mostra estado vazio digno.
2. São exclusivos do CORE e nunca aparecem pra cliente, independente de flag: Administração, Mapa (sistema e telas), Conexões e Automações. Automações e Conexões saem do catálogo de cliente (`disponivelParaCliente: false`).
3. Buscar leads deixa de depender de Conexões pro cliente: a credencial Apify é mediada pelo servidor (a chave vive com o Jesse). Sem credencial configurada, o recurso não aparece.
4. Slug de workspace é detalhe interno: gerado automaticamente a partir do nome, sem campo na interface.

## Por quê

- O painel do cliente é a vitrine do que ele contratou; mostrar módulo quebrado ou interno destrói a percepção de produto pronto.
- Conexões e automações mexem em credencial e infraestrutura, responsabilidade do Jesse, não do cliente.
- Slug e outros termos técnicos violam o princípio "funciona para leigo total".
