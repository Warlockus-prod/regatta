# Sprint 2, Dev-2 status: mobile /checklist

Scope: port web `/checklist` to mobile as a tickable, persisted checklist
screen. Owner of `mobile/app/checklist/*`, `mobile/src/data/checklist.json`,
and the hook in `mobile/src/persistence/checklist.ts`.

## Files created

- `mobile/app/checklist/index.tsx` (273 lines) - checkable screen with
  per-section progress, top progress bar, reset confirm.
- `mobile/src/data/checklist.json` - 8 sections, 81 items, 7-language
  titles + intros + warnings. Item arrays exist in RU / EN / PL only
  (matches web shape, ES/FR/DE/IT items fall back to EN via
  `legacyPickArray`).
- `mobile/src/persistence/checklist.ts` - `useChecklistProgress()` hook
  modeled on the existing `useBootcampProgress()`. Exposes `toggle`,
  `isChecked`, `reset`, plus a stable `itemKey(sectionId, index)` helper.

## Files modified

- `mobile/src/data/types.ts` - added `ChecklistSection` type. Same flat
  locale shape as `OnboardSection` plus optional `intro<Lang>` strings.
- `mobile/src/data/index.ts` - exported `checklistSections` and the
  type, wired `checklist.json` into the typed barrel.

## Content sourcing

- Web has NO `src/data/checklist.ts`; the canonical content lives inline
  in `src/app/checklist/page.tsx` (566 lines, 8 sections, 7 languages).
- I extracted the `SECTIONS` literal once with a Python AST-style walker
  (string-aware bracket matcher + key-quoting + single-to-double-quote
  conversion) and wrote `mobile/src/data/checklist.json`.
- I did NOT extend `mobile/scripts/sync-content.ts` to import from
  `src/app/checklist/page.tsx`. Reasons:
  1. `sync-content.ts` only imports from web `src/data/*.ts` (pure data
     modules). Pulling from a TSX page would require `--jsx` runtime
     handling and resolving a `'use client'` directive.
  2. The Shared lane is the right place to extract the page's literal
     into `src/data/checklist.ts` first. Once that exists, sync-content
     becomes a one-line addition.
  3. Until then the mobile JSON is hand-authored from a one-shot extract
     and CI's `sync-content:check` does NOT cover this file (it only
     checks bundles that the script writes).

  Follow-up: when web `src/data/checklist.ts` lands in the Shared lane,
  add `checklistSections` to the bundles array in
  `mobile/scripts/sync-content.ts` and re-run sync.

## Persistence shape

```
key   = regatta.checklist.v1
value = JSON-encoded string[] of item ids, where
        itemId = `${sectionId}:${itemIndex}`     e.g. "first-10-min:3"
```

- Composite IDs survive content edits as long as section `id` and item
  ordering inside that section don't change. If the web source reorders
  items inside a section, the mobile state for that section will silently
  drift; v2 should switch to content-hash IDs (e.g. first 8 chars of a
  stable hash of the EN item text). That's a non-blocking polish.
- Reset clears the in-memory set AND writes the empty set back to
  storage; behind a confirm Alert in 7 langs (RU / EN / PL / ES / FR /
  DE / IT) per the spec.

## Visual / interaction notes

- Top of screen: caption intro -> "X of N ready" subtitle -> 4 px
  rounded progress bar. Track is `colors.borderCyanFaint`, fill switches
  to `colors.success` at >= 80% completion, otherwise `colors.accentCyan`.
- Sections render as `Card`s with the section icon, localized title,
  per-section "X of N" caption, optional intro paragraph, then the rows.
- Each row is a 22 px circular checkbox + item text. Empty state: cyan
  ring on transparent. Checked state: filled cyan with a dark
  bgPrimary-color check mark. Done items get `textSecondary` color and
  strike-through to make scan-progress obvious.
- Pressed background tints to `surfaceCyanFaint` so the touch target
  reads clearly even on very long item lists.
- Warning banner reuses the same red-tinted style as web (`danger`
  10%/30% bg/border) for the two sections with `warning*` fields
  (`parts` and `docking`).
- Reset is a `Button variant="ghost"` at the bottom, behind a destructive
  Alert.

## i18n coverage

All chrome strings (header, intro, totals, per-section caption, warning
label, reset, confirm dialog) use `tp(ru, en, pl, { es, fr, de, it })`,
so the screen renders cleanly in all 7 enabled languages.

Content rows use the existing `legacyPick` / `legacyPickArray` helpers
that fall back EN -> RU when an optional translation is missing. Web's
`first-10-min` section omits `titleIt`; falls back to EN as expected.
Item arrays are RU / EN / PL only (matches web). ES / FR / DE / IT
content rows use the EN fallback - this is consistent with the web
behavior and the existing `onboardSections` rendering on mobile.

## Verification

- `npx tsc --noEmit`: clean (exit 0).
- `npm test -- --silent`: 20 suites / 103 tests / all green
  (no checklist tests added; QA lane owns that).
- Em-dash / en-dash scan over the new JSON: 0 leaks.
- Polish diacritic scan over `*Pl` fields: 0 leaks.

## Follow-ups

For Dev-1 (Home tile, separate commit):
- Add a Home entry tile linking to `/checklist`. Suggested order: place
  it next to the existing pre-regatta entries (between "On board" and
  "Bootcamp"). Title `tp('Чек-лист', 'Checklist', 'Lista', ...)`. The
  warning-amber accent (`accent="warning"`) reads well for a "before
  you sail" entry; the cyan accent is fine too.

For QA (sprint 3 or current):
- Snapshot or render test for `app/checklist/index.tsx` covering: zero
  ticked / partial / >= 80% / 100%, language switch (verify
  `legacyPickArray` fallback for IT items), Alert flow on Reset
  (mock `Alert.alert`), and that `useChecklistProgress` is hydrated
  before progress numbers settle.
- Persistence test for `useChecklistProgress` mirroring
  `__tests__/bootcamp-progress.test.ts` (`toggle` add / remove,
  `reset` empties storage, hydration tolerates corrupted JSON in
  AsyncStorage).

For Shared lane:
- Extract the inline `SECTIONS` literal from `src/app/checklist/page.tsx`
  into a new `src/data/checklist.ts`. Once that lands, wire the import
  into `mobile/scripts/sync-content.ts` so `sync-content:check` covers
  this bundle and prevents drift.
