# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
O VKOS Hub segue [versionamento semântico](https://semver.org/lang/pt-BR/).

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
