# Regatta Trainer — Unified Product Roadmap

**Last updated:** 2026-04-17
**Positioning:** Быстрый вход в яхтенные гонки за ~45 мин. For people with a regatta/charter coming up in the next week.

## Product principles

1. **Clarity over realism** — beginner must understand, not marvel
2. **Scenarios over theory** — cards with situations, not textbooks
3. **Mobile-first web** — install-free, shareable link
4. **RU + EN primary** — bilingual from day one
5. **Data-driven decisions** — ship → measure → iterate (not assume)
6. **Ship working thing, then improve** — wave-based delivery

---

## Wave 1 — Positioning & core learning flow ✅

**Shipped:** Homepage rebrand, 3 entry points, Feedback widget, Simple Rules with 8 scenario cards.

- [x] Homepage: "До регаты неделя? Успеешь разобраться."
- [x] 3 entry points: Начать с нуля / Освежить перед стартом / Разобрать правила
- [x] Why-bullets, CTA badges
- [x] Feedback + Bug report widget (floating, single modal, two modes)
- [x] `/api/feedback` endpoint with JSONL persistence
- [x] Simple Rules page at `/rules` — 8 scenario cards with SVG illustrations
- [x] Nav: added "Правила" + renamed "Гонки" → "Тактика"
- [x] Build passes, TypeScript strict, PWA manifest preserved

---

## Wave 2 — Content depth

**Goal:** Give beginners the rest of "first-regatta" basics.

- [ ] **"Первая неделя на яхте"** page — `/onboard`:
  - who's in charge, how to listen to commands
  - where to sit, where NOT to put hands
  - why the boom is dangerous
  - sheets, halyards, winch, fender — what each is for
  - what happens at start, tack, docking
  - what to bring with you
- [ ] **"Start Here" bootcamp** route — links 8 existing lessons in order:
  1. ветер → 2. курсы → 3. паруса → 4. оверштаг → 5. фордевинд → 6. лавировка → 7. правила → 8. мини-гонка
  - progress per step stored in localStorage
  - "Продолжить" button on homepage when progress exists
- [ ] **Language toggle** — global RU/EN switch (localStorage), applies to all pages with bilingual content
- [ ] **Storage schema versioning** — `storageVersion: 3` gate, safe reset on mismatch
- [ ] **Missions in game** — 3–4 scenarios: "reach mark only close-hauled", "finish under X sec", "no no-go entries"

---

## Wave 3 — Observability & content polish

- [ ] **Server-side analytics table** — SQLite file on VPS, events from `/api/log` persist there (not just stdout)
- [ ] **Minimal admin page** — `/admin` password-protected, shows: events today, top paths, feedback/bug reports list with statuses
- [ ] **Yacht anatomy** — 2D side + top-view cutaway with clickable hotspots (bow, stern, mast, boom, shrouds, forestay, mainsail, jib, sheets, halyards, winch, cleat, rudder, keel, fender)
- [ ] **Shareable result after Bootcamp** — generates image/card, "I completed Regatta Trainer prep"
- [ ] **Pre-race checklist** — "что взять, что проверить перед выходом"

---

## Wave 4 — Retention & depth

- [ ] **6 knots** — figure-eight, bowline, cleat hitch, clove hitch, round turn + 2 half hitches, sheet bend. SVG step-by-step animations (not 3D).
- [ ] **Wind shifts + gusts** in game (requires physics refactor)
- [ ] **Debrief / ghost replay** after race — "optimal path" overlay vs player trajectory
- [ ] **VMG hint** during upwind ("sail higher" / "sail lower")
- [ ] **Quick refresh mode** — 15-min fast path for experienced sailors
- [ ] **"Commands on board"** — mini block: "приготовиться к повороту", "поворот", "трави", "выбирай"

---

## Wave 5 — Advanced & long-tail

- [ ] **3D yacht anatomy** — if 2D proves demand. Use `<model-viewer>` with hotspots, low-poly model.
- [ ] **Polar diagram** — speed-vs-TWA curve, toggle in simulator
- [ ] **Lightweight assessment / quiz** — after each section, final "ready / review" verdict (test first, adults hate being quizzed)
- [ ] **Instructor/skipper mode** — open scenario on big screen, explain to crew
- [ ] **Charts in admin** — only if event volume justifies it
- [ ] **Analytics funnel report** — landing → start-here → lesson → race → finish

---

## Deferred / maybe never

These require architectural decisions, assets, or validation not yet in scope:

- Multiplayer — needs backend, state sync, anti-cheat
- Capacitor wrap for iOS/Android — PWA covers this for now (Apple credentials noted in personal memory)
- Full Racing Rules of Sailing integration — overkill, link out instead
- Course editor — nice but low ROI until audience scale
- Self-hosted analytics (Plausible/Umami) — our own logs cover it for now
- Video demos — needs asset creation, defer
- Hardcore physics / heel response / apparent wind — wrong battle to fight vs eSail

---

## Decisions explicitly pushed back on

These came from external input and we chose NOT to do them (or not yet):

| Proposal | Our stance | Reason |
|---|---|---|
| Bavaria 46 as the one boat everywhere | Not committed | Bavaria 46 is a cruiser, not a regatta racer. We'll pick after seeing audience. |
| 3D anatomy before 2D | No | SVG covers 90% of value at 10% cost |
| Full admin with charts | No (yet) | Simple event list first; charts when data justifies |
| "Bootcamp in 45–60 min" hard promise | Softened | Framed as "10 уроков по 5 минут" — less time-dependent |
| Native iOS/Android app now | No | PWA ships today; native only if repeat usage proves it's worth it |
| Delete game, rebuild with new boat | No | Evolve existing AI-coach game |

---

## Shipping discipline

Each wave ships as a batch:
1. Implement in one session
2. Build + TypeScript strict
3. Playwright smoke test on desktop + mobile viewports
4. Commit with descriptive message
5. SSH → `git pull && docker compose up -d --build`
6. Verify live: `curl` → 200, manual click-through on mobile
7. Update this ROADMAP.md

No wave ships without passing build. No feature is complete without being on live site.
