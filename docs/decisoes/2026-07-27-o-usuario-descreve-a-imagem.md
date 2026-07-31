# O usuário descreve a imagem, e a saída nunca fecha

## Contexto

No Studio do carrossel, "Gerar outra com IA" tinha dois problemas juntos.

O primeiro: travava. O botão de fechar do painel, o botão do header que abre o
painel e o Escape estavam todos fora de combate enquanto a IA trabalhava, e o
hook de geração recusava um pedido novo com um `return` mudo. Como a tela só
saía da espera quando aparecia um erro ou o arquivo, uma recusa muda ou uma
sessão que nunca terminava deixavam o véu por cima do canvas para sempre.

O segundo: o usuário não tinha onde dizer o que queria. O único texto que
chegava ao provedor era o que a tela raspava do elemento no DOM. Quem clicava
pedia "outra imagem" e torcia.

## Decisão

Três coisas.

1. **Nenhuma saída pode ser desabilitada.** Fechar o painel de IA, pelo X, pelo
   botão do header ou pelo Escape, funciona sempre. Fechar não cancela o
   trabalho da IA: só tira o painel da tela, e o estado volta quando ele reabre.
   O véu de espera ganhou um botão "Continuar editando", que devolve a tela sem
   parar a sessão. E existe um teto de 4 minutos: passou disso sem resposta, a
   tela destrava com erro em vez de esperar para sempre.

2. **O pedido de imagem tem campo próprio, e é opcional.** O item do menu abre
   uma janela com uma área de texto. Vazia, o comportamento é o de antes, o
   fluxo rápido de quem só quer outra imagem. Preenchida, o texto do usuário
   entra no prompt e MANDA: o contexto raspado do DOM é rebaixado a apoio de
   estilo, e isso está escrito no prompt, não subentendido. A janela fecha por
   Escape, por clique fora e pelo X.

3. **A montagem do prompt saiu do hook** e virou uma função pura em
   `componentes/editor/promptImagem.ts`, com teste de verdade. O runner deste
   projeto não tem DOM, então lógica dentro de componente é lógica sem trava.

O campo mora no `ControlesImagem`, que é compartilhado, então o Studio do
carrossel e o Studio do site ganharam juntos.

## Por quê

O usuário nunca pode ficar preso numa tela por causa de um processo que ele não
controla. Desabilitar a saída durante o trabalho da IA parecia proteger o estado
e na prática transformava qualquer falha do provedor em tela morta. Estado se
protege guardando, não trancando a porta.

E gerar imagem sem poder descrevê-la é caro e frustrante: cada tentativa é uma
sessão do provedor, e sem pedido explícito a única alavanca do usuário era
clicar de novo. Deixar a descrição opcional mantém o clique único para quem só
quer variar, e dá controle real para quem sabe o que quer.
