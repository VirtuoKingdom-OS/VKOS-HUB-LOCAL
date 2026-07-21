# Leads do Google Maps no CRM

## Contexto

O CRM recebia contatos apenas por cadastro manual. Foram avaliadas quatro fontes para prospecção: Google Places API, scraping direto, serviço especializado e API oficial com enriquecimento por sessão de IA. A API do Google não fornece email e seus Termos Adicionais restringem o uso dos dados para listas de email ou telemarketing. O scraping próprio teria manutenção e risco de bloqueio. O enriquecimento por IA seria mais lento e consumiria crédito por lead. Dados públicos de negócio ainda exigem finalidade legítima, transparência e uso responsável conforme a LGPD.

## Decisão

A busca usa a Apify com o Actor `compass/crawler-google-places`. O usuário configura o próprio token em Conexões. Cada busca tem limite explícito de 40 resultados e alimenta a lista separada de mineração, sem criar Contatos automaticamente. Nenhum contato é criado sem seleção e confirmação. A importação grava `origem: "google-maps:<placeId>"`, adiciona a tag `google-maps` e bloqueia duplicatas por telefone normalizado ou pela própria origem.

## Por quê

A Apify assume a operação do scraper e oferece um ecossistema aberto de Actors. Uma fonte futura pode usar outro Actor sem exigir outro modelo de conexão. Origem, tag e data de criação preservam a rastreabilidade. A confirmação manual e a deduplicação evitam gravações silenciosas e reduzem o risco de transformar o CRM em uma lista indiscriminada de disparo.
