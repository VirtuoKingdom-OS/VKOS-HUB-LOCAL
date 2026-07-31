# As fases, em ordem

Cada fase entrega sozinha, fecha verde e vira uma versão. Nenhuma depende de contexto vivo da anterior, só do código que ela deixou.

---

## Fase 1: Amputação

**Versão alvo:** 1.1.0

**O que sai do código, do teste, do estilo e da documentação:**

1. **Modo enxuto.** `server/src/sessoes/modo-enxuto.ts`, o campo `modoEnxuto` na config e na sessão, o toggle na Sidebar, e a decisão registrada.
2. **Automações.** `server/src/automacoes/` inteira, `web/src/componentes/automacoes/`, `web/src/api/automacoes.ts`, `estilos/automacoes.css`, a rota e o item de menu.
3. **Calendário.** `server/src/calendario/` inteira, `server/src/google/` inteira, `web/src/componentes/calendario/`, `web/src/api/calendario.ts`, `estilos/calendario.css`, a rota e o item fixo da sidebar.
4. **Conectores.** As entradas `github`, `netlify`, `notion` e `googlecalendar` do catálogo, a configuração guiada de cada um, e a validação nas APIs oficiais.

**Consequência que precisa ser tratada, não ignorada:**

Publicação de site vive de GitHub e Netlify. Tirar os conectores mata a publicação em um clique. A decisão está registrada em `docs/decisoes/2026-07-26-fim-da-publicacao-integrada.md`: a geração, o preview e a edição do site continuam intactos, e a publicação é substituída por exportação local, abrir a pasta e baixar o ZIP do site pronto. `server/src/publicacao/` perde `github.ts` e `netlify.ts`, e mantém o conversor Astro e a auditoria, que passam a servir a exportação.

**Correção que entra junto:**

O bug de argumento multilinha na linha de comando, provado em 2026-07-26. Remover o Modo enxuto tira metade do problema, mas o contexto agregado do CRM viaja pelo mesmo caminho e continua quebrando `--mcp-config` e `--allowedTools` em máquina que dispara o Claude por shell. A correção é mandar as instruções extras pelo stdin, como o Codex já faz, e cobrir com teste nos dois provedores. Ver `docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.

**Barramento de eventos:** fica. Ele perde Automações e Calendário como consumidores, mas vira a fonte do feed de atividade do Dashboard na Fase 3. Sem consumidor nenhum ele seria removido. Com o Dashboard à vista, ele fica.

**Critério de saída:** o app sobe, nenhuma rota órfã responde, nenhum item morto aparece no menu, os três verdes passam e o mapa do sistema não cita mais nada removido.

---

## Fase 2: Verdade do gasto

**Versão alvo:** 1.2.0

O Dashboard da Fase 3 vai mostrar gasto de IA como número principal. Número principal errado destrói a confiança no produto inteiro. Então ele se conserta antes de ganhar palco.

**Escopo:**

1. Auditar o cálculo ponta a ponta: o que o provedor devolve em `total_cost_usd`, como `sessoes/custos.ts` acumula, como agrega por sessão e por workspace, e o que a interface mostra.
2. Conferir os casos de borda já conhecidos: turno com erro não soma, custo do Codex é estimado e não real, sessão retomada não conta duas vezes, sessão de workspace excluído não some do histórico do dono.
3. Separar o que é **medido** do que é **estimado**, e dizer isso na interface. Número estimado que se apresenta como exato é mentira.
4. Cobrir com teste cada regra de acumulação.

**Critério de saída:** dá para reconciliar o total mostrado com a soma dos turnos, e todo valor estimado está rotulado como estimado.

---

## Fase 3: HUB CORE

**Versão alvo:** 1.3.0

A mudança estrutural. Duas camadas de verdade, não só de navegação.

**Nova arquitetura de navegação:**

```
CORE
├── Dashboard          gasto de IA, projetos ativos, atividade recente
├── Workspaces         lista, criar, abrir, arquivar
├── CRM                único, do dono, com os leads
└── Conexões           Apify e configuração dos motores de IA

WORKSPACE (ao abrir um)
├── Cockpit            canvas de sessões
├── Criar              carrossel, site
├── Peças              galeria
├── Studio             edição visual
├── Cérebro            identidade do negócio
└── Arquivos           IDE
```

**Trabalho de dado, que é o risco real da fase:**

O CRM hoje é por workspace, em `app/dados/workspaces/<id>/crm.json`. Ele passa a ser único, do CORE. Isso é migração de dado, e dado do usuário é sagrado:

1. Ler o CRM de todos os workspaces existentes.
2. Fundir num CRM único do CORE, marcando cada contato e cada negócio com o workspace de origem, para nada perder a procedência.
3. Deduplicar por telefone e email, mantendo o registro mais completo e preservando o outro em histórico.
4. Nunca apagar o arquivo de origem. Ele vira backup com data.
5. Migração idempotente: rodar duas vezes não duplica.

A mesma lógica vale para Conexões, que sobem de workspace para CORE.

**Renomeação:** "Cliente" vira "Workspace" em interface, código, rota e documento.

**Critério de saída:** abrir o Hub cai no Dashboard do CORE. Nenhum contato de CRM se perdeu na migração, provado por contagem antes e depois. Entrar num Workspace não mostra CRM nem Conexões.

---

## Fase 4: Nova pele

**Versão alvo:** 2.0.0

Redesenho completo da interface, padrão Apple minimalista. Esta é a fase que mais pede pesquisa e menos pede pressa.

**Como será conduzida:**

Um agente especialista dedicado, definido em `.claude/agents/`, com três competências combinadas: design de interface, engenharia de front-end e desenvolvimento de produto. Ele pesquisa fundo antes de desenhar, usa a skill `impeccable` do sistema e trabalha em cima do que já existe, não em cima de suposição.

**Entregas, em ordem:**

1. **Auditoria da interface atual.** Inventário de toda tela, todo componente e toda inconsistência. Sem isso o redesenho vira chute.
2. **Pesquisa de referência.** Linguagem visual da Apple aplicada a software de trabalho, não a site de marketing. Hierarquia, densidade, tipografia, espaçamento, movimento.
3. **Design system.** Tokens de cor, escala tipográfica, grid de espaçamento, raio, sombra, motion. Uma camada só, sem a herança de duas camadas de CSS de hoje.
4. **Componentes base.** Botão, campo, card, tabela, modal, navegação, estado vazio, estado de carregamento, estado de erro.
5. **Aplicação tela a tela**, começando pelo CORE, que é a primeira coisa que se vê.

**Critério de saída:** toda tela usa só o design system novo, nenhuma cor hardcoded sobrou, tudo funciona em todos os temas, e `prefers-reduced-motion` é respeitado em cada animação.

---

## Fase 5: Studio

**Versão alvo:** 2.1.0

A tela mais densa do produto ganha a usabilidade que ela merece. A referência falada foi Canva, e o que isso quer dizer em concreto:

1. **Manipulação direta.** Clicar no elemento seleciona ele, arrastar move, alça redimensiona. Sem procurar o controle equivalente num painel lateral.
2. **Alinhamento assistido.** Guias que aparecem ao arrastar, encaixe em grade e em outros elementos, distribuição automática.
3. **Camadas legíveis.** Painel que mostra a estrutura real da peça, com arrastar para reordenar, renomear, esconder e travar.
4. **Desfazer e refazer de verdade**, com histórico navegável.
5. **Atalhos de teclado** para o que se repete: duplicar, deletar, agrupar, mover por pixel.
6. **Estado sempre visível.** O que está selecionado, o que mudou, o que ainda não foi salvo.

Nada disso é enfeite. Cada item ataca um gesto que hoje exige o caminho longo.

**Critério de saída:** o Jesse monta um carrossel completo no Studio sem abrir a documentação e sem pedir ajuda.

---

## Depois

Ficam fora desta rodada, anotados para não se perderem:

- Fase Meta e Google Ads, que já tinha plano guardado.
- Empacotamento e instalador para máquina de terceiro.
- Retrofit da camada de design nos workspaces reais já existentes.
