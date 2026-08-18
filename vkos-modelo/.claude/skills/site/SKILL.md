---
name: site
description: >
  Escreve o texto das seções de um site de negócio (topo, o que faz, provas, sobre, chamada
  final) na voz do negócio, pronto pra montar em qualquer plataforma, e constrói o site pronto
  em HTML se o comprador quiser. Use quando o comprador disser /site, "escreve o texto do meu
  site", "preciso de um site", "não sei o que escrever no site", "faz meu site", ou quando
  /vkos apontar pra cá.
---

# /site: o texto do site, pronto pra montar (e construir, se ele quiser)

O VKOS não hospeda site. Ele escreve o **texto certo** de cada seção, que o comprador cola no
construtor que usar (Wix, WordPress, Instagram bio-site, etc.). Texto bom é o que falta na
maioria dos sites, não a ferramenta. E se o comprador quiser, o VKOS vai além: constrói o site
inteiro em HTML e CSS, pronto pra publicar (Passo 4, opcional).

## Antes

Leia `cerebro/cerebro.md`. Em branco → `/instalar`. Use frase-1, oferta, dor, desejo, provas,
objeções, cidade e CTA. Regras de conversão: a ordem é ICP → nível de consciência
→ argumento → só então visual; o herói abre na dor e passa no teste dos 5 segundos, e o CTA
responde as 3 perguntas (o que acontece, quanto tempo, quanto custa).

## Passo 1: tipo e objetivo

Confirme se é o **site principal** (institucional/serviços) ou uma **página só** (aí é `/landing`).
Confirme o objetivo nº 1: gerar contato no WhatsApp? agendamento? orçamento?

## Passo 2: escrever seção por seção

Entregue o texto de cada bloco, marcado, pronto pra copiar:

1. **Topo (herói):** headline com a promessa concreta + subtítulo + botão (CTA). A pessoa tem
   que entender em 5 segundos o que é e por que ficar.
2. **O problema / pra quem é:** o cliente se reconhece (usa a dor do Cérebro).
3. **O que você faz (serviços):** claro, com nome. Se tiver preço/pacote, estrutura simples.
4. **Por que você (provas/diferencial):** números, tempo, resultados, depoimentos reais.
5. **Sobre:** curto, humano, do jeito do negócio.
6. **Dúvidas (FAQ):** responde as objeções do bloco 7.
7. **Chamada final (CTA):** repete o convite, com o contato do Cérebro.

Regras: voz do Cérebro, frases claras, zero jargão, nada de subjetivo. Concreto e com nome.

## Passo 3: entregar o texto

Salve em `conteudo/<AAAA-MM-DD>-site/site.md`, organizado por seção, e diga onde ficou. Explique
em uma linha que é só colar cada bloco na seção correspondente do construtor de site dele.

E ofereça o próximo passo, em uma frase simples: *"Se você quiser, eu mesmo construo o site
pronto, com visual e tudo, aqui na sua pasta. Quer?"* Se ele topar, vá pro Passo 4. Se não,
siga pro "Como colocar no ar".

## Passo 4 (opcional): construir o site

Só entre aqui com o texto do Passo 2 **aprovado** pelo comprador. A construção usa o texto
aprovado como conteúdo, não reescreve nada sem avisar.

1. **Leia antes de qualquer código:** `templates/site/principios-visuais.md` INTEIRO (é a lei
   da construção: cor, tipografia, layout, motion, proibições, teste final e o contrato do
   Studio na seção 6), `templates/design/cartela.md` (a cartela de direções) e
   `templates/design/estilos/indice.md` (a biblioteca de estilos). Escolha UMA direção da
   cartela e UM estilo do índice que casem com o negócio, e leia o arquivo do estilo escolhido
   INTEIRO (`templates/design/estilos/<nome>.md`). Se o `identidade/design-guide.md` estiver
   preenchido, ele manda mais que a cartela e o estilo: as cores e fontes da marca ocupam os
   papéis, a direção vira só personalidade e o estilo entra como sistema de execução.
2. **Declare a leitura de design em UMA linha** antes da primeira linha de código:
   *"Lendo isto como: [tipo de página] para [público do Cérebro], linguagem [vibe], direção
   [direção da cartela], estilo [estilo do índice]."* Aplique o sistema do estilo inteiro
   (cores, escala tipográfica, spacing, motion) adaptado ao negócio. Nunca cite a marca de
   origem do estilo no texto do site.
3. **Construa na mesma pasta da peça:** a home é `conteudo/<AAAA-MM-DD>-site/index.html`.
   Site com mais páginas: cada uma é um `.html` próprio na raiz da pasta (`servicos.html`,
   `sobre.html`, `contato.html`), nome simples, sem acento, sem espaço, links relativos entre
   elas. **`carrossel.html` é nome proibido de página:** o app usa exatamente esse nome pra
   reconhecer peça de carrossel, e uma página com ele faz o site inteiro ser lido errado.
4. **Imagens em `img/`** dentro da pasta da peça, sempre caminho relativo (`img/fachada.jpg`).
   Só imagem real: de `materiais/`, do `identidade/logo/`, ou que o comprador mandar. Sem foto
   boa disponível, resolva com tipografia, cor e composição, nunca com imagem simulada, stock
   externo ou link pra arquivo que não existe.
5. **O destino do `site.md`:** com o site construído, mova o `site.md` pra
   `notas/site.md` dentro da própria pasta da peça. A regra do contrato é nenhum `.md` solto
   na raiz da pasta do site; em `notas/` o texto aprovado fica guardado pra edições futuras e
   o app continua lendo a peça como site pelos `.html`.
6. **Siga o contrato do Studio (seção 6 do princípios) na íntegra.** Seções semânticas filhas
   diretas do body, decoração com `aria-hidden`, todo clicável é `<a>`, imagem de conteúdo em
   elemento real, caminhos relativos. Um site lindo que o Studio não edita é um site entregue
   pela metade.
7. **Rode o teste final (seção 5 do princípios) antes de entregar:** a pergunta "parece IA?",
   o teste de reflexo nas duas ordens e o checklist item por item, incluindo mobile de 390px
   sem estouro e contraste conferido. Só entregue o que passar.
8. **Entregue simples:** diga onde o site ficou, que dá pra ver abrindo o `index.html` com dois
   cliques, e aponte o caminho de publicação do "Como colocar no ar". Faltou algo que só o
   comprador tem (uma foto, um preço)? A página sai completa com o que existe e a pendência vai
   listada no seu recado final, nunca como buraco dentro da página.

## Como colocar no ar

O texto está pronto. Agora é escolher onde ele vai morar. Três caminhos, do mais fácil pro mais
completo, todos dá pra começar de graça:

1. **Google Sites** (gratuito, o mais simples). Você arrasta e solta os blocos, cola cada seção
   no lugar e publica na hora. Bom pra quem quer no ar hoje sem complicação.
2. **Wix ou Carrd** (gratuitos no plano básico, visual mais bonito). Um pouco mais de trabalho,
   resultado mais caprichado. O Carrd é ótimo pra site de uma página só.
3. **Já tem site em WordPress ou outra plataforma?** Então é só colar seção por seção no que você
   já usa, sem começar do zero.

**Se o site foi construído no Passo 4:** os arquivos prontos estão na pasta da peça. Dá pra
publicar de graça em serviços de site estático (o Netlify, por exemplo, aceita arrastar a pasta
inteira e devolve um endereço no ar em um minuto).

**Endereço (domínio):** dá pra começar sem comprar nada. A própria plataforma te dá um endereço
gratuito que já funciona. Quando quiser um endereço mais profissional (tipo `seunegocio.com.br`),
você registra um domínio no registro.br por uns R$40 por ano e liga na plataforma.

Se você não quiser mexer com isso, a VirtuoKingdom coloca no ar pra você. É só chamar em
virtuokingdom.com.br.

## Princípios

1. **Texto primeiro, código depois.** O valor é a mensagem certa por seção; a construção é um
   extra opcional em cima do texto aprovado.
2. **O topo decide.** Se o herói não prende, ninguém rola.
3. **Um objetivo por página.** Tudo empurra pro CTA principal.
4. **Construção sem atalho.** Leitura de design declarada, uma direção executada inteira,
   contrato do Studio respeitado, teste final antes de entregar.
