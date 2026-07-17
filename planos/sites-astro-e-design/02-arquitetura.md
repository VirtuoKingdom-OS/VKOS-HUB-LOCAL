# Sites Astro e camada de design: arquitetura

Código auditado em 2026-07-17 por dois agentes. Referências arquivo:linha desta data; se o código andou, adaptar.

## O estado atual (o que as auditorias cravaram)

- `auditarSiteEstatico` (`app/server/src/vkos/siteEstatico.ts:192`) exige `index.html` na raiz (`:215`), proíbe `.md` fora de `anexos/`, `node_modules/`, `.git/` (`:24`, `:202-206`), confere referências relativas (`:236-262`). `paginas` = todos os `.html` da árvore, `index.html` primeiro.
- Classificação: `.html` restante vira site (`pecas.ts:158-160`). Previews = páginas da auditoria viradas em URLs `/pecas/<pasta>/...` (`pecas.ts:66-70`).
- Preview: `GET /pecas/*` serve a árvore crua, diretório vira `index.html` (`rotas.ts:669-734`). Editor: `/pecas-edicao/*` com scripts neutralizados; `PUT /api/vkos/pecas/:pasta/pagina/*` regrava página existente (`paginaSite.ts:64-92`).
- Publicação (`app/server/src/publicacao/`): `coletarArquivosPublicaveis` sobe a pasta crua menos internos (`arquivos.ts:43-56`); GitHub via REST blob a blob (`github.ts:84-155`); Netlify via ZIP REST (`netlify.ts:198-277`); barreira `exigirSitePublicavel` bloqueia se auditoria estrutural + visual reprova (`publicacao/rotas.ts:87-149`).
- Ajuste confinado: cwd = pasta da peça, proíbe npm install e escrita fora (`escopo-peca.ts:65-73`, `:144`). Nada disso muda nesta rodada.
- Prompt de site: `montarPromptSite` (`app/web/src/componentes/criacao/promptSite.ts:112-184`); design é 1 bullet (`:130`); multipágina definido em `formatoLinha` (`:15-23`); disparo sem escopoPeca, cwd = raiz do workspace (`AssistenteCriacao.tsx:139-147`, `sessoes/rotas.ts:145`).
- Design v2 (cartela 20, skills revisar-design/refinar, skill site v2) existe só em `vkos2/`. Workspaces reais têm skill site antiga e nenhum `templates/design/`.
- Node 20+ garantido pelo instalador (`CONTRATO.md:42`); o app não tem executor de npm/build. O preset "Revisão de design" existe na TelaSite (`TelaSite.tsx:76`).

## Peça 1: o contrato de marcadores no HTML gerado (dono B, prompt; dono A, leitura)

Todo site multipágina gerado passa a conter:

- `<nav data-vk-nav>` envolvendo a navegação compartilhada, idêntica em todas as páginas.
- `<footer data-vk-footer>` envolvendo o rodapé compartilhado, idêntico em todas as páginas.
- `<main data-vk-pagina>` envolvendo o conteúdo próprio de cada página.
- `<title>` e `<meta name="description">` únicos e específicos por página.
- Um único CSS principal (`styles.css` ou equivalente) referenciado igual em todas as páginas; JS opcional idem.

Atributos sem valor, invisíveis pra visitante, Studio e auditoria atual. Páginas de site de página única e bio também podem ter os marcadores (não custa), mas a conversão Astro só se aplica a multipágina.

## Peça 2: o conversor determinístico (dono A)

Novo módulo `app/server/src/publicacao/astro/conversor.ts`.

`converterParaAstro(pastaPeca: string): Promise<ProjetoAstro>`:

1. Roda `auditarSiteEstatico`; exige `valido: true` e `paginas.length > 1`. Caso contrário lança `ConversaoInviavel` com motivo legível.
2. Faz parse de cada página com `node-html-parser` (dependência nova do server: pequena, MIT, sem transitivas pesadas; instalada no workspace server normalmente). Extrai de `index.html`: o `<head>` compartilhado (charset, viewport, links de fonte, link do CSS), o `<nav data-vk-nav>` e o `<footer data-vk-footer>`. Exige os dois marcadores presentes em TODAS as páginas com conteúdo idêntico normalizado (espaços colapsados); divergência lança `ConversaoInviavel("navegação difere entre páginas")` etc.
3. Monta em `<pastaPeca>/.astro-build/`:
   - `src/layouts/Base.astro`: head compartilhado + props `titulo` e `descricao` + nav + `<slot />` + footer + link do CSS via caminho público.
   - `src/pages/<nome>.astro` por página: frontmatter importando o layout com o title/description daquela página, corpo = conteúdo do `<main data-vk-pagina>` (com o próprio `<main>`). `index.html` vira `index.astro`.
   - `public/`: todos os arquivos não-HTML da peça (CSS, JS, `img/`, fontes), preservando subpastas, exceto internos do Hub (mesma lista da auditoria).
   - `public/robots.txt`: permissivo padrão apontando pro sitemap.
   - `public/sitemap.xml`: gerado pelo próprio conversor (sem integração npm) com as URLs das páginas; só quando a URL pública do site é conhecida (Netlify já publicada ou informada); sem URL, pula o sitemap e registra aviso.
   - `astro.config.mjs`: `output: 'static'`, `build: { format: 'file' }`. O formato `file` faz o build emitir `sobre.html`, `contato.html` etc, preservando TODOS os links internos existentes sem reescrever nada. Zero reescrita de link é decisão de projeto.
   - `package.json`: nome derivado da pasta, `astro` pinado (versão exata escolhida pelo dono A ao montar o motor, registrada no relatório), scripts `dev`/`build`/`preview`.
   - `netlify.toml`: build `npm install && npm run build`, publish `dist`.
4. Qualquer falha de extração lança `ConversaoInviavel`; o chamador cai pro modo HTML puro. O conversor NUNCA modifica os arquivos da peça, só escreve dentro de `.astro-build/`.

`.astro-build` entra em `PASTAS_INTERNAS` (`siteEstatico.ts:24`): auditoria, previews, watch e coleta de publicação passam a ignorar a pasta. Uma linha mais testes.

## Peça 3: o motor de build compartilhado (dono A)

Novo módulo `app/server/src/publicacao/astro/motor.ts`.

- Morada: `app/dados/motor-sites/` com `package.json` mínimo (só `astro` pinado, a MESMA versão do conversor).
- `garantirMotor()`: se `node_modules/astro` existe e a versão bate, pronto. Senão roda `npm install` (spawn de `npm.cmd` no Windows, com `windowsHide`, timeout 180s, saída capturada). Sem internet ou falha: erro legível `MOTOR_INDISPONIVEL` que o chamador transforma em fallback HTML com aviso ("motor Astro não instalado; publicado como HTML puro").
- `buildarProjeto(pastaProjeto)`: spawna o binário do Astro do motor (`node_modules/.bin/astro` via node) com `build --root <pastaProjeto>`, timeout 120s (padrão da casa, como o render). Projeto é Astro puro sem dependências extras, então a resolução a partir do motor funciona; essa restrição é contrato. Erro traduzido `BUILD_FALHOU` com as últimas linhas do stderr.
- Pós-build, `conferirDist(pastaProjeto, paginasEsperadas)`: o conjunto de `.html` em `dist/` tem que bater um a um com as páginas da peça. Divergência aborta o modo Astro (fallback com aviso). É a garantia "o que você viu é o que sobe".

## Peça 4: a publicação com dois modos (dono A)

Em `publicacao/rotas.ts` e `arquivos.ts`:

- `resolverModoPublicacao(pastaPeca)`: `"astro"` quando a peça é site válido, multipágina e com marcadores em todas as páginas (checagem barata via conversor em modo inspeção ou regex nos marcadores); senão `"html"`.
- `GET /api/publicacao/:pasta` passa a devolver também `modoPrevisto: "astro" | "html"`. Contrato fixado pro dono B.
- `POST .../github` e `POST .../netlify`: barreira `exigirSitePublicavel` roda ANTES, sobre a peça HTML, como hoje (nada muda na auditoria). Depois:
  - modo astro: converter, garantir motor, buildar, conferir dist. GitHub sobe a árvore FONTE do `.astro-build/` (src/, public/, astro.config.mjs, package.json, netlify.toml; nunca dist/ nem node_modules). Netlify sobe o ZIP do `.astro-build/dist/`. Qualquer `ConversaoInviavel`/`MOTOR_INDISPONIVEL`/`BUILD_FALHOU`: cai pro modo html na MESMA requisição e registra o aviso.
  - modo html: comportamento atual intocado (`coletarArquivosPublicaveis` na pasta crua).
- Resposta dos POSTs ganha `modo: "astro" | "html"` e `avisos: string[]` (vazio quando limpo). O registro em `publicacoes.json` guarda o modo da última publicação.
- Rota interna de diagnóstico `POST /api/publicacao/:pasta/ensaiar-astro`: converte e builda SEM publicar, devolve `{ ok, modo, paginas, avisos }`. É a ferramenta do QA e do suporte; não aparece na UI.

## Peça 5: frontend e prompt (dono B)

1. `promptSite.ts` reestruturado, nesta ordem:
   - Bloco 1, O DESIGN VEM PRIMEIRO: ler `cerebro/cerebro.md`, `templates/site/principios-visuais.md`, `templates/design/cartela.md` e `templates/design/estilos/indice.md`; escolher UMA direção da cartela e UM estilo do índice que casem com o negócio; ler o arquivo do estilo escolhido INTEIRO; declarar no início do trabalho, em até 3 linhas: leitura de design, direção, estilo e por quê; aplicar o sistema do estilo (cores, escala tipográfica, spacing, motion) adaptado ao negócio; NUNCA citar a marca de origem do estilo em texto do site.
   - Visual personalizado (`promptSite.ts:107` hoje): as cores escolhidas pelo usuário substituem os tokens de COR do estilo; tipografia, spacing, motion e personalidade continuam vindo do estilo. Some o "ignore o design-guide".
   - Bloco 2: conteúdo e estrutura (o que já existe de tema, objetivo, seções, CTA, imagens).
   - Bloco 3, regras técnicas, compactado no fim: salvamento, nomes, caminhos relativos, proibições de arquivo, contrato do Studio, e os MARCADORES da peça 1 (obrigatórios em multipágina, com exemplo curto).
2. `TelaSite.tsx`: no `PainelPublicacao`, quando `modoPrevisto === "astro"`, badge discreto "Publica como projeto Astro" com uma frase de tooltip/apoio ("nav e rodapé viram layout único, com sitemap e robots"). Após publicar, exibir `avisos` da resposta (ex: fallback pra HTML) no padrão de aviso existente. Nada mais muda na tela.
3. Preset "Revisão de design" (`TelaSite.tsx:76`): o prompt do preset vira a invocação da skill `/revisar-design` (uma linha de contexto + o comando), contando que o dono C colocou a skill nos workspaces. Manter o preset funcionando igual por fora (mesmo botão, mesmo fluxo de sessão).
4. `EtapasSite.tsx`: só o texto do formato "completo" ganha meia frase ("publica como projeto Astro com sitemap"). Nenhuma mudança estrutural no wizard (o plano site-guiado-v2 já mexeu nele; não conflitar).

## Peça 6: a biblioteca de estilos e a propagação v2 (dono C)

1. `templates/design/estilos/` (nasce no vkos2, copiada pros workspaces reais):
   - 13 arquivos curados de `outros/designtypes/DESIGN*.md`. Cada um: título vira NOME NEUTRO (ex: "Caderno quente" pro estilo do Notion, "Diário de campo" pro da Anthropic, "Veludo neon" pro da Resend; o dono C batiza os 13 com nomes evocativos em português), remove a seção "Similar Brands" e qualquer menção à marca de origem, mantém integralmente: tokens de cor, tipografia (substitutos de fonte inclusos), spacing, componentes, do's and don'ts, superfícies, elevação, imagery e guia de motion. Traduzir só o essencial de instrução; tokens e valores ficam como estão.
   - `indice.md`: tabela com nome, tema (claro/escuro), vibe em uma linha, "quando usar" (tipo de negócio/energia), e a regra de escolha: UM estilo por site, escolhido pelo Cérebro e pelo tema, executado inteiro; misturar estilos é proibido (mesma lógica anti-mingau da cartela).
2. Propagação pros workspaces reais (`ojessegomes/`, `estudio-aura/`) e pro `vkos2/`:
   - `templates/design/cartela.md` (a de 20 direções do vkos2) copiada pros workspaces reais.
   - `templates/design/estilos/` completa nos três.
   - Skill de site: os workspaces reais recebem a skill v2 do vkos2 ADAPTADA (mantém o contrato de mensagem/estrutura atual deles, ganha os passos de design: ler cartela + índice de estilos, declarar a leitura, teste final "parece IA?").
   - Skills `/revisar-design` e `/refinar` copiadas do vkos2 pros workspaces reais; na revisar-design, acrescentar a conferência do estilo declarado (o CSS usa os tokens do estilo?).
   - `templates/site/principios-visuais.md` (nos três lugares): acrescentar uma seção curta "A biblioteca de estilos" explicando a relação (cartela dá personalidade, estilo dá o sistema concreto) e apontando pro índice. Editar a seção, não reescrever o arquivo.
3. Conferir se `vkos/` (referência externa) deve receber cópia; se a pasta existir e tiver `templates/`, replicar; senão registrar no relatório.

## Fronteiras dos donos (sem interseção)

- **Dono A (server):** `app/server/src/publicacao/**` (novos `astro/conversor.ts`, `astro/motor.ts`, mudanças em `rotas.ts`, `arquivos.ts`, `estado.ts` se precisar do modo), `app/server/src/vkos/siteEstatico.ts` (só `PASTAS_INTERNAS` + helper de marcadores se preferir lá), `app/server/package.json` (node-html-parser), testes do server. NÃO toca: prompt, telas, workspaces.
- **Dono B (web):** `app/web/src/componentes/criacao/promptSite.ts`, `EtapasSite.tsx` (só texto), `app/web/src/componentes/site/TelaSite.tsx` (badge, avisos, preset), API client se precisar do campo novo (`app/web/src/api/`), `site.css` se precisar de classe pro badge. NÃO toca: server, workspaces.
- **Dono C (design/workspaces):** `vkos2/templates/design/**`, `vkos2/.claude/skills/**` (só se precisar alinhar), `ojessegomes/templates/**`, `ojessegomes/.claude/skills/site|revisar-design|refinar/**`, `estudio-aura/` idem, `vkos/` se aplicável. NÃO toca: `app/`.

Contratos que permitem o paralelismo: os caminhos dos arquivos de design que o prompt do dono B referencia são os desta página (fixos); o payload de publicação que o dono B consome (`modoPrevisto`, `modo`, `avisos`) está fixado na peça 4. Divergência descoberta no meio: o executor arbitra.
