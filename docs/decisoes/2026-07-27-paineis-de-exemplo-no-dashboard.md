# Painéis de exemplo no Dashboard, e o dado falso que se declara falso

## Contexto

O Jesse pediu painéis de Clientes, Finanças e CRM no Dashboard do CORE para
avaliar o visual antes de existir qualquer dado real por trás. Pediu números
fictícios não exagerados (cinco clientes, saldo de 2300) e um botão de olho para
ocultar valores.

Isso bate de frente com uma regra da casa: não mostrar número inventado como se
fosse real. Foi por ela que Clientes e Finanças nasceram declarando que estavam
vazias em vez de exibir tabela de mentira.

## Decisão

Os painéis entram, e **o dado falso se declara falso em três camadas**:

1. Um aviso em texto corrido acima da grade, dizendo quais painéis são
   demonstração e quais são reais.
2. Um selo `exemplo` no topo de cada painel fictício, na cor de aviso.
3. A borda do painel é tracejada, o mesmo sinal que o `.core-vazio` já usava
   para dizer "aqui ainda não tem conteúdo de verdade".

Todo o dado fictício mora em `componentes/core/exemplo.ts`, sozinho. Para
remover, apaga-se o arquivo, os três `<Painel…>` na TelaCore e o bloco
`PAINEIS DE EXEMPLO` no core.css. Nada mais fica preso.

**O olho começa fechado.** O Dashboard é a primeira tela do Hub e costuma abrir
com gente do lado; faturamento visível por padrão é o tipo de decisão que só se
percebe errada depois. A escolha persiste em `localStorage` e os dois botões da
tela se sincronizam por evento, senão clicar num deixaria o outro dizendo o
contrário na mesma tela.

O valor oculto vira pontos com a cor do texto normal, não apagados: o que se
esconde é o número, e a linha continua sendo uma linha de dado. Dentro do número
grande o ponto encolhe para 0.5em, senão herdaria o corpo do título e viraria
uma fileira de bolas do tamanho do saldo.

O botão fica no **topo** do painel, junto do selo. O primeiro desenho colocou num
rodapé, e para esconder o saldo era preciso rolar o painel inteiro até o fim,
passando pelo número que se queria esconder.

## Por quê

A regra nunca foi "não mostrar número falso". Era "não mostrar número falso
**como se fosse verdadeiro**". O que corrói a confiança é a ambiguidade: uma tela
que não diz de onde veio o número ensina a desconfiar de todas as outras,
inclusive das que estão certas. Um painel que anuncia "exemplo" em três lugares
não engana ninguém e serve ao que o Jesse precisa agora, que é decidir se estes
são os resumos certos antes de alguém construir o backend deles.

Entrada e saída não se separam só por cor. O sinal `+` e `−` vem antes do valor e
o rótulo diz "Entrou" e "Saiu", porque cor sozinha deixaria a leitura dependendo
de enxergar verde e cinza.
