# VKOS Hub: visão do produto

> Contexto de produto. Leia isto antes de decidir qualquer coisa de escopo,
> feature ou interface. Cada linha aqui custa, então não tem enfeite.

## O que é

Um workspace multi-IA vertical. Na tela, várias instâncias de IA
trabalhando ao mesmo tempo, orquestradas. Por baixo, um monte de IA rodando.
Por cima, uma coisa só: o negócio do usuário operando.

A categoria já está nascendo no mercado. Duas referências que validaram a
direção: o AIOX-CORE (várias IAs e terminais num canvas infinito que se
conectam entre si) e o Maestri (themaestri.app, a mesma ideia, mas para
desenvolvedor). Os dois provam que "workspace que orquestra várias IAs" é uma
categoria de verdade. O VKOS Hub entra nessa categoria por um ângulo que
nenhum dos dois ocupa.

## Por que existe

Duas dores reais, não hipótese.

A dor do mercado: o prestador de serviço e o dono de negócio não querem
"unificar suas IAs". Querem o negócio funcionando. Hoje quem tenta usar IA no
negócio junta ferramenta solta, cada uma começando do zero, e vira um trabalho
a mais em vez de menos.

A dor do próprio Jesse: ele opera a VirtuoKingdom com vários chats de Claude
Code em paralelo e sente na mão a dor de orquestrar isso. Começou uma máquina
de produção de conteúdo no Instagram e quer o app como cockpit próprio. O app
serve à produtividade dele antes de servir a qualquer cliente. Se não resolve a
dor de quem constrói, não resolve a de ninguém.

## A tese

A oferta não é "junte suas IAs num canvas". É "seu negócio operando, com um
monte de IA por baixo que você nunca precisa ver". A unificação é o meio, nunca
a promessa. O usuário não deveria ver a orquestração, deveria ver resultado.

Marketing é a porta, não o teto. O ponto de entrada é um cockpit de marketing,
a dor que a VK já resolve e onde o Cérebro já roda hoje. Depois o app cresce
para outras áreas da operação. Mas ele nasce fazendo bem uma coisa que a VK já
sabe fazer, não prometendo tudo.

## A cunha defensável

O Cérebro. É o que nem o AIOX nem o Maestri têm.

O canvas deles é burro de contexto: cada IA começa do zero, sem saber que
negócio é aquele. No VKOS Hub, toda instância do workspace lê o mesmo Cérebro.
Sabe quem é o negócio, o tom, a oferta, o cliente. Não é um punhado de IAs no
mesmo quadro. É um sistema com uma memória só alinhando várias IAs.

Essa cunha não é ideia nova para construir do zero. A VK já construiu o Cérebro
no repo VKOS e ele já roda em produção. O app é a evolução dele para uma
interface onde várias IAs bebem da mesma fonte ao mesmo tempo.

## Quem é o público

O prestador de serviço e o dono de negócio que quer o negócio funcionando, não
uma nova ferramenta para dominar.

Quem NÃO é o público: o desenvolvedor. O dev já sabe orquestrar ferramenta, é o
que o Maestri atende. Vender para o dev é competir de frente com quem já está
lá. A VK entra pela lateral, por quem o dev nunca vai atender: quem não quer
saber de IA, quer saber de cliente e de agenda cheia.

## O que NÃO é

- Não é um canvas de IAs para o usuário admirar a orquestração. A orquestração
  é infraestrutura escondida.
- Não é ferramenta para dev. Se a decisão pende para agradar o dev, está errada.
- Não é "só marketing". Marketing é a porta de entrada, o app é maior que isso.
- Não é SaaS de assinatura obrigatória por padrão. A cultura da VK é
  local-first e pagamento que não prende (ver ecossistema.md). Qualquer modelo
  de cobrança respeita isso até haver motivo forte para mudar.
- Não vende aspiração. Nada de "viralizar", "enriquecer", "escalar sem
  esforço". A promessa é operacional e concreta: o negócio funcionando quando
  você não está na frente dele.

## O código é aberto desde 2026-08-06

O repositório é público sob AGPL-3.0-or-later, com licença comercial oferecida
em paralelo pelo Jesse, que detém o copyright. Ver
`docs/decisoes/2026-08-06-o-hub-vira-open-source.md`.

Isso não muda a tese nem o público. O usuário do produto continua sendo o dono
de negócio, que nunca vai clonar repositório nenhum. O que muda é o eixo de
marketing e o custo de construir: o build in public ganha um lugar onde a
construção é de fato visível, e a licença aprovada pela OSI abre a porta dos
programas de crédito de IA para projeto aberto.

A AGPL foi escolhida por cima de MIT e Apache justamente para preservar o
caminho de SaaS: qualquer um pode usar e vender, mas ninguém fecha este código
por cima e oferece como serviço sem devolver o código.

## Status

Decisão do Jesse em julho de 2026: vender o que já está pronto e continuar
iterando e construindo em cima disso, ao mesmo tempo. A base entregue (Dashboard,
Studio, Site Guiado, CRM, IDE) já gera valor e vai pro mercado agora, e o app
segue evoluindo com o feedback do uso real. O caminho pra isso é o build in
public: mostrar a construção em público como marketing do negócio.
