# Carrossel HTML-first, geração direta e editor visual

## Contexto

O fluxo de carrossel rodava a skill /carrossel de ponta a ponta: a IA conversava dentro do node, gerava o carrossel.html e já renderizava os PNGs via Playwright na pasta da peça. O Jesse apontou três dores: a conversa dentro do node é desnecessária quando o composer já entrega Cérebro mais todas as informações; o PNG nasce sem ninguém pedir; e depois de gerado o carrossel era imutável, qualquer ajuste exigia nova sessão de IA.

## Decisão

1. A fonte da peça de carrossel passa a ser o próprio carrossel.html (HTML-first). O PNG só existe quando o usuário clica pra baixar: o app renderiza sob demanda em pasta temporária e entrega o arquivo, nada de PNG salvo na peça.
2. A geração vira direta: o prompt montado pelo composer instrui a IA a não fazer nenhuma pergunta, decidir lacunas sozinha pelo Cérebro e terminar com resposta curta. Também instrui a pular o passo de render da skill. A skill /carrossel continua intocada, o controle é todo por instrução no prompt.
3. Editor visual de carrossel no app: edita página por página ou o conceito todo. Texto por elemento, fonte, tamanho, peso e cor, cores globais pelas variáveis CSS do :root (vale pra todas as páginas de uma vez), troca de imagem de fundo por upload. Salvar grava o carrossel.html de volta com backup.
4. Peças antigas com PNG continuam funcionando como legado. Peça legada editada e salva vira HTML-first: os PNGs antigos são apagados no save, porque ficariam mentindo o conteúdo.
5. A classificação por subpasta de PNG continua valendo pro legado. Peça nova classifica pelo carrossel.html na raiz. Efeito colateral aceito: geração de página única ou 9:16 nova aparece no contêiner de carrosséis (post e stories já estavam ocultos do menu desde a fase 1).

## Por quê

O PNG automático era custo sem pedido: gastava render em toda geração e congelava a peça num formato não editável. Com o HTML como fonte, a edição fica barata (DOM, sem IA), o download vira escolha do usuário e os templates já foram desenhados pra recolorir por variável CSS. A conversa no node contradizia a tese do produto: o usuário não deveria ver a orquestração, deveria ver resultado.
