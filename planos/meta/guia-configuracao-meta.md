# Configurar a Meta no VKOS

Este guia prepara uma única conexão da VirtuoKingdom. Os clientes não entregam
token ao VKOS. Cada conta é compartilhada com a Business Manager e vinculada ao
workspace pelo operador.

## 1. Criar a Business Manager

1. Entre em `business.facebook.com` com a conta responsável pela VirtuoKingdom.
2. Crie o portfólio empresarial da VirtuoKingdom.
3. Em Informações da empresa, copie o ID da empresa.
4. No VKOS, abra Sistema, Conexões, Meta.
5. Cole o ID no campo `ID da Business Manager`.

Use uma conta pessoal real como administradora. Tenha pelo menos dois
administradores de confiança para não perder o acesso à empresa.

## 2. Iniciar a verificação da empresa

Faça este passo logo no começo. A análise da Meta pode levar mais tempo que a
configuração técnica.

1. Na Central de Segurança da empresa, inicie a verificação.
2. Confirme razão social, endereço, telefone e domínio.
3. Envie os documentos pedidos pela Meta.
4. Mantenha os dados do site e dos documentos iguais.

É possível desenvolver e testar com ativos próprios enquanto a verificação e a
análise de permissões estão em andamento.

## 3. Criar o App

1. Entre em `developers.facebook.com`.
2. Crie um App do tipo Business.
3. Associe o App à Business Manager da VirtuoKingdom.
4. Em Configurações, Básico, copie o App ID e o App Secret.
5. No VKOS, abra Sistema, Conexões, Meta.
6. Cole cada valor no campo com o mesmo nome e salve.

O App Secret fica somente no servidor. Ele aparece mascarado depois de salvo.
Nunca envie esse valor por mensagem ou coloque em um workspace.

## 4. Criar o usuário de sistema e o token

1. Na Business Manager, abra Configurações do negócio.
2. Em Usuários, Usuários do sistema, crie um usuário administrador.
3. Dê a ele acesso somente aos ativos que o VKOS precisa ler.
4. Gere um token para o App criado na etapa anterior.
5. Selecione estas permissões da v1:

   - `instagram_basic`
   - `instagram_manage_insights`
   - `ads_read`
   - `pages_read_engagement`
   - `read_insights`
   - `business_management`

6. Cole o token em `Token do usuário de sistema` no VKOS e salve.

Os nomes e requisitos de permissões podem mudar na Meta. Confira a lista exibida
no momento da geração e no App Review. O VKOS usa Graph API v25.0 e o botão
Testar conexão mostra qual permissão não foi concedida.

## 5. Preparar o App Review

Peça somente as permissões usadas pela leitura de métricas. Um rascunho de caso
de uso:

> A VirtuoKingdom administra marketing para empresas clientes. O VKOS lê
> métricas de perfis profissionais do Instagram, contas de anúncios e Páginas
> compartilhadas com nossa Business Manager. Os dados são usados em painéis
> privados de desempenho. A primeira versão não publica conteúdo, não cria
> anúncios e não responde comentários.

No vídeo de demonstração:

1. Mostre a Business Manager e um ativo de teste compartilhado.
2. Mostre a conexão Meta salva no VKOS, com os segredos mascarados.
3. Clique em Testar conexão e mostre as permissões confirmadas.
4. Entre em um workspace, selecione os três ativos e salve o vínculo.
5. Clique em Atualizar agora.
6. Mostre as abas Instagram, Anúncios e Facebook preenchidas.
7. Mostre que o cliente não tem acesso à configuração nem aos tokens.

Use dados de teste permitidos pela Meta. Não grave tokens ou documentos pessoais
no vídeo.

## 6. Vincular um cliente

Antes, confirme que o Instagram do cliente é profissional, do tipo Business ou
Creator, e está ligado a uma Página.

1. Na empresa do cliente, abra Parceiros e adicione a Business Manager da
   VirtuoKingdom pelo ID.
2. Compartilhe somente os ativos contratados:

   - conta profissional do Instagram;
   - conta de anúncios;
   - Página do Facebook.

3. Dê permissões de leitura e de insights.
4. No CORE, entre no workspace do cliente e abra Meta.
5. No bloco Configuração, escolha os ativos nas três listas.
6. Salve o vínculo.
7. Clique em Atualizar agora.

Um cliente pode usar apenas um ou dois produtos. Deixe os outros seletores em
Não vinculado.

## 7. Entender o teste de conexão

- `Preenchido`: o campo existe no cofre ou na conexão local.
- `Token reconhecido`: a Meta aceitou o usuário de sistema.
- `Permissão concedida`: o token contém aquela permissão.
- `Permissão ausente no token`: gere outro token com a permissão ou conclua o
  App Review exigido pela Meta.
- `Business Manager acessível`: o ID está correto e o usuário de sistema pode
  ler a empresa.
- `O token foi recusado ou revogado`: gere um token novo e substitua o antigo.
- `O ativo não existe ou não está compartilhado`: revise o parceiro, o ID e a
  atribuição do ativo ao usuário de sistema.
- `A Meta limitou as consultas`: espere e tente novamente. O coletor também faz
  uma nova tentativa automática.

## Limites desta versão

A v1 é somente leitura. Não inclui demografia, stories, criação de anúncios,
OAuth por cliente, publicação ou respostas a comentários. Esses recursos
precisam de escopo e revisão próprios antes de entrarem no produto.
