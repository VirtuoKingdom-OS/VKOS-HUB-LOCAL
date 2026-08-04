# Fluxo de anúncios: a visão

> Rodada aberta em 2026-07-31. Este arquivo diz o que se constrói e o que NÃO
> se constrói. Leia ele inteiro antes de tocar em código. Quem pegar a rodada
> no meio começa por aqui, depois `01-arquitetura.md`, depois `02-fases.md`.

## O que o Jesse pediu

Um terceiro fluxo de criação, no mesmo trilho do carrossel e do site: parte do
Cérebro, junta as fontes de dados, e roda a skill que já existe. A diferença é
o que sai do outro lado.

Anúncio de Google Ads tem variável demais para caber num card de galeria. Por
isso o fluxo termina numa **página dedicada**, com toda a campanha dividida em
blocos, e num **chat lateral que continua a mesma conversa que gerou tudo**, com
poder de mudar o que está na tela.

## O que existe hoje, medido

- A skill `/anuncio` existe em todas as seis pastas VKOS do projeto
  (`vkos/`, `vkos2/`, `ojessegomes/`, `estudio-aura/`, `workspaces/jdv/`,
  `workspaces/mae-pixel/`), com 57 linhas, e **já é bifurcada Google e Meta**.
  No ramo Google ela pede 8 a 12 títulos de 30 caracteres, 3 a 4 descrições de
  90, palavras-chave do bloco 11 do Cérebro e as negativas.
- Ela grava **um markdown solto** em
  `conteudo/<AAAA-MM-DD>-anuncio-<oferta>/anuncio.md`.
- **Nunca foi rodada.** Não existe uma peça de anúncio em disco em nenhum
  workspace do projeto.
- **Não existe uma linha de código de Google Ads no repositório.** Nenhum OAuth,
  nenhuma rota, nenhum tipo, nenhuma tela. Só menção em documento.
- A `/funil` é 100% Meta na prática (perfil, stories, direct, ManyChat). A
  `/google` é o Perfil da Empresa no Google, orgânico, não é Ads.

## As duas decisões travadas pelo Jesse

**1. O anúncio pronto é `anuncio.json`, com contrato validado.**

Google Ads é rígido por natureza: título tem 30 caracteres, descrição tem 90,
frase de destaque tem 25. Um título de 34 caracteres é recusado pelo painel do
Google. O valor da página dedicada é justamente **afirmar campo a campo que
aquilo cabe**, e markdown solto não permite dizer "este é o título 7 do grupo 2".

O risco é a IA errar o JSON. O remédio já existe no projeto e é o laço de
conformidade do site: retoma a mesma sessão com o erro literal, até 2 voltas.

Não há um `anuncio.md` gerado ao lado. Cada campo da tela tem botão de copiar, e
dois arquivos que dizem a mesma coisa acabam divergindo.

**2. A página mostra a campanha inteira, nove blocos.**

Estratégia, estrutura, palavras-chave, negativas, anúncios, recursos, orçamento,
conversões e publicação. Campanha pela metade não dá para lançar: sem orçamento
e sem conversão o dono não sabe se está ganhando ou perdendo dinheiro. O custo
está no schema e no prompt; o render é repetitivo e as fases seguram o tamanho.

## O que NÃO entra nesta rodada

- **Nada da API do Google Ads.** Sem OAuth, sem envio de campanha, sem leitura
  de métrica. A Fase 7 do roadmap continua adiada e este fluxo não a antecipa. O
  resultado é uma campanha pronta para o dono colar no painel do Google, no
  mesmo espírito da exportação local que substituiu a publicação integrada em
  2026-07-26.
- **Nenhuma alteração no `SKILL.md` do `/anuncio`.** O arquivo é do produto
  VKOS, está copiado em seis pastas, e o princípio "não reinventar o VKOS" vale.
  O contrato de saída é declarado pelo prompt do Hub, exatamente como o Site
  Guiado faz com a `/site`.
- **Nenhum ramo Meta.** A skill sabe fazer os dois; este fluxo declara
  `plataforma: "google-busca"` e só. O campo existe no schema para o dia em que
  a Meta entrar, sem obrigar migração.
- **Nenhuma migração de `ChatIde`, `CerimoniaCerebro` ou `NoSessao`.** A lógica
  de conversa é extraída para um hook e um componente compartilhado, e só a tela
  nova adota. Trocar os três na mesma rodada que estreia um fluxo é quebrar duas
  coisas ao mesmo tempo. A dívida fica declarada em `docs/decisoes/`.

## O critério de pronto da rodada

O Jesse abre `/criar/anuncio` num workspace com Cérebro cheio, responde o
assistente, e recebe uma campanha de Google Ads inteira numa página. Ele lê os
nove blocos, vê quais títulos estourariam o limite do Google, escreve no chat
lateral "troca os títulos do grupo 2 por ângulo de urgência", e a página muda
sozinha sem recarregar. Depois ele copia campo a campo para o painel do Google.

Se ele não consegue fazer isso de ponta a ponta, a rodada não fechou.
