#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Uso: restaurar.sh ARQUIVO_ENC PASTA_DESTINO" >&2
  exit 2
fi

arquivo="$1"
destino="$2"
case "$destino" in
  /tmp/vkos-restore-*) ;;
  *) echo "O destino precisa ser /tmp/vkos-restore-*" >&2; exit 2 ;;
esac

mkdir -p "$destino"
openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$BACKUP_KEY_FILE" -in "$arquivo" |
  tar -C "$destino" -xf -

test -s "$destino/postgres.dump"
test -s "$destino/dados.tar.gz"
echo "Backup decifrado e validado em $destino"
