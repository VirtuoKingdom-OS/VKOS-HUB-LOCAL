# Laço de conformidade pós-geração de site

## Contexto

O site 05 do Jesse (multipágina, OJESSEGOMES) reprovou na publicação com 10 erros que o usuário só descobriu na hora do deploy: wrapper genérico envolvendo o body, efeito de cursor vazando a tela em 390px, contraste abaixo de 4.5:1, backdrop-filter sem camada real. A barreira funcionou, mas a geração terminava sem ninguém conferir. Prompt sozinho provou que não segura: a cada geração o modelo inventa um jeito novo de reprovar.

## Decisão

Quando uma sessão de geração de site (skill site com pastaAlvo, nunca ajuste) conclui, o servidor roda a MESMA auditoria do deploy (estrutural + visual) na hora. Reprovou com erros acionáveis: retoma a mesma sessão com a lista literal de erros e a ordem "corrija exatamente isto, nada mais", reconfere, até 2 voltas. O site só entra em "pronta" com a conferência terminal (aprovada, ou pendências honestas depois de 2 voltas). Estado visível na UI ("Conferindo o site", "Corrigindo pendências, volta N de 2") via campo `conferenciaSite` na sessão e WS `sessao:conferencia`. Guardas: navegador ausente não dispara correção (não dá pra verificar), sessão parada não retoma, reentrância protegida. Funciona em Claude e Codex (os dois suportam resume). A auditoria foi extraída pra `publicacao/auditoria.ts`, reutilizável, com as rotas intactas. O prompt também ganhou as 4 proibições das classes novas.

Endurecimento após o teste multipágina: o backend não confia apenas no `pastaAlvo` opcional enviado pelo React. Ele recupera a pasta da linha contratual do próprio prompt do Site Guiado, compara as duas fontes quando ambas existem e recusa inconsistência antes de iniciar a sessão. Isso mantém o laço ativo até para uma aba carregada com JavaScript antigo. Quando há erros, os avisos da mesma auditoria também seguem para a rodada de correção, sem transformar aviso isolado em bloqueio.

## Por quê

Fecha o vão entre gerar e publicar com verificação determinística: quem manda corrigir é a auditoria (fatos, arquivo e medida), não opinião. Continuação da mesma sessão custa uma fração de geração nova e o teto de 2 voltas limita o pior caso. O usuário para de descobrir problema na hora de publicar.
