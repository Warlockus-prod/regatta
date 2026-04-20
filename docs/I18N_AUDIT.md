# i18n audit - what's RU/EN/PL status across the app

**Date:** 2026-04-20
**Stack:** `useI18n()` hook with `t(ru, en)` and `tp(ru, en, pl)` helpers.
  `t()` is the legacy 2-arg form; PL falls back to EN there.

---

## Language toggle (RU / EN / PL)

- `src/components/LanguageToggle.tsx` - shows all 3. Works.
- Default language: browser detect, falls to RU if no match.
- Persisted in localStorage `regatta.lang.v1`.

---

## Full PL coverage (no gap)

These routes / components use `tp()` for ALL strings and have PL strings
where content exists:

- `src/components/Navigation.tsx` (primary + grouped nav items, labels)
- `src/components/FeedbackWidget.tsx` (AI chat + feedback form UI)
- `src/components/OnboardingTour.tsx` (wait - RU only, skip PL review)
- `src/components/HelpOverlay.tsx` (if present)
- `src/app/layout.tsx`
- `src/app/page.tsx` (homepage cards - most labels; 1 string still on t())
- `src/app/simulator2/page.tsx` (V2 eSail)
- `src/app/simulator-v3/page.tsx` (V3 cockpit)
- `src/app/rules/page.tsx` (scenario cards have 3 langs)

---

## Partial PL (UI shell on PL, content on EN fallback)

These routes have UI labels translated but CONTENT arrays in `src/data/*.ts`
only carry RU + EN fields. When user is on PL, content renders in EN.

- `/start` - bootcamp lessons. `src/data/bootcamp.ts` has 82 Ru/En field
  pairs; no Pl fields. UI header uses `t()` (2-lang legacy).
- `/onboard` - first week sections. `src/data/onboard.ts` has 44 Ru/En
  field pairs; no Pl.
- `/anatomy` - yacht parts. `src/data/anatomy.ts` has 108 Ru/En field
  pairs (17 parts x ~6 fields); no Pl.
- `/checklist` - NEW section content. The SECTIONS array in page.tsx
  currently carries RU/EN only. Header/outer UI strings ARE fully
  PL-ready (2026-04-20 pass). Section bodies still render EN on PL.
- `/quick` - 4 t() calls, fall to EN
- `/glossary` - term definitions. `src/data/sailing-data.ts` likely RU/EN
  only for glossaryTerms.
- `/game` - 11 t() calls. Game HUD shows RU or EN only on PL.
- `/simulator` (V1 canvas) - current original labels are hard-coded RU/EN
  in JSX (not even t() calls). PL users see RU labels. Needs full pass.

---

## How to close the remaining gaps (est. effort)

Priority order (highest value first):

1. **`/simulator` V1** - visible UI. ~15 label sites. 30 min.
2. **`/checklist` SECTIONS array** - 8 sections x ~30 strings. Mostly
   short. 2-3 hours with care.
3. **`src/data/onboard.ts`** - 44 field pairs. 2 hours.
4. **`src/data/bootcamp.ts`** - 82 fields. 3 hours.
5. **`src/data/anatomy.ts`** - 108 fields (17 parts x 6 fields). 3 hours.
6. **`src/app/game/GameClient.tsx`** - 11 t() sites. 1 hour.
7. **`src/app/start/page.tsx`** - 19 t() sites. 1 hour.
8. **`src/app/quick/page.tsx`** - 4 t() sites. 20 min.
9. **`src/data/sailing-data.ts`** - pointsOfSail descriptions, glossary
   terms. ~50 fields. 2 hours.

Total ~14 hours of focused translation + review work to get to 100% PL
coverage.

---

## Recommendation

Current user is Russian-first with EN as solid fallback. PL support is
"good enough" for UI chrome (navigation, buttons, key page headers) but
long-form content (lessons, anatomy descriptions, glossary) stays in EN
for PL users. That's an honest middle ground given translation cost.

When a Polish-speaking user shows up and reports confusion, we should
prioritize the data files they hit first:
- First stop usually: `/`, `/onboard`, `/simulator`
- Second: `/rules`, `/game`

Translating `onboard.ts` + `bootcamp.ts` + polishing the 2 simulator
routes would put PL at ~90% coverage for the learning path.

---

## How to contribute Polish translations

1. Open the target file (e.g. `src/data/onboard.ts`).
2. Add `titlePl`, `introPl`, `itemsPl`, `warningPl` fields next to the
   existing `titleRu`/`titleEn` pairs.
3. Update the consuming component to read `*Pl` when `lang === 'pl'`.
4. Verify build passes + em-dash sweep clean.
5. Ship.

Short form quick convert of a component:
- Find `t('...', '...')` - replace with `tp('...', '...', 'Polish text')`
- Make sure useI18n() destructures `tp`.
