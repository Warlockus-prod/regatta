# Week to Regatta - iOS Design Brief

Status: **brief** (2026-05-11). Living doc, designer to extend in place.

This is the full design TZ for the Week to Regatta iOS application.
Engineering scaffold + content + technical architecture are already
shipped to TestFlight; what is missing is **proper visual design**:
brand identity refinement, full screen designs, custom illustrations,
icon, App Store assets, motion language.

Read together with:
- [README.md](./README.md) - mobile lane overview + brand mini-spec
- [SPEC.md](./SPEC.md) - per-screen feature spec (current behavior)
- [DECISIONS.md](./DECISIONS.md) - architectural ADRs
- [ROADMAP.md](./ROADMAP.md) - execution plan + phases
- [ADR-0003-execution.md](./ADR-0003-execution.md) - workspace migration

---

## 1. Product summary

### 1.1 What it is

Week to Regatta is an iOS mobile sailing tutor. The product promise is
"in a week, you are regatta-ready" - a focused 7-day ramp from no
sailing knowledge to crewing on a real regatta.

The app has two halves:
1. **Educational reference**: 8 guided lessons, 51 glossary terms,
   8 racing rules, 17 yacht anatomy parts, 8 onboard etiquette
   sections, 5 points of sail, racing tactics. All offline, all
   bilingual+ (7 languages), all read in 5-10 min chunks.
2. **Interactive simulator**: a 2D top-down sailing simulator with
   real Velocity Prediction Program (VPP) physics. The user steers
   a yacht, manages sails, completes missions. Phase 2 work; current
   build ships a Skia-based preview.

### 1.2 Positioning (one paragraph)

For a beginner who is about to step onto a sailboat in a week, Week
to Regatta is the calm, focused tutor that fits in a phone. Unlike
a YouTube binge or a 300-page textbook, it gives them a guided 7-day
ramp, a search-on-the-water glossary, and a hands-on simulator that
teaches by doing, not by lecturing. The brand voice is professional
without being intimidating; the design feels like premium sailing
gear, not a children's app.

### 1.3 Audience

**Primary**: 25-50 year old adults invited onto a friend's or
charter's boat for a regatta or week-long sailing trip, with little
or no prior experience. Owns an iPhone, expects native-app polish,
will not read a manual but will use a well-designed app.

**Secondary**: experienced sailors who want a fast tactical refresher
before a race (the Quick refresh path), and instructors who pull up
diagrams during a lesson.

**Not the audience**: kids learning to sail, professional racers, or
landlubbers who will never set foot on a boat.

### 1.4 Brand attributes

- **Calm**, not loud. Sailing is meditative; the UI should be too.
- **Premium** without being precious. Like a good tide watch or a
  Helly Hansen jacket - quietly excellent.
- **Functional**. Every pixel earns its place; no decoration for the
  sake of decoration.
- **Maritime**, not nautical-cliche. We are not a pirate app; we are
  not a yacht-club app; we are the sailing app you reach for in the
  cockpit at dawn.
- **Confident**. The app teaches; it does not apologize.

### 1.5 What we explicitly avoid

- Skeuomorphic wood / brass / rope textures.
- Children's-app primary colors and rounded cartoony fonts.
- Stock photography of smiling people on yachts.
- Marketing speak on the inside surfaces ("Welcome aboard! Let's
  sail!").
- Notifications, gamification, achievements, streaks. The user comes
  back because they need the content; we do not nag.

### 1.6 Reference apps for tone

- **Day One** (journaling): typography-first, restrained palette.
- **Things 3** (todo): premium, focused, no chrome.
- **Garmin Connect** (sport): functional density, glanceability.
- **Sky Guide** (astronomy): immersive, dark, gestural.
- **Petit BamBou** (meditation): calm, consistent, brand-strong.

---

## 2. Brand identity

### 2.1 Naming

**Project name** (visible everywhere): "Week to Regatta".
**Codename / bundle / slug** (engineering): `regatta`,
`com.icoffio.regatta`. Designer ignores the codename.

### 2.2 Wordmark

Current wordmark is a vertical stack:
- Top: "Week to" - small caps OR sentence-case, secondary color
- Bottom: "Regatta" - large display, brand cyan

The wordmark is **English in all 7 locales** (Spotify rule). Only
the supporting tagline localizes.

**Designer to deliver**:
- Primary wordmark in three sizes (XL hero, M list, S strip)
- Single-line variant for tight spaces ("Week to Regatta" inline)
- Mark-only variant (just "Regatta" or just an icon glyph) for
  favicons and tab bars
- Light + dark + reversed (mono on photo) versions
- SVG sources + PNG exports at common DPRs (1x, 2x, 3x)

### 2.3 App icon

Current placeholder: a square with a stylized white-and-cyan sailboat
on a dark-ocean radial gradient (see
[mobile/assets/brand/icon.svg](../../mobile/assets/brand/icon.svg)).
This is engineering placeholder, not the final.

**Designer to deliver**:
- 1024 x 1024 PNG App Store icon (sRGB, no alpha, no rounded corners)
- iOS app icon set (all sizes per Apple HIG: 20, 29, 40, 60, 76, 83.5,
  1024 pt @ all DPRs)
- macOS icon set (for Mac Catalyst, future)
- watchOS icon (future, deferred)
- Android adaptive icon foreground + background (future)
- Source files (Sketch / Figma / Illustrator) editable

**Constraints**:
- The icon must be recognizable at 29x29 (Settings cell). A complex
  yacht silhouette will mush; consider a single bold mark.
- No text in the icon. Apple HIG and pixel-density both punish it.
- Must work on light and dark home-screen wallpapers.
- Avoid clichetic "compass rose" and "anchor" marks; they are
  oversaturated in the App Store.

### 2.4 Colors

Engineering tokens (in
[mobile/src/design-system/tokens.ts](../../mobile/src/design-system/tokens.ts)):

| Token | Hex | Use today |
|---|---|---|
| `bgPrimary` | `#0a1628` | App background |
| `bgSecondary` | `#0f2035` | Search input, hud surfaces |
| `bgCard` | `#152540` | Card background |
| `bgCardHover` | `#1a2d4d` | Pressed-state card |
| `accentCyan` | `#00d4ff` | Brand accent, CTAs |
| `accentCyanDim` | `#0099cc` | Dimmed accent |
| `accentTeal` | `#00ffcc` | Reserved |
| `textPrimary` | `#e8f4f8` | Body text |
| `textSecondary` | `#8ba7b8` | Muted text |
| `textMuted` | `#5a7a8a` | Captions, meta |
| `danger` | `#ff4444` | Errors |
| `success` | `#44ff88` | Success states |
| `warning` | `#ffaa00` | Warning blocks |
| `windColor` | `#00e5ff` | Wind arrows on canvas |
| `sailColor` | `#ffffff` | Boat sails on canvas |
| `waterLight` | `#0d2847` | Ocean fill light band |
| `waterDark` | `#061428` | Ocean fill dark band |

**Designer to deliver**:
- Refined palette with full semantic mapping (primary, on-primary,
  surface, on-surface, etc.) for both dark mode (only mode supported
  in v1) and a **light mode design** that ships in v1.x.
- Contrast ratios validated for WCAG 2.1 AA (4.5:1 body, 3:1 large
  text, 3:1 UI components).
- Per-state colors (default, hover, pressed, disabled, focused).
- Tested against all 5 brand surfaces (Card, ListRow, Button, HUD,
  Splash) and all 7 locales.

The dark-ocean palette is intentional and load-bearing - it carries
the maritime mood. Designer may refine, must not abandon.

### 2.5 Typography

Current: iOS system (SF Pro Display / SF Pro Text via React Native's
default font stack). Sizes set ad-hoc per component (28 title,
18 subtitle, 16 body, 13 caption, 11 muted).

**Designer to deliver**:
- Type scale (display, h1-h3, body, caption, micro) with line
  heights, letter spacing, optical-size tweaks per usage.
- Font choice rationale. Acceptable options:
  - **SF Pro** (iOS default): zero install, pre-rendered for iOS,
    high-DPR perfect. Recommended.
  - **Inter** (free): geometric sans, ships everywhere, premium feel.
  - **Manrope** (free): warmer geometric, distinctive.
  - **Source Serif** (for headlines only, paired with sans body):
    rare, would lean "literary".
- Weight stops (regular, medium, semibold, bold) and when to use each.
- Number style (tabular vs proportional) - tabular for HUD readouts.
- Italic policy (we use no italics today).
- Localized typography rules where the language demands it (Cyrillic
  letterspacing differs from Latin).

### 2.6 Iconography

Current: a couple emoji (lesson icons, scenario icons, anatomy parts).
This is engineering shortcut, not final.

**Designer to deliver**:
- Custom icon set, ~40 unique glyphs covering:
  - 8 bootcamp lessons (one icon each)
  - 6 quick refresh tips
  - 8 rule scenarios
  - 8 onboard sections
  - 5 points of sail
  - Navigation chrome (settings, search, back, close, info, share,
    haptics-on, sound-on, etc.)
- Style: outline (1.5pt stroke), 24x24 base grid, optical alignment.
- Stroke + filled variants where state matters (e.g., favorited).
- Source SVG + Figma component, with named tokens.
- An "icon font" packaged build is acceptable; SVG components are
  also fine.

The current emoji are trivially replaceable - mapping table lives
inline in the data files (e.g.
[mobile/src/data/bootcamp.json](../../mobile/src/data/bootcamp.json)
emoji field). Designer renames "emoji" -> "icon" semantically; same
slot.

### 2.7 Photography / illustration policy

- **No stock photography.** People-on-yachts photos always look like
  Getty Images.
- **Custom diagrams** are the visual centerpiece (anatomy, points of
  sail, racing scenarios). These are the signature of the brand and
  must look authored, not auto-generated.
- **Hero illustrations** on Home / lesson cards are optional - if
  present, vector / line-art only, monochrome cyan-on-dark.
- **App Store screenshots** may use stylized boat silhouettes against
  the dark ocean palette to demonstrate the simulator. No real-world
  photography.

---

## 3. Information architecture

### 3.1 Sitemap

```
Home (/)
├── Bootcamp (/bootcamp)
│   └── Lesson detail (/bootcamp/[id])    # 8 lessons
├── Quick refresh (/quick)                # 6 tips, no detail
├── Rules (/rules)
│   └── Scenario detail (/rules/[id])     # 8 scenarios, reveal-style
├── Reference
│   ├── Anatomy (/anatomy)                # 17 parts, list (v1) -> hotspot diagram (v1.x)
│   ├── Onboard (/onboard)                # 8 sections
│   ├── Glossary (/glossary)              # 51 terms, search
│   ├── Courses (/courses)                # 5 points of sail + polar diagram
│   └── Racing (/racing)                  # rules + strategies
├── Tools
│   ├── Simulator (/simulator)            # Skia 2D, Phase 2 preview today
│   ├── Multiplayer (/multiplayer)        # Phase 4, placeholder today
│   └── Leaderboard (/leaderboard)        # Phase 3, placeholder today
├── Gallery (/gallery)                    # photo + youtube items
└── Settings (/settings)
```

15 user-facing routes, plus 3 placeholder routes for later phases
(Multiplayer / Leaderboard / Game). The Game route is internal,
linked from the Simulator only.

### 3.2 Navigation pattern

**Today**: stack-only navigation. Home is the hub; every screen is
pushed from Home, with the iOS native back chevron.

**Designer to evaluate**:
- Whether the app should switch to **bottom tabs**. Candidate tab
  set: Home / Bootcamp / Simulator / Glossary / Settings. Pro: faster
  hopping between tools mid-session. Con: pushes 5 cells into the
  thumb zone, which is noisy for a content-first app.
- Recommendation needed in the brief deliverable, with mock of both
  variants.

### 3.3 Empty states, loading, error

For every screen the designer must spec the four states:

1. **Loading**: while data hydrates (~150 ms typical, ~800 ms cold).
2. **Empty**: search returns no results, group has no items, etc.
3. **Error**: network failure on Tier-2/3 screens, decode error.
4. **Offline**: Tier-2/3 screens when device is offline.

Engineering today shows generic muted text for all four. Design
must elevate.

---

## 4. Design system

### 4.1 Atoms - existing engineering primitives

Lives in `mobile/src/design-system/components/`. Designer should
audit and refine; do not start from scratch.

| Component | Purpose | Variants today |
|---|---|---|
| `Screen` | Safe-area wrapper | top/bottom inset toggles |
| `Text` | Typography presets | title / subtitle / body / caption / muted / accent |
| `Card` | Surface block | static / pressable |
| `Button` | CTA | primary (cyan fill) / secondary (cyan outline) / ghost |
| `ListRow` | Compact nav item | with / without bottom border |
| `PlaceholderScreen` | Coming-soon page | centered card + note |
| `ErrorBoundary` | React error fallback | dev / prod |
| `PointsOfSailDiagram` | Polar SVG sectors | static (v1) -> tappable (v1.x) |

### 4.2 Atoms - to be added by the designer

- **Badge** (RRS / COLREGS, Beta, Phase 2, status pills)
- **Chip** (filter chip for glossary categories, language picker)
- **Banner** (offline banner, sync status, info)
- **Input** (text input - we use raw `TextInput` today, design needs
  proper focus / error / disabled states)
- **Switch** (settings toggle - currently missing, future settings)
- **Slider** (simulator sail trim - placeholder today)
- **Toast** (transient messages, "Synced" / "Saved" / "Will sync
  later")
- **Modal sheet** (bottom-sheet picker, share, info popover)
- **Skeleton** (shimmer placeholder for Tier-2 loading)
- **Avatar / monogram** (Phase 3 auth, profile)
- **Map / mini-map** (Phase 4 multiplayer, optional)

### 4.3 Spacing, radii, elevation

Engineering tokens:

```ts
spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
radii:   { sm: 6, md: 8, lg: 12, pill: 999 }
```

**Designer to deliver**:
- Confirm or extend the spacing scale (e.g., add `xxxl: 48`).
- Define elevation system - we have none today. Cards are flat.
  Decide whether elevation is via subtle glow (matches the cyan
  brand) or no elevation at all (flat, brutalist).
- Define border / divider weights.

### 4.4 Motion

Engineering today: only the system transitions from expo-router
(`slide_from_right`).

**Designer to deliver**:
- A **motion system**: durations + easings for all interaction tiers.
  Suggested baseline:
  - Micro (40 ms ease-out): toggle, switch, tap feedback.
  - Short (180 ms ease-in-out): card press, button hover.
  - Medium (280 ms cubic-bezier(0.2, 0.8, 0.2, 1)): screen push.
  - Long (480 ms): hero transition, splash to home.
- **Reduced motion** policy (iOS Accessibility setting): all
  decorative animation disables; functional animation slows by 50%.
- **Haptics map** per interaction type. Engineering has light-impact
  on simulator pan begin and medium-impact on simulator reset; the
  rest needs design call.
- Splash transition: how the splash icon hands off to Home (cross-fade,
  scale-from-icon, slide-from-bottom).

---

## 5. Per-screen design spec

For each screen below the designer must produce:
- High-fidelity mock for the **default state**, on iPhone 6.7" and
  iPhone 6.1" (Pro Max + Pro), in both dark and light themes.
- **States**: empty, loading, error, offline (where applicable).
- **Interactions**: tap, pan, swipe, long-press behaviors and what
  the user sees / hears (haptics) in response.
- **Edge cases**: longest realistic content per locale (German is
  longest), shortest (Polish often is), RTL not in scope.

### 5.1 Splash

Engineering today: native iOS splash with `splash-icon.png` centered
on `#0a1628`. Hides after `useI18n().ready` flips true (typically
< 200 ms after first paint).

**Design**:
- Hero artwork shown for the duration of hydration.
- Optional: 800 ms branded intro animation (wordmark fades in,
  ocean horizon line rises). Skip if it adds startup-time perception.
- No loading spinner. The user should not perceive load time at all.

### 5.2 Home

Today: 4 stacked sections (Where to start / Reference / Tools / More).

**Design needs**:
- Hero header: brand wordmark + localized tagline.
- Top-priority CTA: "Start the Bootcamp" or "Continue lesson 3" if
  there is progress. Today engineering does not pull progress to
  Home; designer to spec the dual state.
- Secondary tools: organized by visual hierarchy, not just stacked.
- "Today's challenge" promo slot for Phase 3 (daily challenges).
  Designer to draft the empty-today and the promoted-today variants.
- **Out**: any Multiplayer / Leaderboard / Simulator entries that
  point at not-yet-real features; or shown with a "Beta" tag if the
  preview is good enough to invite testers.

### 5.3 Bootcamp index + lesson detail

Today: list of 8 lessons with emoji + title + meta + summary; a
green `OK` badge on completed lessons; lesson detail with hero
emoji, body summary, "Focus this time" card, primary CTA.

**Design needs**:
- Replace emoji with custom icons (per atom 4.6).
- Progress visualization (e.g., 3 of 8 completed, with a slim
  progress bar at top).
- Lesson cards that look "openable" - pressed state + chevron.
- Lesson detail: better hierarchy between summary and focus.
- Optional "Mark as done" affordance separate from the practice CTA
  (today, opening the practice route auto-marks done).

### 5.4 Quick refresh

6 cards, no detail page, each ~30 sec read.

**Design**: emphasize browse-ability. Designer to consider a
horizontal carousel, masonry, or accordion. Pick one with rationale.

### 5.5 Rules index + scenario detail

Today: card list of 8 scenarios with icon + title + RRS/COLREGS
badge + scene preview. Detail uses a reveal pattern: scene +
question shown, "Show answer" button reveals answer + why + in
practice.

**Design needs**:
- The reveal interaction is the core UX pattern. Make it feel
  intentional - a flip, a slide, an unfurl. Not just a section
  expanding.
- The scenario SVG illustrations (`port-vs-starboard`,
  `windward-leeward`, etc.) are the signature visuals - **designer
  to author all 8 as SVG, transparent background, dark-ocean
  palette compatible**.
- Source list:
  `port-vs-starboard | windward-leeward | overtaking | mark-room |
   crossing | start-line | collision-avoid | penalty`
- Each illustration: ~600 x 400 viewBox, 2 boats with color-coded
  hulls, wind arrow, mark / line where relevant. Style-aligned with
  the rest of the app.

### 5.6 Onboard

8 sections of bulleted etiquette + commands, with optional warning
blocks.

**Design needs**:
- The warning blocks today use yellow `warning` color flat. Could
  use an icon, sharper hierarchy.
- Bullet items with hyphen are flat; designer may introduce a
  custom bullet glyph.

### 5.7 Anatomy

17 yacht parts as a list of cards (name + desc + use-on-board).

**Design needs**:
- The **interactive 2D side-view diagram** is the v1.x deliverable
  (per ROADMAP). Designer authors:
  - One yacht side-view illustration (line-art, monochrome cyan,
    transparent bg).
  - Hotspot positions in the SVG viewBox; hotspots already exist in
    data (`part.side: { x, y }`).
  - Tap-on-hotspot interaction reveals part info inline or in a
    bottom sheet.
- Optional **top-view** illustration for parts with `top` coords.
- The **3D model** path (`part.three: { x, y, z }`) is web-only for
  now; mobile defers GLB rendering indefinitely.

### 5.8 Glossary

51 terms with category, name, definition. Search input + counter.

**Design needs**:
- Add **category chips** (boat / sail / course / maneuver / racing
  / wind / crew) - horizontal scrollable, multi-select.
- Search input with proper focus state, clear-button, keyboard
  dismiss-on-scroll.
- Term cards could be tappable to a detail with examples / related
  terms (v1.x).
- Empty-search state already shows "Nothing found"; designer may
  illustrate it.

### 5.9 Courses (points of sail)

Polar SVG diagram (already engineered) + 5 cards.

**Design needs**:
- Refine the polar diagram visually: better sector colors, wind
  arrow style, boat-in-center icon, optional sailing angle labels.
- Card hierarchy: emphasize sailingAngle + speedFactor as the key
  metrics.
- Tap-on-sector interaction (v1.x): scroll the matching card into
  view and pulse its border.

### 5.10 Racing (tactics)

Two sections: right-of-way rules (priority sorted) + strategies
with bullet tips.

**Design needs**:
- Priority badge for rules - today is a small cyan circle. Could
  be a numbered medal, a small chevron rank, etc.
- Strategy section currently text-only. Designer to author 4-6
  small **tactical SVG illustrations** (start-line approach, upwind
  leg, downwind leg, mark rounding, etc.) embedded in the relevant
  cards.

### 5.11 Gallery

Photo / video grid. Today engineering ships a basic implementation
that fetches images from `regatta.icoffio.com/...` and shows YouTube
thumbnails with a play overlay.

**Design needs**:
- Masonry or fixed-grid layout decision.
- Loading skeleton (Tier-2 screen, deserves shimmer).
- Image-detail modal for tap (full-screen, swipe to dismiss).
- YouTube embed style (tap opens YouTube app via deep link, or
  in-app player).

### 5.12 Simulator

Today: Skia 2D top-down with a wind arrow, boat sprite, wake trail,
3-cell HUD (heading / target / speed), Reset button. Pan-to-aim
gesture.

**Design needs**:
- This is the **product centerpiece** in the user's mind. Deserves
  the most design love.
- Replace the bare-bones boat sprite with a properly authored
  top-down yacht silhouette, sail rendered separately so it can
  rotate independently.
- Wake trail style (current solid cyan line could fade like Apple
  Maps route, or use particle dots).
- Wind: today single arrow at top. Designer to spec a rotatable
  wind compass (the wind direction can change per mission), wind
  speed indicator, true vs apparent wind toggle.
- HUD: refine the 3 cells; consider a dock-style HUD at the bottom
  with sliders for sail trim (sails are not interactive yet, but
  Phase 2 lands them).
- "Mode bar" (training / scenarios / drills) per ROADMAP - designer
  to spec the mode-switch UX; each mode has different HUD.
- BETA tag if shipped before full Phase 2 lands.

### 5.13 Multiplayer / Leaderboard placeholders

Today: `PlaceholderScreen` with a phase-pointer note.

**Design needs**:
- Decide whether to ship at all in v1. If yes, designer to spec
  the lobby (4-char join code), in-race view (mini-map of peer
  positions), final standings, leaderboard list with filters.
- For v1 launch, the placeholder needs a more polished "Coming
  soon" state if it stays visible on Home.

### 5.14 Settings

Today: language picker (7 cards, native names) + About card.

**Design needs**:
- Section grouping (Language / Notifications / About / Storage /
  Telemetry).
- Add toggles for haptics, sound, reduced motion.
- Phase 3: account / profile / sign in (Sign in with Apple).
- Phase 5: telemetry opt-in, support / contact, privacy policy
  link.

### 5.15 Game (placeholder)

Solo race mode. Phase 2. Currently `PlaceholderScreen`.

**Designer to spec**: results screen, leaderboard line item, share
sheet integration, replay viewer.

---

## 6. Localization

### 6.1 Locales

7 locales, source RU: **RU / EN / PL / ES / FR / DE / IT**. The
data is already translated for every content surface; designer
inherits the strings.

### 6.2 Layout consequences

- **German** is the longest; expect ~30% expansion vs English.
  Designer must spec a "longest-string" mock for every label-bearing
  component (buttons, badges, list rows).
- **Polish** uses no diacritics in this app (engineering rule), so
  Polish text is shorter than usual.
- **Russian** is Cyrillic; verify every font has full coverage.
- **Spanish, French, Italian** have diacritics; **German** has
  umlauts and ess-zet.
- The **wordmark stays English** in all 7 locales (Spotify rule).
  Tagline localizes.

### 6.3 Switching language

Settings -> Language list -> tap. Engineering switches in place
(no remount, no reload). Designer to spec a subtle confirmation
animation (e.g., the active row's check-mark scales in).

---

## 7. iOS Human Interface Guidelines compliance

### 7.1 Screen anatomy

- Respect Dynamic Island and notch (engineering uses
  `react-native-safe-area-context` everywhere, designer must spec
  for both notched + Dynamic Island devices).
- Respect home indicator at the bottom.
- Respect Keyboard Avoidance on screens with TextInput (search,
  future feedback form).

### 7.2 Native iOS patterns to honor

- **Pull to refresh** on Tier-2 lists (Leaderboard, Gallery).
- **Swipe back** edge gesture (expo-router supports it).
- **Long-press preview** on tappable items (iOS 13+ context menu).
- **Share sheet** for replays and lessons (Phase 3+).
- **Haptic feedback** on every primary action (engineering hooks
  exist via `expo-haptics`).

### 7.3 Native chrome decisions

- Stack header style: today large title in cyan, dark background.
  Designer to refine. Could use **collapsible large title** (Apple
  default) or stay with our custom small chrome.
- Tab bar (if adopted): translucent or solid? Icon-only or
  icon-plus-label? Active tint = brand cyan?

---

## 8. Accessibility

- **VoiceOver** labels on every interactive element. Designer to
  spec the spoken text where it differs from visible text (e.g.,
  icon-only buttons need `accessibilityLabel`).
- **Dynamic Type** up to AX2. Designer must show how titles +
  body text scale; some layouts will need to wrap differently.
- **Reduced Motion**: all decorative animation disables (engineering
  reads `AccessibilityInfo`; designer specifies which animations
  count as decorative).
- **Color contrast** AA minimum: 4.5:1 body, 3:1 large + UI.
- **Touch target** minimum 44 x 44 pt (Apple HIG hard rule).
- **Switch Control** keyboard navigation on all screens (engineering
  uses semantic `Pressable`; designer to verify focus-order in
  Bootcamp lesson list, Glossary search results, etc.).

---

## 9. Asset deliverables

The designer is expected to ship the following before App Store
submission. File-format columns are non-negotiable; sizes are
suggestions and may be adjusted after layout review.

### 9.1 Brand

| Asset | Format | Quantity | Notes |
|---|---|---|---|
| Wordmark XL | SVG + PNG @1x/2x/3x | 3 sizes | Hero, list, strip |
| Wordmark single-line | SVG + PNG | 2 sizes | inline + small |
| Mark-only glyph | SVG + PNG | 4 sizes | Tab, favicon, sub-mark |
| Light / dark / mono variants | SVG + PNG | each above | for share cards |

### 9.2 App icon

| Asset | Format | Notes |
|---|---|---|
| Source | Sketch / Figma / Illustrator | layered, editable |
| App Store icon | 1024 x 1024 PNG, sRGB, no alpha | non-negotiable |
| iOS app icon set | PNG per HIG sizes | autoexport from source |
| macOS icon set | PNG per HIG sizes | for Mac Catalyst (future) |
| Android adaptive | PNG foreground 1024 + background 1024 | future |

### 9.3 Illustrations

| Illustration | Format | Quantity | Notes |
|---|---|---|---|
| Yacht side-view (anatomy) | SVG transparent | 1 | hotspot-aware viewBox |
| Yacht top-view (anatomy) | SVG transparent | 1 | optional, for top hotspots |
| Points-of-sail polar | SVG / refined existing | 1 | replaces engineered placeholder |
| Rule scenarios | SVG transparent | 8 | port-vs-starboard, etc., per 5.5 |
| Tactical diagrams (racing) | SVG transparent | 4-6 | start-line, upwind, etc. |
| Splash hero (optional) | SVG / Lottie | 1 | only if 800ms intro is desired |

### 9.4 Icons

- 40 unique glyphs across product surfaces.
- Format: SVG component set, optical-aligned at 24 x 24 base.
- Outline default, filled state where applicable.

### 9.5 App Store assets

| Asset | Format | Quantity |
|---|---|---|
| Icon (App Store listing) | 1024 x 1024 PNG | 1 |
| Screenshots 6.7" iPhone | 1290 x 2796 PNG | 5 per locale x 7 = 35 |
| Screenshots 6.1" iPhone | 1179 x 2556 PNG | 5 per locale x 7 = 35 |
| iPad Pro 12.9" | 2048 x 2732 PNG | optional |
| App Preview video | 1080p 30fps, 15-30 sec | optional, per locale |
| Promo graphic | 1242 x 2208 PNG | optional |

Screenshots may be templated (caption + framed device + screen),
designer authors the template + per-locale captions.

### 9.6 Marketing site (subset of designer scope)

Out of scope for this brief unless requested. The marketing site
lives in the Shared lane and may use a subset of the brand assets
above.

---

## 10. Technical constraints

The designer must understand what the engineering stack can and
cannot do natively, to avoid mocks that cannot be implemented
without expensive workarounds.

### 10.1 Stack

- **React Native 0.81.5** with **Expo SDK 54**, New Architecture
  (Fabric + TurboModules) on.
- File-based routing via **expo-router**.
- **react-native-skia** for canvas / custom rendering (used in
  simulator and any custom diagrams).
- **react-native-svg** for static SVG illustrations.
- **react-native-gesture-handler v2** for advanced gestures.
- **react-native-reanimated v4** for animations.
- **expo-localization**, **expo-haptics**, **expo-splash-screen**,
  **expo-build-properties** for native bits.

### 10.2 What works well

- **Static SVG** at any resolution.
- **Skia paths** for high-FPS custom rendering.
- **Reanimated** worklets for 60 FPS animations off the JS thread.
- **Expo image** caching (Phase 5 dependency).
- **Lottie** via lottie-react-native (designer-friendly motion).
- **Native iOS blur** via `expo-blur`.
- **Linear gradients** via `expo-linear-gradient`.
- **Bottom sheets** via `@gorhom/bottom-sheet` (designer-friendly).

### 10.3 What is hard

- **Complex multi-stop gradients** in canvases at 60 FPS (Skia ok
  but designer to use them sparingly).
- **Backdrop blur over scrolling content** at 60 FPS on older
  devices (iPhone 12 mini and below stutter).
- **Custom fonts** with full 7-locale coverage are 1-3 MB per
  weight; we either ship variable fonts or stick with system SF.
- **Variable letter-spacing** mid-string is not supported on RN
  Text. Use separate `Text` runs or pre-render to image.
- **Text on a path** needs Skia (not RN Text).

### 10.4 What is not feasible

- **Native iOS dynamic-scaled icons** (the icon-glyph-changes-with-
  size effect). RN can mimic but not natively.
- **Pixel-perfect glyph hinting** identical to the iOS Photos app.
  RN renders text via Yoga + RN's rasterizer; not Apple's Text Kit.
- **Custom haptic patterns** beyond the 5 system options without
  dropping into a native module.

---

## 11. Acceptance criteria

A design deliverable is "accepted" by engineering when:

1. Every screen in the sitemap has a high-fidelity mock for default,
   loading, empty, error, and offline states (where applicable).
2. Every interactive element has spec for tap, long-press, swipe,
   pan, and disabled states.
3. Animation specs include duration + easing + reduced-motion
   override.
4. Token map (color, type, spacing, radii, motion) is exported as
   JSON or design-token format that engineering imports.
5. SVG illustrations have transparent backgrounds and live in
   `mobile/assets/brand/illustrations/`.
6. Icon set is exported as SVG component set or icon font.
7. App Store screenshots are templated and exportable per locale.
8. All designs respect WCAG AA contrast.
9. Designer signs off on a 7-locale layout audit (longest-string
   mock per language for every label-bearing component).
10. The brief is updated in place with any changes or
    clarifications.

---

## 12. Process and tooling

### 12.1 Designer's workflow

- Use **Figma** as the single source of truth.
- Mirror the engineering token names in Figma styles/variables so
  engineers can map 1:1.
- Author all deliverables in one Figma file with these top-level
  pages: `Brand`, `Design system`, `Screens / iPhone 6.7"`,
  `Screens / iPhone 6.1"`, `Illustrations`, `App Store`,
  `Working / archive`.
- Use **components and variants** for every reusable element (Card,
  Button, Text variant, etc.); engineering will mirror them.

### 12.2 Handoff

- Per-screen Figma frame -> engineering implements.
- Designer specs in inline annotations or in a side-doc; engineering
  references both.
- Update this brief in place when the design evolves.
- Final sign-off: TestFlight install on iPhone, designer compares
  to mocks side-by-side.

### 12.3 Iteration cadence

- v0: brief (this doc) + mood board + brand exploration. ~1 week.
- v1: full design system + 3 hero screens (Home, Bootcamp lesson,
  Simulator). ~2 weeks.
- v2: every other screen. ~2 weeks.
- v3: illustrations + App Store assets. ~1 week.
- v4: polish + 7-locale audit + acceptance. ~1 week.

Total: ~7 weeks of design work, parallelized with Phase 2-3
engineering.

---

## 13. Open questions for the kickoff call

The designer will surface answers to these in the v0 deliverable.

1. Do we adopt **bottom tabs** or stay with stack-only navigation?
2. Do we ship a **light theme** in v1 or v1.x?
3. Do we ship an **800 ms intro splash animation** or just the
   static splash icon?
4. Custom **font choice**: SF Pro (default), Inter, or Manrope?
5. App icon **mark direction**: pictorial (yacht), abstract
   (compass / wave / arrow), or typographic (stylized "WR" or "R")?
6. Bootcamp lesson icons: keep emoji as a stopgap or push for full
   custom set in v1?
7. Onboarding flow on **first launch** (welcome / language pick /
   privacy disclosure) - draft or skip in v1?
8. Empty Home state when user has zero progress vs Home with
   progress: same layout or different hero?
9. **Gallery** strategy: keep online-fetch model or pre-cache for
   offline?

---

## 14. Open hand-offs for engineering (as design lands)

These are pending engineering tasks that unblock or are unblocked
by design:

- Replace placeholder PNG icons (`mobile/assets/icon.png` etc.)
  with finalized App Store icon set.
- Replace placeholder lesson emoji with custom icons in
  `mobile/src/data/bootcamp.json` (rename field `emoji` -> `icon`
  via the sync-content script).
- Wire `PointsOfSailDiagram` redesign back into `app/courses/`.
- Implement Anatomy interactive diagram (Phase 1.x feature).
- Implement Rules scenario SVGs (Phase 1.x).
- Wire designer's typography scale into
  `mobile/src/design-system/components/Text.tsx`.
- Wire designer's color tokens (with light theme variant if
  shipping in v1) into
  `mobile/src/design-system/tokens.ts`.
- Wire motion system into a `mobile/src/design-system/motion.ts`
  module.
- Add bottom tabs structure if designer recommends it.
- Add Onboarding flow on first launch if designer specs it.

---

## 15. References

- **iOS Human Interface Guidelines** (current):
  https://developer.apple.com/design/human-interface-guidelines/
- **Apple App Icon spec**:
  https://developer.apple.com/design/human-interface-guidelines/app-icons
- **App Store screenshot specs**:
  https://help.apple.com/app-store-connect/#/devd274dd925
- **WCAG 2.1 AA**:
  https://www.w3.org/WAI/WCAG21/quickref/
- **React Native Skia gallery**:
  https://shopify.github.io/react-native-skia/
- **Figma plugin: Design Tokens**:
  https://www.figma.com/community/plugin/888356646278934516
