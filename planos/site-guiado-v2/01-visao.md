# Site Guiado v2: visão

## O problema

O wizard do site funciona, mas pensa pelo usuário demais. A etapa de estrutura oferece 7 seções fixas em chips (Herói, Problema, Serviços, Provas, Sobre, FAQ, Chamada final): quem quer "uma seção com os 3 pacotes e preços" não tem onde escrever isso. O objetivo do site se resume a 4 chips (WhatsApp, Agendamento, Orçamento, Contato): quem quer "fazer o visitante baixar meu catálogo" não tem onde dizer. O campo de detalhes existe, mas escondido na primeira etapa, quando o usuário ainda nem viu o que o wizard vai perguntar.

E tem o falso erro: o Jesse gerou um site de teste, o site nasceu certinho e navegável, mas o app disse "a conferência do site encontrou um problema" e tratou a geração como fracassada. O que aconteceu por baixo: a auditoria determinística (`auditarSiteEstatico`) reprova a peça por QUALQUER pendência (um .md sobrando, uma referência que a regex não resolve), e o front só considera a geração concluída quando `site.valido === true`. Site de pé, usuário vendo tela de erro. Isso mina a confiança no produto.

## O desenho

### Controle aberto, mecânica preservada

- **Objetivo nº 1**: um campo de texto aberto, com placeholder de exemplo, vira a voz principal da etapa. Os chips de CTA continuam existindo logo abaixo, rebatizados como "Botão principal", porque eles têm função mecânica (definem o botão do site e o link/número). O texto aberto diz o que o site precisa alcançar; o chip diz que botão fecha esse objetivo.
- **Seções em texto livre**: o bloco de chips de seções morre. Entra um campo de texto aberto ("descreva as seções que você quer, na ordem"), com placeholder de exemplo e a regra clara: vazio = o sistema escolhe (o Auto de hoje continua sendo o padrão, só que implícito).
- **Detalhes na última etapa**: o campo sai da etapa 0 e vai pra etapa final, onde o usuário já viu tudo que o wizard pergunta e sabe o que faltou dizer. Placeholder novo indicando o que dá pra pedir.

### Com imagens, de dois jeitos

A opção "Enviar minhas imagens" vira "Com imagens". Selecionada, o bloco oferece os dois gestos lado a lado: "Escolher das Fontes de dados" (abre a mesma galeria que o editor já usa) e o envio do computador (o dropzone atual). A escolha da galeria baixa o arquivo da fonte e sobe pela MESMA rota do upload do wizard (`/api/anexos`), então os dois caminhos terminam idênticos: um item em `dados.anexos` com `caminhoRelativo` legível pela sessão. O prompt não muda uma linha por causa disso.

Por que copiar em vez de referenciar a fonte direto: o caminho `materiais/cockpit/anexos/<data>/` é o pouso estabelecido de material de geração (o composer e o próprio wizard já usam), e copiar desacopla a geração da vida da fonte (usuário pode apagar a fonte depois sem quebrar nada retroativamente).

### Falso erro vira aviso honesto

A regra nova: **site que existe e tem index.html legível é site gerado**. A geração conclui, o usuário vai pra tela do site. Se a auditoria achou pendências, elas aparecem como AVISO na TelaSite (e continuam bloqueando a publicação, como hoje). O texto do aviso diz a verdade: "O site está de pé. A conferência achou pendências que bloqueiam a publicação: ...".

O que NÃO muda: a barreira de deploy. Pendência continua impedindo GitHub e Netlify até ser resolvida. O que muda é o app parar de chamar de fracasso uma geração que deu certo.

A rodada também investiga o caso real: achar a peça do site teste 03 no workspace, ler `peca.site.erros` e identificar qual pendência disparou. Se for uma das heurísticas frágeis mapeadas (arquivo .md sobrando apesar da proibição no prompt, referência com querystring ou variação de caixa, `pagina/` vs `pagina.html`), corrigir a heurística ou reforçar o prompt no ponto exato, com evidência.

## Critério de fechamento

- No wizard: descrever objetivo e seções em texto livre, escolher "Com imagens", pegar uma imagem das Fontes de dados E enviar uma do computador, escrever um detalhe na última etapa, e o prompt final refletir tudo isso fielmente.
- Um site real gerado de ponta a ponta com essas entradas, usando as imagens fornecidas, com as seções descritas.
- Uma geração com pendência de auditoria termina na TelaSite com aviso honesto, não em tela de erro.
- Typechecks e build limpos, 3 temas ok.
