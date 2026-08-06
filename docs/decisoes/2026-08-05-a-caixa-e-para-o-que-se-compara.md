# A caixa é para o que se compara

## Contexto

A identidade v3 unificou cor, tipografia, textura e carvão, mas três telas do
CORE ainda contavam histórias diferentes sobre superfície. O Dashboard deixava
unidades comparáveis soltas no plano, o Assistente encaixotava regiões
contínuas e Workspaces tratava projetos ricos como linhas densas. Ao mesmo
tempo, o cabeçalho de tela ainda interrompia a textura nos primeiros 56px das
telas sem acrescentar hierarquia útil.

A causa era uma regra incompleta do redesign v2. O texto dizia que cartão só
cabia quando o registro tinha imagem. Isso confundia a presença de uma imagem
com a capacidade do conteúdo de sustentar uma área própria.

## Decisão

A composição passa a seguir três réguas curtas:

1. **Chassi segura. Plano é onde se trabalha. Unidade é o que se compara.**
2. **A caixa é para o que se compara.** Conteúdo suficiente para sustentar uma
   área própria pode formar cartão mesmo sem imagem.
3. **Cor e espaço separam primeiro. Fio entra só quando informa.**

Caixa dentro de caixa continua proibida. Quando uma lista já mora num painel,
ela usa a variação embutida e não repete superfície, borda e raio.

O cabeçalho de tela deixa de ter material próprio. Ele passa a morar no mesmo
plano do corpo. O fio superior do corpo só aparece depois de rolagem, quando
informa que conteúdo passou por baixo da região fixa. Antes, o cabeçalho
cobria a textura nos primeiros 56px de 16 telas e o fio ficava sempre visível,
mesmo sem nada ter rolado.

Esta decisão substitui os itens 1 e 3 registrados no cabeçalho de
`app/web/src/componentes/core/core.css` para a Fase 2 do redesign v2:
"não há mais cartão" e "os workspaces viraram lista". Ela também especializa
a regra geral de conteúdo fora de cartão registrada em
`docs/decisoes/2026-07-30-redesign-v2-fundacao.md`.

O Dashboard volta a agrupar cada indicador comparável num painel. Workspaces
volta a usar cartões porque nome, estado, atividade, gasto e ações sustentam a
área, ainda que não exista imagem. O Assistente usa trilhos nas laterais e
mantém a conversa no plano central.

## Por quê

O critério antigo produzia dois erros opostos. Ele desmontava objetos ricos só
porque não tinham imagem e, ao mesmo tempo, autorizava uma caixa apenas pela
presença de uma miniatura. Imagem é conteúdo, não critério de composição.

As novas réguas começam pela função. Um trilho contém uma região contínua. O
plano recebe o trabalho principal. Um painel ou cartão delimita uma unidade que
precisa ser comparada com irmãs. Superfície, borda e raio deixam de ser
decoração local e passam a revelar essa função.

Há uma perda assumida na mudança de Workspaces. A comparação vertical de gasto
entre projetos deixa de existir naquela tela. Ela continua no Dashboard, onde
comparar indicadores de projetos é trabalho central e tem contexto suficiente.

A rodada não muda alimentação, responsabilidade ou ligação entre módulos. O
`interno/mapa-sistema.json` foi conferido e não representa folhas CSS como nós,
portanto não precisa de alteração.
