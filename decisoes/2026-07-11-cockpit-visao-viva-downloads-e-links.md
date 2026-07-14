# Cockpit como visão viva, downloads e o tipo links

## Contexto
O Jesse definiu: o cockpit não é só um gerador, é a visualização do sistema inteiro funcionando. E pediu: barra de fluxos só ao clicar no Cérebro (ela estava vazando pras outras telas), downloads das gerações com nome alinhado, telas de fluxo mais generosas, e uma seção de fontes de dados no menu com os tipos texto, imagens e links.

## Decisão
1. Barra de fluxos vira popover contextual do nó Cérebro: só aparece ao clicar nele. Nada de posicionamento fixo vazando pra fora do cockpit.
2. Toda geração existente em `conteudo/` vira nó no canvas, conectado ao Cérebro, sincronizado com o disco. O cockpit mostra o sistema inteiro: Cérebro, fontes, sessões e gerações.
3. Contextos ganham o terceiro tipo: `links`. Conteúdo em `notas.md`, uma linha por link (`- url descrição`), legível por humano e pelas skills.
4. Download com nome alinhado: base = tema sem separadores (`bolo-sem-susto` vira `bolosemsusto`), arquivos `base01.png`, `base02.png`. Botão por imagem (download direto renomeado) e botão "Baixar tudo" que entrega um ZIP (`base.zip`) gerado pelo backend, só pra fluxos de imagem.
5. Menu lateral ganha a seção "Fontes de dados": Textos, Imagens e Links, com telas pra ver, criar, editar em tela cheia e excluir fontes fora do cockpit. O editor de tela cheia é compartilhado entre cockpit e telas.

## Por quê
A tese do produto é ver o negócio operando, não operar ferramenta. O canvas que mostra tudo que existe entrega isso. O download renomeado remove o último atrito entre gerar e postar. Links como tipo próprio fecha a tríade de insumo que alimenta o Cérebro: o que o dono escreve, o que ele vê e o que ele referencia.
