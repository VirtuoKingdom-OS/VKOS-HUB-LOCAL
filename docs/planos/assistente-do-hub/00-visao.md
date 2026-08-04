# O Assistente do Hub: a visão

## O pedido

Um chat de IA no CORE, logo abaixo do Dashboard. Três colunas: as conversas
salvas à esquerda, como nas IAs de navegador, o chat no meio, e à direita um
registro do que de fato foi feito no sistema.

Ele conversa como o chat da IDE e lê o sistema inteiro. E ele consegue
**iniciar ações**, inclusive em lote, a partir de um checklist:

> `[ ] Criar 2 carrosséis para o cliente X`

O Hub executa como se fosse o Jesse clicando, por trás dos panos. As tarefas se
empilham.

## Por que isso é a tese do produto, e não mais uma tela

Está escrito em `docs/contexto/visao.md`:

> A oferta não é "junte suas IAs num canvas". É "seu negócio operando, com um
> monte de IA por baixo que você nunca precisa ver". A unificação é o meio,
> nunca a promessa.

O Cockpit mostra a orquestração. O assistente **esconde** a orquestração atrás
de uma conversa. É a primeira tela do Hub que cumpre a frase acima ao pé da
letra: você fala o que quer, e um monte de IA roda embaixo.

Por isso ele é do CORE e não do workspace. Agir "para o cliente X" é gesto do
dono, não do projeto aberto.

## Três subsistemas, não um

Isso é a decisão mais importante do plano, e ela se paga em todas as outras.

1. **A Conversa.** Um chat com a IA, no nível CORE, com leitura curada do
   sistema. Ela conversa e propõe.
2. **A Fila.** Um armazém durável de tarefas. Ela é a dona das tarefas.
3. **O Rastro.** O recibo append-only do que o **servidor** fez.

**A fila não mora dentro da conversa.** Se morasse, ela morreria com a sessão, e
sessão morre: o Hub reinicia, o processo cai, o provedor perde a thread. Uma
fila que some quando a conversa some não é uma fila, é uma lembrança. A conversa
propõe, a fila executa, e as duas se encontram num dado validado.

**O rastro não é a narração da IA.** A IA diz o que acha que fez. O servidor sabe
o que fez. O rastro registra o segundo. Essa distinção já custou caro aqui: em
2026-07-31 um agente editou à mão uma transcrição para a foto mostrar o
comportamento corrigido. Foto retocada não é prova, e narração de IA não é
recibo.

## As quatro decisões do Jesse, tomadas em 2026-08-02

1. **Tela própria no CORE**, logo abaixo de Dashboard. Três colunas não cabem
   dentro de um corpo que já rola.
2. **Um OK por lote.** O assistente monta o checklist, o Jesse lê a lista
   inteira e aprova de uma vez. Depois ela roda sozinha, com parar sempre
   visível. Cada tarefa gasta crédito de verdade.
3. **Leitura curada pelo Hub.** O assistente recebe um briefing e pede o resto
   por rotas tipadas. Ele nunca recebe a raiz do projeto como diretório de
   trabalho.
4. **Só criação de peça nesta rodada:** carrossel, site e anúncio, em qualquer
   workspace.

## O obstáculo que domina a rodada

**Nada no Hub sabe agir num workspace que não é o ativo.**

Nenhuma rota aceita workspace por parâmetro. Todas resolvem na hora, por
`obterPastaVkos()` e `idWorkspaceAtivo()`, duas globais de processo. O único
caminho para agir no cliente X é ativar o X, e `ativarPorId` aponta a pasta,
religa o observador de peças e **transmite `workspace:ativado` para todas as
abas**.

Se a fila ativasse workspace, a tela do Jesse pularia para outro cliente no meio
do trabalho dele. Isso não acontece nesta rodada, em nenhuma hipótese.

A saída existe e é contida: `gerenciador.criar()` **já** recebe a pasta e o
workspace por argumento. Quem lê a global é a camada de rota. A orquestração sai
da rota para uma função que recebe o alvo, e a rota HTTP vira um chamador fino
que passa o workspace ativo. É a Fase 0, e é o que destrava tudo.

## O que essa rodada NÃO faz

- **Nenhuma escrita em CRM.** O dado mais sensível do Hub merece rodada com
  atenção própria.
- **Nenhuma exportação nem publicação.** Elas rodam auditoria com navegador de
  verdade e levam minutos, o que muda o desenho da fila.
- **Nenhum agendamento por tempo.** A fila executa o que foi aprovado, na ordem.
  Não existe cron neste projeto e não nasce um aqui.
- **Nenhuma ação de arquivo pelo assistente.** Ele propõe tarefa de um catálogo
  fechado. Ele não roda comando e não chama rota.
- **As três cópias de conversa** (`ChatIde`, `CerimoniaCerebro`, `NoSessao`)
  continuam de pé. Dívida declarada em 2026-07-31, e continua sendo rodada
  própria.

## Como se sabe que deu certo

- "Cria 2 carrosséis para a Mae Pixel" com o workspace **Meu negócio** aberto
  gera as duas peças na pasta da Mae Pixel, e a tela do Jesse **não se mexe**.
- Fechar o Hub no meio do lote e abrir de novo reencontra a fila, com o que
  faltava ainda faltando.
- O rastro mostra pasta, workspace, sessão e custo de cada peça, e continua
  mostrando meses depois.
- Uma conversa de duas semanas atrás abre com o histórico inteiro.
- O gasto do assistente aparece no total do Dashboard. Se não aparecer, o número
  principal do Hub passa a mentir.
