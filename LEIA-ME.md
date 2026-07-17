# VKOS Hub

O VKOS Hub é um espaço de trabalho local para criar conteúdo, sites e outras peças com IA. Ele roda no seu computador e usa a pasta VKOS do seu negócio como fonte da verdade.

## Antes de começar

Você precisa de:

- Windows 10 ou Windows 11.
- Internet durante a instalação e o uso da IA.
- O Gerenciador de Pacotes do Windows, WinGet. Ele já acompanha as versões atuais do Windows 10 e 11.
- Uma conta com acesso ao Claude Code ou ao Codex.

O instalador confere o Node.js e instala automaticamente a versão LTS quando necessário. Se o WinGet não estiver disponível, ele abre o site oficial do Node.js como alternativa.

O VKOS Hub não guarda a senha nem a credencial da sua conta de IA. O login acontece pelo programa oficial do motor escolhido.

## Instalar pela primeira vez

1. Extraia o arquivo recebido para uma pasta comum do computador. Não use o VKOS Hub de dentro do arquivo ZIP.
2. Abra a pasta extraída.
3. Dê dois cliques em `Instalar VKOS Hub.cmd`.
4. Aguarde a instalação. Na primeira vez, ela pode levar alguns minutos. O Windows pode pedir autorização para instalar o Node.js.
5. O navegador abrirá a configuração inicial do VKOS Hub.
6. Escolha Claude ou Codex. Se o programa ainda não existir no computador, use `Instalar Claude` ou `Instalar Codex` na própria tela.
7. Faça login na janela oficial aberta pelo Hub e conclua o teste. O VKOS que acompanha o produto já será conectado automaticamente.

O login não é automatizado e nenhuma senha ou token é pedido pelo Hub. Cada conta continua sendo autenticada diretamente pelo programa oficial escolhido.

## Iniciar no dia a dia

Dê dois cliques em `Iniciar VKOS Hub.cmd`. O VKOS Hub abrirá no navegador padrão.

Mantenha a pasta do produto no mesmo lugar. Se ela for movida, recrie o atalho da área de trabalho pela configuração do VKOS Hub.

## Seus dados

Os dados do aplicativo ficam em `app/dados/` no seu computador. O Cérebro, os materiais e as peças ficam na pasta `VKOS/` que acompanha o produto.

Faça cópias de segurança de `app/dados/` e `VKOS/`. Não envie essas pastas para outras pessoas depois de começar a usar, pois elas passam a conter dados do seu negócio, configurações e histórico de uso.

## Problemas comuns

### O Windows mostrou um aviso de segurança

Arquivos `.cmd` baixados da internet podem acionar o Windows SmartScreen. Confirme que a pasta veio do canal oficial ou de uma pessoa de confiança. Só então use a opção de mostrar mais informações e executar mesmo assim.

### A mensagem diz que o Node.js não foi encontrado

O instalador tenta usar o WinGet automaticamente. Se isso falhar, instale o Node.js LTS pelo site oficial aberto por ele e rode `Instalar VKOS Hub.cmd` novamente. Normalmente não é preciso reiniciar o computador.

### Claude ou Codex não foi encontrado

Volte à configuração inicial e use o botão de instalação automática. O Hub instala somente o pacote oficial fixo do motor escolhido. A opção manual continua disponível na mesma tela. Se a instalação terminar mas o programa não for reconhecido, feche e abra o VKOS Hub uma vez para o Windows atualizar o caminho dos programas.

Se continuar falhando, consulte `app/dados/instalacao.log`. Esse arquivo registra somente o andamento técnico da instalação, sem senha ou token.

### O login não foi reconhecido

Conclua o login na janela aberta pelo VKOS Hub. Depois, volte ao navegador e use a opção de verificar novamente. O VKOS Hub nunca pede que você cole sua senha.

### O navegador não abriu ou a porta 4600 está ocupada

Feche outro VKOS Hub que esteja aberto e tente iniciar novamente. Se outro programa estiver usando a porta 4600, feche esse programa antes de tentar de novo.

### A tela não mostra a versão mais recente

Feche a aba do navegador, encerre a janela do VKOS Hub e rode `Iniciar VKOS Hub.cmd` novamente.

## Ajuda

Se o problema continuar, fale com a pessoa ou equipe que forneceu o VKOS Hub. Envie uma captura da mensagem de erro, mas nunca envie senhas, tokens, a pasta `app/dados/` ou a pasta de um cliente.
