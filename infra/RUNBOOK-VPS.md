# Runbook da VPS do VKOS 3

Este é o caminho de uma máquina vazia até CORE, Hub, motores e backup em produção. Os testes externos do final são obrigatórios antes de cadastrar um cliente real.

## 1. Preparar Google Cloud, domínio e operador

Pré-requisitos na máquina administrativa: `gcloud`, Terraform 1.7 ou superior, Git e uma chave SSH. O projeto precisa ter faturamento ativo.

1. Autentique o `gcloud` e selecione o projeto.
2. Copie os valores do Terraform para um arquivo `infra/gcp/terraform.tfvars` fora do Git:

```hcl
project_id      = "meu-projeto"
region          = "us-central1"
zone            = "us-central1-a"
ssh_source_cidr = "SEU_IP_PUBLICO/32"
backup_bucket   = "nome-global-unico-vkos-backups"
```

3. Aplique a infraestrutura:

```sh
terraform -chdir=infra/gcp init
terraform -chdir=infra/gcp plan
terraform -chdir=infra/gcp apply
terraform -chdir=infra/gcp output
```

4. Crie registros DNS `A` de `core.seudominio.com` e `app.seudominio.com` para `ip_publico`.
5. Confirme que somente 22 a partir do CIDR do operador, 80 e 443 estão liberadas. Postgres, CORE, Hub e motor não têm porta pública.
6. Configure um orçamento com alertas no Cloud Billing. Em Vertex AI, revise as quotas do modelo e reduza o teto de requisições e tokens para o máximo financeiro aceitável.

O Terraform cria contas separadas para VM, Vertex e backup. Só a conta do motor recebe `roles/aiplatform.user`. Só a conta de backup pode criar objetos no bucket.

## 2. Preparar a VM

Entre por OS Login, instale Git e Docker Engine com o plugin Compose e clone o repositório. Na raiz:

```sh
sudo sh infra/hardening-ubuntu.sh
sh infra/inicializar-runtime.sh
cp .env.example .env
```

Preencha `.env` com domínios, email ACME, projeto, região, bucket, modelos e preços. Preço é sempre USD por um milhão de tokens. Consulte as páginas oficiais de preços do [Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/pricing) e da [Anthropic](https://docs.anthropic.com/en/docs/about-claude/pricing) no dia da implantação. As variáveis por faixa têm prioridade sobre o preço geral.

Nunca use o valor de exemplo como preço real. Um preço ausente ou inválido bloqueia a conclusão da sessão para não registrar custo falso.

## 3. Publicar e carregar segredos

Na máquina administrativa, depois do Terraform:

```sh
export GOOGLE_CLOUD_PROJECT="meu-projeto"
sh infra/criar-chaves-servico-gcp.sh
sh infra/publicar-segredos-gcp.sh
```

Apague ou proteja a cópia administrativa das chaves depois da publicação. Na VPS, usando a identidade da VM:

```sh
sh infra/carregar-segredos-gcp.sh
test -s runtime/secrets/vertex_credentials.json
test -s runtime/secrets/backup_credentials.json
```

Os segredos locais `postgres_password` e `database_url` são criados apenas na VPS. Não os publique no repositório.

## 4. Subir e conferir a plataforma

```sh
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 core hub motor postgres backup caddy
```

CORE e Hub disputam uma trava de migração no primeiro boot, portanto as migrações são aplicadas uma vez. Aguarde todos os serviços estabilizarem e confirme:

```sh
curl -fsS "https://core.seudominio.com/api/saude"
curl -fsS "https://app.seudominio.com/api/saude"
```

Abra o CORE, crie o operador inicial e ative TOTP em Administração, Segurança. Crie um modelo, provisione um workspace de teste e gere um convite.

## 5. Entrar no Claude do CORE

O Claude do Jesse existe somente no container CORE e persiste no volume `claude_core`.

```sh
docker compose exec core claude
```

Siga o fluxo de autenticação exibido no terminal. A documentação oficial do Claude Code descreve o [primeiro login](https://docs.anthropic.com/en/docs/claude-code/getting-started) e a [CLI](https://docs.anthropic.com/en/docs/claude-code/cli-usage).

Depois, abra Administração, Meu Claude, atualize o estado e execute o teste. Reinicie o container e teste novamente:

```sh
docker compose restart core
```

O painel precisa continuar mostrando a conta conectada. O Hub nunca monta esse volume.

## 6. Validar Gemini e Claude Team

No CORE:

1. Confirme que Gemini aparece disponível.
2. No workspace de teste, clique em Testar Gemini. A resposta deve ser curta e o custo deve aparecer em Consumo.
3. Defina orçamento baixo, escolha `cortar`, simule o limite e confirme que uma nova sessão é recusada.
4. Para Claude Team, registre o consentimento, guarde a credencial do cliente e teste.
5. Confirme que Claude Team só fica selecionável depois do teste válido.
6. Rotacione a credencial para um valor inválido e confirme o estado de manutenção, sem segredo em log ou resposta.

Execute também:

```sh
cd app
npm ci
npm run checar
npm run testar
npm run build
npm run smoke:nuvem
```

O smoke automatizado valida autenticação, isolamento, convite e rotas. O clique de teste no CORE é a validação real do provedor na VM.

## 7. Backup diário e restauração

O container `backup` executa `pg_dump`, empacota `/dados`, cifra com AES-256-CBC e envia ao bucket todos os dias às 03:17 UTC.

Confira o primeiro objeto:

```sh
docker compose exec backup /usr/local/bin/vkos-backup
docker compose logs --tail=100 backup
gcloud storage ls "gs://SEU_BUCKET/vkos-*.tar.enc"
```

Faça o ensaio em destino temporário, nunca sobre os dados ativos:

```sh
arquivo="$(find runtime/backups -type f -name 'vkos-*.tar.enc' | sort | tail -n 1)"
destino="/tmp/vkos-restore-$(date +%s)"
docker compose exec backup /usr/local/bin/vkos-restaurar "/backups/$(basename "$arquivo")" "$destino"
docker compose cp "backup:$destino/postgres.dump" "$destino/postgres.dump"
docker compose cp "backup:$destino/dados.tar.gz" "$destino/dados.tar.gz"
```

Suba um Postgres descartável em porta local, restaure e confira as tabelas:

```sh
docker run -d --rm --name vkos-restore-test -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=vkos_restore -p 127.0.0.1:55432:5432 postgres:17-alpine
until docker exec vkos-restore-test pg_isready -U postgres -d vkos_restore; do sleep 1; done
docker cp "$destino/postgres.dump" vkos-restore-test:/tmp/postgres.dump
docker exec vkos-restore-test pg_restore -U postgres -d vkos_restore --exit-on-error /tmp/postgres.dump
docker exec vkos-restore-test psql -U postgres -d vkos_restore -c "SELECT count(*) FROM workspaces;"
tar -tzf "$destino/dados.tar.gz" >/dev/null
docker stop vkos-restore-test
```

Registre data, objeto, quantidade de workspaces e resultado. Para recuperação real, pare CORE, Hub e motor, restaure primeiro em uma VM limpa e só então troque DNS. Nunca rode `pg_restore --clean` no banco ativo sem uma janela de recuperação aprovada.

## 8. Critério de liberação

A produção só está pronta quando todos estes pontos forem verdadeiros:

- TLS válido nos dois domínios a partir de outra rede.
- CORE com senha, TOTP e Claude do Jesse respondendo.
- Hub sem rota de IA local e sem volume ou segredo do Claude do CORE.
- Gemini real respondendo na VM e registrando tokens e custo do modelo certo.
- Claude Team isolado, autorizado e testado em um workspace descartável.
- Limite `cortar` recusando novas sessões após o teto.
- Backup no bucket e restauração completa aprovada em ambiente descartável.
- Logs sem credenciais, cookies ou conteúdo cifrado.
- `npm run checar`, `npm run testar`, `npm run build` e `npm run smoke:nuvem` verdes no código implantado.
