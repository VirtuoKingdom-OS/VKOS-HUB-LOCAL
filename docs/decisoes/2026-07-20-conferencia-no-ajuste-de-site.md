# Conferência automática também no ajuste de site

## Contexto

O laço de conformidade nasceu para a geração guiada de site: gerar, auditar, mandar a própria sessão corrigir, auditar de novo. O ajuste com IA na TelaSite ficou de fora de propósito, porque não tinha `pastaAlvo`.

Na prática isso abriu um buraco. Um site gerado e aprovado foi ajustado pela IA, que passou a referenciar `img/foto.jpg`, uma imagem que ela não podia produzir e não criou. Nada reauditou depois da edição. O erro só apareceu quando o usuário clicou em Publicar, com o site já quebrado e a tela dizendo "Pronto. O site foi atualizado".

## Decisão

O ajuste de site entra no laço, igual à geração. A `pastaAlvo` do ajuste vem do escopo já resolvido e confinado no servidor, nunca do corpo HTTP, e vale a peça inteira mesmo quando a página aberta é aninhada.

Junto entram duas coisas. O prompt de ajuste passa a proibir referência a arquivo que não existe: sem poder produzir a imagem, a IA resolve com o que já existe ou com CSS e diz o que faltou. E a TelaSite deixa de anunciar "Pronto" enquanto a conferência roda: mostra que está conferindo ou corrigindo e, se terminar com pendências, fala isso em vez de dar sucesso.

Carrossel continua fora: a auditoria é de site.

## Por quê

Editar um site pronto quebra tanto quanto gerar um site errado. O princípio da casa é geração verificada, não confiada, e ele valia só na metade do caminho: o momento em que o usuário mais mexe no site era justamente o não verificado.

Endurecer só o prompt não resolveria. Prompt é probabilístico, e a arquitetura já tinha a auditoria determinística pronta e compartilhada com a publicação: bastava ligá-la no outro momento em que a IA escreve. O prompt entrou como prevenção barata, não como garantia.

A mudança na tela é parte da correção, não enfeite. Dizer "Pronto" enquanto o Hub ainda pode reescrever o arquivo é mentira, e era o que fazia o problema chegar ao usuário só na publicação.
