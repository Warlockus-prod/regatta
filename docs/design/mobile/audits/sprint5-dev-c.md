# Sprint 5 - Dev-C status

Lane: Mobile / Dev-C (App-Store-credibility polish).
Branch: `app`. Verified: `npx tsc --noEmit` clean, `npm test`
20 suites / 103 tests green.

## Files written / changed

NEW design-system primitives:
- `mobile/src/design-system/components/Icon.tsx` (~190 LOC, 5 icons + emoji fallback)
- `mobile/src/design-system/components/EmptyState.tsx` (~70 LOC)
- `mobile/src/design-system/components/Skeleton.tsx` (~55 LOC)
- `mobile/src/design-system/components/OfflineBanner.tsx` (~65 LOC)

Touched primitives:
- `mobile/src/design-system/components/Card.tsx` (additive: optional
  `accessibilityRole` / `accessibilityLabel` / `accessibilityState` on
  the inner Pressable / View; `accessibilityRole` defaults to `"button"`
  when `onPress` is set)
- `mobile/src/design-system/components/index.ts` (export new primitives)

Screens touched (a11y + EmptyState):
- `mobile/app/index.tsx` (Home)
- `mobile/app/anatomy/index.tsx`
- `mobile/app/courses/index.tsx`
- `mobile/app/checklist/index.tsx`
- `mobile/app/glossary/index.tsx`
- `mobile/app/gallery/index.tsx`
- `mobile/app/settings.tsx`
- `mobile/app/bootcamp/index.tsx`

## Icon component API

```tsx
<Icon name="cap | bolt | book | compass | sail" size={24} color={...} />
```

- 5 icons inlined as `react-native-svg` `<Path>` / `<Circle>` primitives,
  one renderer per name. No `react-native-svg-transformer` dependency
  added (would have required Metro config + risk to other Devs in
  parallel). Path data copied verbatim from the Designer's SVGs in
  `mobile/assets/icons/`.
- Unknown name -> emoji fallback (cap=`🎓`, bolt=`⚡`, book=`📖`,
  compass=`🧭`, sail=`⛵`, unknown name=`?`). Never crashes.
- Defaults: size 24pt, color `colors.textPrimary`. Accepts `style` for
  margins.
- JSDoc lists the available names + usage example.

## Icon wiring on Home

3 entry-card emoji swapped for `<Icon size={36} color={accentColor}/>`:

| Entry        | Old   | New                               |
| ------------ | ----- | --------------------------------- |
| Bootcamp     | 🎓     | `<Icon name="cap" color=cyan />`    |
| Quick refresh | ⚡     | `<Icon name="bolt" color=success />`|
| Rules        | 📖     | `<Icon name="book" color=warning />`|

Continue Day-N card and Celebration card emoji preserved (`🎓` / `🏁`)
per scope ("the rest of Home untouched"). Bootcamp lesson emojis
preserved. Other emoji surfaces remain until Designer ships more icons.

## EmptyState API

```tsx
<EmptyState
  title="No matches"
  subtitle='No glossary terms match "...".'
  icon="book"
  cta={{ label: "Clear search", onPress: () => setQuery("") }}
/>
```

- Centered vertical stack: 32pt cyan glyph, subtitle title, caption
  subtitle, optional ghost button CTA.
- Default icon = `compass`. CTA uses the existing ghost `<Button>`
  variant.

Applied to:
- `glossary/index.tsx`: search returns 0 -> EmptyState with "Nothing
  found" + clear-search CTA. EN copy kept as "Nothing found" to keep
  the existing `__tests__/screens/glossary.test.tsx` green (test owned
  by another agent, cannot edit).
- `checklist/index.tsx`: defensive empty-sections fallback. In practice
  `checklistSections` is non-empty, so this never renders today, but
  the EmptyState is wired for content-loading regressions.

## Skeleton API

```tsx
<Skeleton width={160} height={20} radius={6} />
```

- Animated opacity loop 0.4 -> 0.7 -> 0.4 over 1500ms (mirrors the
  PulsePill pattern). `useNativeDriver: true`.
- Base color `colors.bgCard`. Accessible name "Loading", role `image`.
- Accepts `width: number | "<n>%"`, `height: number`, optional
  `radius` (default 6).

Not wired into a screen this round - none of the in-scope screens
hydrate slowly enough to need a skeleton today (gallery is the closest
candidate but currently goes straight to RN's native Image loader).
Available for future use.

## OfflineBanner API

```tsx
<OfflineBanner visible={offline} />
```

- 32pt strip, warning-tinted (14% bg, 30% bottom border), localized
  copy in 7 languages, `accessibilityRole="alert"`.
- Visibility is consumer-controlled (no NetInfo dependency added this
  round, per the brief). Future: spawn a NetInfo provider in
  `_layout.tsx` and forward the boolean.

Not wired into a screen this round. Available for any consumer.

## A11y label coverage matrix

| Surface                           | Tappables labeled | Notes                                                                  |
| --------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `/` (Home)                        | yes               | 3 entry cards have `accessibilityRole="button"` + per-card label       |
| `/anatomy`                        | yes               | hotspots, chips (with `selected` state), modal close + prev/next       |
| `/courses`                        | yes               | polar diagram (role `adjustable` + value), wind chips, course cards   |
| `/checklist`                      | yes               | item rows already had `checkbox` role + state; added `accessibilityLabel` |
| `/glossary`                       | yes               | search input, term cards (role `text` + descriptive label)             |
| `/gallery`                        | yes               | tiles labeled "Open photo/video: <title>" in 7 langs                   |
| `/settings`                       | yes               | language picker (with `selected` state), privacy / support / telemetry rows, modal close |
| `/bootcamp` (index)               | yes               | lesson cards labeled "Lesson N: <title>[, completed]"                  |
| `/bootcamp/[id]`                  | OUT OF SCOPE      | Dev-B owns                                                             |
| `/simulator/*`                    | OUT OF SCOPE      | Dev-A owns                                                             |
| `/rules`, `/racing`, `/onboard`, `/quick` | NOT YET   | expert routes - flagged below as follow-up                             |

Visual-only emojis (e.g. lesson emoji on bootcamp index, section icon
on checklist) are NOT marked `accessibilityElementsHidden` because the
React Native Testing Library v13 hides such elements from `getByText`
queries and that broke an existing test. The wrapping Card / Pressable
already carries a comprehensive `accessibilityLabel`, so screen
readers read the label first; the visible emoji is decoration.

## Verification

```
$ cd mobile && npx tsc --noEmit
EXIT: 0

$ cd mobile && npm test -- --silent | tail -8
PASS __tests__/screens/rules-detail.test.tsx
PASS __tests__/screens/courses.test.tsx
PASS __tests__/i18n-context.test.tsx

Test Suites: 20 passed, 20 total
Tests:       103 passed, 103 total
Snapshots:   0 total
Time:        5.337 s
```

Existing tests untouched. Dev-A's `src/simulator/use-sim-loop.ts` had
an unrelated TS error during my run that resolved when re-run; my
changes are not the cause and stay clean on a final pass.

## Strict-rule compliance

- No em-dash / en-dash anywhere in new strings or comments (ASCII
  hyphens only).
- No new dependencies. `react-native-svg` was already on the dep tree
  (used by the anatomy poster); icons reuse it.
- 7 langs for every new UI string via `tp()`.
- No comments added to code unless WHY is non-obvious (Icon registry +
  Skeleton animation rationale). New JSDoc on Icon documents the names
  per spec.
- Did not change emoji to icon outside the 3 Home entry cards. Continue
  / Celebration / lesson / checklist-section emojis preserved.

## Follow-ups for next sprint

1. **A11y on expert-owned routes.** `/rules`, `/racing`, `/onboard`,
   `/quick` were flagged as expert territory and do not have
   `accessibilityLabel` on their interactive cards / Pressables yet.
   They need a pass with the same pattern (Card.tsx already supports
   the props now, so it is a one-line edit per Card).
2. **A11y on simulator + bootcamp/[id].** Owned by Dev-A and Dev-B
   this round. Same pattern.
3. **Icon roll-out beyond Home.** When Designer ships the remaining
   17 icons (per audit Section 5), wire `<Icon name="compass">` on
   the courses card on Home, and replace the emoji on bootcamp lesson
   cards / checklist section headers with branded icons.
4. **Skeleton wiring.** Plug `<Skeleton>` into Gallery while images
   load (today the `<View>` placeholder is just `bgCard`). Plug it
   into a future Leaderboard / Multiplayer Tier-2 screen.
5. **OfflineBanner wiring.** Add `@react-native-community/netinfo`,
   spawn a context provider in `_layout.tsx`, and render
   `<OfflineBanner visible={!isConnected} />` above the ScrollView in
   Gallery + Leaderboard + Multiplayer.
6. **Font scaling.** PM round-1 audit flagged font scaling not tested.
   Did NOT cover this round (separate task: walk every screen at
   `Settings > Display > Text Size` max and check no overlapping or
   truncation). Defer to a dedicated polish pass.
7. **Glossary EN copy.** Spec requested "No matches" but the existing
   test in `__tests__/screens/glossary.test.tsx` asserts "Nothing
   found". Kept the test green; if PM wants the new copy, they will
   need to update both the screen and the test together.
