# VKOS Hub 3.0, visão do produto

## O que é

Uma plataforma com dois lados que compartilham as mesmas features.

O VKOS HUB CORE é o painel privado do Jesse. Nele ficam os workspaces internos, o Claude pessoal e a administração de modelos, clientes, acessos, features, motores, consumo e auditoria.

O hub é o ambiente do cliente no navegador. Cada pessoa vê somente os workspaces dos quais é membro e somente as features liberadas. O cliente não vê infraestrutura, credenciais ou configuração de IA.

## Por que existe

O dono de negócio quer o negócio funcionando, não uma coleção de ferramentas de IA. O VKOS reúne Cérebro, conteúdo, site, CRM, agenda, automações e conexões num ambiente que conhece a identidade do negócio.

O diferencial continua sendo o Cérebro. Todas as features e sessões bebem da mesma fonte de verdade, em vez de começarem do zero.

## Modelo operacional

- Feature é uma capacidade modular que pode ser ligada ou desligada por workspace.
- Modelo de workspace é uma receita interna, sem login e sem dados reais.
- Workspace é uma instância viva, com pasta, membros, motor, limites e dados próprios.
- Liberar login é uma ação separada, auditada e revogável.
- O motor do cliente é Gemini no projeto do Jesse, Claude com credencial própria do cliente, ou nenhum.

## Princípios

- Dado de workspace é sagrado. Migração não descarta e arquivo corrompido vai para quarentena.
- Dado pessoal de cliente nunca entra em peça publicável.
- Geração é verificada antes de ser tratada como pronta.
- Credencial do Jesse nunca atende uma requisição do hub.
- O cliente A nunca alcança dados, eventos ou consumo do cliente B.
- O produto fala português brasileiro e funciona nos temas Escuro e Claro off-white.

## Público

Prestador de serviço e dono de negócio que quer operação pronta. Não é uma ferramenta feita para desenvolvedor admirar orquestração.

## Critério de sucesso 3.0

O Jesse entra no CORE de outra rede com TOTP, cria um modelo, materializa um workspace, libera um convite e acompanha o consumo. O cliente entra em outra máquina, usa uma feature com Gemini e vê uma feature desaparecer quando ela é desligada no CORE, sem redeploy.
