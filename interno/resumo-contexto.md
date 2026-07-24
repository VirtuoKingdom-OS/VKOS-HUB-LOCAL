# Resumo de contexto: Jessé Gomes, VirtuoKingdom e VKOS

> Documento de repasse. Serve pra dar contexto rápido a uma IA que ainda não conhece
> o negócio, a marca pessoal, os produtos e os objetivos. Atualizado em 22 de julho de 2026.
> Material interno: nunca vai pro pacote de cliente nem pro repositório público.

## 1. Quem é e o que faz

Jessé Gomes, dono da **VirtuoKingdom (VK)**, agência que ajuda negócios e donos de negócio a venderem mais usando IA no marketing e na gestão, com um sistema próprio que unifica tudo num lugar só.

Marca pessoal: **OJESSEGOMES**, posicionamento de "operador que constrói com IA". A prova não é discurso, é o sistema rodando dentro da própria operação.

Atendimento 100% digital, sem restrição geográfica. CTA do negócio: WhatsApp (33) 98820-3660.

**A voz da marca:** direta, didática quando o assunto pede, informal na medida certa. Vai pro concreto rápido. Fala do produto com confiança, sem hype e sem aspiracional. As palavras "viralizar" e "enriquecer" são proibidas: a promessa é operacional e honesta, nunca aspiração vazia.

**Identidade visual:** preto, cinza, variações de verde (#00875f na marca; o app usa o menta #2fd4a7), branco. Tipografia moderna, amigável, profissional, sem serifas. Minimalismo, glow sutil, contraste confortável.

## 2. O modelo de negócio: três engrenagens, nesta ordem

1. **Serviço done-for-you (o caixa de agora).** A VK monta presença para o cliente. Combo de estreia (site + Google + carrosséis) a R$597, pago após entrega. É o que financia a construção de tudo.
2. **Conteúdo e audiência (o alicerce).** A marca pessoal OJESSEGOMES, em produção. Inbound por credibilidade de operador, nunca postura de influencer.
3. **VKOS como produto (a escala).** Vem por último, depois de caixa e audiência, provado na operação antes de virar oferta.

O concorrente real não é outra ferramenta, é o anonimato. Daí a ordem.

**Níveis de entrega atuais:**
- **Nível 1, Skill:** uma skill de IA entregue ao cliente (posicionamento, carrosséis, conteúdo).
- **Nível 2, Implementação do VKOS Hub:** sistema completo rodando localmente na máquina do cliente com a assinatura de IA dele. Ticket de R$2.000 a R$10.000 mais recorrência de R$1.500/mês. Custo de IA para o cliente: R$300 a R$1.500 por trimestre.
- **Nível 3, SaaS:** em desenvolvimento.

**Diferencial declarado:** unifica workflow e custos. Em vez de várias IAs, várias assinaturas e ferramentas desconexas, um sistema só com contexto persistente do negócio.

## 3. Os produtos

### VKOS (v1.0, o produto vendido hoje)

**VKOS = VirtuoKingdom Operational System.** Um OS de marketing entregue como repositório que o comprador clona e roda com Claude Code. R$67, pagamento único (checkout Cakto), ou implementação sob diagnóstico.

O mecanismo central é o **Cérebro**: o arquivo `cerebro/cerebro.md`, a identidade do negócio em 13 blocos, preenchido pelo comando `/instalar` numa conversa guiada. **A regra de ouro: todo comando lê o Cérebro antes de gerar.** É por isso que nada sai genérico.

Cerca de 27 skills em módulos (núcleo, descoberta, visual, conteúdo, perfil, site, Google e local, anúncios e funil, escrita). Renderiza carrosséis de HTML para PNG via Playwright, com 9 templates próprios, 1080x1350.

**Cultura de cobrança:** pagamento único mais upgrades opcionais, nunca mensalidade obrigatória, local-first (a VK não hospeda o contexto do cliente).

### VKOS 2 (o template evoluído)

Desde 16 de julho de 2026. O VKOS puro com as melhorias fundidas: Cérebro em branco pronto pro `/instalar`, cartela de 20 direções visuais, biblioteca de 13 estilos concretos, princípios visuais em todos os formatos (carrossel, stories, site), e skills novas: `/revisar-design`, `/refinar`, `/enxuto`, `/enxuto-revisao` e `/projeto`. Hoje são 33 skills.

### VKOS Hub (o app, foco atual do desenvolvimento)

Uma plataforma com um CORE privado do Jesse e workspaces de clientes no navegador. Várias instâncias de IA trabalham com o mesmo Cérebro, mas a infraestrutura e as credenciais ficam invisíveis para o cliente.

**A tese:** a oferta não é "junte suas IAs num canvas", é "seu negócio operando, com um monte de IA por baixo que você nunca precisa ver". A orquestração é infraestrutura escondida, nunca a promessa.

**A cunha defensável é o Cérebro.** Referências da categoria (AIOX-CORE, Maestri) têm canvas burro de contexto: cada IA começa do zero. No Hub, toda instância bebe da mesma fonte.

**Público:** prestador de serviço e dono de negócio que quer o negócio funcionando. **Não é para desenvolvedor** (esse é o público do Maestri, e competir de frente lá seria erro).

## 4. O que o Hub já faz (estado em 18/07/2026)

- **Dashboard** com duas jornadas: Criar Conteúdo Visual e Site Guiado.
- **Cockpit**: canvas React Flow com sessões de IA em paralelo (Claude Code ou Codex), streaming, custo honesto por sessão e por cliente.
- **Site Guiado**: wizard que gera site completo (página única ou multipágina) com objetivo e seções em texto livre.
- **Laço de conformidade** (novidade recente): terminada a geração, o servidor roda a mesma auditoria do deploy e devolve os erros literais pra própria sessão corrigir, até duas voltas, antes de entregar. O site só fica "pronto" com conferência terminal.
- **Publicação profissional**: site multipágina vira projeto **Astro** de verdade (layout único, sitemap, robots.txt) por conversão determinística sem IA. GitHub recebe o fonte, Netlify recebe o build. Auditoria de contraste, responsividade, semântica e reduced motion bloqueia deploy de site quebrado.
- **Studio**: edição visual das peças (texto, cor, imagem) direto no preview, sem código.
- **CRM v2**: ficha de contato, negócios separados no funil, linha do tempo de interações, tarefas, aba Hoje (follow-ups, clientes esquecidos, valor em aberto). A IA usa o CRM como insight agregado, com regra dura: dado pessoal de cliente nunca entra em peça publicável.
- **Calendário** local sincronizado com o CRM, com Google Calendar opcional.
- **Automações** reagindo aos eventos do sistema.
- **Fontes de dados**, anexos, VKOS-IDE flutuante, Mapa do sistema (interno).
- **Camada de design anti-genérico**: 20 direções, 13 estilos concretos com tokens, e o teste final "alguém diria que foi IA?".
- Três temas (Escuro padrão, Dark VKOS, Claro), 130 testes automatizados.

**Distribuição:** VKOS 3.0 roda em VPS com CORE, hub, motor, PostgreSQL, TLS e backup cifrado. O Claude pessoal fica apenas no CORE. Clientes usam Gemini via Vertex ou Claude com credencial própria cifrada no cofre.

## 5. O que foi feito na rodada mais recente (16 a 18 de julho de 2026)

Em sequência, para quem precisa saber o que mudou:

1. **CRM v2 e Mapa do sistema**: CRM virou CRM de verdade (negócios, interações, tarefas, aba Hoje) com migração sem perda; Mapa interno da arquitetura como visualização didática.
2. **Site Guiado v2**: controles abertos no wizard, galeria das Fontes de dados nas imagens, pendência de auditoria virou aviso honesto em vez de falso erro.
3. **VKOS 2**: template novo com camada de design v2, propagada depois para todos os formatos visuais (site, stories, carrossel em criação livre, interface de projeto).
4. **Sites Astro e biblioteca de design**: publicação multipágina como projeto Astro; prompt reestruturado com design obrigatório declarado; 13 estilos curados com nomes neutros propagados pros workspaces.
5. **Laço de conformidade**: nasceu de um problema real (um site reprovou só na hora de publicar). Agora a geração se autoconfere e se autocorrige.
6. **Checkup geral e conserto**: quatro auditorias de ponta a ponta acharam 30+ pontos; todos consertados numa rodada de quatro frentes (dados sagrados, publicação fiel, laço robusto, tema e faxina). Destaques: CRM corrompido agora vai pra quarentena em vez de ser sobrescrito; excluir cliente apaga tokens e dados pessoais do disco; conversor Astro não descarta mais conteúdo em silêncio.
7. **Repositório público**: `vkos-hub-beta` publicado sob AGPL-3.0, com README bilíngue, screenshots de um workspace fictício e guia de contribuição. Motivo: candidatura a um programa da Anthropic que dá 6 meses de plano Max.

## 6. Objetivos e próximos passos

**Decisão de julho de 2026:** vender o que já está pronto e continuar construindo em cima, ao mesmo tempo. O caminho é **build in public**: mostrar a construção como marketing do negócio.

**Roadmap declarado:**
1. **Controle por voz** (próxima atualização): operar o Hub inteiro por voz, com confirmação falada antes de qualquer ação. É a peça que torna IA de agente alcançável para quem tem dificuldade com digitação, leitura ou telas.
2. **APIs da Meta e do Google**, simplificadas ao ponto de o dono nunca ver chave de API nem tela de permissão.
3. **Distribuição de verdade**: macOS e Linux, mais testes, acessibilidade, sair do beta Windows-only.

**Ideia guardada (a "prima" do app):** sócio operacional de IA, um SaaS para o profissional bom no ofício e ruim no negócio, com cobrança por voz ou foto e um Cérebro de operação (dinheiro, back-office) no lugar do de marketing. Meta de R$50k de MRR. Importa agora porque a arquitetura do Hub deve comportar essa área sem reescrever o núcleo: **marketing é a porta, a operação inteira do negócio é o destino.**

## 7. Como o Jessé trabalha (importante para qualquer IA que for ajudar)

- **Decisão estratégica:** ele gosta de debater antes de travar. Apresentar opções fundamentadas com um recomendado e o trade-off claro, nunca uma resposta única fechada.
- **Execução:** quer velocidade e iteração. Quando ele diz "bora torar", é pra construir, não pra planejar mais.
- **Padrão da casa:** trabalho grande começa por um plano escrito (visão, arquitetura, execução) que ele audita antes de executar.
- **Motion e UI caprichados importam muito.** Toda interface nasce nos três temas, com cor só por token, nunca hardcoded.
- **Git:** nunca commit, push ou PR sem ordem explícita dele.
- **Escrita, em qualquer texto do projeto:** português brasileiro, frase curta e direta, sem jargão de startup. **Nunca usar travessão nem ponto centrado**, usar vírgula, ponto ou dois-pontos.
- **Decisões viram registro:** toda decisão de produto ou técnica vira um arquivo curto em `decisoes/AAAA-MM-DD-titulo.md` com contexto, decisão e por quê.

## 8. Princípios que não se negociam no produto

1. **Local-first.** Nenhum dado do usuário sai da máquina dele. Sem backend hospedado, sem telemetria.
2. **A credencial é do usuário.** O Hub nunca recebe nem guarda senha ou token de IA.
3. **Dado do usuário é sagrado.** Arquivo que existe nunca é sobrescrito às cegas: na dúvida, quarentena com data. Migração usa valor padrão, nunca descarta registro.
4. **Dado pessoal de cliente nunca entra em peça publicável.** Insight agregado sim, nome e telefone nunca.
5. **Geração é verificada, não confiada.** Auditoria determinística antes de dar por pronto e antes de publicar.
6. **Funciona para leigo total, de fábrica.** Se exige configuração ou vocabulário técnico, ainda não está pronto.

## 9. Onde as coisas moram

- **Repositório de desenvolvimento** (privado): `vkos-hub` no GitHub, conta OJESSEGOMES-VKOS. O código do app fica em `app/`, o contrato técnico em `app/CONTRATO.md`, o contexto vivo em `contexto/`, as decisões em `decisoes/`, o material interno em `interno/`.
- **Repositório público:** `vkos-hub-beta`, o pacote cru que o cliente baixa, sob AGPL-3.0.
- **Workspaces reais em uso:** OJESSEGOMES (marca pessoal) e Estúdio Aura.
- **Referências externas:** `vkos/` (o VKOS v1) e `outros/` (pacotes de referência estudados; o Twenty é AGPL e nunca teve código copiado, só conceitos de produto destilados).
