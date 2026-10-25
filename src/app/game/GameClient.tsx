'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { playBeep, playStart, playTack, playMarkRound, playFinish, playNoGo } from '@/lib/sounds';
import { useControlPrefs } from '@/features/trainer-controls/prefs';
import { analyseRaceLocally } from '@/lib/fallback-coach';
import { missions, evaluateMission, type Mission, type RaceMetrics } from '@/data/missions';
import { useI18n } from '@/lib/i18n';
import {
  tryUpdateBestRecord,
  getBestRecord,
  formatRecordTime,
  type BestRecord,
} from '@/lib/best-times';
import { coachTitle, coachExplanation, coachFix, coachNextGoal } from '@/lib/fallback-coach';
import { saveRaceSetup, loadRaceSetup, clearRaceSetup } from '@/lib/race-resume';
// Shared sailing engine; the WebSocket server imports a generated bundle.
import {
  stepBoat, resolveCollisions, updateLap, raceAutopilotTurn, makeStandardCourse,
  WIND_DIRECTION_BASE as WIND_DIRECTION,
  calcTWA,
  angleDiff,
} from '@/lib/race-physics';
import { useVenue } from '@/features/venues/useVenue';
import { GameMenu } from './GameMenu';
import { DIFFICULTY_CONFIG, type Difficulty } from './config';
import { useRaceSceneFlags, useRaceView } from '@/features/race-3d/useRaceView';
import type { RaceSceneStats } from '@/features/race-scene/RaceScene';
import { raceRanks } from '@/features/race-3d/pose';
import { type StandingRow, type ToastTone } from '@/features/race-hud/RaceHud';
import { eventText, type RaceEvent } from '@/features/race-hud/events';
import { isEmbed } from '@/lib/theme';
import type { RaceBoat } from "@/lib/race-physics";
import type { Controls } from "@/lib/sailing-physics/types";
import { trimForDrive, createInitialState } from "@/lib/sailing-physics";
import { raceTrim } from "@/lib/race-physics";
import { planRaceGuidance, type RaceGuidance, type RaceGuidanceState } from "@/lib/race-guidance";
import { createRaceRulesState, evaluateRaceRules } from "@/lib/race-rules";
import { isNativeRace, navigateNativeRace, readRaceSearch, readNativeRaceReplay, postNativeRace, postNativeRaceStarted, type NativeRaceSnapshot } from "@/lib/race-native";
import { RaceCockpit, RaceModePicker } from "./RaceCockpit";
import { useRacePrefs } from "./race-prefs";
import { createFixedClock } from "@/features/sailing-lab/runtime/fixed-clock";
import { bindClockLifecycle } from "@/features/sailing-lab/runtime/clock-lifecycle";
import { createRaceStartupGate } from "@/lib/race-startup";
import { linkedRaceSetup } from "@/lib/race-setup";
import { raceTrimCoach } from "@/lib/race-trim-coach";
import { useSailCoachLabels } from "@/features/simulator-3d/useSailCoachLabels";
import { useRaceCopy } from "./race-copy";
import { RaceReplay } from "./RaceReplay";
import { createPendingRaceSaves, resolveFinishedFleet } from "@/lib/race-completion";

// three.js loads only when someone opens the race in 3D.
const RaceScene = dynamic(() => import('@/features/race-scene/RaceScene').then((m) => m.RaceScene), { ssr: false });

// ============================================================================
// TYPES
// ============================================================================

type GameState = 'menu' | 'briefing' | 'countdown' | 'racing' | 'finished' | 'replay';


interface Vec2 { x: number; y: number }

interface Boat extends RaceBoat {
  id: string;
  name: string;
  color: string;
  pos: Vec2;
  heading: number;       // degrees, 0 = up (north), clockwise
  speed: number;         // knots (game units)
  isPlayer: boolean;
  lapDone: number;       // 0: before start, 1: windward rounded, 2: finished
  finishTime?: number;
  speedMul: number;      // share of the force-model speed the boat makes (bots: difficulty, ADR-0007)
}

interface CourseMark {
  pos: Vec2;
  radius: number;
  label: string;       // RU, kept for back-compat (e.g. replay sharing)
  labelEn: string;
  labelPl: string;
  labelEs?: string;
  labelFr?: string;
  labelDe?: string;
  labelIt?: string;
  type: 'start' | 'windward' | 'finish';
  roundSide?: 'port' | 'starboard'; // which side to leave the mark
}

interface Course {
  marks: CourseMark[];
  startLine: { a: Vec2; b: Vec2 };
  finishLine: { a: Vec2; b: Vec2 };
}

interface LogSample {
  trim?: NativeRaceSnapshot["samples"][number]["trim"]; windDir?: number;
  t: number;
  x: number;
  y: number;
  heading: number;
  twa: number;
  speed: number;
  lap: number;
}

interface LogEvent {
  type: 'start' | 'tack' | 'mark-rounded' | 'finish' | 'no-go-entered';
  t: number;
  note?: string;
}

// Local Coaching type intentionally duplicates the runtime shape defined
// in src/lib/fallback-coach.ts. Both old (`*Ru`) and new (no-suffix) field
// names are present - new responses fill both, old replay caches only
// have the `*Ru` form. Read via helpers (`coachTitle`, `coachExplanation`,
// `coachFix`, `coachNextGoal`) imported above.
interface Coaching {
  overall: string;
  score: number;
  mistakes: Array<{
    timeStart: number;
    timeEnd: number;
    severity: 'minor' | 'major';
    titleRu: string;
    explanationRu: string;
    fixRu: string;
    title?: string;
    explanation?: string;
    fix?: string;
  }>;
  strengths: string[];
  nextGoalRu: string;
  nextGoal?: string;
}

function recordSample(boat: Boat, t: number, windDir: number): LogSample {
  return { t, x: Math.round(boat.pos.x), y: Math.round(boat.pos.y), heading: Math.round(boat.heading),
    twa: Math.round(calcTWA(boat.heading, windDir)), speed: Math.round(boat.speed * 10) / 10, lap: boat.lapDone, windDir,
    trim: boat.trim ? { mainSheet: boat.trim.mainSheet, jibSheet: boat.trim.jibSheet, reef: boat.trim.reef,
      jibFurl: boat.trim.jibFurl, mainHoisted: boat.trim.mainHoisted !== false } : undefined };
}

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

// WORLD, WIND_DIRECTION, MAX_SPEED, TURN_RATE, ACCEL and MARK_ROUND_DIST are
// imported from '@/lib/race-physics' (see top of file) - do not redefine here.


const AI_NAMES = ['Nautilus', 'Mistral', 'Trident', 'Aurora', 'Kraken', 'Borealis'];
const AI_COLORS = ['#ff6688', '#88ddff', '#ffdd44', '#aa88ff', '#ff8844', '#66ffbb'];

// ============================================================================
// SAILING PHYSICS + GEOMETRY HELPERS
// ============================================================================
// speedFactorFromTWA, calcTWA, deg2rad, distance, bearing, normalizeAngle,
// angleDiff and segmentCrossed are imported from '@/lib/race-physics' (single
// source of truth shared with the ws-server). Do not redefine them here.

// ============================================================================
// COURSE SETUP
// ============================================================================

// Labels for the marks of makeStandardCourse(), in its order (windward, start
// L, start R). The geometry is NOT repeated here: the solo race, the
// multiplayer server and the replay viewer all sail the same course from
// '@/lib/race-physics', so a moved mark moves everywhere.
const MARK_LABELS: Omit<CourseMark, 'pos' | 'radius' | 'type'>[] = [
  { label: 'Верхний знак', labelEn: 'Windward mark', labelPl: 'Znak nawietrzny', labelEs: 'Baliza de barlovento', labelFr: 'Bouée au vent', labelDe: 'Luvtonne', labelIt: 'Boa di bolina', roundSide: 'port' },
  { label: 'Старт/Финиш Л', labelEn: 'Start/Finish L', labelPl: 'Start/Meta L', labelEs: 'Salida/Llegada I', labelFr: 'Départ/Arrivée G', labelDe: 'Start/Ziel L', labelIt: 'Partenza/Arrivo S' },
  { label: 'Старт/Финиш П', labelEn: 'Start/Finish R', labelPl: 'Start/Meta P', labelEs: 'Salida/Llegada D', labelFr: 'Départ/Arrivée D', labelDe: 'Start/Ziel R', labelIt: 'Partenza/Arrivo D' },
];

const noSubscribe = () => () => {};

function makeCourse(): Course {
  const course = makeStandardCourse();
  return {
    ...course,
    marks: course.marks.map((mark, i) => ({ ...mark, ...MARK_LABELS[i] })),
  };
}

// ============================================================================
// GAME COMPONENT
// ============================================================================

export default function GamePage() {
  const { tp, tl, lang } = useI18n();
  // Scenery around the race area (src/data/venues): drawn by the canvas loop, so kept in refs.
  const { venue } = useVenue();
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  // The shared 3D scene reads the same live race refs as the controls.
  const { camera: raceCamera, setCamera: setRaceCamera } = useRaceView();
  const [cameraRevision, setCameraRevision] = useState(0);
  const sceneFlags = useRaceSceneFlags();
  // The next renderer's frame rate, written straight into its readout (no re-render).
  const statsRef = useRef<HTMLDivElement | null>(null);
  const showSceneStats = useCallback((s: RaceSceneStats) => {
    if (statsRef.current) statsRef.current.textContent = `${s.backend} · ${s.fps} fps · ${s.dpr}x`;
  }, []);
  // Inside the app (?embed=1) the site nav is hidden, so the race takes the whole height.
  const embed = useSyncExternalStore(noSubscribe, () => isNativeRace() || isEmbed(), () => false);
  const race3dLabels = useMemo(() => ({
    metres: lang === 'ru' ? 'м' : 'm',
    loading: tl({ ru: 'Загружаем яхту', en: 'Loading the yacht', pl: 'Ładujemy jacht', es: 'Cargando el velero', fr: 'Chargement du voilier', de: 'Yacht wird geladen', it: 'Caricamento della barca' }),
    scene: tl({ ru: '3D-вид гонки', en: '3D race view', pl: 'Widok 3D wyścigu', es: 'Vista 3D de la regata', fr: 'Vue 3D de la course', de: '3D-Rennansicht', it: 'Vista 3D della regata' }),
    error: tl({ ru: '3D не загрузилось. Повтори загрузку.', en: "3D did not load. Retry loading.", pl: '3D się nie wczytało. Ponów ładowanie.', es: 'El 3D no se cargó. Reintenta la carga.', fr: "La 3D ne s'est pas chargée. Relance le chargement.", de: '3D wurde nicht geladen. Erneut laden.', it: 'Il 3D non si è caricato. Riprova il caricamento.' }),
    retry: tl({ ru: 'Повторить', en: 'Try again', pl: 'Spróbuj ponownie', es: 'Reintentar', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova' }),
  }), [tl, lang]);
  const nativeRace = useSyncExternalStore(noSubscribe, isNativeRace, () => false);
  const { prefs: racePrefs, update: writeRacePrefs } = useRacePrefs();
  const [lockedMode, setLockedMode] = useState<"simple" | "pro" | null>(null);
  const playingPrefs = lockedMode === null ? racePrefs : { ...racePrefs, mode: lockedMode };
  const copy = useRaceCopy();
  const trimLabels = useSailCoachLabels();
  const copyRef = useRef(copy); copyRef.current = copy;
  const racePrefsRef = useRef(playingPrefs); racePrefsRef.current = playingPrefs;
  const [rudder, setRudderState] = useState(0);
  const rudderRef = useRef(0);
  const [trim, setTrimState] = useState<Controls>(() => raceTrim({ mainHoisted: true }));
  const trimRef = useRef(trim);
  const setTrim = useCallback((patch: Partial<Controls>) => { const next = raceTrim(patch, trimRef.current); trimRef.current = next; setTrimState(next); }, []);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const raceClockRef = useRef(0);
  const hudRefreshRef = useRef(0);
  const ruleStateRef = useRef(createRaceRulesState());
  const [ruleNotice, setRuleNotice] = useState<{text: string; until: number} | null>(null);
  const [penalty, setPenalty] = useState(0);
  const raceIdRef = useRef("");
  const [nativeSave, setNativeSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pendingNativeSaves = useRef(createPendingRaceSaves());
  const nativeReplayHydrated = useRef(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const startupGate = useRef(createRaceStartupGate());
  const simulationClockRef = useRef<ReturnType<typeof createFixedClock> | null>(null);
  const [sceneRaceId, setSceneRaceId] = useState("");
  const [sceneReady, setSceneReady] = useState(false);
  const onSceneReady = useCallback(() => {
    if (startupGate.current.rendered(sceneRaceId)) setSceneReady(true);
  }, [sceneRaceId]);
  // Daily challenge mode: read ?daily=YYYY-MM-DD&difficulty=...&wind=...
  const [dailyDay, setDailyDay] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<{ name: string; time: number; color: string; isPlayer: boolean }[]>([]);
  // Personal-best record for the current difficulty + wind bucket. Updated
  // when the player finishes; surfaces as a "NEW RECORD" banner in the
  // finish modal and a "Your best: 1:27" badge in the briefing.
  const [bestRecord, setBestRecord] = useState<BestRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [playerTWA, setPlayerTWA] = useState(0);
  const [playerSpeed, setPlayerSpeed] = useState(0);

  const boatsRef = useRef<Boat[]>([]);
  const courseRef = useRef<Course>(makeCourse());
  const guidanceStateRef = useRef<RaceGuidanceState | null>(null);
  const [routeGuidance, setRouteGuidance] = useState<RaceGuidance | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

  // Race log for AI coaching
  const logSamplesRef = useRef<LogSample[]>([]);
  const logEventsRef = useRef<LogEvent[]>([]);
  const lastSampleTimeRef = useRef<number>(0);
  const wasInNoGoRef = useRef<boolean>(false);
  const lastTackSignRef = useRef<number>(0);

  // HUD (src/features/race-hud): standings, and short race events with the
  // numbers the race measured (a tack's cost, the split at the mark, overtakes).
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const standingsKeyRef = useRef('');
  const [toast, setToast] = useState<{ id: number; text: string; tone: ToastTone } | null>(null);
  const markTimesRef = useRef<Map<string, number>>(new Map());
  const speedLogRef = useRef<{ t: number; speed: number }[]>([]);
  const turnRef = useRef<{ kind: 'tack' | 'gybe'; t: number; before: number; min: number } | null>(null);
  const shownRankRef = useRef(0);
  const pendingRankRef = useRef<{ rank: number; since: number } | null>(null);
  const showEvent = useCallback((event: RaceEvent, tone: ToastTone) => {
    setToast({ id: performance.now(), text: eventText(langRef.current, event), tone });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  // AI coaching state
  const [coachingSource, setCoachingSource] = useState<"local" | "ai">("local");
  const [coaching, setCoaching] = useState<Coaching | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState<string | null>(null);

  // Mission pass/fail state (set on finish)
  const [missionResult, setMissionResult] = useState<{ passed: boolean; reasons: string[]; mission: Mission } | null>(null);

  // Leaderboard save state (logic defined further down after deps are declared)
  const [nickname, setNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'prompting' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveAttemptedRef = useRef(false);

  // Shareable replay code
  const [replayCode, setReplayCode] = useState<string | null>(null);
  const replayAttemptedRef = useRef(false);

  // Load nickname on mount
  useEffect(() => {
    if (isNativeRace()) return;
    fetch('/api/player').then((r) => r.json()).then((d) => {
      if (d?.nickname) setNickname(d.nickname);
    }).catch(() => {});
  }, []);

  // Daily mode: read URL params and lock difficulty/wind
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const setup = linkedRaceSetup(readRaceSearch());
    if (!setup) return;
    setDifficulty(setup.difficulty);
    setWindStrength(setup.windStrength);
    setSelectedMission(missions.find(m => m.id === setup.missionId) ?? null);
    setDailyDay(setup.dailyDay);
  }, []);

  // Autopilot: holds a target heading; any input turns it off
  const [autopilotOn, setAutopilotOn] = useState(false);
  const [targetHeading, setTargetHeading] = useState(0);
  const autopilotHeadingRef = useRef<number>(0);
  // Mirror autopilot state into a ref. The rAF game-loop effect closes over its
  // deps at setup ([gameState, difficulty]) and is intentionally NOT restarted
  // on toggle, so reading `autopilotOn` directly inside it was a stale closure -
  // the button engaged/disengaged nothing. The loop reads autopilotOnRef.current.
  const autopilotOnRef = useRef(false);
  useEffect(() => { autopilotOnRef.current = autopilotOn; }, [autopilotOn]);

  const { prefs: controlPrefs, update: updateControls } = useControlPrefs();
  const muted = !controlPrefs.sound;

  // Wind strength multiplier: 0.6 (light) / 1.0 (medium) / 1.3 (heavy)
  const [windStrength, setWindStrength] = useState<'light' | 'medium' | 'heavy'>('medium');
  const windStrengthMul = windStrength === 'light' ? 0.65 : windStrength === 'heavy' ? 1.3 : 1.0;
  const windStrengthRef = useRef(windStrengthMul);
  useEffect(() => { windStrengthRef.current = windStrengthMul; }, [windStrengthMul]);

  // Mission selection: null = free race
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  // Resume offer: when the user reloaded mid-race we drop them on the
  // menu but show a "you were about to race" banner that takes them
  // back to the briefing with their original setup. The lib only stores
  // INTENT (difficulty / wind / mission), not the live race state, so
  // an interrupted race restarts from the briefing screen rather than
  // resuming mid-position. That's a deliberate trade: we lose the
  // physics state but we never crash on schema skew.
  const [resumeOffer, setResumeOffer] = useState<ReturnType<typeof loadRaceSetup>>(null);
  useEffect(() => {
    const saved = loadRaceSetup();
    if (saved && (saved.phase === 'briefing' || saved.phase === 'countdown' || saved.phase === 'racing')) {
      setResumeOffer(saved);
    }
  }, []);

  // Wind shifts (live direction + gust multiplier)
  const windDirRef = useRef<number>(WIND_DIRECTION);
  const windGustRef = useRef<number>(1.0);

  // When a mission is picked, auto-apply its difficulty + wind
  const pickMission = useCallback((m: Mission | null) => {
    setSelectedMission(m);
    if (m) {
      setDifficulty(m.difficulty);
      setWindStrength(m.windStrength);
    }
  }, []);

  // Save finished race result to leaderboard (depends on all the state above)
  const saveResult = useCallback((withNickname?: string) => {
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2 || player.finishTime == null) {
      setSaveState('error');
      setSaveError(tp('Не финишировал', 'Did not finish', 'Nie ukończono',
        { es: 'No has terminado', fr: 'Course non terminée', de: 'Nicht im Ziel', it: 'Regata non conclusa' }));
      return;
    }
    const finishTime = player.finishTime;
    const completedRaceId = raceIdRef.current;
    const completedPenalty = ruleStateRef.current.penalties.player ?? 0;
    const effectiveNick = (withNickname ?? nickname ?? '').trim();
    if (!effectiveNick) {
      setSaveState('prompting');
      return;
    }
    const tacks = logEventsRef.current.filter((e) => e.type === 'tack').length;
    const noGoEntries = logEventsRef.current.filter((e) => e.type === 'no-go-entered').length;
    const topSpeed = logSamplesRef.current.reduce((mx, s) => Math.max(mx, s.speed), 0);
    const playerRank = results.findIndex((r) => r.isPlayer) + 1;

    setSaveState('saving');
    setSaveError(null);

    const doSave = async () => {
      try {
        if (!nickname || nickname !== effectiveNick) {
          const r = await fetch('/api/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: effectiveNick }),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || tp('Не удалось сохранить ник', 'Failed to save nickname', 'Nie udało się zapisać nicku', { es: 'No se pudo guardar el apodo', fr: 'Impossible d\'enregistrer le pseudo', de: 'Nickname konnte nicht gespeichert werden', it: 'Impossibile salvare il nickname' }));
          if (raceIdRef.current === completedRaceId) setNickname(d.nickname);
        }
        const res = await fetch('/api/race-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            difficulty,
            windStrength,
            missionId: selectedMission?.id ?? null,
            finishTimeSec: finishTime + completedPenalty,
            position: playerRank || null,
            totalBoats: results.length || null,
            tacks,
            noGoEntries,
            topSpeed: Math.round(topSpeed * 10) / 10,
            score: coaching?.score ?? null,
            nicknameFallback: effectiveNick,
          }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || tp('Не удалось сохранить результат', 'Failed to save result', 'Nie udało się zapisać wyniku', { es: 'No se pudo guardar el resultado', fr: 'Impossible d\'enregistrer le résultat', de: 'Ergebnis konnte nicht gespeichert werden', it: 'Impossibile salvare il risultato' }));
        if (raceIdRef.current === completedRaceId) setSaveState('saved');
      } catch (err) {
        if (raceIdRef.current !== completedRaceId) return;
        setSaveState('error');
        setSaveError(err instanceof Error ? err.message : tp('Ошибка сети', 'Network error', 'Błąd sieci', { es: 'Error de red', fr: 'Erreur réseau', de: 'Netzwerkfehler', it: 'Errore di rete' }));
      }
    };
    void doSave();
  }, [nickname, results, difficulty, windStrength, selectedMission, coaching, tp]);

  // Auto-save when finished (once). With a stored nickname this saves
  // silently; without one saveResult() flips saveState to 'prompting' and
  // the finish overlay shows a skippable nickname prompt.
  useEffect(() => {
    if (gameState !== 'finished' || isNativeRace()) return;
    if (saveAttemptedRef.current) return;
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2) return;
    saveAttemptedRef.current = true;
    saveResult();
  }, [gameState, saveResult]);

  // Reset save state on new race
  useEffect(() => {
    if (gameState === 'briefing' || gameState === 'menu') {
      saveAttemptedRef.current = false;
      replayAttemptedRef.current = false;
      setSaveState('idle');
      setSaveError(null);
      setReplayCode(null);
    }
  }, [gameState]);

  // Auto-save replay on finish (fire and forget)
  useEffect(() => {
    if (gameState !== 'finished' || isNativeRace()) return;
    if (replayAttemptedRef.current) return;
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2) return;
    if (logSamplesRef.current.length < 5) return;
    replayAttemptedRef.current = true;
    const completedRaceId = raceIdRef.current;
    fetch('/api/replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        difficulty,
        windStrength,
        missionId: selectedMission?.id ?? null,
        finishTimeSec: player.finishTime,
        mode: racePrefsRef.current.mode,
        penaltySeconds: ruleStateRef.current.penalties.player ?? 0,
        samples: logSamplesRef.current,
        events: logEventsRef.current,
        course: courseRef.current,
        nicknameFallback: nickname ?? 'Player',
      }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then((d) => { if (raceIdRef.current === completedRaceId && d?.code) setReplayCode(d.code); })
      .catch(() => { /* silent - replay is optional */ });
  }, [gameState, difficulty, windStrength, selectedMission, nickname]);

  // -----------------------------------------------------------------------
  // Initialize boats for a new race
  // -----------------------------------------------------------------------
  const initRace = useCallback((diff: Difficulty) => {
    setLockedMode(null);
    keysRef.current.clear();
    const cfg = DIFFICULTY_CONFIG[diff];
    const course = courseRef.current;
    const lineCenter = { x: (course.startLine.a.x + course.startLine.b.x) / 2, y: course.startLine.a.y };
    const boats: Boat[] = [];

    // Player in the middle
    boats.push({
      id: 'player',
      name: copyRef.current.you,
      color: '#00d4ff',
      pos: { x: lineCenter.x, y: lineCenter.y + 30 },
      heading: 45,
      speed: 0,
      isPlayer: true,
      lapDone: 0,
      speedMul: 1,
    });

    // Opponents spread along the line
    const spread = 140;
    for (let i = 0; i < cfg.opponents; i++) {
      const t = cfg.opponents === 1 ? 0 : (i / (cfg.opponents - 1)) * 2 - 1; // -1..1
      boats.push({
        id: `ai${i}`,
        name: AI_NAMES[i] || `AI ${i + 1}`,
        color: AI_COLORS[i] || '#888888',
        pos: { x: lineCenter.x + t * spread * 0.7, y: lineCenter.y + 30 + (i % 2) * 20 },
        heading: t > 0 ? 315 : 45,
        speed: 0,
        isPlayer: false,
        lapDone: 0,
        speedMul: cfg.aiSpeedMul * (0.97 + Math.random() * 0.06), // difficulty, a little spread between bots
      });
    }

    const startingTrim = raceTrim({ ...trimForDrive(createInitialState({ tws: 12 * windStrengthRef.current, trueWindDir: WIND_DIRECTION, heading: 45, boatSpeed: 0 }), raceTrim({})), mainHoisted: true, jibFurl: 0, reef: 0 });
    trimRef.current = startingTrim; setTrimState(startingTrim);
    boatsRef.current = boats;
    const initialGuidance = planRaceGuidance(boats[0], course, WIND_DIRECTION);
    guidanceStateRef.current = initialGuidance.state; setRouteGuidance(initialGuidance.guidance);
    raceIdRef.current = `race_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    startupGate.current.reset(raceIdRef.current);
    setSceneRaceId(raceIdRef.current); setSceneReady(false);
    ruleStateRef.current = createRaceRulesState();
    raceClockRef.current = 0; pausedRef.current = false; setPaused(false);
    rudderRef.current = 0; setRudderState(0);
    setRuleNotice(null); setPenalty(0); setNativeSave("idle");
    setResults([]);
    setElapsed(0);
    setCoaching(null); setCoachingSource("local");
    setCoachingError(null);
    logSamplesRef.current = [];
    logEventsRef.current = [];
    markTimesRef.current = new Map();
    speedLogRef.current = [];
    turnRef.current = null;
    shownRankRef.current = 0;
    pendingRankRef.current = null;
    standingsKeyRef.current = '';
    lastSampleTimeRef.current = 0;
    wasInNoGoRef.current = false;
    lastTackSignRef.current = 0;
  }, []);

  // -----------------------------------------------------------------------
  // Start race flow
  // -----------------------------------------------------------------------
  const openBriefing = useCallback(() => {
    initRace(difficulty);
    // Look up the user's best for this (difficulty, wind) bucket so the
    // briefing can show a "Your best: 1:27" badge - small motivator without
    // being competitive about it.
    setBestRecord(getBestRecord(difficulty, windStrength, racePrefs.mode));
    setIsNewRecord(false); // reset from any previous race
    // Persist the user's INTENT to localStorage so we can offer to resume
    // after a reload. We refresh on every phase transition so the saved
    // ts stays close to "now".
    saveRaceSetup({
      difficulty,
      windStrength,
      missionId: selectedMission?.id ?? null,
      phase: 'briefing',
    });
    setResumeOffer(null);
    setGameState('briefing');
  }, [difficulty, windStrength, selectedMission, initRace, racePrefs.mode]);

  const beginCountdown = useCallback(() => {
    saveRaceSetup({
      difficulty,
      windStrength,
      missionId: selectedMission?.id ?? null,
      phase: 'countdown',
    });
    setLockedMode(racePrefs.mode);
    setCountdown(3);
    setGameState('countdown');
  }, [difficulty, windStrength, selectedMission, racePrefs.mode]);

  // Legacy name - kept so existing handlers don't break (e.g. "Ещё раз" button)

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown' || paused || !sceneReady) return;
    if (countdown === 0) {
      playStart();
      postNativeRaceStarted({ id: raceIdRef.current, mode: racePrefsRef.current.mode, difficulty, windStrength, missionId: selectedMission?.id ?? null });
      logEventsRef.current.push({ type: "start", t: 0 });
      const player = boatsRef.current.find(b => b.isPlayer);
      if (player) logSamplesRef.current.push(recordSample(player, 0, windDirRef.current));
      // Mark the saved setup as "racing" so a reload knows the user
      // was actively in a race, not just on the briefing page.
      saveRaceSetup({
        difficulty,
        windStrength,
        missionId: selectedMission?.id ?? null,
        phase: 'racing',
      });
      setGameState('racing');
      return;
    }
    playBeep();
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [gameState, countdown, difficulty, windStrength, selectedMission, paused, sceneReady]);

  // -----------------------------------------------------------------------
  // Keyboard input
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== "racing" && gameState !== "countdown") return;
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable=true],[role=slider]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const sheet = key === "q" || key === "a" ? "mainSheet" : key === "w" || key === "s" ? "jibSheet" : null;
      if (sheet && racePrefsRef.current.mode === "pro") {
        e.preventDefault();
        setTrim({ [sheet]: trimRef.current[sheet] + (key === "q" || key === "w" ? .05 : -.05) });
        return;
      }
      keysRef.current.add(key);
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const clear = () => keysRef.current.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [gameState, setTrim]);

  // -----------------------------------------------------------------------
  // Game loop - also runs during countdown so boats can sail freely before
  // the race starts. Mark rounding, finish detection, race log and timer
  // are all suppressed during countdown.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'racing' && gameState !== 'countdown') return;
    const isRacing = gameState === 'racing';
    const clock = createFixedClock();
    simulationClockRef.current = clock;
    const unbindClock = bindClockLifecycle(clock, { target: document, now: () => performance.now(),
      active: () => startupGate.current.active(pausedRef.current, document.hidden) });
    let ended = false;
    const step = (now: number) => {
      const refreshHud = now - hudRefreshRef.current >= 100;
      const advanced = clock.advance(now, startupGate.current.active(pausedRef.current, document.hidden), (dt) => {
      if (ended) return;
      if (isRacing) raceClockRef.current += dt;

      const course = courseRef.current;
      let boats = boatsRef.current;

      // --- Wind shifts: slow sinusoidal direction drift + short gusts ---
      // Direction oscillates ±6° with period ~22s (slow shift)
      // Plus a faster ±2° wobble with period ~7s (nervous breeze)
      const raceT = raceClockRef.current;
      const shift = Math.sin(raceT * (2 * Math.PI / 22)) * 6
                  + Math.sin(raceT * (2 * Math.PI / 7)) * 2;
      windDirRef.current = (WIND_DIRECTION + shift + 360) % 360;
      // Gusts: Perlin-ish approximation via blended sines (0.85 to 1.2)
      const gust = 1.0
                 + Math.sin(raceT * (2 * Math.PI / 9)) * 0.12
                 + Math.sin(raceT * (2 * Math.PI / 3.3)) * 0.05;
      windGustRef.current = Math.max(0.75, Math.min(1.25, gust));

      // Capture previous positions BEFORE movement - used later for line-cross detection
      const prevPositions = new Map<string, Vec2>();

      for (const boat of boats) {
        prevPositions.set(boat.id, { ...boat.pos });
        if (boat.lapDone === 2) continue;

        let turnInput = 0;
        if (boat.isPlayer) {
          const right = keysRef.current.has("arrowright");
          const left = keysRef.current.has("arrowleft");
          turnInput = right || left ? Number(right) - Number(left) : rudderRef.current;
          if (turnInput && autopilotOnRef.current) { setAutopilotOn(false); autopilotOnRef.current = false; }
          if (!turnInput && autopilotOnRef.current) turnInput = Math.max(-1, Math.min(1, angleDiff(boat.heading, autopilotHeadingRef.current) / 12));
        } else turnInput = raceAutopilotTurn(boat, course, windDirRef.current);
        stepBoat(boat, dt, windDirRef.current, windGustRef.current,
          boat.isPlayer ? { turn: turnInput, autoTrim: racePrefsRef.current.mode !== "pro", trim: trimRef.current } : { turn: turnInput },
          { windStrengthMul: windStrengthRef.current, speedMul: boat.speedMul, steering: boat.isPlayer ? "responsive" : "legacy" });
      }

      const checked = evaluateRaceRules(ruleStateRef.current, { boats, course, windDir: windDirRef.current, time: raceClockRef.current,
        racing: isRacing, enabled: racePrefsRef.current.rules, penalties: racePrefsRef.current.penalties, previousPositions: Object.fromEntries(prevPositions) });
      ruleStateRef.current = checked.state;
      const playerEvents = checked.events.filter(e => e.boatId === "player");
      if (playerEvents.length) {
        const important = playerEvents.find(e => e.penaltySeconds || e.kind === "early-start" || e.kind === "give-way") ?? playerEvents[0];
        setRuleNotice({ text: copyRef.current.ruleMessage(important), until: raceClockRef.current + 7 });
        setPenalty(checked.state.penalties.player ?? 0);
      }
      resolveCollisions(boats, dt);

      // Re-process course progression after collision adjustments
      for (const boat of boats) {
        const prevPos = prevPositions.get(boat.id) ?? { ...boat.pos };

        // Mark / finish detection only counts once the race is officially on.
        if (!isRacing) continue;

        const event = updateLap(boat, prevPos, course, raceClockRef.current);
        if (event === "mark") {
          const t = raceClockRef.current;
          markTimesRef.current.set(boat.id, t);
          if (boat.isPlayer) {
            const times = [...markTimesRef.current.values()];
            showEvent({ kind: 'mark', place: times.filter((x) => x <= t).length, gapSec: t - Math.min(...times) }, 'info');
          }
        }
        if (boat.isPlayer && event === "mark") {
          logEventsRef.current.push({ type: "mark-rounded", t: raceClockRef.current, note: "windward-port" });
          playMarkRound();
        } else if (boat.isPlayer && event === "finish") {
          logEventsRef.current.push({ type: "finish", t: boat.finishTime! });
          logSamplesRef.current.push(recordSample(boat, boat.finishTime!, windDirRef.current));
          playFinish();
        }
      }

      // A completed player's final sample is already fixed. Resolve only the
      // remaining fleet now, so Menu/backgrounding cannot discard this finish
      // during the former 15-second wait and penalty-adjusted places stay true.
      if (isRacing && boats.some(boat => boat.isPlayer && boat.lapDone === 2)) {
        const resolved = resolveFinishedFleet({ boats, course, time: raceClockRef.current,
          windStrengthMul: windStrengthRef.current, rules: ruleStateRef.current,
          rulesEnabled: racePrefsRef.current.rules, penaltiesEnabled: racePrefsRef.current.penalties });
        boats = resolved.boats; boatsRef.current = boats;
        ruleStateRef.current = resolved.rules;
      }

      // --- Race log recording (player only, race-time only) ---
      const playerBoat = boats.find((b) => b.isPlayer);
      if (isRacing && playerBoat && playerBoat.lapDone < 2) {
        const t = raceClockRef.current;
        if (t - lastSampleTimeRef.current >= 0.5) {
          logSamplesRef.current.push(recordSample(playerBoat, t, windDirRef.current));
          lastSampleTimeRef.current = t;
        }
        // No-go zone event
        const pTWA = calcTWA(playerBoat.heading, windDirRef.current);
        const inNoGo = Math.abs(pTWA) < 30 && playerBoat.speed < 2;
        if (inNoGo && !wasInNoGoRef.current) {
          logEventsRef.current.push({ type: 'no-go-entered', t });
          playNoGo();
        }
        wasInNoGoRef.current = inNoGo;
        // Tack event (wind side flipped)
        const tackSign = pTWA > 0 ? 1 : -1;
        const speedLog = speedLogRef.current;
        speedLog.push({ t, speed: playerBoat.speed });
        while (speedLog.length && speedLog[0].t < t - 3) speedLog.shift();
        if (lastTackSignRef.current !== 0 && tackSign !== lastTackSignRef.current && playerBoat.speed > 1) {
          logEventsRef.current.push({ type: 'tack', t, note: tackSign > 0 ? 'to-port-tack' : 'to-starboard-tack' });
          playTack();
          // Its cost: the best speed of the last 3 s against the slowest of the next 4 s.
          turnRef.current = { kind: Math.abs(pTWA) < 90 ? 'tack' : 'gybe', t, before: Math.max(...speedLog.map((s) => s.speed)), min: playerBoat.speed };
        }
        lastTackSignRef.current = tackSign;
        const turn = turnRef.current;
        if (turn) {
          turn.min = Math.min(turn.min, playerBoat.speed);
          if (t - turn.t >= 4) {
            turnRef.current = null;
            const loss = turn.before - turn.min;
            if (loss >= 0.2) showEvent({ kind: turn.kind, lossKn: loss }, loss > 1.5 ? 'bad' : 'info');
          }
        }
      }

      // Update UI state
      const player = boats.find((b) => b.isPlayer)!;
      // Live race time read from the clock each frame. Do NOT use the `elapsed`
      // state here or in the finish checks below: this loop effect closes over
      // `elapsed` at mount (deps are [gameState, difficulty]) and setElapsed does
      // not retrigger it, so the captured value would stay frozen at 0 and the
      // 5-minute timeout / post-finish race-end paths would never fire (a stuck
      // AI in the no-go zone could hang the race forever).
      const elapsedSec = isRacing ? raceClockRef.current : 0;

      // Calculate position (rank): the same count the 3D name tags show.
      const ranks = raceRanks(boats, course);
      const rank = ranks.get('player') ?? boats.length;
      const ordered = [...boats].sort((a, b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0));
      const standingsKey = ordered.map((b) => b.id).join();
      if (standingsKey !== standingsKeyRef.current) {
        standingsKeyRef.current = standingsKey;
        setStandings(ordered.map((b) => ({ id: b.id, name: b.name, color: b.color, isPlayer: b.isPlayer })));
      }
      // Overtakes: a place held for a second, not a flicker between two close boats.
      if (isRacing && elapsedSec > 3 && player.lapDone < 2) {
        if (shownRankRef.current === 0) shownRankRef.current = rank;
        if (rank === shownRankRef.current) pendingRankRef.current = null;
        else if (pendingRankRef.current?.rank !== rank) pendingRankRef.current = { rank, since: elapsedSec };
        else if (elapsedSec - pendingRankRef.current.since >= 1) {
          showEvent({ kind: rank < shownRankRef.current ? 'gained' : 'lost', place: rank }, rank < shownRankRef.current ? 'good' : 'bad');
          shownRankRef.current = rank;
          pendingRankRef.current = null;
        }
      }


      // Check race end: all boats finished OR player finished - only when racing
      const allFinished = boats.every((b) => b.lapDone === 2);
      const playerFinished = player.lapDone === 2;
      const tooLong = elapsedSec > 300; // 5 minutes max

      if (isRacing && (allFinished || playerFinished || tooLong)) {
        const sorted = [...boats]
          .map((b) => ({ name: b.name, time: b.finishTime === undefined ? Infinity : b.finishTime + (ruleStateRef.current.penalties[b.id] ?? 0), color: b.color, isPlayer: b.isPlayer }))
          .sort((a, b) => a.time - b.time);
        ended = true;
        setResults(sorted);
        setGameState('finished');
        // Race ended cleanly - drop the resume offer so the next reload
        // starts from a fresh menu.
        clearRaceSetup();

        // Save / compare against personal-best for this (difficulty, wind)
        // bucket. Only counts ACTUAL finishers - the 5-minute timeout above
        // sets player.finishTime to undefined which the lib filters out.
        if (player.finishTime != null) {
          const rec = tryUpdateBestRecord(difficulty, windStrength, player.finishTime + (ruleStateRef.current.penalties.player ?? 0), racePrefsRef.current.mode);
          setBestRecord(rec.currentBest);
          setIsNewRecord(rec.isNewRecord);
        }

        // --- Evaluate selected mission ---
        if (selectedMission) {
          const tacks = logEventsRef.current.filter((e) => e.type === 'tack').length;
          const noGoEntries = logEventsRef.current.filter((e) => e.type === 'no-go-entered').length;
          const topSpeed = logSamplesRef.current.reduce((m, s) => Math.max(m, s.speed), 0);
          const metrics: RaceMetrics = {
            finishTimeSec: player.finishTime == null ? null : player.finishTime + (ruleStateRef.current.penalties.player ?? 0),
            tackCount: tacks,
            noGoEntries,
            topSpeed,
          };
          const r = evaluateMission(selectedMission, metrics, lang);
          setMissionResult(r);
        } else {
          setMissionResult(null);
        }

        // --- Request AI coaching ---
        const playerRank = sorted.findIndex((r) => r.isPlayer) + 1;
        const payload = {
          difficulty,
          courseInfo: {
            windDirection: WIND_DIRECTION,
            windwardMark: course.marks[0].pos,
            startY: course.startLine.a.y,
          },
          finishTime: player.finishTime ?? null,
          position: playerRank,
          totalBoats: sorted.length,
          samples: logSamplesRef.current,
          events: logEventsRef.current,
          lang,
        };
        const localCoaching = analyseRaceLocally(payload, langRef.current);
        setCoaching(localCoaching);
        // Post within the finish tick, before a result/menu render can replace
        // the active refs. Keep the immutable payload until its own durable ack.
        if (isNativeRace() && player.finishTime !== undefined && logSamplesRef.current.length >= 2) {
          const snapshot: NativeRaceSnapshot = { schema: 1, id: raceIdRef.current, mode: racePrefsRef.current.mode,
            difficulty, windStrength, missionId: selectedMission?.id ?? null,
            finishTimeSec: player.finishTime, position: playerRank, totalBoats: sorted.length,
            course, samples: logSamplesRef.current, events: logEventsRef.current, coaching: localCoaching,
            penaltySeconds: ruleStateRef.current.penalties.player ?? 0 };
          pendingNativeSaves.current.add(snapshot);
          setNativeSave(postNativeRace(pendingNativeSaves.current.get(snapshot.id)!) ? "saving" : "error");
        }
        setCoachingLoading(!isNativeRace());
        const completedRaceId = raceIdRef.current;
        if (!isNativeRace()) fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((r) => r.json())
          .then((data) => {
            if (raceIdRef.current !== completedRaceId) return;
            if (data.coaching) {
              setCoaching(data.coaching); setCoachingSource(data.fallback ? "local" : "ai");
            } else {
              // Fall back to local rule-based analysis so the user still gets feedback
              const local = analyseRaceLocally(payload, lang);
              setCoaching(local);
              if (data.fallback) setCoachingError(null);
              else setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostępne - pokazuję analizę lokalną', { es: 'IA no disponible - se muestra el análisis local', fr: 'IA indisponible - analyse locale affichée', de: 'KI nicht verfügbar - lokale Analyse wird angezeigt', it: 'IA non disponibile - viene mostrata l\'analisi locale' }));
            }
          })
          .catch(() => {
            if (raceIdRef.current !== completedRaceId) return;
            // Network error - use local analysis
            const local = analyseRaceLocally(payload, lang);
            setCoaching(local);
            setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostępne - pokazuję analizę lokalną', { es: 'IA no disponible - se muestra el análisis local', fr: 'IA indisponible - analyse locale affichée', de: 'KI nicht verfügbar - lokale Analyse wird angezeigt', it: 'IA non disponibile - viene mostrata l\'analisi locale' }));
          })
          .finally(() => { if (raceIdRef.current === completedRaceId) setCoachingLoading(false); });

        return;
      }

      });
      // Publish after the entire fixed-step batch. On a slow renderer, the
      // first tick can be half a second behind the final state of this frame.
      if (advanced && refreshHud) {
        const player = boatsRef.current.find(boat => boat.isPlayer);
        if (player) {
          hudRefreshRef.current = now;
          setPlayerTWA(calcTWA(player.heading, windDirRef.current)); setPlayerSpeed(player.speed);
          const advisory = planRaceGuidance(player, courseRef.current, windDirRef.current, guidanceStateRef.current);
          guidanceStateRef.current = advisory.state; setRouteGuidance(advisory.guidance);
        }
        if (isRacing) setElapsed(raceClockRef.current);
      }
      if (!ended) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unbindClock();
      if (simulationClockRef.current === clock) simulationClockRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, difficulty]);
  useEffect(() => {
    simulationClockRef.current?.synchronize(performance.now(), startupGate.current.active(pausedRef.current, document.hidden));
  }, [gameState, paused, sceneReady]);

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  const backToMenu = useCallback(() => {
    setLockedMode(null);
    setGameState('menu');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const playerFinished = results.find((r) => r.isPlayer);
  const playerRank = results.findIndex((r) => r.isPlayer) + 1;
  const hudPlayer = boatsRef.current.find((b) => b.isPlayer);
  const setRudder = useCallback((value: number) => {
    const next = Math.max(-1, Math.min(1, value));
    rudderRef.current = next; setRudderState(next);
    autopilotOnRef.current = false; setAutopilotOn(false);
  }, []);
  const setCourse = useCallback((degrees: number) => {
    const next = ((degrees % 360) + 360) % 360;
    autopilotHeadingRef.current = next;
    setTargetHeading(next);
    rudderRef.current = 0; setRudderState(0);
    autopilotOnRef.current = true; setAutopilotOn(true);
  }, []);
  const courseDelta = useCallback((degrees: number) => {
    const player = boatsRef.current.find(b => b.isPlayer);
    if (player) setCourse((autopilotOnRef.current ? autopilotHeadingRef.current : player.heading) + degrees);
  }, [setCourse]);
  const togglePause = useCallback(() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); keysRef.current.clear(); }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden && (gameState === "racing" || gameState === "countdown")) { pausedRef.current = true; setPaused(true); keysRef.current.clear(); } };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [gameState]);
  useEffect(() => {
    if (nativeReplayHydrated.current) return;
    const race = readNativeRaceReplay();
    if (!race) return;
    nativeReplayHydrated.current = true;
    courseRef.current = race.course; logSamplesRef.current = race.samples; logEventsRef.current = race.events;
    setDifficulty(race.difficulty); setWindStrength(race.windStrength); setCoaching(race.coaching ?? null);
    setElapsed(race.finishTimeSec); setGameState("replay");
  }, []);
  const retryNativeSave = useCallback(() => {
    for (const race of pendingNativeSaves.current.values()) {
      const sent = postNativeRace(race);
      if (race.id === raceIdRef.current) setNativeSave(sent ? "saving" : "error");
    }
  }, []);
  useEffect(() => {
    const saved = (event: Event) => {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id !== "string" || !pendingNativeSaves.current.acknowledge(id)) return;
      if (id === raceIdRef.current) setNativeSave("saved");
    };
    const error = (event: Event) => {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if ((id === undefined || id === raceIdRef.current) && pendingNativeSaves.current.get(raceIdRef.current)) setNativeSave("error");
    };
    window.addEventListener("regatta:race-history-saved", saved); window.addEventListener("regatta:race-history-error", error);
    return () => { window.removeEventListener("regatta:race-history-saved", saved); window.removeEventListener("regatta:race-history-error", error); };
  }, []);
  useEffect(() => {
    if (!nativeRace) return;
    const timer = window.setInterval(retryNativeSave, 5000);
    return () => window.clearInterval(timer);
  }, [nativeRace, retryNativeSave]);
  const updateRacePrefs = useCallback((patch: Partial<typeof racePrefs>) => {
    if (patch.mode === "pro" && racePrefsRef.current.mode !== "pro") {
      const player = boatsRef.current.find(b => b.isPlayer);
      if (player?.trim) setTrim(player.trim);
    }
    writeRacePrefs(patch);
  }, [writeRacePrefs, setTrim]);
  const trimCoach = hudPlayer && playingPrefs.mode === "pro" && playingPrefs.trimHints ? raceTrimCoach(hudPlayer) : null;
  useEffect(() => {
    if (gameState === "briefing") setBestRecord(getBestRecord(difficulty, windStrength, racePrefs.mode));
  }, [gameState, difficulty, windStrength, racePrefs.mode]);
  const guidance = racePrefs.guidance ? routeGuidance : null;

  // =====================================================================
  // MENU SCREEN
  // =====================================================================
  if (gameState === 'menu') {
    return (
      <div className="h-dvh overflow-y-auto">
        {nativeRace && <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
          <Link href="/" className="inline-flex items-center min-h-11 py-2 text-sm text-[var(--accent-cyan)]">
            {readRaceSearch().has("fromLesson") ? tl({ ru: "Вернуться к уроку", en: "Back to lesson", pl: "Wróć do lekcji", es: "Volver a la lección", fr: "Retour à la leçon", de: "Zurück zur Lektion", it: "Torna alla lezione" }) : tl({ ru: "Вернуться к гонкам", en: "Back to races", pl: "Wróć do regat", es: "Volver a regatas", fr: "Retour aux courses", de: "Zurück zu den Rennen", it: "Torna alle regate" })}
          </Link>
        </div>}
        {/* Resume banner: shown when we detect a saved setup from a
            recent (≤30 min) interrupted race. Clicking "Resume" loads
            those settings + opens the briefing; "Dismiss" clears the
            saved record. The banner is intentionally a soft offer, not
            a blocking modal - users mid-tab-tetris can ignore it. */}
        {resumeOffer && (
          <ResumeOffer
            saved={resumeOffer}
            tp={tp}
            onResume={() => {
              setDifficulty(resumeOffer.difficulty);
              setWindStrength(resumeOffer.windStrength);
              if (resumeOffer.missionId) {
                const m = missions.find((x) => x.id === resumeOffer.missionId);
                setSelectedMission(m ?? null);
              } else {
                setSelectedMission(null);
              }
              setResumeOffer(null);
              initRace(resumeOffer.difficulty);
              setBestRecord(getBestRecord(resumeOffer.difficulty, resumeOffer.windStrength, racePrefsRef.current.mode));
              setIsNewRecord(false);
              saveRaceSetup({ difficulty: resumeOffer.difficulty, windStrength: resumeOffer.windStrength, missionId: resumeOffer.missionId, phase: "briefing" });
              setGameState("briefing");
            }}
            onDismiss={() => {
              clearRaceSetup();
              setResumeOffer(null);
            }}
          />
        )}
        <GameMenu
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          windStrength={windStrength}
          setWindStrength={setWindStrength}
          selectedMission={selectedMission}
          pickMission={pickMission}
          openBriefing={openBriefing}
          dailyDay={dailyDay}
          racePrefs={racePrefs} updateRacePrefs={updateRacePrefs}
        />
      </div>
    );
  }

  // =====================================================================
  // BRIEFING SCREEN - explains the race before countdown
  // =====================================================================
  if (gameState === 'briefing') {
    return (
      <div className="page-enter h-dvh flex flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={backToMenu}
            className="min-h-11 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center gap-1"
          >
            ← {tp('Назад к выбору', 'Back to menu', 'Wróć do wyboru', { es: 'Volver al menú', fr: 'Retour au menu', de: 'Zurück zum Menü', it: 'Torna al menu' })}
          </button>
          <div className="flex items-center gap-2">
            {/* Personal best for this difficulty + wind bucket. Hidden if
                the user hasn't finished a race in this combo yet. */}
            {bestRecord && (
              <div
                className="text-xs px-2 py-1 rounded font-mono"
                style={{
                  background: 'rgba(255, 170, 0, 0.12)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(255, 170, 0, 0.3)',
                }}
                title={tp('Твой рекорд', 'Your best', 'Twój rekord',
                  { es: 'Tu récord', fr: 'Ton record', de: 'Dein Rekord', it: 'Il tuo record' })}
              >
                🏆 {formatRecordTime(bestRecord.timeSec)}
              </div>
            )}
            <div className="text-xs px-2 py-1 rounded" style={{
              background: `${DIFFICULTY_CONFIG[difficulty].color}22`,
              color: DIFFICULTY_CONFIG[difficulty].color,
              border: `1px solid ${DIFFICULTY_CONFIG[difficulty].color}44`,
            }}>
              {tp(DIFFICULTY_CONFIG[difficulty].label, DIFFICULTY_CONFIG[difficulty].labelEn, DIFFICULTY_CONFIG[difficulty].labelPl, { es: DIFFICULTY_CONFIG[difficulty].labelEs, fr: DIFFICULTY_CONFIG[difficulty].labelFr, de: DIFFICULTY_CONFIG[difficulty].labelDe, it: DIFFICULTY_CONFIG[difficulty].labelIt })} · {windStrength === 'light'
                ? tp('слабый ветер', 'light wind', 'słaby wiatr', { es: 'viento flojo', fr: 'vent faible', de: 'leichter Wind', it: 'vento leggero' })
                : windStrength === 'heavy'
                  ? tp('сильный ветер', 'heavy wind', 'silny wiatr', { es: 'viento fuerte', fr: 'vent fort', de: 'starker Wind', it: 'vento forte' })
                  : tp('средний ветер', 'medium wind', 'średni wiatr', { es: 'viento medio', fr: 'vent moyen', de: 'mittlerer Wind', it: 'vento medio' })}
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold mb-1">
          {tp('Брифинг', 'Briefing', 'Odprawa', { es: 'Briefing', fr: 'Briefing', de: 'Briefing', it: 'Briefing' })}
        </h1>
        <div className="mb-5"><RaceModePicker prefs={racePrefs} update={updateRacePrefs} /></div>

        {/* One card: the course with its four steps, and three rules. */}
        <div className="card p-4 sm:p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' })}</div>
            <CoursePreview />
            <ol className="text-sm text-[var(--text-secondary)] mt-4 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от оранжевой линии внизу.', 'Start from the orange line at the bottom.', 'Start z pomarańczowej linii na dole.', { es: 'La salida es desde la línea naranja de abajo.', fr:'Départ depuis la ligne orange en bas.', de: 'Start an der orangen Linie unten.', it: 'Partenza dalla linea arancione in basso.' })}</li>
              <li>{tp('Идёшь', 'Work', 'Płyniesz', { es: 'Sube', fr: 'Remonte', de: 'Segle', it: 'Risali' })} <span className="text-[var(--accent-cyan)] font-semibold">{tp('галсами', 'upwind in tacks', 'halsami', { es: 'dando bordos', fr: 'en louvoyant', de: 'in Kreuzschlägen', it: 'bordeggiando' })}</span> {tp('к верхнему знаку - прямо против ветра нельзя.', 'to the windward mark - you can\'t sail straight into the wind.', 'do znaku nawietrznego - prosto pod wiatr się nie da.', { es: 'hasta la baliza de barlovento - directo contra el viento no se puede.', fr: 'jusqu\'à la bouée au vent - impossible d\'aller droit contre le vent.', de: 'zur Luvtonne - direkt gegen den Wind geht es nicht.', it: 'fino alla boa di bolina - dritti controvento non si può.' })}</li>
              <li>{tp('Обогни верхний знак, оставив его по левому борту.', 'Round the windward mark, leaving it to port.', 'Okrąż znak nawietrzny, zostawiając go po lewej burcie.', { es: 'Rodea la baliza de barlovento dejándola a babor.', fr: 'Contourne la bouée au vent en la laissant à bâbord.', de: 'Runde die Luvtonne und lasse sie an Backbord.', it: 'Gira la boa di bolina lasciandola a sinistra.' })}</li>
              <li>{tp('Возвращаешься полным курсом и пересекаешь финиш сверху вниз.', 'Run back downwind and cross the finish top to bottom.', 'Wracasz kursem pełnym i przecinasz linię mety z góry na dół.', { es: 'Vuelve a favor del viento y cruza la línea de llegada de arriba abajo.', fr: 'Redescends au portant et coupe la ligne d\'arrivée de haut en bas.', de: 'Segle raumschots zurück und fahr von oben nach unten über die Ziellinie.', it: 'Torna con le andature portanti e taglia il traguardo dall\'alto verso il basso.' })}</li>
            </ol>
          </div>
          <ul className="space-y-4 self-center">
            {[
              { icon: 'nogo', text: tl({
                ru: '±30° к ветру - мёртвая зона: паруса не тянут. Встал - отверни градусов на 50.',
                en: 'Within 30° of the wind is the no-go zone: the sails do not pull. If you stop, bear away about 50°.',
                pl: '±30° od wiatru to kąt martwy: żagle nie pracują. Jeśli staniesz, odpadnij o jakieś 50°.',
                es: 'A ±30° del viento está la zona muerta: las velas no tiran. Si te paras, arriba unos 50°.',
                fr: "À ±30° du vent, c'est la zone morte : les voiles ne portent pas. Si tu t'arrêtes, abats d'environ 50°.",
                de: '±30° zum Wind ist der tote Winkel: Die Segel ziehen nicht. Wenn du stehst, fall etwa 50° ab.',
                it: "A ±30° dal vento c'è l'angolo morto: le vele non portano. Se ti fermi, poggia di circa 50°.",
              }) },
              { icon: 'tack', text: tl({
                ru: 'Длинные галсы: каждый поворот стоит скорости, HUD покажет сколько.',
                en: 'Long tacks: every turn costs speed, and the HUD shows how much.',
                pl: 'Długie halsy: każdy zwrot kosztuje prędkość, a HUD pokaże ile.',
                es: 'Bordos largos: cada virada cuesta velocidad y el HUD te dice cuánta.',
                fr: 'De longs bords : chaque virement coûte de la vitesse, et le HUD te dit combien.',
                de: 'Lange Schläge: Jede Wende kostet Fahrt, das HUD zeigt dir, wie viel.',
                it: "Bordi lunghi: ogni virata costa velocità e l'HUD ti dice quanta.",
              }) },
              { icon: 'steer', text: tl({
                ru: 'Рули штурвалом или ползунком. Стрелки ← → тоже поворачивают лодку.',
                en: 'Steer with the wheel or slider. The ← → keys also turn the boat.',
                pl: 'Steruj kołem lub suwakiem. Strzałki ← → również skręcają łódź.',
                es: 'Gobierna con la rueda o el deslizador. Las teclas ← → también giran el barco.',
                fr: 'Barre avec la roue ou le curseur. Les touches ← → font aussi tourner le bateau.',
                de: 'Steuere mit Rad oder Schieberegler. Auch ← → drehen das Boot.',
                it: 'Governa con la ruota o il cursore. Anche i tasti ← → fanno girare la barca.',
              }) },
            ].map((rule) => (
              <li key={rule.icon} className="flex items-start gap-3">
                <BriefingIcon kind={rule.icon as 'nogo' | 'tack' | 'steer'} />
                <span className="text-sm leading-relaxed text-[var(--text-secondary)]">{rule.text}</span>
              </li>
            ))}
          </ul>
        </div>

        </div>
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto">
        <button
          onClick={beginCountdown}
          className="w-full min-h-[52px] py-3 rounded-xl font-semibold text-lg transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
          style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
        >
          {tp('Готов - старт через 3·2·1', 'Ready - starting in 3·2·1', 'Gotowy - start za 3·2·1', { es: 'Listo - salida en 3·2·1', fr: 'Prêt - départ dans 3·2·1', de: 'Bereit - Start in 3·2·1', it: 'Pronto - partenza tra 3·2·1' })}
        </button>
        </div></div>
      </div>
    );
  }

  // =====================================================================
  // RACING / COUNTDOWN / FINISHED SCREENS (Canvas)
  // =====================================================================
  return (
    <div className="relative w-full" style={{ height: embed ? '100dvh' : 'calc(100dvh - var(--site-nav-h, 56px))' }}>
      {(gameState === "countdown" || gameState === "racing") && (
        <RaceCockpit prefs={playingPrefs} updatePrefs={updateRacePrefs} rudder={rudder} setRudder={setRudder} courseDelta={courseDelta} setCourse={setCourse} targetHeading={targetHeading}
          trim={trim} setTrim={setTrim} heading={hudPlayer?.heading ?? 0} speed={playerSpeed} twa={playerTWA}
          time={formatTime(elapsed)} rank={standings.findIndex(r => r.isPlayer) + 1} rows={standings}
          trimAdvice={trimCoach ? trimLabels[trimCoach] : undefined} guidance={guidance} message={ruleNotice && ruleNotice.until > elapsed ? ruleNotice.text : toast?.text}
          camera={raceCamera} setCamera={setRaceCamera} onResetCamera={() => setCameraRevision(value => value + 1)} paused={paused} onPause={togglePause} onExit={backToMenu}
          autopilot={autopilotOn} onAutopilot={() => {
            autopilotHeadingRef.current = hudPlayer?.heading ?? 0;
            setTargetHeading(autopilotHeadingRef.current);
            rudderRef.current = 0; setRudderState(0);
            autopilotOnRef.current = !autopilotOnRef.current; setAutopilotOn(autopilotOnRef.current);
          }} muted={muted} onSound={() => updateControls({ sound: !controlPrefs.sound })} penalty={penalty}
          countdown={gameState === "countdown" ? countdown : undefined}>
          <RaceScene key={sceneRaceId} onReady={onSceneReady} boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={venue} camera={raceCamera} cameraRevision={cameraRevision} labels={race3dLabels}
            guidance={guidance} onStats={sceneFlags.fps ? showSceneStats : undefined} />
          {sceneFlags.fps && <div ref={statsRef} className="absolute bottom-1 left-1 text-xs text-white" data-testid="scene-stats" />}
        </RaceCockpit>
      )}

      {/* Results occupy the full page after the racing cockpit unmounts. */}
      {gameState === 'finished' && (
        <div className="h-full overflow-y-auto overscroll-contain bg-[var(--bg-primary)] px-4 py-6 sm:px-6" data-testid="race-results">
          <div className="mx-auto w-full max-w-2xl [&_button]:min-h-11">
            {nativeRace && nativeSave !== "idle" && <div className="mb-4 text-sm" role="status">{nativeSave === "saved" ? copy.saved : nativeSave === "error" ? copy.saveError : copy.saving}{nativeSave === "error" && <button type="button" className="ml-2 underline" onClick={retryNativeSave}>{copy.retry}</button>}</div>}
            <div className="text-center mb-5">
              <div className="text-sm text-[var(--text-muted)] mb-2">{tp('РЕЗУЛЬТАТ', 'RESULT', 'WYNIK', { es: 'RESULTADO', fr: 'RÉSULTAT', de: 'ERGEBNIS', it: 'RISULTATO' })}</div>
              {playerFinished?.time !== undefined && playerFinished.time !== Infinity ? (
                <>
                  <div className="text-5xl font-bold mb-2" style={{
                    color: playerRank === 1 ? 'var(--warning)' : playerRank <= 3 ? 'var(--success)' : 'var(--text-primary)',
                  }}>
                    {playerRank}
                    <span className="text-2xl text-[var(--text-muted)]"> {tp('из', 'of', 'z', { es: 'de', fr: 'sur', de: 'von', it: 'su' })} {results.length}</span>
                  </div>
                  <div className="text-xl font-mono text-[var(--text-secondary)]">{formatTime(playerFinished.time)}</div>
                  {/* New-personal-best banner. Only shows after the player
                      finished AND beat their previous time on this
                      difficulty + wind bucket. The lib has already saved
                      the new value to localStorage by the time we render. */}
                  {isNewRecord && (
                    <div
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold"
                      style={{
                        background: 'linear-gradient(90deg, rgba(255,170,0,0.18), rgba(255,80,40,0.22))',
                        border: '1px solid rgba(255, 170, 0, 0.55)',
                        color: 'var(--warning)',
                      }}
                    >
                      🏆 {tp('Новый рекорд!', 'New record!', 'Nowy rekord!',
                        { es: '¡Nuevo récord!', fr: 'Nouveau record !', de: 'Neuer Rekord!', it: 'Nuovo record!' })}
                    </div>
                  )}
                  {!isNewRecord && bestRecord && (
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      {tp('Твой рекорд:', 'Your best:', 'Twój rekord:',
                        { es: 'Tu récord:', fr: 'Ton record :', de: 'Dein Rekord:', it: 'Il tuo record:' })}{' '}
                      <span className="font-mono">{formatRecordTime(bestRecord.timeSec)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold mb-2" style={{ color: 'var(--danger)' }}>{tp('Не финишировал', 'Did not finish', 'Nie ukończono', { es: 'No has terminado', fr: 'Course non terminée', de: 'Nicht im Ziel', it: 'Regata non conclusa' })}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{tp('Время вышло', 'Time\'s up', 'Czas minął', { es: 'Se acabó el tiempo', fr: 'Temps écoulé', de: 'Zeit abgelaufen', it: 'Tempo scaduto' })}</div>
                </>
              )}
            </div>

            {/* Compact leaderboard - collapsed by default, only winner + you shown on mobile */}
            <details className="mb-5 border-y border-[var(--border-subtle)]">
              <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span>{tp('РЕЗУЛЬТАТЫ ГОНКИ', 'RACE RESULTS', 'WYNIKI WYŚCIGU', { es: 'RESULTADOS DE LA REGATA', fr: 'RÉSULTATS DE LA COURSE', de: 'ERGEBNISSE', it: 'RISULTATI DELLA REGATA' })} ({results.length})</span>
                <span className="text-[var(--accent-cyan)]">▾</span>
              </summary>
              <div className="mt-3 space-y-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded"
                    style={{
                      background: r.isPlayer ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      border: r.isPlayer ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono w-5" style={{ color: i === 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      <span className={`text-xs ${r.isPlayer ? 'font-semibold' : ''}`}>{r.isPlayer ? tp('Ты', 'You', 'Ty', { es: 'Tú', fr: 'Toi', de: 'Du', it: 'Tu' }) : r.name}</span>
                    </div>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      {r.time === Infinity ? 'DNF' : formatTime(r.time)}
                    </span>
                  </div>
                ))}
              </div>
            </details>

            {/* Mission result card */}
            {missionResult && (
              <div className="mb-4 p-3 rounded-lg" style={{
                background: missionResult.passed ? 'rgba(68, 255, 136, 0.08)' : 'rgba(255, 170, 0, 0.08)',
                border: `1px solid ${missionResult.passed ? 'rgba(68, 255, 136, 0.35)' : 'rgba(255, 170, 0, 0.35)'}`,
              }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{missionResult.mission.emoji}</span>
                  <div className="text-sm font-semibold flex-1" style={{ color: missionResult.passed ? 'var(--success)' : 'var(--warning)' }}>
                    {missionResult.passed
                      ? tp('✓ Миссия пройдена', '✓ Mission passed', '✓ Misja zaliczona', { es: '✓ Misión cumplida', fr: '✓ Mission réussie', de: '✓ Mission geschafft', it: '✓ Missione compiuta' })
                      : tp('⚠ Миссия провалена', '⚠ Mission failed', '⚠ Misja niezaliczona', { es: '⚠ Misión fallida', fr: '⚠ Mission ratée', de: '⚠ Mission gescheitert', it: '⚠ Missione fallita' })
                    }: {tp(missionResult.mission.titleRu, missionResult.mission.titleEn, missionResult.mission.titlePl, { es: missionResult.mission.titleEs, fr: missionResult.mission.titleFr, de: missionResult.mission.titleDe, it: missionResult.mission.titleIt })}
                  </div>
                </div>
                <ul className="text-xs text-[var(--text-secondary)] space-y-0.5 list-disc list-inside">
                  {missionResult.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Coach */}
            <section className="mb-5 border-t border-[var(--border-subtle)] py-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🧭</span>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{coachingSource === "local" ? copy.debrief : tp('AI-тренер', 'AI coach', 'Trener AI',
                  { es: 'Entrenador IA', fr: 'Coach IA', de: 'KI-Trainer', it: 'Coach IA' })}</div>
              </div>
              {/* Apple Review 2025 + EU AI Act: explicit AI-content disclosure. */}
              {coachingSource === "ai" && <div className="text-[10px] text-[var(--text-muted)] mb-3 leading-relaxed">
                {tp(
                  'Разбор сгенерирован языковой моделью OpenAI по твоему логу гонки. Может ошибаться. Подробности в ',
                  'Generated by an OpenAI language model from your race log. Can be wrong. Details in our ',
                  'Wygenerowane przez model językowy OpenAI na podstawie zapisu twojego wyścigu. Może się mylić. Szczegóły w ',
                  {
                    es: 'Generado por un modelo de lenguaje de OpenAI a partir del registro de tu regata. Puede equivocarse. Más detalles en la ',
                    fr: 'Généré par un modèle de langage d\'OpenAI à partir du journal de ta course. Peut se tromper. Détails dans la ',
                    de: 'Erstellt von einem Sprachmodell von OpenAI anhand deines Rennprotokolls. Kann sich irren. Details in der ',
                    it: 'Generato da un modello linguistico di OpenAI a partire dal log della tua regata. Può sbagliare. Dettagli nell\'',
                  },
                )}
                <a href="/privacy" target="_blank" rel="noopener" className="underline hover:text-[var(--accent-cyan)]">{tp('политике конфиденциальности', 'privacy policy', 'polityce prywatności',
                  { es: 'política de privacidad', fr: 'politique de confidentialité', de: 'Datenschutzerklärung', it: 'informativa sulla privacy' })}</a>.
              </div>}
              {coachingLoading && <AnalyzingProgress />}
              {coachingError && !coaching && (
                <div className="text-xs text-[var(--text-muted)] italic">{coachingError}</div>
              )}
              {coaching && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{tp('Оценка', 'Score', 'Ocena', { es: 'Puntuación', fr: 'Note', de: 'Bewertung', it: 'Punteggio' })}</div>
                      <div className="text-lg font-bold" style={{
                        color: coaching.score >= 75 ? 'var(--success)' : coaching.score >= 50 ? 'var(--warning)' : 'var(--danger)',
                      }}>
                        {coaching.score}/100
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{coaching.overall}</p>
                  </div>

                  {coaching.mistakes.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">{tp('Ошибки', 'Mistakes', 'Błędy', { es: 'Errores', fr: 'Erreurs', de: 'Fehler', it: 'Errori' })}</div>
                      <div className="space-y-2">
                        {coaching.mistakes.map((m, i) => (
                          <div key={i} className="text-xs p-2 rounded" style={{ background: 'rgba(10, 22, 40, 0.5)' }}>
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                                background: m.severity === 'major' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 170, 0, 0.2)',
                                color: m.severity === 'major' ? 'var(--danger)' : 'var(--warning)',
                              }}>
                                {formatTime(m.timeStart)}-{formatTime(m.timeEnd)}
                              </span>
                              <div className="font-semibold text-[var(--text-primary)]">{coachTitle(m)}</div>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed mb-1">{coachExplanation(m)}</p>
                            <p className="text-[var(--success)] leading-relaxed">💡 {coachFix(m)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {coaching.strengths.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">{tp('Сильные стороны', 'Strengths', 'Mocne strony', { es: 'Puntos fuertes', fr: 'Points forts', de: 'Stärken', it: 'Punti di forza' })}</div>
                      <ul className="text-xs text-[var(--text-secondary)] space-y-0.5">
                        {coaching.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[var(--success)]">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[var(--border-subtle)]">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">{tp('Цель на следующую гонку', 'Goal for next race', 'Cel na następny wyścig', { es: 'Objetivo para la próxima regata', fr: 'Objectif pour la prochaine course', de: 'Ziel für das nächste Rennen', it: 'Obiettivo per la prossima regata' })}</div>
                    <p className="text-xs text-[var(--text-secondary)]">{coachNextGoal(coaching)}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Nickname prompt: first finish without a stored nickname. The
                nickname is stored server-side per session via POST /api/player
                (same flow /multiplayer uses), API validates 2-20 chars.
                Non-blocking: "skip" dismisses without saving. */}
            {!nativeRace && saveState === 'prompting' && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                  {tp('Сохранить результат в лидерборд?', 'Save your result to the leaderboard?', 'Zapisać wynik w rankingu?',
                    { es: '¿Guardar tu resultado en la clasificación?', fr: 'Enregistrer ton résultat au classement ?', de: 'Ergebnis in die Bestenliste eintragen?', it: 'Salvare il risultato in classifica?' })}
                </div>
                <div className="text-xs text-[var(--text-muted)] mb-2">
                  {tp('Введи ник (2-20 символов) - он будет виден в общем рейтинге.', 'Enter a nickname (2-20 chars) - it will show on the public leaderboard.', 'Podaj nick (2-20 znaków) - będzie widoczny w publicznym rankingu.',
                    { es: 'Escribe un apodo (2-20 caracteres) - aparecerá en la clasificación pública.', fr: 'Entre un pseudo (2-20 caractères) - il sera visible dans le classement public.', de: 'Gib einen Nickname ein (2-20 Zeichen) - er erscheint in der öffentlichen Bestenliste.', it: 'Inserisci un nickname (2-20 caratteri) - sarà visibile nella classifica pubblica.' })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && nicknameInput.trim().length >= 2) saveResult(nicknameInput); }}
                    maxLength={20}
                    className="min-h-11 flex-1 min-w-0 px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
                    placeholder={tp('Введи ник', 'Enter nickname', 'Podaj nick',
                      { es: 'Escribe un apodo', fr: 'Entre un pseudo', de: 'Nickname eingeben', it: 'Inserisci un nickname' })}
                  />
                  <button
                    onClick={() => saveResult(nicknameInput)}
                    disabled={nicknameInput.trim().length < 2}
                    className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-40"
                    style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
                  >
                    {tp('Сохранить', 'Save', 'Zapisz',
                      { es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', it: 'Salva' })}
                  </button>
                </div>
                {saveError && (
                  <div className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{saveError}</div>
                )}
                <button
                  onClick={() => setSaveState('idle')}
                  className="mt-2 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-secondary)] transition"
                >
                  {tp('Пропустить', 'Skip', 'Pomiń',
                    { es: 'Omitir', fr: 'Passer', de: 'Überspringen', it: 'Salta' })}
                </button>
              </div>
            )}

            {/* Save status feedback (auto-save with stored nickname or after the prompt) */}
            {!nativeRace && saveState === 'saving' && (
              <div className="mb-4 text-xs text-[var(--text-muted)]">
                {tp('Сохраняю результат...', 'Saving result...', 'Zapisywanie wyniku...',
                  { es: 'Guardando el resultado...', fr: 'Enregistrement du résultat...', de: 'Ergebnis wird gespeichert...', it: 'Salvataggio del risultato...' })}
              </div>
            )}
            {!nativeRace && saveState === 'saved' && (
              <div className="mb-4 text-xs" style={{ color: 'var(--success)' }}>
                ✓ {tp('Результат сохранён в лидерборд', 'Result saved to the leaderboard', 'Wynik zapisany w rankingu',
                  { es: 'Resultado guardado en la clasificación', fr: 'Résultat enregistré au classement', de: 'Ergebnis in der Bestenliste gespeichert', it: 'Risultato salvato in classifica' })}
              </div>
            )}
            {!nativeRace && saveState === 'error' && saveError && (
              <div className="mb-4 text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--danger)' }}>
                <span>{saveError}</span>
                <button onClick={() => saveResult(nicknameInput || undefined)} className="underline">
                  {tp('Повторить', 'Retry', 'Ponów',
                    { es: 'Reintentar', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova' })}
                </button>
              </div>
            )}

            {/* Share replay: replay uploads on every finish; show the code +
                share link once the prompt is out of the way (saved or skipped). */}
            {replayCode && saveState !== 'prompting' && (
              <ShareBlock
                code={replayCode}
                nickname={nickname}
                difficulty={difficulty}
                windStrength={windStrength}
                finishTime={playerFinished && playerFinished.time !== Infinity ? playerFinished.time : undefined}
                rank={playerRank > 0 ? playerRank : undefined}
                total={results.length || undefined}
                missionTitle={selectedMission ? tp(selectedMission.titleRu, selectedMission.titleEn, selectedMission.titlePl, { es: selectedMission.titleEs, fr: selectedMission.titleFr, de: selectedMission.titleDe, it: selectedMission.titleIt }) : undefined}
              />
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={backToMenu}
                className="flex-1 min-w-[100px] py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition"
              >
                {tp('Меню', 'Menu', 'Menu', { es: 'Menú', fr: 'Menu', de: 'Menü', it: 'Menu' })}
              </button>
              <button
                onClick={() => setGameState('replay')}
                disabled={logSamplesRef.current.length < 5}
                className="flex-1 min-w-[100px] py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--accent-cyan)] hover:bg-[rgba(0,212,255,0.08)] transition disabled:opacity-40"
              >
                ▶ {tp('Replay гонки', 'Race replay', 'Powtórka wyścigu', { es: 'Repetición', fr: 'Revoir la course', de: 'Replay ansehen', it: 'Replay della regata' })}
              </button>
              <Link
                href={nativeRace ? "/history" : "/leaderboard"}
                className="inline-flex min-h-11 flex-1 min-w-[100px] items-center justify-center py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition"
              >
                🏆 {nativeRace ? copy.history : tp('Лидерборд', 'Leaderboard', 'Ranking',
                  { es: 'Clasificación', fr: 'Classement', de: 'Bestenliste', it: 'Classifica' })}
              </Link>
              <button
                onClick={openBriefing}
                className="flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: 'var(--accent-cyan)',
                  color: 'var(--accent-ink)',
                }}
              >
                {tp('Ещё раз', 'Again', 'Jeszcze raz', { es: 'Otra vez', fr: 'Rejouer', de: 'Noch mal', it: 'Di nuovo' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === "replay" && <RaceReplay samples={logSamplesRef.current} course={courseRef.current} onClose={() => {
        if (!nativeReplayHydrated.current) setGameState("finished");
        else if (!navigateNativeRace("/history")) backToMenu();
      }} />}
    </div>
  );
}

// ============================================================================
// DRAWING HELPERS
// ============================================================================

function ShareBlock({
  code, nickname, difficulty, windStrength, finishTime, rank, total, missionTitle,
}: {
  code: string; nickname: string | null;
  difficulty: Difficulty; windStrength: 'light' | 'medium' | 'heavy';
  finishTime?: number; rank?: number; total?: number;
  missionTitle?: string;
}) {
  const { tp, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/r/${code}` : '';
  const timePart = finishTime ? `${formatTime(finishTime)}${rank && total ? ` (${rank}/${total})` : ''}` : '';
  const shareText = finishTime
    ? tp(
        `Прошёл регату за ${timePart} на weektoregatta.com - смотри replay`,
        `Finished the race in ${timePart} at weektoregatta.com - check the replay`,
        `Wyścig ukończony w ${timePart} na weektoregatta.com - zobacz powtórkę`,
        {
          es: `Terminé la regata en ${timePart} en weektoregatta.com - mira la repetición`,
          fr: `Course terminée en ${timePart} sur weektoregatta.com - regarde le replay`,
          de: `Rennen auf weektoregatta.com in ${timePart} beendet - schau dir das Replay an`,
          it: `Regata conclusa in ${timePart} su weektoregatta.com - guarda il replay`,
        },
      )
    : tp('Мой replay на weektoregatta.com', 'My replay at weektoregatta.com', 'Moja powtórka na weektoregatta.com',
        { es: 'Mi repetición en weektoregatta.com', fr: 'Mon replay sur weektoregatta.com', de: 'Mein Replay auf weektoregatta.com', it: 'Il mio replay su weektoregatta.com' });

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Regatta replay', text: shareText, url });
        return;
      } catch { /* fallback to copy */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const ogUrl = finishTime
    ? `/api/og/result?nick=${encodeURIComponent(nickname ?? 'Player')}&time=${encodeURIComponent(formatTime(finishTime))}&place=${rank ?? ''}&of=${total ?? ''}&code=${code}&difficulty=${difficulty}&wind=${windStrength}&mission=${encodeURIComponent(missionTitle ?? '')}&lang=${lang}`
    : null;

  return (
    <div className="mb-4 p-3 rounded-lg"
         style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {tp('ПОДЕЛИТЬСЯ REPLAY', 'SHARE REPLAY', 'UDOSTĘPNIJ POWTÓRKĘ',
              { es: 'COMPARTIR REPETICIÓN', fr: 'PARTAGER LE REPLAY', de: 'REPLAY TEILEN', it: 'CONDIVIDI IL REPLAY' })}
          </div>
          <div className="text-sm font-mono font-semibold text-[var(--accent-cyan)] mt-0.5">
            {code}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onShare}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
          >
            {copied
              ? tp('✓ Скопировано', '✓ Copied', '✓ Skopiowano',
                  { es: '✓ Copiado', fr: '✓ Copié', de: '✓ Kopiert', it: '✓ Copiato' })
              : tp('🔗 Поделиться', '🔗 Share', '🔗 Udostępnij',
                  { es: '🔗 Compartir', fr: '🔗 Partager', de: '🔗 Teilen', it: '🔗 Condividi' })}
          </button>
          <Link
            href={`/r/${code}`}
            className="px-3 py-1.5 rounded text-xs font-semibold border"
            style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}
          >
            {tp('Открыть', 'Open', 'Otwórz',
              { es: 'Abrir', fr: 'Ouvrir', de: 'Öffnen', it: 'Apri' })}
          </Link>
        </div>
      </div>
      {ogUrl && (
        // Prefetch the OG image so it's ready when a social crawler fetches it
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ogUrl} alt="" style={{ display: 'none' }} aria-hidden="true" />
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '-';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds * 10) % 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

function AnalyzingProgress() {
  const { tp } = useI18n();
  const stages = [
    { icon: '📍', label: tp('Сверяю трек с трассой', 'Matching track to course', 'Porównuję ślad z trasą', { es: 'Comparando la traza con el recorrido', fr: 'Je compare ta trace au parcours', de: 'Gleiche den Track mit der Bahn ab', it: 'Confronto la traccia con il percorso' }) },
    { icon: '🌬', label: tp('Считаю время в мёртвой зоне', 'Counting time in the no-go zone', 'Liczę czas w kącie martwym', { es: 'Calculando el tiempo en la zona muerta', fr: 'Je compte le temps passé dans la zone morte', de: 'Zähle die Zeit im toten Winkel', it: 'Conto il tempo nell\'angolo morto' }) },
    { icon: '↺', label: tp('Анализирую повороты и лейлайны', 'Analyzing tacks and laylines', 'Analizuję zwroty i laylines', { es: 'Analizando viradas y laylines', fr: 'J\'analyse les virements et les laylines', de: 'Analysiere Wenden und Laylines', it: 'Analizzo virate e layline' }) },
    { icon: '🧭', label: tp('Формулирую советы', 'Drafting advice', 'Formułuję rady', { es: 'Redactando consejos', fr: 'Je rédige les conseils', de: 'Formuliere Tipps', it: 'Preparo i consigli' }) },
  ];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => (s + 1 < stages.length ? s + 1 : s)), 900);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full pulse-gentle" style={{ background: 'var(--accent-cyan)' }} />
        <span className="text-sm text-[var(--text-secondary)]">{tp('AI разбирает твою гонку...', 'AI is reviewing your race...', 'AI analizuje twój wyścig...', { es: 'La IA está analizando tu regata...', fr: 'L\'IA analyse ta course...', de: 'Die KI analysiert dein Rennen...', it: 'L\'IA sta analizzando la tua regata...' })}</span>
      </div>
      <ul className="space-y-1.5 text-xs">
        {stages.map((s, i) => {
          const active = i === stage;
          const done = i < stage;
          return (
            <li
              key={s.label}
              className="flex items-center gap-2 transition-opacity"
              style={{ opacity: active ? 1 : done ? 0.7 : 0.35 }}
            >
              <span className="w-4 inline-flex justify-center">
                {done ? '✓' : active ? <span className="pulse-gentle">{s.icon}</span> : s.icon}
              </span>
              <span className={active ? 'text-[var(--accent-cyan)] font-medium' : 'text-[var(--text-secondary)]'}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,255,0.12)' }}>
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${((stage + 1) / stages.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-teal))',
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Ghost path - idealised optimal trajectory for the current course
// ============================================================================

function BriefingIcon({ kind }: { kind: 'nogo' | 'tack' | 'steer' }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, className: 'shrink-0 mt-0.5 text-[var(--text-secondary)]' };
  if (kind === 'nogo') return (
    <svg {...common}><path d="M12 13 L7 4 M12 13 L17 4" /><path d="M12 13 v7" /><path d="M9.5 18.5 h5" /><path d="M12 1.5 v3" /></svg>
  );
  if (kind === 'tack') return (
    <svg {...common}><path d="M8 21 L15 14 L9 8 L14 3" /><path d="M11.5 3 H14 V5.5" /></svg>
  );
  return (
    <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /><path d="M12 4v6M12 14v6M4 12h6M14 12h6" /></svg>
  );
}

// ============================================================================
// Small SVG preview of the windward/leeward course (briefing screen)
// ============================================================================

function CoursePreview() {
  const { tp } = useI18n();
  // Hardcoded RU labels were leaking into PL / EN / etc. on the
  // briefing screen. Localize all five SVG <text> nodes via tp().
  const labelWind = tp('ветер', 'wind', 'wiatr',
    { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' });
  const labelTopMark = tp('верхний знак', 'windward mark', 'znak nawietrzny',
    { es: 'baliza de barlovento', fr: 'bouée au vent', de: 'Luvtonne', it: 'boa di bolina' });
  const labelStartFinish = tp('старт / финиш', 'start / finish', 'start / meta',
    { es: 'salida / llegada', fr: 'départ / arrivée', de: 'Start / Ziel', it: 'partenza / arrivo' });
  const legendUpwind = tp('-- ходом против ветра (галсы)', '-- upwind (tacks)', '-- pod wiatr (halsami)',
    { es: '-- en ceñida (bordos)', fr: '-- au près (bords)', de: '-- gegen den Wind (Kreuzschläge)', it: '-- di bolina (bordi)' });
  const legendDownwind = tp('-- попутно к финишу', '-- downwind to finish', '-- z wiatrem do mety',
    { es: '-- a favor del viento a la llegada', fr: '-- au portant jusqu\'à l\'arrivée', de: '-- mit dem Wind zum Ziel', it: '-- vento in poppa all\'arrivo' });
  return (
    <svg viewBox="0 0 200 260" className="w-full max-w-[220px] mx-auto block">
      {/* water */}
      <defs>
        <linearGradient id="cpWater" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#051425" />
          <stop offset="100%" stopColor="#0a1f3d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="260" rx="8" fill="url(#cpWater)" />
      {/* wind arrow */}
      <g stroke="#00d4ff" strokeWidth="1.4" fill="#00d4ff">
        <line x1="100" y1="10" x2="100" y2="40" />
        <polygon points="96,38 100,48 104,38" />
        <text x="108" y="28" fill="#00d4ff" fontSize="11" fontFamily="system-ui">{labelWind}</text>
      </g>
      {/* windward mark */}
      <circle cx="100" cy="60" r="7" fill="#ffaa00" stroke="#fff" strokeWidth="1.5" />
      <text x="112" y="64" fill="#ffaa00" fontSize="10" fontFamily="system-ui">{labelTopMark}</text>
      {/* start/finish line */}
      <line x1="60" y1="220" x2="140" y2="220" stroke="#ffaa00" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="60" cy="220" r="4" fill="#ffaa00" />
      <circle cx="140" cy="220" r="4" fill="#ffaa00" />
      <text x="85" y="240" fill="#ffaa00" fontSize="10" fontFamily="system-ui" textAnchor="middle">{labelStartFinish}</text>
      {/* route */}
      <polyline
        fill="none"
        stroke="#00d4ff"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        points="100,220 75,170 120,130 90,95 100,65"
      />
      <polyline
        fill="none"
        stroke="#44ff88"
        strokeWidth="1.5"
        points="100,65 115,120 95,180 100,220"
      />
      {/* boat start */}
      <circle cx="100" cy="220" r="3" fill="#00d4ff" />
      {/* legend */}
      <g fontSize="9" fontFamily="system-ui">
        <text x="10" y="250" fill="#00d4ff">{legendUpwind}</text>
        <text x="10" y="260" fill="#44ff88">{legendDownwind}</text>
      </g>
    </svg>
  );
}

// ============================================================================
// Resume offer banner shown above the menu when a recent interrupted race
// was found in localStorage. Reuses tp() for i18n; takes the saved setup
// + a callback for the user's choice (resume / dismiss).
// ============================================================================

function ResumeOffer({
  saved,
  tp,
  onResume,
  onDismiss,
}: {
  saved: { difficulty: 'easy' | 'medium' | 'hard'; windStrength: 'light' | 'medium' | 'heavy'; phase: string; ts: number };
  tp: (ru: string, en: string, pl: string, extras?: { es?: string; fr?: string; de?: string; it?: string }) => string;
  onResume: () => void;
  onDismiss: () => void;
}) {
  // Read the clock once, at mount: "saved 3 min ago" is fixed for this offer.
  const [now] = useState(() => Date.now());
  const minutesAgo = Math.max(1, Math.round((now - saved.ts) / 60000));
  const diff = DIFFICULTY_CONFIG[saved.difficulty];
  const level = tp(diff.label, diff.labelEn, diff.labelPl, { es: diff.labelEs, fr: diff.labelFr, de: diff.labelDe, it: diff.labelIt });
  const wind = saved.windStrength === 'light'
    ? tp('слабый ветер', 'light wind', 'słaby wiatr', { es: 'viento flojo', fr: 'vent faible', de: 'schwacher Wind', it: 'vento leggero' })
    : saved.windStrength === 'heavy'
      ? tp('сильный ветер', 'strong wind', 'silny wiatr', { es: 'viento fuerte', fr: 'vent fort', de: 'starker Wind', it: 'vento forte' })
      : tp('средний ветер', 'medium wind', 'średni wiatr', { es: 'viento medio', fr: 'vent moyen', de: 'mittlerer Wind', it: 'vento medio' });
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
      <div
        className="rounded-xl p-4 sm:p-5 flex flex-wrap items-center gap-3"
        style={{
          background: 'rgba(255, 170, 0, 0.08)',
          border: '1px solid rgba(255, 170, 0, 0.35)',
        }}
      >
        <span className="text-xl">⏸️</span>
        <div className="flex-1 min-w-[200px]">
          <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--warning)' }}>
            {tp(
              'Повторить гонку с прежними настройками?',
              'Restart the race with your previous settings?',
              'Powtórzyć wyścig z poprzednimi ustawieniami?',
              {
                es: '¿Reiniciar con los ajustes anteriores?',
                fr: 'Recommencer avec les réglages précédents ?',
                de: 'Rennen mit den bisherigen Einstellungen neu starten?',
                it: 'Ricominciare con le impostazioni precedenti?',
              },
            )}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {tp(
              `${level} · ${wind} · ${minutesAgo} мин назад`,
              `${level} · ${wind} · ${minutesAgo} min ago`,
              `${level} · ${wind} · ${minutesAgo} min temu`,
              {
                es: `${level} · ${wind} · hace ${minutesAgo} min`,
                fr: `${level} · ${wind} · il y a ${minutesAgo} min`,
                de: `${level} · ${wind} · vor ${minutesAgo} Min.`,
                it: `${level} · ${wind} · ${minutesAgo} min fa`,
              },
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResume}
            className="text-xs px-3 py-1.5 rounded-md font-semibold transition"
            style={{
              background: 'var(--accent-cyan)',
              color: 'var(--accent-ink)',
            }}
          >
            {tp('Продолжить', 'Resume', 'Wznów',
              { es: 'Continuar', fr: 'Reprendre', de: 'Fortsetzen', it: 'Riprendere' })}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs px-3 py-1.5 rounded-md transition border"
            style={{
              borderColor: 'rgba(139, 167, 184, 0.3)',
              color: 'var(--text-secondary)',
            }}
          >
            {tp('Закрыть', 'Dismiss', 'Zamknij',
              { es: 'Descartar', fr: 'Ignorer', de: 'Verwerfen', it: 'Ignora' })}
          </button>
        </div>
      </div>
    </div>
  );
}
