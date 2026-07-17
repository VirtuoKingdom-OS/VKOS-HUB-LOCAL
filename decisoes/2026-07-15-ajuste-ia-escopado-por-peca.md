# Ajuste com IA escopado por peça

## Contexto

O ajuste de site era iniciado a partir da raiz do VKOS e dependia de um texto no prompt para indicar qual arquivo deveria mudar. Além de repetir contexto na interface, isso permitia que uma instrução ambígua alcançasse outras peças ou arquivos do projeto. O carrossel ainda não oferecia a mesma experiência. No Cockpit, o atalho de edição também alterava a rota sem fechar o preview, deixando duas camadas visuais abertas.

## Decisão

Site e carrossel usam o mesmo contrato opcional `escopoPeca` ao criar uma sessão de ajuste. O frontend informa somente a pasta, o tipo e, no site, a página HTML atual. O servidor resolve e valida esses valores dentro de `conteudo/`, rejeita travessia de caminho e exige que a peça já exista.

Depois da validação, o diretório de trabalho do provedor passa a ser a pasta exata da peça. O servidor monta o prompt contextual com o Cérebro completo em modo somente de leitura, o pedido original do usuário e regras de edição mínima. A fronteira é repetida depois do pedido: somente arquivos da pasta atual podem mudar, imagens novas ficam em `img/`, caminhos absolutos, `..`, Git, instalação de dependências e comandos no projeto inteiro são proibidos. O texto do usuário não pode autorizar uma saída desse escopo.

O Studio de carrossel ganha o painel `Ajustar com IA` com modelo, progresso e recarga automática da peça concluída. Se houver edição manual pendente, o usuário confirma a gravação antes do ajuste. A TelaSite passa a usar o mesmo contrato, removendo o caminho interpolado do prompt da interface.

O botão Editar do preview de site no Cockpit primeiro fecha o portal e depois navega para a tela do site. As ações Editar e abrir em nova aba ficam agrupadas no canto direito do cabeçalho.

O HTML atual também é incluído no prompt, até 750 KB. Isso permite que o provedor identifique o seletor e prepare a alteração mesmo quando a leitura por shell falhar. Se a resposta final declarar que não conseguiu ler ou alterar, o frontend mostra o texto como erro e não apresenta uma confirmação falsa de sucesso.

Nos dois Studios, a seleção pode subir para o contêiner pai. Qualquer elemento interno pode ser excluído com confirmação, enquanto as raízes da página são protegidas. Essa hierarquia é necessária porque imagem, borda, máscara e sombra frequentemente vivem em elementos diferentes. A exclusão entra na pilha de Desfazer até a gravação; salvar limpa a pilha e torna a decisão irreversível no editor.

## Por quê

Contexto automático melhora a qualidade do pedido, mas contexto não deve significar permissão global. Fixar o diretório do processo e validar a peça no servidor cria uma fronteira independente da tela e do provedor escolhido. O mesmo contrato evita que site e carrossel evoluam com proteções diferentes.
