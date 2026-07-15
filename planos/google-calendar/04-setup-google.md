# Passo a passo do Google Cloud (gesto único do Jesse)

Isso se faz UMA vez, leva uns 10 minutos e não custa nada. O resultado são duas chaves (Client ID e Client Secret) que você cola no card Google Calendar em Conexões. Depois disso, conectar qualquer conta é só clicar em Conectar e autorizar no navegador.

Aviso: telas do Google Cloud mudam de nome de vez em quando. Se algo estiver diferente, o caminho é sempre: projeto > API de Calendar ativada > tela de consentimento > credencial OAuth tipo Desktop.

## 1. Criar o projeto

1. Abra https://console.cloud.google.com e entre com sua conta Google.
2. No topo, clique no seletor de projeto e em "Novo projeto".
3. Nome: `VKOS Hub` (ou o que preferir). Criar.

## 2. Ativar a API do Calendar

1. Com o projeto selecionado, menu "APIs e serviços" > "Biblioteca".
2. Busque "Google Calendar API" e clique em "Ativar".

## 3. Tela de consentimento

1. "APIs e serviços" > "Tela de permissão OAuth" (ou "OAuth consent screen").
2. Tipo de usuário: Externo. Preencha só o obrigatório (nome do app "VKOS Hub", seu e-mail nos dois campos de contato). Salvar.
3. Em escopos, não precisa adicionar nada aqui (o app pede o escopo na hora da autorização).
4. IMPORTANTE: depois de criada, PUBLIQUE a tela ("Publicar app" / status "Em produção"). Se ficar em "Teste", o Google derruba a conexão a cada 7 dias e você teria que reconectar toda semana.
5. Na primeira autorização vai aparecer um aviso de "app não verificado". É normal (o app é seu, de uso próprio): clique em "Avançado" e "Acessar VKOS Hub". Isso aparece só na primeira vez de cada conta.

## 4. Criar a credencial

1. "APIs e serviços" > "Credenciais" > "Criar credenciais" > "ID do cliente OAuth".
2. Tipo de aplicativo: **App para computador** (Desktop). Nome: `VKOS Hub local`.
3. Criar. Vai aparecer o **Client ID** e o **Client Secret**. Copie os dois.

## 5. Conectar no hub

1. No VKOS Hub, tela Conexões, card Google Calendar.
2. Cole o Client ID e o Client Secret e salve.
3. Clique em "Conectar". O navegador abre, você escolhe a conta, aceita (com o passo do "Avançado" na primeira vez) e o hub confirma a conta conectada.
4. Pronto: as sessões de IA ganham as ferramentas de agenda e as automações passam a poder criar eventos.

## Observações

- As chaves e o token ficam SÓ no seu computador (`app/dados/workspaces/<id>/conexoes.json`), como todos os segredos do hub. Nada sobe pra lugar nenhum.
- Cada workspace (cliente) tem a própria conexão: dá pra conectar a agenda de contas diferentes por cliente.
- Custo: zero. A cota gratuita da API do Calendar é ordens de grandeza acima do uso de um CRM local.
