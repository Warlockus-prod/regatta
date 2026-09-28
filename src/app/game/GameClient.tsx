'use client';

import Link from 'next/link';
import { legacyPick } from '@/lib/languages';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  WORLD, MAX_SPEED, stepBoat, resolveCollisions, updateLap, raceAutopilotTurn, raceWaypoint,
  WIND_DIRECTION_BASE as WIND_DIRECTION,
  calcTWA, deg2rad, distance, bearing,
  angleDiff,
} from '@/lib/race-physics';

// ============================================================================
// TYPES
// ============================================================================

type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'menu' | 'briefing' | 'countdown' | 'racing' | 'finished' | 'replay';
type BoatStyle = 'cruiser' | 'racer';

const BOAT_STYLES: {
  id: BoatStyle;
  labelRu: string; labelEn: string; labelPl: string;
  labelEs: string; labelFr: string; labelDe: string; labelIt: string;
  descRu: string; descEn: string; descPl: string;
  descEs: string; descFr: string; descDe: string; descIt: string;
  hullScale: number; hullWidth: number; sailHue: string;
}[] = [
  { id: 'cruiser', labelRu: 'Круизер', labelEn: 'Cruiser', labelPl: 'Jacht turystyczny',
    labelEs: 'Crucero', labelFr: 'Croiseur', labelDe: 'Fahrtenyacht', labelIt: 'Da crociera',
    descRu: 'Сбалансированная, для начала.',
    descEn: 'Balanced, good for starting out.',
    descPl: 'Wyważony, dobry na początek.',
    descEs: 'Equilibrado, ideal para empezar.',
    descFr: 'Équilibré, idéal pour débuter.',
    descDe: 'Ausgewogen, gut für den Einstieg.',
    descIt: 'Equilibrata, ideale per iniziare.',
    hullScale: 1.0, hullWidth: 1.0, sailHue: '#ffffff' },
  { id: 'racer', labelRu: 'Гоночная', labelEn: 'Racer', labelPl: 'Jacht regatowy',
    labelEs: 'De regatas', labelFr: 'Voilier de course', labelDe: 'Regattayacht', labelIt: 'Da regata',
    descRu: 'Узкий длинный корпус, быстрая.',
    descEn: 'Long, narrow hull. Fast.',
    descPl: 'Długi, wąski kadłub. Szybki.',
    descEs: 'Casco largo y estrecho. Rápido.',
    descFr: 'Coque longue et étroite. Rapide.',
    descDe: 'Langer, schmaler Rumpf. Schnell.',
    descIt: 'Scafo lungo e stretto. Veloce.',
    hullScale: 1.15, hullWidth: 0.82, sailHue: '#e8f4f8' },
];

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
  tackPreference?: 'port' | 'starboard'; // AI tack strategy
  aiTackTimer?: number;
  finishTime?: number;
  skill: number;         // 0.6-1.1 AI skill multiplier
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

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;      // RU (legacy field name, kept for compat)
  labelEn: string;
  labelPl: string;
  labelEs: string;
  labelFr: string;
  labelDe: string;
  labelIt: string;
  description: string;      // RU
  descriptionEn: string;
  descriptionPl: string;
  descriptionEs: string;
  descriptionFr: string;
  descriptionDe: string;
  descriptionIt: string;
  opponents: number;
  aiSpeedMul: number;
  aiSkill: number;
  color: string;
}> = {
  easy: {
    label: 'Лёгкий',
    labelEn: 'Easy',
    labelPl: 'Łatwy',
    labelEs: 'Fácil',
    labelFr: 'Facile',
    labelDe: 'Leicht',
    labelIt: 'Facile',
    description: 'Медленные противники, спокойные повороты. Хорошо для знакомства с управлением.',
    descriptionEn: 'Slow opponents, gentle turns. Good for getting used to the controls.',
    descriptionPl: 'Wolni rywale, spokojne zwroty. Dobry na oswojenie się ze sterowaniem.',
    descriptionEs: 'Rivales lentos que viran con calma. Ideal para hacerte con los controles.',
    descriptionFr: 'Adversaires lents, virements tranquilles. Idéal pour prendre en main les commandes.',
    descriptionDe: 'Langsame Gegner, ruhige Wenden. Gut, um dich mit der Steuerung vertraut zu machen.',
    descriptionIt: 'Avversari lenti, virate tranquille. Ideale per prendere confidenza con i comandi.',
    opponents: 2,
    aiSpeedMul: 0.78,
    aiSkill: 0.7,
    color: '#44ff88',
  },
  medium: {
    label: 'Средний',
    labelEn: 'Medium',
    labelPl: 'Średni',
    labelEs: 'Medio',
    labelFr: 'Moyen',
    labelDe: 'Mittel',
    labelIt: 'Medio',
    description: 'Соперники держат курс уверенно. Нужна тактика лавировки и точное огибание знаков.',
    descriptionEn: 'Opponents sail a confident line. You need tacking tactics and precise mark rounding.',
    descriptionPl: 'Rywale pewnie trzymają kurs. Potrzebna jest taktyka halsowania i precyzyjne opływanie znaków.',
    descriptionEs: 'Los rivales mantienen el rumbo con seguridad. Necesitas táctica de bordos y rodear las balizas con precisión.',
    descriptionFr: 'Les adversaires tiennent leur cap avec assurance. Il te faut une tactique de louvoyage et des passages de bouée précis.',
    descriptionDe: 'Die Gegner halten sicher ihren Kurs. Du brauchst eine gute Kreuztaktik und musst die Bahnmarken präzise runden.',
    descriptionIt: 'Gli avversari tengono la rotta con sicurezza. Servono una buona tattica di bolina e giri di boa precisi.',
    opponents: 3,
    aiSpeedMul: 0.92,
    aiSkill: 0.9,
    color: '#ffaa00',
  },
  hard: {
    label: 'Сложный',
    labelEn: 'Hard',
    labelPl: 'Trudny',
    labelEs: 'Difícil',
    labelFr: 'Difficile',
    labelDe: 'Schwer',
    labelIt: 'Difficile',
    description: 'Агрессивные соперники идут почти оптимально. Каждая ошибка дорого стоит.',
    descriptionEn: 'Aggressive opponents sail near-optimal lines. Every mistake is costly.',
    descriptionPl: 'Agresywni rywale płyną niemal optymalnie. Każdy błąd drogo kosztuje.',
    descriptionEs: 'Rivales agresivos que navegan casi a la perfección. Cada error se paga caro.',
    descriptionFr: 'Des adversaires agressifs, presque parfaits. Chaque erreur coûte cher.',
    descriptionDe: 'Aggressive Gegner segeln nahezu optimal. Jeder Fehler rächt sich.',
    descriptionIt: 'Avversari aggressivi che navigano quasi alla perfezione. Ogni errore costa caro.',
    opponents: 4,
    aiSpeedMul: 1.02,
    aiSkill: 1.0,
    color: '#ff4444',
  },
};

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

function makeCourse(): Course {
  const cx = WORLD.width / 2;
  const startY = WORLD.height - 150;
  const windwardY = 180;
  const startLine = {
    a: { x: cx - 80, y: startY },
    b: { x: cx + 80, y: startY },
  };
  return {
    marks: [
      { pos: { x: cx, y: windwardY }, radius: 14, label: 'Верхний знак', labelEn: 'Windward mark', labelPl: 'Znak nawietrzny', labelEs: 'Baliza de barlovento', labelFr: 'Bouée au vent', labelDe: 'Luvtonne', labelIt: 'Boa di bolina', type: 'windward', roundSide: 'port' },
      { pos: startLine.a, radius: 10, label: 'Старт/Финиш Л', labelEn: 'Start/Finish L', labelPl: 'Start/Meta L', labelEs: 'Salida/Llegada I', labelFr: 'Départ/Arrivée G', labelDe: 'Start/Ziel L', labelIt: 'Partenza/Arrivo S', type: 'start' },
      { pos: startLine.b, radius: 10, label: 'Старт/Финиш П', labelEn: 'Start/Finish R', labelPl: 'Start/Meta P', labelEs: 'Salida/Llegada D', labelFr: 'Départ/Arrivée D', labelDe: 'Start/Ziel R', labelIt: 'Partenza/Arrivo D', type: 'start' },
    ],
    startLine,
    finishLine: startLine,
  };
}

// ============================================================================
// AI LOGIC
// ============================================================================

// ============================================================================
// GAME COMPONENT
// ============================================================================

export default function GamePage() {
  const { tp, lang } = useI18n();
  const [gameState, setGameState] = useState<GameState>('menu');
  // Daily challenge mode: read ?daily=YYYY-MM-DD&difficulty=...&wind=...
  const [dailyDay, setDailyDay] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [position, setPosition] = useState<{ rank: number; total: number }>({ rank: 1, total: 1 });
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
  const [windDirDisplay, setWindDirDisplay] = useState<number>(WIND_DIRECTION);
  const [windGustDisplay, setWindGustDisplay] = useState<number>(1.0);

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
      skill: 1.0,
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
        tackPreference: i % 2 === 0 ? 'starboard' : 'port',
        aiTackTimer: 0,
        skill: cfg.aiSkill * (0.85 + Math.random() * 0.3), // variation
      });
    }

    boatsRef.current = boats;
    setResults([]);
    setElapsed(0);
    setCoaching(null);
    setCoachingError(null);
    logSamplesRef.current = [];
    logEventsRef.current = [];
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
      // Cheap display update (every ~5 frames) to avoid renders storm
      if (Math.floor(now / 120) % 2 === 0) {
        setWindDirDisplay(windDirRef.current);
        setWindGustDisplay(windGustRef.current);
      }

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
        stepBoat(boat, dt, windDirRef.current, windGustRef.current, { turn: turnInput }, { windStrengthMul: windStrengthRef.current });
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
        if (lastTackSignRef.current !== 0 && tackSign !== lastTackSignRef.current && playerBoat.speed > 1) {
          logEventsRef.current.push({ type: 'tack', t, note: tackSign > 0 ? 'to-port-tack' : 'to-starboard-tack' });
          playTack();
        }
        lastTackSignRef.current = tackSign;
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

      // Calculate position (rank)
      const progress = boats.map((b) => ({
        id: b.id,
        progress: b.lapDone === 2
          ? 10000 - (b.finishTime ?? 0)
          : b.lapDone === 1
            ? 5000 - distance(b.pos, {
                x: (course.finishLine.a.x + course.finishLine.b.x) / 2,
                y: course.finishLine.a.y,
              })
            : 2500 - distance(b.pos, course.marks[0].pos),
      }));
      progress.sort((a, b) => b.progress - a.progress);
      const rank = progress.findIndex((p) => p.id === 'player') + 1;
      setPosition({ rank, total: boats.length });

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
        ctx.fillText(`${Math.round(distToTarget / 10)}m`, ax, ay + 24);
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

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Брифинг', 'Briefing', 'Odprawa', { es: 'Briefing', fr: 'Briefing', de: 'Briefing', it: 'Briefing' })}
        </h1>

        {/* ARCADE badge: /game runs the shared VPP engine, but the sails trim
            themselves (trimForDrive) and steering is a simple turn rate, while
            /simulator-v3 lets you trim by hand. Users who noticed "speed
            differs between /game and the trainer" were confused; this says why. */}
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-semibold"
             style={{ background: 'rgba(255, 170, 0, 0.12)', border: '1px solid rgba(255, 170, 0, 0.3)', color: 'var(--warning)' }}>
          <span>🕹️</span>
          <span>
            {tp(
              'АРКАДНЫЙ РЕЖИМ · паруса настраиваются сами, руление упрощено. Трим вручную - в «Тренажёре трима»',
              'ARCADE MODE · the sails trim themselves and steering is simplified. Trim by hand in the Sail trim trainer',
              'TRYB ARCADE · żagle trymują się same, a sterowanie jest uproszczone. Trym ręczny: w Trenażerze trymu',
              {
                es: 'MODO ARCADE · las velas se ajustan solas y el gobierno está simplificado. El trimado a mano, en el Simulador de trimado',
                fr: 'MODE ARCADE · les voiles se règlent seules et la barre est simplifiée. Le réglage à la main se fait dans Réglage des voiles',
                de: 'ARCADE-MODUS · die Segel trimmen sich selbst, das Steuern ist vereinfacht. Von Hand trimmen: im Segeltrimm-Trainer',
                it: 'MODALITÀ ARCADE · le vele si regolano da sole e il timone è semplificato. La regolazione a mano è in Regolazione delle vele',
              },
            )}
          </span>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {tp(
            'Что делать и как не накосячить. Прочитай - старт через 3 секунды будет некогда разбираться.',
            'What to do and how not to screw up. Read it - in 3 seconds you won\'t have time.',
            'Co robić i jak nie nawalić. Przeczytaj - po starcie za 3 sekundy nie będzie czasu się zastanawiać.',
            {
              es: 'Qué hacer y cómo no meter la pata. Léelo - en 3 segundos ya no habrá tiempo.',
              fr: 'Ce qu\'il faut faire et comment ne pas te planter. Lis-le - dans 3 secondes, tu n\'auras plus le temps.',
              de: 'Was zu tun ist und wie du keinen Mist baust. Lies es - in 3 Sekunden ist keine Zeit mehr dafür.',
              it: 'Cosa fare e come non combinare pasticci. Leggilo - tra 3 secondi non avrai più tempo.',
            },
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Course preview */}
          <div className="card p-4">
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' })}</div>
            <CoursePreview />
            <ol className="text-sm text-[var(--text-secondary)] mt-4 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от оранжевой линии внизу.', 'Start from the orange line at the bottom.', 'Start z pomarańczowej linii na dole.', { es: 'La salida es desde la línea naranja de abajo.', fr:'Départ depuis la ligne orange en bas.', de: 'Start an der orangen Linie unten.', it: 'Partenza dalla linea arancione in basso.' })}</li>
              <li>{tp('Идёшь', 'Work', 'Płyniesz', { es: 'Sube', fr: 'Remonte', de: 'Segle', it: 'Risali' })} <span className="text-[var(--accent-cyan)] font-semibold">{tp('галсами', 'upwind in tacks', 'halsami', { es: 'dando bordos', fr: 'en louvoyant', de: 'in Kreuzschlägen', it: 'bordeggiando' })}</span> {tp('к верхнему знаку - прямо против ветра нельзя.', 'to the windward mark - you can\'t sail straight into the wind.', 'do znaku nawietrznego - prosto pod wiatr się nie da.', { es: 'hasta la baliza de barlovento - directo contra el viento no se puede.', fr: 'jusqu\'à la bouée au vent - impossible d\'aller droit contre le vent.', de: 'zur Luvtonne - direkt gegen den Wind geht es nicht.', it: 'fino alla boa di bolina - dritti controvento non si può.' })}</li>
              <li>{tp('Обходишь верхний знак (подойди на ~30 м).', 'Round the windward mark (get within ~30 m).', 'Okrążasz znak nawietrzny (podejdź na ~30 m).', { es: 'Rodea la baliza de barlovento (acércate a ~30 m).', fr: 'Vire la bouée au vent (approche-toi à ~30 m).', de: 'Runde die Luvtonne (komm auf ~30 m heran).', it: 'Gira la boa di bolina (avvicinati a ~30 m).' })}</li>
              <li>{tp('Возвращаешься полным курсом и пересекаешь финиш сверху вниз.', 'Run back downwind and cross the finish top to bottom.', 'Wracasz kursem pełnym i przecinasz linię mety z góry na dół.', { es: 'Vuelve a favor del viento y cruza la línea de llegada de arriba abajo.', fr: 'Redescends au portant et coupe la ligne d\'arrivée de haut en bas.', de: 'Segle raumschots zurück und fahr von oben nach unten über die Ziellinie.', it: 'Torna con le andature portanti e taglia il traguardo dall\'alto verso il basso.' })}</li>
            </ol>
          </div>

          {/* Controls */}
          <div className="card p-4">
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{tp('УПРАВЛЕНИЕ', 'CONTROLS', 'STEROWANIE', { es: 'CONTROLES', fr: 'COMMANDES', de: 'STEUERUNG', it: 'COMANDI' })}</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">←</kbd>
                  <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">→</kbd>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Повернуть. На мобайле - кнопки внизу экрана.', 'Turn. On mobile - buttons at the bottom of the screen.', 'Skręt. Na telefonie - przyciski na dole ekranu.', { es: 'Girar. En el móvil - botones en la parte inferior de la pantalla.', fr: 'Tourner. Sur mobile - boutons en bas de l\'écran.', de: 'Steuern. Auf dem Handy - Tasten unten am Bildschirm.', it: 'Girare. Su mobile - pulsanti in basso sullo schermo.' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-2 py-1 rounded text-[10px] font-semibold border border-[rgba(0,212,255,0.3)] text-[var(--accent-cyan)]">▶ AUTO</div>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Автопилот - держит текущий курс. Выключается от любого поворота. Удобно на длинных галсах, чтобы не подправлять.', 'Autopilot - holds the current heading. Disengages on any turn. Handy on long tacks, so you don\'t have to keep correcting.', 'Autopilot - trzyma bieżący kurs. Wyłącza się przy każdym skręcie. Wygodny na długich halsach, żeby nie poprawiać kursu.', { es: 'Piloto automático - mantiene el rumbo actual. Se desactiva en cuanto giras. Útil en bordos largos para no ir corrigiendo.', fr: 'Pilote automatique - garde le cap actuel. Se coupe dès que tu tournes. Pratique sur les longs bords, pour ne pas corriger sans arrêt.', de: 'Autopilot - hält den aktuellen Kurs. Schaltet sich bei jeder Lenkbewegung ab. Praktisch auf langen Schlägen, damit du nicht ständig korrigieren musst.', it: 'Pilota automatico - mantiene la rotta attuale. Si disattiva appena giri. Comodo sui bordi lunghi, per non dover correggere.' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base">🧭</span>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Левый HUD - TWA (угол к ветру) и скорость. Держи TWA > 40° на лавировке.', 'Left HUD - TWA (angle to wind) and speed. Keep TWA > 40° when beating upwind.', 'Lewy HUD - TWA (kąt do wiatru) i prędkość. Na halsówce trzymaj TWA > 40°.', { es: 'HUD izquierdo - TWA (ángulo al viento) y velocidad. En ceñida mantén TWA > 40°.', fr: 'HUD gauche - TWA (angle au vent) et vitesse. Au louvoyage, garde TWA > 40°.', de: 'Linkes HUD - TWA (Winkel zum Wind) und Geschwindigkeit. Halte beim Kreuzen TWA > 40°.', it: 'HUD sinistro - TWA (angolo al vento) e velocità. Di bolina tieni TWA > 40°.' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base">📍</span>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Стрелка на экране показывает направление к следующему знаку.', 'The on-screen arrow points to the next mark.', 'Strzałka na ekranie wskazuje kierunek do następnego znaku.', { es: 'La flecha en pantalla apunta a la siguiente baliza.', fr: 'La flèche à l\'écran indique la prochaine bouée.', de: 'Der Pfeil auf dem Bildschirm zeigt zur nächsten Bahnmarke.', it: 'La freccia sullo schermo indica la prossima boa.' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key rules */}
        <div className="card p-4 mb-6" style={{ borderColor: 'rgba(255, 170, 0, 0.3)', background: 'rgba(255, 170, 0, 0.04)' }}>
          <div className="text-xs font-semibold tracking-wider mb-2" style={{ color: 'var(--warning)' }}>⚠ {tp('ВАЖНО', 'IMPORTANT', 'WAŻNE', { es: 'IMPORTANTE', fr: 'IMPORTANT', de: 'WICHTIG', it: 'IMPORTANTE' })}</div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1.5 leading-relaxed">
            <li>• {tp('В секторе ±30° от ветра паруса не работают - это', 'Within ±30° of the wind the sails don\'t work - this is the', 'W sektorze ±30° od wiatru żagle nie pracują - to', { es: 'En el sector de ±30° respecto al viento las velas no trabajan - es la', fr: 'Dans le secteur de ±30° face au vent, les voiles ne portent pas - c\'est la', de: 'Im Bereich ±30° zum Wind arbeiten die Segel nicht - das ist der', it: 'Nel settore di ±30° dal vento le vele non portano - questo è' })} <span className="text-[var(--danger)] font-semibold">{tp('мёртвая зона', 'no-go zone', 'kąt martwy', { es: 'zona muerta', fr: 'zone morte', de: 'tote Winkel', it: 'l\'angolo morto' })}</span>. {tp('Если встал - отверни от ветра градусов на 50.', 'If you stall, bear away about 50° from the wind.', 'Jeśli stanąłeś, odpadnij od wiatru o jakieś 50°.', { es: 'Si te quedas parado, arriba unos 50°.', fr: 'Si tu es arrêté, abats d\'environ 50°.', de: 'Wenn du stehst, fall etwa 50° ab.', it: 'Se ti fermi, poggia di circa 50°.' })}</li>
            <li>• {tp('Лавировка = длинные галсы, а не частые повороты. Каждый поворот теряет скорость.', 'Beating upwind = long legs, not constant tacking. Every tack costs speed.', 'Halsowanie = długie halsy, a nie częste zwroty. Każdy zwrot kosztuje prędkość.', { es: 'Barloventear = bordos largos, no viradas constantes. Cada virada cuesta velocidad.', fr: 'Louvoyer = de longs bords, pas des virements à répétition. Chaque virement coûte de la vitesse.', de: 'Kreuzen = lange Schläge, keine ständigen Wenden. Jede Wende kostet Fahrt.', it: 'Bordeggiare = bordi lunghi, non virate continue. Ogni virata costa velocità.' })}</li>
            <li>• {tp('AI разберёт твою гонку после финиша и покажет, где ты терял время.', 'AI reviews your race after the finish and shows where you lost time.', 'AI przeanalizuje twój wyścig po mecie i pokaże, gdzie traciłeś czas.', { es: 'La IA analizará tu regata tras la llegada y te mostrará dónde perdiste tiempo.', fr: 'L\'IA analysera ta course après l\'arrivée et te montrera où tu as perdu du temps.', de: 'Die KI analysiert dein Rennen nach dem Zieldurchgang und zeigt dir, wo du Zeit verloren hast.', it: 'L\'IA analizzerà la tua regata dopo l\'arrivo e ti mostrerà dove hai perso tempo.' })}</li>
          </ul>
        </div>

        <button
          onClick={beginCountdown}
          className="w-full py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.01]"
          style={{
            background: `linear-gradient(135deg, ${DIFFICULTY_CONFIG[difficulty].color}, ${DIFFICULTY_CONFIG[difficulty].color}cc)`,
            color: '#0a1628',
            boxShadow: `0 4px 24px ${DIFFICULTY_CONFIG[difficulty].color}44`,
          }}
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
    <div className="relative w-full" style={{ height: 'calc(100dvh - var(--site-nav-h, 56px))' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

      {/* HUD - top bar */}
      {gameState === 'racing' && (
        <>
          {/* Left HUD: course info - compact on mobile */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 card p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 min-w-[140px] sm:min-w-[180px]" style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{tp('КУРС', 'POS', 'KURS', { es: 'RUMBO', fr: 'ALLURE', de: 'KURS', it: 'ANDATURA' })}</span>
              <span className="text-[10px] sm:text-xs font-mono truncate" style={{ color: currentPoS.color }}>{legacyPick(currentPoS, 'name', lang)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">TWA</span>
              <span className="text-xs sm:text-sm font-mono font-bold" style={{ color: currentPoS.color }}>{Math.round(Math.abs(playerTWA))}°</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{tp('СКОР.', 'SPD', 'PRĘD.', { es: 'VEL.', fr: 'VIT.', de: 'FAHRT', it: 'VEL.' })}</span>
              <span className="text-xs sm:text-sm font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>{playerSpeed.toFixed(1)} kn</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="h-full transition-all" style={{ width: `${(playerSpeed / MAX_SPEED) * 100}%`, background: currentPoS.color }} />
            </div>
          </div>

          {/* Right HUD: position + time - compact */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 card p-2 sm:p-3 flex flex-col gap-1 items-end" style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">{tp('ПОЗИЦИЯ', 'PLACE', 'MIEJSCE', { es: 'PUESTO', fr: 'PLACE', de: 'PLATZ', it: 'POSIZIONE' })}</div>
            <div className="text-lg sm:text-2xl font-bold leading-none" style={{ color: position.rank === 1 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {position.rank}<span className="text-[10px] sm:text-xs text-[var(--text-muted)]"> / {position.total}</span>
            </div>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5 sm:mt-1">{tp('ВРЕМЯ', 'TIME', 'CZAS', { es: 'TIEMPO', fr: 'TEMPS', de: 'ZEIT', it: 'TEMPO' })}</div>
            <div className="text-xs sm:text-sm font-mono text-[var(--text-primary)]">{formatTime(elapsed)}</div>
          </div>

          {/* Mark progress indicator - above touch controls on mobile */}
          <div className="absolute left-1/2 -translate-x-1/2 card px-3 py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
               style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 190px)' }}>
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 0 && `→ ${tp('К верхнему знаку', 'To windward mark', 'Do znaku nawietrznego', { es: 'A la baliza de barlovento', fr: 'Vers la bouée au vent', de: 'Zur Luvtonne', it: 'Alla boa di bolina' })}`}
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 1 && `→ ${tp('На финиш', 'To finish', 'Do mety', { es: 'A la llegada', fr: 'Vers l\'arrivée', de: 'Zum Ziel', it: 'All\'arrivo' })}`}
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

          {/* Wind indicator (centered under the right HUD on mobile so it never overlaps with the left HUD) */}
          <div className="absolute right-2 sm:right-4 card px-2 py-1 flex items-center gap-1.5"
               style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)', top: 'calc(5.5rem + env(safe-area-inset-top, 0px))' }}>
            <svg width="14" height="14" viewBox="-12 -12 24 24" style={{ transform: `rotate(${windDirDisplay}deg)` }}>
              <line x1="0" y1="-9" x2="0" y2="7" stroke="#00d4ff" strokeWidth="1.5" />
              <polygon points="-3,4 0,7 3,4" fill="#00d4ff" />
            </svg>
            <span className="text-[10px] font-mono text-[var(--accent-cyan)]">
              {Math.round(windDirDisplay)}°
            </span>
            {windGustDisplay > 1.08 && <span className="text-[9px] text-[var(--warning)] font-semibold">G</span>}
            {windGustDisplay < 0.92 && <span className="text-[9px] text-[var(--text-muted)]">l</span>}
          </div>

          {/* Mute toggle */}
          <button
            onClick={() => setMutedState(toggleMuted())}
            aria-label={muted
              ? tp('Включить звук', 'Unmute', 'Włącz dźwięk', { es: 'Activar sonido', fr: 'Activer le son', de: 'Ton an', it: 'Attiva audio' })
              : tp('Выключить звук', 'Mute', 'Wycisz', { es: 'Silenciar', fr: 'Couper le son', de: 'Ton aus', it: 'Disattiva audio' })}
            className="absolute top-16 left-2 sm:top-auto sm:left-4 w-9 h-9 rounded-full card flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={backToMenu}
            className="absolute top-16 right-2 sm:top-auto sm:right-4 px-2.5 py-1.5 card text-[11px] sm:text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
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
                  'Разбор сгенерирован языковой моделью Claude по твоему логу гонки. Может ошибаться. Подробности в ',
                  'Generated by the Claude language model from your race log. Can be wrong. Details in our ',
                  'Wygenerowane przez model językowy Claude na podstawie zapisu twojego wyścigu. Może się mylić. Szczegóły w ',
                  {
                    es: 'Generado por el modelo de lenguaje Claude a partir del registro de tu regata. Puede equivocarse. Más detalles en la ',
                    fr: 'Généré par le modèle de langage Claude à partir du journal de ta course. Peut se tromper. Détails dans la ',
                    de: 'Erstellt vom Sprachmodell Claude anhand deines Rennprotokolls. Kann sich irren. Details in der ',
                    it: 'Generato dal modello linguistico Claude a partire dal log della tua regata. Può sbagliare. Dettagli nell\'',
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
  const my = H - mapH - pad;

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

  // World bounds (from constants): WORLD.width x WORLD.height = 800 x 1200
  // Figure out scale to fit
  const WORLD_W = 800;
  const WORLD_H = 1200;
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

// ============================================================================
// GameMenu - 3-preset entry (Учусь / Свободная / Миссия) with collapsible details
// ============================================================================

type MenuTab = 'learn' | 'free' | 'mission';

function GameMenu({
  difficulty, setDifficulty,
  windStrength, setWindStrength,
  boatStyle, setBoatStyle,
  selectedMission, pickMission,
  openBriefing,
}: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  windStrength: 'light' | 'medium' | 'heavy';
  setWindStrength: (w: 'light' | 'medium' | 'heavy') => void;
  boatStyle: BoatStyle;
  setBoatStyle: (b: BoatStyle) => void;
  selectedMission: Mission | null;
  pickMission: (m: Mission | null) => void;
  openBriefing: () => void;
}) {
  const { tp } = useI18n();
  const [tab, setTab] = useState<MenuTab>('learn');
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Wind-label helper used in several places in this menu.
  const windLabel = (w: 'light' | 'medium' | 'heavy') =>
    w === 'light' ? tp('слабый', 'light', 'słaby', { es: 'flojo', fr: 'faible', de: 'schwach', it: 'leggero' })
    : w === 'heavy' ? tp('сильный', 'heavy', 'silny', { es: 'fuerte', fr: 'fort', de: 'stark', it: 'forte' })
    : tp('средний', 'medium', 'średni', { es: 'medio', fr: 'moyen', de: 'mittel', it: 'medio' });

  // Mission field pickers - mission titles / descriptions / hints are stored
  // with *Ru/*En/*Pl/*Es/*Fr/*De/*It variants on src/data/missions.ts.
  const mTitle = (m: Mission) => tp(m.titleRu, m.titleEn, m.titlePl, { es: m.titleEs, fr: m.titleFr, de: m.titleDe, it: m.titleIt });
  const mDesc = (m: Mission) => tp(m.descRu, m.descEn, m.descPl, { es: m.descEs, fr: m.descFr, de: m.descDe, it: m.descIt });

  // Difficulty label picker. DIFFICULTY_CONFIG has `label` (RU, legacy
  // name), labelEn, labelPl, labelEs, labelFr, labelDe, labelIt.
  const difficultyLabel = (d: Difficulty) =>
    tp(DIFFICULTY_CONFIG[d].label, DIFFICULTY_CONFIG[d].labelEn, DIFFICULTY_CONFIG[d].labelPl, { es: DIFFICULTY_CONFIG[d].labelEs, fr: DIFFICULTY_CONFIG[d].labelFr, de: DIFFICULTY_CONFIG[d].labelDe, it: DIFFICULTY_CONFIG[d].labelIt });

  // When tab changes, apply defaults
  useEffect(() => {
    if (tab === 'learn') {
      pickMission(null);
      setDifficulty('easy');
      setWindStrength('medium');
      setBoatStyle('cruiser');
    } else if (tab === 'free') {
      pickMission(null);
      // keep user's manual selection
    }
    // mission tab: user picks mission -> it sets difficulty + wind automatically
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const ctaLabel =
    tab === 'learn' ? tp('Начать - Учусь гоняю', 'Start - Learning mode', 'Start - Tryb nauki', { es: 'Empezar - Modo aprendizaje', fr: 'Commencer - Mode apprentissage', de: 'Los - Lernmodus', it: 'Inizia - Modalità apprendimento' }) :
    tab === 'mission' ? (selectedMission
      ? tp(`К миссии: ${selectedMission.titleRu}`, `To mission: ${selectedMission.titleEn}`, `Do misji: ${selectedMission.titlePl}`, {
          es: `Ir a la misión: ${selectedMission.titleEs ?? selectedMission.titleEn}`,
          fr: `Vers la mission : ${selectedMission.titleFr ?? selectedMission.titleEn}`,
          de: `Zur Mission: ${selectedMission.titleDe ?? selectedMission.titleEn}`,
          it: `Vai alla missione: ${selectedMission.titleIt ?? selectedMission.titleEn}`,
        })
      : tp('Выбери миссию', 'Pick a mission', 'Wybierz misję', { es: 'Elige una misión', fr: 'Choisis une mission', de: 'Wähle eine Mission', it: 'Scegli una missione' })) :
    tp(
      `К брифингу · ${DIFFICULTY_CONFIG[difficulty].label}`,
      `To briefing · ${DIFFICULTY_CONFIG[difficulty].labelEn}`,
      `Do odprawy · ${DIFFICULTY_CONFIG[difficulty].labelPl}`,
      {
        es: `Al briefing · ${DIFFICULTY_CONFIG[difficulty].labelEs}`,
        fr: `Vers le briefing · ${DIFFICULTY_CONFIG[difficulty].labelFr}`,
        de: `Zum Briefing · ${DIFFICULTY_CONFIG[difficulty].labelDe}`,
        it: `Al briefing · ${DIFFICULTY_CONFIG[difficulty].labelIt}`,
      },
    );

  const ctaColor =
    tab === 'learn' ? DIFFICULTY_CONFIG.easy.color :
    tab === 'mission' ? (selectedMission ? DIFFICULTY_CONFIG[selectedMission.difficulty].color : '#8ba7b8') :
    DIFFICULTY_CONFIG[difficulty].color;

  const ctaDisabled = tab === 'mission' && !selectedMission;

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold mb-2"
            style={{ background: 'linear-gradient(135deg, var(--text-primary), #ff6688)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {tp('Гонка', 'Race', 'Wyścig', { es: 'Regata', fr: 'Course', de: 'Rennen', it: 'Regata' })}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {tp('Race · выбери режим', 'Race · pick a mode', 'Race · wybierz tryb', { es: 'Race · elige un modo', fr: 'Race · choisis un mode', de: 'Race · wähle einen Modus', it: 'Race · scegli una modalità' })}
        </p>
      </div>

      {/* Three big preset cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <PresetCard
          active={tab === 'learn'}
          onClick={() => setTab('learn')}
          emoji="🎓"
          accent="#44ff88"
          title={tp('Учусь гоняю', 'Learning to race', 'Uczę się ścigać', { es: 'Aprendo a competir', fr: 'J\'apprends à régater', de: 'Regatta lernen', it: 'Imparo a regatare' })}
          subtitle={tp('Easy + средний ветер', 'Easy + medium wind', 'Łatwy + średni wiatr', { es: 'Fácil + viento medio', fr: 'Facile + vent moyen', de: 'Leicht + mittlerer Wind', it: 'Facile + vento medio' })}
          desc={tp(
            'Спокойные противники, плавные повороты. Для первого опыта гонки.',
            'Calm opponents, gentle turns. For a first racing experience.',
            'Spokojni rywale, łagodne zwroty. Na pierwsze regatowe doświadczenie.',
            {
              es: 'Rivales tranquilos, viradas suaves. Para tu primera experiencia de regata.',
              fr: 'Adversaires calmes, virements en douceur. Pour une première expérience de course.',
              de: 'Ruhige Gegner, sanfte Wenden. Für dein erstes Regatta-Erlebnis.',
              it: 'Avversari tranquilli, virate morbide. Per una prima esperienza di regata.',
            },
          )}
        />
        <PresetCard
          active={tab === 'free'}
          onClick={() => setTab('free')}
          emoji="🏁"
          accent="#00d4ff"
          title={tp('Свободная гонка', 'Free race', 'Wolny wyścig', { es: 'Regata libre', fr: 'Course libre', de: 'Freies Rennen', it: 'Regata libera' })}
          subtitle={tp('Сам выбираешь', 'You choose', 'Ty decydujesz', { es: 'Tú eliges', fr: 'Tu choisis', de: 'Du entscheidest', it: 'Scegli tu' })}
          desc={tp(
            'Сложность, сила ветра, лодка - под тебя. Без конкретной цели.',
            'Difficulty, wind, boat - all yours. No specific objective.',
            'Poziom, siła wiatru, łódź - według ciebie. Bez konkretnego celu.',
            {
              es: 'Dificultad, viento, barco - a tu gusto. Sin un objetivo concreto.',
              fr: 'Difficulté, vent, bateau - à ta guise. Sans objectif précis.',
              de: 'Schwierigkeit, Wind, Boot - wie du willst. Ohne festes Ziel.',
              it: 'Difficoltà, vento, barca - a tua scelta. Senza un obiettivo preciso.',
            },
          )}
        />
        <PresetCard
          active={tab === 'mission'}
          onClick={() => setTab('mission')}
          emoji="🎯"
          accent="#ffaa00"
          title={tp('Миссия', 'Mission', 'Misja', { es: 'Misión', fr: 'Mission', de: 'Mission', it: 'Missione' })}
          subtitle={tp('Конкретная задача', 'Specific objective', 'Konkretny cel', { es: 'Objetivo concreto', fr: 'Objectif précis', de: 'Konkretes Ziel', it: 'Obiettivo preciso' })}
          desc={tp(
            '4 сценария: чистая гонка, под 90 сек, мин. галсов, слабый ветер.',
            '4 scenarios: clean race, under 90 sec, min tacks, light wind.',
            '4 scenariusze: czysty wyścig, poniżej 90 s, minimum zwrotów, słaby wiatr.',
            {
              es: '4 escenarios: regata limpia, menos de 90 s, pocas viradas, viento flojo.',
              fr: '4 scénarios : course propre, moins de 90 s, peu de virements, vent faible.',
              de: '4 Szenarien: sauberes Rennen, unter 90 s, wenige Wenden, Leichtwind.',
              it: '4 scenari: regata pulita, sotto i 90 s, poche virate, vento leggero.',
            },
          )}
        />
      </div>

      {/* Tab-specific controls */}
      {tab === 'mission' && (
        <div className="card p-4 mb-5">
          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ВЫБЕРИ МИССИЮ', 'PICK A MISSION', 'WYBIERZ MISJĘ', { es: 'ELIGE UNA MISIÓN', fr: 'CHOISIS UNE MISSION', de: 'WÄHLE EINE MISSION', it: 'SCEGLI UNA MISSIONE' })}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {missions.map((m) => {
              const active = selectedMission?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => pickMission(m)}
                  className={`p-3 rounded-lg text-left text-xs transition border ${active ? 'ring-1' : 'opacity-80 hover:opacity-100'}`}
                  style={{
                    borderColor: active ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: active ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                    outlineColor: 'var(--accent-cyan)',
                  }}
                >
                  <div className="text-lg mb-1">{m.emoji}</div>
                  <div className="font-semibold text-[var(--text-primary)] line-clamp-1">{mTitle(m)}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{mDesc(m)}</div>
                </button>
              );
            })}
          </div>
          {selectedMission && (
            <div className="mt-3 p-3 rounded text-xs" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
              <div className="text-[var(--text-primary)] font-semibold mb-1">
                {selectedMission.emoji} {mTitle(selectedMission)}
              </div>
              <div className="text-[var(--text-secondary)] leading-relaxed mb-1">{mDesc(selectedMission)}</div>
              <div className="text-[var(--accent-cyan)]">💡 {tp(selectedMission.hintRu, selectedMission.hintEn, selectedMission.hintPl, { es: selectedMission.hintEs, fr: selectedMission.hintFr, de: selectedMission.hintDe, it: selectedMission.hintIt })}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">
                {tp('Автонастройки', 'Auto-settings', 'Ustawienia automatyczne', { es: 'Ajustes automáticos', fr: 'Réglages auto', de: 'Automatische Einstellungen', it: 'Impostazioni automatiche' })}: {difficultyLabel(selectedMission.difficulty)} · {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })} {windLabel(selectedMission.windStrength)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'free' && (
        <div className="card p-4 mb-5 space-y-4">
          {/* Difficulty */}
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СЛОЖНОСТЬ', 'DIFFICULTY', 'POZIOM', { es: 'DIFICULTAD', fr: 'DIFFICULTÉ', de: 'SCHWIERIGKEIT', it: 'DIFFICOLTÀ' })}</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`p-2.5 rounded-lg text-left text-xs transition border ${active ? 'ring-1' : ''}`}
                    style={{
                      borderColor: active ? cfg.color : 'rgba(139, 167, 184, 0.2)',
                      background: active ? `${cfg.color}15` : 'transparent',
                      outlineColor: cfg.color,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <div className="font-semibold" style={{ color: cfg.color }}>{tp(cfg.label, cfg.labelEn, cfg.labelPl, { es: cfg.labelEs, fr: cfg.labelFr, de: cfg.labelDe, it: cfg.labelIt })}</div>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{cfg.opponents} {tp('соперника', 'opponents', 'rywali', { es: 'rivales', fr: 'adversaires', de: 'Gegner', it: 'avversari' })}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Wind */}
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СИЛА ВЕТРА', 'WIND STRENGTH', 'SIŁA WIATRU', { es: 'FUERZA DEL VIENTO', fr: 'FORCE DU VENT', de: 'WINDSTÄRKE', it: 'FORZA DEL VENTO' })}</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'light',  label: tp('Слабый',  'Light',  'Słaby', { es: 'Flojo', fr: 'Faible', de: 'Schwach', it: 'Leggero' }),  icon: '🌬', desc: '~5 kn'  },
                { id: 'medium', label: tp('Средний', 'Medium', 'Średni', { es: 'Medio', fr: 'Moyen', de: 'Mittel', it: 'Medio' }), icon: '💨', desc: '~10 kn' },
                { id: 'heavy',  label: tp('Сильный', 'Strong', 'Silny', { es: 'Fuerte', fr: 'Fort', de: 'Stark', it: 'Forte' }),  icon: '🌪', desc: '~15 kn' },
              ] as const).map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWindStrength(w.id)}
                  className={`p-2.5 rounded-lg border transition text-center ${windStrength === w.id ? 'ring-1' : ''}`}
                  style={{
                    borderColor: windStrength === w.id ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: windStrength === w.id ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    outlineColor: 'var(--accent-cyan)',
                  }}
                >
                  <div className="text-base mb-0.5">{w.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: windStrength === w.id ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{w.label}</div>
                  <div className="text-[9px] text-[var(--text-muted)]">{w.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Boat */}
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ЛОДКА', 'BOAT', 'ŁÓDŹ', { es: 'BARCO', fr: 'BATEAU', de: 'BOOT', it: 'BARCA' })}</div>
            <div className="grid grid-cols-2 gap-2">
              {BOAT_STYLES.map((b) => {
                const active = boatStyle === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setBoatStyle(b.id)}
                    className={`p-2.5 rounded-lg text-left text-xs transition border flex items-center gap-3 ${active ? 'ring-1' : 'opacity-80 hover:opacity-100'}`}
                    style={{
                      borderColor: active ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                      background: active ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                      outlineColor: 'var(--accent-cyan)',
                    }}
                  >
                    <BoatStylePreview style={b.id} />
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{tp(b.labelRu, b.labelEn, b.labelPl, { es: b.labelEs, fr: b.labelFr, de: b.labelDe, it: b.labelIt })}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{tp(b.descRu, b.descEn, b.descPl, { es: b.descEs, fr: b.descFr, de: b.descDe, it: b.descIt })}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible details panel (controls + course rules) */}
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="w-full mb-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1 transition"
      >
        <span>{detailsOpen
          ? tp('Скрыть детали', 'Hide details', 'Ukryj szczegóły', { es: 'Ocultar detalles', fr: 'Masquer les détails', de: 'Details ausblenden', it: 'Nascondi i dettagli' })
          : tp('Показать управление и правила трассы', 'Show controls and course rules', 'Pokaż sterowanie i zasady trasy', { es: 'Ver controles y reglas del recorrido', fr: 'Afficher les commandes et les règles du parcours', de: 'Steuerung und Bahnregeln anzeigen', it: 'Mostra comandi e regole del percorso' })
        }</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {detailsOpen && (
        <div className="card p-4 mb-5 space-y-4">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('УПРАВЛЕНИЕ', 'CONTROLS', 'STEROWANIE', { es: 'CONTROLES', fr: 'COMMANDES', de: 'STEUERUNG', it: 'COMANDI' })}</div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">←</kbd>
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">A</kbd>
                <span className="text-[var(--text-secondary)]">{tp('Влево', 'Left', 'W lewo', { es: 'Izquierda', fr: 'Gauche', de: 'Links', it: 'Sinistra' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">→</kbd>
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">D</kbd>
                <span className="text-[var(--text-secondary)]">{tp('Вправо', 'Right', 'W prawo', { es: 'Derecha', fr: 'Droite', de: 'Rechts', it: 'Destra' })}</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">{tp('На мобайле - кнопки внизу экрана.', 'On mobile - buttons at the bottom.', 'Na telefonie - przyciski na dole ekranu.', { es: 'En el móvil - botones en la parte inferior.', fr: 'Sur mobile - boutons en bas de l\'écran.', de: 'Auf dem Handy - Tasten unten am Bildschirm.', it: 'Su mobile - pulsanti in basso.' })}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ТРАССА', 'COURSE', 'TRASA', { es: 'RECORRIDO', fr: 'PARCOURS', de: 'BAHN', it: 'PERCORSO' })}</div>
            <ol className="text-xs text-[var(--text-secondary)] space-y-1 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от нижней оранжевой линии (там же финиш).', 'Start from the bottom orange line (that\'s also the finish).', 'Start z dolnej pomarańczowej linii (tam jest też meta).', { es: 'Salida desde la línea naranja de abajo (también es la llegada).', fr: 'Départ depuis la ligne orange du bas (c\'est aussi l\'arrivée).', de: 'Start an der unteren orangen Linie (dort ist auch das Ziel).', it: 'Partenza dalla linea arancione in basso (è anche l\'arrivo).' })}</li>
              <li>{tp('Идёшь к верхнему знаку галсами - ветер сверху.', 'Tack your way up to the windward mark - the wind blows from the top.', 'Do znaku nawietrznego płyniesz halsami - wiatr wieje z góry.', { es: 'Subes a la baliza de barlovento dando bordos - el viento viene de arriba.', fr: 'Tu remontes vers la bouée au vent en louvoyant - le vent vient du haut.', de: 'Zur Luvtonne kreuzt du auf - der Wind kommt von oben.', it: 'Risali verso la boa di bolina bordeggiando - il vento arriva dall\'alto.' })}</li>
              <li>{tp('Огибаешь знак (ближе 30 метров).', 'Round the mark (within 30 m).', 'Okrążasz znak (bliżej niż 30 m).', { es: 'Rodeas la baliza (a menos de 30 m).', fr: 'Tu vires la bouée (à moins de 30 m).', de: 'Du rundest die Bahnmarke (näher als 30 m).', it: 'Giri la boa (a meno di 30 m).' })}</li>
              <li>{tp('Возвращаешься полным курсом и пересекаешь финиш сверху вниз.', 'Run back downwind and cross the finish top to bottom.', 'Wracasz kursem pełnym i przecinasz linię mety z góry na dół.', { es: 'Vuelve a favor del viento y cruza la línea de llegada de arriba abajo.', fr: 'Redescends au portant et coupe la ligne d\'arrivée de haut en bas.', de: 'Segle raumschots zurück und fahr von oben nach unten über die Ziellinie.', it: 'Torna con le andature portanti e taglia il traguardo dall\'alto verso il basso.' })}</li>
            </ol>
          </div>
        </div>
      )}

      <button
        onClick={openBriefing}
        disabled={ctaDisabled}
        className="w-full py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-40 hover:scale-[1.01]"
        style={{
          background: `linear-gradient(135deg, ${ctaColor}, ${ctaColor}cc)`,
          color: '#0a1628',
          boxShadow: `0 4px 24px ${ctaColor}44`,
        }}
      >
        {ctaLabel} →
      </button>
    </div>
  );
}

function PresetCard({
  active, onClick, emoji, accent, title, subtitle, desc,
}: {
  active: boolean; onClick: () => void;
  emoji: string; accent: string; title: string; subtitle: string; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left transition-all ${active ? 'ring-2 scale-[1.02]' : 'hover:scale-[1.01] opacity-85 hover:opacity-100'}`}
      style={{
        borderColor: active ? accent : undefined,
        outlineColor: active ? accent : undefined,
        background: active ? `${accent}0D` : undefined,
        boxShadow: active ? `0 4px 24px ${accent}33` : undefined,
      }}
    >
      <div className="text-3xl mb-1.5">{emoji}</div>
      <div className="font-semibold text-base" style={{ color: active ? accent : 'var(--text-primary)' }}>{title}</div>
      <div className="text-[11px] text-[var(--text-muted)] mb-2">{subtitle}</div>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
    </button>
  );
}

// ============================================================================
// Small SVG preview of a boat style (used in the boat picker)
// ============================================================================

function BoatStylePreview({ style }: { style: BoatStyle }) {
  const cfg = BOAT_STYLES.find((b) => b.id === style) ?? BOAT_STYLES[0];
  const w = 24 * cfg.hullWidth;
  const h = 46 * cfg.hullScale;
  return (
    <svg viewBox="-24 -30 48 60" className="block mx-auto" width="44" height="55" aria-hidden="true">
      {/* Hull */}
      <path
        d={`M 0,${-h / 2.2} Q ${w / 2},0 ${w / 3},${h / 2.8} L ${-w / 3},${h / 2.8} Q ${-w / 2},0 0,${-h / 2.2} Z`}
        fill="#d7e8f4"
        stroke="#8fb4c9"
        strokeWidth="0.7"
      />
      {/* Sail */}
      <path
        d={`M 0,${-h / 2.4} Q 8,0 2,${h / 3.6} L 0,${h / 3.6} Z`}
        fill={cfg.sailHue}
        stroke="#ffffff"
        strokeWidth="0.5"
      />
      {style === 'racer' && (
        <rect x="-1" y={-h / 2.5} width="2" height={h * 0.7} fill="#00d4ff" opacity="0.4" />
      )}
    </svg>
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
  const minutesAgo = Math.max(1, Math.round((Date.now() - saved.ts) / 60000));
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
