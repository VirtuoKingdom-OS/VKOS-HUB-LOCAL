# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
O VKOS Hub segue [versionamento semântico](https://semver.org/lang/pt-BR/).

## [3.0.0] Em desenvolvimento

### Adicionado

- CORE como painel de gestão (ShellGestao): Painel com indicadores, alertas acionáveis e atividade da auditoria, mais Clientes, Modelos, Estúdio e Sistema. O CORE deixou de ser um estúdio de criação.
- Entrada explícita em workspace pelo CORE: o operador entra num workspace (pelo Estúdio ou por Clientes) sob a rota `/w/<id>`, com barra de contexto fixa, botão Voltar ao painel e auditoria. Dentro de um workspace, os itens de gestão somem.
- Invariante de isolamento de motor travada por teste: o caminho de sessão do hub nunca alcança o provedor local (o Claude pessoal do Jesse) e resolve o motor por workspace.
- Modos `core` e `hub`, com imagens separadas e ausência física de CLI de IA no hub.
- PostgreSQL com migração versionada para identidade, modelos, workspaces, membros, features, convites, auditoria, credenciais, consumo e limites.
- Login de produção do operador com Argon2id e TOTP opcional, acesso direto no CORE local, login de cliente por convite, redefinição de senha, bloqueio por tentativas e sessões revogáveis.
- Catálogo declarativo das 11 features, flags por workspace e rotas inativas respondendo 404.
- Administração compacta com Clientes, Modelos, Meu Claude e Segurança, slug automático, interruptores de features, motores legíveis, convite, credenciais, orçamento e TOTP opcional (agora dentro do painel de gestão).
- Gemini como padrão de todo modelo e workspace novo, com migração dos registros antigos em `nenhum`; esse estado permanece apenas como contingência interna e aparece ao cliente como IA em manutenção.
- Administração de acesso com listagem e revogação de convites, listagem e remoção de membros e encerramento das sessões do cliente, cada bloco com falha isolada.
- Broker interno com Gemini via Vertex AI, Claude por credencial exclusiva, mapas de modelos econômico, padrão e forte, cofre AES-256-GCM, medição por modelo e corte por orçamento.
- Teste real de Gemini e Claude Team por workspace, com estados não testado, operante ou manutenção e erro seguro quando a autenticação deixa de funcionar.
- Estado e teste do Claude pessoal no CORE, com login persistente no volume `claude_core`.
- Docker Compose com Caddy, CORE, hub, motor, Postgres e backup cifrado para Cloud Storage.
- Infraestrutura Terraform para Compute Engine, firewall, Secret Manager, Vertex AI e bucket versionado.
- Runbook completo de VPS, inicializador Linux, checklist de segurança e ensaio de restauração em banco descartável.
- Smoke test do fluxo ponta a ponta em `infra/smoke-nuvem.mjs`.
- Sistema visual 3.0 com temas Escuro e Claro off-white, tokens de escala, componentes comuns e limites de erro global e por tela.
- Varredura visual em `infra/varredura-ui.mjs`, com capturas em 390, 768 e 1440 px, checagem de overflow, console e contraste.
- URLs limpas com History API, fallback de SPA no Fastify e compatibilidade automática com links antigos em `#/...`.
- VKOS-IDE geral no CORE: área própria no painel de gestão com seletor de raiz que alterna entre o sistema inteiro (o repositório do hub), os workspaces do estúdio e os clientes materializados. Árvore, editor e conversa com o Claude do CORE operam na raiz escolhida.
- Cérebro opcional na criação visual e no Site Guiado: com o Cérebro em branco, o wizard oferece seguir sem ele nesta geração, com um campo opcional de descrição do negócio, tanto pelo Dashboard quanto pelo Cockpit (que ganhou a ação discreta "Criar sem o Cérebro"). O flag `semCerebro` viaja até o servidor e libera a guarda; o prompt ganha o bloco "MODO SEM CÉREBRO" que impede a IA de ler o Cérebro ou inventar dados. Com o Cérebro preenchido, nada muda.
- Banco visual central de carrosséis no CORE: CRUD por filesystem, preview real, tipos de capa, desenvolvimento, CTA e completo, criação por HTML ou por referência com IA e refino no Studio. O wizard une modelos locais e centrais e o servidor grava o modelo no workspace no uso, quando falta ou quando difere do banco. Os 14 originais do VKOS aparecem no painel e podem ser atualizados por sobrescrita copy-on-write, sem tocar na semente: a edição propaga pro parque inteiro no próximo uso de cada workspace, o cartão ganha o badge Atualizado e o Restaurar original converge tudo de volta pra fábrica. Qualquer modelo abre no Studio pra refino e volta pro banco ao salvar.
- Feature Meta por workspace, somente leitura, com visão geral, Instagram, anúncios e Facebook. A credencial da agência fica central e mascarada, cada cliente guarda apenas o vínculo dos ativos e lê snapshots diários produzidos por um coletor serial. O CORE oferece diagnóstico de permissões, descoberta de ativos e atualização manual com intervalo mínimo.
- Aba Cérebro do Negócio no workspace: um card editável por seção do cerebro.md, com progresso de preenchimento, edição inline com salvamento por seção e aviso quando o Cérebro muda por fora durante uma edição. Os cards são uma vista do markdown: salvar uma seção preserva o resto do arquivo byte a byte, e corpo vazio restaura o marcador de em branco. A entrevista guiada continua o caminho recomendado do zero.
- Tela Arquivos: Galerias e Fontes de dados viraram duas sub-abas de uma tela só (Criações e Fontes de dados), reaproveitando os painéis existentes. Os caminhos antigos `/galerias` e `/fontes` continuam funcionando e caem na tela nova. Com uma feature só, a tela abre direto na sub-aba única.

- Conexões centrais do sistema: a tela saiu dos workspaces e virou a aba Conexões do Sistema no painel de gestão. O estado vive em `app/dados/conexoes.json`, migrado dos arquivos por workspace na primeira leitura, e vale pra operação inteira. Remover um workspace não revoga mais o Google central.

### Removido

- Instalador Windows, inicializadores `.cmd`, tela `/setup` e instalação guiada de motores locais.
- Tema Dark VKOS. Valores antigos salvos como `vkos` migram automaticamente para Escuro.
- No CORE, os itens de menu Clientes e Planos de cliente. Viraram a área única Workspace.

### Alterado

- CORE: cada workspace pode ter uma logo, que aparece na lista e no detalhe. A logo é escolhida no Gerenciar, rebaixada pra 256 px no navegador e guardada como data URL. A lista também mostra quem tem acesso a cada workspace, os emails dos logins liberados, ou "Sem acesso liberado" quando ainda não há nenhum.
- CORE: Clientes e Planos de cliente viraram uma área única, Workspace. Os workspaces reais ficam no centro, em largura cheia, com barra de resumo e busca. Criar um workspace abre uma gaveta com o plano de partida escolhido em cartões. Os planos, que eram um item de menu, viraram preset numa gaveta secundária. Gerenciar segue com Features, Acesso e Consumo. As rotas antigas `/clientes` e `/modelos` continuam funcionando e caem na área nova.

### Corrigido

- Administração agora cobre o cockpit pelo contêiner padrão de tela.
- CRM não derruba mais o app quando recebe resposta incompleta da API.
- Features desligadas somem do menu e rotas profundas voltam para a primeira tela liberada; workspaces vazios mostram um estado de preparação.
- Administração, Mapa, Conexões e Automações não são montados no Hub, mesmo com flags antigas.
- A busca de leads no Hub resolve a credencial Apify dentro do motor e esconde a aba quando a integração não foi configurada.
- O Cockpit fica oculto e inerte sob telas fixas, eliminando o vazamento visual do canvas na navegação.
- Navegação em 390 px usa barra inferior rolável e deixa o conteúdo ocupar a largura inteira.
- Cockpit, Cérebro e Fontes de dados agora são a feature única `cockpit`; ativações e configurações antigas são unidas pela migração.
- A autorização das APIs de feature agora é derivada do catálogo completo, fechando prefixos que não estavam no mapa manual.
- A cerimônia do Cérebro no Hub resolve a skill do workspace, mantém o contexto da entrevista, grava o documento por protocolo confinado e apresenta ausência de motor ou erro sem quebrar.
- Convites e redefinições de senha usam query string em caminhos limpos; links antigos com hash continuam compatíveis.
- Entrar num workspace de cliente pelo CORE agora ativa a pasta materializada dele no servidor. Antes a ativação falhava em silêncio e o conteúdo mostrado era o do workspace do estúdio que estava ativo.
- O Mapa do sistema abre dentro do painel de gestão, num quadro com o menu visível, em vez de cobrir a tela inteira.
- A atividade recente do Painel ficou enxuta, numa coluna estreita no canto, com os rótulos de auditoria traduzidos.
- Telas carregadas sob demanda (CRM, Calendário, Conexões, Mapa, IDE e outras) se recuperam sozinhas de um deploy feito com a aba aberta: quando o navegador pede um arquivo cujo nome mudou no build novo, a página recarrega uma vez para buscar a versão atual em vez de cair no aviso de erro. Antes, o cliente com a aba antiga via "esta tela encontrou um problema" ao abrir CRM ou Calendário.
- O formulário Novo cliente não fica mais preso no topo por cima do detalhe do cliente ao rolar a aba Acesso.
- Ao entrar num workspace de cliente pelo CORE, a barra de contexto (Voltar ao painel) ocupa uma faixa própria no topo e a tela do workspace começa abaixo dela, sem uma cobrir a outra, nas larguras de 390, 768 e 1440 px.

### Segurança

- Contexto de requisição resolve usuário, workspace, pasta e features no servidor.
- WebSocket filtra eventos por workspace.
- Arquivos de peças exigem sessão e usam somente a pasta resolvida pelo servidor.
- Credencial do CORE e cofre não são montados no container do hub.

### Validação pendente

- Migração de GitHub, Netlify e Google do Hub para operações mediadas pelo cofre. A Apify já usa o motor; as implementações legadas restantes ficam bloqueadas no Hub para não expor tokens em texto aberto.
- `npm audit --omit=dev` mantém quatro avisos moderados transitivos em MCP/Hono e Google Auth/gaxios/uuid. A vulnerabilidade alta e os avisos de `@fastify/static` foram removidos sem forçar versões incompatíveis.

- O deploy real, TLS público, Vertex AI e restauração em VM limpa dependem do projeto Google Cloud, domínio e credenciais de produção.

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
