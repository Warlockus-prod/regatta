# Known Problems & Tracking

Running log of known issues, quirks and backlog items. Update this file when:
- finding a bug in production (add to "Active")
- fixing something (move to "Resolved" with date)
- identifying a future improvement (add to "Backlog")

Logs to check for clues:
- Production server: `ssh root@46.225.11.249 'docker logs --tail 500 regatta'`
- Local dev: console output of `npm run dev`
- Client errors and page views: look for `"evt":"client.*"` lines in the docker logs

---

## Active

### B2. Simulator - text overlap on compass diagram
- **Symptom:** in `/simulator`, labels (angle ticks, cardinal N/E/S/W, course names) sometimes overlap each other and the yacht icon, especially at certain boat angles
- **Fix plan:** add background-pill under TWA angle label; offset cardinals slightly further out; ensure TWA label avoids cardinal positions

### B3. /rules - illustration angles inconsistent with wind
- **Symptom:** in some of the 8 rule illustrations the boat rotation doesn't match the wind direction correctly (e.g. port-tack vs starboard-tack visual could confuse)
- **Fix plan:** review all 8 SVGs with sailing-accuracy lens: wind arrow, sail on opposite side of wind, boat heading matches claimed tack
- **Also:** add small "not to scale" note per illustration

---

## Deferred (not blocking, tracked for future)

- [x] ~~**3D yacht anatomy**~~ - **done v7.2.** `<model-viewer>` loading CC0 Poly Haven "Ship Pinnace" from /public/models/ship_pinnace/. 2D/3D toggle on /anatomy. Historic pinnace, not modern Bavaria - swap via `NEXT_PUBLIC_ANATOMY_GLB_URL` when a licensed modern cruiser GLB is ready, no code change required.

- [x] ~~**Practical missions - game integration**~~ - **done v7.0.** Mission picker + HUD hint + pass/fail card via `evaluateMission`.
- [ ] **Video demos on Courses page** - short muted webm clips showing each point of sail in motion. Needs asset creation (record simulator or render externally).
- [ ] **Self-hosted analytics** (Plausible / Umami / Pirsch) - add container to VPS, small nginx conf, ~15 LOC script tag in layout.
- [ ] **Polar diagram** - classic training tool. Renders speed-vs-TWA curve given wind strength. Read-only view in `/simulator` as toggleable overlay.
- [ ] **Course editor** - drag/drop marks on a canvas, serialize to URL hash, share. Substantial feature, ~1 day.
- [ ] **Multiplayer** - 2-6 players on same course via WebSocket. Requires backend (Node+Socket.io or similar). Architectural decision needed: keep within same Docker on VPS or move to Vercel + separate ws server.
- [ ] **Capacitor wrap** - ship as iOS/Android app from same codebase. Simple wrapper around Next.js PWA. ~2 hours.
- [ ] **Wind shifts in game** - every 30-60s the wind direction shifts ±5-15°. Requires physics refactor (currently wind is const).
- [ ] **Gusts & lulls** - visual wind patches on water affecting local speed ±20%.
- [ ] **Ghost replay** - overlay optimal path vs player after finish.
- [ ] **VMG hint arrow** - "sail higher" / "sail lower" during upwind.
- [ ] **Mark-rounding penalties** - 360° turn penalty for touching a mark.

### Missions design sketch (for later implementation)

Data-driven missions live in `src/data/missions.ts`:

```ts
interface Mission {
  id: string;
  titleRu: string;
  titleEn: string;
  goalRu: string;
  goalEn: string;
  constraints: MissionConstraint[];
  successCriteria: MissionCriterion[];
  reward?: string;
}
```

`MissionConstraint`: e.g. `{ type: 'max-tacks', value: 4 }`, `{ type: 'only-close-hauled' }`.
`MissionCriterion`: e.g. `{ type: 'finish-under', seconds: 120 }`, `{ type: 'no-no-go' }`.

Game page reads an active mission from URL `/game?m=upwind-only` or from menu selection, wires it into the game loop, shows constraints in HUD, and verifies at finish.

### SEO / discoverability (when time)

- [ ] Add `/sitemap.xml` route (static list of 6 pages)
- [ ] Add `/robots.txt` allowing crawling
- [ ] Per-page OG images (rendered via Next.js `opengraph-image.tsx`)
- [ ] Structured data (schema.org WebApplication)
- [ ] Proper `<html lang>` per page if i18n added

---

## Backlog

### High priority (user value)
- [x] ~~**Mini-map**~~ - **done** (`drawMiniMap` in game canvas bottom-right)
- [x] ~~**Wind shifts**~~ - **done v7.0.** Direction oscillates, gusts modulate speed, HUD indicator.
- [x] ~~**Autopilot (AUTO button)**~~ - **done** (with tooltip in v6.0)
- [ ] **Custom favicon + OG image** - currently using default Next.js favicon

### Medium
- [ ] **Gusts & lulls** - visual wind patches on water affecting speed ±20%
- [ ] **Ghost replay** - overlay ideal path vs player path after finish
- [ ] **VMG hint** - arrow saying "sail higher" / "sail lower" for optimal upwind VMG
- [ ] **Mark rounding penalties** - 360° turn penalty for touching a mark
- [ ] **More courses** - triangle course, slalom, reach-only

### Low
- [ ] **Wind strength slider** - 3 kts (light) to 20 kts (heavy) before race
- [ ] **Save race history to localStorage** - no account needed, just track PBs per difficulty
- [ ] **Accessibility** - keyboard focus outlines are currently subtle; also add aria-live for position changes
- [ ] **i18n switcher** - offer English-primary view (now RU primary, EN secondary)

### Infrastructure / Tech debt
- [ ] Add volume mount for `regatta.nginx.conf` to shared `nginx_server` compose so config survives container recreation. Currently via `docker cp` → lost on nginx_server rebuild.
- [ ] Automate deploy - GitHub Actions runner SSHs to VPS and does `git pull && docker compose up -d --build`. Right now deploy is manual.
- [ ] Add a CI workflow to at least run `npm run build` + `tsc --noEmit` on every push.
- [ ] Move hardcoded `ANTHROPIC_API_KEY` from `.env.local` - user must rotate the key that leaked in chat.

---

## Resolved

| Date | Problem | Fix |
|---|---|---|
| 2026-04-17 | B1 mobile game boat doesn't turn | `leftHeld/rightHeld` mirrored to `useRef`; touch steering works (v6.0) |
| 2026-04-17 | Missions data unused in game | Mission picker + HUD hint + pass/fail card wired up (v7.0) |
| 2026-04-17 | Constant wind, no tactical depth | Wind direction oscillates +/-6 deg, gusts 0.85-1.25x; TWA/no-go/laylines follow live wind (v7.0) |
| 2026-04-17 | Autopilot button existed but purpose unclear | Tooltip + caption under button explains "hold heading, disengages on any turn" (v6.0) |
| 2026-04-17 | Mobile white bg gap on overscroll | `overscroll-behavior: none` on html/body + fixed dark gradient `::before` for iOS Safari (v6.0) |
| 2026-04-17 | Menu didn't close on outside click | Replaced `<details>` with controlled state + `mousedown` outside-click + Escape handler (v6.0) |
| 2026-04-17 | Homepage language toggle required reload | Homepage converted to client component, all strings via `tp()` (v6.0) |
| 2026-04-17 | Russian-only UI | Polish added; `Lang = 'ru' | 'en' | 'pl'`, new `tp()` helper, 3-button toggle (v6.0) |
| 2026-04-17 | No leaderboards / anonymous identity | Session cookie `regatta_sid` + `players` and `race_results` SQLite tables + `/api/{player,race-result,leaderboard}` + `/leaderboard` page + on-finish nickname prompt (v7.0) |
| 2026-04-17 | 3D anatomy not available | `<model-viewer>` integration on /anatomy with Poly Haven CC0 "Ship Pinnace" shipped in /public/models/ (v7.2). Can be overridden via `NEXT_PUBLIC_ANATOMY_GLB_URL` with a Bavaria 46 GLB later. |
| 2026-04-17 | em-dash / en-dash in UI text everywhere | 520 occurrences replaced with ASCII hyphen; AI responses scrubbed server-side (v6.0 + v7.2) |
| 2026-04-17 | AI responses violated typography rule | /api/ai-chat and /api/coach scrub em/en-dashes before sending to client + system prompts updated (v7.2) |
| 2026-04-17 | Feedback widget RU-only with no assistant | Two tabs: Claude-powered AI assistant (scoped to sailing) + Feedback. Clickable `/section` links in replies (v6.0) |
| 2026-04-17 | Race mechanics unclear before start | Briefing screen with SVG course preview + rules + AUTO explanation; countdown pauses timer so boats can free-sail into start (v6.0) |
| 2026-04-17 | Boats clipped through each other | Pair-wise collision repel with 22-unit min separation + 8% speed penalty on contact (v6.0) |
| 2026-04-17 | AI coach showed static dot while thinking | 4-stage `AnalyzingProgress` animation + progress bar (v6.0) |
| 2026-04-17 | No way to re-watch race | `ReplayOverlay` with scrubbable timeline, event dots (tack / no-go / mark), per-timestamp coach comments, 0.5x-4x speed (v6.0) |
| 2026-04-17 | Only one boat style (generic cruiser triangle) | 4 styles (Cruiser / Racer / Classic / Skiff), different hull proportions, decks, sail heights, picker with SVG previews (v7.0) |
| 2026-04-16 | `JSX.Element` namespace not found in TS strict mode (courses page) | Replaced with `React.ReactElement` |
| 2026-04-16 | `ringColor` not a valid CSS property on React `style` prop | Replaced with `outlineColor` |
| 2026-04-16 | Hydration mismatch on courses page SVG - float precision between server and client for `Math.sin`/`cos` results | Round polar→cartesian outputs to 2 decimal places |
| 2026-04-16 | Rotated course labels unreadable (upside-down on bottom half of diagram) | Render non-rotated horizontal labels mirrored on both port/starboard sides; expand viewBox 520→600 to fit |
| 2026-04-16 | Overlapping leeward gate labels on racing page | Added `labelPos: 'left'\|'right'\|'below'\|'above'` prop to `BuoyMark` + shared "Leeward Gate" subtitle |
| 2026-04-16 | `public/` dir empty → Docker build fails on `COPY public` | Added `public/.gitkeep` |
| 2026-04-16 | Turbopack walked up to `/Users/Andrey/package.json` (unrelated RN project) and failed to resolve tailwindcss | Pinned `outputFileTracingRoot` + `turbopack.root` in `next.config.ts` |
| 2026-04-16 | VPS git pull didn't include latest commits after deploy script had already staged them | Explicit `git fetch --all && git reset --hard origin/main` in deploy flow |
| 2026-04-16 | Screenshot PNGs accidentally committed | `git rm --cached *.png` + expanded `.gitignore` |

---

## Observed patterns (learning for next time)

1. **Always `.gitkeep` empty folders** you need in the Docker build.
2. **Always `git rev-parse --show-toplevel`** before `git init` - there may already be a parent repo.
3. **SVG coords from trig functions need rounding** to avoid hydration mismatches.
4. **Nginx config changes on shared server** - use `docker cp` + `docker exec nginx -s reload`, never restart.
5. **Let's Encrypt cert files renew but don't auto-copy** to shared cert dirs - always set up a deploy-hook.
6. **Next.js `output: "standalone"`** needs `outputFileTracingRoot` explicitly pinned in monorepo-adjacent setups.
