#!/usr/bin/env bash
# =============================================================================
# apply-nginx-config.sh
#
# Apply the in-repo `regatta.nginx.conf` to the running nginx on the VPS
# and reload nginx. Run this AFTER `git pull` on the VPS whenever
# regatta.nginx.conf changes (the regular `docker compose up -d` deploy
# only restarts the Next.js app container, NOT the front-of-house
# nginx).
#
# Usage on VPS (as a sudoer):
#   cd /path/to/regatta
#   git pull
#   sudo bash scripts/apply-nginx-config.sh
#
# The script auto-detects the nginx config path by looking in the usual
# locations. If none match, it asks the operator to set NGINX_CONF_PATH
# explicitly, e.g.:
#   sudo NGINX_CONF_PATH=/etc/nginx/sites-enabled/regatta bash scripts/apply-nginx-config.sh
# =============================================================================

set -euo pipefail

REPO_CONF="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/regatta.nginx.conf"
if [ ! -f "$REPO_CONF" ]; then
  echo "ERROR: $REPO_CONF not found - are you running from the regatta repo?"
  exit 1
fi

# Auto-detect nginx target path. Walk through likely candidates and pick
# the first one whose contents start with our signature line.
candidates=(
  "${NGINX_CONF_PATH:-}"
  "/etc/nginx/sites-enabled/regatta"
  "/etc/nginx/sites-enabled/regatta.conf"
  "/etc/nginx/sites-enabled/regatta.icoffio.com"
  "/etc/nginx/sites-enabled/regatta.icoffio.com.conf"
  "/etc/nginx/conf.d/regatta.conf"
  "/etc/nginx/conf.d/regatta.icoffio.com.conf"
)

target=""
for cand in "${candidates[@]}"; do
  [ -z "$cand" ] && continue
  if [ -f "$cand" ] && grep -q "regatta.icoffio.com" "$cand" 2>/dev/null; then
    target="$cand"
    break
  fi
done

if [ -z "$target" ]; then
  echo "Could not auto-detect nginx config path. Set NGINX_CONF_PATH explicitly:"
  echo "  sudo NGINX_CONF_PATH=/etc/nginx/.../regatta.conf bash $0"
  exit 1
fi

echo "Target nginx config: $target"
echo "Source (in repo):    $REPO_CONF"

# Diff before overwrite so the operator knows what's about to change.
if diff -u "$target" "$REPO_CONF" >/dev/null 2>&1; then
  echo "No diff - nothing to do."
  exit 0
fi
echo "--- diff (target -> repo) ---"
diff -u "$target" "$REPO_CONF" || true
echo "-----------------------------"

# Backup + copy + test + reload.
backup="$target.bak-$(date +%Y%m%d-%H%M%S)"
cp "$target" "$backup"
echo "Backed up to $backup"

cp "$REPO_CONF" "$target"
echo "Copied repo config -> $target"

if ! nginx -t; then
  echo "nginx -t failed - rolling back"
  cp "$backup" "$target"
  exit 1
fi
echo "nginx -t passed"

# Reload (works for both systemd and docker-managed nginx; falls back).
if systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl reload nginx
  echo "systemctl reload nginx done"
elif command -v nginx >/dev/null 2>&1; then
  nginx -s reload
  echo "nginx -s reload done"
else
  echo "Warning: could not reload nginx automatically. Reload manually."
fi

echo "Done. Verify with:"
echo "  curl -sI https://regatta.icoffio.com/ | grep -i content-security-policy"
