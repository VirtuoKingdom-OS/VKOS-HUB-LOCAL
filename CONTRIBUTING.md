# Contributing / Como contribuir

VKOS Hub Local. Bilingual document. English first, Portuguese second.
Documento bilíngue. Inglês primeiro, português depois.

- [English](#english)
  - [First, the language of this codebase](#first-the-language-of-this-codebase)
  - [Map of the repository](#map-of-the-repository)
  - [Setting up](#setting-up)
  - [How to contribute from outside](#how-to-contribute-from-outside)
  - [The quality gate](#the-quality-gate)
  - [The gate the five commands do not cover](#the-gate-the-five-commands-do-not-cover)
  - [Writing rules](#writing-rules)
  - [Code rules](#code-rules)
  - [Folder structure](#folder-structure)
  - [What will probably be refused](#what-will-probably-be-refused)
  - [Licensing your contribution](#licensing-your-contribution)
  - [Git rules, and who they apply to](#git-rules-and-who-they-apply-to)
  - [Working inside the maintainer's round](#working-inside-the-maintainers-round)
  - [Where to ask for help](#where-to-ask-for-help)
- [Português](#português)
  - [Primeiro, o idioma deste código](#primeiro-o-idioma-deste-código)
  - [Mapa do repositório](#mapa-do-repositório)
  - [Montando o ambiente](#montando-o-ambiente)
  - [Como contribuir de fora](#como-contribuir-de-fora)
  - [O portão de qualidade](#o-portão-de-qualidade)
  - [O portão que os cinco comandos não cobrem](#o-portão-que-os-cinco-comandos-não-cobrem)
  - [Regras de escrita](#regras-de-escrita)
  - [Regras de código](#regras-de-código)
  - [Estrutura de pastas](#estrutura-de-pastas)
  - [O que provavelmente será recusado](#o-que-provavelmente-será-recusado)
  - [Licenciamento da sua contribuição](#licenciamento-da-sua-contribuição)
  - [Regras de git, e para quem elas valem](#regras-de-git-e-para-quem-elas-valem)
  - [Trabalhando dentro de uma rodada do mantenedor](#trabalhando-dentro-de-uma-rodada-do-mantenedor)
  - [Onde pedir ajuda](#onde-pedir-ajuda)

---

## English

Contributions are welcome. The bar is high, and it is written down here instead
of being implied, so nobody wastes an afternoon guessing.

This document applies to people and to AI agents alike. Work that does not
follow it does not get merged.

### First, the language of this codebase

**The code of this project is written in Brazilian Portuguese.** File names,
function names, variable names, comments, commit messages and the user
interface. All of it. This will not change.

Two reasons. It is an identity decision: the project is Brazilian and does not
pretend otherwise. And it is a coherence decision: the product speaks to small
business owners and service providers in Brazil, so the words in the interface
and the words in the code are the same words. A screen called `TelaConexoes` is
backed by a module called `conexoes`, and the person using it reads "Conexões".
Translating the inside would break that chain for no gain.

The entry documentation exists in English so that someone arriving from outside
can understand the project, evaluate it, run it and report on it. That is
`README.md`, `docs/ARCHITECTURE.md`, `docs/INSTALL.md`, `SECURITY.md`,
`CODE_OF_CONDUCT.md`, the pull request template and this file.

**You can contribute without speaking Portuguese.** Here is how:

- **Report bugs.** Write the issue in English. It will be read.
- **Test.** Run the Hub on your operating system and your hardware, and say
  what broke. Windows, macOS and Linux reports are all useful.
- **Review.** Read a pull request and question the reasoning, the security
  posture, the data handling. Code is legible even when the names are not in
  your language, and a fresh reader catches what the author stopped seeing.
- **Infrastructure and CI.** Workflows, build, packaging, dependency hygiene,
  the installer. Almost none of that is Portuguese.
- **Propose a change.** Send the patch with the Portuguese naming done as best
  you can, and a clear description in English in the pull request body. If a
  name is off, it gets corrected in review. That is a small cost and nobody
  will hold it against you.

### Map of the repository

Read in this order. Each line says what the file gives you.

1. **`README.md`.** What the product is, what it does today, and why it exists.
2. **`docs/ARCHITECTURE.md`.** The technical map in English: server, web,
   transport, the provider contract, where data lives.
3. **`docs/contexto/visao.md`.** The product vision, in Portuguese. Who it is
   for and what it refuses to be.
4. **`docs/contexto/arquitetura.md`.** The architecture as the project
   maintains it day to day, in Portuguese, more detailed and more current than
   the English overview.
5. **`docs/decisoes/`.** More than 128 short files, one per product or
   technical decision, each with context, the decision, and why. This is the
   most valuable folder in the repository for a new contributor: it is the
   honest record of what was tried and what failed. Before reopening a debate,
   check whether it is already closed here.
6. **`interno/mapa-sistema.json`.** The live map of modules and how they feed
   each other. It is not documentation, it is data the running app reads, and a
   test fails when it drifts from the code.

`CLAUDE.md` is the house rules file the maintainer and his AI agents work
under. Reading it tells you a lot about the standards, including the whole
visual identity contract. `docs/contexto/identidade-visual.md` is required
reading before touching any screen.

### Setting up

You need **Node 20 or newer**. Node 20 and 22 are the versions CI runs.

For the AI features you also need **Claude Code or Codex installed and logged
in**, because the Hub drives the official CLI instead of holding your key. You
do not need them to build the project, run the tests, or work on most of the
interface.

```bash
# fork the repository on GitHub first, then
git clone https://github.com/YOUR-USER/VKOS-HUB-LOCAL.git
cd VKOS-HUB-LOCAL/app
npm install
npm run dev
```

`npm run dev` starts both halves at once. The Fastify server listens on
`4600`, Vite serves the interface on `5173`. Open `http://localhost:5173`.

The two are npm workspaces, `server` and `web`, declared in `app/package.json`.
Every command below is run from `app/`.

Full install guide, including the two-click Windows installer meant for
non-technical users, in [docs/INSTALL.md](docs/INSTALL.md).

### How to contribute from outside

1. **Open an issue before doing anything large.** Describe the problem and the
   direction you want to take. Wait for a reply. This is not bureaucracy, it is
   how you avoid spending a week on a path that will be refused for a reason
   written down in `docs/decisoes/`. A small fix does not need an issue first.
2. **Branch from `main`.** One branch per unit of meaning.
3. **One commit per unit of meaning.** Do not mix a removal with a redesign.
   Commit messages in Portuguese, imperative, saying the effect and not the
   file. Sign every commit off, see
   [Licensing your contribution](#licensing-your-contribution).
4. **Run the quality gate locally** before you push. All of it.
5. **Open the pull request against `main`** and fill in the template. It asks
   for the effect of the change, the why, and how a reviewer verifies it with
   their own eyes. The checklist is not decoration.
6. **CI runs typecheck, tests and build, on Linux and on Windows, on Node 20
   and 22.** A red pull request is not reviewed. Fix it first, then ask.

Windows matters as much as Linux here. The product's main audience runs
Windows, and this project has already been bitten by that, see the multiline
argument rule under [Code rules](#code-rules).

### The quality gate

Nothing closes without these green:

```bash
cd app
npm run checar -w server && npm run checar -w web
npm run testar -w server && npm run testar -w web
npm run build -w web
```

`checar` is typecheck, `testar` runs the tests, and the last one builds the
web bundle.

New behavior comes with a new test. A bug fix comes in together with the test
that would have caught the bug.

### The gate the five commands do not cover

None of the commands above sees a single pixel. They prove the code compiles,
that the logic is right, and that the bundle comes out. There is no DOM test in
this project.

So **any round that touches styling, touches navigation, or creates a new
screen also runs the visual check**:

```bash
# in one window, with disposable data
cd app
VKOS_DADOS_TESTE=/tmp/dados-de-teste VKOS_PORT=4702 npx tsx server/src/index.ts

# in another
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
```

It opens the interface in a real browser and walks **17 screens at three
sizes** (1440x900, 1366x768 and 1280x720, the common laptop). It fails on:
console errors, a screen that does not render, a screen with no button,
horizontal scrolling, an element overflowing to the right, a touch target under
24px, text under the 11px floor of the scale, and a menu item out of reach. Run
it on both themes: the default is Dark, and the second one passes with
`--tema claro`.

**It measures height, and that is not a detail.** On 2026-07-27 the sidebar
stacked both navigation levels and left 33px for the project menu on a 720px
laptop. It compiled. It passed all five gates. And the person could not click
their own menu items. No test saw it, because no test had height. See
`docs/decisoes/2026-07-27-um-nivel-por-vez.md`.

Beyond the symptom, it checks the mechanism: the menu has to be the part that
gives up height when space runs out, and the rest of the bar must not. That
check catches the defect **before** there is enough content for it to show,
which is exactly how it slipped through the first time.

This does not replace your eyes. Keep the screenshots from before, make the
change, generate the ones from after, and compare. A difference you cannot
explain is a regression until proven otherwise. Details in
`ferramentas/LEIA-ME.md`.

### Writing rules

Applies to code, comments, documents, decisions and interface. It applies to
the English text of this project too.

- Brazilian Portuguese for everything inside the product.
- **Never use the em dash character, and never use the middle dot.** Use a
  comma, a period, or a colon. This holds in English as well.
- Short, direct sentences.
- No startup jargon.
- A comment explains the why, not the what.

### Code rules

- **Color only through tokens.** No hardcoded theme color inside a component.
  The tests in `app/web/src/estilos/*.test.ts` fail on it, and they sweep the
  whole app.
- **User data is sacred.** An existing file is never blindly overwritten. When
  in doubt, quarantine it with a date. A corrupted file never gets replaced by
  empty state.
- **No multiline value in a child process argument.** On Windows, under a
  shell, `cmd.exe` cuts at the first line break and silently takes the rest of
  the command line with it. Use stdin or a file. See
  `docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.
- **A test asserts the injected content**, not only its surroundings. A test
  that would still pass with the injection deleted is not a test.
- **No new dependency without a strong justification.** Native features before
  libraries.
- File, function and variable names in Portuguese.

### Folder structure

```
app/server/src/<modulo>/     estado.ts, rotas.ts, and the test next to them
app/web/src/componentes/<area>/   the component and its stylesheet, together
app/web/src/api/             one HTTP client per area
app/web/src/estilos/         tokens, primitives and theme layers
docs/                        context, decisions and plans
interno/                     data the running app reads. Not documentation
ferramentas/                 check scripts, outside the product
```

A new server module is born with `estado.ts`, `rotas.ts` and a test, and is
registered in `app/server/src/index.ts`.

A stylesheet lives next to the component it dresses. Only what belongs to
everyone goes in `estilos/`. A screen does not invent a component: it composes
`app/web/src/estilos/primitivas.css` and writes only its own layout. A missing
primitive is promoted up there, it never becomes a local class.

### What will probably be refused

Said plainly, because it saves everyone's time.

- **Anything that requires a hosted backend, a remote account, or telemetry.**
  Local-first is the foundation, not a preference. The server listens on
  `127.0.0.1` and that is the whole product.
- **Anything that makes the Hub receive or store an AI credential.** The
  credential belongs to the user. Login happens in the engine's own official
  program, and the Hub spawns it.
- **A new dependency without a strong justification.** The rule is native
  feature before library. "It is one small package" is not a justification.
- **Hardcoded color in a component.** Color enters only through tokens, and the
  tests will fail before a human even looks.
- **Broad code style rewrites with no behavior change.** A thousand-line diff
  that changes nothing is unreviewable and it buries the history.
- **A feature that requires technical vocabulary from the end user.** The
  audience is a business owner, not a developer. If it needs configuration or
  jargon to work, it is not finished.
- Anything that sends customer personal data to a model. What the AI receives
  from the CRM is aggregated, with phone numbers and emails stripped by code.

None of this is a judgement on the idea. It is a boundary of this project, and
your idea may well be right somewhere else.

### Licensing your contribution

**This project is licensed under AGPL-3.0-or-later.** The author also offers
the software under a separate commercial license, for people who want to build
on it without the obligations of section 13 of the AGPL. Offering both is
called dual licensing, and it is possible because the author holds the
copyright on the original work. Details in [NOTICE](NOTICE).

**Every pull request must carry a signed Developer Certificate of Origin, the
DCO.** In practice this means committing with `-s`:

```bash
git commit -s -m "sua mensagem aqui"
```

That adds a line to the commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

Set your `user.name` and `user.email` in git before you start, because the
sign-off uses them and it has to be a real identity.

The full DCO text is at <https://developercertificate.org/>. Read it, it is
one short page.

**What signing off actually means.** You are stating that you have the right to
contribute that code: that you wrote it, or that you got it from a source whose
license allows it, and that you are aware the contribution and the sign-off are
public and permanent.

**It does not transfer copyright.** You remain the owner of what you wrote. The
DCO is a declaration of provenance, not an assignment.

**Your contribution goes in under the AGPL, for everyone, always.** Whatever
you send lands in the project under AGPL-3.0-or-later, and that grant is
permanent and irrevocable for every user of this software, including you.

**About a future CLA, said honestly.** Today the DCO is what is asked. If the
project starts receiving substantial external contributions, the author intends
to adopt a Contributor License Agreement, a CLA, because dual licensing needs
the rights to relicense the whole work and the DCO alone does not provide them.
If that happens, it will be announced in advance, discussed in the open, and
applied to new contributions. It will never be applied retroactively to
contributions already merged without the consent of the person who wrote them.

If any of this is a problem for you, say so in an issue before you write the
code, not after.

### Git rules, and who they apply to

Two different situations, and they used to be confused in this file.

**External contributor.** You open a pull request. Obviously. That is the whole
mechanism, and nothing here says otherwise. Branch from `main`, commit with
`-s`, push to your fork, open the pull request.

**AI agent working inside the maintainer's own repository.** Never commit,
never push, never open a pull request without an explicit order from Jesse. No
exception. An agent executes the work and stops at the gate. The decision to
record something in history is the maintainer's, and it is not delegated.

Both cases share the rest: branch from `main`, commit messages in Portuguese,
imperative, saying the effect and not the file, and one commit per unit of
meaning.

### Working inside the maintainer's round

This section describes how the project moves internally. You do not need it to
send a pull request, but it explains why the repository looks the way it does,
and it applies to anyone working with the maintainer.

1. **A large round starts from a plan.** A folder in
   `docs/planos/nome-da-rodada/` with vision, architecture and execution. The
   plan is audited before it becomes code.
2. **Execution goes phase by phase.** Each phase ends green: typecheck, tests
   and build.
3. **The decision gets recorded.** Every product or technical choice becomes
   `docs/decisoes/AAAA-MM-DD-titulo.md`, with context, the decision, and why.
4. **The living context is updated.** A closed phase or a changed architecture
   means editing the matching file in `docs/contexto/`, on the line that
   changed. Do not rewrite the whole file.
5. **The map is updated.** Created, removed, renamed or changed the
   responsibility of a module, a screen, an integration or a flow?
   `interno/mapa-sistema.json` is updated in the same task. The map is a live
   contract, not optional documentation.
6. **The plan is deleted.** Round closed, plan folder gone.

### Where to ask for help

- **Questions, ideas and design discussion:** GitHub Discussions.
- **Bugs and concrete feature requests:** GitHub
  [Issues](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/issues), using
  the templates.
- **Security problems: never in public.** Not an issue, not a pull request, not
  a post. Read [SECURITY.md](SECURITY.md) and use one of the private channels
  described there.

Everyone participating agrees to the
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## Português

Contribuições são bem-vindas. A régua é alta, e ela está escrita aqui em vez de
ficar implícita, para ninguém gastar uma tarde adivinhando.

Este documento vale para pessoa e para IA. Trabalho que não segue isto não
entra.

### Primeiro, o idioma deste código

**O código deste projeto é escrito em português brasileiro.** Nome de arquivo,
nome de função, nome de variável, comentário, mensagem de commit e interface.
Tudo. Isso não vai mudar.

Dois motivos. É uma decisão de identidade: o projeto é brasileiro e não finge o
contrário. E é uma decisão de coerência: o produto fala com dono de negócio
pequeno e prestador de serviço no Brasil, então a palavra que está na interface
é a mesma palavra que está no código. Uma tela chamada `TelaConexoes` é servida
por um módulo chamado `conexoes`, e quem usa lê "Conexões". Traduzir o miolo
quebraria essa corrente sem ganho nenhum.

A documentação de entrada existe em inglês para que quem chega de fora consiga
entender o projeto, avaliar, rodar e reportar. São o `README.md`, o
`docs/ARCHITECTURE.md`, o `docs/INSTALL.md`, o `SECURITY.md`, o
`CODE_OF_CONDUCT.md`, o modelo de pull request e este arquivo.

**Dá para contribuir sem falar português.** Como:

- **Reportar bug.** Escreva a issue em inglês. Ela vai ser lida.
- **Testar.** Rode o Hub no seu sistema e no seu hardware, e diga o que
  quebrou. Relato de Windows, macOS e Linux, todos servem.
- **Revisar.** Leia um pull request e questione o raciocínio, a postura de
  segurança, o trato com os dados. Código é legível mesmo quando os nomes não
  estão no seu idioma, e um leitor novo pega o que o autor parou de enxergar.
- **Infraestrutura e CI.** Workflows, build, empacotamento, higiene de
  dependência, instalador. Quase nada disso é português.
- **Propor mudança.** Mande o patch com a nomenclatura em português feita o
  melhor que você conseguir, e uma descrição clara em inglês no corpo do pull
  request. Se um nome ficar torto, se corrige na revisão. É um custo pequeno e
  ninguém vai cobrar isso de você.

### Mapa do repositório

Leia nesta ordem. Cada linha diz o que o arquivo entrega.

1. **`README.md`.** O que o produto é, o que ele faz hoje, e por que existe.
2. **`docs/ARCHITECTURE.md`.** O mapa técnico em inglês: servidor, web,
   transporte, o contrato de provedor, onde os dados moram.
3. **`docs/contexto/visao.md`.** A visão de produto. Para quem é e o que ele se
   recusa a ser.
4. **`docs/contexto/arquitetura.md`.** A arquitetura como o projeto mantém no
   dia a dia, mais detalhada e mais atual que a visão geral em inglês.
5. **`docs/decisoes/`.** Mais de 128 arquivos curtos, um por decisão de produto
   ou técnica, cada um com contexto, decisão e por quê. É a pasta mais valiosa
   do repositório para quem chega: é o registro honesto do que foi tentado e do
   que falhou. Antes de reabrir um debate, veja se ele já está fechado aqui.
6. **`interno/mapa-sistema.json`.** O mapa vivo dos módulos e de quem alimenta
   quem. Não é documentação, é dado que o app lê rodando, e um teste reprova
   quando ele desanda do código.

O `CLAUDE.md` é o arquivo de regras da casa sob o qual o mantenedor e os
agentes de IA dele trabalham. Ler ele diz muito sobre o padrão, incluindo o
contrato inteiro de identidade visual. O `docs/contexto/identidade-visual.md` é
leitura obrigatória antes de tocar em qualquer tela.

### Montando o ambiente

Você precisa de **Node 20 ou mais recente**. O CI roda no 20 e no 22.

Para os recursos de IA você também precisa do **Claude Code ou do Codex
instalado e logado**, porque o Hub dirige a CLI oficial em vez de guardar a sua
chave. Você não precisa deles para compilar o projeto, rodar os testes, nem
para mexer na maior parte da interface.

```bash
# faça o fork no GitHub primeiro, depois
git clone https://github.com/SEU-USUARIO/VKOS-HUB-LOCAL.git
cd VKOS-HUB-LOCAL/app
npm install
npm run dev
```

O `npm run dev` sobe as duas metades de uma vez. O servidor Fastify escuta na
`4600`, o Vite serve a interface na `5173`. Abra `http://localhost:5173`.

As duas são workspaces npm, `server` e `web`, declaradas em
`app/package.json`. Todo comando abaixo roda a partir de `app/`.

O guia completo de instalação, incluindo o instalador de dois cliques para
Windows feito para quem não é técnico, está em [docs/INSTALL.md](docs/INSTALL.md).

### Como contribuir de fora

1. **Abra uma issue antes de encarar algo grande.** Descreva o problema e o
   caminho que você quer tomar. Espere a resposta. Isso não é burocracia, é
   como você evita gastar uma semana num caminho que será recusado por um
   motivo já registrado em `docs/decisoes/`. Correção pequena não precisa de
   issue antes.
2. **Branch a partir de `main`.** Um branch por unidade de sentido.
3. **Um commit por unidade de sentido.** Não misture remoção com redesenho.
   Mensagem em português, no imperativo, dizendo o efeito e não o arquivo.
   Assine todo commit, veja
   [Licenciamento da sua contribuição](#licenciamento-da-sua-contribuição).
4. **Rode o portão de qualidade na sua máquina** antes de empurrar. Inteiro.
5. **Abra o pull request contra `main`** e preencha o modelo. Ele pede o efeito
   da mudança, o porquê, e como quem revisa confere com os próprios olhos. O
   checklist não é enfeite.
6. **O CI roda typecheck, testes e build, em Linux e em Windows, no Node 20 e
   no 22.** Pull request vermelho não é revisado. Conserte antes de pedir.

Windows importa tanto quanto Linux aqui. O público principal do produto usa
Windows, e este projeto já se queimou com isso, veja a regra de valor multilinha
em [Regras de código](#regras-de-código).

### O portão de qualidade

Nada fecha sem estes verdes:

```bash
cd app
npm run checar -w server && npm run checar -w web
npm run testar -w server && npm run testar -w web
npm run build -w web
```

`checar` é typecheck, `testar` roda os testes, e o último gera o pacote do web.

Teste novo acompanha comportamento novo. Correção de bug entra junto com o
teste que teria pegado o bug.

### O portão que os cinco comandos não cobrem

Nenhum dos comandos acima vê um pixel. Eles provam que o código compila, que a
lógica está certa e que o pacote sai. Não existe teste de DOM neste projeto.

Por isso, **rodada que mexe em estilo, em navegação, ou que cria tela nova roda
também a conferência visual**:

```bash
# de uma janela, com dados descartáveis
cd app
VKOS_DADOS_TESTE=/tmp/dados-de-teste VKOS_PORT=4702 npx tsx server/src/index.ts

# de outra
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
```

Ela abre a interface num navegador de verdade e percorre **17 telas em três
tamanhos** (1440x900, 1366x768 e 1280x720, que é o notebook comum). Reprova
por: erro de console, tela que não renderiza, tela sem botão, rolagem
horizontal, elemento estourando pra direita, alvo de toque abaixo de 24px,
texto abaixo do piso de 11px da escala, e item de menu fora do alcance. Rode
nos dois temas: o padrão é o Escuro, e o segundo passa com `--tema claro`.

**Ela mede altura, e isso não é detalhe.** Em 2026-07-27 a barra lateral
empilhava os dois níveis de navegação e sobrava 33px pro menu do projeto num
notebook de 720px. Compilava, passava nos cinco portões, e a pessoa não
conseguia clicar nos próprios itens. Nenhum teste via isso porque nenhum teste
tinha altura. Ver `docs/decisoes/2026-07-27-um-nivel-por-vez.md`.

Além do sintoma, ela checa o mecanismo: o menu tem que ser quem cede altura
quando falta espaço, e o resto da barra não. Essa checagem pega o defeito
**antes** de existir conteúdo bastante pra ele aparecer, que é como ele passou
batido da primeira vez.

Isso não substitui o olho. Guarde as fotos de antes, faça a mudança, gere as de
depois e compare. Diferença que você não sabe explicar é regressão até prova em
contrário. Detalhes em `ferramentas/LEIA-ME.md`.

### Regras de escrita

Vale para código, comentário, documento, decisão e interface. Vale também para
o texto em inglês deste projeto.

- Português brasileiro em tudo que é do produto.
- **Nunca use travessão nem ponto centrado.** Vírgula, ponto ou dois-pontos.
  Vale em inglês também.
- Frase curta e direta.
- Sem jargão de startup.
- Comentário explica o porquê, não o quê.

### Regras de código

- **Cor só por token.** Nenhuma cor de tema hardcoded em componente. Os testes
  em `app/web/src/estilos/*.test.ts` reprovam, e eles varrem o app inteiro.
- **Dado do usuário é sagrado.** Arquivo existente nunca é sobrescrito às
  cegas. Na dúvida, quarentena com data. Arquivo corrompido nunca é trocado por
  estado vazio.
- **Sem valor multilinha em argumento de processo filho.** No Windows, sob
  shell, o `cmd.exe` corta na primeira quebra de linha e leva junto o resto da
  linha de comando, em silêncio. Use stdin ou arquivo. Ver
  `docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.
- **Teste afirma o conteúdo injetado**, não só o entorno. Teste que passaria com
  a injeção apagada não é teste.
- **Nada de dependência nova sem justificativa forte.** Recurso nativo antes de
  biblioteca.
- Nome de arquivo, função e variável em português.

### Estrutura de pastas

```
app/server/src/<modulo>/     estado.ts, rotas.ts, e o teste ao lado
app/web/src/componentes/<area>/   o componente e a folha dele, juntos
app/web/src/api/             cliente HTTP por área
app/web/src/estilos/         tokens, primitivas e camadas de tema
docs/                        contexto, decisões e planos
interno/                     dados que o app LÊ rodando. Não é documentação
ferramentas/                 scripts de conferência, fora do produto
```

Módulo novo de servidor nasce com `estado.ts`, `rotas.ts` e teste, e é
registrado em `app/server/src/index.ts`.

Folha de estilo mora ao lado do componente que ela veste. Em `estilos/` só
entra o que é de todo mundo. A tela não inventa componente: ela compõe
`app/web/src/estilos/primitivas.css` e escreve só o layout dela. Primitiva
faltando sobe pra lá, nunca vira classe local.

### O que provavelmente será recusado

Dito na lata, porque isso poupa o tempo de todo mundo.

- **Qualquer coisa que exija backend hospedado, conta remota ou telemetria.**
  Local-first é fundação, não preferência. O servidor escuta em `127.0.0.1` e
  esse é o produto inteiro.
- **Qualquer coisa que faça o Hub receber ou guardar credencial de IA.** A
  credencial é do usuário. O login acontece no programa oficial do motor, e o
  Hub apenas dispara ele.
- **Dependência nova sem justificativa forte.** A regra é recurso nativo antes
  de biblioteca. "É um pacotinho só" não é justificativa.
- **Cor hardcoded em componente.** Cor entra só por token, e os testes reprovam
  antes mesmo de um humano olhar.
- **Reescrita ampla de estilo de código sem mudança de comportamento.** Diff de
  mil linhas que não muda nada é irrevisável e soterra o histórico.
- **Feature que exija vocabulário técnico do usuário final.** O público é dono
  de negócio, não desenvolvedor. Se precisa de configuração ou de jargão para
  funcionar, não está pronta.
- Qualquer coisa que mande dado pessoal de cliente para um modelo. O que a IA
  recebe do CRM é agregado, com telefone e e-mail removidos por código.

Nada disso é julgamento da ideia. É fronteira deste projeto, e a sua ideia pode
muito bem estar certa em outro lugar.

### Licenciamento da sua contribuição

**Este projeto é licenciado sob AGPL-3.0-or-later.** O autor também oferece o
software sob uma licença comercial separada, para quem quiser construir em cima
sem as obrigações da seção 13 da AGPL. Oferecer as duas se chama licenciamento
duplo, e é possível porque o autor detém o copyright da obra original. Detalhes
no [NOTICE](NOTICE).

**Todo pull request precisa vir com o Developer Certificate of Origin, o DCO,
assinado.** Na prática isso é commitar com `-s`:

```bash
git commit -s -m "sua mensagem aqui"
```

Isso acrescenta uma linha à mensagem do commit:

```
Signed-off-by: Seu Nome <seu.email@exemplo.com>
```

Configure `user.name` e `user.email` no git antes de começar, porque a
assinatura usa eles e precisa ser uma identidade real.

O texto completo do DCO está em <https://developercertificate.org/>. Leia, é
uma página curta.

**O que assinar significa de verdade.** Você está declarando que tem o direito
de contribuir aquele código: que escreveu, ou que pegou de uma fonte cuja
licença permite, e que sabe que a contribuição e a assinatura são públicas e
permanentes.

**Ele não transfere copyright.** Você continua dono do que escreveu. O DCO é
declaração de procedência, não cessão.

**A sua contribuição entra sob AGPL, para todo mundo, sempre.** O que você
mandar entra no projeto sob AGPL-3.0-or-later, e essa concessão é permanente e
irrevogável para todo usuário deste software, inclusive você.

**Sobre um CLA no futuro, com franqueza.** Hoje o que se pede é o DCO. Se o
projeto passar a receber contribuição externa relevante, o autor pretende
adotar um Contributor License Agreement, o CLA, porque o licenciamento duplo
precisa dos direitos para relicenciar a obra inteira e o DCO sozinho não dá
isso. Se acontecer, será comunicado com antecedência, discutido em público, e
aplicado a contribuições novas. Nunca será aplicado retroativamente a
contribuições já integradas sem o consentimento de quem escreveu.

Se qualquer parte disso for problema para você, diga numa issue antes de
escrever o código, não depois.

### Regras de git, e para quem elas valem

São duas situações diferentes, e elas viviam confundidas neste arquivo.

**Contribuidor de fora.** Você abre pull request. Obviamente. Esse é o
mecanismo inteiro, e nada aqui diz o contrário. Branch a partir de `main`,
commit com `-s`, empurra pro seu fork, abre o pull request.

**Agente de IA trabalhando dentro do repositório do mantenedor.** Nunca faça
commit, nunca faça push, nunca abra pull request sem ordem explícita do Jesse.
Sem exceção. O agente executa o trabalho e para no portão. A decisão de gravar
algo no histórico é do mantenedor, e não é delegada.

Os dois casos dividem o resto: branch a partir de `main`, mensagem de commit em
português, no imperativo, dizendo o efeito e não o arquivo, e um commit por
unidade de sentido.

### Trabalhando dentro de uma rodada do mantenedor

Esta seção descreve como o projeto anda por dentro. Você não precisa dela para
mandar um pull request, mas ela explica por que o repositório é como é, e vale
para quem trabalha junto com o mantenedor.

1. **Rodada grande nasce de um plano.** Uma pasta em
   `docs/planos/nome-da-rodada/` com visão, arquitetura e execução. O plano é
   auditado antes de virar código.
2. **Executa por fase.** Cada fase termina verde: typecheck, testes e build.
3. **Registra a decisão.** Toda escolha de produto ou técnica vira
   `docs/decisoes/AAAA-MM-DD-titulo.md`, com contexto, decisão e por quê.
4. **Atualiza o contexto vivo.** Fase fechada ou arquitetura mudada significa
   editar o arquivo correspondente em `docs/contexto/`, na linha que mudou. Não
   reescreva o arquivo inteiro.
5. **Atualiza o mapa.** Criou, removeu, renomeou ou mudou a responsabilidade de
   um módulo, tela, integração ou fluxo? `interno/mapa-sistema.json` é
   atualizado na mesma tarefa. O mapa é contrato vivo, não documentação
   opcional.
6. **Apaga o plano.** Rodada fechada, pasta do plano some.

### Onde pedir ajuda

- **Dúvida, ideia e discussão de desenho:** GitHub Discussions.
- **Bug e pedido concreto de funcionalidade:** as
  [Issues](https://github.com/VirtuoKingdom-OS/VKOS-HUB-LOCAL/issues) do
  GitHub, usando os modelos.
- **Problema de segurança: nunca em público.** Não em issue, não em pull
  request, não em post. Leia o [SECURITY.md](SECURITY.md) e use um dos canais
  privados descritos lá.

Todo mundo que participa concorda com o
[Código de Conduta](CODE_OF_CONDUCT.md).
