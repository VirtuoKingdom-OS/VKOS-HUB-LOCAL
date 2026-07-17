# Galeria das Fontes de dados no editor

## Contexto

Studio e Site aceitavam upload local ou geração por IA, mas não reutilizavam imagens já guardadas nas Fontes de dados.

## Decisão

A galeria lista imagens dos contextos e copia o arquivo escolhido para `conteudo/<peça>/img/` pela rota segura de imagem da peça. O HTML recebe somente o caminho relativo devolvido. A URL `/api/contextos/...` nunca entra no artefato.

Anexos reservados do composer em `materiais/cockpit/anexos/` ficam fora da galeria nesta versão.

## Por quê

A publicação leva a pasta da peça. Referenciar a fonte externa ao artefato faria a imagem funcionar no preview local e quebrar depois de publicar.
