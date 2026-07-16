# /radio - VHF radio + SRC certificate section

URL: weektoregatta.com/radio (moved from /sternik/radio on 2026-07-10;
permanent redirects keep the old paths working). Own layout + subnav,
shares the sternik language preferences (SternikPrefsProvider).

Status: shipped 2026-07-10; radio-trainer second pass 2026-07-10 (two
behavioral device profiles + interactive control course). Owner: Shared
lane (sternik section). Covers: the content page `/radio`, the operating
guide `/radio/obsluga`, the simulator `/radio/symulator`, and the
voice-grading API `/api/radio-voice`.

## What this is

A dedicated learning section for the marine VHF radio and the Polish SRC
operator certificate (Swiadectwo operatora lacznosci bliskiego zasiegu),
built for a user who is actually taking the UKE exam. Four parts:

1. **Content page** (`src/app/radio/page.tsx`) - what the SRC is,
   the UKE exam system (where/how/cost), VHF channels, distress procedures,
   phonetic alphabet, cheat sheet, official links.
2. **Operating guide** (`src/app/radio/obsluga/*`) - "what every control
   does and why, and how to maintain the set", with a browser mic check
   and an **interactive control course** (`InteractiveRadioCourse.tsx`):
   14 guided lessons that unlock only after you perform the real action on
   the working radio panel. See "Interactive control course" below.
3. **Simulator** (`src/app/radio/symulator/*`) - an interactive replica
   of the ICOM IC-M330GE **and** IC-M323 (two switchable behavioral
   profiles, not a reskin) with guided real-life scenarios.
4. **Voice grading** (`src/app/api/radio-voice/route.ts`) - Whisper
   transcription + a strict deterministic checklist scoring of spoken
   MAYDAY / PAN-PAN / SECURITE / radio-check / cancel transmissions.
5. **26 official UKE tasks** (`src/app/radio/zadania/*`) - the complete
   verbatim list of the SRC practical exam tasks from
   `materialy_do_testu_src.pdf`, each with the correct GMDSS/ICOM procedure
   (PL+RU) and a link to the simulator scenario or course lesson that trains
   it. The published materials have NO answer key, so this is a procedure
   reference, not a graded A/B/C quiz. Groups: device operation (10, tasks
   1-7,14-16), voice (6, tasks 8-13), DSC (6, tasks 17-22), EPIRB/SART (4,
   tasks 23-26). Data + a coverage test in `zadania/tasks.ts` +
   `tasks.test.ts` (asserts 26 tasks and that every scenario link resolves).

## Fact base (verified July 2026)

Researched via a 4-agent workflow; primary sources:

- **ICOM IC-M330GE instruction manual** IM_9 (icomeurope.com) and IM_10
  (icomuk.co.uk) - downloaded PDFs, panel/menu/DSC chapters extracted.
- **UKE**: bip.uke.gov.pl (fees table, harmonogram 2026 with 205 sessions in
  13 cities, obwieszczenie 18.12.2025 - exam subjects and Polish-only rule),
  egzaminy.uke.gov.pl (registration flow), official question base PDF
  `materialy_do_testu_src.pdf` (174 + 150 questions + 26 practical tasks,
  no answer key).
- **Rozporzadzenie MAiC z 16.01.2015** (Dz.U. 2015 poz. 99) - scoring: 0-5
  pts per question, >= 60% per subject, every subject must pass; one retake
  within 12 months covering only failed subjects.
- **GMDSS procedures**: ITU-R M.493 nature-of-distress symbols 100-110, IMO
  false-alert cancel procedure, RYA/MCA SRC teaching (MIPDANIO, PAN-PAN /
  SECURITE phraseology, readability scale).
- **Poland**: Polish Rescue Radio (call sign SPL, MMSI 002618102, operated
  from VTS Zatoka Gdanska by Urzad Morski w Gdyni) replaced Witowo Radio on
  1 Jan 2020. MRCK/MRCC Gdynia MMSI 002610000, SAR ops channel 11, alarm
  phone +48 505 050 971. Polish ports/marinas use ch 10/12/14 (Gdynia 12,
  Gdansk 14, Hel 10) - channel 09 is a US/UK convention, not Polish.

### Errors this research fixed on our own page

- fee 125 zl -> **175 zl** (150 exam + 25 certificate, one transfer BEFORE
  registration; retake 150 zl);
- practical threshold "15/20" -> official rule is **60% of points**; task
  count (4 vs 5) differs between candidate reports and is NOT officially
  fixed - the page says "relacje zdajacych: 4-5 zadan";
- port channel 09 -> Polish 10/12/14;
- coast station Witowo Radio -> Polish Rescue Radio (simulator ACK sender).

### Known unverified items (deliberately marked, not invented)

- Exact on-screen wording/order of the IC-M330 nature-of-distress list -
  the M330 manual never enumerates it; we use the IC-M323 family list
  (11 items, matches ITU-R M.493): treated as "probable".
- Whether the "Next TX after 4 min 6 sec." readout counts down per second
  on the real device - we show a live countdown.
- Number of practical exam tasks (4 vs 5) and formal "min 3 pts per task"
  rule - only the 60% rule is official.
- Certificate delivery time (blogs: 1-4 weeks; no official deadline).
- Main volume/squelch numeric ranges (manual shows examples 8 / 4; we use
  1..10).
- Qualification-email timing after UKE registration ("usually a few working
  days") - reported by candidates, no official deadline found.

## Simulator architecture

```
src/app/radio/symulator/
  radioModel.ts   pure state machine (no React): RadioState, RadioEvent,
                  radioReducer, softkeys(), channel/power helpers
  scenarios.ts    data-driven scenarios: steps with check(event,prev,next),
                  WHY explanations (PL+RU), mistake detectors, optional
                  init() for pre-seeded states (false-cancel)
  RadioFront.tsx  visual panel following the manual's layout: red DISTRESS
                  under a hazard-striped flip cover, LCD with a softkey label
                  row, ENT/arrows/CLR/MENU cluster, 16/C, PWR/VOL/SQL knob,
                  fist-mic PTT bar; per-model faceplate + control-highlight
                  hook for the guide course.
                  LOOK (2026-07, `vhf-trainer` design handoff): green phosphor
                  LCD (#79f0cf on #062a26) with scanlines and a self-hosted
                  Share Tech Mono face (next/font - no external request, CSP
                  untouched), a persistent status bar (band / GPS / watch /
                  power / battery) above the screen and a TX + signal meter
                  below it, a machined knob with a pointer, and an amber
                  (#ffce4d) pulse for the course spotlight. The DEVICE is
                  still the real exam hardware - only the styling changed.
                  FACEPLATE VARIANTS (2026-07): the radio picker is a 3-way -
                  IC-M330 and IC-M323 in the green trainer look, plus a third
                  "Realna" that renders the real amber IC-M330GE hardware. Two
                  props drive it: `skin` ('green'|'amber') swaps the LCD colour
                  via `LCD_SKINS` (CSS variables on the faceplate), and
                  `realistic` swaps the body to graphite + adds the perforated
                  speaker grille that the real front panel has. The realistic
                  option pairs skin=amber with realistic=true. Only the SCREEN
                  and BODY change; the controls stay wired the same. DISTRESS /
                  TX stay red on every skin for danger legibility. The realistic
                  choice is a persisted section pref (`radioRealistic`,
                  localStorage) so it follows the learner across surfaces; the
                  model stays page-local (each surface resets its own radio on
                  switch). The picker is `RadioVariantToggle`, on all three radio
                  surfaces (symulator / obsluga / rozmowa).
  inspectData.ts  inspect ("Rozbior") copy: 13 tappable parts of the panel -
                  every control AND every display indicator (lcd, status-band /
                  gps / watch / power / batt, tx-meter, softkeys, dial, sixteen,
                  keypad, distress, ptt), each explained in PL + RU. Idea from
                  the `vhf-trainer` design, mapped onto the real ICOM controls.
                  While inspect is ON the taps NEVER reach the state machine -
                  the radio is explained, not operated (verified in-browser:
                  the DISTRESS cover stays shut and the channel does not move).
  VoicePtt.tsx    voice phase: step-through (PTT clicks per line) or real
                  recording via MediaRecorder -> /api/radio-voice
  page.tsx        wiring: imperative dispatch (ref + render tick, avoids
                  StrictMode double effects), device timers, scenario
                  engine, onboarding, progress persistence, debrief
```

### Modeled device behavior (from the manual)

Two behavioral profiles live in `RADIO_PROFILES` (radioModel.ts) and the
reducer branches on `s.model`. They are genuinely different, not a skin:

| Behavior | IC-M330GE | IC-M323 |
| --- | --- | --- |
| `[DIAL]` push cycle | VOL -> SQL -> back | VOL -> SQL -> CH -> backlight |
| Standby channel change | arrow keys `[^]/[v]` | arrows or DIAL rotate |
| Clear key label | `CLR` | `CLEAR` |
| Menu tree | Distress / Other DSC / GPS / Configuration / DSC Log / Radio Settings / DSC Settings / Radio Info (8) | DSC Calls / DSC Settings / Radio Settings / Configuration / MMSI-GPS Info (5) |
| Other-DSC entry | top-level "Other DSC" | inside "DSC Calls" (type chosen first) |
| Distress re-TX readout | 4 min 06 sec | 3 min 42 sec |
| Cancel completion | `[FINISH]` then `[STBY]` | `[FINISH]` only |

- `[DIAL]`: hold ~1 s = power on/off (both); rotate = channel / menu /
  nature / gauge navigation depending on screen.
- `[16/C]`: short press = instant channel 16; **hold ~1 s = programmed
  Call Channel** (both models).
- Softkey pages scroll with `[<]`/`[>]`; DSC softkeys hidden without MMSI;
  the two models have different standby softkey layouts.
- DISTRESS: red key under a cover; screen `!! DISTRESS !! Hold Down for
  3 sec.` -> hold 3 s with countdown -> `Transmitting Distress Alert`
  (CH 70, MMSI + GPS position + nature) -> `Waiting for ACK / Next TX
  after 4 min 06 sec.` with `[CANCEL][RESEND][PAUSE][INFO]` -> on ACK:
  alarm + `[ALARM OFF]` -> auto CH 16 -> voice.
- Distress cancel: `[CANCEL]` -> `[CONTINUE]` -> DSC cancel TX -> auto
  CH 16 -> voice cancel prompt -> `[FINISH]`.
- CH 70 voice TX is blocked ("DSC only"); CH 15/17 are 1 W only.
- Other DSC: Type (Individual/Group/All Ships/Test) x Category
  (Routine/Safety/Urgency); All Ships announcement designates CH 16.

### Simplifications (documented, intentional)

A browser cannot reproduce the RF chain, so this is a procedure/UI trainer,
not a 1:1 radio. Honest limits:

- Rotary dial rendered as center button (press/hold) + two arrow buttons
  (rotate), because touch has no rotary encoder.
- No real audio radio traffic: beeps, the DISTRESS three-short-then-
  continuous alarm, AquaQuake and the received-call alarm are WebAudio
  tones, not sampled device sounds.
- Individual/Group DSC calls compose and can await ACK, but the on-device
  MMSI address book is a fixed 3-entry list, not free entry; scan / DW /
  AQUA / BKLT / FAV / LOG work but some list views are summarized.
- Coast-station ACK arrives after ~7 s (real world: up to minutes); the
  auto re-TX countdown shows the manual's 4:06 (M330) / 3:42 (M323) and
  really re-alerts at 0.
- Position/nature/GPS are fixed per run (drawn from the variant pool), not
  a live GPS feed.

## Scenarios (each step carries a WHY in PL and RU)

1. `fire-mayday` - designated distress: nature Fire,Explosion, 3 s hold,
   wait for ACK from Polish Rescue Radio, ALARM OFF -> CH16, voice MAYDAY
   (MIPDANIO order).
2. `mob-panpan` - man overboard IN SIGHT: All Ships / Urgency via Other
   DSC + voice PAN-PAN; mistake detector fires if the red key is used;
   debrief explains the PAN-PAN vs MAYDAY judgment call.
3. `engine-panpan` - breakdown + drift: urgency call + tow request.
4. `securite-hazard` - floating container: All Ships / Safety + SECURITE
   voice ending with OUT.
5. `radio-check` - marina Gdynia on ch 12, low power, never on 16
   (mistake detector for PTT on 16), readability scale in the WHY.
6. `false-cancel` - starts with an accidental alert already sent
   (scenario init state); CANCEL -> CONTINUE -> voice cancel -> FINISH.
7. `routine-marina` - routine correspondence: call Marina Gdynia on CH 12
   (not 16) to request a berth; mistake detector for keying on 16.
8. `vts-report` - routine traffic report to VTS Zatoka Gdanska on CH 71
   with position and intent.
9. `panpan-medico` - medical urgency: All Ships / Urgency + voice
   "REQUEST MEDICAL ADVICE"; debrief on the Urgency -> MAYDAY escalation.
10. `dsc-test` - DSC Test call to a coast station with automatic ACK; no
    voice phase (digital-only); mistake detector for sending it as All Ships.
11. `routine-ship` - Individual DSC call to another vessel, ACK, then voice
    on the agreed working channel; mistake detector for designating CH 16.
12. `group-call` - Group DSC call to a regatta fleet, then voice on the
    working channel (no ACK). With 10, 11 and the All-Ships urgency/safety
    calls, the catalogue now exercises all four DSC call types.
13. `mayday-relay` - relay another vessel's MAYDAY by voice on 16 (MAYDAY
    RELAY), NOT the red key; grader checks the relay proword and casualty data.
14. `receive-distress` - RECEIVING side: the radio starts (via `init`)
    already showing an inbound DSC distress from NEPTUN. Alarm off -> watch
    on 16 -> acknowledge by voice ("RECEIVED MAYDAY") only when the coast
    station is silent; mistake detector for transmitting your own distress.
15. `receive-call` - RECEIVING side: an inbound routine Individual DSC call
    proposing CH 72. Accept -> auto-switch to the working channel -> answer
    by voice.

Scenarios 7-15 follow the standard SRC/GMDSS practical task categories
(routine correspondence, DSC test/individual/group, medical urgency, distress
relay, receiving a call/distress) rather than a verbatim UKE numbered list,
which is not published in the exam materials we could verify. They run on the
same reducer; the receiving pair (14-15) starts already showing the inbound
call via `init` (the `false-cancel` pattern) and adds two read-only screens
(`rx-distress-alert`, `rx-individual-call`) plus `[ALARM OFF]`/`[ACCEPT]`
softkeys - no new events, no page timers. Each scenario has a completability
walkthrough in `scenarios.test.ts` (M330 + an M323 cross-model check) and,
where voiced, a grader test in `voiceGrading.test.ts`.

Modes: **nauka** (step instructions + WHY shown live) and **egzamin**
(situation only; the full WHY walkthrough appears in the debrief).
Score: `round(100 * done/total) - 10 * mistakes`, voice score shown
separately in the debrief.

## Interactive control course (`/radio/obsluga`)

`InteractiveRadioCourse.tsx` teaches the device itself, before any
scenario. It reuses the **same `RadioFront` panel and `radioReducer`** as
the simulator, so the user learns on the real state machine, not a mock.

- 14 ordered lessons: power hold, volume, squelch, working channel, ch 16,
  Call Channel (16/C hold), 25W/1W, Dual Watch, backlight, main menu, the
  DSC calls menu, an All Ships Safety DSC, physical PTT, and the 3-second
  DISTRESS under the cover.
- Each lesson has an `instruction`, a `why`, a `highlight(state)` that
  spotlights the exact control (RadioFront draws a pulsing cyan outline via
  `data-radio-highlight` + `data-testid`), and a `check(event,prev,next)`
  gate. **The next lesson unlocks only when the correct action fires** -
  clicking anything else does nothing, so muscle memory is trained
  correctly. Because the highlight and checks read `state`, the lesson path
  adapts per model (e.g. M330 reaches "Other DSC" from the top menu, M323
  from inside "DSC Calls").
- Progress persists per model in `localStorage['sternik.radio.guide.v2']`;
  the model toggle resets to lesson 1 for that profile. Key beeps and the
  DISTRESS alarm pattern reuse the simulator's WebAudio tones.
- Verified in-browser (2026-07-10) for both IC-M330 and IC-M323: power
  hold, dial rotation, and the M323 VOL->SQL->CH->backlight dial cycle all
  drive the panel and unlock lessons; console clean.

## Voice pipeline

Recording is tied to the **physical PTT**: holding the panel PTT button
starts the recorder, releasing it stops and submits (VoicePtt exposes
`startRecording`/`stopRecording` via `useImperativeHandle`; the page's
`onPttDown`/`onPttUp` drive it). A release-before-grant guard drops any
recording whose button was let go while the permission prompt was still up.

`VoicePtt` records (MediaRecorder, opus/webm or mp4 fallback, max 45 s)
-> `POST /api/radio-voice` (multipart: `audio`, `kind`, `vessel`,
`position`, `pob`) -> OpenAI Whisper (`whisper-1`, language=en, domain
prompt) -> `gradeVoiceTransmission()` in `voiceGrading.ts`
-> `{transcript, checks[], score}`.

- **Grading is strict + deterministic** (pure `voiceGrading.ts`, unit-tested
  in `voiceGrading.test.ts`): exact MMSI/call-sign digit sequences, exact
  lat/lon with N/E ordering, exact POB tied to "person/people/crew/souls",
  ordered-phrase checks (alarm -> identity -> position -> nature), and
  OVER/OUT at the end. The earlier "soft" grading (word present anywhere)
  was removed - it let empty numbers pass.
- **Exam integrity**: in egzamin mode the script is hidden
  (`hideScript`), line practice is off (`allowLinePractice=false`), and the
  voice step advances only on `score >= minimumScore` (70). The scenario's
  `finalScore = 0.65*procedure + 0.35*voice`, so a failed/empty voice can
  no longer coexist with a 100% scenario.
- Rate limits: 12/h per session + 80/h global + the site-wide daily AI
  budget (`checkUserDailyBudget`), same pattern as `/api/sternik-chat`.
- No `OPENAI_API_KEY` -> `{fallback:true}` and the client falls back to
  step-through mode (also on mic-permission denial). The key lives in
  `.env.local` locally and in the VPS `.env` in production.

## Browser microphone access (operational)

The voice trainer needs `getUserMedia`, which the page can only request if
the response carries `Permissions-Policy: microphone=(self)`. That header
comes from the **shared `nginx_server` reverse proxy**, which is external to
this repo's `docker-compose` and is **not** applied by the GitHub Actions
deploy. `regatta.nginx.conf` in the repo is the reference copy (already set
to `microphone=(self)`); to make voice work on prod, that config must be
copied to the shared proxy and it must be reloaded (`nginx -t && nginx -s
reload`, or restart the proxy container). Until then prod returns
`microphone=()` and the trainer falls back to step-through mode. The deploy
smoke step warns (does not fail) when the header is still missing.

## Language policy (2026-07)

- The whole motorowodny section (sternik + radio) exists in exactly **two
  languages: Polish (default) and Russian (opt-in aid)**. There is no
  EN/ES/FR/DE/IT version of a Polish licence exam, so every non-RU visitor
  is shown Polish - chrome included, not a half-translated mix.
- Enforced structurally by `SternikLangScope` (in `prefs.tsx`) wrapping both
  section layouts: it nests `I18nScope` (a new additive export in
  `src/lib/i18n.tsx`) that forces the section's effective language to `ru` on
  the RU site and `pl` everywhere else. Every existing `tp(ru,en,pl)` call in
  the section then resolves to PL for non-RU with zero per-page edits; the
  global language picker (outside the section) still switches the real site
  language, so a non-RU visitor sees English global nav around Polish section
  content.
- Exam questions are ALWAYS Polish (they are the exam).
- RU commentary is an opt-in aid **only on the Russian site version**:
  `SternikPrefsProvider` forces `explLang='pl'` when `lang !== 'ru'` and
  `ExplLangToggle` renders only for RU. The stored preference survives.
- `/sternik/teoria`: `Fact` hides its RU line, `Card`/`DiagramCaption`
  strip the `PL / RU` bilingual halves, `Table` drops columns whose header
  is Russian, section subtitles/TOC hide RU, all `Tip`s and the cheat
  sheet went through `tp(ru,en,pl)`.
- Known limitation: Russian labels inside SVG diagrams and photo-question
  figures are still bilingual (baked into the SVG text nodes).
- Simulator/scenario texts are `Bi {pl, ru}` rendered via the same policy
  (`ru` only for RU-site users who chose RU or Both).

### 2026-07-14: Polish is the base, Russian is an addition

The rule was right but the default contradicted it: `explLang` defaulted to
`'both'`, so a Russian visitor got a bilingual course they never asked for, and
"Russian commentary can be **added**" was not what actually happened.

- Default is now **`'pl'`** (`DEFAULT_EXPL` in `prefs.tsx`). Polish is the base -
  it is the exam language - and Russian commentary is one tap away, not on by
  default.
- `ExplLangHint` (RU site only, dismissible, remembered in
  `sternik.explHint.v1`): a one-line note where the learner meets the course,
  saying the Polish is deliberate and offering an **Enable RU** button. Without
  it, a visitor who switched the site to Russian and then found a Polish course
  could reasonably conclude the translation was simply missing.
- The invariant is unchanged and still holds on every other language: **no
  Russian anywhere**, no toggle, even if a `'both'` preference is sitting in
  localStorage from an earlier RU visit. Verified in-browser: on `?lang=pl` the
  page contains zero Cyrillic characters and no explanation-language toggle.

## Finding the courses (2026-07-14)

The two Polish licence courses now have a home in the theory section
(`/rules` -> `CoursesSection.tsx`): two cards, `sternik motorowodny` and
`radio SRC`, with what each one contains and a one-line statement of the language
rule - so the reader meets the policy instead of being surprised by it.

`/radio` was also **added to the site navigation** (Nauka group, next to
`/sternik`). Until now it was reachable only through a link buried inside
`/sternik`, so somebody who came for the radio exam could not find it from the
nav at all. Both entries are named as what they are: `Kurs: sternik motorowodny`
and `Kurs: radio SRC`.

## Progress + onboarding

- `localStorage['sternik.radio.progress.v1']`:
  `{[scenarioId]: {attempts, best, lastScore, bestTimeSec}}` - shown on
  scenario tiles ("best 90% · 3x").
- `localStorage['sternik.radio.onboard.v1']` - 4-card first-visit tour
  (replica, scenarios, modes, voice).

## Testing

- Type safety: `npx tsc --noEmit` clean; production `npm run build` green
  (bundle within the 5.5 MB budget); `npm run check:dash` clean.
- Unit tests (vitest): `radioModel.test.ts` (reducer: power hold, per-model
  DIAL cycles, 16/C short vs hold, DSC compose/ACK, CH70 voice block) and
  `voiceGrading.test.ts` (strict pass/fail on exact MMSI/position/POB and
  phrase order). Run with `npx vitest run src/app/radio`.
- Independent agent QA (workflow `radio-sim-test`): full fire-mayday
  walkthrough, mistake detectors, radio-check channel discipline,
  false-cancel flow, language-policy Cyrillic scans on PL pages,
  `/api/radio-voice` contract tests incl. a synthesized `say` MAYDAY
  recording through real Whisper.
- In-browser smoke (2026-07-10): interactive course drives real pointer
  events on both models; power-on, volume, and the M323 dial cycle unlock
  lessons; `/radio/obsluga` and `/radio/symulator` render console-clean.
- e2e hooks: stable `data-testid` on every control
  (`dial-center`, `dial-cw`/`dial-ccw`, `distress-cover`, `distress-key`,
  `soft-0..3`, `key-*`, `ptt`, `scenario-*`, `start-nauka-*`, `voice-*`,
  `model-M330`/`model-M323`, `interactive-radio-course`, `debrief`).

## V2 additions (2026-07-10, second pass)

- **Scenario variants ("AI examiner" variability)**: every run draws a
  vessel from `VESSEL_POOL` (3 identities), a position from `POSITION_POOL`
  and a POB count (2-6). Voice lines are templates over the variant; the
  grading API accepts a `vessel` index and builds name/MMSI/call-sign
  checks from the same shared pool. A variant card (name, MMSI, call, POB,
  position) shows next to the briefing.
- **IC-M323 behavioral profile** (model picker, persisted in
  `sternik.radio.model.v1`): now a real second profile in `RADIO_PROFILES`,
  not a reskin. Modeled per the official IC-M323 manual: CLEAR (vs CLR) key
  label, the 4-stage DIAL push cycle VOL -> SQL -> CH -> backlight, DIAL
  rotate also changes channel in standby, the 5-item menu tree with DSC
  types chosen inside "DSC Calls", "Next TX after 3 min 42 sec", and cancel
  completion on `[FINISH]` alone (no separate `[STBY]`). See the profile
  table under "Modeled device behavior".
- **Two-step cancel on M330** FINISH -> CANCEL COMPLETE -> STBY
  (`cancelRequiresStandby`); M323 finishes on `[FINISH]`.
- **Repo-wide XFF fix**: `clientIpKey()` in `src/lib/rate-limit.ts` keys
  limiters on the LAST X-Forwarded-For hop (nginx-appended, not spoofable);
  applied to all 9 API routes. First-hop reads remain only for analytics.
- **SVG language policy**: all Cyrillic inside teoria/SignsWeather SVG
  `<text>` nodes is now conditional on the RU site version (agent-edited,
  0 unconditional Cyrillic renders).

## V3 additions (2026-07-14, design pass)

Driven by the `vhf-trainer` handoff design. The decision was to take the
**visual language** from it but keep our **real ICOM models** (the design drew a
fictional "RG-16D"; the exam is taken on an ICOM, so the panel has to match the
real device). See the panel restyle in `RadioFront.tsx`.

- **Panel restyle** (PR #33): device stage, machined DIAL, hazard-striped
  DISTRESS cover, LCD with scanline texture and a self-hosted Share Tech Mono
  (`next/font/google` - no external request, so the CSP stays clean), status
  bar (INT / GPS / watch / power / battery) and a TX meter. Every `data-testid`,
  prop and dispatch is unchanged: the restyle is skin-deep on purpose, the state
  machine in `radioModel.ts` did not move.
- **Inspect mode** ("Rozbior", PR #34): a toggle that turns the whole panel into
  a tap-to-learn surface. Every control and LCD indicator carries an entry in
  `inspectData.ts` (13 keys, PL + RU, each tied to what the exam asks). While
  inspect is on, the radio does not react - taps explain instead of acting.
- **"?" hint** (`hints.ts`): given the current step and the current radio state,
  `hintFor()` returns the `data-testid` of the control to press now, and the page
  feeds it to the existing amber spotlight. Softkey positions are resolved by
  **label**, never hardcoded, so a hint stays correct across both device profiles
  (their softkey layouts differ) and across menu pages. Returns `null` when there
  is nothing to press (waiting for the coast station) and the UI says so.
  Learning mode only: in the exam the task text is hidden on purpose, so a hint
  would hand the answer over.
- **Printable cheat sheet + training certificate** (`/radio/sciaga`): the crib
  (channels, MAYDAY / PAN-PAN / SECURITE / cancel templates, DSC steps, phonetic
  alphabet + digits, prowords, the mistakes that fail people, exam facts) on one
  page, plus a certificate that reads the simulator's own progress
  (`sternik.radio.progress.v1`, a scenario counts as passed at >= 60%, the same
  bar as the UKE practical) and prints with the learner's name and date. The
  certificate says in both languages that it is a training document, not the UKE
  swiadectwo.
  Crib content lives in `cheatData.ts` so `/radio` (sections 5-6) and the
  printable sheet cannot drift apart.
- **Printing**, in `globals.css`: a page marks the one subtree worth putting on
  paper with `.printable`; the `@media print` block blanks the rest of the
  document (site nav, subnav, footer, feedback bubble), lifts that subtree to the
  top of the sheet, and pins the palette to ink-on-white. No shared component had
  to learn about printing, and the printout is identical whether the reader is
  browsing in the dark or the light theme.
- **Light-theme contrast** (the design shipped a light palette; the site already
  had a light theme via `<html data-theme="light">` and the header ThemeToggle,
  so no second toggle was added - the radio section was simply made to survive
  it). Two new CSS vars carry the flip:
  - `--accent-ink` - the ink ON an accent fill. Near-black reads on the dark
    theme's bright cyan but not on the light theme's deep cyan, which needs
    white. Replaced 16 hardcoded `#04222e` call sites across `/radio` and
    `/sternik` (with a fallback, so nothing outside those sections changed).
  - `--hl-amber` - the inspect/hint amber, bright on dark, deep on light.
  - Neon status literals (`#44ff88` / `#ff5566` / `#ffd24a`) in the radio pages
    now use the semantic `--success` / `--danger` / `--warning` vars, which
    already flip per theme. The SVG nav-light diagrams in `/sternik` keep their
    literal colors on purpose: those are drawings of real navigation lights, not
    UI status.
  - The radio device itself stays dark metal in both themes. It is a physical
    object, not a UI surface.

## V4 additions (2026-07-14, "teach it, do not just show it")

Driven by a blunt piece of user feedback on lesson 7 (HI/LO): *"there is no
explanation of WHAT this is and WHY, it is just a button - and that goes for
every button."* He was right, and the fixes below all follow from it.

- **Per-button inspect.** `RadioFront` used to lump the entire keypad into one
  inspect key (`keypad`) and all four softkeys into another (`softkeys`), so
  tapping MENU produced a paragraph about "the keypad". Every control now carries
  its own key: `inspectData.ts` grew from 13 entries to **27** (each arrow, MENU,
  ENT, CLR, 16/C, the channel readout, each softkey function, the DISTRESS cover
  and key, the mic, every status indicator). A softkey resolves its entry by its
  CURRENT label (`softIk()`), because a softkey has no fixed meaning.
- **What / why / when, everywhere.** Both the inspect entries and all 14 course
  lessons (`obsluga/lessonData.ts`) now answer four questions instead of one:
  WHAT it is, WHY it exists (the physical reason - 25 W in a marina blocks the
  channel for everyone out to the radio horizon; the 1 W restriction on 15/17/75/76
  protects channel 16), WHEN you use it, and what the examiner watches for.
  Content was generated and then adversarially fact-checked by a 12-agent
  workflow; the reviewers caught real errors (ENT does not send a distress alert,
  the EU IC-M330GE has no USA/CAN channel groups, ITU-R M.541 repeats the alert
  at 3.5-4.5 min not "about 4", and a Cyrillic homoglyph hiding inside a Polish
  word).
- **Inspect in the course.** The course is where a learner first meets the
  buttons, and it had no inspect at all - the one place the question gets asked.
- **The radio has sound** (`symulator/audio/*`, `symulator/radioTraffic.ts`).
  The simulator was silent, which quietly made the squelch lesson meaningless:
  "set SQL just above where the steady noise disappears" is not teachable when
  there is no noise. Everything is synthesized in WebAudio (no assets: strict CSP,
  bundle budget):
  - a breathing noise floor (bounded random walk) on a 0..10 S-scale shared with
    the squelch setting and every carrier, so the threshold is a REGION you hunt
    for by ear rather than a number that flips;
  - FM quieting: a carrier does not just add voice, it kills the hiss under it,
    so a weak call SOUNDS weak;
  - **set the squelch too high and the weak distant call is simply never heard.**
    Nothing on screen says so. That is the exam point, made audible. A "weak
    distant call" button in lesson 3 puts a 1 W station on the air to prove it;
  - a keypress and a REFUSED PTT on channel 70 no longer make the same sound;
  - the DSC alarm rings on the real two tones (2200 Hz / 1300 Hz, 250 ms each,
    ITU-R M.493);
  - `radioModel.ts` is untouched: `radioSounds.ts` is a pure `(event, prev, next)
    -> Cue[]` mapper, and the squelch threshold is pinned by unit tests
    (`at SQL 5 a S=4 call must NOT open the gate; at SQL 4 it must`).
  - On the VOL screen the gate is forced open (the MON affordance real sets have):
    with the factory squelch of 4 the radio is silent, and you cannot set a volume
    you cannot hear. The SQL screen is deliberately NOT monitored - that is the
    screen the lesson lives on.
- **Voice, both directions.**
  - STT moved from `whisper-1` to **`gpt-4o-transcribe`** (same endpoint, same
    multipart shape, same ~$0.006/min, materially better on accented and noisy
    speech, and it actually follows the vocabulary prompt). `whisper-1` stays as
    an automatic fallback so a model rollout cannot take the trainer down.
    Do NOT add `response_format=verbose_json` or `timestamp_granularities[]`:
    they are whisper-1 only and would 400.
  - New `/api/radio-tts` (**`gpt-4o-mini-tts`**, the only OpenAI speech model that
    accepts an `instructions` field - which is exactly what a clipped, flat
    coast-station delivery needs). The reply is played through a 300 Hz - 3 kHz
    band with soft clipping and a carrier click, so it arrives sounding like a
    radio, not a podcast. Station lines are a fixed pool (`stationReply.ts`) and
    are cached, so each phrase is generated about once.
  - **The Dziennik now records what you SAID**: the transcript verbatim, one line
    per missing checklist item, and the score. A score with no transcript told the
    learner nothing about which words were missing - and the missing words are the
    lesson.
- **Onboarding is fuller and replayable**: 6 cards (up from 4, adding inspect,
  sound/squelch and the two-way voice), and a "How this works" button, because the
  tour used to be a one-shot locked behind a localStorage flag with no way back.
- **The site chat bot knows radio** (`/api/ai-chat`): its SITE_SECTIONS listed no
  `/radio` and no `/sternik`, and its scope line restricted it to sailing - so a
  question about a DSC alert was answered as off-topic or without pointing at our
  own section. Both fixed, plus a short list of load-bearing facts it may repeat.

## V5: the audio reality check (2026-07-14)

The user's next demand was the right one: *"make the sound exactly as it is in
real life - is there noise, can monitoring be switched off? Re-check everything."*
A 15-agent workflow read the actual IC-M330GE and IC-M323 instruction manuals and
audited our engine against them. It found 12 discrepancies; every one survived an
adversarial refutation pass. All 12 are now fixed.

**The worst one was ours.** `audioView()` forced the squelch gate open whenever
the VOL screen was showing - an invented "monitor" that existed only to paper
over a lesson-ordering bug. **Neither exam radio has any monitor function**: the
M330GE softkey pool is published and closed (DISTRESS, OTHER DSC, TASK, SCAN,
DW/TW, HI/LO, CH/WX, LO/DX, AQUA, Favorite, NAME, BKLT, LOG) and there is no MON
key, no squelch defeat, nothing. It taught the candidate that the hiss belongs to
a screen, when on the real set it belongs to a **setting**.

What the manual actually prescribes (IC-M323 p.13, verbatim): *"First, open the
squelch. Then, adjust the audio output level. After that, adjust the squelch level
until the noise just disappears."* So:

- **The squelch has an OPEN position**, not a zero: "OPEN is completely open; 10
  is tight squelch; 1 is loose squelch" (11 positions). The LCD now says
  `SQL: OPEN`, and OPEN is a **latched** state that keeps hissing after the
  adjustment screen closes. That persistence IS the lesson.
- **The course order changed** to the manual's: open the squelch (new lesson 2) ->
  set the volume against the hiss (3) -> raise the squelch to the threshold (4).
  15 lessons now. The old order could not work: at the factory squelch the radio
  is silent, and you cannot set a volume against silence.
- **BUSY** is now on the LCD, driven by the audio gate itself: *"BUSY: displayed
  while receiving, OR THE SQUELCH IS OPEN"* (M330GE p.3). Hiss and BUSY are the
  same condition, always - never one without the other.
- **SQL 10 is "tight", not deaf.** A coast station alongside still breaks it; what
  a tight squelch loses is the weak distant call. "Max squelch = you hear nothing
  ever" was the wrong lesson - the real danger is subtler, which is why people
  fail on it.
- **Key Beep is a real device setting**: MENU > Configuration > Key Beep, On/Off,
  binary (no levels on these two sets). Off = "silent operation". It silences key
  beeps ONLY - **it cannot silence the DSC alarm, and no setting on the radio
  can**. Feeling that difference is worth the lesson.
- **The DSC alarm never gives up.** It used to pre-schedule 240 tone steps and
  then hold the last value, so after 60 seconds the distress alarm quietly became
  a flat 1300 Hz dial tone. The manual: a received distress alarm *"sounds UNTIL
  YOU TURN IT OFF"*. It is now driven in a rolling window. Every other DSC call
  *"sounds for 2 minutes"* and then stops by itself - so an incoming routine call
  alerts you (that is the whole point of DSC) with its own gentler cue, and times
  out.
- **The station's voice goes through the receiver.** The TTS reply used to connect
  straight to the audio destination, so you could hear the coast station with the
  volume at zero and the squelch shut - silently undoing the squelch lesson the
  moment the learner opened a scenario. It is now a carrier on the channel
  (`scriptOver` at `SIG_STRONG`) fed into the engine's squelch gate: gated by YOUR
  squelch, scaled by YOUR volume, muted while YOU transmit.
- **Scan and Dual Watch actually listen.** Scan is squelch-gated - it refuses to
  start with the squelch OPEN ("make sure the squelch is closed to start a scan")
  and pauses on a busy channel instead of chopping a live station into 900 ms
  fragments. Dual Watch samples CH 16 and parks there when someone is on it,
  beeping, then returns. Painting "DW" on the LCD while hearing nothing taught the
  exact opposite of the lesson.
- **AquaQuake is a buzz, not a beep**, and it deliberately bypasses the volume:
  *"a low frequency vibration beep sounds to drain the water, REGARDLESS OF THE
  VOLUME LEVEL SETTING"* (M330GE p.14). It is the one sound on the set the VOL
  knob cannot touch.

Simplifications we keep, and label as such: the DSC alarm's volume relationship is
not documented in either manual, so we do not assert one; and CH 70's speaker
silence is inferred (no DSC set feeds data audio to the AF stage) rather than
quoted.

### The guide gets the journal and the voice too (2026-07-14)

The Dziennik, the voice practice and the spoken station replies existed only in
the simulator - so the learner meeting the radio for the FIRST time, in the guide,
had no record of what the set did, no way to hear their own transmission graded,
and never once heard a station speak. All three now live in
`obsluga/InteractiveRadioCourse.tsx` as well:

- **Dziennik**: mirrors the radio's own `deviceLog` (power, channel changes, DSC
  transmissions) and, after a voice practice, the learner's transcript **word for
  word** plus one line per missing checklist item and the score.
- **Voice practice at the PTT lesson**: a radio check with the marina - the safest
  first transmission there is. Same `VoicePtt` component and the same
  `/api/radio-voice` grading as the simulator, so the two surfaces cannot drift.
- **Two station transmissions to just LISTEN to** (Marina Gdynia, and a SECURITE
  broadcast from the coast station), before ever keying the mic. Both arrive as a
  **carrier on the current channel**: they open your squelch, quiet the hiss, and
  are scaled by your volume. Set the squelch too high and you will not hear the
  station either - which is the lesson, not a bug.

## The live conversation (2026-07-14)

Speaking into a trainer that only ever writes back at you teaches half the skill.
On the water - and at the exam - you are judged on how you handle what comes
BACK: a berth number, a working channel, a question you did not expect, in a
language that is not yours, under stress. So `/radio/rozmowa` is a genuine
two-way exchange:

**you hold PTT and speak -> `/api/radio-transcribe` (gpt-4o-transcribe) turns it
into text -> the turn is graded against what it had to contain -> the station
answers OUT LOUD (`/api/radio-tts`) as a carrier on your channel, through your
squelch, scaled by your volume -> you answer back.**

Everything you said lands in the Dziennik, word for word, with one line per
missing element.

### The microphone check now proves the model understands you

A bouncing level meter proves the mic is WIRED UP. It does not prove the model
can UNDERSTAND you - and those are different failures. A learner with a lively
meter and an unusable microphone (too far, too much gain, a fan behind them)
found out only when their MAYDAY scored zero, with no idea why.

`MicCheck` now records a line and shows back exactly what the model heard. If
those are your words, the voice trainer will work. If they are not, you know
before it costs you points.

### `/api/radio-transcribe`

Transcription without grading - the smaller, dumber sibling of `/api/radio-voice`
(which still does transcription + scenario grading in one call). Two things need
it and neither wants a checklist: the mic check, and the live conversation, whose
turns are graded on the CLIENT by a pure function.

### The one bug that would have failed everyone

`dialogueGrading.ts` **normalizes both sides** of every comparison - case,
punctuation, Polish diacritics. This is not polish, it is the feature:

    gpt-4o-transcribe returns:  "Mayday! Mayday! Mayday! This is Wind Dancer..."
    a naive match for "mayday mayday mayday" MISSES IT.

A textbook-perfect distress call would have been told it was missing the word
MAYDAY. The reviewer who caught this called it a refuting case, and the test
suite now pins it (`the punctuation trap`). The same goes for
`"Pan-pan, pan-pan, pan-pan."`, `"S.P. 9012"` and `"54deg 30.5' N"`.

The `anyOf` lists are deliberately wide for the same reason: a Polish speaker's
"Wind Dancer" comes back as "Vind Dancer" or "Windancer", a call sign as loose
digits. **An element a CORRECT transmission can fail is worse than no element at
all** - it teaches the learner to distrust their own correct procedure.

### Six conversations, and what the reviewers caught

`radio-check` (2 turns), `marina-berth` (4), `ship-to-ship` (4), `vts-report` (3),
`panpan-medico` (4), `mayday-dialogue` (4). Written against IMO SMCP, then
adversarially reviewed by three lenses (procedure / speech-to-text / typography).
The procedure reviewer found real errors, all fixed:

- a **medical consultation was being held on channel 16**. A coast station moves
  urgency traffic to a working channel; a doctor talking on 16 would block the
  distress channel for the whole coast.
- the coast station **never imposed SEELONCE MAYDAY** - the single most examinable
  thing a station does after RECEIVED MAYDAY.
- **"STAND BY. OVER."** is a contradiction: OVER means "answer me now". A station
  telling you to stand by closes with OUT.
- **GDYNIA RADIO does not exist.** Distress and urgency in Polish waters are
  answered by the MRCC, which calls itself GDYNIA RESCUE RADIO. Teaching an
  invented name means calling a station that never answers.
- the learner said **OUT and the station transmitted again**. After OUT nobody
  answers - that is what OUT MEANS, and it is the lesson of the very first
  dialogue. (Pinned by a test: no dialogue may reply to an OUT.)
- the crossing rule (COLREGS 15) applies to **power-driven** vessels, so the
  ship-to-ship brief now says both yachts are under engine. Under sail the
  give-way vessel is decided by tack, and the scenario would have taught the
  wrong rule.

## Coverage of the official 26 UKE tasks

All 26 published SRC practical tasks are covered across three surfaces
(see `/radio/zadania` for the full mapping):

- **15 simulator scenarios** (`/radio/symulator`) demonstrate the
  radiotelephony + DSC procedures - all four DSC call types (Individual,
  Group, All Ships, Test) and all three categories: distress, the three
  urgency calls, safety, routine marina/VTS/ship/group, DSC test, distress
  cancel, MAYDAY relay, and the receiving side (received distress + call).
  Maps to tasks 8-13, 17-22.
- **14-lesson interactive course** (`/radio/obsluga`) drills the device
  operations - power, squelch, channels, dual watch, backlight, power
  reduction, menu, DSC compose, PTT, DISTRESS. Maps to tasks 1-5, 7.
- **26-task reference** (`/radio/zadania`) lists every task verbatim with its
  correct procedure - the single place that also covers the tasks not
  demonstrable on the VHF panel: position/time entry (14), MMSI address book
  (15-16), scan memory (6), and EPIRB/SART handling and testing (23-26).

## Roadmap (next versions)

- Make the device-only tasks demonstrable on the panel too: manual
  position/time entry, an editable MMSI address book, and scan-list tagging
  (today these live only in the `/radio/zadania` procedure reference).
- A timed incoming call that arrives mid-standby (today the receiving
  scenarios start already ringing via `init`); distress-relay via DSC.
- A small EPIRB/SART interactive widget (today text procedure only).
- Voice-first exam mode, GPT feedback on transcripts.
- Apply `regatta.nginx.conf` on the shared proxy so the voice trainer works
  on prod, then flip the deploy smoke check back to hard-fail.
- Per-question drill from the official UKE PDF (324 written questions) -
  answer key being authored via a verified multi-agent workflow.

## V6: offline, spoken answers, and two grading bugs worth remembering

Six additions (2026-07-15), and two lessons about grading that cost more thought
than the features did.

### What was added

| Surface | What it is |
|---|---|
| `public/sw.js` | Service worker. Offline for everything that does not need a model. |
| `/offline` | The honest fallback page: what works with no signal, and what cannot. |
| `/radio/pozycja` | Eight positions to dictate aloud, graded element by element. |
| `/sternik/ustny` | Twelve exam questions answered aloud, graded, then the model answer. |
| `WeakSpotsPanel` | What you keep getting wrong, across every trainer. |
| Backlight 0-7 | Now actually dims the LCD (`brightness(0.42 .. 1.20)`). |

### Offline: what is cached, and what must never be

The course was always *able* to run offline. The question bank is static data,
the ICOM simulator is a pure reducer, and its sound is synthesized in WebAudio
with no audio files at all. Nothing about it needed a network - it simply had no
cache. So: a cache.

- **HTML: network-first.** A stale *course* is worse than no course. Somebody
  could revise last month's procedure for an exam they take tomorrow.
- **`/_next/static/**`: cache-first.** The filename changes when the content
  does, so a hit is always correct and always fast.
- **`/api/*`: never cached.** Transcription and speech synthesis run on a server.
  A cached answer to "grade my MAYDAY" would be a lie inside a safety trainer, so
  the voice trainers state plainly that they need a network rather than
  degrading into something that looks like grading and is not.

### Grading lesson 1: three states, not two

`FIVE FOUR` comes back from `gpt-4o-transcribe` as `5-4`. The forbidden
`fifty four` comes back as `54`. That single difference is what makes the position
drill gradeable at all - and the first draft of the data accepted **both forms**,
so a textbook reading and a disqualifying one scored identically.

The obvious fix (strike the merged form) is also wrong: it fails a correct speaker
whose digits the transcriber happened to merge. In a drill whose entire subject is
precision, neither false verdict is acceptable. So an element is `ok`, `miss`, or
`warn` - and `warn` says *"heard as 54; I cannot tell whether you merged it or the
transcriber did"* instead of inventing a verdict it does not have.

### Grading lesson 2: a keyword cannot express "green is on the RIGHT"

Both colours appear in the answer that swaps them. `IALA B` - the reversed system -
scored full marks on the `IALA A` question, which is precisely the error the
question exists to catch.

Nor can a fixed phrase fix it. `prawa strona zielona` dies on the words Polish puts
in between (`prawa strona toru wodnego JEST zielona`), and a loose word-gap lets
`prawa strona czerwona, lewa zielona` through on adjacency. Nearest-word proximity
fails too, and fails in the most misleading way: in `...w prawo, a na wstecznym...
w lewo`, the word `prawo` sits four words *before* `wstecznym` while `lewo` sits
five words *after* it, so the astern element scores the starboard answer.

What works is reading it the way a person does: **by clause**. A clause naming the
side and the right colour, and not the wrong one, is the evidence; a clause naming
the side and the *wrong* colour is the reversed rule, stated, and disqualifying.
Clauses survive an unpunctuated transcript because Polish marks the contrast with a
word - `a`, `ale`, `natomiast`. See `binds()` in `src/app/sternik/ustny/oralPrompts.ts`.

A `critical` flag on `MustItem` stops the one-miss allowance from trading away a
rule stated backwards. Fumbling a supporting detail is human; getting the rule
inside out is not the same kind of mistake.

### For the app

Courses are a WebView of the live site, so all of the CONTENT and grading reaches
the app with no rebuild.

The offline caching does NOT reach the iOS app for free, and the first draft of
this section wrongly implied it did. iOS WKWebView runs no service worker unless
the app opts every course URL into `WKAppBoundDomains` in Info.plist AND sets
`configuration.limitsNavigationsToAppBoundDomains = true` - and app-bound domains
disable other things the app relies on, so it is a real decision, not a checkbox.
Until that is done, the service worker simply does not register inside the app:
the browser web experience is offline-capable, the iOS WebView is not. Android
System WebView does run service workers, so the app is offline-capable there.

The honest status, to carry into `docs/design/mobile/COURSES_OFFLINE.md`:
- Web (Safari/Chrome/Firefox on any device): offline works.
- Android app WebView: offline works.
- iOS app WebView: online only, until WKAppBoundDomains is configured and its
  trade-offs are accepted. Do not tell a user the iOS app works offline until it
  is verified in Airplane mode on a device.
