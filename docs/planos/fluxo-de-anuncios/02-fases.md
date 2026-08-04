# Fluxo de anúncios: as fases

> **Este arquivo é o ponto de retomada.** Se o crédito de uma sessão acabou,
> outra IA abre aqui, olha a tabela de estado, e continua da primeira fase que
> não estiver `FEITA`. Antes disso lê `00-visao.md` e `01-arquitetura.md`.
>
> Regra da casa: **quem termina uma fase marca ela na tabela abaixo, na mesma
> tarefa.** Fase que ficou verde e não foi marcada some da memória do projeto.

## Estado

| Fase | O que entrega | Estado |
| --- | --- | --- |
| 1 | O contrato da peça no servidor | FEITA |
| 2 | O fluxo de criação, do assistente ao arquivo | FEITA |
| 3 | A página de blocos, só leitura | FEITA |
| 4 | A conversa que continua | FEITA |
| 5 | O laço de conformidade | FEITA |
| 6 | Mapa, decisão, contexto e conferência visual | FEITA |

## O portão, igual em toda fase

Nenhuma fase fecha sem os três verdes:

```bash
cd app
npm run checar -w server && npm run checar -w web
npm run testar -w server && npm run testar -w web
npm run build -w web
```

Fase que mexe em estilo, navegação ou cria tela roda também a conferência
visual, nos dois temas, com dados descartáveis:

```bash
# de uma janela
cd app
VKOS_DADOS_TESTE=/tmp/dados-de-teste VKOS_PORT=4702 npx tsx server/src/index.ts

# de outra
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
node ferramentas/olhar-telas.mjs --porta 4702 --tema escuro --saida ./fotos-escuro
```

**Nunca rodar teste contra os dados reais.** `VKOS_DADOS_TESTE` e `VKOS_PORT`
sempre. A porta 4600 e a 5173 são do Jesse e ficam intocadas.

**Nenhum commit sem ordem explícita do Jesse.** Sem exceção.

---

## Fase 1: o contrato da peça no servidor

Sem interface. Termina com o servidor sabendo o que é uma peça de anúncio.

**Arquivos novos**

- `app/server/src/anuncios/modelo.ts`, tipos e schema Zod. Valida forma, nunca
  tamanho de texto (o porquê está em `01-arquitetura.md`, seção 2).
- `app/server/src/anuncios/limites.ts`, os limites do Google numa constante só,
  com a data, mais `conferirLimites(peca): Violacao[]`, pura.
- `app/server/src/anuncios/armazenamento.ts`, ler e gravar com gravação atômica
  e backup, no padrão de `vkos/paginaSite.ts`. Respeita `VKOS_DADOS_TESTE`.
- `app/server/src/anuncios/rotas.ts`, plugin Fastify.
- Testes ao lado: `modelo.test.ts` e `limites.test.ts`.

**Arquivos tocados**

- `app/server/src/tipos.ts` e `app/web/src/tipos/dominio.ts`: `TipoPeca` ganha
  `"anuncio"`. Os dois `ROTULO_TIPO` do web são exaustivos e vão acusar.
- `app/server/src/vkos/pecas.ts`: `classificarPeca` reconhece `anuncio.json`
  **antes** das regras de `.html` e `.md`; `montarPeca` aceita peça sem preview.
- `app/server/src/index.ts`: registra o plugin.

**Rotas**

- `GET /api/anuncios/:pasta` devolve `{ peca, violacoes }`, 404 sem arquivo,
  422 com forma inválida e o erro do Zod legível.
- `PUT /api/anuncios/:pasta` grava uma peça válida.

Reusar a barreira de pasta que já existe em `vkos/rotas.ts` (`resolverPeca`).
Se ela não estiver exportada, extrair para um lugar comum em vez de escrever
uma segunda versão.

**Pronto quando**

- Um `anuncio.json` escrito à mão numa pasta de `conteudo/` aparece na lista de
  peças com `tipo: "anuncio"`, e não como `texto` nem `site`.
- `GET` devolve a peça mais a lista de violações, com `caminho` endereçável.
- Um JSON com `titulos` string em vez de lista responde 422 dizendo o campo.
- Um título de 34 caracteres **não** impede a leitura: vira violação `erro`.

---

## Fase 2: o fluxo de criação

Do botão ao `anuncio.json` gravado por uma IA de verdade.

### A medição do confinamento: FEITA, e passou

Rodada em 2026-07-31, duas gerações reais com Codex, num VKOS copiado para fora
do repositório, servidor isolado na 4714. **O plano B NÃO está em uso.**

O que ficou provado:

- Sessão com `cwd` na pasta da peça gera normalmente, com o `SKILL.md` embutido
  no prompt. A resolução de `.claude/skills/` por caminho nunca foi exercida.
- O `anuncio.json` passou no schema **na primeira tentativa, nas duas rodadas**,
  com zero violação de limite. O contrato escrito no prompt é o que faz a IA
  respeitar 30 e 90 caracteres: ela precisa saber o limite para respeitar, não
  só para ser reprovada depois.
- O Cérebro ficou byte a byte idêntico e nada nasceu fora da pasta da peça.
- O detalhe livre do dono foi honrado: "não quero aparecer para quem procura
  curso de fotografia" virou as negativas curso, aula, workshop, tutorial.

Dois defeitos de QUALIDADE que o schema não pegava, achados na primeira rodada e
consertados no `anuncios/prompt.ts`:

1. **A campanha inteira saiu sem acento** ("orcamento", "bebe", "album"). Passa
   no schema e o Google publica exatamente assim. Regra nova, e a segunda
   rodada saiu com 171 caracteres acentuados.
2. **Saiu um grupo de anúncios só.** Regra nova pedindo de 2 a 4, um por
   intenção de busca, e a segunda rodada saiu com três: serviço, preço e local.

### O buraco do Cockpit, achado em uso real

O Jesse gerou pelo **nó de sessão do Cockpit**, não pelo assistente, e levou
`400 A geração de anúncio precisa da pasta de destino`. O compositor do canvas
manda o comando cru da skill, sem pasta alvo, e a pasta é o diretório de
trabalho da sessão.

A primeira tentativa de conserto tratou só metade: `Fluxo` ganhou
`abreAssistente` e `criarNoFluxo`, no `Cockpit.tsx`, passou a navegar em vez de
criar nó. Isso fecha a porta de entrada e **não fecha o nó que já está salvo no
`canvas.json`**, que continua sendo montado a cada abertura. Era exatamente o
caso dele.

A guarda definitiva mora no `NoSessao.tsx`, no ponto onde o nó é renderizado:
fluxo com `abreAssistente` não desenha compositor nenhum, desenha um cartão que
explica e um botão que abre o assistente. Provado no canvas real do Jesse: 1
cartão de desvio, 1 botão, **0 compositores**.

A lição, para a próxima porta: **guarda na criação protege o futuro, guarda na
renderização protege o que já existe.** Estado salvo em disco sobrevive à
correção que só olha para a entrada.

Uma observação sem ação, para quem seguir: o Codex cria as pastas vazias `.git`
e `.agents` no diretório de trabalho. As duas nascem vazias, não são repositório
de verdade, e não mudam a classificação da peça. Fazer o Hub apagar pasta que
ele não criou é mais arriscado que o ruído, então ficou como está.

**Arquivos novos**

- `app/web/src/componentes/criacao/promptAnuncio.ts` mais `promptAnuncio.test.ts`.
  O teste afirma o conteúdo injetado (contrato do JSON, limites, pasta alvo),
  não só o entorno. Teste que passaria com a injeção apagada não é teste.
- `app/web/src/componentes/criacao/EtapasAnuncio.tsx`.

**Arquivos tocados**

- `AssistenteCriacao.tsx`: **refatorar o desvio de `site` para uma tabela única
  sobre `TipoGeracao`** antes de acrescentar o terceiro tipo. São cinco lugares
  com ternário binário hoje.
- `estado/geracao.tsx`: `TipoGeracao`, `FASES_ANUNCIO`, `fasesDoTipo`,
  `pecaPronta`, o fallback dos 10 segundos.
- `layout/rotas.ts` e `rotas.test.ts`: `TIPOS_CRIACAO`, `destinoAposCriacao`,
  `irParaPeca`.
- `GeracaoFlutuante.tsx`: rótulo e botão de saída.
- `config/fluxos.ts` e `workspace/TelaWorkspace.tsx`: as portas de entrada.
- `sessoes/rotas.ts`: `SKILLS_QUE_EXIGEM_CEREBRO` ganha `"anuncio"`. A
  `resolverPastaAlvoGeracaoSite` NÃO é generalizada: no anúncio a `pastaAlvo`
  vem no corpo e é validada por `resolverPeca`. Ver seção 3, ponto 6.
- `sessoes/conformidade-site.ts`: `SKILLS_COM_CONFERENCIA` ganha `"anuncio"`,
  senão o gerenciador descarta a `pastaAlvo`.
- O servidor cria a pasta da peça antes de disparar e usa ela como `cwd`.

Nesta fase o flutuante ainda leva para a galeria, porque a tela da Fase 3 não
existe. O destino definitivo entra junto com ela.

**Pronto quando**

- `/criar/anuncio` abre, responde e dispara.
- Uma sessão real grava um `anuncio.json` que passa no schema da Fase 1.
- Cérebro vazio bloqueia com 409, como no carrossel.
- Gerar anúncio com um carrossel na fila responde 409 pela trava, e o
  flutuante não se confunde.

---

## Fase 3: a página de blocos, só leitura

**Arquivos novos**

- `app/web/src/componentes/anuncios/TelaAnuncio.tsx` e `anuncios.css`.
- Os nove blocos. Cada campo de texto do Google com contador e botão de copiar.

**Arquivos tocados**

- `layout/rotas.ts` e `rotas.test.ts`: rota `/anuncio/<pasta>`, ida e volta.
- `layout/Shell.tsx`: import dinâmico, parâmetro, cadeia de `telaAtiva`.
- `GeracaoFlutuante.tsx`: o botão passa a levar para a tela.
- `ferramentas/olhar-telas.mjs`: entrada nova no array `TELAS`.

Obrigações de fundação estão na seção 5 de `01-arquitetura.md`. As duas que mais
costumam ser quebradas em tela densa: bloco é seção e não cartão, e cartão
dentro de cartão nunca é certo.

**Pronto quando**

- A peça da Fase 2 aparece inteira, os nove blocos.
- Título estourado aparece em alerta com a contagem, e o botão de copiar
  entrega o texto exato.
- Conferência visual passa nos dois temas e nos três tamanhos, com atenção ao
  1280x720.
- Peça ausente ou inválida mostra estado honesto, nunca tela em branco.

### O que ficou decidido na tela, e por quê

Registrado em 2026-07-31, quando a fase fechou. A decisão de `docs/decisoes/` é
da Fase 6; isto aqui é o material dela.

- **A contagem tem duas vozes, não uma.** Dentro do limite ela é um número
  quieto em `--texto-fraco` ("21/30"); acima do limite ela vira `.selo-alerta` e
  a linha inteira ganha fundo de alerta. Numa página com quarenta e cinco linhas
  de campo, pílula em toda linha viraria ruído e o defeito sumiria no meio. O
  menta não aparece em lugar nenhum da tela: nada aqui está vivo.
- **A tela não recalcula limite, mas ela precisa do número pra escrever "/30".**
  Quem diz que um campo estourou continua sendo a lista de violações do
  servidor, casada pelo `caminho`. O "/30" sai de `MAX_CARACTERES`, em
  `web/src/tipos/anuncios.ts`, cujo TIPO é derivado do `LIMITES_GOOGLE` do
  servidor: trocar 30 por 32 lá e esquecer aqui quebra o `npm run checar -w web`.
- **Copiar palavra-chave sai na sintaxe do Google:** `[exata]`, `"frase"` e
  ampla sem sinal, uma por linha, porque é assim que o painel aceita colar o
  grupo inteiro de uma vez. Copiar só o texto perderia a correspondência que a
  IA escolheu.
- **O retorno do copiar mora num lugar só**, uma linha flutuante no rodapé com
  `role="status"`. Quarenta campos com quarenta avisos próprios seriam quarenta
  regiões vivas competindo pela fala do leitor de tela. Ela também é o canal do
  erro quando o navegador recusa a área de transferência.
- **O índice dos nove blocos é barra horizontal ancorada**, com marca de onde a
  pessoa está (medida na rolagem). Terceira coluna não cabe em 1280x720, e
  índice sem estado seria uma barra de abas que mente.
- **A segunda coluna do grid já existe e mede zero.** A conversa da Fase 4 entra
  nela sem a coluna de blocos mudar de largura, e nesta fase não há placeholder
  nenhum ocupando espaço.
- **Correspondência de palavra-chave não é selo, é texto.** Vinte e uma pílulas
  numa coluna de tabela é decoração, e selo diz estado. O tipo da conversão
  continua selo: é um por conversão.
- **A ação principal é "Abrir o Google Ads"**, um link para o painel em outra
  aba. Numa tela só de leitura, a próxima ação do dono é colar isto lá.

**Divergências do escopo declarado, com o motivo**

1. **Duas portas de entrada a mais**, fora da lista de arquivos tocados:
   `workspace/TelaWorkspace.tsx` (`abrirPeca`) e `pecas/CartaoPeca.tsx` mais
   `telas/TelaFluxo.tsx`. Sem elas a tela só era alcançável no instante em que a
   geração terminava: o card de recentes mandava o anúncio pras Galerias, que só
   mostram peça de imagem, e a tela de fluxo por tipo não tinha botão nenhum. A
   prop `aoAbrirSite` do `CartaoPeca` virou `aoAbrir`, porque o destino é do tipo
   da peça e quem decide é quem passa a prop.
2. **`ferramentas/olhar-telas.mjs` resolve a pasta do anúncio contra o servidor**
   antes de percorrer as telas, em vez de carregar um nome de pasta escrito na
   mão. Nome de peça muda em cada instalação; sem peça de anúncio a entrada mede
   o estado honesto da tela, que também precisa abrir sem erro.
3. **O mapa (`interno/mapa-sistema.json` e `mapa-telas.json`) não foi tocado.**
   Ele é item declarado da Fase 6, e dividir a mesma edição em duas fases só
   criaria conflito.

**O que ficou medido e não resolvido**

Abaixo de 720px de viewport a barra de topo não cabe: com a barra lateral de
240px sobram 102px de conteúdo, e o selo de conferência mais a ação principal
transbordam. As telas `/inicio` e `/crm` já rolam na horizontal nesse tamanho
hoje, e o piso declarado da conferência é 1280x720, onde esta tela passa limpa.
Não foi inventado layout de celular para um cockpit de mesa.

---

## Fase 4: a conversa que continua

**Arquivos novos**

- `app/web/src/componentes/comum/usarConversaSessao.ts`, o hook, mais teste da
  parte pura (soma de transcrição com fatia de stream).
- `app/web/src/componentes/comum/Conversa.tsx`, apresentação pura.
- `app/web/src/componentes/comum/conversaIa.css`, classes `.conversa-ia-*`, sem
  qualificar por ancestral.
- `app/server/src/anuncios/vinculo.ts` mais teste.

**Arquivos tocados**

- `anuncios/rotas.ts`: `GET` e `PUT /api/anuncios/:pasta/conversa`.
- `TelaAnuncio.tsx`: o `aside` com a conversa, colapsável, e a recarga ao ouvir
  `pecas:atualizadas`.
- `app/web/src/api/cliente.ts`: as funções novas.

`ChatIde`, `CerimoniaCerebro` e `NoSessao` **não são tocados**.

**Pronto quando**

- "Troca os títulos do grupo 2 por ângulo de urgência" muda o arquivo e a tela
  atualiza sozinha, sem recarregar a página e sem botão.
- Sair da tela e voltar reencontra a mesma conversa, com histórico.
- Sessão morta é dita na cara, com a opção de abrir outra confinada na mesma
  pasta e o `anuncio.json` atual embutido.
- A sessão retomada não consegue escrever fora da pasta da peça.

### A prova com IA real: FEITA, e o `--resume` funciona confinado

Rodada em 2026-07-31, uma sessão de Codex só, dois turnos, num VKOS copiado para
fora do repositório, servidor isolado na 4717 com `VKOS_DADOS_TESTE`.

**Turno 1**, a sessão nova confinada na pasta da campanha
`2026-07-31-anuncio-newborn-v2`, com o pedido "Troca os titulos do grupo 2 por
angulo de urgencia". Os nove títulos do grupo `preco-orcamento` saíram de
"Ensaio Newborn Preço", "Valor do Newborn em BH" e companhia para "Agenda de
Hoje", "Últimas Vagas Newborn", "Feche Sua Sessão Agora". Os grupos 1 e 3
ficaram byte a byte iguais.

**Turno 2, e é ele que prova o `--resume`**: `POST /api/sessoes/:id/mensagem`
com "Agora troca so o primeiro titulo do grupo 2 por: Ultimas Vagas de Hoje". A
sessão retomou com o `cwd` na subpasta, entendeu "o grupo 2" sem eu repetir
qual, e trocou exatamente um título. **A dúvida que abriu esta fase, se o
`--resume` resolve com o diretório de trabalho numa subpasta de `conteudo/`,
está respondida: resolve.**

O que mais ficou medido:

- **Confinamento, conferido por `find` no VKOS inteiro:** o único arquivo tocado
  nos dois turnos foi `conteudo/2026-07-31-anuncio-newborn-v2/anuncio.json`. O
  `cerebro/cerebro.md` continua com o mesmo md5 de antes da sessão.
- **A tela atualiza sozinha:** com a página aberta e parada, uma escrita externa
  no `anuncio.json` apareceu na tela em menos de 15 segundos, com uma única
  entrada de navegação no `performance` da aba. Sem recarregar, sem botão.
- **Sair e voltar:** navegar para `/inicio` e voltar reencontrou os quatro
  turnos, com o primeiro sendo o pedido do dono.
- **Sessão morta:** vínculo apontado para um id que não existe faz a tela dizer
  na cara, em faixa de alerta, com o campo DESLIGADO até a pessoa clicar em
  "Começar outra conversa". Não existe estado em que ela finge continuar.
- **O vínculo é gravado pelo servidor:** criar uma sessão de anúncio e matá-la
  em seguida deixa a entrada em `app/dados/workspaces/<id>/anuncios.json` do
  mesmo jeito. Fechar o navegador no meio da geração não perde a conversa.

**Um defeito de qualidade achado na prova, e consertado**

A transcrição mostrava o prompt COSTURADO como a primeira fala do dono: Cérebro
inteiro, `SKILL.md` e contrato do JSON, milhares de palavras de máquina que ele
nunca escreveu, enterrando a resposta da IA. `gerenciador.criar` ganhou
`promptVisivel`, e a rota passa o pedido cru do dono. O provedor continua
recebendo o prompt completo; muda só o que a transcrição guarda.

**Divergências do escopo declarado, com o motivo**

1. **Uma skill nova, `conversa-anuncio`**, em `sessoes/geracao-anuncio.ts`, ao
   lado da `anuncio`. É por ela que a sessão de resgate nasce confinada na mesma
   pasta, pela mesma barreira `resolverPeca`, com o `anuncio.json` atual
   embutido e sem criar peça nenhuma. O plano pedia para reusar a Fase 2 em vez
   de escrever outro caminho: reusar exigia um rótulo próprio, porque
   `prepararGeracaoAnuncio` monta um prompt que manda gerar do zero. Ela fica
   FORA de `SKILLS_QUE_EXIGEM_CEREBRO`: um chat não pode ser barrado pela trava
   de uma criação guiada em andamento.
2. **O Cérebro vai embutido também na sessão de resgate**, além do
   `anuncio.json`. A sessão está confinada e não alcança `cerebro/cerebro.md`, e
   reescrever título sem a voz do negócio entregaria menos do que a conversa que
   morreu.
3. **`estado/contexto.tsx` ganhou `avisoPecas`**, um contador que sobe a cada
   `pecas:atualizadas`. A lista `pecas` não serve de sinal: o conteúdo DENTRO de
   uma peça muda sem a lista mudar de forma. É o mesmo padrão de `avisoCrm` e
   `avisoMensagens`, que já existem por ali.
4. **`anuncios/rotas.test.ts`, arquivo de teste fora da lista.** As duas rotas
   novas mexem no registro em `app/dados` e passam pela barreira de pasta. Rota
   nova sem teste é dívida silenciosa.
5. **Dois consertos de layout na tela da Fase 3**, causados pela coluna de
   leitura encolher 360px: o botão de copiar ao lado de uma URL comprida virava
   um alvo de 20px, abaixo dos 24px do critério 2.5.8 do WCAG 2.2, e agora não
   cede largura. Achado pela conferência visual, não pelo olho.
6. **O mapa (`interno/mapa-sistema.json` e `mapa-telas.json`) não foi tocado**,
   pelo mesmo motivo da Fase 3: ele é item declarado da Fase 6.

**A dívida que esta fase declara**

`ChatIde`, `CerimoniaCerebro` e `NoSessao` continuam com as três cópias
divergentes da soma de transcrição com stream. O hook novo nasceu usado por uma
tela só, de propósito. A quarta escrita tem uma regra que as três não têm:
marca maior que o stream significa stream RECOMEÇADO, e a fatia passa a ser o
stream inteiro. Sem ela, `slice` com base maior que o tamanho devolve string
vazia e o painel fica mudo enquanto a IA responde, sem erro nenhum aparecer. A
Fase 6 registra isto na decisão.

---

## Fase 5: o laço de conformidade

**Arquivos**

- `app/server/src/anuncios/conformidade.ts`, espelho de
  `sessoes/conformidade-site.ts`, máximo 2 voltas, mais teste.
- Ligação no `gerenciador.ts`, onde o laço do site já se liga.

Forma inválida ou arquivo ausente retoma a sessão com o erro literal do Zod.
Violação de limite de caractere **não** dispara o laço.

**Pronto quando**

- Um JSON propositalmente quebrado é consertado na segunda volta, provado por
  teste.
- Depois de 2 voltas sem sucesso, a geração falha dizendo a verdade, e a peça
  parcial não é apresentada como pronta.

### O que ficou decidido no laço, e por quê

Registrado em 2026-07-31, quando a fase fechou. Material para a decisão da Fase 6.

- **O buraco da peça quebrada foi fechado no SERVIDOR, não no critério do
  frontend.** `classificarPeca` continua chamando a peça de anúncio só pelo nome
  do arquivo, e isso é o certo: campanha com forma quebrada continua sendo
  campanha, e mandá-la para `texto` faria a tela do anúncio nunca abrir justo no
  caso em que o dono precisa ver o problema. O que mudou é que a peça passou a
  CARREGAR o veredito: `peca.anuncio = { valido, erro }`, calculado em
  `montarPeca` por `diagnosticarAnuncio`, no espelho exato do `peca.site` que a
  peça de site já carrega. A escolha foi essa por três motivos: o veredito vale
  em todo consumidor (galeria, cartão de peça, tela de fluxo, workspace) e não
  só na janela da geração; ele sobrevive à sessão ser removida ou o Hub
  reiniciar, coisa que estado de sessão não faz; e o erro literal do schema já
  chega junto, então a mensagem honesta da falha não precisou de campo novo em
  lugar nenhum. O frontend só lê: `pecaEstaPronta` exige `anuncio.valido`.
- **O laço do anúncio reusa o campo `conferenciaSite` da sessão.** São os mesmos
  quatro estados, o mesmo teto e o mesmo caminho de WS. Renomear o campo custaria
  migração de dado persistido para ganhar só a palavra certa. O que ganhou nome
  próprio foi o RÓTULO: sem isso o flutuante diria "Conferindo o site" enquanto o
  Hub confere uma campanha de Google Ads.
- **A exclusão mútua virou uma função só, `lacoDaSessao`**, em `gerenciador.ts`.
  Dois `if` soltos no `aoFechar` não eram afirmáveis por teste. Ela também guarda
  o custo: sessão de anúncio nunca chega a ler disco para perguntar se a pasta é
  um site, e o teste afirma isso contando as consultas.
- **Violação de limite de caractere não dispara volta, e a regra está escrita em
  três lugares:** no comentário de cabeçalho de `anuncios/conformidade.ts`, na
  última linha do prompt de correção (para a IA não reescrever título bom
  enquanto conserta a forma) e num teste que primeiro prova, com
  `conferirLimites`, que a peça do teste realmente viola limite.
- **O laço do anúncio para também quando a sessão morreu (`status: "erro"`)**, e
  não só quando o dono parou. O laço do site checa apenas `"parada"`; a diferença
  é do módulo novo e está comentada nele. Insistir em retomar uma conversa que
  acabou é o jeito mais fácil de deixar a conferência girando.

**Divergências do escopo declarado, com o motivo**

1. **Quatro arquivos tocados fora da lista da fase**, todos consequência do
   buraco da peça quebrada: `vkos/pecas.ts` e `tipos.ts` (o veredito na peça),
   `tipos/dominio.ts` e `estado/geracao.tsx` (o critério de pronto e a falha
   honesta), mais `GeracaoFlutuante.tsx` e `AssistenteCriacao.tsx`, que passaram
   a mostrar o erro literal em vez de "a sessão parou antes de terminar", que
   seria mentira: a sessão terminou, o arquivo é que não presta.
2. **Dois critérios do frontend viraram função pura exportada**
   (`pecaEstaPronta` e `erroDaCampanha`). O defeito que esta fase fechou morava
   dentro de um `useMemo`, onde nenhum teste alcançava, e é assim que ele voltaria.
3. **Um teste novo em `vkos/pecas.anuncio.test.ts`**, fora da lista. Sem ele,
   apagar a linha do veredito em `montarPeca` não reprovava nada, e o buraco
   voltava em silêncio.
4. **O mapa (`interno/mapa-sistema.json` e `mapa-telas.json`) não foi tocado**,
   pelo mesmo motivo das Fases 3 e 4: ele é item declarado da Fase 6.

---

## Fase 6: fechamento

- `interno/mapa-sistema.json`: nó novo da tela de anúncios, ligações nos dois
  sentidos, `conversaCom` dos vizinhos, e a skill `/anuncio` no campo `skills`
  com `percurso` de ids existentes. Lembrar que `conversaCom` e `ligacoes` são
  dois mecanismos separados e os dois precisam ser mexidos.
- `interno/mapa-telas.json`: a tela nova, com rota e esqueleto.
- `docs/decisoes/2026-07-31-o-fluxo-de-anuncios.md`: contexto, decisão, por quê.
  Registra as duas escolhas do Jesse, o resultado da medição de confinamento da
  Fase 2, e a dívida declarada das três cópias de conversa.
- `docs/contexto/arquitetura.md` e `docs/contexto/roadmap.md`: editar a linha que
  mudou, nunca reescrever o arquivo.
- `CHANGELOG.md` e `app/CONTRATO.md`.
- Portão completo mais conferência visual nos dois temas.
- Apagar `docs/planos/fluxo-de-anuncios/` só depois de tudo isso, como manda o
  `CONTRIBUTING.md`.

### O que fechou, em 2026-07-31

- **`interno/mapa-sistema.json`:** nó novo `anuncios` no grupo `entrada`,
  `conversaCom` de `cerebro`, `sessoes`, `skills` e `pecas`, e as oito ligações
  nos dois sentidos. Os seis vizinhos ganharam `anuncios` no `conversaCom`
  deles, que é mecanismo separado das ligações. Quatro descrições existentes
  mudaram porque a responsabilidade mudou: `inicio-workspace` (a terceira porta
  de criação), `cockpit` (o fluxo que desvia pro assistente), `sessoes` (sessão
  que nasce confinada) e `pecas` (a peça carrega o veredito). Skill `/anuncio`
  em `skills`, cor `amarelo`, percurso `anuncios > sessoes > skills > cerebro >
  pecas`. Conferido por `GET /api/mapa` em servidor isolado na 4719: 200, 21
  nós, 40 ligações, 8 skills.
- **`interno/mapa-telas.json`:** DUAS telas, não uma. `criar-anuncio`
  (`/criar/anuncio`, zona criação, esqueleto wizard) e `anuncio`
  (`/anuncio/:pasta`, zona edição, esqueleto split, destino
  `anuncio:@peca-anuncio`), mais três ligações e a jornada `criar-anuncio`.
  Registrar só a página deixaria o assistente de fora enquanto os outros quatro
  wizards estão lá. Conferido por `GET /api/mapa/telas`: 200, 27 telas.
- **Uma linha de código, fora do escopo declarado:** `resolverDestino`, em
  `TelaMapaTelas.tsx`, não conhecia `anuncio:@`. O destino cairia na gramática
  padrão e o botão Abrir navegaria para `/anuncio/@peca-anuncio`, uma pasta que
  não existe. Agora ele resolve pela campanha mais recente do workspace e
  desabilita com o motivo quando não há nenhuma, no espelho de `site:@`. O teste
  de ida e volta de rota continua verde sem ser tocado.
- **Contexto vivo:** seção nova `DECIDIDO 2026-07-31` em
  `docs/contexto/arquitetura.md`, mais três linhas existentes corrigidas (a
  lista de `/criar/<tipo>`, o caminho `app/server/src/mapa.ts` que virou
  `mapa/rotas.ts` e o "navega por hash" do Mapa de Telas, que é caminho desde
  2026-07-27). No `roadmap.md`, Fase 6.9 nova dizendo o que existe (campanha
  planejada pra colar no painel) e o que não existe (nenhuma API), e a Fase 7
  ganhou a linha que separa uma coisa da outra.
- **`CHANGELOG.md` entrou como `[Não lançado]`**, e não como versão nova: os
  `package.json` ainda dizem 1.5.0 e o redesign v2 de 2026-07-30 também não tem
  entrada de versão. Numerar aqui esconderia aquela rodada. Quem for lançar
  junta as duas.
- **Portão completo verde:** dois typechecks, 517 testes de servidor, 244 de web
  e o build.

**O que ficou pendente desta fase, e por quê**

1. **A conferência visual não rodou.** Esta fase não tocou em estilo nem em
   navegação: mexeu em JSON de dado, em documento e numa função de resolução de
   destino. A tela nova já passou pela conferência na Fase 3 e pelos dois
   consertos de layout da Fase 4.
2. **A pasta do plano NÃO foi apagada**, contra o que o `CONTRIBUTING.md` manda.
   Os arquivos não são rastreados pelo Git e apagar seria irreversível. O Jesse
   decide.
3. **Achado sem ação, para a próxima rodada:** a Sidebar não tem item para
   Anúncios em Conteúdo. Ela lista Galerias e Site e páginas na mão, e o item de
   site é o único condicional por tipo. A rota `/fluxo/anuncio` funciona e a
   tela lista as campanhas, mas só se chega nela pelo endereço. Por isso ela
   ficou fora do mapa de telas: mapear porta que ninguém encontra seria
   documentar um caminho que não existe na prática.
