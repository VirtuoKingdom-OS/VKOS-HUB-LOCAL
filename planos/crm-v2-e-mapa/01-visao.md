# CRM v2 e Mapa do sistema: visão

## Parte 1: o CRM que falta

O CRM atual acertou o gesto (kanban com colunas personalizáveis, cartão com campos, tags, notas, próximo contato sincronizado com a agenda). O que falta é o que separa um quadro de tarefas de um CRM de verdade. A pesquisa (Twenty pela documentação pública + fundamentos de CRM pra pequeno negócio) apontou o consenso, e o critério do Hub filtrou: tudo precisa funcionar pra um leigo total, pronto de fábrica, sem tela de configuração.

### O que entra (e por quê)

1. **Ficha de contato de verdade.** Hoje o cartão é a pessoa e o negócio fundidos. Na v2, o CONTATO é uma ficha própria: nome, empresa, telefone, email, origem, tags, e o histórico inteiro pendurado nela.
2. **Negócio separado do contato.** O mesmo cliente pode ter dois orçamentos em momentos diferentes. O kanban passa a mover NEGÓCIOS (título, valor, estágio), cada um ligado a um contato. Um contato sem negócio existe (é um relacionamento); um negócio sempre tem contato.
3. **Linha do tempo de interações.** O que mais falta hoje: registrar "liguei", "mandou mensagem", "foi na loja", em ordem cronológica, preso ao contato. As notas atuais viram interações do tipo nota, sem perder nada. É a memória do relacionamento, e é daqui que a IA vai tirar as "dores dos clientes".
4. **Tarefas simples com prazo.** "Enviar orçamento até sexta", ligada ao contato, com feito/não feito. O próximo contato (que já sincroniza com a agenda) continua sendo o compromisso; a tarefa é o miúdo do dia a dia.
5. **Duas visões do mesmo dado.** O Quadro (kanban de negócios, o de hoje evoluído) e a Lista (tabela de contatos com busca, filtro por tag e coluna, ordenação por nome, última interação ou valor). Mesmo dado, dois óculos.
6. **Aba Hoje.** A tela de abertura do CRM: follow-ups de hoje e atrasados, clientes esquecidos (sem interação há mais de 30 dias), quantos negócios abertos e quanto vale o funil. Não é dashboard de analista, é o "como estou hoje" de quem abre o app de manhã.

### O que fica de fora de propósito

Objetos customizados livres, workflows programáveis, versionamento de esquema, API, apps: é o discurso "construa seu CRM" do Twenty, poder de dev, o oposto do público do Hub. Campos personalizados ficam anotados pra rodada futura, só se doerem de verdade. Import/export CSV idem.

### As integrações continuam de pé

- O próximo contato segue no contato e a sincronização com o calendário não muda uma linha de comportamento.
- Os eventos do barramento (crm:contato-criado, movido, atualizado, excluído) continuam sendo emitidos com o mesmo formato: as automações existentes do Jesse funcionam sem retoque. Mover um negócio no quadro emite o evento com o contato vinculado e as colunas, como hoje.

## Parte 2: o CRM como contexto de IA, sem vazar

O insight do Jesse: "é uma IA rodando por baixo, eu posso pedir qualquer coisa com base em qualquer coisa que tem aqui". O problema técnico: o crm.json mora em `app/dados/workspaces/<id>/`, FORA da pasta onde as sessões rodam. A sessão não alcança o CRM sozinha, e é bom que seja assim.

A solução segue o precedente do Cérebro no ajuste confinado (contexto injetado pelo servidor quando o processo não enxerga o dado): quando o pedido de uma sessão nova citar o CRM (detecção simples da palavra no prompt), o servidor monta um RESUMO AGREGADO e injeta via `instrucoesExtras` (o mesmo mecanismo do Modo enxuto, que vira `--append-system-prompt` no Claude e bloco de regras no Codex).

O resumo traz: contagem e valor por estágio do funil, tags mais comuns, follow-ups pendentes, e as vozes dos clientes (trechos recentes de interações e notas, que é onde as dores de verdade moram). O resumo NUNCA inclui telefone nem email. E junto do resumo vai a regra escrita: use como insight pra orientar conteúdo e decisão; é PROIBIDO publicar nome, telefone, email ou qualquer dado identificável de cliente em qualquer peça. Insight agregado sim, dado pessoal nunca.

Resultado: "crie o site com base nas principais dores dos meus clientes do CRM" simplesmente funciona, em qualquer skill, sem botão novo, e sem risco de um site nascer com o telefone de um cliente no meio.

## Parte 3: o Mapa do sistema (interno, só do Jesse)

Uma tela nova que mostra o VKOS Hub como uma rede de neurônios: cada sistema é um nó com nome e uma explicação didática (com analogia, sem tecniquês), as setas mostram quem alimenta quem. Cérebro, Sessões de IA, Skills, Peças, Studios, Site Guiado, Publicação, CRM, Calendário, Automações, Barramento, Conexões, Fontes de dados, IDE, Custos, Setup. Clicou num nó, abre o painel com a explicação e com quem ele conversa.

É leitura pura: o Mapa reflete o sistema, nunca o influencia. E serve dos dois lados: o Jesse enxerga como tudo se conecta, e qualquer IA trabalhando no repo pode ler o mesmo arquivo de dados pra se orientar rápido.

### Por que os dados moram fora de `app/`

O pacote de cliente leva a pasta `app/` inteira COM o código-fonte (o instalador builda na máquina do cliente). Uma flag de build não bastaria: o arquivo com a arquitetura descrita iria junto no fonte. Por isso o desenho é outro:

- Os dados do mapa (nós, descrições, conexões) vivem em `interno/mapa-sistema.json`, na RAIZ do repo, irmão de `contexto/` e `planos/`, que já ficam fora do pacote por decisão registrada (2026-07-15, inicializador e pacote local).
- O servidor só serve o mapa se a pasta existir. Sem `interno/`, a rota responde vazio e o item some da sidebar sozinho.
- O que sobra no código do app é um visualizador genérico de nós, sem uma palavra sobre a arquitetura. Entregar isso é entregar um leitor de diagrama vazio, não o algoritmo do Instagram.

### Manutenção

O mapa é curado, não gerado. Quando uma rodada mudar a arquitetura, o fechamento atualiza o `interno/mapa-sistema.json` na linha certa (a skill /atualizar do desenvolvimento ganha essa conferência no checklist).

## Critério de fechamento da rodada

- Os cartões atuais do Jesse migram sem perder nada: cada um vira contato + negócio, notas viram interações, colunas e tags intactas, agenda e automações funcionando como antes.
- No CRM: criar contato, criar negócio pra ele, mover no quadro, registrar uma interação, criar uma tarefa, achar tudo na lista com filtro, e a aba Hoje mostrando os números certos.
- Uma sessão real com "crm" no pedido recebe o resumo injetado e usa como insight, sem dado pessoal na peça.
- O Mapa abre pro Jesse com a rede completa e didática; sem a pasta `interno/`, o item não existe na sidebar e o app funciona normal.
- Tudo nos 3 temas, typechecks e testes verdes.
