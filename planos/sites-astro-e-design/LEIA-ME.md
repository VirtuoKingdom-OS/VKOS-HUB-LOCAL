# Plano: sites Astro na publicação e camada de design de verdade

Rodada com duas frentes:

1. **Astro na publicação, HTML como fonte da verdade.** Decisão do Jesse (2026-07-17): o site multipágina continua sendo HTML estático na pasta da peça, então preview, editor visual do Studio, Ajuste com IA e auditoria continuam funcionando exatamente como hoje. Na hora de publicar, um conversor DETERMINÍSTICO (sem IA, sem custo) transforma o HTML num projeto Astro de verdade: layout compartilhado extraído, uma página .astro por página HTML, sitemap.xml, robots.txt, netlify.toml. O GitHub recebe o projeto Astro fonte; a Netlify recebe o dist/ buildado por um motor compartilhado (uma instalação de Astro pra todas as peças). Site antigo ou sem marcação: fallback automático pra publicação HTML pura, como hoje. Nunca bloqueia.
2. **Camada de design que chega na geração.** A auditoria provou que as gerações saem genéricas por três quebras: o prompt trata o design como 1 bullet no meio de 150 linhas de encanamento, a camada v2 (cartela de 20 direções, skills /revisar-design e /refinar) vive só no vkos2 e nunca foi propagada pros workspaces reais, e nenhuma revisão anti-slop roda depois. Correção: prompt reestruturado com o design como PRIMEIRO passo obrigatório e declarado, biblioteca de 13 estilos de referência concretos (curados de outros/designtypes, com tokens, tipografia e motion completos) que a sessão escolhe conforme o Cérebro, camada v2 propagada, e o preset "Revisão de design" da TelaSite afiado com a skill nova. Revisão é manual (botão), decisão do Jesse pra não dobrar o custo por geração.

Pasta temporária. Pode ser apagada depois que a rodada executar e fechar, com aval do Jesse.

## Como executar

Quando o Jesse mandar, basta dizer:

> Execute o plano da pasta planos/sites-astro-e-design

O executor (a IA arquiteta da sessão) deve:

1. Ler os três arquivos na ordem: `01-visao.md`, `02-arquitetura.md`, `03-execucao.md`.
2. Verificar se os arquivos citados ainda existem como descritos (plano escrito em 2026-07-17, código auditado nesta data por dois agentes). Divergência pequena: adaptar. Divergência grande: avisar o Jesse antes.
3. Despachar a Fase 1 (donos A, B e C em paralelo, fronteiras sem interseção, contratos fixados no 02), depois o QA, com os prompts prontos do `03-execucao.md`.
4. Cumprir o checklist de fechamento.

## Estado

- Plano escrito em 2026-07-17, código auditado nesta data.
- Nada executado ainda.
- Custo estimado: 3 Opus na Fase 1 (paralelos), 1 Opus no QA. O QA tem direito a UMA sessão de IA real (uma geração de site multipágina completa, provando design declarado + marcadores + conversão).

## Regras duras da rodada

- O HTML da peça é a fonte da verdade. NADA do fluxo local muda de comportamento: preview, Studio, Ajuste com IA, auditoria, gravação de página. A conversão Astro acontece só na publicação, em pasta interna `.astro-build/` que o resto do app ignora.
- O conversor é determinístico. Nenhuma IA na conversão. Se a conversão não for viável (peça antiga, sem marcadores), a publicação cai pro modo HTML puro com aviso honesto, nunca bloqueia nem altera a peça.
- Motor de build compartilhado: UMA instalação de Astro em `app/dados/motor-sites/` serve todas as peças. Nunca node_modules por peça. Versão do Astro pinada.
- Peça publicada nunca diverge silenciosamente do preview: conferência pós-build compara o conjunto de páginas do dist com o da peça; divergência aborta a publicação Astro e cai pro fallback com aviso.
- Estilos de referência são direção estética, nunca clonagem: os arquivos curados perdem os nomes de marca nos títulos e o site gerado NUNCA cita a marca de origem nem clona logo. Insight de design sim, identidade alheia não.
- Licenças: os pacotes de outros/ usados como referência (impeccable Apache 2.0, taste-skill MIT, designtypes como descrições de estilo) são compatíveis. Twenty (AGPL) continua fora, ninguém abre.
- Dados e peças reais do Jesse são sagrados: gestos destrutivos de QA só em workspace de teste.

## O que NÃO entra nesta rodada

- Astro como fonte local (dev server, .astro editável no Hub): descartado por decisão, o HTML local é quem manda.
- Conversão de peças antigas em massa: peça velha sem marcadores publica como HTML puro, como sempre. Se o Jesse quiser "astroificar" uma peça antiga, regenera ou pede ajuste que adicione os marcadores.
- Revisão de design automática pós-geração: decidido manual (botão) pra não dobrar custo. Candidata a rodada futura se o botão provar valor.
- Content collections, .mdx, integrações npm extras no projeto Astro: o projeto gerado é Astro puro, zero dependências além do próprio Astro.
- Edição de texto best-effort no fonte Astro: sem objeto, o fonte local continua HTML e o Studio já funciona.
