# Technical Architecture

A concise overview of how the Regatta web app is built and shipped.

## Web stack

- **Next.js 16** with the **Turbopack** bundler (App Router, React Server Components).
  Most pages live under `src/app/*`. Client-only components start with `'use client';`.
- TypeScript in strict mode. Run `npx tsc --noEmit` before every commit and
  `npm run build` before every push (the production build is stricter than dev).

## Analytics

- Custom server-side analytics on **SQLite**. All event writes go through
  `insertEvent()` in `src/lib/db.ts`. The `/api/log` endpoint ingests client
  events (truncating IPs and persisting only an allow-listed `meta` subset),
  and the `/stats` dashboard reads aggregates back out.
- GA4 (`G-ZEWWJ4N31M`) runs alongside via `src/components/GoogleAnalytics.tsx`.

## Sailing physics

- The VPP (velocity-prediction) engine lives in `src/lib/sailing-physics/*` and
  is shared by all simulators - the Basics/Trainer tiers and the 3D boat view
  (internal route codenames V1/V2/V3; see `docs/design/SIMULATORS.md`). Physics
  tests: `npm run test:physics` (31 green).

## Internationalization

- 7-language app: RU / EN / PL / ES / FR / DE / IT, with RU as the source.
- Plumbing is in `src/lib/i18n.tsx` (`tp(ru, en, pl, { es, fr, de, it })`),
  `src/proxy.ts` (writes the `regatta_lang` cookie), and `src/app/layout.tsx`
  (reads it for `<html lang>` and metadata). Coverage status: `docs/I18N_AUDIT.md`.

## Live weather

- **Open-Meteo** is the weather provider (no API key). The `/api/weather`
  endpoint (`src/app/api/weather/route.ts`) proxies and normalizes wind, wave,
  and current data, converts to knots, rounds, and caps an in-memory cache.

## Deploy

- Pushing to `main` triggers **GitHub Actions** -> SSH to the **VPS** ->
  `docker compose up -d --build regatta` -> served via **nginx** on
  `weektoregatta.com`.
- nginx itself is a separate container at `/opt/repos/nginx_server` and its
  config is applied manually (not part of the app's CI).

## Branch model

- `main` = web app + infrastructure.
- `app` = `main` plus the mobile app work (`mobile/`).
