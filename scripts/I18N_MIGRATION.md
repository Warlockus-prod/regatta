# i18n migration playbook

Tools and procedure for moving from the 3-language hardcoded `tp(ru, en, pl)`
API to an extensible N-language setup, and for bulk-translating data files
into new languages via Claude API.

Status after this plan: RU / EN / PL still primary, infrastructure ready to
add ES / FR / DE / IT without touching call sites.

## TL;DR order of operations

```
1. node scripts/migrate-tp-to-tl.mjs --all          # tp() -> tl({...})
2. grep -rl "useI18n" src | xargs sed ...           # tp -> tl destructure (see step 1 output)
3. node scripts/migrate-data-fields.mjs --all       # data files to LocalizedText
4. Update TS interfaces in src/data/*.ts            # manual, per-file
5. Update consuming components                      # replace .titlePl access with tl(.title)
6. ANTHROPIC_API_KEY=... node scripts/translate-data.mjs --file src/data/missions.ts --lang es,fr,de,it
7. Flip language in src/lib/languages.ts            # enabled: false -> true
```

Do these ONE LANG AT A TIME per data file. Do not translate all 7 files for
all 4 langs in one shot - you will not be able to review the output
meaningfully.

## Step 1: `tp(ru, en, pl)` -> `tl({ ru, en, pl })`

**Why.** The 3-arg signature blocks adding IT/ES/FR/DE without editing
every call site. `tl()` takes an object so new langs are additive.

**What it does.**

```tsx
tp('Привет', 'Hi', 'Czesc')
// becomes
tl({ ru: 'Привет', en: 'Hi', pl: 'Czesc' })
```

**How.**

```bash
# Preview (no file changes):
node scripts/migrate-tp-to-tl.mjs --dry --all

# Apply:
node scripts/migrate-tp-to-tl.mjs --all

# Or per-file:
node scripts/migrate-tp-to-tl.mjs src/app/rules/page.tsx
```

**Status as of 2026-04-24:** 524 call sites in 35 files found by the
codemod's dry run. ~15 sites use dynamic args (e.g. `tp(a, b, c)` with
variables) - those are flagged in the output and need manual conversion.

**After running.** The files now call `tl(...)` but still destructure `tp`
from `useI18n()`. Update each file's hook call:

```tsx
const { tp } = useI18n();   // before
const { tl } = useI18n();   // after, or keep both during transition
```

The codemod does NOT do this automatically because some files have both
legacy `tp()` in one spot and dynamic-arg `tp()` in another that needs
manual handling.

**Verification.**

```bash
npx tsc --noEmit
npm run build
npm run test:physics     # should stay 16/16
```

## Step 2: Data files `{fooRu, fooEn, fooPl}` -> `{foo: LocalizedText}`

**Why.** Same reason: each field trio blocks adding `fooIt/fooEs/fooFr/fooDe`
without editing every row.

**What it does.**

```ts
{ id: 'x', titleRu: 'Грот', titleEn: 'Mainsail', titlePl: 'Grot', ... }
// becomes
{ id: 'x', title: { ru: 'Грот', en: 'Mainsail', pl: 'Grot' }, ... }
```

**How.**

```bash
node scripts/migrate-data-fields.mjs --dry --all
node scripts/migrate-data-fields.mjs src/data/missions.ts     # one file at a time recommended
```

**Status as of 2026-04-24:** 267 field trios detected across 7 data files.

**What the codemod DOES NOT do:**

- TS interfaces. Each data file declares interfaces like `interface Mission`.
  You need to change `titleRu: string; titleEn: string; titlePl: string;` to
  `title: LocalizedText;` by hand.
- Array-valued fields (`itemsRu: string[]`). The codemod inserts a TODO
  comment above them. You convert manually: `itemsRu/itemsEn/itemsPl` ->
  `items: { ru: string[], en: string[], pl: string[] }`.
- Consumer sites. The places that read `.titleRu` / `.titleEn` / `.titlePl`
  still exist. Change them to `pickLocalized(lang, x.title)` or `tl(x.title)`
  using the hook.

**Recommended sequence.** Do 1 data file end-to-end:

1. `node scripts/migrate-data-fields.mjs src/data/missions.ts`
2. Open `missions.ts`, update the `Mission` interface.
3. Update consumers that read mission fields (grep for `titleRu` references).
4. `npx tsc --noEmit` (tsc will flag the missed consumers).
5. `npm run build`.
6. Playwright scan to verify nothing broke.
7. Repeat for next file.

Smallest first: `gallery.ts` (1) -> `missions.ts` (12) -> `onboard.ts` (12)
-> `sailing-data.ts` (29) -> `bootcamp.ts` (36) -> `anatomy.ts` (51) ->
`rules.ts` (126).

## Step 3: Translate to a new language via Claude API

**Prerequisite.** Data file must be in the new `LocalizedText` shape from
step 2 above.

**How.**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=claude-haiku-4-5   # or claude-sonnet-4-5 for best quality

# Plan only - no API calls, no file changes:
node scripts/translate-data.mjs --file src/data/missions.ts --lang es --dry

# Run the translation:
node scripts/translate-data.mjs --file src/data/missions.ts --lang es
```

**Multiple target langs at once:**

```bash
node scripts/translate-data.mjs --file src/data/missions.ts --lang es,fr,de,it
```

**What it does.** For every `LocalizedText` object in the file where the
target lang key is missing, calls Claude with the sailing-glossary system
prompt and the RU source text. Writes the result back into the same object,
preserving quote style and field order (catalog order: ru, en, pl, es, fr,
de, it).

**System prompt.** Uses `scripts/sailing-glossary.md` as context. The
glossary is the normative terminology reference: Claude uses the listed
target-language terms instead of generic dictionary translations. No
em-dash, no Polish diacritics, proper nouns preserved.

**Cost and time.** Haiku 4.5 list price ~$0.80 per 1M input+output tokens.
Typical data file field is 10-200 chars RU. One lang per file:

| File | Fields | Est cost (Haiku 4.5) | Est time |
|---|---|---|---|
| gallery | 1 | <$0.01 | <10s |
| missions | 12 | ~$0.01 | ~30s |
| onboard | 12 | ~$0.01 | ~30s |
| sailing-data | 29 | ~$0.03 | ~1 min |
| bootcamp | 36 | ~$0.04 | ~1.5 min |
| anatomy | 51 | ~$0.06 | ~2 min |
| rules | 126 | ~$0.15 | ~4 min |
| **all 7 files, 1 lang** | **267** | **~$0.30** | **~10 min** |
| **all 7 files, 4 new langs** | **1068** | **~$1.20** | **~40 min** |

Plus review time.

**After running.** You have a migrated data file with new-lang values
injected. Verify:

```bash
npx tsc --noEmit
npm run build
# Eye-check a few strings as a native speaker
# Playwright scan with lang=es cookie for cyrillic / broken text
```

Then flip `enabled: true` for the new lang in `src/lib/languages.ts`.

## Step 4: `tp()` call-site conversion (ongoing, not required for new lang)

Strings that are still in `tp('ru', 'en', 'pl')` form will auto-fallback to
`en` for any lang outside RU/EN/PL. That's acceptable for a soft rollout of
IT/ES/FR/DE - UI chrome can stay on `tp()` while content migrates to `tl()`
first.

Long-term plan: flip every `tp()` to `tl()` (step 1 covers this) and then
remove the `tp` property from `I18nContextValue`. Don't rush it - the
fallback is working correctly.

## Appendix: Sailing glossary (`scripts/sailing-glossary.md`)

This file is the source of truth for translated terminology. Entries are
authoritative. If Claude gives a bad translation, fix the glossary first
(add the correct term + source), then re-run the translation script - it
will use the updated glossary in the system prompt.

Updating the glossary is CHEAP (one markdown edit, re-run) and is the
correct place to put translator guidance. Don't prompt-inject corrections
in the script itself.
