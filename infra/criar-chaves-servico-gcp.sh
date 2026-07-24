#!/bin/sh
set -eu

projeto="${GOOGLE_CLOUD_PROJECT:?Informe GOOGLE_CLOUD_PROJECT}"
raiz="${1:-./runtime/secrets}"
mkdir -p "$raiz"
umask 077

gcloud iam service-accounts keys create "$raiz/vertex_credentials.json" \
  --iam-account="vkos-v3-vertex@$projeto.iam.gserviceaccount.com"
gcloud iam service-accounts keys create "$raiz/backup_credentials.json" \
  --iam-account="vkos-v3-backup@$projeto.iam.gserviceaccount.com"

echo "Chaves distintas criadas em $raiz. Publique no Secret Manager e proteja a cópia local."
