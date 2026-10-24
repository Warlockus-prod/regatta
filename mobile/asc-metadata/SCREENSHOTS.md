# App Store screenshots

## Verified inventory, 2026-10-24

The live App Store Connect check of version 1.7.0 at
17:14:33 UTC found PREPARE_FOR_SUBMISSION and eight metadata locales.
Only the primary locale, en-US, owns screenshot sets:

| ASC display family | Existing assets | Accepted portrait sizes used here |
| --- | --- | --- |
| APP_IPHONE_67 | 5 COMPLETE | 1320 x 2868 or 1290 x 2796 |
| APP_IPAD_PRO_3GEN_129 | 5 COMPLETE | 2064 x 2752 or 2048 x 2732 |

The first image in both sets is named 01-home-build42.png. Its MD5 matches the
tracked old Home capture exactly. The other eight remote images were inventoried
but their current pixels were not independently reviewed. The COMPLETE state
means Apple processed an image; it does not confirm the full submission size
requirements or the accuracy of its content.

The repository contains ten English source PNGs, not seventy localized captures:

- screenshots/iphone-6.9/en/: 01-home, 02-bootcamp, 03-simulator,
  04-anatomy and 05-checklist, all 1320 x 2868.
- screenshots/ipad-13/en/: the same five filenames, all 2064 x 2752.

These source images show the historical interface. The simulator source shows
the old flat view, and the anatomy source shows the old photo/diagram screen.
Do not present these files as screenshots of build 59. The September 8 update
changed only Home to build 42 and preserved the other four remote images per set.
The old capture script, scripts/asc-screenshots.mjs, also describes historical
routes, device assumptions and manual language setup. It does not verify a
localized build 59 capture automatically.

The other seven metadata locales have no independent screenshot sets. They use
the primary-language screenshots according to App Store Connect's localization
fallback. This is separate from the application's seven UI languages. Do not
claim that localized screenshots have already been captured.

## Release 1.7.0 capture plan

Capture the actual installed candidate after the native clean-install and
upgrade checks. Start with three honest frames in each existing English set:

| Order | File | Required visible content |
| --- | --- | --- |
| 1 | 01-home.png | Current Home and its real learning/navigation entries |
| 2 | 02-pro-3d.png | Running solo 3D race in Pro, yacht visible, wheels and manual sail controls legible |
| 3 | 03-src-radio.png | Working SRC radio and a readable task in the reserved panel |

A fourth current learning frame may be added after review. Do not fabricate
progress, show a permission dialog, or describe unavailable speech as ready.
Use the English UI, with no debugging overlays or test fixtures visible. Keep
three or four frames per family rather than expanding to seventy assets.

The prepared capture devices are iPhone 18 Pro Max, 1320 x 2868, and iPad Pro
13-inch (M5), 2064 x 2752. Retain full-resolution opaque PNGs. The selected ASC
families are the existing API identifiers above, even though the source device
marketing names are 6.9-inch and 13-inch.

Apple's current specification also lists the medium Dynamic Island iPhone
sizes 1179 x 2556 and 1206 x 2622. The live version has no APP_IPHONE_61 set.
Confirm required/scaled placements in ASC's View All Sizes before submission;
the two existing COMPLETE sets alone are not proof of that final requirement.
If ASC asks for another family, capture and review that family explicitly.
The replacement tool does not silently create missing sets.

The carousel order is the manifest order, applied through the screenshot
relationship API. Filename sorting is not relied upon. There is no per-image
caption field in this uploader. Any marketing caption must be baked into a
reviewed image; bare native captures need no invented caption overlay.

## Safe replacement tool

Run from mobile/. The uploader validates all local images before authentication,
then checks the live app ID, bundle ID, exact existing iOS version and
PREPARE_FOR_SUBMISSION state. Every selected locale and family must already
exist. There is no implicit English locale, version, folder scan, version
creation, review cancellation or submission operation.

Create a manifest next to the new reviewed captures, for example:

```json
{
  "appId": "6768134329",
  "bundleId": "com.icoffio.regatta",
  "version": "1.7.0",
  "sets": [
    {
      "locale": "en-US",
      "family": "APP_IPHONE_67",
      "files": [
        "iphone/01-home.png",
        "iphone/02-pro-3d.png",
        "iphone/03-src-radio.png"
      ]
    },
    {
      "locale": "en-US",
      "family": "APP_IPAD_PRO_3GEN_129",
      "files": [
        "ipad/01-home.png",
        "ipad/02-pro-3d.png",
        "ipad/03-src-radio.png"
      ]
    }
  ]
}
```

Paths are relative to the manifest, or absolute local paths. Files must be
opaque 8-bit RGB/grayscale PNGs (an all-opaque alpha channel is accepted), have the selected family's supported dimensions,
and be distinct within each set. New files are reserved with deterministic
content-addressed filenames containing the full local MD5. This permits retry
without duplicating matching completed or uncommitted uploads.

```sh
node scripts/asc-upload-screenshots.mjs --version 1.7.0 --manifest /absolute/path/screenshots59.json
node --test scripts/asc-upload-screenshots.test.mjs
```

The first command is a dry run. It performs GET requests only and writes a local
report next to the manifest. Inspect the selected locale/family, desired order,
checksums and old IDs before applying. An explicit --report path is also accepted.
Once the six actual frames are reviewed and release authorization covers the
update, the operator applies that same manifest:

```sh
node scripts/asc-upload-screenshots.mjs --version 1.7.0 --manifest /absolute/path/screenshots59.json --apply --replace
```

The tool uploads all desired images in all selected sets, commits their MD5,
then waits up to ten minutes for every image to become COMPLETE. Before any old
image is deleted it rechecks the app/version and the selected set memberships.
A changed set, upload/processing failure, checksum mismatch or timeout retains
all old images. Only the initial old IDs in explicitly selected sets can be
deleted; unrelated locales, families and previews are untouched. The tool then
sets and verifies the exact desired order and checksums.

There must be enough free slots to upload before deletion: existing count plus
new reservations cannot exceed ten per set. This release's five old plus three
new images fit. A failed or expired matching reservation requires inspection;
the tool refuses to silently delete it. Retry transient failures with the same
manifest and unchanged files. Completed uploads are reused; an interrupted final
ordering can be retried without uploading again. The local report records the
snapshot and last successful stage. It contains no JWT or signed upload URL.

No new build 59 screenshots have been applied by this documentation/tooling
change. Capture, native review and the explicit apply are separate release steps.

## Apple references

- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Localize app information](https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information)
- [Manage your App Store assets](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets/)
- [Uploading assets to App Store Connect](https://developer.apple.com/documentation/appstoreconnectapi/uploading-assets-to-app-store-connect)
