# Publicação de sites por REST direto

## Contexto

O Site Guiado gerava e editava HTML estático, mas ainda dependia de ferramentas externas para versionar e colocar o resultado no ar.

## Decisão

Publicar diretamente com os tokens locais de Conexões. GitHub recebe a árvore completa pela Git Data API. Netlify recebe um ZIP completo pela API de deploy. Cada destino funciona sozinho e o estado fica em `publicacoes.json` por workspace.

As conexões GitHub e Netlify têm uma trilha guiada baseada na documentação oficial, com link direto para gerar o token, instruções de permissões e teste remoto depois de salvar. Configurar e usar a publicação REST continua disponível com Codex. Somente as ferramentas MCP dependem do Claude.

Uma resposta `ready` do deploy da Netlify não basta para declarar sucesso. O publicador testa a URL pública. A criação inicial usa duas operações: primeiro cria o projeto vazio no time explicitamente selecionado, depois envia o ZIP para `/sites/{id}/deploys`. Sem configuração manual, o time principal vem de `/accounts`; o campo opcional `accountSlug` permite escolher outro. Isso evita que `/sites` use silenciosamente um time padrão diferente e bloqueado. Se um projeto antigo responder com HTTP 429, o site é migrado para um projeto criado pela sequência nova no time correto e o mesmo ZIP é enviado novamente. O registro local só é atualizado depois que a URL responde entre HTTP 200 e 399. A interface diferencia publicação em andamento, sucesso verificado e falha externa.

## Por quê

Publicar é uma operação determinística. Não precisa de interpretação, sessão MCP ou custo de IA. GitHub resolve versão e backup. Netlify resolve a URL pública sem acoplar build ou deploy key.
