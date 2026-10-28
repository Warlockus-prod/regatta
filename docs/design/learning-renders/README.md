# Sailing learning renders: first comparison pair

Status updated2026-10-28: the first Scheme/Picture pilot is delivered in TestFlight1.7.0(67) and retained in69. See `docs/design/mobile/testflight67-2026-10-26.md` and `docs/audits/2026-10-26/learning-visuals-harness.md` for the qualified acceptance. The wider illustration collection is unfinished; these images are not an approved rigging diagram.
Created2026-10-26 using the built-in `image_gen` tool. The second image edits the first reference; no CLI/API fallback was used. Original PNGs remain in the generation output, while these project-local WebP copies preserve1536x1024 composition at quality90.

| Asset | Purpose | SHA256 |
| --- | --- | --- |
| `mainsail-filled-v1.webp` | Illustrative close-up of a filled mainsail | `1a3d39ce42caaf1a4ed4459df9d7986485436aac96127dab65ed492281e3224d` |
| `mainsail-luffing-v1.webp` | Same composition with luffing cloth | `c23536f562fcd50d0c967c2c6c4c45c4a7902970abc0d7650d89057d9d8653f0` |

## Review and teaching limits

- Both images show a recognizable sail, mast, boom and cabin. The comparison keeps the same framing and clearly changes the cloth.
- The sail head is cropped despite the original full-sail request. Use only as a labeled close-up. Do not use it to teach whole-rig dimensions, mast height or full sail geometry.
- AI ropes, fittings and cloth shape are illustrative, not a technical source. No pressure field, aerodynamic coefficient or correct sheet setting can be read from this image.
- Wind and force arrows, labels and captions must be code-native, localized and reviewed against the lesson's coordinate system before integration. Keep the verified scheme available.
- Selecting an illustration, opening every marker or seeing both images never earns learning completion.
- Priority adaptations are PL/RU/EN. Proposed terms: RU «Наполненный парус / Парус полощет», EN "Filled sail / Luffing sail", PL "Żagiel pracuje / Żagiel łopocze". Final lesson wording belongs in the shared content resource.

## Prompt1, generate

```text
Create one premium realistic 3D educational render for a sailing lesson, landscape 3:2. A physically plausible white Dacron mainsail on an unbranded modern two-sail cruising yacht, viewed close from the stern quarter on the leeward side. Main focus is the curved aerodynamic shape of the filled mainsail: convex smooth belly, proper sewn radial/broadseam panels, a real straight mast at the forward luff, a rigid boom along the foot, realistic attachment at head/tack/clew and correct simple rigging. Moderate beam-reach sailing in steady wind, sail is filled and smoothly curved without flapping. Include enough of the cabin roof and calm blue sea to explain scale, soft daylight, crisp readable sail against uncluttered muted ocean background. Compose the entire sail inside the frame, mast on image left and clew/boom toward image right, leaving generous clear sky at upper-right and water at lower-right for later localized teaching annotations. This is a working instructional illustration, not a heroic advertising shot: understandable geometry, no fantasy ropes, no extra sails, no duplicated spars, no people. NO text, NO letters, NO numbers, NO arrows, NO pressure heatmap, NO logo, NO inset panels. Accurate vector arrows and localized labels will be overlaid separately by the app after technical review.
```

## Prompt2, edit using image1

```text
Create the matching second instructional image using this render as the exact yacht, camera, lighting and composition reference. Preserve the hull, straight mast, straight boom, ocean, sky, real sail corner attachments and major rigging positions. Change ONLY the mainsail cloth state from a smooth filled sail to a visibly LUFFING sail with no stable aerodynamic shape: the forward luff area and middle cloth show realistic soft traveling ripples and slack alternating convex/concave folds. The sail is still fully hoisted and attached to the same mast and boom; no tear, no missing cloth, no change of rig type. Keep realistic white Dacron seams and restrained wrinkles, not crumpled fabric or a bedsheet. It should be immediately understandable as a comparison with a filled sail. Do not add any text, arrows, labels, symbols, pressure colors, extra objects or people. The app will add localized explanation and technically reviewed vectors separately. Landscape 3:2, same framing and dimensions as reference.
```

## Current outputs

The production candidates are `public/learning/mainsail-filled.jpg` and
`public/learning/mainsail-luffing.jpg`, encoded from the WebP pair without
cropping, retouching or new generation. The same two files serve web and native;
Metro watches only this shared asset directory. Code-native numbered leaders
identify luff, cloth and leech; the existing force diagram stays below the image.
It is a comparison of shape, not a calculated aerodynamic field. Labels and
observations are shared in `src/data/sail-shape.ts` and adapted in all seven
languages. The wider illustration collection remains unfinished.

| Packaged asset | Bytes | SHA256 |
| --- | --- | --- |
| `public/learning/mainsail-filled.jpg` | 256611 | `3744dfed92411fad4e5eeccc1f365be4c1a302fa55d137b9060d1e06efb5389f` |
| `public/learning/mainsail-luffing.jpg` | 276132 | `17180fbfe8f4ce56bd30655b0dcfc0054ec639114b2ba2bd520afbff19940def` |

Acceptance: `docs/audits/2026-10-26/learning-visuals-harness.md`.

![Filled mainsail close-up](mainsail-filled-v1.webp)
![Luffing mainsail close-up](mainsail-luffing-v1.webp)
