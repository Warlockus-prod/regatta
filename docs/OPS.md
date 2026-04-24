# Ops runbook for regatta.icoffio.com

Production VPS: `178.104.223.93`. nginx + Docker Compose front; Next.js
standalone build inside the `regatta` container; SQLite on a host
volume.

This file collects the repeatable manual setup that lives outside the
repo: nginx snippets, Docker volume hygiene, secret rotation, etc.
Update it whenever an ops change is needed so the steps don't get
forgotten between regattas.

---

## Country tracking via nginx geoip2

`/api/log` (see `src/app/api/log/route.ts`) reads the country from any
of these request headers, in order:

1. `cf-ipcountry` - Cloudflare front
2. `x-vercel-ip-country` - Vercel deploys
3. `x-country-code` - generic, set by nginx geoip2 below

If none is present, `events.country` stores NULL and the /stats UI
shows an "EmptyHint" panel until you wire one up. Without country data
the rest of the analytics still work.

### Setup (one-time on the VPS)

**Fast path** (recommended): run the bundled script. It is idempotent
and uses the dbip-country-lite mirror so no MaxMind license is needed:
```
ssh root@178.104.223.93
curl -fsSL https://raw.githubusercontent.com/Warlockus-prod/regatta/main/scripts/setup-nginx-geoip2.sh | sudo bash
```

The script:
1. Installs `libnginx-mod-http-geoip2` + `mmdb-bin`
2. Downloads `GeoLite2-Country.mmdb` (or fetches from MaxMind if you set
   `MAXMIND_KEY` in env first)
3. Injects geoip2 directives into `/etc/nginx/nginx.conf` (idempotent)
4. Adds `proxy_set_header X-Country-Code $geoip2_country_code;` into
   the regatta vhost
5. `nginx -t && systemctl reload nginx`
6. Smoke-checks `/api/health`

**Manual path** if you'd rather verify each step:

1. `sudo apt-get install -y libnginx-mod-http-geoip2 mmdb-bin`
2. Drop `GeoLite2-Country.mmdb` (MaxMind sign-up free, or use dbip-lite
   from `https://download.db-ip.com/free/`) into `/etc/nginx/geoip2/`.
3. In `/etc/nginx/nginx.conf` `http { ... }`:
   ```nginx
   geoip2 /etc/nginx/geoip2/GeoLite2-Country.mmdb {
       $geoip2_country_code default=ZZ source=$remote_addr country iso_code;
   }
   ```
4. In the regatta vhost (probably under `/etc/nginx/sites-enabled/`):
   ```nginx
   proxy_set_header X-Country-Code $geoip2_country_code;
   ```
5. `sudo nginx -t && sudo systemctl reload nginx`. Hit the site once,
   then look at `/stats` - the Countries panel should populate within
   the next page-view.

Monthly DB refresh cron (dbip-lite tracks the same iso2 codes):
```
0 4 1 * * root curl -fsSL https://download.db-ip.com/free/dbip-country-lite-$(date +%Y-%m).mmdb.gz | gunzip > /etc/nginx/geoip2/GeoLite2-Country.mmdb && systemctl reload nginx
```

---

## Stats dashboard auth

`/stats` and `/api/admin/*` are gated by Basic Auth. Credentials live
in the VPS `.env` file (NOT in the repo) - format:
```
ADMIN_USER=admin
ADMIN_PASS=<password>
```

Default for the regatta sandbox: `admin:regattA`. Rotate before
sharing the URL with anyone outside the trusted set.

---

## SQLite volume

`docker-compose.yml` mounts `/srv/regatta/data` from the host into
`/data` inside the container. The DB file lives at
`/data/regatta-stats.db`. Backups:
```
sudo cp /srv/regatta/data/regatta-stats.db /srv/regatta/backups/regatta-stats-$(date +%F).db
```

DB schema migrates progressively on container boot via `safeAlter()`
in `src/lib/db.ts`. No manual migration is normally needed; if a
column add fails, check the boot log via
`docker compose logs regatta | head -50`.

---

## Deployment

`git push origin main` triggers GitHub Actions (`.github/workflows/`),
which SSHes into the VPS and runs:
```
cd /srv/regatta && git pull && docker compose up -d --build regatta
```

Production smoke checks after a deploy:
```
curl -I https://regatta.icoffio.com/
curl https://regatta.icoffio.com/api/health
SCAN_BASE=https://regatta.icoffio.com node scripts/cyrillic-scan.mjs
```

Expect:
- `HTTP 200` from the index
- `{"ok":true,...}` from `/api/health`
- "ALL CLEAN - 0 leaks" except for `/simulator-v3` until V3 lane
  finishes that component (see `docs/I18N_AUDIT.md`).

---

## See also

- `docs/I18N_AUDIT.md` - i18n status across routes + langs
- `CLAUDE.md` - lane coordination rules for parallel chats
- `README.md` - product overview
