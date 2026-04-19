# Stitch design brief - Regatta Simulator V3

Use the prompts below in Google Stitch (sequence: main screen first, then
variants). All UI labels are bilingual - keep Russian primary, English as
subtitle where space allows. Export screens as PNG + copied SVG from
Stitch, send them back and I will wire up the real implementation over
the physics engine.

---

## How to use this file

1. Open Stitch, create a project: "Regatta Simulator V3"
2. Generate the MAIN SCREEN prompt first (section 1). Let it finish.
3. Generate each variant prompt (sections 2-6) in the same project so
   they share a design system.
4. Export everything (PNG + assets).

For each prompt below: copy the block between the `BEGIN STITCH PROMPT`
and `END STITCH PROMPT` markers into Stitch's prompt input verbatim.
Russian text inside is intentional - Stitch can render it.

---

## 0. Shared style guide (paste this once at project setup)

```
BEGIN STITCH STYLE GUIDE

Product: interactive sailing simulator for sailors preparing for their
first regatta. Mobile-first single-page training tool. The user learns
how wind, course, and sail trim affect boat speed and heel.

Style keywords: calm technical marine interface, dark ocean, premium
instrument panel, high legibility, not gamified, not decorative.

Color palette (exact hex):
  - Background deep: #050b18
  - Background ocean: #081326
  - Card / glass fill: rgba(8, 24, 48, 0.62) with backdrop-filter blur
  - Border subtle: rgba(0, 212, 255, 0.18)
  - Text primary: #e8f4f8
  - Text secondary: #8ba7b8
  - Text muted: #5a7a8a

Accent colors (functional, not decorative):
  - Cyan interactive: #00d4ff (wind, active sliders, apparent wind)
  - Green good: #52ff8e (drive force, optimal trim, "attached" state)
  - Amber warning: #f6b73c (side force, partial stall, medium heel)
  - Red hazard: #ff5252 (no-go zone, full stall, heel >25 deg)

Typography:
  - Sans: Geist or Inter for UI labels
  - Monospace tabular: Geist Mono or JetBrains Mono for all numeric
    values (speed, angles, percentages) - precision feel
  - Weights: 400 for body, 600 for labels, 800 for hero numbers

Layout philosophy:
  - Controls must surround the central boat scene, never below it
  - No scroll to adjust a setting and see the effect
  - Mobile-first (375x812 iPhone), desktop adapts by giving pods more
    breathing room, NOT by restructuring

END STITCH STYLE GUIDE
```

---

## 1. MAIN SCREEN - Top view, default state

Use case: first-time user opens the simulator. Beam reach (course ~90 deg
from wind), wind 12 knots, both sails up, trim roughly optimal.

```
BEGIN STITCH PROMPT

Design a mobile screen (375x812, iPhone 14 canvas) for a sailing
simulator called "Regatta". Single-page, no scrolling between controls
and scene. Dark ocean aesthetic. Layout: cockpit-style with the boat in
the center and four control pods pinned at the four corners of the
scene container.

== TOP BAR (48px tall, sticky) ==
Left: small cyan pill badge text "V3 Cockpit" (uppercase, 10px tracking
wide). Right: question-mark help icon 20px, and a text link "← V1"
in muted gray.

== SCENE AREA (fills ~55% of screen height, centered) ==
Dark radial gradient background (from #0c2745 at center 40%, fading to
#040a16 at edges). The boat is the hero. Top-down view of a sailing
yacht, stylized, clean silhouette similar to a Bavaria 46 cruiser but
abstract. The boat takes up about 45% of the scene area vertically.
Bow points up. White hull with subtle gradient. Visible mast as dark
vertical line, boom extending to port (left) at about 45 degrees off
centerline. Mainsail is a solid white triangle, filled shape, clear
outline. Jib is a smaller triangle forward of the mast, also white,
also 45 degrees to port.

Layered overlays in this z-order, bottom to top:

  1. Water texture: faint horizontal wave lines, cyan at 6% opacity,
     barely visible, animated (not required in static design).
  2. Compass ring: thin 1px cyan circle at 70% of scene width, tiny
     "N / E / S / W" markers in muted gray at cardinal points.
  3. No-go cone: red-tinted wedge (60 degrees total, centered on wind-
     from direction which is top of scene). Dashed outline, fill
     rgba(255, 82, 82, 0.14). Label "НО-ГО ZONE" in small red text
     inside.
  4. Wind arc: faint cyan arc behind the true-wind arrow, 120 degrees
     wide, fill rgba(0, 212, 255, 0.07), no border.
  5. Main working sector: semi-transparent green wedge behind the mast,
     spanning from the boat's centerline to 85 degrees off centerline,
     on the leeward side (port). Fill rgba(82, 255, 142, 0.10), dashed
     1px border in the same color at 30% opacity. Small label "main
     range" in 9px uppercase muted at the outer edge.
  6. Jib working sector: semi-transparent yellow wedge forward of the
     mast, from 5 to 55 degrees off centerline, on the leeward side.
     Fill rgba(246, 183, 60, 0.10), dashed border.
  7. Ghost optimal overlay: dashed green outlines of where the
     mainsail and jib would be at the recommended optimal angle for
     the current course. Opacity 50%. Label "optimum" in 9px green
     uppercase.
  8. The boat and its current sails (solid white, as described above).
  9. Vectors, drawn starting from the boat center outward:
     - True wind arrow: from top of scene pointing down toward the
       boat, cyan #00d4ff, 2.4px stroke, arrowhead, label "TW 12 kts"
       in cyan mono at the top.
     - Apparent wind arrow: from a point roughly at 63 degrees off the
       bow (forward-starboard) pointing aft-port toward boat. Lighter
       cyan #6fe4ff, 2.2px stroke, label "AWA 63° / AWS 13 kts".
     - Drive force arrow: from boat center pointing forward (up).
       Green #52ff8e, 2.6px stroke, length proportional to force
       (medium length here), label "drive".
     - Side force arrow: from boat center pointing port (left).
       Amber #f6b73c, 2.2px, label "side".
  10. Scene overlay text, top-left corner of scene: big label
      "ГАЛФВИНД" (beam reach in Russian) in bold 20px cyan,
      subtitle in 10px muted "sails as wings". Top-right corner of
      scene: "TWA 90°" in mono 12px muted, below it "starboard tack"
      in 10px.

All wind/course overlays read at a glance without any text. The user
sees "this is where the wind is, this is where my sail CAN go, this is
where it SHOULD be, this is where it IS".

== 4 CONTROL PODS (glass cards, positioned absolutely over the scene
corners on mobile, padding 12px, border radius 16px, backdrop blur) ==

Top-left pod - "WIND":
  Label "ВЕТЕР" 10px uppercase muted.
  Slider: "TWA / угол к ветру", current value 90 degrees, range 30-180.
  The slider has a subtle cyan fill to the left of the thumb.
  Slider: "Сила ветра", current value 12 kts, range 4-25.
  At the bottom: small pill "starboard tack" (auto, read-only).

Top-right pod - "MAIN":
  Label "ГРОТ" 10px uppercase muted.
  Slider: "Угол грота", current 45 degrees, range 0-85.
  Segmented 3-option control: "Full" (active) | "Reef 1" | "Reef 2".
  Bottom status: small text "ATTACHED" in green with a tiny dot, or
  "STALLED" in red if applicable.

Bottom-right pod - "JIB":
  Label "СТАКСЕЛЬ" 10px uppercase muted.
  Slider: "Угол стакселя", current 40 degrees, range 5-55.
  Slider: "Раскрытие", current 100%, range 0-100.
  Bottom status: "ATTACHED" / "STALLED".

Bottom-left pod - "VIEW":
  Label "ВИД" 10px uppercase muted.
  Segmented 2-option: "TOP" (active) | "REAR".
  Segmented 3-option: "Both" (active) | "Main" | "Jib".
  Checkbox row: "Показать оптимум" (show optimum) checked.

Pods overlap the scene at the corners but the boat is never covered -
pods are sized so the boat's hull is always fully visible. On mobile,
pods are ~42% viewport width each.

== METRICS STRIP (below scene, 56px tall, NOT scrollable, always
visible) ==
Four chips in one horizontal row:
  - "СКОРОСТЬ / SPEED" 10px uppercase muted, value "6.4" big mono 24px
    cyan, unit "kts" 11px muted
  - "КРЕН / HEEL" / "8°" cyan
  - "AWA" / "63°" cyan
  - "ТРИМ / TRIM" / "88%" bold green
Chip divider is a subtle 1px vertical line.

== COMMENTARY LINE (below metrics, 44px tall, one line) ==
Italic or regular mono, 13px, text-secondary color:
  "Оба паруса в слоте, настройка близка к оптимальной."
with a tiny leading cyan dot.

== BOTTOM HOME INDICATOR ==
iOS-style home indicator strip at the very bottom (decorative).

Do NOT include any large decorative circles, no gigantic chrome, no
bottom navigation bar, no tab bar. Minimize empty space around the
boat. Every pixel should serve learning.

END STITCH PROMPT
```

---

## 2. VARIANT - Bad trim state (main overtrimmed)

Same screen, same layout. Differences:

```
BEGIN STITCH PROMPT

Regenerate the previous MAIN SCREEN with these changes:

- Main sail in scene: rotated to ~5 degrees off centerline (very close
  to bow axis), not its optimal 45 deg.
- Main working sector and ghost optimal overlay still show where the
  main SHOULD be (~45 deg).
- Ghost optimal main outline now clearly visible because the current
  sail is far from it.
- Status in MAIN pod: "STALLED" in red with red dot.
- Top-right overlay: unchanged.
- Drive force arrow: much shorter than in the default state (roughly
  40% of the default length).
- Side force arrow: slightly longer, amber.
- SPEED chip value: "3.2 kts" in amber (degraded from 6.4).
- HEEL chip: "5°" cyan (less heel because less drive).
- TRIM chip: "42%" in amber (poor trim).
- Commentary line changes to: "Грот перетянут. На гроте срыв потока,
  тяга упала." with a red dot.

Keep all other elements identical.

END STITCH PROMPT
```

---

## 3. VARIANT - Overpowered state (heavy wind, no reef)

```
BEGIN STITCH PROMPT

Regenerate MAIN SCREEN with these changes:

- WIND pod: wind speed slider at 22 kts.
- MAIN pod: reef segmented at "Full" (NOT reefed, user should reef
  here).
- Scene vectors: TW arrow thicker, AW arrow thicker (larger magnitudes).
- Drive force arrow: long, strong green.
- Side force arrow: very long, amber, slightly pulsing (optional red
  tint if you can).
- Boat mast: visually tipped slightly to port (top-down tilt is only a
  hint here - the REAR VIEW variant shows heel properly).
- SPEED chip: "8.1 kts" cyan.
- HEEL chip: "32°" in BOLD RED.
- AWA chip: "50°" cyan.
- TRIM chip: "70%" amber.
- Commentary line changes to: "Крен уже высокий. Возьми 1 риф, чтобы
  сбросить перегруз." with an amber warning dot.

END STITCH PROMPT
```

---

## 4. VARIANT - Reefed state (after user took a reef)

```
BEGIN STITCH PROMPT

Regenerate MAIN SCREEN with these changes:

- WIND pod: 22 kts (same heavy wind).
- MAIN pod: reef segmented control now highlights "Reef 1" (middle
  option active).
- Scene mainsail: visibly SMALLER than default main (about 75% of
  previous height) - physically a reefed sail is shorter and squatter.
- Scene jib: also a bit smaller, visualize jib furl at ~70% (narrower
  jib).
- Drive force arrow: moderate length, still clearly pulling forward.
- Side force arrow: moderate, not dominating.
- SPEED chip: "7.0 kts" cyan.
- HEEL chip: "18°" cyan (dropped from 32 after reef).
- TRIM chip: "84%" bold green.
- Commentary line changes to: "1 риф снизил крен. Лодка снова в
  управлении." green dot.

END STITCH PROMPT
```

---

## 5. VARIANT - Rear view (heel visualization mode)

This is the alternate scene when the user taps "REAR" in the View pod.
Same surrounding layout (top bar, 4 pods, metrics, commentary) - only
the SCENE content swaps.

```
BEGIN STITCH PROMPT

Regenerate MAIN SCREEN but the central SCENE now shows a REAR view of
the same yacht at 18 degrees of heel. Everything outside the scene is
unchanged. The VIEW pod's "REAR" segmented option is highlighted.

Scene content (replacing the top-down view):

- Horizontal water surface takes up the bottom 35% of the scene area,
  drawn as subtle cyan horizon line and two to three animated wave
  bands fading into depth. Horizon line is at about 55% down the scene.
- Boat seen from directly behind: transom visible, stern light
  abstracted, two rudder hint lines at the bottom, hull curving up at
  sides.
- Mast: vertical in absolute terms BUT the whole boat drawing is
  rotated 18 degrees counter-clockwise (leeward lean), so the mast
  leans to the LEFT as the user looks. The water horizon stays
  horizontal (the world is level, the boat is heeled).
- Mainsail: curved crescent shape, shown in full projection, white
  with subtle gradient. Visible curve. Reefed state drawing would make
  it shorter; for this variant use FULL main.
- Jib: smaller crescent visible partly behind the main, right side of
  the screen (starboard-forward in rear frame).
- Wind indicator: small animated arrow at the top-right of the scene
  showing wind direction in rear-frame terms, about 40 degrees off
  starboard, cyan.
- Heel numeric overlay, big, bottom-right of scene: "18°" in red mono
  60px with subtle red glow. Subtitle in 10px uppercase red muted:
  "крен / heel".
- Angle-of-heel arc: thin red dashed arc from vertical to the mast,
  with a "18°" label at its midpoint.
- Overlay in top-left of scene: big bold label "ВИД СЗАДИ" (rear view
  in Russian), subtitle "почему появился крен / why the heel happens".

The rear view should feel educational: the user instantly sees "the
rig is leaning over - that's what heel means".

END STITCH PROMPT
```

---

## 6. VARIANT - Desktop layout (optional, only if Stitch allows >375px)

```
BEGIN STITCH PROMPT

Regenerate MAIN SCREEN for desktop viewport 1440x900. Same cockpit
concept but now the 4 control pods are standalone cards to the LEFT
and RIGHT of the scene (not overlapping it), in a 3-column grid:

[WIND pod]  [big scene, centered]  [MAIN pod]
[MODE pod]  [(same scene continues)]  [JIB pod]

Pod column widths: 240 px each. Scene column fills the remaining width.
Vertical arrangement: pods stack in 2 rows on the outer columns, the
scene spans both rows in the middle column.

Below the scene + pods grid: the METRICS strip (4 chips), then
COMMENTARY line, both full-width.

Top bar same as mobile but with more horizontal space. A right-side
panel "Help & shortcuts" is NOT needed in V3.

All other content identical to mobile version - sliders, boat,
overlays, colors, typography.

END STITCH PROMPT
```

---

## 7. Small screens / details (optional polish)

If Stitch handles these, also request:

- Empty state / loading skeleton (when the page opens before state
  initializes - show placeholders shaped like the pods and scene)
- A help overlay / onboarding popover pointing at the boat and the 4
  pods with short tooltips: "Это лодка", "Это ветер", "Крути ползунок
  чтобы изменить грот", "Переключи на вид сзади чтобы увидеть крен"
- 3 commentary example states inline: good / warning / error text

---

## 8. What I (Claude) will do after you export

1. Pull the PNG + any SVG Stitch gives into `docs/design/simulator-v3/`
2. Rebuild the real components (over the existing physics engine) to
   match the exported design.
3. Run Playwright against both exports (mobile + desktop) to catch
   pixel drift.
4. Keep physics engine untouched; V3 is a UI-only rework.
5. Cutover /simulator to V3 once verified; V1 goes to /simulator-legacy
   (one release), V2 deleted immediately.

---

## 9. If Stitch generates something off-brand

Common misfires and corrections:

- Too much chrome: reply "Remove the large decorative chrome rings and
  background circles. Dark background is flat, scene is the focus."
- Pods too small: reply "Each pod must be at least 42% of viewport
  width on mobile. Sliders need enough length to read values."
- Wrong language: reply "Primary labels must be in Russian. English is
  optional subtitle only where it fits."
- Too gamified: reply "Style is calm technical marine interface, not a
  mobile game. Remove cartoon elements."

---

That's it. The main screen (section 1) is the source of truth; all
variants follow its layout with only state changes. Export each variant
as a separate PNG so I can see the delta. Include any exported Figma
tokens / SVGs - I'll wire them to the real physics engine.
