# Visão da rodada

## O problema

O Hub cresceu por acúmulo. Cada rodada somou uma tela, e ninguém nunca tirou nada. O resultado é um produto que faz muita coisa e não deixa claro qual é a coisa principal.

Três sintomas concretos:

1. **Superfície inflada.** Automações, Calendário e quatro conectores externos existem, custam manutenção e não são usados na operação real. Cada um é um caminho a mais para quebrar.
2. **Hierarquia errada.** Hoje trocar de cliente troca o Hub inteiro. Não existe um lugar de onde o dono vê tudo. CRM e Conexões vivem dentro do cliente, quando na verdade são do dono.
3. **Interface de ferramenta, não de produto.** A interface entrega poder, mas exige que o usuário saiba onde clicar. O Studio, que é onde o valor visual nasce, é a parte mais dura de usar.

## O que estamos construindo

Um produto com duas camadas claras.

**CORE.** O nível do dono. Ele abre o Hub e vê o negócio inteiro: quanto gastou com IA, quais projetos estão ativos, a lista de Workspaces, o CRM e as Conexões. É o painel de controle.

**WORKSPACE.** O nível do trabalho. Um por cliente ou marca. Cérebro, peças, sites, sessões de IA e arquivos. É a bancada.

O dono controla no CORE e produz no Workspace. Nada mais de CRM duplicado por cliente. Nada mais de conexão configurada cinco vezes.

## O que sai, e por quê

| Sai | Motivo |
|---|---|
| Modo enxuto | Toggle que não entrega efeito confiável e carrega um bug de linha de comando. Complexidade sem retorno. |
| Automações | Regras que ninguém escreveu na operação real. Custo de manutenção sem uso. |
| Calendário | Agenda própria competindo com a agenda que o usuário já tem. |
| Conectores GitHub, Netlify, Notion e Google Calendar | Integrações que existiam para alimentar publicação e agenda. Sem elas, quatro superfícies de token e de falha somem. |

Fica o conector Apify, que alimenta a busca de leads, e ele sobe para o nível CORE junto com o CRM.

## O que muda de nome

"Cliente" vira "Workspace" em toda a interface, em todo o código e em toda a documentação. Um Workspace pode ser um cliente, uma marca própria ou um projeto. O nome antigo limitava o conceito.

## O padrão visual

Referência declarada: Apple. Minimalista, com hierarquia forte, espaço generoso, tipografia como estrutura e movimento discreto que confirma a ação em vez de decorar.

Isso não é troca de cores. É refazer a linguagem da interface inteira, com design system próprio, e aplicar em todas as telas.

## Critério final

A rodada fecha quando o Jesse abre o Hub, entende o estado do negócio na primeira tela sem clicar em nada, entra em um Workspace, cria uma peça no Studio sem procurar botão, e volta ao CORE sem se perder.
