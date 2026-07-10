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
  RadioFront.tsx  visual panel following the manual's layout: speaker + red
                  DISTRESS under a flip cover, amber dot-matrix LCD with
                  softkey label row, ENT/arrows/CLR/MENU cluster, round
                  16/C, PWR/VOL/SQL dial, fist-mic PTT bar; per-model
                  faceplate + control-highlight hook for the guide course
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

## Roadmap (next versions)

- **15 scenarios ship today** covering all four DSC call types (Individual,
  Group, All Ships, Test) and all three categories: distress, the three
  urgency calls, safety, routine marina/VTS/ship/group, DSC test, distress
  cancel, MAYDAY relay, plus the receiving side (received distress + received
  individual call). Remaining
  nice-to-haves: a timed incoming call that arrives mid-standby (today the
  receiving scenarios start already ringing via `init`), an on-device MMSI
  address book, distress-relay via DSC (not just voice), and EPIRB/SART
  dummies. None are core to the SRC practical.
- OTHER DSC free MMSI address book (today: fixed 3-entry list), Distress
  relay, EPIRB/SART dummies (exam card includes them).
- Voice-first exam mode, GPT feedback on transcripts.
- Apply `regatta.nginx.conf` on the shared proxy so the voice trainer works
  on prod, then flip the deploy smoke check back to hard-fail.
- Per-question drill from the official UKE PDF (324 questions) - answer
  key being authored via a verified multi-agent workflow.
