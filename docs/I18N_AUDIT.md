# i18n audit - RU/EN/PL status across the app

**Date:** 2026-04-24 (post-prep-infra).
**Stack:** `useI18n()` hook with three call-site helpers:
- `tl({ ru, en, pl, ... })` - object-based, extensible; preferred for new code.
  Type: `LocalizedText` from `src/lib/languages.ts`. Missing langs fall back
  to `en`, then `ru`, then the first provided value.
- `tp(ru, en, pl)` - hardcoded 3-arg, legacy. 524 existing call sites across
  35 files. Migration script in `scripts/migrate-tp-to-tl.mjs`.
- `t(ru, en)` - legacy 2-arg (PL falls back to EN). Fully retired as of
  2026-04-20; kept in the interface for type back-compat only. No call
  sites remain.

Language catalog lives in `src/lib/languages.ts`. Each entry has an
`enabled: boolean` flag; `Lang` type derives from `enabled: true` entries.
Flipping a new lang requires (1) translations in data + call sites, (2)
`enabled: true`. No other code changes.

Today active: RU / EN / PL. Declared but disabled: ES / FR / DE / IT.

---

## Language detection

- Server: `proxy.ts` edge middleware reads `Accept-Language` on first
  request, writes `regatta_lang` cookie (1 year, sameSite=lax).
- `layout.tsx` reads the cookie server-side, passes `initialLang` to
  `I18nProvider` and sets `<html lang={serverLang}>`. No first-paint flash.
- Client: `localStorage.regatta.lang.v1` overrides on user-driven toggle
  and mirrors back to the cookie so subsequent navigations stay in sync.
- Fallback order: `localStorage` -> `regatta_lang` cookie -> `Accept-Language`
  -> `ru`.
- Toggle UI: `LanguageToggle.tsx` shows all 3 in the nav.

---

## Full 3-lang coverage (RU + EN + PL)

These components/routes use `tp()` throughout and have full Polish strings.

**Components (site chrome):**
- `src/components/Navigation.tsx`
- `src/components/FeedbackWidget.tsx` (AI chat + feedback form UI)
- `src/components/OnboardingTour.tsx` *(after 2026-04-20 sweep; was RU-only)*
- `src/components/HelpOverlay.tsx`
- `src/components/GoogleAnalytics.tsx` (no strings)
- `src/app/layout.tsx` + `generateMetadata()` (title / description / OG per lang)

**Routes:**
- `/` (home)
- `/start` (bootcamp hub - all 8 lessons PL-complete in `src/data/bootcamp.ts`)
- `/quick` (quick refresh - all 6 topics PL-complete)
- `/courses` (points of sail - data + UI)
- `/racing` (tactics + course diagram)
- `/onboard` (first week on board - all 8 sections PL in `src/data/onboard.ts`)
- `/anatomy` (Bavaria 46 parts - PL via `src/data/anatomy.ts`)
- `/checklist` (crew reference - all 8 sections PL as of 2026-04-20)
- `/glossary` (PL definitions via `src/data/sailing-data.ts`)
- `/rules` (RRS + COLREGS scenarios; language-specific PDF links per lang)
- `/simulator-v3` (V3 cockpit)
- `/simulator2` (V2 eSail)
- `/game` (race HUD, briefing, finish modal, AI coach labels, replay, share)
- `/multiplayer` (lobby + race)
- `/leaderboard`
- `/gallery`

**APIs:**
- `/api/coach` accepts `lang` param, has 3 system prompts (RU/EN/PL).
- `src/lib/fallback-coach.ts` (local race analysis) outputs in 3 langs.

---

## Known gaps (intentional)

- `/simulator` (V1): still being maintained as the primary simulator entry
  point. V3 runs in parallel behind `/simulator-v3`. UI strings in V1 are
  in RU+EN, PL falls back to EN. Will be fully translated when V3 promotion
  happens.
- `/stats` admin dashboard: RU-only by design - internal tool, not for
  end users.
- OpenGraph description in RU-centric meta: `generateMetadata()` now
  returns the correct language per request, but `alternates.languages`
  listing is still canonical-origin based.
- Coach API prompt content (AI-generated mistakes / explanations): the
  CONTENT is in the requested language thanks to the per-lang system
  prompt, but the JSON FIELD NAMES are still `titleRu / explanationRu /
  fixRu / nextGoalRu` for client back-compat. The strings inside are
  always in the requested language.

---

## Current no-Cyrillic verification (as of 2026-04-20)

Post-hydration scan via Playwright `document.body.innerText.match(/[а-яА-ЯёЁ]{3,}/g)`:

- EN: 14/14 routes = 0 Cyrillic leaks.
- PL: 14/14 routes = 0 Cyrillic leaks.

Routes scanned: `/`, `/start`, `/quick`, `/courses`, `/racing`, `/onboard`,
`/anatomy`, `/checklist`, `/glossary`, `/rules`, `/game`, `/multiplayer`,
`/leaderboard`, `/gallery`.

V1-specific canvas rendering in `/simulator` not scanned (V1 carries RU
strings as documented above).

---

## Contributing translations (PL or future langs)

For new components - prefer `tl()`:
1. Destructure `tl` from the hook: `const { tl } = useI18n();`
2. Use object-based form: `{tl({ ru: 'Привет', en: 'Hi', pl: 'Czesc' })}`
3. Adding a new lang later = add that key to the object (or leave it out
   and let the fallback chain en -> ru kick in).
4. Per project rule: no Polish diacritics (no ą/ę/ż/ł/etc) - they're
   stripped for consistency with the em-dash / en-dash typography rule.

Existing `tp(ru, en, pl)` call sites stay functional and render correctly.
Batch-migrate to `tl()` via `node scripts/migrate-tp-to-tl.mjs` (see
`scripts/I18N_MIGRATION.md`).

For data files (`src/data/*.ts`) - prefer `LocalizedText`:
1. New fields use `title: { ru, en, pl }` shape (`LocalizedText` type).
2. Consuming component picks with `pickLocalized(lang, x.title)` or the
   hook-local `tl(x.title)`.
3. Existing `titleRu/titleEn/titlePl` trios still work; migrate them via
   `node scripts/migrate-data-fields.mjs` (267 trios detected as of
   2026-04-24).

Bulk-translating a data file into a new target language:
`ANTHROPIC_API_KEY=sk-... node scripts/translate-data.mjs --file <path> --lang es,fr,de,it`
- Uses `scripts/sailing-glossary.md` in the system prompt so MT doesn't
  mangle sailing jargon.
- Never overwrites an existing target-lang value.
- See `scripts/I18N_MIGRATION.md` for full procedure + cost estimates.
3. Run `npx tsc --noEmit` to ensure the interface update propagated.
4. Keep strings terminology-accurate (see `docs/SAILING_TERMINOLOGY.md`
   if it exists, or cross-check against World Sailing / USCG / PZŻ /
   ВФПС sources for PL / EN / RU respectively).
