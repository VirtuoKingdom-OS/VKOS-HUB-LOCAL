# Simplificação do cockpit: contêineres, árvore e geração unificada

## Contexto

Depois da rodada 6 o app funciona, mas ficou complexo e confuso, o contrário do objetivo. Problemas apontados pelo Jesse: gerações espalhadas como nós soltos ligados direto no Cérebro, fluxos de carrossel, post e stories tratados como coisas muito diferentes quando a diferença real é só tamanho e quantidade de imagem, nó de site sem prévia nem botão de abrir, terminal sem partida facilitada, Cérebro não editável pelo app, composer sem anexo universal de documentos.

## Decisão

1. Topologia em árvore: Cérebro liga no fluxo (sessão), o fluxo liga no contêiner de gerações. Nunca mais Cérebro direto na geração.
2. Contêiner de gerações por tipo (Carrosséis, Posts, Stories, Sites): nó compacto que agrupa todas as gerações do tipo em miniatura. Clicar abre a galeria completa (ver, baixar, navegar). Os nós individuais de geração deixam de existir.
3. Geração de imagem unificada: carrossel, post e stories usam o mesmo motor, a skill de carrossel, que NÃO pode ser modificada. O composer escolhe formato (múltiplas páginas ou página única) e proporção (1:1, 4:5, 9:16). A diferença vai como instrução no prompt.
4. Site: miniatura real da página no cockpit, botão de abrir em nova aba, e painel de preview dentro do app com presets mobile e desktop (desktop escalado pra caber) e atualização ao vivo.
5. Terminal: botões de primeiro uso pra iniciar o Claude ou escolher a pasta de trabalho. Nada roda sozinho.
6. Cérebro editável no app: o conteúdo completo do cerebro.md abre num editor e salva direto no arquivo. Antecipação parcial da fase 4 do roadmap.
7. Anexos universais no composer: imagem, markdown, texto e documentos entram na pasta de materiais e vão no prompt como caminho de arquivo.

## Por quê

O VKOS APP existe pra simplificar e dar visibilidade ao que hoje se faz no Claude Code dentro do VS Code. Cada nó a mais no canvas é custo cognitivo. Agrupar gerações num contêiner e ligar tudo em árvore devolve a leitura de relance. Unificar carrossel, post e stories evita manter três skills visuais quando uma resolve, e preserva a skill de carrossel que já funciona perfeitamente.
