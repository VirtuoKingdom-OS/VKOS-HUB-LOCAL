# VKOS 3.0, rodada de correções pós-primeiro-uso

Plano criado em 2026-07-22 depois do primeiro uso real do CORE pelo Jesse. Execução por IA (GPT 5.6). Decisões novas registradas em `decisoes/2026-07-22-catalogo-do-cliente.md` e `decisoes/2026-07-22-login-sem-friccao.md`.

## O modelo mental, pra não errar de novo

- **VKOS HUB CORE**: o painel do Jesse. Controla a plataforma: modelos, clientes, features, motores, consumo. Tem tudo visível, inclusive Mapa, Conexões, Automações e Administração. A IA do CORE é o Claude do Jesse.
- **VKOS HUB (cliente)**: a plataforma onde o cliente loga. O painel dele mostra **somente o que foi liberado pra ele**, funcionando com a IA do workspace dele (Gemini ou Claude próprio). Nada de tela administrativa, interna ou de configuração de integração.
- Cada lado na sua estrutura, sem conflito. O cliente nunca vê o que é do Jesse.

## Fase 1: o hub obedece às features (o gap mais grave)

Hoje, desligar features no CORE não muda o painel do cliente: o menu continua igual e as telas só falham ao carregar. Corrigir:

1. **Menu e telas do hub montados a partir das features ativas** (a lista já vem em `/api/auth/me`). Item de feature desligada some do menu, rota dela cai no dashboard. Nada de tela que abre e falha.
2. **Exclusivos do CORE, nunca no hub**, independente de flag: Administração, Mapa (de sistema e de telas), Conexões e Automações. No catálogo (`app/server/src/features/catalogo.ts`): `automacoes` e `conexoes` viram `disponivelParaCliente: false`. As rotas de API dessas features respondem 404 no `MODO=hub` sempre.
3. **Dependências**: `leads` hoje depende de `conexoes`. Trocar a dependência para só `crm`; a credencial Apify passa a ser mediada (a chave vive no CORE, o hub pede a busca por rota interna que resolve a credencial no servidor). Se não houver credencial configurada pelo Jesse, o botão Buscar leads não aparece pro cliente.
4. **Mudança a quente**: quando o Jesse liga ou desliga uma feature, o hub atualiza o menu na próxima navegação ou por evento (o WS já filtra por workspace; emitir `workspace:configurado` e recarregar as features no front).
5. **Painel honesto**: workspace sem nenhuma feature liberada mostra um estado vazio digno ("Seu workspace está sendo preparado"), não um dashboard quebrado.
6. O hub não mostra o seletor de workspaces do 2.x nem qualquer resquício de multi-workspace: o cliente tem um workspace só.

Fecha quando: com um cliente de teste logado no hub, o Jesse desliga cada feature no CORE e vê o item sumir do menu do cliente; com tudo desligado, aparece o estado vazio digno; Mapa, Conexões, Automações e Administração não existem no hub nem com flag ligada.

## Fase 2: Administração redesenhada (o print da vergonha)

A tela de Clientes está quebrada: cartões gigantes com um quadrado cinza solto e rótulo jogado à direita. Refazer dentro do sistema de design do plano de UI (`planos/vkos-3-ui/02-design.md`):

1. **Slug morre na interface.** Gerado automático a partir do nome (normalizado, sem acento, com sufixo se colidir). O campo sai do formulário. A linha do cliente mostra nome e consumo do mês, nunca slug.
2. **Features como interruptores de verdade**: componente comum de interruptor (switch), rótulo à esquerda, descrição curta embaixo, estado visível, grade densa de duas colunas no desktop e uma no celular. Sem cartão gigante por feature.
3. **Motor com rótulo humano**: "Gemini (Google)", "Claude do próprio cliente", "Sem IA". Com uma linha explicando a diferença.
4. **Estrutura da tela**: lista de clientes como linhas compactas (nome, status, motor, consumo, ações), detalhe abrindo painel com abas (Features, Acesso, Consumo). Modelos na mesma lógica.
5. A tela passa no checklist completo da varredura de UI (estados, 3 larguras, 2 temas, screenshots).

Fecha quando: o Jesse cria um cliente sem digitar slug, liga e desliga features por interruptores claros, e os 6 screenshots da tela estão limpos.

## Fase 3: login sem fricção (decisão registrada)

O Jesse não gostou do cadastro com autenticador. Novo contrato:

1. **Local (desenvolvimento, sem exposição)**: o CORE abre direto, sem cadastro, sem senha, sem TOTP, como o 2.x. Implementação: sem a variável `PRODUCAO=1`, o modo core cria sessão de operador automática. O hub local continua com login de cliente (é o que precisa ser testado).
2. **Produção (VPS)**: primeiro acesso cria a senha do operador (mínimo 12 caracteres), e só. **TOTP deixa de ser obrigatório**: vira opção que o Jesse pode ligar depois numa tela de segurança do CORE. As proteções que ficam sempre: rate limit no login, bloqueio por 5 falhas, sessão curta no CORE, auditoria, e allowlist de IP opcional no Caddy.
3. O smoke test se adapta: cobre o fluxo de produção (com senha, sem TOTP por padrão) e o fluxo com TOTP ligado.
4. Remover da tela de acesso qualquer resto do fluxo antigo obrigatório (QR no bootstrap). O QR passa a viver na tela de segurança, quando o Jesse quiser ligar.

Fecha quando: rodar local abre o CORE direto no painel; o fluxo de produção pede só email e senha; ligar TOTP pela tela de segurança funciona e o smoke passa nos dois modos.

## Fase 4: matar o fantasma do cockpit

Ao trocar de tela pelo menu, o cockpit aparece por trás (o Shell mantém o Cockpit sempre montado por baixo e as telas cobrem por cima, `Shell.tsx` linha 65 e 296). Corrigir de vez:

1. Quando qualquer tela fixa está ativa, o contêiner do canvas recebe `visibility: hidden` e `inert` (mantém o estado do React Flow, para de pintar e de receber foco). Volta a aparecer só no cockpit.
2. `.tela-fluxo` (global.css 1176) ganha fundo 100% opaco por token. Nenhuma tela de fluxo pode ter fundo translúcido sobre o canvas.
3. Testar a navegação completa do menu, ida e volta em todas as telas, nos dois temas, sem nenhum frame de cockpit vazando. Incluir o caso de abrir tela fixa direto por URL (F5 numa rota funda).

Fecha quando: navegar por todo o menu não mostra nenhum fantasma, com verificação visual gravada em screenshots.

## Fase 5: regressão e contexto

- `npm run checar`, `npm run testar`, `npm run build -w web` e `npm run smoke:nuvem` verdes.
- Testes novos: hub renderiza menu conforme features; automações e conexões nunca no hub; slug gerado automático; modo local abre direto; rota de feature desligada responde 404.
- Atualizar: `interno/mapa-sistema.json` (leads sem dependência de conexões no cliente, automações e conexões exclusivas do CORE), `interno/mapa-telas.json`, `contexto/arquitetura.md`, `app/CONTRATO.md`, CHANGELOG.
- Screenshots das telas mexidas em `analises/varredura-ui/`.

## Regras para quem executa

As mesmas da casa, sem exceção: português brasileiro, sem travessão e sem ponto centrado, cor só por token nos dois temas, NUNCA commit sem ordem do Jesse, dado real é sagrado, evidência visual obrigatória em correção de UI. O ambiente local: Postgres em `docker compose -f docker-compose.dev.yml up -d`, CORE 4600 e hub 4601 (README, seção Desenvolvimento).
