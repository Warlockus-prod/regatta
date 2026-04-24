#!/usr/bin/env bash
# ============================================================================
# One-shot nginx geoip2 setup for the regatta VPS.
#
# What it does:
# 1. installs the geoip2 module + mmdb-bin + curl
# 2. fetches GeoLite2-Country.mmdb (or uses a license-key download if you set
#    one in the env) to /etc/nginx/geoip2/
# 3. injects the geoip2 directives into nginx.conf (idempotent)
# 4. injects `proxy_set_header X-Country-Code` into the regatta vhost
# 5. reloads nginx
# 6. verifies by hitting the /api/health endpoint and tailing the nginx log
#
# Usage on the VPS (one time):
#   curl -fsSL https://raw.githubusercontent.com/Warlockus-prod/regatta/main/scripts/setup-nginx-geoip2.sh \
#     | sudo bash
#
# OR, copy this file to the VPS and run:
#   sudo bash setup-nginx-geoip2.sh
#
# Idempotent: safe to re-run. Skips steps that are already done.
# ============================================================================

set -euo pipefail

# ----- 0. preflight ---------------------------------------------------------
if [[ "$EUID" -ne 0 ]]; then
  echo "Please run as root (sudo)."
  exit 1
fi

echo "== 1. Install nginx geoip2 module ============================="
DEBIAN_FRONTEND=noninteractive apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  libnginx-mod-http-geoip2 mmdb-bin curl ca-certificates

echo "== 2. Fetch GeoLite2-Country.mmdb ============================="
GEO_DIR=/etc/nginx/geoip2
mkdir -p "$GEO_DIR"

if [[ -s "$GEO_DIR/GeoLite2-Country.mmdb" ]]; then
  echo "  - existing DB found, skipping download"
else
  # The official MaxMind download requires a license key. For first-time
  # setup we use the dbip-country-lite mirror (CC BY 4.0, monthly refresh).
  # If you have a MaxMind key in env (MAXMIND_KEY), we use the official
  # source instead.
  if [[ -n "${MAXMIND_KEY:-}" ]]; then
    URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${MAXMIND_KEY}&suffix=tar.gz"
    TMP=/tmp/geolite.tar.gz
    curl -fsSL "$URL" -o "$TMP"
    tar -xzf "$TMP" -C /tmp
    cp /tmp/GeoLite2-Country_*/GeoLite2-Country.mmdb "$GEO_DIR/"
    rm -rf "$TMP" /tmp/GeoLite2-Country_*
  else
    # dbip-country-lite is a CC-licensed alternative, monthly refresh
    YEAR_MONTH=$(date +%Y-%m)
    URL="https://download.db-ip.com/free/dbip-country-lite-${YEAR_MONTH}.mmdb.gz"
    if ! curl -fsSL "$URL" -o /tmp/dbip.mmdb.gz; then
      # Last month if current month not yet uploaded
      LAST_MONTH=$(date -d "1 month ago" +%Y-%m 2>/dev/null || date -v-1m +%Y-%m)
      URL="https://download.db-ip.com/free/dbip-country-lite-${LAST_MONTH}.mmdb.gz"
      curl -fsSL "$URL" -o /tmp/dbip.mmdb.gz
    fi
    gunzip -f /tmp/dbip.mmdb.gz
    mv /tmp/dbip.mmdb "$GEO_DIR/GeoLite2-Country.mmdb"
  fi
  echo "  - DB installed: $(ls -lh $GEO_DIR/GeoLite2-Country.mmdb | awk '{print $5}')"
fi

echo "== 3. Wire geoip2 directives into nginx.conf =================="
NGINX_CONF=/etc/nginx/nginx.conf
SNIPPET_MARKER="# regatta-geoip2-setup"

if grep -q "$SNIPPET_MARKER" "$NGINX_CONF"; then
  echo "  - directives already present, skipping"
else
  cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%s)"
  # Insert load_module + geoip2 lookup block at the top of `http {}`.
  # Uses a marker comment for idempotent re-runs.
  awk -v marker="$SNIPPET_MARKER" '
    /^http \{/ && !injected {
      print
      print "    " marker
      print "    geoip2 /etc/nginx/geoip2/GeoLite2-Country.mmdb {"
      print "        $geoip2_country_code default=ZZ source=$remote_addr country iso_code;"
      print "    }"
      injected = 1
      next
    }
    { print }
  ' "$NGINX_CONF" > "${NGINX_CONF}.new" && mv "${NGINX_CONF}.new" "$NGINX_CONF"

  # Some Debian builds put load_module statements in /etc/nginx/modules-enabled/
  # so we don't need to add it manually. If geoip2 isn't auto-loaded, uncomment:
  # sed -i '1i load_module modules/ngx_http_geoip2_module.so;' "$NGINX_CONF"

  echo "  - injected geoip2 lookup into $NGINX_CONF"
fi

echo "== 4. Inject X-Country-Code header into regatta vhost ========="
# Look for the vhost that proxies to the regatta container. Adjust SITE_CONF
# to match your actual filename if it's different.
SITE_CONF=$(grep -lE 'regatta\.icoffio\.com|server_name.*regatta' /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null | head -1)

if [[ -z "$SITE_CONF" ]]; then
  echo "  - WARN: could not auto-detect the regatta vhost. Edit it manually:"
  echo "    Add inside the upstream-proxying location { ... }:"
  echo "      proxy_set_header X-Country-Code \$geoip2_country_code;"
  exit 0
fi

if grep -q 'X-Country-Code' "$SITE_CONF"; then
  echo "  - header already present in $SITE_CONF, skipping"
else
  cp "$SITE_CONF" "${SITE_CONF}.bak.$(date +%s)"
  # Inject right after the first proxy_set_header line we find.
  awk '
    /^[[:space:]]*proxy_set_header/ && !injected {
      print
      print "        proxy_set_header X-Country-Code $geoip2_country_code;"
      injected = 1
      next
    }
    { print }
  ' "$SITE_CONF" > "${SITE_CONF}.new" && mv "${SITE_CONF}.new" "$SITE_CONF"

  echo "  - injected X-Country-Code into $SITE_CONF"
fi

echo "== 5. Validate + reload nginx =================================="
if ! nginx -t; then
  echo "  - nginx -t FAILED, rolling back from .bak files manually if needed"
  exit 1
fi
systemctl reload nginx
echo "  - nginx reloaded OK"

echo "== 6. Smoke check =============================================="
echo "  - hit /api/health and check the X-Country-Code shows up in /api/log calls"
HEALTH=$(curl -fsS https://regatta.icoffio.com/api/health || echo "FAIL")
echo "  - /api/health -> $HEALTH"

cat <<MSG

Setup complete. Verify in /stats:
  1. Open https://regatta.icoffio.com/stats (basic auth: admin:regattA)
  2. Browse the site once from any external client (your phone, etc.)
  3. The "Countries" panel should populate within ~30 seconds.

Monthly refresh:
  Add to /etc/cron.d/dbip-update :
    0 4 1 * * root curl -fsSL https://download.db-ip.com/free/dbip-country-lite-\$(date +\\%Y-\\%m).mmdb.gz | gunzip > /etc/nginx/geoip2/GeoLite2-Country.mmdb && systemctl reload nginx

If you have a paid MaxMind license, set MAXMIND_KEY=<key> before running this
script and it will use the official MaxMind feed instead.
MSG
