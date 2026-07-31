# WhatsApp local: visão de produto

## A ideia central

O WhatsApp inteiro dentro do hub, com acesso total ao número, rodando local: sem servidor, sem webhook, sem custo por mensagem. E em cima dessa caixa, os agentes de atendimento: atendentes de IA configuráveis que respondem os clientes com base no Cérebro do negócio, porque a tese do VKOS Hub é essa, todos os workflows centralizados no contexto do negócio.

## Como o usuário vive isso

### A caixa (rodadas W1 e W2)

- Tela `#/whatsapp` (o item da sidebar sai do "em breve"): duas colunas no estilo WhatsApp Web, dentro da identidade VK. Conversas à esquerda (busca, não lidas, última mensagem), a conversa aberta à direita (bolhas, agrupado por dia, status de entregue e lido), composer embaixo com Enter enviando.
- Conectar é parear: o card mostra um QR code, o usuário escaneia com o app do celular (Aparelhos conectados) e pronto. O celular continua funcionando normal, o hub vira mais um aparelho conectado.
- Um número por workspace: cada cliente pode ter o próprio WhatsApp conectado, e as mensagens de todos continuam chegando mesmo com outro cliente ativo na tela.
- Mídia (W2): receber e enviar imagem, documento e áudio. Baixa sob demanda, tudo no disco local.
- CRM junto (W2): conversa casada com o cartão pelo telefone. Painel lateral mostra o cartão do contato; número novo pode virar cartão em "Novo contato" com um clique. Mensagem recebida e enviada viram eventos no barramento, então as automações (plano google-calendar) também podem reagir a WhatsApp no futuro.

### Os agentes de atendimento (rodada W3)

- Seção "Agentes" dentro da tela WhatsApp. Criar agente é um formulário guiado: nome, objetivo (tirar dúvidas, qualificar, agendar), tom e instruções extras, modelo de IA (Haiku ou Sonnet), horário de atuação, escopo (conversas novas ou todas as individuais) e limites.
- O agente responde COM BASE NO CÉREBRO: a sessão dele lê o cerebro.md do workspace, a conversa e o cartão do CRM. Não inventa preço nem promessa fora do Cérebro; o que não sabe, diz que vai confirmar e chama o humano.
- Dois modos, em degraus:
  - **Rascunho** (padrão): o agente prepara a resposta e ela entra numa fila de aprovação; o humano aprova, edita ou descarta antes de enviar. É o modo de ganhar confiança.
  - **Automático com limites**: responde sozinho com ritmo humano (pausa, "digitando..."), dentro de guardrails duros: número máximo de respostas seguidas sem humano, transferência obrigatória quando o cliente pede gente, quando aparece palavra de risco (cancelar, reclamação) ou quando a confiança do agente é baixa.
- "Assumir conversa": um clique pausa o agente naquela conversa e o humano toma a frente. Outro clique devolve.
- Tudo auditável: cada ação do agente (respondeu, rascunhou, transferiu, ficou em silêncio e por quê) fica num histórico visível.

## Decisões de produto (fechadas neste plano)

### 1. Local com acesso total agora, oficial depois se precisar

O caminho oficial da Meta (Cloud API) não dá acesso total local: recebe só por webhook público e cobra por conversa fora da janela. O caminho local usa o protocolo do WhatsApp Web (o mesmo que o navegador usa), que dá o número inteiro dentro do hub. O custo disso é risco: é protocolo não oficial e viola os termos do WhatsApp (detalhe honesto e mitigações em `04-riscos.md`). A arquitetura isola o transporte atrás de uma interface, então migrar pro oficial depois troca um módulo, não a caixa nem os agentes.

### 2. Agente NUNCA inicia conversa e NUNCA atua em grupo

Só responde mensagem recebida, de conversa individual. Sem disparo em massa, sem broadcast: isso não entra no produto nesta fase nem como opção escondida. É a mitigação número um de banimento e é a postura certa de atendimento.

### 3. Resposta de IA nasce no modo rascunho

O modo automático existe e é bom, mas o padrão de todo agente novo é rascunho com aprovação humana. O usuário promove pra automático quando confiar no agente dele.

### 4. Mensagem de gente é texto

Nada de renderizar markdown em bolha de conversa. O que o cliente mandou e o que foi respondido aparece como texto puro, como no WhatsApp real.

### 5. O que fica de fora

- Instagram (DMs e publicação): continua no plano da fase 7 (`docs/contexto/fase7-meta-plano.md`).
- Disparo em massa e listas de transmissão: fora por decisão, não por limitação.
- Chamadas, status, figurinhas animadas: fora da v1 (exibir figurinha recebida como imagem é o suficiente).
- Transcrição de áudio recebido: anotada como evolução natural (a base pra isso fica pronta), não entra nas três rodadas.

## Critério de fechamento

W1: o Jesse pareia um número de teste, vê as conversas na tela, recebe uma mensagem no hub em tempo real e responde do hub. W2: manda e recebe imagem e documento, acha uma conversa pela busca, abre o cartão do CRM do lado e cria cartão de um número novo. W3: cria um agente no modo rascunho, uma mensagem de teste chega, o rascunho aparece com a cara do Cérebro, ele aprova e o cliente recebe; depois promove pra automático e o guardrail de transferência funciona quando ele escreve "quero falar com uma pessoa".
