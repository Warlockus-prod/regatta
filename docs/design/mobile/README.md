# Mobile app design

Status: **design phase** (2026-04-22).

## What lives here

- `README.md` (this file): high-level overview + links
- `DECISIONS.md`: ADR-style entries for stack choice, architecture,
  data sharing, API contracts
- `SPEC.md`: feature spec when the design firms up
- `API_CONTRACT.md`: contract with the existing web API (`/api/*`)
  so web and mobile can evolve together

## Coordination with other chats

This repo has 4 parallel chats (see `/CLAUDE.md` section
"Parallel-chat coordination"). The **mobile chat** owns design docs
in this folder and any future `mobile/**` directory (or a separate
repo linked from here). It does NOT edit web code, simulator V1/V2/V3,
i18n plumbing, or nginx/docker setup.

When a mobile decision would duplicate or diverge from a web asset
(content in `src/data/*`, physics in `src/lib/sailing-physics/*`, i18n
strings), log it as an ADR in `DECISIONS.md` and coordinate with the
shared chat before duplicating. Goal: one source of truth per asset,
extracted into a shared package if both platforms need it.

## Shared assets (read-only from mobile chat)

| Asset | Path in this repo | Notes |
|---|---|---|
| Content | `src/data/*` | bootcamp, rules, onboard, anatomy, sailing-data, missions, gallery |
| Physics | `src/lib/sailing-physics/*` | VPP engine, 16 tests, proven |
| i18n strings | `tp(ru, en, pl)` call sites + data `*Ru`/`*En`/`*Pl` fields | no lockfile today; extraction plan in ADR-0001 when needed |
| API endpoints | `src/app/api/*` routes on `regatta.icoffio.com/api/*` | mobile uses the same backend, no separate server |

## Not-yet-decided

- React Native vs Capacitor vs Flutter vs native
- Single-repo (monorepo) vs separate repo
- Auth / offline strategy
- Feature scope for v1 (full parity with web? subset?)

These go into `DECISIONS.md` as they get decided.
