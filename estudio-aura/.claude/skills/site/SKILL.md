---
name: site
description: >
  Planeja e escreve a mensagem de sites de negócio nos formatos página única, site com páginas
  e link na bio. No VKOS Hub, trabalha junto do prompt guiado que constrói o HTML estático.
---

# /site, mensagem e estrutura do site

No VKOS Hub, o entregável do fluxo guiado é um site HTML estático completo e publicável. Esta
skill define a arquitetura de mensagem. O contrato visual e técnico fica em
`templates/site/principios-visuais.md` e sempre vence quando houver conflito.

## Antes

Leia `cerebro/cerebro.md`. Use oferta, público, dor, desejo, provas, objeções, cidade, voz e CTA.
Se `marca/conversao.md` existir, use como apoio de conversão. A ausência desse arquivo nunca
interrompe a construção.

Não faça perguntas no fluxo guiado. Decida com o Cérebro e com as escolhas do wizard.

## Leitura de design (antes de construir)

Antes de qualquer HTML, leia o design e declare a escolha. Site genérico nasce de pular esta
parte.

1. Leia `templates/site/principios-visuais.md` inteiro (a lei visual e o contrato do Studio),
   `templates/design/cartela.md` (as direções) e `templates/design/estilos/indice.md` (a
   biblioteca de estilos).
2. Escolha UMA direção da cartela e UM estilo do índice que casem com o negócio pela leitura do
   Cérebro e pelo tema. Leia o arquivo do estilo escolhido inteiro (`estilos/<nome>.md`).
3. Declare em UMA linha antes de construir: *"Lendo isto como: [tipo de página] para [público],
   linguagem [vibe], direção [direção da cartela], estilo [estilo do índice]."*
4. Aplique o sistema do estilo inteiro (cores, escala tipográfica, spacing, motion) adaptado ao
   negócio. Nunca cite a marca de origem do estilo no texto do site. Misturar estilos é
   proibido: um estilo por site, executado inteiro. Se o design-guide da marca ou o visual
   personalizado do wizard existir, as cores dele mandam nos papéis e o estilo entra como
   sistema de execução.

## Leitura da mensagem

Defina antes de escrever:

1. Quem precisa se reconhecer na página.
2. Qual problema concreto abre a conversa.
3. Qual oferta resolve esse problema.
4. Qual prova sustenta a afirmação.
5. Qual é a única ação principal.

O herói passa no teste de cinco segundos: a pessoa entende o que é, pra quem é e o que fazer.
O CTA explica o que acontece depois do clique. Não invente preço, prazo, depoimento ou número.

## Página única

Use uma rolagem com as seções que fizerem sentido:

1. Herói: promessa concreta, apoio curto e CTA.
2. Problema ou pra quem é: reconhecimento sem dramatização.
3. Serviços ou solução: nomes claros e escopo compreensível.
4. Provas e diferencial: somente fatos do Cérebro.
5. Sobre: curto, humano e relevante pra decisão.
6. FAQ: objeções reais.
7. Chamada final: repete o mesmo CTA e o mesmo rótulo.

Não é obrigatório usar todas. Cada seção precisa empurrar a mesma decisão.

## Site com páginas

Distribua a mensagem sem duplicar páginas:

- Início: entendimento rápido, oferta, prova e caminhos principais.
- Serviços: escopo, processo, pacotes ou modalidades quando existirem.
- Sobre: história e autoridade que ajudam a compra.
- Contato: forma de contato, próximo passo e informações locais quando relevantes.

Crie apenas páginas que tenham função própria. Mantenha o mesmo CTA, vocabulário, direção visual,
menu, rodapé e recursos compartilhados em todas elas.

## Link na bio

Entregue uma página curta com nome, frase de posicionamento, CTA principal e poucos destinos em
ordem de prioridade. Não transforme o formato em landing longa. Destino ativo é link. Destino
"em breve" é link sem `href`, com `aria-disabled="true"`.

## Regras de escrita

- Voz do Cérebro, frase clara, zero jargão vazio.
- Um nome por oferta e um rótulo por intenção de CTA.
- Prova concreta, nunca número fabricado.
- Português brasileiro, sem travessão nem ponto centrado.
- O conteúdo deve funcionar sem depender de efeito visual pra ser entendido.

## Entrega no VKOS Hub

O prompt guiado define pasta, formato, imagens, marca e arquivos. Siga essas instruções e entregue
HTML, CSS, JavaScript e imagens dentro da pasta indicada. Não crie `site.md`, `carrossel.html` ou
qualquer arquivo fora da pasta do site. Antes de terminar, confira todas as páginas e todos os
recursos conforme `templates/site/principios-visuais.md`.

## Teste final antes de entregar

Rode o teste final do `principios-visuais.md`: a pergunta "parece IA?", o teste de reflexo nas
duas ordens e o checklist de saída. Confira também que o CSS usa mesmo os tokens do estilo
declarado (as cores, a escala tipográfica, o spacing e o motion do arquivo do estilo), não um
genérico por baixo. Só entregue o que passar.
