# Plano: subdomínio por workspace (Nível 1)

Cada workspace de cliente passa a responder num subdomínio da marca:
`cli01.vkos.app` abre direto o workspace do cli01, com HTTPS automático.
O cliente recebe o convite já no endereço dele e nunca vê o endereço genérico.
O CORE continua exclusivo em `CORE_DOMAIN`. Nada do fluxo atual quebra:
o `APP_DOMAIN` raiz continua funcionando como hoje.

## Como é hoje (âncoras de código)

- O Caddy roteia por dois domínios fixos: `CORE_DOMAIN` pro core e `APP_DOMAIN`
  pro hub (`infra/Caddyfile`, blocos das linhas 21 e 26). Certificado por ACME.
- O servidor valida o header Host contra uma allow-list exata, proteção contra
  DNS rebinding (`app/server/src/index.ts`, `HOSTS_PERMITIDOS`, linha 86).
- O workspace de uma requisição no hub vem da sessão (`sessoes_web.workspace_id`)
  ou do header `x-workspace-id`, sempre validado contra `membros_workspace`
  (`app/server/src/plataforma/autorizacao.ts`, `resolverContexto`, linha 45).
- No login, a sessão nasce apontando pro primeiro workspace do usuário, dono
  primeiro (`app/server/src/plataforma/identidade.ts`, linha 68).
- O link de convite nasce de `APP_URL` fixo (`app/server/src/plataforma/admin.ts`,
  linha 662). O de redefinição de senha nasce de `RESET_URL_BASE`
  (`identidade.ts`, linha 95).
- Todo workspace já tem `slug` único, minúsculo, só `[a-z0-9-]`
  (migração 001, `gerarSlugUnico` em `admin.ts`). É um rótulo DNS válido pronto.
- O cliente já vive na raiz do domínio: `/w/<id>` é só o operador entrando pelo
  CORE (`app/web/src/App.tsx`, função Raiz, linha 112). Isso joga muito a favor:
  a experiência do cliente não muda de estrutura, só de endereço.

## Decisões de desenho

1. **O subdomínio é o slug.** Nada de coluna nova nem cadastro: workspace ativo
   responde em `<slug>.<APP_DOMAIN>` automaticamente. O slug já é único e
   DNS-safe. Nomes reservados (`www`, `api`, `app`, `core`, `admin`, `mail`,
   `smtp`, `status`, `caddy`, `ftp`) entram como ocupados no `gerarSlugUnico`
   e são recusados na resolução por host.
2. **TLS sob demanda com portão "ask", não curinga DNS-01.** O Caddy padrão
   emite um certificado por subdomínio no primeiro acesso e só se o hub
   confirmar que o host é um workspace ativo. Não precisa de imagem custom do
   Caddy nem de API do provedor de DNS. Pra 30 a 50 clientes, os limites da
   Let's Encrypt sobram. O curinga via DNS-01 fica como evolução se o parque
   crescer (exigiria imagem xcaddy com plugin do provedor de DNS).
3. **O host fixa o workspace no servidor, nunca no navegador.** Num subdomínio,
   o `resolverContexto` resolve o slug e força o workspace da requisição.
   O header `x-workspace-id` é ignorado nesse caso. Cliente que não é membro
   daquele workspace fica sem workspace no contexto, o que já cai nos 401
   existentes. Isolamento continua decidido só no servidor.
4. **Sem `APP_DOMAIN` configurado, nada muda.** Todo o comportamento novo
   liga por env. Em dev e no `APP_DOMAIN` raiz, o fluxo atual segue idêntico.
5. **Operador não muda de casa.** O CORE segue em `CORE_DOMAIN` com `/w/<id>`.
   Subdomínio é a porta do cliente.

## Fase 0, leitura

- `app/server/src/index.ts` (gate de Host e registro de rotas), `autorizacao.ts`,
  `identidade.ts` (login, convite aceito, reset), `admin.ts` (convites),
  `app/server/src/ws.ts` (confirmar que o filtro por workspace herda do
  contexto da sessão), `infra/Caddyfile`, `docker-compose.yml`,
  `infra/RUNBOOK-VPS.md`, `app/web/src/App.tsx` e `estado/contexto.tsx`.

## Fase 1, servidor

Módulo novo `app/server/src/plataforma/dominios.ts`, puro e testável:

- `dominioApp(): string | null`: lê `APP_DOMAIN` do env (no core, pode derivar
  de `APP_URL` como fallback). Null desliga tudo.
- `slugDoHost(host, dominioApp): string | null`: extrai o slug de
  `<slug>.<dominioApp>`, com ou sem porta, minúsculo. Recusa apex, recusa
  reservados, recusa rótulo inválido, recusa sub-subdomínio.
- `RESERVADOS`: o conjunto da decisão 1, exportado pro `gerarSlugUnico`.
- `urlDoWorkspace(slug, appUrl): string`: monta `https://<slug>.<apex>` a
  partir de `APP_URL`, pros links de convite.

Mudanças cirúrgicas:

- `index.ts`: o gate de Host aceita também host cujo `slugDoHost` não é null
  (só em `MODO === "hub"`). A allow-list exata continua valendo pro resto.
- `autorizacao.ts` (`resolverContexto`): antes de aplicar `x-workspace-id`,
  resolve o host. Se há slug, busca o workspace ativo por slug e fixa
  `workspaceId`, validando associação como hoje. Cache em memória de
  slug pra id com TTL curto (60 s) pra não somar uma query por requisição.
- `identidade.ts` (login): quando o host tem slug e o usuário é membro daquele
  workspace, a sessão nasce apontando pra ele, em vez do primeiro da lista.
- `admin.ts` (convites): o link usa `urlDoWorkspace(slug do workspace, APP_URL)`
  quando `APP_DOMAIN` está configurado. Senão, `APP_URL` como hoje.
- `identidade.ts` (reset): o link nasce do próprio Host da requisição quando
  ele é um host permitido, com `RESET_URL_BASE` como fallback.
- Rota pública nova `GET /api/auth/tls-permitido?domain=<host>`: responde 200
  se o host resolve pra workspace ativo, 404 caso contrário. Já cai no prefixo
  público `/api/auth/`. É o portão "ask" do Caddy.
- `gerarSlugUnico` passa a receber os reservados como ocupados.

Testes (node:test, puros): extração de slug com porta e sem, apex, reservados,
sub-subdomínio, maiúsculas; reservados no `gerarSlugUnico`; montagem de
`urlDoWorkspace`.

## Fase 2, web e CORE

- `GET /api/auth/estado` (ou a rota equivalente que o App já consome) ganha
  `workspaceFixo: { id, nome } | null` quando o host é um subdomínio. Com host
  fixo, o Shell esconde o seletor de workspace e qualquer caminho `/w/<id>`
  redireciona pra raiz.
- Na área Workspace do CORE, a gaveta Gerenciar mostra o endereço do workspace
  (`https://<slug>.<apex>`) com botão de copiar, ao lado do bloco de identidade
  da logo. É a superfície do operador pra essa feature. Copy sem travessão.
- Teste de rota: caminho `/w/<id>` com host fixo normaliza pra raiz.

## Fase 3, infra

`infra/Caddyfile`:

```
{
  email {$ACME_EMAIL}
  admin off
  on_demand_tls {
    ask http://hub:4600/api/auth/tls-permitido
  }
}

*.{$APP_DOMAIN} {
  import seguranca
  tls {
    on_demand
  }
  reverse_proxy hub:4600
}
```

- O bloco curinga entra além dos dois atuais, sem tocar neles.
- `docker-compose.yml`: env `APP_DOMAIN` também no serviço hub (o core já
  deriva de `APP_URL`).
- `infra/RUNBOOK-VPS.md`: passo novo de DNS, um registro curinga
  `*.<APP_DOMAIN>` apontando pro mesmo IP da VPS. Nota sobre limites da
  Let's Encrypt e sobre o portão ask.
- `infra/smoke-nuvem.mjs`: passo que confere um subdomínio de workspace
  respondendo 200 e o `tls-permitido` recusando host inventado.

Recursos do Caddy que valem ligar nessa mesma passada (opcionais, baratos):

- `encode zstd gzip` nos três blocos: comprime HTML, JS e JSON na borda.
- `header /assets/* Cache-Control "public, max-age=31536000, immutable"`:
  os bundles do Vite têm hash no nome, cache agressivo é de graça.
- `log` estruturado em JSON por bloco de site: auditoria de acesso por domínio
  sem tocar no app.
- `handle_errors` com uma página estática de manutenção quando o hub reiniciar:
  o cliente vê um aviso digno em vez de erro 502 cru.

## Fase 4, verificação e documentação

- Suíte inteira e typecheck nos três workspaces.
- Dev, API: subir uma instância hub local com `APP_DOMAIN=app.local` e conferir
  com `curl -H "Host: cli01.app.local"`: contexto fixo no workspace certo,
  `tls-permitido` 200 pra slug real e 404 pra inventado e pra reservado,
  host fora da lista continua recusado.
- Dev, UI: Playwright com `--host-resolver-rules="MAP *.app.local 127.0.0.1"`
  pra abrir o subdomínio de verdade no navegador headless: login do cliente,
  workspace certo renderizado, seletor oculto, `/w/<id>` normalizando.
- Docs na mesma tarefa: `app/CONTRATO.md` (resolução por host, rota
  `tls-permitido`, links de convite), `interno/mapa-sistema.json` (descrição do
  hub ganha a resolução por subdomínio), `CHANGELOG.md`, decisão em
  `decisoes/`, e o RUNBOOK da fase 3.

## Riscos e mitigação

- **Vazamento entre workspaces.** O host só fixa, nunca amplia: a associação
  do usuário continua sendo checada no mesmo lugar de hoje. Teste cobre membro
  de A tentando host de B (fica sem workspace, 401).
- **Abuso de emissão de certificado.** O portão ask só libera slug ativo.
  Host inventado nem chega na Let's Encrypt.
- **Slug que muda ou some.** Slug de plataforma não muda hoje (não existe
  rota de rename). Workspace suspenso: `tls-permitido` 404 e resolução nula,
  o subdomínio morre junto com a suspensão. Comportamento desejado.
- **DNS rebinding.** O gate de Host continua fechado: só entra host da
  allow-list ou subdomínio que resolve pra workspace ativo.
- **Cookie e sessão.** Cookies são host-only por natureza: sessão de
  `cli01.vkos.app` não vaza pra `cli02.vkos.app`. Sem cookie de domínio pai.

## Fora de escopo (fica pro Nível 2)

- Domínio próprio do cliente (CNAME, verificação de DNS, tabela
  `dominios_workspace`). O desenho desta fase já deixa a resolução por host
  pronta pra crescer pra isso.
- E-mail transacional com remetente do domínio do cliente.
- Escolher subdomínio custom diferente do slug.
