# Astro como formato de publicação, HTML como fonte da verdade

## Contexto

Sites multipágina eram publicados como arquivos HTML soltos: sem sitemap, sem robots, nav duplicada por página, e o repositório no GitHub não era um projeto de verdade. Migrar a peça inteira pra fonte Astro quebraria preview, editor visual do Studio e o confinamento do ajuste (auditoria de 2026-07-17 mapeou 9 pontos de quebra).

## Decisão

O HTML da peça continua sendo a fonte da verdade local: preview, Studio, Ajuste com IA e auditoria não mudam. Na publicação, um conversor determinístico (sem IA) monta um projeto Astro em `.astro-build/` (pasta interna, ignorada pelo resto do app): nav e rodapé com marcadores `data-vk-nav`/`data-vk-footer` viram layout único, cada página vira `.astro`, com robots.txt, sitemap (quando a URL pública é conhecida), package.json com `astro@5.18.2` pinado e netlify.toml. Build num motor compartilhado em `app/dados/motor-sites/` (uma instalação pra todas as peças, npm install sob demanda). GitHub recebe a fonte Astro, Netlify recebe o dist zipado pelo caminho REST atual. `build.format: "preserve"` mantém todos os links `.html` sem reescrita. Peça sem marcadores, motor indisponível ou build falho: fallback pra publicação HTML pura na mesma requisição, com aviso. Conferência pós-build compara o dist página a página com a peça; divergiu, aborta o modo Astro.

O diagnóstico de modo aplica o mesmo contrato de nav e rodapé do conversor antes de anunciar Astro. Scripts diretos do body não precisam ser iguais: cada um é emitido com `is:inline` na página Astro de origem, o que preserva comportamentos exclusivos da home ou de páginas internas sem contaminar o layout compartilhado.

## Por quê

Zero quebra no fluxo local que já funciona, e o publicado ganha SEO e estrutura de projeto real. Conversor determinístico é grátis, instantâneo e fiel ao que o preview mostrou; falha vira bug reproduzível, não roleta de IA. O fallback garante que publicar nunca bloqueia.

Limitação conhecida: o layout compartilhado do site Astro publicado perde a marcação de link ativo (`aria-current`), removida na conversão.
