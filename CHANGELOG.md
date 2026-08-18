# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
O VKOS Hub Local segue [versionamento semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

**O VKOS passou a vir junto.** O repositório sempre publicou o cockpit sem publicar a coisa que ele dirige: quem clonava subia o servidor e chegava numa tela sem workspace nenhum pra abrir, e sem saída, porque criar workspace novo clona a estrutura do workspace ATIVO e não havia nenhum ativo. Agora um VKOS limpo vem versionado em `vkos-modelo/`: os 33 comandos, os templates de carrossel, stories e site, a camada de design, e o Cérebro em branco de propósito. Na primeira abertura o servidor copia ele pra `workspaces/meu-negocio/` e abre a cópia, então o modelo continua intacto e o Cérebro do dono cai na pasta que o git ignora. Uma instalação que já tem `VKOS/` ao lado de `app/` continua ganhando precedência e não muda de comportamento. Saíram do modelo, antes de ele virar público, o material sob licença source-available com cláusula de campo de uso (que não combina com AGPL nem com programa de código aberto) e o telefone real do autor que estava num exemplo. Ver `docs/decisoes/2026-08-18-o-vkos-vem-junto-no-repositorio.md`.

**O código abriu.** Em 2026-08-06 o repositório passou a ser público sob GNU AGPL-3.0-or-later, antecipando a Change Date que a Business Source License 1.1 previa para daqui a quatro anos. Você pode usar, estudar, mudar, distribuir e vender. Se rodar uma versão modificada como serviço de rede para outras pessoas, precisa oferecer o código dela a elas, que é a seção 13 da AGPL e o motivo de ela ter sido escolhida: rodar o Hub na sua máquina, para o seu negócio, não obriga a nada, mas ninguém fecha este código por cima e vende como SaaS sem devolver. A licença comercial separada continua existindo em paralelo, porque o copyright é do autor. Junto vieram a documentação de entrada em inglês (`README.md`, `docs/ARCHITECTURE.md`, `docs/INSTALL.md`), o `CODE_OF_CONDUCT.md`, a política de divulgação responsável no `SECURITY.md`, o CI rodando em Linux e Windows e a exigência de DCO nos pull requests. Nada de dado real foi para o mundo: a pasta de backup que estava versionada por engano saiu do rastreamento, e os caminhos absolutos da máquina do autor saíram dos documentos. Ver `docs/decisoes/2026-08-06-o-hub-vira-open-source.md`.

O terceiro fluxo de criação: uma campanha de Google Ads inteira, planejada pela IA e entregue pronta pra colar no painel. Ver `docs/decisoes/2026-07-31-o-fluxo-de-anuncios.md`. E o Cérebro passou a ser conversável de verdade, do começo ao fim e depois do fim. Ver `docs/decisoes/2026-08-04-quem-encerra-o-cerebro-e-o-dono.md` e `docs/decisoes/2026-08-04-a-cerimonia-volta-a-ser-painel.md`.

### Adicionado

- **O Criador de Estilos**, no nível CORE. Você monta a cara do Hub: escolhe o plano de trabalho, a tinta e a cor de marca, e o app monta a paleta completa a partir daí. Dá também pra colar um tema que você achou por aí, soltar uma imagem e tirar as cores dela, ou descrever em palavras e deixar a IA montar. Um estilo aprovado vale em todos os workspaces ao mesmo tempo, e a identidade VKOS fica sempre a um clique de distância. Ver `docs/decisoes/2026-08-05-o-criador-de-estilos.md`.
- **Nenhum estilo entra sem passar no contraste**, e é a mesma medição que aprova o Escuro e o Claro de fábrica. Enquanto você mexe numa cor, a tela mostra o app em miniatura vestido com ela e a lista do que ainda não fecha, com o número de cada par. Quando alguma cor não passa, o Hub conserta pelo menor passo possível e diz exatamente o que mexeu, com o antes e o depois.
- **Um estilo tem sempre os dois lados.** Você monta um, o outro nasce sozinho, e o botão de sol e lua continua fazendo o que fazia. Dá pra ajustar o lado derivado à mão, e pra refazer ele do zero quando se arrepender.
- **A imagem é lida no seu navegador**, e não sobe pra lugar nenhum: o que vai pro servidor são só as cores que apareceram nela.
- **Assistente do Hub no CORE**, com conversas persistentes, sessões sem workspace, briefing curado, propostas de lote, aprovação humana, fila append-only por tarefa e rastro de efeitos do servidor. A tela `/assistente` reúne histórico, conversa, fila e rastro em três colunas e direciona cada geração pelo `workspaceId` sem trocar o workspace ativo.
- **Contrato de lote e infraestrutura de execução**, com `lote.json` isolado em pasta temporária, tarefas de carrossel, site e anúncio, recuperação segura após reinício e custo das sessões CORE no Dashboard.

- **O Chat do Cérebro**, uma guia nova no painel, ao lado de Ler. É a mesma conversa que montou a identidade, e não um chat novo ao lado do documento: ela sabe o que já foi perguntado, o que você respondeu e o que você recusou. Peça "a voz está formal demais, deixa mais direta" e o documento muda, com a guia Ler relendo o arquivo sozinha quando o turno termina. Se a conversa tiver morrido, isso é dito na cara, e a conversa nova começa lendo o Cérebro que já existe em vez de recomeçar a entrevista.
- **O botão de concluir o Cérebro**, com confirmação em dois passos.

- **Criar anúncio**, ao lado de criar carrossel e criar site. O assistente pergunta o que o Cérebro não tem como saber: qual oferta anunciar, para onde vai o clique, em que cidades e quanto se pode gastar por dia. Sem a pergunta do orçamento o bloco de investimento seria chute, porque o Cérebro não tem nenhum número de dinheiro dentro dele.
- **A campanha é um arquivo com contrato, não um texto solto.** `anuncio.json` na pasta da peça, conferido campo a campo. Título tem 30 caracteres no Google, descrição tem 90, frase de destaque tem 25, e o valor da tela é afirmar que aquilo cabe.
- **A página da campanha**, em nove blocos: estratégia, estrutura, palavras-chave, negativas, anúncios, recursos, orçamento, conversões e publicação. Campanha pela metade não dá pra lançar: sem orçamento e sem conversão o dono não sabe se está ganhando ou perdendo dinheiro. Cada campo do Google tem a contagem de caracteres e um botão de copiar; palavra-chave copia na sintaxe do painel, com `[exata]` e `"frase"`, pra colar o grupo inteiro de uma vez.
- **Texto que estoura o limite aparece marcado, e não é corrigido sozinho.** Passar de 30 caracteres é um problema que o dono precisa VER, não motivo pra recusar a campanha inteira. Se a validação reprovasse isso, um título ruim deixaria o dono sem nada em vez de deixá-lo com quase tudo.
- **O chat ao lado é a mesma conversa que gerou a campanha.** Pedir "troca os títulos do grupo 2 por ângulo de urgência" reescreve o arquivo e a página se atualiza sozinha, sem recarregar e sem botão. Sair da tela e voltar reencontra o histórico. Provado com IA real, dois turnos: o segundo pedido dizia só "o grupo 2" e a sessão retomada entendeu.
- **A conversa que morreu é dita na cara.** Se a sessão acabou, o campo fica desligado e a tela oferece começar outra, na mesma pasta e com a campanha atual em mãos. Fingir continuidade destruiria o único valor dessa parte.

### Corrigido

- **Um erro numa tarefa de fundo não derruba mais o Hub inteiro.** E não era risco teórico: o tratamento de "o workspace desse lote não existe mais" tentava marcar a tarefa como falhou, a fila não aceitava essa transição, e o próprio tratamento do erro estourava. Como quem chama o executor é um relógio de 250ms que não espera resposta, a rejeição solta matava o processo do servidor. Na prática: aprovar um lote e excluir o cliente antes de a fila chegar nele fechava o Hub, com todas as sessões em andamento junto, e o motivo ficava numa janela minimizada que ninguém abre. Agora uma tarefa podre falha sozinha, a fila segue para a próxima, e o servidor tem uma última rede que segura erro solto em vez de morrer.
- **Uma tela quebrada não branqueia mais o app inteiro.** Não havia nenhuma fronteira de erro em 100 mil linhas: qualquer erro ao desenhar levava a página toda ao branco, e o F5 caía na mesma tela e branqueava de novo. Agora a tela que parou diz que parou, mostra o motivo em voz baixa, e a barra lateral continua de pé para você ir a outro lugar. Provado no navegador com um erro injetado de propósito.
- **Dá para remover um token das Conexões.** Antes não dava: limpar o campo e salvar não apagava nada, e desabilitar a conexão deixava o segredo em texto puro no arquivo local. Agora existe "Remover token", com confirmação em dois passos, e ele apaga de verdade, do disco. A regra que impede um campo não tocado de apagar o token por acidente continua valendo inteira. Ver `docs/decisoes/2026-08-06-a-porta-de-saida-do-segredo.md`.
- **Zero alertas de segurança nas dependências**, de oito que havia. O `@modelcontextprotocol/sdk` foi removido, e não atualizado: ele estava declarado e não era usado em lugar nenhum. O `@fastify/static`, que serve o app e tinha quatro avisos altos de travessia de caminho, subiu para a 10.1.2. A troca de cabeçalhos de cache e a devolução da casca do app foram conferidas num servidor de verdade. Ver `docs/decisoes/2026-08-06-as-dependencias.md`.
- **O Mapa voltou a bater com o sistema.** Ele estava sem as telas de Estilos e de Instagram, e sem os dois módulos que alimentam o funil (a mineração e o formulário do site), enquanto apontava a origem dos leads para o lugar errado. Agora há trava conferindo o Mapa contra o código, que era o que faltava para ele parar de envelhecer em silêncio.
- **Cota de IA estourada não trava mais a Cerimônia do Cérebro.** Quando o Codex ficou sem cota no meio de uma entrevista, a tela mostrou o texto cru em inglês da OpenAI dentro da conversa, como se fosse resposta da IA, e a cerimônia parou sem uma só ação disponível: o campo continuava aberto e escrever nele não ia a lugar nenhum. Agora a mensagem vira português e diz a hora em que a cota volta; a tela reconhece que a sessão morreu, mostra o motivo numa faixa e oferece as saídas de verdade: responder de novo para continuar de onde parou (quando há conversa para retomar) ou recomeçar com o outro motor, se ele estiver instalado. O rótulo diz "recomeçar" de propósito, porque a conversa pertence ao motor que a abriu. A decisão virou função pura testada, e ela não oferece motor que não está na máquina. Ver `docs/decisoes/2026-08-05-falha-de-motor-nao-trava-fluxo.md`.

### Alterado

- **O Criador de Estilos mudou de alvo: ele veste o carrossel, e não mais o cromo do Hub.** O Hub não é o que este produto publica. Ver `docs/planos/estilos-da-peca/plano.md`. A medição que motivou a virada foi feita nas peças reais que já existem em disco: **três das quatro reprovavam no texto de dentro do botão**, em 3,79:1 contra um piso de 4,5, e isso vai pro Instagram pra ser lido no celular, na rua, no sol. E a paleta do cliente não estava registrada em lugar nenhum: cada geração reinventava o roxo dele, com dois roxos diferentes e dois nomes diferentes pro mesmo trabalho, no mesmo cliente.
- **A régua da peça é a mesma fórmula, com outros pares.** Ela mede o que o Hub publica, que até agora ninguém media. Quem decide o papel de cada cor é a luminância medida, e nunca o nome: há peça real com `--paper` escuro e `--ink` claro, o contrário do que valem nos modelos. `node ferramentas/medir-pecas.mjs` mede as suas peças e os modelos com a régua do Hub.
- **Dá pra vestir uma peça que já existe**, e a troca é determinística: nenhuma IA participa. O nome que a IA batizou naquela geração e que o Hub não conhece **sobrevive**, e a tela diz quais foram: apagar deixaria `var(--spark)` apontando pro vazio, que no CSS é transparente, e o texto sumiria da peça sem erro nenhum.
- **A vitrine deixou de desenhar o app em miniatura e passou a carregar um modelo de carrossel de verdade.** Você escolhe o modelo, vê a capa e uma página interna com as suas cores por cima, e lê o veredito daquele modelo já vestido. Julgar uma marca olhando o modelo em que ela vai sair é a única evidência honesta. Os 14 modelos de fábrica foram medidos: 11 saem limpos e nenhum sai pior do que entrou.

- **Carrossel quadrado e vertical publicam certo, e proporção misturada é recusada antes de subir.** O render já preservava o formato de cada peça, porque ele fotografa o elemento da página e não a janela. O que faltava era conferir o que a Meta aceita: proporção fora de 4:5 a 1.91:1 ela recusa com um erro que não diz qual página, e num carrossel ela corta todas pela proporção da primeira, sem avisar e depois de publicado. As duas viram recusa antes do primeiro byte subir, com a mensagem dizendo qual página e qual medida. A prévia na tela passou a mostrar a proporção real da peça em vez de encaixar tudo numa caixa 4:5.
- **Dá pra publicar reels.** Aba própria no painel de publicar: escolhe o vídeo, escreve a legenda e manda. O vídeo **não** passa pelo Supabase, diferente de imagem: vídeo é a única coisa da API do Instagram que aceita receber o arquivo, então ele sobe direto do Hub pra Meta, e publicar reels funciona com o Supabase desligado. Antes de gastar upload, o Hub lê o próprio arquivo e recusa o que a Meta recusaria depois: vídeo com menos de 3 segundos, mais de 15 minutos ou acima de 1GB, sempre dizendo a duração na mensagem. Vídeo gravado de pé no celular é lido como vertical, e não como horizontal, porque a leitura entende a rotação. Formato longe do 9:16 vira aviso, e nunca recusa, já que a Meta enquadra sozinha. O arquivo vai cru pro Hub, com barra de progresso de verdade, e a ficha dele (duração, medidas, prévia) aparece antes da legenda, que é quando ainda dá pra trocar. Dá pra escolher se ele aparece também no feed ou fica só na aba de reels. Ver `docs/decisoes/2026-08-06-o-reels-sobe-por-bytes.md`.
- **A Galeria publica direto no Instagram, e o Hub lembra o que já saiu.** O painel de publicar abre na Galeria do workspace, lista as peças de carrossel e post, e ao escolher uma o Hub renderiza as páginas do `carrossel.html` no servidor e publica. Nada de baixar página por página e subir de volta pelo Downloads. Peça com mais páginas que o teto de dez do Instagram entra cortada nas dez primeiras, com as de fora visíveis e apagadas para poder trocar; clicar tira e devolve, e a ordem de volta é a ordem do carrossel. O que já foi publicado ganha selo na lista, e republicar continua permitido, porque republicar é quase sempre correção. O registro diz "o Hub publicou isto", e não "isto está no ar": ele não consulta a Meta para responder isso. O nó `instagram` e as ligações com `pecas` entraram no `interno/mapa-sistema.json`.
- **Dá pra publicar post e carrossel do Hub, sem abrir o Instagram.** Escolhe as imagens, reordena, escreve a legenda e publica. Uma imagem vira post, duas ou mais viram carrossel, e a tela não pergunta qual: a quantidade já responde. A Meta não aceita upload de imagem, só URL, então a peça passa por um balde privado no Supabase com endereço assinado de dez minutos e é apagada assim que a publicação termina, inclusive quando ela falha no meio. O balde nasce sozinho na primeira vez, sem passo manual. O Hub espera a Meta processar cada peça antes de publicar, que é o que evita o erro intermitente de publicar cedo demais. Legenda longa, formato errado e mais de dez imagens são recusados antes de subir o primeiro byte. Ver `docs/decisoes/2026-08-05-publicar-no-instagram.md`.
- **A tela do Instagram virou o cockpit da conta, e não mais um relatório.** Clicar numa publicação abre um painel lateral com a peça inteira, a legenda inteira, os números e os comentários, e dá pra responder, esconder e apagar comentário sem sair do Hub. Carrossel mostra as peças na ordem, numa faixa que rola. A conversa não passa pelo cache de uma hora das métricas, porque comentário é dado quente: o dono responde e vê a própria resposta na hora. Toda ação relê a publicação no servidor em vez de remontar a árvore no navegador. A foto da conta entrou na capa. O Hub passou a pedir o escopo de comentários, então **a conta precisa ser reconectada uma vez**: sem isso o painel abre inteiro e mostra o convite pra reconectar no lugar da conversa, em vez de dar erro. Mensagem direta continua fora, e agora há teste que trava isso. Ver `docs/decisoes/2026-08-05-a-conversa-do-instagram-mora-no-hub.md`.
- **A composição do CORE agora declara a função de cada superfície.** Cabeçalho e corpo formam um plano contínuo, as laterais do Assistente viram trilhos, indicadores do Dashboard usam painéis e cada workspace volta a ser uma unidade comparável em cartão. A regra durável passa a ser: chassi contém, plano recebe o trabalho e caixa delimita o que se compara.
- **A identidade visual do Hub agora é a mesma do VKOSHUB.** O Escuro quase preto passa a ser o padrão; o Claro vira creme de laboratório; Geist substitui Inter; títulos ganham voz editorial por tamanho e peso 400; textura de pontos e carvão entram nas superfícies certas. As 17 telas continuam densas, os canvas mantêm a própria grade e os dois temas foram conferidos em três tamanhos sem erro de console.
- **As peças que o Assistente cria voltaram a abrir no Studio, e um lote não sai mais com duas peças da mesma cara.** Os três prompts de geração tinham duas implementações: a do navegador, com 248 linhas, e uma reescrita de 20 no servidor, que a fila do Assistente usava. A reescrita tinha perdido o contrato do modelo visual, as instruções de formato e a linha que manda a skill NÃO renderizar PNG. Sem essa linha a peça nasce com PNG, peça com PNG era classificada como legado, e legado o Studio não abre. Agora existe uma implementação só, no servidor, e as fixtures de snapshot provam que o texto não mudou na mudança de casa. Além disso o `carrossel.html` passou a valer mais que o PNG na classificação, que é o que a decisão do HTML-first já dizia, então as peças que já nasceram travadas abrem sem precisar refazer. O briefing agora lista os modelos visuais de cada workspace, e o Assistente escolhe um diferente por peça do mesmo lote. Ver `docs/decisoes/2026-08-04-o-prompt-tem-uma-implementacao-so.md`.
- **A proposta do Assistente agora chega na fila, e a recusa aparece na tela.** Na primeira conversa real o assistente gravou o `lote.json`, disse que gravou, e a fila continuou vazia sem uma linha de erro. Duas causas: o contrato que ia no prompt não listava campo nenhum, porque a linha que tentava derivá-lo do schema lia `.shape` numa interseção e injetava texto vazio; e o schema exigia os catorze campos que a criação guiada colhe em cinco etapas de uma IA que só tem uma conversa de texto na mão. Agora o assistente escreve o mínimo que só ele sabe, o Hub completa o resto com os mesmos padrões da criação guiada, e o contrato do prompt sai gerado dos schemas, com os valores de cada enum e um exemplo conferido. Quando o lote é recusado, o motivo literal aparece acima do campo com um botão que devolve o erro pra IA corrigir. Ver `docs/decisoes/2026-08-04-o-lote-que-nao-chegava-na-fila.md`.
- **A cerimônia do Cérebro não se encerra mais sozinha.** Antes, a tela de fim substituía a conversa assim que a IA gravava o arquivo, e no uso real isso apareceu como a entrevista fechando no meio de um assunto, anunciando que estava tudo pronto. Gravar o arquivo é fato do disco; declarar a identidade pronta é julgamento, e o julgamento é de quem é dono do negócio. Agora o Cérebro estar gravado só habilita o botão.
- **A cerimônia voltou a ser um painel centrado**, em vez de camada de tela cheia. Numa conversa de uma pergunta e uma resposta por vez, a tela cheia jogava o campo de resposta na borda de baixo do monitor, encostado na barra de tarefas, e esticava a linha do texto além do que o olho acompanha. O véu atrás continua comendo o clique perdido, e ele não fecha no clique de propósito.
- **A entrevista agora escreve em português por instrução, e não por herança.** Uma pergunta real saiu com uma palavra em armênio no meio: o prompt nunca dizia o idioma, só herdava o português do texto em volta.
- **A sessão do anúncio nasce trancada dentro da pasta da peça.** No carrossel e no site quem cria a pasta é a IA; aqui o Hub cria antes de disparar. O motivo é o chat: sessão que nasce na raiz do projeto fica com ela para sempre, e o chat da campanha viraria um agente solto perto do Cérebro. Em duas gerações reais nada nasceu fora da pasta e o `cerebro.md` ficou byte a byte idêntico.
- **Escolher Anúncio no Cockpit abre o assistente**, em vez de criar um nó de conversa que rodaria a skill crua e devolveria um texto solto. A guarda ficou no ponto onde o nó é desenhado, e não só onde ele é criado: o nó que já estava salvo no canvas continuava aparecendo depois do primeiro conserto.

### Interno

- Módulo novo `server/src/anuncios/` e um laço de conformidade próprio, espelho do laço do site, de até 2 voltas: forma quebrada retoma a mesma sessão com o erro literal do schema. Estouro de caractere não faz a IA girar, porque é conteúdo e o dono corrige em dois segundos.
- A peça passou a carregar o veredito sobre si mesma. Antes, um `anuncio.json` corrompido era anunciado como campanha pronta só por o arquivo existir.
- A soma de transcrição com o texto que chega ao vivo virou um componente compartilhado. As três cópias divergentes que já existiam (chat da IDE, cerimônia do Cérebro e nó de sessão) NÃO foram migradas de propósito: trocar as três junto com a estreia de um fluxo é quebrar duas coisas ao mesmo tempo.
- **Foto retocada não é prova.** Um agente relatou ter editado à mão a transcrição de teste para a imagem mostrar o comportamento corrigido, e o conserto que ela ilustrava não tinha teste nenhum. O teste entrou depois, e só passou a valer quando a correção foi apagada de propósito e ele reprovou.

Nada disto fala com a API do Google Ads: não há OAuth, envio de campanha nem leitura de métrica. A campanha sai pronta para o painel, e a Fase 7 do roadmap continua adiada.

## [1.5.0] 2026-07-27

A nova pele. Redesenho em etapas, cada uma deixando o app funcionando, com conferência visual antes e depois nos três temas.

### A base

- **Escalas de verdade no lugar de 146 valores soltos.** Espaçamento, tipografia, peso, raio, movimento, elevação e empilhamento viraram escala derivada. Um teste trava a escala e garante que a camada de tema não a redeclara: lá só entra cor.
- **Paleta nova nos três temas.** Cada token de cor era declarado seis vezes, agora são três. Um teste verifica 48 pares pela fórmula do WCAG 2.2: a paleta antiga falhava em 13, esta falha em zero.
- **Fonte embarcada.** O app não embarcava fonte nenhuma, então a hierarquia de pesos achatava em silêncio em máquina sem a fonte certa. Agora o Inter variável vem no repositório, com a licença ao lado. Local-first não pode depender de CDN nem da máquina.

### A forma

- 83 sombras removidas e 33 trocadas pelos três tokens de elevação. As 84 que ficaram são anel, inset ou foco: nenhuma é elevação, todas são indicador. A profundidade agora é degrau de superfície mais fio de um pixel.
- 23 gradientes ambientes de menta e 30 pulos de hover removidos.
- **O glow ficou, com regra escrita.** Ele é identidade declarada. São três tokens, um para sinal de vivo, um para foco e um para ação, mais a lista do que nunca recebe glow. Glow que marca estado vale, glow que só decora não.
- **A borda de controle ficou firme.** Campo de formulário estava em 1,55:1, que é inacessível. Duas linhas separadas resolvem: a decorativa continua sutil, e só o controle fica forte.
- `prefers-reduced-motion` parou de matar toda animação e passou a substituir: posição some, cor e opacidade ficam, o que pulsa vira fade.

### O que ficou de fora

O redesenho parou numa etapa fechada. Faltam os componentes de campo, chip, selo e superfície; a camada de modal sobre `<dialog>`, que é o que resolve a prisão de foco que hoje não existe em véu nenhum; a passada tela a tela com o corpo de texto menor; e a limpeza dos apelidos de token. A tabela de estado está no topo de `docs/planos/vkos-hub-local-v1/05-design-system.md`.

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

### Studio: manipulação direta

O editor de conteúdo visual ganhou o que faltava para editar sem medo. As melhorias saíram de um inventário de atrito medido usando o Studio de verdade, com uma peça real, não de uma lista de recursos.

- **Refazer.** Existia Desfazer, não existia Refazer: um Ctrl+Z a mais e a edição sumia para sempre.
- **Delete apaga o elemento selecionado**, e Esc solta a seleção mesmo com o foco dentro da página editada, que é onde ele fica depois de um clique.
- **Zoom de 100% era armadilha.** A roda só andava na horizontal, então o topo e o pé da página ficavam inalcançáveis. A causa não era o alinhamento: eram duas rolagens em sequência sob rolagem suave, e a segunda cancelava a primeira.
- **Guias de alinhamento contra os outros elementos**, não só contra o centro do slide.
- **O painel do que foi clicado subiu para o topo.** Ele ficava abaixo da dobra, depois de Camadas e Cores.
- **Uma sequência de setas vira um passo só de desfazer**, com agrupamento por tempo. Antes, vinte setas eram vinte passos.
- **Confirmação visível de salvo**, e uma folha de atalhos, porque nada na tela contava que arrastar, duplicar e desfazer existiam.
- **O contorno de seleção estava no menta errado**, o histórico `#00c896`, e não no `#2fd4a7` do app. Agora ele lê o token do tema e reinjeta quando o tema muda.

Os números vieram de fonte, não de gosto: encaixe de 8 px, agrupamento de 500 ms, pilha de 50 passos, alvo de clique de 24 px. Figma e Canva não publicam essas medidas; as bibliotecas de código aberto publicam.

Fica registrado o que não foi feito: camadas ainda mostram nomes genéricos, elemento em fluxo não redimensiona por alça e nada explica por quê, e não há multi-seleção nem copiar e colar entre páginas.

### Interno

- **Teste sujava o registro de clientes do usuário.** O caminho do registro era calculado uma vez, na carga do módulo, então ignorava a variável que isola os dados de teste. Os testes de rota gravavam no registro real, salvavam antes e restauravam no fim, mas o runner roda os arquivos em paralelo e duas restaurações concorrentes se atropelam. O resultado eram cinco clientes fantasma no Dashboard, apontando para pastas temporárias que já tinham sumido. Nenhum portão viu, porque portão nenhum olha o dado do usuário.
- **Conferência visual** em `ferramentas/olhar-telas.mjs`: abre a interface num navegador de verdade, percorre as telas, coleta erro de console e guarda uma foto de cada uma, nos três temas. Existe porque os cinco portões não veem um pixel e não há teste de DOM aqui. Foi ela que achou os clientes fantasma.

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
- **O `README.md` prometia que nome nunca chega ao contexto da IA.** Chega: o primeiro nome vai em cada linha de "Vozes dos clientes", de propósito, senão o conselho fica inútil. A documentação passou a dizer a verdade. Telefone e email continuam apagados por limpeza automática. Ver `docs/decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`.

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

- `docs/contexto/arquitetura.md`, `docs/contexto/roadmap.md`, `app/CONTRATO.md` e `interno/resumo-contexto.md` reconciliados com o código real. Eles são lidos no início de toda sessão e ainda descreviam Automações, Calendário, camada Google, os quatro conectores e a publicação integrada como recursos ativos. Seção removida agora leva marcador explícito em vez de sumir, para quem lê entender que foi de propósito.
- Checkup completo registrado em `docs/planos/vkos-hub-local-v1/03-checkup-2026-07-26.md`, com evidência de arquivo e linha.

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
- **Publicação integrada de sites.** Ver `docs/decisoes/2026-07-26-fim-da-publicacao-integrada.md`.

### Adicionado

- **Exportação local de site**, no lugar da publicação. `POST /publicacao/:pasta/abrir-pasta` abre a pasta da peça no explorador do sistema, e `GET /publicacao/:pasta/exportar` baixa o site pronto em ZIP. Quando o build Astro é viável, sai o projeto compilado; quando não, sai HTML puro, com o mesmo aviso honesto de antes.
- Primeiro teste do provedor Claude. `montarArgsClaude` virou função exportada, e sete testes garantem que nenhum argumento carrega quebra de linha.

### Corrigido

- **Instrução extra de sessão chegava truncada, em silêncio.** O contexto agregado do CRM e a regra de sessão iam como argumento `--append-system-prompt`. Em máquina onde o Claude é disparado por shell, o caso da instalação por npm ou do fallback pelo PATH, o `cmd.exe` cortava na primeira quebra de linha: dos 2078 caracteres chegavam 13, e `--mcp-config` e `--allowedTools` sumiam junto, sem erro e com código de saída 0. Agora as instruções vão pelo stdin nos dois provedores. Ver `docs/decisoes/2026-07-26-instrucoes-extras-por-stdin.md`.
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
- Material interno (`interno/`, `docs/contexto/`, `docs/decisoes/`, `docs/planos/`) fica fora do pacote de cliente por construção.

### Qualidade

- 133 testes automatizados (112 no servidor, 21 na interface).
- Auditoria visual real por navegador em 390px e 1440px, com rolagem completa, sem JavaScript e com movimento reduzido, bloqueando deploy de site quebrado.

## [1.0.0] 2026-07-14

Primeira versão utilizável na operação real: cockpit multi-IA com canvas, sessões em paralelo lendo o mesmo Cérebro, galeria de peças, Studio de carrossel, Site Guiado HTML, CRM em kanban, calendário, automações, conexões e custo por sessão.
