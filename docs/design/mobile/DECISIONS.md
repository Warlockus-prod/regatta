# Mobile app decisions log (ADRs)

Status: populated as choices get made.

Each entry: short context + decision + consequences. Newest on top.

---

## ADR-0006: App Store submission readiness (2026-05-24)

**Status:** accepted

**Context.** Sync pass merged the web curriculum reorder + content fixes into
the mobile bundle and audited App Store readiness for v0.13.0 / build 13.

**Decision / state.**
- Config hardened: app.json gains `ios.infoPlist.ITSAppUsesNonExemptEncryption=false`
  (removes the recurring "Missing Compliance" gate); eas.json `submit.production.ios`
  now carries ascAppId 6768134329 + appleTeamId 547PA2PLLB so production submits do
  not prompt interactively.
- Content: JSON twins regenerated from web `src/data`; lesson order is now
  wind -> points -> how-sail-works -> tacking -> jibing -> vmg -> rules -> race;
  LESSON_TO_DAY realigned (how-sail-works Day 3, tacking+jibing paired Day 4).
- Verified: mobile tsc clean, sync-content:check parity, jest 102 passing.

**Remaining blockers (human, needs Mac + Xcode).**
1. Screenshots: 0 in repo. Run `scripts/asc-screenshots.mjs` on a Mac (minimum the
   EN 6.7" set), then upload per-locale in ASC.
2. App icon has an alpha channel - re-export `assets/icon.png` as flat RGB (no
   transparency) or Apple rejects the binary.
3. In ASC: select build 13, answer export-compliance (No), confirm privacy/age/pricing,
   then Submit for Review (see DO_THIS_NOW.md).

**Consequences.** Privacy policy is hosted live (weektoregatta.com/privacy returns
200). Once screenshots + an alpha-free icon land, the app is submit-ready.

---

## ADR-0004: Offline strategy - per-screen tier matrix

**Date:** 2026-04-22
**Status:** accepted

**Context.** ADR-0005 commits to full parity with web. Some web features depend on the network (multiplayer, AI coach, leaderboard submit, replay upload, daily challenges, auth, cloud sync); most do not (content, solo simulator, local replays, settings). Mobile needs an explicit per-screen contract for which screens are offline-first, which are network-only, and how each degrades when the network fails. The "premium UX" target rules out silent failures and blocking spinners.

**Decision.** Three tiers per screen:

- **Tier 1: Offline-only.** No network reads at all; works on a plane. Home, Bootcamp, Quick, Rules, Anatomy, Onboard, Glossary, Courses, Racing, Gallery, Settings, Solo simulator, Local replay viewer.
- **Tier 2: Network read with cached fallback.** First load needs network; subsequent loads serve from a stale-while-revalidate cache. Leaderboard, Daily challenges banner, Shared replay viewer, Cloud profile snapshot.
- **Tier 3: Network-only.** No reasonable cache; show retry UI on failure. Sign in with Apple, email magic-link, AI coach response, Multiplayer lobby + race, Replay upload, Cloud sync push.

**Storage tiers.**

| Tier | Tech | What it holds |
|---|---|---|
| Key-value | `@react-native-async-storage/async-storage` | Settings, language, lightweight progress markers |
| Secrets | `expo-secure-store` (Phase 3) | Auth tokens, refresh tokens |
| Structured | `expo-sqlite` (Phase 2+) | Replays, lesson completion history, queued sync operations |
| Bundled | App bundle JSON | All content from `src/data/*` (Phase 1 sync per ADR-0003) |

**Sync policy.**

- Queue all user-originated writes (race results, lesson progress, feedback) to SQLite when offline. Background flush when network returns. Server endpoints must be idempotent on a client-side `sync_id` (Shared-lane work in Phase 3).
- Server-side state (leaderboard rows, daily challenges) refreshes on screen focus when online; serves last successful response when offline.
- Conflict resolution: server wins for shared state; local wins for user-private state (replays, drafts).

**Degradation UI.**

- Tier 2 and Tier 3 screens render an inline offline banner with a retry CTA when network fails. Cached content remains visible if available.
- Never silently fail. Never block a Tier 1 screen for any reason.
- Cloud sync banners are non-blocking: a "Will sync when back online" toast, no modal.

**Bundle update policy.**

- App-bundled content updates ship through EAS Update (OTA). New content arrives without an App Store review for content-only changes.
- Code changes go through normal EAS Build + App Store review.
- A `minClientVersion` flag on the server lets Phase 5 force-update very old clients.

**Alternatives considered.**

- **Aggressive prefetch on first launch.** Rejected as default. Adds startup time and bandwidth without proven need. Revisit during Phase 3 once we have telemetry on AI-coach response times.
- **Drop offline support for Tier 1 to simplify.** Rejected. Premium UX includes airplane-mode education; the content set is small enough to bundle.
- **Local-first replication library** (PouchDB, RxDB). Rejected as overkill for v1; manual queue + SQLite is simpler and sufficient. Revisit only if Phase 3 reveals hard sync edge cases.

**Consequences.**

- Sync queue (`mobile/src/persistence/sync-queue.ts`) is built in Phase 2 as low-traffic infra, used in Phase 3 with real writes.
- Cache layer for Tier 2 reads is `@tanstack/react-query` (added in Phase 3) with a long `cacheTime` and stale-revalidation on screen focus.
- Each Phase 3 / Phase 4 screen explicitly declares its tier in code (lint rule or convention) to prevent drift.
- Telemetry includes connectivity state on submit so Phase 5 can detect "tried while offline" patterns.
- ADR-0006 (auth) inherits the Tier 3 contract for sign-in flows: never cache an auth attempt.

**Next ADRs.** ADR-0006 builds on the Tier 3 contract.

---

## ADR-0003: Shared-package extraction plan

**Date:** 2026-04-22
**Status:** accepted (Mobile-lane sign-off); execution pending in Shared lane

**Context.** ADR-0001 (RN+Expo) and ADR-0005 (full parity with web) commit mobile to consuming the same content (`src/data/*`) and physics (`src/lib/sailing-physics/*`) the web client uses. The "one source of truth per asset" rule from CLAUDE.md forbids parallel copies that drift. Per CLAUDE.md, any data/physics/i18n duplication triggers Shared-lane planning to extract assets into shared packages.

ADR-0002 chose a monorepo. This ADR specifies *what* gets extracted, *when*, and *how* the bridging period works while extraction runs in the Shared lane.

**Decision.** Use npm workspaces in the repo root. Two new packages:

- **`@regatta/content`** at `packages/content/` - all data files from `src/data/*` plus the localization types from `src/lib/languages.ts` (`Lang`, `LocalizedText`, `LegacyLocalized<>`).
- **`@regatta/physics`** at `packages/physics/` - the entire `src/lib/sailing-physics/*` module plus its tests and golden fixtures.

A bridging period before extraction: a sync script (`mobile/scripts/sync-content.mjs`) reads `src/data/*.ts` at build time and writes JSON twins into `mobile/src/data/`. CI guard fails the build if the mobile JSON is stale relative to web TS. This unblocks Phase 1 mobile work without waiting for Shared-lane workspace setup.

**Sequencing.**

1. **Phase 1 mid (Mobile lane).** Write the sync script in `mobile/scripts/sync-content.mjs`. CI guard added to mobile CI. JSON twins live in `mobile/src/data/` until extraction lands. Mobile lane owns this work entirely.
2. **Phase 1 end (Shared lane).** Set up npm workspaces. Move `src/data/*` -> `packages/content/src/`. Update web imports. Delete the sync script and JSON twins. Mobile imports switch to `@regatta/content`.
3. **Phase 2 start (Shared lane).** Move `src/lib/sailing-physics/*` -> `packages/physics/src/`. Mobile imports `@regatta/physics`. Both clients run the same physics tests in CI.

**Alternatives considered.**

- **Direct relative imports** (`import bootcamp from '../../src/data/bootcamp'`). Rejected: Metro bundler scopes, lane-boundary violations, refactor friction.
- **Indefinite parallel copies, no extraction.** Rejected: violates "one source of truth per asset". Drift is inevitable across 7 languages and 7 data files.
- **Symlinks** in `mobile/src/data/` pointing at `src/data/`. Rejected: brittle, do not survive `npm install` cleanly, weird IDE behavior.
- **Git submodule for content.** Rejected: heavyweight, no clear gain over workspaces.
- **Publish to a private npm registry instead of workspaces.** Rejected: release friction works against the goal of this ADR (synchronous updates between clients).

**Consequences.**

- **Web (Shared-lane work).** Import paths change. Codemod-friendly. `tsconfig.json` `paths` may need updating. `scripts/translate-data-flat.mjs` and `scripts/cyrillic-scan.mjs` get path updates so they still find content.
- **Mobile.** Imports become `@regatta/content/bootcamp`, `@regatta/physics`. The local `mobile/src/data/` JSON twins get deleted at extraction time. `mobile/src/i18n/languages.ts` shrinks to a thin re-export from `@regatta/content/types` (or a future `@regatta/types`).
- **Repo root.** `package.json` adds `"workspaces": ["mobile", "packages/*"]`. `npm install` at root installs all packages. Expo Metro bundler may need a `metro.config.js` `watchFolders` tweak for the standard Expo monorepo recipe.
- **CI (Shared-lane work).** `paths:` filters update to include `packages/**` for both web and mobile workflow triggers.
- **Bridging-period CI guard.** `mobile/scripts/sync-content.mjs --check` runs in mobile CI; fails if JSON checksums mismatch. Self-removes once extraction lands.
- **Coordination required.** Drafted by Mobile lane. Acceptance and execution require Shared-lane buy-in since the Mobile lane will not move web's source files. Mobile drafts; Shared reviews and executes the workspace moves.

**Next ADRs.** Hard prerequisite for ADR-0004's bundle policy (Tier 1 content ships bundled) and for Phase 2 physics integration on mobile.

---

## ADR-0005: v1 feature scope - full parity with web

**Date:** 2026-04-22
**Status:** accepted

**Context.** ADR-0001 (RN+Expo) and ADR-0002 (monorepo) settle the stack and layout. v1 scope drives scaffolding choices, dependencies, App Review timing, and the order of remaining ADRs (0003 shared-package extraction, 0004 offline strategy, 0006 auth).

The web today has roughly 18 user-facing routes (Home, Bootcamp, QuickRefresh, Rules, Anatomy, Onboard, Glossary, Courses, Racing, Simulator V1/V2/V3, Game, Multiplayer, Leaderboard, Replay, Gallery), plus the admin `/stats` route, plus `ws-server` (20 Hz multiplayer up to 10 players), AI coach via Anthropic, SQLite leaderboard, and replay storage. Content is already maintained in 7 languages.

**Decision.** v1 ships **full parity with web**. Mobile covers all user-facing routes, the simulator (using `simulator-v3` as the behavioral reference since it is the latest and most polished), multiplayer, AI coach, leaderboard, and replays. The admin `/stats` route stays web-only.

**Alternatives considered.**

- **Content-only v1.** Ship reference screens, defer simulator and online features. Rejected: drops the differentiating value of the simulator and ships a generic "educational reference" app.
- **Content + solo simulator v1.** Ship content + 2D Skia simulator + missions + local replay; defer multiplayer / AI coach / leaderboard to v1.1. Rejected per user choice (full parity preferred). Kept as the natural intermediate milestone if the timeline slips.
- **Just simulator.** Rejected: too narrow, leaves educational content unused on mobile.

**Consequences.**

- **Timeline.** 8-12 months for one developer with AI assistance. App Review for the first submission can take 1-2 weeks; the AI-coach feature gets reviewed more carefully because of LLM-driven content.
- **Internal milestone order.** Each stage stays shippable as a fallback, so we can descope to "B" or "B + leaderboard read-only" without rework if a milestone slips by more than 50%:
  1. Content shell (offline, 7 languages, all reference screens). 4-6 weeks.
  2. Solo simulator (Skia-based, missions, local replay). 2-3 months.
  3. Online layer (auth, leaderboard, replay sync, AI coach). 2-3 months.
  4. Multiplayer (WebSocket client, lobby UI). 1-2 months.
  5. Polish + App Review. 2-4 weeks.
- **ADR-0003 (shared-package extraction) becomes mandatory.** Maintaining content and physics in two places for a 7-language, 18-screen app is not sustainable. Coordinate with the Shared lane to extract `packages/content` and `packages/physics` once mobile starts consuming them.
- **ADR-0004 (offline strategy) needs a per-screen matrix.** Content + solo simulator are offline-first; multiplayer, leaderboard submit, AI coach, replay upload, daily challenges require network. Graceful degradation policy goes into that ADR.
- **ADR-0006 (auth) becomes priority.** Cross-device sync of progress + replays argues for a real account model. Sign in with Apple is the natural first option on iOS and is App Review-friendly. Resolved in coordination with the Shared lane (web also needs a real auth model for sync to work both ways).
- **Backend impact.** Existing `weektoregatta.com/api/*` plus `ws-server/` already supports the gameplay surface we need. The main gap is real auth: today it is cookie-based session IDs without accounts. Shared lane will introduce accounts when ADR-0006 lands.
- **Scope discipline.** "Full parity" is the v1 target. If a milestone slips by more than 50%, descope rather than ship a half-broken v1. Quality over surface area.
- **Reference simulator.** Mobile uses `simulator-v3` as the behavioral spec. V1 (`/simulator`) and V2 (`/simulator2`) are not duplicated on mobile; they remain web-only experiments.

**Next ADRs.**

- ADR-0003: shared-package extraction plan - required by parity scope.
- ADR-0004: offline strategy - per-screen online/offline matrix.
- ADR-0006: auth model - Sign in with Apple as default candidate.

---

## ADR-0002: Repo layout - monorepo with `mobile/` subdirectory

**Date:** 2026-04-22
**Status:** accepted

**Context.** Per ADR-0001, the mobile app is React Native + Expo in TypeScript. The question is where its source lives: alongside web in this repo (monorepo with `mobile/`), or in a separate repo linked from `docs/design/mobile/README.md`. CLAUDE.md already coordinates parallel work in this single repo across V3, V2, Shared, and Mobile lanes, and the shared-package extraction goal (content, physics, i18n) strongly shapes the choice.

**Decision.** Monorepo. Add `mobile/` as a top-level directory in this repo. When a shared asset later needs to be consumed by both clients, introduce `packages/` via npm or pnpm workspaces (scope of ADR-0003).

**Alternatives considered.**

- **Separate repo** (e.g. `regatta-mobile` on GitHub). Rejected: shared-package extraction would require publishing to a registry (npm or GitHub Packages) and a release cycle to propagate updates between clients. For the "one source of truth per asset" goal, that friction pushes teams toward duplication, which is exactly what CLAUDE.md prevents. Cross-cutting changes (e.g. updating a `bootcamp` lesson, or adding a new locale to `LegacyLocalized<'field'>` rows) would require two PRs in two repos. Lighter CI per platform is the counter-argument, but `paths:` filters in GitHub Actions make single-repo CI effectively per-platform.
- **Git submodule / subtree in advance.** Rejected. Submodules add tooling complexity without solving coordination. If circumstances change later, `git subtree split --prefix=mobile` extracts `mobile/` into its own repo without history loss. Deferred option, not pre-paid cost.

**Consequences.**

- **Directory layout.** A new top-level `mobile/` with its own `package.json`. Web stays untouched at the repo root. Future `packages/` is reserved for shared code (deferred to ADR-0003).
  ```
  regatta/
  ├── src/              # web (Next.js)
  ├── mobile/           # RN + Expo app (new)
  ├── ws-server/        # WebSocket backend
  ├── docs/
  ├── packages/         # later, per ADR-0003
  └── package.json
  ```
- **Dependencies.** Mobile gets its own `mobile/node_modules` for v1 (no workspace hoisting yet, to avoid surprises with Expo's Metro bundler and dedupe rules). When ADR-0003 introduces shared packages, switch to pnpm or npm workspaces with the Expo monorepo preset.
- **CI.** Per CLAUDE.md, the Shared lane adds `paths:` filters to existing web workflows so they skip on mobile-only PRs. Mobile CI (EAS Build + type checks + tests) runs only on `mobile/**` changes. All CI coordination goes through the Shared lane.
- **Git log.** Single history covers both clients. Commits are scoped per CLAUDE.md: use `git add <paths>`, not `git add -A`, so mobile commits do not accidentally include web changes and vice versa.
- **AI-assisted work.** Models see both sides together, which is a quality win for any task touching shared concepts (content format, physics contracts, API schemas, i18n keys across 7 locales).
- **Exit path.** If mobile later needs an independent repo, `git subtree split --prefix=mobile` produces a clean `mobile/`-only history. Not free, but not catastrophic.

**Next ADRs.** ADR-0003 (shared-package extraction plan) is unblocked.

---

## ADR-0001: Stack choice - React Native with Expo

**Date:** 2026-04-22
**Status:** accepted

**Context.** Pick a mobile stack for the Regatta app. Constraints from `CLAUDE.md`:

- "One source of truth per asset" across web and mobile.
- Mobile hits the existing `weektoregatta.com/api/*` backend. No separate server.
- The web app is a 7-language product: RU / EN / PL / ES / FR / DE / IT, source RU. Data files use the `LegacyLocalized<'field'>` adapter with `fieldRu/En/Pl` required and `fieldEs/Fr/De/It` optional. New components prefer `tl({ru, en, pl, es, fr, de, it})` object form. Consumers read via `legacyPick(obj, 'field', lang)`. Bulk translation runs through `scripts/translate-data-flat.mjs`. Cyrillic-leak verification via `scripts/cyrillic-scan.mjs`.
- Shared deps that mobile may read (and later extract into a shared package): `src/data/*` (content with 7-language fields), `src/lib/sailing-physics/*` (pure-TS VPP engine, 16 green tests, deterministic `tick(state, controls, params, dt) -> state`), i18n helpers (`tp`, `tl`, `legacyPick`), API schemas.

The stack choice determines how much of this we reuse verbatim vs re-implement in another language. With seven languages already in flight, hand-porting content and i18n logic to a non-TS stack multiplies maintenance cost by the number of locales.

**Decision.** React Native via Expo, managed workflow, with config plugins for native modules when needed. iOS first; Android enabled when the team is ready. If a single performance-critical screen needs a deeper native hook, `expo prebuild` promotes to bare without rewrite.

**Alternatives considered.**

- **Capacitor (web-wrapper).** Fastest path since it wraps the existing Next.js app in a WKWebView. Rejected: premium UX targets (60 FPS simulator, native haptics/gestures/transitions, App Store polish, deep link handling) are hard to reach in a webview shell. Offline requires custom service-worker plumbing that does not exist on web today, and Next.js SSR pages do not work offline by default. App Review is historically skeptical of thin wrappers.
- **Flutter.** Strong cross-platform performance and UI quality. Rejected: Dart is a third language in the project. With seven content locales already maintained as TS data and existing tooling tied to TS files (`scripts/translate-data-flat.mjs`, `scripts/cyrillic-scan.mjs`), a Dart port would multiply the i18n maintenance surface and require new tooling. Physics, content, and i18n would need full Dart ports with golden-fixture validation. Zero TypeScript code-share with the web client, which directly conflicts with the "one source of truth per asset" rule.
- **Native (Swift + Kotlin later).** Highest UX ceiling. Rejected as the primary path: creates two or three codebases (iOS + web + eventually Android), forces hand-ported physics/content/i18n into Swift and later Kotlin, and creates three sources of truth that drift over time. Multiplied by 7 languages, the maintenance cost is prohibitive for a small team. Kept as a targeted fallback: under RN we can drop down to Swift/Metal or SpriteKit for a single performance-critical screen (e.g. the simulator render loop) via Expo config plugins, while keeping HUD, navigation, content, and i18n in shared TS.
- **RN bare workflow.** Rejected in favor of Expo managed. Expo's config plugins cover the cases where native modules are required, while EAS Build, EAS Update (OTA), dev builds, and App Store submission are streamlined. If we hit a hard limit, `expo prebuild` promotes to bare without rewrite.

**Consequences.**

- **Web**: no immediate changes. `src/data/*`, `src/lib/sailing-physics/*`, `/api/*`, and i18n plumbing stay as-is. Any shared-package extraction (e.g. `packages/content`, `packages/physics`) is coordinated through the Shared lane when mobile actually starts consuming these assets, per CLAUDE.md rules on cross-cutting changes.
- **Mobile scaffold**: TypeScript + React + Expo. The web team's React/TS skills transfer directly, which keeps the learning surface small and makes AI-assisted work more reliable.
- **Repo layout**: resolved by ADR-0002 (monorepo with `mobile/` subdirectory).
- **API contract**: mobile consumes `weektoregatta.com/api/*` as-is. Endpoints and payload shapes get documented in `docs/design/mobile/API_CONTRACT.md` so web and mobile evolve together. No mobile-specific backend changes for v1.
- **Simulator rendering**: expected default is `@shopify/react-native-skia` for a Skia-backed 60 FPS canvas. The shared physics `tick` stays pure TS and runs on the JS thread or a worklet. Fallback if Skia proves insufficient: native module (SpriteKit/Metal on iOS, matching module on Android) for the scene only; HUD and controls remain RN.
- **Multiplayer**: RN's built-in `WebSocket` API covers the existing `ws-server` protocol with no server changes.
- **Offline strategy**: content JSON bundled in the app (extracted from `src/data/*` with all 7 language fields where present), physics runs locally, AI coach and multiplayer are online-only. Full plan in ADR-0004.
- **i18n on mobile**: reuse `tl({ru, en, pl, es, fr, de, it})` and `legacyPick()` directly (pure-TS helpers, no React DOM dependency). Mobile language priority becomes: in-app setting > device locale (`expo-localization`) > RU fallback. The `cookie/SSR` step from web is replaced by `AsyncStorage`. Bulk translation tooling (`scripts/translate-data-flat.mjs`) keeps producing the same `LegacyLocalized` rows that both clients consume.
- **Android**: near-free by construction. Ship iOS first, enable Android when the team is ready. No separate codebase.

**Next ADRs.**

- ADR-0002: repo layout (monorepo `mobile/` vs separate repo). [accepted]
- ADR-0003: shared-package extraction plan (when and how to move `src/data/*` and `src/lib/sailing-physics/*` into workspace packages).
- ADR-0004: offline strategy (what ships in the bundle, what requires network, sync policy).
- ADR-0005: v1 feature scope (full parity with web vs focused subset). [accepted]
- ADR-0006: auth/account model (inherit web's no-auth for v1, or introduce accounts up front).

---

## ADR-TEMPLATE

### ADR-NNNN: Title

**Date:** YYYY-MM-DD
**Status:** proposed / accepted / superseded

**Context.** One paragraph: what decision are we making and why now.

**Decision.** What we picked.

**Alternatives considered.** Bullet list of other options and why we didn't pick them.

**Consequences.** What changes for web, for mobile, for data/API sharing.

---

## Open questions parked for later ADRs

- **Auth / accounts** - none on web today. Mobile parity needs cross-device
  sync, which forces a real account model. Sign in with Apple as default
  candidate (ADR-0006).
