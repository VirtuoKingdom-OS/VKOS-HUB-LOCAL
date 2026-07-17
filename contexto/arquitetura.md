# VKOS Hub, arquitetura técnica

## O que é
Workspace multi-IA local-first para dono de negócio (não dev). Um cockpit onde várias sessões de Claude ou Codex rodam em paralelo, todas lendo o mesmo Cérebro (markdown com a identidade do negócio em 13 blocos). Ponto de entrada: marketing. Também é ferramenta de produtividade do próprio Jesse, que hoje abre várias janelas do VS Code com IA no mesmo projeto e sofre pra orquestrar isso.

## Princípios inegociáveis
- Local-first: roda na máquina do usuário, nada hospedado, pagamento único (igual ao VKOS atual).
- Cérebro como fonte da verdade: markdown, versionável, legível por humano.
- Não reinventar o VKOS: o app orquestra o repo VKOS existente (skills, cerebro.md, templates de carrossel), não substitui.
- Menor atrito pra um operador solo que domina HTML/CSS/JS/Node.

## Camadas
1. Servidor local Node (acesso a arquivos e processos, serve o frontend no navegador).
2. UI de canvas/cockpit (React + React Flow no navegador).
3. Orquestrador de sessões por contrato de provedor (Claude e Codex, spawn, streaming, paralelismo).
4. Estado local (arquivos markdown + índice).
5. Ponte com o repo VKOS na máquina (abrir pasta, ler Cérebro, disparar skills).

## DECIDIDO 2026-07-11: shell é web local, sem Electron (ver decisoes/)
- Backend Node local (Fastify) + frontend React no navegador via localhost.
- Motivo: dois públicos (navegador puro e VSCode) com o mesmo frontend, e caminho aberto pro SaaS trocando só onde o backend roda.
- Empacotar como executável com backend embutido quando for distribuir. Electron/Tauri só se virar necessidade real.

## DECIDIDO 2026-07-11: canvas é React Flow desde o MVP (ver decisoes/)
- React Flow (@xyflow/react): nós, arestas, zoom, pan prontos. O Cérebro é o nó central, cada sessão de IA é um nó puxando dele.
- O workspace visual é o produto, não fase futura. Sem canvas o MVP não valida a tese.

## DECIDIDO 2026-07-11: orquestração via claude -p headless (ver decisoes/)
- `claude -p` com `--output-format stream-json`: cada sessão é um processo filho, o app lê o streaming linha a linha. Retoma contexto com `--resume <session_id>`.
- Reaproveita a auth do CLI instalado, espelha o que o Jesse já faz na mão. O cwd na pasta do VKOS faz o CLAUDE.md de lá garantir o Cérebro no contexto.
- Migrar pro Agent SDK só quando hooks, permissões finas ou controle de custo por sessão virar dor concreta.
- Paralelismo: N processos filhos simultâneos. Cada um roda numa pasta de trabalho (o repo VKOS ou subpasta). Limitar concorrência (ex: 3 a 5 sessões) pra respeitar rate limit do plano e não fritar a máquina.
- Custo/limite: expor no cockpit quantas sessões estão ativas e sinalizar quando bater limite do CLI. Não estimar tokens na fase 0.

## DECIDIDO 2026-07-15: contrato multi-IA e setup local

- O gerenciador de sessões não conhece mais um CLI específico. Ele usa o contrato em `server/src/provedores/`, com adaptadores Claude e Codex.
- O dialeto interno continua compatível com o stream-json do Claude. O Codex traduz seu JSONL nesse limite, preservando o frontend e o histórico.
- Cada sessão persiste o provedor em que nasceu. Trocar o motor global só afeta sessões novas.
- O Codex recebe `AGENTS.md` gerado de `CLAUDE.md` quando necessário e expande comandos de skill para leitura explícita do `SKILL.md`.
- Carrossel e site são bloqueados antes da sessão quando o Cérebro está em branco. Sessão concluída sem artefato mostra a resposta real do provedor, sem espera infinita.
- Com Codex ativo, os wizards de carrossel e site liberam geração nativa de imagem por `$imagegen`; o bitmap final fica em `conteudo/<pasta>/img/`. Claude continua com upload de imagens nesta versão.
- Existe uma única criação visual guiada por vez no Hub. O frontend restaura a ativa e o servidor recusa outra skill `carrossel` ou `site` enquanto a primeira estiver na fila, iniciando ou rodando, inclusive em outra aba ou cliente.
- Imagegen planeja a quantidade depois do roteiro e cria assets contextuais por página ou seção, sem repetição automática. Os Studios tratam `<img>` e `background-image` real com as mesmas ações: upload, gerar outra com Codex e excluir a referência.
- Ajustes com IA de site e carrossel usam um escopo de peça validado no servidor. O processo roda dentro de `conteudo/<pasta-da-peca>/`, recebe o Cérebro completo somente como contexto e não pode gravar fora da peça atual. O pedido digitado pelo usuário não pode ampliar essa fronteira.
- O servidor também embute a fonte HTML atual no prompt de ajuste, até 750 KB, para sobreviver a indisponibilidade do shell do provedor. Resposta textual que admite falha não é exibida como sucesso.
- MCP continua disponível somente no Claude nesta versão. O custo do Codex é estimado por tokens e aparece identificado como estimativa.
- Quando o pedido de uma sessão cita a palavra inteira `crm`, o servidor injeta um resumo agregado do CRM por `instrucoesExtras`. O bloco persiste na sessão, volta nas retomadas, remove telefone e email e carrega uma regra dura contra publicar qualquer dado identificável de cliente.
- A primeira abertura passa por `#/setup`: escolha, detecção, instalação automática do CLI ausente, login oficial, teste real e atalho. O servidor usa uma lista fixa de pacotes WinGet e nunca executa comando recebido da interface. `Instalar VKOS Hub.cmd` instala o Node.js LTS automaticamente via WinGet quando necessário; `Iniciar VKOS Hub.cmd` cuida da abertura diária no Windows. Os dois fluxos mantêm alternativa manual quando o WinGet não está disponível.
- O pacote distribuível contém `app/`, `VKOS/`, os dois inicializadores e o `LEIA-ME.md`. O VKOS vem com Cérebro em branco, skills, templates e dependências próprias. Dados, exemplos preenchidos, clientes, Git, `interno/` e materiais de desenvolvimento ficam fora.
- No primeiro boot, `workspaces/integrado.ts` registra e ativa automaticamente a pasta `VKOS/` ao lado de `app/`. O cliente nunca escolhe uma pasta para começar.

## DECIDIDO 2026-07-11: estado local em markdown e JSON (ver decisoes/)
- JSON pra índice de sessões e configuração (pasta `app/dados/`), markdown onde couber. As peças ficam onde o VKOS salva, o app só lê.
- SQLite apenas como cache/índice se a biblioteca de peças crescer a ponto de doer. Nunca como fonte da verdade.

## Ponte com o repo VKOS
- O app abre a pasta de um VKOS já instalado (navegador de pastas servido pelo backend).
- Cópia de referência do VKOS em `vkos/` na raiz desta pasta, usada pra desenvolvimento e teste. Desde 2026-07-16 existe também o `vkos2/` (VKOS 2, ver decisoes/2026-07-16-vkos2.md): o template puro com camada de design em todos os formatos e skills de construção, mesmo contrato de pasta.
- Lê `cerebro/cerebro.md` e injeta como contexto em toda sessão disparada.
- Descobre as skills disponíveis lendo `.claude/skills/` (28 no v1, 33 no VKOS 2: /instalar, /carrossel, /semana, /site, /evoluir, /projeto etc.).
- Disparar uma skill = rodar `claude -p "/carrossel ..."` com cwd na pasta do VKOS. A skill já sabe renderizar carrossel via Playwright, salvar PNG etc. O app só orquestra e mostra o resultado.
- Peças geradas (PNGs, posts) ficam onde o VKOS já salva. O painel de peças lê essas pastas, não duplica.

## DECIDIDO 2026-07-12: canvas em árvore com contêineres (ver decisoes/)
- Topologia: Cérebro liga na sessão (fluxo), a sessão liga no contêiner de gerações do tipo. Geração nunca liga direto no Cérebro.
- Um nó contêiner por tipo de peça (Carrosséis, Posts, Stories, Sites) agrupa todas as gerações em miniatura; clicar abre a galeria em modal. Nós individuais de geração não existem mais (canvas.json versão 3, migração automática da versão 2).
- Carrossel, post e stories usam o mesmo motor, a skill /carrossel intocada: o composer escolhe formato (múltiplas páginas ou página única) e proporção (1:1, 4:5, 9:16) e manda como instrução no prompt.
- Desde 2026-07-14 o carrossel é HTML-first (ver decisoes/2026-07-14-carrossel-html-first.md): a peça é o carrossel.html, a geração é direta (sem perguntas, instruída pelo prompt), o PNG só nasce sob demanda no download (render em pasta temporária), e há editor visual no app (texto, fontes, cores globais via variáveis CSS, imagem de fundo). Peça legada com PNG segue classificada pela subpasta (instagram/, post/, instagram-stories/); peça nova classifica pelo carrossel.html na raiz.
- Cérebro editável pelo app: GET/PUT /api/vkos/cerebro com gravação atômica e backup automático por boot.
- Anexos universais do composer em materiais/cockpit/anexos/, referenciados por caminho no prompt. Ajustes de carrossel e site aceitam anexos escopados em `conteudo/<peça>/anexos/`, referenciados no pedido e excluídos da publicação.
- Preview de site dentro do app: iframe escalado por transform, presets mobile e desktop, atualização ao vivo via evento de peças.

## DECIDIDO 2026-07-12: workspaces multi-cliente (ver decisoes/)
- Um workspace por cliente, e cada workspace é uma pasta VKOS completa. Registro em app/dados/workspaces.json, estado escopado por workspace em app/dados/workspaces/<id>/ (canvas, contextos, sessões, custos, transcrições).
- Sessões de todos os clientes convivem no gerenciador: sessão do cliente A segue rodando com o B ativo, e custo e transcrição vão pro workspace da sessão. Limite de 5 simultâneas continua global.
- Cliente novo nasce clonando a estrutura do ativo (skills, templates) com Cérebro em branco e junction de node_modules. Remover cliente tira só do registro, nunca apaga arquivos.
- Migração automática e idempotente no boot: o estado single-tenant antigo virou o primeiro workspace.

## DECIDIDO 2026-07-13 e 2026-07-14: IDE, Conexões e CRM no hub (rodadas 10 e 11)
Detalhe fino no app/CONTRATO.md e nos arquivos de decisoes/. Aqui só o mapa:
- VKOS-IDE é uma camada universal contida sobre qualquer tela. O Shell monta uma vez e oculta por `visibility`, então arquivo aberto, chat e streams sobrevivem ao fechar. Navegar para outra rota fecha a camada. Em viewport compacta, Arquivos, Editor e Conversa aparecem como áreas alternáveis, sem colunas fora da tela. O controle do chat escolhe Claude ou Codex, modelo e permissão da próxima conversa. `#/ide` segue como compatibilidade e abre a camada sobre o Dashboard.
- Conexões MCP (#/conexoes): catálogo por workspace somente com integrações disponíveis nesta versão, GitHub, Netlify, Notion e Google Calendar. Token só no disco local em conexoes.json, montarConfigMcp injeta --mcp-config nas sessões Claude. Vitrines de Meta e Google Ads saíram da interface em 2026-07-15.
- CRM (#/crm): estado v2 por workspace separa contatos de negócios. Hoje reúne follow-ups, esquecidos, funil e tarefas; Quadro move negócios; Contatos busca, filtra e ordena fichas. Interações formam a linha do tempo e o próximo contato continua alimentando o Calendário. A leitura migra cartões v1 sem perda e o backend vive em server/src/crm/.
- Mapa (#/mapa): visualizador interno e read-only da arquitetura. Setas e pulsos mostram o sentido das ligações; o painel separa o que cada nó recebe e envia. Títulos e descrições são independentes e o Modo discreto protege também rótulos, legenda e painel. Os dados curados vivem em `interno/mapa-sistema.json`, fora do pacote. Sem esse arquivo, `GET /api/mapa` responde indisponível e o item some da Sidebar sem afetar o restante do app. Mudança arquitetural atualiza nós e ligações na mesma tarefa por regra do `CLAUDE.md`.
- Três temas (ver decisoes/2026-07-14-tres-temas.md): Escuro (o padrão), Dark VKOS e Claro, todos via tokens de web/src/estilos/global.css. Mensagens da IA renderizam markdown de verdade (componente comum/Markdown).

## DECIDIDO 2026-07-14: duas jornadas, Dashboard e Studio (rodada 13)
Ver decisoes/2026-07-14-duas-jornadas-dashboard-studio.md. Mapa:
- Dashboard (#/dashboard, tela padrão): porta de entrada simplificada. A criação guiada estilo quiz abre uma rota própria `#/criar/<tipo>` para carrossel, post, story ou site. O Dashboard permanece como base visual, mas URL, assistente e histórico compartilham a mesma verdade. Cancelar ou minimizar volta ao ponto de origem; concluir substitui a rota de criação pelo Studio ou pela tela do site, sem deixar um assistente encerrado no histórico.
- Studio (#/studio/<pasta>): o único editor de carrossel. Páginas lado a lado num iframe só, zoom, painel de propriedades, mover elementos (drag com guias e snap) e painel `Ajustar com IA` escopado ao `carrossel.html` atual, com anexos da própria peça. Motor de edição compartilhado em web/src/componentes/editor/motor.ts.
- A seleção dos dois Studios navega para o contêiner pai e permite excluir qualquer elemento interno, protegendo apenas a raiz da página. Isso cobre wrappers que carregam borda, máscara ou sombra separadas da imagem. Há confirmação, Desfazer antes de salvar e corte da pilha de Desfazer após a gravação.
- No Studio de carrossel, `.slide` é o canvas imutável da página e nunca um alvo de movimento. Seleção, arrasto, setas e serialização aplicam guardas independentes contra deslocamento do slide inteiro.
- O painel de IA separa intenção estrutural de intenção visual. Pedido que cria imagem usa a sessão dedicada `imagem`, resolve a página por ordinal ou número e aplica o asset em um `<img>` de fundo real. O ajuste geral de HTML não é responsável por gerar bitmap.
- A TelaSite usa a mesma separação. O pedido resolve hero, topo, sobre, serviços ou CTA no DOM salvo, gera o bitmap pelo fluxo `imagem` e só conclui depois de inserir e gravar um `<img data-vkos-image-bg>` na seção. Isso funciona tanto em Visualizar quanto em Editar e mantém o asset alcançável pelo Studio.
- Sidebar: Dashboard, Cockpit, CRM, Calendário, Conexões, Automações, Mapa interno condicional, Conteúdo condicional, um único botão Fontes de dados com soma total e VKOS-IDE como toggle universal no fim. WhatsApp e Instagram não aparecem até terem integração real.
- Workspaces registrados: Estúdio Aura (designer fictícia, Cérebro completo) em estudio-aura/ e OJESSEGOMES (uso real do Jesse, o ativo) em ojessegomes/. As pastas vkos/ e vkos2/ seguem só como referência, fora do registro.

## DECIDIDO 2026-07-14: Site Guiado HTML-first por prompt (rodada 17)
Ver decisoes/2026-07-14-site-guiado-html-first.md. Mapa:
- Wizard em `#/criar/site` (AssistenteCriacao com tipo "site", EtapasSite em web/src/componentes/criacao/): 4 etapas, gera por montarPromptSite (promptSite.ts) com skill "site". A rota pode ser atualizada ou aberta diretamente sem cair no Dashboard vazio. A sessão constrói o site HTML estático direto em conteudo/<pasta>/ lendo o Cérebro, a metodologia code-first da skill /site e principios-visuais.md. Objetivo e seções são texto aberto, o botão principal mantém seu contrato próprio, `Com imagens` reúne Fontes de dados e upload na mesma rota de anexos, e os detalhes ficam na etapa final. Desde 2026-07-17 o prompt é design-first: o primeiro bloco obriga a ler cartela.md e templates/design/estilos/indice.md, escolher direção e estilo e declarar a escolha no início; multipágina sai com marcadores data-vk-nav/data-vk-footer/data-vk-pagina e title/description únicos por página.
- Estado global de geração aceita tipo "site": peça pronta = pasta alvo com tipo "site" e diagnóstico presente, válido ou com pendências, fases próprias, flutuante com "Ver o site". Sessão encerrada de forma anormal não esconde uma peça já gravada. Desde 2026-07-17 há o laço de conformidade (decisoes/2026-07-17-laco-conformidade-site.md): a geração concluída passa pela auditoria do deploy na hora e, se reprovar, a mesma sessão é retomada com os erros e avisos literais, até 2 voltas; o site só fica pronto com conferência terminal. O backend recupera a pasta alvo do contrato dentro do prompt guiado e compara com o campo HTTP, portanto uma aba antiga não consegue omitir a conferência automática.
- Tela #/site/<pasta> (web/src/componentes/site/TelaSite.tsx): iframe escalado com presets Desktop 1440x900 e Mobile 390x844, seletor de páginas, cache-bust ao vivo, painel lateral "Ajustar com IA" escopado à pasta do site e ao HTML atual, com anexos da própria peça.
- Publicação de site é determinística em `server/src/publicacao/`: GitHub recebe uma árvore completa pela Git Data API e Netlify recebe o ZIP estático direto. Cada destino funciona sozinho, usa o token local de Conexões e grava `publicacoes.json` por workspace. Na Netlify, o backend resolve o time principal em `/accounts`, cria o projeto explicitamente nesse time, envia o ZIP em uma segunda chamada e só registra sucesso depois de testar a URL pública. O campo opcional `accountSlug` permite escolher outro time. GitHub e Netlify têm trilhas de conexão baseadas na documentação oficial e o backend valida o token salvo diretamente na API correspondente. Configuração e publicação REST funcionam com Claude ou Codex; só o uso MCP depende de Claude. A TelaSite mostra conexão, progresso, erro e último envio. Desde 2026-07-17 a publicação tem dois modos (decisoes/2026-07-17-astro-na-publicacao.md): multipágina válido com marcadores, nav e rodapé compartilháveis publica como projeto Astro; scripts exclusivos continuam na página correspondente. O conversor determinístico vive em publicacao/astro/, o motor compartilhado em app/dados/motor-sites/ usa astro@5.18.2 pinado, GitHub recebe a fonte e Netlify o dist zipado. Sem contrato compartilhável ou com falha de conversão/motor/build, há fallback pra HTML puro na mesma requisição com aviso. A previsão da UI aplica o mesmo contrato do conversor. Rota de diagnóstico POST /api/publicacao/:pasta/ensaiar-astro.

## DECIDIDO 2026-07-15: barramento de eventos e Google Calendar
Ver decisoes/2026-07-15-barramento-eventos-google-calendar.md. Mapa:
- Barramento de eventos (server/src/eventos/barramento.ts): emitir/assinar tipados, log auditável por workspace em eventos.jsonl com rotação. Eventos: crm:contato-criado/movido/atualizado, peca:criada, sessao:concluida. Integração nova assina o barramento, não chama módulo direto.
- Google Calendar: OAuth loopback no app (server/src/google/oauth.ts, token só em conexoes.json), cliente REST fino (calendar.ts), servidor MCP próprio (mcp-calendar.ts, 5 ferramentas de agenda injetadas nas sessões via montarConfigMcp) e card com botão Conectar na tela Conexões.
- Automações (server/src/automacoes/ e tela #/automacoes): regras por workspace "quando evento então criar evento na agenda", filtro por coluna, templates com variáveis do cartão, modo ensaio sem efeito real, histórico em jsonl. Ação determinística chama a API direto, sem gastar sessão de IA. Cartão do CRM ganhou proximoContato (data do compromisso).
- Tela Calendário (#/calendario, item fixo na sidebar abaixo do CRM) é LOCAL-FIRST desde 2026-07-15: agenda própria por workspace (eventosLocais em calendario.json, server/src/calendario/eventosLocais.ts), funciona sem Google. Visão de mês, criar/editar/excluir evento, poll de 60s e refresh no foco. Dois toggles no cabeçalho: "Sincronizar com CRM" (sempre disponível) e "Sincronizar com Google Calendar" (opcional; ligar exige conexão e pede pra conectar em Conexões). Modo google = sincronizarGoogle e conectado: a tela opera na agenda do Google, eventos locais são enviados ao ligar, e criações no modo google guardam espelho local. A página de retorno do OAuth redireciona sozinha pra #/calendario.
- Sincronização CRM > agenda (server/src/calendario/sincronizacao.ts): cartão com proximoContato vira evento pela camada LOCAL, que propaga pro Google quando o modo google está ativo. Mantido em dia pelo barramento (criar, atualizar, remover ao limpar a data ou excluir o cartão; o CRM emite crm:contato-excluido desde 2026-07-15). Desligar não apaga compromissos já criados.
- Desconectar o Google (oauth.ts) zera a conexão inteira (clientId, clientSecret, refreshToken, contaEmail), desabilita o servidor MCP e desliga a sincronização do calendário. O cockpit fica oculto (visibility hidden) quando não é a tela ativa, pra não vazar por baixo das telas no carregamento.

## DECIDIDO 2026-07-15: Studio de Site (modo Editar na TelaSite)
Ver decisoes/2026-07-15-studio-de-site.md. Mapa:
- TelaSite (#/site/<pasta>) tem os modos Visualizar e Editar. Editar liga o usarMotorSite (web/src/componentes/editor/motorSite.ts, contrato no topo do arquivo) e o PainelSite (componentes/site/PainelSite.tsx): texto, tipografia e cores com escopo geral ou só no celular, link com atalho WhatsApp, troca de imagem, seções (mover, duplicar, excluir) e cores globais do site.
- Sem drag livre (site é layout fluido). Estilos vão pra folha <style id="vkos-ajustes"> com data-vk e !important, nunca inline. Serialização preserva doctype, data-vk e a folha; remove artefatos de editor.
- Hit-test do motorSite faz descida geométrica no ponto do clique ignorando pointer-events (2026-07-15): elemento "desabilitado" pelo site (ex: botão Em breve com pointer-events none) é selecionável e editável; camada decorativa aria-hidden só é pulada quando cobre a viewport (ícone pequeno aria-hidden é alvo normal). O Ajustar com IA também fica disponível no modo Editar (troca de painel com o de propriedades, salvar antes de disparar).
- Refino do Studio de Site (2026-07-15, rodada 2): a lista de seções pula camadas decorativas e desce pro wrapper quando o body tem um container só; texto editável por textarea exige filhos com display inline computado (span display block não conta); definirHref converte elemento em <a> in-place quando não há link. O contrato atual usa <a> para navegação, CTA e cards com destino, <button> para ações locais e <a> sem href com aria-disabled para destino "em breve". pointer-events não pode fingir estado desativado.
- Primitivas compartilhadas em editor/nucleo.ts; motor.ts (carrossel) manteve API e comportamento.
- Gravação: PUT /vkos/pecas/:pasta/pagina/:arquivo (server/src/vkos/paginaSite.ts), padrão do carrossel, carrossel.html proibido.
- Fantasma do cockpit (2026-07-15): a camada do cockpit fica sempre montada e ganha visibility hidden fora da tela dele; a troca de tela no Shell commita com flushSync antes do paint (sem isso, com a thread ocupada pelo canvas, o cockpit vazava uns frames na saída). O servidor serve o dist com Cache-Control: no-cache no index.html e immutable nos assets com hash (build novo chega sem Ctrl+F5).

## DECIDIDO 2026-07-16: contrato único de site estático e barreira de deploy

- Landing page, link na bio e site com páginas usam a mesma raiz publicável: `index.html` obrigatório, caminhos internos relativos e recursos autocontidos na pasta da peça. Páginas aninhadas são aceitas no preview, no editor e no ajuste com IA.
- `/pecas/` serve MIME completo de web estática, incluindo CSS, JavaScript, fontes, manifestos e WebAssembly, com `nosniff` e revalidação de cache. Diretório com `index.html` funciona como URL limpa.
- A peça de site carrega diagnóstico estrutural. Se o site existe, uma pendência conclui a geração e aparece como aviso honesto na TelaSite; somente a ausência da peça vira erro de geração. O deploy repete a auditoria, exclui anexos, backups, temporários, Git e dependências, e só segue quando todas as referências locais existem.
- Ao abrir Publicar e antes de GitHub ou Netlify, o servidor abre todas as páginas em 390 px e 1440 px com o navegador do sistema, percorre a rolagem e repete a leitura sem JavaScript e com reduced motion. CSS ausente, recurso quebrado, erro de página, overflow, conteúdo invisível, contraste insuficiente, semântica estrutural inválida, imagem externa, gradient text, cards excessivamente repetidos ou caractere proibido bloqueiam a publicação. Vidro, borda lateral grossa e eyebrow excessivo viram avisos. O resultado fica em cache pela versão exata dos arquivos entre a consulta e o clique de publicar.
- Visualizar executa scripts em sandbox sem `allow-same-origin`. Editar usa `allow-same-origin` sem scripts, para o motor acessar o DOM sem deixar o site executar código dentro da origem do Hub.
- O fluxo GitHub por blobs, árvore completa, commit e atualização de referência continua compatível com a API 2022-11-28, suportada até 2028. A Netlify continua com deploy atômico por ZIP, espera de estado `ready` e teste da URL pública.

## DECIDIDO 2026-07-16: otimizações de IA (modo enxuto e camada de design v2)
Ver decisoes/2026-07-16-modo-enxuto.md, 2026-07-16-camada-design-v2-e-revisao.md e 2026-07-16-pacotes-referencia-e-licencas.md. Mapa:
- Modo enxuto: toggle na sidebar acima do custo grava modoEnxuto na config global (default desligado). Sessão nova recebe a regra de economia (server/src/sessoes/modo-enxuto.ts, destilada do ponytail MIT) via instrucoesExtras do contrato de provedor: Claude por --append-system-prompt, Codex por bloco <regras-da-sessao> no prompt. Geração guiada (skill carrossel ou site) nunca recebe. A decisão trava na sessão e a retomada repete.
- Camada de design v2: templates/site/principios-visuais.md reescrito (352 linhas, destilado de impeccable Apache 2.0, taste-skill MIT, ui-ux-pro-max MIT e temas do astryx MIT): leitura de design declarada, cartela de 13 direções, regras, proibições anti-IA, teste final e o contrato de marcação do Studio. Vive na referência vkos/ e copiado pros workspaces registrados.
- Revisão de design: atalho no painel Ajustar com IA da TelaSite. O servidor injeta o guia visual completo no prompt confinado e autoriza inspecionar todas as páginas e recursos compartilhados da peça, corrigindo até 8 problemas de maior impacto sem inventar conteúdo nem remover seções.
- Ficam de referência, sem integrar código: Twenty (AGPL), shadcn/ui e astryx como sistema React. A barreira determinística foi implementada localmente a partir do contrato visual próprio, sem incorporar dependência externa.

## DECIDIDO 2026-07-16: finalizações parte 02

- A VKOS-IDE é uma janela flutuante sem véu. Arrasto, minimização para barra + chat e posição persistem em `vkos-ide-janela`; as faixas responsivas vêm de `ResizeObserver` na camada, não da viewport.
- Anexo presente no Ajustar com IA desativa a heurística de geração visual. O ajuste confinado recebe a regra de copiar imagem de `anexos/` para `img/` e nunca gerar outra quando o material pronto atende ao pedido.
- Os dois Studios escolhem imagens das Fontes de dados pelo modal compartilhado. O app copia o binário para `conteudo/<peça>/img/` antes de aplicar, mantendo a peça autocontida; anexos reservados do composer ficam fora.
- Previews de modelo substituem referências de capa/produto por um SVG neutro servido pelo backend. `?slide=N` permite mostrar a capa ou uma página interna e faz clamp no último slide.
- O wizard de carrossel separa `estiloCapa` e `estiloPaginas`. Quando diferem, o prompt pede a forma composta e a skill usa o modelo das páginas como base, transplantando a capa com CSS escopado. Templates continuam inteiros e o cockpit mantém um único estilo.

## Stack decidida (resumo)
- Node (Fastify) local + React + Vite + TypeScript no navegador.
- child_process spawn de `claude -p` ou `codex exec`, por contrato de provedor, com WebSocket pro streaming na tela.
- Markdown/JSON local pra estado; React Flow desde o MVP.
- Render de download prefere Playwright do VKOS, mas o Hub carrega `playwright-core` próprio e usa Edge ou Chrome do sistema como fallback. Cada cliente não precisa instalar dependências de render separadamente.

## Riscos a vigiar
- Auth do CLI: o app depende do Claude Code ou Codex estar instalado e logado na máquina. Detectar e guiar o setup.
- Rate limit ao paralelizar: limitar concorrência e dar feedback claro.
- Acoplamento com a estrutura de pastas do VKOS: se o VKOS mudar, a ponte quebra. Ler estrutura de forma tolerante, não hardcodar caminhos além do essencial.
