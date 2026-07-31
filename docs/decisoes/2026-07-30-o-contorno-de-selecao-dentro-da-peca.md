# O contorno de seleção dentro da peça é a exceção do menta

## Contexto

A fundação v2 fechou duas regras que se cruzam nos três ambientes de edição
(Studio do carrossel, Studio de site e overlay do carrossel):

1. Selecionado se lê por superfície mais fio `inset` em `--acao`, nunca por
   preenchimento colorido.
2. O menta só aparece em quatro lugares: ponto de sessão viva, barra de
   progresso, contorno de campo em foco, e texto ou ícone que diz um estado
   vivo.

Só que o contorno que marca o elemento selecionado dentro do carrossel ou do
site não é desenhado na interface do Hub: ele é injetado por `motor.ts` e
`motorSite.ts` DENTRO do iframe da peça, com valor literal, porque aquele
documento é outro documento e não enxerga `var()` do app.

E o que está por baixo desse contorno não é uma superfície do Hub: é o conteúdo
do usuário, que pode ser preto, branco, uma foto escura ou um bloco de cor
saturada. `--acao` é quase preto no tema Claro e quase branco no Escuro:
desenhado sobre a peça, ele sumiria em metade dos casos, e sumiria justamente
onde a peça é mais bonita, que é onde a pessoa mais edita.

## Decisão

O contorno de seleção, o contorno de edição no lugar, as guias de alinhamento e
as alças de redimensionamento dentro do iframe usam **`--menta-viva`**. Só eles.

Isso é uma exceção nomeada às duas regras acima, e ela vale exclusivamente para
o CSS que os motores injetam no documento da peça. Dentro da interface do Hub o
menta continua saindo de tudo: o item de trilho de página, a linha de camada
selecionada, a aba ativa, o botão de painel aberto, o modelo de IA escolhido e o
zoom ativo passaram todos a superfície mais fio em `--acao`.

Antes da fundação v2 esse mesmo CSS lia `--menta`. Passou a ler `--menta-viva`
pelo mesmo motivo da decisão: `--menta` é o corte legível para TEXTO sobre as
superfícies claras do app (`#00715a`), e sobre uma foto escura ele fica
abafado. `--menta-viva` é o token de SINAL, medido em 3:1 contra os quatro
planos nos dois temas, e é um verde de meio-tom nos dois: `#0b9776` no Claro e
`#2fd4a7` no Escuro.

O `MutationObserver` de `data-theme` que reinjeta o estilo na troca de tema
continua valendo, e o token continua sendo hex de 6 dígitos, porque
`canaisRgb()` em `editor/tema.ts` converte para canais e monta o halo da guia.

Na mesma linha, o Studio passou a pintar a goteira entre as páginas com o valor
literal de `--fundo`, e a reinjetar esse valor no mesmo observador de tema.

## Por quê

**Porque instrumentação de editor não é interface, é ferramenta sobre o
trabalho.** Figma, Canva, Framer e o Webflow fazem todos a mesma coisa: a cor de
seleção é uma cor que a página editada nunca usaria por acaso, e ela não segue o
tema da moldura. O que a regra da fundação proíbe é o menta DECORAR, e essa é
exatamente a distinção: aqui ele é o único jeito de a pessoa saber o que está
selecionado antes de mexer.

**Porque a alternativa fura o critério 1.4.11 do WCAG.** Um contorno que é o
único indicador de estado precisa de 3:1 contra o que está em volta. Como "o que
está em volta" é a peça do usuário e não um token, nenhuma cor garante isso em
100% dos casos, mas um verde de meio-tom erra muito menos que preto ou branco,
que colidem com os dois extremos mais comuns de fundo.

**Porque a goteira branca era um bug de tema, não um efeito.** Medido: com
`background: transparent` no `html` e no `body` do iframe, o Chromium continua
pintando o canvas dele de branco. No tema Escuro a peça aparecia dentro de uma
faixa branca que não era da peça nem do plano de trabalho do Studio. Pintar o
literal de `--fundo` é o mesmo caminho que a cor de seleção já usava.
