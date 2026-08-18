---
name: landing
description: >
  Escreve uma página de captura (landing) focada em UMA oferta e UM objetivo: promessa, prova,
  oferta e formulário/CTA, e constrói a página pronta em HTML se o comprador quiser. Use quando
  o comprador disser /landing, "página pra uma promoção", "página de captura", "quero capturar
  contatos pra X", ou quando /site indicar que é página única.
---

# /landing: página de captura de uma oferta só

Landing tem um único trabalho: converter quem chega em contato/lead pra UMA oferta. Sem menu,
sem distração, um caminho só. E se o comprador quiser, o VKOS constrói a página pronta em HTML
e CSS, direto na pasta da peça (Passo 4, opcional).

## Antes

Leia `cerebro/cerebro.md`. Em branco → `/instalar`. Foque na oferta específica que o comprador
quer promover. Regras de conversão: abra na dor (teste dos 5 segundos),
especificidade > descrição, CTA que responde as 3 perguntas, e não ancore o preço no zero/grátis.

## Passo 1: a oferta e a ação

Confirme: qual é a oferta única? Qual a ação desejada (deixar WhatsApp, agendar, baixar algo,
comprar)? Qual o público exato dessa página?

## Passo 2: escrever

Estrutura de conversão, na voz do Cérebro:

1. **Headline:** a promessa concreta da oferta. Grande e clara.
2. **Subheadline:** pra quem é + o benefício principal.
3. **A dor:** o problema que essa oferta resolve (rápido, o cliente se reconhece).
4. **A oferta:** o que é, o que inclui, como funciona. Concreto.
5. **Provas:** depoimentos, números, garantia (o que tiver de real).
6. **Quebra de objeção:** responde o "será que é pra mim?" (bloco 7).
7. **CTA (repetido 2-3x):** a ação única, botão claro. Se tiver formulário, diga os campos
   mínimos (quanto menos, mais gente completa).
8. **P.S. / urgência honesta:** se houver prazo/vaga real, use. Sem falsa escassez.

## Passo 3: entregar o texto

Salve em `conteudo/<AAAA-MM-DD>-landing-<oferta>/landing.md`. Diga que é só montar num construtor
de página única, seção por seção.

E ofereça o próximo passo, em uma frase simples: *"Se você quiser, eu mesmo construo a página
pronta, com visual e tudo, aqui na sua pasta. Quer?"* Se ele topar, vá pro Passo 4. Se não,
siga pro "Como colocar no ar".

## Passo 4 (opcional): construir a página

Só entre aqui com o texto do Passo 2 **aprovado** pelo comprador. A construção usa o texto
aprovado como conteúdo, não reescreve nada sem avisar.

1. **Leia antes de qualquer código:** `templates/site/principios-visuais.md` INTEIRO (vale
   igual pra landing: cor, tipografia, layout, motion, proibições, teste final e o contrato do
   Studio na seção 6) e `templates/design/cartela.md`. Se o `identidade/design-guide.md`
   estiver preenchido, ele manda mais que a cartela: as cores e fontes da marca ocupam os
   papéis, a direção vira só personalidade.
2. **Declare a leitura de design em UMA linha** antes da primeira linha de código:
   *"Lendo isto como: página única para [público], linguagem [vibe], direção [direção da
   cartela]."*
3. **Construa na mesma pasta da peça:** um arquivo só,
   `conteudo/<AAAA-MM-DD>-landing-<oferta>/index.html`. Landing é uma página, então não crie
   outras. E nunca nomeie página de `carrossel.html`: o app usa exatamente esse nome pra
   reconhecer peça de carrossel, e uma página com ele faz a peça inteira ser lida errado.
4. **Imagens em `img/`** dentro da pasta da peça, sempre caminho relativo (`img/oferta.jpg`).
   Só imagem real: de `materiais/`, do `identidade/logo/`, ou que o comprador mandar. Sem foto
   boa disponível, resolva com tipografia, cor e composição, nunca com imagem simulada, stock
   externo ou link pra arquivo que não existe.
5. **O destino do `landing.md`:** com a página construída, mova o `landing.md` pra
   `notas/landing.md` dentro da própria pasta da peça. A regra do contrato é nenhum `.md`
   solto na raiz da pasta; em `notas/` o texto aprovado fica guardado pra edições futuras e o
   app continua lendo a peça como site pelo `.html`.
6. **Siga o contrato do Studio (seção 6 do princípios) na íntegra.** Seções semânticas filhas
   diretas do body, decoração com `aria-hidden`, todo clicável é `<a>`, imagem de conteúdo em
   elemento real, caminhos relativos. Na landing isso importa em dobro: é a página que mais
   recebe ajuste fino de CTA e oferta.
7. **Rode o teste final (seção 5 do princípios) antes de entregar:** a pergunta "parece IA?",
   o teste de reflexo nas duas ordens e o checklist item por item, incluindo mobile de 390px
   sem estouro e contraste conferido. Landing que vai receber anúncio abre no celular: o mobile
   é a tela principal, não a exceção. Só entregue o que passar.
8. **Entregue simples:** diga onde a página ficou, que dá pra ver abrindo o `index.html` com
   dois cliques, e aponte o caminho de publicação do "Como colocar no ar". Faltou algo que só
   o comprador tem (uma foto, um preço)? A página sai completa com o que existe e a pendência
   vai listada no seu recado final, nunca como buraco dentro da página.

## Como colocar no ar

O texto está pronto. Agora é escolher onde publicar. Três caminhos, do mais fácil pro mais
completo, todos dá pra começar de graça:

1. **Google Sites** (gratuito, o mais simples). Arrasta e solta, cola cada seção e publica na
   hora.
2. **Wix ou Carrd** (gratuitos no plano básico, visual mais bonito). O Carrd é feito justamente
   pra página única como esta, então costuma ser o encaixe mais natural pra uma landing.
3. **Já tem site em WordPress ou outra plataforma?** É só colar seção por seção no que você já usa.

**Se a página foi construída no Passo 4:** o arquivo pronto está na pasta da peça. Dá pra
publicar de graça em serviços de site estático (o Netlify, por exemplo, aceita arrastar a pasta
inteira e devolve um endereço no ar em um minuto). Página estática assim já nasce leve, o que
ajuda muito quando recebe anúncio.

**Endereço (domínio):** dá pra começar sem comprar nada, o endereço gratuito da plataforma já
funciona. Depois, se quiser algo mais profissional (tipo `seunegocio.com.br`), você registra um
domínio no registro.br por uns R$40 por ano e liga na plataforma.

**Se essa página vai receber anúncio pago:** ela PRECISA já estar no ar e abrindo rápido no
celular antes de você ligar a campanha. Anúncio mandando gente pra uma página fora do ar, ou que
demora pra abrir, é dinheiro jogado fora.

Se você não quiser mexer com isso, a VirtuoKingdom coloca no ar pra você. É só chamar em
virtuokingdom.com.br.

## Princípios

1. **Uma oferta, uma ação.** Zero distração, zero menu.
2. **CTA repetido**, sempre a mesma ação.
3. **Urgência só se for verdade.** Nada de escassez falsa.
4. **Construção sem atalho.** Leitura de design declarada, uma direção executada inteira,
   contrato do Studio respeitado, teste final antes de entregar.
