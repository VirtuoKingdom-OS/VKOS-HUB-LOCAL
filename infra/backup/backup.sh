#!/bin/sh
set -eu

umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
stage="$(mktemp -d /tmp/vkos-backup.XXXXXX)"
trap 'rm -rf "$stage"' EXIT

database_url="$(cat "$DATABASE_URL_FILE")"

pg_dump "$database_url" --format=custom --file="$stage/postgres.dump"
tar -C /dados -czf "$stage/dados.tar.gz" .
tar -C "$stage" -cf - postgres.dump dados.tar.gz |
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$BACKUP_KEY_FILE" -out="/backups/vkos-$stamp.tar.enc"

gcloud storage cp "/backups/vkos-$stamp.tar.enc" "gs://$GCS_BUCKET/vkos-$stamp.tar.enc"
find /backups -type f -name 'vkos-*.tar.enc' -mtime +7 -delete
