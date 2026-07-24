# Guia de deploy do VKOS Hub, passo a passo (vkoshub.com)

Este é o caminho completo, do zero até o CORE e o Hub no ar com o Gemini
funcional, feito pra ser seguido sem saber nada de servidor. Cada comando é pra
copiar e colar. Sempre que tiver dúvida se deu certo, tem uma linha "Confira".

## Como este guia funciona

Você vai trabalhar em três lugares. Cada passo diz onde rodar:

- **[Navegador]** o console do Google Cloud e o painel do seu domínio.
- **[Cloud Shell]** um terminal dentro do navegador, já logado na sua conta, com
  tudo instalado. É onde a maior parte acontece.
- **[VM]** o servidor na nuvem, acessado por dentro do Cloud Shell.

Tempo: cerca de 1 hora de trabalho ativo, mais algumas esperas.

O que ter em mãos: a conta Google com o bônus ativo, o domínio vkoshub.com
(saber onde você o comprou pra mexer no DNS) e um email seu.

Duas máquinas, pra não confundir: o **Cloud Shell** é a bancada de onde você
comanda. A **VM** é onde o VKOS roda de verdade. Segredos de cliente e o banco
vivem na VM, nunca na bancada.

---

## Fase 1, criar o projeto e ligar o faturamento

### 1.1 Criar o projeto [Navegador]

1. Abra https://console.cloud.google.com
2. No topo, no seletor de projeto, clique em "Novo projeto".
3. Nome: `vkos-hub`. Clique em Criar.
4. Espere uns segundos e selecione o projeto `vkos-hub` no seletor do topo.
5. **Anote o ID do projeto.** Não é o nome, é o ID, algo como `vkos-hub-471203`.
   Aparece no seletor e na página inicial. Vou chamar ele de `SEU_PROJECT_ID`
   no resto do guia.

### 1.2 Ligar o faturamento com o bônus [Navegador]

1. Menu (as três linhas no canto), Faturamento.
2. Se pedir, vincule a conta de faturamento que tem os créditos do bônus ao
   projeto `vkos-hub`.
3. Confirme que o projeto aparece como "Faturamento ativado".

### 1.3 Criar um alerta de orçamento pra não estourar o bônus [Navegador]

1. Em Faturamento, vá em "Orçamentos e alertas", "Criar orçamento".
2. Escopo: o projeto `vkos-hub`. Valor: por exemplo R$1600 no mês.
3. Marque alertas em 50%, 90% e 100%. Salve.

Isso não corta nada sozinho, só te avisa por email. O corte de gasto de IA por
cliente é outra coisa, e o próprio VKOS faz, você verá na Fase 9.

---

## Fase 2, abrir o Cloud Shell e pegar o código

### 2.1 Abrir o Cloud Shell [Navegador]

1. Com o projeto `vkos-hub` selecionado, clique no ícone de terminal `>_` no
   canto superior direito do console. Uma faixa preta abre embaixo. É o Cloud
   Shell. Se perguntar, autorize.
2. Confirme que ele está no projeto certo:

```sh
gcloud config set project SEU_PROJECT_ID
gcloud config get-value project
```

A segunda linha deve responder `SEU_PROJECT_ID`.

### 2.2 Trazer o código do GitHub [Cloud Shell]

```sh
cd ~
git clone https://github.com/OJESSEGOMES-VKOS/vkos-hub.git
cd vkos-hub
```

Se ele **pedir usuário e senha**, o repositório é privado. Nesse caso:

1. No GitHub, abra Settings, Developer settings, Personal access tokens, Tokens
   (classic), Generate new token (classic). Marque o escopo `repo`. Gere e
   copie o token (uma sequência longa). Guarde bem, ele não aparece de novo.
2. Clone usando o token no lugar da senha:

```sh
cd ~
git clone https://SEU_TOKEN@github.com/OJESSEGOMES-VKOS/vkos-hub.git
cd vkos-hub
```

**Confira:** `ls` deve listar pastas como `app`, `infra`, `docker-compose.yml`.

---

## Fase 3, provisionar a infraestrutura com Terraform

Isso cria, de uma vez, a VM, o IP fixo, o firewall, o bucket de backup, as
contas de serviço e os cofres de segredo. Você não cria nada disso na mão.

### 3.1 Ligar a API do túnel seguro de SSH [Cloud Shell]

```sh
gcloud services enable iap.googleapis.com
```

Isso deixa você entrar na VM por um túnel do Google, sem abrir a porta de SSH
pra internet. Pode demorar um minuto.

### 3.2 Escrever o arquivo de variáveis [Cloud Shell]

Cole o bloco abaixo inteiro, trocando só o `SEU_PROJECT_ID`. O `backup_bucket`
precisa ser único no mundo, então se der erro de nome ocupado mais adiante,
volte aqui e mude o final.

```sh
cat > infra/gcp/terraform.tfvars <<'FIM'
project_id      = "SEU_PROJECT_ID"
region          = "us-central1"
zone            = "us-central1-a"
ssh_source_cidr = "35.235.240.0/20"
backup_bucket   = "vkoshub-backups-2026"
FIM
```

O `ssh_source_cidr` é a faixa do túnel seguro do Google, não o seu IP. Deixe
exatamente esse valor.

### 3.3 Aplicar [Cloud Shell]

```sh
terraform -chdir=infra/gcp init
terraform -chdir=infra/gcp apply
```

O `apply` mostra tudo que vai criar e pergunta no fim. Digite `yes` e Enter.
Leva de 1 a 3 minutos. Se falhar dizendo que uma API não está pronta, espere
1 minuto e rode o `apply` de novo, é normal na primeira vez.

### 3.4 Pegar o IP público [Cloud Shell]

```sh
terraform -chdir=infra/gcp output
```

**Anote o `ip_publico`**, algo como `34.10.20.30`. Vou chamar de `SEU_IP`.

---

## Fase 4, apontar o domínio vkoshub.com

Faça agora pra o DNS ir propagando enquanto você segue o guia.

### 4.1 Criar dois registros A [Navegador]

1. Entre no painel de onde você comprou o vkoshub.com (Registro.br, GoDaddy,
   Hostinger, Cloudflare, onde for). Procure "DNS", "Gerenciar DNS" ou "Zona".
2. Crie dois registros do tipo **A**:

| Tipo | Nome (host) | Valor (aponta para) | TTL |
|------|-------------|---------------------|-----|
| A    | core        | SEU_IP              | 5 min ou o menor |
| A    | app         | SEU_IP              | 5 min ou o menor |

Alguns painéis pedem o nome completo (`core.vkoshub.com`), outros só o prefixo
(`core`). Os dois apontam pro mesmo `SEU_IP`.

### 4.2 Conferir a propagação [Cloud Shell]

```sh
nslookup core.vkoshub.com
nslookup app.vkoshub.com
```

Cada um deve responder com o `SEU_IP`. Se ainda mostrar outro valor ou erro,
espere. Costuma levar de minutos a uma hora. Só siga pra Fase 8 quando os dois
responderem certo, porque o certificado HTTPS depende disso.

---

## Fase 5, gerar e publicar os segredos (na bancada)

Aqui a gente cria as chaves de criptografia e as chaves das contas de serviço,
e guarda no cofre do Google (Secret Manager). Tudo no Cloud Shell.

### 5.1 Gerar as chaves compartilhadas [Cloud Shell]

```sh
sh infra/inicializar-runtime.sh
```

Isso cria a pasta `runtime/secrets` com as chaves. Ignore aqui os arquivos de
Postgres, eles serão gerados de novo dentro da VM.

### 5.2 Criar as chaves das contas de serviço [Cloud Shell]

O passo 5.1 deixou dois arquivos JSON vazios de exemplo. Apague-os primeiro,
pra a geração real não esbarrar neles:

```sh
rm -f runtime/secrets/vertex_credentials.json runtime/secrets/backup_credentials.json
export GOOGLE_CLOUD_PROJECT="SEU_PROJECT_ID"
sh infra/criar-chaves-servico-gcp.sh
```

Isso gera dois arquivos JSON: um dá ao motor o acesso ao Gemini (Vertex), o
outro dá ao backup o acesso ao bucket.

### 5.3 Publicar tudo no cofre do Google [Cloud Shell]

```sh
sh infra/publicar-segredos-gcp.sh
```

Deve terminar com "Novas versoes publicadas no Secret Manager".

### 5.4 Apagar as cópias locais [Cloud Shell]

Tudo já está no cofre do Google. Não deixe nenhuma cópia solta na bancada. A VM
vai puxar do cofre e gerar as suas próprias chaves de banco:

```sh
rm -rf runtime/secrets
```

---

## Fase 6, entrar na VM e instalar o Docker

### 6.1 Entrar na VM pelo túnel [Cloud Shell]

```sh
gcloud compute ssh vkos-v3 --zone=us-central1-a --tunnel-through-iap
```

Na primeira vez ele cria uma chave SSH e pergunta uma frase secreta
(passphrase). Pode deixar em branco, é só apertar Enter duas vezes. Quando o
prompt mudar para algo como `seu_usuario@vkos-v3:~$`, você está **dentro da VM**.
Daqui em diante, os comandos marcados [VM] rodam nessa janela.

### 6.2 Instalar o Docker no Debian [VM]

Cole este bloco inteiro:

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Deixe seu usuário usar o Docker sem `sudo`:

```sh
sudo usermod -aG docker $USER
```

Pra esse grupo valer, **saia e volte**: digite `exit`, e rode de novo o comando
da 6.1 pra reentrar na VM.

**Confira** (de volta na VM):

```sh
docker run --rm hello-world
```

Deve baixar e imprimir "Hello from Docker!".

### 6.3 Trazer o código pra dentro da VM [VM]

```sh
cd ~
git clone https://github.com/OJESSEGOMES-VKOS/vkos-hub.git
cd vkos-hub
```

Se o repositório for privado, use o mesmo formato com token da Fase 2.2.

---

## Fase 7, preparar segredos e configuração na VM

### 7.1 Trancar a VM [VM]

```sh
sudo sh infra/hardening-ubuntu.sh
```

Isso liga firewall, atualizações automáticas e bloqueios de segurança. O nome
diz ubuntu, mas funciona no Debian. Pode reclamar de uma linha ou outra, tudo
bem, o importante é terminar.

### 7.2 Gerar os segredos locais da VM [VM]

```sh
sh infra/inicializar-runtime.sh
```

Cria a senha do Postgres e a URL do banco, que nascem e ficam só aqui.

### 7.3 Puxar os segredos do cofre [VM]

```sh
sh infra/carregar-segredos-gcp.sh
```

Isso traz do cofre do Google as chaves e os dois JSON de conta de serviço. É o
que liga o **Gemini** de verdade. Confira que os dois arquivos vieram cheios:

```sh
test -s runtime/secrets/vertex_credentials.json && echo "vertex ok"
test -s runtime/secrets/backup_credentials.json && echo "backup ok"
```

Os dois devem imprimir "ok".

### 7.4 Preencher o arquivo de configuração [VM]

```sh
cp .env.example .env
nano .env
```

O `nano` é um editor no terminal. Ajuste as linhas abaixo. Para salvar no fim:
`Ctrl + O`, Enter, depois `Ctrl + X` pra sair.

```
ACME_EMAIL=seu-email-real@exemplo.com
CORE_DOMAIN=core.vkoshub.com
APP_DOMAIN=app.vkoshub.com
GOOGLE_CLOUD_PROJECT=SEU_PROJECT_ID
VERTEX_LOCATION=us-central1
GCS_BUCKET=vkoshub-backups-2026
```

Deixe os nomes de modelo como já vêm. Agora os **preços**, que são obrigatórios
e não podem ficar no valor de exemplo, senão o sistema recusa a sessão pra não
registrar custo falso. Os valores são em dólar por um milhão de tokens.

1. Abra a página oficial de preços do Vertex AI (Gemini) e da Anthropic (Claude)
   e pegue os valores do dia. Referência aproximada, só pra você não se perder,
   **confirme sempre no site**: Gemini 2.5 Flash costuma ficar perto de 0,30 na
   entrada e 2,50 na saída. Claude Sonnet fica bem mais alto.
2. Preencha:

```
PRECO_GEMINI_ENTRADA=0.30
PRECO_GEMINI_SAIDA=2.50
PRECO_CLAUDE_TEAM_ENTRADA=3.00
PRECO_CLAUDE_TEAM_SAIDA=15.00
```

Como você vai começar só com o Gemini, o que importa agora é acertar os dois
primeiros. Os de Claude só entram em jogo quando um cliente usar Claude Team.
As linhas por faixa (econômico, padrão, forte) podem ficar em branco, elas usam
o preço geral acima.

---

## Fase 8, subir a plataforma e conferir

### 8.1 Validar e subir [VM]

```sh
docker compose config --quiet
docker compose build
docker compose up -d
```

O `build` compila as imagens e leva alguns minutos na primeira vez. O `up -d`
sobe tudo em segundo plano.

### 8.2 Ver se está tudo de pé [VM]

```sh
docker compose ps
```

Todos os serviços (caddy, core, hub, motor, postgres, backup) devem aparecer
como `running` ou `healthy`. Se algum reiniciar em loop, veja os logs:

```sh
docker compose logs --tail=100 core hub motor caddy
```

### 8.3 Testar os endereços [Navegador]

Espere uns 2 minutos pro Caddy emitir os certificados HTTPS e abra no navegador:

- https://core.vkoshub.com/api/saude
- https://app.vkoshub.com/api/saude

Cada um deve mostrar uma resposta curta de saúde. Se o navegador reclamar de
certificado, espere mais um pouco e recarregue, a emissão pode levar até uns
minutos na primeira vez. Se demorar demais, veja o Apêndice A.

---

## Fase 9, criar o operador, ligar o TOTP e testar o Gemini

### 9.1 Criar o seu acesso [Navegador]

1. Abra https://core.vkoshub.com
2. Crie o operador inicial (seu login e senha fortes).
3. Em Administração, Sistema, Segurança, ative o TOTP (o app de código, tipo
   Google Authenticator). Guarde os códigos de recuperação.

### 9.2 Criar um plano e um workspace de teste [Navegador]

1. Na área Workspace, abra Planos de partida e crie um plano (ligue as features
   que quiser, motor Gemini).
2. Clique em Novo workspace, escolha o plano e provisione.

### 9.3 Testar o Gemini de verdade [Navegador]

1. Abra o workspace de teste em Gerenciar, aba Acesso.
2. Clique em Testar Gemini. A resposta deve ser curta e, na aba Consumo, o custo
   do teste deve aparecer. **Esse é o momento em que o Gemini está oficialmente
   funcional na sua nuvem.**
3. Opcional, mas recomendado: defina um orçamento baixo no workspace, escolha
   "cortar", force o limite e confirme que uma nova sessão é recusada.

Se o Gemini aparecer como indisponível, veja o Apêndice A.

---

## Fase 10, backup e critério de pronto

O container de backup roda sozinho todo dia. Pra provar que funciona agora:

```sh
docker compose exec backup /usr/local/bin/vkos-backup
docker compose logs --tail=50 backup
```

Você está pronto pra cadastrar um cliente real quando tudo isto for verdade:
HTTPS válido nos dois domínios, login com senha e TOTP, Gemini respondendo e
registrando custo, o corte de orçamento recusando sessão, e um backup no bucket.
O roteiro completo de validação e o ensaio de restauração estão em
`infra/RUNBOOK-VPS.md`, seções 6 a 8.

---

## Apêndice A, quando algo não funciona

**O HTTPS não emite / erro de certificado que não passa.**
O Caddy só emite o certificado quando o domínio já aponta pro IP e a porta 80
está acessível. Confira o DNS (Fase 4.2) e veja o log do Caddy:
`docker compose logs --tail=100 caddy`. Erro comum é o DNS ainda não ter
propagado. Espere e recarregue.

**Um serviço fica reiniciando.**
`docker compose logs --tail=200 NOME` (troque NOME por core, hub, motor ou
postgres). Erro de preço no `.env` costuma aparecer aqui. Corrija o `.env` e
rode `docker compose up -d` de novo.

**O Gemini aparece indisponível.**
Quase sempre é a credencial do Vertex. Confira que `runtime/secrets/vertex_credentials.json`
tem conteúdo (Fase 7.3), que `GOOGLE_CLOUD_PROJECT` e `VERTEX_LOCATION` no
`.env` estão certos, e que a API aiplatform está ligada (o Terraform já liga).
Depois `docker compose restart motor`.

**Não consigo entrar na VM por SSH.**
Confirme que rodou o `gcloud services enable iap.googleapis.com` (Fase 3.1) e que
o `ssh_source_cidr` no tfvars é `35.235.240.0/20`. O comando certo é o da Fase
6.1, sempre com `--tunnel-through-iap`.

**Terraform reclama de API não habilitada.**
Espere um minuto e rode `terraform -chdir=infra/gcp apply` de novo.

**Perdi o Cloud Shell / fechou a aba.**
Sem problema. Reabra o Cloud Shell, ele guarda seus arquivos em `~/vkos-hub`.
Pra reentrar na VM, rode de novo o comando da Fase 6.1.

---

## Apêndice B, custo e o bônus

A VM `e2-standard-2` custa cerca de 50 a 60 dólares por mês. O disco e o IP
somam poucos dólares. O Gemini Flash é barato por uso. Com o bônus, isso dá
folga por bons meses de teste.

Pra economizar quando não estiver usando, você pode **desligar a VM** sem
destruir nada:

```sh
gcloud compute instances stop vkos-v3 --zone=us-central1-a
gcloud compute instances start vkos-v3 --zone=us-central1-a
```

Parada, ela não cobra CPU (só o disco e o IP, que são baratos). Ao ligar de
novo, os containers voltam sozinhos porque sobem com `restart: unless-stopped`.

Pra desmontar tudo de vez (cuidado, apaga a VM e os recursos):

```sh
terraform -chdir=infra/gcp destroy
```

---

## Apêndice C, comandos do dia a dia [VM]

Sempre dentro de `~/vkos-hub` na VM:

- Ver o estado: `docker compose ps`
- Ver logs de um serviço: `docker compose logs --tail=100 core`
- Reiniciar um serviço: `docker compose restart motor`
- Parar tudo: `docker compose down`
- Subir de novo: `docker compose up -d`

**Atualizar o VKOS depois que eu subir código novo no GitHub:**

```sh
cd ~/vkos-hub
git pull
docker compose build
docker compose up -d
```

As migrações do banco rodam sozinhas no boot. Seus dados ficam no volume do
Postgres e na pasta `runtime/dados`, o `git pull` não mexe neles.
