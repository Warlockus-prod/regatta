# M5 steps 7-12: the metric race by default (plan)

Status: plan of record for package 14 of `docs/BACKLOG.md` and the remaining
steps of ADR-0015 (`DECISIONS.md`). Steps 1-6 are done (commit `dcc48931`).
This file is the readable copy of the final M5 design (it lived only in a
session scratchpad as `m5-design.json`, `final.steps[6..11]`); the owner's
answers to its open questions are recorded in ADR-0015, "Owner decisions
(2026-11-01)". Line numbers below are from the design's base (`e64659ac`) and
drift; search for the named symbol.

Base rule for every step: work in the worktree of branch `claude/app-next`
(paths `/Users/Andrey/App/all/regatta/src/...` point at the main checkout).
`PHYSICAL_RACE_EMISSION_ENABLED` stays `false` and
`PHYSICAL_RACE_DEFAULT_PROFILE` stays `null` until steps 11 and 12, each only
after the owner's explicit "yes". The legacy race (`CLASSIC_BOAT`, ADR-0021)
stays bit for bit. No engine constants (`src/lib/sailing-physics/*`).

| Step | Title | Depends on | Ships |
|---|---|---|---|
| m5-07 | Every record producer keys on the race context; ghost decimation, no medal eviction, M4 features for metric | m5-01..06 | code, flag off |
| m5-08 | Leaderboard course filter, frozen archive, quick online race board and label, metric finish floor | m5-01 | server part on prod before switch A (package 22) |
| m5-09 | Wake, foam, trail, camera and replay speed at real speed for metric races | m5-07 | code |
| m5-10 | Metric medal thresholds (revision 3), never-lower migration, classic line, measured course durations | m5-03..05, package 6 | code |
| m5-11 | Switch A: enable metric emission while the legacy race stays the default | m5-01..10, prod deploy of m5-08 | site + TestFlight with consent |
| m5-12 | Switch B: metric short race by default, course picker, archive cutover, acceptance | m5-11, iPhone acceptance | site + TestFlight with consent |

## m5-07. Every record producer keys on the race context

Goal: remove the hard-coded legacy class from the producers, so switch A is
one constant, and make the stores ready for metric rows without losing
anything earned. The flag stays false. Tests inject it true with
`vi.mock('@/lib/race-context')` (or an equivalent module mock), never a
production override.

What:
- `src/lib/race-context.ts`: `raceRecordsEnabled(context)` = the context is
  legacy, or `PHYSICAL_RACE_EMISSION_ENABLED` (with a test).
- `src/app/game/useRaceLoop.ts`:
  - a race context ref (`LEGACY_RACE_CONTEXT` or `physicalRaceContext(profile)`), frozen at the countdown;
  - the ghost class key, the medal course and the native PB comparison read that ref instead of the literal;
  - the `!physical` record gates use `raceRecordsEnabled`;
  - ghost splits, the race home row, the practice return and the skill bars work for the metric race.
- `src/app/game/GameClient.tsx`:
  - `saveResult`: the metric payload is `{ raceContext, mode, course, rawFinishTimeSec, penaltySeconds }`; missions and the daily race stay legacy and unclassified;
  - the ghost lookup, the medal course and the funnel use the context;
  - the record early returns (`physicalRef`) use the helper;
  - the replay POST sends `raceContext` and keeps mode and penalty (`/api/replay` already validates physical samples);
  - the native snapshot carries `raceContext` (`validateNativeRace` already accepts it).
- Funnel events carry `raceClass`; the field goes into `src/lib/analytics-events.ts` first, with a test (unlisted fields are dropped silently).
- `src/lib/race-ghost.ts`:
  - `makeGhostTrack` decimates evenly by time to at most `GHOST_MAX_SAMPLES`, keeping the first and the last sample, instead of returning null; mark times stay exact in `marks`;
  - `rememberGhost` evicts first the classes the current build cannot play (an `isPlayable` predicate; before switch B nothing changes, so the order stays oldest first);
  - never change `GHOST_MAX_SAMPLES` 1600, `GHOST_MAX_CLASSES` 24 or `GHOST_STORE_MAX_CHARS` 480000: installed validators enforce them.
- `src/lib/race-medals.ts`:
  - `awardRaceMedal` never evicts an earned medal: a new course on a store that already has `MAX_COURSES`, or a row past `MEDAL_STORE_MAX_CHARS`, returns the award with `saved: false` and the store unchanged;
  - `parseMedalStore` keeps the valid entries in order without slicing earned ones away (the cap is on write) and never writes on read;
  - the key stays `class|difficulty|wind` (no mode).
- `src/lib/race-skill-metrics.ts` `SKILL_BAR_SCALE` gets a metric row marked provisional: M0-13 measured a metric tack loss of about 1.4 kn, so the legacy `goodKn` 0.8 would mark every clean tack bad.
- `src/app/game/RaceReplay.tsx` and `src/app/r/[code]/ReplayViewer.tsx` pass `raceProfile` from the replay's stored `raceContext` (`readReplayRecordContext`) to `RaceScene`.

Done when (contract): with the flag false, a `?race=` trial writes no row of
any kind (as at HEAD) and a legacy race writes exactly the HEAD rows. With the
flag mocked true, a finished metric race writes best times `ctx:...`, the
ghost `physical-cruiser-v1:short:r1|simple|...`, the home row, the classified
POST with the physical course, the replay POST with `raceContext` and the
native snapshot with `raceContext`. Every written row passes
`parseRaceStorageEntries` and the frozen build 74 parsers (m5-01) without
dropping entries.

Tests: the `useRaceLoop` ghost, medals and summary tests and the `GameClient`
ghost, medals and setup tests for both flag states, plus:
- `race-ghost.test`: a 1300 s track gives at most 1600 samples, the finish is kept, the pose error is at most 2 m at any t, the eviction order;
- `race-medals.test`: the 65th course is refused with `saved: false` and nothing evicted; the character cap is respected;
- the m5-01 compat test for the new rows;
- the metric replay renders with its profile;
- mobile jest: `race-native` and `race-record-presentation` with a metric snapshot under the mocked flag.

Mutation checks: keep `LEGACY_RACE_CONTEXT` for the medal course -> the metric
medal key test goes red; re-enable eviction -> "earned medal never evicted"
goes red; `raceRecordsEnabled` returns true -> the flag-off trial test goes
red; truncate instead of decimate -> "finish kept" goes red.

Gates: tsc, vitest, test:api, `cd mobile && npx jest`, check:dash,
check:map. Docs: `ARCHITECTURE.md` producer table,
`docs/design/mobile/ARCHITECTURE.md` bridge note. CHANGELOG Unreleased: long
races keep a ghost; a full medal shelf never loses a medal.

Risk: high data risk. This is where a record could land in the wrong class or
an earned medal or ghost could be evicted. The player-visible change before
switch A is limited to ghost decimation, the eviction order and the refused,
not evicted, medal; all guarded by frozen-parser rollback tests. Many call
sites in GameClient are also touched by the parallel race UI work.

## m5-08. Leaderboard course filter, frozen archive, quick online race board

Goal: the leaderboard part of decision 12, non-destructive. Shared-lane files
(`src/app/api/*`, `src/lib/db.ts`, `ws-server`, the catalog). The server part
reaches prod before any client emits metric rows, and the site deploy needs
the owner's explicit consent (package 22).

What:
- `src/app/leaderboard/leaderboard-model.ts`, `LeaderboardTable.tsx`, `page.tsx`, `leaderboard-copy.ts`:
  - the selection gets a course, `short | medium | long | classic`, times mode Simple or Pro, times difficulty, times wind;
  - metric boards use `raceClass=physical-cruiser-v1:<profile>:r1` (`topByRaceClass` already serves physical classes);
  - "Классическая трасса" is the legacy classified boards (read only);
  - the unclassified pool becomes a collapsed "Архив: режим не записан" section;
  - the default course is classic until switch B, then short (read the default profile from `race-context`).
- New `src/lib/race-archive.ts`: `RACE_ARCHIVE_CUTOVER_MS` (null until switch B).
- `src/lib/db.ts`: an optional `beforeTs` for the archive (a dedicated archive query). `/api/leaderboard?difficulty&wind` without new parameters returns exactly the m5-01 snapshot: App Store 1.6.4 and TestFlight 74 call it (`mobile/src/api/leaderboard.ts`).
- Online board:
  - `race_source TEXT` through the existing additive `safeAlter` pattern;
  - `/api/race-result` accepts `source === 'online'` only for unclassified rows without `raceContext` or `missionId` and stores it; anything else is rejected or ignored, never trusted for class;
  - `ws-server/limits.js` `buildRaceResultBody` adds `source: 'online'`;
  - a new `topOnline(difficulty, wind)`; the archive query excludes `race_source = 'online'`;
  - secure-by-default: the field is display grouping only and confers no authority the open endpoint does not already give. No secret; an internal token is a separate owner decision.
- No UPDATE or DELETE on `race_results` anywhere (a grep test over `src` and `ws-server`).
- `src/lib/race-result-eligibility.ts`: a per-class finish floor. Legacy keeps `FINISH_SEC_MIN` 20 (`src/lib/race-submission.ts`). Metric floor = floor(2 x legMetres / (8 kn x 0.514444)), as the fleet test bound (short about 58 s).
- Multiplayer label:
  - `src/lib/product/catalog.ts` multiplayer title "Быстрая онлайн-гонка" / "Quick online race" / "Szybkie regaty online" / "Regata rápida en línea" / "Course rapide en ligne" / "Schnelles Online-Rennen" / "Regata veloce online" (checked against `scripts/sailing-glossary.md`, adapted rather than translated); the detail line about rooms and invitation codes stays;
  - the lobby headings and the leaderboard online list use the same words;
  - the id stays `multiplayer` (`quick` is the 15-minute refresher);
  - the app hub reads the catalog; if it has its own copy, a separate mobile-lane commit.

Done when (contract): a metric result never appears in a classic, archive or
online list, and the reverse; an unclassified row never appears in a metric
list; Simple and Pro never share a table; the old endpoint is byte-identical
to the snapshot; the archive never shows rows with `ts >= cutover`; a metric
board is empty but valid while emission is off.

Tests:
- `leaderboard.test.tsx`: course, mode, difficulty and wind URLs, the archive collapsed by default, the online list;
- `api/leaderboard/route.test.ts`: archive parameter validation, the old query unchanged;
- `api/race-result/route.test.ts`: a ws fixture body with source online goes through the real route; source with `raceContext` is rejected;
- `db.race-archive.test.ts`: the cutover and the online isolation;
- `race-result-eligibility.test.ts`: the metric floor;
- the no-mutation grep test;
- `node scripts/cyrillic-scan.mjs` on `/leaderboard` and `/multiplayer`.

Mutation checks: remove the cutover predicate -> the archive test goes red;
apply the metric floor to legacy -> the 20 s test goes red; change the
`topByDifficulty` SQL -> the snapshot goes red; drop `race_source` from the
archive exclusion -> the online isolation goes red.

Browser (D5): `/leaderboard` and `/multiplayer` at 390 px and desktop. Gates:
tsc, build, test:api, vitest, test:multiplayer, check:dash, check:map. Docs:
`docs/I18N_AUDIT.md` if coverage changes. CHANGELOG Unreleased (the
leaderboard picks course and mode, older mixed results in an archive,
multiplayer is the quick online race). Offer the language adaptation pass.

Risk: medium. The old app's global board and external `/leaderboard` links
must keep working; the archive is a view, not a migration. The ws-server and
DB changes need a prod deploy with consent before switch A or B. Forged
unclassified posts stay possible (open endpoint, as today).

## m5-09. Wake, foam, trail, camera and replay speed at real speed

Goal: the 3D race looks right at 5-6 kn real speed. A scene and UI commit
separate from physics (D2: no colour polish).

What:
- `src/features/race-3d/pose.ts`: `racePose(boat, windDir, turnRate, scale)` with `speedKn = boat.speed x scale.visualSpeedup`. Callers:
  - `src/features/race-3d/Race3DView.tsx` (`useBoatPose`; `RaceScene` uses it for the player): the path that feeds wake and foam (`simulator-3d/ocean/Wake.tsx`);
  - `src/features/race-scene/RaceScene.tsx` (the camera pose only).
  Both get the scale from `raceProfile`. Rival hulls already pass raw speed; keep them consistent with the player per model.
- `src/features/race-scene/trail.ts` (`TRAIL_LIFE` 14, 90 points x 1.5 m, spread 0.55): per-model wake profiles as data, `RACE_WAKE = { legacy: HEAD values, metric: { life: 40, step: 1.0, points: 110, spread: 0.2 } }`. At 5 kn the metric wake is about 36 m today; the profile gives about 100 m with the same half-width at full age. `pushTrail` and `buildRibbon` take the profile and `SailingEnvironment` passes it. The low quality profile keeps a shorter metric trail.
- `src/features/race-scene/camera.ts` `tacticalPose` (150 / 165 m): a per-model range, metric about 90 m portrait and 100 m landscape, so the 120 m short beat fits. Keep it only if the browser check confirms; record the decision. Orbit and stern presets unchanged; `CHASE_FOLLOW_TAU` unchanged unless the check shows a problem.
- `effects.ts` `SPRAY_SPEED_KN` already reads real knots (`BowSpray`): no change, add a test.
- Waves (`materials.ts`, `sampleWave`) are world-space, unchanged; verify in the browser.
- `src/lib/race-replay-teaching.ts` `REPLAY_SPEEDS` [0.5, 1, 2, 4] gains 8 for metric replays only.
- Replays from m5-07 pass `raceProfile`, so a legacy replay renders exactly as today.

Done when (contract): in the metric race every scene effect that depends on
boat speed receives real knots and the wake covers the water crossed in the
last 40 s, while the legacy race and legacy replays render exactly as before.

Tests: `pose.test` (metric `speedKn === boat.speed`, legacy 9.33x, the default
keeps legacy); `trail.test` (the metric trail at 5 kn after 60 s spans
95-110 m and its oldest point is at most 40 s old; legacy arrays byte-identical
to a fixture); a camera test (metric range, legacy unchanged); a spray test at
real 5 kn; the replay speed list per model; the `RaceReplay` controls and
jump tests with a legacy replay unchanged.

Mutation checks: `VISUAL_SPEEDUP` hard-coded for metric -> pose red; the
legacy wake profile for metric -> span red; the metric scale for a legacy
replay -> replay golden red.

Browser (D5): `/game?race=short` and a legacy replay at 390 px and 1440,
high and low quality profiles, orbit, stern and tactical cameras; screenshots
into `docs/design/game-graphics/`; FPS with `?fps=1`. Gates: tsc, vitest
`src/features`, build, `node scripts/check-bundle-size.mjs` (6.6 MB, never
raise), `npx playwright test e2e/replay.spec.ts` on a production build.
CHANGELOG Unreleased: the metric race wake and camera at real speed.

Risk: low data risk, medium visual and performance risk. A slower-looking boat
may read as "not moving"; longer trails cost GPU on iPhone. Legacy replay
fidelity is the key invariant. The wake numbers are geometric estimates, so
the browser pass may retune them (data only).

## m5-10. Metric medal thresholds (revision 3), never-lower migration, classic line, durations

Goal: M4-5 recomputed for the metric classes after the physics is final
(m5-03..m5-05, package 6). Nothing earned ever shows lower. The briefing gets
honest course durations.

What:
- `src/data/race-medals.ts`:
  - `MEDAL_THRESHOLDS_REVISION` 2 -> 3. `MEDAL_BRONZE_LIMIT_SEC` (300) becomes a per-class bronze: legacy rows keep 300 and stay byte-identical, metric bronze = `physicalCourseDefinition(profile).maxRaceSeconds`;
  - rows for `physical-cruiser-v1:short|medium|long:r1` x easy / medium / hard x light / medium / heavy by the M4-5 method: bots via `stepPhysicalRaceFleet` with the shipped crew, fair start, `soloRaceWind`, 3 s countdown, the same 5 fixed spreads. Gold = median of the fastest bot; silver = median of the slowest race-pace bot (at most 1.3x the winner, finished); a harder fleet is never easier;
  - rewrite the file header (it says the metric class has no rows and no migration exists).
- New `src/data/race-course-durations.ts`: `RACE_COURSE_DURATIONS[profile][wind] = { botMedianSec, playerEstimateSec }` plus `formatCourseDuration(sec)` (rounded minutes with "~"), measured with the same harness, for the briefing chips of m5-12.
- `src/lib/race-medals.ts`: no cross-class floor written anywhere. A new pure `classicMedalFor(store, course)` returns the legacy entry's medal for the same difficulty and wind, for display only; never passed as `previous` to `awardRaceMedal`, never stored in a metric entry.
- Display:
  - `src/app/game/RaceMedal.tsx` and the race menu badge show the metric medal plus a "Классическая трасса: <medal>" line when a legacy medal exists;
  - medal totals in `src/lib/race-next-step.ts` / `RaceNextStep.tsx` count metric plus classic, so they never drop after switch B;
  - `mobile/src/navigation/RaceHubMedal.tsx` (hard-codes `LEGACY_RACE_CONTEXT`): the free and learn presets use the active default context (legacy until switch B), missions stay legacy; mobile-lane commit;
  - copy via `tl()` in 7 languages (`src/data/race-medal-copy.ts`).
- Runtime: the threshold sail-off runs short and medium in the default run and long behind `RACE_GATE_LONG=1` (documented in the AGENTS.md test list).

Done when (contract): after the revision bump no stored medal displays lower;
legacy times never grade a metric course; every metric gold equals the
measured median and requires no hints; a class without rows awards nothing.

Tests: `src/data/race-medals.test.ts` re-sails the metric bots and fails on
any drift, gold < silver < bronze per course, harder never easier; the course
durations test fails on more than 3 s drift; a new
`src/lib/race-medals.migration.test.ts` over a corpus (rev 1 and 2 legacy
entries, synthetic rev 3 metric entries, `bestSec` exactly on a threshold,
`bestNoHintsSec` null, a stored medal higher than its evidence) asserts
`entryMedal(entry, rev3) >= entryMedal(entry, rev2) >= entry.medal` for every
entry and that reads never rewrite the row; a property test (displayed course
medal >= max(classic, earned) presentation-wise, and the stored metric entry
never holds a medal without metric evidence); rows written pass the frozen
build 74 `isMedalStoreText`; `RaceMedal` and `RaceNextStep` render tests;
mobile jest for `RaceHubMedal`.

Mutation checks: `entryMedal` returns only the regraded medal -> invariant
red; metric bronze 300 -> a 400 s short finish loses bronze, red; metric gold
+1 -> data test red; the classic medal fed as previous into `awardRaceMedal`
-> "no metric medal without metric evidence" red.

Gates: tsc, vitest, `cd mobile && npm run check`, check:dash, check:map.
CHANGELOG Unreleased, `docs/STATUS.md`.

Risk: medium. The thresholds come from bots, not people (M1-8 data missing),
and will need revision 4 after M6; slow sail-off tests; the hub count switch
is where players may perceive a loss if the classic line is missing.

## m5-11. Switch A: metric emission on, the legacy race stays the default

Goal: `PHYSICAL_RACE_EMISSION_ENABLED = true` in one reversible commit. Only
`?race=` writes metric records; players who never open the trial see no
change.

Preconditions (green and recorded in `docs/STATUS.md`): m5-01..m5-10 merged
into `claude/app-next`; the human gate green for short and medium, and long
with `RACE_GATE_LONG=1`; bot fleets with zero contacts under `windAt` and
`soloRaceWind`; the m5-08 server side on prod (owner consent).

What:
- `src/lib/race-context.ts`: the flag -> true.
- Flip the pins in `src/lib/race-physical-motion.test.ts` and `mobile/__tests__/race-record-presentation.test.ts`.
- `mobile/src/persistence/race-native.ts` now accepts physical free-race snapshots; physical daily and missions stay rejected.
- `/api/replay` and `/api/race-result` accept physical rows.
- A rollback test (must exist before merge): mock the flag back to false. A legacy race write and a read of every store containing physical rows keep the physical rows byte for byte. Physical leaderboard and replay rows stay in the DB, and a GET of a physical replay returns the HEAD "disabled" answer without deleting anything.
- Decide by the owner answer whether first-race hints apply to the trial (default: yes, per device and harmless).
- Rebuild the offline race package (`npm run build:sailing-offline`); `npm run build:sailing-offline:check` and `cd mobile && npm run check` green.

Done when (contract): switch A alone changes nothing for players who never
open `?race=`; a finished trial race writes rows only in its own class with
its mode; reverting the flag keeps every metric row.

Verification: the full local gate from AGENTS.md, the cyrillic scan, and a new
`e2e/race-metric-finish.spec.ts` that sails `/game?race=short` to a real
finish with course assist at 390x844 and checks that the save request carries
`raceContext` and mode and that the results show all bots. Mutation: flag
false -> the e2e save assertion red; flag flipped in the rollback test ->
preservation still holds.

Release: site deploy and TestFlight only with the owner's explicit consent,
through G1-G5 (`docs/design/mobile/RELEASE_CHECKLIST.md`), delivery to Self
confirmed by a live ASC GET. Docs: AGENTS.md "Current completion work" flag
line, `ARCHITECTURE.md`, CHANGELOG Unreleased, `docs/design/mobile/BUILDS.md`.

Risk: medium. The first public metric records appear (trial only). Any later
time-changing physics change then needs a class revision (M6). The app needs a
new build because the native validators are compiled in.

## m5-12. Switch B: the metric short race by default

Goal: the metric race becomes the race, in one revertable commit. Rollback =
`PHYSICAL_RACE_DEFAULT_PROFILE = null`, with every metric record intact.

What:
- `src/lib/race-context.ts`: `PHYSICAL_RACE_DEFAULT_PROFILE: PhysicalRaceProfile | null = 'short'`.
- `GameClient.tsx` `initRace`: free solo races use `readPhysicalTrial(search) ?? PHYSICAL_RACE_DEFAULT_PROFILE`; `src/lib/race-trial.ts` keeps `?race=` as a profile deep link. Missions and `?daily=` stay legacy and are labelled "классическая" in the menu. The lesson 8 race (preset learn) becomes metric short, easy, medium wind.
- The physical fleet module becomes eager for solo: `node scripts/check-bundle-size.mjs` stays under 6.6 MB without raising the budget (pay with removals if needed).
- `RaceBriefing.tsx` and `GameMenu`: three course chips with durations from `src/data/race-course-durations.ts` for the chosen wind ("Короткая ~4 мин"). `PhysicalTrialNote` is replaced by a one-time "what changed" note: real speed like the Sail trim trainer; old times and medals stay under Классическая трасса; your medal stays. The note is stored per device in `regatta.race.whats-new.v1`, the course choice in `regatta.race.course.v1`; BOTH join `RACE_WEB_STORAGE_KEYS` in the same build (the m5-01 static test enforces it; otherwise the bridge drops the writes and the note returns on every app launch). All via `tl()` in 7 languages.
- Mobile: `mobile/src/navigation/race-setup.ts` passes `race=<profile>`; `RaceSetupPanel` gets the course choice; the hub medal course is the metric default.
- Resume: a legacy `regatta.race-resume.v1` intent without context resumes as a legacy setup only while fresh (under 30 min); otherwise a new metric setup. It is never reinterpreted as metric mid-setup.
- `src/lib/race-archive.ts` `RACE_ARCHIVE_CUTOVER_MS` = the deploy time; the leaderboard default course short.
- Ghost eviction predicate: legacy free-race classes (mission `-`) become non-playable and are evicted first; mission ghosts stay playable.
- Docs in the same commit: ADR-0015 status line, AGENTS.md "Current completion work", `ARCHITECTURE.md` flows, `docs/STATUS.md`, CHANGELOG Unreleased in plain words (the solo race sails at real speed; old times and medals are under Classic course; older mixed results are archived; multiplayer is the quick online race), `docs/design/mobile/BUILDS.md`, roadmap M5 rows.

Done when (contract): a fresh visitor's first solo race is metric short. Its
finish is saved only under the metric class with its mode. Every legacy
record, ghost, medal and replay still opens unchanged, and displayed medal
totals do not drop.

Verification: the full local gate plus the metric e2e on the default `/game`
at 390x844 (results table, "~" rows when leaving early, the medal line with
classic, a leaderboard row in the short Simple table); cyrillic scan 0; by
hand in RU, PL and EN, light and dark, 390x844 and 1440 (start, contact with a
bot with its cue and judge item, the stuck hint never shown in 5 normal races,
finish, leaderboard filters, archive); iPhone via TestFlight to Self (consent,
G1-G5): an update over 74 with AsyncStorage seeded from the m5-01 fixtures
keeps medals, ghosts and PBs; the note shows once; race length, wake, sound
and haptics; `race.perf` p5 for a long race on Hard. Mutation: default
profile null -> the "first race is metric" e2e red; drop
`regatta.race.course.v1` from the allowlist -> the static test red. Offer the
language adaptation pass.

Risk: the highest release risk. Races take 2-4x longer and every board
restarts for the free race. Site and app must ship the same reader and
producer contract (the installed app keeps its bundled offline package). Site
deploy and TestFlight only with the owner's consent. The bundle budget may
break when the physical fleet becomes eager.

## Findings the steps rely on (verified at the design base)

- The flag is pinned false by `src/lib/race-physical-motion.test.ts` and `mobile/__tests__/race-record-presentation.test.ts`; it gates `src/app/api/replay/route.ts` and `src/lib/race-result-eligibility.ts`.
- `src/lib/race-medals.ts`: key `class|difficulty|wind` (no mode), `MAX_COURSES` 64, `MEDAL_STORE_MAX_CHARS` 16000; `entryMedal` never returns below `entry.medal`; `parseMedalStore` sliced to the last 64; `awardRaceMedal` stores `better(previous, earned)` and evicted the oldest courses past 64. Passing any floor as `previous` would persist it, so a legacy-to-metric floor must be display-only.
- `src/lib/race-ghost.ts`: 1600 samples, 24 classes, 480000 characters; `makeGhostTrack` returned null past 1600 samples (no decimation); `rememberGhost` evicts the least recently improved other classes by count and size.
- `mobile/src/persistence/race-web-storage.ts` `RACE_WEB_STORAGE_KEYS`: `parseRaceStorageEntries` rejects a message with any unknown key or an invalid ghost, medal or home row, and the injected bridge ignores writes of unlisted keys. A new race storage key must join in the same build.
- `mobile/src/persistence/race-native.ts` rejects physical daily and mission snapshots; `race-result-eligibility.ts` rejects classified rows with a mission or a daily day. Missions and the daily race cannot move to metric records without explicit schema and version work.
- `mobile/src/navigation/RaceHubMedal.tsx` hard-codes `LEGACY_RACE_CONTEXT` for the free, learn and mission presets.
- `mobile/src/api/leaderboard.ts`: old apps call `/api/leaderboard?difficulty&wind` (the unclassified pool); that answer must stay unchanged.
- `src/lib/race-submission.ts` `FINISH_SEC_MIN` 20, `FINISH_SEC_MAX` 7200; eligibility caps `rawFinishTimeSec` at 3600.
- `src/lib/product/catalog.ts`: id `quick` is the 15-minute refresher; the multiplayer title was "Гонка с друзьями" / "Race with friends".
- `src/lib/race-replay-teaching.ts` `REPLAY_SPEEDS` [0.5, 1, 2, 4]; `src/features/race-scene/trail.ts` `TRAIL_LIFE` 14; `src/lib/race-skill-metrics.ts` `SKILL_BAR_SCALE` tuned for the legacy tack loss.

## Open questions and the owner's answers

The design asked seven questions; the owner answered them on 2026-11-01
(ADR-0015, "Owner decisions"). Recommendation first, the answer after it.

1. Default course length: keep the existing short profile (120 m leg) for every level, about 4.5 min at medium wind and 6.5 min in light wind against about 1.5 min today, or add a shorter "sprint" class first? Answer: the existing short course, no new geometry.
2. Emission timing against M6: enable metric records in M5 (switch A) at class r1, then M6 publishes r2 with fresh boards and medal rows and r1 boards become read-only; or hold switch A until the M6 tack-cost ADR. Answer: switch A in M5 at r1.
3. Missions and the daily race: stay on the classic model through M5, labelled "классическая", with their own boards and legacy medals (metric versions are a separate ADR with the M6 challenge ladder). Answer: confirmed.
4. Classic medals: not carried into metric entries but shown beside the metric medal as "Классическая трасса" for the same level and wind, so totals never drop (the alternative, a read-time floor, looks like an earned metric medal). Answer: shown beside, nothing lowered.
5. Online results board: a display-only `source='online'` tag set by ws-server on the same open endpoint plus a "Быстрая онлайн-гонка" list (needs a ws-server change and a prod deploy before switch A), or leave multiplayer rows in the archive; an internal token later? Answer: the `race_source='online'` tag, no secret, no token.
6. Bots on the shared crew: if bot-only fleets cannot be made contact-free in the timebox, ship M5 with instant bot sail transfer and keep the item for M6? Answer: yes (the shared crew shipped in m5-04).
7. Release order and consent: switch A on the site and in TestFlight together, switch B only after the owner has played the metric race on an iPhone; each site deploy and each TestFlight upload needs an explicit go-ahead. Answer: yes (backlog decision R-28).
