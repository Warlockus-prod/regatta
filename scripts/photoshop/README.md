# Photoshop scripts (`.jsx`)

Three batch scripts that run in any modern Photoshop without installing
anything. They use ExtendScript (Adobe's classic JS API), so no UXP
Developer Tool, no plugin manifest, no signing - just `File -> Scripts
-> Browse...` and pick the file.

If we ever outgrow these, see `docs/PHOTOSHOP_UXP_SETUP.md` /
`PHOTOSHOP_UXP_SETUP_RU.md` for the upgrade path to a UXP panel.

## How to run

1. Open Photoshop.
2. `File -> Scripts -> Browse...`
3. Pick the `.jsx` file.
4. Follow the dialogs that pop up.

Scripts never modify the source files - all output goes to a new
subfolder next to the source.

## Scripts

### `gallery-optimize.jsx`

Batch-resize a folder of photos into the (full + thumb) pair the website
gallery expects. Drop-in replacement for the legacy `sips` pipeline.

| What | Default | Edit at |
|---|---|---|
| Full long side | 1600 px | `FULL_LONG_SIDE_PX` |
| Thumb long side | 600 px | `THUMB_LONG_SIDE_PX` |
| Full JPEG quality | 8 (~q80) | `FULL_QUALITY` |
| Thumb JPEG quality | 7 (~q70-75) | `THUMB_QUALITY` |
| Output | `<input>/full/`, `<input>/thumb/` | - |

Inputs: `.jpg` / `.png` / `.tif`. Color is converted to sRGB before
resize so the gallery looks the same in every browser regardless of
what profile the camera tagged the source with.

**Use when:** new drone photos arrive for the gallery and need to be
optimised before drop-in.

### `add-watermark.jsx`

Overlay a transparent-background watermark PNG (e.g.
`public/brand/giono-yachting-transparent.png`) onto every photo in a
folder. Resizes the watermark to a fraction of image width and places
it in a chosen corner with adjustable opacity.

| What | Default | Edit at |
|---|---|---|
| Watermark width | 12 % of image | `WATERMARK_WIDTH_RATIO` |
| Opacity | 60 | `WATERMARK_OPACITY` |
| Position | `bottom-right` | `WATERMARK_POSITION` |
| Corner padding | 2 % of image | `WATERMARK_PADDING_RATIO` |
| Output JPEG quality | 9 (~q85) | `OUTPUT_QUALITY` |
| Output | `<input>/watermarked/` | - |

Position values: `top-left`, `top-right`, `bottom-left`,
`bottom-right`.

**Use when:** branding gallery photos before publishing, or producing
press / social variants with brand attribution.

### `export-layers.jsx`

Take the currently open PSD and save each visible top-level layer as
its own PNG. Layer name becomes the filename (sanitised to
`[a-zA-Z0-9_-]`). Originally hidden layers are skipped - treat them as
"scratch / not for export".

| What | Default | Edit at |
|---|---|---|
| PNG compression | 6 (balanced) | `PNG_COMPRESSION` |

**Use when:** producing brand / icon variants from one source PSD
(e.g. light + dark + monochrome versions of the GIONO mark), or
slicing a multi-language banner mockup into per-locale assets.

The PSD on screen is left untouched - only PNG files are written.

## Notes

- ExtendScript is ES3 (no `let` / `const` / arrow functions / template
  literals). Edit accordingly if you fork these.
- These scripts log via `alert()` so you see progress between batches.
  For unattended batch runs, comment out the final `alert(...)` line.
- ExtendScript is being phased out in favour of UXP. Adobe still
  supports it in Photoshop 2024+, but new APIs land in UXP first.
  See `docs/PHOTOSHOP_UXP_SETUP.md` for the migration path.
