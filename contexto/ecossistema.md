# VKOS Hub no ecossistema VK

> Onde o app se encaixa. O app não nasce sozinho, ele estende um sistema que já
> existe e roda. Leia para o app conversar certo com o resto.

## As três engrenagens da VK, nesta ordem

1. Serviço done-for-you: o caixa de agora. A VK monta presença para o cliente
   (combo de estreia site + Google + carrosséis, R$597, pago após entrega). É o
   que paga a construção de tudo, inclusive deste app.
2. Conteúdo e audiência: a marca pessoal OJESSEGOMES, posicionamento "operador
   que constrói com IA". Alicerce de inbound, em produção.
3. VKOS produto: escala por último, depois de caixa e audiência.

O concorrente real da VK não é outra ferramenta, é o anonimato. Por isso a
ordem: caixa por serviço primeiro, audiência depois, produto por último. O
VKOS Hub é a evolução do produto, então vive na terceira engrenagem, sem
pressa, sendo provado na operação antes de virar oferta.

## O que é o VKOS hoje (o produto que o app estende)

VKOS = VirtuoKingdom Operational System. Um OS de marketing completo, entregue
como repositório GitHub que o comprador clona e roda com Claude Code. Está na
v1.0 oficial, à venda a R$67 (pagamento único, checkout Cakto) ou implementação
sob diagnóstico.

O mecanismo central é o Cérebro: o arquivo `cerebro/cerebro.md`, a identidade do
negócio em 13 blocos, preenchido pelo comando `/instalar`. A regra de ouro do
VKOS é que todo comando lê o Cérebro antes de gerar. Por isso tudo sai com a
cara do negócio, nunca genérico. Essa é a mesma ideia que vira a cunha do app.

Tem cerca de 27 skills em módulos:
- Núcleo: `/instalar`, `/cerebro`, `/vkos`, `/atualizar`, `/evoluir`
- Descoberta: `/ikigai`, `/posicionamento`
- Visual: `/estilo`
- Conteúdo: `/semana`, `/ideias`, `/carrossel`, `/stories`, `/legenda`, `/titulo-gancho`
- Perfil: `/bio`, `/destaques`, `/perfil`
- Site: `/site`, `/landing`, `/blog`
- Google e Local: `/google`, `/avaliacoes`, `/seo-local`
- Anúncios e Funil: `/anuncio`, `/criativo`, `/funil`
- Escrita: `/humanizer`

Estrutura de pastas autoexplicativa (marca/, identidade/, materiais/,
conteudo/), cada uma com um LEIA.md. Renderiza carrosséis de HTML para PNG via
Playwright, com 9 templates próprios (VKOS01 a VKOS09), 1080x1350.

Modelo de cobrança do VKOS: pagamento único mais upgrades opcionais, nunca
mensalidade obrigatória, local-first (a VK não hospeda o contexto do cliente).
O app deve respeitar essa cultura até haver motivo forte para mudar.

Desde 2026-07-16 existe o VKOS 2 (`vkos2/` na raiz, fora do versionamento):
o VKOS puro com as melhorias de `outros/` fundidas no sistema. Cérebro em
branco pronto pro /instalar, cartela de 20 direções em templates/design/,
principios-visuais em todos os formatos (carrossel, stories, site), /site e
/landing com construção opcional em HTML, e as skills novas /revisar-design,
/refinar, /enxuto, /enxuto-revisao e /projeto (projetos livres além do
marketing). Mantém o contrato de pasta do Hub. Ver decisoes/2026-07-16-vkos2.md.

## A relação app - repo VKOS

O "Workspace" (painel web de CRM, vendas e relatórios) sempre esteve marcado
como "em breve" dentro do VKOS, e ficou deferido. O VKOS Hub é a evolução dessa
ideia deferida, agora repensada como workspace multi-IA, não só painel.

O que o app herda do repo:
- O Cérebro como fonte de contexto. O app não reinventa isso, consome o mesmo
  conceito para alimentar todas as instâncias de IA do workspace.
- O acervo de skills de marketing. O cockpit de marketing do app fala com o que
  o repo já sabe fazer.
- A cultura: ler o Cérebro antes de gerar, escrita humanizada, dor concreta,
  nada de genérico.

O que muda: o repo é uma pessoa rodando comandos em série no Claude Code. O app
é várias IAs em paralelo, coordenadas, com uma interface por cima. O repo prova
o mecanismo, o app o escala para uma experiência de operação.

## Princípios de posicionamento (valem para o app)

- Vender por credibilidade de operador: mostrar o sistema funcionando de
  verdade, nunca posar de influencer. A VK já opera com o próprio VKOS, o app
  deve nascer da mesma prova.
- Atacar dor operacional concreta: "faço tudo no improviso", "sou só eu e não
  dou conta", "meu negócio para quando eu paro". Nunca aspiração vazia. As
  palavras "viralizar" e "enriquecer" são proibidas.

## A prima do app: sócio operacional de IA

Ideia futura guardada, meta de R$50k de MRR. Um SaaS para o profissional que é
ótimo no ofício e péssimo no negócio. A cunha dela é cobrança automática por voz
ou foto, e o conceito é um Cérebro de operação (dinheiro, back-office) no lugar
do Cérebro de marketing.

Por que importa para o app agora: esse módulo de operação e dinheiro pode um dia
plugar no VKOS Hub. Então arquitete o app sabendo disso. O Cérebro do app não é
só de marketing por natureza, é o contexto do negócio. Se amanhã entrar uma
área de operação financeira, ela deve caber sem reescrever o núcleo. Marketing é
a porta, a operação inteira do negócio é o destino.
