# Fim da publicação integrada de sites

## Contexto

O Jesse pediu a remoção dos conectores GitHub, Netlify, Notion e Google Calendar. GitHub e Netlify não eram só conectores MCP: eles eram o transporte da publicação de site em um clique. A TelaSite mandava o código fonte para um repositório privado no GitHub e o site compilado para a Netlify, com barreira de auditoria antes de subir.

Remover os conectores sem decidir o destino da publicação deixaria botão morto na interface e código órfão no servidor.

## Decisão

A publicação integrada sai. A geração, o preview, a edição no modo Editar e a auditoria de qualidade continuam intactas.

No lugar da publicação, entra exportação local:

1. Abrir a pasta da peça no explorador de arquivos.
2. Baixar o site pronto como ZIP, já com a conversão Astro aplicada quando ela for viável, e com fallback HTML quando não for.

O conversor Astro, o motor de build e a conferência de qualidade ficam. Eles deixam de servir o deploy e passam a servir a exportação. `server/src/publicacao/github.ts` e `server/src/publicacao/netlify.ts` saem.

## Por quê

O produto é local-first e de uso próprio. Publicar é um gesto que acontece uma vez por projeto e que o Jesse já faz com conta própria, fora do Hub. Manter dois conectores, dois fluxos de token, duas validações de API e um caminho de erro remoto para atender um gesto raro é custo de manutenção que não se paga.

Exportar o site pronto entrega o mesmo valor, o site publicável, sem nenhuma credencial e sem nenhuma chamada de rede. E remove a classe inteira de falha de publicação, que era a mais barulhenta do produto.

A auditoria de qualidade continua sendo o portão. Ela só deixa de bloquear um deploy e passa a bloquear uma exportação declarada como pronta.
