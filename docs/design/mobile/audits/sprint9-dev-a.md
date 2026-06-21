# Sprint 9 - Dev-A status: Game / Coach / Daily challenge

Date: 2026-05-13
Branch: `app`
Lane: Mobile (Dev-A of three parallel devs)

## Goal

Close the remaining three PM round-1 P0s for the iOS app:

1. Replace the Game placeholder with a real solo-race screen.
2. Add the AI coach surface backed by the existing web `/api/coach`.
3. Land the Daily challenge banner on Home, backed by `/api/daily`.

## Files

Created:

- `mobile/src/api/coach.ts` - typed HTTP wrappers for `POST /api/coach`
  and `POST /api/race-result`. Shared `postJson` helper handles 8-second
  AbortController timeouts and collapses thrown errors into the
  `ApiResult<T>` envelope. Pure `fetch`, zero new dependencies.
- `mobile/src/api/daily.ts` - typed `GET /api/daily` wrapper plus an
  AsyncStorage cache (key `regatta.daily.cache.v1`, TTL 1 hour). On
  network failure the helper returns the most recent cache entry from
  today (the seed only changes at UTC midnight, so older-than-TTL is
  still valid for the same day).
- `mobile/src/persistence/race-history.ts` - `useRaceHistory()` hook plus
  a non-hook `loadRaceById()` for the coach screen to hydrate before
  first paint. Storage key `regatta.race-history.v1`, capped at the last
  20 races.
- `mobile/src/game/course.ts` - 4 course definitions (`short`, `medium`,
  `long`, `daily`), `projectCourse()` to lay marks into pixel space,
  `scoreCourse()` mirrors the simulator-mission scoring formula,
  `buildFinishLine()` and `crossedFinishLine()` for the cyan finish
  indicator + crossing detection.
- `mobile/app/coach/index.tsx` - the AI coach screen. Reads `?raceId`,
  hydrates the race from AsyncStorage, calls `/api/coach`, renders the
  parsed coaching JSON as a stack of `Card` primitives.
- `docs/design/mobile/audits/sprint9-dev-a.md` - this status note.

Modified:

- `mobile/app/game/index.tsx` - real solo-race screen replacing the
  former PlaceholderScreen. Reuses `useSimLoop` (Skia + VPP physics),
  layers a 5-second countdown overlay, course mark rendering, finish
  detection, sample/event capture for the AI coach, and a Result panel
  with Save / AI coach / Try again / Home actions.
- `mobile/app/index.tsx` - Daily banner above the Continue Day-N row.
  Renders only when `/api/daily` returns a valid response; otherwise
  nothing (no empty state per the brief).

Untouched:

- `mobile/app/_layout.tsx` - expo-router auto-discovers the new
  `app/coach/index.tsx` route, no manual registration required.
- `mobile/app/simulator/*` and `mobile/src/simulator/*` (Dev-B owns).
- `mobile/src/design-system/components/*` - re-used existing primitives,
  did not add any new ones.
- `mobile/__tests__/*` - per scope rule. See "Known fallout" below.
- `mobile/asc-metadata/*` (Dev-C scope).

## Course shape

```
v1 ships 4 courses (`short`, `medium`, `long`, `daily`):

  start (fx 0.5, fy 0.85, captureR 30)
    \
     |  windward leg (upwind, ~67% of canvas height)
     |
  windward (fx 0.5, fy 0.18, captureR 32)
    /
   /  return leg (downwind / reach)
   |
  finish (fx 0.5, fy 0.85, captureR 36)
```

- `short`: par 75 sec, easy / medium wind (10 kt). Default course.
- `medium`: par 110 sec, medium / medium wind (12 kt). Daily aliases here.
- `long`: par 160 sec, hard / heavy wind (16 kt).
- `daily`: same geometry as medium, different chrome strings + the cyan
  Daily badge surface.

Each course definition is a `CourseDef` with `marks: ReadonlyArray<CourseMark>`
where `CourseMark` mirrors `simulator/missions.ts MarkPlan` so the same
Skia rendering code paths apply. The Game screen projects marks into pixel
space at runtime via `projectCourse(course, bounds)`.

Finish detection deliberately requires BOTH:
1. The boat enters the finish mark's capture radius.
2. The boat crosses the actual finish-line strip (a horizontal segment
   centred on the finish mark, drawn in cyan on the canvas).

This stops the start-mark / finish-mark collocation from auto-finishing
the race within the first second.

## Game screen UX flow

```
mount
  -> initial heading aimed at windward mark
  -> wind pinned to course.initialWindDirRad / Kn (one-shot)
  -> phase = 'countdown', 5 seconds
  -> phase = 'racing'
       per tick:
         - sample 1Hz position into samples + replay buffers
         - mark detection (start auto-cleared after 0.5s, windward by
           capture radius, finish by capture + line-cross)
         - haptic on each mark (medium for windward, heavy for finish)
  -> phase = 'finished'
       Result panel surfaces:
         - elapsed time (formatted m:ss)
         - score (0..100, scoreCourse(elapsed, par))
         - par time
       Buttons (4):
         - Save  -> await history.save() + POST /api/race-result
                   -> Alert on network failure ("saved on device, no network")
                   -> button label flips to "Saved"
         - AI coach -> save (if not yet saved) -> push /coach?raceId=...
         - Try again -> reset boat, marks, samples, events, phase=countdown
         - Home -> router.replace('/')
```

HUD strip (always visible at bottom of canvas): heading, speed, TWA, AWA,
race time. Pinned via `position: absolute`, `pointerEvents: none` so it
never steals taps from the steering pan gesture.

## AI coach UX flow

```
mount with `?raceId=<id>` query param
  -> state = 'loading-race'
  -> loadRaceById(raceId)
     - missing -> state = 'race-missing' (EmptyState with "to the race" CTA)
     - found   -> state = 'loading-coach', skeleton ladder
  -> POST /api/coach with payload built from race samples + events
     - error   -> state = 'error' (EmptyState + Retry)
     - success -> state = 'loaded' renders:
                    Card #1: OVERALL block + score / 100
                    Card #N: per-mistake card with severity pill,
                             time range, title, "What happened",
                             "How to fix"
                    Card:    STRENGTHS bulleted list
                    Card:    NEXT GOAL (cyan-tinted)
                    Buttons: Try another race, Home
```

Loading state uses `Skeleton` primitives (3 stacked blocks) with a
localised "Coach is analysing the race..." caption. Error state uses
`EmptyState` with the `Retry` CTA wired to re-fire the `/api/coach`
request without re-hydrating the race.

The coaching JSON shape from web `/api/coach` exposes both legacy
(`titleRu`, `explanationRu`, `fixRu`, `nextGoalRu`) and clean alias
(`title`, `explanation`, `fix`, `nextGoal`) field names. The mobile
renderer reads the alias first and falls back to the `*Ru` legacy field.
This keeps us forward-compatible with the web `mirrorCoachKeys`
normaliser without coupling to a specific build.

## Daily banner conditions

Render the cyan-tinted Card on Home if and only if:

1. `fetchDaily()` resolved with `{ ok: true, data }` (HTTP 2xx + parsed
   shape valid), OR
2. The cache from today is present (covers offline / 5xx degradation).

If neither condition is met, render nothing - the banner is opportunistic
per the brief. There is no empty state for "no daily challenge today".

The Card surfaces:
- "DAILY" kicker (cyan, 11pt, letter-spaced)
- Course title (resolved via `findCourse(challenge.missionId).title(tp)`)
- "Par: m:ss" hint when the leaderboard returned at least one entry
- "Try the daily" CTA arrow

Tap routes to `/game?course=daily`. The Game screen reads the `course`
query param and resolves it to the `daily` course definition (which
aliases `medium` geometry with bespoke title strings).

Cache TTL: 1 hour. The web seed only flips at UTC midnight, so a 1-hour
TTL gives us a fresh response on the first session of the day without
spamming the API on repeated Home renders.

## API contract decisions

- `/api/coach` payload uses the existing web shape (samples + events +
  course info + lang). The `lang` field threads the user's UI language
  into the AI prompt so the coaching markdown lands in the right
  language. We pass `lang` from the i18n context, not the device locale
  - matches what the web client does.
- `/api/race-result` requires a `regatta_sid` cookie that mobile cannot
  set today (per ADR-0006: "auth model pending"). The Save button
  therefore expects a 4xx from the server and degrades to local-only
  persistence with an Alert so the user is not surprised. Local
  persistence is the source of truth on device; the leaderboard
  submission is opportunistic.
- `/api/daily` returns a different shape than `API_CONTRACT.md` predicts
  (web returns `{ day, challenge: { seed, difficulty, windStrength,
  missionId }, top }` instead of the documented `{ ok: true; missionId;
  windKn; expiresAt }`). The mobile client adapts to the actual server
  shape. `API_CONTRACT.md` should be updated by the Shared lane in a
  follow-up PR.
- All three helpers use `https://regatta.icoffio.com/api/*` as the base.
  No `EXPO_PUBLIC_API_BASE` env wiring this round; we'll thread one in
  Phase 3 when the staging vs prod split lands.

## Known fallout for QA

- `mobile/__tests__/screens/placeholder-screens.test.tsx` has 2 failing
  tests that explicitly assert the OLD placeholder behaviour for the
  Game route ("Phase 2 badge", "all 3 highlight bullet items"). Both
  tests are now testing the obsolete state I was tasked to replace.
  The test file is in the `mobile/__tests__/*` don't-touch list per
  Sprint 9 scope, so QA needs to either:
  - delete the two `Game ...` tests (Leaderboard / Multiplayer remain
    valid, they're still placeholders), OR
  - replace them with fresh assertions against the real Game screen
    (countdown text, finish-line presence, etc).
  The third Skia issue inside the test trace (`cubicTo` is undefined on
  the jest Skia mock) is a knock-on of the real Game now rendering
  `<SkiaYacht />` under jest. The fix is to extend `jest.setup.js`
  Skia.Path.Make() with the missing geometry methods - also outside
  Dev-A scope (jest setup is a shared file that affects every screen
  test). Both items are recorded here so the next sprint can resolve
  in one PR.
- `mobile/app/anatomy/index.tsx` carries an unused `AppState` import in
  the working tree from in-flight work (NOT introduced by Sprint 9
  Dev-A). It trips `npm run lint` with `@typescript-eslint/no-unused-vars`.
  Outside my scope; not editing per lane discipline. The owning agent
  should either land their AppState usage or drop the import.

## Verification

Running with the Sprint 9 Dev-A surface only:

- `npx tsc --noEmit` (mobile/) - clean.
- `eslint app/game/index.tsx app/coach/index.tsx app/index.tsx
  src/api/coach.ts src/api/daily.ts src/persistence/race-history.ts
  src/game/course.ts` - clean, 0 errors / 0 warnings.
- `npm test` - 102/104 pass. The 2 failures are the placeholder-screens
  tests documented under "Known fallout" above; both predate my touch
  on the test file (which I did not edit).
- `npm run sync-content:check` - "all bundles up to date".

End-to-end smoke against the live API needs a real device because (a)
`/api/race-result` requires the device-issued session cookie, and (b)
the daily endpoint behaviour around UTC midnight only repros on
overnight test runs. Both are listed as QA items below.

## Follow-ups for QA

1. Smoke the Game screen on iOS device:
   - countdown plays through 5..1, "GO!" flash visible briefly,
   - drag-steering responsive, boat actually moves under wind,
   - mark capture rings flash green on rounding, finish line crossing
     freezes scene + opens Result panel,
   - Save Alert fires when offline; "Saved" sticks afterward,
   - "AI coach" navigates and the coach screen renders the actual JSON
     from `/api/coach` (not the fallback path).
2. Verify the AI coach UX with all 7 langs: rotate `?lang=` via the
   Settings picker, retry on each, confirm the prompt response lands
   in the matching language.
3. Confirm Daily banner:
   - Renders on Home after first cold-launch fetch.
   - Persists across app restarts (the 1-hour cache survives).
   - Disappears when forced to a 404 (e.g. by hitting a stale build
     where `/api/daily` is missing).
   - The "Try the daily" CTA opens Game and the title shows "Daily
     challenge" copy in the active language.
4. Run a 20-race save loop to verify the `MAX_RACES = 20` cap works:
   the oldest entries should drop off, the newest stays at index 0.
5. Verify tests after the placeholder-screens test rewrite (next sprint).
