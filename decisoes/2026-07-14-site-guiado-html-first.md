# Site Guiado nasce HTML-first por prompt, sem tocar nas skills

## Contexto

O Jesse fechou o escopo de features pra focar em vender, mas faltava uma peça pro build in public: o Site Guiado, o segundo botão do Dashboard. A skill /site do VKOS escreve texto em markdown (site.md), não um site navegável, e o app só classifica peça como tipo "site" quando a pasta tem .html.

## Decisão

O Site Guiado gera o site por prompt direto, no mesmo padrão HTML-first do carrossel: a sessão lê o Cérebro, segue a metodologia de texto da skill /site e os princípios de templates/site/principios-visuais.md, e constrói o site HTML estático direto em conteudo/<pasta>/. Nenhuma skill do estudio-aura foi modificada.

Jornada: Dashboard > wizard em 4 etapas (o site com formato página única, site com páginas ou link na bio; estrutura com objetivo nº 1 e seções; imagens; visual) > geração com fases e minimizar > tela nova #/site/<pasta> com presets Desktop e Mobile, seletor de páginas, abrir em nova aba, atualização ao vivo e painel "Ajustar com IA" com estado local.

## Por quê

- O padrão HTML-first já venceu no carrossel: peça editável, preview vivo, sem render obrigatório.
- Modificar a skill /site quebraria o uso dela no VKOS original e nos workspaces existentes.
- O prompt no app funciona em qualquer workspace, sem depender de arquivo novo clonado.
- O ajuste com IA na própria tela fecha o ciclo guiado: o usuário nunca vê o chat.
