# /radio - VHF radio + SRC certificate section

URL: weektoregatta.com/radio (moved from /sternik/radio on 2026-07-10;
permanent redirects keep the old paths working). Own layout + subnav,
shares the sternik language preferences (SternikPrefsProvider).

Status: shipped 2026-07-10. Owner: Shared lane (sternik section).
Covers: the content page `/radio`, the simulator `/radio/symulator`,
and the voice-grading API `/api/radio-voice`.

## What this is

A dedicated learning section for the marine VHF radio and the Polish SRC
operator certificate (Swiadectwo operatora lacznosci bliskiego zasiegu),
built for a user who is actually taking the UKE exam. Three parts:

1. **Content page** (`src/app/radio/page.tsx`) - what the SRC is,
   the UKE exam system (where/how/cost), VHF channels, distress procedures,
   phonetic alphabet, cheat sheet, official links.
2. **Simulator** (`src/app/radio/symulator/*`) - an interactive
   replica of the ICOM IC-M330GE with guided real-life scenarios.
3. **Voice grading** (`src/app/api/radio-voice/route.ts`) - Whisper
   transcription + deterministic checklist scoring of spoken MAYDAY /
   PAN-PAN / SECURITE / radio-check / cancel transmissions.

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
  RadioFront.tsx  visual panel 1:1 with the manual: speaker + red DISTRESS
                  under a flip cover, amber dot-matrix LCD with softkey
                  label row, ENT/arrows/CLR/MENU cluster, round 16/C,
                  PWR/VOL/SQL dial, fist-mic PTT bar
  VoicePtt.tsx    voice phase: step-through (PTT clicks per line) or real
                  recording via MediaRecorder -> /api/radio-voice
  page.tsx        wiring: imperative dispatch (ref + render tick, avoids
                  StrictMode double effects), device timers, scenario
                  engine, onboarding, progress persistence, debrief
```

### Modeled device behavior (from the manual)

- `[DIAL]`: hold ~1 s = power on/off; push = volume screen; push again =
  squelch; rotate = channel / menu / nature navigation.
- `[16/C]`: instant channel 16.
- Softkey pages scroll with `[<]`/`[>]`; DSC softkeys hidden without MMSI.
- Menu tree: Distress / Other DSC / GPS / Configuration / DSC Log /
  Radio Settings / DSC Settings / Radio Info (last four are view-only
  stubs in the simulator).
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

- Rotary dial rendered as center button + two arrow buttons (web/touch).
- Distress-cancel flow ends on a single [FINISH] press; the real device asks
  for [FINISH] and then [STBY].
- Scenario step checks are deliberately durable (e.g. the voice step only
  requires PTT keyed on CH16) so pressing [STBY] early never bricks a run.
- Individual/Group DSC calls compose but address-book entry is not
  simulated; scan/DW/AQUA/BKLT/LOG softkeys beep and log a "not used in
  training" note.
- Coast-station ACK arrives after ~7 s (real world: up to minutes); the
  auto re-TX countdown shows the manual's 4:06 and really re-alerts at 0.
- One vessel identity (BALTIC STAR / SP 1234 / MMSI 261012345) and one
  position, matching the voice checklists.

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

Modes: **nauka** (step instructions + WHY shown live) and **egzamin**
(situation only; the full WHY walkthrough appears in the debrief).
Score: `round(100 * done/total) - 10 * mistakes`, voice score shown
separately in the debrief.

## Voice pipeline

`VoicePtt` records (MediaRecorder, opus/webm or mp4 fallback, max 45 s)
-> `POST /api/radio-voice` (multipart: `audio`, `kind`) -> OpenAI Whisper
(`whisper-1`, language=en, domain prompt with the vessel identity) ->
normalized transcript -> per-kind regex checklist (MAYDAY x3, THIS IS,
name, MMSI/call sign, position, nature, assistance, persons, OVER...)
-> `{transcript, checks[], score}`.

- Grading is deterministic code, not an LLM - stable, explainable, cheap.
- Rate limits: 12/h per session + 80/h global + the site-wide daily AI
  budget (`checkUserDailyBudget`), same pattern as `/api/sternik-chat`.
- No `OPENAI_API_KEY` -> `{fallback:true}` and the client falls back to
  step-through mode (also on mic-permission denial). The key lives in
  `.env.local` locally and in the VPS `.env` in production.

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

- Type safety: `npx tsc --noEmit` clean; production `npm run build` green.
- Independent agent QA (workflow `radio-sim-test`): full fire-mayday
  walkthrough, mistake detectors, radio-check channel discipline,
  false-cancel flow, language-policy Cyrillic scans on PL pages,
  `/api/radio-voice` contract tests incl. a synthesized `say` MAYDAY
  recording through real Whisper.
- e2e hooks: stable `data-testid` on every control
  (`dial-center`, `distress-cover`, `distress-key`, `soft-0..3`,
  `key-*`, `ptt`, `scenario-*`, `start-nauka-*`, `voice-*`, `debrief`).

## V2 additions (2026-07-10, second pass)

- **Scenario variants ("AI examiner" variability)**: every run draws a
  vessel from `VESSEL_POOL` (3 identities), a position from `POSITION_POOL`
  and a POB count (2-6). Voice lines are templates over the variant; the
  grading API accepts a `vessel` index and builds name/MMSI/call-sign
  checks from the same shared pool. A variant card (name, MMSI, call, POB,
  position) shows next to the briefing.
- **IC-M323 faceplate** (model picker, persisted in
  `sternik.radio.model.v1`): per the official IC-M323 manual the panel is
  near-identical (CLEAR vs CLR key label). NOT modeled (disclosed in the
  UI): M323 dial rotates volume by default, 5-item menu tree, cancel flow
  without the STBY step, "Next TX after 3 min 42 sec" wording.
- **Two-step cancel** FINISH -> CANCEL COMPLETE -> STBY (M330 manual flow).
- **Repo-wide XFF fix**: `clientIpKey()` in `src/lib/rate-limit.ts` keys
  limiters on the LAST X-Forwarded-For hop (nginx-appended, not spoofable);
  applied to all 9 API routes. First-hop reads remain only for analytics.
- **SVG language policy**: all Cyrillic inside teoria/SignsWeather SVG
  `<text>` nodes is now conditional on the RU site version (agent-edited,
  0 unconditional Cyrillic renders).

## Roadmap (next versions)

- OTHER DSC address book + Individual call / Position request flows,
  Distress relay, EPIRB/SART dummies (exam card includes them).
- Voice-first exam mode, GPT feedback on transcripts.
- Full behavioral M323 mode (volume-first dial, 5-item menu, no-STBY
  cancel).
- Per-question drill from the official UKE PDF (324 questions) - answer
  key being authored via a verified multi-agent workflow.
