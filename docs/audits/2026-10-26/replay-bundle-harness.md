# Replay bundle headroom checkpoint

2026-10-26, after reader/radio/main-sync source6dfc24f. The preceding local
production gate passed with only167bytes remaining under the6.5MiB limit. The
following metadata, personal-best and physical-course work needs usable room.

The actual old replay route imported all of useRaceCopy although it uses only
nine labels. The full15,181byte module appeared in three client chunks. An
older attempted dictionary merge had increased the total by4,042bytes while
retaining three copies; that failed approach stays reverted.

## Bounded implementation

- replay-copy.ts owns the nine existing resources once and a small hook.
- The full race dictionary reuses those canonical resources, retaining its
  public fields, property order, seven languages and formatter behavior.
- RaceReplay imports only the small hook. It has no reverse dependency on the
  full dictionary, new async import, request, state, timer or scene/physics change.

Focused tests22/4files pass. Pre-extraction digests retain all43 public fields
and168 formatter combinations in every language. Strict types, scoped lint
and non-generated diff checks pass. The actual new production build is
6,803,108/6,815,744bytes,111chunks, largest988,532bytes and clean server chunks.
It saves12,469bytes and leaves12,636bytes headroom. This is a measured build,
not a prediction from module lengths.

Final aggregate checks pass1338web tests/150files and524native tests/73suites
plus9release-tool tests, strict types, native lint, content sync and all three
offline package checks. Regenerated sailing296b586ec85c has219inputs; radio
f926b850b1df and Sternik e2c9653807c9 remain unchanged. The prior reader/radio/main
checkpoint6dfc24f separately passes all6 cloud CI jobs, including the three
Foundation browser scenarios. This new copy checkpoint has its own following CI.

APP64/sourceef180df, its native archive and Apple state remain separate. This
checkpoint does not enable physical race emission or claim installed gestures,
full manual Pro finish or completed product acceptance.
