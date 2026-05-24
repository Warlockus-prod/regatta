# Brand assets

Source-of-truth brand SVG files. Convert to PNG for the app icon, splash
screen, and any other binary deliverables.

## Files

- `icon.svg` - square sailboat on a dark-ocean background. Source for the
  app icon at every size (1024 for App Store, 200 for in-app, 64 for
  favicon). Solid background, no transparency, sRGB.
- `wordmark.svg` - the "WEEK TO / Regatta" lockup. Used for splash
  centerpiece, share cards, marketing.

## Convert to PNG (one-time, when you regenerate)

App Store wants 1024x1024 PNG for the main app icon. iOS rounds the
corners automatically; do not pre-round.

### Option A: rsvg-convert (CLI, fastest)

```bash
brew install librsvg
cd mobile/assets/brand

# Main app icon (App Store)
rsvg-convert -w 1024 -h 1024 icon.svg > ../icon.png

# Adaptive icon (Android foreground)
rsvg-convert -w 1024 -h 1024 icon.svg > ../adaptive-icon.png

# Splash icon (centered on app.json splash.backgroundColor)
rsvg-convert -w 600 -h 600 icon.svg > ../splash-icon.png

# Web favicon
rsvg-convert -w 64 -h 64 icon.svg > ../favicon.png
```

### Option B: ImageMagick

```bash
brew install imagemagick
cd mobile/assets/brand
magick icon.svg -resize 1024x1024 ../icon.png
magick icon.svg -resize 1024x1024 ../adaptive-icon.png
magick icon.svg -resize 600x600 ../splash-icon.png
magick icon.svg -resize 64x64 ../favicon.png
```

### Option C: Online (if you do not want to install anything)

Open `icon.svg` in any browser, take a 1024x1024 screenshot, save as
PNG. Or paste into https://cloudconvert.com or https://svgtopng.com.

## Apple icon requirements

- 1024 x 1024 PNG, no alpha channel, sRGB.
- No rounded corners (iOS adds them).
- No transparency.
- No text overlay if it gets clipped on the home screen icon mask.

## Splash background

`app.json` already has `splash.backgroundColor: "#0a1628"` and
`splash.resizeMode: "contain"`. The splash icon is centered on that
color, so the icon's own ocean gradient blends into the splash bg.

## Updating the brand later

When the design firms up (Phase 5 polish), regenerate from these SVG
sources and replace the PNGs in `mobile/assets/`. Keep these SVGs as
the version-controlled source.
