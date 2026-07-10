'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../../sternik/prefs';
import { useFocusTrap } from '../../sternik/useFocusTrap';
import RadioFront, { type RadioModel } from './RadioFront';
import VoicePtt, { type VoiceResult } from './VoicePtt';
import {
  DEFAULT_VARIANT, INITIAL_RADIO, POSITION_POOL, VESSEL_POOL, radioReducer,
  type RadioEvent, type RadioState, type Variant,
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
/** manual: "Next TX after 4 min 6 sec." */
const RETX_SECONDS = 246;
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
  const { explLang } = useSternikPrefs();
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
  const rsRef = useRef<RadioState>(INITIAL_RADIO);
  const [, force] = useState(0);
  const rs = rsRef.current;

  // --- scenario engine state -------------------------------------------------
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [mode, setMode] = useState<Mode>('nauka');
  const [stepIdx, setStepIdx] = useState(0);
  const doneRef = useRef<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState<{ id: string; text: Bi }[]>([]);
  const [pageLog, setPageLog] = useState<LogRow[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [voiceArmed, setVoiceArmed] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [onboardStep, setOnboardStep] = useState<number | null>(null);
  /** randomized per-run scenario variant: vessel identity, position, POB. */
  const [variant, setVariant] = useState<Variant>(DEFAULT_VARIANT);
  /** faceplate model (both UKE sets); DSC procedures follow the M330 manual. */
  const [model, setModel] = useState<RadioModel>('M330');
  useEffect(() => {
    try {
      const m = window.localStorage.getItem(MODEL_KEY);
      if (m === 'M323' || m === 'M330') setModel(m);
    } catch { /* ignore */ }
  }, []);
  const pickModel = useCallback((m: RadioModel) => {
    setModel(m);
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

  const pushLog = useCallback((text: string, kind: LogRow['kind'] = 'ui') => {
    setPageLog((l) => [...l, { t: Date.now(), text, kind }]);
  }, []);

  // --- the dispatch: run reducer, then feed the scenario engine --------------
  const dispatch = useCallback((e: RadioEvent) => {
    const prev = rsRef.current;
    const next = radioReducer(prev, e);
    rsRef.current = next;

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
          setVoiceArmed(true); // scenario waits for the voice phase to finish
        } else if (idx + 1 >= sc.steps.length) {
          setFinishedAt(Date.now());
        } else {
          setStepIdx(idx + 1);
        }
      }
    }

    force((n) => n + 1);
  }, [bi]);

  // --- device timers -----------------------------------------------------------
  const [holdPct, setHoldPct] = useState(0);
  const holdRaf = useRef<number | null>(null);
  const stopHold = useCallback(() => {
    if (holdRaf.current !== null) cancelAnimationFrame(holdRaf.current);
    holdRaf.current = null;
    setHoldPct(0);
  }, []);
  const onDistressDown = useCallback(() => {
    dispatch({ type: 'distress-down' });
    if (rsRef.current.screen !== 'distress-hold') return;
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / 3000);
      setHoldPct(p);
      if (p >= 1) { holdRaf.current = null; setHoldPct(0); dispatch({ type: 'distress-held' }); return; }
      holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  }, [dispatch]);
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
  const [nextTxSec, setNextTxSec] = useState(RETX_SECONDS);
  const nextTxRef = useRef(RETX_SECONDS);
  useEffect(() => {
    if (screen !== 'distress-wait') { nextTxRef.current = RETX_SECONDS; setNextTxSec(RETX_SECONDS); return undefined; }
    const id = setInterval(() => {
      if (rsRef.current.retxPaused) return;
      if (nextTxRef.current <= 1) {
        nextTxRef.current = RETX_SECONDS;
        dispatch({ type: 'auto-retx' });
      } else {
        nextTxRef.current -= 1;
      }
      setNextTxSec(nextTxRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [screen, dispatch]);

  useEffect(() => () => stopHold(), [stopHold]);

  // beep on state machine beeps counter - one shared AudioContext, reused
  const lastBeep = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (rs.beeps === lastBeep.current) return;
    lastBeep.current = rs.beeps;
    try {
      type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtx.current) audioCtx.current = new Ctor();
      const ctx = audioCtx.current;
      void ctx.resume?.();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1400;
      gain.gain.value = 0.03;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => { try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch { /* ignore */ } }, 90);
    } catch { /* no audio - fine */ }
  }, [rs.beeps]);
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
    rsRef.current = {
      ...(sc.init ? sc.init(vessel) : INITIAL_RADIO),
      vessel,
      pos: { lat: posDef.lat, lon: posDef.lon },
    };
    doneRef.current = new Set();
    setScenario(sc);
    setMode(m);
    setStepIdx(0);
    setMistakes([]);
    setPageLog(sc.init ? rsRef.current.deviceLog.map((d) => ({ t: d.t, text: d.text, kind: d.kind as LogRow['kind'] })) : []);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setVoiceArmed(false);
    setVoiceResult(null);
    stopHold();
    force((n) => n + 1);
  }, [stopHold]);

  const exitScenario = useCallback(() => {
    setScenario(null);
    setFinishedAt(null);
    setStartedAt(null);
    rsRef.current = INITIAL_RADIO;
    stopHold();
    force((n) => n + 1);
  }, [stopHold]);

  const onVoiceComplete = useCallback((r: VoiceResult | null) => {
    setVoiceResult(r);
    setVoiceArmed(false);
    const sc = scenarioRef.current;
    if (!sc) return;
    const idx = stepIdxRef.current;
    if (idx + 1 >= sc.steps.length) setFinishedAt(Date.now());
    else setStepIdx(idx + 1);
  }, []);

  // score + persistence on finish
  const doneCount = scenario ? scenario.steps.filter((s) => doneRef.current.has(s.id)).length : 0;
  const procScore = scenario ? Math.max(0, Math.round((doneCount / scenario.steps.length) * 100) - mistakes.length * 10) : 0;
  useEffect(() => {
    if (!scenario || finishedAt === null || startedAt === null) return;
    const timeSec = Math.round((finishedAt - startedAt) / 1000);
    setProgress((p) => {
      const prev = p[scenario.id] ?? { attempts: 0, best: 0, lastScore: 0, bestTimeSec: null };
      const nextP: ProgressMap = {
        ...p,
        [scenario.id]: {
          attempts: prev.attempts + 1,
          best: Math.max(prev.best, procScore),
          lastScore: procScore,
          bestTimeSec: prev.bestTimeSec === null ? timeSec : Math.min(prev.bestTimeSec, timeSec),
        },
      };
      saveProgress(nextP);
      return nextP;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedAt]);

  const elapsedSec = startedAt ? Math.round(((finishedAt ?? Date.now()) - startedAt) / 1000) : 0;
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
            {/* model picker - both sets appear at the UKE practical */}
            <span className="ml-auto inline-flex overflow-hidden rounded-full" style={{ border: '1px solid var(--border-subtle)' }}>
              {(['M330', 'M323'] as RadioModel[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`model-${m}`}
                  onClick={() => pickModel(m)}
                  className="min-h-[36px] px-3 text-xs font-semibold"
                  style={model === m
                    ? { background: 'var(--accent-cyan)', color: '#04222e' }
                    : { background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                >
                  IC-{m}
                </button>
              ))}
            </span>
          </div>
          {model === 'M323' && (
            <div className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Вид панели IC-M323 (второй аппарат на практике UKE). Процедуры DSC смоделированы по прошивке IC-M330 - на M323 клавиша подписана CLEAR, ручка по умолчанию крутит громкость, а отмена алерта заканчивается без шага STBY.',
                'IC-M323 faceplate (the other UKE set). DSC procedures follow the IC-M330 firmware - on a real M323 the key is CLEAR, the dial rotates volume by default and the cancel flow ends without the STBY step.',
                'Widok panelu IC-M323 (drugi zestaw na praktyce UKE). Procedury DSC wg IC-M330 - na prawdziwym M323 klawisz to CLEAR, pokretlo domyslnie zmienia glosnosc, a odwolanie alertu konczy sie bez kroku STBY.',
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
                      style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
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
            <span className="rounded-full px-3 py-1 text-xs" style={{ background: learning ? 'rgba(0,212,255,0.12)' : 'rgba(255,210,74,0.12)', color: learning ? 'var(--accent-cyan)' : '#ffd24a' }}>
              {learning ? tp('Обучение', 'Learn', 'Nauka') : tp('Экзамен', 'Exam', 'Egzamin')}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⏱ {fmtTime(elapsedSec)}</span>
            <button type="button" data-testid="exit-scenario" onClick={exitScenario} className="ml-auto min-h-[44px] rounded-lg px-3 text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              ✕ {tp('Выйти', 'Exit', 'Wyjdz')}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_1fr]">
            <div>
              <RadioFront
                s={rs}
                dispatch={dispatch}
                model={model}
                holdPct={holdPct}
                onDistressDown={onDistressDown}
                onDistressUp={onDistressUp}
                onPttDown={() => dispatch({ type: 'ptt-down' })}
                onPttUp={() => dispatch({ type: 'ptt-up' })}
                clock={clock}
                nextTxSec={nextTxSec}
              />
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
                <div data-testid="debrief" className="mb-3 rounded-2xl p-4" style={{ background: 'linear-gradient(140deg,var(--bg-card),rgba(0,212,255,0.08))', border: '1px solid var(--border-subtle)' }}>
                  <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{tp('Разбор', 'Debrief', 'Omowienie')}</div>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-4xl font-extrabold" style={{ color: mistakes.length === 0 ? 'var(--success)' : 'var(--text-primary)' }}>{procScore}%</span>
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
                  <div className="mt-3 flex gap-2">
                    <button type="button" data-testid="retry" onClick={() => startScenario(scenario, mode)} className="min-h-[42px] rounded-xl px-4 text-sm font-semibold" style={{ background: 'var(--accent-cyan)', color: '#04222e' }}>
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
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        {tp('Задание', 'Task', 'Zadanie')} {Math.min(stepIdx + 1, scenario.steps.length)}/{scenario.steps.length}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doneCount} ✓</span>
                    </div>
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
                  {voiceArmed && currentStep?.voice && (
                    <div className="mb-3">
                      <VoicePtt
                        kind={currentStep.voice.kind}
                        lines={currentStep.voice.lines(variantData)}
                        vesselIdx={variant.vesselIdx}
                        ru={showRu}
                        hideScript={!learning}
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
                      const color = r.kind === 'bad' ? 'var(--danger, #ff6a5a)' : r.kind === 'step' ? 'var(--success)' : r.kind === 'tx' ? '#ffd24a' : r.kind === 'rx' ? 'var(--accent-cyan)' : 'var(--text-secondary)';
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
                icon: '🎤',
                h: tp('Говори в эфир', 'Speak on air', 'Mow do eteru'),
                p: tp('MAYDAY и PAN-PAN можно наговорить в микрофон - Whisper распознает речь и проверит структуру сообщения по чек-листу.', 'You can speak MAYDAY and PAN-PAN into the mic - Whisper transcribes it and checks the message structure.', 'MAYDAY i PAN-PAN mozesz nagrac mikrofonem - Whisper rozpozna mowe i sprawdzi strukture komunikatu.'),
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
                {[0, 1, 2, 3].map((i) => (
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
                    if (onboardStep >= 3) dismissOnboarding();
                    else setOnboardStep(onboardStep + 1);
                  }}
                  className="min-h-[40px] rounded-xl px-4 text-sm font-semibold"
                  style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
                >
                  {onboardStep >= 3 ? tp('Начать', 'Start', 'Start') : tp('Дальше', 'Next', 'Dalej')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
