#!/bin/sh
set -eu

umask 077
raiz="${1:-./runtime}"
segredos="$raiz/secrets"

mkdir -p \
  "$segredos" \
  "$raiz/dados/clientes" \
  "$raiz/dados/core" \
  "$raiz/dados/hub" \
  "$raiz/dados/modelos-carrossel" \
  "$raiz/backups"

criar_hex() {
  arquivo="$1"
  bytes="$2"
  if [ ! -s "$arquivo" ]; then
    openssl rand -hex "$bytes" > "$arquivo"
  fi
}

criar_base64() {
  arquivo="$1"
  bytes="$2"
  if [ ! -s "$arquivo" ]; then
    openssl rand -base64 "$bytes" | tr -d '\n' > "$arquivo"
  fi
}

criar_hex "$segredos/postgres_password" 32
senha_postgres="$(cat "$segredos/postgres_password")"
if [ ! -s "$segredos/database_url" ]; then
  printf '%s' "postgresql://vkos:$senha_postgres@postgres:5432/vkos" > "$segredos/database_url"
fi
criar_base64 "$segredos/cofre_master_key" 32
criar_base64 "$segredos/motor_internal_token" 48
criar_base64 "$segredos/backup_key" 48

for arquivo in vertex_credentials.json backup_credentials.json
do
  if [ ! -s "$segredos/$arquivo" ]; then
    printf '%s\n' '{}' > "$segredos/$arquivo"
  fi
done

chmod 700 "$raiz" "$segredos"
# 644, nao 600: o docker compose (fora do modo Swarm) monta segredo como bind
# mount direto do arquivo do host, preservando o dono e a permissao dele. Com
# 600, o processo do container (usuario "node", uid diferente do dono do
# arquivo na VM) toma EACCES ao ler /run/secrets/*. A pasta continua 700, entao
# so o dono do host consegue sequer entrar nela; o arquivo legivel por todos
# dentro dela nao expoe nada a mais.
chmod 644 "$segredos"/*
# As pastas de dados sao gravadas pelos containers, que rodam como uid 1000
# (usuario node), diferente do dono no host. Sem liberar escrita, o processo do
# container toma EACCES ao gravar (registro de workspaces, pecas, backups). A
# pasta runtime em volta continua 700, entao no host so o dono entra aqui, e so
# estes containers montam estas pastas.
chmod -R 777 "$raiz/dados" "$raiz/backups"
echo "Runtime preparado em $raiz. Segredos existentes foram preservados."
