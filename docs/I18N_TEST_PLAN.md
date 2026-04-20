# i18n test plan - 2026-04-20

Goal: find Russian text still leaking into EN and PL locales across all
user-facing routes.

## Scope

**Routes to test (17):**
- `/`
- `/start`
- `/quick`
- `/onboard`
- `/courses`
- `/racing`
- `/rules`
- `/anatomy`
- `/checklist`
- `/glossary`
- `/simulator`
- `/simulator2`
- `/simulator-v3`
- `/game`
- `/multiplayer`
- `/leaderboard`
- `/gallery`

**Languages:**
- `en` - should show English
- `pl` - should show Polish (fallback to English where PL missing)
- `ru` - baseline, skipped in this test

**Excluded from "leak" counting:**
- RU sailing terminology kept by design on reference diagrams (e.g.
  /courses sector labels). These are like "Mount Fuji" - proper nouns
  of the domain.
- Boat model names ("Bavaria 46") - brand names.
- Any terminology explicitly documented as "stays RU" in
  docs/I18N_AUDIT.md.

## Methodology

### Automated scan (Playwright MCP)

For each (route, lang) combo:
1. Set `localStorage.regatta.lang.v1 = <lang>` via browser_evaluate
2. Navigate to the route
3. Wait for initial render
4. Run inline script that:
   - Finds all text nodes in `<body>`
   - Filters for sequences matching `/[а-яА-ЯёЁ]{3,}/`
     (3+ consecutive Cyrillic chars = likely a word)
   - Collapses whitespace, dedupes
   - Returns up to 20 samples per route

### Severity classification

- **BLOCKER**: More than 5 distinct Russian phrases on one page in
  non-RU locale. User will obviously notice.
- **MEDIUM**: 1-5 phrases. Fixable in one commit.
- **MINOR**: Single occurrence (likely a forgotten string literal).
- **EXEMPT**: Matches excluded categories (reference diagram labels,
  brand names).

## Execution log

See the bottom of this file for scan results per (route, lang).
Fixes are committed separately with references back to these findings.

## Known going-in state (per previous audit)

From `docs/I18N_AUDIT.md` and my own audit this session:

- `/simulator` V1 info-panel: trilingual ✓ (2026-04-20)
- `/simulator-v3` UI: trilingual ✓
- `/simulator2` V2: trilingual ✓
- `/courses` diagram labels: trilingual ✓ (2026-04-20)
- `/racing` strategies + rules + concepts: trilingual ✓ (2026-04-20)
- `/glossary` 51 terms: trilingual ✓ (2026-04-20)
- `/anatomy` 17 hotspots: trilingual ✓ (2026-04-20)
- `/rules` 13 scenarios + 8 COLREGS: trilingual ✓ (2026-04-20)
- `/gallery`: UI chrome trilingual ✓
- `/`: trilingual (said in FEATURES.md, needs verification)
- `/multiplayer`: lobby UI RU-only, flagged earlier
- `/leaderboard`: UI chrome trilingual (filter labels, table headers)
- `/checklist`: header trilingual, section bodies RU-only
- `/onboard`: flagged in I18N_AUDIT - bodies RU-only
- `/start` (8-lesson bootcamp): RU-only, flagged
- `/quick`: flagged, RU-only likely

Expected "known leaks" to fix: checklist bodies, onboard bodies,
bootcamp, quick, multiplayer lobby UI.

Unexpected leaks = my real work here.
