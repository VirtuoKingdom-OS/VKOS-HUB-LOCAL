#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute como root na VM." >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fail2ban unattended-upgrades ufw ca-certificates curl iptables-persistent

sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now fail2ban
# Containers não herdam a identidade poderosa da VM pelo metadata server.
iptables -N DOCKER-USER 2>/dev/null || true
iptables -C DOCKER-USER -d 169.254.169.254 -j REJECT 2>/dev/null || iptables -I DOCKER-USER -d 169.254.169.254 -j REJECT
netfilter-persistent save
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl reload ssh
