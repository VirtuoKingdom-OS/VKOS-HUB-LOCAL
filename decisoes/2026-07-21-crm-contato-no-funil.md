# CRM: o contato é o cartão do funil

## Contexto
O CRM estava fraco e confuso. O cartão do kanban era o NEGÓCIO, então um contato só entrava no funil se o usuário criasse um negócio pra ele; contato sem negócio ficava numa coluna virtual "Contatos sem negócio", fora do fluxo. Além disso, ao importar um lead da mineração do Google Maps, a ficha nascia pobre: guardava só nome, empresa, telefone, email e origem, e jogava fora endereço, site, categoria, nota, avaliações, termo da busca e localização, que a lista de busca mostrava. O Jesse quer tudo interconectado e o fluxo refletindo a prática.

## Decisão
1. O contato passa a ser o cartão do funil. Cada contato tem um estágio (colunaId) e caminha pelo quadro sozinho, desde que nasce, sem precisar de negócio. A primeira coluna padrão vira "Não iniciados" (no lugar de "Contatos sem negócio").
2. O negócio deixa de ter estágio: vira valor/oportunidade preso a um contato. Um contato soma o valor dos seus negócios. O painel do contato lista os negócios como valor e permite mover o estágio no topo.
3. Importar um lead leva o retrato completo (categoria, endereço, site, nota, avaliações, termo, localização, data) pra contato.lead, e o painel mostra tudo numa seção "Dados do lead".
4. A migração do crm.json v2 para v3 é automática e sem perda: cada contato herda o estágio do seu negócio mais recente e os negócios perdem o estágio.

## Por quê
O funil que o dono de negócio tem na cabeça é o contato andando do primeiro toque ao fechamento, não uma "oportunidade" abstrata que precisa ser criada à mão. Fazer o contato ser o cartão remove o atrito e faz o quadro refletir o relacionamento de verdade, que é o ponto do CRM. Manter o negócio como valor preso ao contato preserva o controle de dinheiro sem duplicar a caminhada no funil. Emitir o mesmo evento crm:contato-movido (agora disparado pela ficha) mantém as automações de mudança de estágio funcionando sem quebrar a interconexão, que era o risco que o Jesse pediu pra cuidar. Guardar o retrato do lead na ficha honra o "tudo interconectado": o dado que a busca mostrou não se perde ao virar contato.
