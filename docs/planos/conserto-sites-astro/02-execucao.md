# Conserto Sites Astro: plano de execução

Regras de sempre (valem em todas as fases): português brasileiro, sem travessão "—" nem "·", frase curta, cores da UI só por tokens de `app/web/src/estilos/global.css`, tudo funciona nos 3 temas, NUNCA commit nem push. Raiz: `<raiz do repositorio>`. Servidores possivelmente no ar (4600 backend, 5173 Vite): não derrubar. Typecheck a partir de `app/`: `npm run checar -w web` e `npm run checar -w server`. Testes: `npm run testar -w server` e `npm run testar -w web`. Peças reais do Jesse são sagradas; a única peça que sessão de IA pode tocar é `estudio-aura/conteudo/2026-07-17-site-do-estudio-aura-estudio-de-design`.

Leia `01-checkup.md` inteiro antes de começar. As referências F1 a F6 abaixo são de lá.

## Fase 1: consertos sem IA (dono único, Opus)

Prompt pronto:

> Você é o dono do conserto da rodada Sites Astro do VKOS Hub. Leia docs/planos/conserto-sites-astro/LEIA-ME.md e 01-checkup.md inteiros e siga as regras de sempre. Sua missão são os itens F1 a F4, cirúrgicos: (1) F1: em templates/site/principios-visuais.md das QUATRO cópias (vkos2/, ojessegomes/, estudio-aura/, vkos/), a seção 2 deixa de listar as 13 direções inline e passa a apontar pra templates/design/cartela.md como fonte única das direções (20), preservando na seção as regras de escolha, os dials e o aviso anti-mistura; edite a seção, não reescreva o arquivo; as quatro cópias ficam idênticas nessa seção; (2) F2: corrigir #15846 pra #15846e nas 3 ocorrências de constelacao.md (linhas ~97, ~127, ~154), nas quatro cópias de templates/design/estilos/; (3) F3: adicionar /revisar-design e /refinar no mapa de comandos de vkos/CLAUDE.md, mesmo formato e mesma seção (Site & Páginas) que ojessegomes/CLAUDE.md usa; (4) F4: tokens --overlay-imagem-leve e --overlay-imagem-forte em global.css definidos nos 3 temas com os valores atuais (rgba(7,16,13,.28) e .58 no tema padrão; nos outros temas escolha valores coerentes com o fundo de cada um) e TelaSite.tsx linha ~241 passa a usar var(); confira que o overlay continua legível nos 3 temas. Ao final: npm run checar -w web e -w server limpos, npm run testar -w server e -w web verdes, grep confirmando zero #15846 de 5 dígitos e zero cartela inline remanescente, e relatório curto com diff resumido por item.

Portão da Fase 1: typechecks e testes verdes, greps limpos, relatório entregue.

## Fase 2: a peça de teste aprovada (UMA sessão real, F5)

1. Abrir a TelaSite da peça `2026-07-17-site-do-estudio-aura-estudio-de-design` (workspace Estúdio Aura ativo) e disparar o botão "Revisão de design" (que agora invoca /revisar-design). É a sessão real da rodada.
2. Quando concluir, conferir `GET /api/publicacao/2026-07-17-site-do-estudio-aura-estudio-de-design`: `auditoria.valido === true` (os 18 erros de contraste e reduced-motion resolvidos) e `modoPrevisto === "astro"`.
3. Se a auditoria ainda reprovar: NÃO gastar segunda sessão sem aval do Jesse. Reportar o que sobrou com os erros exatos e perguntar (opções: segunda revisão, ajuste manual guiado, ou regenerar).
4. Regressão rápida de página única: abrir no preview uma peça de site antiga de página única (ex: a de 2026-07-16 do site-guiado-v2 no Estúdio Aura) e conferir que renderiza normal (fluxo HTML puro intocado).

Portão da Fase 2: auditoria válida, modoPrevisto astro, screenshot da TelaSite sem pendências.

## Fase 3: publicação real de ponta a ponta (com o Jesse, F6)

Sem IA. Cada passo com aval do Jesse na hora. Pré-requisito: tokens de GitHub e Netlify configurados em Conexões no workspace Estúdio Aura.

1. **Netlify, primeira publicação**: publicar a peça aprovada. Conferir na resposta `modo: "astro"` e o aviso do sitemap pulado (primeira vez, sem URL conhecida). Abrir a URL pública: as 4 páginas navegam, styles e main.js carregam, `/robots.txt` responde.
2. **Netlify, republicação**: publicar de novo. Agora com a URL registrada, conferir `sitemap.xml` acessível na URL pública e referenciado no robots.txt. Conferir que o aviso de sitemap sumiu.
3. **GitHub**: publicar. Conferir no repo: `src/pages/` com as 4 páginas .astro, `src/layouts/Base.astro`, `public/` com assets, `package.json` com astro@5.18.2, `netlify.toml`, sem node_modules e sem dist. Prova de fogo opcional (recomendada): clonar o repo numa pasta temporária, `npm install && npm run build`, conferir que o dist local nasce com as 4 páginas.
4. Registrar o resultado honesto de cada passo (o que funcionou, avisos que apareceram, qualquer surpresa). Se o texto do aviso de sitemap se mostrar confuso na prática, anotar a frase melhor pra um ajuste pontual (não mexer no meio da fase).
5. Limpeza com aval do Jesse: o site e o repo de teste publicados podem ficar (vitrine) ou ser removidos; ele decide.

Portão da Fase 3: site Astro no ar pela Netlify com sitemap, repo GitHub buildável, matriz de veredito por passo.

## Fechamento

1. Se a Fase 3 pediu ajuste de mensagem do aviso de sitemap: aplicar (uma linha, dono da Fase 1) e revalidar com `ensaiar-astro`.
2. Atualizar `docs/contexto/roadmap.md` na linha da rodada de 2026-07-17: acrescentar "validado em publicação real em AAAA-MM-DD" com o resultado.
3. Atualizar `app/CONTRATO.md` só se algo mudou de comportamento (mensagem de aviso, por exemplo).
4. Avisar o Jesse com o resumo honesto e perguntar se pode apagar as pastas `docs/planos/sites-astro-e-design/` e `docs/planos/conserto-sites-astro/`.
