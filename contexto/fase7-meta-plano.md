# Fase 7: Meta (WhatsApp e Instagram), plano de arquitetura

Escrito em 2026-07-14, a pedido do Jesse, ANTES do aval de construção. Nada daqui está construído. O Jesse criou o app no Meta Developers; o objetivo é WhatsApp integrado dentro do hub (mensagens), Instagram (publicar e agendar os carrosséis gerados no hub, responder DMs) e automações nos dois.

## O que a Meta permite hoje (verificado em julho de 2026)

WhatsApp (Cloud API):
- Receber mensagem SÓ por webhook: a Meta chama uma URL HTTPS pública. Não existe "buscar mensagens". Esse é o único ponto que conflita com o local-first e é a decisão central do plano.
- Preço por mensagem desde julho de 2025: responder dentro da janela de 24h (aberta quando o cliente manda mensagem) é grátis e sem limite. Iniciar conversa fora da janela exige template pré-aprovado e pago (tabela por país e categoria: marketing é o caro, utilidade é barato). A plataforma em si não tem mensalidade.
- Coexistence (desde maio de 2025): o MESMO número roda no app WhatsApp Business do celular e na Cloud API ao mesmo tempo, com espelhamento em tempo real. Restrições: precisa abrir o app pelo menos a cada 14 dias, grupos, status e chamadas ficam só no app, histórico anterior não migra pra API, sem selo azul OBA.
- Enviar mídia, botões, listas e templates pela API. Status de entregue e lido chega por webhook.

Instagram (API para contas profissionais):
- Só conta Business ou Creator. Escopos novos da família instagram_business_* (os antigos foram descontinuados em janeiro de 2025): instagram_business_content_publish (publicar), instagram_business_manage_messages (DMs), instagram_business_manage_comments.
- Publicar carrossel: criar um container por imagem, depois um container CAROUSEL com os filhos, depois publish. Teto de 10 itens por carrossel e 50 publicações por conta a cada 24h.
- As imagens precisam estar em URL PÚBLICA pra Meta baixar. Segundo ponto que conflita com o local-first.
- Agendamento não existe na API: quem agenda somos nós (fila própria + disparo na hora).
- DMs e comentários também dependem de webhook.
- Vinculação com Página do Facebook: as fontes divergem sobre o caminho novo (Instagram Login for Business). Checar na prática no app do Jesse; se exigir, é vincular uma Página uma vez e seguir.

Modo de desenvolvimento vs produção:
- Com o app da Meta em modo desenvolvimento, tudo funciona pras contas que têm papel no app (as do Jesse). É o suficiente pro hub ser a ferramenta da VK.
- Pra um cliente do VKOS Hub conectar as PRÓPRIAS contas um dia, precisa App Review das permissões e verificação de empresa. Fica explicitamente fora da v1.

## A decisão central: como receber webhook num app local

Opção A, túnel: um túnel nomeado do Cloudflare (cloudflared) roda junto do hub e dá uma URL HTTPS fixa que aponta pro servidor local. Exige um domínio próprio no Cloudflare (o resto é grátis). Zero código hospedado. Limitação: PC desligado = webhook não entregue na hora (a Meta reenta com frequência decrescente por um tempo, e com coexistence nada se perde de verdade: o app do celular continua recebendo tudo). Agendamento de post só dispara com o hub aberto.

Opção B, relay: um worker mínimo hospedado (Cloudflare Worker + fila) recebe os webhooks 24/7, o hub puxa quando abre, e o worker ainda pode servir as imagens do carrossel na publicação e disparar post agendado com o PC desligado. Mais robusto, porém introduz um componente hospedado (dados transitam por lá, não moram lá) e mais peças pra manter.

Recomendação: A na v1, com coexistence ligado (o celular é o backup natural). O módulo de ingestão nasce atrás de uma interface "fonte de eventos", então migrar pra B depois é trocar a fonte, não reescrever. B só se agendar post com PC desligado virar necessidade real.

## As imagens públicas do carrossel

Na hora de publicar, o hub expõe as imagens da peça por URL efêmera com token aleatório no caminho (servidas pelo próprio túnel), e derruba a URL depois do publish confirmado. Sem upload pra host de terceiro, coerente com o local-first. (Alternativa se o túnel não estiver de pé na publicação: subir temporário pro Netlify já conectado. Fica como fallback documentado, não como caminho principal.)

## Arquitetura no hub

Backend, módulo novo server/src/meta/:
- conta.ts: credenciais por workspace em app/dados/workspaces/<id>/meta.json (app id, app secret, tokens, ids do número e da conta IG, verify token). Segredos só no disco local, mascarados na leitura, igual conexoes.json.
- webhook.ts: GET (verificação do hub da Meta) e POST em /webhook/meta, validando assinatura X-Hub-Signature-256 com o app secret. Atenção à guarda de Host do index.ts: o hostname do túnel entra na lista SÓ pra essa rota; todo o resto continua trancado no loopback.
- caixa.ts: a caixa de mensagens por workspace. Threads por contato e canal (whatsapp | instagram), mensagens em jsonl por conversa, dedup por id de mensagem (webhook reenta), estado de leitura. Contato do WhatsApp se liga ao CRM por telefone.
- whatsapp.ts: enviar texto e mídia, mandar template fora da janela, calcular o estado da janela de 24h por conversa, status de entrega.
- instagram.ts: publicar carrossel (containers, CAROUSEL, publish), fila de agendamento em agenda.json com tick no servidor, DMs.
- imagens-publicas.ts: as URLs efêmeras da publicação.
- Eventos WS novos: meta:mensagem, meta:status, meta:post.

Frontend:
- Tela nova `/mensagens`, "o WhatsApp dentro do hub": coluna de conversas (busca, filtro por canal WhatsApp/Instagram, não lidas), thread com balões no padrão do app (markdown não: mensagem de gente é texto), composer com anexo, indicador honesto da janela de 24h e, fora dela, o caminho do template. Ação "ver no CRM" em cada conversa; mensagem de número novo pode criar contato na coluna Novo contato.
- Instagram: na galeria de carrosséis, ações "Publicar no Instagram" e "Agendar" (escolhe data, hora e legenda, com o Cérebro podendo sugerir legenda). Aba de fila dentro da tela Mensagens ou tela própria `/agenda` (decidir no design): lista dos agendados com status agendado, publicado, falhou, e reenvio manual em falha.
- Conexões: o card Meta sai de "em breve" e vira assistente de conexão passo a passo (onde pegar cada id e token no painel da Meta).

## Automação, em degraus

1. (v1) Manual: receber e responder WhatsApp na tela Mensagens; publicar e agendar carrossel.
2. DMs do Instagram na mesma caixa.
3. Regras simples e transparentes por workspace: fora do horário comercial responde X; palavra-chave responde Y; contato novo entra no CRM. Regras são dados (regras.json), não código.
4. IA com aprovação: o Claude lê o Cérebro e a conversa e RASCUNHA a resposta; o Jesse aprova ou edita antes de enviar. Resposta de IA sem aprovação humana fica fora até decisão explícita em contrário.

## Ordem de entrega proposta (quando vier o aval)

- 7a: conexão Meta + túnel + webhook + caixa + tela Mensagens com WhatsApp funcionando (receber e responder).
- 7b: publicar e agendar carrossel no Instagram a partir da galeria.
- 7c: DMs do Instagram na caixa unificada.
- 7d: regras de automação + rascunho com IA.
Cada degrau fecha com QA de gesto real e uso do próprio Jesse antes do próximo.

## Restrições honestas

- Carrossel com mais de 10 imagens não publica via API: a ação de publicar avisa e oferece cortar.
- Agendamento na v1 dispara só com o hub aberto no PC.
- Coexistence: abrir o app do celular a cada 14 dias, sem grupos nem status pela API.
- Iniciar conversa fria no WhatsApp custa template pago; responder é grátis.
- Modo desenvolvimento: só as contas do Jesse. Cliente conectar a própria conta exige App Review (fase futura).
- A exigência de Página do Facebook pro Instagram precisa ser confirmada na prática no app criado.

## O que falta o Jesse responder antes de construir

1. O número do WhatsApp é o que já usas no app WhatsApp Business do celular (caminho coexistence, recomendado) ou um número novo dedicado?
2. A conta @vkos.hub é profissional (Business ou Creator)? Tem Página do Facebook vinculada?
3. Quais produtos já adicionaste no app do Meta Developers (WhatsApp? Instagram? Messenger?)? Um print do painel resolve.
4. Tens domínio próprio que possa ir pro Cloudflare pro túnel do webhook? Qual?
5. Confirma o escopo v1: só as contas da VK, sem App Review.
6. Confirma a recomendação do túnel (opção A) ou prefere já nascer com o relay (opção B)?

Tokens e segredos só na hora de construir, direto na tela de Conexões, nunca no chat.
