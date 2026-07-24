# VKOS 3.0, features como legos e modelos de workspace

## O manifesto de feature

Cada capacidade vira um módulo com um manifesto declarativo. O manifesto é o contrato que permite ligar e desligar sem quebrar nada:

```ts
interface ManifestoFeature {
  id: string                    // "crm", "site-guiado", "criador-visual"
  nome: string                  // nome exibido no menu
  descricao: string
  telas: string[]               // rotas de hash que a feature registra
  rotasApi: string[]            // prefixos de rota no servidor
  eventosEmitidos: string[]     // ex.: "crm:contato-movido"
  eventosConsumidos: string[]   // ex.: "peca:criada"
  dependeDe: string[]           // features que precisam estar ativas junto
  usaIa: boolean                // se false, funciona até com motor "nenhum"
  disponivelParaCliente: boolean // false = exclusiva do CORE
}
```

Regras:

- Feature desligada: telas fora do menu, rotas de API respondendo 404 para aquele workspace, eventos dela silenciados.
- `dependeDe` é validado na hora de montar o modelo. Exemplo: Automações depende do barramento, follow-up do CRM no Calendário exige os dois ativos. Se a dependência faltar, o CORE avisa na tela de montagem.
- Eventos entre features ativas continuam fluindo pelo barramento atual. É isso que mantém o sistema interconectado como o hub de hoje.
- `usaIa: true` com motor `nenhum` no workspace: os botões de IA da feature somem, o resto continua funcionando (um CRM sem IA ainda é um CRM).

## Inventário das features na largada

Extraídas do que já existe, sem reescrever comportamento:

| id | nome | usa IA | para cliente |
|---|---|---|---|
| cockpit | Cockpit (canvas, sessões, Cérebro) | sim | sim |
| cerebro | Cérebro e cerimônia | sim | sim |
| criador-visual | Criador de Conteúdo Visual (carrossel, stories, Studio) | sim | sim |
| site-guiado | Site Guiado, Studio de Site e publicação | sim | sim |
| crm | CRM (contatos, funil, interações) | opcional | sim |
| leads | Buscar leads (Apify) | não | sim |
| calendario | Calendário | não | sim |
| automacoes | Automações (regras sobre o barramento) | não | sim |
| conexoes | Conexões (GitHub, Netlify, Notion, Apify, Google) | não | sim |
| ide | IDE como camada universal | sim | a decidir por workspace |
| fontes | Fontes de dados (anexos) | não | sim |
| admin | Administração (modelos, clientes, consumo, auditoria) | não | não, só CORE |

Futuras (o encaixe já existe pelo manifesto, sem tocar no núcleo): whatsapp, instagram, analytics, estoque, financeiro.

## Modelo de workspace (a receita)

Um modelo é um registro em `modelos_workspace`:

- nome e descrição ("Automobilístico", "Prestador de serviço", "Marca pessoal")
- lista de features ativas, cada uma com config inicial opcional
- motor padrão (`gemini` | `claude_team` | `nenhum`)
- conteúdo semente opcional: um template de pasta (o vkos2 atual é o primeiro), skills, camada de design

Modelo não tem login, não tem dados, não custa nada parado. É catálogo.

## Workspace de cliente (a instância)

Criar workspace a partir de um modelo faz, em uma transação:

1. Cria o registro em `workspaces` com o motor herdado do modelo (alterável depois).
2. Copia as flags do modelo para `features_workspace` (a partir daqui são independentes: mudar o modelo não muda workspaces já criados).
3. Materializa a pasta `/dados/clientes/<id>/` a partir do conteúdo semente.
4. Registra tudo na auditoria.

Liberar login é ação separada: o CORE gera um convite (link com expiração) para o email do cliente, o cliente define a senha no primeiro acesso e vira membro do workspace. Um workspace pode existir semanas sem login nenhum (o Jesse montando tudo antes de entregar).

## A diferença que o Jesse pediu pra deixar explícita

- **Criar modelo**: trabalho de catálogo, interno, sem cliente envolvido. Erros aqui não afetam ninguém.
- **Criar workspace de cliente**: provisionamento real, com pasta, motor e custo potencial. Ganha auditoria completa.
- **Liberar login**: a única ação que expõe algo pra fora. Convite com expiração, papel definido, revogável a qualquer momento pelo CORE.

Três ações distintas, três telas distintas no CORE, três eventos distintos na auditoria.

## Interface no CORE

- Tela Modelos: lista, criação e edição de modelos com as features em interruptores e validação de dependência ao vivo.
- Tela Clientes: lista de workspaces de clientes com status, motor, consumo do mês e atalhos (abrir como operador, gerenciar logins, suspender).
- Detalhe do workspace: interruptores de features com efeito imediato no hub do cliente, escolha de motor, limites de custo, membros e convites.
- O CORE pode "abrir como operador" qualquer workspace de cliente para dar suporte, com registro na auditoria.
