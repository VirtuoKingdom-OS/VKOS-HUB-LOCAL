# Feature Meta por workspace

## Contexto

O VKOS precisava mostrar desempenho de Instagram, Meta Ads e Facebook sem
entregar segredos ao navegador e sem fazer cada cliente passar por OAuth. A
operação da VirtuoKingdom usa uma Business Manager central e contas de clientes
compartilhadas como parceiras.

## Decisão

A feature `meta` é liberada por workspace e é somente leitura na v1. Uma
credencial central reúne App ID, App Secret, Business Manager e token do usuário
de sistema. No CORE local ela vive em `app/dados/conexoes.json`. Em produção ela
vive cifrada na tabela `credenciais_sistema`.

Cada workspace guarda apenas IDs de ativos em `meta/vinculo.json`. Um coletor
serial consulta a Graph API v25.0 diariamente às 6h ou por ação do operador,
grava snapshots no diretório compartilhado do cliente e mantém até 400 pontos
por série. As rotas do cliente leem somente esses arquivos.

Na topologia de nuvem o coletor roda no CORE. Esse processo possui a chave do
cofre, acesso de saída e o volume compartilhado `DADOS_CLIENTES`. O Hub não
recebe a chave e apenas serve os snapshots do workspace autenticado. O motor não
foi usado porque não monta o volume de dados dos clientes.

## Por quê

O modelo reduz a burocracia por cliente e mantém uma fronteira simples: segredo
no servidor, coleta fora da visita e tela baseada em dados persistidos. A coleta
serial e o backoff reduzem risco de limite da Meta. O servidor Graph falso
permite testar e demonstrar a experiência antes da aprovação da conta real.

## Fora da v1

Demografia, stories, criação de anúncios, OAuth por cliente, publicação e
respostas a comentários ficam para fases próprias. Cada item aumenta permissões,
frequência de coleta ou risco operacional e precisa de revisão separada.
