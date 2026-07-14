# Contrato do MVP: módulos, endpoints e tipos

Fonte da verdade entre os módulos do app. Quem constrói um módulo segue este contrato à risca. Não editar este arquivo durante a construção. Dúvida ou conflito: anotar no resumo final e seguir o contrato.

## Visão

Cockpit web local. Backend Node (Fastify) na porta **4600**. Frontend React + Vite (dev na 5173 com proxy pro 4600). O backend abre a pasta de um VKOS instalado, orquestra sessões `claude -p` em paralelo e serve as peças geradas. Uma cópia de referência do VKOS está em `../vkos` (relativa à pasta `app/`), usar pra teste manual.

Identidade visual do app: dark, minimalista, verde-menta `#00C896`, alto contraste, glow sutil. UI inteira em português brasileiro.

## Pastas e propriedade (quem escreve onde)

- `app/server/src/index.ts` e `app/server/src/ws.ts`: módulo servidor (backend core).
- `app/server/src/sessoes/`: módulo orquestrador. Exporta `rotasSessoes`.
- `app/server/src/vkos/`: módulo ponte VKOS. Exporta `rotasVkos`. Dono também da rota `/pecas/*`.
- `app/server/src/ambiente/`: módulo onboarding. Exporta `rotasAmbiente`.
- `app/server/src/tipos.ts`: tipos compartilhados, já criado. Não mudar sem anotar no resumo final.
- `app/web/`: módulo visual, dono de tudo dentro.
- `app/dados/`: criado em runtime (`config.json`, `sessoes.json`). Nunca versionar.

Ninguém escreve fora da própria propriedade. Integração final resolve as costuras.

## Convenções entre módulos

- Cada módulo de rotas exporta um `FastifyPluginAsync` com o nome combinado acima.
- `ws.ts` exporta `transmitir(mensagem: object)`: faz broadcast JSON pra todos os clientes WebSocket conectados. Os módulos importam e usam.
- `vkos/estado.ts` exporta `obterPastaVkos(): string | null` e `definirPastaVkos(caminho: string)`. Persiste em `app/dados/config.json`. O orquestrador importa `obterPastaVkos` pra definir o cwd das sessões.
- Imports relativos com extensão `.js` (ESM + NodeNext).
- Código, comentários e mensagens em português brasileiro. Nunca usar travessão nem o caractere de ponto centrado. Frase curta.

## API HTTP (prefixo /api)

### Ambiente (onboarding)
- `GET /api/ambiente` responde `Ambiente` (ver tipos.ts): plataforma, versão do Node, claude instalado e versão.
- `GET /api/ambiente/pastas?caminho=<abs>` navega o filesystem: responde `{ caminho, pai: string | null, pastas: [{ nome, caminho, ehVkos }] }`. `ehVkos` = a pasta tem `cerebro/cerebro.md`. Sem `caminho`, responde as raízes (drives no Windows, `/` no resto). Ignorar pastas ocultas e de sistema. Sanitizar o caminho.

### VKOS (ponte)
- `GET /api/vkos` responde `EstadoVkos`: pasta escolhida, se é válida, se o Cérebro está preenchido, total de skills.
- `POST /api/vkos` body `{ caminho }`: valida (tem `cerebro/cerebro.md` e `.claude/skills/`), persiste e responde `EstadoVkos`. Erro 400 se inválida.
- `GET /api/vkos/cerebro` responde `{ texto, caminho, atualizadoEm, conteudo, preenchido }`. `texto` é o documento completo; `conteudo` é alias legado de `texto`; `atualizadoEm` é o mtime em ISO. 404 se o arquivo não existe. Heurística de preenchido: o conteúdo não tem campos em branco do tipo `✍️`.
- `PUT /api/vkos/cerebro` body `{ texto }`: grava o cerebro.md (atômico, backup automático em `cerebro/.backup-cerebro-<carimbo>.md` antes da primeira gravação de cada boot). 413 acima de 512 KB. Responde o mesmo shape do GET e transmite `{ tipo: "cerebro:atualizado" }`.
- `POST /api/anexos` body `{ nome, conteudoBase64 }`: salva anexo do composer em `materiais/cockpit/anexos/<AAAA-MM-DD>/` na pasta do VKOS. Extensões: png, jpg, jpeg, webp, gif, svg, md, txt, pdf, csv, json. Limite 15 MB. Responde 201 `{ caminhoRelativo }` (relativo à pasta do VKOS, barras normais). Erros 400/413.
- `GET /api/vkos/skills` responde `{ skills: SkillVkos[] }`. Lê o frontmatter (name, description) de cada `.claude/skills/*/SKILL.md`. Atenção: description costuma ser YAML multilinha com `>`.
- `GET /api/vkos/pecas` responde `{ pecas: Peca[] }`. Escaneia `conteudo/*/` na pasta do VKOS. Inferência de tipo: `instagram/*.png` é carrossel, `post/*.png` (ou `instagram-post/*.png`) é post, `instagram-stories/*.png` (ou `stories/*.png`) é stories, `.html` é site, `.md` é texto, resto é outro.
- `GET /pecas/*` (sem prefixo /api): serve arquivo estático de dentro de `conteudo/` da pasta VKOS escolhida. Sanitizar: nunca servir fora de `conteudo/`.
- Observador: `fs.watch` (com debounce) em `conteudo/`. Em mudança, `transmitir({ tipo: "pecas:atualizadas" })`.

### Sessões (orquestrador)
- `GET /api/sessoes` responde `{ sessoes: Sessao[] }`.
- `POST /api/sessoes` body `{ titulo?, prompt, skill? }`: cria e inicia uma sessão. Responde `{ sessao: Sessao }` (status `iniciando` ou `fila`). cwd = `obterPastaVkos()`. Erro 400 se não há pasta VKOS.
- `POST /api/sessoes/:id/mensagem` body `{ texto }`: continua a sessão via `--resume <sessionIdClaude>`. Responde `{ ok: true }`.
- `POST /api/sessoes/:id/parar`: mata o processo. Responde `{ ok: true }`.
- Limite: **5 sessões rodando ao mesmo tempo**. Acima disso entra em `fila` e sobe quando abrir vaga.
- Persistência: índice em `app/dados/sessoes.json`, carregado no boot (sessões antigas voltam como `concluida`, `erro` ou `parada`, nunca `rodando`).

## WebSocket (rota /ws)

Servidor manda pro cliente (JSON por mensagem):
- `{ tipo: "sessao:evento", id, evento }` onde `evento` é a linha parseada do stream-json do claude (init, assistant, stream_event, result etc). Repassar cru, o frontend decide o que renderizar.
- `{ tipo: "sessao:status", id, status, detalhe? }` a cada transição de status.
- `{ tipo: "pecas:atualizadas" }` quando `conteudo/` muda.

Cliente não precisa mandar nada. Ações vão por REST.

## Como spawnar o claude

- Comando: `claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages --permission-mode acceptEdits`
- Ferramentas liberadas pro render funcionar: `--allowedTools "Bash(node:*)" "Bash(npm:*)" "Bash(npx:*)"`. Verificar a sintaxe exata com `claude --help` antes de fixar.
- Windows: `spawn` com `shell: true` (o binário é `claude.cmd`). Ler stdout linha a linha (as linhas são JSON).
- Capturar `session_id` do evento `init` e guardar em `sessionIdClaude` pro `--resume`.
- `cwd` = pasta do VKOS. O CLAUDE.md de lá garante a leitura do Cérebro. Não injetar o Cérebro no prompt.
- Fim do processo: evento `result` traz custo e resultado. Exit code diferente de 0 sem result = status `erro`.

## Fluxos do MVP (o que o frontend expõe)

| Fluxo | Prompt disparado |
|---|---|
| Carrossel | `/carrossel <tema>` |
| Post | `/legenda <tema>` (variações: `/ideias`, `/semana`) |
| Stories | `/stories <tema>` |
| Site e páginas | `/site`, `/landing <oferta>`, `/blog <tema>` |

## Portas e dev

- Backend: 4600. Frontend dev: 5173 com proxy de `/api`, `/ws` (ws: true) e `/pecas` pro 4600.
- Produção local: o backend serve `app/web/dist` se existir.
- Rodar tudo: `npm run dev` na pasta `app/` (workspaces).

---

# Extensão 2026-07-11: imersão, nós de contexto e canvas persistido

Decisões registradas em `decisoes/2026-07-11-imersao-e-menu-proprio.md` e `decisoes/2026-07-11-nos-de-contexto-e-economia-de-tokens.md`.

## Propriedade nova

- `app/server/src/contextos/`: módulo de nós de contexto. Exporta `rotasContextos`.
- `app/server/src/canvas/`: persistência do layout do canvas. Exporta `rotasCanvas`.
- Módulo sessões ganha `DELETE /api/sessoes/:id`.
- Tipos `Contexto` e `ArquivoContexto` já estão em `tipos.ts`.

## Nós de contexto (API)

Conteúdo salvo na pasta do VKOS em `materiais/cockpit/<slug>/`: texto em `notas.md`, anexos como arquivos. Índice em `app/dados/contextos.json` (id, nome, slug, datas). A lista de arquivos é derivada do disco a cada leitura, o disco é a fonte da verdade.

- `GET /api/contextos` responde `{ contextos: Contexto[] }`.
- `POST /api/contextos` body `{ nome }`: cria (slug único gerado do nome, imutável depois), cria a pasta. Erro 400 sem pasta VKOS.
- `PATCH /api/contextos/:id` body `{ nome?, texto? }`: renomeia (só o nome de exibição, slug não muda) e grava `notas.md`.
- `DELETE /api/contextos/:id`: remove a pasta inteira e a entrada do índice.
- `POST /api/contextos/:id/arquivos` multipart (@fastify/multipart): salva anexos na pasta. Limite 25MB por arquivo. Colisão de nome: sufixo numérico. Responde o `Contexto` atualizado.
- `DELETE /api/contextos/:id/arquivos/:nome`: remove um anexo.
- `GET /api/contextos/:id/arquivos/:nome`: serve o anexo com content-type certo (preview no nó). Sanitizar: nunca servir fora da pasta do contexto.

## Canvas persistido (API)

O backend NÃO interpreta o layout: persiste JSON opaco do frontend. Escopado por workspace em `app/dados/workspaces/<id>/canvas.json` (ver a extensão da rodada 8). Sem workspace ativo, o GET responde `{}` e o PUT responde `{ ok: true }` sem gravar.

- `GET /api/canvas` responde o JSON gravado do workspace ativo, ou `{}` se não existe.
- `PUT /api/canvas` grava o body inteiro no canvas do workspace ativo. Frontend salva com debounce de 1s. O body pode trazer `workspaceId` (string): se vier e NÃO bater com o workspace ativo, o servidor responde `409 { erro: "canvas de outro cliente, gravacao recusada" }` sem gravar (guarda contra duas abas ou troca rápida de cliente). O campo `workspaceId` nunca é persistido dentro do `canvas.json` (é removido antes de gravar). Sem `workspaceId` (cliente antigo), grava no ativo como antes.

## Sessões (API nova)

- `DELETE /api/sessoes/:id`: para o processo se estiver rodando e remove a sessão do índice. 404 se não existe.

## Montagem do prompt (convenção do frontend, a economia de tokens)

O prompt de uma sessão é montado assim, e cada seção só entra se tiver conteúdo:

```
<comando da skill> <tema>

Detalhes adicionais do usuario: <texto do campo de detalhes>

Materiais anexados pelo usuario nesta tarefa (leia o que for util antes de comecar):
- materiais/cockpit/<slug-1>/ (<nome do nó 1>)
- materiais/cockpit/<slug-2>/ (<nome do nó 2>)
```

Regras: anexo NUNCA entra inline no prompt, só a referência da pasta. O Cérebro NUNCA é injetado (o CLAUDE.md do VKOS manda ler). Um nó de contexto só entra quando está conectado ao nó da sessão no canvas.

---

# Extensão rodada 3 (2026-07-11): tipos de nó e navegação lateral

Decisão registrada em `decisoes/2026-07-11-tipos-de-no-e-navegacao-lateral.md`.

## Contexto tipificado (backend)

- `Contexto` ganha `tipo: "texto" | "imagens"` (já em tipos.ts). Imutável depois de criado, como o slug.
- `POST /api/contextos` body `{ nome, tipo? }`. Sem tipo, vale `texto`. Tipo inválido: 400.
- `PATCH` NÃO muda tipo.
- Adoção de pasta órfã infere: tem arquivo de imagem (png/jpg/jpeg/webp/gif/svg) vira `imagens`, senão `texto`.
- Índices antigos sem tipo: normalizar pra `texto` na carga (ou inferir do disco, decisão do módulo, anotar no retorno).

## Convenção do prompt (atualizada)

A linha de material passa a indicar o tipo:
`- materiais/cockpit/<slug>/ (<nome>, tipo <tipo>)`

## Nós tipificados (frontend, cockpit)

- Nó `texto`: bloco de notas. Redimensionável (NodeResizer do @xyflow/react), o textarea acompanha o tamanho. Tela cheia: modal centralizado estilo editor (título editável, texto grande, autosave contínuo, Esc ou x fecha, fundo escurecido com blur).
- Nó `imagens`: grade de miniaturas (2 ou 3 colunas), adicionar por colar, arrastar ou botão (aceita só imagem na UI). Clique abre lightbox. Tela cheia: grade ampliada centralizada.
- Dimensões persistem no canvas.json (versão 2): cada nó pode ter `dimensoes: { largura, altura }`.
- O menu de contexto do canvas oferece a criação dos dois tipos.

## Shell de navegação (frontend, fora do cockpit)

- Menu lateral esquerdo fixo (~240px), padrão VK: marca em cima, itens com ícone, ativo com acento menta.
- Itens: "Cockpit" (o canvas) e a seção "Fluxos", dinâmica: um item por tipo de peça existente em `GET /api/vkos/pecas` (Carrossel, Stories, Site, Post). Contador de peças por item.
- Tela de fluxo: as gerações daquele tipo agrupadas por pedido (a subpasta de `conteudo/`), card com tema, data e previews, lightbox pra ampliar. Atualiza no evento `pecas:atualizadas`.
- O painel recolhível de peças do cockpit SAI. A galeria vive nas telas de fluxo.
- Status (Claude, WebSocket, sessões N/5) continua visível no shell.

## Fronteiras de propriedade da rodada 3

- Módulo backend: `app/server/src/contextos/` somente.
- Módulo cockpit: `app/web/src/componentes/cockpit/`, `app/web/src/estilos/canvas.css`, e SÓ as funções de contexto em `app/web/src/api/cliente.ts` (criarContexto ganha tipo) e `app/web/src/estado/contexto.tsx` (repassar tipo). Remove a renderização do painel de peças de dentro do cockpit.
- Módulo shell: todo o resto de `app/web/src` (App.tsx, layout novo, telas de fluxo, `componentes/pecas/`, `estilos/global.css`). NÃO edita `api/cliente.ts`, `estado/contexto.tsx` nem nada em `componentes/cockpit/`.
- `tipos.ts` e `tipos/dominio.ts` já têm o campo tipo, ninguém mexe.

---

# Extensão rodada 4 (2026-07-11): visão viva, downloads e links

Decisão registrada em `decisoes/2026-07-11-cockpit-visao-viva-downloads-e-links.md`.

## Tipo links (backend, módulo contextos)

- `TipoContexto` ganhou `"links"` (já em tipos.ts). POST aceita, validação atualizada, imutável como antes.
- Conteúdo: no `notas.md` do nó, uma linha por link no formato `- <url> <descrição opcional>`. Parser tolerante: qualquer linha contendo http conta como link.
- Inferência (adoção e normalização), na ordem: tem imagem vira `imagens`; senão, `notas.md` tem alguma linha com http vira `links`; senão `texto`.

## ZIP das gerações (backend, módulo vkos)

- `GET /api/vkos/pecas/:pasta/zip`: streama um ZIP com as IMAGENS de preview da peça, em ordem natural.
- Convenção de nome (vale pro backend e pro frontend): base = tema da peça só com letras e números (`bolo-sem-susto` vira `bolosemsusto`); arquivos `<base>01.png`, `<base>02.png`... (dois dígitos); o zip se chama `<base>.zip` (header Content-Disposition).
- 404 se a pasta não existe, 400 se a peça não tem imagem. Dependência: `archiver`.

## Cockpit como visão viva (frontend, cockpit)

- Barra de fluxos deixa de ser fixa: vira popover ancorado que abre ao CLICAR no nó Cérebro (e fecha com Esc, clique fora ou ao criar o fluxo). "Ver Cérebro" continua no menu de botão direito. NADA no cockpit usa position fixed que vaze pra outras telas (modais via portal são a exceção consciente, fecham com Esc).
- Nós de geração: cada `Peca` vira um nó no canvas, id determinístico `pec-<pasta>`, conectado ao Cérebro por aresta discreta. Mostra tipo, tema, data e miniatura(s). Clique amplia (lightbox). Sincroniza com o estado de pecas (mesmo padrão do sync de contextos), posição persiste no canvas.json v2. Nó some se a pasta sumir do disco.
- Nó de contexto tipo links: lista de links (título curto da url + descrição), campo de adicionar (url + descrição opcional), abrir em nova aba, remover. Serializa pro notas.md no formato acima.

## Editor compartilhado (dono: cockpit; consumidor: shell)

- `componentes/comum/EditorContexto.tsx` exporta `EditorContexto` com props `{ contexto, aberto, aoFechar }`. É o modal de tela cheia centralizado que já existe pro texto, estendido pra cobrir os 3 tipos (texto: editor; imagens: grade ampliada com adicionar/remover; links: lista com adicionar/remover). Autosave e Esc como hoje. O shell importa esse componente, não cria outro.

## Fontes de dados e downloads (frontend, shell)

- Sidebar ganha a seção "Fontes de dados" abaixo de Fluxos: itens Textos, Imagens e Links (só os tipos presentes, com contagem), derivados de `contextos` do estado global.
- Tela de fonte: grade de cards (nome, atualizada em, prévia do conteúdo: trecho do texto, miniaturas ou primeiros links). Ações: abrir (EditorContexto), excluir (confirmação própria). Botão "Nova fonte" cria via estado (`criarContexto(nome, tipo)`).
- Telas de fluxo melhoradas: cards maiores e mais generosos (a seção de cada geração cresce), botão de download EM CADA imagem (anchor com download renomeado pela convenção `<base>NN.<ext>`), e botão "Baixar tudo" no card chamando o endpoint do zip. Os dois botões de download só em peças de imagem (carrossel, stories).

## Fronteiras de propriedade da rodada 4

- Backend links: `app/server/src/contextos/` somente.
- Backend zip: `app/server/src/vkos/` (novo `zip.ts` + registro no `rotas.ts` do vkos) e a dependência `archiver` no `app/server/package.json`.
- Cockpit: `componentes/cockpit/`, `estilos/canvas.css`, `componentes/comum/EditorContexto.tsx` (novo), e se precisar, repasses mínimos em `estado/contexto.tsx` e `api/cliente.ts` (só funções de contexto).
- Shell: `App.tsx`, `componentes/layout/`, `componentes/telas/`, `componentes/pecas/`, `estilos/global.css`. NÃO edita cockpit/, comum/EditorContexto.tsx, api/cliente.ts, estado/contexto.tsx.
- `tipos.ts` e `tipos/dominio.ts` já atualizados com links, ninguém mexe.

---

# Extensão rodada 5 (2026-07-11): conversa, custos, modelos e terminal

Decisão registrada em `decisoes/2026-07-11-cockpit-conversacional-custos-e-terminal.md`.
IMPORTANTE nesta rodada: NENHUM agente edita `app/server/src/index.ts`. Cada módulo exporta seus plugins e anota no retorno; a integração final registra tudo.

## Modelo e tokens por sessão (backend, módulo sessoes)

- `POST /api/sessoes` aceita `modelo?` ("opus" | "sonnet" | "haiku"). Com modelo, o spawn ganha `--model <modelo>`. Sem modelo, usa o padrão da config.
- Capturar do stream: o modelo real (evento init traz `model`), e do evento result os tokens (`usage.input_tokens` e `usage.output_tokens`, VERIFICAR os nomes reais no CLI da máquina). Gravar em `modelo`, `tokensEntrada`, `tokensSaida` da Sessao (tipos.ts já atualizado). Continuações (`--resume`) acumulam tokens e custo.
- Transcrição: gravar os turnos da conversa em `app/dados/transcricoes/<id>.json` (`TurnoSessao[]`): prompt inicial e cada mensagem viram turno `usuario`; cada result vira turno `assistente` (com custoUsd do trecho). `GET /api/sessoes/:id/transcricao` responde `{ turnos: TurnoSessao[] }` (vazio se não há arquivo). Apagar a transcrição junto com a sessão no DELETE.
- Custos acumulados: manter `app/dados/custos.json` (`{ totalUsd, totalSessoes, tokensEntrada, tokensSaida }`), somado a cada result mesmo que a sessão seja apagada depois. `GET /api/custos` responde esse objeto.

## Config (backend, módulo novo config)

- `app/server/src/config/rotas.ts` exporta `rotasConfig`: `GET /api/config` responde `{ modeloPadrao }` e `PATCH /api/config` body `{ modeloPadrao? }` valida ("opus" | "sonnet" | "haiku") e persiste em `app/dados/config-app.json`. Padrão inicial: "sonnet".

## Modelos de carrossel (backend, módulo vkos)

- `GET /api/vkos/modelos-carrossel` responde `{ modelos: ModeloCarrossel[] }` (tipos.ts). Fonte: os arquivos `templates/carrossel/modelo-*.html` da pasta VKOS cruzados com as descrições de `templates/carrossel/estilos.md`. `id` = miolo do nome do arquivo (ex: "vkos02", "dark"), `nome` legível, `descricao` curta tirada do estilos.md (parser tolerante; sem descrição, string vazia), `pedeImagem` conforme o estilos.md/SKILL (vkos 01, 03, 06, 07, 08, 09, editorial, declaracao e produto pedem imagem).

## Convenção do prompt (carrossel com estilo)

Quando o usuário escolher um modelo de carrossel, o prompt ganha o sufixo: `/carrossel <tema>, usando o modelo <id>` (ex: "usando o modelo vkos03"). Sem escolha, o prompt fica como está (a skill decide).

## Terminal no canvas (REMOVIDO em 2026-07-13)

O módulo terminal (PTY no backend, xterm no front, nó no canvas) foi removido por inteiro no enxugamento da reestruturação (ver decisoes/2026-07-13-reestruturacao-vkos-hub.md). Não existem mais `app/server/src/terminal/`, `app/web/src/componentes/terminal/`, as rotas `/api/terminais`, o WS `/ws/terminal/:id`, nem as dependências `@lydell/node-pty`, `@xterm/xterm` e `@xterm/addon-fit`. Nós tipo `terminal` e arestas `aresta-terminal` salvos em canvas antigos são descartados na carga (migração silenciosa).

No mesmo enxugamento, os fluxos Post e Stories saíram dos menus de criação (flag `oculto` em config/fluxos.ts). Sessões e peças antigas desses tipos continuam renderizando.

## Cockpit (frontend, módulo cockpit)

- POPOVER DO CÉREBRO CORRIGIDO: ancorado ao NÓ em coordenadas de fluxo. Acompanha pan e zoom (usa o viewport do React Flow pra reprojetar a cada mudança). Flip: abre pra cima quando não cabe embaixo da âncora. Botão x de fechar sempre visível, além de Esc e clique fora.
- BOTÃO RECARREGAR: na moldura do cockpit (canto superior direito da área do canvas, position absolute na moldura, fora do mundo infinito), ícone que gira enquanto recarrega: refaz pecas, contextos, sessões, skills e canvas, e re-sincroniza os nós. Estado de carregamento visível no boot do canvas (indicador discreto enquanto o primeiro sync não termina).
- NÓ DE SESSÃO VIRA CONVERSA: renderiza o histórico de turnos (bolhas ou blocos: usuário à direita em tom neutro, IA à esquerda com acento), carrega a transcrição (`GET /api/sessoes/:id/transcricao`) ao montar quando a sessão já existia, streaming ao vivo vira o turno em andamento, campo de mensagem SEMPRE visível embaixo (desabilitado enquanto roda), enviar usa a rota de mensagem existente. Custo e tokens da sessão visíveis no rodapé do nó (ex: "$0.14 · 1.2k → 3.4k" SEM o caractere de ponto centrado, usar seta ou barra).
- COMPOSER: seletor de modelo (Opus, Sonnet, Haiku) com o padrão vindo de `GET /api/config`, rótulo honesto de custo relativo (Opus mais caro, Haiku mais barato). No fluxo Carrossel, seletor de estilo alimentado por `GET /api/vkos/modelos-carrossel` (cards pequenos com nome e descrição, opcional, com "deixar a IA escolher" como padrão).
- Custo total no shell: o rodapé da sidebar mostra o acumulado de `GET /api/custos` (atualiza depois de cada sessão concluída).

## Fronteiras da rodada 5

- Backend claude: `app/server/src/sessoes/`, `app/server/src/config/` (novo), `app/server/src/vkos/modelos.ts` (novo, + registro da rota no rotas.ts do vkos). NÃO edita index.ts.
- Terminal (full-stack): `app/server/src/terminal/` (novo), `app/web/src/componentes/terminal/` (novo), deps em server/package.json e web/package.json. NÃO edita index.ts nem nada do cockpit.
- Cockpit UX: `componentes/cockpit/`, `estilos/canvas.css`, `api/cliente.ts`, `estado/contexto.tsx`, `config/fluxos.ts`, `componentes/layout/Sidebar.tsx` e `Shell.tsx` (só o custo total no rodapé). Importa `NoTerminal`/`criarTerminal` de `componentes/terminal/` confiando no contrato.
- `tipos.ts` e `dominio.ts` já atualizados (Sessao com modelo/tokens, TurnoSessao, ModeloCarrossel). Ninguém mexe.
- Integração final (fora dos agentes): registra `rotasConfig`, `rotasTerminal` (com /api) e `wsTerminal` (sem prefixo) no index.ts.

## Imersão (convenção do frontend)

- `contextmenu` nativo bloqueado globalmente, substituído por menu próprio no padrão VK, sensível ao alvo (nó de sessão, nó de contexto, nó do Cérebro, canvas vazio).
- Teclas interceptadas: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U.
- Fronteira honesta: DevTools ainda é alcançável pelo menu do navegador. Bloqueio absoluto só no shell empacotado, fase futura.

---

# Extensão rodada 8 (2026-07-12): workspaces multi-cliente (múltiplos Cérebros)

Decisão registrada em `decisoes/2026-07-12-multiplos-cerebros-workspaces.md`.

O Jesse é prestador de serviço e gerencia N clientes. Um workspace por cliente, cada workspace é uma pasta VKOS completa. As skills leem `cerebro/cerebro.md` relativo ao cwd, então o isolamento vem da pasta. O estado do app, antes global em `app/dados/`, passa a ser escopado por workspace em `app/dados/workspaces/<id>/`.

## Propriedade nova

- `app/server/src/workspaces/`: módulo de workspaces. Exporta `rotasWorkspaces` (montado sob `/api`). Arquivos: `estado.ts` (registro + resolvedores de caminho, módulo folha), `ativacao.ts` (troca de workspace ativo), `migracao.ts`, `clonagem.ts` (cliente novo), `rotas.ts`.
- `tipos.ts`: `Sessao` ganhou `workspaceId?: string`.

## Registro

- `app/dados/workspaces.json`: `{ workspaces: [{ id, nome, pasta, criadoEm, ultimoUso }], ativo: string | null }`. `id` é slug curto único (`w-<base36>`).
- `estado.ts` exporta os resolvedores centrais: `idWorkspaceAtivo(): string | null`, `pastaDadosWorkspace(id): string` (= `app/dados/workspaces/<id>/`), `pastaTranscricoesWorkspace(id)`, `listarIdsWorkspaces()`. Os módulos canvas, contextos, custos, transcrição e sessões resolvem o caminho POR CHAMADA (nunca cacheiam caminho em constante de módulo, o workspace troca em runtime).

## Workspaces (API)

Convenção de resposta: as rotas que criam, ativam ou renomeiam um workspace respondem `{ workspace, workspaces, ativo }`, onde `workspace` é o alvo explícito da ação (o criado, ativado ou renomeado) e `{ workspaces, ativo }` é o registro inteiro. Isso evita o frontend adivinhar qual foi o alvo (conserta o renomear que não atualizava na tela e o remonte espúrio do cockpit). O GET e o DELETE respondem só o registro `{ workspaces, ativo }`.

- `GET /api/workspaces` responde o registro inteiro `{ workspaces, ativo }`.
- `POST /api/workspaces` body `{ pasta, nome? }`: valida a pasta como VKOS (mesma do `POST /vkos`: tem `cerebro/cerebro.md` e `.claude/skills/`), recusa pasta já registrada (400), registra, ATIVA e responde `{ workspace, workspaces, ativo }`. `nome` default: último segmento da pasta.
- `POST /api/workspaces/:id/ativar`: aponta a pasta VKOS ativa (via `definirPastaVkos`, religa o watcher de peças), atualiza `ultimoUso` e `ativo`, transmite `{ tipo: "workspace:ativado", id }` pelo WebSocket, responde `{ workspace, workspaces, ativo }`. 404 se o id não existe.
- `PATCH /api/workspaces/:id` body `{ nome }`: renomeia e responde `{ workspace, workspaces, ativo }`. 400 sem nome, 404 se não existe.
- `DELETE /api/workspaces/:id`: remove SÓ do registro e responde `{ workspaces, ativo }`. NUNCA apaga a pasta VKOS do cliente nem a pasta de dados `app/dados/workspaces/<id>` (fica órfã em disco de propósito). Antes de remover do registro, para e remove do gerenciador todas as sessões daquele workspace (nada de processo `claude` rodando invisível) e invalida o cache de contextos dele. 400 se for o workspace ativo, 404 se não existe.
- `POST /api/workspaces/novo` body `{ nome, pastaDestino }`: cria um cliente novo clonando a ESTRUTURA do ativo. Copia `.claude/`, `templates/`, `identidade/` e uma lista branca de arquivos de raiz (`CLAUDE.md`, `LEIA.md`, `LEIA-ME.md`, `README.md`, `package.json`, `package-lock.json`, `.gitignore`), nada além. NÃO copia `node_modules/`, `conteudo/`, `materiais/` nem `.git/`. O `cerebro/cerebro.md` do novo nasce em branco: só os títulos de seção (linhas com `#`) do cérebro ativo, com o corpo trocado por `✍️`. Para o `node_modules`: tenta uma junction do Windows apontando pro do ativo; se falhar, segue e devolve `avisos: ["rode npm install na pasta nova"]`. Valida `pastaDestino`: absoluta, e não existente ou vazia. Registra e ativa. Responde `{ workspace, workspaces, ativo, avisos }`.

## Compatibilidade

- `POST /api/vkos` numa pasta, além do comportamento atual, registra (ou reaproveita) e ATIVA o workspace correspondente, pra o onboarding existente continuar redondo.
- `GET /api/custos` devolve o acumulado do workspace ativo `+ { totalGeralUsd }` somando todos os workspaces.

## Sessões cruzadas (API e WS)

- O gerenciador continua ÚNICO na memória com TODAS as sessões de todos os workspaces (sessão do cliente A continua rodando com o B ativo). Cada `Sessao` tem `workspaceId`.
- Persistência: cada sessão vai pro `sessoes.json` do SEU workspace. No boot, carrega de todos os workspaces do registro (sessões antigas voltam paradas, nunca rodando).
- `GET /api/sessoes` devolve só as do workspace ativo. `?todas=1` devolve tudo (pro futuro).
- Os eventos WS `sessao:status` e `sessao:evento` ganharam `workspaceId`, pro frontend ignorar os de workspaces inativos.
- Transcrição e custos do `result` vão pro workspace DA SESSÃO, não pro ativo no momento.
- O limite de 5 sessões ativas continua GLOBAL (é limite de máquina).

## Estado escopado

- `canvas.json`, `contextos.json`, `sessoes.json`, `custos.json` e `transcricoes/` passam a viver em `app/dados/workspaces/<id>/`. Sem workspace ativo, as rotas de canvas e contextos respondem vazio (`{}` / lista vazia) e a de custos responde zerado `+ totalGeralUsd`.

## Migração (boot, idempotente)

- No boot (em `index.ts`, antes de carregar as sessões): se `workspaces.json` NÃO existe E existe estado legado direto em `app/dados/` (`canvas.json`, `sessoes.json`, `custos.json`, `contextos.json` ou `transcricoes/`) E há uma pasta VKOS configurada no `config.json`: cria o workspace "principal" (nome: último segmento da pasta VKOS), MOVE os arquivos legados pra `app/dados/workspaces/<id>/` (sessões legadas ganham o `workspaceId` do principal) e marca ativo.
- Sem pasta VKOS configurada: não migra, o registro nasce vazio e o legado fica quieto.
- Nunca apaga dado, só move. Rodar o boot de novo depois da migração não duplica nem move nada (o `workspaces.json` já existe).
- O carregamento das sessões deixou de ser no construtor do gerenciador: `index.ts` chama `gerenciador.inicializar()` depois da migração, pra o registro já estar pronto.

---

# Rodada 10 (2026-07-13): VKOS-IDE, Conexões MCP e CRM (fases 4, 5 e 6)

Quatro agentes em paralelo. Cada um e dono EXCLUSIVO dos seus arquivos. Regras gerais: português brasileiro, NUNCA travessão nem o caractere de ponto centrado, frase curta, toda cor via tokens de tema de `web/src/estilos/global.css` (o app tem tema escuro e claro, tudo precisa funcionar nos dois), escrita de estado em disco sempre atômica via `server/src/util/gravarJson.ts`, caminhos de arquivo SEMPRE sanitizados (resolve + startsWith na base, nunca aceitar `..`). Ninguém toca em: vkos/.claude/skills/carrossel/SKILL.md, estado/contexto.tsx (exceto onde dito), api/cliente.ts, tipos/dominio.ts, index.ts do server (a integração final registra as rotas), Shell.tsx e Sidebar.tsx (integração final).

## Sessões: extensões (dono: agente IDE-backend)

Arquivos: `server/src/sessoes/gerenciador.ts` e `server/src/sessoes/rotas.ts` (SO ele edita esses dois), mais `server/src/ide/` (novo).

1. `POST /api/sessoes` aceita campo opcional `permissao?: "padrao" | "total"`. padrao = `--permission-mode acceptEdits` (comportamento atual). total = `--permission-mode bypassPermissions`. O valor persiste na sessão e vale nas continuações (resume). Campo novo `permissao` devolvido na sessão.
2. Eventos de ferramenta: o parser do stream-json passa a detectar blocos `tool_use` e transmite via WS o evento `sessao:ferramenta` com `{ id: <idSessao>, nome: <nome da ferramenta>, alvo: <resumo curto: file_path, comando ou vazio> }`. Não alterar em nada o fluxo atual de texto/status/custos.
3. MCP: no spawn, chamar `montarConfigMcp(workspaceIdDaSessao)` de `../conexoes/mcp.js` (contrato abaixo). Se devolver caminho, empurrar `--mcp-config <caminho>` nos args e liberar as ferramentas dos servidores habilitados no `--allowedTools` (prefixo `mcp__<idServidor>`). Se devolver null, nada muda.
4. API de arquivos da IDE, escopada na pasta do workspace ATIVO (`server/src/ide/rotas.ts`, prefixo /api):
   - `GET /api/ide/arvore` responde `{ base: <nome da pasta>, itens: No[] }` com `No = { nome, caminho (relativo), tipo: "pasta"|"arquivo", filhos?: No[] }`. Ignora node_modules, .git, dist. Profundidade máxima 8.
   - `GET /api/ide/arquivo?caminho=rel` responde `{ caminho, conteudo, tamanho }`. Recusa binário (heurística de bytes nulos) e arquivo acima de 1MB com 413.
   - `PUT /api/ide/arquivo` body `{ caminho, conteudo }`: grava atômico. Cria se não existir.
   - `POST /api/ide/pasta` body `{ caminho }`: mkdir recursivo.
   - `POST /api/ide/renomear` body `{ de, para }`.
   - `DELETE /api/ide/arquivo?caminho=rel`: arquivo ou pasta vazia. Pasta cheia responde 409.
   - Toda rota responde erro no formato `{ erro: mensagem }`.

## VKOS-IDE frontend (dono: agente IDE-frontend)

Arquivos: `web/src/componentes/ide/` (novo), `web/src/estilos/ide.css` (novo), `web/src/api/ide.ts` (novo, fetch próprio no padrão { erro }), e UMA adição pontual em `web/src/estado/contexto.tsx`: o handler do evento WS `sessao:ferramenta`, que acrescenta `{ nome, alvo }` em `streams[id].ferramentas` (novo campo opcional de EstadoStream, limitado às últimas 200 entradas). Nada mais muda no contexto.

- Exporta `TelaIde` (componente de tela cheia da área central, mesmo padrão das telas de fluxo). Layout em três colunas: árvore de arquivos (esquerda, 240px, expansão por pasta), editor (centro), chat Claude (direita, 340px, recolhível).
- Editor: textarea com fonte mono, números de linha simples, Ctrl+S salva (PUT), indicador de sujo/salvo, aviso ao trocar de arquivo com mudança não salva. Sem dependência nova de editor pesado nesta fase.
- Árvore: clique abre arquivo; botão direito com menu próprio (novo arquivo, nova pasta, renomear, excluir com confirmação em dois cliques no padrão do app: balão clicável, desarme por tempo, nunca por mouseleave).
- Chat: cria sessão via estado (`criarSessao`) com título "Sessão da IDE", conversa igual ao padrão do app (transcrição + stream ao vivo), e mostra as FERRAMENTAS ao vivo: cada entrada de `streams[id].ferramentas` vira uma linha discreta no fluxo da conversa (ícone + nome + alvo). Seletor de permissão VISÍVEL antes de criar a sessão: "Seguro" (padrao) ou "Poder total" (total), com uma frase honesta do que significa. Passa `permissao` no criarSessao (o campo novo do backend).
- Depois que a árvore ou o chat alterarem arquivos, botão de recarregar árvore. Tudo nos dois temas.

## Conexões MCP (dono: agente Conexões, full-stack)

Arquivos: `server/src/conexoes/` (novo: rotas.ts, estado.ts, mcp.ts), `web/src/componentes/conexoes/` (novo), `web/src/estilos/conexoes.css` (novo), `web/src/api/conexoes.ts` (novo).

- Estado por workspace em `app/dados/workspaces/<id>/conexoes.json`: `{ servidores: { [id]: { habilitado: boolean, config: Record<string,string> } } }`. Escrita atômica. Tokens ficam SO nesse arquivo local; a tela avisa isso com uma frase.
- Catálogo fixo em `server/src/conexoes/catalogo.ts`: github (`npx -y @modelcontextprotocol/server-github`, env GITHUB_PERSONAL_ACCESS_TOKEN), netlify (`npx -y @netlify/mcp`, env NETLIFY_PERSONAL_ACCESS_TOKEN), vercel (http `https://mcp.vercel.com`, header Authorization com token), notion (`npx -y @notionhq/notion-mcp-server`, env NOTION_TOKEN). Cada entrada: id, nome, descricao curta, campos de config (rotulo, chaveEnv, segredo: true). Conferir na internet o pacote/endpoint atual de cada um antes de fechar o catálogo; se algum não tiver MCP oficial estável, marcar `disponivel: false` com nota honesta.
- Mais duas entradas de vitrine da fase 7, `disponivel: false`: meta (WhatsApp e Instagram) e googleads, com descrição "precisa de app e credenciais próprias; entra na fase 7".
- `GET /api/conexoes` devolve catálogo + estado do workspace ativo (segredos mascarados: só os 4 últimos caracteres). `PUT /api/conexoes/:id` body `{ habilitado, config? }`.
- `montarConfigMcp(workspaceId): { caminho: string, servidores: string[] } | null` em mcp.ts: monta o JSON de mcp servers dos habilitados com config completa, grava atômico em `app/dados/workspaces/<id>/mcp-config.json` e devolve o caminho e os ids habilitados. Sem nenhum habilitado, null. Exporta também os tipos.
- `TelaConexoes`: cards por serviço (nome, descrição, campo de token com olho de revelar, toggle habilitar, estado salvo com feedback), aviso local-first, cards indisponíveis com selo "em breve". Dois temas.

## CRM (dono: agente CRM, full-stack)

Arquivos: `server/src/crm/` (novo), `web/src/componentes/crm/` (novo), `web/src/estilos/crm.css` (novo), `web/src/api/crm.ts` (novo).

- Estado por workspace em `app/dados/workspaces/<id>/crm.json`: `{ colunas: [{ id, nome, ordem }], contatos: [{ id, nome, empresa?, telefone?, email?, origem?, valorEstimado?, colunaId, tags: string[], notas: [{ em, texto }], criadoEm, atualizadoEm }] }`. Colunas padrão na primeira leitura: Novo contato, Conversando, Proposta enviada, Fechado, Perdido. Escrita atômica.
- Rotas REST sob /api/crm: GET tudo; POST/PATCH/DELETE de contato; POST de nota; PATCH de mover contato de coluna; POST/PATCH/DELETE/reordenar de colunas. Erros `{ erro }`.
- `TelaCrm`: kanban com as colunas personalizáveis (criar, renomear inline, excluir com confirmação dois-cliques padrão do app; excluir coluna com contatos move eles pra primeira), cartões arrastáveis entre colunas (pointer events com detecção de movimento, mesmo padrão do canvas: arrasto move, clique parado abre), painel lateral de detalhe (campos editáveis, tags, notas com hora, excluir contato), busca por nome/empresa/tag, total de valor estimado por coluna no cabeçalho. Dois temas, motion sutil.

## Integração final (fora dos agentes)

Registra rotas novas no index.ts, adiciona as três telas no Shell/Sidebar com rotas hash (#/ide, #/conexoes, #/crm) e React.lazy, roda build e QA.

# Rodada 11 (2026-07-14): temas, mensagens, modelo na IDE

Feito pelo orquestrador: fix das posicoes dos containers no reload (Cockpit.tsx, restauracao reaplica posicao salva nos nos derivados), Vercel removida do catalogo (decisoes/2026-07-14-vercel-fora-do-catalogo.md), componente comum/Markdown.tsx (react-markdown + remark-gfm, estilos em estilos/markdown.css), seletor de modelo e markdown no ChatIde.

## Temas e polimento (dono: agente Temas)

Arquivos: global.css, index.html, Sidebar.tsx, ide.css, conexoes.css, crm.css, workspaces.css.
Tres temas (decisoes/2026-07-14-tres-temas.md): :root segue sendo o Dark VKOS (base), :root[data-theme="escuro"] e o padrao novo (grafite neutro #16181d, menta de destaque), :root[data-theme="claro"] mantido. localStorage "vkos-tema": claro | escuro | vkos, padrao "escuro". Popover de tres opcoes na sidebar (.tema-menu). Polimento: :focus-visible global, scrollbar, hover e motion sutil.

## Mensagens apresentaveis (dono: agente Mensagens)

Arquivos: NoSessao.tsx, CerimoniaCerebro.tsx, canvas.css (parte de conversa), cerimonia.css, markdown.css.
Turnos do assistente e texto vivo renderizam via comum/Markdown; turnos do usuario ficam crus (pre-wrap). Baloes com min-width: 0 pra code block e tabela rolarem dentro sem esticar o no.

QA (3o Opus): todos os itens passaram, zero erros de console. Rolagem de bloco de codigo validada por injecao de DOM (sonda-codeblock.mjs), sem gastar sessao real.
