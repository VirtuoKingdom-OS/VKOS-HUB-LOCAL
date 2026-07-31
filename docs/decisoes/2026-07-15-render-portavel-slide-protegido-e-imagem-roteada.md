# Render portátil, slide protegido e imagem roteada

## Contexto

O download PNG dependia de `playwright` instalado em `node_modules` do workspace ativo. O `package.json` podia declarar a dependência sem que o módulo estivesse presente, causando erro tanto no download individual quanto no ZIP. No Studio, clicar no vazio selecionava o próprio `.slide`; um arrasto gravava `left` e `top` inline e deslocava a página inteira. Pedidos de nova imagem feitos no `Ajustar com IA` iam para o ajuste genérico de HTML, que podia falhar no sandbox antes de gerar qualquer asset.

## Decisão

O servidor empacota `playwright-core`. O renderizador ainda prefere o Playwright completo do VKOS, mas, quando ausente ou sem Chromium, abre o Edge ou Chrome instalado no sistema. A dependência de render pertence ao Hub e não precisa ser repetida em cada cliente.

O `.slide` passa a ser uma raiz protegida. O motor não o seleciona, não inicia arrasto, não move pelas setas e remove `left` e `top` inline do slide durante a serialização. Elementos internos continuam totalmente editáveis.

O painel de ajuste classifica pedidos explícitos de criação de imagem. Esses pedidos usam o fluxo dedicado `imagem`, que já controla nome, caminho, espera do arquivo e aplicação no alvo. A página é resolvida por número, ordinal ou pelo foco atual. O resultado entra como `<img data-vkos-image-bg>` dentro do slide, com dimensão completa e opacidade de fundo, preservando troca, geração e exclusão pelo Studio. Ajustes textuais e estruturais permanecem na sessão escopada por peça.

A TelaSite segue o mesmo contrato. Ela lê o HTML salvo, localiza a seção citada no pedido, com suporte explícito a hero, topo, sobre, serviços e CTA, e envia o texto dessa seção como contexto visual. Depois que o bitmap aparece, relê a versão mais recente da página, insere um `<img data-vkos-image-bg>` dentro da seção, mantém o conteúdo acima dele e grava pela rota atômica de página. A aplicação assíncrona faz parte da conclusão: gerar o arquivo sem salvar o HTML é erro, não sucesso.

## Por quê

Render é responsabilidade do produto, não da pasta de cada cliente. A página é o sistema de coordenadas do editor e não deve ser tratada como objeto. Geração de bitmap e edição de HTML têm ferramentas, estados de conclusão e falhas diferentes; roteá-las separadamente evita sessões que dizem ter ajustado sem criar o arquivo necessário.
