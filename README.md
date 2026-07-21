# Regatta - Sailing Yacht Simulator

Interactive sailing education app. Learn points of sail, sail trim, racing strategy and sailing terminology in 7 languages: RU / EN / PL / ES / FR / DE / IT.

**Live:** https://weektoregatta.com

For the full feature inventory see [`FEATURES.md`](./FEATURES.md).

## Highlights

- **Two simulator tiers + a 3D boat view**, all over one shared VPP-style
  physics engine: Basics (`/simulator`, wind + turns + angle to wind),
  the Trainer (`/simulator-v3`, live physics + trim + drills), and the 3D
  boat view (`/simulator2`, R3F + GLB). The `V1/V2/V3` names are internal
  route codenames only - see `docs/design/SIMULATORS.md` for the model.
- **Physics engine** in `src/lib/sailing-physics/` - 8-step force-
  balance tick; `npm run test:physics` = 31 tests green (see `DECISIONS.md`
  ADR-0001).
- **Race game** with AI opponents on 3 difficulty levels, Claude
  Haiku coach on finish.
- **Multiplayer** - WebSocket rooms, 2-8 players, 20 Hz authoritative
  server.
- **Replay viewer** - scrubbable timeline for any finished race.
- **Learning content** - points of sail, racing tactics, rules of the
  road (21 RRS + COLREGS scenarios with language-specific external
  sources: fps30.ru / ВФПС for RU, IMO / USCG / World Sailing / US
  Sailing for EN, PZŻ / PYA for PL, RFEV for ES, FFVoile for FR, DSV
  for DE, Federvela for IT), boat anatomy (17 hotspots), checklist,
  glossary (64 terms), bootcamp (8 lessons), quick refresh (6 topics),
  onboard first-week reference (8 sections).
- **i18n**: 7 languages (RU / EN / PL / ES / FR / DE / IT) across every
  user-facing route. Lang detection at edge (proxy.ts + Accept-Language
  cookie), SSR-rendered in the right language (no first-paint flash),
  client override persists via localStorage. Post-hydration Cyrillic
  scan confirms 0 leaks on all content routes. AI coach + local fallback
  both respect the lang.
- **Leaderboard + daily challenge** - top times per bucket, one
  mission per UTC day.
- **Admin `/stats`** - auth-gated dashboard for users, sessions,
  events, feedback. Tracks country (via nginx geoip2 / Cloudflare),
  device model (via ua-parser-js), UTM acquisition source, time-on-page,
  scroll depth, plus the usual device/browser/OS/viewport breakdowns.
  Custom events: `race.finish`, `coach.requested`, `page.engaged`.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4, dark-ocean theme via CSS vars
- HTML5 Canvas (Basics simulator `/simulator`, game)
- Three.js + @react-three/fiber + drei (3D boat view `/simulator2`)
- SVG (Trainer `/simulator-v3`, static diagrams)
- SQLite via better-sqlite3 (`/data/regatta-stats.db` on VPS)
- Separate WebSocket server at `:4502` (multiplayer)
- Claude Haiku 4.5 via `@anthropic-ai/sdk` (coach + AI chat)
- Standalone Next build, Docker Compose on VPS, GitHub Actions CI/CD

## Develop

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Production build

```bash
npm run build
npm start
```

## Docker

```bash
docker compose up -d --build
# → http://localhost:4500 (bound to docker bridge 172.17.0.1)
```

## Deployment

Deployed on the shared `icoffio.com` VPS via Docker Compose + nginx reverse proxy. CI/CD: `.github/workflows/deploy.yml` (push to main triggers build + SSH deploy + Playwright smoke on prod).
