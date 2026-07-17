# Inicializador e pacote local do VKOS Hub

## Contexto

O produto continua local-first, mas a instalação exigia conhecimento de Node, npm, build e porta. A pasta do repositório também mistura materiais de desenvolvimento e dados que nunca podem entrar no pacote do cliente.

## Decisão

1. O MVP Windows usa dois arquivos na raiz: `Instalar VKOS Hub.cmd` na primeira vez e `Iniciar VKOS Hub.cmd` no uso diário.
2. O instalador exige Node 20 ou mais recente, instala dependências em `app/`, compila o frontend e delega a abertura ao inicializador diário.
3. O inicializador valida a identidade do VKOS Hub pela resposta de `/api/ambiente`. Uma porta ocupada por outro serviço gera erro claro.
4. `VKOS_PORT` existe como ajuste operacional e de teste. O produto continua usando 4600 por padrão.
5. A escolha e o login da IA ficam na tela `#/setup`. O hub nunca recebe nem persiste a credencial do provedor.
6. O pacote do cliente contém `app/`, `VKOS/`, os dois arquivos `.cmd` e `LEIA-ME.md`. O VKOS interno leva Cérebro em branco, skills, templates e os arquivos necessários para gerar as peças.
7. Pastas de dados, clientes, backups, Git, planos e materiais internos ficam fora. Remover arquivos privados já rastreados exige aprovação explícita do Jesse.
8. O primeiro boot registra e ativa o VKOS interno automaticamente. Escolher uma pasta não faz parte da jornada do cliente final.
9. O instalador prepara as dependências do Hub, as dependências do VKOS e o Chromium usado pelo Playwright.

## Consequências

- O primeiro uso deixa de depender de comandos digitados pelo cliente.
- O `.cmd` pode acionar SmartScreen e ainda depende da instalação do Node. Um instalador assinado com runtime embutido continua como evolução.
- A validação final de distribuição precisa acontecer numa segunda máquina Windows limpa antes do primeiro ZIP público.
