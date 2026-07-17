# Sites Astro e camada de design: visão

## Parte 1: por que Astro, e por que só na publicação

O teste real do Jesse mostrou o multipágina de hoje: `index.html`, `sobre.html`, `servicos.html`, `contato.html` soltos na raiz da peça, nav e rodapé duplicados em cada arquivo. Funciona, mas o que sobe pro GitHub é um monte de arquivo solto, não um projeto. E o SEO fica no básico: sem sitemap, sem robots, meta tags por conta da sorte.

A primeira ideia era migrar a peça inteira pra projeto Astro. A auditoria do código derrubou: o app inteiro assume "site = HTML servível cru com index.html na raiz" em 9 pontos (auditoria estática, classificação da peça, preview por iframe, editor visual do Studio que salva HTML direto, confinamento da sessão de ajuste que proíbe npm install, publicação que sobe a pasta crua, e a inexistência de qualquer executor de build no app). Migrar a fonte quebraria o editor visual sem contrapartida e exigiria build pra simplesmente VER o site.

A decisão do Jesse resolveu o dilema: **o HTML continua sendo a fonte da verdade local, o Astro entra como formato de saída na publicação.**

- Tudo que funciona continua funcionando: preview instantâneo, Studio editando texto e estilo, Ajuste com IA confinado na pasta, auditoria estrutural e visual.
- Na publicação, um conversor determinístico monta o projeto Astro: nav e rodapé compartilhados viram um layout único (`src/layouts/Base.astro`), cada página HTML vira uma página `.astro`, e o projeto ganha `sitemap.xml`, `robots.txt`, meta tags conferidas, `package.json` e `netlify.toml`.
- O GitHub recebe o projeto Astro fonte: quem clonar tem um projeto de verdade, buildável, com `npm install && npm run build`. A Netlify recebe o `dist/` já buildado pelo caminho REST que já existe (zero mudança no contrato Netlify).
- O ganho de SEO vem do pacote: sitemap, robots, meta tags únicas por página, HTML minificado pelo build. O ganho de estrutura vem do layout deduplcado: mexeu na nav no projeto publicado, mexeu em um arquivo só.

### Por que o conversor não usa IA

Uma sessão de IA por publicação custaria dinheiro e poderia alterar o site que o Jesse aprovou no preview. O conversor determinístico é grátis, instantâneo e fiel: o que você viu é o que sobe. Se um dia divergir, é bug reproduzível de código, não roleta.

### O contrato que torna a conversão confiável

A geração multipágina passa a marcar o HTML com âncoras próprias: `data-vk-nav` na navegação compartilhada, `data-vk-footer` no rodapé, `data-vk-pagina` no conteúdo de cada página, `<title>` e `<meta name="description">` únicos por página. São atributos invisíveis pro visitante e pro Studio, mas dão ao conversor pontos de corte exatos. Peça sem marcadores (as antigas): fallback automático pra publicação HTML pura, com aviso honesto de por quê.

## Parte 2: o design que finalmente chega na geração

A queixa do Jesse: "não senti diferença, parece que nem estão usando as skills que dei". A auditoria confirmou e achou as três quebras:

1. **O prompt convida, não ordena.** O `montarPromptSite` manda a IA "ler os princípios visuais" num único bullet cercado de ~150 linhas de regra mecânica (onde salvar, nomes, CTA, Studio, caminhos). Sem trava, sem verificação, a sessão headless pula a leitura e o reflexo genérico do treino vence. O material em si é forte (352 linhas com cartela, proibições nomeadas e teste anti-slop): o problema é a entrega, não o conteúdo.
2. **A camada v2 nunca saiu do vkos2.** A cartela unificada de 20 direções e as skills `/revisar-design` (nota por área + teste "parece IA?") e `/refinar` existem só no template vkos2. Os workspaces reais (ojessegomes, estudio-aura) usam a skill de site antiga, sem cartela. As skills `impeccable` e `ponytail` estão no repo de DESENVOLVIMENTO, servindo a quem programa o Hub, invisíveis pras gerações de cliente.
3. **O loop nunca fecha.** Nenhuma revisão anti-slop roda depois da geração. A sessão termina "concluída" sem ninguém perguntar "parece IA?".

### A correção, em quatro movimentos

1. **Design primeiro, no prompt.** O `montarPromptSite` é reestruturado: o PRIMEIRO bloco é o design (ler Cérebro, princípios, cartela e o índice de estilos; escolher direção e estilo; declarar a escolha em até 3 linhas no início do trabalho). O encanamento técnico vira um bloco compacto no fim. A declaração é obrigatória e o QA confere que ela aparece na transcrição.
2. **Biblioteca de estilos concretos.** Os 13 arquivos de `outros/designtypes` são curados pra `templates/design/estilos/`: cada um é um sistema completo (tokens de cor com hex, escala tipográfica com tracking, spacing, motion, do's and don'ts, guia de imagem). Ganham nomes neutros (o estilo "caderno quente", não "Notion") e perdem as referências de marca. Um `indice.md` com tema, vibe e "quando usar" guia a escolha. A cartela dá a personalidade; o estilo dá o sistema concreto de tokens que mata o mingau genérico. A sessão escolhe UM estilo que casa com o Cérebro e executa inteiro. Com visual personalizado do wizard, as cores do usuário mandam nos tokens de cor e o resto (tipografia, spacing, motion) continua vindo do estilo.
3. **Camada v2 propagada.** Cartela de 20, princípios atualizados, skill de site v2 (que exige a declaração e o teste final), `/revisar-design` e `/refinar` copiados pros workspaces reais e pro vkos2. Fim do desalinho de versão.
4. **Botão de revisão afiado.** O preset "Revisão de design" que já existe na TelaSite passa a invocar a skill `/revisar-design` completa (nota 0 a 10 por área, teste anti-slop nas duas ordens, correções aplicadas em ordem de impacto). Manual, por decisão do Jesse: a melhoria principal vem da geração; o botão é a segunda linha de defesa.

## Critério de fechamento da rodada

- Uma geração real multipágina sai com a declaração de design na transcrição, tokens do estilo escolhido no CSS, marcadores presentes, preview e Studio funcionando como sempre.
- A conversão da peça gerada produz um projeto Astro que builda no motor compartilhado, com dist/ batendo página a página com a peça, sitemap e robots presentes.
- Peça antiga sem marcadores publica como HTML puro com aviso, sem quebrar nada.
- GitHub recebe fonte Astro, Netlify recebe dist/, barreira de auditoria intacta nos dois.
- Workspaces reais com a camada v2 completa (cartela, estilos, skills site/revisar/refinar).
- Typechecks e testes verdes, 3 temas ok nas telas tocadas.
