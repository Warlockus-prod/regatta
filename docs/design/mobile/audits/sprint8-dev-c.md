# Sprint 8 Dev-C status: ASC metadata + screenshots pipeline

Date: 2026-05-13. Lane: Mobile. Branch: `app`. Build context: TestFlight
Internal Testing build 9 / 0.9.0; preparing for first public review
submission. Audit priority #4: App Store Connect localised metadata +
iPhone screenshot capture pipeline.

This sprint delivers everything needed for a human to walk into the
App Store Connect web UI and submit Week to Regatta for review,
except the actual submit action.

## What landed in this sprint

### Localised metadata (7 langs x 7 files = 49 files)

Each locale folder under `mobile/asc-metadata/<lang>/` ships:

- `name.txt`         App Store display name (max 30 chars).
- `subtitle.txt`     below the name (max 30 chars).
- `description.md`   long copy with Markdown headings; ASC strips
                     Markdown on its end but the file stays readable.
                     Max 4000 chars.
- `keywords.txt`     comma-separated, max 100 chars.
- `promotional.txt`  above-the-fold editorial copy, max 170 chars.
- `support_url.txt`  https://regatta.icoffio.com/support.
- `marketing_url.txt` https://regatta.icoffio.com.

All seven locales are within ASC limits. Final character counts:

| lang | name | subtitle | keywords | promotional | description |
| ---- | ---- | -------- | -------- | ----------- | ----------- |
| ru   | 16   | 18       | 74       | 162         | 2590        |
| en   | 15   | 20       | 75       | 165         | 2620        |
| pl   | 16   | 23       | 80       | 161         | 2745        |
| es   | 22   | 29       | 76       | 164         | 2832        |
| fr   | 26   | 25       | 80       | 168         | 2943        |
| de   | 22   | 22       | 75       | 161         | 2784        |
| it   | 25   | 29       | 76       | 166         | 2889        |

Headroom to spare on every field in every locale.

### Voice + content decisions per locale

- **EN (source).** "Race-ready in 7 days" subtitle. Hard ladder up to
  the brand promise. Description leads with the 7-day arc, then the
  feature list, then the "no analytics, no tracking, no ads" promise.
- **RU.** Tone matches the calm-tutor source. Russian uses « » for
  the Continue button quote. No em-dashes anywhere - replaced the
  natural spot for a dash with a comma or a colon.
- **PL.** ASCII-only per CLAUDE.md (no a-ogonek, no z-cropka, etc).
  Verified with a regex sweep: zero diacritic hits.
- **ES.** Diacritics that carry meaning kept (n-tilde in espanol /
  ano, accent agudo on dia, manana). No curly quotes, no en-dashes.
- **FR.** Same diacritic policy. Apostrophes are ASCII straight
  quotes; rendered "l'app" as "l app" to honour the no-curly-quote
  rule and avoid mid-word ASCII apostrophe ugliness.
- **DE.** Diacritics kept (ue / ae / oe written as direct umlauts).
  Subtitle "In 7 Tagen regatta-fit" - 22 chars, comfortable.
- **IT.** Same approach as ES/FR: meaning-bearing diacritics kept,
  punctuation ASCII-only.

Brand voice across all 7: calm sailing tutor, never marketing-y,
focuses on the practical 7-day arc + the no-tracking commitment +
the real VPP simulator. Mentions Bootcamp, Simulator, Anatomy,
Glossary, Rules, Pre-race checklist by name in every locale.

Final typography sweep: 0 hits for em-dash / en-dash / curly quotes /
ellipsis across all 7 locales.

### `mobile/scripts/asc-metadata.mjs` - FULL implementation

This is the real thing, not a dry-run-only stub. The script:

1. Auths to ASC via the same JWT pattern as `asc.mjs`.
2. Lists App Store versions, picks the most recent editable one
   (state PREPARE_FOR_SUBMISSION / DEVELOPER_REJECTED / REJECTED /
   METADATA_REJECTED / INVALID_BINARY / WAITING_FOR_REVIEW).
3. Lists App Info records, picks the editable one (where `name` and
   `subtitle` live - those are app-info fields, not version fields).
4. Fetches existing `appStoreVersionLocalizations` and
   `appInfoLocalizations` on those records.
5. For each of the 7 locales: builds a per-field diff between local
   and remote, prints it, and (without `--dry-run`) PATCHes the
   existing record or POSTs a new one.
6. Prints a summary: # locales processed, # field diffs found.

Verified against the live ASC API today (2026-05-13). The first
attempt 400-d on `?sort=-createdDate` (ASC rejects sort on this
endpoint) - fixed by sorting client-side. Fix is in the script.

Live dry-run output: target version `1.0
(PREPARE_FOR_SUBMISSION)`, app info id present, 48 field diffs across
7 locales (every field is `<null>` on remote because nothing has been
uploaded yet), exit 0.

CLI flags supported:
- `--dry-run`       Print diffs only, no writes.
- `--lang en,ru`    Only process these locales (comma-separated).
- `--version 1.0`   Target a specific version string.
- `--verbose / -v`  Print remote locale lists for debugging.

Idempotent: re-running with no local changes is a no-op. Safe to wire
into a CI step later.

Offline / sandbox fallback: if the ASC `.p8` key file is absent OR the
API returns a network error during a dry-run, the script falls back to
a "local-only" mode that prints each locale's content for visual
review and exits 0. Useful for sandboxed dev machines that have the
files but no auth.

### `mobile/scripts/asc-screenshots.mjs` - capture pipeline

Node script that:

1. Verifies `xcrun simctl` is on PATH (fatal exit 1 otherwise).
2. For each device family (iPhone 6.7 inch + iPhone 6.5 inch),
   resolves the simulator UDID by parsing `xcrun simctl list devices
   available --json`. Looks for "iPhone 16 Pro Max" / "iPhone 16
   Plus" first, falls back to "iPhone 15 Pro Max" / "iPhone 14 Plus".
3. Boots the simulator if not already booted.
4. For each of the 7 locales:
   a. Best-effort attempt to deep-link the locale switch (the build
      does not support `regatta://settings?lang=es` yet, so this is a
      no-op for Sprint 8).
   b. Prompts the human via stdin: "set the app locale to <lang> via
      Settings, then press Enter".
   c. Walks the 5 deep links: `regatta://`, `regatta://bootcamp`,
      `regatta://simulator`, `regatta://anatomy`, `regatta://checklist`.
   d. For each, calls `xcrun simctl io <udid> screenshot --type=png
      <path>` writing into
      `mobile/asc-metadata/screenshots/<device>/<lang>/<NN>-<screen>.png`.
5. After the sweep, writes a `manifest.json` with timestamps + file
   list to `screenshots/manifest.json`.

CLI flags:
- `--dry-run`       Print plan, no actual captures.
- `--lang en`       Single locale.
- `--device 6.7`    Single device family.
- `--no-build`      Skip the install-check (assume the app is open).
- `--no-prompt`     Do not wait for human confirmation between locales.

Total output count: 2 devices x 7 locales x 5 frames = 70 PNG files.

### `mobile/asc-metadata/SCREENSHOTS.md` - 5-frame story spec

Documents the exact App Store screenshot story per Apple's spec:

1. Hero - Home with brand wordmark + Continue card. Caption: "Race in
   a week? / You will figure it out."
2. Bootcamp - Day 4 of 7 in progress, days 1-3 done. Caption: "8
   lessons, 7 days. / You will know what to pull."
3. Simulator - full Skia scene with wind compass, no-go cone, sail
   feedback badges, mode bar. Caption: "Real wind physics. / Your
   hand on the helm."
4. Anatomy - photo poster with hotspot dots + 17-part vector diagram.
   Caption: "17 parts of a yacht. / Tap to learn each."
5. Pre-race checklist - progress bar 50%, sections visible. Caption:
   "Pre-race checklist. / Tick it off the night before."

Frame ordering matches the App Store carousel (alphabetical-by-
filename). Captions are EN source; PM owns translation into the other
6 langs and types them per-locale into the ASC web UI on submit day
(captions are NOT baked into the PNGs - we ship clean device frames
and let ASC overlay).

### `mobile/asc-metadata/README.md` - submitter pre-flight

Step-by-step runbook for a human running the App Store submission:

1. Check the latest build via `node scripts/asc.mjs builds` - confirm
   processingState=VALID and version matches `app.json`.
2. Preview metadata diffs with `node scripts/asc-metadata.mjs --dry-run`.
3. Apply with `node scripts/asc-metadata.mjs`.
4. Capture screenshots with `node scripts/asc-screenshots.mjs`.
5. Open ASC web UI, drag screenshots into Media slots, type per-locale
   captions, set App Privacy + Age Rating + Pricing if not yet set.
6. Click "Submit to App Review".

Includes the ASC field hard-limits table, the typography rules from
CLAUDE.md, and the manual fallback path if the simulator or API are
not reachable.

### `docs/design/mobile/audits/sprint8-dev-c.md`

This file. Status note for the PM and downstream submitters.

## Verification

```
$ cd /Users/Andrey/App/all/regatta/mobile && node scripts/asc-metadata.mjs --dry-run
=== ASC metadata sync (app=6768134329) [DRY RUN] ===
[version] 1.0 (PREPARE_FOR_SUBMISSION) id=58bfc476-...
[appInfo] id=7fcefc75-... state=PREPARE_FOR_SUBMISSION
... 7 locales, 48 field diffs found ...
=== summary ===
  locales processed: 7
  field diffs found: 48
  [dry-run] no writes performed
  re-run without --dry-run to apply
```

```
$ cd /Users/Andrey/App/all/regatta/mobile && npm run check
sync-content: all bundles up to date.
lint: clean.
typecheck: clean.
tests: 20 suites, 104/104 passed.
```

## Files written this pass

```
mobile/asc-metadata/README.md
mobile/asc-metadata/SCREENSHOTS.md
mobile/asc-metadata/{ru,en,pl,es,fr,de,it}/name.txt          (7 files)
mobile/asc-metadata/{ru,en,pl,es,fr,de,it}/subtitle.txt      (7 files)
mobile/asc-metadata/{ru,en,pl,es,fr,de,it}/description.md    (7 files)
mobile/asc-metadata/{ru,en,pl,es,fr,de,it}/keywords.txt      (7 files)
mobile/asc-metadata/{ru,en,pl,es,fr,de,it}/promotional.txt   (7 files)
mobile/asc-metadata/{ru,en,pl,es,fr,de,it}/support_url.txt   (7 files)
mobile/asc-metadata/{ru,en,pl,es,fr,de,it}/marketing_url.txt (7 files)
mobile/scripts/asc-metadata.mjs       (~500 lines, full impl)
mobile/scripts/asc-screenshots.mjs    (~250 lines, full pipeline + manual fallback)
docs/design/mobile/audits/sprint8-dev-c.md  (this file)
```

Counts:
- Per-locale files: 7 langs x 7 files = 49 files.
- Top-level metadata docs: 2 (README.md + SCREENSHOTS.md).
- Scripts: 2 (asc-metadata.mjs + asc-screenshots.mjs).
- Status note: 1.
- Total new files: 54.

No existing file was modified. No web-app file was touched. No
`mobile/app/*` or `mobile/src/*` route was edited. Strictly within
the lane scope from the spec.

## Pre-launch checklist headline

The human submitter has a 6-step runbook in
`mobile/asc-metadata/README.md`. The headline:

1. Verify build VALID via `node scripts/asc.mjs builds`.
2. Dry-run metadata: `node scripts/asc-metadata.mjs --dry-run`.
3. Apply metadata: `node scripts/asc-metadata.mjs`.
4. Capture screenshots: `node scripts/asc-screenshots.mjs`.
5. Review ASC web UI - confirm fields, drag PNGs, type per-locale
   captions, set App Privacy + Age Rating + Pricing.
6. Click Submit to App Review.

Everything before step 6 is automated or scripted. Step 6 stays a
human action by design.

## Known gaps and follow-ups

1. **Locale switch is manual during screenshot capture.** The app
   reads `regatta_lang` from AsyncStorage; the build does not yet
   accept `regatta://settings?lang=es` as a deep-link trigger. The
   screenshot script tries the deep link as a best-effort first then
   falls through to a stdin prompt. Sprint 9 follow-up: have Dev-A
   add a `?lang=` deep-link handler to the settings screen so the
   capture pipeline becomes fully unattended.
2. **Screenshot captions are NOT baked into PNGs.** ASC overlays
   captions on the carousel surface. PM owns the per-locale caption
   translation. EN source is in `SCREENSHOTS.md`. Sprint 9 follow-up:
   commission a Figma template that bakes captions in for a more
   branded look (optional v1.1 polish).
3. **App Privacy / Age Rating / Pricing not scripted.** These are
   one-time ASC fields, not per-locale text. The script intentionally
   does NOT touch them - the human sets them once in the web UI on
   submit day. Documented in the README.
4. **Submit-for-review action is intentionally human-only.** The
   `asc-metadata.mjs` script does not call POST
   `/v1/appStoreVersionSubmissions`. That decision belongs to a
   human looking at the prepared listing.
5. **Screenshots assume the app is installed on the simulator
   already.** The script does not auto-build via `expo run:ios`. The
   submitter is expected to have a fresh preview build installed
   before running the capture script. Sprint 9 nice-to-have: chain
   `expo prebuild + expo run:ios --simulator` into the script.

## Coordination notes

- Dev-A and Dev-B own `mobile/app/*` and `mobile/src/*`. None of those
  files were touched. The Sprint 9 follow-up to add a `?lang=` deep
  link to settings should land in their lane.
- Web lane is unaffected.
- The `https://regatta.icoffio.com/support` URL is a placeholder; if
  the web team needs a real `/support` page, that lands in the Shared
  lane, not Mobile. The marketing URL `https://regatta.icoffio.com`
  is the existing web app and serves as-is.
- All 7 locales were authored against the same source of truth (EN);
  if PM commissions a translator pass, the script handles re-uploads
  cleanly - just edit the `description.md` etc. and re-run.

End of status note.
