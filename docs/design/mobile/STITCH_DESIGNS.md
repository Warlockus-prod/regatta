# Stitch design exploration

Status: paused, in-app implementation now leads (2026-05-12).
AI-generated mock screens via Google Stitch (Gemini 3 Flash) using the
brand brief from [DESIGN_BRIEF.md](./DESIGN_BRIEF.md). These are
**starting points for the human designer**, not final assets. Use them
to compare directions, extract patterns, and accelerate Figma work.

> **Update 2026-05-12.** Stitch generation paused. The actual mobile
> app code in `mobile/app/` now mirrors the web home pattern directly
> (per-card tinted entry cards, hero pulse pill on placeholder routes,
> emoji + "Start →" CTA). Stitch design system asset
> `assets/8050136824173722259` was rewritten to v3 with a web-mirror
> `designMd` (multi-color accents, no Material tonal layers, brand
> voice "calm maritime" instead of "command center"). Future Stitch
> generations will inherit it. Designer's job for v1 is to take the
> shipping app as the visual baseline and refine it into a Figma
> system, not to wait on Stitch to fill in screens.

## Project

| Field | Value |
|---|---|
| Stitch project | `Week to Regatta - iOS` |
| Project ID | `7573654568267784883` |
| Web UI | https://stitch.withgoogle.com/projects/7573654568267784883 |
| Design system asset | `assets/8050136824173722259` (v3, web-mirror) |
| Design system name | "Week to Regatta" (v3 - web-mirror, replaced "Cyan-Deep Space") |
| Owner | `andrlock@gmail.com` (Google account) |

The Stitch AI took our designMd brief and produced its own
"Cyan-Deep Space" interpretation: same cyan #00d4ff + dark navy
#0a1628 palette + Inter font, but added Material-style tonal layers
(`surface-container`, `on-surface-variant`, etc.) and reframed the
brand voice as "Cyber-Professional" / "command center" instead of our
"calm maritime" target. Results are usable as direction; final tone
needs human designer pushback in step 2.

## Generated screens

All viewable in the Stitch web UI under the project link above. The
table also gives direct screenshot URLs for quick sharing.

| # | Screen | Stitch screen ID | Quick view |
|---|---|---|---|
| 1 | Lesson detail "Wind & Direction" | `55380beac48b4d9084bb27b5d86eddd6` | [PNG](https://lh3.googleusercontent.com/aida/ADBb0uj9BRVbVXtWrnZyOnGTMgbVMz-pfuNg8MXjRylOY1ToDg_uGQTUGyXY7o-VeYsJNFNrYk-oA5aIpMbWBeOkj4grs4hq_xjxa0UIee9wacmzfwy_tWbTfNxK_AVFFjJw080G8sGAtR8eXyqOuOGO27O6ISl95ziEkMDBHAm7UkLRgOp7dmyR-Y7Njp5OpcocRrx5g59oadFpuf3IioC5F7A-e4_e2LcnkuyVEP4DRaAv93EtppvDLSw-bA) |
| 2 | Glossary search | `44f92ec7358e4079bf432e7fdd47fe38` | [PNG](https://lh3.googleusercontent.com/aida/ADBb0ujhSJssN_e8cPhpcSri7rVi6XQ9nAhQOV5Tr-1rs6UEVsbi8uEs3f_2vgYSprJCVfJKdvtcYxxwWzF1y_1kj9lLg8ecdI6qa54QAQfrCdgtBTwRzieahnx3ufj96XZbogvVBU0w_XWgV0S6EeMolsnooZ7dNIEHKT2nVk3-fI-P_GaD5V8SZz0p9LXQYXRDTJQxbvgqf69HdG3fpPjVLQD7oqEbAACvajRBKxeV3aVMsCBZKuGpoVa3rw) |
| 3 | Settings (language picker + About) | `442d62d1d4b3490bb27b25e4161c7afd` | [PNG](https://lh3.googleusercontent.com/aida/ADBb0ugKc9OwrRrAVGhyu5xDxvuy1T0VTSAhnAFTvZSs7AFo1a-MpfRoLwE54D79Yz1Zt1vYi9KHRJoVQ-_nd-k0J2oEV7yrjbFnEE6pCBlJ18NypZ-qksBAFsQ6D-EdfWudyKQQGPYk4w9aWyK-7FstMaHc76MNZVX03hxxtoOqRb5UtQ_uzfA-2bjdkuwO-R9Dc85QqedMO4b_1ndUIMqIElaplc31LLDLoKfUdh4Plrw-vpleHR8YSVik) |

Each Stitch screen also has downloadable HTML
(`projects/.../files/<id>` references in the API). The HTML is
agnostic React-Tailwind code; useful for designer to inspect raw
markup, but engineering keeps the React Native implementation in
`mobile/app/` separately.

## Screens still to generate

Timed out from the MCP RPC layer in this session, possibly succeeded
server-side; user can verify in the Stitch web UI:

| Screen | Status |
|---|---|
| Home (brand wordmark + 4 sections) | requested, RPC timeout, status unverified in UI |
| Bootcamp index (8-lesson list with progress) | requested, RPC timeout, status unverified in UI |
| Simulator (Skia-style 2D canvas + HUD) | requested, RPC timeout, status unverified in UI |

Easy to retry by re-running `generate_screen_from_text` with the same
project + design system (see prompts in this conversation transcript).

## Yet-to-prompt screens (Phase 1 polish)

For full coverage of the 15 user-facing routes, the following still
need to be generated:

- Quick refresh (6 short tips)
- Rules index (8 collision scenarios with RRS / COLREGS badges)
- Rules scenario detail (reveal-style Q/A)
- Onboard (8 etiquette sections)
- Anatomy (17 yacht parts list)
- Courses (5 points of sail with polar diagram)
- Racing (rules + strategies)
- Gallery (photo + YouTube grid)
- Multiplayer placeholder (Phase 4)
- Leaderboard placeholder (Phase 3)

Plus state variants (loading, empty, error, offline) per
[DESIGN_BRIEF.md](./DESIGN_BRIEF.md) section 3.3.

## How the designer uses this

1. **Open Stitch web UI** at the project link, view all generated
   screens side-by-side.
2. **Audit tone**: the AI leaned "Cyber-Professional"; brand brief
   says "calm maritime". Designer pushes back in their Figma comp
   toward the brief's actual reference apps (Things 3, Day One, Sky
   Guide).
3. **Extract usable patterns**: spacing rhythm, card stacking,
   header chrome, type hierarchy. Stitch's interpretation is a useful
   floor; designer raises it.
4. **Replace AI compositions** with hand-crafted Figma frames per
   the spec in [DESIGN_BRIEF.md](./DESIGN_BRIEF.md). Stitch never
   ships to App Store directly; it is the brainstorming tool.
5. **Keep the design system asset id** above as the source of truth
   for any future Stitch generations the designer wants to do
   themselves (e.g., variant explorations).

## Regenerating or extending

To make more screens:

```text
Tool: mcp__stitch__generate_screen_from_text
projectId: 7573654568267784883
designSystem: assets/8050136824173722259
deviceType: MOBILE
modelId: GEMINI_3_FLASH (faster) or GEMINI_3_1_PRO (higher quality, slower)
prompt: <screen description, see prior generations for style>
```

To explore variants of an existing screen:

```text
Tool: mcp__stitch__generate_variants
projectId: 7573654568267784883
selectedScreenIds: [<id>]
prompt: <what to vary>
variantOptions: { variantCount: 3, creativeRange: EXPLORE, aspects: [LAYOUT, COLOR_SCHEME] }
```

To apply a refined design system to existing screens:

```text
Tool: mcp__stitch__apply_design_system
projectId: 7573654568267784883
assetId: <new design system id>
selectedScreenInstances: [{ id: <screen instance id>, sourceScreen: projects/.../screens/<id> }]
```

## Notes

- Stitch's tool calls are heavy on response payload (~30 KB per
  generation due to embedded design tokens). Keep generations
  spaced; do not parallelize.
- Each `generate_screen_from_text` may return RPC timeout but the
  server-side generation usually completes; check the Stitch UI a
  few minutes later before retrying to avoid duplicates.
- The Stitch-generated HTML is **React + Tailwind**; it is NOT what
  ships in the app. Engineering implements in React Native by hand
  using these designs as visual reference only.
- Stitch tools require the MCP server to be registered locally:
  ```bash
  claude mcp add stitch --transport http \
    --header "X-Goog-Api-Key: <YOUR_KEY>" \
    https://stitch.googleapis.com/mcp
  ```
