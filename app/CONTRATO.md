# Contrato do MVP: módulos, endpoints e tipos

Fonte da verdade entre os módulos do app. Quem constrói um módulo segue este contrato à risca. Mudança de contrato precisa ser registrada aqui junto com o código. Dúvida ou conflito: anotar no resumo final e seguir o contrato vigente.

## Visão

Cockpit web local. Backend Node (Fastify) na porta **4600**. Frontend React + Vite (dev na 5173 com proxy pro 4600). O backend abre a pasta de um VKOS instalado, orquestra sessões Claude Code ou Codex em paralelo e serve as peças geradas. Uma cópia de referência do VKOS pode existir em `../vkos` (relativa à pasta `app/`) apenas para desenvolvimento e nunca entra no pacote do usuário.

Identidade visual do app: minimalista, verde-menta como destaque (menta real dos temas #2fd4a7) e contraste confortável. A interface funciona nos temas Escuro, Dark VKOS e Claro. O tema vem de duas camadas: `web/src/estilos/global.css` é a base dos tokens e `web/src/estilos/visual-hub.css` carrega por último, camada oficial que fixa o valor final de cada token por tema. Toda cor passa por esses tokens. UI inteira em português brasileiro.

## Pastas e propriedade (quem escreve onde)

- `app/server/src/index.ts` e `app/server/src/ws.ts`: módulo servidor (backend core).
- `app/server/src/sessoes/`: módulo orquestrador. Exporta `rotasSessoes`.
- `app/server/src/provedores/`: contrato, registro e adaptadores dos motores de IA. Exporta `rotasProvedores`.
- `app/server/src/vkos/`: módulo ponte VKOS. Exporta `rotasVkos`. Dono também da rota `/pecas/*`.
- `app/server/src/ambiente/`: módulo onboarding. Exporta `rotasAmbiente`.
- `app/server/src/tipos.ts`: tipos compartilhados, já criado. Não mudar sem anotar no resumo final.
- `app/web/`: módulo visual, dono de tudo dentro.
- `app/dados/`: criado em runtime. Guarda configuração global, registro de workspaces e estado de cada workspace. Nunca versionar nem distribuir.

Ninguém escreve fora da própria propriedade. Integração final resolve as costuras.

## Convenções entre módulos

- Cada módulo de rotas exporta um `FastifyPluginAsync` com o nome combinado acima.
- `ws.ts` exporta `transmitir(mensagem: object)`: faz broadcast JSON pra todos os clientes WebSocket conectados. Os módulos importam e usam.
- `ws.ts` exporta também `transmitirPara(workspaceId, mensagem)`: entrega só pras abas que declararam estar naquele cliente. A aba declara em `?workspace=<id>` no upgrade e redeclara por mensagem `{ tipo: "workspace", workspaceId }` quando troca de cliente, sem derrubar a conexão. Quem não declarou nada não recebe nada por essa via. Desde 2026-07-27 todo evento de sessão (`sessao:evento`, `sessao:status`, `sessao:conferencia`, `sessao:ferramenta`) sai por aí: o stream cru do provedor carrega o Cérebro e trechos de arquivo lido, e o filtro não pode depender do frontend. O que é do Hub inteiro continua em broadcast: `workspace:ativado`, `pecas:atualizadas`, `cerebro:atualizado` e `crm:atualizado`.
- `vkos/estado.ts` exporta `obterPastaVkos(): string | null` e `definirPastaVkos(caminho: string)`. Persiste em `app/dados/config.json`. O orquestrador importa `obterPastaVkos` pra definir o cwd das sessões.
- Imports relativos com extensão `.js` (ESM + NodeNext).
- Código, comentários e mensagens em português brasileiro. Nunca usar travessão nem o caractere de ponto centrado. Frase curta.

## API HTTP (prefixo /api)

### Ambiente (onboarding)
- `GET /api/ambiente` responde `Ambiente` (ver tipos.ts): plataforma, versão do Node e os campos `claude` e `codex`. Cada motor traz `{ instalado, versao, logado, binario }`. `logado` pode ser `null` quando o CLI não oferece uma confirmação segura. `?atualizar=1` limpa o cache de detecção antes da leitura.
- `GET /api/ambiente/pastas?caminho=<abs>` navega o filesystem: responde `{ caminho, pai: string | null, pastas: [{ nome, caminho, ehVkos }] }`. `ehVkos` = a pasta tem `cerebro/cerebro.md`. Sem `caminho`, responde as raízes (drives no Windows, `/` no resto). Ignorar pastas ocultas e de sistema. Sanitizar o caminho.
- `POST /api/ambiente/instalar` body `{ provedor: "claude" | "codex" }`: no Windows, instala o CLI ausente via WinGet e responde eventos NDJSON `{ tipo: "inicio" | "texto" | "erro" | "fim", ... }`. O cliente nunca fornece comando ou pacote. O servidor aceita somente `Anthropic.ClaudeCode` e `OpenAI.Codex`, sempre com correspondência exata e origem `winget`. Apenas uma instalação roda por vez. O log sanitizado fica em `app/dados/instalacao.log`.
- `POST /api/ambiente/login` body `{ provedor }`: abre um terminal visível com o login oficial do CLI já detectado. O Hub não recebe credencial.
- `POST /api/ambiente/teste` body `{ provedor }`: executa o teste isolado do setup e transmite NDJSON. Prompt, modelo econômico e argumentos são definidos pelo servidor.
- `POST /api/ambiente/atalho`: cria o atalho do VKOS Hub na área de trabalho. Não aceita caminho do cliente.

No pacote Windows, `Instalar VKOS Hub.cmd` exige Node.js 20 ou mais recente. Quando ausente ou antigo, instala automaticamente `OpenJS.NodeJS.LTS` via WinGet, atualiza o caminho do processo atual e continua sem exigir reinicialização. Se o WinGet faltar ou a instalação falhar, abre o site oficial do Node.js e orienta a tentativa manual.

### VKOS (ponte)
- `GET /api/vkos` responde `EstadoVkos`: pasta ativa, se é válida, se o Cérebro está preenchido, total de skills. No pacote final, a pasta `VKOS/` ao lado de `app/` é registrada e ativada automaticamente no boot.
- `POST /api/vkos` body `{ caminho }`: valida (tem `cerebro/cerebro.md` e `.claude/skills/`), persiste e responde `EstadoVkos`. Erro 400 se inválida.
- `GET /api/vkos/cerebro` responde `{ texto, caminho, atualizadoEm, conteudo, preenchido }`. `texto` é o documento completo; `conteudo` é alias legado de `texto`; `atualizadoEm` é o mtime em ISO. 404 se o arquivo não existe. Heurística de preenchido: o conteúdo não tem campos em branco do tipo `✍️`.
- `PUT /api/vkos/cerebro` body `{ texto }`: grava o cerebro.md (atômico, backup automático em `cerebro/.backup-cerebro-<carimbo>.md` antes da primeira gravação de cada boot). 413 acima de 512 KB. Responde o mesmo shape do GET e transmite `{ tipo: "cerebro:atualizado" }`.
- `POST /api/anexos` body `{ nome, conteudoBase64 }`: salva anexo do composer em `materiais/cockpit/anexos/<AAAA-MM-DD>/` na pasta do VKOS. Extensões: png, jpg, jpeg, webp, gif, svg, md, txt, pdf, csv, json. Limite 15 MB. Responde 201 `{ caminhoRelativo }` (relativo à pasta do VKOS, barras normais). Erros 400/413.
- `POST /api/vkos/pecas/:pasta/anexo` body `{ nome, conteudoBase64 }`: salva material do Ajustar com IA em `conteudo/<peça>/anexos/`. Aceita as mesmas extensões do composer, limita a 15 MB e responde 201 `{ caminhoRelativo: "anexos/<nome>" }`. Nome inválido, extensão recusada e peça ausente retornam 400 ou 404; tamanho acima do limite retorna 413.
- `GET /api/vkos/skills` responde `{ skills: SkillVkos[] }`. Lê o frontmatter (name, description) de cada `.claude/skills/*/SKILL.md`. Atenção: description costuma ser YAML multilinha com `>`.
- `GET /api/vkos/pecas` responde `{ pecas: Peca[] }`. Escaneia `conteudo/*/` na pasta do VKOS. Inferência de tipo: `instagram/*.png` é carrossel, `post/*.png` (ou `instagram-post/*.png`) é post, `instagram-stories/*.png` (ou `stories/*.png`) é stories (tudo legado), `carrossel.html` na raiz da subpasta é carrossel HTML-first (`fonteHtml: true`, `paginas` = total de `.slide`, previews `/pecas-html/<pasta>/pagina/<n>`), `.html` restante é site, `.md` é texto, resto é outro. Peça de site acrescenta `site: { valido, erros, avisos }`; previews incluem páginas HTML da raiz e de subpastas, com `index.html` primeiro.
- `GET /pecas/*` (sem prefixo /api): serve arquivo estático de dentro de `conteudo/` da pasta VKOS escolhida. Sanitizar: nunca servir fora de `conteudo/`.

### Carrossel HTML-first (rodada 12, ver decisoes/2026-07-14-carrossel-html-first.md)
- `GET /pecas-html/:pasta/pagina/:n` (sem /api): serve o carrossel.html com `<base>` injetada e script que isola a página n (o body fica do tamanho exato do slide, pro front medir e escalar).
- `GET /pecas/*` serve a árvore estática da peça com MIME correto, `Cache-Control: no-cache` e `X-Content-Type-Options: nosniff`. Diretório com `index.html` é servido como URL limpa.
- `GET /pecas-edicao/*` serve a mesma árvore para o Studio, mas troca temporariamente o tipo dos scripts por um tipo inerte. O motor restaura os tipos originais na serialização, sem executar JavaScript dentro do editor.
- `PUT /api/vkos/pecas/:pasta/pagina/*` body `{ texto }` (4 MB): regrava uma página HTML existente na raiz ou em subpasta, com confinamento, gravação atômica e backup único por boot.
- `PUT /api/vkos/pecas/:pasta/carrossel` body `{ texto }` (4 MB): grava o carrossel.html (atômico, backup .bak único por boot) e apaga subpastas de PNG legado da peça (vira HTML-first). Transmite `pecas:atualizadas`.
- `POST /api/vkos/pecas/:pasta/imagem` body `{ nome, conteudoBase64 }`: salva em `img/` da peça com nome único. Responde `{ caminhoRelativo }`. Teto de 20 MB decodificado.
- `GET /api/vkos/pecas/:pasta/png/:n` e `GET /api/vkos/pecas/:pasta/png-zip`: renderizam PNG sob demanda em pasta temporária do SO (script `server/scripts/render-paginas.cjs` com o Playwright do VKOS ativo) e streamam como download. Nada de PNG gravado na peça.
- O render prefere o Playwright completo do VKOS quando instalado. Sem ele, usa `playwright-core` empacotado no servidor e o Edge ou Chrome da máquina. O download não depende de `node_modules/playwright` dentro de cada workspace de cliente.
- Editor visual: `web/src/componentes/editor/EditorCarrossel.tsx` (props `{ pasta, aoFechar }`), overlay tela cheia. Cores globais são mescladas no primeiro `:root` do style principal do doc salvo (rodada 13); a tag antiga `<style id="vkos-editor-vars">` só é lida pra migrar peça velha e é removida na serialização.
- Prompt do composer instrui: não renderizar (pular o Passo 5 da skill), entregar só o carrossel.html, e modo direto (nenhuma pergunta, lacunas decididas pelo Cérebro, resposta final curta).
- Observador: `fs.watch` (com debounce) em `conteudo/`. Em mudança, `transmitir({ tipo: "pecas:atualizadas" })`.

### Sessões (orquestrador)
- `GET /api/sessoes` responde `{ sessoes: Sessao[] }`.
- `POST /api/sessoes` body `{ titulo?, prompt, skill?, modelo?, permissao?, escopoPeca?, pastaAlvo? }`: cria e inicia uma sessão no provedor ativo. `modelo`, quando presente, precisa ser um alias publicado por esse provedor. Responde `{ sessao: Sessao }` (status `iniciando` ou `fila`). Sem `escopoPeca`, cwd = `obterPastaVkos()`. Erro 400 se não há pasta VKOS.
- `pastaAlvo` é a subpasta de `conteudo/` que a geração guiada de site vai criar. Só vale para `skill: "site"` sem `escopoPeca`: em qualquer outro caso o servidor a ignora. É a chave do laço de conformidade de site (ver abaixo). Para tolerar uma aba antiga do Hub, o servidor também recupera o destino da linha contratual `Salve tudo em conteudo/...` do prompt assinado pelo Site Guiado. Se corpo e prompt divergem, ou se um prompt guiado não traz destino válido, a criação é recusada com 400 antes de abrir a sessão.
- `escopoPeca` tem o formato `{ pasta, tipo: "carrossel" | "site", arquivo?, revisaoDesign? }` e é usado somente para ajustes de uma peça existente. O servidor valida a pasta dentro de `conteudo/`, exige `carrossel.html` para carrossel ou um `.html` existente e seguro para site, inclusive em subpasta, define o cwd como a pasta exata da peça e substitui a skill pelo tipo validado. O prompt recebe o Cérebro completo como contexto somente de leitura e uma fronteira repetida que proíbe editar fora dessa pasta. O pedido do usuário nunca amplia o escopo. `revisaoDesign: true` só é aceito para site, autoriza ler e corrigir todos os HTML e recursos compartilhados da peça e injeta o conteúdo completo de `templates/site/principios-visuais.md` no prompt.
- `POST /api/sessoes` devolve 409 antes de criar a sessão quando `skill` é `carrossel` ou `site` e o Cérebro está em branco. O frontend direciona o usuário para montar o Cérebro.
- `POST /api/sessoes` também devolve 409 quando já existe uma sessão `carrossel` ou `site` em `fila`, `iniciando` ou `rodando`. A exclusão mútua é global no Hub, inclusive entre workspaces e abas. Sessões gerais e a skill interna `imagem` não ocupam essa trava.
- `POST /api/sessoes/:id/mensagem` body `{ texto }`: continua a sessão com o provedor e o id nativo persistidos nela, mesmo que o provedor global tenha mudado. Responde `{ ok: true }`.
- `POST /api/sessoes/:id/parar`: mata o processo. Responde `{ ok: true }`.
- Limite: **5 sessões rodando ao mesmo tempo**. Acima disso entra em `fila` e sobe quando abrir vaga.
- Persistência: índice em `app/dados/workspaces/<id>/sessoes.json`, carregado no boot. Sessões antigas sem `provedor` são normalizadas como Claude. Sessões que estavam ativas voltam como `parada`, nunca como `rodando`.

#### Laço de conformidade de site (backend, `sessoes/conformidade-site.ts`)
- Quando uma sessão com `skill` conferível e `pastaAlvo` conclui bem, o gerenciador roda a auditoria completa da exportação (`publicacao/auditoria.ts`: estrutural + visual no navegador) na peça. Só dispara se a `pastaAlvo` existe como peça de site (tem `index.html` na raiz e não é carrossel).
- Skills conferíveis (`skillPassaPelaConferencia`): `site` (geração guiada) e `ajuste-site` (Ajustar com IA na TelaSite). Desde 2026-07-20 o ajuste entrou no laço: editar um site pronto quebra tanto quanto gerar um errado (referência a arquivo inexistente, contraste, vazamento em 390px) e antes disso o erro só aparecia na barreira de publicação. Carrossel não entra, a auditoria é de site.
- A `pastaAlvo` da geração vem do contrato do prompt do Site Guiado (`resolverPastaAlvoGeracaoSite`); a do ajuste vem do escopo já resolvido e confinado no servidor (`pastaAlvoDoEscopo`), nunca do corpo HTTP. Numa página aninhada, o alvo continua sendo a peça inteira: a conferência audita o site todo.
- Se a auditoria reprova com erros acionáveis, o laço retoma a MESMA sessão (via `--resume`, nunca sessão nova, respeitando a exclusão mútua global) com um prompt curto e cirúrgico: cabeçalho fixo, lista literal dos erros e avisos visuais daquela rodada. Avisos continuam sem bloquear publicação sozinhos, mas são corrigidos junto de um erro real quando a causa existe. Ao concluir, audita de novo. No máximo **2 voltas** de correção; depois para e deixa pendências.
- Guardas: navegador do sistema ausente (não dá pra verificar) registra pendências sem corrigir; sessão parada pelo usuário não é retomada; reentrância protegida (nunca duas voltas simultâneas da mesma peça). Custo por volta é dominado por reler o site: o prompt de correção em si é o cabeçalho fixo mais os erros.
- Cobertura: Claude e Codex (ambos suportam `--resume` e emitem `session_id`). A validação com sessão real fica para a próxima geração.
- A `Sessao` ganha `conferenciaSite?: { estado: "conferindo" | "corrigindo" | "aprovada" | "pendencias", volta: number }`, atualizado pelo laço e persistido. `volta` é quantas correções já foram mandadas (0 antes da primeira). No frontend, o site só entra em "pronta" (abre no Studio/TelaSite) quando `estado` é `aprovada` ou `pendencias`.
- O gerenciador marca `conferindo` ANTES de anunciar o status `concluida`, então a tela nunca vê a peça como pronta no meio da conferência. O painel Ajustar com IA da TelaSite usa isso: enquanto o estado é `conferindo` ou `corrigindo` ele continua mostrando progresso ("o Hub está conferindo", "a IA está corrigindo") e só fecha o ajuste quando a conferência assenta. Terminando em `pendencias`, a mensagem final avisa que ficaram pendências em vez de dizer que deu tudo certo.
- Prevenção no prompt de ajuste (`escopo-peca.ts`): todo `src`, `href` e `url()` precisa apontar pra arquivo que exista ao terminar. A IA não pode inventar nome de foto, logo ou ícone esperando que alguém crie depois; sem poder produzir a imagem, resolve com o que existe ou com CSS e diz o que faltou.

## WebSocket (rota /ws)

Servidor manda pro cliente (JSON por mensagem):
- `{ tipo: "sessao:evento", id, workspaceId, evento }` onde `evento` segue o dialeto congelado descrito em Provedores de IA. O Claude é repassado quase sem tradução. O Codex é traduzido para o mesmo dialeto.
- `{ tipo: "sessao:status", id, workspaceId, status, detalhe? }` a cada transição de status.
- `{ tipo: "sessao:ferramenta", id, workspaceId, nome, alvo }` para cada ferramenta reconhecida no evento da sessão.
- `{ tipo: "sessao:conferencia", id, workspaceId, conferencia }` a cada mudança de fase do laço de conformidade de site. `conferencia` é o `conferenciaSite` da sessão.
- `{ tipo: "pecas:atualizadas" }` quando `conteudo/` muda.

Cliente não precisa mandar nada. Ações vão por REST.

## Como os provedores iniciam sessões

- O prompt sempre vai pela entrada padrão. Nunca vai como argumento do shell.
- Claude usa `-p`, `--output-format stream-json`, `--verbose`, `--include-partial-messages`, `--permission-mode`, `--model`, `--resume` quando houver retomada e `--mcp-config` quando houver conexões. As ferramentas Bash e MCP permitidas vão em `--allowedTools`.
- Codex usa `exec --json`, `--model`, `--sandbox workspace-write` no modo padrão, `--dangerously-bypass-approvals-and-sandbox` no modo total, `--skip-git-repo-check` e `-C <pasta>`. A retomada usa `resume <session_id> -`.
- O Codex não recebe conexões MCP nesta versão. O adaptador emite um aviso e continua sem elas.
- O diretório de trabalho é a pasta VKOS da sessão. No Claude, `CLAUDE.md` orienta o workspace. No Codex, o servidor prepara `AGENTS.md` a partir de `CLAUDE.md` quando não há um arquivo manual.
- Cada adaptador lê JSONL, emite o dialeto congelado e encerra com `result`. Fechamento sem `result` vira erro no gerenciador.

## Provedores de IA

O motor de sessão depende do contrato em `server/src/provedores/contrato.ts`. Um provedor implementa `ProvedorIA` e concentra detecção, modelos, montagem do processo e tradução de eventos. O `gerenciador.ts` cuida somente de fila, estado, persistência, custos, transcrição e WebSocket. Provedor novo implementa o contrato e nunca adiciona lógica própria ao gerenciador.

### Contrato do provedor

- `id`: `"claude" | "codex"`.
- `detectar()`: responde `{ instalado, versao, logado, binario }`. `versao`, `logado` e `binario` podem ser `null` quando não for possível confirmar.
- `modelos()`: lista `{ alias, rotulo, observacaoCusto }`. O alias é o valor entregue ao CLI.
- `iniciarSessao(opcoes)`: recebe `pastaTrabalho`, `prompt`, `modelo`, `permissao`, `retomada?` e `mcp?`.
- `ProcessoSessao`: oferece `aoEvento`, `aoErro`, `aoFechar` e `parar()`. O fechamento entrega `{ codigo, stderr }`.

O prompt vai por stdin. A permissão `padrao` mantém a edição segura do workspace. A permissão `total` libera o modo sem confirmação. `retomada` é o id nativo da conversa anterior. `mcp` traz o caminho da configuração e os ids dos servidores habilitados.

### Catálogo, config e compatibilidade do workspace

- `GET /api/provedores` responde exatamente `{ ativo, provedores: [{ id, modelos }] }`. `modelos` vem de `ProvedorIA.modelos()`. Nenhum consumidor mantém lista própria.
- `GET /api/config` expõe `provedorPadrao?`, `modeloPadraoClaude`, `modeloPadraoCodex` e o alias legado `modeloPadrao`. `PUT` e `PATCH` aceitam esses campos e validam cada modelo contra a lista dinâmica do provedor correspondente.
- Sessão nova persiste `provedor`. Sessão antiga sem o campo é lida como Claude. Continuação sempre resolve o provedor da sessão, nunca o provedor global atual.
- Antes de uma sessão Codex, o servidor expande invocações como `/instalar` para a instrução de ler `.claude/skills/instalar/SKILL.md`.
- Nos wizards de carrossel e site, a origem `Gerar com IA` só fica disponível com Codex ativo. O prompt usa `$imagegen` e exige o bitmap final dentro de `conteudo/<pasta>/img/`, referenciado por caminho relativo.
- A quantidade de imagens é decidida depois do roteiro, por contexto de página ou seção. Repetir um asset exige intenção editorial. Conteúdo visual fica em `<img>` ou `background-image` de elemento real para continuar selecionável no Studio.
- Borda, máscara, sombra e overlay associados a uma imagem ficam no próprio elemento ou no contêiner real que a envolve. A composição visual não pode ser espalhada em alvos distantes, pois o Studio precisa selecionar o contêiner e excluir o conjunto.
- No Studio de carrossel e no Studio de site, qualquer `<img>` ou fundo CSS selecionado oferece trocar pelo computador, gerar outro com Codex e excluir a referência. O arquivo físico não é apagado ao excluir, pois pode estar reutilizado e o desfazer precisa continuar seguro.
- O botão `Ajustar com IA` dos dois Studios aceita anexos da própria peça por `AnexosAjuste` (`pasta`, `anexos`, `aoMudar`, `desabilitado`). O frontend acrescenta os caminhos `anexos/<nome>` ao pedido antes de enviá-lo com `escopoPeca`. O servidor contextualiza o pedido com o Cérebro e com o arquivo atual, inicia o provedor dentro da pasta da peça e limita qualquer gravação à peça corrente. Alteração manual pendente é salva antes do disparo após confirmação.
- O prompt de ajuste inclui uma cópia da fonte HTML atual, com teto de 750 KB, para não depender da leitura por shell do provedor. Resposta concluída que declara falha de leitura ou edição aparece como erro no painel, nunca como ajuste realizado.
- Todo elemento interno de carrossel ou site pode ser excluído pelo painel. O usuário pode subir na hierarquia com `Selecionar contêiner`, necessário quando borda, máscara ou sombra pertencem ao wrapper da imagem. A própria página, `body` e `html` são protegidos. A exclusão exige confirmação, aceita Desfazer antes de salvar e se torna irreversível no Studio depois da gravação, quando a pilha de snapshots é zerada.
- No carrossel, `.slide` é canvas protegido: não entra na seleção, não pode ser movido pelas setas ou pelo arrasto e a serialização remove `left` e `top` inline antigos do próprio slide.
- O `Ajustar com IA` roteia pedidos de criação de imagem para a sessão dedicada `imagem`, em vez do ajuste genérico de HTML. A página é identificada por número ou ordinal no pedido, com fallback para a página em foco. O asset gerado é aplicado como `<img data-vkos-image-bg>` real, selecionável, substituível e removível. Pedidos sem criação de imagem continuam no ajuste escopado da peça.
- No site, o mesmo roteamento identifica a seção pelo pedido, incluindo hero, capa, topo, sobre, serviços e CTA, com fallback para a primeira seção principal. O frontend relê a página salva, aplica o asset como `<img data-vkos-image-bg>` dentro da seção, neutraliza imagens antigas de pseudo-elemento e grava pela rota segura da página. O callback de aplicação pode ser assíncrono; a geração só aparece concluída depois que o HTML também foi salvo.
- Antes de uma sessão Codex, o servidor gera `AGENTS.md` a partir de `CLAUDE.md` quando a fonte existe. O arquivo gerado tem a marca `VKOS-HUB:AGENTS-GERADO-DE-CLAUDE-MD:v1`. Um `AGENTS.md` manual sem essa marca nunca é sobrescrito. O gerado só muda quando a fonte fica mais nova ou o conteúdo está defasado.

### Persistência de custo multi-IA

- `Sessao` persiste `provedor`, `estimado?`, custo e tokens. No Codex, `usage.cached_input_tokens` é separado entre entrada nova e cache sem contar a entrada duas vezes.
- `custos.json` mantém todos os campos legados e acrescenta `provedor`, `estimado`, `tokensCodexEntrada`, `tokensCodexCache` e `tokensCodexSaida`. Arquivo antigo é lido como Claude, custo exato e totais novos zerados.
- `GET /api/custos` acrescenta `estimado` para o workspace ativo e `totalGeralEstimado` para o total geral. Esses campos ficam verdadeiros quando os respectivos totais contêm custo estimado.

### Dialeto de eventos congelado

O dialeto interno é o subconjunto abaixo do `stream-json` do Claude. O Claude o repassa sem tradução. Todo provedor novo traduz sua saída para estes eventos e campos. Campos extras podem passar pelo WebSocket, mas nenhum consumidor pode depender deles sem atualizar este contrato.

- Início: `{ type: "system", subtype: "init", session_id, model }`. `session_id` identifica a conversa para retomada. `model` é o modelo real resolvido pelo CLI. O servidor muda a sessão de `iniciando` para `rodando`. O frontend também guarda `session_id` na sessão em memória.
- Texto parcial: `{ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text } } }`. O frontend concatena `text` e marca que recebeu delta.
- Mensagem consolidada: `{ type: "assistant", message: { content: blocos } }`. Bloco de texto usa `{ type: "text", text }`. O frontend usa estes textos somente quando nenhum delta chegou, para não duplicar a resposta.
- Ferramenta: dentro do mesmo evento `assistant`, o bloco usa `{ type: "tool_use", name, input }`. O servidor lê `name`. Para o resumo visível, lê `input.file_path` ou `input.command`. Cada bloco também gera a mensagem derivada `{ tipo: "sessao:ferramenta", id, nome, alvo }`.
- Resultado: `{ type: "result", result, total_cost_usd, usage, is_error?, subtype? }`. `result` é o texto final. `total_cost_usd` é o custo do turno no Claude e a estimativa por tokens no Codex. O Codex também envia `estimado: true` e `provedor: "codex"`. Erro normalizado usa `is_error: true` ou `subtype: "error"` e traz a mensagem em `result`.
- Tokens do resultado: `usage.input_tokens`, `usage.cache_creation_input_tokens`, `usage.cache_read_input_tokens` e `usage.output_tokens`. Como compatibilidade, a escrita de cache também pode vir em `usage.cache_creation`, objeto cujos valores numéricos são somados.
- Erro de processo: falha de spawn ou do processo usa `ProcessoSessao.aoErro`. Encerramento sem evento `result` vira status `erro` com o `stderr` ou o código de saída. Isso não inventa um evento cru no WebSocket.

O envelope WebSocket continua `{ tipo: "sessao:evento", id, workspaceId, evento }`. `evento` é exatamente o evento do dialeto. Eventos desconhecidos podem ser repassados, mas são ignorados pelo frontend e pelo gerenciador.

## Fluxos do MVP (o que o frontend expõe)

Carrossel, Post e Stories rodam TODOS o mesmo motor (a skill `/carrossel`): muda só o formato (várias páginas ou única), a proporção e a subpasta de saída. Post e Stories estão ocultos dos menus de criação desde o enxugamento de 2026-07-13 (flag `oculto` em `config/fluxos.ts`); sessões e peças antigas continuam renderizando.

| Fluxo | Prompt disparado | Formato |
|---|---|---|
| Carrossel | `/carrossel <tema>` | várias páginas, 4:5, subpasta `instagram/` |
| Post (oculto) | `/carrossel <tema>` | página única, 4:5, subpasta `post/` |
| Stories (oculto) | `/carrossel <tema>` | página única, 9:16, subpasta `instagram-stories/` |
| Site e páginas | `/site`, `/landing <oferta>`, `/blog <tema>` | HTML |

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
- Status do motor de IA, WebSocket e sessões N/5 continua visível no shell.

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

- Sidebar mostra um único botão "Fontes de dados" quando há contexto, com a soma total. `#/fontes` abre o hub com um card por tipo presente. `#/fonte/<tipo>` continua sendo a tela individual e volta para o hub.
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

- `app/server/src/config/rotas.ts` exporta `rotasConfig`: `GET /api/config` responde `provedorPadrao?`, `modeloPadraoClaude`, `modeloPadraoCodex` e o alias legado `modeloPadrao`. `PUT` e `PATCH` validam modelos pelo catálogo dos provedores e persistem em `app/dados/config-app.json`. Sem `provedorPadrao`, a primeira execução ainda não foi concluída.

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
- NÓ DE SESSÃO VIRA CONVERSA: renderiza o histórico de turnos (bolhas ou blocos: usuário à direita em tom neutro, IA à esquerda com acento), carrega a transcrição (`GET /api/sessoes/:id/transcricao`) ao montar quando a sessão já existia, streaming ao vivo vira o turno em andamento, campo de mensagem SEMPRE visível embaixo (desabilitado enquanto roda), enviar usa a rota de mensagem existente. Custo e tokens da sessão visíveis no rodapé do nó (ex: "$0.14 / 1.2k → 3.4k").
- COMPOSER: seletor de modelo (Opus, Sonnet, Haiku) com o padrão vindo de `GET /api/config`, rótulo honesto de custo relativo (Opus mais caro, Haiku mais barato). No fluxo Carrossel, seletor de estilo alimentado por `GET /api/vkos/modelos-carrossel` (cards pequenos com nome e descrição, opcional, com "deixar a IA escolher" como padrão).
- Custo total no shell: o rodapé da sidebar mostra o acumulado de `GET /api/custos` (atualiza depois de cada sessão concluída).

## Fronteiras da rodada 5 (histórico: terminal removido em 2026-07-13)

Registro histórico da divisão de tarefas daquela rodada. O terminal descrito aqui (`app/server/src/terminal/`, `app/web/src/componentes/terminal/`, `NoTerminal`, `criarTerminal`, `rotasTerminal`, `wsTerminal`) não existe desde 2026-07-13 (ver "Terminal no canvas (REMOVIDO em 2026-07-13)" acima). Mantido só pra quem for entender a história da rodada:

- Backend de sessões: `app/server/src/sessoes/`, `app/server/src/config/` (novo), `app/server/src/vkos/modelos.ts` (novo, + registro da rota no rotas.ts do vkos). NÃO edita index.ts.
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
- `DELETE /api/workspaces/:id`: remove SÓ do registro e responde `{ workspaces, ativo }`. NUNCA apaga a pasta VKOS do cliente nem a pasta de dados `app/dados/workspaces/<id>` (fica órfã em disco de propósito). Antes de remover do registro, para e remove do gerenciador todas as sessões daquele workspace (nada de processo de IA rodando invisível) e invalida o cache de contextos dele. 400 se for o workspace ativo, 404 se não existe.
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
- Sem pasta VKOS configurada: não migra o legado. Depois da migração, `garantirWorkspaceIntegrado()` registra e ativa `VKOS/` ao lado de `app/` quando ainda não existe workspace. O seletor de pasta não faz parte da primeira execução do cliente.
- Nunca apaga dado, só move. Rodar o boot de novo depois da migração não duplica nem move nada (o `workspaces.json` já existe).
- O carregamento das sessões deixou de ser no construtor do gerenciador: `index.ts` chama `gerenciador.inicializar()` depois da migração, pra o registro já estar pronto.

---

# Rodada 10 (2026-07-13): VKOS-IDE, Conexões MCP e CRM (fases 4, 5 e 6)

Quatro agentes em paralelo. Cada um e dono EXCLUSIVO dos seus arquivos. Regras gerais: português brasileiro, NUNCA travessão nem o caractere de ponto centrado, frase curta, toda cor via tokens de tema de `web/src/estilos/global.css` (o app tem os temas Escuro, Dark VKOS e Claro, tudo precisa funcionar nos três), escrita de estado em disco sempre atômica via `server/src/util/gravarJson.ts`, caminhos de arquivo SEMPRE sanitizados (resolve + startsWith na base, nunca aceitar `..`). Ninguém toca em: vkos/.claude/skills/carrossel/SKILL.md, estado/contexto.tsx (exceto onde dito), api/cliente.ts, tipos/dominio.ts, index.ts do server (a integração final registra as rotas), Shell.tsx e Sidebar.tsx (integração final).

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

- Exporta `TelaIde` (componente de tela cheia da área central, mesmo padrão das telas de fluxo). Layout em três colunas: árvore de arquivos (esquerda, 240px, expansão por pasta), editor (centro), chat de IA (direita, 340px, recolhível).
- Editor: textarea com fonte mono, números de linha simples, Ctrl+S salva (PUT), indicador de sujo/salvo, aviso ao trocar de arquivo com mudança não salva. Sem dependência nova de editor pesado nesta fase.
- Árvore: clique abre arquivo; botão direito com menu próprio (novo arquivo, nova pasta, renomear, excluir com confirmação em dois cliques no padrão do app: balão clicável, desarme por tempo, nunca por mouseleave).
- Chat: cria sessão via estado (`criarSessao`) com título "Sessão da IDE", conversa igual ao padrão do app e mostra as ferramentas ao vivo. O controle no cabeçalho escolhe motor, modelo e permissão da próxima conversa. Com sessão aberta, "Aplicar numa conversa nova" preserva as novas regras e limpa a conversa local.
- Depois que a árvore ou o chat alterarem arquivos, botão de recarregar árvore. Tudo nos três temas.

## Conexões MCP (dono: agente Conexões, full-stack)

Arquivos: `server/src/conexoes/` (novo: rotas.ts, estado.ts, mcp.ts), `web/src/componentes/conexoes/` (novo), `web/src/estilos/conexoes.css` (novo), `web/src/api/conexoes.ts` (novo).

- Estado por workspace em `app/dados/workspaces/<id>/conexoes.json`: `{ servidores: { [id]: { habilitado: boolean, config: Record<string,string> } } }`. Escrita atômica. Tokens ficam SO nesse arquivo local; a tela avisa isso com uma frase.
- Catálogo fixo em `server/src/conexoes/catalogo.ts`: hoje só a Apify, que alimenta a busca de leads do CRM. GitHub, Netlify e Notion saíram em 2026-07-26, junto com a publicação integrada; Vercel saiu em 2026-07-14 por só aceitar OAuth de navegador. Cada entrada descreve campos e transporte. A montagem do servidor MCP é opcional: a Apify usa API REST direta e nunca entra na configuração MCP das sessões.
- `POST /api/conexoes/:id/testar` confirma a credencial na API oficial do serviço, sem devolver o token ao frontend. Vale só para a Apify.
- `GET /api/conexoes` devolve catálogo + estado do workspace ativo (segredos mascarados: só os 4 últimos caracteres). `PUT /api/conexoes/:id` body `{ habilitado, config? }`.
- `montarConfigMcp(workspaceId): { caminho: string, servidores: string[] } | null` em mcp.ts: monta o JSON de mcp servers dos habilitados com config completa, grava atômico em `app/dados/workspaces/<id>/mcp-config.json` e devolve o caminho e os ids habilitados. Sem nenhum habilitado, null. Exporta também os tipos.
- `TelaConexoes`: cards por serviço (nome, descrição, campo de token com olho de revelar, toggle habilitar, estado salvo com feedback), aviso local-first, cards indisponíveis com selo "em breve". Três temas.

## CRM (dono: agente CRM, full-stack)

Arquivos: `server/src/crm/` (novo), `web/src/componentes/crm/` (novo), `web/src/estilos/crm.css` (novo), `web/src/api/crm.ts` (novo).

- O estado atual tem `versao: 2` e vive por workspace em `app/dados/workspaces/<id>/crm.json`: colunas, contatos, negócios, interações e tarefas. Contato guarda relacionamento, tags e `proximoContato`; negócio guarda título, contato vinculado, estágio e valor. Escrita atômica.
- Arquivo v1 sem versão migra na primeira leitura. Cada cartão vira contato mais negócio; coluna e valor passam para o negócio; notas viram interações `nota` com texto, data e ordem preservados. A gravação v2 é idempotente e não duplica dados em leituras posteriores.
- `GET /api/crm` devolve o estado inteiro. Contatos usam `POST /contatos`, `PATCH /contatos/:id` e `DELETE /contatos/:id`. Excluir contato remove seus negócios. `POST /contatos/:id/interacoes` registra os cinco tipos e `/notas` permanece como alias de transição.
- Tarefas usam `POST /contatos/:id/tarefas`, `PATCH /tarefas/:id` e `DELETE /tarefas/:id`. Negócios usam `POST /negocios`, `PATCH /negocios/:id`, `DELETE /negocios/:id` e `PATCH /negocios/:id/mover`. As rotas de coluna continuam criar, renomear, excluir e reordenar. Erros seguem `{ erro }`.
- `PATCH /negocios/:id/mover` recebe `{ colunaId, indice? }`. Com `indice`, o negócio é reposicionado dentro do bloco da coluna de destino: a ordem do array de negócios é a ordem visual do quadro, então soltar um cartão numa posição precisa gravar isso. Sem `indice`, só a coluna muda. A regra de inserção vive em `posicionarNegocio` e é espelhada no cliente por `moverNegocioLocal`; as duas precisam andar juntas.
- Os eventos antigos continuam compatíveis. Criar, atualizar e excluir contato mantêm `{ contato }`. Mover negócio emite `crm:contato-movido` com `{ contato, negocio, colunaDe, colunaPara, nomeColunaDe, nomeColunaPara }`, e só quando a coluna muda de verdade: reordenar dentro da mesma coluna não pode disparar automação de mudança de estágio. Registrar interação emite `crm:interacao-registrada` com `{ contato, interacao }`. Automações leem o valor do negócio com fallback para eventos históricos.
- Desde 2026-07-17: criar, atualizar e excluir negócio emitem `crm:negocio-criado`, `crm:negocio-atualizado` e `crm:negocio-excluido` com `{ contato, negocio }` (excluir sem contato encontrado emite só `{ negocio }`). Os eventos antigos não mudam.
- `TelaCrm` tem Hoje, Quadro e Contatos sobre o mesmo estado. O Quadro move negócios, reordena colunas pelas setas do cabeçalho (usa `PATCH /crm/colunas/reordenar`) e mostra uma coluna tracejada de contatos sem negócio, com atalho pra criar o negócio e entrar no funil; a lista busca, filtra e ordena contatos; a ficha reúne negócios, linha do tempo, tarefas, tags e próximo contato. Hoje mostra follow-ups, esquecidos, valor por estágio e tarefas abertas. Novo contato abre um formulário e só cria a ficha quando o usuário confirma. Três temas, motion sutil e `prefers-reduced-motion`.
- `TelaCrm` também tem Buscar leads, uma ferramenta persistente de mineração ligada ao CRM. Resultados entram primeiro em Minerados, podem ir para Arquivados e só viram Contatos quando o usuário importa.
- `server/src/crm/resumo.ts` monta um resumo agregado de até 8 KB com funil, follow-ups, tags, esquecidos e vozes recentes. Telefone e email são removidos inclusive quando aparecem no texto da interação.
- Se o prompt de uma sessão nova contém a palavra inteira `crm`, o servidor persiste o resumo em `contextoCrm` e o acrescenta a `instrucoesExtras`. Claude e Codex recebem também a regra dura que proíbe publicar nome completo, telefone, email ou qualquer dado identificável. A retomada repete o mesmo contexto; sem menção ao CRM, nada é injetado.

## Leads do Google Maps no CRM (2026-07-20)

- O backend vive em `server/src/leads/`. Ele usa o Actor `compass/crawler-google-places` pela API REST v2 da Apify, com idioma `pt-BR`, timeout local de 3 minutos e limite explícito de 40 resultados por execução.
- A mineração vive em `app/dados/workspaces/<id>/leads.json`, separada do `crm.json`, com escrita atômica. Cada item guarda os dados encontrados, status `minerado` ou `arquivado`, termo, localização, `capturadoEm` e `atualizadoEm`. A resposta da Apify é persistida antes de a rota de busca responder.
- `GET /api/leads` responde `{ minerados, arquivados }`, com `jaExisteNoCrm` calculado na leitura. `POST /api/leads/buscar` recebe `{ termo, localizacao?, limite?, buscarEmails? }` e responde as duas listas mais `{ resumo: { encontrados, novos, atualizados } }`. O termo é o único campo obrigatório; o limite padrão é 20 e o teto continua 40.
- `PATCH /api/leads/:id` recebe `{ status: "minerado" | "arquivado" }`. `DELETE /api/leads/:id` remove o item apenas da mineração. Excluir um Contato continua sendo responsabilidade da aba Contatos.
- `POST /api/leads/importar` recebe `{ ids: string[] }` e responde `{ importados, duplicados, contatos, listas }`. O servidor busca os dados no estado persistido, sem confiar em um payload de contato vindo da tela. O teto por lote é 500: a mineração acumula várias buscas, então o limite de importação não é o limite de uma busca. A tela também importa um lead avulso pelo botão do próprio cartão, com o mesmo endpoint.
- A comparação remove tudo que não é dígito do telefone e também confere `origem: "google-maps:<placeId>"`. Assim, um lead sem telefone não é importado duas vezes. Contato novo recebe essa origem, tag `google-maps` e a data normal de criação do CRM.
- O token fica em `conexoes.json`, mascarado nas respostas do catálogo e ausente de logs. O teste de conexão usa `GET /v2/users/me` e não dispara o Actor.

## Mapa do sistema interno

- `GET /api/mapa` lê `interno/mapa-sistema.json` a cada chamada. Arquivo válido responde `{ disponivel: true, mapa }`; ausente ou inválido responde `{ disponivel: false }`.
- `#/mapa` é um visualizador React Flow de leitura, com layout determinístico, painel didático e ligações direcionais entre nós. Títulos e descrições podem ser ocultados separadamente. O Modo discreto esconde também rótulos das conexões, legenda textual e painel detalhado. O item Mapa só aparece na Sidebar quando a API confirma disponibilidade.
- Nós, conexões e pontos de entrada ou saída nunca mostram cursor ou gesto de edição. Clique apenas seleciona e destaca o circuito que recebe ou envia informação.
- Os dados da arquitetura ficam em `interno/`, fora de `app/` e fora do pacote de cliente por construção. O código distribuível contém somente o visualizador genérico vazio. Nenhum módulo depende do Mapa para funcionar.

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

# Finalizações parte 01 (2026-07-15)

## Shell e marca

- A marca usa `/logo.png` em `web/public/`, tanto na sidebar quanto no splash. O mesmo arquivo é o favicon.
- WhatsApp e Instagram saíram do Shell. Hashes antigos caem no Dashboard. Formatos de peça do Instagram e links `wa.me` do editor não mudaram.
- A IDE não é mais uma rota de tela. `camada-ide` fica montada como painel contido acima do conteúdo, oculta por `visibility` ao fechar. A Sidebar só alterna a camada e qualquer navegação normal a fecha. Em telas compactas, a navegação local alterna Arquivos, Editor e Conversa. O hash legado `#/ide` abre a camada e volta o hash para a tela real.
- Toda criação guiada tem rota própria: `#/criar/carrossel`, `#/criar/post`, `#/criar/story` ou `#/criar/site`. O Shell é o dono do assistente e do histórico. Abrir cria uma entrada com retorno interno seguro; cancelar ou minimizar substitui a entrada pelo retorno; concluir substitui pela rota `#/studio/<pasta>` ou `#/site/<pasta>`. Atualizar uma rota de criação remonta o assistente correto, e tipo desconhecido cai no Dashboard.

## Site Guiado v2

- `DadosEtapasSite` usa `objetivoLivre: string` para o resultado principal descrito pelo usuário e `secoesLivre: string` para a estrutura na ordem desejada. Vazio mantém a escolha automática pelo método da skill. `objetivo` e `linkObjetivo` continuam separados como contrato mecânico do botão principal.
- A etapa `A estrutura` mostra objetivo livre, botão principal e seções livres. Os presets rígidos de seção não fazem mais parte do contrato.
- A opção `Com imagens` aceita upload do computador e seleção pela `GaleriaFontes`. A imagem da fonte é baixada, convertida em base64 e enviada pela mesma `POST /api/anexos` usada pelo upload comum. Os dois caminhos terminam em `materiais/cockpit/anexos/<AAAA-MM-DD>/` e entram em `dados.anexos`.
- `detalhes` continua no prompt, mas sua coleta visual acontece apenas na última etapa, `Visual e gerar`.
- Uma peça classificada como site com diagnóstico `site` conta como resultado mesmo quando `site.valido` é falso. `pendenciasSite` expõe os erros da auditoria e a TelaSite mostra o aviso. `pecaSumiu` fica reservado para o caso em que nenhum site apareceu na pasta.
- Sessão `parada` ou com `erro` depois de gravar uma peça de site reconhecida não apaga o resultado. A navegação pode abrir a TelaSite e mostrar as pendências existentes.
- A auditoria continua intacta como barreira. Baixar o site fica bloqueado enquanto qualquer erro existir.

## Exportação local de sites (2026-07-26)

Decisão registrada em `decisoes/2026-07-26-fim-da-publicacao-integrada.md`. A publicação integrada no GitHub e na Netlify saiu do produto. A geração, o preview, o modo Editar, o conversor Astro e a auditoria continuam intactos: eles deixaram de servir o deploy e passaram a servir a exportação.

- `server/src/publicacao/` é o módulo determinístico da exportação. Estado em `app/dados/workspaces/<id>/publicacoes.json`, hoje só com `exportacao: { em, modo }` por pasta de peça. Entradas antigas de github e netlify são descartadas na leitura, sem migração.
- `GET /api/publicacao/:pasta` responde `{ registro, auditoria, modoPrevisto, nomeArquivo }`. A auditoria combina a verificação estrutural com a inspeção real de todas as páginas em 390 px e 1440 px, rolagem completa, modo sem JavaScript e `prefers-reduced-motion`. O resultado fica em cache por até 2 minutos, vinculado à versão exata dos arquivos da peça, para manter o painel responsivo sem reutilizar resultado obsoleto.
- `POST /api/publicacao/:pasta/abrir-pasta` abre a pasta da peça no explorador do sistema: `explorer.exe` no Windows, `open` no macOS, `xdg-open` no resto. O caminho vai como argumento de array no spawn, nunca como linha de comando em string. Responde `{ ok: true }` ou um erro legível.
- `GET /api/publicacao/:pasta/exportar` responde o ZIP do site com `Content-Type: application/zip`, `Content-Disposition: attachment` e nome de arquivo derivado da pasta da peça. Com o build Astro viável, exporta o `dist` compilado; senão exporta o HTML puro da peça, com o mesmo fallback honesto de antes e o motivo no aviso. O modo real volta no header `X-VKOS-Modo-Exportacao`.
- A barreira de qualidade roda antes de montar o ZIP (`conferirBarreiraQualidade` em `publicacao/exportacao.ts`). Ela bloqueia CSS ou recurso quebrado, erro de página, rolagem horizontal, conteúdo oculto sem JavaScript ou após a rolagem, movimento incompatível com redução de movimento, wrappers genéricos diretos no `body`, destinos desabilitados inválidos, controle de menu sem `button`, contraste insuficiente e os padrões visuais proibidos pelo contrato. Reprovado responde 400 com as pendências.
- A árvore exportável exclui `anexos/`, `.git/`, `node_modules/`, Markdown, backups e temporários do editor. A presença de `site.md`, outro `.md` ou `carrossel.html` dentro da peça invalida o site antes da exportação. As rotas ignoram `*.bak`, recusam traversal e exigem peça existente.
- Exportação concluída registra `exportacao` e emite `peca:exportada` com pasta, modo e avisos.
- A TelaSite mostra o botão Exportar somente em Visualizar. O painel traz dois gestos, Abrir pasta e Baixar site, bloqueia duplo disparo, mostra erro local, o badge honesto do modo e a data da última exportação. Baixar fica desabilitado enquanto a conferência apontar pendências.

## Exportação em dois modos: projeto Astro (2026-07-17, atualizado em 2026-07-26)

- O HTML da peça é a fonte da verdade local; nada do fluxo local muda. A conversão Astro acontece só na exportação, em `.astro-build/` dentro da peça, pasta interna adicionada a `PASTAS_INTERNAS` (auditoria, previews, watch e coleta ignoram).
- Marcadores do multipágina gerado: `data-vk-nav` na navegação compartilhada, `data-vk-footer` no rodapé, `data-vk-pagina` no conteúdo, `<title>` e `<meta name="description">` únicos por página. O prompt do wizard os exige no formato completo.
- Conversor determinístico em `server/src/publicacao/astro/conversor.ts` (parse com node-html-parser 6.1.13): exige site válido e multipágina, valida nav e rodapé idênticos entre páginas (ignorando `aria-current`, removido no layout emitido), monta `src/layouts/Base.astro` com props titulo/descricao, uma página `.astro` por HTML, `public/` com os assets, `robots.txt` sempre, `sitemap.xml` só com URL pública conhecida (senão aviso), `astro.config.mjs` com `build.format: "preserve"` (links `.html` intactos), `package.json` com `astro@5.18.2` pinado e `netlify.toml`. Scripts copiados saem com `is:inline`. Nunca modifica os arquivos da peça. Falha vira `ConversaoInviavel`. Desde o fim da publicação integrada o Hub não conhece mais URL pública de peça nenhuma, então o `sitemap.xml` sai sempre como aviso; o `netlify.toml` permanece no projeto fonte como conveniência de quem for hospedar.
- Motor compartilhado em `server/src/publicacao/astro/motor.ts`: morada `app/dados/motor-sites/` (gitignorada), npm install sob demanda (timeout 180s, `MotorIndisponivel` legível sem internet), build com timeout 120s via junction temporário de node_modules (`BuildFalhou` com cauda do stderr), `conferirDist` bate o dist com as páginas da peça uma a uma.
- `resolverModoPublicacao`: `"astro"` só com auditoria estrutural válida, multipágina, marcadores em todas as páginas e nav/rodapé realmente compartilháveis; senão `"html"`. A previsão usa o mesmo contrato do conversor, portanto não anuncia Astro quando a identidade do layout já exigiria fallback. Scripts diretos do body são preservados na página Astro correspondente e podem variar entre páginas. `GET /api/publicacao/:pasta` traz `modoPrevisto`. Modo astro: o ZIP leva o `dist` compilado. Qualquer falha de conversão, motor ou build cai pro modo html na mesma requisição com aviso. `publicacoes.json` guarda o modo da última exportação.
- `POST /api/publicacao/:pasta/ensaiar-astro` (interna, diagnóstico): converte e builda sem exportar, responde `{ ok, modo, paginas, avisos }`.
- TelaSite: badge honesto no painel Exportar, "Sai como projeto Astro compilado" quando `modoPrevisto === "astro"` e "Sai em HTML puro" no resto. Limitação conhecida: o layout compartilhado do Astro perde o `aria-current` de link ativo.

# Otimizações de IA (2026-07-16)

## Modo enxuto (REMOVIDO em 2026-07-26)

O recurso descrito abaixo não existe mais no código (ver decisoes/2026-07-26-fim-da-publicacao-integrada.md e o registro da Fase 1 de amputação em planos/vkos-hub-local-v1/01-fases.md). Sumiram `config-app.json.modoEnxuto`, o campo `modoEnxuto` na sessão, o switch na Sidebar e o módulo inteiro `server/src/sessoes/modo-enxuto.ts`. Fica só como histórico:

- `config-app.json` ganhava `modoEnxuto: boolean` (default false). GET e PUT de /api/config expunham e aceitavam o campo.
- `OpcoesSessaoProvedor` ganhava `instrucoesExtras?: string`. Claude virava `--append-system-prompt`; Codex prefixava o prompt do stdin com o bloco `<regras-da-sessao>...</regras-da-sessao>` e linha em branco.
- A regra vivia em `server/src/sessoes/modo-enxuto.ts` (REGRA_MODO_ENXUTO, destilada do ponytail MIT).
- O gerenciador decidia na criação: modo ligado e skill diferente de "carrossel" e de "site" recebia a regra.
- Sidebar: linha "Modo enxuto" com switch acima de `.rodape-custo`.

O campo `instrucoesExtras` do contrato de provedor continua existindo, mas hoje serve outra coisa: o resumo agregado do CRM injetado quando o pedido cita a palavra `crm`. O mecanismo de entrega mudou também: `--append-system-prompt` quebrava no Windows sob shell com prompt multilinha, então as instruções extras passaram a viajar pelo stdin nos dois provedores, via `montarPromptComInstrucoes` (server/src/provedores/util.ts).

## Camada de design v2 (template de site)

- `templates/site/principios-visuais.md` reescrito (352 linhas): leitura de design, cartela de 13 direções, regras de execução, proibições absolutas, teste final e o contrato de marcação do Studio. Referência em `vkos/`, cópias nos workspaces registrados. Crédito no topo (impeccable Apache 2.0, taste-skill MIT, ui-ux-pro-max MIT, temas do astryx MIT).
- `promptSite.ts`: só a linha que descreve o arquivo mudou (agora manda declarar a leitura e a direção no início).
- Padrão de reveal invertido pro seguro: o JS adiciona `js-anima` no html e só aí o CSS esconde; sem JS a página nasce visível.
- Desde 2026-07-17, prompt design-first e biblioteca de estilos (decisoes/2026-07-17-biblioteca-estilos-design-first.md): o bloco 1 do prompt obriga ler cerebro, principios-visuais, `templates/design/cartela.md` (20 direções) e `templates/design/estilos/indice.md` (13 estilos concretos com nomes neutros), escolher UMA direção e UM estilo, declarar em até 3 linhas no início e aplicar o sistema inteiro sem citar marca de origem. Visual personalizado: cores do usuário só nos tokens de cor, tipografia/spacing/motion do estilo. Regras técnicas compactas no fim, com os marcadores do multipágina. Contraste 4.5:1 exigido explicitamente pra texto secundário (nota, legenda, rodapé) e media query de reduced-motion obrigatória. Camada propagada pra ojessegomes, estudio-aura, vkos e vkos2, com skills site v2, /revisar-design e /refinar.

## Revisão de design (TelaSite)

- Atalho "Revisão de design" no topo do painel Ajustar com IA, nos dois modos. Preset do fluxo existente: `aoAjustar` ganhou `textoPreset?: string`; mesma `criarSessao` com `escopoPeca`, mesmas guardas (salvar antes no Editar, um por vez), mesmo progresso e erro. A revisão usa `revisaoDesign: true`, cobre a peça inteira e pode ajustar todos os HTML, CSS, JavaScript e recursos compartilhados dentro dela.
- O preset não passa pela heurística de imagem (sempre sessão de revisão) e a sessão nasce com o título "Revisão de design: tema".
- Prompt do preset: constante `PROMPT_REVISAO_DESIGN` em `TelaSite.tsx`. Desde 2026-07-17 o preset invoca a skill `/revisar-design` do workspace (nota 0 a 10 por área, teste "parece IA?" nas duas ordens, conferência do estilo declarado, correções em ordem de impacto), com uma linha de contexto antes do comando. Mesmo botão, mesmo fluxo, mesmas guardas.
- CSS no bloco `/* ===== Revisao de design ===== */` no fim de site.css.

# Finalizações parte 02 (2026-07-16)

## VKOS-IDE como janela

- `TelaIde` é uma janela flutuante sem véu. A camada mantém `pointer-events: none` e somente `.tela-ide` recebe cliques, então a tela de trás continua utilizável.
- A barra `ide-barra` arrasta com Pointer Events, duplo clique recentraliza e o clamp mantém a janela dentro da área de conteúdo. Minimizar preserva árvore e editor montados e mostra somente barra e chat.
- A geometria usa `localStorage` na chave `vkos-ide-janela`, shape `{ x?, y?, minimizada }`.
- `ResizeObserver` mede a própria camada e aplica `ide-media` abaixo de 1100px, `ide-compacta` abaixo de 760px e `ide-estreita` abaixo de 440px. Em `ide-compacta`, o painel ocupa a camada, usa as abas locais e desativa arrasto e minimização.

## Ajuste com anexo

- `blocoDeAnexos(anexos)` rotula os arquivos como material pronto. Imagem anexada deve ser copiada de `anexos/` para `img/` e referenciada por caminho relativo; documento anexado deve ser lido antes do ajuste.
- Com pelo menos um anexo, Studio e Site ignoram a heurística de geração de imagem e sempre criam a sessão confinada da peça. Sem anexo, o fluxo dedicado de `$imagegen` continua igual.
- `montarPromptAjustePeca` acrescenta a regra preferencial somente quando o pedido contém `anexos/`: usar o anexo que atende ao pedido e não gerar substituto.

## Galeria das fontes de dados

- `ControlesImagem` aceita a prop opcional `aoAbrirGaleria`. Quando presente, mostra `Escolher das fontes de dados` entre upload e geração por IA.
- `GaleriaFontes` recebe `{ aberta, aoFechar, aoEscolher }`, agrupa imagens por contexto e fecha por X, Esc ou clique fora.
- O alvo é capturado antes de abrir o modal. `aplicarImagemDaFonte` baixa por `GET /api/contextos/:id/arquivos/:nome`, envia o base64 para `POST /api/vkos/pecas/:pasta/imagem` e só então aplica `img/<nome>` ao HTML. Nunca referencia a URL da fonte na peça.
- Anexos reservados do composer em `materiais/cockpit/anexos/` não entram na galeria.

## Preview e composição de modelos

- `GET /modelos-html/_exemplo-capa.svg` serve o SVG neutro com `Content-Type: image/svg+xml` e cache público de 86400 segundos.
- `GET /modelos-html/:id/preview?slide=N` usa `1` como padrão, aceita inteiro positivo e faz clamp no último `.slide`. O preview reescreve `img/capa.png` e `img/produto.png` para o SVG neutro sem alterar o template real.
- `DadosCriacao` mantém `estilo` para o cockpit e ganha `estiloCapa` e `estiloPaginas` para o wizard. Iguais ou somente um definido geram `usando o modelo X`; diferentes geram `usando a capa do modelo A e as paginas do modelo B`.
- O wizard mostra capa com `slide=1` e páginas de conteúdo com `slide=2`. Escolher a capa espelha as páginas até o usuário mexer no segundo grupo; deixar a IA escolher zera os dois.
- A etapa de imagens do wizard de carrossel mantém `Sem imagens`, `Com imagens` e `Intercalado`, mas a origem agora reúne Gerar com IA, escolha pela `GaleriaFontes` e upload do computador. Imagem escolhida nas fontes é baixada e enviada pela mesma `POST /api/anexos`, portanto chega ao prompt como caminho local igual ao upload.
- `detalhes` saiu da primeira etapa e virou `Instruções finais` na última etapa, depois do visual. O prompt rotula esse bloco como palavra final do usuário e exige preservar conteúdo e ordem quando houver roteiro pronto.
- A skill `/carrossel` usa o modelo das páginas como base, transplanta a primeira `.slide` do modelo da capa e escopa o CSS transplantado com classe própria. O prompt agora informa os arquivos exatos, manda copiar o template antes de editar, proíbe substituir o modelo por uma interpretação e exige comparação estrutural final. O mesmo contrato foi propagado às skills dos workspaces registrados e referências. O cockpit continua com um seletor único.

# Conserto geral (2026-07-17)

Endurecimento de contratos existentes, sem mudança de arquitetura. Ver decisoes/2026-07-17-dados-sagrados.md e 2026-07-17-camada-tema-oficial.md.

## Dados sagrados

- Leitura do CRM nunca sobrescreve arquivo existente: crm.json que existe mas não parseia (ou não tem forma de CRM) vai pra quarentena `crm.json.corrompido-<timestamp>` por rename e a rota responde `ErroCrm` 409 legível. Estado inicial só nasce quando o arquivo não existe.
- Migração e saneamento do CRM usam fallback, nunca descarte: contato sem nome vira "Sem nome", sem coluna cai na primeira coluna, id ausente ganha id novo. Negócio com coluna órfã cai na primeira coluna.
- A sincronização CRM agenda é serializada por `workspaceId::contatoId` (fila de promessas): operações rápidas no mesmo contato não duplicam evento nem deixam vínculo órfão.
- `DELETE /workspaces/:id` apaga `app/dados/workspaces/<id>/` (conexões, CRM, exportações). A pasta VKOS do cliente fica intacta. Contrato HTTP inalterado. Desde a remoção da camada Google em 2026-07-26 não existe mais refresh token pra revogar.

## Exportação fiel

- O conversor Astro valida que todo nó com conteúdo do body está coberto por nav marcada, `[data-vk-pagina]`, footer marcado ou script direto; conteúdo fora vira `ConversaoInviavel` citando o elemento (fallback HTML com aviso). Os heads das páginas precisam ser idênticos fora de `title` e `meta description`; divergência cita a página e o elemento.
- O corpo de cada página sai por `Fragment set:html`, então chaves literais no texto nunca viram expressão Astro. Scripts diretos do body continuam `is:inline` reais.
- A conferência de site tem núcleo único `conferirPeca` em `publicacao/auditoria.ts`, usado pela exportação (com cache de 2 min) e pelo laço de conformidade (sem cache), ambos com o host resolvido no server (`hostLocalDoHub`). `invalidarCacheAuditoria(workspaceId, pasta)` invalida o cache da exportação; o laço invalida ao fim de cada volta.
- `modoPrevisto` só anuncia "astro" com marcadores válidos, estrutura coberta E motor viável (astro instalado ou npm no PATH, checagem cacheada). Sem motor viável, o badge não aparece.
- O watcher de `conteudo/` ignora eventos com `.astro-build` no caminho. Remoções de árvore de build (e a exclusão de peça em `DELETE /vkos/pecas/:pasta`) passam por `limparBuildAstro`, que desfaz um junction remanescente antes de qualquer rm recursivo.

## Laço robusto

- No boot, `conferenciaSite` em estado não terminal (`conferindo`/`corrigindo`) vira `pendencias` (a barreira do deploy reconfere de qualquer jeito). Exceção dentro do laço também termina em `pendencias` com o motivo logado, nunca preso.
- `geracaoVisualEmAndamento` considera em andamento a sessão de site com conferência não terminal: POST de site/carrossel nessa janela leva 409.
- No frontend, a fase de conferência tem guarda de 90 segundos: estourou, o flutuante mostra "A conferência está demorando; o site está em Sites" e pode ser dispensado.
- A retomada interna do laço não sobrescreve `sessao.prompt` e o turno entra com `interno: true` no `TurnoSessao`; as transcrições exibem como nota discreta "Correção automática do Hub". Retomada manual continua igual.
- Result com erro não soma custo (sessão nem workspace) e não marca custo estimado.
- Sessões e custos persistidos passam por saneamento defensivo na carga: entrada malformada é ignorada com log, campo faltando ganha padrão seguro.

# Camadas no editor e modo econômico (2026-07-20)

Ver decisoes/2026-07-20-camadas-e-modo-economico.md.

## Editor de carrossel: hit-test geométrico, camadas e imagem própria

- O clique do carrossel resolve o alvo por geometria (menor elemento com área visível sob o ponteiro, olhando o slide inteiro), ignorando `pointer-events`. Clique repetido no mesmo ponto (limiar de 8px) alterna pela pilha de empilhados, menor área primeiro. Duplo clique continua refinando com `alvoEdicao`. O núcleo ganhou `pilhaNoPonto` e `alvoNoPonto` aceita `pularDecorativaGrande` (padrão true, comportamento do site intocado; o carrossel passa false).
- Todo elemento dos slides recebe `data-vk` incremental na instrumentação, no mesmo esquema do site, e a serialização preserva o atributo. `listarCamadas(pagina)` devolve dois níveis (filhos do slide e filhos diretos de contêiner) ordenados por z-index computado com desempate por ordem no DOM. `moverCamada(id, direcao)` troca posições no DOM e, quando o CSS fixa z-index diferentes, troca também os valores inline dos envolvidos. `desfazer` re-seleciona pelo `data-vk` guardado antes de restaurar.
- `PainelCamadas.tsx` (componentes/editor/) é o componente compartilhado dos dois editores: props `itens: ItemCamada[]` (id, nome com papel Texto/Imagem/Enfeite/Bloco, conteudo, detalhe, nivel 0|1, podeSubir, podeDescer), `selecionadoId`, `aoSelecionar`, `aoMover`. Renderizado no PainelPropriedades do Studio, no overlay EditorCarrossel e no PainelSite. Classes `camadas-*` em editor.css, só tokens.
- `inserirImagemLivre` no carrossel cria `<img>` absoluta com 40% da largura do slide, centralizada, z-index acima do conteúdo, `data-vk` novo, selecionada ao nascer e arrastável pelo arrasto existente. Botão "Adicionar imagem" com as duas origens (computador e fontes de dados) e campo numérico de largura quando a seleção é imagem.
- Mover elemento absolute/fixed com `right` ou `bottom` ancorado no CSS trava o tamanho atual e solta o lado ancorado (`liberarParaMover`), pra `left`/`top` transladarem em vez de encolher. O reset limpa o que foi solto (marcado em `data-ed-livre`, artefato que não vai pro HTML salvo).

## Alças de redimensionamento interativo no carrossel (2026-07-21)

- Elemento absolute/fixed selecionado (fora slide/body/html) ganha oito alças (quatro cantos, quatro meios de aresta) desenhadas dentro do slide como filhos `.vkos-ed-alca`. Elemento de fluxo (static/relative) não ganha alça: redimensiona só pela largura/altura numérica do painel, pra não arriscar reflow. O campo `redimensionavel` e `alturaPx` entraram em `PropsSel`.
- As alças têm tamanho fixo na tela: o motor as dimensiona em `TAM_ALCA / escala` e o host (Studio e overlay) chama `motor.reposicionarAlcas()` quando a escala do zoom muda. Todo o gesto roda no mesmo sistema de coordenadas do arrasto (px do slide, com conversão pela escala quando o ponteiro sai do iframe).
- Cada aresta move só a sua borda com a oposta ancorada; canto move os dois eixos com o canto oposto ancorado. Tamanho mínimo `MIN_REDIM` (16px de slide) nos dois eixos. Imagem em canto trava a proporção por padrão (Shift libera); bloco em canto é livre (Shift trava); arestas nunca travam. `prepararCaixa` deixa left/top/width/height explícitos e solta right/bottom antes do gesto, registrando em `data-ed-livre` só o que adicionou.
- As alças nunca entram no clique de seleção, na pilha de camadas, no desfazer nem no HTML salvo: `ehAlvoLegitimo` e `filhosEmpilhados` as ignoram, `limparArtefatosSelecao` (núcleo) e o serializador as removem junto das guias, e o mousedown numa alça (`ehAlca`) desvia pro resize sem trocar a seleção. Somem durante o arrasto e a edição de texto e voltam na caixa nova ao fim.

## Editor de site: camadas na seção e imagem de bloco

- Dentro da seção selecionada, `relistarCamadas` monta os itens no contrato do PainelCamadas (dois níveis, ordem de fluxo do DOM, primeiro da lista = topo da seção). `moverCamada` troca só a ordem no DOM (site é fluxo, sem z-index). `selecionarCamada` seleciona no canvas com scroll até o elemento.
- `inserirImagemNaSecao` insere `<img>` de bloco no fim da seção (display block, width 100%, max-width ajustável), com `data-vk` e `src` relativo `img/<nome>`. `SelecaoSite` ganhou `larguraMax` pro campo "Largura máxima" do painel, aplicado via `aplicarEstilo` (respeita escopo geral/celular e desfazer). A auditoria de publicação aceita a imagem inserida (arquivo real em `img/`).

## Modelos econômicos por tarefa

- `OpcaoModelo` do contrato de provedores ganhou `economico?: boolean`, marcado em um modelo por provedor: `haiku` (Claude) e `gpt-5.4-mini` (Codex). O tipo espelhado no front vive em `api/cliente.ts` (`OpcaoModeloIA`).
- O painel Ajustar com IA do carrossel e do site inicializa o modelo no econômico do provedor ativo, com a dica "Comece pelo econômico. Se o resultado não convencer, repita o pedido num modelo maior." A escolha manual continua. A Revisão de design segue no padrão do provedor enquanto o usuário não tocar no seletor.

## Interruptor "Aprimorar com IA" nos wizards

- Campo `aprimorarComIA` (opcional por compatibilidade; ausente = ligado) nos dados dos wizards de carrossel e site, com switch na etapa de instruções finais. Desligado: o seletor de modelo da etapa 0 fica desabilitado com nota, e com `detalhes` vazio aparece o aviso de conteúdo básico.
- Desligado, o payload força o modelo econômico da tarefa: carrossel usa o alias `economico` do backend (fallback haiku/gpt-5.4-mini); site usa o degrau do meio (`sonnet` no Claude, `gpt-5.6-terra` no Codex), porque site não tem template HTML pra copiar.
- Prompt: carrossel ANEXA `blocoMontagemEconomica()` (siga o template sem alterar anatomia, conteúdo das instruções finais e do Cérebro, sem direção de arte nova, sem elementos novos); site SUBSTITUI o Bloco 1 por `blocoDesignEconomicoSite()` com o estilo fixo Grade de zinco da biblioteca, Blocos 2 e 3 intactos (marcadores `data-vk-*` e contraste inclusos). Nenhuma linha dos prompts do modo ligado mudou: snapshots em `componentes/criacao/fixtures/` e testes de `prompt.test.ts`/`promptSite.test.ts` provam byte a byte.
- O laço de conformidade de site dispara igual nos dois modos (a skill continua "site"). CSS do switch e do aviso em criacao.css (`criacao-aprimorar`, `criacao-switch`, `criacao-aviso`), só tokens.

## Mapa de Telas: segunda visão do Mapa (2026-07-21)

- Dado curado em `interno/mapa-telas.json` (`versao: 1`, `zonas`, `telas`, `ligacoes`, `jornadas`), auditado contra `rotas.ts`, `Shell.tsx` e `App.tsx`. Cada tela: `id`, `zona`, `nome`, `rota`, `destino` (string na gramática de telas do Shell ou `null` pra estado sem navegação direta), `resumo`, `descricao`, `estados[]`, `esqueleto`. Ligações têm `gesto`; jornadas têm `passos[]` (mínimo 2, repetição permitida).
- `app/server/src/mapa.ts` ganhou `MapaTelasSchema` (Zod) com superRefine (zona existe, pontas de ligação existem, passos de jornada existem, ids únicos), `lerMapaTelas`, `validarMapaTelas` e a rota `GET /api/mapa/telas` no plugin `rotasMapa` (`{ disponivel, mapa }`, mesmo contrato do `/mapa`). `mapa.test.ts` valida o JSON real e recusa ponta/passo órfão.
- `TelaMapaTelas.tsx` (componentes/mapa/) é a visão nova, com seu próprio `ReactFlowProvider`. `TelaMapa.tsx` virou o chapéu com o seletor "Sistema | Telas" (só aparece quando `/api/mapa/telas` está disponível; sem ela o Mapa é idêntico ao de antes). Os controles do Sistema (Títulos, Descrições, Discreto, Percurso das skills, Mapa completo) ficam escondidos na visão Telas.
- Nós posicionados por zona (coluna) e ordem (linha). `NoTela` mostra tag da zona, mini-esqueleto CSS (`EsqueletoTela`, chave `esqueleto`, nunca screenshot, só tokens), nome, rota, resumo, estados (até 4, "+n") e o botão Abrir. Aresta `LigacaoGesto` estática com o rótulo do gesto. `onlyRenderVisibleElements` ligado, sem animação contínua.
- Botão Abrir navega por hash (`window.location.hash`), o mesmo caminho do Voltar do navegador, sem tocar no Shell. `resolverDestino` trata os especiais (`setup`, `ide`) e os parametrizados (`studio:@peca-imagem`, `site:@peca-site`, `fonte:@fonte`) resolvendo pela peça ou fonte mais recente do cliente ativo; sem candidato, o botão desabilita com o motivo. Destino `null` não mostra botão. `mapa-telas.test.ts` (web) trava o round-trip de cada destino contra `telaParaHash`/`hashParaTela`.
- Jornadas: chips no canvas (padrão do Percurso das skills). Selecionar acende os passos com número, atenua o resto, destaca as arestas do caminho e lista os passos clicáveis no painel. Classes `mapa-no-tela-*`, `mapa-esq*`, `mapa-gesto-*`, `mapa-abrir-*` em mapa.css, só tokens, três temas, `prefers-reduced-motion` respeitado. Puramente visual: nenhum comportamento do app muda.

## CRM v3: o contato é o cartão do funil (2026-07-21)

- `Contato` ganhou `colunaId` (estágio no funil, obrigatório) e `lead?: DadosLead` (retrato da mineração: placeId, categoria, endereco, site, nota, totalAvaliacoes, termoBusca, localizacao, capturadoEm). `Negocio` perdeu `colunaId`: virou valor/oportunidade preso a um contato. `EstadoCrm.versao` foi pra `3`. Primeira coluna padrão passou de "Novo contato" pra "Não iniciados".
- Migração `normalizarEstadoCrm` v2→v3: cada contato herda o estágio do seu negócio mais recente (`estagiosDosNegociosV2`), os negócios perdem `colunaId`. v1→v3: o contato herda `colunaId` do dado antigo; o `valorEstimado` vira um negócio sem estágio (sem valor, nenhum negócio nasce). A quarentena de arquivo corrompido/inválido continua intacta. A ordem do array `contatos` é a ordem visual do quadro.
- `moverContato(id, {colunaId, indice})` novo: move a ficha de estágio, reposiciona via `posicionarNoFunil` (genérica sobre `{id, colunaId}`, ex-`posicionarNegocio`) e emite `crm:contato-movido` (mesmo payload de antes: colunaDe/colunaPara/nomes). `moverNegocio` saiu. `criarContato` aceita `colunaId` (default primeira) e `lead`. `removerColuna` remaneja os CONTATOS da coluna (não os negócios). `criarNegocio`/`atualizarNegocio` não tocam mais em coluna. Rota nova `PATCH /api/crm/contatos/:id/mover`; `PATCH /api/crm/negocios/:id/mover` removida.
- `resumo.ts` (contexto pra IA) conta contatos por coluna e soma o valor dos negócios daqueles contatos. As automações escutam o mesmo evento `crm:contato-movido` (o rótulo "Cartão movido de coluna" agora é literalmente o contato), sem mudança de contrato.
- Import de leads (`importarLeadsNoCrm`) leva o retrato completo pra `contato.lead` via `retratoDoLead`. Web: `TelaCrm` monta o quadro por `contato.colunaId` (fim da coluna virtual "Contatos sem negócio"), arrasta contatos, `CartaoContato` mostra a pessoa + soma de valor + tags, `ColunaCrm` recebe contatos. `PainelContato` ganhou seletor de estágio no topo e seção "Dados do lead"; a linha de negócio virou só título + valor. Classes `crm-painel-estagio`, `crm-lead-ficha`, `crm-cartao-tags` em crm.css, só tokens.

## CRM no nível CORE (2026-07-27)

- O CRM saiu de `app/dados/workspaces/<id>/` e passou a viver em `app/dados/crm/`: `crm.json`, `interacoes.jsonl`, `estagios.jsonl`, `recuperacoes.jsonl`. É o funil comercial do dono do Hub, não do cliente. A pasta existe sempre, então `ErroCrm` 409 "Nenhum cliente ativo" sumiu de `salvar`, `lerEstadoMutavel` e `pastaHistoricoMutavel` (as duas últimas deixaram de existir). `GET /api/crm` e todas as escritas respondem com ou sem cliente aberto. O 409 do CRM hoje significa só arquivo corrompido.
- `server/src/crm/fusao.ts` (novo): `fundirCrmsDosWorkspaces(pastaClientes, pastaDestino)` roda uma vez, na primeira leitura em que o `crm.json` do CORE não existe. Percorre os workspaces em ordem de id; coluna funde por nome normalizado (a primeira vence e mantém o id, as outras viram apelido e os contatos são remapeados, `ordem` recalculada em sequência); id repetido entre clientes é renomeado com sufixo `--<workspaceId>` e toda referência acompanha (`negocio.contatoId`, `tarefa.contatoId`, `tarefa.negocioId`, `orcamento.negocioId`, `interacao.contatoId`, `registroEstagio.contatoId`, `participantes`); `workspaceOrigemId` é preservado. Organização não funde por nome.
- Contato duplicado não é fundido. Mesmo `telefoneNormalizado` ou mesma `chaveExterna` viram linha em `app/dados/crm/duplicatas-da-fusao.jsonl` (`{ id, em, oQueBateu, valor, contatoA, nomeA, workspaceA, contatoB, nomeB, workspaceB }`), com id determinístico e append sem repetir. Os dois contatos continuam vivos.
- Ordem de escrita da fusão: histórico, duplicatas e recuperações primeiro, `crm.json` depois. Em seguida cada arquivo de origem é renomeado para `<nome>.migrado-para-core-<carimbo>`, por rename, com os bytes intactos. Nada é apagado. `crm.json` de cliente que não parseia fica onde está, sem rename, e o caso é registrado em `recuperacoes.jsonl` do CORE.
- `emitirCrm` emite com `workspaceId: ""`, que no barramento passou a significar escopo CORE. `registrarNoLog` continua ignorando id vazio, então evento de CRM não entra em `eventos.jsonl` de cliente nenhum.
- `workspaces/estado.ts` ganhou `pastaDadosHub()` e `pastaWorkspacesHub()`. `garantirPastaDadosWorkspace` e `pastaDadosWorkspace` continuam servindo os outros módulos. `VKOS_DADOS_TESTE` redireciona a raiz de dados que o CRM enxerga (`crm/` e `workspaces/` dentro dela) e existe só para teste não escrever em `app/dados/` real.
- Web: `Shell.tsx` perdeu a `key` por workspace do `TelaCrm`. Trocar de cliente não remonta mais a tela do CRM. A navegação não mudou: o CRM continua na Sidebar, no mesmo lugar.

## CRM ao vivo (2026-07-27)

- `server/src/crm/aovivo.ts` (novo): `avisarCrm`, `montarAviso`, `deveAvisar` e `escopoDaRota`. A mensagem é só notificação, no padrão do `pecas:atualizadas`: `{ tipo: "crm:atualizado", escopo, contatoId?, origem? }`. Nenhum dado de contato viaja nela.
- Quem dispara é um hook `onResponse` dentro do plugin `rotasCrm`, não cada rota: são mais de vinte mutações, e a que esquecesse de avisar viraria tela desatualizada em silêncio. Só método de escrita com status abaixo de 400 avisa. `POST /leads/importar` avisa por fora, porque cria contato sem passar pelas rotas do CRM.
- `escopo` separa o que se relê: `funil` pede `GET /crm`; `interacoes` (só `/contatos/:id/interacoes` e `/contatos/:id/notas`) pede `GET /crm/interacoes/ultimas` e a linha do tempo daquele contato. Registrar interação só mexe no `interacoes.jsonl` e no carimbo do contato, que a tela não desenha, então não vale reler o funil inteiro.
- `origem` é o id da aba que gravou, mandado por ela no cabeçalho `x-vkos-aba` (`web/src/api/aba.ts`) e devolvido no aviso. A aba que gravou reconhece o próprio eco e não recarrega: ela já aplicou a resposta do próprio PATCH. O envio é `transmitir`, para todas as abas, porque o CRM é do CORE e não tem workspace pra filtrar.
- Web: a tela assina pelo WebSocket único do app, via `avisoCrm` do `estado/contexto.tsx`. As regras vivem em `web/src/componentes/crm/aovivo.ts` (`criarSincronizador`), separadas do componente porque o teste do web roda sem DOM. A recarga fica guardada e só entra quando a aba não está editando um campo de texto do CRM nem com gravação própria no ar. Adiar nunca perde a pendência. A recarga de fundo nunca passa por `setCarregando`, que trocaria a tela inteira pelo aviso de carregamento e desmontaria a ficha aberta com tudo que estivesse digitado nela. Reconexão manda `escopo: "tudo"`.

## Mensagens: conversas do CRM, servidor (2026-07-27)

Módulo novo `server/src/mensagens/`, dono de tudo dentro. Etapa 2e do plano `planos/vkos-hub-local-v1/04-crm-e-mensagens.md`. Esta rodada é só servidor: os três painéis são a rodada seguinte.

### Armazenamento

- `app/dados/crm/mensagens/indice.json` guarda a lista de conversas (a coluna da esquerda) e `app/dados/crm/mensagens/conversas/<id>.jsonl` guarda uma conversa por arquivo, append-only. Fica dentro da pasta do CRM porque conversa é dado do CRM, e por isso respeita `VKOS_DADOS_TESTE` pela mesma função: `pastaCrm()` passou a ser exportada de `crm/estado.ts` e é a única regra sobre onde o dado do CRM mora.
- Reusa `util/jsonl.ts` (leitura tolerante e append), `util/gravarJson.ts` (índice atômico), `util/quarentena.ts` (índice corrompido sai do lugar com os bytes intactos e a rota responde 409) e `util/telefone.ts` (E.164). Nenhuma segunda versão de nada disso.
- Linha corrompida no `.jsonl` custa uma mensagem, não a conversa: ela é pulada, contada e devolvida em `linhasInvalidas`.
- Atualizar mensagem é gravar uma LINHA NOVA E COMPLETA com o mesmo `id`, preservando `enviadaEm` e `criadaEm`. A leitura colapsa por id, a última linha vence e a posição da primeira é mantida. É o que vai deixar o canal real mudar status por callback sem reescrever arquivo. Ver `decisoes/2026-07-27-conversa-append-only-e-atualizacao-por-linha-nova.md`.
- Id de conversa é `cv-<uuid>` e passa por `ehIdSeguro` antes de virar caminho de arquivo. Id que não serve como nome de arquivo responde 404, nunca lê fora da pasta.

### Modelo

- `Mensagem`: `id` (UUID local, SEMPRE, nunca do provedor), `conversaId`, `direcao` (`entrada` | `saida`), `canal`, `origem` (`manual` | `api`), `tipo`, `texto`, `privada`, `status` (`rascunho` | `na-fila` | `enviada` | `entregue` | `lida` | `falhou`), `erroCodigo?`, `erroTexto?`, `idExterno?` (wamid, único na thread), `chaveIdempotencia`, `respondeA?`, `autorTipo`, `enviadaEm`, `entregueEm?`, `lidaEm?`, `criadaEm`, `payloadBruto?`, `anexos[]`.
- `enviadaEm` é quando aconteceu no mundo real e é o que ordena a thread; `criadaEm` é quando a linha entrou no arquivo e nunca é retroativo. Registro retroativo entra no fim do arquivo e no meio da thread.
- `AnexoMensagem` guarda `caminhoLocal`, NUNCA URL: a URL de mídia da Meta expira em 5 minutos. Anexo com URL é recusado com 400.
- `Conversa`: `id`, `contatoId` (obrigatório), `negocioId?`, `canal`, `identificadorExterno`, `status` (`aberta` | `aguardando` | `resolvida` | `adiada`), `adiadaAte?`, `ultimaEntradaEm?`, `ultimaMensagemEm?`, `previa`, `naoLidas`, `lidasAte?`, `criadaEm`, `atualizadaEm`.
- `ultimaEntradaEm` é quando o CONTATO falou por último e é a única fonte da janela de 24 horas. Só mensagem de entrada não privada a move. `lidasAte` é o cursor de leitura do dono, e existe porque marcar lida não pode reescrever histórico append-only.
- Os campos derivados da conversa (`ultimaMensagemEm`, `ultimaEntradaEm`, `previa`, `naoLidas`) são recalculados da thread inteira a cada escrita, não incrementados: a thread já foi lida para deduplicar, e contador incremental erra uma vez e mente para sempre.

### A regra que define o produto

- Conversa não existe sem contato. `POST /conversas` sem `contatoId` é 400, com id inexistente é 404. `garantirConversaPorIdentificador({ identificadorExterno, nomeSugerido? })` é a costura do webhook: acha o contato pelo telefone normalizado e, se não existe, CRIA O CONTATO no CRM antes de abrir a conversa. Não há caminho que termine com conversa solta.
- Uma conversa por contato e por canal. Pedir de novo devolve a que existe, com 200 em vez de 201.

### Contrato de canal (`mensagens/canais/`)

- Espelha `provedores/contrato.ts`. `CanalMensagens` tem `id`, `rotulo`, `capacidades` (`envioReal`, `janela24h`, `templates`, `recebePorWebhook`, `anexos`) e `montarMensagem(pedido)` obrigatório, puro, que garante mensagem válida com id local e status inicial coerente com o canal e NÃO garante envio nem entrega.
- Opcionais, e método ausente significa que o canal não faz aquilo: `despachar` (garante só o aceite do provedor, nunca a entrega, que chega depois por callback), `interpretarRecebimento` (webhook cru em mensagens, sem garantir unicidade, porque quem deduplica é o núcleo), `interpretarStatus` (confirmação de status) e `janelaAberta` (a janela de resposta livre, calculada de `ultimaEntradaEm`).
- Só o canal `manual` está implementado e registrado: sem envio real, sem janela, sem template, sem webhook, com anexo. Saída nasce `enviada`, entrada nasce `entregue`, nota privada nasce `rascunho` porque nunca sai. Pedir canal `whatsapp` responde 400 até a integração existir de verdade.
- Deduplicação no núcleo, nesta ordem: `idExterno` igual na thread devolve a mensagem original com 200 (reenvio de webhook não duplica), depois `chaveIdempotencia` igual (clique duplo e retentativa não duplicam).

### API HTTP

- `GET /api/crm/mensagens/canais` responde `{ canais: [{ id, rotulo, capacidades }] }`.
- `GET /api/crm/mensagens/conversas?contatoId=&status=` responde `{ conversas }`, mais recentes primeiro, sem mensagem nenhuma dentro.
- `POST /api/crm/mensagens/conversas` body `{ contatoId, canal?, identificadorExterno?, negocioId? }` responde 201 com a conversa, ou 200 com a que já existia.
- `GET /api/crm/mensagens/conversas/:id?limite=&antesDe=` responde `{ conversa, mensagens, total, temMais, cursorAnterior?, linhasInvalidas }`. Padrão 50 por página, teto 200, sempre a página mais nova. `antesDe` é o id da mensagem mais antiga da página atual e caminha para trás. Cursor que não existe mais cai na página mais nova em vez de virar erro.
- `POST /api/crm/mensagens/conversas/:id/mensagens` body `{ direcao, texto, tipo?, privada?, autorTipo?, enviadaEm?, idExterno?, chaveIdempotencia?, respondeA?, anexos?, payloadBruto? }` responde 201, ou 200 quando é repetição já conhecida. Mensagem sem texto só vale com anexo. Entrada não privada reabre a conversa (volta a `aberta` e limpa `adiadaAte`).
- `POST /api/crm/mensagens/conversas/:id/lida` zera `naoLidas` e move `lidasAte`, sem tocar no arquivo da thread.
- `PATCH /api/crm/mensagens/conversas/:id` body `{ status?, adiadaAte?, negocioId? }`. Adiar exige a data para retomar, senão é 400.
- `GET /api/crm/contatos/:id/linha-do-tempo?limite=` responde `{ itens }`, união ordenada de interações e mensagens, mais novas primeiro. É view: nada é copiado de um arquivo para o outro.
- Erros no formato `{ erro: mensagem }`: 400 payload inválido, 404 id que não existe, 409 índice corrompido, 413 payload bruto grande demais.

### Ao vivo

- `mensagens/aovivo.ts` transmite `{ tipo: "mensagens:atualizadas", escopo: "conversas" | "thread", conversaId?, origem? }` em broadcast, pelo mesmo hook `onResponse` do padrão do CRM, mas dentro do plugin `rotasMensagens`.
- O aviso NUNCA carrega texto de mensagem, prévia ou qualquer conteúdo: só id e escopo. Quem quer o conteúdo pede pela rota.
- `thread` (mensagem nova, marcar lida) implica `conversas`: mudou prévia, ordem e não lidas na lista também. `conversas` (criar conversa, mudar status) não faz thread aberta nenhuma reler.
- `origem` é o id da aba que gravou, vindo do cabeçalho `x-vkos-aba`, para ela não recarregar por causa do próprio eco.
