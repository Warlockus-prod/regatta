# Wave 6 - Notes & Backlog

**Date:** 2026-04-17

---

## Shipped in this wave

1. **Polish language** (`pl`) everywhere the i18n hook reaches - toggle in header now has RU / EN / PL. `i18n.tsx` exposes `tp(ru, en, pl)`.
2. **Instant language switch** - homepage converted to a client component so the toggle no longer requires navigation.
3. **Mobile overscroll** - locked dark bg on `<html>`/`<body>`, fixed gradient layer for iOS rubber-band (no more white gap).
4. **Navigation redesign** - 5 primary items + "Ещё / More" dropdown grouped by **Обучение / На борту / Справочник**. Custom overlay with outside-click + Escape close (replaced the buggy `<details>`).
5. **AI assistant tab** in the feedback widget - two tabs: "Спросить AI" + "Отзыв". Claude Haiku with a cached system prompt scoped to yachting topics; auto-suggests site sections first, clickable in-message links (`/simulator`, `/game`…).
6. **Game: briefing screen** between menu and countdown - course map preview (SVG), step-by-step rules, controls, AUTO explanation, key-warnings card.
7. **Game: free sail during countdown** - boats can pre-position and feel the wind before the gun; timer / mark detection / race log stay paused.
8. **Game: collision repel** - simple pair-wise overlap resolution with a small speed penalty. No more boats clipping through each other.
9. **Game: AUTO tooltip** - button now explains what the autopilot does, with a short caption under it.
10. **Game: AnalyzingProgress** - staged animation while Claude works (4 phases + progress bar) replacing the static dot.
11. **Game: Replay overlay** - scrubbable timeline on a compact course map. Track renders progressively, event dots (tack / no-go / mark), per-timestamp coach comments, 0.5×-4× speed.
12. **Session cookie** - middleware issues `regatta_sid` (anonymous UUID, 1y) on every page navigation. Foundation for user table / leaderboards.

---

## What I skipped and why

- **Different boat sprites / 3D models.** The current canvas draws procedural hulls with sails that react to TWA - good for learning. Swapping in GLB models needs three.js, GLB hosting, and tanks the 60fps on mobile. Backlogged.
- **Auto-mode "works" fix.** It already worked - "not working" was a discoverability issue. The tooltip + caption should fix this without physics changes.
- **Cookies → name → leaderboard.** Dropped ahead for now (see "Proposed: users, names, leaderboards" below).

---

## Open items from the request

### 8. Design - "или так оставляем"
**Recommendation:** keep the current dark-ocean theme, it's coherent. Two targeted polishes worth doing next:
- **Hero**: the "неделя?" chip + headline gradient do the work, but the secondary-tools grid goes a bit flat on desktop (8 cards of similar size). Try two columns of 4 with slightly bigger cards, or group visually by the same "Обучение / На борту / Справочник" as the nav.
- **Game HUD**: TWA + speed + position are in *three* separate cards floating at the corners. On mobile they eat precious canvas. Consider a single top bar that collapses to a pill.

No drastic rework needed.

### 9. Cookies / users / leaderboards

Sessions cookie is in place already. Proposed backlog:

**Phase A - self-serve name (no login):**
- First time user finishes a race → modal "Save result? Enter a nickname" (2-20 chars).
- Store `{ sid, nickname, created_at }` in a new `users` table in the existing SQLite.
- Attach `sid` to every race submission; admin `/stats` can already see by IP, now by `sid` + nickname.
- Leaderboard page per difficulty + wind: top 20 finish times, refresh nightly.

**Phase B - optional email / Telegram bind:**
- After Phase A ships, add a "link this session to email" form with a magic link (sent via a small mail or SMTP-relay - needs a choice: SendGrid / Postmark / self-host).
- Telegram alternative: user types `/start` to the bot, bot shows a 6-digit code, user pastes it → binds.
- Result: same `sid` still primary, but verified contact unlocks: recovery if cookies cleared, "notify me when there's new content".

**Why phased:** Phase A is ~1 day, zero new infra. Phase B is ~3-5 days and needs operational decisions (Telegram bot hosting, SMTP provider). Shipping Phase A first lets you measure whether leaderboards actually engage people before paying the Phase B cost.

### 10. Waves you asked about

| ID | Name | Status | Notes |
|----|------|--------|-------|
| 10a | Missions UI in `/game` | **Wave 7 candidate** | Data already in `src/data/missions.ts`. Just need a mission-picker strip on the game menu + HUD hint during the race + pass/fail card in the result screen using `evaluateMission`. ~0.5 day. |
| 10b | 3D Bavaria 46 | Research needed | Free sources to explore: [Sketchfab "sailing yacht" CC-BY filter](https://sketchfab.com/3d-models?features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b&q=sailing+yacht), [Poly Pizza](https://poly.pizza/search/yacht), [Free3D](https://free3d.com/3d-models/yacht) (verify license per model), NASA's 3D assets (none for boats). Expect to not find an actual Bavaria 46 licensed for commercial use - more realistic: pick any modern cruiser shape, present it as "representative 46ft cruiser". Integration via `<model-viewer>` is the cheapest (web component, no three.js). ~1 day once a model is chosen. |
| 10c | Wind shifts physics | Complex | Today `WIND_DIRECTION = 0` constant. Need: a slowly oscillating wind dir (±5° period 20s) + gusts (short speed boost ±20% period 8s). Makes every race different and tactical. ~0.5 day gameplay + 0.5 day to tune. |
| 10d | Retention - shareable cards | Skip | This one was about generating OG/share images from race results ("I placed 2nd out of 4, time 1:47") so people post them. Useful only if the product has organic traffic first. Defer. |

---

## Verification checklist (to run in browser once server is up)

- [ ] RU/EN/PL toggle swaps content instantly on `/`
- [ ] On mobile, pull down at the top → no white gap
- [ ] Menu → pick anything → menu closes
- [ ] Menu → open → click outside → menu closes
- [ ] Feedback widget → "Спросить AI" tab → example buttons populate input, reply appears
- [ ] Feedback widget → "Отзыв" tab → can submit
- [ ] `/game` → difficulty → briefing shows course preview
- [ ] Briefing → "Готов" → countdown starts; boats can sail during 3·2·1
- [ ] Race finish → staged "AI думает" animation → coaching appears
- [ ] Result screen → "▶ Replay гонки" → scrubbable timeline with events
