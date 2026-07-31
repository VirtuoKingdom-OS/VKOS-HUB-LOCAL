# Contrato de sites estáticos e barreira de deploy

## Contexto

Um site com várias páginas foi gerado com CSS e JavaScript separados, mas o preview local servia esses arquivos como binário genérico. O navegador recusava a folha de estilo. O fluxo também considerava qualquer pasta com HTML pronta e publicável sem conferir index, recursos, links ou responsividade real.

## Decisão

Todo site do Site Guiado segue um contrato estático único. Precisa ter `index.html` na raiz, caminhos internos relativos e todos os recursos dentro da pasta da peça. Páginas podem ficar na raiz ou em subpastas.

O servidor usa MIME correto para HTML, CSS, JavaScript, imagens, fontes, manifestos e WebAssembly. Arquivos de preview usam `no-cache` e `nosniff`. Uma URL de pasta serve o `index.html` interno.

Antes de marcar uma geração como pronta, o Hub confere a árvore do site. Antes de qualquer publicação, repete a conferência e abre todas as páginas em 390 px e 1440 px no Edge ou Chrome. Falta de arquivo, caminho absoluto, recurso quebrado, CSS recusado, erro de página ou rolagem horizontal bloqueia o deploy.

GitHub continua recebendo um snapshot completo pela Git Data API. Netlify continua recebendo um ZIP atômico. Backups, anexos, temporários, Git e `node_modules` nunca entram na árvore publicada.

No modo Visualizar, scripts do site rodam em iframe sem acesso à origem do Hub. No modo Editar, scripts do site ficam desligados e o editor mantém acesso seguro ao documento.

## Por quê

Existir HTML não significa existir site funcional. O contrato precisa ser igual na geração, no preview, no editor e na publicação. Conferência estrutural pega arquivos e caminhos. Conferência em navegador pega CSS, JavaScript e layout real. A publicação só começa depois das duas.

