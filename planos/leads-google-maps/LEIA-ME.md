# Plano: leads do Google Maps no CRM

Rodada que adiciona uma fonte de leads nova: buscar negócios no Google Maps via Apify, pré-visualizar os resultados e importar os escolhidos direto pro CRM, com tags e origem marcadas.

## Contexto da decisão

Comparamos quatro caminhos (registrado em `decisoes/2026-07-18-leads-google-maps.md`): API oficial do Google Places (sem campo de email, e os próprios Termos Adicionais do Google proíbem usar os dados pra montar lista de email ou telemarketing, mesmo vindo da API oficial e mesmo com crédito Google Cloud sobrando), scraping direto via Playwright (descartado, risco de bloqueio e contradiz "geração verificada, não confiada"), serviço de terceiro (mais rico, risco contratual fica com o provedor), e um híbrido de API oficial mais enriquecimento por sessão de IA (mais lento, gasta crédito de sessão).

Decisão do Jesse: **serviço de terceiro, com Apify como provedor**. A Apify tem um ecossistema aberto de Actors (qualquer um publica, milhares prontos na Store): se um dia quisermos outra fonte (LinkedIn, Instagram), é trocar de Actor, não de provedor. O Actor de partida é o Google Maps Scraper da própria Apify (`compass/crawler-google-places`), que devolve nome, endereço, telefone, site, categoria, nota e avaliações, com enriquecimento opcional de email visitando o site do negócio. O custo de scraping e a letra miúda ficam do lado da Apify, não do Hub. A integração fica isolada em `leads/apify.ts`: trocar de provedor depois é um módulo novo, não uma reescrita.

## O que entra

1. **Apify como conexão nova**: entrada no catálogo de Conexões, token do usuário, sem servidor MCP (é API REST pura, consumida direto pelo server, no mesmo padrão de GitHub e Netlify na publicação).
2. **Busca de leads**: o usuário digita um termo (tipo "padaria em Belo Horizonte"), o server dispara o Actor na Apify, espera o resultado e devolve uma lista normalizada, sem gravar nada ainda. A busca pode levar de segundos a um ou dois minutos: a tela avisa isso de forma honesta.
3. **Pré-visualização com detecção de duplicata**: a lista mostra nome, endereço, telefone, site, categoria e nota, marcando visualmente quem já está no CRM (por telefone).
4. **Importação seletiva**: o usuário marca quem quer, um clique cria os contatos escolhidos no CRM, com `origem: "google-maps:<place_id>"` e a tag `google-maps` automática.
5. **Aviso de responsabilidade**: a tela deixa claro que os dados vêm de fonte pública de terceiro e que o uso pra contato precisa respeitar a LGPD (dado de negócio, não dado pessoal de indivíduo).

## O que fica de fora desta rodada

- **Outros Actors da Apify** (LinkedIn, Instagram, enriquecimento de contato dedicado): a fundação fica pronta, cada fonte nova é rodada própria.
- **Automação de mensagem de boas-vindas pro lead importado**: o motor de automações hoje só tem a ação `calendar:criar-evento`; criar uma ação de mensagem (WhatsApp, email) é rodada própria. O evento de importação já fica disponível pro barramento, pronto pra quando essa ação existir.
- **Enriquecimento por sessão de IA**: fica como aprimoramento futuro, não entra nesta rodada.
- **Deduplicação retroativa**: a rodada não varre o CRM existente procurando duplicata antiga, só evita duplicata nova na importação.

## Como executar

Quando o Jesse mandar, basta dizer:

> Execute o plano da pasta planos/leads-google-maps

O executor deve:

1. Ler `01-visao.md` e `02-arquitetura.md` inteiros antes de começar.
2. Verificar se os arquivos citados ainda existem como descritos (código auditado em 2026-07-18). Divergência pequena: adaptar. Divergência grande: avisar o Jesse antes.
3. Seguir as fases do `03-execucao.md` em ordem: Dono A (backend: conexão, busca, importação, eventos), Dono B (frontend: tela de busca, conexão no painel), QA de gesto real.
4. Cumprir o checklist de fechamento.

## Estado

- Plano escrito em 2026-07-18, código auditado nesta data. Provedor trocado de Outscraper pra Apify em 2026-07-20 por decisão do Jesse.
- Executado em 2026-07-20. No mesmo dia, o uso real mostrou que resultado apenas na memória da tela desperdiçava crédito ao trocar de aba. A decisão posterior em `decisoes/2026-07-20-mineracao-persistente-leads.md` substitui a pré-visualização descartável por listas persistentes de Minerados e Arquivados. O contrato atualizado está em `app/CONTRATO.md`.
- Custo estimado: 1 Opus pro backend, 1 Opus pro frontend (podem rodar em paralelo, fronteiras sem interseção), 1 Opus no QA. Zero sessão de IA real (a feature inteira é determinística, sem geração).
- Custo de operação: a Apify tem plano gratuito com cota mensal de crédito, e o Actor de Google Maps custa na ordem de poucos dólares por 1.000 lugares. É custo do usuário final, pago com a própria conta dele, igual GitHub e Netlify hoje.

## Regras duras da rodada

- O token da Apify nunca aparece em log nem em resposta sem máscara, seguindo o padrão que já existe em Conexões.
- Nenhum dado é gravado no CRM sem o usuário marcar e confirmar a importação. A busca é sempre só pré-visualização.
- Todo contato importado carrega a origem e a data de captura, pra rastreabilidade (registro do dado sagrado, no mesmo espírito do resto do CRM).
- Duplicata por telefone bloqueia a criação de um novo contato; a tela avisa e deixa o usuário decidir pular ou revisar.
- Peças e dados reais do Jesse (workspaces OJESSEGOMES e Estúdio Aura) são sagrados: qualquer teste de importação roda em workspace de teste.
- A busca tem teto de resultados por chamada (o Actor cobra por lugar devolvido): o server sempre manda um limite explícito pro Actor, nunca busca sem teto.
