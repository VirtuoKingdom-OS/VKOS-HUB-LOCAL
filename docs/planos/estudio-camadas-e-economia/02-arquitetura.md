# Camadas e economia: arquitetura

Código auditado em 2026-07-20. Referências arquivo:linha desta data; se o código andou, adaptar.

## Mapa do que existe (dos relatórios de auditoria)

- **Dois motores, um núcleo**: `editor/motor.ts` (carrossel, `usarMotorEdicao`), `editor/motorSite.ts` (site, `usarMotorSite`), `editor/nucleo.ts` (primitivas comuns), `editor/imagens.ts` (primitivas de imagem).
- **Hit-test**: carrossel usa `e.target` puro (`motor.ts:664`), refém de `pointer-events`. Site usa descida geométrica `alvoNoPonto` (`nucleo.ts:89-120`), que ignora `pointer-events` e escolhe o menor retângulo sob o ponto. ESTA é a diferença que causa o bug das aspas.
- **Ids estáveis**: o site marca elementos com `data-vk` numa folha própria `vkos-ajustes` (`motorSite.ts:344-363`, `411-422`); o carrossel não tem id por elemento (grava estilo inline).
- **Z-order**: nenhum motor lê ou grava `z-index`. Os valores vêm fixos do CSS dos templates.
- **Undo**: snapshot de `innerHTML` em string; desfazer recria todos os nós (`motor.ts:388-408`, `motorSite.ts:569-589`). O site reconcilia ids depois (`semearContador` `motorSite.ts:425-432`); o carrossel solta a seleção.
- **Imagem**: só TROCA de imagem existente (`motor.ts:793-800`, `motorSite.ts:825-832`). Inserção nova só existe amarrada ao fluxo de IA (`adicionarImagemFundoPagina`, `motor.ts:838-862`, cria `<img>` de fundo com `pointer-events:none` e `z-index:1` em `motor.ts:855-856`). Upload já pronto: `enviarImagem` (`motor.ts:749-759`) e `POST /vkos/pecas/:pasta/imagem` (`rotas.ts:308-335`, valida extensão, 20MB, sanitiza nome).
- **Arrasto genérico**: já funciona pra qualquer elemento selecionado (`motor.ts:518-630`, grava `left/top` + `position:relative` via `garantirPosicionavel` `motor.ts:460-465`).
- **Wizard**: instruções finais do carrossel em `EtapasCriacao.tsx:877-888` (campo `dados.detalhes`), do site em `EtapasSite.tsx:656-667`. Payload em `AssistenteCriacao.tsx:139-162` (`skill`, `modelo`, `prompt`). Prompts em `prompt.ts:197-224` e `promptSite.ts:143-234`.
- **Modelos**: Claude publica opus/sonnet/haiku (`provedores/claude.ts:20-24`), Codex publica gpt-5.6-sol/terra/luna e gpt-5.4-mini (`codex.ts:27-48`). Padrão por provedor em `config/estado.ts:28-29` (sonnet, gpt-5.4-mini). O Ajustar com IA lista os modelos do provedor ativo via `usarProvedoresIA` (`estado/provedores.ts:73`), renderizados em `PainelAjusteCarrossel.tsx:67-80` e `TelaSite.tsx:1075`.
- **Custos**: Claude reporta custo real pelo CLI (`gerenciador.ts:156-164`); Codex estima pela tabela `precos-codex.json` (`codex.ts:123-133`).

## Parte 1: editor

### E1. Hit-test geométrico no carrossel (o conserto dos dois bugs)

`aoClicarDoc` do carrossel (`motor.ts:657-674`) passa a resolver o alvo com `alvoNoPonto` antes de selecionar, como o site faz em `motorSite.ts:923-939`. Regras:

- Clique repetido no mesmo ponto alterna entre os elementos empilhados sob o ponteiro (ciclo: menor área primeiro, depois os de trás), pra alcançar fundo atrás de enfeite sem precisar do painel.
- `alvoNoPonto` ganha um parâmetro pra ignorar o filtro de camada decorativa grande quando usado no carrossel (num slide 1080x1350, um hero de fundo é alvo legítimo).
- O duplo clique continua refinando pro nó de texto com `alvoEdicao`. Aspas são `<span>` com texto: com o novo hit-test, viram editáveis sem tocar nos templates.
- O override runtime `.slide img{pointer-events:auto}` (`motor.ts:226`) deixa de ser necessário pro clique, mas fica pelo cursor de mover.

### E2. Ids estáveis e painel de camadas no carrossel

1. **Ids**: ao instrumentar o documento (`motor.ts:974-1055`), o motor semeia `data-vk` incremental em todo elemento do slide, no mesmo esquema do site (`motorSite.ts:411-432`). O serializador PRESERVA `data-vk` (hoje o carrossel remove `data-ed-*`; `data-vk` entra na lista de preservados, como no site).
2. **Modelo de camadas**: uma função `listarCamadas(slide)` devolve os filhos diretos relevantes do slide (elementos com área visível, excluindo artefatos do editor), ordenados por empilhamento efetivo (z-index computado, com desempate pela ordem no DOM). Filhos de um contêiner aparecem aninhados um nível (contêiner e seus filhos diretos), sem árvore infinita: dois níveis bastam pro anatomy dos templates.
3. **Reordenar**: `moverCamada(id, "acima" | "abaixo")` troca a posição com o vizinho de empilhamento. Implementação: se os dois têm o mesmo pai, troca a ordem no DOM (`insertBefore`) E normaliza `z-index` inline crescente via `comEstilo` (`motor.ts:426-434`) só nos envolvidos quando o CSS do template fixa valores; senão, só ajusta `z-index`. A regra fica encapsulada no motor com testes.
4. **Undo**: o snapshot continua string, mas `desfazer` re-seleciona pelo `data-vk` guardado antes de restaurar (o site já reconstrói ids; o carrossel passa a reconciliar igual).
5. **Painel**: componente novo `PainelCamadas.tsx` em `componentes/editor/`, renderizado no Studio (`TelaStudio.tsx`) e no overlay (`EditorCarrossel.tsx`), listando as camadas do slide da seleção atual (ou do slide sob o viewport no Studio). Cada linha: nome amigável (tag + papel deduzido: "Texto", "Imagem", "Enfeite", primeiras palavras do conteúdo quando houver), clique seleciona, setas sobem/descem, olho de ocultar NÃO entra nesta rodada (escopo).

### E3. Adicionar imagem própria (carrossel e site)

1. **Motor carrossel**: `inserirImagemLivre(origem)` cria `<img>` com `position:absolute`, largura inicial 40% do slide, centralizada, `z-index` acima do conteúdo, `data-vk` novo, e a seleciona. Reusa `enviarImagem` e o arrasto existente. A largura é editável por campo numérico no painel de propriedades (altura automática).
2. **Motor site**: `inserirImagemLivre` insere `<img>` no fim da seção selecionada como bloco (largura 100% da coluna, `max-width` ajustável), não absoluta: site é fluido e imagem absoluta quebra responsivo. Reusa o upload do site (`motorSite.ts:794-804`).
3. **UI**: botão "Adicionar imagem" no painel do Studio, do overlay e do PainelSite, com as duas origens que os controles de imagem já oferecem (computador e fontes de dados, `ControlesImagem.tsx:54-81`).
4. O caminho da imagem segue o padrão `img/<nome>` relativo à peça, que a auditoria de publicação já valida.

### E4. Paridade no site

- A lista de seções (`relistarSecoes`, `motorSite.ts:712-743`) vira a base do painel: dentro da seção selecionada, listar os elementos de primeiro nível com as mesmas ações de camada (subir/descer por ordem no DOM; z-index raramente se aplica em fluxo, então só reordena).
- `PainelCamadas` é compartilhado entre os dois editores (props: lista, seleção, callbacks), estilos por token nos 3 temas.

## Parte 2: economia

### C1. Modelo barato pré-selecionado no Ajustar com IA

- `PainelAjusteCarrossel` e o painel da TelaSite inicializam o modelo com o alias econômico do provedor em vez do padrão global: Claude `haiku`, Codex `gpt-5.4-mini`. A informação de qual alias é o econômico vem do backend: campo novo `economico: true` em um modelo de cada provedor (`contrato.ts:14-18`, `claude.ts:20-24`, `codex.ts:27-48`), pro frontend não ter tabela própria.
- Dica curta sob o seletor: "Comece pelo econômico. Se o resultado não convencer, repita o pedido num modelo maior."
- A Revisão de design (preset pesado) continua inicializando no padrão do provedor (sonnet/terra), porque revisa o site inteiro.

### C2. Interruptor "Aprimorar com IA" nos wizards

1. **Estado**: campo novo `aprimorarComIA: boolean` (padrão `true`) em `DadosCriacao` e `DadosSite`, com o interruptor na etapa de instruções finais (`EtapasCriacao.tsx` etapa 3, `EtapasSite.tsx` etapa 3), no padrão visual de switch que o app já usa. Texto: "Aprimorar com IA" e subtexto honesto explicando o modo econômico.
2. **Efeito no payload** (`AssistenteCriacao.tsx:139-162`): quando desligado, o `modelo` enviado é forçado pro econômico da tarefa (carrossel: `haiku`/`gpt-5.4-mini`; site: `sonnet`/`gpt-5.6-terra`) e o prompt recebe o bloco de montagem. O seletor de modelo da etapa 0 aparece desabilitado com nota quando o interruptor está desligado.
3. **Prompt de montagem do carrossel** (`prompt.ts`): função nova `blocoMontagemEconomica()` anexada quando desligado, dizendo: modo montagem; siga o template `modelo-X.html` SEM alterar anatomia, cores, fontes ou layout; o conteúdo vem das instruções finais do usuário e do Cérebro; não invente direção de arte; não adicione elementos novos; preencha e pare. O contrato de template existente (`prompt.ts:161-192`) permanece.
4. **Prompt de montagem do site** (`promptSite.ts`): quando desligado, o Bloco 1 (design vem primeiro, com cartela e escolha de direção) é substituído por um bloco enxuto: use o estilo `<id>` da biblioteca `templates/design/estilos/` (um estilo padrão fixado no plano de execução, legível e neutro), aplique os tokens dele sem criar direção nova. Blocos 2 e 3 (conteúdo e regras técnicas) permanecem inteiros, incluindo marcadores `data-vk-*` e exigências de contraste: são eles que o laço de conformidade audita.
5. **Aviso de conteúdo**: se desligado e `detalhes` vazio, aviso inline na etapa: "Sem instruções, o modo econômico escreve um conteúdo básico. Pra um resultado caprichado, ligue o Aprimorar ou descreva o conteúdo."
6. **Sem mudança nos prompts do modo ligado.** Nenhuma linha dos blocos atuais muda de conteúdo.

### C3. O que NÃO muda

- `conexoes`, `custos.ts` (o registro de custo já funciona), o laço de conformidade (continua disparando pra `skill: "site"` nos dois modos), a exclusão mútua de geração, o modelo padrão global de sessões gerais.

## Fronteiras dos donos (sem interseção)

- **Dono A (motor carrossel e núcleo)**: `editor/motor.ts`, `editor/nucleo.ts` (o `alvoNoPonto` parametrizado), `editor/PainelCamadas.tsx` (novo, componente compartilhado), `editor/EditorCarrossel.tsx`, `studio/TelaStudio.tsx`, `studio/PainelPropriedades.tsx`, `editor/ControlesImagem.tsx`, estilos do editor. Testes de motor onde houver.
- **Dono B (motor site)**: `editor/motorSite.ts`, `site/TelaSite.tsx` (só o painel do modo editar), `site/PainelSite.tsx`, estilos do site. CONSOME `nucleo.ts` e `PainelCamadas.tsx` como estão depois do Dono A: por isso B começa depois de A publicar o contrato do componente (assinatura de props no relatório de A).
- **Dono C (economia)**: `componentes/criacao/**` (EtapasCriacao, EtapasSite, AssistenteCriacao, prompt.ts, promptSite.ts), `server/src/provedores/claude.ts` e `codex.ts` (só o campo `economico`), `server/src/provedores/contrato.ts`, `estado/provedores.ts` (tipo), `PainelAjusteCarrossel.tsx` e o trecho do seletor de modelo em `TelaSite.tsx` (só a inicialização do modelo). Roda em paralelo com A; o único arquivo compartilhado com B é `TelaSite.tsx`, em trechos distintos (painel de ajuste vs modo editar); C entrega antes de B começar a mexer em `TelaSite.tsx`.

Divergência descoberta no meio: o executor arbitra.
