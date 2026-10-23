'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { legacyPick } from '@/lib/languages';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { playBeep, playStart, playTack, playMarkRound, playFinish, playNoGo, isMuted, toggleMuted } from '@/lib/sounds';
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
  WORLD, stepBoat, resolveCollisions, updateLap, raceAutopilotTurn, raceWaypoint, makeStandardCourse,
  WIND_DIRECTION_BASE as WIND_DIRECTION,
  calcTWA, deg2rad, distance, bearing,
  angleDiff,
} from '@/lib/race-physics';
import { drawVenue } from '@/features/venues/drawVenue';
import { useVenue } from '@/features/venues/useVenue';
import { GameMenu } from './GameMenu';
import { BOAT_STYLES, DIFFICULTY_CONFIG, type BoatStyle, type Difficulty } from './config';
import { useRaceView } from '@/features/race-3d/useRaceView';
import { METRES_PER_UNIT, nextTarget, raceRanks } from '@/features/race-3d/pose';
import { RaceToast, SpeedCard, Standings, WindCompass, type StandingRow, type ToastTone } from '@/features/race-hud/RaceHud';
import { polarFor, targetSpeed } from '@/features/race-hud/target';
import { eventText, type RaceEvent } from '@/features/race-hud/events';
import { isEmbed } from '@/lib/theme';

// three.js loads only when someone opens the race in 3D.
const Race3DView = dynamic(() => import('@/features/race-3d/Race3DView').then((m) => m.Race3DView), { ssr: false });

// ============================================================================
// TYPES
// ============================================================================

type GameState = 'menu' | 'briefing' | 'countdown' | 'racing' | 'finished' | 'replay';


interface Vec2 { x: number; y: number }

interface Boat {
  id: string;
  name: string;
  color: string;
  pos: Vec2;
  heading: number;       // degrees, 0 = up (north), clockwise
  speed: number;         // knots (game units)
  targetSpeed: number;
  isPlayer: boolean;
  nextMarkIdx: number;   // index of next mark to round
  lapDone: number;       // 0: before start, 1: windward rounded, 2: finished
  wake: Vec2[];
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
  const venueRef = useRef(venue);
  const langRef = useRef(lang);
  useEffect(() => { venueRef.current = venue; langRef.current = lang; }, [venue, lang]);
  // The map (2D) or the view from the boat (3D, src/features/race-3d). Both
  // read the same race refs; in 3D the canvas keeps only the mini-map.
  const { view3d, camera: raceCamera, setView3d, setCamera: setRaceCamera } = useRaceView();
  const view3dRef = useRef(view3d);
  useEffect(() => { view3dRef.current = view3d; }, [view3d]);
  // Inside the app (?embed=1) the site nav is hidden, so the race takes the whole height.
  const embed = useSyncExternalStore(noSubscribe, isEmbed, () => false);
  const race3dLabels = useMemo(() => ({
    metres: lang === 'ru' ? 'м' : 'm',
    loading: tl({ ru: 'Загружаем яхту', en: 'Loading the yacht', pl: 'Ładujemy jacht', es: 'Cargando el velero', fr: 'Chargement du voilier', de: 'Yacht wird geladen', it: 'Caricamento della barca' }),
    scene: tl({ ru: '3D-вид гонки', en: '3D race view', pl: 'Widok 3D wyścigu', es: 'Vista 3D de la regata', fr: 'Vue 3D de la course', de: '3D-Rennansicht', it: 'Vista 3D della regata' }),
    error: tl({ ru: '3D не загрузилось. Повтори или переключись на 2D.', en: "3D didn't load. Try again or switch to 2D.", pl: '3D się nie wczytało. Spróbuj ponownie albo przełącz na 2D.', es: 'El 3D no se cargó. Reinténtalo o cambia a 2D.', fr: "La 3D ne s'est pas chargée. Réessaie ou passe en 2D.", de: '3D wurde nicht geladen. Versuch es noch einmal oder wechsle zu 2D.', it: 'Il 3D non si è caricato. Riprova o passa al 2D.' }),
    retry: tl({ ru: 'Повторить', en: 'Try again', pl: 'Spróbuj ponownie', es: 'Reintentar', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova' }),
  }), [tl, lang]);
  const [gameState, setGameState] = useState<GameState>('menu');
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boatsRef = useRef<Boat[]>([]);
  const courseRef = useRef<Course>(makeCourse());
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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
    fetch('/api/player').then((r) => r.json()).then((d) => {
      if (d?.nickname) setNickname(d.nickname);
    }).catch(() => {});
  }, []);

  // Daily mode: read URL params and lock difficulty/wind
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const day = url.searchParams.get('daily');
    if (!day) return;
    setDailyDay(day);
    const d = url.searchParams.get('difficulty');
    const w = url.searchParams.get('wind');
    if (d === 'easy' || d === 'medium' || d === 'hard') setDifficulty(d);
    if (w === 'light' || w === 'medium' || w === 'heavy') setWindStrength(w);
  }, []);

  // Touch controls state (true while button held). Mirror to ref so the game
  // loop always reads the current value - fixes B1 (mobile steering).
  const [leftHeld, setLeftHeld] = useState(false);
  const [rightHeld, setRightHeld] = useState(false);
  const leftHeldRef = useRef(false);
  const rightHeldRef = useRef(false);
  useEffect(() => { leftHeldRef.current = leftHeld; }, [leftHeld]);
  useEffect(() => { rightHeldRef.current = rightHeld; }, [rightHeld]);

  // Autopilot: holds a target heading; any input turns it off
  const [autopilotOn, setAutopilotOn] = useState(false);
  const autopilotHeadingRef = useRef<number>(0);
  // Mirror autopilot state into a ref. The rAF game-loop effect closes over its
  // deps at setup ([gameState, difficulty]) and is intentionally NOT restarted
  // on toggle, so reading `autopilotOn` directly inside it was a stale closure -
  // the button engaged/disengaged nothing. The loop reads autopilotOnRef.current.
  const autopilotOnRef = useRef(false);
  useEffect(() => { autopilotOnRef.current = autopilotOn; }, [autopilotOn]);

  // Sound state (for UI toggle; actual playback reads live from lib)
  const [muted, setMutedState] = useState(false);
  useEffect(() => { setMutedState(isMuted()); }, []);

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

  // Boat visual style
  const [boatStyle, setBoatStyle] = useState<BoatStyle>('cruiser');
  const boatStyleRef = useRef<BoatStyle>(boatStyle);
  useEffect(() => { boatStyleRef.current = boatStyle; }, [boatStyle]);

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
          setNickname(d.nickname);
        }
        const res = await fetch('/api/race-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            difficulty,
            windStrength,
            missionId: selectedMission?.id ?? null,
            finishTimeSec: player.finishTime,
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
        setSaveState('saved');
      } catch (err) {
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
    if (gameState !== 'finished') return;
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
    if (gameState !== 'finished') return;
    if (replayAttemptedRef.current) return;
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2) return;
    if (logSamplesRef.current.length < 5) return;
    replayAttemptedRef.current = true;
    fetch('/api/replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        difficulty,
        windStrength,
        missionId: selectedMission?.id ?? null,
        finishTimeSec: player.finishTime,
        samples: logSamplesRef.current,
        events: logEventsRef.current,
        course: courseRef.current,
        nicknameFallback: nickname ?? 'Player',
      }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then((d) => { if (d?.code) setReplayCode(d.code); })
      .catch(() => { /* silent - replay is optional */ });
  }, [gameState, difficulty, windStrength, selectedMission, nickname]);

  // -----------------------------------------------------------------------
  // Initialize boats for a new race
  // -----------------------------------------------------------------------
  const initRace = useCallback((diff: Difficulty) => {
    const cfg = DIFFICULTY_CONFIG[diff];
    const course = courseRef.current;
    const lineCenter = { x: (course.startLine.a.x + course.startLine.b.x) / 2, y: course.startLine.a.y };
    const numBoats = cfg.opponents + 1;
    const boats: Boat[] = [];

    // Player in the middle
    boats.push({
      id: 'player',
      name: 'Ты',
      color: '#00d4ff',
      pos: { x: lineCenter.x, y: lineCenter.y + 30 },
      heading: 45,
      speed: 0,
      targetSpeed: 0,
      isPlayer: true,
      nextMarkIdx: 0,
      lapDone: 0,
      wake: [],
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
        targetSpeed: 0,
        isPlayer: false,
        nextMarkIdx: 0,
        lapDone: 0,
        wake: [],
        speedMul: cfg.aiSpeedMul * (0.97 + Math.random() * 0.06), // difficulty, a little spread between bots
      });
    }

    boatsRef.current = boats;
    setResults([]);
    setElapsed(0);
    setCoaching(null);
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
    setBestRecord(getBestRecord(difficulty, windStrength));
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
  }, [difficulty, windStrength, selectedMission, initRace]);

  const beginCountdown = useCallback(() => {
    saveRaceSetup({
      difficulty,
      windStrength,
      missionId: selectedMission?.id ?? null,
      phase: 'countdown',
    });
    setCountdown(3);
    setGameState('countdown');
  }, [difficulty, windStrength, selectedMission]);

  // Legacy name - kept so existing handlers don't break (e.g. "Ещё раз" button)
  const startRace = openBriefing;

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown === 0) {
      playStart();
      startTimeRef.current = performance.now();
      lastTimeRef.current = performance.now();
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
  }, [gameState, countdown, difficulty, windStrength, selectedMission]);

  // -----------------------------------------------------------------------
  // Keyboard input
  // -----------------------------------------------------------------------
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Game loop - also runs during countdown so boats can sail freely before
  // the race starts. Mark rounding, finish detection, race log and timer
  // are all suppressed during countdown.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'racing' && gameState !== 'countdown') return;
    const isRacing = gameState === 'racing';
    // Initialize lastTime for countdown when loop starts
    if (lastTimeRef.current === 0 || gameState === 'countdown') {
      lastTimeRef.current = performance.now();
    }

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const course = courseRef.current;
      const boats = boatsRef.current;

      // --- Wind shifts: slow sinusoidal direction drift + short gusts ---
      // Direction oscillates ±6° with period ~22s (slow shift)
      // Plus a faster ±2° wobble with period ~7s (nervous breeze)
      const raceT = (now - (startTimeRef.current || now)) / 1000;
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

        let turnInput = 0;
        if (boat.isPlayer) {
          const right = keysRef.current.has("arrowright") || keysRef.current.has("d") || rightHeldRef.current;
          const left = keysRef.current.has("arrowleft") || keysRef.current.has("a") || leftHeldRef.current;
          turnInput = Number(right) - Number(left);
          if (turnInput && autopilotOnRef.current) { setAutopilotOn(false); autopilotOnRef.current = false; }
          if (!turnInput && autopilotOnRef.current) turnInput = Math.max(-1, Math.min(1, angleDiff(boat.heading, autopilotHeadingRef.current) / 12));
        } else turnInput = raceAutopilotTurn(boat, course, windDirRef.current);
        stepBoat(boat, dt, windDirRef.current, windGustRef.current, { turn: turnInput }, { windStrengthMul: windStrengthRef.current, speedMul: boat.speedMul });
        boat.targetSpeed = boat.speed;
      }
      resolveCollisions(boats, dt);

      // Re-process course progression after collision adjustments
      for (const boat of boats) {
        const prevPos = prevPositions.get(boat.id) ?? { ...boat.pos };

        // --- Wake ---
        if (boat.speed > 0.3) {
          boat.wake.unshift({ ...boat.pos });
          if (boat.wake.length > 30) boat.wake.pop();
        }

        // Mark / finish detection only counts once the race is officially on.
        if (!isRacing) continue;

        const event = updateLap(boat, prevPos, course, (now - startTimeRef.current) / 1000);
        if (event === "mark") {
          const t = (now - startTimeRef.current) / 1000;
          markTimesRef.current.set(boat.id, t);
          if (boat.isPlayer) {
            const times = [...markTimesRef.current.values()];
            showEvent({ kind: 'mark', place: times.filter((x) => x <= t).length, gapSec: t - Math.min(...times) }, 'info');
          }
        }
        if (boat.isPlayer && event === "mark") {
          logEventsRef.current.push({ type: "mark-rounded", t: (now - startTimeRef.current) / 1000, note: "windward-port" });
          playMarkRound();
        } else if (boat.isPlayer && event === "finish") {
          logEventsRef.current.push({ type: "finish", t: boat.finishTime! });
          playFinish();
        }
      }

      // --- Race log recording (player only, race-time only) ---
      const playerBoat = boats.find((b) => b.isPlayer);
      if (isRacing && playerBoat && playerBoat.lapDone < 2) {
        const t = (now - startTimeRef.current) / 1000;
        if (t - lastSampleTimeRef.current >= 0.5) {
          logSamplesRef.current.push({
            t,
            x: Math.round(playerBoat.pos.x),
            y: Math.round(playerBoat.pos.y),
            heading: Math.round(playerBoat.heading),
            twa: Math.round(calcTWA(playerBoat.heading, windDirRef.current)),
            speed: Math.round(playerBoat.speed * 10) / 10,
            lap: playerBoat.lapDone,
          });
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
      const playerTwa = calcTWA(player.heading, windDirRef.current);
      setPlayerTWA(playerTwa);
      setPlayerSpeed(player.speed);
      // Live race time read from the clock each frame. Do NOT use the `elapsed`
      // state here or in the finish checks below: this loop effect closes over
      // `elapsed` at mount (deps are [gameState, difficulty]) and setElapsed does
      // not retrigger it, so the captured value would stay frozen at 0 and the
      // 5-minute timeout / post-finish race-end paths would never fire (a stuck
      // AI in the no-go zone could hang the race forever).
      const elapsedSec = isRacing ? (now - startTimeRef.current) / 1000 : 0;
      if (isRacing) setElapsed(elapsedSec);

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

      // Render
      draw();

      // Check race end: all boats finished OR player finished - only when racing
      const allFinished = boats.every((b) => b.lapDone === 2);
      const playerFinished = player.lapDone === 2;
      const tooLong = elapsedSec > 300; // 5 minutes max

      if (isRacing && (allFinished || (playerFinished && elapsedSec > (player.finishTime ?? 0) + 15) || tooLong)) {
        const sorted = [...boats]
          .map((b) => ({ name: b.name, time: b.finishTime ?? Infinity, color: b.color, isPlayer: b.isPlayer }))
          .sort((a, b) => a.time - b.time);
        setResults(sorted);
        setGameState('finished');
        // Race ended cleanly - drop the resume offer so the next reload
        // starts from a fresh menu.
        clearRaceSetup();

        // Save / compare against personal-best for this (difficulty, wind)
        // bucket. Only counts ACTUAL finishers - the 5-minute timeout above
        // sets player.finishTime to undefined which the lib filters out.
        if (player.finishTime != null) {
          const rec = tryUpdateBestRecord(difficulty, windStrength, player.finishTime);
          setBestRecord(rec.currentBest);
          setIsNewRecord(rec.isNewRecord);
        }

        // --- Evaluate selected mission ---
        if (selectedMission) {
          const tacks = logEventsRef.current.filter((e) => e.type === 'tack').length;
          const noGoEntries = logEventsRef.current.filter((e) => e.type === 'no-go-entered').length;
          const topSpeed = logSamplesRef.current.reduce((m, s) => Math.max(m, s.speed), 0);
          const metrics: RaceMetrics = {
            finishTimeSec: player.finishTime ?? null,
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
        setCoachingLoading(true);
        fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.coaching) {
              setCoaching(data.coaching);
            } else {
              // Fall back to local rule-based analysis so the user still gets feedback
              const local = analyseRaceLocally(payload, lang);
              setCoaching(local);
              if (data.fallback) setCoachingError(null);
              else setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostępne - pokazuję analizę lokalną', { es: 'IA no disponible - se muestra el análisis local', fr: 'IA indisponible - analyse locale affichée', de: 'KI nicht verfügbar - lokale Analyse wird angezeigt', it: 'IA non disponibile - viene mostrata l\'analisi locale' }));
            }
          })
          .catch(() => {
            // Network error - use local analysis
            const local = analyseRaceLocally(payload, lang);
            setCoaching(local);
            setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostępne - pokazuję analizę lokalną', { es: 'IA no disponible - se muestra el análisis local', fr: 'IA indisponible - analyse locale affichée', de: 'KI nicht verfügbar - lokale Analyse wird angezeigt', it: 'IA non disponibile - viene mostrata l\'analisi locale' }));
          })
          .finally(() => setCoachingLoading(false));

        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, difficulty]);

  // -----------------------------------------------------------------------
  // Canvas setup (retina)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [gameState]);

  // -----------------------------------------------------------------------
  // Draw function
  // -----------------------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const course = courseRef.current;
    const boats = boatsRef.current;
    const player = boats.find((b) => b.isPlayer);
    if (!player) return;

    // In 3D the scene is Race3DView under this canvas; only the mini-map stays on top.
    if (view3dRef.current) {
      ctx.clearRect(0, 0, W, H);
      drawMiniMap(ctx, W, H, boats, course, tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' }));
      return;
    }

    // Camera follows player
    const scale = Math.min(W / 500, H / 700);
    const camX = player.pos.x;
    const camY = player.pos.y;
    const toScreen = (p: Vec2) => ({
      x: W / 2 + (p.x - camX) * scale,
      y: H / 2 + (p.y - camY) * scale,
    });

    // --- Background: ocean ---
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#051425');
    grad.addColorStop(1, '#0a1f3d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // --- Water pattern (world-locked) ---
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    const patternSize = 40 * scale;
    const offX = ((W / 2 - camX * scale) % patternSize + patternSize) % patternSize;
    const offY = ((H / 2 - camY * scale) % patternSize + patternSize) % patternSize;
    for (let x = -patternSize + offX; x < W; x += patternSize) {
      for (let y = -patternSize + offY; y < H; y += patternSize) {
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // --- Venue: shore and islands around the race area (never inside it) ---
    drawVenue(ctx, venueRef.current, toScreen, scale, langRef.current);

    // --- No-go zone projected around LIVE wind direction (visual aid) ---
    ctx.save();
    const playerScreen = toScreen(player.pos);
    const wd = windDirRef.current;
    ctx.translate(playerScreen.x, playerScreen.y);
    ctx.rotate(deg2rad(wd)); // rotate local frame so wind points up
    ctx.beginPath();
    const coneLen = 120 * scale;
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, coneLen, -Math.PI / 2 - deg2rad(30), -Math.PI / 2 + deg2rad(30));
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,68,68,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,68,68,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Wind arrow (short cyan) pointing DOWN from wind source toward player
    ctx.beginPath();
    const arrowLen = 22 * scale;
    ctx.moveTo(0, -coneLen * 0.6);
    ctx.lineTo(0, -coneLen * 0.6 + arrowLen);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -coneLen * 0.6 + arrowLen - 4);
    ctx.lineTo(0, -coneLen * 0.6 + arrowLen);
    ctx.lineTo(4, -coneLen * 0.6 + arrowLen - 4);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
    ctx.fill();
    ctx.restore();

    // --- Start/Finish line ---
    const lineA = toScreen(course.startLine.a);
    const lineB = toScreen(course.startLine.b);
    ctx.strokeStyle = '#ffaa00';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineA.x, lineA.y);
    ctx.lineTo(lineB.x, lineB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Laylines from windward mark (shift with live wind) ---
    const windwardScreen = toScreen(course.marks[0].pos);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,68,68,0.25)';
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1;
    const laylen = 400 * scale;
    const wdL = windDirRef.current;
    // Port layline = wind direction + 180 + 45 (downwind-right of wind source)
    const portA = deg2rad(wdL + 180 + 45);
    const starA = deg2rad(wdL + 180 - 45);
    ctx.beginPath();
    ctx.moveTo(windwardScreen.x, windwardScreen.y);
    ctx.lineTo(windwardScreen.x + Math.sin(portA) * laylen, windwardScreen.y - Math.cos(portA) * laylen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(windwardScreen.x, windwardScreen.y);
    ctx.lineTo(windwardScreen.x + Math.sin(starA) * laylen, windwardScreen.y - Math.cos(starA) * laylen);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- Marks ---
    for (const mark of course.marks) {
      const p = toScreen(mark.pos);
      ctx.save();
      // Pulsing outer ring
      const pulse = 1 + Math.sin(performance.now() / 400) * 0.15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, mark.radius * scale * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,170,0,0.2)';
      ctx.fill();
      // Mark circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, mark.radius * scale * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      // Label
      if (mark.type === 'windward') {
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const markLabel = tp(mark.label, mark.labelEn, mark.labelPl, { es: mark.labelEs, fr: mark.labelFr, de: mark.labelDe, it: mark.labelIt });
        ctx.fillText(markLabel, p.x, p.y - mark.radius * scale * 1.8);
      }
      ctx.restore();
    }

    // --- Boats & wakes ---
    for (const boat of boats) {
      // Wake
      if (boat.wake.length > 1) {
        ctx.save();
        for (let i = 0; i < boat.wake.length - 1; i++) {
          const p = toScreen(boat.wake[i]);
          ctx.globalAlpha = (1 - i / boat.wake.length) * 0.4;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5 * scale * (1 - i / boat.wake.length), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Boat
      const bp = toScreen(boat.pos);
      drawBoat(ctx, bp.x, bp.y, boat.heading, boat.color, scale, boat.isPlayer, windDirRef.current, boat.isPlayer ? boatStyleRef.current : 'cruiser');

      // Name label for opponents
      if (!boat.isPlayer) {
        ctx.save();
        ctx.fillStyle = boat.color;
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.8;
        ctx.fillText(boat.name, bp.x, bp.y - 24 * scale);
        ctx.restore();
      }
    }

    // --- Arrow pointing to next mark ---
    if (player.lapDone < 2) {
      const target = raceWaypoint(player, course);
      const targetScreen = toScreen(target);
      // Only show arrow if target is off-screen or far
      const distToTarget = distance(player.pos, target);
      if (distToTarget > 180) {
        const bear = bearing(player.pos, target);
        const arrowR = Math.min(W, H) * 0.22;
        const ax = W / 2 + Math.sin(deg2rad(bear)) * arrowR;
        const ay = H / 2 - Math.cos(deg2rad(bear)) * arrowR;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(deg2rad(bear));
        ctx.fillStyle = 'rgba(0,212,255,0.85)';
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 8);
        ctx.lineTo(0, 4);
        ctx.lineTo(-8, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        // Distance label
        ctx.save();
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(distToTarget * METRES_PER_UNIT)} ${langRef.current === 'ru' ? 'м' : 'm'}`, ax, ay + 24);
        ctx.restore();
      }
    }

    // --- Mini-map (bottom-right) ---
    drawMiniMap(ctx, W, H, boats, course, tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' }));
  }, []);

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  const backToMenu = useCallback(() => {
    setGameState('menu');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Re-render canvas on countdown / state changes
  useEffect(() => {
    if (gameState === 'countdown') {
      // Ensure canvas is ready
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      draw();
    }
  }, [gameState, countdown, draw]);

  const playerFinished = results.find((r) => r.isPlayer);
  const playerRank = results.findIndex((r) => r.isPlayer) + 1;
  const currentPoS = useMemo(() => getPointOfSailName(playerTWA), [playerTWA]);
  // Target speeds for the HUD, solved once per wind strength when a race runs.
  const polar = useMemo(() => (gameState === 'racing' ? polarFor(12 * windStrengthMul) : null), [gameState, windStrengthMul]);
  // Distance to the next target in metres, at the scale of the 3D race (ADR-0006).
  const hudPlayer = boatsRef.current.find((b) => b.isPlayer);
  const hudTarget = hudPlayer ? nextTarget(hudPlayer, courseRef.current) : null;
  const distanceToGo = hudPlayer && hudTarget
    ? ` · ${Math.round(distance(hudPlayer.pos, hudTarget) * METRES_PER_UNIT)} ${lang === 'ru' ? 'м' : 'm'}`
    : '';

  // =====================================================================
  // MENU SCREEN
  // =====================================================================
  if (gameState === 'menu') {
    return (
      <>
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
              // openBriefing will re-save the setup with a fresh ts
              setTimeout(openBriefing, 0);
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
          boatStyle={boatStyle}
          setBoatStyle={setBoatStyle}
          selectedMission={selectedMission}
          pickMission={pickMission}
          openBriefing={openBriefing}
        />
      </>
    );
  }

  // =====================================================================
  // BRIEFING SCREEN - explains the race before countdown
  // =====================================================================
  if (gameState === 'briefing') {
    return (
      <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={backToMenu}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center gap-1"
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
        {/* The race trims the sails itself (trimForDrive); by-hand trim lives in
            the trim trainer. Said once, plainly, so a different speed there is
            no surprise. */}
        <p className="text-sm text-[var(--text-secondary)] mb-5">
          {tl({
            ru: 'Паруса настраиваются сами, ты рулишь. Трим вручную: «Тренажёр трима».',
            en: 'The sails trim themselves, you steer. To trim by hand: the Sail trim trainer.',
            pl: 'Żagle trymują się same, ty sterujesz. Trym ręczny: Trenażer trymu.',
            es: 'Las velas se ajustan solas, tú gobiernas. Para trimar a mano: el Simulador de trimado.',
            fr: 'Les voiles se règlent seules, tu barres. Pour régler à la main : Réglage des voiles.',
            de: 'Die Segel trimmen sich selbst, du steuerst. Von Hand trimmen: im Segeltrimm-Trainer.',
            it: 'Le vele si regolano da sole, tu timoni. Per regolarle a mano: Regolazione delle vele.',
          })}
        </p>

        {/* One card: the course with its four steps, and three rules. */}
        <div className="card p-4 sm:p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' })}</div>
            <CoursePreview />
            <ol className="text-sm text-[var(--text-secondary)] mt-4 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от оранжевой линии внизу.', 'Start from the orange line at the bottom.', 'Start z pomarańczowej linii na dole.', { es: 'La salida es desde la línea naranja de abajo.', fr:'Départ depuis la ligne orange en bas.', de: 'Start an der orangen Linie unten.', it: 'Partenza dalla linea arancione in basso.' })}</li>
              <li>{tp('Идёшь', 'Work', 'Płyniesz', { es: 'Sube', fr: 'Remonte', de: 'Segle', it: 'Risali' })} <span className="text-[var(--accent-cyan)] font-semibold">{tp('галсами', 'upwind in tacks', 'halsami', { es: 'dando bordos', fr: 'en louvoyant', de: 'in Kreuzschlägen', it: 'bordeggiando' })}</span> {tp('к верхнему знаку - прямо против ветра нельзя.', 'to the windward mark - you can\'t sail straight into the wind.', 'do znaku nawietrznego - prosto pod wiatr się nie da.', { es: 'hasta la baliza de barlovento - directo contra el viento no se puede.', fr: 'jusqu\'à la bouée au vent - impossible d\'aller droit contre le vent.', de: 'zur Luvtonne - direkt gegen den Wind geht es nicht.', it: 'fino alla boa di bolina - dritti controvento non si può.' })}</li>
              <li>{tp('Обходишь верхний знак (подойди на ~20 м).', 'Round the windward mark (get within ~20 m).', 'Okrążasz znak nawietrzny (podejdź na ~20 m).', { es: 'Rodea la baliza de barlovento (acércate a ~20 m).', fr: 'Vire la bouée au vent (approche-toi à ~20 m).', de: 'Runde die Luvtonne (komm auf ~20 m heran).', it: 'Gira la boa di bolina (avvicinati a ~20 m).' })}</li>
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
                ru: 'Рули стрелками ← → (на телефоне кнопками внизу), AUTO держит курс.',
                en: 'Steer with ← → (on a phone, the buttons at the bottom); AUTO holds your course.',
                pl: 'Steruj strzałkami ← → (na telefonie przyciskami na dole); AUTO trzyma kurs.',
                es: 'Gobierna con ← → (en el móvil, con los botones de abajo); AUTO mantiene el rumbo.',
                fr: 'Barre avec ← → (sur téléphone, avec les boutons en bas) ; AUTO garde le cap.',
                de: 'Steuere mit ← → (am Handy mit den Tasten unten); AUTO hält den Kurs.',
                it: 'Timona con ← → (sul telefono, con i pulsanti in basso); AUTO mantiene la rotta.',
              }) },
            ].map((rule) => (
              <li key={rule.icon} className="flex items-start gap-3">
                <BriefingIcon kind={rule.icon as 'nogo' | 'tack' | 'steer'} />
                <span className="text-sm leading-relaxed text-[var(--text-secondary)]">{rule.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={beginCountdown}
          className="w-full min-h-[52px] py-3 rounded-xl font-semibold text-lg transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]"
          style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
        >
          {tp('Готов - старт через 3·2·1', 'Ready - starting in 3·2·1', 'Gotowy - start za 3·2·1', { es: 'Listo - salida en 3·2·1', fr: 'Prêt - départ dans 3·2·1', de: 'Bereit - Start in 3·2·1', it: 'Pronto - partenza tra 3·2·1' })}
        </button>
      </div>
    );
  }

  // =====================================================================
  // RACING / COUNTDOWN / FINISHED SCREENS (Canvas)
  // =====================================================================
  return (
    <div className="relative w-full" style={{ height: embed ? '100dvh' : 'calc(100dvh - var(--site-nav-h, 56px))' }}>
      {view3d && (gameState === 'countdown' || gameState === 'racing') && (
        <div className="absolute inset-0" data-testid="race-3d">
          <Race3DView boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={venue} camera={raceCamera} labels={race3dLabels} />
        </div>
      )}
      <canvas ref={canvasRef} className="relative block w-full h-full" style={{ touchAction: 'none', pointerEvents: view3d ? 'none' : undefined }} />

      {/* HUD - top bar */}
      {gameState === 'racing' && (
        <>
          {/* HUD (src/features/race-hud): speed against the target for this
              angle, the wind relative to the bow, the standings with the clock. */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
            <SpeedCard speed={playerSpeed} target={polar ? targetSpeed(polar, playerTWA) : 0}
              pointName={legacyPick(currentPoS, 'name', lang)} pointColor={currentPoS.color} />
          </div>
          <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2">
            <WindCompass twa={playerTWA} />
          </div>
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
            <Standings rows={standings} time={formatTime(elapsed)} />
          </div>
          {toast && (
            <div key={toast.id} className="absolute left-1/2 -translate-x-1/2 top-[9.75rem] sm:top-[8.5rem]">
              <RaceToast text={toast.text} tone={toast.tone} />
            </div>
          )}

          {/* Mark progress indicator - above touch controls on mobile */}
          <div className="absolute left-1/2 -translate-x-1/2 card px-3 py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
               style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 190px)' }}>
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 0 && `→ ${tp('К верхнему знаку', 'To windward mark', 'Do znaku nawietrznego', { es: 'A la baliza de barlovento', fr: 'Vers la bouée au vent', de: 'Zur Luvtonne', it: 'Alla boa di bolina' })}${distanceToGo}`}
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 1 && `→ ${tp('На финиш', 'To finish', 'Do mety', { es: 'A la llegada', fr: 'Vers l\'arrivée', de: 'Zum Ziel', it: 'All\'arrivo' })}${distanceToGo}`}
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 2 && `✓ ${tp('Финиш!', 'Finish!', 'Meta!', { es: '¡Llegada!', fr: 'Arrivée !', de: 'Im Ziel!', it: 'Arrivo!' })}`}
          </div>

          {/* Mission hint (if any) - under the mark progress, only during race */}
          {selectedMission && gameState === 'racing' && (
            <div className="absolute left-1/2 -translate-x-1/2 card px-3 py-1.5 text-[10px] sm:text-[11px] max-w-[280px] text-center"
                 style={{ backdropFilter: 'blur(8px)', background: 'rgba(0, 212, 255, 0.15)', borderColor: 'rgba(0, 212, 255, 0.4)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 230px)' }}>
              <span className="mr-1">{selectedMission.emoji}</span>
              <span className="text-[var(--accent-cyan)] font-semibold">{tp(selectedMission.titleRu, selectedMission.titleEn, selectedMission.titlePl, { es: selectedMission.titleEs, fr: selectedMission.titleFr, de: selectedMission.titleDe, it: selectedMission.titleIt })}:</span>{' '}
              <span className="text-[var(--text-secondary)]">{tp(selectedMission.hintRu, selectedMission.hintEn, selectedMission.hintPl, { es: selectedMission.hintEs, fr: selectedMission.hintFr, de: selectedMission.hintDe, it: selectedMission.hintIt })}</span>
            </div>
          )}

          {/* Mute toggle */}
          <button
            onClick={() => setMutedState(toggleMuted())}
            aria-label={muted
              ? tp('Включить звук', 'Unmute', 'Włącz dźwięk', { es: 'Activar sonido', fr: 'Activer le son', de: 'Ton an', it: 'Attiva audio' })
              : tp('Выключить звук', 'Mute', 'Wycisz', { es: 'Silenciar', fr: 'Couper le son', de: 'Ton aus', it: 'Disattiva audio' })}
            className="absolute left-2 top-[6.5rem] sm:left-4 sm:top-auto sm:bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] w-11 h-11 rounded-full card flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={backToMenu}
            className="absolute left-[3.75rem] top-[6.5rem] sm:left-[4.5rem] sm:top-auto sm:bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] min-h-11 px-3 card flex items-center text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}
          >
            ← {tp('Меню', 'Menu', 'Menu', { es: 'Menú', fr: 'Menu', de: 'Menü', it: 'Menu' })}
          </button>

          {/* Autopilot button - above touch controls, safe-area aware */}
          <button
            onClick={() => {
              const player = boatsRef.current.find((b) => b.isPlayer);
              if (!player) return;
              if (autopilotOn) {
                setAutopilotOn(false);
                autopilotOnRef.current = false;
              } else {
                autopilotHeadingRef.current = player.heading;
                setAutopilotOn(true);
                autopilotOnRef.current = true;
              }
            }}
            title={tp('AUTO: удерживает текущий курс. Выключится от любого поворота.',
                     'AUTO: holds current heading. Disengages on any turn input.',
                     'AUTO: trzyma bieżący kurs. Wyłącza się przy każdym skręcie.',
                     {
                       es: 'AUTO: mantiene el rumbo actual. Se desactiva en cuanto giras.',
                       fr: 'AUTO : garde le cap actuel. Se coupe dès que tu tournes.',
                       de: 'AUTO: hält den aktuellen Kurs. Schaltet sich bei jeder Lenkbewegung ab.',
                       it: 'AUTO: mantiene la rotta attuale. Si disattiva appena giri.',
                     })}
            className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition active:scale-95"
            style={{
              background: autopilotOn ? 'rgba(0, 212, 255, 0.85)' : 'rgba(21, 37, 64, 0.85)',
              color: autopilotOn ? '#0a1628' : 'var(--accent-cyan)',
              border: '1px solid rgba(0, 212, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 128px)',
            }}
          >
            {autopilotOn ? `⏸ ${tp('AUTO вкл', 'AUTO on', 'AUTO wł.', { es: 'AUTO activo', fr: 'AUTO actif', de: 'AUTO an', it: 'AUTO attivo' })}` : `▶ ${tp('AUTO', 'AUTO', 'AUTO', { es: 'AUTO', fr: 'AUTO', de: 'AUTO', it: 'AUTO' })}`}
          </button>

          {/* Map or view from the boat, and the 3D camera: between the steering buttons on a phone */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 44px)' }}>
            <div role="radiogroup" aria-label={tl({ ru: 'Вид гонки', en: 'Race view', pl: 'Widok wyścigu', es: 'Vista de la regata', fr: 'Vue de la course', de: 'Rennansicht', it: 'Vista della regata' })}
              className="flex overflow-hidden rounded-full" style={{ border: '1px solid rgba(0, 212, 255, 0.5)', background: 'rgba(21, 37, 64, 0.85)', backdropFilter: 'blur(8px)' }}>
              {[false, true].map((on) => (
                <button key={String(on)} type="button" role="radio" aria-checked={view3d === on} onClick={() => setView3d(on)}
                  className="min-h-11 min-w-11 px-3 text-xs font-semibold transition"
                  style={{ background: view3d === on ? 'rgba(0, 212, 255, 0.85)' : 'transparent', color: view3d === on ? '#0a1628' : 'var(--accent-cyan)' }}>
                  {on ? '3D' : '2D'}
                </button>
              ))}
            </div>
            {view3d && (() => {
              const label = raceCamera === 'high'
                ? tl({ ru: 'Камера за кормой', en: 'Camera behind the stern', pl: 'Kamera za rufą', es: 'Cámara tras la popa', fr: 'Caméra derrière la poupe', de: 'Kamera hinter dem Heck', it: 'Camera dietro la poppa' })
                : tl({ ru: 'Камера сверху', en: 'Camera from above', pl: 'Kamera z góry', es: 'Cámara desde arriba', fr: 'Caméra en hauteur', de: 'Kamera von oben', it: "Camera dall'alto" });
              return (
                <button type="button" onClick={() => setRaceCamera(raceCamera === 'high' ? 'stern' : 'high')} aria-label={label} title={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95"
                  style={{ border: '1px solid rgba(0, 212, 255, 0.5)', background: 'rgba(21, 37, 64, 0.85)', backdropFilter: 'blur(8px)', color: 'var(--accent-cyan)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="7" width="12" height="10" rx="2" />
                    <path d="M15 11l6-3v8l-6-3z" />
                  </svg>
                </button>
              );
            })()}
          </div>

          {/* Touch controls - safe-area aware so they never hide behind mobile browser UI */}
          <div
            className="absolute left-0 right-0 flex justify-between items-end px-4 pointer-events-none md:hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
          >
            <button
              onPointerDown={(e) => { e.preventDefault(); setLeftHeld(true); }}
              onPointerUp={() => setLeftHeld(false)}
              onPointerCancel={() => setLeftHeld(false)}
              onPointerLeave={() => setLeftHeld(false)}
              aria-label={tp('Поворот влево', 'Turn left', 'Skręt w lewo', { es: 'Girar a la izquierda', fr: 'Tourner à gauche', de: 'Nach links steuern', it: 'Gira a sinistra' })}
              className="pointer-events-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold transition active:scale-95 select-none"
              style={{
                background: leftHeld ? 'rgba(0, 212, 255, 0.35)' : 'rgba(21, 37, 64, 0.7)',
                border: '2px solid rgba(0, 212, 255, 0.5)',
                color: 'var(--accent-cyan)',
                backdropFilter: 'blur(8px)',
                touchAction: 'none',
              }}
            >
              ←
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); setRightHeld(true); }}
              onPointerUp={() => setRightHeld(false)}
              onPointerCancel={() => setRightHeld(false)}
              onPointerLeave={() => setRightHeld(false)}
              aria-label={tp('Поворот вправо', 'Turn right', 'Skręt w prawo', { es: 'Girar a la derecha', fr: 'Tourner à droite', de: 'Nach rechts steuern', it: 'Gira a destra' })}
              className="pointer-events-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold transition active:scale-95 select-none"
              style={{
                background: rightHeld ? 'rgba(0, 212, 255, 0.35)' : 'rgba(21, 37, 64, 0.7)',
                border: '2px solid rgba(0, 212, 255, 0.5)',
                color: 'var(--accent-cyan)',
                backdropFilter: 'blur(8px)',
                touchAction: 'none',
              }}
            >
              →
            </button>
          </div>
        </>
      )}

      {/* Countdown overlay */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center">
            <div className="text-8xl font-bold mb-4 pulse-gentle" style={{ color: 'var(--accent-cyan)' }}>
              {countdown === 0 ? tp('СТАРТ!', 'START!', 'START!', { es: '¡SALIDA!', fr: 'DÉPART !', de: 'START!', it: 'VIA!' }) : countdown}
            </div>
            <div className="text-[var(--text-secondary)]">{tp('Приготовься к старту...', 'Get ready for the start...', 'Przygotuj się do startu...', { es: 'Prepárate para la salida...', fr: 'Prépare-toi pour le départ...', de: 'Mach dich bereit für den Start...', it: 'Preparati alla partenza...' })}</div>
          </div>
        </div>
      )}

      {/* Finish overlay */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="card p-6 sm:p-8 max-w-lg w-full my-4">
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
            <details className="mb-5 card p-3">
              <summary className="cursor-pointer text-xs font-semibold tracking-wider text-[var(--text-muted)] flex items-center justify-between">
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
            <div className="mb-5 p-4 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🧭</span>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{tp('AI-тренер', 'AI coach', 'Trener AI',
                  { es: 'Entrenador IA', fr: 'Coach IA', de: 'KI-Trainer', it: 'Coach IA' })}</div>
              </div>
              {/* Apple Review 2025 + EU AI Act: explicit AI-content disclosure. */}
              <div className="text-[10px] text-[var(--text-muted)] mb-3 leading-relaxed">
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
              </div>
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

                  <div className="pt-2 border-t border-[rgba(0,212,255,0.15)]">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">{tp('Цель на следующую гонку', 'Goal for next race', 'Cel na następny wyścig', { es: 'Objetivo para la próxima regata', fr: 'Objectif pour la prochaine course', de: 'Ziel für das nächste Rennen', it: 'Obiettivo per la prossima regata' })}</div>
                    <p className="text-xs text-[var(--accent-cyan)]">{coachNextGoal(coaching)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Nickname prompt: first finish without a stored nickname. The
                nickname is stored server-side per session via POST /api/player
                (same flow /multiplayer uses), API validates 2-20 chars.
                Non-blocking: "skip" dismisses without saving. */}
            {saveState === 'prompting' && (
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
                    className="flex-1 min-w-0 px-3 py-2 rounded text-sm"
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
            {saveState === 'saving' && (
              <div className="mb-4 text-xs text-[var(--text-muted)]">
                {tp('Сохраняю результат...', 'Saving result...', 'Zapisywanie wyniku...',
                  { es: 'Guardando el resultado...', fr: 'Enregistrement du résultat...', de: 'Ergebnis wird gespeichert...', it: 'Salvataggio del risultato...' })}
              </div>
            )}
            {saveState === 'saved' && (
              <div className="mb-4 text-xs" style={{ color: 'var(--success)' }}>
                ✓ {tp('Результат сохранён в лидерборд', 'Result saved to the leaderboard', 'Wynik zapisany w rankingu',
                  { es: 'Resultado guardado en la clasificación', fr: 'Résultat enregistré au classement', de: 'Ergebnis in der Bestenliste gespeichert', it: 'Risultato salvato in classifica' })}
              </div>
            )}
            {saveState === 'error' && saveError && (
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
                href="/leaderboard"
                className="flex-1 min-w-[100px] py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition"
              >
                🏆 {tp('Лидерборд', 'Leaderboard', 'Ranking',
                  { es: 'Clasificación', fr: 'Classement', de: 'Bestenliste', it: 'Classifica' })}
              </Link>
              <button
                onClick={openBriefing}
                className="flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: `linear-gradient(135deg, ${DIFFICULTY_CONFIG[difficulty].color}, ${DIFFICULTY_CONFIG[difficulty].color}cc)`,
                  color: '#0a1628',
                }}
              >
                {tp('Ещё раз', 'Again', 'Jeszcze raz', { es: 'Otra vez', fr: 'Rejouer', de: 'Noch mal', it: 'Di nuovo' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replay overlay */}
      {gameState === 'replay' && (
        <ReplayOverlay
          samples={logSamplesRef.current}
          events={logEventsRef.current}
          course={courseRef.current}
          mistakes={coaching?.mistakes ?? []}
          onClose={() => setGameState('finished')}
        />
      )}
    </div>
  );
}

// ============================================================================
// DRAWING HELPERS
// ============================================================================

function drawBoat(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, heading: number,
  color: string, scale: number, isPlayer: boolean,
  windDir = 0, style: BoatStyle = 'cruiser',
) {
  const cfg = BOAT_STYLES.find((b) => b.id === style) ?? BOAT_STYLES[0];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(deg2rad(heading));
  // Player boat is ~1.8x bigger than AI so you clearly see your sail shape.
  // AI bumped ~1.4x too - they were too tiny to see their sails.
  const s = scale * (isPlayer ? 1.8 : 1.35) * cfg.hullScale;
  const w = cfg.hullWidth; // hull width multiplier

  const hullLen = 14 * s;
  const hullHalfW = 7 * s * w;
  const hullStern = 4.5 * s * w;

  // Hull shadow
  ctx.save();
  ctx.translate(1, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.moveTo(0, -hullLen);
  ctx.quadraticCurveTo(hullHalfW, 0, hullStern, 12 * s);
  ctx.lineTo(-hullStern, 12 * s);
  ctx.quadraticCurveTo(-hullHalfW, 0, 0, -hullLen);
  ctx.fill();
  ctx.restore();

  // Hull
  const hullGrad = ctx.createLinearGradient(-hullHalfW, 0, hullHalfW, 0);
  hullGrad.addColorStop(0, isPlayer ? '#cfe7f4' : '#aaaaaa');
  hullGrad.addColorStop(0.5, '#ffffff');
  hullGrad.addColorStop(1, isPlayer ? '#8fb4c9' : '#666666');
  ctx.fillStyle = hullGrad;
  ctx.strokeStyle = isPlayer ? '#ffffff' : '#555555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -hullLen);
  ctx.quadraticCurveTo(hullHalfW, 0, hullStern, 12 * s);
  ctx.lineTo(-hullStern, 12 * s);
  ctx.quadraticCurveTo(-hullHalfW, 0, 0, -hullLen);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Style-specific deck trim
  if (style === 'racer') {
    // Racing stripe along the deck
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(-0.8 * s, -11 * s, 1.6 * s, 20 * s);
    ctx.globalAlpha = 1;
  }

  // Cockpit
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 2.2 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mast dot
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, -3 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Both sails angle based on TWA. Wind comes FROM windDir, so from the boat's
  // local frame the wind source is at (windDir - heading) relative. The sail
  // extends to the LEE side (opposite the wind source).
  const twa = calcTWA(heading, windDir);
  const absTWA = Math.abs(twa);
  let mainAngleFromCenterline = 0;
  if (absTWA < 30) mainAngleFromCenterline = 0;
  else if (absTWA < 45) mainAngleFromCenterline = 12;
  else if (absTWA < 90) mainAngleFromCenterline = 30;
  else if (absTWA < 140) mainAngleFromCenterline = 55;
  else mainAngleFromCenterline = 75;
  // TWA > 0 means wind FROM starboard, sail goes to PORT (left, negative X in local frame).
  const sailSide = twa > 0 ? -1 : 1;
  const jibFactor = absTWA < 120 ? 0.75 : 0.55;     // jib sheeted tighter than main upwind
  const inNoGo = absTWA < 30;
  const jibBlanketed = absTWA > 155;                // dead downwind - main blocks wind from jib

  // --- Mainsail (behind mast, extends aft) ---
  ctx.save();
  ctx.rotate(deg2rad(mainAngleFromCenterline * sailSide));
  ctx.fillStyle = inNoGo ? 'rgba(255,255,255,0.3)' : (isPlayer ? color : cfg.sailHue);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const mainTop = style === 'racer' ? -4 * s : -3 * s;
  const mainFoot = 9 * s;
  ctx.moveTo(0, mainTop);
  ctx.quadraticCurveTo(2 * s * sailSide, 3 * s, 0.5 * s * sailSide, mainFoot);
  ctx.lineTo(0, mainFoot);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- Jib (in front of mast, smaller) ---
  ctx.save();
  ctx.translate(0, -11 * s);                          // tack near bow
  ctx.rotate(deg2rad(mainAngleFromCenterline * jibFactor * sailSide));
  ctx.fillStyle = inNoGo
    ? 'rgba(255,255,255,0.3)'
    : jibBlanketed
      ? 'rgba(246,251,255,0.4)'
      : 'rgba(246,251,255,0.92)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(1.6 * s * sailSide, 3 * s, 0.5 * s * sailSide, 6 * s);
  ctx.lineTo(0, 6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Player indicator
  if (isPlayer) {
    ctx.beginPath();
    ctx.arc(0, 0, 20 * s, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ============================================================================
// HELPERS
// ============================================================================

// ============================================================================
// ShareBlock - nickname + replay code + copy-url / native share
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

function getPointOfSailName(twa: number): {
  nameRu: string; nameEn: string; namePl: string;
  nameEs: string; nameFr: string; nameDe: string; nameIt: string;
  color: string;
} {
  const a = Math.abs(twa);
  if (a < 30) return { nameRu: 'Левентик', nameEn: 'In irons', namePl: 'Łopot', nameEs: 'Proa al viento', nameFr: 'Vent debout', nameDe: 'Im Wind', nameIt: 'Prua al vento', color: '#ff4444' };
  if (a < 60) return { nameRu: 'Бейдевинд', nameEn: 'Close-hauled', namePl: 'Bajdewind', nameEs: 'Ceñida', nameFr: 'Près', nameDe: 'Hoch am Wind', nameIt: 'Bolina', color: '#ff8844' };
  if (a < 110) return { nameRu: 'Галфвинд', nameEn: 'Beam reach', namePl: 'Półwiatr', nameEs: 'Través', nameFr: 'Travers', nameDe: 'Halber Wind', nameIt: 'Traverso', color: '#44ff88' };
  if (a < 160) return { nameRu: 'Бакштаг', nameEn: 'Broad reach', namePl: 'Baksztag', nameEs: 'Largo', nameFr: 'Grand largue', nameDe: 'Raumer Wind', nameIt: 'Lasco', color: '#44aaff' };
  return { nameRu: 'Фордевинд', nameEn: 'Running', namePl: 'Fordewind', nameEs: 'Popa', nameFr: 'Vent arrière', nameDe: 'Vor dem Wind', nameIt: 'Poppa', color: '#8844ff' };
}

function drawMiniMap(ctx: CanvasRenderingContext2D, W: number, H: number, boats: Boat[], course: Course, label: string) {
  // Size + position of mini-map
  const mapW = Math.min(140, W * 0.22);
  const mapH = Math.min(180, H * 0.28);
  const pad = 12;
  const mx = W - mapW - pad;
  // Phones have the steering buttons in the bottom corners (md:hidden): sit above them.
  const my = H - mapH - pad - (W < 768 ? 112 : 0);

  // Background
  ctx.save();
  ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, mx, my, mapW, mapH, 8);
  ctx.fill();
  ctx.stroke();

  // Label
  ctx.fillStyle = 'rgba(139, 167, 184, 0.8)';
  ctx.font = '600 9px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, mx + 6, my + 12);

  // World bounds from the shared engine (800 x 1200). Figure out scale to fit.
  const WORLD_W = WORLD.width;
  const WORLD_H = WORLD.height;
  const margin = 12;
  const innerW = mapW - margin * 2;
  const innerH = mapH - margin * 2 - 10; // extra top margin for label
  const scaleX = innerW / WORLD_W;
  const scaleY = innerH / WORLD_H;
  const s = Math.min(scaleX, scaleY);
  const offsetX = mx + margin + (innerW - WORLD_W * s) / 2;
  const offsetY = my + margin + 10 + (innerH - WORLD_H * s) / 2;

  const worldToMap = (p: Vec2) => ({ x: offsetX + p.x * s, y: offsetY + p.y * s });

  // Clip to mini-map bounds
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx + 2, my + 14, mapW - 4, mapH - 16);
  ctx.clip();

  // Start/finish line
  const lineA = worldToMap(course.startLine.a);
  const lineB = worldToMap(course.startLine.b);
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lineA.x, lineA.y);
  ctx.lineTo(lineB.x, lineB.y);
  ctx.stroke();

  // Windward mark
  const wm = worldToMap(course.marks[0].pos);
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.arc(wm.x, wm.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // Boats
  for (const b of boats) {
    const bp = worldToMap(b.pos);
    ctx.fillStyle = b.isPlayer ? '#00d4ff' : b.color;
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, b.isPlayer ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
    if (b.isPlayer) {
      // Heading line
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      const hr = 6;
      ctx.beginPath();
      ctx.moveTo(bp.x, bp.y);
      ctx.lineTo(bp.x + Math.sin(deg2rad(b.heading)) * hr, bp.y - Math.cos(deg2rad(b.heading)) * hr);
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.restore();
}

// ============================================================================
// Staged analysis progress (shown while Claude is thinking)
// ============================================================================

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

function computeGhostPath(course: Course): Vec2[] {
  const startMid = {
    x: (course.startLine.a.x + course.startLine.b.x) / 2,
    y: course.startLine.a.y,
  };
  const mark = course.marks[0].pos;
  const finishMid = {
    x: (course.finishLine.a.x + course.finishLine.b.x) / 2,
    y: course.finishLine.a.y,
  };

  // Wind from north (0 deg). Close-hauled angle ~ 42 deg from wind on each side.
  // Layline from the mark going DOWNwind at +/- 42 deg. The player should tack at the layline.
  const CH = 42;                                       // close-hauled angle (deg from wind)
  const mx = mark.x;
  const my = mark.y;
  const startY = startMid.y;

  // Starboard-tack layline from the mark (heading ~ 135-90=45 deg when reaching mark from port side)
  // We want a single-tack path: sail port tack from start to (layline point), then starboard tack to mark.
  // Layline equation: from mark, going south-east at 42 deg from vertical.
  // Tack point = intersection of port-tack line from start (going up-left at 42 from vertical)
  //          with starboard layline from mark (going down-left at 42 from vertical).
  // Simple formula:
  const tanCH = Math.tan(CH * Math.PI / 180);
  // Port-tack heading from start: up-left. x decreases as y decreases.
  // Starboard-layline from mark: down-left (relative to mark). x decreases as y increases.
  // Let dy1 = distance sailed north before tack, then:
  //   tack point: (startMid.x - dy1 * tanCH, startY - dy1)
  // Starboard-layline point for same x: tacked distance dy2 going up-right toward mark:
  //   tack point: (mx - (my - py) * tanCH, py) for some py
  // Solve: startMid.x - dy1 * tanCH = mx - (startY - dy1 - my) * ... (treat simply below)

  // Pragmatic: pick tack point at midway of the vertical distance, offset by the reach-out amount.
  const verticalDist = startY - my;
  const halfHeight = verticalDist / 2;
  const reachX = halfHeight * tanCH;                        // horizontal offset at tack
  const tackPoint: Vec2 = { x: startMid.x - reachX, y: startY - halfHeight };

  // Broad reach back: curve via a midpoint shifted east (to simulate VMG-optimal broad reach)
  const broadMid: Vec2 = { x: finishMid.x + 60, y: (my + finishMid.y) / 2 };

  return [
    startMid,
    tackPoint,
    mark,
    broadMid,
    finishMid,
  ];
}

// ============================================================================
// Replay overlay - scrubbable timeline on a mini-course map
// ============================================================================

function ReplayOverlay({
  samples,
  events,
  course,
  mistakes,
  onClose,
}: {
  samples: LogSample[];
  events: LogEvent[];
  course: Course;
  mistakes: Coaching['mistakes'];
  onClose: () => void;
}) {
  const { tp } = useI18n();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const total = samples.length;
  const current = samples[Math.min(idx, total - 1)];

  // Auto-advance
  useEffect(() => {
    if (!playing || total === 0) return;
    const id = setInterval(() => {
      setIdx((i) => {
        const next = i + 1;
        if (next >= total) {
          setPlaying(false);
          return total - 1;
        }
        return next;
      });
    }, 500 / speed);
    return () => clearInterval(id);
  }, [playing, speed, total]);

  // Draw replay on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width;
    const H = rect.height;
    const WORLD_W = 800;
    const WORLD_H = 1200;
    const pad = 20;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;
    const s = Math.min(innerW / WORLD_W, innerH / WORLD_H);
    const ox = pad + (innerW - WORLD_W * s) / 2;
    const oy = pad + (innerH - WORLD_H * s) / 2;
    const toXY = (p: { x: number; y: number }) => ({ x: ox + p.x * s, y: oy + p.y * s });

    // Bg
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#051425');
    grad.addColorStop(1, '#0a1f3d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Start/finish line
    const lineA = toXY(course.startLine.a);
    const lineB = toXY(course.startLine.b);
    ctx.strokeStyle = '#ffaa00';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineA.x, lineA.y);
    ctx.lineTo(lineB.x, lineB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Windward mark
    const wm = toXY(course.marks[0].pos);
    ctx.beginPath();
    ctx.arc(wm.x, wm.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaa00';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Ghost / ideal path overlay (computed from course geometry) ---
    const ghost = computeGhostPath(course);
    ctx.save();
    ctx.strokeStyle = 'rgba(68, 255, 136, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i < ghost.length; i++) {
      const p = toXY(ghost[i]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Label the ghost
    const gMid = toXY(ghost[Math.floor(ghost.length / 2)]);
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(68, 255, 136, 0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(tp('идеал', 'ideal', 'ideał', { es: 'ideal', fr: 'idéal', de: 'Ideal', it: 'ideale' }), gMid.x + 6, gMid.y - 4);
    ctx.restore();

    // Track trail up to current idx (player track)
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= Math.min(idx, total - 1); i++) {
      const p = toXY(samples[i]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Event markers on the track (tacks, no-go, mark-rounded) - show cumulatively
    if (current) {
      for (const ev of events) {
        if (ev.t > current.t) break;
        const sampAt = samples.find((sm) => Math.abs(sm.t - ev.t) < 0.6);
        if (!sampAt) continue;
        const pp = toXY(sampAt);
        let col = '#00d4ff';
        if (ev.type === 'tack') col = '#ffaa00';
        else if (ev.type === 'no-go-entered') col = '#ff4444';
        else if (ev.type === 'mark-rounded') col = '#44ff88';
        else if (ev.type === 'finish') col = '#44ff88';
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }

      // Current boat position
      const p = toXY(current);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(deg2rad(current.heading));
      ctx.fillStyle = '#00d4ff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [idx, total, samples, events, course, current, tp]);

  // Active mistake at current time (from AI coach) - for overlay comment
  const activeMistake = current
    ? mistakes.find((m) => current.t >= m.timeStart && current.t <= m.timeEnd)
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(5, 12, 24, 0.95)', backdropFilter: 'blur(8px)' }}
    >
      <div className="card w-full max-w-2xl p-4 sm:p-5" style={{ border: '1px solid rgba(0, 212, 255, 0.3)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold">{tp('Replay гонки', 'Race replay', 'Powtórka wyścigu', { es: 'Repetición de la regata', fr: 'Replay de la course', de: 'Replay des Rennens', it: 'Replay della regata' })}</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {tp('Прокрути таймлайн - точки на треке это события: поворот, мёртвая зона, знак.', 'Scrub the timeline - dots on the track are events: tack, no-go zone, mark.', 'Przewiń oś czasu - punkty na śladzie to zdarzenia: zwrot, kąt martwy, znak.', { es: 'Desliza la línea de tiempo - los puntos de la traza son eventos: virada, zona muerta, baliza.', fr: 'Fais défiler la timeline - les points sur la trace sont des événements : virement, zone morte, bouée.', de: 'Zieh an der Zeitleiste - die Punkte auf dem Track sind Ereignisse: Wende, toter Winkel, Bahnmarke.', it: 'Scorri la timeline - i punti sulla traccia sono eventi: virata, angolo morto, boa.' })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label={tp('Закрыть replay', 'Close replay', 'Zamknij powtórkę', { es: 'Cerrar la repetición', fr: 'Fermer le replay', de: 'Replay schließen', it: 'Chiudi il replay' })}
          >
            ✕
          </button>
        </div>

        <canvas ref={canvasRef} className="w-full block rounded-lg" style={{ aspectRatio: '2/3', maxHeight: '55vh', background: '#061428' }} />

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><span className="inline-block w-5 h-[2px]" style={{ background: '#00d4ff' }} />{tp('твой трек', 'your track', 'twój ślad', { es: 'tu traza', fr: 'ta trace', de: 'dein Track', it: 'la tua traccia' })}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-5 h-0 border-t border-dashed" style={{ borderColor: 'rgba(68,255,136,0.7)' }} />{tp('идеальный путь', 'ideal path', 'idealna trasa', { es: 'ruta ideal', fr: 'trajectoire idéale', de: 'Ideallinie', it: 'percorso ideale' })}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ffaa00' }} />{tp('поворот', 'tack', 'zwrot', { es: 'virada', fr: 'virement', de: 'Wende', it: 'virata' })}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ff4444' }} />{tp('мёртвая зона', 'no-go zone', 'kąt martwy', { es: 'zona muerta', fr: 'zone morte', de: 'toter Winkel', it: 'angolo morto' })}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#44ff88' }} />{tp('знак / финиш', 'mark / finish', 'znak / meta', { es: 'baliza / llegada', fr: 'bouée / arrivée', de: 'Bahnmarke / Ziel', it: 'boa / arrivo' })}</span>
        </div>

        {/* Timeline slider */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={idx}
            onChange={(e) => { setIdx(Number(e.target.value)); setPlaying(false); }}
            className="flex-1"
          />
          <span className="text-xs font-mono text-[var(--text-secondary)] min-w-[60px] text-right">
            {current ? formatTime(current.t) : '-'}
          </span>
        </div>

        {/* Speed control */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">{tp('Скорость', 'Speed', 'Prędkość', { es: 'Velocidad', fr: 'Vitesse', de: 'Tempo', it: 'Velocità' })}</span>
          {[0.5, 1, 2, 4].map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeed(sp)}
              className="px-2 py-0.5 rounded border text-[11px]"
              style={{
                borderColor: speed === sp ? 'var(--accent-cyan)' : 'rgba(139,167,184,0.2)',
                color: speed === sp ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                background: speed === sp ? 'rgba(0,212,255,0.1)' : 'transparent',
              }}
            >
              {sp}×
            </button>
          ))}
        </div>

        {/* Active coach comment at this timestamp */}
        {activeMistake && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(255, 68, 68, 0.08)', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--danger)' }}>
              ⚠ {coachTitle(activeMistake)}
            </div>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-1">
              {coachExplanation(activeMistake)}
            </div>
            <div className="text-xs text-[var(--success)] leading-relaxed">
              💡 {coachFix(activeMistake)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Line icons for the three briefing rules. */
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
              'Гонка прервана. Продолжить?',
              'A race was interrupted. Resume?',
              'Wyścig przerwany. Wznowić?',
              {
                es: 'Regata interrumpida. ¿Continuar?',
                fr: 'Course interrompue. Reprendre ?',
                de: 'Rennen unterbrochen. Fortsetzen?',
                it: 'Regata interrotta. Riprendere?',
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
              background: 'var(--warning)',
              color: '#0a1628',
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
