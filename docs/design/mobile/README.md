# Mobile app design

Status: **design phase** (2026-04-22).

## What lives here

- `README.md` (this file): high-level overview + links
- `DECISIONS.md`: ADR-style entries for stack choice, architecture,
  data sharing, API contracts
- `ROADMAP.md`: living execution plan (phases, milestones, exit criteria, risks)
- `SPEC.md`: feature spec when the design firms up
- `API_CONTRACT.md`: contract with the existing web API (`/api/*`)
  so web and mobile can evolve together

## Coordination with other lanes

This repo has 4 parallel lanes (see `/CLAUDE.md` section
"Parallel-chat coordination"). The **Mobile lane** owns design docs
in this folder and the future `mobile/**` directory (per ADR-0002).
It does NOT edit web code, simulator V1/V2/V3, i18n plumbing, or
nginx/docker setup.

When a mobile decision would duplicate or diverge from a web asset
(content in `src/data/*`, physics in `src/lib/sailing-physics/*`, i18n
strings), log it as an ADR in `DECISIONS.md` and coordinate with the
Shared lane before duplicating. Goal: one source of truth per asset,
extracted into a shared package if both platforms need it.

## Shared assets (read-only from Mobile lane)

| Asset | Path in this repo | Notes |
|---|---|---|
| Content | `src/data/*` | bootcamp, rules, onboard, anatomy, sailing-data, missions, gallery |
| Physics | `src/lib/sailing-physics/*` | VPP engine, 16 tests, proven |
| i18n helpers | `tl()` / `tp()` / `legacyPick()` from `src/lib/i18n.tsx`; data rows are `LegacyLocalized<'field'>` with `*Ru/*En/*Pl` required + `*Es/*Fr/*De/*It` optional. Bulk translation via `scripts/translate-data-flat.mjs`. | 7-language: RU / EN / PL / ES / FR / DE / IT. Extraction plan in ADR-0003. |
| API endpoints | `src/app/api/*` routes on `regatta.icoffio.com/api/*` | mobile uses the same backend, no separate server |

## Decided

- **Stack**: React Native + Expo, managed workflow (ADR-0001).
- **Repo layout**: monorepo with `mobile/` subdirectory (ADR-0002).
- **v1 scope**: full parity with web - all user-facing routes, simulator (using simulator-v3 as reference), multiplayer, AI coach, leaderboard, replays. Admin `/stats` stays web-only (ADR-0005).

## Proposed, awaiting review

- **Shared-package extraction plan** (ADR-0003): npm workspaces, `@regatta/content` and `@regatta/physics`, bridging sync script. Acceptance + execution requires Shared-lane buy-in.
- **Offline strategy** (ADR-0004): per-screen 3-tier matrix, sync queue, EAS Update for content. Mobile-lane policy; Shared-lane input on cloud-sync details (Phase 3).

## Not-yet-decided

- Auth / accounts: Sign in with Apple as candidate (ADR-0006).

These go into `DECISIONS.md` as they get decided.
