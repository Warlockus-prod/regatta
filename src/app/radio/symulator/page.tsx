'use client';

import { useRadioI18n } from "@/app/radio/localization/context";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSternikPrefs, RadioVariantToggle } from "@/app/radio/prefs";
import { useFocusTrap } from '../../sternik/useFocusTrap';
import RadioFront from './RadioFront';
import VoicePtt, { type VoicePttHandle, type VoiceResult } from './VoicePtt';
import { InspectPanel } from './InspectPanel';
import { useRadioAudio } from './audio/useRadioAudio';
import { fetchStationVoice } from './audio/stationVoice';
import { SIG_STRONG, opensGate, scriptOver, signalOn } from './radioTraffic';
import { stationReply } from './stationReply';
import { pickReaction } from './stationReaction';
import { record as recordWeak } from '../weakSpots';
import { hintFor } from './hints';
import { radioRuntimeSearch } from '../runtimeSearch';
import {
  CHANNELS, DEFAULT_VARIANT, VESSEL_POOL, createInitialRadio, radioProfile, radioReducer,
  type RadioEvent, type RadioModel, type RadioState, type Variant,
} from './radioModel';
import { SCENARIOS, type Bi, type Scenario, type VariantData } from './scenarios';
import { trackRadioTaskComplete } from '@/lib/funnel';
import { InspectToggle, PanelSection, RadioWorkspace, DockPanel, SoundToggle, useRadioWorkspace } from './RadioWorkspace';
import { CONTROLS_COURSE_TASKS, PRACTICE_GROUPS, ukeTasksFor } from './practiceMenu';
import { fillPlace, placeRadio, venueById, venuesFor, type VenueId } from './venues';
import { checkLabel, useTrainerI18n } from './trainerText';

const POB_WORDS: Record<number, string> = { 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE', 6: 'SIX' };

// ============================================================================
// /radio/symulator - ICOM IC-M330GE trainer. This file wires the pure
// radio state machine + data-driven scenarios to the UI: timers (3 s DISTRESS
// hold, alert TX, coast-station ACK), the scenario engine (step checks +
// mistake detectors + why-explanations), onboarding, progress persistence and
// the Whisper voice grader. See docs/design/sternik-radio.md.
// ============================================================================

const PROGRESS_KEY = 'sternik.radio.progress.v1';
const ONBOARD_KEY = 'sternik.radio.onboard.v1';
const MODEL_KEY = 'sternik.radio.model.v1';
/** the Practice list's Learn / Exam switch, remembered between visits */
const MODE_KEY = 'sternik.radio.mode.v1';
/** simulated coast station answers this fast (real world: up to minutes). */
const ACK_DELAY_MS = 7000;

interface ScenarioProgress {
  attempts: number;
  best: number;
  lastScore: number;
  bestTimeSec: number | null;
}
type ProgressMap = Record<string, ScenarioProgress>;

interface LogRow { t: number; text: string; kind: 'tx' | 'rx' | 'ui' | 'step' | 'bad' }

function logColor(kind: LogRow['kind']): string {
  return kind === 'bad' ? 'var(--danger, #ff6a5a)' : kind === 'step' ? 'var(--success)' : kind === 'tx' ? 'var(--warning)' : kind === 'rx' ? 'var(--accent-cyan)' : 'var(--text-secondary)';
}

type Mode = 'nauka' | 'egzamin';
const FREE_PRACTICE: Scenario = {
 id:"free-practice",icon:"🎛️",title:{pl:"Swobodna praktyka",ru:"Свободная практика"},
 brief:{pl:"Poznawaj radio bez odliczania i oceny. Ustaw kanał, moc, głośność i blokadę szumów. Przełącz tryb poznawania, aby sprawdzić znaczenie elementu, albo rozpocznij prawdziwy scenariusz.",ru:"Изучай рацию без отсчета и оценки. Настрой канал, мощность, громкость и шумоподавитель. Включи изучение кнопок, чтобы узнать значение элемента, или запусти реальный сценарий."},
 steps:[],mistakes:[],needs:["coast"],
};


function loadProgress(): ProgressMap {
  try { return JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '{}') as ProgressMap; } catch { return {}; }
}
function saveProgress(p: ProgressMap) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export default function RadioSimulatorPage() {
  const { rt: radioText, tl } = useRadioI18n();
  const { tp, lang } = useTrainerI18n();
  const { explLang, radioRealistic } = useSternikPrefs();
  const skin = radioRealistic ? 'amber' : 'green';
  // The complete radio course follows the selected site or app language.
  const showRu = lang === 'ru' && explLang !== 'pl';
  const showPl = lang !== 'ru' || explLang !== 'ru';
  // The run's venue fills the place-holders ({marina}, {marinaCh}, ...); read
  // through a ref so `bi` keeps its identity across runs (dispatch depends on it).
  const venueRef = useRef(venueById(null));
  const bi = useCallback((b: Bi) => {
    const venue = venueRef.current;
    if (lang !== 'ru' && lang !== 'pl') return fillPlace(radioText(b.pl), venue, lang);
    const pl = fillPlace(b.pl, venue, 'pl');
    const ru = fillPlace(b.ru, venue, 'ru');
    if (showRu && showPl) return `${ru} · ${pl}`;
    if (showRu) return ru;
    return pl;
  }, [lang, showRu, showPl, radioText]);

  // --- radio state (imperative ref + render tick: avoids StrictMode double
  // side-effects that a reducer-with-effects would suffer) -------------------
  const rsRef = useRef<RadioState>(createInitialRadio());
  const [, force] = useState(0);
  const rs = rsRef.current;
  const audio = useRadioAudio(rs);

  // --- scenario engine state -------------------------------------------------
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [mode, setMode] = useState<Mode>('nauka');
  const freePractice = scenario?.id === FREE_PRACTICE.id;
  const [stepIdx, setStepIdx] = useState(0);
  const doneRef = useRef<Set<string>>(new Set());
  // Mistakes already tallied into weakSpots, so the tally survives StrictMode's
  // double-invoked render without counting one slip twice.
  const weakedRef = useRef<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState<{ id: string; text: Bi }[]>([]);
  const [pageLog, setPageLog] = useState<LogRow[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null);
  const voicePttRef = useRef<VoicePttHandle | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [onboardStep, setOnboardStep] = useState<number | null>(null);
  /** randomized per-run scenario variant: venue, vessel identity, position, POB. */
  const [variant, setVariant] = useState<Variant & { venueId: VenueId }>({ ...DEFAULT_VARIANT, venueId: 'gdansk' });
  const venue = venueById(variant.venueId);
  venueRef.current = venue;
  /** faceplate model (both UKE sets); DSC procedures follow the M330 manual. */
  const [model, setModel] = useState<RadioModel>('M330');
  /** Deep-linked scenarios must wait until the saved hardware model is loaded,
   *  otherwise an M323 faceplate can drive an M330 state machine. */
  const [modelReady, setModelReady] = useState(false);
  /** Inspect ("Rozbiór") mode: tap any control or display indicator to learn it.
   *  While on, taps never reach the state machine - the radio is not operated. */
  const [inspect, setInspect] = useState(false);
  const [inspectKey, setInspectKey] = useState<string | null>(null);
  /** "?" hint: the control the current step wants, spotlighted for a few sec. */
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  /** true when the step has nothing to press (e.g. waiting for the coast ACK) */
  const [hintNone, setHintNone] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);
  useEffect(() => {
    try {
      const m = window.localStorage.getItem(MODEL_KEY);
      if (m === 'M323' || m === 'M330') {
        setModel(m);
        rsRef.current = createInitialRadio(m);
        force((n) => n + 1);
      }
      if (window.localStorage.getItem(MODE_KEY) === 'egzamin') setMode('egzamin');
    } catch { /* ignore */ }
    setModelReady(true);
  }, []);
  const pickModel = useCallback((m: RadioModel) => {
    setModel(m);
    if (!scenarioRef.current) {
      rsRef.current = createInitialRadio(m);
      force((n) => n + 1);
    }
    try { window.localStorage.setItem(MODEL_KEY, m); } catch { /* ignore */ }
  }, []);
  const pickMode = useCallback((m: Mode) => {
    setMode(m);
    try { window.localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  }, []);
  /** the scenario's work screen: pinned radio, scrolling task panel */
  const { stacked, compact } = useRadioWorkspace(scenario !== null, radioRealistic);
  const position = venue.positions[variant.posIdx] ?? venue.positions[0];
  const variantData: VariantData = {
    vessel: VESSEL_POOL[variant.vesselIdx],
    posSpoken: position.spoken,
    pobWord: POB_WORDS[variant.pob] ?? 'FOUR',
    pob: variant.pob,
    venue,
  };

  // hydrate progress + onboarding
  useEffect(() => {
    setProgress(loadProgress());
    try {
      if (!window.localStorage.getItem(ONBOARD_KEY)) setOnboardStep(0);
    } catch { /* ignore */ }
  }, []);

  const dismissOnboarding = useCallback(() => {
    try { window.localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
    setOnboardStep(null);
  }, []);
  const onboardRef = useFocusTrap<HTMLDivElement>(onboardStep !== null, dismissOnboarding);

  const scenarioRef = useRef<Scenario | null>(null);
  scenarioRef.current = scenario;
  const stepIdxRef = useRef(0);
  stepIdxRef.current = stepIdx;
  const finishedRef = useRef(false);
  finishedRef.current = finishedAt !== null;
  const modeRef = useRef<Mode>('nauka');
  modeRef.current = mode;
  // read inside onVoiceComplete, which must not re-create on every variant /
  // mute change (VoicePtt holds it across a recording)
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const mutedRef = useRef(false);
  mutedRef.current = audio.muted;
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const pushLog = useCallback((text: string, kind: LogRow['kind'] = 'ui') => {
    setPageLog((l) => [...l, { t: Date.now(), text, kind }]);
  }, []);

  // --- the dispatch: run reducer, then feed the scenario engine --------------
  const dispatch = useCallback((e: RadioEvent) => {
    const prev = rsRef.current;
    const next = radioReducer(prev, e);
    rsRef.current = next;

    // the radio's own sounds - hiss behind the squelch, key beeps, the refusal
    // beep on CH 70, the DSC alarm. Read through the ref so `dispatch` stays a
    // stable identity (see the deps note below).
    audioRef.current.onEvent(e, prev, next);

    // mirror device log additions into the page log
    if (next.deviceLog.length > prev.deviceLog.length) {
      const added = next.deviceLog.slice(prev.deviceLog.length);
      setPageLog((l) => [...l, ...added.map((d) => ({ t: d.t, text: d.text, kind: d.kind as LogRow['kind'] }))]);
    }

    const sc = scenarioRef.current;
    if (sc && !finishedRef.current) {
      const isExam = modeRef.current === 'egzamin';
      // mistakes first (they may fire on any event); gated on power so a key
      // pressed on a dead radio is not graded as a procedure error
      if (prev.power || next.power) {
        for (const m of sc.mistakes) {
          if (m.detect(e, prev, next, doneRef.current, { venue: venueRef.current })) {
            // Record the weak spot outside the state updater: an updater must be
            // pure, and StrictMode runs it twice, which double-counted the miss.
            if (!weakedRef.current.has(m.id)) {
              weakedRef.current.add(m.id);
              recordWeak('procedure', [{ id: m.id, label: fillPlace(m.text.pl, venueRef.current, 'pl') }]);
            }
            setMistakes((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, { id: m.id, text: m.text }]));
            // exam integrity: no live mistake feedback in exam mode - it all
            // surfaces in the debrief
            if (!isExam) setPageLog((l) => [...l, { t: Date.now(), text: bi(m.text), kind: 'bad' }]);
          }
        }
      }
      // current step check (skip if already satisfied - voice phase pending)
      const idx = stepIdxRef.current;
      const step = sc.steps[idx];
      if (step && !doneRef.current.has(step.id) && step.check(e, prev, next, { venue: venueRef.current })) {
        doneRef.current.add(step.id);
        if (!isExam) setPageLog((l) => [...l, { t: Date.now(), text: `✓ ${bi(step.todo)}`, kind: 'step' }]);
        if (step.voice) {
          // The step advances only after VoicePtt returns a passing grade, or
          // after line practice in learning mode.
        } else if (idx + 1 >= sc.steps.length) {
          setFinishedAt(Date.now());
        } else {
          setStepIdx(idx + 1);
        }
      }
    }

    force((n) => n + 1);
    // NOT [audio]: the audio object identity used to change on every render, which
    // made dispatch (and every effect keyed on it) re-arm each second and never
    // fire the DSC timers. audioRef keeps the sound current without the dep.
  }, [bi]);

  // --- device timers -----------------------------------------------------------
  const [holdPct, setHoldPct] = useState(0);
  const holdRaf = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const distressSoundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playTone = useCallback((frequency: number, durationMs: number, gainValue = 0.03) => {
    try {
      type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtx.current) audioCtx.current = new Ctor();
      const context = audioCtx.current;
      void context.resume?.();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = gainValue;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      setTimeout(() => {
        try { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); } catch { /* ignore */ }
      }, durationMs);
    } catch { /* audio is optional */ }
  }, []);
  const stopHold = useCallback(() => {
    if (holdRaf.current !== null) cancelAnimationFrame(holdRaf.current);
    holdRaf.current = null;
    distressSoundTimers.current.forEach(clearTimeout);
    distressSoundTimers.current = [];
    setHoldPct(0);
  }, []);
  const onDistressDown = useCallback(() => {
    dispatch({ type: 'distress-down' });
    if (rsRef.current.screen !== 'distress-hold') return;
    [0, 900, 1800].forEach((delay) => {
      distressSoundTimers.current.push(setTimeout(() => playTone(1500, 100), delay));
    });
    distressSoundTimers.current.push(setTimeout(() => playTone(1500, 500), 2700));
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / 3000);
      setHoldPct(p);
      if (p >= 1) { holdRaf.current = null; setHoldPct(0); dispatch({ type: 'distress-held' }); return; }
      holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  }, [dispatch, playTone]);
  const onDistressUp = useCallback(() => {
    if (holdRaf.current !== null) { stopHold(); dispatch({ type: 'distress-up' }); }
  }, [dispatch, stopHold]);

  // transmit animations + coast ACK
  const screen = rs.screen;
  useEffect(() => {
    if (screen === 'distress-tx') {
      const id = setTimeout(() => dispatch({ type: 'distress-txdone' }), 1800);
      return () => clearTimeout(id);
    }
    if (screen === 'cancel-tx') {
      const id = setTimeout(() => dispatch({ type: 'cancel-txdone' }), 1600);
      return () => clearTimeout(id);
    }
    if (screen === 'otherdsc-sent' && rsRef.current.odAwaitingAck) {
      const id = setTimeout(() => dispatch({ type: 'otherdsc-ack' }), 2500);
      return () => clearTimeout(id);
    }
    if (screen === 'distress-wait' && scenarioRef.current?.id !== 'false-cancel') {
      const id = setTimeout(() => dispatch({ type: 'coast-ack' }), ACK_DELAY_MS);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [screen, dispatch]);

  // "Next TX after ..." countdown while waiting for ACK (1:1 with the manual).
  // The counter lives in a ref and dispatch happens in the interval callback,
  // never inside a state updater (updaters must stay pure - StrictMode
  // double-invokes them).
  const retxSeconds = radioProfile(rs.model).retxSeconds;
  const [nextTxSec, setNextTxSec] = useState(retxSeconds);
  const nextTxRef = useRef(retxSeconds);
  useEffect(() => {
    if (screen !== 'distress-wait') { nextTxRef.current = retxSeconds; setNextTxSec(retxSeconds); return undefined; }
    const id = setInterval(() => {
      if (rsRef.current.retxPaused) return;
      if (nextTxRef.current <= 1) {
        nextTxRef.current = retxSeconds;
        dispatch({ type: 'auto-retx' });
      } else {
        nextTxRef.current -= 1;
      }
      setNextTxSec(nextTxRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [screen, dispatch, retxSeconds]);

  useEffect(() => () => stopHold(), [stopHold]);

  // The key beep now comes from the audio engine (which can tell a confirmation
  // apart from a refusal - a PTT on CH 70 must not sound like success). The
  // alarm patterns below stay: they are the manual-derived DSC cadences.

  // The DSC alarm, on the real two tones: 2200 Hz and 1300 Hz, 250 ms each,
  // alternating (ITU-R M.493).
  //
  // The manuals split it in two, and so do we:
  //   - a received DISTRESS "sounds UNTIL YOU TURN IT OFF" - no timeout, ever;
  //   - every other DSC call "sounds for 2 minutes" and then stops by itself.
  // [ALARM OFF] silences both. No setting on the radio can pre-silence a distress
  // alarm, which is exactly why the Key Beep switch does not touch it.
  useEffect(() => {
    const distressAlert = screen === 'rx-distress-alert';
    const distressAck = screen === 'distress-ack';
    const otherDsc = screen === 'otherdsc-ack' || screen === 'rx-individual-call';
    if (!distressAlert && !distressAck && !otherDsc) return undefined;

    audioRef.current.play(distressAlert ? 'alarm-start' : distressAck ? 'alarm-ack-start' : 'call-alert');
    if (distressAlert || distressAck) return () => audioRef.current.play('alarm-stop');

    // a routine call alerts you too - that is the point of DSC - but it gives up
    // after two minutes, and it is not the distress two-tone
    const id = setInterval(() => audioRef.current.play('call-alert'), 4000);
    const stop = setTimeout(() => clearInterval(id), 120_000);
    return () => { clearInterval(id); clearTimeout(stop); };
    // depend on `screen` only (via audioRef): keying on `audio` re-ran this every
    // render, re-playing the alert each second and resetting the alarm tone grid.
  }, [screen]);

  // AquaQuake: "a low frequency vibration beep sounds to drain the water,
  // REGARDLESS OF THE VOLUME LEVEL SETTING" (M330GE p.14). A buzz, not a beep,
  // and the one sound on the set the VOL knob cannot touch.
  useEffect(() => {
    if (!rs.aquaActive) return undefined;
    audioRef.current.play('aqua-start');
    return () => audioRef.current.play('aqua-stop');
    // via audioRef, so re-keying on `audio` no longer restarts the buzz each render
  }, [rs.aquaActive]);

  // The scan is squelch-gated: it pauses on a busy channel instead of chopping a
  // live station into fragments ("the scan pauses until the signal disappears").
  useEffect(() => {
    if (!rs.scanActive) return undefined;
    const id = setInterval(() => {
      const s = rsRef.current;
      const busyNow = opensGate(s.squelch, signalOn(CHANNELS[s.channelIndex].num, Date.now()));
      dispatch({ type: 'scan-tick', busy: busyNow });
    }, 900);
    return () => clearInterval(id);
  }, [dispatch, rs.scanActive]);

  // Dual Watch actually samples CH 16 and parks there when someone is on it.
  useEffect(() => {
    if (!rs.dualWatch) return undefined;
    const id = setInterval(() => {
      const s = rsRef.current;
      const sixteenBusy = opensGate(s.squelch, signalOn('16', Date.now()));
      dispatch({ type: 'dw-tick', sixteenBusy });
    }, 1200);
    return () => clearInterval(id);
  }, [dispatch, rs.dualWatch]);
  useEffect(() => () => { void audioCtx.current?.close().catch(() => {}); }, []);

  // 1 s stopwatch tick while a scenario is running (elapsed is derived from
  // Date.now() at render time)
  useEffect(() => {
    if (!scenario || finishedAt !== null) return undefined;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [scenario, finishedAt]);

  // wall clock for the LCD
  const [clock, setClock] = useState('--:--');
  useEffect(() => {
    const set = () => {
      const d = new Date();
      setClock(`${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`);
    };
    set();
    const id = setInterval(set, 15_000);
    return () => clearInterval(id);
  }, []);

  // --- scenario control -------------------------------------------------------
  const startScenario = useCallback((sc: Scenario, m: Mode) => {
    // "AI examiner" variability: every run draws a fresh venue (among those
    // that have what the scenario needs), vessel identity, position and crew
    // size - the voice checklists adapt server-side.
    const places = venuesFor(sc.needs);
    const runVenue = places[Math.floor(Math.random() * places.length)];
    const v = {
      venueId: runVenue.id,
      vesselIdx: Math.floor(Math.random() * VESSEL_POOL.length),
      posIdx: Math.floor(Math.random() * runVenue.positions.length),
      pob: 2 + Math.floor(Math.random() * 5),
    };
    setVariant(v);
    venueRef.current = runVenue;
    const vessel = VESSEL_POOL[v.vesselIdx];
    const posDef = runVenue.positions[v.posIdx];
    const initial = createInitialRadio(model, vessel, { lat: posDef.lat, lon: posDef.lon });
    rsRef.current = placeRadio(sc.init
      ? { ...initial, ...sc.init(vessel, runVenue), model, vessel, pos: { lat: posDef.lat, lon: posDef.lon } }
      : initial, runVenue);
    doneRef.current = new Set();
    weakedRef.current = new Set();
    setScenario(sc);
    setMode(m);
    setStepIdx(0);
    setMistakes([]);
    setPageLog(sc.init ? rsRef.current.deviceLog.map((d) => ({ t: d.t, text: d.text, kind: d.kind as LogRow['kind'] })) : []);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setVoiceResult(null);
    stopHold();
    // the scenario replaces the picker at the top of the page (desktop: the
    // list may have been scrolled far down)
    window.scrollTo({ top: 0 });
    force((n) => n + 1);
  }, [model, stopHold]);

  const deepLinkStartedRef = useRef(false);
  useEffect(() => {
    if (!modelReady) return;
    if (deepLinkStartedRef.current) return;
    const requestedId = new URLSearchParams(radioRuntimeSearch()).get('scenario');
    if (!requestedId) return;
    const requested = SCENARIOS.find((item) => item.id === (requestedId === "mob-panpan" ? "mob-mayday" : requestedId));
    if (!requested) return;
    deepLinkStartedRef.current = true;
    try { window.localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
    setOnboardStep(null);
    startScenario(requested, 'nauka');
  }, [modelReady, startScenario]);

  const exitScenario = useCallback(() => {
    setScenario(null);
    setFinishedAt(null);
    setStartedAt(null);
    rsRef.current = createInitialRadio(model);
    stopHold();
    force((n) => n + 1);
  }, [model, stopHold]);

  /** "?" - spotlight whatever the CURRENT step wants pressed right now. */
  const showHint = useCallback(() => {
    const step = scenarioRef.current?.steps[stepIdxRef.current];
    if (!step) return;
    const target = hintFor(step.id, rsRef.current);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintTarget(target);
    setHintNone(!target);
    hintTimer.current = setTimeout(() => { setHintTarget(null); setHintNone(false); }, 3500);
  }, []);

  const onVoiceComplete = useCallback((r: VoiceResult | null) => {
    setVoiceResult(r);
    const sc = scenarioRef.current;
    if (!sc) return;
    const idx = stepIdxRef.current;

    // The Dziennik records what you SAID, not just which buttons you pressed.
    // Without this the learner sees a score and has no way to know which words
    // were missing - and the missing words are the whole lesson.
    if (r) {
      pushLog(`${r.inputMode === 'typed' ? '⌨' : '🎙'} ${r.inputMode === 'typed' ? tp('Ты ввёл', 'You entered', 'Wpisałeś') : tp('Ты сказал', 'You said', 'Powiedziałeś')}: "${r.transcript.trim()}"`, 'tx');
      for (const c of r.checks.filter((x) => !x.ok)) {
        pushLog(`✗ ${tp('Не прозвучало', 'Missing', 'Nie padło')}: ${checkLabel(c.label, lang, radioText)}`, 'bad');
      }
      // remember it: a thing failed eight times is a pattern, not eight incidents
      recordWeak(
        'voice',
        r.checks.filter((c) => !c.ok).map((c) => ({ id: c.id, label: c.label })),
        r.checks.filter((c) => c.ok).map((c) => ({ id: c.id })),
      );
      pushLog(`${tp('Оценка передачи', 'Transmission graded', 'Ocena nadania')}: ${r.score}%`, r.score >= 70 ? 'step' : 'ui');

      // and the station answers OUT LOUD - as a carrier on the channel you are
      // sitting on, so it is gated by YOUR squelch and scaled by YOUR volume,
      // exactly like every other signal. Set the squelch too high and you miss
      // the coast station's answer, which is the lesson, not a bug.
      const step = sc.steps[idx];
      const kind = step?.voice?.kind;
      // A good call gets the scenario reply; a poor one (where the station used
      // to stay silent) now gets a spoken re-prompt from the coast station -
      // "say again", "what is your position, over" - the same as real life.
      const line = kind
        ? (r.score >= 40
            ? stationReply(kind, VESSEL_POOL[variantRef.current.vesselIdx].name, venueRef.current)
            : pickReaction(
                r.checks.filter((c) => !c.ok).map((c) => c.id),
                { distress: /mayday|pan|securite/.test(kind), unreadable: !r.transcript.trim(), station: venueRef.current.coast?.call },
              ))
        : null;
      if (line) {
        pushLog(`📻 ${line.station}: ${line.say}`, 'rx');
        void (async () => {
          const raw = await fetchStationVoice(line.say);
          if (!raw) return;
          const voiceMs = (await audioRef.current?.speak(raw)) ?? 0;
          if (voiceMs <= 0) return;
          const s = rsRef.current;
          // a coast station alongside is a strong signal - it breaks any squelch
          // except a maxed-out one, and it quiets the hiss under it. The carrier
          // lasts as long as the voice, so the squelch closes when it stops.
          scriptOver(CHANNELS[s.channelIndex].num, {
            startMs: Date.now(),
            durMs: Math.round(voiceMs) + 300,
            signal: SIG_STRONG,
            voice: 'male',
          });
        })();
      }
    }

    if (idx + 1 >= sc.steps.length) setFinishedAt(Date.now());
    else setStepIdx(idx + 1);
  }, [lang, pushLog, tp, radioText]);

  // score + persistence on finish
  const doneCount = scenario ? scenario.steps.filter((s) => doneRef.current.has(s.id)).length : 0;
  const procScore = scenario?.steps.length ? Math.max(0, Math.round((doneCount / scenario.steps.length) * 100) - mistakes.length * 10) : 0;
  const finalScore = voiceResult ? Math.round(procScore * 0.65 + voiceResult.score * 0.35) : procScore;
  useEffect(() => {
    if (!scenario || scenario.id === FREE_PRACTICE.id || finishedAt === null || startedAt === null) return;
    const timeSec = Math.round((finishedAt - startedAt) / 1000);
    trackRadioTaskComplete(scenario.id, finalScore);
    setProgress((p) => {
      const prev = p[scenario.id] ?? { attempts: 0, best: 0, lastScore: 0, bestTimeSec: null };
      const nextP: ProgressMap = {
        ...p,
        [scenario.id]: {
          attempts: prev.attempts + 1,
          best: Math.max(prev.best, finalScore),
          lastScore: finalScore,
          bestTimeSec: prev.bestTimeSec === null ? timeSec : Math.min(prev.bestTimeSec, timeSec),
        },
      };
      saveProgress(nextP);
      return nextP;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedAt]);

  const elapsedSec = startedAt ? Math.round(((finishedAt ?? Date.now()) - startedAt) / 1000) : 0;

  // The model transmission for this scenario's voice step, if it has one.
  const modelLines: string[] = (() => {
    const step = scenario?.steps.find((s) => s.voice);
    return step?.voice ? step.voice.lines(variantData) : [];
  })();

  const [playingModel, setPlayingModel] = useState(false);
  const playModel = useCallback(async () => {
    if (modelLines.length === 0 || playingModel) return;
    setPlayingModel(true);
    try {
      const a = audioRef.current;
      a.unlock();
      const say = modelLines.join(' ');
      const raw = await fetchStationVoice(say);
      // No audio (offline, no TTS key) means no transmission. Marking the channel
      // BUSY for silence would be the simulator lying about the air, in the one
      // trainer whose whole claim is that it never fakes anything.
      if (!raw) return;
      const voiceMs = await a.speak(raw);
      if (voiceMs <= 0) return;
      const s = rsRef.current;
      // Length the carrier to the ACTUAL decoded speech, so the squelch closes
      // the moment the voice stops - it comes over the air like any other
      // transmission, not out of a speaker bolted onto the page.
      scriptOver(CHANNELS[s.channelIndex].num, {
        startMs: Date.now(), durMs: Math.round(voiceMs) + 300, signal: SIG_STRONG, voice: 'male',
      });
    } finally {
      setPlayingModel(false);
    }
  }, [modelLines, playingModel]);
  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const currentStep = scenario?.steps[stepIdx];
  const learning = mode === 'nauka';
  const lastLog = pageLog.length > 0 ? pageLog[pageLog.length - 1] : null;

  // A new step, the debrief, or a part tapped in Rozbiór: the panel goes back
  // to its top, so the new text sits right under the radio instead of off
  // screen where the learner had scrolled to.
  const dockRef = useRef<HTMLDivElement | null>(null);
  const debriefShown = finishedAt !== null;
  useEffect(() => {
    dockRef.current?.scrollTo({ top: 0 });
  }, [stepIdx, debriefShown, inspect, inspectKey]);

  // ==========================================================================
  return (
    <div id="sternik-radio-sim">
      {/* ============ screen 1: the Practice list ============
          One list for everything practised on the radio (owner, 2026-10-24:
          fewer tabs, one or two screens): the controls lessons first, then the
          scenarios grouped by what you do on air, then the voice drills. One
          mode switch above the list instead of two buttons on every card; a
          row is a single tap into the work screen. */}
      {!scenario && (
        <>
          <div className="mb-1 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {radioText(tp('Практика на рации ICOM', 'Practice on the ICOM radio', 'Trening na radiu ICOM'))}
            </h1>
            {/* The tour used to be a one-shot: shown once, then locked behind a
                localStorage flag with no way back to it. Anyone who skipped it -
                or cleared it by finishing once - could never see it again. */}
            <button
              type="button"
              data-testid="replay-onboarding"
              onClick={() => setOnboardStep(0)}
              aria-label={radioText(tp('Как это работает', 'How this works', 'Jak to działa'))}
              title={radioText(tp('Как это работает', 'How this works', 'Jak to działa'))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              ?
            </button>
          </div>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {radioText(tp(
              'Учебная копия раций с практической части SRC в UKE. Меню и процедуры - по инструкциям ICOM.',
              'A training replica of the radios used in the UKE SRC practical. Menus and procedures follow the ICOM manuals.',
              'Treningowa kopia radiotelefonów z części praktycznej SRC w UKE. Menu i procedury wg instrukcji ICOM.',
            ))}
          </p>

          <button type="button" data-testid="start-free-practice" onClick={()=>startScenario(FREE_PRACTICE,"nauka")} className="mb-4 flex min-h-[56px] w-full items-center justify-between rounded-xl border px-4 py-3 text-left font-semibold" style={{borderColor:"var(--accent-cyan)",color:"var(--accent-cyan)",background:"var(--bg-card)"}}>
            {radioText("Swobodna praktyka: poznaj radio bez oceny")} <span aria-hidden="true">›</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl" role="group" aria-label={radioText(tp('Режим', 'Mode', 'Tryb'))} style={{ border: '1px solid var(--border-subtle)' }}>
              {(['nauka', 'egzamin'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`mode-${m}`}
                  onClick={() => pickMode(m)}
                  aria-pressed={mode === m}
                  className="min-h-[44px] px-4 text-sm font-semibold"
                  style={mode === m
                    ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
                    : { background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                >
                  {radioText(m === 'nauka' ? tp('Обучение', 'Learn', 'Nauka') : tp('Экзамен', 'Exam', 'Egzamin'))}
                </button>
              ))}
            </div>
            {/* model picker - both sets appear at the UKE practical; the third
                option repaints the set as the real amber IC-M330GE hardware.
                Folded into a chip: it is chosen once, not before every run. */}
            <details className="group relative" data-testid="radio-model-picker">
              <summary
                className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-sm font-semibold"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                📻 {radioText(model === 'M323' ? 'IC-M323' : radioRealistic ? tp('M330 реальный', 'M330 real', 'M330 realny') : 'IC-M330')}
                <span aria-hidden className="group-open:rotate-180">⌄</span>
              </summary>
              <div className="mt-2 rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <RadioVariantToggle model={model} onModel={pickModel} />
                {model === 'M323' && (
                  <div className="mt-2 max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
                    {radioText(tp(
                      'Профиль IC-M323: клавиша CLEAR, отдельное дерево меню, цикл ручки VOL -> SQL -> CH -> подсветка и завершение отмены без отдельного STBY. Интервал повтора DSC у обеих моделей случайный: 3,5-4,5 минуты.',
                      'IC-M323 profile: CLEAR key, its own menu tree, VOL -> SQL -> CH -> backlight dial cycle, and cancel completion without a separate STBY step. Both models randomize the DSC repeat interval between 3.5 and 4.5 minutes.',
                      'Profil IC-M323: klawisz CLEAR, osobne drzewo menu, cykl pokrętła VOL -> SQL -> CH -> podświetlenie i zakończenie odwołania bez osobnego STBY. W obu modelach odstęp powtórki DSC jest losowy: 3,5-4,5 minuty.',
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
          <p className="mb-4 mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {radioText(mode === 'nauka'
              ? tp('Обучение: подсказка и «почему» на каждом шаге.', 'Learn: a hint and the "why" at every step.', 'Nauka: wskazówka i "dlaczego" na każdym kroku.')
              : tp('Экзамен: только ситуация, разбор в конце.', 'Exam: the situation only, debrief at the end.', 'Egzamin: tylko sytuacja, omówienie na końcu.'))}
            {radioText(' ')}{radioText(tp('Прогресс сохраняется на этом устройстве.', 'Progress is saved on this device.', 'Postęp zapisuje się na tym urządzeniu.'))}
          </p>

          {/* first steps: the controls lessons, on the same pinned radio */}
          <Link
            href="/radio/obsluga?kurs=1"
            data-testid="practice-controls"
            className="flex min-h-[56px] items-center gap-3 rounded-2xl px-4 py-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <span className="w-7 shrink-0 text-center text-xl" aria-hidden>🎛️</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-5" style={{ color: 'var(--text-primary)' }}>
                {radioText(tp('Первые шаги: управление рацией', 'First steps: the radio controls', 'Pierwsze kroki: obsługa radia'))}
              </span>
              <span className="block text-xs leading-4" style={{ color: 'var(--text-muted)' }}>
                {radioText(tp('уроки на кнопках рации', 'lessons on the radio keys', 'lekcje na przyciskach radia'))} · {radioText(tp('зад. UKE', 'UKE tasks', 'zad. UKE'))} {radioText(CONTROLS_COURSE_TASKS.join(', '))}
              </span>
            </span>
            <span aria-hidden style={{ color: 'var(--text-muted)' }}>›</span>
          </Link>

          {PRACTICE_GROUPS.map((group) => (
            <section key={group.id} className="mt-5" aria-labelledby={`practice-${group.id}`}>
              <h2 id={`practice-${group.id}`} className="mb-1.5 ml-0.5 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {radioText(bi(group.title))}
              </h2>
              <ul className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                {group.scenarios.map((id, i) => {
                  const sc = SCENARIOS.find((s) => s.id === id);
                  if (!sc) return null;
                  const pr = progress[sc.id];
                  const tasks = ukeTasksFor(sc.id);
                  return (
                    <li key={sc.id} data-testid={`scenario-${sc.id}`} style={i > 0 ? { borderTop: '1px solid var(--border-subtle)' } : undefined}>
                      <button
                        type="button"
                        data-testid={`start-${sc.id}`}
                        onClick={() => startScenario(sc, mode)}
                        className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left"
                      >
                        <span className="w-7 shrink-0 text-center text-xl" aria-hidden>{radioText(sc.icon)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold leading-5" style={{ color: 'var(--text-primary)' }}>{radioText(bi(sc.title))}</span>
                          {tasks.length > 0 && (
                            <span className="block text-xs leading-4" style={{ color: 'var(--text-muted)' }}>
                              {radioText(tasks.length === 1 ? tp('зад. UKE', 'UKE task', 'zad. UKE') : tp('зад. UKE', 'UKE tasks', 'zad. UKE'))} {radioText(tasks.join(', '))}
                            </span>
                          )}
                        </span>
                        {pr && (
                          <span className="shrink-0 text-xs font-semibold" style={{ color: pr.best >= 90 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {radioText(pr.best >= 90 ? '✓ ' : '')}{radioText(pr.best)}%
                          </span>
                        )}
                        <span aria-hidden style={{ color: 'var(--text-muted)' }}>›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="mt-5" aria-labelledby="practice-voice">
            <h2 id="practice-voice" className="mb-1.5 ml-0.5 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {radioText(tp('Голосовые упражнения', 'Voice drills', 'Ćwiczenia głosowe'))}
            </h2>
            <ul className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              {[
                { href: '/radio/rozmowa', icon: '🎙️', title: tp('Живой разговор со станцией', 'Live conversation with a station', 'Rozmowa na żywo ze stacją'), note: tl({ ru: 'Голосовая или текстовая практика', en: 'Voice or typed practice', pl: 'Ćwiczenia głosowe lub tekstowe', es: 'Práctica por voz o por escrito', fr: 'Entraînement oral ou écrit', de: 'Üben per Sprache oder Text', it: 'Esercitazioni vocali o scritte' }) },
                { href: '/radio/pozycja', icon: '🧭', title: tp('Диктовка позиции', 'Position dictation', 'Dyktowanie pozycji'), note: null },
              ].map((item, i) => (
                <li key={item.href} style={i > 0 ? { borderTop: '1px solid var(--border-subtle)' } : undefined}>
                  <Link href={item.href} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                    <span className="w-7 shrink-0 text-center text-xl" aria-hidden>{radioText(item.icon)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-5" style={{ color: 'var(--text-primary)' }}>{radioText(item.title)}</span>
                      {item.note && <span className="block text-xs leading-4" style={{ color: 'var(--text-muted)' }}>{radioText(item.note)}</span>}
                    </span>
                    <span aria-hidden style={{ color: 'var(--text-muted)' }}>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <nav className="mt-4 flex flex-wrap gap-x-6" aria-label={radioText(tp('Справка', 'Reference', 'Ściągi'))}>
            <Link href="/radio/zadania" className="flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-4" style={{ color: 'var(--text-secondary)' }}>
              📋 {radioText(tp('Все 26 заданий UKE', 'All 26 UKE tasks', 'Wszystkie 26 zadań UKE'))}
            </Link>
            <Link href="/radio/sciaga" className="flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-4" style={{ color: 'var(--text-secondary)' }}>
              📄 {radioText(tp('Шпаргалка', 'Cheat sheet', 'Ściąga'))}
            </Link>
          </nav>
        </>
      )}

      {/* ============ active scenario ============
          The radio is pinned and stays usable while the task panel under it
          scrolls (owner, 2026-10-24: "the radio on top, like the boat, the
          tasks slide out below"). Nothing is drawn over the radio. Layout:
          RadioWorkspace.module.css. */}
      {scenario && (
        <RadioWorkspace
          stacked={stacked}
          onExit={exitScenario}
          exitTestId="exit-scenario"
          exitTitle={tp('Выйти к сценариям', 'Back to the scenarios', 'Wyjdź do scenariuszy')}
          status={(
            <>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: learning ? 'rgba(0,212,255,0.12)' : 'rgba(255,210,74,0.12)', color: learning ? 'var(--accent-cyan)' : 'var(--warning)' }}>
                {radioText(learning ? tp('Обучение', 'Learn', 'Nauka') : tp('Экзамен', 'Exam', 'Egzamin'))}
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>⏱ {radioText(fmtTime(elapsedSec))}</span>
              {!stacked && (
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{radioText(scenario.icon)} {radioText(bi(scenario.title))}</span>
              )}
            </>
          )}
          actions={(
            <>
              <InspectToggle on={inspect} onToggle={() => { setInspect((v) => !v); setInspectKey(null); }} testId="inspect-toggle" />
              <SoundToggle muted={audio.muted} onToggle={audio.toggleMute} />
            </>
          )}
          onRadioPointerDown={audio.unlock}
          radio={(
            <RadioFront
              s={rs}
              dispatch={dispatch}
              model={model}
              holdPct={holdPct}
              onDistressDown={onDistressDown}
              onDistressUp={onDistressUp}
              onPttDown={() => {
                dispatch({ type: 'ptt-down' });
                voicePttRef.current?.startRecording();
              }}
              onPttUp={() => {
                dispatch({ type: 'ptt-up' });
                voicePttRef.current?.stopRecording();
              }}
              clock={clock}
              nextTxSec={nextTxSec}
              inspect={inspect}
              onInspect={setInspectKey}
              inspectKey={inspectKey}
              highlightControl={hintTarget ?? undefined}
              busy={audio.busy}
              skin={skin}
              realistic={radioRealistic}
              compact={compact}
            />
          )}
          requestedPanel={inspect ? "help" : "task"}
          requestVersion={stepIdx}
          dockRef={dockRef}
          dock={(
            <>
              {/* what the tapped part is: first in the panel, so the answer is
                  visible right under the radio without scrolling */}
              <DockPanel id="help" label={tp("Справка", "Help", "Pomoc")}>
                <InspectPanel inspectKey={inspectKey} showPl={showPl} showRu={showRu} onSelect={(key)=>{setInspect(true);setInspectKey(key);}} className="" />
              </DockPanel>
              <DockPanel id="task" label={tp("Задание", "Task", "Zadanie")}>

              {/* finished -> debrief; else current step */}
              {freePractice ? (
                <div className="space-y-4" data-testid="free-practice-guide">
                  <h2 className="text-lg font-semibold">{radioText("Poznaj radio w swoim tempie")}</h2>
                  <p className="text-sm leading-relaxed" style={{color:"var(--text-secondary)"}}>{radioText(FREE_PRACTICE.brief.pl)}</p>
                  <ol className="list-inside list-decimal space-y-2 text-sm">
                    <li>{radioText("Przytrzymaj [DIAL] przez sekundę, aby włączyć radio.")}</li>
                    <li>{radioText("Naciśnij [DIAL], wybierz VOL lub SQL i użyj strzałek obrotu.")}</li>
                    <li>{radioText("Sprawdź kanały i [HI/LO]. Kanał 70 nie pozwala na nadawanie głosem.")}</li>
                    <li>{radioText("Otwórz MENU i ćwicz DSC. To symulacja: żaden sygnał nie jest nadawany na prawdziwej częstotliwości.")}</li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="min-h-[44px] rounded-lg border px-3" onClick={()=>{setInspect(true);setInspectKey("dial");}}>{radioText("Wyjaśnij pokrętło i przyciski")}</button>
                    <button type="button" className="min-h-[44px] rounded-lg border px-3" onClick={()=>startScenario(FREE_PRACTICE,"nauka")}>{radioText("Przywróć ustawienia ćwiczenia")}</button>
                  </div>
                  <h3 className="font-semibold">{radioText("Uruchom sytuację")}</h3>
                  <div className="divide-y" style={{borderColor:"var(--border-subtle)"}}>{SCENARIOS.map(sc=><button key={sc.id} type="button" className="flex min-h-[44px] w-full items-center justify-between py-2 text-left text-sm" onClick={()=>{setInspect(false);startScenario(sc,"nauka");}}><span>{sc.icon} {radioText(bi(sc.title))}</span><span aria-hidden="true">›</span></button>)}</div>
                </div>
              ) : finishedAt !== null ? (
                <div data-testid="debrief" role="status" aria-live="polite" className="rounded-2xl p-4" style={{ background: 'linear-gradient(140deg,var(--bg-card),rgba(0,212,255,0.08))', border: '1px solid var(--border-subtle)' }}>
                  <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{radioText(tp('Разбор', 'Debrief', 'Omówienie'))}</div>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-4xl font-extrabold" style={{ color: mistakes.length === 0 && finalScore >= 70 ? 'var(--success)' : 'var(--text-primary)' }}>{radioText(finalScore)}%</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {radioText(tp('шаги', 'steps', 'kroki'))} {radioText(doneCount)}/{radioText(scenario.steps.length)} · ⏱ {radioText(fmtTime(elapsedSec))}
                      {voiceResult && <> · {voiceResult.inputMode === 'typed' ? '⌨' : '🎙️'} {radioText(voiceResult.score)}%</>}
                    </span>
                  </div>
                  {mistakes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {mistakes.map((m) => (
                        <li key={m.id} style={{ color: 'var(--danger, #ff6a5a)' }}>✗ {radioText(bi(m.text))}</li>
                      ))}
                    </ul>
                  )}
                  {scenario.debrief && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(bi(scenario.debrief))}</p>
                  )}
                  {/* full why-walkthrough in the debrief (always, esp. for exam mode) */}
                  <details className="mt-3">
                    <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>
                      {radioText(tp('Почему именно так - по шагам', 'Why it works this way - step by step', 'Dlaczego właśnie tak - krok po kroku'))}
                    </summary>
                    <ol className="mt-2 space-y-2 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'decimal' }}>
                      {scenario.steps.map((st) => (
                        <li key={st.id}>
                          <span style={{ color: doneRef.current.has(st.id) ? 'var(--success)' : 'var(--danger, #ff6a5a)' }}>
                            {radioText(doneRef.current.has(st.id) ? '✓' : '✗')} {radioText(bi(st.todo))}
                          </span>
                          <div className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{radioText(bi(st.why))}</div>
                        </li>
                      ))}
                    </ol>
                  </details>
                  {/* "This is how it should have sounded." The debrief listed the
                      misses but never showed the target - and a learner who is
                      told what they got wrong, without ever hearing what right
                      sounds like, has to invent it. The model transmission plays
                      out loud, through the receiver, in a radio voice. */}
                  {modelLines.length > 0 && (
                    <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                          {radioText(tp('Как надо было', 'How it should have sounded', 'Jak to miało brzmieć'))}
                        </span>
                        <button
                          type="button"
                          data-testid="play-model"
                          disabled={playingModel}
                          onClick={() => void playModel()}
                          className="min-h-[44px] rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
                          style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                        >
                          {radioText(playingModel ? tp('Звучит...', 'Playing...', 'Odtwarzam...') : tp('▶ Послушать эталон', '▶ Play the model', '▶ Posłuchaj wzorca'))}
                        </button>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
  {radioText(modelLines.join('\n'))}
                      </pre>
                      {voiceResult && (
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {voiceResult.inputMode === 'typed' ? tp('Ты ввёл', 'You entered', 'Wpisałeś') : tp('Ты сказал', 'You said', 'Powiedziałeś')}{radioText(": \"")}{voiceResult.transcript.trim().slice(0, 220)}{radioText("\" ")}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button type="button" data-testid="retry" onClick={() => startScenario(scenario, mode)} className="min-h-[44px] rounded-xl px-4 text-sm font-semibold" style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}>
                      {radioText(tp('Ещё раз', 'Again', 'Jeszcze raz'))}
                    </button>
                    <button type="button" onClick={exitScenario} className="min-h-[44px] rounded-xl px-4 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                      {radioText(tp('К сценариям', 'Scenarios', 'Do scenariuszy'))}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* the task: what to do now, why, and the last thing that happened */}
                  <div data-testid="task-card" className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          {radioText(tp('Задание', 'Task', 'Zadanie'))} {radioText(Math.min(stepIdx + 1, scenario.steps.length))}/{radioText(scenario.steps.length)}
                          <span className="ml-2 normal-case">{radioText(doneCount)} ✓</span>
                        </div>
                        {stacked && (
                          <div className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{radioText(scenario.icon)} {radioText(bi(scenario.title))}</div>
                        )}
                      </div>
                      {/* "?" - show me on the radio which control this step wants.
                          Learning mode only: in the exam the task text is hidden on
                          purpose, so a hint would hand the answer over. */}
                      {learning && (
                        <button
                          type="button"
                          data-testid="hint-btn"
                          onClick={showHint}
                          aria-label={radioText(tp('Подсказать - показать на рации', 'Hint - show it on the radio', 'Podpowiedź - pokaż na radiu'))}
                          title={radioText(tp('Подсказать - показать на рации', 'Hint - show it on the radio', 'Podpowiedź - pokaż na radiu'))}
                          className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-sm font-bold transition active:scale-95"
                          style={{ background: 'rgba(255,206,77,0.15)', color: 'var(--hl-amber, #ffce4d)', border: '1px solid rgba(255,206,77,0.45)' }}
                        >
                          ?
                        </button>
                      )}
                    </div>
                    {hintNone && (
                      <div data-testid="hint-none" className="mb-2 text-xs" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                        {radioText(tp(
                          'Сейчас нажимать нечего - жди ответа станции.',
                          'Nothing to press right now - wait for the station to answer.',
                          'Teraz nic nie naciskasz - czekaj na odpowiedź stacji.',
                        ))}
                      </div>
                    )}
                    {learning && currentStep ? (
                      <>
                        <div data-testid="current-todo" className="text-base font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{radioText(bi(currentStep.todo))}</div>
                        <div className="mt-2 rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-secondary)' }}>
                          💡 {radioText(bi(currentStep.why))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {radioText(tp('Режим экзамена: действуй сам, разбор будет в конце.', 'Exam mode: act on your own, debrief at the end.', 'Tryb egzaminu: działaj sam, omówienie na końcu.'))}
                      </div>
                    )}
                    {/* the newest log line, so a mistake or a confirmation shows up
                        next to the task instead of only at the bottom of the log */}
                    {lastLog && (
                      <div data-testid="last-event" className="mt-2 flex gap-2 text-xs" style={{ color: logColor(lastLog.kind) }}>
                        <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>{radioText(tp('Последнее', 'Last', 'Ostatnio'))}:</span>
                        <span className="min-w-0">{radioText(lastLog.text)}</span>
                      </div>
                    )}
                  </div>

                  {/* voice phase */}
                  {currentStep?.voice && (
                    <VoicePtt
                      key={`${scenario.id}-${currentStep.id}`}
                      ref={voicePttRef}
                      kind={currentStep.voice.kind}
                      lines={currentStep.voice.lines(variantData)}
                      vesselIdx={variant.vesselIdx}
                      positionIdx={variant.posIdx}
                      venue={variant.venueId}
                      pob={variant.pob}
                      ru={showRu}
                      hideScript={!learning}
                      allowLinePractice={learning}
                      minimumScore={70}
                      onComplete={onVoiceComplete}
                    />
                  )}
                </>
              )}

              </DockPanel>
              <DockPanel id="situation" label={tp("Ситуация", "Situation", "Sytuacja")}>
              {/* situation + this run's vessel card */}
              <PanelSection
                title={radioText((
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {tp('Ситуация', 'Situation', 'Sytuacja')}
                  </span>
                ))}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(bi(scenario.brief))}</p>
                <div data-testid="variant-card" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-xl px-3 py-2 font-mono text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  <span data-testid="variant-area">📍 {radioText(venue.area[lang])}</span>
                  <span>⛵ {radioText(variantData.vessel.name)}</span>
                  <span>MMSI {radioText(variantData.vessel.mmsi)}</span>
                  <span>{radioText(variantData.vessel.call)}</span>
                  <span>POB {radioText(variantData.pob)}</span>
                  <span>{radioText(position.lat)} {radioText(position.lon)}</span>
                </div>
              </PanelSection>

              </DockPanel>
              <DockPanel id="log" label={tp("Журнал", "Log", "Dziennik")}>
              {/* action log */}
              <PanelSection
                title={radioText((
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    📋 {tp('Журнал', 'Log', 'Dziennik')} {pageLog.length > 0 && <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({pageLog.length})</span>}
                  </span>
                ))}
              >
                {pageLog.length === 0 ? (
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{radioText(tp('пусто - начни с включения рации', 'empty - start by powering on', 'pusto - zacznij od włączenia radia'))}</div>
                ) : (
                  // In the stacked panel the whole panel scrolls; a second scroll
                  // box inside it would trap the thumb.
                  <ol data-testid="action-log" className={`space-y-1 ${stacked ? '' : 'max-h-64 overflow-y-auto'}`}>
                    {pageLog.map((r, i) => {
                      const rel = startedAt ? Math.max(0, Math.round((r.t - startedAt) / 1000)) : 0;
                      return (
                        <li key={i} className="flex gap-2 text-xs" style={{ color: logColor(r.kind) }}>
                          <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>{radioText(fmtTime(rel))}</span>
                          <span>{radioText(r.text)}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </PanelSection>
              </DockPanel>
            </>
          )}
        />
      )}

      {/* ============ onboarding overlay ============ */}
      {onboardStep !== null && (
        <div data-testid="onboarding" className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(4,12,18,0.82)' }} role="dialog" aria-modal="true">
          <div ref={onboardRef} className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {[
              {
                icon: '📻',
                h: tp('Это копия настоящей рации', 'This is a replica of the real radio', 'To kopia prawdziwego radia'),
                p: tp('ICOM IC-M330GE - именно на ней (или IC-M323) сдают практику SRC в UKE. Все кнопки, меню и экраны работают как в оригинале.', 'ICOM IC-M330GE - the radio used for the UKE SRC practical, along with the IC-M323. Every key, menu and display follows the original equipment.', 'ICOM IC-M330GE - na nim (lub IC-M323) zdaje się praktykę SRC w UKE. Każdy klawisz, menu i ekran działa jak w oryginale.'),
              },
              {
                icon: '🗺️',
                h: tp('Сценарии из реальной жизни', 'Real-life scenarios', 'Scenariusze z życia'),
                p: tp('Пожар, человек за бортом, поломка, ложный алерт... Каждый шаг объясняется: почему так и зачем.', 'Fire, man overboard, breakdown, false alert... Every step is explained: why this way.', 'Pożar, człowiek za burtą, awaria, fałszywy alert... Każdy krok jest wyjaśniony: dlaczego właśnie tak.'),
              },
              {
                icon: '🎓',
                h: tp('Два режима', 'Two modes', 'Dwa tryby'),
                p: tp('Обучение - подсказки на каждом шаге. Экзамен - как в UKE: только ситуация, разбор в конце. Прогресс сохраняется.', 'Learn - hints at every step. Exam - like at UKE: situation only, debrief at the end. Progress is saved.', 'Nauka - wskazówki na każdym kroku. Egzamin - jak w UKE: tylko sytuacja, omówienie na końcu. Postęp się zapisuje.'),
              },
              {
                icon: '🔍',
                h: tp('Не знаешь кнопку - включи Разбор', 'Do not know a key? Turn on Inspect', 'Nie znasz klawisza? Włącz Rozbiór'),
                p: tp('В режиме "Разбор" рация не работает: жми любую кнопку, индикатор или экран - она объяснит, что это, зачем нужна и когда используется. А кнопка "?" подсветит ту кнопку, которую надо нажать сейчас.', 'In Inspect mode the radio does not react: tap any key, indicator or the screen and it explains what it is, why it exists and when you use it. The "?" button spotlights the control you need right now.', 'W trybie Rozbiór radio nie działa: dotknij dowolnego klawisza, wskaźnika lub ekranu, a wyjaśni, co to jest, po co i kiedy się tego używa. Przycisk "?" podświetli klawisz, który masz teraz nacisnąć.'),
              },
              {
                icon: '🔊',
                h: tp('Слушай рацию', 'Listen to the radio', 'Słuchaj radia'),
                p: tp('У рации есть звук: шум эфира, писк клавиш, отказ на 70-м канале, тревога DSC. Шумоподавитель (SQL) настраивают на слух - задерёшь порог ради тишины и не услышишь слабый далёкий вызов. Именно это и проверяют на экзамене.', 'The radio has sound: the hiss of an open channel, key beeps, the refusal on channel 70, the DSC alarm. Squelch is set BY EAR - turn it up for silence and you go deaf to the weak distant call. That is what the exam is testing.', 'Radio ma dźwięk: szum eteru, piski klawiszy, odmowa na kanale 70, alarm DSC. Blokadę szumów (SQL) ustawia się SŁUCHEM - podkręć ją dla ciszy, a ogłuchniesz na słabe, dalekie wywołanie. Właśnie to sprawdza egzamin.'),
              },
              {
                icon: '🎤',
                h: tp('Говори в эфир, станция ответит голосом', 'Speak on air - the station answers out loud', 'Mów do eteru - stacja odpowie głosem'),
                p: tp('MAYDAY и PAN-PAN наговариваешь в микрофон. Речь распознаётся, структура сообщения проверяется по чек-листу, а в дневнике остаётся дословно то, что ты сказал, и то, чего не хватило. Береговая станция отвечает голосом, как в эфире.', 'You speak MAYDAY and PAN-PAN into the mic. The speech is transcribed, the message structure is graded against a checklist, and the journal keeps your exact words plus what was missing. The coast station answers out loud, as it would on air.', 'MAYDAY i PAN-PAN mówisz do mikrofonu. Mowa jest rozpoznawana, struktura komunikatu oceniana według listy, a w dzienniku zostaje dosłownie to, co powiedziałeś, i to, czego zabrakło. Stacja brzegowa odpowiada głosem, jak w eterze.'),
              },
            ].map((card, i) => (i === onboardStep ? (
              <div key={i}>
                <div className="text-3xl">{radioText(card.icon)}</div>
                <div className="mt-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{radioText(card.h)}</div>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(card.p)}</p>
              </div>
            ) : null))}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="h-1.5 w-5 rounded-full" style={{ background: i <= onboardStep ? 'var(--accent-cyan)' : 'var(--border-subtle)' }} />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={dismissOnboarding}
                  className="min-h-[44px] rounded-lg px-3 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {radioText(tp('Пропустить', 'Skip', 'Pomiń'))}
                </button>
                <button
                  type="button"
                  data-testid="onboard-next"
                  onClick={() => {
                    if (onboardStep >= 5) dismissOnboarding();
                    else setOnboardStep(onboardStep + 1);
                  }}
                  className="min-h-[44px] rounded-xl px-4 text-sm font-semibold"
                  style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                >
                  {radioText(onboardStep >= 5 ? tp('Начать', 'Start', 'Start') : tp('Дальше', 'Next', 'Dalej'))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
