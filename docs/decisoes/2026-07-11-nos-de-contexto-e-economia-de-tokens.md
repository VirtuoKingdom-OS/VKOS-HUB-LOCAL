# Nós de contexto e economia de tokens por referência

## Contexto
O Jesse quer mandar mais que o tema num fluxo: colar textos, imagens e documentos. E quer nós próprios pra isso no canvas, renomeáveis (ex: "Referências de site"), que funcionam como extensão do Cérebro. Tudo isso gasta tokens se entrar no prompt.

## Decisão
1. Nó de contexto: tipo novo de nó no canvas. Tem nome editável, texto livre e anexos (imagem, documento). Conecta-se a nós de sessão.
2. O conteúdo vira ARQUIVO, não prompt: cada nó salva em `materiais/cockpit/<slug>/` dentro da pasta do VKOS (a pasta `materiais/` já é a casa dos insumos crus no VKOS). Texto vira `notas.md`, anexos viram arquivos.
3. O prompt referencia, não carrega: por nó conectado, uma linha apontando a pasta ("leia o que for útil"). A sessão Claude, rodando com cwd no VKOS, lê só o que precisar.
4. Anexo direto no composer de um fluxo cria um nó de contexto por baixo, já conectado.
5. O Cérebro continua sem injeção no prompt: o CLAUDE.md do VKOS já manda ler. Detalhes adicionais só entram no prompt se preenchidos.

## Por quê
Passar referência em vez de conteúdo é a maior economia de token possível sem perder contexto: o custo fixo por nó conectado é uma linha, e o agente decide o que ler pelo nome dos arquivos. Usar `materiais/` mantém a coerência com o VKOS: os insumos ficam onde as skills já procuram, versionáveis e visíveis pro dono.
