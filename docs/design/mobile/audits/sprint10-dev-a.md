# Sprint 10 - Dev-A status: Replay viewer / History list / Share-code

Date: 2026-05-13
Branch: `app`
Lane: Mobile (Dev-A of three parallel devs)

## Goal

Build on Sprint 9 (Game + AI coach + Daily challenge + persisted race
history). The user can now finish a race, save it, and ask the coach
about it. Sprint 10 closes the loop:

1. **Replay viewer** - replay a saved race in a Skia scene with playback
   controls and a time scrubber.
2. **History list** - browse every persisted race, jump into Replay or
   Coach, and clear the list.
3. **Share-code** - generate a 4-char code per race so the user can text
   it to a friend; phase 2 will resolve it via a backend.

## Files

Created:

- `mobile/app/replay/[id].tsx` - the Replay viewer screen. Reads the
  race id from the URL, hydrates the matching `RaceRecord` from
  AsyncStorage via `useRaceHistory().getRaceById`, then plays back the
  boat over a Skia canvas with course marks, a finish line, the
  growing track, and a wake at the boat.
- `mobile/app/history/index.tsx` - the History list screen. Sorts the
  persisted races newest-first, renders each as a `Card` with `Watch`
  and `Coach` actions, and exposes a "Clear all" button gated by an
  `Alert.alert` confirm sheet. Empty state CTAs into `/game`.
- `mobile/src/replay/playback.ts` - pure playback helpers. Exports
  `frameAt(replay, clockSec)` which lerps position and slerps heading
  between adjacent samples, plus `findFrameIndex` (binary search) and
  `summarizeReplay` for chrome metadata. No React, no Skia - pure TS,
  unit-testable.
- `docs/design/mobile/audits/sprint10-dev-a.md` - this status note.

Modified:

- `mobile/src/persistence/race-history.ts` - widened `ReplayPoint`
  with optional `headingRad?` / `speedKn?` channels so the replay
  layer can prefer recorded values over derived ones (legacy Sprint 9
  rows still play back fine because the channels are optional).
  Added `getRaceById(id) -> RaceRecord | null` synchronous lookup on
  the hook, and a free `shareCode(id) -> string` helper.
- `mobile/app/coach/index.tsx` - added a "Watch replay" CTA at the top
  of the screen routing to `/replay/[raceId]` when `?raceId=` is set.
  Hidden on the race-missing branch (no id to route to).
- `mobile/app/index.tsx` - added a "Race history" `ListRow` to the
  More section, conditionally rendered when at least one race is
  persisted (`useRaceHistory().races.length > 0`). Uses the `flag`
  icon since the brand registry has no `trophy` glyph.

## Replay playback algorithm

The Sprint 9 game records boat samples at ~1 Hz (one row per whole
second). To play this back as a smooth boat at any clock value we
interpolate between the two surrounding samples:

1. Binary-search for the lower-bound sample index `i` such that
   `replay[i].t <= clockSec < replay[i+1].t`. Edge cases (clock
   before first / after last sample) clamp to the closest sample.
2. Compute `alpha = (clockSec - a.t) / (b.t - a.t)`, clamped to [0, 1].
3. Lerp position: `x = a.x + (b.x - a.x) * alpha`, same for `y`.
4. Slerp heading: take the short way around the unit circle. Naive
   `lerp(headingA, headingB)` would spin the boat 350 deg the wrong
   way every time the recorded heading wraps from -PI to +PI.
5. Lerp speed (linear).

Heading and speed channels are optional on `ReplayPoint`. When the
recorded sample doesn't carry them (Sprint 9 legacy rows), we derive:

- **Heading**: from the previous-to-current vector via
  `Math.atan2(dx, -dy)` so we land in the same screen-space convention
  the Game uses (0 = up, +CW). Falls back to current-to-next if there
  is no previous sample, then to 0.
- **Speed**: from the positional delta divided by `dt` and a
  `pxPerKnotSec` constant (default 6, tuned to match the wake density
  the Game screen draws). Best-effort - it's used to gate the wake
  bezier, not to populate a HUD readout.

The Replay viewer drives the clock from a `requestAnimationFrame`
loop with per-frame `Date.now()` deltas. We chose RAF over
`setInterval` so 2x and 4x playback stay smooth at 60 fps without
banding artefacts. The loop pauses cleanly when the user taps Pause
or scrubs.

## Share-code design

`shareCode(raceId)` is a deterministic 4-char base31 fold of an FNV-1a
hash of the race id:

- Hash: FNV-1a 32-bit, 5 lines of TS, no deps.
- Alphabet: lowercase ASCII without look-alikes (no `0/O`, no `1/l/I`),
  31 characters total.
- Encoding: 4 chars of base31 = 31^4 = 923,521 buckets. Plenty of
  collision room for the local "tell a friend" workflow.

In v1 the code is **local-only**. The receiver can't resolve it -
they need the sender's race already on their device for it to mean
anything. The viewer surfaces it as a label ("Code: a3k7") and
includes it in the `Share.share` message so the sender at least has
something to type into a chat.

Phase 2 plan: POST a small "shared race" record (course id, replay
samples, finish time, score, code) to a backend keyed by this code on
share, and add a `/replay?code=...` deep-link that hits the same
backend on receive. Until then, the code is part of the v1 polish
without yet being functional across devices.

## History list UX

Newest-first list of `Card` rows. Each card carries:

- Course title (from `findCourse(race.courseId).title(tp)`).
- Finished-at timestamp formatted as `12 May, 16:42` (locale-agnostic
  so all 7 langs read the same).
- Time + Score stat strip.
- Two action buttons: cyan-filled "Watch" -> `/replay/[id]`, ghost
  "Coach" -> `/coach?raceId=...`.

Empty state uses the shared `<EmptyState>` component with the `flag`
icon and a CTA into `/game`. "Clear all" lives below the list,
tinted danger-red with a confirm Alert.

The Home entry only renders once `useRaceHistory().races.length > 0`,
so a fresh install does not see a dead "Race history" row before
finishing a race. Position: top of the More section, above Gallery,
matches the Settings-style "your data" grouping used elsewhere on iOS.

## Verification

- `cd mobile && npm run check`:
  - `sync-content:check`: clean.
  - `lint`: clean.
  - `typecheck`: clean (after widening `ReplayPoint` with optional
    headingRad / speedKn).
  - `jest`: 100/102 passing. The 2 failures are entirely in Dev-B's
    `app/multiplayer/index.tsx` (the Polish placeholder copy was
    rewritten and the legacy assertion in
    `__tests__/screens/placeholder-screens.test.tsx` is stale).
    Per CLAUDE.md scope rules I cannot touch either file.
- Home screen test passes (`npm test -- --testPathPattern='home'`)
  so the Race-history conditional row did not regress its assertions.
- All 7 langs covered via `tp(...)` for: replay screen title,
  Play / Pause / Restart / Speed / Share labels, Code prefix, scrubber
  clock readout, history list title / Watch / Coach / Clear all
  labels, confirm Alert title and body, empty-state copy and CTA,
  Coach Watch-replay CTA, Home Race-history row title and caption.
- ASCII typography only: no em-dashes, no en-dashes; Polish strings
  drop diacritics per CLAUDE.md; ES/FR/DE/IT use straight ASCII
  punctuation but keep meaningful diacritics where they exist.
- No new dependencies added. The share affordance uses RN core
  `Share.share` (already available with no install).

## Follow-ups

QA:

- Smoke the replay loop with a fresh race plus a stale Sprint 9 record
  (heading channel absent) to confirm derived heading reads cleanly
  through tacks and jibes.
- Verify the scrubber tracks the gesture without jitter at 4x; RAF
  should stay above 30 fps on iPhone 11. If not, drop visible-track
  recompute to once-per-second instead of once-per-frame.
- Test "Clear all" mid-playback: the viewer holds a local copy of the
  race, so playback continues, but the Home Race-history row vanishes
  immediately. Document as expected.
- Try the Share sheet on iOS + Android, confirm the message body reads
  cleanly in Messages, WhatsApp, and Mail.

Phase 2 backend integration:

- `POST /api/replay` (mirrors `/api/race-result`). Body: `{ code,
  courseId, timeSec, score, replay, events?, samples?, windDirDeg?,
  windSpeedKn? }`. TTL ~30 days.
- `GET /api/replay?code=...` returns the same payload.
- Add `/replay/code/[code].tsx` route that sources from the backend.
  The current local route stays for "watch my own".

Misc: the inline scrubber could move into the design-system `Slider`
with a horizontal "playback" preset; we hand-rolled it for now to keep
a bigger hit target. `formatFinishedAt` uses `toLocaleDateString('en')`
to stay format-stable across 7 langs - swap to `Intl.DateTimeFormat`
when product decides the date strip should localise.
