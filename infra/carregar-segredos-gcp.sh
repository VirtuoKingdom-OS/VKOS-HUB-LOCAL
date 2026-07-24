#!/bin/sh
set -eu

raiz="${1:-./runtime/secrets}"
mkdir -p "$raiz"
umask 077

gcloud secrets versions access latest --secret=cofre-master-key > "$raiz/cofre_master_key"
gcloud secrets versions access latest --secret=motor-internal-token > "$raiz/motor_internal_token"
gcloud secrets versions access latest --secret=backup-key > "$raiz/backup_key"
gcloud secrets versions access latest --secret=vertex-service-account > "$raiz/vertex_credentials.json"
gcloud secrets versions access latest --secret=backup-service-account > "$raiz/backup_credentials.json"

echo "Segredos do GCP carregados em $raiz"
