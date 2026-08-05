# Fluxo de anúncios: a arquitetura

> O contrato técnico da rodada. Onde este arquivo diverge do código, o código
> está errado até prova em contrário. Números de linha citados aqui valem para
> 2026-07-31 e envelhecem; o nome do símbolo é o que importa.

## 1. A peça em disco

```
conteudo/<AAAA-MM-DD>-anuncio-<slug-da-oferta>/
  anuncio.json     a verdade, validada por schema
  anexos/          material que o dono enviou, se houver
```

`anuncio.json` na raiz da pasta é o que **define** a peça como anúncio. Nada de
`.html` e nada de `.md` na raiz, senão a classificação escorrega para `site` ou
`texto` (ver seção 3).

O vínculo entre a peça e a conversa que a gerou NÃO mora aqui. Ele mora em
`app/dados/workspaces/<id>/anuncios.json`, porque a peça é do VKOS e o registro
de sessão é do Hub. Ver seção 6.

## 2. O schema

Módulo novo `app/server/src/anuncios/`, no padrão de `mensagens/`:

```
anuncios/
  modelo.ts          os tipos e o schema Zod
  limites.ts         os limites do Google, puros, sem Zod
  armazenamento.ts   ler e gravar com gravação atômica e backup
  vinculo.ts         a ponte peça para sessão
  rotas.ts           o plugin Fastify
```

### A forma, resumida

```ts
PecaAnuncio {
  versao: 1
  plataforma: "google-busca"
  geradoEm: string                 // ISO
  estrategia: Estrategia           // bloco 1
  campanha: Campanha               // blocos 2, 3 e 5 penduram aqui
  negativas: PalavraNegativa[]     // bloco 4, nível de campanha
  recursos: Recursos               // bloco 6
  orcamento: Orcamento             // bloco 7
  conversoes: Conversao[]          // bloco 8
  publicacao: PassoPublicacao[]    // bloco 9
}

Campanha { nome, grupos: GrupoAnuncio[] }
GrupoAnuncio {
  id, nome, tema,
  palavrasChave: PalavraChave[],   // { texto, correspondencia, motivo }
  anuncios: AnuncioResponsivo[]    // { titulos: string[], descricoes: string[], caminhos: [string?, string?] }
}
```

A árvore segue a anatomia real do Google Ads: campanha contém grupos, grupo
contém palavras-chave e anúncios. **Os nove blocos da tela são visões sobre essa
árvore, não nove campos de topo.** O bloco "Palavras-chave" percorre os grupos.
Inverter isso obrigaria a tela a remontar a hierarquia na mão, e a hierarquia é
o que o dono vai reproduzir no painel do Google.

### Zod valida FORMA, nunca tamanho de texto

Esta é a regra mais importante do módulo, e ela tem motivo.

- **Forma errada** (falta `campanha`, `titulos` não é lista, `versao` não é 1)
  significa que a IA não entregou uma peça de anúncio. Isso é 422 na leitura e
  dispara o laço de conformidade na geração.
- **Título de 34 caracteres** é uma peça perfeitamente legível com um problema
  que o dono precisa VER. Se o Zod reprovasse isso, um título ruim tornaria a
  campanha inteira ilegível, e o dono ficaria sem nada em vez de ficar com
  quase tudo.

Então `limites.ts` expõe uma função pura:

```ts
conferirLimites(peca: PecaAnuncio): Violacao[]
Violacao { caminho: string, campo: string, valor: string, limite: number, tamanho: number, gravidade: "erro" | "aviso" }
```

`caminho` é endereçável pela tela, tipo `campanha.grupos[1].anuncios[0].titulos[6]`.

### Os limites do Google, e a data deles

Vão em `limites.ts` numa constante só, com comentário dizendo que são do Google
em julho de 2026 e que mudam sem aviso:

| Campo | Limite | Quantidade |
| --- | --- | --- |
| Título de anúncio responsivo | 30 caracteres | 3 a 15 por anúncio |
| Descrição | 90 caracteres | 2 a 4 por anúncio |
| Caminho de exibição | 15 caracteres | até 2 |
| Texto de sitelink | 25 caracteres | mínimo 4 recomendado |
| Descrição de sitelink | 35 caracteres | 2 por sitelink |
| Frase de destaque | 25 caracteres | mínimo 4 recomendado |
| Valor de snippet estruturado | 25 caracteres | mínimo 3 |

Quantidade abaixo do mínimo é `aviso`. Caractere acima do limite é `erro`.

## 3. Onde o tipo novo se registra

O levantamento achou 36 pontos de extensão. Estes são os que esta rodada toca.
Um ponto esquecido não quebra compilação em todos os casos, então a lista é
conferida item a item no fim de cada fase.

**Servidor**
1. `app/server/src/tipos.ts`, `TipoPeca` ganha `"anuncio"`.
2. `app/server/src/vkos/pecas.ts`, `classificarPeca`: regra `anuncio.json` na
   raiz **antes** da regra de `.html` e da de `.md`. Sem isso a peça vira
   `texto` ou `site`.
3. `app/server/src/vkos/pecas.ts`, `montarPeca`: peça de anúncio não tem
   preview de imagem. O ramo precisa existir sem quebrar a montagem.
4. `app/server/src/sessoes/rotas.ts`, `SKILLS_QUE_EXIGEM_CEREBRO` ganha
   `"anuncio"`. Isso liga duas coisas de uma vez: a guarda de Cérebro vazio e a
   trava de uma criação guiada por vez. As duas são desejadas.
5. `app/server/src/sessoes/conformidade-site.ts`, `SKILLS_COM_CONFERENCIA`
   ganha `"anuncio"`. Sem isso o gerenciador descarta a `pastaAlvo` da sessão e
   o laço nunca roda.
6. `app/server/src/sessoes/rotas.ts`: **o anúncio NÃO passa por
   `resolverPastaAlvoGeracaoSite`.** Aquela função existe porque, no site, quem
   cria a pasta é a IA, então o servidor precisa achar o nome dela lendo o
   prompt por regex. No anúncio quem cria a pasta é o Hub, antes de disparar,
   então a `pastaAlvo` viaja no corpo da requisição e é validada pela barreira
   `resolverPeca`, que é a mesma que decide o `cwd`. Regex de prompt aqui seria
   descobrir por adivinhação um dado que já está na mão.
7. `app/server/src/index.ts`, registro do plugin de anúncios.

**Web**
8. `app/web/src/tipos/dominio.ts`, `TipoPeca` ganha `"anuncio"`.
9. `app/web/src/estado/geracao.tsx`, `TipoGeracao` ganha `"anuncio"`
   (`TipoCriacao` continua só visual), mais `FASES_ANUNCIO`, `fasesDoTipo`,
   `pecaPronta` e o fallback dos 10 segundos.
10. `app/web/src/componentes/layout/rotas.ts`: `TIPOS_CRIACAO`,
    `destinoAposCriacao`, `irParaPeca`, e a rota nova `/anuncio/<pasta>`.
11. `app/web/src/componentes/criacao/AssistenteCriacao.tsx`: hoje há um `if`
    que desvia `site` para fora de `CONFIG_TIPO`. Com um terceiro tipo os
    ternários viram três vias em cinco lugares diferentes. **Refatorar para uma
    tabela única cobrindo `TipoGeracao`** é mais barato que espalhar o terceiro
    ramo, e transforma "esqueci um ternário" em erro de compilação.
12. `app/web/src/componentes/criacao/GeracaoFlutuante.tsx`: `ROTULO_TIPO` e o
    botão de saída, hoje binário entre "Ver o site" e "Editar no Studio".
13. `app/web/src/componentes/telas/fluxos.ts` e
    `app/web/src/componentes/pecas/PainelPecas.tsx`: dois `ROTULO_TIPO`
    independentes sobre `TipoPeca`, os dois exaustivos.
14. `app/web/src/config/fluxos.ts`: entrada nova em `FLUXOS`, para o anúncio
    aparecer no menu do Cockpit.
15. `app/web/src/componentes/workspace/TelaWorkspace.tsx`: o botão de entrada e
    `rotuloGeracao`.
16. `app/web/src/componentes/layout/Shell.tsx`: import dinâmico e a cadeia de
    `telaAtiva`.

## 4. A geração

### Confinamento desde o primeiro turno

O carrossel e o site rodam com `cwd` na raiz do workspace e deixam a IA criar a
pasta. O anúncio faz diferente: **o Hub cria a pasta antes de disparar, e o
`cwd` da sessão já é a pasta da peça.** É a mesma máquina do Ajustar com IA, só
que desde o turno um.

Isso importa porque o chat da seção 6 **retoma essa mesma sessão**. Uma sessão
que nasceu com `cwd` na raiz do workspace continua com ele para sempre, e o
chat viraria um agente solto perto do Cérebro. Nascer confinada resolve na
origem, sem depender de instrução no prompt.

**A consequência:** com `cwd` numa subpasta, não se pode contar com o
Claude Code descobrindo `.claude/skills/` subindo diretórios. Então o prompt
**embute o conteúdo do `SKILL.md`**, pelo caminho que já existe para o Codex
(`app/server/src/provedores/skills.ts`, `instrucaoSkill`, que lê via
`app/server/src/vkos/skills.ts`). Isso vale para os dois provedores neste fluxo.

O `SKILL.md` do `/anuncio` tem 57 linhas. O custo em token é baixo e o ganho é
que o fluxo para de depender de uma resolução de caminho que ninguém mediu.

**Guarda obrigatória na Fase 2:** medir isto num workspace de teste antes de
construir por cima. Se a sessão confinada não conseguir gerar, o plano B é
`cwd` na raiz do workspace com regra de escopo no prompt, igual ao que o site
faz hoje, e o chat passa a abrir sessão nova confinada em vez de retomar. O
plano B custa a continuidade da conversa, que é o pedido central do Jesse, então
ele só entra com o motivo medido escrito na decisão.

### O prompt

O prompt é montado em dois pedaços, e a divisão tem motivo.

**O texto do contrato do JSON mora no servidor, colado no schema**, em
`app/server/src/anuncios/`. Ele é derivado da mesma constante de limites que a
conferência usa, e um teste afirma que ele cita todo campo do schema. Se o
contrato morasse no web, o schema ganharia um campo um dia e o prompt nunca
ficaria sabendo, do outro lado de uma fronteira de processo. Esse é o jeito
clássico de os dois divergirem em silêncio.

**O web monta só a intenção do dono**, em
`app/web/src/componentes/criacao/promptAnuncio.ts`: oferta, destino, praça,
orçamento e os detalhes livres. O servidor costura tudo antes de disparar, do
mesmo jeito que `montarPromptAjustePeca` já faz.

O prompt final declara, nesta ordem:

1. A pasta alvo, numa linha reconhecível por regex no servidor (é assim que
   `resolverPastaAlvoGeracao` acha a peça, ver ponto 6 da seção 3).
2. Que não se pergunta nada. A `/anuncio` faz três perguntas no passo 1 dela
   (onde, oferta, destino); o assistente já colheu as três.
3. Que a plataforma é Google rede de busca, e que o ramo Meta da skill não vale
   nesta rodada.
4. **O contrato do `anuncio.json`, campo a campo, com os limites de caractere
   escritos por extenso.** A IA precisa saber o limite para respeitar, não só
   para ser reprovada depois.
5. Que o arquivo é o único artefato, gravado em `anuncio.json` na pasta atual.

O Cérebro vai injetado no prompt, como `montarPromptAjustePeca` já faz, porque
com `cwd` na pasta da peça a IA não alcança `cerebro/cerebro.md`.

### O assistente

`app/web/src/componentes/criacao/EtapasAnuncio.tsx`. As etapas colhem o que a
skill perguntaria e o que o Cérebro não tem:

- **Oferta e objetivo.** Qual oferta anunciar, e o que conta como resultado.
- **Destino do clique.** WhatsApp, landing, agendamento ou telefone, mais a URL.
  A skill trata isso como decisivo e o Cérebro bloco 12 costuma dizer só
  "WhatsApp".
- **Onde e para quem.** Cidades e raio, que saem do bloco 3 mas o dono pode
  apertar.
- **Orçamento.** Quanto por dia. **O Cérebro não tem nenhum bloco de orçamento,
  ticket, margem ou custo de aquisição.** Sem perguntar, o bloco 7 vira chute.
- **Detalhes livres.** Texto aberto, entra literal no prompt.

## 5. A tela

`app/web/src/componentes/anuncios/TelaAnuncio.tsx` e `anuncios.css` ao lado.
Rota `/anuncio/<pasta>`, nível workspace, tela cheia, no padrão da `TelaSite`.

Obrigações da fundação (`docs/contexto/identidade-visual.md`):

- Compõe `estilos/primitivas.css`. Primitiva que faltar sobe para lá, nunca
  vira classe local.
- `@layer base, externo, tela, tema;` na primeira linha da folha, e todo o
  conteúdo dentro de `@layer tela`.
- Cor só por token. Nenhum hex.
- **Conteúdo não nasce dentro de cartão, e cartão dentro de cartão nunca é
  certo.** Nove blocos com listas dentro é exatamente onde essa regra costuma
  ser quebrada. Bloco é seção com `.secao-topo`, não `.cartao`.
- Densidade pela altura de controle, 28, 32 ou 40px. O corpo é 14px.
- O menta só diz o que está vivo. Título estourado é `.selo-alerta`, nunca
  menta.

Layout: topo com nome da campanha, selos de conferência e ações; corpo em duas
colunas, os blocos com rolagem e a conversa num `aside` colapsável. Três colunas
não cabem em 1280x720, que é o tamanho que a conferência visual mede.

Cada campo de texto do Google tem contador e botão de copiar. O contador vira
alerta quando passa do limite, lendo as violações que o servidor já calculou.

## 6. A conversa que continua

### A extração

`app/web/src/componentes/comum/` ganha:

- `usarConversaSessao.ts`, o hook. Recebe qual sessão e como criar uma, devolve
  turnos, pendentes, resposta viva, ferramentas, se está rodando, e `enviar`.
  Encapsula a soma de transcrição REST com a fatia do stream, que hoje existe em
  **três cópias divergentes**.
- `Conversa.tsx`, apresentação pura, sem saber de onde vêm os dados.
- `conversaIa.css`, folha ao lado. Classes `.conversa-ia-*`, porque `conversas.css`
  do CRM já existe e é de mensagem de lead, outro domínio.

Nenhuma qualificação por ancestral. O CSS do chat da IDE hoje depende de
`.tela-ide` para os modos compacto e minimizado, e é por isso que ele não sai da
janela dele.

`ChatIde`, `CerimoniaCerebro` e `NoSessao` **não são migrados nesta rodada**.
Ficam como estão, e a dívida entra na decisão com nome e motivo.

### O vínculo peça para sessão

`app/dados/workspaces/<id>/anuncios.json`:

```json
{ "2026-07-31-anuncio-combo-estreia": { "sessaoId": "s-...", "atualizadoEm": "..." } }
```

Rotas `GET` e `PUT /api/anuncios/:pasta/conversa`. Respeita `VKOS_DADOS_TESTE`
pela mesma função dos outros módulos.

Guardar em estado local do React não serve: o Jesse vai sair da tela e voltar, e
a conversa precisa estar lá. Guardar dentro de `anuncio.json` não serve: a IA
reescreve aquele arquivo.

### O gesto

Escrever no chat retoma a sessão por `POST /api/sessoes/:id/mensagem`, que já
resolve `--resume` no servidor. A sessão está confinada na pasta da peça desde o
nascimento, então ela pode reescrever `anuncio.json` e nada mais.

A tela recarrega a peça ao ouvir `pecas:atualizadas`, que o observador de
arquivos já emite. Sem botão de atualizar.

Se a sessão retomada morreu (processo encerrado, Hub reiniciado sem o
`sessionIdClaude`), o chat diz isso e oferece começar outra, confinada na mesma
pasta, com o `anuncio.json` atual embutido no prompt. Nunca fingir que continua.

## 7. O laço de conformidade

Espelho de `app/server/src/sessoes/conformidade-site.ts`, máximo 2 voltas.

Quando a sessão de anúncio termina, o servidor lê `anuncio.json` da pasta alvo e
roda o schema. Se a forma reprova, ou o arquivo não existe, a mesma sessão é
retomada com **o erro literal do Zod**, dizendo qual campo e o que se esperava.

Violação de limite de caractere **não** dispara o laço. Ela é conteúdo, aparece
na tela, e o dono decide se corrige pelo chat ou na mão. Fazer a IA girar duas
vezes por um título de 31 caracteres é gastar dinheiro para tirar um caractere
que o dono tiraria em dois segundos.

## 8. Riscos, e onde cada um é medido

| Risco | Onde se mede | Plano B |
| --- | --- | --- |
| Skill não resolve com `cwd` na pasta da peça | Fase 2, primeira tarefa, geração real em workspace de teste | Embutir o `SKILL.md` no prompt, que já é o desenho escolhido. Se ainda assim falhar, `cwd` na raiz e o chat abre sessão nova |
| IA não entrega JSON válido | Fase 2, geração real; Fase 5, teste do laço | Laço de conformidade, 2 voltas, e falha honesta na tela depois disso |
| Nove blocos estouram 1280x720 | Fase 3, `ferramentas/olhar-telas.mjs` nos três tamanhos e dois temas | Conversa colapsável, e o índice de blocos vira barra horizontal em vez de coluna |
| Trava de criação única confunde o flutuante | Fase 2, gerar anúncio com carrossel na fila | A trava é global de propósito: `GeracaoAtiva` é singular no frontend |
| Extrair a conversa quebra a IDE | Não se aplica nesta rodada | A IDE não é tocada. O hook nasce usado por uma tela só |
