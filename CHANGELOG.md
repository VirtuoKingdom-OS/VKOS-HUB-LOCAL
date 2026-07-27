# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
O VKOS Hub Local segue [versionamento semântico](https://semver.org/lang/pt-BR/).

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
