# O Assistente do Hub fica no CORE e propõe antes de executar

## Contexto

O Hub já tinha sessões de IA e criações guiadas, mas cada criação nascia ligada
ao workspace ativo e o navegador montava o prompt. Isso impedia uma conversa
central do dono capaz de organizar trabalho para vários projetos e tornava a
aprovação difícil de auditar.

## Decisão

O Assistente é uma tela do CORE. Sua conversa usa uma sessão sem workspace,
com índice, sessão, transcrição e custo persistidos em `app/dados/assistente/`.
O servidor monta o briefing e o contrato do prompt, e a sessão escreve apenas
`lote.json` em uma pasta temporária fora do projeto.

O lote é validado e convertido em tarefas de catálogo fechado. Cada tarefa leva
`workspaceId` e `workspaceNome`; o executor resolve a pasta pelo registro e
recebe `{ workspaceId, pastaVkos }` diretamente. A fila nunca ativa workspace e
nenhuma proposta é aprovada por código ou pela IA.

O estado operacional tem três subsistemas separados:

- conversa CORE, para entendimento e proposta;
- fila append-only, para aprovação, execução e falha sem retry implícito;
- rastro append-only, para efeitos do servidor e eventos selecionados do
  barramento.

O rastro não guarda narração da IA. A interface lê conversa, fila e rastro por
REST, usando o WebSocket apenas como aviso de atualização. Em telas estreitas,
as laterais viram drawers e o centro continua sendo a área de leitura.

## Por quê

Separar proposta de execução evita que uma frase ambígua crie peça ou mude um
projeto sem decisão do dono. Um alvo explícito evita que a fila produza no
workspace errado quando o usuário troca de projeto. Persistência append-only
permite reconstruir a sequência sem apagar versões anteriores, e o rastro fica
útil para investigação sem expor texto privado da IA no barramento.

## Resultado desta rodada

As fases de código, testes determinísticos, navegação, interface, documentação
e QA visual foram implementadas. A tela foi conferida pelo navegador em claro e
escuro nos breakpoints 1280x720, 1440x900 e 390x844, com dados descartáveis. A
medição com IA real prevista no plano ainda não foi executada: ela pode consumir
créditos do CLI configurado e aguarda autorização explícita para rodar em um Hub
isolado. A consolidação dos prompts existentes do wizard em reexportações
canônicas do servidor também ficou aberta, mantendo o wizard atual intacto. O
caminho de medição e as provas de isolamento já estão preparados.
