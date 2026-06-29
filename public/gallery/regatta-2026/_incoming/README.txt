Drop the 2026 regatta photos into THIS folder (any filenames, full resolution).

Supported: .jpg .jpeg .png .webp .heic (iPhone HEIC is auto-converted).

Then run from the project root:
    node scripts/build-gallery-year.mjs --year 2026

That creates optimized full/ + thumb/ images and fills the gallery data
automatically. Originals in this folder are NOT committed to git.
