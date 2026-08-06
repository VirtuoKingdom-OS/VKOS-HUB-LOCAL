# VKOS Hub, installing and running

> English guide for readers from outside the project. The Portuguese end-user
> guide is [`LEIA-ME.md`](../LEIA-ME.md) at the repository root, and the
> contributor workflow is in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## 1. Prerequisites

- **Node.js 20 or newer**, with npm. The server runs TypeScript directly through
  `tsx`, in development and in production.
- **git**, to clone the repository.
- **Claude Code or Codex, installed and already logged in on this machine.**

That last one is the surprise, so read this part before anything else.

**The Hub stores no AI credential.** There is no API key field, no token to
paste, no account to create. When you ask the Hub to do work, it spawns the
official CLI as a child process and reads its output. Authentication is
whatever that CLI already has. If neither engine is installed and logged in, the
app opens and browses fine, but nothing that needs AI will run.

Two consequences:

- The cost of a session is billed to your own Claude or OpenAI account, under
  your own plan and rate limits. The Hub only measures and displays it.
- Logging in happens in the official program's own window. The Hub will never
  ask you to paste a password or a token. If something asks, it is not the Hub.

Verify from a terminal:

```bash
node --version     # v20 or newer
claude --version   # if you use Claude Code
codex --version    # if you use Codex
```

Only one of the two engines is required. Both can be installed and the engine is
selectable per session.

## 2. Running in development

```bash
git clone <repository-url>
cd <repository>/app
npm install
npm run dev
```

`npm run dev` uses `concurrently` to start both workspaces at once. The two
halves can also run separately:

```bash
npm run dev -w server    # Fastify, tsx watch, port 4600
npm run dev -w web       # Vite, port 5173
```

Ports:

| Port | What | Notes |
| --- | --- | --- |
| 4600 | the Fastify backend | host `127.0.0.1`, declared as `PORTA_PADRAO` in `app/server/src/index.ts` |
| 5173 | the Vite dev server | proxies `/api`, `/pecas`, `/pecas-edicao`, `/modelos-html` and `/ws` to 4600 |

In development, open **http://localhost:5173**. Hot reload comes from Vite, and
the WebSocket stream is proxied through, so live session output works normally.

## 3. Running the local production build

Build the frontend, then start the server. Port 4600 serves the built frontend
whenever it exists.

```bash
cd app
npm run build -w web
npm start                # equivalent to npm run start -w server
```

Then open **http://localhost:4600**. The server sends `Cache-Control: no-cache`
for `index.html` and `immutable` for hashed assets, so a fresh build arrives
without a hard refresh.

Before closing any round of work, the quality gate has to be green:

```bash
cd app
npm run checar -w server && npm run checar -w web    # typecheck
npm run testar -w server && npm run testar -w web    # full suite
npm run build -w web                                 # production build
```

## 4. The end-user path on Windows

Non-developer users never see a terminal. The distributed package contains
`app/`, a `VKOS/` folder with a blank Cérebro, the two launchers and the
Portuguese `LEIA-ME.md`.

- **`Instalar VKOS Hub.cmd`**, run once. It checks for Node.js 20 or newer and
  installs `OpenJS.NodeJS.LTS` through WinGet when missing, updating the current
  process PATH so no reboot is needed. If WinGet is unavailable or the install
  fails, it opens the official Node.js site and explains the manual route. It
  then installs dependencies and opens the browser on the setup screen, where
  you pick Claude or Codex, install the missing CLI (WinGet again, from a fixed
  package list the server holds, never a command coming from the interface), log
  in through the official window, and run a real test.
- **`Iniciar VKOS Hub.cmd`**, run every day after that. It starts the server in
  a minimized window and opens the default browser.

The `VKOS/` folder next to `app/` is registered and activated automatically on
first boot, so the user never has to pick a folder to get started.

Full step-by-step, in Portuguese, is in [`LEIA-ME.md`](../LEIA-ME.md).

## 5. Optional configuration

These are the environment variables that actually exist in the code. There is no
`.env` file and no config schema: the app is meant to work with none of them
set.

| Variable | Effect |
| --- | --- |
| `VKOS_PORT` | Overrides the backend port. Exists for QA and isolated runs. The product stays on 4600. An invalid value fails at startup, before any module initializes, rather than binding somewhere unexpected. |
| `VKOS_DADOS_TESTE` | Points `app/dados/` at a throwaway directory. Used by the test suite and by the visual check so neither touches real data. |
| `VKOS_CLAUDE_BIN` | Absolute path to the `claude` binary, when it is not resolvable on PATH. |
| `VKOS_CODEX_BIN` | Absolute path to the `codex` binary, same reason. |

Everything else the app needs is configured from inside the interface and stored
under `app/dados/`.

## 6. Third-party connections

All of these are optional, all are off by default, and each one requires **your
own account and your own credential**. They are managed on the Connections
screen and stored locally in `app/dados/conexoes.json`. Secrets are masked when
read back: only the last four characters are ever returned to the browser.

| Connection | What it enables | What it asks for |
| --- | --- | --- |
| **Apify** | Mines business leads from Google Maps, with phone, website and ratings, into the CRM. Uses the Apify REST API v2 and the `compass/crawler-google-places` actor. | An API token, from console.apify.com under Settings, Integrations. |
| **Supabase** | Reads the people who filled in your site's contact form, from a `public.leads` table, and shows them in the CRM as an inbound queue. | The project URL and the `service_role` key. The `anon` key will not work here. The `service_role` key never reaches the browser. |
| **Instagram** | The only two-way integration. Reads account metrics and publishes from the Hub. The account has to be Professional, Business or Creator. Uses the Instagram API with Instagram Login, over `graph.instagram.com`. | The Instagram app id and app secret from developers.facebook.com. This is the one connection that uses a browser OAuth flow, so the card has a Connect button. The account token is never exposed by any route, not even masked. |

Note on what is not here. GitHub, Netlify, Notion, Google Calendar and Vercel
were all removed from the product. Integrated publishing was replaced by a local
deterministic export: open the piece folder in the system file manager, or
download the finished site as a ZIP. There is no Google Ads API integration: the
ad flow produces a campaign you paste into the ad panel yourself.

## 7. Troubleshooting

**Port 4600 is already in use.** Another copy of the Hub is probably already
running, so close it and start again. If a different program owns the port,
close that program. For a one-off run on another port, use `VKOS_PORT`.

**Node is too old.** The server needs Node 20 or newer. Check with
`node --version`. Older versions will fail in ways that look unrelated. On
Windows, rerunning `Instalar VKOS Hub.cmd` installs the LTS automatically
through WinGet.

**The AI engine is not found.** Confirm the CLI runs from a plain terminal
(`claude --version` or `codex --version`). If it was just installed, close and
reopen the Hub once so the new PATH is picked up. If it is installed somewhere
unusual, point `VKOS_CLAUDE_BIN` or `VKOS_CODEX_BIN` at the binary. On the
packaged Windows build, the setup screen has an automatic install button and a
manual fallback, and the technical log lands in `app/dados/instalacao.log`,
which records progress only, never a password or a token.

**The login was not recognized.** Finish the login in the window the Hub opened,
then come back to the browser and use the recheck option. The Hub never asks you
to paste a password.

**The screen is stale after a build.** Close the browser tab, stop the server,
start it again. The build output is served with the right cache headers, but a
dev server left running on 5173 can shadow it.

**Where the data is, for backup.** Two places, and neither is versioned:

- `app/dados/` holds the app state: the workspace registry, the CRM, connection
  credentials, costs, styles, session transcripts and the assistant queue.
- The VKOS workspace folder holds the business content: `cerebro/cerebro.md`,
  the generated pieces under `conteudo/`, the reference material and templates.

Back up both. Do not share either one once you have started using it: they hold
your business data, your configuration and your credentials.
