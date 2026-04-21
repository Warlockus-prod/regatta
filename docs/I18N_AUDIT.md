# i18n audit - RU/EN/PL status across the app

**Date:** 2026-04-20 (post-full-sweep).
**Stack:** `useI18n()` hook with `tp(ru, en, pl)` (3-arg, preferred) and
legacy `t(ru, en)` (2-arg, PL falls back to EN - being phased out).

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

## Contributing PL translations

For new components:
1. Destructure `tp` (not `t`): `const { tp } = useI18n();`
2. Use the 3-arg form: `{tp('Русский', 'English', 'Polski')}`
3. Per project rule: no Polish diacritics (no ą/ę/ż/ł) - they're stripped
   for consistency with the em-dash / en-dash typography rule.

For data files (`src/data/*.ts`):
1. Add `titlePl`, `introPl`, `itemsPl`, etc. next to existing `*Ru`/`*En` pairs.
2. Consuming component picks with
   `lang === 'pl' ? x.namePl : lang === 'en' ? x.nameEn : x.nameRu`.
3. Run `npx tsc --noEmit` to ensure the interface update propagated.
4. Keep strings terminology-accurate (see `docs/SAILING_TERMINOLOGY.md`
   if it exists, or cross-check against World Sailing / USCG / PZŻ /
   ВФПС sources for PL / EN / RU respectively).
