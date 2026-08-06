# VKOS Hub Local

**A local-first, multi-AI workspace that runs a whole small business from one screen.**

Many AI sessions work in parallel, and every one of them reads the same **Cérebro** (Brain): a markdown file holding the identity of the business. Nothing is hosted. No telemetry. No account. Your data never leaves your machine.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![CI](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/actions/workflows/ci.yml/badge.svg)](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![Local-first](https://img.shields.io/badge/local--first-no%20telemetry-6f6)](docs/ARCHITECTURE.md)

**Português: [README.pt-BR.md](README.pt-BR.md)** | Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Install: [docs/INSTALL.md](docs/INSTALL.md)

---

## The problem

A service provider or small business owner does not want to "unify their AIs". They want the business running.

Today, using AI for real work means juggling a dozen disconnected tools. Every one of them starts from zero. Every one of them has to be told, again, who the business is, who it talks to, and how it sounds. The tooling becomes one more job instead of one less.

## The idea

Give every AI session one shared memory, and put the tools that use it in the same room.

The **Cérebro** is a markdown document describing the business: its offer, its voice, its customer, its positioning. It is human readable, versionable, and it lives in a folder you own. Every session in a workspace reads it before doing anything. A carousel, a landing page, a Google Ads campaign and a CRM summary all come out sounding like the same business, because they were all written by something that already knew the business.

That is the whole bet. Not "several AIs on a canvas", which is a canvas that is dumb about context. One memory, many models, one coherent output.

## What it actually does today

This is not a prototype. It is the tool its author uses to run his own company.

**Two levels of scope.** CORE is the owner's level and does not change when you switch clients. WORKSPACE is the project level, one per client or brand. Data from one workspace never reaches another.

| CORE, the owner's level | What it is |
| --- | --- |
| **Dashboard** | Spend, active projects, guided creation entry points |
| **Assistant** | A persistent CORE-level chat that plans batches of work, proposes them, and only runs after you approve. Append-only queue, append-only trace of what the server actually did |
| **CRM** | Contacts separate from deals, a board, timelines, tasks, follow-up. Lead mining from Google Maps via Apify. What the AI receives is aggregated, with phone and email stripped |
| **Workspaces** | One per client. Create, switch, delete. Deleting removes that client's data folder |
| **Connections** | Third party credentials, stored locally, with a real delete |
| **Style Creator** | Build the app's palette: pick a base, a brand color, paste a theme, pull colors from an image, or describe it in words. Nothing ships unless it passes the same measured WCAG contrast gate that approves the factory themes |
| **Map** | A live, tested graph of the system's own modules and how they feed each other |

| WORKSPACE, the project level | What it is |
| --- | --- |
| **Cockpit** | A React Flow canvas. The Cérebro is the center node, each parallel AI session is a node drinking from it, with live streaming |
| **Brain Ceremony** | A guided interview that writes the Cérebro for a business that does not have one yet. Resumable. It never declares itself finished, because that judgement belongs to the owner |
| **Carousel Studio** | HTML-first social pieces with a real layer panel, geometric selection, and your own images |
| **Guided Site** | A four step wizard that generates a static multi-page site, with a design layer, a desktop and mobile viewport, manual editing and AI adjustment side by side. Exports as a folder or a ZIP |
| **Ads** | A full Google Ads campaign in nine blocks, validated field by field against Google's real character limits, with copy buttons and the same conversation still open to rewrite it |
| **Instagram** | Publish posts, carousels and reels. Read metrics. Read, reply, hide and delete comments without leaving the Hub |
| **IDE** | A file tree, an editor and an AI chat as a floating universal layer over any screen. It cannot reach the app's own data folder, and that block is in the path resolver, not the listing |

**Engines.** Claude Code and Codex, both behind one provider contract. Sessions are pinned to the engine that opened them. The Hub never sees, receives or stores an AI credential: you log in through the official CLI, and the Hub spawns it.

## Principles that are not up for negotiation

1. **Local-first.** The server listens on `127.0.0.1`. There is no hosted backend and no telemetry. Ever.
2. **The credential is the user's.** The Hub never receives or stores an AI token. Login happens in the engine's own official program.
3. **User data is sacred.** An existing file is never blindly overwritten. A corrupted file goes to a dated quarantine, never gets replaced by empty state. Migrations use defaults, they do not drop records.
4. **Customer personal data never becomes content.** What the AI gets from the CRM is aggregated. Phone numbers and emails are stripped by code, not by asking the model nicely. See [`docs/decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`](docs/decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md).
5. **Generation is verified, not trusted.** Deterministic audit before anything is called done.
6. **It works for a non-technical person out of the box.** If it needs configuration or vocabulary, it is not finished.

## Quick start

You need **Node 22 or newer**, and **Claude Code or Codex installed and logged in**, because the Hub drives the official CLI instead of holding your key.

```bash
git clone https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL.git
cd VKOS-HUB-LOCAL/app
npm install
npm run dev
```

Backend on `4600`, Vite on `5173`. Full guide, including the two-click Windows installer for non-technical users, in [docs/INSTALL.md](docs/INSTALL.md).

## Stack

Node and Fastify on the server, React and Vite in the browser, React Flow for the canvas, TypeScript everywhere, npm workspaces holding the two together. No framework was adopted that the project did not need.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the real map.

## How this project is built

Three habits, and they are visible in the repository, which is why they are worth mentioning.

**Every decision is written down.** `docs/decisoes/` holds over 120 files, one per product or technical decision, each with context, the decision, and why. Before a debate is reopened, that folder is checked. This is the most useful thing in the repo for a new contributor, and it is the honest record of what was tried and what failed.

**The architecture has a live map.** `interno/mapa-sistema.json` is not documentation, it is data the running app reads. A change that alters who feeds whom updates the map in the same task, and a test fails if the map drifts from the code.

**The quality gate includes pixels.** Typecheck, tests and build are table stakes. On top of that, `ferramentas/olhar-telas.mjs` opens a real browser and walks 17 screens at three resolutions, failing on console errors, horizontal scroll, touch targets under 24px and text under the 11px floor. It exists because a working, compiling, fully green build once shipped a sidebar that left 33px for the project menu on a 720px laptop. Nothing else caught it, because nothing else had height.

## Roadmap

The direction is a Hub whose tools are **modular per workspace**: the operator decides which tools each client gets, so a bakery and a design studio see different apps built from the same parts. Feature work continues on the same principle it started with, every tool useful alone and better next to the others.

Current state and phase history in [`docs/contexto/roadmap.md`](docs/contexto/roadmap.md). Vision in [`docs/contexto/visao.md`](docs/contexto/visao.md).

## Contributing

Contributions are welcome, and the bar is written down instead of implied. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then read [CLAUDE.md](CLAUDE.md), which is the house rules file for both people and AI agents working in this repo.

Two things that surprise newcomers, so they are said upfront: the codebase is written in Brazilian Portuguese, names included, and nothing merges without typecheck, tests and build green.

Bug reports and ideas go in [Issues](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/issues). Security problems do **not**: see [SECURITY.md](SECURITY.md). Everyone participating agrees to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

**GNU Affero General Public License v3.0 or later.** See [LICENSE](LICENSE).

Use it, study it, change it, sell it. If you distribute it, ship the source. If you run a modified version as a network service for other people, offer them that source too. Running it on your own machine for your own business, modified however you like, obliges you to nothing.

A separate commercial license is available for anyone who wants to build a closed source hosted service on this code. That is possible because the author holds the copyright, and it takes nothing away from the AGPL grant, which is permanent. Details and the plain-language explanation are in [NOTICE](NOTICE).

Contact: jesseconta017@gmail.com

---

Built by [Jesse Gomes](https://github.com/NexcauVirtuoso), VirtuoKingdom.
