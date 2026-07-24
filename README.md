# VKOS Hub 3.0

Repositório privado da plataforma VKOS na nuvem. O mesmo monorepo entrega dois lados separados:

- `CORE`: painel exclusivo do operador, com Claude Code local, modelos, clientes, consumo e auditoria.
- `hub`: workspace dos clientes no navegador, sem CLI de IA e sem acesso ao cofre.
- `motor`: broker interno que resolve Gemini ou Claude do próprio cliente, mede consumo e aplica limites.

O plano e as decisões estão em `planos/vkos-3-nuvem/` e `decisoes/2026-07-22-vkos-3-nuvem.md`.

## Estrutura

```text
app/
  server/       Fastify, identidade, autorização, features e APIs
  web/          React e Vite, interface compartilhada
  motor/        broker interno de IA
infra/
  backup/       backup diário cifrado e restauração
  gcp/          infraestrutura Terraform
  Caddyfile     TLS, roteamento e headers de segurança
vkos2/          primeira semente de modelo de workspace
contexto/       contexto vivo do produto
decisoes/       decisões registradas
interno/        mapas do sistema e das telas
```

Dados reais não entram na imagem nem no Git. Em produção ficam sob `runtime/dados/`, ignorado pelo repositório.

## Desenvolvimento

Requer Node.js 20 ou mais recente. A partir de `app/`:

```bash
npm install
npm run dev
```

Para subir apenas o PostgreSQL de desenvolvimento:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Configure o servidor com:

```text
MODO=core
DATABASE_URL=postgresql://vkos:vkos_dev@localhost:54329/vkos
```

Sem `PRODUCAO=1`, o CORE abre direto como operador local, com ou sem banco. Use `PRODUCAO=1` somente para ensaiar o login de produção. O modo `hub` sempre exige banco e autenticação.

## Qualidade

```bash
npm run checar
npm run testar
npm run build -w web
npm run checar -w motor
```

O ensaio ponta a ponta exige CORE e hub ligados ao mesmo PostgreSQL:

```bash
npm run smoke:nuvem
```

A interface usa os temas Escuro e Claro off-white. Para gerar o lote visual em 390, 768 e 1440 px, com checagem de overflow, console e contraste:

```bash
npm run varrer:ui
```

As capturas ficam em `analises/varredura-ui/<data>/`. Em desenvolvimento isolado, `VARREDURA_FIXTURES=1` usa somente dados fictícios. `VARREDURA_TELAS=acesso,admin,crm` limita a rodada a telas específicas.

## Produção

1. Copie `.env.example` para `.env` e informe domínio, projeto e bucket.
2. Execute `infra/inicializar-runtime.ps1` uma vez.
3. Na VM, use `infra/carregar-segredos-gcp.sh` para montar as versões do Secret Manager. Vertex e backup usam identidades separadas, disponíveis apenas nos containers correspondentes.
4. Suba `docker compose up -d --build`.
5. Faça o bootstrap do operador em `core.seudominio`. Se quiser a proteção extra, ligue o TOTP em Administração, Segurança.

O `docker-compose.yml` não publica Postgres nem motor. O volume do Claude pessoal existe apenas no CORE. O cofre existe apenas no CORE e no motor. O hub recebe somente um token para chamar o broker interno.

## Google Cloud

`infra/gcp/` cria VM `e2-standard-2`, IP fixo, firewall, bucket versionado com retenção de 30 dias, service account mínima e segredos. DNS e aplicação do Terraform exigem acesso ao projeto real e são ações externas deliberadas.

## Regras

- Nunca apagar ou sobrescrever dados de workspace às cegas.
- Dado pessoal de cliente nunca entra em peça publicável.
- Credenciais nunca aparecem em resposta, tela ou log.
- O hub nunca executa IA local.
- Commit, push e PR somente por ordem explícita.
