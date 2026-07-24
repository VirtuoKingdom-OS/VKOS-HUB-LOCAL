# Workspace unificado no CORE

## Contexto

O painel de gestão do CORE tinha dois itens de menu separados que eram o mesmo
assunto: Clientes, os workspaces reais provisionados, e Planos de cliente, as
receitas que originam um workspace. Um plano é o template, um cliente é a
instância criada a partir dele. Manter os dois no mesmo nível do menu não fazia
sentido e dividia a operação em duas telas que sempre andam juntas.

## Decisão

Os dois viraram uma área única chamada Workspace, no modelo "workspace no centro,
plano vira preset" (escolhido pelo Jesse entre três opções). O objeto principal
da área é o workspace real: a lista ocupa a largura toda, com barra de resumo,
busca a partir de sete itens e os botões Planos de partida e Novo workspace.
Criar abre uma gaveta lateral com o plano de partida escolhido em cartões de
rádio, não mais um seletor cru. Os planos deixaram de ser item de menu e viraram
preset numa gaveta secundária, aberta pelo botão. Gerenciar mantém a gaveta de
detalhe com Features, Acesso e Consumo. As rotas antigas `/clientes` e `/modelos`
redirecionam pra `/workspace`.

O backend não mudou: criar um workspace continua exigindo um plano, porque o
plano define a semente da pasta, o motor e as features iniciais. Por isso não há
caminho "criar sem plano"; sem nenhum plano, a gaveta de criação mostra um estado
vazio guiado que leva a criar o primeiro plano. A palavra workspace passou a
nomear o objeto provisionado e a palavra cliente ficou só pra pessoa que recebe
login (email, convite, membro).

## Por quê

Plano e cliente sempre foram template e instância do mesmo fluxo, então separá-los
no menu só somava cliques. Trazer o workspace pro centro e rebaixar o plano a
preset reflete a hierarquia real sem tocar no modelo de dados nem no backend, o
que mantém o risco baixo. A gaveta, em vez de sub-abas ou seção ao pé, evita que
o plano volte a competir com o workspace na leitura da tela e não recria, um nível
abaixo, os dois itens que a unificação eliminou. O redirecionamento das rotas
antigas garante que link salvo e histórico não quebrem.
