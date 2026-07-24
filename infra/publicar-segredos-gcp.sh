#!/bin/sh
set -eu

raiz="${1:-./runtime/secrets}"

for par in \
  "cofre-master-key:cofre_master_key" \
  "motor-internal-token:motor_internal_token" \
  "backup-key:backup_key" \
  "vertex-service-account:vertex_credentials.json" \
  "backup-service-account:backup_credentials.json"
do
  segredo="${par%%:*}"
  arquivo="${par#*:}"
  test -s "$raiz/$arquivo"
  gcloud secrets versions add "$segredo" --data-file="$raiz/$arquivo"
done

echo "Novas versoes publicadas no Secret Manager."
