# Múltiplos Cérebros: workspaces por cliente

## Contexto

O Jesse é prestador de serviço e precisa gerenciar vários clientes/projetos no VKOS APP, cada um com seu Cérebro. O app era single-tenant: uma pasta VKOS, um canvas, um índice de contextos, uma lista de sessões e um acumulado de custos, tudo global em app/dados/.

## Decisão

1. Um workspace por cliente, e cada workspace é uma pasta VKOS completa (Cérebro, skills, templates, conteudo, materiais). As skills leem cerebro/cerebro.md relativo à pasta de trabalho e não podem ser alteradas, então o isolamento vem da pasta, não de múltiplos arquivos de cérebro numa instalação só.
2. Registro de workspaces em app/dados/workspaces.json (id, nome, pasta, datas). O estado do app passa a ser escopado por workspace em app/dados/workspaces/<id>/ (canvas.json, contextos.json, sessoes.json, custos.json, transcricoes/).
3. Migração automática no boot: o estado global antigo vira o primeiro workspace, apontando pra pasta VKOS já configurada. Nada se perde, e a migração é idempotente.
4. Sessões de IA continuam rodando quando o usuário troca de workspace. A lista exibida é filtrada pelo workspace ativo. O limite de sessões simultâneas continua global (limite de máquina, não de cliente).
5. Custo por workspace: cada cliente tem seu acumulado, o que permite repassar gasto de API por cliente.
6. Novo cliente pelo app: clonar a estrutura de uma instalação VKOS existente (skills, templates, identidade) com Cérebro em branco e conteudo vazio, pronto pra rodar /instalar.

## Por quê

Prestador de serviço opera N negócios ao mesmo tempo. Um workspace por pasta preserva o contrato das skills (zero mudança no produto VKOS), dá isolamento total por construção e permite paralelismo real: um carrossel do cliente A renderizando enquanto se edita o Cérebro do cliente B. Escopar app/dados era pré-requisito, sem isso a troca de pasta misturaria canvas, sessões e custos entre clientes.
