# Checkup de 2026-07-17: o que está saudável e o que falta

Verificado no código e nos arquivos reais nesta data, depois da rodada sites-astro-e-design fechada (com os bugs 1, 2 e 5 do QA já corrigidos e revalidados).

## Confirmado saudável (não retrabalhar)

1. **Server**: `npm run checar -w server` limpo, `npm run testar -w server` com 64 testes verdes, incluindo os testes de regressão dos 3 bugs do QA.
2. **Pipeline Astro real**: `ensaiar-astro` na peça real do QA (`estudio-aura/conteudo/2026-07-17-site-do-estudio-aura-estudio-de-design`, com main.js e aria-current) devolve ok, modo astro, 2,7s, dist batendo página a página, fonte limpa sem node_modules/dist.
3. **Motor**: `app/dados/motor-sites/` com astro@5.18.2 instalado (cache quente) e coberto pelo `.gitignore` (linha `app/dados/`).
4. **Sitemap**: fiação correta. `prepararAstro` recebe `urlPublicaConhecida(alvo)` (publicacao/rotas.ts, ~linha 227 e 264): primeira publicação sai sem sitemap com aviso, republicação depois da primeira inclui o sitemap. Comportamento desenhado, não bug.
5. **Skill de site v2 dos workspaces**: cita `templates/design/cartela.md` e `templates/design/estilos/indice.md` e exige a declaração (conferido em ojessegomes/.claude/skills/site/SKILL.md linhas 28 a 33).
6. **Prompt design-first**: 10/10 testes do web verdes, typecheck limpo, incluindo o endurecimento de contraste de texto secundário e reduced-motion aplicado pós-QA.
7. **Web servido**: build atual na 4600 (hash index-B_u7YRhS conferido via curl).
8. **CLAUDE.md de ojessegomes e estudio-aura**: já listam `/revisar-design` e `/refinar` no mapa de comandos.
9. **Contexto e decisões**: CONTRATO.md, docs/contexto/arquitetura.md, docs/contexto/roadmap.md, interno/mapa-sistema.json e as duas decisões de 2026-07-17 registrados.

## O que falta (o objeto deste plano)

### F1. Conflito de cartela: 13 inline contra 20 no arquivo

`templates/site/principios-visuais.md` dos workspaces mantém a cartela ANTIGA de 13 direções inline na seção 2 (conferido em ojessegomes, linha 39 em diante, "### As direções"), enquanto `templates/design/cartela.md` (propagado nesta rodada) traz as 20. A skill de site manda ler os dois. Uma sessão obediente encontra duas cartelas divergentes e escolhe qualquer uma. Conserto: a seção 2 do principios-visuais passa a apontar pra cartela.md como fonte única das direções (mantendo as regras de escolha e os dials), nas 4 cópias: vkos2, ojessegomes, estudio-aura, vkos.

### F2. Hex quebrado no estilo Constelação

`constelacao.md` traz `#15846` (5 dígitos, inválido) em 3 ocorrências (linhas ~97, ~127, ~154), sendo que a tabela de tokens do mesmo arquivo traz o valor correto `#15846e` (Deep Verdant). Herança de bug da origem, preservada pela curadoria. Conserto: corrigir pra `#15846e` nas 3 ocorrências, nas 4 cópias.

### F3. vkos/CLAUDE.md sem as skills novas

`vkos/CLAUDE.md` existe e não menciona `/revisar-design` nem `/refinar` (grep devolve 0), mas o vkos/ recebeu as skills na propagação. Conserto: adicionar as duas linhas no mapa de comandos, no mesmo formato usado em ojessegomes/CLAUDE.md (seção Site & Páginas).

### F4. Cor hardcoded na TelaSite

`app/web/src/componentes/site/TelaSite.tsx:241`: `linear-gradient(rgba(7,16,13,.28),rgba(7,16,13,.58))` no overlay de imagem gerada. Funcional (escurece imagem pra leitura), mas fora de token e igual nos 3 temas. Conserto: token novo em global.css (ex: `--overlay-imagem-leve` e `--overlay-imagem-forte`, definidos nos 3 temas) e a linha passa a usar `var()`. Baixa prioridade, entra porque é barato.

### F5. A peça de teste ainda reprova a auditoria visual

A peça do QA tem 18 erros de auditoria visual: contraste abaixo de 4.5:1 em textos secundários (.hero-nota 2.93, .cta-nota 2.55, .footer-local 2.93, .footer-copy 1.52) e reduced-motion não zerando movimento. Isso bloqueia a publicação dela (a barreira está funcionando como desenhada). O prompt já foi endurecido pra futuras gerações; a peça existente precisa da Revisão de design (o botão da TelaSite, que agora invoca a skill /revisar-design completa). É também a prova de fogo do botão afiado.

### F6. Publicação real nunca rodou

O modo Astro foi provado até o build local (ensaiar-astro). Falta a prova com o mundo real: publicar a peça aprovada na Netlify (dist) e no GitHub (fonte Astro) com os tokens do Jesse, conferir a URL pública no ar, o repo buildável, e a republicação incluindo o sitemap.

### Observações fora de escopo (registrar, não agir)

- O aviso de sitemap pulado na primeira publicação existe por contrato; conferir na Fase 3 se o texto orienta a republicar, e só ajustar a mensagem se estiver confusa na prática.
- A limitação do aria-current (link ativo some no site Astro publicado) é decisão registrada, não pendência.
- Sites de página única e bio seguem no fluxo HTML puro intocado; a Fase 2 aproveita pra conferir por cima que nada regrediu neles (abrir uma peça antiga de página única no preview).
