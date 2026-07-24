# Aba Cérebro do Negócio e tela Arquivos

## Contexto

Editar o Cérebro depois de pronto exigia a entrevista ou pedir pra IA: não havia caminho
direto do dono ajustar uma seção. E o conteúdo do workspace vivia espalhado em duas
entradas de menu (Galerias e Fontes de dados), cada uma de uma feature.

## Decisão

A aba Cérebro do Negócio mostra um card editável por seção `##` do `cerebro/cerebro.md`,
com progresso, edição inline e salvamento por seção. Os cards são uma VISTA do markdown,
nunca um armazenamento paralelo: o servidor divide e recompõe o arquivo preservando tudo
fora da seção tocada byte a byte (travado por teste de ida e volta), corpo vazio restaura
o marcador ✍️, e a gravação passa pela mesma escrita atômica com backup do PUT inteiro.
O epílogo do template (a nota depois do último separador) é bloco próprio e não aparece
nos cards. A entrevista guiada continua o caminho recomendado do zero, e a tela avisa
quando o Cérebro muda por fora durante uma edição em vez de destruir o texto do usuário.
A tela pertence à feature cockpit.

Galerias e Fontes de dados viraram a tela Arquivos, com sub-abas Criações e Fontes de
dados que reaproveitam os painéis existentes. Os ids e caminhos antigos redirecionam. A
tela abre com criador-visual OU cockpit; a sub-aba de fontes exige cockpit; com uma
feature só, abre direto na sub-aba única. As telas profundas de galeria por tipo, fonte
por tipo e Studio ficaram intactas.

## Por quê

O cerebro.md é contrato com as skills, com a guarda de geração e com a clonagem: um
armazenamento paralelo divergiria na primeira semana. A vista por seção dá edição
granular sem tocar no contrato, e o marcador restaurado mantém a heurística de
preenchido honesta. Nos Arquivos, unificar a navegação sem tocar no modelo de dados
entrega a organização pedida com risco quase zero, e os redirecionamentos garantem que
link salvo e aba antiga não quebram.
