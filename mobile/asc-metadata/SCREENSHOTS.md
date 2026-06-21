# App Store screenshot story (5 frames)

Per Apple's spec we ship App Store screenshots at the two required device
families and let App Store Connect downscale to the smaller classes
automatically:

- **6.7-inch iPhone**: 1290 x 2796 px portrait. Required.
  Captured on iPhone 16 Pro Max simulator.
- **6.5-inch iPhone**: 1284 x 2778 px portrait. Required for older bin.
  Captured on iPhone 16 Plus simulator (closest current device that
  matches the legacy 6.5 inch bucket).

For each device family, we ship the same 5-frame story per locale (RU /
EN / PL / ES / FR / DE / IT) so the App Store discovery surface tells the
same story in every market.

The captions in this doc are EN. The screenshot script captures the
matching localised UI per locale, so the captions you overlay in the
ASC web UI for each locale must be translated by a human (PM owns
translation; the EN captions below are the source).

## Frame 1: Hero - "Race-ready in a week"

- **Caption (EN)**: "Race in a week? / You will figure it out."
- **Route to capture**: `regatta://` (Home).
- **State**: Home with the brand wordmark visible at the top, the three
  primary entry cards (Bootcamp / Quick / Rules) visible, the Continue
  card at the top of the list pointing at "Day 1" if the user has just
  installed (cold install state).
- **What the user sees**: the calm dark-ocean palette, the brand mark,
  three obvious things to tap. This is the trust-the-app frame.
- **Device family**: 6.7-inch (1290 x 2796) and 6.5-inch (1284 x 2778).

## Frame 2: Bootcamp 7-day arc - "Day 4 of 7"

- **Caption (EN)**: "8 lessons, 7 days. / You will know what to pull."
- **Route to capture**: `regatta://bootcamp`.
- **State**: Bootcamp index with Day 1, 2, 3 marked done (green check
  pills), Day 4 highlighted as "in progress" (cyan-tint hero card),
  Days 5 through 7 outlined as upcoming. The Continue hook on Home
  has been tapped through to this list.
- **What the user sees**: a clear 8-lesson breakdown mapped to a 7-day
  arc, status pills per day, and an obvious next-up lesson.
- **Device family**: 6.7-inch and 6.5-inch.

## Frame 3: Simulator - "Real wind physics"

- **Caption (EN)**: "Real wind physics. / Your hand on the helm."
- **Route to capture**: `regatta://simulator`.
- **State**: Simulator on `Top` view mode, full Skia scene visible:
  yacht silhouette with main + jib, wind compass at top right showing
  10 kt, no-go cone, apparent-wind ghost, wake trail behind the boat.
  The HUD shows HEADING / TARGET / SPEED. Mode bar at the bottom dock
  shows `Training | Drills | Scenario` with `Training` selected. Sail
  feedback badges visible (e.g., "lifted", "headed", "in slot").
- **What the user sees**: a real, interactive wind simulator that
  responds to the helm. This is the aha frame for serious sailors.
- **Device family**: 6.7-inch and 6.5-inch.

## Frame 4: Anatomy - "17 parts of a yacht"

- **Caption (EN)**: "17 parts of a yacht. / Tap to learn each."
- **Route to capture**: `regatta://anatomy`.
- **State**: Anatomy index with the photo poster gallery visible at the
  top, a single yacht photo poster expanded to fill the upper third,
  hotspot dots pulsing on each named part (Mainsail, Jib, Boom, Mast,
  Boom Vang, Cunningham, Backstay, Forestay). Below the poster, the
  vector hotspot diagram with 17 numbered points.
- **What the user sees**: a real photo of a real yacht, with named
  parts you can tap. This is the curiosity frame.
- **Device family**: 6.7-inch and 6.5-inch.

## Frame 5: Pre-race checklist - "Tick it off the night before"

- **Caption (EN)**: "Pre-race checklist. / Tick it off the night before."
- **Route to capture**: `regatta://checklist`.
- **State**: Checklist screen with a visible progress bar at the top
  showing maybe 6 of 12 items complete (50%), the section cards
  visible (Boat / Crew / Documents / Weather), each section shows two
  or three bullet items, some checked, some not. The user is mid-prep.
- **What the user sees**: a concrete, scannable checklist with progress
  feedback. This is the "I am ready" frame.
- **Device family**: 6.7-inch and 6.5-inch.

## Capture order

The screenshot script (`scripts/asc-screenshots.mjs`) walks the 5 frames
in this exact order so the output filenames sort alphabetically into
the App Store display order:

```
01-home.png
02-bootcamp.png
03-simulator.png
04-anatomy.png
05-checklist.png
```

ASC sorts uploaded screenshots by filename within each locale, so this
order is what users will see in the App Store carousel.

## Per-locale capture

The script loops over RU / EN / PL / ES / FR / DE / IT. For each locale
it:

1. Pre-seeds AsyncStorage to set `regatta_lang` to the target locale
   (via a deep link OR a manual settings tap, see
   `asc-screenshots.mjs` for which path the running build supports).
2. Cold-restarts the app to load the new locale.
3. Captures the 5 frames listed above.

Output tree:

```
mobile/asc-metadata/screenshots/
  iphone-6.7/
    ru/
      01-home.png
      02-bootcamp.png
      03-simulator.png
      04-anatomy.png
      05-checklist.png
    en/...
    pl/...
    es/...
    fr/...
    de/...
    it/...
  iphone-6.5/
    ru/...
    ...
```

Total artefact count: 2 device families x 7 locales x 5 frames = 70
PNG files. ASC accepts up to 10 screenshots per locale per device, so
we are well under the limit.

## Manual fallback

If the simulator path does not work cleanly (no boot, no install, no
deep-link locale switch), the script logs the routes + the locale toggle
steps and the human captures them manually with the iPhone simulator
keyboard shortcut Cmd+S. File the PNGs into the same tree by hand.

## Caption overlay (post-capture)

The captions above are **NOT baked into the captured PNGs**. ASC has
its own per-locale caption field that floats above each screenshot in
the App Store carousel. We upload the bare PNG; the human sets the
caption per-locale in the ASC web UI on submit day.

If you want the captions baked in (heavier branding), use a Figma
template overlay - that is a Sprint 9 nice-to-have, not a Sprint 8
blocker. v1.0 ships clean device frames with ASC-side captions.
