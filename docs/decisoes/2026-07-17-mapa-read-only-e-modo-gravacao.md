# Mapa read-only com modo discreto

## Contexto

O Mapa precisa explicar o funcionamento real do Hub sem sugerir que os nós ou conexões podem ser editados. Em apresentações ou compartilhamentos, títulos e descrições também podem expor a arquitetura interna.

## Decisão

1. Nós e conexões não oferecem cursor, alça ou gesto de edição. O clique apenas destaca o circuito relacionado.
2. Títulos e descrições dos nós podem ser ocultados separadamente.
3. O Modo discreto oculta os dois, transforma cada nó em um símbolo neural e protege também rótulos das conexões, nomes da legenda e painel detalhado.
4. `CLAUDE.md` obriga toda tarefa que mudar módulo, responsabilidade ou fluxo a conferir e atualizar `interno/mapa-sistema.json` antes do fechamento.

## Por quê

O Mapa continua fiel ao sistema e útil para leitura, mas pode ser compartilhado sem revelar o desenho interno. A manutenção deixa de depender da memória de quem executa a rodada.
