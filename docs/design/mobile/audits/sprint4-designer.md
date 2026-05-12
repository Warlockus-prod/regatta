# Mobile Designer + 3D audit (Sprint 4)

Audit date: 2026-05-12. Auditor: Designer / 3D Visualist agent
(4th seat after PM / Tester / Full-Dev). Scope: visual + UX polish
on top of Sprint 3 (real VPP physics, interactive Skia polar,
anatomy hotspot poster, Day-N-of-7 bootcamp arc, checklist).

Companion to the [PM audit](./pm-report.md). PM owns scope, this
report owns brand, iconography, illustrations, motion, 3D, App
Store story, and Stitch coordination.

---

## TL;DR (top 5 visual gaps, ranked)

1. **Iconography is still emoji** across every entry surface
   (Home, Bootcamp, Continue card, Quick, Rules, Onboard, Anatomy
   chips). On the App Store this is the single loudest "hobby app"
   tell. Fix: ship a 24x24 cyan-tint line-icon set (5 critical
   glyphs added in this pass, ~19 more spec'd in Section 6).
2. **Brand wordmark is divergent and low-rent**. Home stacks two
   `Text` children, Splash uses a square PNG with a sailboat,
   About card inlines body. Three different wordmarks in three
   places. Fix: a shared `<Wordmark size="xl|m|s"/>` plus a
   refined splash that echoes the wordmark, not an isolated boat.
3. **Anatomy yacht reads as a wireframe, not a poster.** Sails
   are flat triangles, hull is two arcs, water is a 1pt line.
   Fix: redraw paths in `yacht-svg.ts` with curved sails, a
   weighted hull line, and a faint warm horizon.
4. **Simulator chrome lacks designer love**. Sprint 3 added VPP +
   wind compass + apparent-wind ghost; HUD is still three plain
   cells, the boat is a 4-vertex Skia path, the wake is a solid
   line. Stitch screen generated this round (Section 3) shows
   the target.
5. **No empty / loading / error states anywhere.** Every Tier-2
   surface renders zero items quietly on failure. Add a
   `<EmptyState>` + `<Skeleton>` + `<OfflineBanner>` triad with
   a small line-art glyph and one sentence each.

Bonus: App Store listing has zero shot template - if we shoot
phone screenshots tomorrow we have nothing to caption them with.
Section 7 covers a 5-frame story.

---

## 1. Per-surface visual audit

### 1.1 Home (`mobile/app/index.tsx`)

Current: stacked wordmark, optional Continue Day-N card, three
primary entry cards (Bootcamp / Quick / Rules) with emoji + cyan/
green/orange accent, two `ListRow` groups.

Gaps: emoji `🎓` `⚡` `📖` in entry cards read as kids-app; Continue
card has a 28pt `🎓`; wordmark is inline `Text` not a component
(PM P1-10); no "Today's challenge" slot; Tools section silently
links to placeholder routes (PM P0-4).

Fix: replace `emoji=` with `icon=` consuming the new SVG set
(below); extract `<Wordmark>`; hide placeholder Tools rows or
repaint them as muted "Coming soon" rows.

### 1.2 Bootcamp (`mobile/app/bootcamp/*`)

Current: 8 lessons grouped by Day 1-7, hero emoji per lesson,
green "OK" pill on completion.

Gaps: per-lesson emoji vary across iOS versions (vendor rendering
inconsistency); day separator has no visual weight; lesson detail
"Focus this time" card is the only block of cyan tint - everything
else is grey-on-dark.

Fix: map each of 8 lessons to an icon (5 added + 3 to author);
day separator becomes a slim 8-dot progress strip with the
next-up dot pulsing; lesson hero card uses 8% cyan tint + 30%
cyan border (web signature pattern).

### 1.3 Simulator (`mobile/app/simulator/index.tsx`)

Current: 320x260 Skia canvas, top-down boat, arrow grid, no-go
wedge, apparent-wind ghost, top-right wind compass, three-cell
HUD.

Gaps: boat sprite is a 4-vertex Skia path; wake is a solid line
that does not fade; HUD cells are flat; no mode bar (training /
drills / scenarios) per ROADMAP; Reset is a bare button.

Fix (designer artifact + dev request):
- Author Skia top-down yacht with separately-rotatable mainsail
  and jib so apparent wind swings the sails (Section 5 spec).
- Wake: switch to fading dot trail (alpha ramps from 1.0 at boat
  to 0.0 at tail).
- HUD: 3 glass-blur cells (`expo-blur`), tabular cyan numerals,
  small caps label, thin cyan rule between cells. Stitch brief at
  ID `2132a8d771134b53887142452ad6329b` (Section 3.1).
- Mode bar: pill switch at bottom dock, inactive muted, active
  cyan-tinted.
- Reset: replace text with `arrow-counterclockwise` icon (icon
  set, future).

### 1.4 Polar / Courses (`mobile/app/courses/*`,
`PointsOfSailDiagram.tsx`)

Current: Sprint 3 added a real interactive Skia polar with
draggable heading line, wind speed switcher, color sectors.

Gaps: boat-in-center is a generic glyph (should reuse the new
sail icon for cross-screen consistency); wind arrow at top is
geometrically correct but reads thin; tap-on-sector pulse
(PM P2-1) is not wired.

Fix: standardize on `sail.svg` mark; active-sector pulse = shadow
ring 30% accentCyan animating 0 -> 8pt over 600 ms cubic-bezier
(0.2, 0.8, 0.2, 1); add micro-caps sector labels at outer ring.

### 1.5 Anatomy poster (`mobile/app/anatomy/index.tsx`,
`mobile/src/anatomy/yacht-svg.ts`)

Current: 1000x500 SVG, 20 paths grouped as hull / sail / rig /
foil / water; hotspot overlay with pulse animation; bottom sheet
for part details.

Gaps: yacht reads as technical schematic, not poster - sails are
flat triangles, hull is two arcs with flat deck, rig is 1.5pt
straight lines, water is one horizontal stroke (boat floats in a
void). Hotspot rings are well-tuned, keep as-is.

Fix (paths-only rewrite, ~1-2 h):
- Mainsail: replace flat triangle with Bezier (windward edge
  curves out about 8% of chord length).
- Jib: same treatment with slight overlap onto main.
- Hull: double-line (2pt outer + 1pt inner waterline) with faint
  cyan shadow under the keel for depth.
- Horizon: add subtle warm-amber gradient just under y=330 (10%
  warning hex at 0% -> 0% at 30 px below) to suggest dawn.
- Mast: keep, add 2 small spreader lines.

Held back this round to preserve focus on icons + report.

### 1.6 Checklist (`mobile/app/checklist/index.tsx`)

Current: ported from web in Sprint 3, section cards with bullet
items.

Gaps: section icons are absent; no "completed" state.

Fix: reuse icon set (4 new glyphs: `ear`, `clock`, `bag`,
`weather`) at 20pt cyan in card header. Tap-to-check is a v1.x
upgrade.

### 1.7 Settings (`mobile/app/settings.tsx`)

Current: 7-card language picker + About card.

Gaps: cards have native names but no visual cue - some users scan
flags faster than text; About uses inline wordmark.

Fix: small 2-letter ISO pill (`RU` / `EN` / `PL` / ...) tinted
cyan, next to native name (flags carry political weight, ISO is
safer); About uses `<Wordmark size="m"/>`.

### 1.8 Game / Multiplayer / Leaderboard placeholders

Current: identical `<PlaceholderScreen>` shape for all three with
phase-pointer + bullet highlights.

Gaps: identical shape feels dead-endy; bullets read as marketing
copy on an empty surface.

Fix (PM owns the call): hide Multiplayer + Leaderboard from Home
until they land (PM P0-4). If keeping, redesign
`<PlaceholderScreen>` as a small line illustration + one sentence
+ a "Notify me" button (future opt-in).

---

## 2. Design-token additions (this pass)

Updated `mobile/src/design-system/tokens.ts`:

- `glow.{primary, success, warning}`: cyan / teal / amber halo
  spec for iOS shadow on a `View`. Applied to PulsePill, Continue
  card, Anatomy hotspot ring. Android falls back gracefully.
- `shadow.{card, lift, sheet}`: layered drop-shadow scale tuned
  for the dark-ocean base. Pure black does not show on the navy;
  warm slate alpha gives definition.

Verified clean with `npx tsc --noEmit` from `mobile/`.

Tokens are opt-in; no existing component changes behavior unless
dev wires them. Recommended adoption: PulsePill -> `glow.primary`,
Continue card -> `glow.primary` (subtle), Bootcamp lesson hero ->
`glow.primary`, bottom sheets -> `shadow.sheet`.

---

## 3. What was generated this round

### 3.1 Stitch screens

Generated 1 high-value screen on the existing project
`7573654568267784883` with the v3 web-mirror design system
(`assets/8050136824173722259`):

| # | Screen | Stitch ID | Purpose |
|---|---|---|---|
| 1 | Simulator (Sprint 3 wind chrome) | `2132a8d771134b53887142452ad6329b` | Visual brief for the dock-style HUD, top-right wind compass with kt label, glass-blur cells, no-go wedge, apparent-wind ghost, mode pill switcher |

`STITCH_DESIGNS.md` updated with this row.

Skipped this round (cost / time): Bootcamp Day-N hub, App Store
hero template - prompts in Section 4.

### 3.2 SVG icons (drawn this pass)

5 critical line-icons at `mobile/assets/icons/*.svg`, 24x24
viewBox, currentColor stroke, 1.5pt round-cap:

| File | Replaces | Used at |
|---|---|---|
| `cap.svg` | `🎓` | Home Bootcamp entry, Continue card, Bootcamp index |
| `bolt.svg` | `⚡` | Home Quick entry, Quick screen |
| `book.svg` | `📖` | Home Rules entry, Rules index |
| `compass.svg` | `🧭` | Home Courses, Polar boat-glyph |
| `sail.svg` | `⛵` | Anatomy, Simulator, Racing, Gallery |

Dev next: add `<Icon name="..."/>` under `mobile/src/design-system
/components/Icon.tsx` consuming the SVG via
`react-native-svg-transformer` (already in deps), accept `size` +
`color`, replace emoji call sites one at a time.

### 3.3 3D models

None this round. Section 5 has the plan for one Trellis run if
the team decides to invest.

### 3.4 Lottie animations

None. Audit: splash 800ms intro - if shipped, hand-roll with
Reanimated v4 (Lottie adds ~200KB on first frame); pulse pill
already hand-rolled, Lottie would regress; small wind-ripple
Lottie for empty leaderboard would be tasteful in v1.1, defer.

---

## 4. Stitch handoff: top 3 screens to generate next

Hand these prompts to the next designer round (paste into
`mcp__stitch__generate_screen_from_text`, project
`7573654568267784883`, design system `assets/8050136824173722259`).

### 4.1 Bootcamp Day-N hub (HIGH)

```
Mobile screen "Bootcamp Day 3" - Day-N-of-7 lesson hub. Calm
maritime tone, dark-ocean palette, SF Pro. iPhone 6.7" portrait.

Top: iOS large title "Bootcamp" + slim cyan progress strip with
8 dots (1-2 filled, 3 pulsing, 4-8 outlined). Below: small caps
"Day 3 of 7" cyan + large title "Trim and tell-tales".

Body: hero card with 8% cyan tint + 30% cyan border (web entry
pattern). Inside: 32pt cyan sail line-icon, body paragraph, then
"Focus this time" sub-card in stronger cyan with three bullets.

Action row: primary cyan-fill "Open practice" + secondary outline
"Mark as done" with check icon.

Below: "Other days" mini-strip with small chips for Days 1, 2, 4-7
each with their icon + status dot (done / current / upcoming).

ASCII text only.
```

### 4.2 Anatomy lightbox (3D-ready) (MEDIUM)

```
Mobile screen "Anatomy / Mainsail" - part detail lightbox over
the yacht poster. iPhone 6.7" portrait.

Background: yacht poster scrolled and dimmed, Mainsail hotspot
highlighted (cyan ring 100% opacity, halo glow expanded).

Bottom sheet 88% screen height, dark surface (#0f2035), top-radius
24, 1pt 25% cyan border. Contents: 44pt drag handle, small caps
"PART" cyan, large title "Mainsail" cyan, sub-label "Main sail"
muted, body paragraph, "On board" cyan-tinted sub-card with usage
notes, then a 3D viewer placeholder (1:1) with "Tap to rotate"
hint - empty cyan-bordered square reserves slot for future glb.
Bottom: prev/next icon arrows + "Swipe left / right" hint.

ASCII text only.
```

### 4.3 App Store Hero screenshot template (HIGH)

```
Single iPhone 6.7" portrait App Store screenshot. Dark-ocean
gradient bg (#0a1628 -> #0d2847), full-bleed.

Top 30%: caption in 60pt SF Pro Display bold, two lines centered
tight tracking textPrimary white -
Line 1: "Race in a week?" with "?" cyan
Line 2: "You will figure it out."
Below: small cyan pulse-pill "Sailing tutor" 12pt.

Middle 60%: phone-frame mockup (iPhone 15 Pro silver titanium)
showing the Simulator screen at full res. Tilted 5deg right with
subtle cyan rim glow.

Bottom 10%: thin 5% cyan horizon-glow line.

ASCII text only. Portrait 1290x2796.
```

---

## 5. 3D plan

| Surface | 2D works? | 3D worth it? | Notes |
|---|---|---|---|
| Anatomy yacht | Yes | Maybe v1.1 | A rotatable 3D yacht with hotspots in 3D space would be a "wow" upgrade; cost ~3 MB GLB + r3f-native + ~2 days dev + battery / heat penalty on older iPhones. **Not v1.** |
| Simulator boat | Yes (top-down Skia) | No | Top-down is genre standard; 3D loses tactical clarity. |
| Polar diagram | Yes | No | The polar IS a 2D function; 3D is anti-pattern. |
| Splash | Yes | No | Hand-roll Reanimated horizon-rise tighter than Lottie / 3D loader. |
| Game results | Yes | No | Bar charts + replay map are 2D natives. |

Verdict for v1: ship 2D. Plan v1.1 spike for Anatomy 3D if the
device fleet stays modern (>=iPhone 12). Don't burn this round on
Trellis.

If we DO want to spike, the Trellis prompt:

```
3D model: clean modern 36-foot performance cruising yacht, side
profile leaning slightly to starboard, mainsail and jib both
trimmed to a beam reach, mast and rigging visible, hull in matte
white with cyan waterline. Style: low-poly stylized (5000-10000
tris), no texture maps, suitable for iOS rendering at 60 FPS.
Output: GLB binary <2 MB.
```

Run via `mcp__trellis__create_3d_model_from_text_trellis`. Expect
60-300 sec generation; poll with `get_trellis_task_status`. Drop
GLB at `mobile/assets/3d/yacht.glb` (folder doesn't exist yet).

NOT generated this round. User decides whether to spend the
generation time.

---

## 6. Icon-set spec

5 drawn this pass cover the loudest emoji on Home + Bootcamp +
Anatomy. Full v1 set targets ~24 unique glyphs.

| # | name | Replaces | Status |
|---|---|---|---|
| 1 | `cap` | `🎓` Bootcamp | drawn |
| 2 | `bolt` | `⚡` Quick | drawn |
| 3 | `book` | `📖` Rules | drawn |
| 4 | `compass` | `🧭` Courses | drawn |
| 5 | `sail` | `⛵` Anatomy / Sim | drawn |
| 6 | `wind` | `🌬` | TODO |
| 7 | `helm` | `🪝` | TODO |
| 8 | `knot` | `🪢` | TODO |
| 9 | `flag` | `🏁` | TODO |
| 10 | `anchor` | `⚓` | TODO |
| 11 | `ear` | (none) Checklist | TODO |
| 12 | `clock` | `⏱` | TODO |
| 13 | `bag` | `🎒` | TODO |
| 14 | `weather` | `🌤` | TODO |
| 15 | `chart` | `📊` | TODO |
| 16 | `info` | `ℹ️` | TODO |
| 17 | `share` | `↗` | TODO |
| 18 | `gallery` | `🖼` | TODO |
| 19 | `play` | `▶` | TODO |
| 20 | `close` | `×` | TODO |
| 21 | `check` | `✓` | TODO |
| 22 | `arrow-loop` | (Reset) | TODO |
| 23 | `gear` | (use native) | optional |
| 24 | `back` | (use native) | optional |

Style rules for the remaining 17 glyphs:
- 24 x 24 viewBox, 1.5pt stroke, round line-cap and line-join.
- `fill="none"` strokes; small filled accents at 10-22%
  currentColor opacity (e.g., compass needle pivot).
- All paths reference `currentColor` for tint flexibility.
- No diagonals thinner than 1pt; no dashed strokes.
- Optimized: no transforms; absolute coordinates.

Adoption order: hand drawn 5 to Dev to wire `<Icon>` and replace
the loudest emoji in v1.0; ship mixed icons + emoji; author the
rest in next designer round; once full set ships, sweep
`mobile/src/data/*.json` to rename `emoji` field to `icon`.

---

## 7. App Store screenshot story

5 portrait frames are the App Store discovery surface. We have
none yet - the user will reference these when they shoot from the
device.

**Frame 1 - Hero "Race in a week?":** Pulse-pill `Sailing tutor`
at top, then 60pt SF Pro Display bold caption "Race in a week? /
You will figure it out." with `?` tinted cyan, then iPhone 15 Pro
mockup tilted 5 deg right showing Home screen with wordmark and
three primary entry cards. Caption per locale: "Race in a week? /
You will figure it out."

**Frame 2 - Bootcamp "Day 3 of 7":** Top - 8 progress dots, day
3 pulsing. Title "Day 3 of 7 / Trim and tell-tales". Hero card
with cap icon + body + "Focus this time" sub-card with 3 bullets.
Primary "Open practice" button. Caption: "8 lessons, 7 days. /
You will know what to pull."

**Frame 3 - Simulator centerpiece:** "Simulator" header + Beta
pill. Top-down canvas with no-go wedge, arrow grid, boat with
wake, top-right wind compass `10 kt`. Bottom HUD `HEADING 045 /
TARGET 060 / SPEED 5.4 kt`. Mode bar `Training | Drills |
Scenario`. Caption: "Real wind physics. / Your hand on the helm."

**Frame 4 - Anatomy poster:** "Anatomy" header + yacht poster
with hotspot dots pulsing on each named part. Below: chips for
Mainsail, Jib, Boom, Mast etc. Caption: "17 parts of a yacht. /
Tap to learn each."

**Frame 5 - Glossary search:** "Glossary 51 terms" header +
search input + category chips (All / Boat / Sail / Race / Wind).
Below: 5 result rows showing alphabetical terms (Halyard, Hank,
Heel, Helm, Hike) each with definition. Caption: "Don't know a
knot from a cleat? / 51 terms in your pocket."

Per-locale: PM commissions caption translations once frame copy
is locked. Reuse existing 7-language i18n strings.

---

## 8. Dev hand-off (what each agent picks up)

This audit produces zero `mobile/app/*` route changes (per scope).

**Dev-A (simulator):** rebuild boat sprite + wake trail
(Section 1.3); adopt new HUD spec from Stitch screen
`2132a8d771134b53887142452ad6329b`; wire `glow.primary` on
PulsePill if not already.

**Dev-B (courses / anatomy):** standardize boat glyph across
Polar + Simulator (use `sail.svg`); active-sector pulse
interaction; optional yacht-svg.ts redraw per Section 1.5.

**Full-Dev (cross-cutting):** build `<Icon name="..."/>`, wire
`react-native-svg-transformer` if not already; build
`<Wordmark size="xl|m|s"/>`, replace inline variants; replace 5
emoji at Home; hide or redesign placeholder Tools tiles; add
`<EmptyState>` + `<Skeleton>` + `<OfflineBanner>` primitives;
adopt `glow` + `shadow` token consumers.

**PM:** decide hide vs redesign placeholder Tools tiles; decide
800ms splash intro vs static; commission caption translations
for App Store frames; confirm v1.1 scope for remaining 17 icons +
anatomy 3D spike.

---

## 9. Open questions

1. **Inter** (per Stitch design system) or **SF Pro** (HIG default,
   zero install)? Recommend SF Pro for v1.0 (zero binary cost);
   revisit Inter in v1.1 with 7-locale font audit.
2. **Light theme** - v1 or v1.x? Recommend v1.x. Dark-ocean is the
   brand; a half-finished light is worse than waiting.
3. **App icon** - keep current placeholder (boat + wind streaks)
   or commission a new mark? The current SVG reads "stock
   sailboat" - a custom mark from a real designer is the
   highest-leverage spend if we are serious about App Store.
4. **Anatomy 3D** - spike v1.1 or skip indefinitely?
5. **Empty / loading / offline illustrations** - Lottie, hand-roll
   Reanimated, or text-only? Recommend hand-roll small line-art +
   one-line copy. No motion in v1.

---

## 10. Files written this pass

```
mobile/assets/icons/cap.svg
mobile/assets/icons/bolt.svg
mobile/assets/icons/book.svg
mobile/assets/icons/compass.svg
mobile/assets/icons/sail.svg
mobile/src/design-system/tokens.ts   (added: glow + shadow tokens)
docs/design/mobile/audits/sprint4-designer.md (this report)
docs/design/mobile/STITCH_DESIGNS.md  (Sprint 4 row + note)
```

Folders created (empty placeholders for next round):
```
mobile/assets/anatomy/   (yacht poster PNG export, future)
mobile/assets/lottie/    (curated animations, future)
```

Counts:
- Stitch screens generated: 1 (Simulator, ID
  `2132a8d771134b53887142452ad6329b`)
- 3D models generated: 0 (deferred, plan in Section 5)
- Icons drawn: 5 of 24 spec'd
- Lottie picks: 0 (recommend against Lottie in v1)
- Design tokens added: 2 categories (glow + shadow)

End of audit.
