# Uma criação visual por vez e imagens contextuais editáveis

## Contexto

Ao minimizar um carrossel e abrir Site Guiado, o segundo assistente reutilizava o estado global da primeira geração, mas mantinha a identidade visual de site. O usuário via um site sendo gerado quando o processo real ainda era o carrossel. Além disso, o prompt permitia que o Codex gerasse uma única imagem e a repetisse em todas as páginas. No Studio de carrossel, a troca de imagem dependia de uma imagem grande de fundo, por isso aparecia principalmente na capa.

## Decisão

Carrossel, post, story e site compartilham uma trava global de criação visual. O Dashboard sempre restaura a criação ativa, independentemente do botão clicado. O servidor rejeita com 409 uma segunda sessão com skill `carrossel` ou `site` enquanto outra estiver na fila, iniciando ou rodando. A guarda cobre outra aba, troca de cliente e corrida de cliques.

Os prompts agora planejam imagens depois do roteiro. O Codex gera quantos assets o contexto pedir, com imagem diferente por página, seção ou argumento quando necessário. Repetição só é aceita quando tiver função editorial intencional. Imagem de conteúdo precisa ficar em `<img>` ou `background-image` de elemento HTML real, nunca em pseudo-elemento.

Os dois Studios reconhecem `<img>` e fundo CSS selecionável. Toda imagem selecionada oferece escolher arquivo do computador, gerar outra com Codex e excluir. A geração com IA captura o elemento e seu contexto antes de iniciar a sessão, salva um arquivo novo em `img/` e aplica no mesmo alvo mesmo se a seleção mudar. Excluir remove a referência no HTML, mas preserva o arquivo no disco para não quebrar reutilizações e permitir desfazer.

Frames decorativos que usam `pointer-events: none` continuam sem interação no HTML publicado, mas o runtime do Studio devolve `pointer-events: auto` ao `<img>` interno. Assim uma imagem visualmente coberta pelo frame ainda pode ser selecionada e editada, sem gravar esse override na peça.

O preview de site aberto pelo Cockpit também oferece o atalho para `#/site/<pasta>` ao lado de abrir em nova aba. Preview e edição passam a ter o mesmo destino direto que os carrosséis já tinham.

## Por quê

A interface tem um único estado de progresso guiado, então permitir duas criações visuais produz uma representação incorreta antes mesmo de haver conflito no provedor. A guarda dupla alinha interface e servidor. Imagem é parte do argumento, não decoração repetida: a quantidade precisa nascer do conteúdo. Tratar imagem pelo elemento selecionado elimina a heurística da capa e mantém upload e imagegen no mesmo contrato de edição.
