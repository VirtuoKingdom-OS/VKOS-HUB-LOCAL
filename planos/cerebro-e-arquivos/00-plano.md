# Aba Cérebro do Negócio e tela Arquivos

Plano de execução. Escrito para outra IA executar quando o Jesse der o comando.
Antes de qualquer código, leia "Regras da casa" e a fase 0 inteiras.

## O pedido e as decisões travadas com o Jesse (não reabrir)

1. **Aba Cérebro do Negócio**: uma tela nova no workspace com um card por pergunta do
   Cérebro (as seções do `cerebro/cerebro.md`). O cliente edita e salva cada card
   sozinho, sem depender da entrevista.
2. **Tela Arquivos**: unificar a organização de conteúdo. Galerias (criações visuais)
   e Fontes de dados deixam de ser duas entradas soltas e viram duas sub-abas de uma
   tela só chamada Arquivos.
3. Nada disso pode quebrar o sistema. É upgrade de organização e edição, não mudança
   de modelo de dados.

## O princípio que protege a arquitetura (a parte mais importante)

O `cerebro/cerebro.md` é CONTRATO. As skills de IA leem esse arquivo, a guarda de
geração (`cerebroPreenchido`) depende da heurística do marcador ✍️, a clonagem gera o
esqueleto a partir dos títulos dele, e a entrevista `/instalar` escreve nele. Portanto:

- O arquivo markdown continua sendo a única fonte da verdade. Os cards são uma VISTA
  de edição, não um armazenamento novo. Nada de JSON paralelo, nada de banco.
- Editar um card altera SOMENTE o corpo daquela seção. Todo o resto do arquivo
  (preâmbulo, títulos, espaçamento, as outras seções) fica byte a byte idêntico.
  Um teste de ida e volta prova isso.
- Card salvo vazio restaura o marcador ✍️ naquela seção. Assim a heurística de
  preenchido continua honesta: seção sem conteúdo conta como em branco.
- A gravação passa pela `gravarCerebro` existente (atômica, backup único por boot,
  limite de 512 KB, evento `cerebro:atualizado` no WebSocket). Nenhum caminho novo de
  escrita no disco.

Do lado dos Arquivos: os dados de peças (`conteudo/`) e de fontes (contextos) não
mudam NADA. A mudança é só navegação e apresentação.

## Regras da casa (inegociáveis)

- NUNCA fazer commit, push ou PR. Sem exceção.
- Português brasileiro. NUNCA usar o travessão "—" nem o caractere "·". Frase curta.
- Toda interface funciona nos dois temas e nas larguras 390, 768 e 1440 px, com os
  tokens e a camada comum de `app/web/src/componentes/comum/`.
- Ao final: atualizar `interno/mapa-sistema.json` e `interno/mapa-telas.json` (há
  teste que valida), `app/CONTRATO.md`, `CHANGELOG.md`, e criar
  `decisoes/AAAA-MM-DD-cerebro-e-arquivos.md` (contexto, decisão, por quê).
- Rodar `npm run testar`, typecheck e build nos três workspaces, mais verificação
  headless com playwright-core no padrão dos scripts do scratchpad.

## Fase 0: leitura obrigatória antes de codar

- `app/server/src/vkos/cerebro.ts`: leitura, heurística do ✍️ e `gravarCerebro`.
- `vkos2/cerebro/cerebro.md`: a anatomia real. Um título `#` com preâmbulo e 13
  seções `##` numeradas. O parser precisa aceitar qualquer quantidade de seções,
  porque cliente antigo pode ter Cérebro com estrutura diferente.
- `app/server/src/vkos/rotas.ts`: `GET/PUT /api/vkos/cerebro` e o padrão de rota.
- `app/server/src/workspaces/clonagem.ts` (função `esqueletoCerebro`): como os
  títulos viram esqueleto. O parser novo deve conviver com esse formato.
- `app/web/src/componentes/cockpit/CerimoniaCerebro.tsx`: a entrevista guiada. Ela
  continua existindo; a tela nova aponta pra ela como caminho recomendado do zero.
- `app/web/src/componentes/telas/`: `TelaGalerias.tsx`, `TelaFluxo.tsx`,
  `TelaFontes.tsx`, `TelaFonte.tsx`, `fluxos.ts`, `fontes.ts`. O que vira sub-aba e o
  que continua tela profunda.
- `app/web/src/componentes/layout/rotas.ts` (TELAS_FIXAS, telaParaCaminho,
  caminhoParaTela e os testes em `rotas.test.ts`), `permissoes.ts` (featureDaTela,
  telaPermitida, FEATURES_COM_TELA) e `Sidebar.tsx` (grupos e contagens).
- `app/server/src/features/catalogo.ts`: as telas declaradas por feature.
- `interno/mapa-telas.json`: as entradas de galerias, fontes, fonte e fluxo.

## Parte A: a aba Cérebro do Negócio

### Servidor: seções como vista do markdown

Módulo novo `app/server/src/vkos/cerebroSecoes.ts`, funções puras e testadas:

- `dividirSecoes(texto)`: devolve `{ preambulo, secoes }` onde cada seção é
  `{ indice, titulo, corpo, preenchida }`. Seção começa em cada linha `## `. O
  preâmbulo é tudo antes da primeira `## ` (o título `#` e a introdução).
  `preenchida` é `!corpo.includes("✍️") && corpo.trim() !== ""`.
- `substituirSecao(texto, indice, corpoNovo)`: devolve o markdown inteiro com só
  aquele corpo trocado. Corpo vazio ou só espaço vira o marcador ✍️. Preserva o
  título da seção e o restante do arquivo byte a byte.
- Teste de ida e volta: `substituirSecao(texto, i, corpoAtual)` devolve o texto
  ORIGINAL byte a byte, pra todo i, no Cérebro da semente e num Cérebro torto de
  fixture (sem preâmbulo, com `###` internos no corpo, com CRLF). `###` dentro de um
  corpo NÃO abre seção nova: só `## ` no início de linha conta.

Rotas novas em `vkos/rotas.ts`, ao lado das de Cérebro existentes:

- `GET /api/vkos/cerebro/secoes`: `{ preambulo, secoes, atualizadoEm }`. Sem
  arquivo: 404 (a tela trata oferecendo a entrevista).
- `PUT /api/vkos/cerebro/secoes/:indice` corpo `{ corpo }`: relê o arquivo do disco
  na hora (nunca confia num estado em memória), aplica `substituirSecao`, grava com
  `gravarCerebro` e transmite `cerebro:atualizado` (mesmo comportamento do PUT
  inteiro). Índice fora da faixa: 404. Resposta: as seções novas mais `atualizadoEm`.
- O `PUT /api/vkos/cerebro` (texto inteiro) continua intacto, por compatibilidade.

### A tela

`app/web/src/componentes/cerebro/TelaCerebro.tsx`, tela fixa `cerebro`:

- Raiz `tela-fluxo` (o contêiner padrão que cobre o canvas; a Meta ensinou).
- Cabeçalho com o progresso: "X de N seções preenchidas" e uma barra sutil.
- Um card por seção: título, corpo renderizado como texto simples com quebras,
  badge "Em branco" quando não preenchida. Clique em Editar abre textarea inline no
  próprio card com Salvar e Cancelar (Ctrl+Enter salva). Só um card em edição por
  vez; trocar de card com texto sujo pede confirmação.
- Estado sem Cérebro (404) ou todo em branco: destaque pra entrevista guiada
  ("Montar pelo assistente, uns 10 minutos") navegando pro cockpit, mais o caminho
  manual card a card. A entrevista continua sendo o caminho recomendado do zero; os
  cards brilham pra AJUSTAR depois.
- WebSocket `cerebro:atualizado`: se nenhum card está em edição, recarrega na hora
  (a entrevista ou uma sessão de IA pode ter escrito). Com card em edição, mostra um
  aviso discreto "O Cérebro mudou por fora, salve ou recarregue" em vez de destruir
  o texto do usuário.
- Preâmbulo não é editável na v1 (é apresentação, não pergunta).
- Estilos novos em `app/web/src/estilos/cerebro.css`, dois temas, três larguras.

### Encaixe de navegação e feature

- `TELAS_FIXAS` ganha `cerebro`; rota `/cerebro`.
- A tela pertence à feature `cockpit` (o núcleo, onde o Cérebro já vive):
  `featureDaTela("cerebro")` devolve `"cockpit"`, e a tela `cerebro` entra no array
  `telas` da feature cockpit no catálogo.
- Sidebar: item "Cérebro" logo abaixo do Cockpit, com um ponto de atenção quando o
  Cérebro está em branco. O nó do Cérebro no canvas do cockpit continua como está.

## Parte B: a tela Arquivos

### O desenho

Tela fixa nova `arquivos`, com duas sub-abas:

- **Criações**: o conteúdo atual da TelaGalerias (galerias por tipo, mais o site).
  Entrar numa galeria continua abrindo a tela profunda `fluxo:<tipo>` de hoje.
- **Fontes de dados**: o conteúdo atual da TelaFontes. Entrar numa fonte continua
  abrindo a tela profunda `fonte:<id>` de hoje.

Reaproveitar os componentes existentes: extrair o miolo de TelaGalerias e TelaFontes
em painéis (`PainelCriacoes`, `PainelFontes`) e a TelaArquivos monta as sub-abas com
eles. As telas profundas (TelaFluxo, TelaFonte) não mudam por dentro; só o "Voltar"
delas passa a apontar pra `arquivos` na sub-aba certa.

### Compatibilidade de rota (nada quebra)

- Ids novos: `arquivos` (sub-aba Criações) e `arquivos:fontes`. Caminhos `/arquivos`
  e `/arquivos/fontes`.
- Os ids e caminhos antigos continuam sendo aceitos e REDIRECIONAM:
  `caminhoParaTela("/galerias")` devolve `arquivos`; `caminhoParaTela("/fontes")`
  devolve `arquivos:fontes`. Link salvo, atalho de teclado ou aba antiga cai no
  lugar certo. Atualizar `rotas.test.ts` cobrindo os redirecionamentos.
- Navegações programáticas para `galerias` e `fontes` (AssistenteCriacao, Shell,
  Sidebar, TelaFonte, TelaMapaTelas) passam a usar os ids novos.
- `fluxo:` e `fonte:` continuam ids válidos, intactos.

### Permissões e features

Hoje Galerias pertence a `criador-visual` e Fontes a `cockpit`. A tela unificada
respeita as duas:

- `telaPermitida("arquivos")`: verdadeiro se o workspace tem `criador-visual` OU
  `cockpit`. `telaPermitida("arquivos:fontes")` exige `cockpit`.
- Dentro da tela, a sub-aba Criações só aparece com `criador-visual` e a sub-aba
  Fontes só com `cockpit`. Com uma feature só, a tela abre direto na sub-aba única,
  sem abas visíveis.
- No catálogo, `arquivos` entra no array `telas` das DUAS features (o catálogo já
  suporta tela repetida entre features: o CRM e o leads compartilham `crm`).
- Testes novos em `permissoes.test.ts` pros três cenários (só criador-visual, só
  cockpit, as duas).

### Sidebar

Os itens Galerias e Fontes de dados saem; entra "Arquivos" com a contagem somada
(peças mais arquivos de fontes), visível quando qualquer uma das duas features está
ligada. O grupo "Conteúdo" da sidebar simplifica de acordo. Nenhuma outra entrada
muda de lugar.

## O que explicitamente NÃO muda (guardas do plano)

- `cerebro/cerebro.md`, as skills, a guarda de geração e a entrevista: intactos.
- Modelo de dados de peças e contextos, rotas `/api/vkos/pecas`, `/api/contextos`:
  intactos.
- Telas profundas `fluxo:` e `fonte:` e o Studio: intactos por dentro.
- O nó do Cérebro no cockpit e a cerimônia: intactos.
- Nenhuma migração de dados. Nenhum arquivo novo dentro dos workspaces.

## Fases de execução

Cada fase termina com os testes dela passando.

- **Fase 1, seções no servidor:** `cerebroSecoes.ts` com os testes de ida e volta e
  de Cérebro torto; rotas GET e PUT de seções; teste de rota.
- **Fase 2, TelaCerebro:** tela, cards, edição inline, progresso, estados vazios,
  WebSocket, css, item na sidebar, feature e permissões, mapa de telas.
- **Fase 3, Arquivos:** painéis extraídos, TelaArquivos com sub-abas, redirecionos de
  rota com testes, permissões com testes, sidebar, navegações programáticas
  atualizadas, mapa de telas.
- **Fase 4, verificação e docs:** suíte completa, typecheck, build, headless (editar
  um card e ver o markdown refletir; navegar `/galerias` e cair em Arquivos; sub-abas
  por feature; dois temas; 390 px sem estouro), CONTRATO, CHANGELOG, decisão.

## Riscos mapeados

- **Cérebro com estrutura fora do padrão** (cliente antigo, arquivo editado na mão):
  o parser é tolerante por construção e o teste de fixture torta prova. No pior caso
  (arquivo sem nenhuma `## `), a tela mostra o conteúdo como um card único "Conteúdo
  do Cérebro" editável por inteiro, nunca uma tela quebrada.
- **Conflito de escrita** (card salvo enquanto a entrevista grava): o PUT de seção
  relê o arquivo do disco antes de aplicar, então só a seção editada muda sobre o
  estado mais novo. A janela restante é o aviso de mudança externa na tela.
- **Link antigo pra Galerias ou Fontes**: redireciona, testado.
- **Workspace só com CRM (sem cockpit nem criador-visual)**: Arquivos e Cérebro não
  aparecem, e as rotas respondem como as features desligadas de hoje (o gate do
  catálogo já cobre).
