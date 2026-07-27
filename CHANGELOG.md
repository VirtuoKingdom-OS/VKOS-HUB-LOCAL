# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
O VKOS Hub Local segue [versionamento semântico](https://semver.org/lang/pt-BR/).

## [1.4.0] 2026-07-27

O HUB CORE. O Hub deixou de ter um nível só: agora existe o CORE, onde o dono opera o negócio dele, e o workspace, onde cada projeto é feito. Trocar de workspace parou de trocar o Hub inteiro.

### Adicionado

- **Dashboard do CORE**, a tela principal e a primeira que abre. Duas coisas: o gasto com IA e os projetos ativos. O gasto é o total de todos os workspaces, inclusive os já removidos, sai sempre marcado como estimativa (com assinatura nenhum dólar é cobrança real) e se declara um piso, com o número de turnos, quando algum turno consumiu crédito sem preço conhecido.
- **Série do gasto dos últimos 14 dias**, com a leitura que justifica ela existir: a semana corrente comparada com a anterior. Dia com turno sem preço aparece listrado em vez de cheio, porque a barra dele também é um piso.
- **Projetos ativos com critério declarado na tela.** "Rodando" é ter sessão de IA em voo neste instante. "Ativo" é ter tido turno de IA ou ter sido aberto nos últimos sete dias, e abrir um workspace conta mesmo sem gastar IA.
- **Tela de Workspaces**, no nível CORE: a lista de projetos com o gasto de cada um, o estado de atividade e o último trabalho, mais criar, adicionar, renomear e remover. Antes isso só existia dentro de um popover na sidebar.
- **Sidebar em duas seções**, Core e Workspace, com o seletor de workspace dentro da seção Workspace. No topo, acima de tudo, ele dizia visualmente que trocar de cliente trocava o Hub inteiro.
- `GET /api/core/resumo`, com a decisão isolada num módulo puro e testada sem DOM.

### Alterado

- **Conexões subiu para o nível CORE.** A conta da Apify é do dono do Hub, não do cliente atendido: o token é digitado uma vez e vale em todos os projetos. Antes ele precisava ser colado de novo a cada cliente, e a busca de leads parava ao trocar de projeto. A migração roda uma vez, em ordem determinística, grava antes de renomear e nunca apaga a origem. Conflito entre dois projetos não é resolvido em silêncio: vira anotação, e nenhum valor de token entra nela.
- **"Cliente" virou "Workspace"** em tudo que o usuário lê, no app e nas mensagens do servidor. A palavra continua no CRM, onde ela significa cliente de verdade.
- **A tela de trabalho do projeto virou `#/inicio`.** Ela era o Dashboard: saudação, criação guiada e criações recentes. Criar peça é trabalho de projeto, então mora dentro do workspace, e cancelar uma criação volta para lá em vez de jogar a pessoa no nível de cima.
- `SECURITY.md` corrigido: a garantia de que excluir um workspace apaga os segredos dele parou de descrever o produto quando o token subiu para o CORE. Agora estão separadas as duas coisas, o que é do projeto e o que é do dono.

## [1.3.0] 2026-07-27

O CRM reconstruído por inteiro, o chat de conversas, e o gasto de IA medido em vez de suposto. A base estava vazia, então reestruturar o dado custou zero agora e custaria migração de risco depois.

### Adicionado

- **Modelo do CRM versão 4.** Interações e histórico de estágio saíram do `crm.json` para arquivos append-only ao lado. Antes, registrar uma interação reescrevia a base de contatos inteira e travava o event loop junto com as sessões de IA e o WebSocket. Organização e Orçamento viraram entidades. Coluna ganhou tipo semântico (aberto, ganho, perdido) e prazo de apodrecimento. Negócio ganhou status, próxima ação, escopo e recorrência. Tarefa saiu de dentro do contato.
- **O CRM subiu para o nível CORE.** Ele é o funil comercial do dono, não do cliente: nenhum workspace tem CRM. Abre sempre, com ou sem cliente aberto. A fusão preserva a procedência de cada contato, funde coluna por nome, desempata id repetido corrigindo toda referência, e nunca apaga: a origem vira `.migrado-para-core`.
- **CRM ao vivo.** Duas janelas param de divergir. Aviso leve pelo WebSocket, sem dado de contato dentro, com escopo separado para o funil e para as interações.
- **Módulo de mensagens com o canal manual completo**, e contrato de canal pronto para o WhatsApp entrar sem reescrita. Conversa não existe sem contato: número desconhecido cria o contato primeiro, senão o Hub vira uma segunda caixa de entrada paralela ao funil.
- **Chat de três painéis** como aba do CRM. O painel de contexto opera negócio, orçamento, próxima acão e tags sem sair da conversa.
- **Registro de custo por turno** em `custos.jsonl`, append-only, com sessão, modelo, se foi retomada e o motivo de não ter preço. É a única forma de investigar um pulo no total.
- Rota que devolve o último toque de todos os contatos numa requisição, para o bloco "Esfriando" parar de chutar.

### Corrigido

- **O Codex reportava o acumulado da thread e o Hub somava a cada retomada.** Medido rodando o CLI: saída de 40, 62 e 80 tokens para três respostas de uma letra. No terceiro turno o Hub contava 74534 tokens de entrada onde o consumo real era 37284. O laço de conformidade de site retoma sozinho até duas vezes, e todo "Ajustar com IA" retoma, então o erro composto era regra, não exceção.
- **Custo desconhecido aparecia como zero**, que é a pior mentira possível: some do total e ninguém percebe. Modelo fora da tabela de preços, Claude sem valor numérico e processo morto no meio agora contam como turno sem custo conhecido, e a tela mostra o total como piso.
- **Excluir um cliente apagava o gasto histórico dele.** Agora o gasto é absorvido para o nível CORE antes da pasta sumir.
- **No Claude, os tokens da tela contavam menos do que o dólar cobrava.** O campo de uso do topo cobre só a última iteração do turno; o valor em dólar sai de outro campo, que cobre todas as chamadas de modelo.
- **O stream das sessões de IA ia em broadcast para todas as abas**, carregando o Cérebro do cliente e trechos de arquivo lido, e quem filtrava era o frontend. O servidor decide o escopo agora. O elo que faltava só aparece rodando: o frontend não declarava workspace nenhum no upgrade.
- **A camada oficial de tema não era a última palavra.** Conferido no CSS construído: as folhas de tela venciam por chegarem depois, e as telas carregadas sob demanda são piores, porque o navegador injeta o link delas depois de tudo. Agora são quatro camadas declaradas com `@layer`. Medição com navegador nos três temas: 98 seletores mudaram, todos previstos, e os 58 em que o tema perdia foram a zero.
- **Telefone duplicava cliente.** A normalização só removia não-dígitos, então o mesmo número em dois formatos virava duas chaves. Agora é E.164, numa regra única do Hub.
- **A chave técnica do lead morava num campo editável.** Editar "como chegou até você" quebrava a deduplicação em silêncio.
- **O contador da tela do dia mentia**, porque o corte de dez itens era aplicado antes da contagem. O funil somava ganho, perdido e aberto no mesmo número. O follow-up nunca fechava ao registrar interação. E a ficha perdia o que estava digitado ao apertar Esc.
- **O apodrecimento por estágio não dispara quando existe próxima ação futura.** É um bug conhecido do Pipedrive, que enche a tela de alerta de gente que já tem reunião marcada.
- Ícone do aviso de leads usava um token nunca declarado em tema nenhum, então herdava a cor do texto e sumia.

### Segurança

- **A promessa do `SECURITY.md` virou código.** Ele garantia que o resumo do CRM vai para a IA com proibição explícita de publicar dado identificável, e essa instrução não existia no texto injetado. Agora vai no topo, antes do primeiro número, com teste afirmando o texto literal.
- **O `README.md` prometia que nome nunca chega ao contexto da IA.** Chega: o primeiro nome vai em cada linha de "Vozes dos clientes", de propósito, senão o conselho fica inútil. A documentação passou a dizer a verdade. Telefone e email continuam apagados por limpeza automática. Ver `decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`.

### Interno

- **A fronteira de tipos entre web e servidor virou uma definição só.** O web declarava a própria cópia das entidades do CRM, então o servidor subiu para a v4 com o typecheck do web verde e a tela quebrada. Provado: renomear um campo no servidor agora gera 19 erros de compilação, contra zero antes.
- Teste que provava a função de absorção de custo, mas não que a rota de exclusão a chamava. Função testada que ninguém chama é o mesmo que função quebrada.
- 361 testes no servidor e 102 na web, contra 139 e 29 quando o repositório nasceu.

## [1.2.0] 2026-07-26

Checkup de ponta a ponta logo depois da amputação: seis auditorias em paralelo mais teste de fumaça com o servidor no ar. Esta versão é o conserto do que elas acharam. Nada de funcionalidade nova.

### Segurança

- **O WebSocket aceitava conexão de qualquer origem.** Provado ao vivo: um cliente se passando por `https://site-malicioso.com` conectou. A guarda de Host não alcança esse caso, porque o navegador manda Host local e WebSocket é isento de CORS. O broadcast carrega o stream das sessões de IA, ou seja, Cérebro, resumo do CRM e trechos de arquivo lidos: qualquer site aberto numa aba recebia tudo. O upgrade agora é recusado com 403 antes de virar WebSocket. Origem ausente continua aceita, porque cliente fora do navegador não manda o header e site malicioso não consegue forjá-lo.
- **Exportar virou POST.** A rota levanta navegador, roda auditoria em duas viewports e pode disparar `npm install` e `astro build`. Em GET, uma tag `<img src>` em qualquer página aberta disparava tudo isso na máquina do usuário.

### Corrigido

- **Quarentena de arquivo corrompido em nove módulos.** A proteção existia só no CRM, onde nasceu de uma perda total. Registro de clientes, token da Apify, transcrições, custos, canvas, índice de contextos, publicações, config, pasta ativa e a lista de sessões repetiam o mesmo padrão: liam, engoliam o erro, devolviam vazio, e a próxima gravação persistia o vazio por cima do original. Agora o original vai para `<nome>.corrompido-<data>` e nunca é sobrescrito. Onde perder o dado é pior que a tela não abrir, a leitura falha fechado com 409.
- **Exportação virava beco sem saída em máquina sem Chrome nem Edge.** A conferência visual não roda e devolve reprovado com zero erros. O campo `verificavel` era descartado, então a tela dizia "o site precisa de correção", não listava correção nenhuma e travava o botão. Conferência que não rodou agora libera a exportação.
- **A tela prometia o que o ZIP não entregava.** O selo anunciava sitemap, mas `prepararAstro` é chamado sem URL pública, então ele nunca é gerado. Texto corrigido.
- **Os avisos do fallback Astro apareciam para ninguém.** Saíam só num evento que nenhum código do frontend assinava. Agora viajam em header e chegam na tela, com o motivo real da queda para HTML puro.
- O registro da exportação só grava depois do ZIP sair inteiro. Antes marcava a peça como exportada mesmo quando o download morria no meio.
- `finalize` com `catch`, senão a Promise rejeitada derruba o processo no Node 24.
- `revokeObjectURL` fora do tick do clique, que cancelava o download em alguns navegadores.

### Documentação

- `contexto/arquitetura.md`, `contexto/roadmap.md`, `app/CONTRATO.md` e `interno/resumo-contexto.md` reconciliados com o código real. Eles são lidos no início de toda sessão e ainda descreviam Automações, Calendário, camada Google, os quatro conectores e a publicação integrada como recursos ativos. Seção removida agora leva marcador explícito em vez de sumir, para quem lê entender que foi de propósito.
- Checkup completo registrado em `planos/vkos-hub-local-v1/03-checkup-2026-07-26.md`, com evidência de arquivo e linha.

### Qualidade

- 207 testes no servidor, contra 139 no início da rodada. 29 na interface.
- Verificado ao vivo com o servidor no ar: 20 de 20 rotas GET em 200, rotas removidas em 404, 8 tentativas de travessia de caminho bloqueadas, barreira de qualidade da exportação segurando site reprovado, e quarentena provada corrompendo um arquivo real e restaurando o backup depois.

## [1.1.0] 2026-07-26

Amputação. O produto perde a superfície que existia, custava manutenção e não era usada na operação real. Cada coisa removida era um caminho a mais para quebrar.

### Removido

- **Modo enxuto.** O toggle prometia economia de token e podia não entregar nada. Módulo, campo de config, campo na sessão, toggle da sidebar e CSS, tudo fora.
- **Automações.** Regras que nunca foram escritas na operação real.
- **Calendário** e toda a camada Google, incluindo o servidor MCP próprio e o fluxo OAuth.
- **Conectores GitHub, Netlify, Notion e Google Calendar.** O catálogo de conexões ficou só com a Apify, que alimenta a busca de leads.
- **Publicação integrada de sites.** Ver `decisoes/2026-07-26-fim-da-publicacao-integrada.md`.

### Adicionado

- **Exportação local de site**, no lugar da publicação. `POST /publicacao/:pasta/abrir-pasta` abre a pasta da peça no explorador do sistema, e `GET /publicacao/:pasta/exportar` baixa o site pronto em ZIP. Quando o build Astro é viável, sai o projeto compilado; quando não, sai HTML puro, com o mesmo aviso honesto de antes.
- Primeiro teste do provedor Claude. `montarArgsClaude` virou função exportada, e sete testes garantem que nenhum argumento carrega quebra de linha.

### Corrigido

- **Instrução extra de sessão chegava truncada, em silêncio.** O contexto agregado do CRM e a regra de sessão iam como argumento `--append-system-prompt`. Em máquina onde o Claude é disparado por shell, o caso da instalação por npm ou do fallback pelo PATH, o `cmd.exe` cortava na primeira quebra de linha: dos 2078 caracteres chegavam 13, e `--mcp-config` e `--allowedTools` sumiam junto, sem erro e com código de saída 0. Agora as instruções vão pelo stdin nos dois provedores. Ver `decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.
- **Teste que passaria com o código apagado.** O teste do contexto do CRM afirmava só os marcadores em volta, nunca o conteúdo injetado. Agora afirma o conteúdo.

### Mantido de propósito

- O barramento de eventos fica, mesmo perdendo Automações e Calendário como consumidores. Ele vira a fonte do feed de atividade do Dashboard.
- O conversor Astro segue gerando `netlify.toml` no projeto exportado, para o site sair pronto para publicação manual, sem credencial nenhuma passar pelo Hub.

## [1.0.0] 2026-07-26

Marco zero do VKOS Hub Local como produto próprio, em repositório privado com licença, contrato de contribuição e política de segurança. A base de código vem do VKOS Hub 2.0.0 mais a rodada de 21 de julho, o último estado local-first antes da tentativa de nuvem, que foi arquivada.

### Adicionado

- Business Source License 1.1 com atribuição obrigatória em `NOTICE`. Uso em produção exige licença comercial. Cada versão vira AGPL-3.0-or-later quatro anos após publicada.
- `CONTRIBUTING.md` com o fluxo de rodada, o portão de qualidade e as regras de escrita e de código.
- `SECURITY.md` com modelo de ameaça local-first, garantias do produto e o que fica fora da proteção.
- `.gitattributes` normalizando fim de linha em LF. Sem ele, o Git for Windows clonava em CRLF e quebrava testes que comparam texto multilinha.

### Alterado

- Repositório renomeado para VKOS Hub Local, com versionamento reiniciado em 1.0.0.
- README reescrito em torno das duas camadas do produto, CORE e Workspace.

### Removido

- A linha de trabalho de nuvem (Docker, Compose, Caddy, scripts de VPS e broker de IA via Vertex) saiu da linha principal. Ela fica preservada no branch `arquivo/vkos-3-nuvem`.

## Histórico anterior, VKOS Hub

O que vem abaixo é o histórico do repositório de origem, mantido como registro.

## [2.0.0] 2026-07-18

A primeira versão que um estranho consegue instalar e usar sozinho. A v1 provava o mecanismo; a v2 vira produto: gera, confere o próprio trabalho, publica com qualidade auditada e guarda o negócio inteiro num lugar só.

### Adicionado

**Publicação profissional de sites**
- Site multipágina passa a ser publicado como projeto Astro de verdade: layout compartilhado, `sitemap.xml`, `robots.txt`, `package.json` e `netlify.toml`. A conversão é determinística, sem IA e sem custo, feita em `.astro-build/` dentro da peça.
- Motor de build compartilhado em `app/dados/motor-sites/`, com `astro@5.18.2` pinado e instalação sob demanda. Uma instalação serve todas as peças.
- GitHub recebe o projeto fonte; Netlify recebe o site já compilado. Sem marcadores, sem motor ou com falha de build, a publicação cai para HTML puro na mesma requisição, com aviso honesto.
- Rota interna `POST /api/publicacao/:pasta/ensaiar-astro` para diagnóstico, sem publicar.

**Laço de conformidade pós-geração**
- Terminada a geração de um site, o servidor roda a mesma auditoria do deploy e, se reprovar, retoma a própria sessão com a lista literal de erros e a ordem de corrigir exatamente aquilo, até duas voltas.
- O site só é dado como pronto com conferência terminal (aprovada, ou pendências honestas). O usuário acompanha em "Conferindo o site" e "Corrigindo pendências".
- Guardas: navegador ausente não dispara correção, sessão parada não retoma, reentrância protegida, teto de duas voltas.

**CRM v2**
- Contato virou ficha de verdade e o negócio virou entidade própria: o mesmo cliente pode ter vários orçamentos no funil.
- Linha do tempo de interações, tarefas com prazo, e a aba Hoje (follow-ups atrasados, clientes esquecidos há 30 dias, valor no funil, tarefas por prazo).
- Duas visões do mesmo dado: Quadro (kanban de negócios) e Contatos (tabela com busca, filtro e ordenação).
- O CRM alimenta a IA como contexto agregado quando o pedido o menciona, com regra dura: dado pessoal de cliente nunca entra em peça publicável.
- Eventos novos no barramento: `crm:negocio-criado`, `crm:negocio-atualizado` e `crm:negocio-excluido`.

**Camada de design contra saída genérica**
- Cartela unificada de 20 direções visuais e biblioteca de 13 estilos concretos, com tokens de cor, escala tipográfica, spacing e motion reais.
- O prompt de site passou a ser design-first: ler o Cérebro, a cartela e o índice de estilos, escolher uma direção e um estilo, e declarar a escolha antes de escrever a primeira linha de HTML.
- Skills novas `/revisar-design` (nota por área e o teste "parece IA?") e `/refinar` (um gesto de melhoria por vez), propagadas para os workspaces.
- Princípios visuais em todos os formatos: site, carrossel e stories.

**Site Guiado v2**
- Objetivo e seções viraram texto livre, no lugar do formulário engessado.
- "Com imagens" reúne a galeria das Fontes de dados e o upload do computador na mesma rota de anexos.
- As instruções finais ficam na última etapa, como palavra final do usuário.
- Peça gerada com pendência conclui na tela do site com aviso, em vez de falso erro; a barreira de publicação continua bloqueando.

**Wizard de carrossel**
- Origem de imagem unificada: gerar com IA, escolher das Fontes de dados ou subir do computador.
- Modelos compostos: a capa de um modelo é transplantada sobre as páginas de outro, com CSS escopado e comparação estrutural no fim.

**Mapa do sistema (interno)**
- Visualização didática da arquitetura como rede de nós, com dados em `interno/`, fora do pacote de cliente por construção. Sem a pasta, o item desaparece da barra lateral.

**Outros**
- VKOS 2 como template do workspace: Cérebro em branco pronto para `/instalar`, 33 skills, camada de design completa.
- Selo "Versão Beta" discreto na barra lateral, com aviso de que alguns fluxos ainda podem falhar.
- Modo enxuto para sessões utilitárias e VKOS-IDE como janela flutuante universal.

### Alterado

- `visual-hub.css` assumida como a camada oficial de tema, carregada por último. `global.css` é a base. Os documentos passaram a dizer a verdade sobre isso, incluindo o menta atual (`#2fd4a7`).
- A conferência de sites tem núcleo único, usado tanto pelo deploy quanto pelo laço, com o mesmo host resolvido no servidor.
- `modoPrevisto` só anuncia publicação Astro quando os marcadores estão válidos e o motor é viável.
- Custo de turno com erro deixou de somar no total da sessão e do workspace.
- Correção automática aparece na transcrição como nota do Hub, não como fala do usuário.

### Corrigido

- **Perda total do CRM.** Um `crm.json` corrompido era sobrescrito por estado vazio ao abrir a tela. Agora vai para quarentena com data e a interface avisa; arquivo existente nunca é sobrescrito às cegas.
- **Vazamento na exclusão de cliente.** Excluir um workspace deixava tokens de Google, GitHub e Netlify e dados pessoais no disco. Agora o refresh token do Google é revogado e a pasta de dados é apagada; a pasta do cliente fica intacta.
- **Evento duplicado na agenda.** Corrida entre operações rápidas no mesmo contato criava dois compromissos e um vínculo órfão. A sincronização passou a ser serializada por contato.
- **Conteúdo sumindo na publicação.** O conversor Astro descartava em silêncio qualquer trecho fora dos marcadores, e montava o `head` só a partir da página inicial. Agora valida a cobertura do corpo e a identidade dos `head`, recusando com fallback honesto.
- Chaves literais no texto de um site quebravam o build Astro.
- Sessão podia ficar presa em "conferindo" para sempre se o servidor caísse ou a auditoria falhasse.
- A exclusão mútua entre geração de site e carrossel tinha brecha durante a conferência.
- Migração do CRM descartava contato sem nome ou sem coluna; agora usa valor padrão.
- Bolha de confirmação de exclusão ficava ilegível no tema Claro.
- O observador de arquivos disparava uma enxurrada de atualizações durante a publicação.

### Segurança

- Nenhuma credencial de IA passa pelo Hub: o login acontece pelo programa oficial do motor escolhido.
- Dados do CRM entram no contexto da IA apenas de forma agregada, sem telefone nem e-mail, com proibição explícita de publicar dado identificável.
- Material interno (`interno/`, `contexto/`, `decisoes/`, `planos/`) fica fora do pacote de cliente por construção.

### Qualidade

- 133 testes automatizados (112 no servidor, 21 na interface).
- Auditoria visual real por navegador em 390px e 1440px, com rolagem completa, sem JavaScript e com movimento reduzido, bloqueando deploy de site quebrado.

## [1.0.0] 2026-07-14

Primeira versão utilizável na operação real: cockpit multi-IA com canvas, sessões em paralelo lendo o mesmo Cérebro, galeria de peças, Studio de carrossel, Site Guiado HTML, CRM em kanban, calendário, automações, conexões e custo por sessão.
