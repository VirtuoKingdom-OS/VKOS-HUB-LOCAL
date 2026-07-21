# Leads do Google Maps: visão

## O problema

O CRM v2 já tem ficha de contato, negócio separado, linha do tempo e aba Hoje. O que falta é a primeira etapa do funil: **como o contato entra no CRM**. Hoje é sempre manual, um por um. Pra um dono de negócio que quer prospectar (achar clínicas, restaurantes, prestadores de serviço numa região), digitar cada um é o mesmo trabalho manual que ele já fazia antes de ter um CRM.

## A escolha do provedor, em detalhe

Avaliamos quatro caminhos com pesquisa de preço e de letra miúda atual (julho de 2026):

1. **Google Places API oficial**: não tem campo de email (nunca teve, não é limitação de preço, o dado não existe lá), e os Termos Adicionais do próprio Google proíbem "criar ou aumentar lista de email ou telemarketing" com os dados, mesmo vindos da API paga e mesmo pagando com crédito Google Cloud. Descartado como fonte principal porque o próprio contrato do fornecedor entra em conflito com o uso pretendido, e o risco contratual ficaria com o Jesse.
2. **Scraping direto via Playwright**: mais barato, mas Google bloqueia agressivamente com CAPTCHA, quebra a cada mudança de layout, e contradiz o princípio "geração verificada, não confiada" do Hub: um scraper instável falhando em silêncio no meio de uma importação em lote é o pior cenário possível pra dado de negócio.
3. **Serviço de terceiro (Apify, Outscraper)**: já fazem esse trabalho, entregam email e redes sociais como enriquecimento opcional, custo baixo (na casa de alguns dólares por 1.000 leads), e o risco contratual de scraping fica com o provedor, não com o VKOS Hub.
4. **Híbrido, API oficial mais enriquecimento por sessão de IA**: legalmente mais limpo, mas mais lento e consome crédito de sessão pra cada lead.

**Escolhido: opção 3, com Apify como provedor** (decisão do Jesse em 2026-07-20). O que pesou: a Apify é uma plataforma aberta de Actors, programas de extração publicados por qualquer um numa Store com milhares prontos. Começamos com o Google Maps Scraper mantido pela própria Apify (`compass/crawler-google-places`), e qualquer fonte futura (LinkedIn, Instagram, enriquecimento dedicado de contato) é só outro Actor na mesma conexão, sem provedor novo. O trade-off aceito: a API da Apify é assíncrona (dispara uma execução do Actor e busca o resultado quando termina), então a busca demora mais que uma chamada REST seca e o server precisa esperar a execução concluir. A arquitetura resolve isso mantendo a espera no server, com teto de tempo e mensagem honesta na tela.

## A experiência que queremos

1. O usuário abre uma aba nova dentro do CRM, "Buscar leads".
2. Digita o que procura: um termo livre tipo "padaria em Belo Horizonte" ou "clínica odontológica em Contagem".
3. Clica em buscar. A tela avisa que a busca pode levar até um ou dois minutos (o robô está visitando o Google Maps de verdade). Quando termina, uma lista aparece: nome do negócio, endereço, telefone, site, categoria, nota do Google. Quem já está no CRM (mesmo telefone) aparece marcado, pra não duplicar.
4. O usuário marca quem interessa (checkbox por linha, ou "marcar todos os novos").
5. Clica em importar. Os contatos escolhidos entram no CRM, com a tag `google-maps` e a origem registrada (de onde veio e quando).
6. Um aviso permanente na tela lembra: dado de fonte pública de terceiro, usar com responsabilidade, evitar tratar como lista de disparo em massa sem critério.

## O que NÃO muda

- O modelo de Contato e Negócio do CRM v2 não muda uma linha. Leads importados são contatos normais, só chegam com `origem` e `tags` preenchidos.
- Nenhuma automação nova de ação (enviar mensagem) nasce aqui. O evento de importação fica pronto pro barramento, mas a ação de "responder automaticamente" é rodada futura.
- O resumo do CRM que alimenta sessões de IA (`crm/resumo.ts`) já redige telefone e email de qualquer contato antes de compor o prompt. Leads importados passam pelo mesmo filtro sem trabalho extra.

## Critério de fechamento

- Busca de leads funciona de ponta a ponta com uma chave real da Apify: termo digitado, resultados aparecem, duplicata é detectada, importação cria os contatos certos com origem e tag.
- O token da Apify nunca aparece em claro fora do momento de configuração (mascarado nas respostas, ausente de log).
- Typecheck e testes verdes, 3 temas ok na tela nova.
- `CONTRATO.md`, `contexto/arquitetura.md` e `interno/mapa-sistema.json` refletindo a fonte de leads nova.
