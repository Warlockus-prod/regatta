# Mobile visual / parity audit - 2026-06-21

Source: 5-agent code/parity workflow (mobile screen vs web counterpart) + manual
visual pass on the iOS Simulator. 37 findings across 14 screens: **6 high, 14
medium, 17 low**. Web is treated as the canonical content/visual source; mobile
should mirror it.

Status legend: [ ] open  [x] fixed.  `(b20)` = fixed in build 20, `(b21)` = fixed
in build 21.

**RESOLUTION: all 37 findings are fixed.** Build 20 cleared 5 of 6 high items +
the touch-target / typography / token / cross-nav themes. Build 21 cleared the
remaining content-parity ports (the large racing "Key Concepts" port, courses
theory, rules i18n + links, onboard sections, quick header, glossary anchors,
checklist summary) and the last polish items, each verified by an adversarial
parity + typography + 7-language reviewer and the project gate (sync-content +
lint + tsc + 108/108 jest).

## High priority
- [x] (b20) **settings** parity/bug - stale support email `support@icoffio.com`; web moved to `support@gtframe.io` (commit c2c80fa). Feeds mailto + error fallback + supportHint + privacy modal. `mobile/app/settings.tsx:33` -> set `SUPPORT_EMAIL='support@gtframe.io'`.
- [x] (b20) **multiplayer** bug - room-code copy/paste used deprecated RN core `Clipboard` (no-op on RN 0.81); now `expo-clipboard` with `setStringAsync`/`getStringAsync`. `host.tsx`, `join.tsx`.
- [x] (b20) **quick** parity - lessons are now Pressable -> `router.push(lesson.route)`, role button. `mobile/app/quick/index.tsx`.
- [x] (b21) **racing** parity - ported the full "Key Concepts" section (Layline, VMG, Clear Air, Wind Shadow) + 4 native SVG diagrams (`RacingConceptDiagram`) from the web, verbatim 7-language copy. `mobile/app/racing/index.tsx`, `RacingDiagrams.tsx`.
- [x] (b20) **courses** parity/bug - `SECTOR_META` now derives wedge boundaries from `pointsOfSail` (no more 30-45 dead band). `PointsOfSailDiagram.tsx`.
- [x] (b20) **courses** design - wheel tints now come from canonical `point.color`. `PointsOfSailDiagram.tsx`.

## Medium
- [x] (b21) courses parity - ported the "Two sails, not one" theory section (main/jib/slot + Genoa/Gennaker/Spinnaker). `courses/index.tsx`.
- [x] (b21) glossary parity - non-EN langs now show the EN anchor term + EN definition + category badge. `glossary/index.tsx`.
- [x] (b20) home parity - added a `/checklist` ListRow. `app/index.tsx`.
- [x] (b20) simulator a11y - control chips + Reset now `minHeight:44`. `simulator/index.tsx`.
- [x] (b21) simulator a11y - Skia wind/steer control now has accessibilityRole + a live-value accessibilityLabel. `simulator/index.tsx`.
- [x] (b21) game parity - finish panel now has a "Watch replay" button -> `/replay/[id]`. `game/index.tsx`.
- [x] (b21) replay parity - added color-coded event markers (tack/no-go/mark) pinned to the track canvas + a legend. `replay/[id].tsx`.
- [x] (b21) quick parity - per-lesson `{estMinutes} min` pill + Bootcamp footer link. `quick/index.tsx`.
- [x] (b21) rules i18n - intro/rrsTitle/colregsTitle/colregsIntro/officialText now carry es/fr/de/it (no English fallback). `rules/index.tsx`.
- [x] (b21) rules parity - added the RRS/COLREGS official-text links block + es/fr/de/it federation links. `rules/index.tsx`.
- [x] (b21) onboard parity - added the intro paragraph, "Deeper by topic" cross-link cards (/anatomy, /checklist), and the closing summary. `onboard/index.tsx`. Web `src/data/onboard.ts` also backfilled with es/fr/de/it items for all 8 sections (the v1.1 backfill had only landed in the mobile bundle), so the sync-content parity guard is green.
- [x] (b21) checklist parity - added the web's closing summary card. `checklist/index.tsx`.
- [x] (b20) checklist a11y - `itemRow` now `minHeight:44`. `checklist/index.tsx`.
- [x] (b20) anatomy a11y - "All parts" chips now `minHeight:44`. `anatomy/index.tsx`.
- [x] (b20) settings i18n - supportHint variants now interpolate `${SUPPORT_EMAIL}`. `settings.tsx`.

## Low
- [x] (b21) courses parity - EN anchor name now shown on non-EN cards + active banner. `courses/index.tsx`.
- [x] (b21) home parity - Quick card now carries the web's "refresh in ~15 min" hook. `app/index.tsx`.
- [x] (b21) quick parity - header now mirrors the web's minutes + "regatta tomorrow" copy. `quick/index.tsx`.
- [x] (b21) simulator design - `sailStateColor()` overtrim now returns `colors.overtrim`. `simulator/index.tsx`.
- [x] (b20) game a11y - result buttons now `minHeight:44`. `game/index.tsx`.
- [x] (b21) replay parity - added a "Try it yourself -> /game" CTA. `replay/[id].tsx`.
- [x] (b21) replay bug - Share now emits a usable link (`/r/{code}`), not a bare code. `replay/[id].tsx`.
- [x] (b20) bootcamp parity - completed badge now renders the `check` glyph, not literal "OK". `bootcamp/index.tsx`.
- [x] (b21) bootcamp design - `checkBadge` now uses `colors.surfaceSuccess` / `colors.borderSuccess` tokens. `bootcamp/index.tsx`, `[id].tsx`.
- [x] (b20) anatomy i18n - IT caption fixed to "dall'alto". `anatomy/index.tsx`.
- [x] (b21) checklist bug - removed the dead `sectionsView.length===0` branch. `checklist/index.tsx`.
- [x] (b20) coach typography - loadingLabel variants now ASCII "...". `coach/index.tsx`. (Build 21 also scrubbed the same unicode ellipsis from game `savingLabel`.)
- [x] (b21) leaderboard i18n - global nickname fallback now a 7-language `tp()`, not hardcoded EN `'anon'`. `leaderboard/index.tsx`.
- [x] (b20) leaderboard parity - `formatTime` now `m:ss.x`. `leaderboard/index.tsx`.
- [x] (b20) settings parity - removed the stale "Phase 1 - Content shell" About text. `settings.tsx`.
- [x] (b20) settings design - selected-language marker now the `check` glyph. `settings.tsx`.

## Cross-cutting themes (all addressed across b20 + b21)
1. Sub-44pt touch targets - `minHeight:44` added on the offending controls across simulator / checklist / anatomy / game / replay / onboard.
2. Inline color literals bypassing `tokens.ts` - added `overtrim`, `surfaceSuccess`, `borderSuccess` tokens; simulator + bootcamp now reference them.
3. Literal "OK" used as an icon - replaced with the `check` glyph (bootcamp, settings).
4. 3-arg `tp()` leaving es/fr/de/it on English - rules + leaderboard + every new build-21 string now carry all 7 languages.
5. Content-parity erosion on teaching screens - racing, courses, rules, onboard, quick, checklist, glossary brought back to the web content source of truth.
6. Diagram geometry/color drifting from canonical data - courses wheel now derives geometry + color from `pointsOfSail`.
7. Cross-navigation gaps - home->checklist, replay->game, quick->bootcamp, game->replay all wired.
