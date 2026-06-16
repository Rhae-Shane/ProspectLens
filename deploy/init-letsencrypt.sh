#!/usr/bin/env bash
# Obtain Let's Encrypt certificates via Certbot (webroot + nginx).
# Requires DOMAIN in .env — a hostname with DNS A record → this server's public IP.
# Let's Encrypt cannot issue certificates for bare IP addresses.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
CONF_DIR="deploy/certbot/conf"

read_env() {
  if [[ ! -f .env ]]; then
    echo "ERROR: .env not found"
    exit 1
  fi
  DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d '=' -f2- | tr -d '\r' | xargs)"
  ACME_EMAIL="$(grep -E '^ACME_EMAIL=' .env | cut -d '=' -f2- | tr -d '\r' | xargs)"
  if [[ -z "$DOMAIN" || -z "$ACME_EMAIL" ]]; then
    echo "ERROR: Set DOMAIN and ACME_EMAIL in .env"
    echo "  Use a hostname (e.g. free DuckDNS subdomain) pointing to your droplet IP."
    exit 1
  fi
}

ensure_tls_params() {
  mkdir -p "$CONF_DIR"
  if [[ ! -f "$CONF_DIR/options-ssl-nginx.conf" ]]; then
    curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
      -o "$CONF_DIR/options-ssl-nginx.conf"
  fi
  if [[ ! -f "$CONF_DIR/ssl-dhparams.pem" ]]; then
    curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
      -o "$CONF_DIR/ssl-dhparams.pem"
  fi
  $COMPOSE run --rm \
    -v "${ROOT_DIR}/${CONF_DIR}:/staging:ro" \
    --entrypoint sh certbot -c \
    "cp /staging/options-ssl-nginx.conf /staging/ssl-dhparams.pem /etc/letsencrypt/"
}

write_http_config() {
  cat > deploy/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
    }
}
EOF
}

write_https_config() {
  cat > deploy/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
    }
}
EOF
}

read_env
echo "==> Domain: ${DOMAIN}"
echo "==> Email:  ${ACME_EMAIL}"

ensure_tls_params
write_http_config

echo "==> Starting stack (HTTP) for ACME challenge..."
$COMPOSE up -d

echo "==> Requesting certificate (Certbot / Let's Encrypt)..."
$COMPOSE run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "${ACME_EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}"

ensure_tls_params
write_https_config

echo "==> Enabling HTTPS..."
$COMPOSE up -d
$COMPOSE exec nginx nginx -s reload

echo ""
echo "==> Done. Open https://${DOMAIN}/home"
echo "    Health: curl -sf https://${DOMAIN}/health"
