'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs, RadioVariantToggle } from '../../sternik/prefs';
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
import {
  CHANNELS, DEFAULT_VARIANT, POSITION_POOL, VESSEL_POOL, createInitialRadio, radioProfile, radioReducer,
  type RadioEvent, type RadioModel, type RadioState, type Variant,
} from './radioModel';
import { SCENARIOS, type Bi, type Scenario, type VariantData } from './scenarios';

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

type Mode = 'nauka' | 'egzamin';

function loadProgress(): ProgressMap {
  try { return JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '{}') as ProgressMap; } catch { return {}; }
}
function saveProgress(p: ProgressMap) {
  try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export default function RadioSimulatorPage() {
  const { tp, lang } = useI18n();
  const { explLang, radioRealistic } = useSternikPrefs();
  const skin = radioRealistic ? 'amber' : 'green';
  // Language policy: RU commentary only when the RU site user allows it.
  const showRu = lang === 'ru' && explLang !== 'pl';
  const showPl = explLang !== 'ru' || lang !== 'ru';
  const bi = useCallback((b: Bi) => {
    if (showRu && showPl) return `${b.ru} · ${b.pl}`;
    if (showRu) return b.ru;
    return b.pl;
  }, [showRu, showPl]);

  // --- radio state (imperative ref + render tick: avoids StrictMode double
  // side-effects that a reducer-with-effects would suffer) -------------------
  const rsRef = useRef<RadioState>(createInitialRadio());
  const [, force] = useState(0);
  const rs = rsRef.current;
  const audio = useRadioAudio(rs);

  // --- scenario engine state -------------------------------------------------
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [mode, setMode] = useState<Mode>('nauka');
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
  /** randomized per-run scenario variant: vessel identity, position, POB. */
  const [variant, setVariant] = useState<Variant>(DEFAULT_VARIANT);
  /** faceplate model (both UKE sets); DSC procedures follow the M330 manual. */
  const [model, setModel] = useState<RadioModel>('M330');
  /** Inspect ("Rozbior") mode: tap any control or display indicator to learn it.
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
    } catch { /* ignore */ }
  }, []);
  const pickModel = useCallback((m: RadioModel) => {
    setModel(m);
    if (!scenarioRef.current) {
      rsRef.current = createInitialRadio(m);
      force((n) => n + 1);
    }
    try { window.localStorage.setItem(MODEL_KEY, m); } catch { /* ignore */ }
  }, []);
  const variantData: VariantData = {
    vessel: VESSEL_POOL[variant.vesselIdx],
    posSpoken: POSITION_POOL[variant.posIdx].spoken,
    pobWord: POB_WORDS[variant.pob] ?? 'FOUR',
    pob: variant.pob,
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
          if (m.detect(e, prev, next, doneRef.current)) {
            // Record the weak spot outside the state updater: an updater must be
            // pure, and StrictMode runs it twice, which double-counted the miss.
            if (!weakedRef.current.has(m.id)) {
              weakedRef.current.add(m.id);
              recordWeak('procedure', [{ id: m.id, label: m.text.pl }]);
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
      if (step && !doneRef.current.has(step.id) && step.check(e, prev, next)) {
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
    const distress = screen === 'distress-ack' || screen === 'rx-distress-alert';
    const otherDsc = screen === 'otherdsc-ack' || screen === 'rx-individual-call';
    if (!distress && !otherDsc) return undefined;

    audioRef.current.play(distress ? 'alarm-start' : 'call-alert');
    if (distress) return () => audioRef.current.play('alarm-stop');

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
    // "AI examiner" variability: every run draws a fresh vessel identity,
    // position and crew size - the voice checklists adapt server-side.
    const v: Variant = {
      vesselIdx: Math.floor(Math.random() * VESSEL_POOL.length),
      posIdx: Math.floor(Math.random() * POSITION_POOL.length),
      pob: 2 + Math.floor(Math.random() * 5),
    };
    setVariant(v);
    const vessel = VESSEL_POOL[v.vesselIdx];
    const posDef = POSITION_POOL[v.posIdx];
    const initial = createInitialRadio(model, vessel, { lat: posDef.lat, lon: posDef.lon });
    rsRef.current = sc.init
      ? { ...initial, ...sc.init(vessel), model, vessel, pos: { lat: posDef.lat, lon: posDef.lon } }
      : initial;
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
    force((n) => n + 1);
  }, [model, stopHold]);

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
      pushLog(`🎙 ${tp('Ты сказал', 'You said', 'Powiedziales')}: "${r.transcript.trim()}"`, 'tx');
      for (const c of r.checks.filter((x) => !x.ok)) {
        pushLog(`✗ ${tp('Не прозвучало', 'Missing', 'Nie padlo')}: ${c.label}`, 'bad');
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
            ? stationReply(kind, VESSEL_POOL[variantRef.current.vesselIdx].name)
            : pickReaction(
                r.checks.filter((c) => !c.ok).map((c) => c.id),
                { distress: /mayday|pan|securite/.test(kind), unreadable: !r.transcript.trim() },
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
  }, [pushLog, tp]);

  // score + persistence on finish
  const doneCount = scenario ? scenario.steps.filter((s) => doneRef.current.has(s.id)).length : 0;
  const procScore = scenario ? Math.max(0, Math.round((doneCount / scenario.steps.length) * 100) - mistakes.length * 10) : 0;
  const finalScore = voiceResult ? Math.round(procScore * 0.65 + voiceResult.score * 0.35) : procScore;
  useEffect(() => {
    if (!scenario || finishedAt === null || startedAt === null) return;
    const timeSec = Math.round((finishedAt - startedAt) / 1000);
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

  // ==========================================================================
  return (
    <main id="sternik-radio-sim">
      <div className="mb-2">
        <Link href="/radio" className="text-sm" style={{ color: 'var(--accent-cyan)' }}>
          {'<'} {tp('Раздел рации', 'Radio section', 'Dzial radio')}
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        🎙️ {tp('Симулятор рации: ICOM', 'Radio simulator: ICOM', 'Symulator radia: ICOM')} {model === 'M323' ? 'IC-M323' : 'IC-M330GE'}
      </h1>
      <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Учебная копия рации, которую UKE использует на практической части SRC. Панель, меню и процедура DISTRESS - по официальной инструкции ICOM.',
          'A training replica of the radio UKE uses in the SRC practical. Panel, menus and the DISTRESS procedure follow the official ICOM manual.',
          'Treningowa kopia radia, ktorego UKE uzywa na czesci praktycznej SRC. Panel, menu i procedura DISTRESS - wg oficjalnej instrukcji ICOM.',
        )}
      </p>

      {/* ============ scenario picker (home) ============ */}
      {!scenario && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Выбери сценарий', 'Pick a scenario', 'Wybierz scenariusz')}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              · {tp('прогресс сохраняется на этом устройстве', 'progress is saved on this device', 'postep zapisuje sie na tym urzadzeniu')}
            </span>
            {/* The tour used to be a one-shot: shown once, then locked behind a
                localStorage flag with no way back to it. Anyone who skipped it -
                or cleared it by finishing once - could never see it again. */}
            <button
              type="button"
              data-testid="replay-onboarding"
              onClick={() => setOnboardStep(0)}
              className="min-h-[36px] rounded-full px-3 text-xs font-semibold"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              ❔ {tp('Как это работает', 'How this works', 'Jak to dziala')}
            </button>
            {/* model picker - both sets appear at the UKE practical; the third
                option repaints the set as the real amber IC-M330GE hardware */}
            <div className="ml-auto">
              <RadioVariantToggle model={model} onModel={pickModel} />
            </div>
          </div>
          {model === 'M323' && (
            <div className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Профиль IC-M323: клавиша CLEAR, отдельное дерево меню, цикл ручки VOL -> SQL -> CH -> подсветка, таймер повтора 3:42 и завершение отмены без отдельного STBY.',
                'IC-M323 profile: CLEAR key, its own menu tree, VOL -> SQL -> CH -> backlight dial cycle, 3:42 repeat timer, and cancel completion without a separate STBY step.',
                'Profil IC-M323: klawisz CLEAR, osobne drzewo menu, cykl pokretla VOL -> SQL -> CH -> podswietlenie, czas powtorki 3:42 i zakonczenie odwolania bez osobnego STBY.',
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {SCENARIOS.map((sc) => {
              const pr = progress[sc.id];
              return (
                <div key={sc.id} data-testid={`scenario-${sc.id}`} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-2xl">{sc.icon}</div>
                    {pr && (
                      <div className="text-right text-xs" style={{ color: pr.best >= 90 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {pr.best >= 90 ? '✓ ' : ''}{tp('лучший', 'best', 'najlepiej')} {pr.best}% · {pr.attempts}x
                      </div>
                    )}
                  </div>
                  <div className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>{bi(sc.title)}</div>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bi(sc.brief)}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      data-testid={`start-nauka-${sc.id}`}
                      onClick={() => startScenario(sc, 'nauka')}
                      className="min-h-[40px] flex-1 rounded-xl px-3 text-sm font-semibold"
                      style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                    >
                      {tp('Обучение', 'Learn', 'Nauka')}
                    </button>
                    <button
                      type="button"
                      data-testid={`start-egzamin-${sc.id}`}
                      onClick={() => startScenario(sc, 'egzamin')}
                      className="min-h-[40px] flex-1 rounded-xl px-3 text-sm font-medium"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                    >
                      {tp('Экзамен', 'Exam', 'Egzamin')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            💡 {tp(
              'Обучение - подсказки и «почему» на каждом шаге. Экзамен - только ситуация, разбор в конце. Голосовые передачи можно наговорить в микрофон - Whisper оценит структуру.',
              'Learn mode shows hints and the "why" for every step. Exam mode gives only the situation, debrief at the end. Voice transmissions can be spoken into the mic - Whisper grades the structure.',
              'Nauka - wskazowki i "dlaczego" na kazdym kroku. Egzamin - tylko sytuacja, omowienie na koncu. Transmisje glosowe mozesz nagrac mikrofonem - Whisper oceni strukture.',
            )}
          </div>
        </>
      )}

      {/* ============ active scenario ============ */}
      {scenario && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              {scenario.icon} {bi(scenario.title)}
            </span>
            <span className="rounded-full px-3 py-1 text-xs" style={{ background: learning ? 'rgba(0,212,255,0.12)' : 'rgba(255,210,74,0.12)', color: learning ? 'var(--accent-cyan)' : 'var(--warning)' }}>
              {learning ? tp('Обучение', 'Learn', 'Nauka') : tp('Экзамен', 'Exam', 'Egzamin')}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⏱ {fmtTime(elapsedSec)}</span>
            <button type="button" data-testid="exit-scenario" onClick={exitScenario} className="ml-auto min-h-[44px] rounded-lg px-3 text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              ✕ {tp('Выйти', 'Exit', 'Wyjdz')}
            </button>
          </div>

          <div className={`grid gap-4 ${radioRealistic ? 'xl:grid-cols-[minmax(0,760px)_1fr]' : 'lg:grid-cols-[minmax(0,460px)_1fr]'}`}>
            <div>
              {/* Inspect ("Rozbior") toggle - tap any part of the radio to learn it */}
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  data-testid="inspect-toggle"
                  onClick={() => { setInspect((v) => !v); setInspectKey(null); }}
                  aria-pressed={inspect}
                  className="min-h-[40px] rounded-xl px-3 text-sm font-semibold transition"
                  style={inspect
                    ? { background: '#ffce4d', color: '#3a2a00' }
                    : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  🔍 {tp('Разбор', 'Inspect', 'Rozbior')}
                </button>
                <button
                  type="button"
                  data-testid="sound-toggle"
                  onClick={audio.toggleMute}
                  aria-pressed={!audio.muted}
                  className="min-h-[40px] rounded-xl px-3 text-sm font-semibold transition"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  {audio.muted ? '🔇' : '🔊'} {tp('Звук', 'Sound', 'Dzwiek')}
                </button>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {inspect
                    ? tp(
                        'Нажми на любую кнопку или индикатор экрана - объясню, что это. Рация не управляется.',
                        'Tap any control or display indicator - it explains itself. The radio is not operated.',
                        'Dotknij dowolnego przycisku lub wskaznika na ekranie - wyjasni sie sam. Radio nie dziala.',
                      )
                    : tp('Не знаешь, что за кнопка? Включи разбор.', 'Not sure what a control does? Turn on Inspect.', 'Nie wiesz, co robi przycisk? Wlacz Rozbior.')}
                </span>
              </div>

              <div onPointerDownCapture={audio.unlock}>
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
              />
              </div>

              {/* what the tapped part is */}
              {inspect && <InspectPanel inspectKey={inspectKey} showPl={showPl} showRu={showRu} />}
            </div>

            <div className="min-w-0">
              {/* brief + variant card */}
              <div className="mb-3 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {tp('Ситуация', 'Situation', 'Sytuacja')}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bi(scenario.brief)}</p>
                <div data-testid="variant-card" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-xl px-3 py-2 font-mono text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  <span>⛵ {variantData.vessel.name}</span>
                  <span>MMSI {variantData.vessel.mmsi}</span>
                  <span>{variantData.vessel.call}</span>
                  <span>POB {variantData.pob}</span>
                  <span>{POSITION_POOL[variant.posIdx].lat} {POSITION_POOL[variant.posIdx].lon}</span>
                </div>
              </div>

              {/* finished -> debrief; else current step */}
              {finishedAt !== null ? (
                <div data-testid="debrief" role="status" aria-live="polite" className="mb-3 rounded-2xl p-4" style={{ background: 'linear-gradient(140deg,var(--bg-card),rgba(0,212,255,0.08))', border: '1px solid var(--border-subtle)' }}>
                  <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{tp('Разбор', 'Debrief', 'Omowienie')}</div>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-4xl font-extrabold" style={{ color: mistakes.length === 0 && finalScore >= 70 ? 'var(--success)' : 'var(--text-primary)' }}>{finalScore}%</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {tp('шаги', 'steps', 'kroki')} {doneCount}/{scenario.steps.length} · ⏱ {fmtTime(elapsedSec)}
                      {voiceResult && <> · 🎙️ {voiceResult.score}%</>}
                    </span>
                  </div>
                  {mistakes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {mistakes.map((m) => (
                        <li key={m.id} style={{ color: 'var(--danger, #ff6a5a)' }}>✗ {bi(m.text)}</li>
                      ))}
                    </ul>
                  )}
                  {scenario.debrief && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{bi(scenario.debrief)}</p>
                  )}
                  {/* full why-walkthrough in the debrief (always, esp. for exam mode) */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>
                      {tp('Почему именно так - по шагам', 'Why it works this way - step by step', 'Dlaczego wlasnie tak - krok po kroku')}
                    </summary>
                    <ol className="mt-2 space-y-2 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'decimal' }}>
                      {scenario.steps.map((st) => (
                        <li key={st.id}>
                          <span style={{ color: doneRef.current.has(st.id) ? 'var(--success)' : 'var(--danger, #ff6a5a)' }}>
                            {doneRef.current.has(st.id) ? '✓' : '✗'} {bi(st.todo)}
                          </span>
                          <div className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{bi(st.why)}</div>
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
                          {tp('Как надо было', 'How it should have sounded', 'Jak to mialo brzmiec')}
                        </span>
                        <button
                          type="button"
                          data-testid="play-model"
                          disabled={playingModel}
                          onClick={() => void playModel()}
                          className="min-h-[36px] rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
                          style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                        >
                          {playingModel ? tp('Звучит...', 'Playing...', 'Odtwarzam...') : tp('▶ Послушать эталон', '▶ Play the model', '▶ Posluchaj wzorca')}
                        </button>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
{modelLines.join('\n')}
                      </pre>
                      {voiceResult && (
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {tp('Ты сказал', 'You said', 'Powiedziales')}: &quot;{voiceResult.transcript.trim().slice(0, 220)}&quot;
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button type="button" data-testid="retry" onClick={() => startScenario(scenario, mode)} className="min-h-[42px] rounded-xl px-4 text-sm font-semibold" style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}>
                      {tp('Ещё раз', 'Again', 'Jeszcze raz')}
                    </button>
                    <button type="button" onClick={exitScenario} className="min-h-[42px] rounded-xl px-4 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                      {tp('К сценариям', 'Scenarios', 'Do scenariuszy')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* progress through steps */}
                  <div className="mb-3 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        {tp('Задание', 'Task', 'Zadanie')} {Math.min(stepIdx + 1, scenario.steps.length)}/{scenario.steps.length}
                      </span>
                      <span className="flex items-center gap-2">
                        {/* "?" - show me on the radio which control this step wants.
                            Learning mode only: in the exam the task text is hidden on
                            purpose, so a hint would hand the answer over. */}
                        {learning && (
                          <button
                            type="button"
                            data-testid="hint-btn"
                            onClick={showHint}
                            title={tp('Подсказать - показать на рации', 'Hint - show it on the radio', 'Podpowiedz - pokaz na radiu')}
                            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-sm font-bold transition active:scale-95"
                            style={{ background: 'rgba(255,206,77,0.15)', color: 'var(--hl-amber, #ffce4d)', border: '1px solid rgba(255,206,77,0.45)' }}
                          >
                            ?
                          </button>
                        )}
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doneCount} ✓</span>
                      </span>
                    </div>
                    {hintNone && (
                      <div data-testid="hint-none" className="mb-2 text-xs" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                        {tp(
                          'Сейчас нажимать нечего - жди ответа станции.',
                          'Nothing to press right now - wait for the station to answer.',
                          'Teraz nic nie naciskasz - czekaj na odpowiedz stacji.',
                        )}
                      </div>
                    )}
                    {learning && currentStep ? (
                      <>
                        <div data-testid="current-todo" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bi(currentStep.todo)}</div>
                        <div className="mt-2 rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-secondary)' }}>
                          💡 {bi(currentStep.why)}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {tp('Режим экзамена: действуй сам, разбор будет в конце.', 'Exam mode: act on your own, debrief at the end.', 'Tryb egzaminu: dzialaj sam, omowienie na koncu.')}
                      </div>
                    )}
                  </div>

                  {/* voice phase */}
                  {currentStep?.voice && (
                    <div className="mb-3">
                      <VoicePtt
                        ref={voicePttRef}
                        kind={currentStep.voice.kind}
                        lines={currentStep.voice.lines(variantData)}
                        vesselIdx={variant.vesselIdx}
                        positionIdx={variant.posIdx}
                        pob={variant.pob}
                        ru={showRu}
                        hideScript={!learning}
                        allowLinePractice={learning}
                        minimumScore={70}
                        onComplete={onVoiceComplete}
                      />
                    </div>
                  )}
                </>
              )}

              {/* action log */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>📋 {tp('Журнал', 'Log', 'Dziennik')}</div>
                {pageLog.length === 0 ? (
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tp('пусто - начни с включения рации', 'empty - start by powering on', 'pusto - zacznij od wlaczenia radia')}</div>
                ) : (
                  <ol data-testid="action-log" className="max-h-64 space-y-1 overflow-y-auto">
                    {pageLog.map((r, i) => {
                      const rel = startedAt ? Math.max(0, Math.round((r.t - startedAt) / 1000)) : 0;
                      const color = r.kind === 'bad' ? 'var(--danger, #ff6a5a)' : r.kind === 'step' ? 'var(--success)' : r.kind === 'tx' ? 'var(--warning)' : r.kind === 'rx' ? 'var(--accent-cyan)' : 'var(--text-secondary)';
                      return (
                        <li key={i} className="flex gap-2 text-xs" style={{ color }}>
                          <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>{fmtTime(rel)}</span>
                          <span>{r.text}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============ onboarding overlay ============ */}
      {onboardStep !== null && (
        <div data-testid="onboarding" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4,12,18,0.82)' }} role="dialog" aria-modal="true">
          <div ref={onboardRef} className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {[
              {
                icon: '📻',
                h: tp('Это копия настоящей рации', 'This is a replica of the real radio', 'To kopia prawdziwego radia'),
                p: tp('ICOM IC-M330GE - именно на ней (или IC-M323) сдают практику SRC в UKE. Все кнопки, меню и экраны работают как в оригинале.', 'ICOM IC-M330GE - the set used at the UKE SRC practical. Every key, menu and screen works like the original.', 'ICOM IC-M330GE - na nim (lub IC-M323) zdaje sie praktyke SRC w UKE. Kazdy klawisz, menu i ekran dziala jak w oryginale.'),
              },
              {
                icon: '🗺️',
                h: tp('Сценарии из реальной жизни', 'Real-life scenarios', 'Scenariusze z zycia'),
                p: tp('Пожар, человек за бортом, поломка, ложный алерт... Каждый шаг объясняется: почему так и зачем.', 'Fire, man overboard, breakdown, false alert... Every step is explained: why this way.', 'Pozar, czlowiek za burta, awaria, falszywy alert... Kazdy krok jest wyjasniony: dlaczego wlasnie tak.'),
              },
              {
                icon: '🎓',
                h: tp('Два режима', 'Two modes', 'Dwa tryby'),
                p: tp('Обучение - подсказки на каждом шаге. Экзамен - как в UKE: только ситуация, разбор в конце. Прогресс сохраняется.', 'Learn - hints at every step. Exam - like at UKE: situation only, debrief at the end. Progress is saved.', 'Nauka - wskazowki na kazdym kroku. Egzamin - jak w UKE: tylko sytuacja, omowienie na koncu. Postep sie zapisuje.'),
              },
              {
                icon: '🔍',
                h: tp('Не знаешь кнопку - включи Разбор', 'Do not know a key? Turn on Inspect', 'Nie znasz klawisza? Wlacz Rozbior'),
                p: tp('В режиме "Разбор" рация не работает: жми любую кнопку, индикатор или экран - она объяснит, что это, зачем нужна и когда используется. А кнопка "?" подсветит ту кнопку, которую надо нажать сейчас.', 'In Inspect mode the radio does not react: tap any key, indicator or the screen and it explains what it is, why it exists and when you use it. The "?" button spotlights the control you need right now.', 'W trybie Rozbior radio nie dziala: dotknij dowolnego klawisza, wskaznika lub ekranu, a wyjasni, co to jest, po co i kiedy sie tego uzywa. Przycisk "?" podswietli klawisz, ktory masz teraz nacisnac.'),
              },
              {
                icon: '🔊',
                h: tp('Слушай рацию', 'Listen to the radio', 'Sluchaj radia'),
                p: tp('У рации есть звук: шум эфира, писк клавиш, отказ на 70-м канале, тревога DSC. Шумоподавитель (SQL) настраивают на слух - задерёшь порог ради тишины и не услышишь слабый далёкий вызов. Именно это и проверяют на экзамене.', 'The radio has sound: the hiss of an open channel, key beeps, the refusal on channel 70, the DSC alarm. Squelch is set BY EAR - turn it up for silence and you go deaf to the weak distant call. That is what the exam is testing.', 'Radio ma dzwiek: szum eteru, piski klawiszy, odmowa na kanale 70, alarm DSC. Blokade szumow (SQL) ustawia sie SLUCHEM - podkrec ja dla ciszy, a oglochniesz na slabe, dalekie wywolanie. Wlasnie to sprawdza egzamin.'),
              },
              {
                icon: '🎤',
                h: tp('Говори в эфир, станция ответит голосом', 'Speak on air - the station answers out loud', 'Mow do eteru - stacja odpowie glosem'),
                p: tp('MAYDAY и PAN-PAN наговариваешь в микрофон. Речь распознаётся, структура сообщения проверяется по чек-листу, а в дневнике остаётся дословно то, что ты сказал, и то, чего не хватило. Береговая станция отвечает голосом, как в эфире.', 'You speak MAYDAY and PAN-PAN into the mic. The speech is transcribed, the message structure is graded against a checklist, and the journal keeps your exact words plus what was missing. The coast station answers out loud, as it would on air.', 'MAYDAY i PAN-PAN mowisz do mikrofonu. Mowa jest rozpoznawana, struktura komunikatu oceniana wedlug listy, a w dzienniku zostaje doslownie to, co powiedziales, i to, czego zabraklo. Stacja brzegowa odpowiada glosem, jak w eterze.'),
              },
            ].map((card, i) => (i === onboardStep ? (
              <div key={i}>
                <div className="text-3xl">{card.icon}</div>
                <div className="mt-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{card.h}</div>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.p}</p>
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
                  className="min-h-[40px] rounded-lg px-3 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {tp('Пропустить', 'Skip', 'Pomin')}
                </button>
                <button
                  type="button"
                  data-testid="onboard-next"
                  onClick={() => {
                    if (onboardStep >= 5) dismissOnboarding();
                    else setOnboardStep(onboardStep + 1);
                  }}
                  className="min-h-[40px] rounded-xl px-4 text-sm font-semibold"
                  style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                >
                  {onboardStep >= 5 ? tp('Начать', 'Start', 'Start') : tp('Дальше', 'Next', 'Dalej')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
