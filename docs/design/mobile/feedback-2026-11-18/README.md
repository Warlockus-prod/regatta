# TestFlight feedback on the app UI, builds 81-84 (checked 2026-11-18)

Ten screenshot notes from the owner (App Store Connect beta feedback, builds 81, 82 and 84, iPhone
with a 440x956 pt screen, iOS 26), the ads notes excluded (another session works on those). Each item
was first checked on build 1.7.3 (89) from `claude/app-next` (`88ca2f4b`), then fixed in branch
`claude/app-ui-feedback` and checked again on the same simulator.

- Simulator: iPhone 17 Pro Max, iOS 26.5 (`A09F5BA9-A97A-437B-A03F-A85AE41FFBA2`, the owner's screen
  size), Release build for the simulator with `EXPO_PUBLIC_ADS_DEMO=1` and a fresh Metro cache, Polish
  UI (the language the owner used in most notes). Not checked on a real iPhone.
- Files here: `owner-fbNN.jpg` the owner's screenshot, `before-89-*.jpg` build 89, `after-*.jpg` this
  branch.

| # | Build | Owner's note (short) | Screen | Verdict |
|---|---|---|---|---|
| fb11 | 84 | "Настройка не сворачивается назад, чтобы был полный экран" | «Настроить паруса», sliders mode | Fixed |
| fb12 | 84 | "Кнопка назад кривая" | native header, every screen with a custom back (Ads, trainers, race, lessons, radio) | Fixed |
| fb13 | 82 | "Не исправил это ... под обычный не сделали" | «Регаты» hub, picture runs off the right edge | Already fixed in build 83 (package 32, stage A) |
| fb14 | 81 | messages cover too much and are hard to see; higher and nicer | race, messages over the water | Fixed |
| fb15 | 81 | "Best VMG нужно кнопкой на экране, а не спрятанной в меню" | race helm | Fixed (water layout is now the default) |
| fb16 | 81 | arrows always on the water like in games, no big block at the bottom | race helm | Fixed (water layout is now the default) |
| fb17 | 81 | the wind box is in the way: smaller, see-through | race wind box | Fixed (the compact wind box of the water layout) |
| fb18 | 81 | "Не понятно, где Про и где обычное" | «Регаты» hub and the race | Fixed |
| fb19 | 81 | landscape: full screen, arrows and helm as overlays, not blocks | race, phone turned | Fixed (water layout is now the default) |
| fb20 | 81 | "Кривое фото" | «Регаты» hub picture (same as fb13) | Already fixed in build 83 |

## fb11: the slider panel folds down

Before (89, `before-89-trainer-sliders.jpg`): in sliders mode the dock (tabs Избранное / Паруса /
Руль / Ветер / Ещё and the slider cards) takes the lower 40% of the screen and cannot be put away. The
wheels mode already is a game screen since build 83 (the tab strip behind one menu button); the owner
was in sliders mode, where nothing folded.

Now: a fold button (a chevron, next to the gear) at the end of the tab strip. Folded, the dock is only
the tab strip at the bottom edge, the boat's window takes the freed height (the camera re-centres on
it, `SceneStage` measures the window). A tab or the button opens the panel again. Turned phone: the
side sheet shrinks to the expand and gear buttons in the bottom right corner. Only in sliders mode
and only on the phone layout (`layout="bottom"`); the desktop column and the wheels keep their own
behaviour. With the extra button the tabs pad 4 px instead of 8 px, so all five labels fit in all 7
languages at 390 px (portrait) and 844 / 956 px (turned, the side sheet is now up to 392 px wide);
measured in Chromium (`after-trainer-sliders-*.jpg` are the simulator).

Code: `src/features/trainer-controls/ControlDock.tsx` (`data-collapsed`, `control-dock-fold`),
`TrainerControls.module.css`, labels in `labels.ts` (7 languages). Tests:
`ControlDock.test.tsx`, `e2e/trainer-controls.spec.ts` ("sliders mode: the dock folds").
The same component runs the website's trainers, so the site gets it too.

## fb12: the back button on iOS 26

Before (89, `before-89-*`): iOS 26 puts every custom header item into a glass capsule. Our back
buttons were a text "‹ Назад" with padding on the right only, so the word sat against the capsule's
left edge and an empty band filled its right side.

Now: one `mobile/src/navigation/HeaderBackButton.tsx` (a drawn chevron and the word, the same padding
on both sides) used by `ActivityBack`, `ReturnToLesson`, the sails lesson return in `SimWebView`, and
the radio course header. Test: `mobile/__tests__/activity-back.test.tsx`.

## fb13, fb20: the hub picture

Build 82 showed the race picture 688 pt tall and cut at the right edge. Fixed in build 83 (package 32,
stage A: the frame takes the file's proportion, `mobile/__tests__/race-hub-scene.test.tsx`).
`before-89-race-hub.jpg` shows the whole picture on the 440 pt screen. Nothing changed here.

## fb14-fb17, fb19: the race on the water

Build 89 still opens the race with the bottom dock (`before-89-race-simple.jpg`): coach strip, tab
row, arrows and assists in a solid block of about 30% of the screen, the wind box half the width,
the messages in the middle of the water. The owner's R-45 prototype (package 31, water on the whole
screen, arrows in the corners, BEST VMG between them, compact wind box) existed since 2026-11-06 but
only behind `?water=1` / `EXPO_PUBLIC_RACE_WATER=1`, so it never reached TestFlight
(`before-89-water-prototype*.jpg`: the same build opened by the deep link `regatta://game?water=1`).

Owner decisions this rests on: R-46 point 6 (accepted 2026-11-13: "a trainer and any screen where a
boat is steered or 3D is watched: the scene on the whole screen, the controls over it") and the notes
themselves (fb15, fb16, fb19 ask for exactly this layout). R-45 asked for a look on the iPhone first;
build 90 is that look. `?water=0` (and the deep link `regatta://game?water=0`) still opens the old
dock for a side-by-side check.

Now:
- The water layout is the race of every touch screen (the app's web view, a phone or tablet browser);
  a desktop with a mouse keeps the dock (`src/lib/race-water-layout.ts`, `raceWaterLayoutOn`).
- fb15, fb16: arrows in the lower corners, «Przez sztag» and BEST VMG («Najlepszy kąt» in Simple)
  between them, always on screen.
- fb17: the wind box is the compact one (compass and TWA, TWS, TWD, VMG rows, about 164x85 pt).
- fb19: turned, one row along the bottom: arrows in the corners, assists and tabs between them.
- fb14: messages are one compact line each (15 px, a dense see-through card with blur), high under the
  corner instruments; the course boundary note joins them up there instead of sitting on the boat,
  and the stack steps below it while it shows.

Found by the new `check:ui` water states and fixed: the open sheet's tab label was 4.3:1 on the
see-through button (now a solid card, 4.5:1 and more), and the edge arrow to the mark with its metres
was drawn over an open sheet (now hidden while a sheet is open).

Code: `src/lib/race-water-layout.ts`, `src/app/game/RaceCockpit.module.css` (water block),
`mobile/src/navigation/race-entry.ts` (passes `water=0|1` of a deep link). `check:ui` now walks the
water layout (`race-simple-water`, `race-pro-water`: the bar and each sheet) and the trainer in
sliders mode (`trainer-sliders`: every tab, then folded). Browser check on a 440x956 touch viewport:
the water layout comes up by itself, a mouse gets the dock, the toast after a tack sits at 182 px,
under the corner instruments (`after-web-race-toast-440.jpg`).

## fb18: which mode is which

Before (89): the hub showed the mode only as a grey word in the setup line ("Pierwszy wyścig ·
Prosty · Göcek"), the switch was under «Zmień»; in the race only Pro had a badge.

Now: the hub shows a two-way switch «Prosty | Pro» under the picture, the chosen one filled, with the
line saying what it means ("Żagle trymują się same, ty tylko sterujesz." / "Szot grota i szot foka są
na tobie..."). The setup line names the course and the venue. In the race the status row names the
mode in both cases (PROSTY or PRO). Code: `mobile/src/game/VenuePicker.tsx` (`RaceModeChoice`),
`mobile/src/navigation/ProductHub.tsx`, `src/app/game/RaceCockpit.tsx`. Tests:
`mobile/__tests__/race-hub-setup.test.tsx`, `src/app/game/RaceCockpit.navigation.test.tsx`.

## Not checked

- A real iPhone (everything above is the simulator), frame rate of the race with the new layout.
- Pro on the water in the app beyond the first screen (the sheets open over the scene as in the
  prototype checked on 2026-11-06).
- iPad, the turned phone with the notch on the right, languages other than Polish and English in the
  new mode badge (the words come from the shared dictionary `UI_TERMS`).
