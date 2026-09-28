# Lesson images: provenance

Images used by the lesson screens, copied unchanged from the Codex graphics kit
(`design/codex-visual-kit-2026-09-28/graphics/assets/` in the owner's main
checkout, kit dated 2026-09-28; the kit is not in git). Hotspot coordinates and
their meaning come from the kit's `catalog.js` and live, localized, in
`mobile/src/lessons/graphics/photos.ts`.

| File | Size | Kind | Origin | Use and limits |
|---|---|---|---|---|
| `sail-handling.jpg` | 1200 x 1200, 363 460 bytes | AI-generated illustration | Codex kit, batch 1 (`PROMPTS.md`, entry `sail-handling`, master `assets/sail-handling-v1.png`), built-in image generation, no reference photo | Recognising the large parts (sail, boom, sail cover, mast). Not a reference for how lines are led, blocks, fittings or loads. Shown in the app as an illustration, never as a photo of a real boat or place. |

Drawings (`rig-basics`, `wind-direction`) are not image files: they are drawn
from code (`mobile/src/lessons/graphics/drawings.ts`, a port of the kit's
`drawings.js`), and the kit's exports are kept as test fixtures in
`mobile/__tests__/fixtures/codex-graphics/`.
