# Banco central de modelos de carrossel

Plano de execução. Escrito para outra IA executar quando o Jesse der o comando.
Antes de qualquer código, leia a seção "Regras da casa" e a fase 0 inteiras.

ATENÇÃO: o adendo `01-originais-no-banco.md` emenda as fases 1, 2 e 4 deste plano
(originais da semente no painel, sobrescrita e atualização no uso). Leia os dois antes de
começar e execute como um trabalho só. Onde o 01 contradiz o 00, o 01 manda.

## O problema

Hoje um modelo de carrossel é um arquivo `templates/carrossel/modelo-<id>.html` que mora
DENTRO de cada workspace. Quando um cliente é criado, a semente `vkos2` é copiada inteira
(`app/server/src/plataforma/provisionamento.ts`, função `materializarWorkspace`). A pasta de
templates vira uma foto congelada: modelo novo adicionado na semente só chega a clientes
criados depois. Não existe lugar central.

## A decisão (já travada com o Jesse, não reabrir)

Opção C: banco central com cópia no uso.

1. Os modelos passam a viver num banco central no servidor, fora dos workspaces.
2. A lista que o cliente vê no wizard é a união: modelos locais do workspace mais os do banco.
3. Quando uma geração usa um modelo do banco que ainda não existe na pasta do cliente, o
   servidor copia o arquivo pra dentro do workspace um instante antes de criar a sessão.
   A IA continua lendo um arquivo local. O contrato de geração não muda de natureza.
4. O CORE ganha um painel de gestão do banco com dois caminhos de criação:
   colar HTML pronto, ou gerar por IA a partir de uma imagem de referência
   (botão "Copiar modelo"), com refino no Studio antes de salvar.
5. Modelo agora tem TIPO: `capa`, `desenvolvimento`, `cta` ou `completo`. Os 14 da semente
   são todos `completo` (cada arquivo traz todos os tipos de slide). O tipo filtra em qual
   grupo do wizard o modelo aparece.

## Regras da casa (inegociáveis)

- NUNCA fazer commit, push ou PR. Sem exceção. O Jesse commita quando validar.
- Todo texto em português brasileiro. NUNCA usar o travessão "—" nem o caractere "·".
  Frase curta. Sem jargão.
- Compatibilidade byte a byte: os prompts do fluxo atual (sem modelo de CTA escolhido) já
  estão travados por fixtures em `app/web/src/componentes/criacao/fixtures/`. Eles NÃO podem
  mudar um byte. Rode os testes de fixture antes e depois de mexer em `prompt.ts`.
- Nada de mexer nos 14 modelos da semente (`vkos2/templates/carrossel/`). Eles continuam
  como estão.
- Rascunho antigo de wizard não pode quebrar: todo campo novo em `DadosEtapas` e
  `DadosCriacao` é opcional com default seguro.
- Ao final: atualizar `interno/mapa-sistema.json` e `interno/mapa-telas.json` (há teste que
  valida), `app/CONTRATO.md`, `CHANGELOG.md`, e criar `decisoes/AAAA-MM-DD-banco-de-modelos.md`
  com contexto, decisão e por quê (use a data do dia da execução).
- Rodar `npm run testar` em `app/` (server, web e motor), typecheck e build ao final.
  Verificação headless com playwright-core seguindo o padrão dos scripts já usados no
  scratchpad da sessão (subir o server, navegar, screenshot, checar zero pageerror).

## Fase 0: leitura obrigatória antes de codar

- `app/server/src/vkos/modelos.ts`: como um modelo vira lista hoje (descoberta por arquivo,
  ficha no `estilos.md`, conjunto `PEDEM_IMAGEM`, id `dark` para `modelo.html`).
- `app/server/src/vkos/rotas.ts`: rota `GET /api/vkos/modelos-carrossel` (linha ~229) e o
  preview `GET /modelos-html/:id/preview` (função `servirPreviewModelo`, linha ~616).
- `app/server/src/sessoes/rotas.ts`: o `POST /api/sessoes`, a guarda
  `geracaoBarradaPorCerebro` e a lista `SKILLS_QUE_EXIGEM_CEREBRO`.
- `app/server/src/plataforma/provisionamento.ts`: o padrão de pasta de dados
  (`pastaClientes`, env override) que o banco de modelos vai imitar.
- `app/server/src/plataforma/admin.ts`: como as rotas de admin são montadas e autenticadas.
  Atenção: a tabela `modelos_workspace` que aparece lá é OUTRA coisa (planos de cliente).
  Não confundir e não tocar.
- `app/web/src/componentes/criacao/EtapasCriacao.tsx`: os grupos Capa e Páginas da etapa 2,
  o componente interno `MiniModelo` e `dadosCriacaoDe`.
- `app/web/src/componentes/criacao/prompt.ts`: `contratoModelo`, `arquivoDoModelo`,
  `montarPromptCriacao` e os testes com fixture em `prompt.test.ts`.
- `app/web/src/componentes/gestao/ShellGestao.tsx`: as áreas do painel de gestão do CORE.
- `app/web/src/componentes/editor/motor.ts` (só o final, função `salvar`): como o Studio
  persiste uma peça via `PUT /api/vkos/pecas/:pasta/carrossel`.
- `vkos2/templates/carrossel/principios-modelos.md` e dois ou três `modelo-vkos0X.html`
  inteiros: a anatomia que um modelo precisa respeitar (slides `.slide`, tipos de slide,
  tokens de recoloração, 1080x1350).

## Arquitetura do banco

### Armazenamento

Pasta central no servidor, irmã da pasta de clientes:

```
app/dados/modelos-carrossel/<id>/modelo.html
app/dados/modelos-carrossel/<id>/modelo.json
```

- Caminho resolvido como em `provisionamento.ts`:
  `resolve(process.env.DADOS_MODELOS ?? join(pastaApp, "dados", "modelos-carrossel"))`.
- `modelo.json`: `{ id, nome, descricao, tipo, pedeImagem, criadoEm, atualizadoEm }`.
  `tipo` é `"capa" | "desenvolvimento" | "cta" | "completo"`.
- Id: slug `[a-z0-9-]` gerado do nome, SEMPRE com prefixo `b-` (ex: `b-neon-grid`).
  O prefixo garante que nunca colide com os ids da semente (dark, editorial, declaracao,
  claro, produto, vkos01 a vkos09) nem com adições futuras dela. O arquivo copiado pro
  workspace vira `modelo-b-neon-grid.html`, que já casa com a convenção de
  `arquivoDoModelo` (id diferente de "dark" vira `modelo-<id>.html`) e com o regex do
  preview (`[a-z0-9-]+`). Não mexer em `arquivoDoModelo`.

### Módulo servidor

Novo `app/server/src/vkos/bancoModelos.ts`:

- `listarBanco(): ModeloBanco[]` lê a pasta central, tolerante a JSON quebrado (pula e loga).
- `lerModeloBanco(id)` devolve metadados mais o HTML.
- `salvarModeloBanco(entrada)` cria ou atualiza: valida slug, valida o HTML, grava os dois
  arquivos.
- `removerModeloBanco(id)`.
- `validarHtmlModelo(html)`: exige ao menos um elemento com classe `slide`, tamanho máximo
  512 KB, e devolve avisos (não bloqueia) para referência externa `http(s)://` fora de
  fonts.googleapis.com e fonts.gstatic.com (os modelos da semente usam Google Fonts).
- Testes em `bancoModelos.test.ts` com pasta temporária: CRUD, slug, prefixo `b-`,
  validação, JSON quebrado não derruba a listagem.

### Tipo compartilhado

Em `app/server/src/tipos.ts`, `ModeloCarrossel` ganha dois campos opcionais:
`tipo?: "capa" | "desenvolvimento" | "cta" | "completo"` e `origem?: "workspace" | "banco"`.
Espelhar em `app/web/src/tipos/dominio.ts`. Opcionais para nenhum consumidor atual quebrar
(`NoSessao.tsx`, `EtapasCriacao.tsx`). `lerModelosCarrossel` passa a preencher
`tipo: "completo"` e `origem: "workspace"` nos que descobre.

### Rotas

CRUD do banco, restrito ao operador (mesma autenticação das rotas de gestão em
`plataforma/admin.ts`; estas rotas NÃO dependem de Postgres, são só filesystem):

- `GET /admin/banco-modelos`: lista com metadados.
- `POST /admin/banco-modelos`: cria. Corpo:
  `{ nome, descricao, tipo, pedeImagem, origemHtml }` onde `origemHtml` é
  `{ modo: "colar", html }` ou `{ modo: "peca", workspaceId, pasta }`. No modo `peca`, o
  servidor lê `conteudo/<pasta>/carrossel.html` do workspace indicado (validar que a pasta é
  um segmento único, sem `/` nem `..`, mesmo padrão das rotas de peça existentes).
- `PUT /admin/banco-modelos/:id`: atualiza metadados e opcionalmente o HTML (mesmo corpo).
- `DELETE /admin/banco-modelos/:id`: remove do banco. Cópias já feitas em workspaces de
  clientes ficam onde estão (decisão consciente: apagar arquivo de cliente é destrutivo).

Superfície do workspace (sem autenticação extra além da atual):

- `GET /api/vkos/modelos-carrossel` passa a devolver a união: locais do workspace
  (filtrando fora qualquer `b-*` local, que é sempre sombra do banco) mais todos os do
  banco com `origem: "banco"`. O banco é a fonte da verdade de nome, descrição e tipo dos
  `b-*`. Ordenação: VKOS, legados, depois banco por nome.
- `GET /modelos-html/:id/preview`: se o id começa com `b-`, servir do banco central com as
  mesmas injeções de hoje (base, script isolador, troca de `img/capa.png` pelo svg de
  exemplo). Senão, comportamento atual intocado.

### Cópia no uso

Em `POST /api/sessoes` (`app/server/src/sessoes/rotas.ts`), depois da guarda de Cérebro e
antes de `gerenciador.criar`: para cada estilo presente no corpo (`estilo`, `estiloCapa`,
`estiloPaginas`, `estiloCta`), se o id começa com `b-`:

1. Se `templates/carrossel/modelo-<id>.html` já existe no workspace, seguir.
2. Senão, copiar do banco. Banco não tem o id: responder 400 com mensagem clara
   ("Esse modelo não existe mais no banco. Escolha outro.").

Extrair a lógica pra função pura testável (recebe lista de ids, existência local, existência
no banco, devolve o que copiar ou o erro), no espírito de `geracaoBarradaPorCerebro`.
Atenção: hoje o corpo do POST não carrega os estilos separados, eles já chegam dissolvidos
no prompt. Verificar o corpo real em `sessoes/rotas.ts` e `api/cliente.ts`: se os estilos
não chegam ao servidor, adicionar campo opcional `modelosUsados?: string[]` ao corpo,
preenchido pelo front em `dispararGeracao` (AssistenteCriacao e NoSessao) com os ids
escolhidos. Campo opcional: cliente antigo sem o campo continua funcionando (só não dispara
cópia, e só usa modelos locais, comportamento de hoje).

## O tipo no wizard

Em `EtapasCriacao.tsx`, etapa 2 do carrossel:

- Grupo Capa: modelos com tipo `capa` ou `completo`.
- Grupo Páginas de conteúdo: tipo `desenvolvimento` ou `completo`.
- Novo grupo opcional Fecho (CTA): tipo `cta` ou `completo`, com a primeira opção
  "Seguir as páginas" (valor `""`, padrão). Só aparece quando existe ao menos um modelo de
  tipo `cta` na lista, pra não poluir o wizard de quem não usa.
- Post e story (lista única `estilo`): tipos `completo`, `capa` e `desenvolvimento`
  (peça de página única; modelo só de CTA fica de fora).
- Extrair o filtro pra função pura `modelosDoGrupo(modelos, grupo)` num módulo novo
  `app/web/src/componentes/criacao/grupos.ts`, com teste.
- `DadosEtapas` ganha `estiloCta?: string` (opcional, compat com rascunho salvo).
  `dadosCriacaoDe` repassa. `etapasTemPreenchimento` considera.
- `MiniModelo` já funciona pra qualquer id servido pelo preview, incluindo `b-*`. Extrair
  `MiniModelo` para `app/web/src/componentes/comum/MiniModelo.tsx` SEM mudar comportamento
  (o painel de gestão vai reusar). Conferir que a etapa 2 continua idêntica no navegador.

## O tipo no prompt

Em `prompt.ts`:

- `DadosCriacao` ganha `estiloCta?: string` (opcional).
- `contratoModelo`: quando `estiloCta` está vazio ou igual ao de páginas, a saída é
  IDÊNTICA à de hoje, byte a byte (as fixtures `prompt-ligado-*.txt` e
  `prompt-sem-cerebro-*.txt` provam; não regenerar essas fixtures). Quando `estiloCta`
  difere, o contrato ganha as linhas do terceiro modelo: o arquivo do CTA, a instrução de
  transplantar o último slide (fecho/CTA) do arquivo de CTA com CSS escopado, e a
  conferência final citando os três arquivos.
- `baseComando` cita o modelo de CTA quando presente.
- Nova fixture `prompt-cta-carrossel.txt` gerada com script descartável tsx (mesmo método
  usado nas fixtures existentes; apagar o script depois), mais asserções pontuais.

## O painel no CORE

### Onde

Nova área no `ShellGestao.tsx`: id `banco-visual`, rótulo "Banco visual", depois de
"Estúdio". Componente novo `app/web/src/componentes/gestao/BancoVisual.tsx`, estilos em
`app/web/src/estilos/gestao.css` seguindo os tokens dos dois temas.

Recomendação incluída (barata, resolve ambiguidade real): renomear o rótulo da área
existente "Modelos" para "Planos de cliente" (só o texto no array `AREAS`; ids e rotas
intocados). Se o Jesse vetar ao aprovar este plano, pular este item.

### O que tem

- Grade de cartões dos modelos do banco: `MiniModelo` como thumb, nome, tipo (badge),
  descrição, pedeImagem. Ações por cartão: Editar (metadados e substituir HTML), Excluir
  (com confirmação de duas etapas, padrão da casa).
- Botão "Novo modelo" abre o fluxo de criação em passos:
  1. Tipo do modelo (capa, desenvolvimento, CTA, completo), nome, descrição, pedeImagem.
  2. Origem, dois cartões:
     a. "Colar HTML pronto": textarea grande ou upload de `.html`. Validação no servidor,
        erros mostrados no painel. Salvar entra direto no banco.
     b. "Copiar de uma referência": campo de imagem (upload, mesmo `enviarAnexo` do wizard)
        mais um campo opcional de instruções, e o botão "Copiar modelo". Ver fluxo abaixo.
- API client em `app/web/src/api/cliente.ts`: `listarBancoModelos`, `criarBancoModelo`,
  `atualizarBancoModelo`, `excluirBancoModelo`.

### O fluxo "Copiar modelo" (geração por IA)

1. Pré-requisito: um workspace ativo do Estúdio do Jesse (o `workspaceAtivo` de
   `usarEstado`). Sem workspace ativo, o painel explica e oferece ir pro Estúdio.
2. O painel cria uma sessão via `criarSessao` no workspace ativo com:
   - `skill: "modelo-carrossel"` (valor novo; a lista `SKILLS_QUE_EXIGEM_CEREBRO` é
     whitelist, então a guarda de Cérebro não dispara; registrar o valor onde o servidor
     tipa/aceita skill).
   - Prompt novo `montarPromptModelo` em módulo `app/web/src/componentes/gestao/promptModelo.ts`,
     com teste de fixture próprio. O prompt instrui:
     - Ler `templates/carrossel/principios-modelos.md` inteiro e um modelo existente como
       referência de anatomia.
     - Olhar a imagem de referência anexada e REPLICAR o layout, a tipografia, o ritmo e a
       composição dela como um modelo reutilizável, não como uma peça de conteúdo.
     - Produzir `conteudo/<AAAA-MM-DD>-modelo-<slug>/carrossel.html` com os slides do tipo
       pedido: capa gera 1 slide de capa; desenvolvimento gera slides de texto e lista;
       cta gera 1 slide de fecho; completo gera capa, texto, lista e fecho.
     - Slides `.slide` de 1080x1350, CSS embutido, cores e fontes como tokens no `:root`
       pra recoloração (como os `modelo-vkos0X.html` fazem), conteúdo de demonstração
       genérico, sem citar marca nenhuma da referência.
3. O painel acompanha a sessão (mesmo padrão de acompanhamento das gerações atuais) e, ao
   concluir, mostra o preview da peça com três ações:
   - "Abrir no Studio": navega pra `/w/<id>/studio/<pasta>` em aba nova. O Jesse refina no
     editor que já existe, salva (o `PUT /api/vkos/pecas/.../carrossel` atual), volta.
   - "Salvar no banco": chama `POST /admin/banco-modelos` com
     `origemHtml: { modo: "peca", workspaceId, pasta }` e os metadados do passo 1.
   - "Descartar".
4. A peça temporária fica na pasta `conteudo/` do workspace do Jesse. Não apagar
   automaticamente (o Jesse limpa quando quiser; deletar arquivo sem ordem é contra a casa).

## Fases de execução

Executar em ordem. Cada fase termina com os testes da fase passando.

- Fase 1, fundação servidor: `bancoModelos.ts` com CRUD, validação e testes. Rotas
  `/admin/banco-modelos*`. Campos `tipo` e `origem` em `ModeloCarrossel` dos dois lados.
- Fase 2, leitura integrada: união na `GET /api/vkos/modelos-carrossel`, preview `b-*`,
  cópia no uso no `POST /api/sessoes` com `modelosUsados` ponta a ponta
  (cliente.ts, geracao.tsx, AssistenteCriacao.tsx, NoSessao.tsx). Testes: função pura da
  cópia, união com sombra `b-*`, fixtures de prompt intactas.
- Fase 3, tipo no wizard e no prompt: `grupos.ts` com filtro por grupo, grupo Fecho (CTA)
  condicional, `estiloCta` no estado e no contrato do prompt, fixture nova de CTA,
  extração do `MiniModelo` pra `comum/`.
- Fase 4, painel Banco visual: área nova na gestão, grade, CRUD com colar HTML, estilos nos
  dois temas e nas larguras 390, 768 e 1440.
- Fase 5, Copiar modelo por IA: skill `modelo-carrossel`, `promptModelo.ts` com fixture,
  fluxo de sessão no painel, ponte com o Studio, salvar peça no banco.
- Fase 6, verificação e documentação: `npm run testar` completo, typecheck e build nos três
  workspaces, verificação headless (painel de gestão: criar modelo colando HTML de um dos
  da semente como teste, ver na grade; wizard de um cliente: ver o modelo do banco na etapa
  2, gerar com ele e conferir a cópia no workspace), mapas, CONTRATO.md, CHANGELOG.md,
  arquivo de decisão.

## Riscos mapeados

- Nome "modelo" é sobrecarregado no código (modelo de IA, `modelos_workspace` de plano de
  cliente, modelo de carrossel). Todo símbolo novo usa "bancoModelos" ou "BancoVisual" pra
  não colidir.
- O motor remoto: conferir se `POST /api/sessoes` na nuvem roda no processo que tem acesso
  ao filesystem dos workspaces (é onde a cópia no uso acontece). Se a sessão for criada num
  processo sem a pasta do banco, a cópia precisa acontecer na rota HTTP antes do repasse ao
  motor. Investigar `plataforma/motorRemoto.ts` e `sessoesNuvem.ts` na fase 2 antes de codar.
- Rascunhos de wizard salvos antes desta rodada não têm `estiloCta` nem conhecem tipos:
  todos os campos novos são opcionais e o default reproduz o comportamento de hoje.
- Cliente com bundle antigo não manda `modelosUsados`: ele só enxerga modelos locais de
  qualquer forma (a lista nova também vem do servidor), então nada quebra.
