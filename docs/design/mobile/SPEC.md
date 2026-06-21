# Mobile feature spec

Status: **skeleton** (2026-05-03). Captures the user-facing surface of
the iOS app as it stands today. Decisions live in
[DECISIONS.md](./DECISIONS.md), execution sequencing in
[ROADMAP.md](./ROADMAP.md), API surface in
[API_CONTRACT.md](./API_CONTRACT.md). This file is the **what each
screen does** doc.

## App-wide invariants

- **Brand**: "Week to Regatta" wordmark stays English in all 7 locales.
  Stack-style lockup ("Week to" muted, "Regatta" cyan). Codename / slug
  / bundle stays `regatta` / `com.icoffio.regatta`.
- **Theme**: dark-ocean only. Tokens mirror `src/app/globals.css`. iOS
  `userInterfaceStyle` locked to `dark`.
- **i18n**: 7 locales (RU / EN / PL / ES / FR / DE / IT). Source language
  RU. Wordmark and a handful of layout primitives (e.g., `Bootcamp`)
  stay English globally; everything else localizes.
- **Persistence**: AsyncStorage for settings + lightweight progress;
  expo-secure-store for tokens (Phase 3); expo-sqlite for replays and
  queued sync writes (Phase 2+).
- **Network policy**: per-screen tier per ADR-0004. Tier 1 screens never
  block on network; Tier 2/3 show an inline offline banner with retry.
- **Splash**: native splash held until `useI18n().ready` flips true, so
  the user never sees a wrong-language flash.
- **Error fallback**: root `ErrorBoundary` renders a branded "something
  went wrong" view instead of letting React's red box escape.
- **Haptics**: light impact on simulator pan begin; medium impact on
  destructive / reset actions.

## Route inventory

Each route is a file in `mobile/app/*` resolved by expo-router.

| Path | Component | Tier | Status | Notes |
|---|---|---|---|---|
| `/` | `app/index.tsx` | T1 | Real | Home: 4 sections, Card + ListRow |
| `/settings` | `app/settings.tsx` | T1 | Real | Language picker (7), About card |
| `/bootcamp` | `app/bootcamp/index.tsx` | T1 | Real | 8 lessons + progress badges |
| `/bootcamp/[id]` | `app/bootcamp/[id].tsx` | T1 | Real | Lesson detail + Open CTA marks completion |
| `/quick` | `app/quick/index.tsx` | T1 | Real | 6 refresh tips |
| `/rules` | `app/rules/index.tsx` | T1 | Real | 8 scenarios index |
| `/rules/[id]` | `app/rules/[id].tsx` | T1 | Real | Reveal-style Q/A |
| `/onboard` | `app/onboard/index.tsx` | T1 | Real | 8 sections + warnings |
| `/anatomy` | `app/anatomy/index.tsx` | T1 | Real | 17 parts list. Interactive diagram = v1.x |
| `/courses` | `app/courses/index.tsx` | T1 | Real | Polar SVG diagram + 5 cards |
| `/racing` | `app/racing/index.tsx` | T1 | Real | Rules (priority sorted) + strategies |
| `/glossary` | `app/glossary/index.tsx` | T1 | Real | 51 terms + search |
| `/gallery` | `app/gallery/index.tsx` | T2 | Real | Online thumbnails, YouTube overlay |
| `/simulator` | `app/simulator/index.tsx` | T1 | **Preview** | Stub physics + Skia + pan + trail + reset |
| `/game` | `app/game/index.tsx` | T1 | Placeholder | Phase 2 (solo race mode) |
| `/multiplayer` | `app/multiplayer/index.tsx` | T3 | Placeholder | Phase 4 (WS client + lobby) |
| `/leaderboard` | `app/leaderboard/index.tsx` | T2 | Placeholder | Phase 3 (online layer) |

**Web-only**: `/stats` admin route. Not mirrored on mobile per ADR-0005.

## Screen specs

### Home (`/`)

**Purpose**: navigation hub. Mirrors web `/`.

**Layout** (top to bottom):
1. Brand wordmark header (no native header chrome): "Week to" small in
   secondary color over big "Regatta" in `accentCyan`, with a localized
   tagline.
2. Section "Where to start" + 3 primary `Card`s: Bootcamp / Quick / Rules.
   Each card shows title + caption. Tap navigates.
3. Section "Reference" + 5 `ListRow`s: Anatomy / Onboard / Glossary /
   Courses / Racing.
4. Section "Tools" + 3 `ListRow`s: Simulator / Multiplayer / Leaderboard.
5. Section "More" + 2 `ListRow`s: Gallery / Settings.

**Data**: none. Hardcoded route map.

**Out of scope for v1**: pinned / continue-where-you-left-off,
recommendations, push prompts.

### Settings (`/settings`)

**Purpose**: language picker + version metadata.

**Layout**:
1. Section "Language" + `Card` per `ENABLED_LANGUAGES` entry. Tap
   persists to AsyncStorage via `setLang`, switches UI immediately.
2. Section "About" + single `Card` with brand wordmark, version
   "0.1.0 (build 1)" line, phase label.

**v1.x additions**: telemetry opt-in (Phase 5), notification prefs,
storage usage / clear cache.

### Bootcamp index (`/bootcamp`)

**Purpose**: guided 8-lesson learning path.

**Layout**:
1. Caption with `${lessons.length} lessons, around ${total} min total`.
2. Progress line "Completed X of N" when `useBootcampProgress().ready &&
   completedIds.size > 0`, in `colors.success`.
3. One `Card` per `bootcampLessons` entry: emoji + title + meta
   ("Lesson 1 (~5 min)") + summary. A small green "OK" badge appears
   on lessons whose `id` is in `completedIds`.

**Data**: `bootcampLessons` from `mobile/src/data` (synced from
`src/data/bootcamp.ts`).

**Persistence**: `useBootcampProgress` hook reads/writes
`regatta.progress.bootcamp.v1` in AsyncStorage.

### Bootcamp lesson detail (`/bootcamp/[id]`)

**Purpose**: read one lesson, then practice via the linked route.

**Layout**:
1. Hero: emoji (64pt) + title + meta.
2. Summary paragraph.
3. `Card` "Focus this time" with the lesson's `focus` text.
4. Primary `Button` "Open". On press: `markCompleted(lesson.id)` then
   `router.push(lesson.route)`.

**Fallback**: missing id renders a "Lesson not found" muted text.

### Rules index (`/rules`)

**Purpose**: browse 8 collision scenarios.

**Layout**: caption + one `Card` per `ruleScenarios`: icon + title +
`RRS` / `COLREGS` source badge + scene preview.

### Rules scenario detail (`/rules/[id]`)

**Purpose**: reveal-style Q/A teaching pattern.

**Layout**:
1. Hero: icon + title + tags (source + svg ref).
2. `Section` cards always visible: Scene, Question.
3. `Button` "Show answer" or, once tapped, three more `Section` cards:
   Answer (accent border), Why, In practice.

**State**: local `useState` for `revealed`; no persistence (each visit
re-asks the question, by design).

### Onboard (`/onboard`)

**Purpose**: shipboard culture, commands, etiquette across 8 sections.

**Layout**: scrollable list of `Card`s. Each card has icon + title +
bulleted items (`legacyPickArray`) + optional warning block (yellow,
shown when `warning*` field present).

### Anatomy (`/anatomy`)

**Purpose**: yacht parts reference.

**Layout** (v1): scrollable list of `Card`s. Each card: part name +
description + optional "On board" note.

**v1.x**: interactive 2D side-view diagram with hotspots driven by
`part.side`. Requires bundling the web poster or porting the SVG.

### Courses (`/courses`)

**Purpose**: points of sail relative to wind.

**Layout**:
1. Polar SVG diagram (`PointsOfSailDiagram` DS component): wind from
   top, 5 sectors mirrored on starboard and port colored by
   `point.color`, center boat dot.
2. `Card` per `pointsOfSail`: name + meta row (`ANGLE`, `SPEED`) +
   description + sail work block. Left border colored by `point.color`.

**v1.x**: tap a sector to scroll the matching card into view.

### Racing (`/racing`)

**Purpose**: right-of-way rules + strategy tips.

**Layout**:
1. Section "RIGHT OF WAY" + `Card` per `racingRules` (priority sorted):
   priority badge + title + description.
2. Section "STRATEGIES" + `Card` per `racingStrategies`: title +
   description + bulleted tips (each tip is `LocalizedText`).

### Glossary (`/glossary`)

**Purpose**: searchable index of 51 sailing terms.

**Layout**:
1. Search `TextInput` with placeholder + counter ("`filtered.length`
   of `total`").
2. Scrollable list of `Card`s, one per filtered term: term + definition.

**Search**: case-insensitive substring on the user's current locale's
`term` and `definition`.

**v1.x**: category chips (boat / sail / course / maneuver / racing /
wind / crew), shareable deep link.

### Gallery (`/gallery`)

**Purpose**: photo and video references from past regattas.

**Layout**:
- Grid of items. Images use thumbnail URL from web's `/public/...`.
  YouTube items show a play overlay over the YouTube hqdefault.
- Items with a `badge` (e.g. "2025") show the badge in the corner.

**Network**: thumbnails fetched lazily, so the screen renders fast even
on cellular. v1 has no offline cache; v1.x adds an LRU disk cache via
`expo-image`.

### Simulator preview (`/simulator`)

**Status**: Phase 2 preview, **not the real product**. Demonstrates
that the Skia / gesture / haptics stack works end-to-end.

**Layout**:
1. Header: "PHASE 2 PREVIEW" badge + spacer + "RESET" button.
2. Skia `Canvas` 320×240:
   - Static wind arrow from the top.
   - Wake `Path` with last 60 boat positions, wrap-aware breaks at
     playfield edges.
   - Boat sprite rotated by `boat.heading`, white silhouette.
3. HUD row: `HEADING`, `TARGET`, `SPEED` cells, tabular-nums.
4. Caption explaining the preview is stub physics.

**Interaction**: `Gesture.Pan().runOnJS(true)` sets `targetHeading =
atan2(dx, -dy)` from canvas-center. Light haptic on pan begin, medium
on reset.

**Phase 2 proper** (replaces this stub): port `@regatta/physics` once
ADR-0003 lands, swap the stub `tick` for the shared VPP, add wind
dynamics, missions, replay save/load, mode bar from `simulator-v3`.

### Placeholders

`/game`, `/multiplayer`, `/leaderboard` render `PlaceholderScreen` with
a phase-pointer note. They exist so deep links and navigation never
404; their real screens land in Phase 2 / 4 / 3 respectively.

## Cross-cutting modules

### i18n (`mobile/src/i18n/`)

- `languages.ts`: `Lang`, `LocalizedText`, `LegacyLocalized<>`,
  `ENABLED_LANGUAGES`, `pickLocalized`, `legacyPick`, `legacyPickArray`.
- `device-locale.ts`: maps the device's preferred locales (via
  `expo-localization`) to a supported `Lang`, falls back to `'ru'`.
- `context.tsx`: `I18nProvider` resolves AsyncStorage > device locale
  > `'ru'`. Exposes `tp(ru, en, pl, extras?)` and
  `tl({ ru, en, pl, ... })`; semantically identical to web.

### Design system (`mobile/src/design-system/`)

- Tokens: `colors`, `radii`, `spacing`, `oceanGradient`. Mirrored from
  web's `:root` vars.
- Components: `Screen` (safe-area wrapper), `Text` (6 variants), `Card`
  (pressable + static), `Button` (3 variants), `ListRow`,
  `PlaceholderScreen`, `ErrorBoundary`, `PointsOfSailDiagram`.

### Persistence (`mobile/src/persistence/`)

- `bootcamp.ts`: `useBootcampProgress` hook + module-level
  `markCompleted` / `getCompletedIds` for use outside React.
- v1.x: `checklist.ts` (pre-race checklist), `glossary-favorites.ts`,
  `settings.ts` (telemetry opt-in).
- Phase 2+: `sync-queue.ts` (SQLite-backed offline writes).

### Simulator (`mobile/src/simulator/`)

- `types.ts`: `BoatState`, `Controls`, `SimParams`.
- `tick.ts`: pure `tick(state, controls, params, dt) -> next` function
  for the preview stub.
- `use-sim-loop.ts`: `useSimLoop({ bounds })` returning live `boat`,
  `controls`, `trail`, `tickN`, `setTargetHeading`, `setThrottle`,
  `reset`.

### Content sync (bridging per ADR-0003)

- `mobile/scripts/sync-content.ts`: reads `src/data/*.ts` via Node's
  `--experimental-strip-types`, writes JSON twins to
  `mobile/src/data/*.json`. `npm run sync-content:check` is the CI
  parity guard.
- Self-removes when the Shared lane completes the `packages/content`
  extraction per [ADR-0003-execution.md](./ADR-0003-execution.md).

## Out of scope (v1)

The following surfaces are intentionally not in v1, deferred per the
ROADMAP:

- Real-time multiplayer race rendering (Phase 4).
- AI coach UI surface (Phase 3, behind ADR-0006 auth).
- Cloud sync of progress / replays / settings (Phase 3).
- Sign in with Apple flow (Phase 3, ADR-0006).
- 3D anatomy diagram (web has a GLB model; mobile defers indefinitely).
- Push notifications.
- iPad-specific layouts (we ship sane defaults; iPad-optimized in v2).
- Apple Watch app.
- Bottom tabs navigation (architectural decision; defer until UX
  validation suggests a switch from stack-only).

## Verification

- `cd mobile && npm run check` covers sync-content parity, tsc, and
  the 68-test suite. Green is the bar for any PR touching this spec.
- Visual smoke: TESTING.md Path 2 (`npx expo run:ios`) hits every
  route via the Home navigation and validates the layouts above.
