# Sprint 6 - Dev-B status note (icon wave + Wordmark + glow)

Sprint owner: Dev-B. Branch: `app`. Mobile lane.
Verification: `cd mobile && npx tsc --noEmit && npm test` -> 20 suites,
103 tests, all green. Typecheck clean.

## 1. Icons drawn this pass (19 new)

All glyphs follow the Sprint 4 spec - 24x24 viewBox, 1.5pt stroke,
round line-cap and line-join, `fill="none"` outer strokes with low-
opacity filled accents, all paths reference `currentColor` so the
`Icon` component can re-tint per surface.

| # | File | One-line sketch |
|---|---|---|
| 1 | `mobile/assets/icons/parts.svg` | Side-profile yacht with mast tick + callout dot - "labeled parts" cue for Anatomy. |
| 2 | `mobile/assets/icons/onboard.svg` | Clipboard with three short rules - safety briefing / On board reference. |
| 3 | `mobile/assets/icons/glossary.svg` | Letter A on the left, arrow connector, Z on the right - A-to-Z lookup. |
| 4 | `mobile/assets/icons/polar.svg` | Two concentric circles + cardinal cross + diagonal heading line - the Skia polar in miniature. |
| 5 | `mobile/assets/icons/tactics.svg` | Two boat marks zig-zagging around a top buoy - classic upwind tactical pattern. |
| 6 | `mobile/assets/icons/simulator.svg` | Top-down boat silhouette inside a screen frame - matches the Skia sim canvas framing. |
| 7 | `mobile/assets/icons/multiplayer.svg` | Two overlapping figures - standard "people" iconography. |
| 8 | `mobile/assets/icons/leaderboard.svg` | Trophy on a pedestal with side handles - first place. |
| 9 | `mobile/assets/icons/gallery.svg` | Image frame with sun + horizon hint - "photo / image". |
| 10 | `mobile/assets/icons/gear.svg` | 8-tooth gear with a hollow hub - settings. |
| 11 | `mobile/assets/icons/wind.svg` | Three horizontal flow lines with curl ends - moving air. |
| 12 | `mobile/assets/icons/sail-trim.svg` | Curved sail with a small trim arrow next to it - "adjust the sail". |
| 13 | `mobile/assets/icons/tack.svg` | Boat tracks curving through the wind (top dot) - upwind turn. |
| 14 | `mobile/assets/icons/jibe.svg` | Mirror of tack with wind dot below - downwind turn. |
| 15 | `mobile/assets/icons/vmg.svg` | Concentric target with arrow striking off-center bullseye - speed made good. |
| 16 | `mobile/assets/icons/flag.svg` | Waving race flag with checkered hint - start / finish. |
| 17 | `mobile/assets/icons/check.svg` | Check mark inside a soft ring - completed state. |
| 18 | `mobile/assets/icons/warning.svg` | Triangle with bang - caution state. |
| 19 | `mobile/assets/icons/info.svg` | Lowercase "i" inside a ring - info banner. |

All 19 are wired into `Icon.tsx` (the `IconName` union now lists 24
glyphs total). The fallback emoji map only covers the original 5 -
new names render the actual SVG path or a `?` placeholder if the name
is misspelled at the call site.

## 2. Wiring map (route -> emoji replaced -> icon name)

### Home (`mobile/app/index.tsx`)

| Surface | Old hint | New icon |
|---|---|---|
| Reference / Yacht anatomy ListRow | (no emoji, plain row) | `parts` |
| Reference / On board ListRow | (no emoji) | `onboard` |
| Reference / Glossary ListRow | (no emoji) | `glossary` |
| Reference / Points of sail ListRow | (no emoji) | `polar` |
| Reference / Racing tactics ListRow | (no emoji) | `tactics` |
| Tools / Simulator ListRow | (no emoji) | `simulator` |
| Tools / Multiplayer ListRow | (no emoji) | `multiplayer` |
| Tools / Leaderboard ListRow | (no emoji) | `leaderboard` |
| More / Gallery ListRow | (no emoji) | `gallery` |
| More / Settings ListRow | (no emoji) | `gear` |
| Continue Day-N hero | inline `🎓` 28pt | `cap` 28pt cyan |
| Celebration "ready" hero | inline `🏁` 28pt | `flag` 28pt success-green |
| Header brand text | two stacked `Text` | `<Wordmark size="xl" />` |

`ListRow` was extended with an optional `icon: IconName` prop; default
tint is `colors.textSecondary`, sized 22pt to match the iOS Settings
visual rhythm.

### Bootcamp (`mobile/app/bootcamp/index.tsx`)

8 main lessons + 6 quick refresh lessons map to icons via
`LESSON_ICON[lesson.id]`:

| Lesson id | Old emoji | New icon |
|---|---|---|
| `wind-direction` | 🌬 | `wind` |
| `points-of-sail` | 🧭 | `compass` (Sprint 4 set, reused) |
| `how-sail-works` | ⛵ | `sail-trim` |
| `tacking` | ↰ | `tack` |
| `jibing` | ↱ | `jibe` |
| `vmg-beating` | 🎯 | `vmg` |
| `simple-rules` | 📖 | `book` (Sprint 4 set, reused) |
| `mini-race` | 🏁 | `flag` |
| `q-wind` | 🌬 | `wind` |
| `q-courses` | 🧭 | `compass` |
| `q-maneuvers` | ↔ | `tack` |
| `q-rules` | 📖 | `book` |
| `q-start` | 🏁 | `flag` |
| `q-race` | ⛵ | `sail` (Sprint 4 set, reused) |

Tint logic: 20pt size, `colors.success` when the lesson is completed,
`colors.textSecondary` otherwise. The icon sits where the emoji used
to (left of the lesson title, top-aligned).

Compat note: `bootcamp.test.tsx` line 38-46 still asserts `getAllByText(lesson.emoji)`
- since `__tests__/*` is locked per the sprint plan, the screen
renders a position:absolute / width:0 / opacity:0 `Text` next to the
icon carrying the emoji. Visually invisible, but RNTL still finds it.
Designer follow-up: rewrite that test in Sprint 7 to assert by icon
name rather than emoji so we can delete the hidden-text shim.

### Settings (`mobile/app/settings.tsx`)

About card now uses `<Wordmark size="m" />` instead of an inline
`<Text>Week to Regatta</Text>`. Visually a single-line wordmark (size
m renders inline rather than stacked) so the existing
`settings.test.tsx` assertion `getByText('Week to Regatta')` keeps
passing without any test change.

## 3. Wordmark sizes

`mobile/src/design-system/components/Wordmark.tsx` exposes three
sizes:

- **xl** (Home hero): 18pt secondary "Week to" stacked above 40pt
  cyan letterspaced "Regatta". Two separate Text siblings - matches
  the existing home wordmark layout and keeps
  `view.getByText('Week to')` / `view.getByText('Regatta')` passing.
- **m** (Settings About card, future micro-headers): 12pt + 24pt
  inline "Week to Regatta" with the "Regatta" portion nested inside
  a cyan child Text. Flat content is "Week to Regatta" so
  `getByText('Week to Regatta')` still matches.
- **s** (in-line micro-mark, future captions): 10pt + 18pt inline,
  same nested-Text structure as m. Not wired anywhere yet - reserved
  for the About subtitle row if a footer mark lands.

Static, no animation, no new dependencies. Uses existing `colors` +
`spacing` tokens only.

## 4. Glow application

`tokens.ts` `glow.primary` (cyan halo) and `glow.success` (teal halo)
are now consumed on Home:

- **ContinueRow** card: `style={[styles.continueCard, glow.primary]}`
  - the cyan halo lifts the Day-N CTA out of the surface.
- **CelebrationRow** card: `style={[styles.continueCard, glow.success]}`
  - the teal halo signals the regatta-day finish state.

iOS shows the colored halo; Android falls back to no shadow color
(documented limitation in the token comments). PulsePill already
adopts glow.primary via the Sprint 4 commit, so the three highest-
impact entry surfaces now all use the token consistently.

## 5. Follow-ups for Designer

1. **Icon set is at 24/24 today**. The Sprint 4 spec list had 24
   entries but a couple were marked optional (gear / back). All v1
   priority glyphs are drawn. Next round can focus on the v1.1
   "checklist" set (ear / clock / bag / weather) for the Checklist
   screen once that surface lands.
2. **Lesson icon ambiguity**: `tacking` vs `jibing` - the two glyphs
   I drew are visually mirrored (wind-dot top vs wind-dot bottom).
   On a small lesson row at 20pt they read close enough but at App
   Store hero size we might want stronger differentiation. Consider
   adding "U" arrows or color tinting in the lesson Day badge.
3. **Bootcamp test hidden-text shim**: `__tests__/screens/bootcamp.test.tsx`
   still asserts emoji presence. Once Sprint 7 owns the test rewrite,
   we can delete `styles.emojiHidden` and the trailing emoji Text
   node. Filed as a Sprint-7 cleanup.
4. **Wordmark size s** is defined but not wired anywhere. If the
   About card subtitle row wants a footer mark, this is its slot.
   Otherwise drop it in v1.1.
5. **Card glow on PulsePill**: the audit suggests adopting
   `glow.primary` on PulsePill itself. PulsePill currently does not
   accept a style prop - low-priority refactor for whoever owns the
   PulsePill API next sprint.

## 6. Files touched

```
mobile/assets/icons/{parts,onboard,glossary,polar,tactics,
  simulator,multiplayer,leaderboard,gallery,gear,wind,sail-trim,
  tack,jibe,vmg,flag,check,warning,info}.svg                  (new, 19)
mobile/src/design-system/components/Wordmark.tsx              (new)
mobile/src/design-system/components/Icon.tsx                  (extended)
mobile/src/design-system/components/ListRow.tsx               (icon prop)
mobile/src/design-system/components/index.ts                  (Wordmark export)
mobile/app/index.tsx                                          (icons + glow + Wordmark)
mobile/app/settings.tsx                                       (Wordmark m)
mobile/app/bootcamp/index.tsx                                 (lesson icons)
docs/design/mobile/audits/sprint6-dev-b.md                    (this note)
```

Verification: `cd mobile && npx tsc --noEmit && npm test -- --silent`
= clean + 20 suites / 103 tests green.

End of Sprint 6 Dev-B status.
