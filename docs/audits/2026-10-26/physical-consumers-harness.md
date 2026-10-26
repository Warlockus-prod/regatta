# Physical consumer foundation, before activation

This checkpoint prepares storage and server consumers while the physical
emission flag remains OFF. It is separate from delivered64, sourceef180df.
Neither a registry nor these readers make a physical race playable.

## Implemented source

- Local PB preserves every historical key. A failed or unreadable store blocks
  writes; failed writes cannot claim a new saved record. Pure planning preserves
  unknown entries and bounds the whole serialized store to16000characters.
  The actual web return is synchronous, not a native persistence acknowledgement.
- Setup inspection validates version/context/mode before TTL cleanup. Invalid,
  unsupported and disabled saves survive implicit cleanup. Explicit replacement
  and discard options exist; physical writes stay disabled.
- SQLite adds five nullable class/time columns transactionally, with no backfill
  or inferred historical mode. Initialization failure closes the candidate DB
  before retry. Real SQLite fixtures verify rollback and winning-row identity.
- Result and leaderboard routes derive class from explicit mode/context and raw
  registered geometry. Adjusted time comes from raw finish plus penalty. Old
  global/Daily/mission pools stay unclassified. Closed explicit class queries
  isolate mode/difficulty/wind; public responses omit session IDs.
- Native preparation/projection distinguishes historical pixel/world records,
  registered world records and unavailable records. Pure physical fixtures do
  not enable the writer. History read/serial clear reports actual outcomes;
  journal failure cannot change storage behavior.
- Null native context remains null through validation and actual start/finish
  messages. It never becomes explicit legacy result provenance. Null replay
  metadata yields to a known nested context, but never hides an unknown object.

## Evidence

Combined working-tree gate:1527web tests/156files;547native tests/75suites and
9release-tool tests. Initial native full run found two stale generated-package
manifests; all three packages were regenerated and the complete native gate
passed with unchanged assertions. Real multiplayer socket lifecycle passes.
Web/native types, native lint and production build pass. The unchanged6.5MiB
budget passes; final exact bytes and commit identity are recorded externally.
No installed/native or cloud CI acceptance of this checkpoint is implied.

Actual static total6809627bytes/111files, limit6815744, headroom6117bytes;
largest988532bytes. Fresh radiof45d973461ed, sailing25ab4496b966/220inputs and
Sternikc4bc70ec9b15/48inputs pass their source checks. Source diff whitespace
checks exclude generated HTML, whose unchanged upstream shader templates retain
trailing spaces; generated files are accepted through exact rebuild comparison.

## Required next consumers

1. Wire GameClient explicit Start/discard/resume mode and context. Prevent a
   stale intent from overriding an explicit mission/Daily/lesson/replay link.
   Restore wind synchronously before initial trim, without changing constants.
   Preserve the intentional briefing restart rather than claiming live resume.
2. Use the native projection in real History and Leaderboard. Keep historical
   score-first views and visible unknown records; compare registered groups by
   adjusted time only within the same class, mode, difficulty and wind. Add one
   shared seven-language title resource, never expose raw IDs as course names.
3. Integrate native PB durability with the actual finish acknowledgement. A
   successful history save cannot acknowledge a separate optimistic PB write.
4. Alias consistency is now source checked at actual Replay/Coach entry points
   and reused by the projection. Measure projection work once per stable history
   array when integrating the remaining real list views.
5. Run consumer UI/browser/native/CI gates and record rollback checkpoints.
   Then implement physical movement, gates, bots, advice, recording and course
   choices. Keep legacy/no-context multiplayer goldens unchanged.

Diagnostics coverage remains the separate D01-D09 matrix. Pure schema additions
and these source adapters do not mean every product action is instrumented.

## Native alias entry follow-up

The shared classifier now checks namespaced wrapper identities after canonical
world validation. A known mismatch is corrupt; a future class is unsupported.
Bare historical aliases do not override validated world geometry. A minimal
classifier input without courseId remains readable. The projection reuses this
check rather than owning a second implementation. Actual Replay/Coach route
tests preserve stored bytes and prove the localized notice/Back appears before
pixel geometry, shared redirect, local analysis or a remote request.

Focused native component gate66tests/3suites and full551tests/75suites pass,
along with strict web/native types, native lint and all3package freshness checks.
This remains source evidence outside the installed64 binary.
