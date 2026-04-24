# i18n audit - 7-language status across the app

**Date:** 2026-04-24 (post-ES/FR/DE/IT rollout).
**Stack:** `useI18n()` hook with three call-site helpers:
- `tl({ ru, en, pl, es, fr, de, it })` - object-based, extensible; preferred for new code.
  Type: `LocalizedText` from `src/lib/languages.ts`. Missing langs fall back
  to `en`, then `ru`, then the first provided value.
- `tp(ru, en, pl)` - hardcoded 3-arg, legacy. ~500 existing call sites
  across ~35 files. For ES/FR/DE/IT visitors `tp` returns `en` (widened
  fallback in `src/lib/i18n.tsx`), so all routes render in English when
  PL/DE/etc isn't explicit. Migration script in
  `scripts/migrate-tp-to-tl.mjs`.
- `t(ru, en)` - legacy 2-arg (PL/ES/FR/DE/IT fall back to EN). Retired
  2026-04-20; kept in the interface for type back-compat only.

Language catalog lives in `src/lib/languages.ts`. Each entry has an
`enabled: boolean` flag; `Lang` type derives from `enabled: true` entries.
All 7 langs (`ru / en / pl / es / fr / de / it`) are currently enabled.

---

## Language detection

- Server: `proxy.ts` edge middleware reads `Accept-Language` on first
  request, writes `regatta_lang` cookie (1 year, sameSite=lax).
- `layout.tsx` reads the cookie server-side, passes `initialLang` to
  `I18nProvider` and sets `<html lang={serverLang}>`. No first-paint flash.
- Client: `localStorage.regatta.lang.v1` overrides on user-driven toggle
  and mirrors back to the cookie so subsequent navigations stay in sync.
- Fallback order: `?lang=xx` URL param -> `localStorage` -> `regatta_lang`
  cookie -> `Accept-Language` -> `ru`.
- Share-link shortcuts: `/pl`, `/en`, `/ru`, `/es`, `/fr`, `/de`, `/it`
  each pin the cookie and 302 back to `/`.
- Toggle UI: `LanguageToggle.tsx` shows all 7 langs in the nav dropdown.

---

## Data-file i18n shape

Data-file rows follow the **flat-suffix "legacy" shape**:
`fooRu / fooEn / fooPl` are required; `fooEs / fooFr / fooDe / fooIt`
are optional. The `LegacyLocalized<'foo'>` utility in
`src/lib/languages.ts` wraps this in a reusable type. `legacyPick(obj,
'foo', lang)` returns the per-lang value with EN -> RU fallback.

Files already on this shape:
- `src/data/sailing-data.ts` (pointsOfSail, tacks, maneuvers,
  glossaryTerms, racingStrategies, racingRules - all fields incl.
  `description / sailWork / definition` are `*Ru / *En / *Pl / *Es /
  *Fr / *De / *It`).
- `src/data/bootcamp.ts`, `src/data/onboard.ts`, `src/data/anatomy.ts`,
  `src/data/gallery.ts`, `src/data/missions.ts`, `src/data/checklist.ts`,
  `src/data/rules.ts`.

The `tl()`-style object shape is still fine for new data and is the
long-term preference (see `scripts/I18N_MIGRATION.md` for the incremental
plan). Both shapes render identically in consumer components.

---

## Full 7-lang coverage (RU + EN + PL + ES + FR + DE + IT)

**Components (site chrome):**
- `src/components/Navigation.tsx`
- `src/components/FeedbackWidget.tsx` (AI chat + feedback form UI)
- `src/components/OnboardingTour.tsx` (universal fallback chain; lang
  pick: RU -> ru arg, PL -> pl arg, everything else -> en arg)
- `src/components/HelpOverlay.tsx`
- `src/components/LanguageToggle.tsx` + `LanguageNagBanner.tsx`
- `src/components/BootcampFooterNav.tsx` (RU/EN/PL labels plus `tp`
  fallback for new langs)
- `src/app/layout.tsx` + `generateMetadata()` - 7-lang titles,
  descriptions, OpenGraph locales per request.

**Routes (all 7 langs clean, 0 Cyrillic leaks on ES/FR/DE/IT - see scan
below):**
- `/` (home)
- `/start` (bootcamp hub - all 8 lessons translated in
  `src/data/bootcamp.ts`)
- `/quick` (quick refresh - all 6 topics translated)
- `/courses` (points of sail - data + UI)
- `/racing` (tactics + course diagram + RacingStrategy tips +
  keyConcepts)
- `/onboard` (first week on board - all 8 sections in
  `src/data/onboard.ts`)
- `/anatomy` (Bavaria 46 parts)
- `/checklist` (crew reference - all 8 sections)
- `/glossary` (all 52 glossary definitions + terms)
- `/rules` (RRS + COLREGS scenarios; per-language official links: RFEV
  for ES, FFVoile for FR, DSV for DE, Federvela for IT, plus IMO
  COLREGS and World Sailing RRS for everyone)
- `/simulator2` (V2 eSail)
- `/game` (race HUD, briefing, finish modal, AI coach labels, replay,
  share)
- `/multiplayer` (lobby + race)
- `/leaderboard`
- `/gallery`

**APIs:**
- `/api/coach` accepts `lang` param ('ru' | 'en' | 'pl' | 'es' | 'fr'
  | 'de' | 'it'). All seven have native system prompts (since
  2026-04-25, commit landing alongside this doc update). AI output
  language matches the request directly.
- `src/lib/fallback-coach.ts` (local race analysis): CoachLang widened
  to all 7, pick() falls back to `en` for the new langs.

---

## Current no-Cyrillic verification (2026-04-25)

Local Playwright scan via `node scripts/cyrillic-scan.mjs` against
`npm run dev -- --port 3007` (and prod re-confirmed via
`SCAN_BASE=https://regatta.icoffio.com node scripts/cyrillic-scan.mjs`):

```
Cyrillic leak scan (ES/FR/DE/IT across 16 routes):

ALL CLEAN - 0 leaks across all routes and target langs.
```

- 16 of 16 routes: **0 leaks** for each of ES / FR / DE / IT.
- `/simulator-v3` translated as a one-off coordination from the V3
  lane on 2026-04-25 (TourOverlay + point-of-sail label via
  `legacyPick`); physics frozen, only i18n strings touched.

Routes scanned: `/`, `/start`, `/onboard`, `/checklist`, `/courses`,
`/racing`, `/glossary`, `/rules`, `/anatomy`, `/gallery`, `/simulator`,
`/simulator-v3`, `/simulator2`, `/leaderboard`, `/game`, `/multiplayer`.

V1 `/simulator` passes the scan because the 2 field reads it does against
`sailing-data.ts` now go through `legacyPick`, which fetches the right
lang and falls back to EN for ES/FR/DE/IT.

---

## Known gaps (intentional)

- `/simulator` (V1): primary simulator. HUD chrome in `tp(ru, en, pl)`
  style falls back to EN for ES/FR/DE/IT visitors. Scan confirms no RU
  leaks. Physics/UX frozen otherwise.
- `/stats` admin dashboard: RU-only by design - internal tool, not for
  end users.

---

## Contributing translations (any lang)

For new components - prefer `tl()`:
1. Destructure `tl` from the hook: `const { tl } = useI18n();`
2. Use object-based form:
   `{tl({ ru: 'Привет', en: 'Hi', pl: 'Czesc', es: 'Hola', fr: 'Salut', de: 'Hallo', it: 'Ciao' })}`
3. Optional langs (`es/fr/de/it`) fall back to `en` -> `ru` if missing.
4. Per project rule: no Polish diacritics (no ą/ę/ż/ł/etc), no em-dash
   or en-dash in any lang.

Existing `tp(ru, en, pl)` call sites stay functional and render EN for
ES/FR/DE/IT. Batch-migrate via `node scripts/migrate-tp-to-tl.mjs` (see
`scripts/I18N_MIGRATION.md`).

For data files (`src/data/*.ts`) in the LegacyLocalized shape:
1. Required fields: `fooRu / fooEn / fooPl` plus optional
   `fooEs / fooFr / fooDe / fooIt`.
2. Consumer picks with `legacyPick(obj, 'foo', lang)`.
3. Bulk-translate a data file into new target langs:

```
ANTHROPIC_API_KEY=sk-... node scripts/translate-data-flat.mjs \
    --file src/data/sailing-data.ts --lang es,fr,de,it
```

- Uses `scripts/sailing-glossary.md` in the system prompt so MT doesn't
  mangle sailing jargon.
- Single-line object rows (glossary, etc) are detected - new-lang
  fields are grafted inside the `{}` instead of after it.
- Never overwrites an existing target-lang value. Idempotent.
- Dry run: append `--dry` to see scope without API calls.

After a translation run:

```
npx tsc --noEmit
npm run build
npm run dev -- --port 3007 &
node scripts/cyrillic-scan.mjs
```

Expect 0 leaks on content routes. V3 TourOverlay leaks are expected
until the V3 lane translates that component.
