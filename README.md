# Regatta - Sailing Yacht Simulator

Interactive sailing education app. Learn points of sail, sail trim, racing strategy and sailing terminology in 7 languages: RU / EN / PL / ES / FR / DE / IT.

**Live:** https://regatta.icoffio.com

For the full feature inventory see [`FEATURES.md`](./FEATURES.md).

## Highlights

- **Three simulator versions** over a shared VPP-style physics engine:
  V1 canvas (drag + keyboard), V2 Three.js (immersive 3D), V3 SVG
  cockpit (teaching panel with pods + diagnostics).
- **Physics engine** in `src/lib/sailing-physics/` - 8-step force-
  balance tick, 8/8 verification tests green (see `DECISIONS.md`
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
  glossary (52 terms), bootcamp (8 lessons), quick refresh (6 topics),
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
  events, feedback.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4, dark-ocean theme via CSS vars
- HTML5 Canvas (V1 simulator, game)
- Three.js + @react-three/fiber + drei (V2 simulator)
- SVG (V3 simulator, static diagrams)
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
