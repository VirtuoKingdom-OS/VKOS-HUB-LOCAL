# A tela Início recupera a cascata

## Contexto

O ajuste fino de 2026-07-27 pediu, entre outras coisas, três consertos na tela
Início do workspace: os três tratamentos de cartão diferentes para coisas do
mesmo nível, o fundo cinza sólido dos dois cartões de atalho, e a sombra que
aparecia no hover dos cartões e das miniaturas.

Nenhum dos três dava para consertar em `componentes/workspace/dashboard.css`.

Os seletores envolvidos, `.dash-hero:first-child`, `.dash-hero:hover`,
`.dash-hero-secundario .dash-hero-icone`, `.dash-atalho` e
`.recente-item:hover .recente-thumb`, estavam declarados também em
`estilos/visual-hub.css`, que é a camada `tema`. Numa cascata com `@layer`, a
ordem de camada decide antes da especificidade: uma regra em `tela` nunca vence
uma regra em `tema` para a mesma propriedade, por mais específico que seja o
seletor. Escrever qualquer coisa na folha da tela era escrever para o vazio.

Editar o `visual-hub.css` estava fora de questão: ele é compartilhado, está
travado por teste e outras telas estavam sendo mexidas em paralelo contra o
mesmo contrato.

Havia ainda uma mentira de nome no meio disso. As classes se chamavam `dash-*` e
`dashboard-*` desde quando esta era o Dashboard. Em 2026-07-27 o Dashboard virou
a tela do CORE, e esta virou o Início do workspace, em `/inicio`.

## Decisão

As classes da tela Início ganham o prefixo `inicio-`:

| antes | agora |
| --- | --- |
| `.tela-dashboard` | `.tela-inicio` |
| `.dashboard-scroll`, `.dashboard-cabecalho`, `.dashboard-contexto` | `.inicio-scroll`, `.inicio-cabecalho`, `.inicio-contexto` |
| `.dash-hero`, `.dash-hero-secundario`, `.dash-hero-ativo` | `.inicio-cartao`, mais o modificador `.principal` |
| `.dash-hero-icone`, `-texto`, `-titulo`, `-sub`, `-seta` | `.inicio-cartao-icone`, `-texto`, `-titulo`, `-sub`, `-seta` |
| `.dashboard-recentes`, `.recentes-topo`, `.recentes-vertodas`, `.recentes-tira`, `.recentes-vazio` | `.inicio-recentes`, `.inicio-recentes-topo`, `.inicio-vertodas`, `.inicio-tira`, `.inicio-vazio` |
| `.recente-item`, `.recente-thumb`, `.recente-titulo` | `.inicio-peca`, `.inicio-peca-thumb`, `.inicio-peca-titulo` |
| `.dashboard-atalhos`, `.dash-atalho` | `.inicio-atalhos`, `.inicio-atalho` |
| `.dash-seletor*` | `.inicio-seletor*` |

Duas classes NÃO mudam de nome, de propósito:

- `.dash-overlay-wizard` e `.dash-wizard-carregando`, porque o
  `componentes/layout/Shell.tsx` também as usa para mostrar o carregando do
  assistente. O alfa do véu continua vindo da camada de tema, junto com os
  outros overlays do app, então o Início escurece a tela igual a todo o resto.

A folha continua se chamando `dashboard.css` e continua onde está. Ela hospeda
os chips da Galeria unificada, que o `TelaGalerias.tsx` importa daqui, e o
placeholder de rota do Studio. Separar esses dois hóspedes é trabalho de outra
rodada.

Ficam órfãs no `visual-hub.css` cerca de 25 regras `.dash-*` e `.recente-*` que
não casam mais com nada. Elas não fazem mal e não foram removidas nesta rodada
porque o arquivo é compartilhado e estava em uso simultâneo.

## Por quê

Porque o contrato de "onde as coisas moram" já diz que a folha de estilo mora ao
lado do componente que ela veste, e que em `estilos/` só entra o que é de todo
mundo. Geometria e cor de cartão de UMA tela nunca deveriam ter morado na camada
de tema: o lugar certo do `visual-hub.css` é o valor final de cada token por
tema, não o padding de um cartão do Início.

Renomear devolve a folha da tela para quem a mantém, sem tocar em arquivo
compartilhado e sem passar por cima de agente nenhum trabalhando em paralelo. E
o nome novo é o nome verdadeiro da tela.

O custo é uma renomeação de 25 classes num arquivo TSX e numa folha, os dois com
um único dono. A alternativa, `!important` para reverter a ordem de camada,
resolveria a mesma coisa deixando um precedente que a próxima tela copiaria.
