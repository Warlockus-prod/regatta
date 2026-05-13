# Sprint 10 Dev-B audit: Multiplayer skeleton (lobby + mock-ghost race)

Date: 2026-05-13
Branch: `app`
Lane: Mobile / Dev-B

PM round-1 audit flagged Multiplayer as a P0 v1 gap because the App
Store description mentions multiplayer but the screen was still a
PlaceholderScreen. This sprint ships a Multiplayer skeleton: the
lobby UI, a 4-char room-code generator, a mock client that simulates
2 ghost boats, and full Solo / Join / Host entry flows. The actual
multi-device WebSocket sync stays Phase-4 backend work; what we ship
is the UI shell so the user can practise the interaction and the App
Store description's multiplayer mention is no longer aspirational.

## Files touched (and only these)

Replaced:
- `mobile/app/multiplayer/index.tsx` (was a PlaceholderScreen, now a
  lobby with three tinted entry cards + Recent rooms list)

New:
- `mobile/app/multiplayer/host.tsx` - host screen with the big code,
  Copy / Share / Start.
- `mobile/app/multiplayer/join.tsx` - 4-cell code input, Paste,
  Clear, Join.
- `mobile/app/multiplayer/race/[code].tsx` - Skia race scene with the
  player + 2 mock ghosts, finish detection, Save / Try again /
  Leave room.
- `mobile/src/multiplayer/room-code.ts` - 4-char alphabet, generator,
  validator, normaliser, FNV-1a seed hash.
- `mobile/src/multiplayer/mock-client.ts` - `useMockRoom(code, opts)`
  hook returning 2 deterministic ghost boats at 30 Hz.
- `mobile/src/persistence/recent-rooms.ts` - `useRecentRooms` hook
  backed by `regatta.multiplayer.recent-rooms.v1` AsyncStorage row.
- `docs/design/mobile/audits/sprint10-dev-b.md` (this file).

Unchanged (per scope): every Dev-A / Dev-C area, simulator V1/V2/V3,
mobile/__tests__/* (see Test impact below), web src/, ASC metadata.

## Screen flow diagram

```
                      Home
                       |
                       v
                /multiplayer  (lobby)
               /      |        \
              /       |         \
             v        v          v
       /multiplayer  /multiplayer  /game
       /host         /join         (existing solo)
            \           |
             \          |
              v         v
        /multiplayer/race/[code]
                |
                v
           Result panel
            /     |       \
           v      v        v
         Save  Try again  Leave room -> /multiplayer
```

The lobby's "Recent rooms" list is parallel to the three entry cards
and routes directly to `/multiplayer/race/{code}` so the user can
rejoin without retyping. Tap-through saves the room as `role: 'join'`
in `useRecentRooms` automatically (see race screen `useEffect`).

## Part A: lobby (`mobile/app/multiplayer/index.tsx`)

Replaced the PlaceholderScreen with three tinted entry cards mirroring
the Home screen's "Where to start" pattern (cyan / success / warning):

| Card           | Accent  | Icon          | Route                |
|----------------|---------|---------------|----------------------|
| Host a race    | cyan    | `multiplayer` | `/multiplayer/host`  |
| Join a race    | success | `flag`        | `/multiplayer/join`  |
| Solo race      | warning | `bolt`        | `/game`              |

The intro paragraph is honest about the phase: it explicitly says
opponents are "practice ghosts" and "real network sync ships later".
This pre-empts an App Store reviewer flagging us for misleading
multiplayer claims; the user sees up front that this is the shell,
not the real product.

The "Recent rooms" list reads from `useRecentRooms`. EmptyState renders
when ready && rooms.length === 0; entries otherwise tap through to
`/multiplayer/race/{code}` so a user can rejoin without retyping.

## Part B: host (`mobile/app/multiplayer/host.tsx`)

- The code is generated ONCE per mount via `useMemo(generateRoomCode())`.
  Re-rendering does NOT roll a new code; the user only sees a fresh
  code if they back out and re-open the screen.
- Centered text-6xl-equivalent code (64 pt, letter-spacing 8) with a
  cyan accent kicker above it. Spoken accessibilityLabel splits the
  code into individual letters ("R O O M C O D E A B C D") so a
  VoiceOver user can dictate it on a call.
- Copy uses `Clipboard.setString(code)` (RN core, deprecated but still
  shipped; see follow-up #1). The button toggles to "Copied" for 2 sec.
- Share uses `Share.share({ message, title })` (RN core) so iOS shows
  the system sheet.
- "Start race" persists the code as `role: 'host'` and routes to the
  race screen.
- Cancel uses `router.back()`.

## Part C: join (`mobile/app/multiplayer/join.tsx`)

- 4 cells, each a 50pt square with its own `<TextInput maxLength={1}>`.
  Typing a character auto-advances to the next cell; backspace on an
  empty cell jumps to the previous cell and clears it.
- Every keystroke is run through `normaliseRoomCodeInput` so the user
  cannot land an excluded glyph in a cell - typing 'O' yields 'Q',
  typing 'i' yields 'J', etc. This means the validation and the
  user's perception line up: what they see is what is in the buffer.
- Paste button reads `Clipboard.getString()`, normalises, fills cells
  left to right. A paste of "AB-CD" still works (separator stripped).
- Clear button resets the cells and re-focuses the first.
- Join CTA is disabled until the buffer is `isValidRoomCode`. Pressing
  it persists `role: 'join'` then routes to the race screen.

## Part D: race screen (`mobile/app/multiplayer/race/[code].tsx`)

- Always uses the `short` course in v1 (par 75 sec). When the backend
  ships, the host's chosen course becomes a room-level setting.
- Player boat is `useSimLoop` with the start mark as the initial
  position; same setup as the solo Game screen.
- 2 ghost boats from `useMockRoom(code, { bounds, marks, phase })`.
  Rendered with their own `<SkiaYacht>` (smaller than the player at
  ~78% length) and a faint coloured halo so they are visually distinct
  from the player.
- Finish line + mark capture detection mirrors the solo Game screen
  (see `crossedFinishLine` from `src/game/course.ts`).
- HUD has 3 stats: place (1/3, 2/3, 3/3), distance to next mark,
  elapsed time. Distance is canvas px (acceptable for v1; the Phase
  6 audit will swap to "boat lengths" or meters once the engine
  exposes a real-world scale).
- Code pill top-right shows the room code in cyan with a "ROOM"
  kicker so the user always knows where they are.
- Result panel: "Nth place of M" + elapsed time + room code. Buttons
  Save / Try again / Leave room. Save mirrors Game's flow but
  intentionally drops the AI coach button - the coach is a solo
  feedback surface and the framing of "you placed Nth" against
  ghosts is confusing for it. Leave routes to `router.replace('/multiplayer')`
  so the back stack stays shallow.

### Player place computation

`liveProgress` is built every render from:
- player marks cleared + distance to current target (via the existing
  `marksRef` shape from solo Game),
- ghost progress from `ghostProgressFor(g, marks)` which infers
  marks-cleared from spatial position (a ghost south of the windward
  mark by more than its capture radius is treated as having rounded
  it).

`rankProgress` then sorts: finished participants first by finish
time ascending, in-progress by marksCleared desc then distance asc.
The HUD displays `myRank/totalRacers`. Final `finishPlace` is locked
in at the moment the player crosses the finish line so it stays
stable on the result panel.

This approach is good enough for the skeleton; it can be wrong at
the boundary if a ghost is INSIDE the windward mark capture radius
but has not yet been "cleared" by the mock client. Acceptable for
v1; the real backend will return true ranks instead.

## Part E: mock client (`mobile/src/multiplayer/mock-client.ts`)

### Determinism

Seed = `hashRoomCode(code)` where `hashRoomCode` is FNV-1a 32-bit.
PRNG = Mulberry32 (small, fast, well-distributed enough for two
ghosts; not cryptographic, not pretending to be).

That means the same code yields the same ghosts on every mount, and
two devices in the same code race the same field even though there
is no real sync. The "race" is independent on each device; you can
A/B compare lap times after the fact.

### Per-ghost schedule

For each of the two ghosts the seeded RNG produces:

| field             | range                               | rationale                                                  |
|-------------------|-------------------------------------|------------------------------------------------------------|
| `lateralOffsetPx` | ±(28..46), opposite sides of start  | so ghosts spawn on either side of the player, not on top   |
| `aimJitter`       | ~±10 deg around bearing to windward | so the two ghosts do not sail identical first-leg lines    |
| `baseSpeedKn`     | 4.6..5.6                            | competitive but beatable by a clean human player           |
| `speedPhaseRad`   | 0..2π                               | de-syncs the per-ghost ±0.6 kn 8-sec cycle                 |

### Per-tick motion (30 Hz)

1. Aim = bearing to current target mark + lateral-offset bias
   (decays as distance shrinks so the ghost actually reaches the
   capture radius instead of orbiting).
2. Heading turn clamped at 0.7 rad/sec (matches `useSimLoop`'s
   `DEFAULT_PARAMS.turnRate`) so the boat reads as turning, not
   teleporting.
3. Position integrated at `speedKn * KN_TO_PX_PER_S * DT`. Same
   `KN_TO_PX_PER_S = 6` constant the player loop uses.
4. World wraps at the canvas edges (matches player loop).
5. Per-ghost nav advances when the ghost is within capture radius of
   the current target mark.
6. Finish line crossing requires `cleared[1] === true` (windward
   rounded) AND `crossedFinishLine` returns true. Mirror of the
   player gate so the ghost never finishes by drifting back across
   the start line at the start.

### API shape

```ts
useMockRoom(code, { bounds, marks, phase }):
  { ghosts: GhostBoat[], tickN: number }

interface GhostBoat {
  id, x, y, headingRad, speedKn,
  nameLabel, color, finished, finishTimeSec
}
```

When the real Phase-4 WebSocket lands, the import in
`race/[code].tsx` swaps to `useRealRoom(code, opts)` which returns
the same object shape. The consumer side is unchanged. This is the
key reason the schedule + nav state lives inside the hook (and not
on the screen) - the screen is hook-agnostic.

## Part F: recent rooms persistence (`mobile/src/persistence/recent-rooms.ts`)

Mirrors the `useRaceHistory` pattern from `src/persistence/race-history.ts`
deliberately so a new screen author can read either file as the
template.

- Storage key: `regatta.multiplayer.recent-rooms.v1`.
- Cap: `MAX_RECENT_ROOMS = 5`.
- De-dupe by code (newest entry wins) so re-hosting the same room
  bumps the entry to the front rather than duplicating.
- Validates code via `isValidRoomCode` on read AND on push so a stale
  storage row from an alphabet change is filtered out automatically.

## Room-code algorithm + collision risk

Alphabet = 28 characters: `ABCDEFGHJKLMNPQRTUVWXYZ23467`.

Excluded glyphs:
- Letters: O (looks like 0 / Q), I (looks like 1 / l / J),
  S (looks like 5 / Z).
- Digits: 0 (O), 1 (I), 5 (S), 8 (B), 9 (g/q).

That gives `28^4 = 614_656` distinct codes. With at most ~5 rooms
per device cached, in-app collisions are not a meaningful concern
even at very high install counts. Collisions on the SERVER side will
be a Phase-4 problem - until then the code is the room id, so two
hosts who roll the same code land in the same mock room (which is
the intended behaviour: rejoin via the recent list works the same way).

`normaliseRoomCodeInput(raw)` is the trust boundary for any input
that did not come from `generateRoomCode()`. It uppercases, strips
spaces / dashes / underscores, swaps known visual lookalikes (O->Q,
I/L->J, S->Z, 8->B, 9->6), then filters down to the alphabet. The
join screen runs every keystroke through it so the user cannot
accidentally land an invalid character in a cell.

`hashRoomCode(code)` is FNV-1a 32-bit. Cheap, stable across JS
runtimes, good enough for ghost-boat seeding. The Mulberry32 PRNG
on top of the FNV seed gives a well-distributed sequence for the
two ghosts' speed / heading / offset jitter.

## Mock-client physics decisions

1. **30 Hz tick to match the player loop.** Anything slower
   (e.g. 10 Hz) would visibly skip on the canvas next to the
   smooth player boat. 30 Hz is also what the real-WS client will
   target so the swap is one for one.

2. **Same `KN_TO_PX_PER_S = 6` calibration as `useSimLoop`.** Means
   ghost speed reads visually consistent with the player. If the
   sim loop changes its calibration, the mock should follow;
   centralised constant left as a follow-up (see #3 below).

3. **Ghosts cap at ~5.6 kn.** A clean upwind player can hit ~6.5 kn
   in the VPP, so the ghosts are beatable but not obviously slow.
   A lazy player (sloppy steering, ignoring no-go) will lose to
   either ghost, which is the intended challenge level for v1.

4. **No real wind interaction.** Ghosts ignore the wind direction
   and just steer toward the next mark. We considered making the
   ghost respect the no-go zone with a fake tack, but the visual
   complexity is not worth it before real WS lands. The current
   model reads as "another boat moving roughly the same way as
   you", which is enough.

5. **Single course (`short`).** Hard-coded for v1 to keep the race
   snappy. When the backend ships, course selection becomes a
   room-level setting on the host screen.

## Test impact

Two existing tests in `mobile/__tests__/screens/placeholder-screens.test.tsx`
break because they assert against the OLD Multiplayer placeholder:

- "Multiplayer renders the title + Phase 4 badge in EN" - asserts
  `view.getByText('Phase 4')`. There is no Phase 4 badge in the new
  lobby; the lobby is intentionally NOT a placeholder anymore.
- "honors the persisted lang on placeholder screens (PL)" - asserts
  `view.getByText(/Wyscigi/)` which was the placeholder's PL note.
  The new lobby uses different copy (e.g. "Wyscigi" no longer
  matches; the closest copy is "Stworz wyscig").

The Leaderboard test in the same suite still passes (Leaderboard
remains a placeholder).

Per scope I cannot modify `mobile/__tests__/*`; this is a known
break that needs PM coordination. Two viable resolutions:

1. **Move Multiplayer out of the placeholder suite.** Easiest. Drop
   the two failing cases, leave the Leaderboard one. Optionally add
   a thin smoke test in a new `__tests__/screens/multiplayer.test.tsx`
   asserting the "Host a race" / "Join a race" buttons render.
2. **Update the assertions.** Replace "Phase 4" with "Host a race"
   and `/Wyscigi/` with `/Stworz wyscig/`. Loses the original
   intent (the test was specifically guarding the placeholder shape).

Same shape as the Sprint 9 Dev-B follow-up where Game graduating
from placeholder broke its corresponding assertion. Sprint-9 Dev-B
called out the same issue and left it for Dev-A; Sprint 10 Dev-B
follows the same protocol.

Otherwise:

```
cd mobile && npm run check
- sync-content:check ok
- lint: 0 warnings, 0 errors
- typecheck: 0 errors
- jest: 19 of 20 suites pass (100 of 102 tests). Only failures are
  the 2 pre-flagged placeholder-screens cases noted above. All
  other suites including bootcamp-detail, anatomy, glossary,
  rules-detail, settings, home, courses, racing, gallery,
  i18n-context, simulator-tick, version-consistency etc. pass green.
```

## Follow-ups for Phase-4 backend work

1. **Swap `useMockRoom` for a real-WS hook.** API contract:
   ```ts
   useRealRoom(code, opts): { ghosts: GhostBoat[], tickN: number }
   ```
   The screen consumes these fields exclusively, so the swap is
   one import line in `race/[code].tsx`. The real client should
   keep the same `GhostBoat` shape (id, x, y, headingRad, speedKn,
   nameLabel, color, finished, finishTimeSec).
2. **Server-issued codes.** Move `generateRoomCode()` to a backend
   call; keep the local helper as an offline-fallback. Keep the
   `isValidRoomCode` validator client-side as a cheap UI guard.
3. **True ranking from server.** Drop `ghostProgressFor` heuristics
   and read rank from the server payload directly. The "marksCleared
   from spatial position" hack is fine for ghost boats but will lie
   at the boundary against real human boats.
4. **Course-as-room-setting.** Today the race screen hard-codes
   `findCourse('short')`. Lift that to a host-screen course picker;
   stash on the room state; the join screen reads it and passes it
   to the race screen as a query param.
5. **Replay save shape.** Multiplayer races currently save with
   `score: 0` because `scoreCourse(time, par)` no longer makes sense
   when the player is being graded against ghosts, not par. Phase 4
   should add a `placement` field to `RaceRecord` so the history
   screen can render "1/3" for multiplayer rows; the audit prefers
   keeping the existing `score` semantics for solo unchanged.

## Follow-ups for QA

1. **Determinism check.** Open `/multiplayer/host`, take down the
   code, exit. Open the screen again and use Join with the SAME
   code - should yield the SAME 2 ghosts on the same start
   positions. (Cross-device check needs another device with the
   code typed in: same ghosts there too. We have no automated test
   for this; manual check is the v1 plan.)
2. **Code paste.** Try pasting "AB-CD" / "ab cd" / "OICDS" into
   the Join cells - should land the normalised "ABCD" / "ABCD" /
   "QJCDZ" respectively. The first two should validate; the last
   should validate too (5 letters of which 4 are alphabet, but the
   normaliser caps at ROOM_CODE_LENGTH so only the first 4 land).
3. **Recent-rooms cap + dedupe.** Host > start > leave > host >
   start > leave 6 times. Recent list should show 5 entries, no
   duplicates.
4. **Result panel place.** Sail upwind cleanly: should finish
   1/3. Sail badly (let ghosts pass, drift below windward without
   rounding): should finish 3/3. Mid-pack run: 2/3.
5. **Leave room flow.** Result panel "Leave room" should land back
   on `/multiplayer` with the just-played room at the top of the
   recent list (because the race screen pushed it on mount).
6. **Try again resets ghosts deterministically.** The same code
   should produce the same ghost positions / heading at countdown
   end. The reset path goes through `setMarks(fresh)` which causes
   `useMockRoom` to re-seed (mark-array reference changes); verify
   the new ghosts spawn on the same lateral offsets the previous
   run did.
7. **No misleading copy.** The "Practice ghosts" subtitle must
   render in every supported language. Spot-check RU / EN / PL /
   ES / FR / DE / IT - all present in the `tp(...)` call site.
8. **Clipboard deprecation warning.** RN core's Clipboard logs a
   deprecation warning the first time it is used. Acceptable for
   v1; if the warning bothers the App Store reviewer, swap for
   `@react-native-clipboard/clipboard` (one new dep).

## Notes for the next planner

- `mock-client.ts` is the natural seam for the real-WS hook; the
  `useMockRoom` signature was designed so the swap is mechanical.
  Keep the `phase` argument (countdown / racing / finished) - the
  real client also benefits from knowing when to ignore inbound
  messages vs apply them.
- `room-code.ts` is reusable on web if we ever ship cross-platform
  multiplayer (room-code share via deep link from the iOS app to a
  web join page, etc.). The alphabet was picked for visual
  unambiguity on phone screens; it works for desktop too.
- `useRecentRooms` follows the `useRaceHistory` shape exactly so
  if/when both move into a shared `@regatta/persistence` package
  the API stays uniform.
