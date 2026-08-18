# VKOS Hub, architecture

> English overview for readers from outside the project. The canonical and more
> detailed Portuguese document is [`docs/contexto/arquitetura.md`](contexto/arquitetura.md).
> Where the two disagree, the Portuguese one wins.

## What this is

VKOS Hub is a local-first multi-AI workspace. A Node server (Fastify,
TypeScript) runs on `127.0.0.1:4600` on the user's own machine, serves a React
frontend built with Vite, and orchestrates AI coding CLIs (Claude Code or
Codex) as child processes. Every AI session it spawns reads the same markdown
file, the Cérebro, which holds the identity of the business. The target user is
a business owner or service provider, not a developer: the orchestration is
infrastructure, the visible product is the work getting done.

## Local-first, and what that forces

There is no hosted backend, no telemetry, no remote account, no user database.
The server binds to loopback and the browser talks to it over `http://localhost`.
The architectural consequences are not cosmetic:

- **No server-side identity.** Nothing to authenticate against, so there is no
  session token, no login screen, no multi-tenant isolation problem at the
  network layer. Isolation is a filesystem concern instead.
- **The user's credentials never reach the Hub.** The Hub does not store an API
  key for any AI provider. It spawns the official CLI, which is already logged
  in on that machine. This is a hard rule, not a default.
- **The filesystem is the database.** State is JSON and JSONL under `app/dados/`,
  content is markdown and HTML inside the workspace folder. There is no SQLite,
  no ORM, no migration engine, only idempotent boot-time migrations that never
  delete a record.
- **Process death is total.** No orchestrator restarts the server, so
  `server/src/nucleo/rede.ts` installs `unhandledRejection` and
  `uncaughtException` handlers that log and do not exit. Node 20 kills the
  process on an unhandled rejection by default, and a dead process means every
  running AI session dies with it.
- **Third-party integrations are the user's own accounts.** Each connection is
  a credential the user pastes or authorizes, kept in a local file.

```
      Browser (React + Vite)
              |
              |  HTTP /api  +  WebSocket /ws     (localhost only)
              v
      Fastify server, 127.0.0.1:4600
        |            |                 |
        |            |                 +--> app/dados/       app state
        |            |                 +--> VKOS workspace/  business content
        |            |
        |            +--> child processes: claude -p / codex exec
        |
        +--> static: the built frontend, and the generated pieces
```

## The Cérebro

The Cérebro (Portuguese for "brain") is a single markdown file,
`cerebro/cerebro.md`, inside each workspace folder. It is structured in 13
blocks and describes the business: voice, audience, offer, positioning,
direction. It is plain text, human readable and version controllable.

Every AI session the Hub launches gets that file as context. That is the whole
point of the project. Comparable multi-AI canvases give you several models on
one board, each starting from zero and knowing nothing about the business. Here
the board has one shared memory, so a session that generates a carousel, a
session that writes a landing page and a session that drafts an ad campaign all
speak with the same voice without the user restating anything.

Practical consequences in the code:

- The Cérebro is editable from inside the app (`GET` and `PUT /api/vkos/cerebro`),
  written atomically, with an automatic backup before the first write of each
  boot.
- Guided creation flows are blocked while the Cérebro is blank. A generator with
  no identity to read produces generic output, so the app refuses instead.
- Sessions that run confined inside a piece folder cannot reach
  `cerebro/cerebro.md` by path, so the server embeds the Cérebro text into the
  prompt for those.
- "Filled in" has a declared heuristic: no `## ` block may be empty, where empty
  means it has no line besides the title, a separator, blank lines and lines
  carrying the pencil marker.

## Two scope levels: CORE and WORKSPACE

```
CORE        The owner's level. Does not change when you switch projects.
            Dashboard, Workspaces, CRM, Connections, Styles, Assistant, Map.
            State lives in app/dados/ directly.

WORKSPACE   The project level. One per client or brand, and each one is a
            complete VKOS folder on disk.
            Home, Cockpit, Content, Data sources, and the IDE layer.
            State lives in app/dados/workspaces/<id>/.
```

The split is declared in code, in `web/src/componentes/layout/rotas.ts`, as
`TELAS_CORE`, `TELAS_WORKSPACE` and `nivelDaTela`, with a test that locks which
screen belongs where. The sidebar shows one level at a time.

Workspace data never leaks into another workspace. The canvas layout, the
contexts, the session index, the cost ledger and the transcripts are all
resolved per call from the active workspace id, never cached across a switch.
The live stream follows the same rule: since 2026-07-27 every session event
(`sessao:evento`, `sessao:status`, `sessao:conferencia`, `sessao:ferramenta`)
goes out through `transmitirPara(workspaceId, ...)` and reaches only the tabs
that declared that workspace. Before that, a raw provider stream carrying the
Cérebro and file excerpts was broadcast to every tab and the frontend was
trusted to filter. Only genuinely global notifications stay on broadcast:
`workspace:ativado`, `pecas:atualizadas`, `cerebro:atualizado`, `crm:atualizado`.

The CRM and the Connections catalog are deliberately CORE, not per workspace:
they belong to the person running the Hub, not to the clients being served.

## Stack

Versions are the ranges declared in the `package.json` files. Repository
version is 1.5.0.

Server (`app/server`):

| Package | Range | Role |
| --- | --- | --- |
| `fastify` | ^5.0.0 | HTTP server |
| `@fastify/websocket` | ^11.0.0 | live streaming to the browser |
| `@fastify/static` | ^10.1.2 | serves the built frontend and generated pieces |
| `@fastify/multipart` | ^9.0.0 | file uploads |
| `@fastify/cors` | ^10.0.0 | CORS |
| `zod` | ^3.25.0 | shape validation of AI output and request bodies |
| `playwright-core` | ^1.61.1 | headless rendering and the visual audit |
| `node-html-parser` | 6.1.13 | static HTML analysis |
| `archiver` | ^7.0.0 | ZIP export |
| `typescript` | ^5.6.0 | language |
| `tsx` | ^4.19.0 | runs TypeScript directly, in dev and in production |

Web (`app/web`):

| Package | Range | Role |
| --- | --- | --- |
| `react` / `react-dom` | ^19.0.0 | UI |
| `@xyflow/react` | ^12.3.0 | React Flow, the node canvas of the Cockpit and the Map |
| `react-markdown` + `remark-gfm` | ^10.1.0 / ^4.0.1 | markdown rendering |
| `vite` | ^6.0.0 | dev server and bundler |
| `typescript` | ^5.6.0 | language |

Notable absences, all intentional: no Electron or Tauri (the shell is a local
web app), no CSS framework, no component library, no state management library,
no test framework beyond the Node built-in test runner (`node:test` through
`tsx --test`), no CDN for anything. The Geist font is vendored into
`web/src/fontes/` with its SIL OFL 1.1 license next to it, so the app does not
depend on a network font or on one being installed.

## Repository layout

```
app/                          the product. The folder name is fixed: the
  server/                     installer and workspaces/integrado.ts look for
    src/                      app/ sitting next to VKOS/
      index.ts                entry point, registers every route plugin
      tipos.ts                shared contract types
      nucleo/                 transport: ws.ts, spa.ts, rede.ts
      <module>/               one folder per domain, always with rotas.ts
  web/
    src/
      estilos/                the foundation shared by everyone:
                              global.css, primitivas.css, externo.css,
                              visual-hub.css, canvas.css, plus the lock tests
      componentes/<area>/     the component and its own stylesheet, together
      api/                    one HTTP client module per area
      fontes/                 the embedded Geist files
vkos-modelo/                  the VKOS workspace template that ships with the
  cerebro/                    repository: blank Cerebro, the 33 commands under
  .claude/skills/             .claude/skills/, carousel, stories and site
  templates/                  templates, the design layer. Seeded, never edited.
workspaces/                   git-ignored. One folder per business, seeded from
                              vkos-modelo/ on the first start.
docs/
  contexto/                   the living context, read before acting
  decisoes/                   one decision per file, 129 of them
  planos/                     round plans, deleted once executed
interno/                      data the running app READS. Not documentation.
ferramentas/                  checking scripts, outside the product
```

Four rules follow from that layout:

1. **A stylesheet lives next to the component it dresses.** `crm.css` sits in
   `componentes/crm/`. Only genuinely shared CSS goes in `estilos/`. The cascade
   and scale lock tests sweep all of `web/src` through `estilos/folhas.ts`, so a
   new stylesheet anywhere is covered from birth.
2. **A server module is a folder with a `rotas.ts`**, never a loose file at the
   root of `src/`. New module ships with `estado.ts`, `rotas.ts` and a test, and
   is registered in `app/server/src/index.ts`.
3. **`interno/` is not `docs/`.** `mapa/rotas.ts` reads those JSON files at
   runtime and serves them to the Map screen. Documentation is what you read,
   this is what the app loads.
4. **`vkos-modelo/` is a seed, not a workspace.** `workspaces/integrado.ts`
   copies it into `workspaces/meu-negocio/` on a first start and opens the copy.
   Nothing ever writes back into the template, so it stays versioned and
   business data stays in the git-ignored `workspaces/`. A `VKOS/` or `vkos/`
   folder next to `app/`, which is what the Windows installer lays down, takes
   precedence and is adopted in place.

## Server modules

Every folder below is under `app/server/src/`. Those marked with a route plugin
export a `FastifyPluginAsync` registered in `index.ts`.

| Module | What it does |
| --- | --- |
| `nucleo/` | Transport and process safety: `ws.ts` (WebSocket broadcast and per-workspace delivery), `spa.ts` (which paths get `index.html`), `rede.ts` (the process-wide error net) |
| `sessoes/` | The AI session orchestrator: spawn, resume, streaming, the 5-session concurrency limit, cost per turn, transcripts, piece-scoped sessions, the site conformity loop |
| `provedores/` | The provider contract and its adapters, `claude.ts` and `codex.ts`, plus the model and price catalog and the skill helpers |
| `vkos/` | The bridge to a VKOS folder: reads and writes the Cérebro, lists skills and pieces, serves piece files, guards the piece-folder boundary |
| `workspaces/` | The workspace registry: list, create, activate, rename, remove, clone; boot migrations; the cover color list |
| `core/` | The CORE reading, `GET /api/core/resumo`: total AI spend across every workspace including deleted ones, and the state of each project |
| `crm/` | The single CORE-level CRM v4: contacts, deals, funnel columns, interactions, the live notification, the merge of legacy per-workspace CRMs |
| `mensagens/` | Conversations attached to CRM contacts, append-only JSONL, one file per conversation, with a channel contract mirroring the provider contract |
| `leads/` | Google Maps lead mining through Apify, persisted in `leads.json` so a search survives navigation |
| `formulario/` | The inbound counterpart: reads the site form submissions from a Supabase `public.leads` table |
| `conexoes/` | The single connection catalog and credential store, at CORE level, secrets masked on the way out |
| `instagram/` | The only two-way integration: account metrics in, publishing out, over the Instagram API with Instagram Login |
| `anuncios/` | The ad campaign piece: Zod schema, character limits as a pure function, the prompt contract next to the schema, and its conformity loop |
| `publicacao/` | Local export: opens the piece folder in the system file manager, or ships a ZIP, gated by the deterministic quality audit; Astro conversion for valid multipage sites |
| `estilos/` | The Style Creator: contrast ruler, token derivation, style state and routes |
| `assistente/` | The Hub Assistant: a persistent CORE session, the curated briefing, the append-only task queue and the effect trail |
| `ide/` | The file IDE, rooted at the installation root, with `app/dados` cut out of the tree and answering 403 on every operation |
| `canvas/` | Persists the Cockpit canvas layout per workspace, treating the JSON as opaque |
| `contextos/` | Context nodes and their attachments |
| `anexos/` | Universal composer attachments, saved under the VKOS folder and referenced by relative path in prompts |
| `geracao/` | Prompt construction for the guided flows: carousel, site, ad |
| `ambiente/` | Onboarding and setup: engine detection, WinGet install of the missing CLI, official login, the folder browser |
| `config/` | Global app configuration |
| `eventos/` | The typed event bus with an auditable per-workspace `eventos.jsonl` log |
| `mapa/` | Serves the curated `interno/mapa-sistema.json` and `interno/mapa-telas.json`, validated with Zod |
| `util/` | Shared helpers: atomic JSON write, JSONL append, quarantine, log rotation, project root resolution, phone normalization |

## The AI session orchestrator

A session is a child process. The Hub does not embed an SDK and does not hold a
provider key. It runs the CLI the user already installed and authenticated.

```
POST /api/sessoes            gerenciador.ts            provedores/claude.ts
   |                              |                            |
   |-- create session ----------->|                            |
   |                              |-- spawn ------------------>| claude -p
   |                              |                            |   --output-format
   |                              |   prompt via stdin ------->|   stream-json
   |                              |                            |
   |                              |<-- JSON lines, one event --|
   |                              |                            |
   |<== WebSocket sessao:evento, only to tabs on this workspace |
```

Key properties:

- **Streaming line by line.** Claude runs with `--output-format stream-json` and
  the Hub reads each line as it arrives. The Codex adapter translates its own
  JSONL into that same internal dialect at the module boundary, so the frontend
  and the stored history know only one format.
- **Resume.** A session keeps its provider session id and resumes with
  `--resume <id>`. A session remembers the provider it was born with, so
  switching the global engine only affects new sessions.
- **Parallelism.** N child processes at once, capped at `LIMITE_ATIVAS = 5` in
  `sessoes/gerenciador.ts`. The cap is global, across workspaces, to respect the
  provider rate limit and not melt the machine. A session belonging to workspace
  A keeps running while B is the active one, and its cost and transcript go to
  A.
- **The working directory is the contract.** Most sessions run with `cwd` on the
  VKOS folder, so the `CLAUDE.md` there puts the Cérebro in context. Piece-scoped
  sessions are created with `cwd` already on the piece folder, because a session
  born at the workspace root stays there forever and the side chat resumes that
  same session.
- **Cost is measured, not guessed.** Claude reports the cost of the turn, Codex
  reports the accumulated cost of the thread. The provider contract carries
  `usoAnterior` so the Codex adapter can subtract the previous baseline. A cost
  that cannot be known never becomes zero: the turn is flagged and the total is
  presented as a floor.

### The rule that cost the most: no multiline value in a child process argument

**Never pass a value containing a newline as an argument to a child process.**
On Windows, when the spawn goes through a shell, `cmd.exe` truncates at the
first line break and silently swallows the rest of the command line. Nothing
errors. You get a shorter prompt and no way to tell.

Extra session instructions used to travel as `--append-system-prompt` on Claude.
They now travel through **stdin**, in `montarPromptComInstrucoes`, for both
providers. If stdin is not an option, write the value to a file and pass the
path. See `docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.

The companion rule for tests: **a test asserts the injected content**, not just
its surroundings. A test that would still pass with the injection deleted is not
a test.

## The design system

CSS lives in four declared layers, from the one that loses to the one that wins:

```
@layer base, externo, tela, tema;

base      estilos/global.css        reset, closed scales, the token NAME contract
          estilos/primitivas.css    the shared component recipes
externo   estilos/externo.css       React Flow's own CSS, imported into a layer
tela      componentes/<area>/*.css  one stylesheet per screen, plus canvas.css
tema      estilos/visual-hub.css    the final VALUE of every color token per theme
```

Two rules that do not bend, both locked by `estilos/camadas.test.ts`:

1. The line `@layer base, externo, tela, tema;` sits at the top of every
   stylesheet, before any rule. Screens load on demand, and the first
   declaration the browser reads is the one that fixes the order. The bundler
   guarantees nothing about which sheet arrives first.
2. Every sheet declares all of its content inside its own layer. A rule outside
   a layer beats every layer.

Before this was declared, the theme layer was losing in 58 selectors across nine
screens.

Other enforced rules:

- **Color only through tokens.** No hex in a component stylesheet. The lock
  tests in `web/src/estilos/*.test.ts` fail the build otherwise.
- **Contrast is measured, not eyeballed.** `estilos/contraste.test.ts` runs the
  WCAG 2.2 formula over 51 critical pairs in each theme. The server has the same
  formula in `server/src/estilos/contraste.ts`, because the Style Creator lets
  the owner define a palette and an approved style must pass the same ruler.
- **Density comes from control height** (28/32/40px), not from font size. Body
  text is 14px.
- **A screen does not invent components.** It composes `primitivas.css` and
  writes only its own layout. A missing primitive is promoted up, never turned
  into a local class.
- **Both themes always.** Dark, a near-black warm tone, is the default. Light is
  a warm cream. They are reviewed together.
- Custom styles created by the owner arrive as inline custom properties on the
  document root. Inline beats every `@layer`, everything inherits through
  `var()`, and removing the properties returns the app to factory. No CSS is
  generated and the cascade is untouched.

## Data model

Nothing is in a database. Two roots:

```
app/dados/                          app state, never versioned, never shipped
  config.json                       the active VKOS folder and global config
  config-app.json                   app preferences
  workspaces.json                   the workspace registry
  conexoes.json                     third-party credentials, CORE level
  estilos.json                      custom styles
  custos.json / custos.jsonl        AI spend, and the append-only turn ledger
  custos-historico.json             absorbs the total of a deleted workspace
  crm/                              crm.json, interacoes.jsonl, estagios.jsonl,
                                    recuperacoes.jsonl, mensagens/
  assistente/                       sessoes.json, fila.jsonl, rastro.jsonl,
                                    transcricoes/
  workspaces/<id>/                  per-workspace state: canvas.json, contexts,
                                    sessions, custos.jsonl, eventos.jsonl,
                                    anuncios.json, transcripts

<the VKOS workspace folder>/        the business content, one per workspace
  cerebro/cerebro.md                the Cérebro
  .claude/skills/                   the skills the Hub can trigger
  conteudo/<piece>/                 generated pieces: carrossel.html,
                                    index.html, anuncio.json, img/, anexos/
  materiais/                        the owner's reference material
  templates/                        carousel and site templates
```

Conventions that protect the data:

- **User data is sacred.** An existing file is never blindly overwritten. When
  in doubt, quarantine with a timestamp (`util/quarentena.ts`). Migrations use a
  default value, never discard a record, and rename the origin file to
  `<name>.migrado-para-core-<timestamp>` instead of deleting it.
- **Append-only where history matters.** `util/jsonl.ts` backs the cost ledger,
  the event log, the assistant queue and the message threads. An update is a new
  complete line with the same id, and reading collapses by id.
- **Writes are atomic**, through `util/gravarJson.ts`.
- **Personal client data never becomes content.** What the AI receives from the
  CRM is aggregated: counts per stage, summed value, overdue follow-ups. Phone
  numbers and email addresses are stripped before the text reaches a prompt.

## Design decisions and where to find them

Every product or technical decision becomes a short file in
`docs/decisoes/AAAA-MM-DD-titulo.md` with three parts: context, decision, why.
There are 129 of them. Before reopening a settled debate, the rule is to check
that folder and follow what is written there.

A selection that shows how the project reasons:

- `2026-07-11-cockpit-web-local.md`: local web shell instead of Electron, so one
  frontend serves both the browser and VS Code, and the path to a hosted version
  stays open by moving only where the backend runs.
- `2026-07-11-orquestracao-claude-p.md`: orchestrate through the headless CLI
  rather than an SDK, reusing the user's existing auth, with the migration
  trigger stated in advance.
- `2026-07-26-instrucoes-extras-por-stdin.md`: the Windows `cmd.exe` truncation
  that silently shortened prompts, and the move of extra instructions to stdin.
- `2026-07-27-ordem-da-cascata-com-layer.md`: declare the CSS cascade with
  `@layer` instead of deducing it from load order, after the theme layer was
  found losing in 58 selectors.
- `2026-07-27-um-nivel-por-vez.md`: the sidebar stacked both navigation levels
  and left 33px for the project menu on a 720px laptop. It compiled and passed
  every gate, because no test had a height.
- `2026-07-27-a-tela-nunca-entra-transparente.md`: measured frame by frame with
  the CPU throttled 6x, screens were entering at `opacity: 0` and you could see
  *through* the new screen for up to 209ms.
- `2026-07-27-custo-por-turno-e-total-que-nao-mente.md`: Claude reports the
  turn, Codex reports the thread accumulation, and summing the latter inflated
  spend compounding on every resume. A cost that cannot be known is never
  rendered as zero.
- `2026-07-27-o-que-a-ia-recebe-do-crm.md`: exactly which CRM data may enter a
  prompt, and the hard rule against publishing anything identifiable.
- `2026-07-27-hub-core.md`: splitting the app into the CORE level and the
  WORKSPACE level, with the split declared in code and locked by a test.
- `2026-07-17-dados-sagrados.md`: the never-overwrite, always-quarantine
  contract for user files.
- `2026-07-31-o-fluxo-de-anuncios.md`: Zod validates shape, never text length. A
  wrong shape is a 422 that reruns the loop; a 34-character headline is content,
  checked by a pure function with an addressable path, and shown on screen.
- `2026-08-05-o-criador-de-estilos.md`: the owner can create color styles, and
  the same contrast ruler that guards the factory themes approves them. Scale,
  density, motion and weight stay out of reach.
- `2026-08-06-as-dependencias.md`: the audit of what the project depends on and
  why each one earns its place.

## Tests and the quality gate

There is no test framework beyond the Node built-in runner. Server and web both
run `tsx --test src/**/*.test.ts`, with the test file sitting next to the code
it covers.

Nothing closes without three greens:

```bash
cd app
npm run checar -w server && npm run checar -w web    # typecheck
npm run testar -w server && npm run testar -w web    # full suite
npm run build -w web                                 # production build
```

A new behavior ships with its test. A bug fix ships with the test that would
have caught the bug.

Beyond ordinary unit tests, three kinds of lock are worth calling out:

- **Style locks.** `web/src/estilos/*.test.ts` parse the actual stylesheets and
  fail on a hex color in a component sheet, on a value outside the closed
  scales, on a rule declared outside its layer, and on a contrast pair below its
  floor.
- **Documentation locks against real code.** The older map tests only checked
  internal coherence, so a map that was perfect inside and completely stale
  passed green, and it did: two screens and two modules were missing. Now
  `web/src/componentes/mapa/mapa-contra-o-codigo.test.ts` imports the real
  `TELAS_CORE` and `TELAS_WORKSPACE` and demands a node per screen,
  `server/src/mapa/sistema-contra-o-codigo.test.ts` asks the disk which folders
  have a `rotas.ts` and demands a node per folder, and
  `server/src/nucleo/rotas-no-contrato.test.ts` demands a line in `CONTRATO.md`
  for every declared route. All three accept exceptions, none accepts an
  exception without a written reason.
- **Process-level tests.** `server/src/nucleo/rede.test.ts` starts real Node
  processes and measures the exit code, with a counter-proof that the same error
  kills the process when the net is removed.

### The visual check

None of the commands above sees a pixel, and there is no DOM test in this
project. So any round that touches styling, navigation or adds a screen also
runs the visual check:

```bash
# window one, with throwaway data
cd app
VKOS_DADOS_TESTE=/tmp/dados-de-teste VKOS_PORT=4702 npx tsx server/src/index.ts

# window two
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
```

It drives a real browser through **17 screens at three sizes**: 1440x900,
1366x768 and 1280x720, the common laptop. It fails on a console error, a screen
that does not render, a screen with no button, horizontal scrolling, an element
overflowing to the right, a touch target under 24px, text below the 11px floor
of the scale, and a menu item out of reach. Run it in both themes: dark is the
default, light comes with `--tema claro`.

**It measures height, and that is the point.** The sidebar bug above compiled,
passed every gate, and left the user unable to click their own menu items. No
test saw it because no test had a height. It also checks the mechanism, not only
the symptom: the menu must be the element that gives up height when space runs
short, and the rest of the sidebar must not. That check catches the defect
before there is enough content for it to become visible, which is exactly how it
slipped through the first time.

The tool does not replace looking. Keep the before screenshots, make the change,
generate the after ones, compare. A difference you cannot explain is a
regression until proven otherwise. Details in `ferramentas/LEIA-ME.md`.
