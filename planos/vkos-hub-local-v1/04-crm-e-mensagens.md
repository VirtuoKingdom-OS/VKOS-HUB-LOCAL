# CRM que presta, e o chat que nasce em cima dele

Desenho da Fase 2, escrito em 2026-07-27 depois de quatro auditorias em paralelo (técnica, UX, mercado e fluxo entre módulos) e de provas rodadas no código real.

## A janela que está aberta

A base de CRM está **vazia**: zero contatos, zero negócios. Toda mudança de modelo custa zero hoje e custaria migração de risco depois. Por isso esta fase reestrutura o dado antes de melhorar a tela, e antecipa a subida do CRM para o nível CORE, que estava marcada para uma fase posterior. Fazer as duas coisas juntas evita mexer duas vezes na mesma estrutura, a segunda já com dado real e histórico de conversa dentro.

## O diagnóstico, em uma frase cada

1. **Follow-up nunca fecha.** Registrar interação não limpa `proximoContato`. A aba Hoje acumula atraso falso até virar ruído.
2. **A tela do dia não deixa agir.** Todo item só navega. Sem checkbox, sem "liguei", sem adiar.
3. **O funil mente.** Negócio sem status: ganho, perdido e aberto somam no mesmo número.
4. **Orçamento não existe.** O momento mais caro do ciclo cabe num título e num valor.
5. **A ficha perde o que se digita.** Salva só no blur, e Esc descarta sem aviso.
6. **O modelo não aguenta chat.** Interações moram dentro do contato, dentro do arquivo de todo mundo. Medido: 16 ms de event loop travado por operação com 500 contatos, e o I/O é síncrono, então congela também as sessões de IA e o WebSocket.
7. **Nada é ao vivo.** O CRM não assina o WebSocket. Duas abas divergem e só F5 corrige.

Dois bugs vivos confirmados: `origem` é rótulo editável **e** chave de deduplicação ao mesmo tempo, então editar quebra o dedupe em silêncio; e a normalização de telefone só remove não-dígitos, então `+55 31 99999-8888` e `(31) 99999-8888` viram chaves diferentes e o mesmo cliente entra duas vezes.

## O modelo novo

### O que fica no `crm.json`

Coisas em pouca quantidade e que mudam pouco. Continuam sendo lidas e gravadas inteiras, o que é aceitável nessa escala.

```
Coluna        id, nome, ordem
              tipo: "aberto" | "ganho" | "perdido"      <- semântica, não string livre
              diasParaEsfriar?: number                   <- apodrecimento por estágio

Organizacao   id, nome, documento?, site?, criadoEm, atualizadoEm

Contato       id, nome, organizacaoId?
              telefone?, telefoneNormalizado?            <- E.164, persistido e indexado
              email?, origem?                            <- origem volta a ser só rótulo humano
              chaveExterna?                              <- a chave técnica sai de origem
              tags[], colunaId
              proximoContato?, cadenciaDias?             <- "falar de novo a cada N dias"
              workspaceOrigemId                          <- procedência, para a fusão no CORE
              lead?, arquivado?, criadoEm, atualizadoEm
              SAI: interacoes[], tarefas[]

Negocio       id, titulo, contatoId, participantes?[]    <- papéis: decide, aprova, paga
              status: "aberto" | "ganho" | "perdido"
              valorEstimado?, valorFechado?, fechadoEm?
              proximaAcaoEm?, proximaAcaoTexto?          <- o item de maior retorno da pesquisa
              escopo?                                    <- antídoto barato contra scope creep
              recorrente?, valorMensal?, diaDoCiclo?     <- retainer em três campos
              criadoEm, atualizadoEm

Orcamento     id, negocioId, valor
              status: "rascunho"|"enviado"|"aceito"|"recusado"|"expirado"
              enviadoEm?, validoAte?                     <- a validade gera follow-up sozinha
              arquivo?, link?, criadoEm, atualizadoEm

Tarefa        id, texto, prazo?, feita
              contatoId?, negocioId?                     <- sai de dentro do contato
              criadaEm
```

### O que sai do `crm.json`, para armazenamento append-only

Coisas que crescem sem teto. Gravar uma linha é O(1) e não reescreve nada.

```
app/dados/<escopo>/crm/
  crm.json                        colunas, organizações, contatos, negócios,
                                  orçamentos, tarefas
  interacoes.jsonl                linha do tempo manual
  estagios.jsonl                  histórico de transição de estágio
  mensagens/
    indice.json                   lista de conversas, para a coluna da esquerda
    conversas/<id>.jsonl          uma conversa por arquivo, append-only
```

O padrão já é o do repositório: `eventos/barramento.ts` usa `appendFileSync` com rotação, e as transcrições de sessão já vivem em arquivo por sessão. Linha corrompida perde uma mensagem, não a conversa.

### A mensagem, com os campos que a integração real exige

Estes campos custam quase nada agora e evitariam migrar histórico de conversa depois, que é o dado que ninguém pode perder.

```
Mensagem      id                    UUID local, SEMPRE. Nunca vem do provedor,
                                    senão envio otimista é impossível
              conversaId
              direcao               "entrada" | "saida"
              canal                 "manual" | "whatsapp" | ...
              origem                "manual" | "api"     <- qual linha é verdade
                                                            do provedor e qual é
                                                            memória do usuário
              tipo                  "texto"|"imagem"|"audio"|"documento"|"template"|...
              texto
              privada               nota interna, nunca sai
              status                "rascunho"|"na-fila"|"enviada"|"entregue"|"lida"|"falhou"
              erroCodigo?, erroTexto?
              idExterno?            wamid. Único quando presente, senão um
                                    reenvio do webhook duplica a thread
              chaveIdempotencia
              respondeA?
              autorTipo             "contato" | "usuario" | "sistema"
              enviadaEm             quando aconteceu no mundo real, separado de
                                    criadaEm. Registro manual retroativo depende disso
              entregueEm?, lidaEm?
              payloadBruto?         o webhook cru. Todo campo não previsto está aí
              anexos[]              com caminhoLocal, nunca URL: a URL da Meta
                                    morre em 5 minutos

Conversa      id, contatoId (obrigatório), negocioId?
              canal, identificadorExterno
              status                "aberta"|"aguardando"|"resolvida"|"adiada"
              adiadaAte?
              ultimaEntradaEm       quando o CONTATO falou por último. É a única
                                    fonte da janela de 24h do WhatsApp
              ultimaMensagemEm, previa, naoLidas
```

Regra: **conversa não existe sem contato**. Chegou mensagem de número desconhecido, o Hub cria o contato primeiro. Isso impede a segunda caixa de entrada paralela ao funil, que é a doença que o produto está curando.

A linha do tempo do contato é uma **view** que une interações e mensagens. Não duplicar dado.

## A tela do dia, redesenhada

Responde uma pergunta só: o que eu faço agora. Blocos em ordem de prioridade, cada item aparecendo **uma vez só**, teto de 10 por bloco, e **ação inline em toda linha**.

```
1. Atrasado             próxima ação com data no passado
2. Hoje                 próxima ação hoje, mais tarefas de hoje
3. Esfriando            sem contato há mais dias que o limite do estágio
4. Sem próxima ação     negócio aberto sem data marcada
5. Orçamento parado     enviado sem resposta, ou validade vencendo
6. Sem resposta         a última mensagem é do cliente
7. Recorrente do mês    ciclo vence em breve e ainda não foi cobrado
```

**Snooze é obrigatório desde o primeiro dia**, com presets de um clique (amanhã, +3 dias, semana que vem, +1 mês). Sem ele a tela acumula lixo e morre em três semanas.

**Apodrecimento não liga quando existe próxima ação futura.** Esse é um bug conhecido do Pipedrive, corrigido de graça aqui.

**Lead importado nasce fora do funil ativo**, em estado não trabalhado, invisível na tela do dia. Importar 40 leads do Google Maps não pode encher a tela de 40 pendências falsas.

## O chat, três painéis

```
[ conversas ]      [ thread ]           [ contexto ]
   ~300px            flex                 ~340px
```

O painel da direita é o que separa um CRM de um clone de WhatsApp: negócio aberto com estágio, valor e próxima ação editável; orçamento com status e validade; últimas interações fora do chat; tags; e ações diretas de criar negócio, criar orçamento, agendar próxima ação e marcar como ganho.

Na thread, o **relógio da janela de 24 horas fica visível**. Fechada, o composer troca por seletor de template. Sem isso o usuário digita, envia e recebe erro sem entender.

## O que NÃO vai ser feito

Decidido com base na pesquisa, para não repetir erro conhecido de mercado:

- **Biblioteca não oficial de WhatsApp.** Banimento permanente do número de trabalho. Ver `decisoes/2026-07-27-whatsapp-api-oficial-e-coexistence.md`.
- **Editor visual de automação.** É o motivo de o Dubsado levar duas semanas para configurar. Automações fixas com checkbox resolvem quase tudo.
- **Portal do cliente, assinatura eletrônica e gateway de pagamento.** Exigem hospedagem e autenticação pública, contra o local-first.
- **Campos customizados ilimitados.** Caminho documentado da flexibilidade para dívida técnica. Tags já cobrem.
- **Disparo em massa.** Fere o opt-in por categoria e derruba a qualidade do número.
- **Modal bloqueante de próxima ação.** Vira clique de fuga e o dado apodrece. Força por visibilidade, não por bloqueio.
- **Gráfico e relatório na tela do dia.** Nada disso muda o que se faz nos próximos dez minutos.

## Ordem de construção

Cada etapa fecha verde nos cinco portões.

**2a. Fundação de dados.** Modelo novo, `versao: 4`, com migração da v3. Interações e histórico de estágio saem para `.jsonl`. Organização vira entidade. `chaveExterna` separada de `origem`, telefone normalizado em E.164 persistido. Coluna com `tipo`. Negócio com status, próxima ação e recorrência. Orçamento nasce. Tarefa sai de dentro do contato. Importação de lead em lote, uma gravação só, e nascendo fora do funil ativo.

**2b. CRM no nível CORE.** O dado sobe de `workspaces/<id>/` para o escopo do dono. Migração com procedência preservada em `workspaceOrigemId`. Ids de coluna remapeados por nome na fusão, senão o estágio se perde.

**2c. Os buracos de uso.** Follow-up que fecha, snooze, ação inline na tela do dia, apodrecimento por estágio, salvamento visível, Esc que não descarta, undo de exclusão, busca cobrindo telefone e email, teclado no kanban.

**2d. CRM ao vivo.** WebSocket assinado pelo CRM, com `transmitirPara` por escopo em vez de broadcast para todos.

**2e. Mensagens.** Módulo `mensagens/` com contrato de canal, canal `manual` completo, três painéis, e a linha do tempo unificada na ficha.

## Como retomar

O quadro vivo está em `02-estado.md`. As decisões de WhatsApp estão em `decisoes/2026-07-27-*`. Os relatórios completos das quatro auditorias não foram salvos em disco: o que sobreviveu deles está resumido aqui e no `03-checkup-2026-07-26.md`.
