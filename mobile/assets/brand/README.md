# Brand assets

Logo "A. Sail" (owner's choice 2026-11-24): a white mainsail and a light blue
jib with a gap between them over two wake lines, on action blue (`#0b7fb8`)
fading into ink (`#123247`).

## Files

- `icon.svg` - the app icon for design tools. It mirrors the shapes in
  `mobile/scripts/render-icon.mjs`; change both together.
- `wordmark.svg` - the older "WEEK TO / Regatta" lockup for share cards and
  marketing. It is not used on the launch screen.

## Regenerate the PNGs

`mobile/scripts/render-icon.mjs` is the source that writes the binaries:

```bash
cd mobile
node scripts/render-icon.mjs
```

It writes:

- `assets/icon.png` and `assets/adaptive-icon.png`: 1024 x 1024, opaque, no
  alpha (Apple rejects a marketing icon with transparency). iOS rounds the
  corners; do not pre-round.
- `assets/splash-icon.png`: the mark alone, transparent, in ink and action
  blue.

## Launch screen

Do not put the square icon on the launch screen: centred on the paper
background it shows as a dark square with paper bars above and below. The
splash is the transparent mark on `app.json` `splash.backgroundColor`
`#f7f5f0`, the same paper as the first app screen
(`__tests__/app-surface.test.tsx` keeps them equal), so the launch hands over
without a flash. A native rebuild (`expo prebuild`) is needed for a new icon
or splash; iOS may show its cached old launch image once after an update.
