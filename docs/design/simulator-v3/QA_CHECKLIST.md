# Simulator V3 - QA checklist

Run through this before calling a V3 change shipped. Ties to
`BEHAVIORAL_CONTRACTS.md`; this file is the checklist surface you tick
off, those are the testable assertions.

## Pre-flight

- [ ] `npm run test:physics` - 16/16 green
- [ ] `npx tsc --noEmit` - clean
- [ ] `npm run build` - clean, no new warnings that touch V3
- [ ] No em-dash / en-dash introduced: `git diff origin/main -- src/features/simulator-v3 | grep -E '[\u2013\u2014]'` returns nothing
- [ ] `src/lib/sailing-physics/*` NOT touched (V3 owns features + app/simulator-v3 only)

## Default state (Contract 1)

Load `/simulator-v3` fresh (no URL params):

- [ ] Scene renders; boat visible, not stuck at zero speed
- [ ] Speed approx 6.1 kts, heel approx -7, AWA approx 62, trim approx 90%
- [ ] Both pod badges show ATTACHED / ТЯНЕТ / PRACUJE (no red dots)
- [ ] Commentary shows a good-band message (slot healthy, etc) - no critical or warning
- [ ] HelmPod shows HDG 000, "on course" state, no target arrow

## Live response (Contract 2)

Grab the main-angle slider, drag from 52 to 0 (hard sheet in):

- [ ] Badge transitions ATTACHED -> EDGE -> STALL over ~1 s (not instant)
- [ ] Drive force visibly drops as AoA rises through 20 deg
- [ ] Boat speed declines gradually, not a snap jump
- [ ] Commentary switches to "Main overtrimmed" (warning)
- [ ] After overtrim sits a while, commentary may get a trend suffix like "Recovering" if user eases it

## Reef recovery (Contract 3)

Set wind=20, TWA=50, reef=0, trim heavy:

- [ ] Heel climbs over 25
- [ ] Commentary goes critical ("Reef NOW") above 28 / no reef / 16+ kts
- [ ] Toggle reef R1: heel declines over several seconds (not instant)
- [ ] Commentary downgrades to warning then edge/healthy

## Turn / tack (Contract 4)

From starboard-beam default, click the tack button:

- [ ] Scene rotates smoothly (~4 s) through dead upwind
- [ ] HelmPod target arrow appears, shows target 180
- [ ] HDG ticks up through 45, 90, 135, 180
- [ ] Boat speed dips around TWA=0 crossing, recovers on the new tack
- [ ] Top and rear view, if toggled during the turn, agree on the same snapshot
- [ ] Sail side flips (port <-> starboard) after TWA crosses zero

## Reset (Contract 5)

From any arbitrary state, click Reset:

- [ ] UI sliders snap back to DEFAULT_UI
- [ ] Boat state re-settles to approx 6.1 kts / -7 heel
- [ ] Any active drill clears
- [ ] Any active scenario selection clears
- [ ] Scene is immediately valid, no flash of bad values

## Drills (PR-4)

Click "Drills" tab:

- [ ] Picker lists 3 drills in the active language
- [ ] Start "Hold trim" - UI snaps to its initial state (main 40, jib 40, TWA 90)
- [ ] Timer ticks down from 40s
- [ ] Hold meter stays at 0 while trim is below 85%
- [ ] Drag sliders toward optimal: hold meter starts filling
- [ ] Reach 10 s hold: card turns green, "DONE" state, Retry + Pick-another buttons
- [ ] Retry resets the drill deterministically
- [ ] Let timer run out on a failed attempt: card turns red, "FAILED"

## Scenarios (PR-4)

Click "Scenarios" tab:

- [ ] 4 scenario cards listed in active language
- [ ] Click "Overpowered": UI jumps to 20 kt close-hauled, scene shows real heel
- [ ] Click another scenario: switches cleanly, highlighted card moves

## URL state (PR-5 polish)

- [ ] Load `/simulator-v3?twa=42&tws=16&tack=s&reef=1&main=24&jib=28`:
      UI reflects those values on first paint
- [ ] Invalid values (twa=500, reef=x) are ignored silently, defaults fill in
- [ ] Click "Share": button label flips to "COPIED" for ~2 s
- [ ] Paste URL back into another tab: same setup loads

## Language matrix

Tick each language switch on the header:

- [ ] RU: СВОБОДНО / УПРАЖНЕНИЯ / СЦЕНАРИИ / ВЕТЕР / РУЛЬ / ГРОТ / СТАКСЕЛЬ / ВИД / Поделиться
- [ ] EN: Free Sail / Drills / Scenarios / WIND / HELM / MAIN / JIB / VIEW / Share
- [ ] PL: Wolna jazda / Cwiczenia / Scenariusze / WIATR / STER / GROT / FOK / WIDOK / Udostepnij
- [ ] Commentary line stays in the same language after TWA / reef / drill changes
- [ ] Drill cards' title + goal in active language

## Browsers

Smoke-test each:

- [ ] Chrome desktop: default state + tack + drill
- [ ] Safari iOS: mobile layout readable, no overlap, Share copies to clipboard
- [ ] Firefox desktop: SVG animations (waves, wind streaks) render

## Console hygiene

Open devtools, reload:

- [ ] No `Received NaN` warnings from React
- [ ] No `key` prop warnings
- [ ] No unhandled promise rejections from the clipboard fallback
- [ ] HMR reloads don't introduce stale closures (do a trim change after an HMR event and verify it still applies)

## Prod smoke (after deploy)

```
curl -H 'Accept-Language: en' https://regatta.icoffio.com/simulator-v3
```

- [ ] HTTP 200
- [ ] Response HTML contains "Free Sail" (mode bar rendered SSR)
- [ ] Response contains "V3 · Cockpit"
- [ ] Language header switches PL/EN/RU correctly
