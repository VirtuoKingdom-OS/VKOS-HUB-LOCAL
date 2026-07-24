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
chmod 600 "$segredos"/*
echo "Runtime preparado em $raiz. Segredos existentes foram preservados."
