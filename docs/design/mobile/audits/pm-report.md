# Mobile PM / UX audit (v1 TestFlight gate)

Audit date: 2026-05-12. Auditor: PM-as-product-owner pass over the
mobile/ scaffold against web parity targets in
[ADR-0005](../DECISIONS.md) and the "race-ready in a week" promise from
[DESIGN_BRIEF.md](../DESIGN_BRIEF.md).

## TL;DR (what v1 still needs)

1. The app today is a Phase-1 reference shell: 11 content screens read
   well, but 4 of the 5 product-defining surfaces (Game, Simulator,
   Multiplayer, Leaderboard) are stubs or placeholders. The "tutor that
   gets you race-ready" promise is not yet redeemable on the device.
2. The 7-day Bootcamp narrative is invisible. Web wraps lessons in a
   "track picker" hub with progress + reset; mobile shows a flat list
   with no day mapping, no completion arc, no "what is next". The home
   has no "Continue lesson 4" hook.
3. Three screens (`/game`, `/multiplayer`, `/leaderboard`) ship as
   `PlaceholderScreen` and are still surfaced in the Tools section of
   Home with no Beta tag. They look like dead ends to a tester. Web
   does not advertise empty surfaces.
4. Cross-cutting features that exist on web are missing on mobile:
   AI coach (`/api/coach`), race-result submit (`/api/race-result`),
   pre-race checklist (`/checklist`), leaderboard read, race / game
   loop. v1 cannot "validate the user's preparedness" without at least
   the checklist + AI coach surface.
5. Polish gaps that block App Store credibility: emoji are still the
   only iconography (DESIGN_BRIEF flagged this), no onboarding tour
   on first launch, language picker is the only Settings entry,
   wordmark `Bavaria 46` brand mention recently scrubbed on web but
   never present on mobile (good - leave clean).

## Feature parity matrix

Reading the web Navigation primary list +
[SPEC.md](../SPEC.md) route inventory. "Status" is the mobile state.

| Web route | Web purpose | Mobile route | Status | Notes |
|---|---|---|---|---|
| `/` | Home: hero + 3 entry points + why bullets + 7 secondary tools + hint | `app/index.tsx` | partial | Missing: "Continue last lesson" hook, why-bullets, learning-path hint footer, "Today's challenge" slot. |
| `/start` | Track picker hub + bootcamp inline (404 lines) | (folded into Home + `/bootcamp`) | partial | Web uses `/start` as the bootcamp landing with track picker (Full/Refresh/Onboard); mobile collapses these into Home tiles + a flat `/bootcamp`. The 7-day arc is lost. |
| `/quick` | 6 quick refresh tips | `app/quick/index.tsx` | full | Mirrors. |
| `/rules` | 8 collision scenarios | `app/rules/index.tsx` + `[id].tsx` | partial | Reveal flow works. **No SVG illustrations** (web has 8 distinct scenario diagrams - port-vs-starboard etc.). DESIGN_BRIEF section 5.5 flags as v1.x but they are the visual signature of the rules surface. |
| `/onboard` | 8 sections etiquette / commands | `app/onboard/index.tsx` | full | Mirrors. |
| `/anatomy` | 17 parts + interactive yacht poster + 3D model | `app/anatomy/index.tsx` | partial | List-only. **No interactive diagram** (web has clickable hotspots over a poster). DESIGN_BRIEF section 5.7 deliverable. |
| `/glossary` | 51 terms search + category chips | `app/glossary/index.tsx` | partial | Search works. **No category chips** (boat / sail / course / maneuver / racing / wind / crew). |
| `/courses` | Polar diagram + 5 cards (interactive) | `app/courses/index.tsx` | full | Static polar present. Tap-to-scroll behavior is v1.x. |
| `/racing` | Right-of-way + strategies + tactical SVG diagrams | `app/racing/index.tsx` | partial | Text-only. **No tactical SVG diagrams** (start-line, upwind, downwind, mark-rounding). |
| `/checklist` | Pre-race reading reference (566 lines, 7 langs) | (none) | **missing** | Single most actionable "before regatta" page on web. Not on mobile at all. Critical for the "race in a week" promise. |
| `/simulator` (V1) | Production VPP simulator | (n/a, web V1 not mirrored) | by design | ADR-0005 chose simulator-v3 as reference. |
| `/simulator-v3` | Reference simulator (modes / drills / scenarios) | `app/simulator/index.tsx` | **placeholder/preview** | Mobile screen is a Phase-2 stub: pan-to-aim, fixed wind, 3-cell HUD. No VPP, no missions, no sail trim, no scenarios. Labeled "PHASE 2 PREVIEW". |
| `/game` | Solo race against AI w/ replay (3120 LOC) | `app/game/index.tsx` | placeholder | `PlaceholderScreen` titled "Phase 2". No countdown, no buoys, no finish line, no AI opponents. |
| `/multiplayer` | 4-char code lobby + WS race | `app/multiplayer/index.tsx` | placeholder | `PlaceholderScreen` titled "Phase 4". |
| `/leaderboard` | Read-only filtered leaderboard (220 LOC) | `app/leaderboard/index.tsx` | placeholder | `PlaceholderScreen` titled "Phase 3". Could be a Tier-2 read-only view in v1. |
| `/gallery` | Photo + YouTube grid | `app/gallery/index.tsx` | full | Mirrors (single column, no masonry). |
| (web nav: `/settings` is implicit) | Language toggle in nav strip | `app/settings.tsx` | partial | Language picker + about card. **No haptics toggle, no telemetry opt-in, no privacy link, no support contact** (App Store requires all three). |
| AI coach (`/api/coach` consumed by Game) | Post-race coaching markdown | (none) | **missing** | No surface in mobile at all. ROADMAP has it Phase 3 + ADR-0006 auth. |
| Daily challenge (`/api/daily`) | Banner promo on Home | (none) | missing | Phase 3. |
| Race result submit (`/api/race-result`) | Logs finish to leaderboard | (none) | missing | Depends on Game screen. |
| Replay viewer (`/r/[code]`) | Watch a shared 4-char replay | (none) | missing | Phase 2 follow-on. |

### Quick scoreboard

- 11 of 17 user-facing routes are full or partial (content shell green).
- 4 routes (Simulator, Game, Multiplayer, Leaderboard) ship as
  placeholder or Phase-2 stub. These are the "interactive proof" the
  product positioning leans on.
- 3 cross-cutting features (Checklist, AI coach, Daily) are missing
  outright.

## P0 gaps (block v1 TestFlight release)

These are not "polish" - they affect whether a tester can credibly
believe the app gets them race-ready.

### P0-1: Bootcamp lacks the 7-day "Day N of 7" arc

- Severity: P0
- Component: Bootcamp index + Home
- File: /Users/Andrey/App/all/regatta/mobile/app/bootcamp/index.tsx,
  /Users/Andrey/App/all/regatta/mobile/app/index.tsx:30-45
- Gap: The product is "Week to Regatta" but lessons are 8 cards with no
  day mapping, no progress arc, no sense of where the user is in the
  week. Home has no "Continue lesson N" hook even though
  `useBootcampProgress()` is wired (see bootcamp/index.tsx:27).
- Action: Map 8 lessons to Days 1-7 (one day can hold two short lessons),
  add a slim 0-of-7 progress strip at the top of Bootcamp, and add a
  "Continue Day N" primary card to Home that reads from the same hook.
  No new content needed - relabel.

### P0-2: Game screen is the centerpiece and it is empty

- Severity: P0
- Component: Game (race mode)
- File: /Users/Andrey/App/all/regatta/mobile/app/game/index.tsx
- Gap: Web `/game` is the user's first hands-on test of "did I learn?".
  Mobile `/game` is a `PlaceholderScreen` saying "Phase 2 - lands with
  the simulator". Without it, the bootcamp lessons end in a void.
- Action: Either ship a minimum viable solo race (countdown + 3-buoy
  course + finish line, even on stub physics) for v1 or remove the
  Game promise from Home + Bootcamp lesson 8 until Phase 2 lands. The
  current state ("a placeholder pretending to be a feature") is worse
  than either option.

### P0-3: Simulator is labeled "PHASE 2 PREVIEW" in the UI

- Severity: P0
- Component: Simulator
- File: /Users/Andrey/App/all/regatta/mobile/app/simulator/index.tsx:131-148
- Gap: The simulator surface a tester opens carries a "PHASE 2 PREVIEW"
  badge and a paragraph saying physics are stub. App Store reviewers
  have rejected apps for visible "in development" markers; testers
  read "this product is not finished".
- Action: Either ship Phase-2-proper for v1 (per ADR-0005 / ROADMAP
  parity goal) or, if descoping, hide the Simulator entry from Home and
  Bootcamp lesson links until the real physics lands. Do not ship a
  preview-badged screen as a primary tile.

### P0-4: Three Tools tiles point at placeholder screens

- Severity: P0
- Component: Home Tools section
- File: /Users/Andrey/App/all/regatta/mobile/app/index.tsx:228-260
- Gap: Home advertises Simulator + Multiplayer + Leaderboard. Tapping
  Multiplayer or Leaderboard yields a `PlaceholderScreen` ("Phase 3 /
  Phase 4 - launching later this year"). 1st-time testers will tap,
  bounce, and never come back. Web does not surface these placeholders.
- Action: Hide the Multiplayer + Leaderboard rows entirely until those
  features land, OR mark them with a clear "Coming soon" pill instead
  of a regular ListRow. The existing PlaceholderScreen content reads
  like a marketing tease, not an empty state.

### P0-5: No first-launch onboarding

- Severity: P0
- Component: App entry / first launch
- File: /Users/Andrey/App/all/regatta/mobile/app/_layout.tsx,
  /Users/Andrey/App/all/regatta/mobile/app/index.tsx
- Gap: User installs from TestFlight, opens the app, sees Home with a
  long stack of cards in the device locale (or RU fallback). No
  language pick prompt, no welcome, no "you are about to spend a week
  with this app" framing. DESIGN_BRIEF question 7 still open.
- Action: Add a 3-step first-launch flow: (1) language pick (auto-skip
  if device locale resolves), (2) "When is your regatta?" date picker
  (drives the day-by-day arc), (3) "Pick your track" from the 3 web
  entry points (Bootcamp / Quick / Onboard). Persist to AsyncStorage,
  show once.

### P0-6: Pre-race Checklist screen is missing entirely

- Severity: P0
- Component: New screen `app/checklist/`
- File: /Users/Andrey/App/all/regatta/src/app/checklist/page.tsx (web
  source, 566 lines, 7 langs)
- Gap: Web `/checklist` is the single most "ready for the regatta"
  reading reference, with sections like "who to listen to", "first 10
  minutes on board", "what to bring". For a mobile-first sailing
  newbie, this is the page they pull up at the dock. Missing on mobile.
- Action: Port the web checklist as `app/checklist/index.tsx` reusing
  the `Card` + bulleted-items shape from `/onboard`. Same content
  source, no new translation needed. Wire from Home Reference + Day 7
  of the bootcamp arc.

### P0-7: Settings is missing App Store-required entries

- Severity: P0
- Component: Settings
- File: /Users/Andrey/App/all/regatta/mobile/app/settings.tsx
- Gap: Settings has language picker + about card. Apple App Review
  requires a privacy policy link and (if any analytics/telemetry) a
  consent toggle. ATT (App Tracking Transparency) prompt is also
  required if telemetry is on by default.
- Action: Add a "Privacy" section with: Privacy policy link (URL on
  regatta.icoffio.com), Terms link, support contact (mailto), telemetry
  opt-in toggle (default off until ADR-0007 lands), reset progress
  destructive action with confirm. Per DESIGN_BRIEF section 5.14.

### P0-8: Cyrillic-leak guard is web-side only

- Severity: P0
- Component: Mobile content + i18n
- File: /Users/Andrey/App/all/regatta/mobile/scripts/sync-content.ts
  (presumably) + /Users/Andrey/App/all/regatta/scripts/cyrillic-scan.mjs
- Gap: Mobile JSON twins inherit web content but no mobile-side scan
  proves no Cyrillic leaks into ES/FR/DE/IT screens during the JSON
  build. App Store reviewers in non-RU markets reject Cyrillic on
  English-mode pages.
- Action: Add a `npm run lang-scan` (mobile lane) that reads
  `mobile/src/data/*.json`, asserts no Cyrillic chars in any of the
  6 non-RU language fields. Wire into `mobile/npm run check` as a
  parity guard before TestFlight.

## P1 gaps (strong polish, ship-quality)

### P1-1: Rules scenarios have no SVG illustrations

- Severity: P1
- Component: Rules scenario detail
- File: /Users/Andrey/App/all/regatta/mobile/app/rules/[id].tsx:116
- Gap: Mobile shows the SVG ID as a text tag (`scenario.svg`). Web
  shows port-vs-starboard, windward-leeward, etc. as authored
  illustrations - the visual signature of the rules surface.
- Action: Add `react-native-svg` and port the 8 scenario SVGs as RN
  components or bundle them as static SVGs with the `SvgUri` /
  `SvgXml` reader. Replace the `scenario.svg` text tag with the
  illustration.

### P1-2: Anatomy has no interactive diagram

- Severity: P1
- Component: Anatomy
- File: /Users/Andrey/App/all/regatta/mobile/app/anatomy/index.tsx
- Gap: 17 parts as a flat list; data has `part.side: { x, y }` already.
  Web has clickable hotspots over a yacht poster. The list is
  read-once, the diagram is reach-for.
- Action: Bundle the web yacht-side-view poster (PNG or SVG) into
  `mobile/assets/brand/anatomy/`. Render with absolute-positioned
  pressable hotspots driven by `part.side`. Bottom sheet shows the
  part info on tap.

### P1-3: Glossary has no category chips

- Severity: P1
- Component: Glossary
- File: /Users/Andrey/App/all/regatta/mobile/app/glossary/index.tsx
- Gap: Search works; 51 terms scroll without category-filter chips
  (boat / sail / course / maneuver / racing / wind / crew). Web filters.
- Action: Add a horizontal `ScrollView` of pressable `Chip`s above the
  search input. Multi-select toggles like web. Category source already
  in the synced JSON (`glossaryCategories`).

### P1-4: Racing tactics have no diagrams

- Severity: P1
- Component: Racing
- File: /Users/Andrey/App/all/regatta/mobile/app/racing/index.tsx
- Gap: Two text sections (right-of-way + strategies). Web embeds 4-6
  small tactical SVGs (start-line, upwind leg, downwind leg, mark
  rounding). Without them this surface reads like a wiki.
- Action: Author 4 tactical SVGs (or port from web), embed in the
  matching strategy cards via `react-native-svg`.

### P1-5: Home has no "Continue where you left off" hero

- Severity: P1
- Component: Home
- File: /Users/Andrey/App/all/regatta/mobile/app/index.tsx:30-89
- Gap: Bootcamp progress hook exists but Home does not read it. A
  returning user lands on the same generic hero every time.
- Action: At top of Home, if `useBootcampProgress().completedIds.size
  > 0 && < 8`, render a "Continue Day N - <next lesson title>" primary
  card pointing at `/bootcamp/<next-id>`. Otherwise render the current
  three-tile entry. Use the `/start` web logic at
  src/app/start/page.tsx:24-34 as reference for "next unstarted".

### P1-6: Lesson detail auto-completes on tap of practice CTA

- Severity: P1
- Component: Bootcamp lesson detail
- File: /Users/Andrey/App/all/regatta/mobile/app/bootcamp/[id].tsx:108-115
- Gap: Tapping "Open" both marks the lesson done AND navigates. User
  could open the practice route to peek and "complete" it without
  reading. Web has explicit "Mark done" affordance. DESIGN_BRIEF
  section 5.3 calls this out.
- Action: Split the CTA into two: "Open practice" (navigates only) and
  "Mark done" (toggles completion). Or move "Mark done" to the lesson
  meta strip as a check-toggle.

### P1-7: Settings has no "Reset bootcamp progress"

- Severity: P1
- Component: Settings
- File: /Users/Andrey/App/all/regatta/mobile/app/settings.tsx
- Gap: User cannot reset the bootcamp arc to start over. Web `/start`
  has a reset button (src/app/start/page.tsx:69-74).
- Action: Add a "Reset progress" destructive `Button` in Settings under
  a new "Data" section, with a confirmation alert.

### P1-8: Iconography is still emoji

- Severity: P1
- Component: Cross-cutting
- File: /Users/Andrey/App/all/regatta/mobile/src/data/bootcamp.json,
  rules.json, onboard.json (emoji fields)
- Gap: DESIGN_BRIEF section 2.6 flags emoji as engineering shortcut.
  iOS Photos / Books / Day One do not use emoji as primary icons; it
  pulls the brand toward "fun app for kids".
- Action: Either commission the 40-glyph icon set per
  DESIGN_BRIEF 2.6 + 9.4, or pick an open-source iconset (Lucide,
  Phosphor) as v1 stopgap and tint cyan. Replace emoji-render call
  sites with `<Icon name="..."/>`.

### P1-9: No empty / loading / offline states

- Severity: P1
- Component: All Tier-2 + Tier-3 screens (Gallery, Leaderboard,
  Multiplayer)
- File: cross-cutting; e.g.
  /Users/Andrey/App/all/regatta/mobile/app/gallery/index.tsx
- Gap: Per ADR-0004 Tier-2 screens must show "offline" banner on
  network failure. Today they will quietly render zero items.
- Action: Add `OfflineBanner` + `Skeleton` design-system primitives
  per DESIGN_BRIEF 4.2 and wire to gallery / leaderboard fetch states.

### P1-10: Wordmark sized inconsistently across screens

- Severity: P1
- Component: Cross-cutting
- File: /Users/Andrey/App/all/regatta/mobile/app/index.tsx:82-84,
  Settings about card
- Gap: Home renders "Week to Regatta" stack large; About card renders
  inline "Week to Regatta" body-style. Wordmark spec is one of the
  brand promises (DESIGN_BRIEF 2.2).
- Action: Extract a `<Wordmark size="xl|m|s"/>` component in the
  design system, use everywhere the brand appears.

## P2 nice-to-haves (defer to v1.1)

- P2-1: Tap-on-sector interaction in Courses (per SPEC.md Courses
  v1.x note).
- P2-2: Glossary term detail pages with related terms (DESIGN_BRIEF
  5.8 v1.x).
- P2-3: Image-detail modal for Gallery tap (DESIGN_BRIEF 5.11).
- P2-4: Quick refresh layout exploration (carousel / accordion per
  DESIGN_BRIEF 5.4).
- P2-5: 800ms intro splash animation (DESIGN_BRIEF 5.1, question 3).
- P2-6: Bottom tabs vs stack-only navigation (DESIGN_BRIEF 3.2,
  question 1).
- P2-7: Light theme (DESIGN_BRIEF 2.4, question 2).
- P2-8: Daily challenge banner on Home (Phase 3, ADR-0004).
- P2-9: Replay viewer + share-sheet (Phase 3+).
- P2-10: Sign in with Apple + cloud sync (Phase 3, ADR-0006).

## v1 shipping checklist (ordered, actionable)

1. **Decide v1 scope today**: full parity per ADR-0005 OR descope
   to "Content + minimal Game". Document in a new ADR-0009
   ("v1 surface area decision") in `docs/design/mobile/`.
2. **Hide placeholder Tools tiles** (P0-4). 5 lines in
   `mobile/app/index.tsx`.
3. **Port `/checklist` as a mobile screen** (P0-6). Reuses onboard
   layout primitives. ~1 day.
4. **Reframe Bootcamp as "Day N of 7" arc** (P0-1). Relabel only,
   no new content. Add Home "Continue Day N" card. ~1 day.
5. **First-launch onboarding** (P0-5). Language + regatta date +
   track picker. Persist to AsyncStorage. ~2 days.
6. **Settings privacy / telemetry / reset section** (P0-7 + P1-7).
   ~1 day.
7. **Cyrillic-leak scan in mobile CI** (P0-8). ~2 hours.
8. **Decide Simulator + Game posture** (P0-2 + P0-3). Either ship
   Phase 2 OR hide and rebrand the surfaces. No middle ground.
9. **Glossary category chips** (P1-3). ~half day.
10. **Split lesson CTA into Open + Mark done** (P1-6). 30 minutes.
11. **Wordmark component + about-card cleanup** (P1-10). 1 hour.
12. **Replace emoji with icon set** (P1-8). 1-3 days depending on
    in-house vs Lucide adoption.
13. **Rules SVGs + Racing diagrams + Anatomy hotspots** (P1-1, P1-2,
    P1-4). 3-5 days, requires `react-native-svg`. Optional for v1
    but flagged P1 because they are the visual signature.
14. **Empty / loading / offline state primitives** (P1-9). 1 day.
15. **App Store metadata draft** in 7 langs per ROADMAP Phase 5
    (subtitle, description, keywords, screenshots template).
16. **Smoke test on iPhone SE (3rd gen)** + iPhone 13 + iPhone 15
    Pro per ROADMAP 4.3. Test in 7 langs in airplane mode.
17. **Privacy manifest + ATT prompt setup** per ROADMAP Phase 5.
18. **TestFlight upload via EAS Build production profile**, internal
    review for 1 week before invite expansion.

## Hard "do not ship if any are red" gates

- Game screen behavior is decided (ship or hide). No `PlaceholderScreen`
  on Home Tools.
- Settings has Privacy policy link.
- 7-language audit shows zero Cyrillic leaks in EN/PL/ES/FR/DE/IT.
- First-launch flow runs and persists state correctly across reinstall.
- Bootcamp arc tells the user "Day 1" through "Day 7".
- App icon is final (not engineering placeholder per
  mobile/assets/brand/icon.svg).
- Tagline + screenshots speak the "race in a week" promise. Today
  the tagline says "Sailing tutor", which is generic.
