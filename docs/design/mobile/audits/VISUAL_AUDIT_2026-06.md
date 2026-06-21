# Mobile visual / parity audit - 2026-06-21

Source: 5-agent code/parity workflow (mobile screen vs web counterpart) + manual
visual pass on the iOS Simulator. 37 findings across 14 screens: **6 high, 14
medium, 17 low**. Web is treated as the canonical content/visual source; mobile
should mirror it.

Status legend: [ ] open  [x] fixed

## High priority
- [ ] **settings** parity/bug - stale support email `support@icoffio.com`; web moved to `support@gtframe.io` (commit c2c80fa). Feeds mailto + error fallback + supportHint + privacy modal. `mobile/app/settings.tsx:33` -> set `SUPPORT_EMAIL='support@gtframe.io'`.
- [ ] **multiplayer** bug - room-code copy/paste uses deprecated RN core `Clipboard` (no-op on RN 0.81); `expo-clipboard` not installed. `host.tsx:2,113`, `join.tsx:161` -> add `expo-clipboard`, use `setStringAsync`/`getStringAsync`. (Needs native dep -> bundle with the build.)
- [ ] **quick** parity - lessons are inert Cards (no onPress) though each has a `route`. `mobile/app/quick/index.tsx` -> `onPress={() => router.push(lesson.route)}`, role button.
- [ ] **racing** parity - entire "Key Concepts" section (Layline, VMG, Clear Air, Wind Shadow + 4 SVG diagrams) absent vs web. `mobile/app/racing/index.tsx` -> port the section. (Large.)
- [ ] **courses** parity/bug - `SECTOR_META` hardcodes wedge boundaries (in-irons 0-30, close-hauled 30-60) but `pointOfSailAt()` + data use 45/60; the 30-45 band reads red no-go but taps to close-hauled. `PointsOfSailDiagram.tsx` -> derive min/max from `pointsOfSail`.
- [ ] **courses** design - `SECTOR_META` invents RGBA tints instead of canonical `point.color`; wheel color != card color for the same course. `PointsOfSailDiagram.tsx` -> tint from `point.color`.

## Medium
- [ ] courses parity - omits the "Two sails, not one" theory section (main/jib/slot + Genoa/Gennaker/Spinnaker). `courses/index.tsx`.
- [ ] glossary parity - drops EN anchor term + EN definition + category badge for non-EN langs. `glossary/index.tsx`.
- [ ] home parity - never links to `/checklist`. `app/index.tsx` -> add a ListRow.
- [ ] simulator a11y - control chips + Reset ~24-28pt, no `minHeight:44`. `simulator/index.tsx`.
- [ ] simulator a11y - Skia wind/steer drag has no accessibilityRole/label. `simulator/index.tsx:424-447`.
- [ ] game parity - finish panel has no "Watch replay" (replay saved + `/replay/[id]` exists). `game/index.tsx:846-929`.
- [ ] replay parity - omits color-coded event markers (tack/no-go/mark). `replay/[id].tsx`.
- [ ] quick parity - missing per-lesson `{estMinutes} min` pill + Bootcamp footer link. `quick/index.tsx`.
- [ ] rules i18n - `intro/rrsTitle/colregsTitle/colregsIntro/officialText` are 3-arg `tp()`; es/fr/de/it fall back to EN. `rules/index.tsx:31,37,42,47,52`.
- [ ] rules parity - missing RRS official-text links block + es/fr/de/it federation links. `rules/index.tsx`.
- [ ] onboard parity - drops intro paragraph, "Deeper by topic" cards (/anatomy,/checklist), closing summary. `onboard/index.tsx`.
- [ ] checklist parity - omits web's closing summary card. `checklist/index.tsx`.
- [ ] checklist a11y - `itemRow` ~30pt, no hitSlop. `checklist/index.tsx ~195`.
- [ ] anatomy a11y - "All parts" chips ~30pt. `anatomy/index.tsx ~209`.
- [ ] settings i18n - email literal hardcoded in 7 supportHint variants instead of `${SUPPORT_EMAIL}`. `settings.tsx:162-172`.

## Low
- [ ] courses parity - EN anchor name missing on non-EN cards/banner. `courses/index.tsx`.
- [ ] home parity - Quick card loses web's "refresh in 15 min" hook. `app/index.tsx`.
- [ ] quick parity - header generic vs web's minutes + "regatta tomorrow" copy. `quick/index.tsx`.
- [ ] simulator design - `sailStateColor()` overtrim returns inline `#f5e26b`. `simulator/index.tsx:317`.
- [ ] game a11y - result buttons ~33pt. `game/index.tsx:1072`.
- [ ] replay parity - no "Try it yourself -> /game" CTA. `replay/[id].tsx:619-633`.
- [ ] replay bug - Share emits code-only string, no link. `replay/[id].tsx:407-419`.
- [ ] bootcamp parity - completed badge renders literal "OK" not a checkmark. `bootcamp/index.tsx:175`.
- [ ] bootcamp design - `checkBadge` hardcodes `rgba(68,255,136,...)` vs `colors.success`. `bootcamp/index.tsx:262`, `[id].tsx:672`.
- [ ] anatomy i18n - IT caption "vista dallalto" missing apostrophe -> "dall'alto". `anatomy/index.tsx ~135`.
- [ ] checklist bug - dead `sectionsView.length===0` branch. `checklist/index.tsx ~168`.
- [ ] coach typography - unicode ellipsis in 7 loadingLabel variants -> ASCII "...". `coach/index.tsx:152-162`.
- [ ] leaderboard i18n - global nickname fallback hardcodes EN `'anon'`. `leaderboard/index.tsx:540`.
- [ ] leaderboard parity - `formatTime` `m:ss` vs web `m:ss.x`. `leaderboard/index.tsx:60-65`.
- [ ] settings parity - About shows stale "Phase 1 - Content shell". `settings.tsx:89-93,276`.
- [ ] settings design - selected-language marker renders literal "OK" not the check glyph. `settings.tsx:248`.

## Cross-cutting themes
1. Sub-44pt touch targets (5 screens) - no `minHeight:44` anywhere; add a shared pressable/chip convention.
2. Inline color literals bypassing `tokens.ts` (4 sites) - add `overtrim/caution`, `surfaceSuccess/borderSuccess` tokens.
3. Literal "OK" used as an icon (2 screens) - use the `check` glyph.
4. 3-arg `tp()` leaving es/fr/de/it on English (rules, settings, +content).
5. Content-parity erosion on teaching screens (racing, courses, rules, onboard, quick, checklist each drop a web section) - treat web `page.tsx` as content source-of-truth.
6. Diagram geometry/color drifting from canonical data (courses) - derive from data, never hardcode.
7. Cross-navigation gaps (home->checklist, replay->game, quick->bootcamp, game->replay).
