#!/usr/bin/env bash
set -euo pipefail

echo "==> UFW: allow SSH, HTTP, HTTPS"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

echo ""
echo "==> Certbot requires a hostname (not a bare IP)."
echo "    1. Create a free subdomain (e.g. DuckDNS) → A record to this server's IP."
echo "    2. Add to .env:"
echo "         DOMAIN=your-subdomain.duckdns.org"
echo "         ACME_EMAIL=you@example.com"
echo "         CORS_ORIGINS=https://your-subdomain.duckdns.org"
echo "    3. Run: chmod +x deploy/init-letsencrypt.sh && ./deploy/init-letsencrypt.sh"
echo "    4. Open https://your-subdomain.duckdns.org/home"
