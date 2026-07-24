FROM google/cloud-sdk:slim
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client openssl cron && rm -rf /var/lib/apt/lists/*
COPY infra/backup/backup.sh /usr/local/bin/vkos-backup
COPY infra/backup/restaurar.sh /usr/local/bin/vkos-restaurar
COPY infra/backup/crontab /etc/cron.d/vkos-backup
RUN chmod 0555 /usr/local/bin/vkos-backup /usr/local/bin/vkos-restaurar && chmod 0644 /etc/cron.d/vkos-backup
CMD ["cron", "-f"]
