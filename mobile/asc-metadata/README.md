# App Store Connect metadata + screenshots

This folder is the source of truth for the App Store listing of "Week
to Regatta". The two scripts in `mobile/scripts/` consume the files
here and push them to App Store Connect.

## Folder layout

```
mobile/asc-metadata/
  README.md             (this file)
  SCREENSHOTS.md        (5-frame story spec for App Store screenshots)
  ru/                   per-locale metadata (7 langs)
    name.txt            App Store display name (max 30 chars)
    subtitle.txt        below the name (max 30 chars)
    description.md      long copy (max 4000 chars; ASC strips Markdown)
    keywords.txt        comma-separated, no leading or trailing space (max 100 chars)
    promotional.txt     above-the-fold editorial copy (max 170 chars)
    support_url.txt     a URL to the support page
    marketing_url.txt   a URL to the marketing site
  en/ ... pl/ ... es/ ... fr/ ... de/ ... it/   (same shape as ru/)
  screenshots/          captured PNGs (gitignored or committed; team call)
    iphone-6.7/<lang>/<NN>-<screen>.png
    iphone-6.5/<lang>/<NN>-<screen>.png
    manifest.json       (auto-written by asc-screenshots.mjs)
```

## Pre-flight checklist for the App Store submitter

Run these in order before opening the ASC web UI on submit day.

### 1. Confirm the build is current.

```bash
cd /Users/Andrey/App/all/regatta/mobile
node scripts/asc.mjs builds   # latest 5 builds, status, processing state
```

The latest build should be `processingState=VALID` and `version` /
`buildNumber` should match what is in `mobile/app.json`. If the build
is `INVALID` or `PROCESSING`, wait or rebuild before continuing.

### 2. Preview the metadata diff.

```bash
node scripts/asc-metadata.mjs --dry-run
```

This prints, per locale, a diff of every text field between local
files and what is currently in App Store Connect on the latest editable
version. Read it carefully. If there is a remote field you did not mean
to overwrite, edit the local file or skip the locale with `--lang`.

If the script reports "no editable version", create the next version
in the ASC web UI first (Apps > Week to Regatta > "+ Version", pick
the version string from `app.json`).

### 3. Apply the metadata.

```bash
node scripts/asc-metadata.mjs
```

Same script, no `--dry-run`. It walks the same diff and PATCHes / POSTs
each field. Idempotent - re-running with no local changes is a no-op.

You can also restrict to a subset of locales:

```bash
node scripts/asc-metadata.mjs --lang en,ru
```

### 4. Capture iPhone screenshots.

Open the iOS Simulator and install the latest preview build (drag the
.app from the EAS download URL onto the simulator window, or run
`expo run:ios --device <simulator-udid>`).

Then:

```bash
node scripts/asc-screenshots.mjs
```

The script:

1. Boots the iPhone 16 Pro Max simulator (6.7 inch class) and the
   iPhone 16 Plus simulator (6.5 inch class).
2. For each of the 7 locales, prompts you to set the app locale via
   the in-app Settings screen, then waits for you to press Enter.
3. Walks the 5 deep links (`regatta://` -> `bootcamp` ->
   `simulator` -> `anatomy` -> `checklist`), takes a screenshot of
   each, writes them to `screenshots/<device>/<lang>/<NN>-<screen>.png`.

Total artefact count: 2 devices x 7 locales x 5 frames = 70 PNGs.

You can scope the run to a single device or locale:

```bash
node scripts/asc-screenshots.mjs --device 6.7 --lang en
```

To preview without capturing, pass `--dry-run`.

### 5. Review in ASC web UI.

Open https://appstoreconnect.apple.com -> My Apps -> Week to Regatta
-> the editable version. Confirm the metadata in every locale (the
script logs which fields it touched). Drag the captured PNGs into the
Media slots for each device class - ASC accepts up to 10 per locale,
we ship 5.

Per-locale captions (the marketing text floating over each screenshot
in the App Store carousel) are NOT baked into the PNGs. Type them in
the ASC web UI per locale; the EN source captions live in
`SCREENSHOTS.md`. PM owns translations.

### 6. Final verification.

In the ASC web UI:

- App Privacy: confirm "no data collected" matches the privacy
  manifest declaration in `mobile/app.json`.
- Age Rating: questionnaire answered (no in-app purchases, no UGC, no
  ads, no location, no health data - rates 4+).
- Pricing: Free (Tier 0) in all territories, no in-app purchases.
- Build: pick the latest VALID build from the build picker.

### 7. Submit for review.

Click "Add for Review" -> answer the export compliance question (No,
HTTPS-only API, exempt) -> "Submit to App Review". Apple's review
window is typically 24-48 hours.

This step is intentionally manual. The scripts in this folder do not
trigger the submit-for-review action - that decision belongs to a
human.

## Hard limits enforced by ASC

| Field            | Max chars |
| ---------------- | --------- |
| name             | 30        |
| subtitle         | 30        |
| description      | 4000      |
| keywords         | 100       |
| promotionalText  | 170       |
| supportUrl       | 255       |
| marketingUrl     | 255       |

The local files were sized within these limits at write time. Re-check
with:

```bash
for lang in ru en pl es fr de it; do
  for f in name subtitle keywords promotional; do
    chars=$(python3 -c "print(len(open('asc-metadata/$lang/$f.txt').read()))")
    echo "[$lang/$f] chars=$chars"
  done
done
```

## Typography rules

Per `CLAUDE.md`, all metadata files use ASCII typography only:

- No em-dash (U+2014).
- No en-dash (U+2013).
- No curly quotes (U+201C, U+201D, U+2018, U+2019).
- No ellipsis character (U+2026); use three ASCII dots `...`.
- Russian may use «» where context fits.
- Polish: no diacritics (drop "a-ogonek", "z-cropka", etc).
- Spanish / French / German / Italian: diacritics that carry meaning are
  allowed (n-tilde, accent grave on e, umlaut on u).

There is a scan helper:

```bash
grep -nP '[\x{2014}\x{2013}\x{201C}\x{201D}\x{2018}\x{2019}\x{2026}]' -r mobile/asc-metadata/
```

If it returns rows, fix them before pushing.

## Manual fallback

If `asc-metadata.mjs` cannot reach the ASC API (offline, no key file,
sandbox), it falls back to a "local summary" mode that prints each
locale's content for human eyeball review. Useful to validate the
files look right before going online.

If `asc-screenshots.mjs` cannot find a usable simulator (no Xcode,
no installed app), it logs the deep links + locale toggles you would
need to run by hand and exits. Capture the PNGs with the simulator
keyboard shortcut Cmd + S and drop them into the same tree.
