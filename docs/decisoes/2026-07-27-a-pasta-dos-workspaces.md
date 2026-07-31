# A pasta dos workspaces

## Contexto

Criar um workspace pedia uma pasta. O usuário abria um navegador de pastas,
escolhia um caminho, e o frontend montava `<pasta escolhida>/<slug do nome>`
antes de mandar pro servidor. Duas dores nisso:

1. **A pergunta não tinha resposta boa.** O público do Hub é dono de negócio,
   não desenvolvedor. Ele não tem opinião sobre onde a pasta do cliente vai
   morar, e cada resposta diferente espalha os clientes pelo disco.
2. **A composição do caminho morava no frontend**, em dois componentes com o
   mesmo slug copiado (`SeletorWorkspace.tsx` e `TelaWorkspaces.tsx`). O
   servidor recebia o caminho pronto e obedecia. Nada disso tinha teste:
   `clonagem.ts`, `criarWorkspaceNovo` e `prepararDestino` não eram cobertos por
   nenhum arquivo de teste.

Na prática, os dois workspaces de cliente tinham caído soltos na raiz do
projeto, `jdv/` e `mae-pixel/`, e nenhum dos dois estava no `.gitignore`. Eram
dois Cérebros de cliente a um `git add .` de entrar num repositório. Esse
acidente exato já aconteceu aqui: a decisão `2026-07-27-onde-as-coisas-moram.md`
conta os 129 arquivos de `estudio-aura/` e `ojessegomes/` que entraram no commit
`7ac5048`, e lembra que `.gitignore` não desrastreia o que já entrou.

## Decisão

**Todo workspace nasce em `<raiz do projeto>/workspaces/<slug do nome>`.** O
servidor monta o caminho, o usuário só digita o nome.

- `workspaces/pastas.ts` é dono do assunto: `raizWorkspaces(raiz?)`,
  `slugWorkspace(nome)` e `destinoPadraoWorkspace(nome, raiz?)`. A raiz é
  parâmetro opcional com default `raizProjeto()` só por testabilidade:
  `raizProjeto()` é constante e aponta pro projeto real, então teste que
  dependesse dela mexeria em pasta de verdade.
- `POST /api/workspaces/novo` passa a aceitar `{ nome, pastaDestino? }`.
  `pastaDestino` presente continua valendo inteira, como válvula de escape pra
  quem guarda cliente em outro disco. A resposta não mudou.
- Nome que viraria slug vazio (só emoji, só símbolo) cai em `workspace`, pra
  nunca gerar pasta sem nome. Nome que colide com pasta já existente e cheia
  responde 400 "Ja existe um workspace com esse nome", não "a pasta destino
  precisa estar vazia": quem digitou um nome não escolheu pasta nenhuma.
- `/workspaces/` entra no `.gitignore` da raiz. A barra inicial é obrigatória:
  sem ela o padrão engoliria `app/server/src/workspaces/`, que é código do
  server. É o mesmo cuidado que o comentário do `/vkos/` já documentava.
- `migracaoPastas.ts` roda no boot, depois de `migrarSeNecessario()` e antes de
  `garantirWorkspaceIntegrado()`, e recolhe pra `workspaces/` o que já estava
  solto na raiz. Idempotente por disco, não por número de versão: o que já está
  dentro de `workspaces/` não está mais diretamente na raiz.
- O `config.json` passou a obedecer `VKOS_DADOS_TESTE`, como o registro de
  workspaces já obedecia desde a decisão de isolamento. Sem isso, qualquer teste
  que ativasse um workspace gravaria a pasta temporária dele no `config.json` de
  verdade, e o app do Jesse abriria apontando pra uma pasta que já sumiu.

O que a migração **não** faz, de propósito:

- **Não move o VKOS integrado.** O `integrado.ts` faz `resolve(pastaApp, "..")`
  e procura `VKOS/` ao lado de `app/`, por caminho. Mover quebraria o boot do
  pacote que o cliente extrai, pra ganhar arrumação nenhuma.
- **Não move pasta que está fora da raiz do projeto.** Cliente guardado em outro
  drive, no Documentos ou num disco de rede é escolha do usuário, e o registro
  guarda caminho absoluto: continua funcionando onde está. Migração que sai
  arrastando pasta pelo disco do dono é dano, não arrumação.
- **Não copia quando o rename falha.** A pasta de um workspace clonado tem uma
  junction de `node_modules` (ver `clonagem.ts`). Cópia recursiva de junction ou
  duplica um `node_modules` inteiro ou segue o link e copia a origem. Rename que
  falha vira aviso no console, a pasta fica onde está e o boot segue.

## Por quê

O ganho de produto é tirar uma pergunta que o usuário não sabe responder. O
ganho de arquitetura é a regra do caminho morar num lugar só, no servidor, com
teste: dois componentes de frontend com o mesmo slug copiado é uma divergência
esperando acontecer.

Mas o motivo que decidiu é de segurança. Um produto que promete que o dado do
cliente não sai da máquina não pode deixar o Cérebro de dois clientes solto na
raiz do próprio repositório, fora do alcance do `.gitignore`, dependendo de o
próximo `git add` ser seletivo. Com uma casa fixa, a regra do `.gitignore` é uma
linha só e cobre todo cliente que nascer daqui pra frente, inclusive os que
ninguém lembrou de listar.

Duas coisas custaram sangue e ficam registradas. A primeira: a pasta ativa vive
em DUAS fontes sincronizadas, o campo `pasta` no `workspaces.json` e o
`pastaVkos` no `config.json`. Atualizar só uma abre o app apontando pra uma
pasta que não existe mais. A segunda: a junction de `node_modules` guarda
caminho absoluto, então quando duas pastas mudam de casa juntas, o link de uma
pra outra fica pendurado no vazio. O rename preserva a junction, mas não
conserta o alvo dela. Foi o que aconteceu de verdade aqui, com o `mae-pixel`
apontando pro `node_modules` do `jdv`: a migração agora religa as junctions
mortas depois de mover, e há teste provando.
