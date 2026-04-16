# Known Problems & Tracking

Running log of known issues, quirks and backlog items. Update this file when:
- finding a bug in production (add to "Active")
- fixing something (move to "Resolved" with date)
- identifying a future improvement (add to "Backlog")

Logs to check for clues:
- Production server: `ssh root@46.225.11.249 'docker logs --tail 500 regatta'`
- Local dev: console output of `npm run dev`
- Client errors and page views: look for `"evt":"client.*"` lines in the docker logs

---

## Active

_(none currently — fill in when issues discovered)_

---

## Backlog

### High priority (user value)
- [ ] **Mini-map** of the whole course in game overlay (bottom-right corner) — see `AUDIT.md` §5.1
- [ ] **Wind shifts** — rotate wind direction by ±5–15° every 30–60 sec for tactical depth
- [ ] **Autopilot (AUTO button)** — hold current heading until player intervenes, essential for mobile one-hand play
- [ ] **Custom favicon + OG image** — currently using default Next.js favicon

### Medium
- [ ] **Gusts & lulls** — visual wind patches on water affecting speed ±20%
- [ ] **Ghost replay** — overlay ideal path vs player path after finish
- [ ] **VMG hint** — arrow saying "sail higher" / "sail lower" for optimal upwind VMG
- [ ] **Mark rounding penalties** — 360° turn penalty for touching a mark
- [ ] **More courses** — triangle course, slalom, reach-only

### Low
- [ ] **Wind strength slider** — 3 kts (light) to 20 kts (heavy) before race
- [ ] **Save race history to localStorage** — no account needed, just track PBs per difficulty
- [ ] **Accessibility** — keyboard focus outlines are currently subtle; also add aria-live for position changes
- [ ] **i18n switcher** — offer English-primary view (now RU primary, EN secondary)

### Infrastructure / Tech debt
- [ ] Add volume mount for `regatta.nginx.conf` to shared `nginx_server` compose so config survives container recreation. Currently via `docker cp` → lost on nginx_server rebuild.
- [ ] Automate deploy — GitHub Actions runner SSHs to VPS and does `git pull && docker compose up -d --build`. Right now deploy is manual.
- [ ] Add a CI workflow to at least run `npm run build` + `tsc --noEmit` on every push.
- [ ] Move hardcoded `ANTHROPIC_API_KEY` from `.env.local` — user must rotate the key that leaked in chat.

---

## Resolved

| Date | Problem | Fix |
|---|---|---|
| 2026-04-16 | `JSX.Element` namespace not found in TS strict mode (courses page) | Replaced with `React.ReactElement` |
| 2026-04-16 | `ringColor` not a valid CSS property on React `style` prop | Replaced with `outlineColor` |
| 2026-04-16 | Hydration mismatch on courses page SVG — float precision between server and client for `Math.sin`/`cos` results | Round polar→cartesian outputs to 2 decimal places |
| 2026-04-16 | Rotated course labels unreadable (upside-down on bottom half of diagram) | Render non-rotated horizontal labels mirrored on both port/starboard sides; expand viewBox 520→600 to fit |
| 2026-04-16 | Overlapping leeward gate labels on racing page | Added `labelPos: 'left'\|'right'\|'below'\|'above'` prop to `BuoyMark` + shared "Leeward Gate" subtitle |
| 2026-04-16 | `public/` dir empty → Docker build fails on `COPY public` | Added `public/.gitkeep` |
| 2026-04-16 | Turbopack walked up to `/Users/Andrey/package.json` (unrelated RN project) and failed to resolve tailwindcss | Pinned `outputFileTracingRoot` + `turbopack.root` in `next.config.ts` |
| 2026-04-16 | VPS git pull didn't include latest commits after deploy script had already staged them | Explicit `git fetch --all && git reset --hard origin/main` in deploy flow |
| 2026-04-16 | Screenshot PNGs accidentally committed | `git rm --cached *.png` + expanded `.gitignore` |

---

## Observed patterns (learning for next time)

1. **Always `.gitkeep` empty folders** you need in the Docker build.
2. **Always `git rev-parse --show-toplevel`** before `git init` — there may already be a parent repo.
3. **SVG coords from trig functions need rounding** to avoid hydration mismatches.
4. **Nginx config changes on shared server** — use `docker cp` + `docker exec nginx -s reload`, never restart.
5. **Let's Encrypt cert files renew but don't auto-copy** to shared cert dirs — always set up a deploy-hook.
6. **Next.js `output: "standalone"`** needs `outputFileTracingRoot` explicitly pinned in monorepo-adjacent setups.
