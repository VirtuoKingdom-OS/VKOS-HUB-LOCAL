# Um nível por vez: o CORE e o workspace deixam de dividir a barra

## Contexto

A barra lateral empilhava os dois níveis de navegação. Em cima o CORE, com
Dashboard, Workspaces, CRM, Conexões e Mapa. Embaixo o rótulo Workspace, o
seletor de cliente, e os itens do projeto aberto. Mais o rodapé com status,
gasto e pasta.

O Jesse relatou que no notebook dele não dava pra ver as opções de workspace,
porque o menu não rolava. Medido em navegador de verdade, com um cliente e uma
galeria só:

| altura da tela | caixa do menu do projeto | itens visíveis |
| --- | --- | --- |
| 1440x900 | 213px | 3 de 4 |
| 1366x768 | 81px | 1 de 4 |
| 1280x720 | 33px | 0 de 4 |
| 1024x640 | 0px | 0 de 4 |

A moldura fixa somava 650px antes de sobrar qualquer coisa pro menu: 95px de
marca, 255px da navegação do CORE, 45px do rótulo, 60px do seletor e 195px de
rodapé. O menu era o único filho que cedia altura, então ele absorvia toda a
falta sozinho até virar fresta. Tecnicamente rolava. Na prática, não.

## Decisão

A barra mostra **um nível de cada vez**.

No CORE aparecem as áreas do dono e um rodapé de duas linhas com o status do
sistema. Nada de seletor, nada de gasto de projeto.

A barra do CORE teve por um tempo uma porta pro projeto aberto no pé, com o
rótulo "Entrar no workspace". Ela saiu em 2026-07-27, a pedido do Jesse. Quem
entra num projeto entra pela tela Workspaces, que já é um item da navegação e já
lista todos com o aberto marcado. A porta repetia esse caminho e ocupava o pé da
barra, que é justamente onde o espaço é mais disputado.

Dentro de um projeto aparece a volta pro Core no topo, o seletor de workspace, e
só os itens do projeto. O rodapé volta a trazer o gasto do workspace e a pasta.

Em 2026-07-27 a barra do CORE ganhou três grupos por função e recebeu a
VKOS-IDE, que até então ficava no pé do nível do workspace. Ver
[a barra do CORE em três grupos](2026-07-27-a-barra-do-core-em-tres-grupos.md).

O nível vem da tela: `nivelDaTela(telaAtiva)`. Estar criando peça conta como
estar dentro do projeto.

Além disso, o menu é o único filho com `flex: 1 1 auto`, e todo o resto da barra
é `flex: none`. Duas faixas de altura apertam a moldura em vez do menu: em
780px sai a folga e o rótulo Beta, em 660px sai o nome da pasta, que já aparece
inteiro na dica do bloco de gasto.

Depois da mudança, no mesmo cliente:

| altura da tela | menu no CORE | menu no projeto |
| --- | --- | --- |
| 1440x900 | 600px | 523px |
| 1366x768 | 498px | 421px |
| 1280x720 | 450px | 373px |
| 1024x600 | 320px | 292px |

Zero itens fora do alcance em qualquer tamanho medido.

## Por quê

Empilhar os dois níveis parecia dar contexto: a pessoa via de onde vinha e onde
estava. Na prática cobrava esse contexto em altura, e altura é o recurso escasso
de um notebook. O contexto continua existindo, no rótulo do nível e na volta pro
Core, e passou a custar uma linha em vez de trezentos pixels.

O rodapé perdeu três linhas de detalhe de token e o total geral. Isso não é
informação a menos: a quebra por tipo de token está na dica do próprio bloco, e
o total de todos os workspaces está inteiro no Dashboard do CORE, com muito mais
contexto do que cabia ali. O alerta de piso, esse não sai nunca, porque ele é o
que impede o número de parecer exato quando não é.

O seletor de workspace ficou fora da área que rola de propósito. Um ancestral
com `overflow` recorta o popover dele, e isso já tinha custado uma rodada antes.
