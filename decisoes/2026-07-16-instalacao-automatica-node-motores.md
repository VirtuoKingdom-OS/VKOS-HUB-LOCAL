# Instalação automática do Node.js e dos motores

Data: 2026-07-16

## Contexto

O público do VKOS Hub não deve precisar conhecer npm, PATH ou comandos de terminal para começar. O instalador parava quando o Node.js não existia e o setup apenas mostrava comandos para instalar Claude Code ou Codex manualmente.

## Decisão

- `Instalar VKOS Hub.cmd` confere se existe Node.js 20 ou mais recente.
- Se faltar ou estiver antigo, o inicializador instala `OpenJS.NodeJS.LTS` via WinGet, atualiza o PATH do processo atual e continua a instalação do Hub.
- Se o WinGet não existir ou falhar, o inicializador abre o site oficial do Node.js e encerra com orientação clara para a alternativa manual.
- O setup instala o motor escolhido por `POST /api/ambiente/instalar`, com progresso NDJSON na própria tela.
- O servidor mantém a lista fechada `claude -> Anthropic.ClaudeCode` e `codex -> OpenAI.Codex`. A interface envia apenas o provedor, nunca comando, URL ou id de pacote.
- A chamada do WinGet usa correspondência exata, origem oficial, aceite explícito dos termos e modo não interativo. Apenas uma instalação de motor roda por vez.
- Depois da instalação, a detecção é repetida antes de liberar o passo de login.
- O login continua separado e visível no programa oficial. O Hub não captura senha, token ou sessão.
- A instalação grava somente um log técnico sanitizado em `app/dados/instalacao.log`.

## Consequências

O caminho normal vira clique a clique e não exige terminal técnico. A opção manual permanece disponível para máquinas sem WinGet, ambientes corporativos bloqueados ou falhas do gerenciador de pacotes. Windows ainda pode mostrar uma confirmação administrativa conforme a configuração da máquina.
