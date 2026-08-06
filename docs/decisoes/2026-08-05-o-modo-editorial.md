# O modo editorial

## Contexto

A identidade v3 fechou de manhã. A rodada de composição fechou em seguida, com a
régua da caixa. E aí o Jesse olhou a primeira versão da aba do Instagram e disse
que a UI estava péssima.

Ele estava certo, e o defeito tinha nome: **a aba tratou o Instagram como
cockpit, e Instagram não é cockpit.** O conteúdo dele é imagem. Miniatura de
40px numa lista densa é a leitura errada do material, porque o que a pessoa
reconhece numa publicação é a foto, não a legenda cortada em 80 caracteres.

Ele então pediu a tela reconstruída **sem as regras da casa**, para comparar. A
folha entrou em `PENDENTES`, com data e motivo, e a tela foi refeita com hex,
gradiente, sombra colorida, escala própria e densidade própria. Ele aprovou.

O risco era óbvio e estava escrito no próprio comentário do `PENDENTES`: replicar
aquilo tela a tela criaria a primeira de N gramáticas no mesmo app, que foi
exatamente o que o `legado.css` era antes de ser demolido.

## Decisão

**O Hub passa a ter dois registros declarados, e a fundação conhece os dois.**

**Operação densa** é o CRM, a fila, o inspetor, o canvas, a IDE, o editor. A
pessoa fica ali horas, compara linha com linha, e o que importa é caber.
Controle de 28, 32 e 40px, corpo de 14px, raio de 12px, nenhuma sombra. **Nada
disso muda.**

**Painel editorial** é o Dashboard do CORE, o Instagram, o Início do workspace.
A pessoa chega, lê quatro números e decide o que fazer. Ela não compara linha com
linha. Apertar isso em densidade de ferramenta foi o que fez as duas telas
parecerem amadoras.

O modo editorial nasce em `estilos/primitivas.css` com cinco primitivas
(`.grade-editorial`, `.cartao-editorial`, `.capa-editorial`, `.numero-editorial`,
`.numero-capa`, mais `.rotulo-caps` e `.nota-editorial`) e quatro degraus novos
em `global.css`: `--txt-numero` (40px), `--txt-numero-g` (52px), `--raio-ggg`
(20px) e `--sombra-cartao`.

### O que o experimento NÃO derrubou

Quase nada, e essa é a parte que importa.

O que fez a tela funcionar foi **escala de número, ar, forma e profundidade**,
mais o número grande. Os dois títulos que eu tinha subido para 600 e 700 eram
desnecessários: tirei os dois e a tela continuou boa.

Então a regra da v3 continua inteira: **título usa peso 400, e a autoridade dele
vem de tamanho e tracking.** O peso 700 do número já era autorizado pela própria
v3, que diz "700 SÓ número e wordmark. Ênfase de dado não é título".

Cor continua só por token. Régua de 4px continua. Teto de 280ms continua.

### O que ele derrubou, e é um item só

**A regra "não flutua, tire a sombra".**

`--sombra-cartao` é a primeira sombra de elevação em repouso do sistema, e ela
contradiz a fundação de propósito. O motivo é medido: no tema Claro, `--fundo` e
`--superficie` estão a 10 pontos de distância, e a caixa some sem ela.

Ela é **exclusiva do modo editorial**. Em tela de operação densa continua valendo
a regra antiga, e a trava continua reprovando sombra em cartão de lista, linha de
tabela e nó de canvas.

### A aba do Instagram fica fora das travas, e isso é definitivo

Depois de criar o modo editorial, eu tentei migrar a aba do Instagram para ele,
achando que dava para manter a aparência usando os tokens. **Não deu, e o Jesse
recusou na hora.**

O que se perdeu na migração, item por item: o respiro caiu de 36 para 32px, o
raio da capa de 28 para 20, o vão da grade de 20 para 16, o padding do cartão de
28 para 24, o título de seção perdeu tamanho e peso, a etiqueta de tipo perdeu o
vidro e virou sólida, e o hover da peça perdeu o salto e a sombra.

Nenhum desses itens é grande sozinho. Somados, eles são a diferença entre a tela
que ele aprovou e uma tela pior.

Então a folha volta para `PENDENTES` e **fica lá**. Esta entrada não é dívida
esperando migração: é uma exceção que o dono do produto tomou olhando as duas
versões lado a lado. Quem quiser reverter prova antes, em foto, que não perde
nada.

Junto com ela ficam de fora o gradiente da marca do Instagram e a paleta própria
da tela. **O Dashboard do CORE não copia esse gradiente:** a capa dele é carvão
com textura e menta no dado vivo, que é a marca do VKOS. Lá o gradiente funcionou
porque era a marca do conteúdo; usar ele no CORE seria vestir o Hub com a marca
de outro.

### O erro de processo, que vale mais que o de design

O Jesse pediu o CORE. Eu mexi no CORE **e** numa tela que ele já tinha aprovado,
sem ele pedir, porque me pareceu incoerente deixar as duas em registros
diferentes.

Coerência de sistema não é motivo para mexer no que já foi aprovado. Se a
incoerência incomoda, o caminho é apontar ela e perguntar, não corrigir por
conta. A regra que fica: **tela aprovada pelo dono só muda quando ele pede.**

## Por quê

**Porque a alternativa era pior das duas maneiras.** Manter a folha do Instagram
fora das travas dava uma tela bonita e um sistema com duas gramáticas. Recusar a
mudança dava um sistema coerente e duas telas que o dono do produto olha e acha
amadoras. Nenhuma das duas é aceitável.

**Porque a regra que faltava era descritiva, não corretiva.** A fundação não
estava errada: ela estava incompleta. Ela descrevia um tipo de tela e o Hub tem
dois. O experimento não provou que o sistema atrapalha, provou qual pedaço da
realidade ele ainda não tinha nomeado.

**Porque o `PENDENTES` funcionou exatamente como foi desenhado.** Ele foi criado
em 2026-07-30 como "a única forma honesta de abrir uma exceção temporária". Ele
recebeu uma folha e a devolveu no mesmo dia, com o aprendizado virando regra para
todo mundo. Ele voltou a ficar vazio, e é assim que ele presta.

## O que fica registrado como pendente

`workspace/dashboard.css` (o Início do workspace) e `setup/setup.css` são
candidatos naturais ao modo editorial e **não foram migrados nesta rodada**. Eles
continuam no modo denso, e isso é dívida conhecida, não esquecimento. A varredura
de `docs/planos/composicao-v1/06-varredura.md` é onde eles entram.

**Atualização, no fim do mesmo dia.** O Jesse pediu a mesma revolução no menu do
CORE, na tela de Workspaces, na de Assistente, no menu do workspace e no Início
deles. Com isso, `workspace/dashboard.css` saiu desta lista: o Início é editorial
desde então, e ele não ganhou capa de propósito, porque o que manda nele é
imagem. `setup/setup.css` continua aqui. A tela de Workspaces, que não estava
nomeada acima, também passou para o modo editorial na mesma rodada. Ver
[a moldura também tem registro](2026-08-05-a-moldura-tambem-tem-registro.md).
