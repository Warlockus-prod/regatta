# Regatta Trainer — Master Roadmap

**Last updated:** 2026-04-17
**Current live version:** v1.0 at https://regatta.icoffio.com
**Backup:** git tag `v1.0`, docker image `regatta:v1.0`

---

## Product positioning (approved)

**Main promise:** "До регаты неделя? Успеешь разобраться."
**Target user:** человек перед первой регатой, чартером или сменой на яхте, кому нужна база за ~45 мин.
**Differentiator:** быстрый вход через сценарии, не ещё один симулятор для профи.

---

## Product decisions — updated

Все пункты где у меня были pushback'и — решение пользователя финальное.

| # | Pushback (my original) | User decision | Status |
|---|---|---|---|
| 1 | Не коммититься на Bavaria 46 | **Bavaria 46 — главная яхта продукта.** Проверить сложность интеграции | Accepted |
| 2 | 2D anatomy первым | **Согласен, 2D first** (as I proposed) | Accepted |
| 3 | 3D anatomy — позже | **3D делаем сразу, лучше для продукта** | Override |
| 4 | Full admin отложить | **Делаем сразу, на `/stats` с паролем `regattA`** | Override |
| 5 | Softened 45-60 мин промис | **Держим обещание — делаем для всех сразу** | Override |
| 6 | Не удалять игру | **Не удалять, добавлять фичи** (as I proposed) | Accepted |

**Other user decisions:**
- Languages: RU + EN во всём контенте (full toggle, not partial)
- Waves для разработки — OK
- "Чего не хватает" — отложить на потом

---

## Critical bugs to fix FIRST (before any new features)

### B1. Mobile game: boat doesn't turn
**Symptom:** На мобайле в `/game` при попытке управлять (touch кнопки ← →) лодка не поворачивается.
**Likely cause:** React state `leftHeld` / `rightHeld` не пробрасывается в game loop через замыкание — `useEffect` захватил старые значения при первом рендере.
**Fix:** заменить state на `useRef` для touch-кнопок, ИЛИ включить `leftHeld`/`rightHeld` в deps массива игрового loop'а (что перезапускает loop — плохо) — **используем ref**.
**Impact:** Critical. Игра бесполезна на мобайле без этого.

### B2. Simulator text overlap on the compass
**Symptom:** В `/simulator` текст (цифры углов, N/E/S/W, подписи курсов) местами накладывается на карту/диаграмму при определённых положениях яхты.
**Likely cause:** TWA-дуга подпись рисуется в точке посередине arc'а, где уже может быть cardinal label (N/E/S/W).
**Fix:** сдвинуть подпись угла дальше от центра, добавить background-pill под текстом, или показывать только когда не overlaps с cardinal.
**Impact:** Medium visual polish.

### B3. Simple Rules illustrations — boat angles wrong relative to wind
**Symptom:** На иллюстрациях в `/rules` соотношение лодки к ветру визуально не точное (например, port-tack лодка может быть нарисована не под тем углом).
**Fix:** пересмотреть каждую из 8 иллюстраций, выверить rotation лодок против wind arrow. Добавить комментарий "не в масштабе" где уместно.
**Impact:** Medium — правильность обучения.

---

## Wave 2 — Content depth + i18n (highest value)

Ship together as one release.

### 2.1. Full RU/EN language toggle
- [ ] Language context (`LanguageContext`) с localStorage persistence
- [ ] Toggle в navigation (✓ ✓)
- [ ] Перевести все UI strings через useTranslation hook ИЛИ сделать шаблон `<T ru="..." en="..." />`
- [ ] Все data файлы уже имеют RU+EN поля (pointsOfSail, rules, glossary) — переключатель просто выбирает какие показывать
- [ ] Default: RU; запомнить выбор

### 2.2. "Первая неделя на яхте" — `/onboard`
Contentual differentiator — уникальная ниша.
- [ ] Иерархия:
  - Кто главный на лодке (шкипер, old salt, crew)
  - Как слушать команды + команды ("приготовиться к повороту", "поворот", "трави", "выбирай", "отдать конец", "кранец на борт")
  - Где сидеть, куда не совать руки
  - Почему гик опасен (ducking reflex)
  - Что такое шкоты, фалы, лебёдка, кранцы (link to anatomy когда готово)
  - На старте / повороте / швартовке — что происходит, что от тебя ждут
  - Safety mindset
  - Что взять с собой (чек-лист)
  - Как не мешать (tips for quiet crew behavior)
- [ ] Формат: аккордеон + SVG иллюстрации (не 3D пока)
- [ ] Bavaria 46 terminology where applicable

### 2.3. "Start Here" bootcamp — `/start`
User insisted on keeping 45–60 мин promise.
- [ ] 8-lesson guided flow:
  1. Ветер и направление (5 min, existing content)
  2. Курсы относительно ветра (10 min, links `/courses`)
  3. Как работает парус (5 min, new)
  4. Поворот оверштаг (5 min, new)
  5. Поворот фордевинд (5 min, new)
  6. Лавировка и VMG (5 min, links `/racing`)
  7. Простые гоночные ситуации (10 min, links `/rules`)
  8. Мини-регата (10 min, links `/game` easy mode)
- [ ] Progress tracking в localStorage (`storageVersion: 1`)
- [ ] "Продолжить с шага X" button на homepage если есть прогресс
- [ ] Share card на финише ("Я прошёл Regatta Trainer за X мин")

### 2.4. Missions in game (3-4 scenarios)
- [ ] "Дойди до знака только бейдевиндом" (no-tack penalty)
- [ ] "Финишируй под 90 сек" (time challenge)
- [ ] "Ни разу не попади в мёртвую зону" (no no-go mode)
- [ ] "Минимум поворотов" (efficient tacking)
- [ ] UI: выбор в game menu рядом с difficulty

### 2.5. Storage schema versioning
- [ ] `storageVersion` в каждом localStorage ключе
- [ ] Migration / safe reset on mismatch
- [ ] Typed storage helper (`src/lib/storage.ts`)

---

## Wave 3 — Bavaria 46 commitment + Analytics admin

### 3.1. Bavaria 46 as visual base
**Complexity estimate:** Medium (~2-3 hrs visual work, +1 day for 3D model integration in wave 4)
- [ ] Обновить top-view яхты в simulator + game — силуэт Bavaria 46 (длинный корпус, правильная корма, transom steps)
- [ ] Side view в simulator — Bavaria 46 profile с характерной cabin line, hard dodger, wheel pedestal
- [ ] Sail plan: Bavaria 46 fractional rig — mainsail + 105% jib (не genoa)
- [ ] Все тексты "onboard" обновить под 46ft Bavaria terminology (wheel not tiller, двигатель Volvo, chart plotter at helm)
- [ ] В footer / about: "Simulation based on Bavaria 46 Cruiser (LOA 13.99m, Beam 4.29m, Draft 2.05m)"

### 3.2. `/stats` admin page (full version)
- [ ] Route `/stats` (not `/admin` — user chose `/stats`)
- [ ] HTTP Basic Auth middleware — password `regattA` (hardcoded for now, can move to env later)
  - Alternative: simple JWT cookie set via login page
- [ ] SQLite-backed storage:
  - `events` table (id, ts, evt, path, session_id, ua, ip_country, app_version, meta_json)
  - `feedback` table (id, ts, kind, category, message, expected, actual, contact, path, ua, ip_country, status)
- [ ] Ingest from existing `/api/log` and `/api/feedback` — write to SQLite in addition to stdout
- [ ] Dashboard widgets:
  - Users today / 7d / 30d
  - Sessions today + trend
  - Avg session duration
  - Top sections (by `section_open` / `page_view` counts)
  - Drop-off funnel: landing → start-here → lesson → race → finish
  - Completion rate per Bootcamp lesson
  - Geo split (country by IP lookup, coarse)
  - Device split (mobile/tablet/desktop from UA)
  - Browser + OS split
  - New vs Returning
- [ ] Charts: users over time, section popularity bar, funnel visualization, geo map
- [ ] Filters: today / 7d / 30d / custom; section filter; language filter
- [ ] Reports area: feedback + bugs list with statuses (new/in-progress/fixed/ignored), search, filter
- [ ] CSV export per table
- [ ] Session metadata logging to DB (first_seen, returning flag)

**Why full version now (user override):** faster to build right once than iteratively add charts later.

### 3.3. Analytics event schema
- [ ] `session_start` / `session_end` with duration
- [ ] `page_view` (already partial)
- [ ] `section_open` (курсы, rules, etc.)
- [ ] `lesson_start` / `lesson_complete`
- [ ] `scenario_start` / `scenario_complete` (rules cards)
- [ ] `race_start` / `race_finish` with difficulty + time
- [ ] `glossary_open` / `knot_open` / `rules_card_open`
- [ ] `feedback_submit` / `bug_report_submit`
- [ ] `quiz_answer` (when quizzes exist)

---

## Wave 4 — 3D anatomy + knots (user wants 3D direct)

### 4.1. 3D yacht anatomy — `/anatomy`
User override: 3D directly, not 2D first.
- [ ] Install `@google/model-viewer` (web component, ~60kb gzip)
- [ ] Find/create Bavaria 46 GLB model:
  - Option A: purchase from TurboSquid / CGTrader (~$30-80 for good model)
  - Option B: Sketchfab free model with proper license, credit
  - Option C: commission / generate low-poly (~1 day)
- [ ] Hotspots on key parts:
  - bow, stern, mast, boom
  - mainsail, jib, spinnaker pole (if rigged)
  - shrouds, forestay, backstay
  - mainsheet, jib sheets, halyards
  - winch, cleat, fairlead
  - rudder, keel
  - fender, mooring line
  - steering wheel (not tiller — Bavaria 46 has wheel)
  - chart plotter, helm seat
- [ ] Each hotspot click → slide-up panel with:
  - Name (RU + EN)
  - Short explanation
  - "Why it matters for you on board"
  - Link to related lesson/rule/glossary term
- [ ] Two presets: external view / cockpit view (cameraOrbit)
- [ ] Mobile: pinch-zoom, touch drag to rotate (model-viewer handles)
- [ ] Loading state with skeleton (3D assets are heavy)

### 4.2. 6 knots — `/knots`
- [ ] figure-eight stopper
- [ ] bowline
- [ ] cleat hitch
- [ ] clove hitch
- [ ] round turn + 2 half hitches
- [ ] sheet bend
- [ ] For each:
  - Where it's used (with Bavaria 46 context: "для привязки к утке на причале", etc.)
  - 4-6 step SVG animation (timeline-based, not full 3D — keep it fast)
  - Common mistake with illustration
- [ ] Mobile-first: swipe between steps, tap to pause

### 4.3. Pre-race checklist — `/checklist`
- [ ] Что взять с собой (одежда слоями, солнцезащита, перчатки)
- [ ] Что узнать у шкипера (роль, команды, emergency)
- [ ] Перед выходом на воду (head, lifejacket, brief)
- [ ] На старте (signals, countdown, position)
- [ ] Printable/saveable version

---

## Wave 5 — Depth + retention

### 5.1. Wind shifts + gusts in game (physics refactor)
- [ ] Wind direction changes ±5-15° every 30-60s (medium/hard only)
- [ ] Visual gust patches: darker water areas, local speed ±20% inside them
- [ ] Wind indicator animates on shift

### 5.2. Debrief / ghost replay
- [ ] Record player trajectory per race
- [ ] Calculate "optimal" path via simple algorithm (always lay line when upwind, broad reach downwind, minimal tacks)
- [ ] After finish: replay both trajectories side-by-side
- [ ] Highlight key divergence moments ("here you could've saved 8 sec")

### 5.3. VMG hint
- [ ] Show arrow "sail higher" / "sail lower" during upwind
- [ ] Based on TWA vs optimal close-hauled angle (35-45°)
- [ ] Subtle, dismissible

### 5.4. Quick refresh mode — 15 min fast path
- [ ] Condensed: wind → courses → tack → jibe → start → 5 scenarios
- [ ] Different route from full Bootcamp

### 5.5. Commands on board
- [ ] Integrated into `/onboard` section
- [ ] Audio optional: tap to hear RU version
- [ ] Practice mode: "I say X, what does crew do?"

---

## Wave 6 — Long-tail

### 6.1. Polar diagram in simulator
- [ ] Classic training tool: speed-vs-TWA curve at given wind strength
- [ ] Toggle overlay in `/simulator`

### 6.2. Lightweight assessment (quiz)
- [ ] After each bootcamp lesson: 1-2 questions
- [ ] Final verdict: "Готов к первой регате / Нужно повторить раздел X"
- [ ] **Test with 10 users before shipping** — risk of feeling patronizing

### 6.3. Instructor/skipper mode
- [ ] Open scenario in "presentation mode" — bigger visuals, simplified
- [ ] "Share this to crew" link copy

### 6.4. Charts depth in admin
- [ ] Retention cohorts
- [ ] Funnel dropoff specific per section
- [ ] A/B test infrastructure (for later)

---

## Explicitly deferred / not doing soon

| Item | Why | When to reconsider |
|---|---|---|
| Multiplayer | Backend + state sync + anti-cheat = wrong battle | When 500+ DAU and users explicitly ask |
| Capacitor iOS/Android app | PWA covers install use case | When web analytics show ≥5 installs/day via PWA and requests for native features (camera, offline) |
| Course editor | Low ROI until audience scale | When there's a community of 1000+ users |
| Self-hosted analytics (Plausible/Umami) | Our `/stats` covers needs | If admin becomes too slow or we need public-facing metrics |
| Video demos | Needs asset creation time | After visuals stabilize — don't re-record on every UI change |
| Full Racing Rules of Sailing text | Link out is fine | Never — not our differentiator |

---

## Shipping discipline

1. Each wave is a single branch / commit sequence
2. Build + TS strict + Playwright smoke before merge
3. Tag each wave: `v2.0`, `v3.0`, etc. (major = wave, minor = hotfix)
4. Live check on desktop + mobile viewports after deploy
5. Update this ROADMAP.md in same commit
6. PROBLEMS.md for bugs discovered during QA

---

## Current session → next action

**Immediate next-session action plan (for the follow-up iteration):**

1. **Fix 3 critical bugs first:**
   - B1: Mobile game steering
   - B2: Simulator text overlap
   - B3: /rules illustration angles

2. **Then Wave 2:**
   - Language toggle (RU/EN everywhere)
   - "Первая неделя на яхте" page
   - "Start Here" bootcamp route
   - Missions in game
   - Storage versioning

3. **Tag v2.0, deploy, verify**

**Everything else** (Wave 3+) follows in subsequent sessions.

### Time estimate (rough)
- Bug fixes: 2 hours
- Wave 2: 6-8 hours
- Wave 3 (with full admin): 10-12 hours
- Wave 4 (3D + knots): 8-10 hours
- Wave 5-6: 10-15 hours

**Total to full roadmap:** ~40-50 hours of focused work. Spread across 5-6 focused sessions.
