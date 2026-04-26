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

// ============================================================================
// TYPES
// ============================================================================

type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'menu' | 'briefing' | 'countdown' | 'racing' | 'finished' | 'replay';
type BoatStyle = 'cruiser' | 'racer';

const BOAT_STYLES: {
  id: BoatStyle;
  labelRu: string; labelEn: string; labelPl: string;
  descRu: string; descEn: string; descPl: string;
  hullScale: number; hullWidth: number; sailHue: string;
}[] = [
  { id: 'cruiser', labelRu: 'Круизер', labelEn: 'Cruiser', labelPl: 'Jacht turystyczny',
    descRu: 'Сбалансированная, для начала.',
    descEn: 'Balanced, good for starting out.',
    descPl: 'Zbalansowany, dobry na poczatek.',
    hullScale: 1.0, hullWidth: 1.0, sailHue: '#ffffff' },
  { id: 'racer', labelRu: 'Гоночная', labelEn: 'Racer', labelPl: 'Regatowy',
    descRu: 'Узкий длинный корпус, быстрая.',
    descEn: 'Narrow long hull, fast.',
    descPl: 'Waski dlugi kadlub, szybki.',
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
  }>;
  strengths: string[];
  nextGoalRu: string;
}

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const WORLD = { width: 800, height: 1200 };   // logical world coords
const WIND_DIRECTION = 0;                       // degrees; 0 = wind from top (coming DOWN screen)
const MAX_SPEED = 8.0;                          // knots
const TURN_RATE = 90;                           // deg/sec player
const ACCEL = 2.5;                              // speed lerp factor
const MARK_ROUND_DIST = 28;                     // distance to count mark rounded

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;      // RU (legacy field name, kept for compat)
  labelEn: string;
  labelPl: string;
  description: string;      // RU
  descriptionEn: string;
  descriptionPl: string;
  opponents: number;
  aiSpeedMul: number;
  aiSkill: number;
  color: string;
}> = {
  easy: {
    label: 'Лёгкий',
    labelEn: 'Easy',
    labelPl: 'Latwy',
    description: 'Медленные противники, спокойные повороты. Хорошо для знакомства с управлением.',
    descriptionEn: 'Slow opponents, gentle turns. Good for getting used to the controls.',
    descriptionPl: 'Wolni rywale, lagodne zwroty. Dobre do zapoznania sie ze sterowaniem.',
    opponents: 2,
    aiSpeedMul: 0.78,
    aiSkill: 0.7,
    color: '#44ff88',
  },
  medium: {
    label: 'Средний',
    labelEn: 'Medium',
    labelPl: 'Sredni',
    description: 'Соперники держат курс уверенно. Нужна тактика лавировки и точное огибание знаков.',
    descriptionEn: 'Opponents sail a confident line. You need tacking tactics and precise mark rounding.',
    descriptionPl: 'Rywale plyna pewnie. Potrzebna taktyka halsowania i precyzyjne oplywanie znakow.',
    opponents: 3,
    aiSpeedMul: 0.92,
    aiSkill: 0.9,
    color: '#ffaa00',
  },
  hard: {
    label: 'Сложный',
    labelEn: 'Hard',
    labelPl: 'Trudny',
    description: 'Агрессивные соперники идут почти оптимально. Каждая ошибка дорого стоит.',
    descriptionEn: 'Aggressive opponents sail near-optimal lines. Every mistake is costly.',
    descriptionPl: 'Agresywni rywale plyna niemal optymalnie. Kazdy blad jest kosztowny.',
    opponents: 4,
    aiSpeedMul: 1.02,
    aiSkill: 1.0,
    color: '#ff4444',
  },
};

const AI_NAMES = ['Nautilus', 'Mistral', 'Trident', 'Aurora', 'Kraken', 'Borealis'];
const AI_COLORS = ['#ff6688', '#88ddff', '#ffdd44', '#aa88ff', '#ff8844', '#66ffbb'];

// ============================================================================
// SAILING PHYSICS
// ============================================================================

// Speed factor based on true wind angle (TWA, absolute, 0-180)
function speedFactorFromTWA(twa: number): number {
  const a = Math.abs(twa);
  if (a < 30) return 0;                                            // no-go zone
  if (a < 45) return ((a - 30) / 15) * 0.65;                       // ramp up to close-hauled
  if (a < 90) return 0.65 + ((a - 45) / 45) * 0.35;                // close-hauled → beam reach
  if (a < 160) return 1.0 - ((a - 90) / 70) * 0.15;                // beam → broad reach
  return 0.85 - ((a - 160) / 20) * 0.25;                           // broad → running
}

// True wind angle from boat heading, given current wind source direction.
// windDir = direction the wind is COMING FROM (0 = from north).
// TWA is the angle between the boat's bow and where the wind is coming from.
function calcTWA(heading: number, windDir = 0): number {
  const twa = ((heading - windDir + 540) % 360) - 180; // -180..180
  return twa; // signed: positive = wind from starboard (right), negative = port
}

// Tack: port (left) or starboard (right)
function calcTack(heading: number): 'port' | 'starboard' {
  const twa = calcTWA(heading);
  return twa > 0 ? 'port' : 'starboard'; // if wind from starboard, sailing port tack
}

// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

const deg2rad = (d: number) => (d * Math.PI) / 180;
const rad2deg = (r: number) => (r * 180) / Math.PI;

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Bearing from point a to point b (0 = up/north, clockwise)
function bearing(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rad = Math.atan2(dx, -dy); // note: y is inverted (up = negative dy)
  return (rad2deg(rad) + 360) % 360;
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Shortest angle difference from a to b (signed, -180..180)
function angleDiff(a: number, b: number): number {
  let d = normalizeAngle(b) - normalizeAngle(a);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// Check if a segment (p1, p2) was crossed between prev and curr (for line-crossing detection)
function segmentCrossed(prev: Vec2, curr: Vec2, a: Vec2, b: Vec2): boolean {
  const ccw = (A: Vec2, B: Vec2, C: Vec2) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return ccw(a, prev, curr) !== ccw(b, prev, curr) && ccw(a, b, prev) !== ccw(a, b, curr);
}

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
      { pos: { x: cx, y: windwardY }, radius: 14, label: 'Верхний знак', labelEn: 'Windward mark', labelPl: 'Znak nawietrzny', type: 'windward', roundSide: 'port' },
      { pos: startLine.a, radius: 10, label: 'Старт/Финиш Л', labelEn: 'Start/Finish L', labelPl: 'Start/Meta L', type: 'start' },
      { pos: startLine.b, radius: 10, label: 'Старт/Финиш П', labelEn: 'Start/Finish R', labelPl: 'Start/Meta P', type: 'start' },
    ],
    startLine,
    finishLine: startLine,
  };
}

// ============================================================================
// AI LOGIC
// ============================================================================

function computeAIHeading(boat: Boat, course: Course, dt: number): number {
  const currentHeading = boat.heading;
  let targetBearing: number;

  if (boat.lapDone === 0) {
    // Heading to windward mark
    targetBearing = bearing(boat.pos, course.marks[0].pos);
  } else {
    // Heading to finish line center
    const finishCenter: Vec2 = {
      x: (course.finishLine.a.x + course.finishLine.b.x) / 2,
      y: (course.finishLine.a.y + course.finishLine.b.y) / 2,
    };
    targetBearing = bearing(boat.pos, finishCenter);
  }

  // Check if target bearing is in no-go zone (< 30° to wind source which is at 0)
  // Wind source direction = 0, so angle to wind = targetBearing or 360-targetBearing
  const angleToWind = Math.min(normalizeAngle(targetBearing), 360 - normalizeAngle(targetBearing));

  let desiredHeading: number;

  if (angleToWind < 42 && boat.lapDone === 0) {
    // Upwind: must tack. Choose layline at ~45° to wind
    const tackAngle = 45;
    const pref = boat.tackPreference || 'starboard';
    // Starboard tack: wind from right, boat heading offset clockwise from 180° (downwind)
    // Close-hauled headings: 45° (port tack) or 315° (starboard tack)
    const portTackHdg = tackAngle;           // sailing toward upper-right with wind from left
    const starboardTackHdg = 360 - tackAngle; // sailing toward upper-left with wind from right

    // Check lay line: are we close enough that the other tack would reach the mark?
    const markPos = course.marks[0].pos;
    const distToMark = distance(boat.pos, markPos);
    const markBearing = bearing(boat.pos, markPos);

    // Switch tack if: too far off the "correct" side of the mark for current tack
    // Starboard tack (heading 315°) is good for reaching a mark that's to the right of wind
    // Port tack (heading 45°) is good for reaching a mark that's to the left of wind
    const markOffsetX = markPos.x - boat.pos.x;

    // Determine tack preference based on advantage
    boat.aiTackTimer = (boat.aiTackTimer ?? 0) + dt;
    const tackInterval = 3.0 + (1.1 - boat.skill) * 3; // better skill = faster tactical decisions

    if (boat.aiTackTimer > tackInterval || distToMark < 220) {
      // Re-evaluate tack choice
      if (distToMark < 180) {
        // Near the mark: take the tack that leads to it directly
        boat.tackPreference = markOffsetX > 0 ? 'port' : 'starboard';
      } else {
        // Zigzag naturally
        boat.tackPreference = pref === 'port' ? 'starboard' : 'port';
      }
      boat.aiTackTimer = 0;
    }

    desiredHeading = boat.tackPreference === 'port' ? portTackHdg : starboardTackHdg;
  } else if (angleToWind > 170 && boat.lapDone === 1) {
    // Dead downwind: slightly offset for VMG (broad reach)
    const bias = boat.tackPreference === 'port' ? -20 : 20;
    desiredHeading = normalizeAngle(targetBearing + bias);
  } else {
    // Normal sailable bearing
    desiredHeading = targetBearing;
  }

  // Smooth turn
  const diff = angleDiff(currentHeading, desiredHeading);
  const maxTurn = TURN_RATE * boat.skill * dt;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
  return normalizeAngle(currentHeading + turn);
}

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
      setSaveError('Не финишировал');
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
          if (!r.ok) throw new Error(d.error || 'Failed to save nickname');
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
        if (!res.ok) throw new Error(d.error || 'Failed to save result');
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        setSaveError(err instanceof Error ? err.message : 'Network error');
      }
    };
    void doSave();
  }, [nickname, results, difficulty, windStrength, selectedMission, coaching]);

  // Auto-save when finished (once). We don't prompt for a nickname during the
  // friends-testing phase; if there's no stored nickname we just skip saving.
  useEffect(() => {
    if (gameState !== 'finished') return;
    if (saveAttemptedRef.current) return;
    const player = boatsRef.current.find((b) => b.isPlayer);
    if (!player || player.lapDone !== 2) return;
    saveAttemptedRef.current = true;
    if (nickname) saveResult();
  }, [gameState, nickname, saveResult]);

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
      heading: 0,
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
        heading: 0,
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
    setGameState('briefing');
  }, [difficulty, windStrength, initRace]);

  const beginCountdown = useCallback(() => {
    setCountdown(3);
    setGameState('countdown');
  }, []);

  // Legacy name - kept so existing handlers don't break (e.g. "Ещё раз" button)
  const startRace = openBriefing;

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown === 0) {
      playStart();
      startTimeRef.current = performance.now();
      lastTimeRef.current = performance.now();
      setGameState('racing');
      return;
    }
    playBeep();
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [gameState, countdown]);

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
      const cfg = DIFFICULTY_CONFIG[difficulty];

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

        // --- Heading update ---
        if (boat.isPlayer) {
          const keyRight = keysRef.current.has('arrowright') || keysRef.current.has('d') || rightHeldRef.current;
          const keyLeft = keysRef.current.has('arrowleft') || keysRef.current.has('a') || leftHeldRef.current;
          const turnInput = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
          if (turnInput !== 0) {
            // Any input turns off autopilot
            if (autopilotOn) setAutopilotOn(false);
            boat.heading = normalizeAngle(boat.heading + turnInput * TURN_RATE * dt);
          } else if (autopilotOn) {
            // Smoothly hold target heading (stops drift caused by wind / wave ~ n/a but future-proofed)
            const diff = angleDiff(boat.heading, autopilotHeadingRef.current);
            const maxTurn = TURN_RATE * 0.5 * dt;
            boat.heading = normalizeAngle(boat.heading + Math.max(-maxTurn, Math.min(maxTurn, diff)));
          }
        } else {
          boat.heading = computeAIHeading(boat, course, dt);
        }

        // --- Speed from sailing physics ---
        const twa = calcTWA(boat.heading, windDirRef.current);
        const speedMul = boat.isPlayer ? 1.0 : cfg.aiSpeedMul;
        boat.targetSpeed = speedFactorFromTWA(twa) * MAX_SPEED * speedMul * windStrengthRef.current * windGustRef.current;

        // Lerp speed toward target
        const accel = (boat.targetSpeed > boat.speed ? ACCEL : ACCEL * 0.6);
        boat.speed += (boat.targetSpeed - boat.speed) * accel * dt;

        // --- Position update ---
        const rad = deg2rad(boat.heading);
        boat.pos.x += Math.sin(rad) * boat.speed * 8 * dt;  // scale factor for visual movement
        boat.pos.y -= Math.cos(rad) * boat.speed * 8 * dt;

        // Clamp to world
        boat.pos.x = Math.max(20, Math.min(WORLD.width - 20, boat.pos.x));
        boat.pos.y = Math.max(20, Math.min(WORLD.height - 20, boat.pos.y));
      }

      // --- Collision avoidance: repel overlapping boats (simple nearest-pair)
      const MIN_SEP = 22; // world units
      for (let i = 0; i < boats.length; i++) {
        for (let j = i + 1; j < boats.length; j++) {
          const a = boats[i];
          const b = boats[j];
          const dx = b.pos.x - a.pos.x;
          const dy = b.pos.y - a.pos.y;
          const d = Math.hypot(dx, dy);
          if (d < MIN_SEP && d > 0.01) {
            const overlap = (MIN_SEP - d) / 2;
            const nx = dx / d;
            const ny = dy / d;
            a.pos.x -= nx * overlap;
            a.pos.y -= ny * overlap;
            b.pos.x += nx * overlap;
            b.pos.y += ny * overlap;
            // small speed penalty on contact
            a.speed *= 0.92;
            b.speed *= 0.92;
          }
        }
      }

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

        // --- Course progression ---
        if (boat.lapDone === 0) {
          // Check windward mark rounding
          const windwardMark = course.marks[0];
          if (distance(boat.pos, windwardMark.pos) < MARK_ROUND_DIST + windwardMark.radius) {
            boat.lapDone = 1;
            if (boat.isPlayer) {
              const t = (now - startTimeRef.current) / 1000;
              logEventsRef.current.push({ type: 'mark-rounded', t, note: 'windward' });
              playMarkRound();
            }
          }
        } else if (boat.lapDone === 1) {
          // Check finish line crossing (from north to south direction)
          if (segmentCrossed(prevPos, boat.pos, course.finishLine.a, course.finishLine.b)) {
            if (prevPos.y < boat.pos.y) {
              // Crossed southward = finish
              boat.lapDone = 2;
              boat.finishTime = (now - startTimeRef.current) / 1000;
              if (boat.isPlayer) {
                logEventsRef.current.push({ type: 'finish', t: boat.finishTime });
                playFinish();
              }
            }
          }
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
      if (isRacing) setElapsed((now - startTimeRef.current) / 1000);

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
      const tooLong = elapsed > 300; // 5 minutes max

      if (isRacing && (allFinished || (playerFinished && elapsed > (player.finishTime ?? 0) + 15) || tooLong)) {
        const sorted = [...boats]
          .map((b) => ({ name: b.name, time: b.finishTime ?? Infinity, color: b.color, isPlayer: b.isPlayer }))
          .sort((a, b) => a.time - b.time);
        setResults(sorted);
        setGameState('finished');

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
              else setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostepne - pokazuje analize lokalna'));
            }
          })
          .catch(() => {
            // Network error - use local analysis
            const local = analyseRaceLocally(payload, lang);
            setCoaching(local);
            setCoachingError(tp('AI недоступен - показан локальный анализ', 'AI unavailable - showing local analysis', 'AI niedostepne - pokazuje analize lokalna'));
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
        const markLabel = lang === 'pl' ? mark.labelPl : lang === 'en' ? mark.labelEn : mark.label;
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
      const target = player.lapDone === 0 ? course.marks[0].pos : {
        x: (course.finishLine.a.x + course.finishLine.b.x) / 2,
        y: course.finishLine.a.y,
      };
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
    drawMiniMap(ctx, W, H, boats, course);
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
            ← {tp('Назад к выбору', 'Back to menu', 'Wroc do wyboru')}
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
                title={tp('Твой рекорд', 'Your best', 'Twoj rekord',
                  { es: 'Tu record', fr: 'Ton record', de: 'Dein Rekord', it: 'Tuo record' })}
              >
                🏆 {formatRecordTime(bestRecord.timeSec)}
              </div>
            )}
            <div className="text-xs px-2 py-1 rounded" style={{
              background: `${DIFFICULTY_CONFIG[difficulty].color}22`,
              color: DIFFICULTY_CONFIG[difficulty].color,
              border: `1px solid ${DIFFICULTY_CONFIG[difficulty].color}44`,
            }}>
              {tp(DIFFICULTY_CONFIG[difficulty].label, DIFFICULTY_CONFIG[difficulty].labelEn, DIFFICULTY_CONFIG[difficulty].labelPl)} · {windStrength === 'light' ? tp('слабый', 'light', 'slaby') : windStrength === 'heavy' ? tp('сильный', 'heavy', 'silny') : tp('средний', 'medium', 'sredni')} {tp('ветер', 'wind', 'wiatr')}
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Брифинг', 'Briefing', 'Briefing')}
        </h1>

        {/* ARCADE badge - makes it explicit that /game uses simplified physics
            (race-physics.ts lookup model), different from /simulator-v3 (VPP
            force balance). Users who noticed "speed differs between /game and
            /simulator" were confused; this banner explains why. */}
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-semibold"
             style={{ background: 'rgba(255, 170, 0, 0.12)', border: '1px solid rgba(255, 170, 0, 0.3)', color: 'var(--warning)' }}>
          <span>🕹️</span>
          <span>
            {tp(
              'АРКАДНЫЙ РЕЖИМ · физика упрощена для скорости игры. Настоящая - в /simulator-v3',
              'ARCADE MODE · simplified physics for gameplay speed. Real physics lives in /simulator-v3',
              'TRYB ARCADE · uproszczona fizyka dla szybkiej rozgrywki. Prawdziwa jest w /simulator-v3',
            )}
          </span>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {tp(
            'Что делать и как не накосячить. Прочитай - старт через 3 секунды будет некогда разбираться.',
            'What to do and how not to screw up. Read it - in 3 seconds you won\'t have time.',
            'Co robic i jak sie nie pomylic. Przeczytaj - za 3 sekundy nie bedzie czasu.',
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Course preview */}
          <div className="card p-4">
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{tp('ТРАССА', 'COURSE', 'TRASA')}</div>
            <CoursePreview />
            <ol className="text-sm text-[var(--text-secondary)] mt-4 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от оранжевой линии внизу.', 'Start from the orange line below.', 'Start od pomaranczowej linii na dole.')}</li>
              <li>{tp('Идёшь', 'Go', 'Idziesz')} <span className="text-[var(--accent-cyan)] font-semibold">{tp('галсами', 'on tacks', 'halsami')}</span> {tp('к верхнему знаку - прямо против ветра нельзя.', 'to the windward mark - you can\'t go straight into wind.', 'do znaku nawietrznego - pod wiatr nie mozna.')}</li>
              <li>{tp('Обходишь верхний знак (подойди на ~30 м).', 'Round the windward mark (get within ~30 m).', 'Okrazasz znak nawietrzny (podejdz na ~30 m).')}</li>
              <li>{tp('Возвращаешься полным курсом и пересекаешь финиш сверху вниз.', 'Run back downwind and cross the finish top to bottom.', 'Wracasz kursem pelnym i przecinasz mete z gory w dol.')}</li>
            </ol>
          </div>

          {/* Controls */}
          <div className="card p-4">
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">{tp('УПРАВЛЕНИЕ', 'CONTROLS', 'STEROWANIE')}</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">←</kbd>
                  <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">→</kbd>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Повернуть. На мобайле - кнопки внизу экрана.', 'Turn. On mobile - buttons at the bottom of the screen.', 'Skret. Na mobilce - przyciski na dole ekranu.')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-2 py-1 rounded text-[10px] font-semibold border border-[rgba(0,212,255,0.3)] text-[var(--accent-cyan)]">▶ AUTO</div>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Автопилот - держит текущий курс. Выключается от любого поворота. Удобно на длинных галсах, чтобы не подправлять.', 'Autopilot - holds the current heading. Disengages on any turn. Handy on long tacks.', 'Autopilot - trzyma biezacy kurs. Wylacza sie przy kazdym skrecie. Przydatne na dlugich halsach.')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base">🧭</span>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Левый HUD - TWA (угол к ветру) и скорость. Держи TWA > 40° на лавировке.', 'Left HUD - TWA (angle to wind) and speed. Keep TWA > 40° when tacking.', 'Lewy HUD - TWA (kat do wiatru) i predkosc. Trzymaj TWA > 40° przy halsowaniu.')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base">📍</span>
                <span className="text-sm text-[var(--text-secondary)]">{tp('Стрелка на экране показывает направление к следующему знаку.', 'The on-screen arrow points to the next mark.', 'Strzalka na ekranie pokazuje kierunek do nastepnego znaku.')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key rules */}
        <div className="card p-4 mb-6" style={{ borderColor: 'rgba(255, 170, 0, 0.3)', background: 'rgba(255, 170, 0, 0.04)' }}>
          <div className="text-xs font-semibold tracking-wider mb-2" style={{ color: 'var(--warning)' }}>⚠ {tp('ВАЖНО', 'IMPORTANT', 'WAZNE')}</div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1.5 leading-relaxed">
            <li>• {tp('В секторе ±30° от ветра паруса не работают - это', 'In the ±30° sector upwind sails don\'t work - this is the', 'W sektorze ±30° od wiatru zagle nie dzialaja - to')} <span className="text-[var(--danger)] font-semibold">{tp('мёртвая зона', 'dead zone', 'martwa strefa')}</span>. {tp('Если встал - отверни от ветра градусов на 50.', 'If stuck - bear off ~50° from the wind.', 'Jesli stanales - odpadnij od wiatru o jakies 50°.')}</li>
            <li>• {tp('Лавировка = длинные галсы, а не частые повороты. Каждый поворот теряет скорость.', 'Tacking = long legs, not frequent turns. Every turn loses speed.', 'Halsowanie = dlugie halsy, nie czeste zwroty. Kazdy zwrot traci predkosc.')}</li>
            <li>• {tp('AI разберёт твою гонку после финиша и покажет, где ты терял время.', 'AI reviews your race after the finish and shows where you lost time.', 'AI przeanalizuje twoj wyscig po mecie i pokaze, gdzie traciles czas.')}</li>
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
          {tp('Готов - старт через 3·2·1', 'Ready - starting in 3·2·1', 'Gotowy - start za 3·2·1')}
        </button>
      </div>
    );
  }

  // =====================================================================
  // RACING / COUNTDOWN / FINISHED SCREENS (Canvas)
  // =====================================================================
  return (
    <div className="relative w-full" style={{ height: 'calc(100dvh - 56px)' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

      {/* HUD - top bar */}
      {gameState === 'racing' && (
        <>
          {/* Left HUD: course info - compact on mobile */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 card p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 min-w-[140px] sm:min-w-[180px]" style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{tp('КУРС', 'POS', 'KURS')}</span>
              <span className="text-[10px] sm:text-xs font-mono truncate" style={{ color: currentPoS.color }}>{legacyPick(currentPoS, 'name', lang)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">TWA</span>
              <span className="text-xs sm:text-sm font-mono font-bold" style={{ color: currentPoS.color }}>{Math.round(Math.abs(playerTWA))}°</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{tp('СКОР.', 'SPD', 'PRED.')}</span>
              <span className="text-xs sm:text-sm font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>{playerSpeed.toFixed(1)} kts</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="h-full transition-all" style={{ width: `${(playerSpeed / MAX_SPEED) * 100}%`, background: currentPoS.color }} />
            </div>
          </div>

          {/* Right HUD: position + time - compact */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 card p-2 sm:p-3 flex flex-col gap-1 items-end" style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">{tp('ПОЗИЦИЯ', 'PLACE', 'POZYCJA')}</div>
            <div className="text-lg sm:text-2xl font-bold leading-none" style={{ color: position.rank === 1 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {position.rank}<span className="text-[10px] sm:text-xs text-[var(--text-muted)]"> / {position.total}</span>
            </div>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5 sm:mt-1">{tp('ВРЕМЯ', 'TIME', 'CZAS')}</div>
            <div className="text-xs sm:text-sm font-mono text-[var(--text-primary)]">{formatTime(elapsed)}</div>
          </div>

          {/* Mark progress indicator - above touch controls on mobile */}
          <div className="absolute left-1/2 -translate-x-1/2 card px-3 py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
               style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 190px)' }}>
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 0 && `→ ${tp('К верхнему знаку', 'To windward mark', 'Do znaku nawietrznego')}`}
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 1 && `→ ${tp('На финиш', 'To finish', 'Do mety')}`}
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 2 && `✓ ${tp('Финиш!', 'Finish!', 'Meta!')}`}
          </div>

          {/* Mission hint (if any) - under the mark progress, only during race */}
          {selectedMission && gameState === 'racing' && (
            <div className="absolute left-1/2 -translate-x-1/2 card px-3 py-1.5 text-[10px] sm:text-[11px] max-w-[280px] text-center"
                 style={{ backdropFilter: 'blur(8px)', background: 'rgba(0, 212, 255, 0.15)', borderColor: 'rgba(0, 212, 255, 0.4)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 230px)' }}>
              <span className="mr-1">{selectedMission.emoji}</span>
              <span className="text-[var(--accent-cyan)] font-semibold">{tp(selectedMission.titleRu, selectedMission.titleEn, selectedMission.titlePl)}:</span>{' '}
              <span className="text-[var(--text-secondary)]">{tp(selectedMission.hintRu, selectedMission.hintEn, selectedMission.hintPl)}</span>
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
            aria-label={muted ? 'Unmute' : 'Mute'}
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
            ← {tp('Меню', 'Menu', 'Menu')}
          </button>

          {/* Autopilot button - above touch controls, safe-area aware */}
          <button
            onClick={() => {
              const player = boatsRef.current.find((b) => b.isPlayer);
              if (!player) return;
              if (autopilotOn) {
                setAutopilotOn(false);
              } else {
                autopilotHeadingRef.current = player.heading;
                setAutopilotOn(true);
              }
            }}
            title={tp('AUTO: удерживает текущий курс. Выключится от любого поворота.',
                     'AUTO: holds current heading. Disengages on any turn input.',
                     'AUTO: trzyma biezacy kurs. Wylacza sie przy kazdym skrecie.')}
            className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition active:scale-95"
            style={{
              background: autopilotOn ? 'rgba(0, 212, 255, 0.85)' : 'rgba(21, 37, 64, 0.85)',
              color: autopilotOn ? '#0a1628' : 'var(--accent-cyan)',
              border: '1px solid rgba(0, 212, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 128px)',
            }}
          >
            {autopilotOn ? `⏸ ${tp('AUTO вкл', 'AUTO on', 'AUTO wl')}` : `▶ ${tp('AUTO', 'AUTO', 'AUTO')}`}
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
              aria-label="Turn left"
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
              aria-label="Turn right"
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
              {countdown === 0 ? tp('СТАРТ!', 'START!', 'START!') : countdown}
            </div>
            <div className="text-[var(--text-secondary)]">{tp('Приготовься к старту...', 'Get ready for the start...', 'Przygotuj sie do startu...')}</div>
          </div>
        </div>
      )}

      {/* Finish overlay */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="card p-6 sm:p-8 max-w-lg w-full my-4">
            <div className="text-center mb-5">
              <div className="text-sm text-[var(--text-muted)] mb-2">{tp('РЕЗУЛЬТАТ', 'RESULT', 'WYNIK')}</div>
              {playerFinished?.time !== undefined && playerFinished.time !== Infinity ? (
                <>
                  <div className="text-5xl font-bold mb-2" style={{
                    color: playerRank === 1 ? 'var(--warning)' : playerRank <= 3 ? 'var(--success)' : 'var(--text-primary)',
                  }}>
                    {playerRank}
                    <span className="text-2xl text-[var(--text-muted)]"> {tp('из', 'of', 'z')} {results.length}</span>
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
                        { es: 'Nuevo record!', fr: 'Nouveau record !', de: 'Neuer Rekord!', it: 'Nuovo record!' })}
                    </div>
                  )}
                  {!isNewRecord && bestRecord && (
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      {tp('Твой рекорд:', 'Your best:', 'Twoj rekord:',
                        { es: 'Tu record:', fr: 'Ton record :', de: 'Dein Rekord:', it: 'Tuo record:' })}{' '}
                      <span className="font-mono">{formatRecordTime(bestRecord.timeSec)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold mb-2" style={{ color: 'var(--danger)' }}>{tp('Не финишировал', 'Did not finish', 'Nie ukonczyl')}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{tp('Время вышло', 'Time\'s up', 'Czas minal')}</div>
                </>
              )}
            </div>

            {/* Compact leaderboard - collapsed by default, only winner + you shown on mobile */}
            <details className="mb-5 card p-3">
              <summary className="cursor-pointer text-xs font-semibold tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span>{tp('РЕЗУЛЬТАТЫ ГОНКИ', 'RACE RESULTS', 'WYNIKI WYSCIGU')} ({results.length})</span>
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
                      <span className={`text-xs ${r.isPlayer ? 'font-semibold' : ''}`}>{r.name}</span>
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
                      ? tp('✓ Миссия пройдена', '✓ Mission passed', '✓ Misja zaliczona')
                      : tp('⚠ Миссия провалена', '⚠ Mission failed', '⚠ Misja nieudana')
                    }: {tp(missionResult.mission.titleRu, missionResult.mission.titleEn, missionResult.mission.titlePl)}
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
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🧭</span>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{tp('AI-тренер', 'AI coach', 'Trener AI')}</div>
              </div>
              {coachingLoading && <AnalyzingProgress />}
              {coachingError && !coaching && (
                <div className="text-xs text-[var(--text-muted)] italic">{coachingError}</div>
              )}
              {coaching && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{tp('Оценка', 'Score', 'Ocena')}</div>
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
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">{tp('Ошибки', 'Mistakes', 'Bledy')}</div>
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
                              <div className="font-semibold text-[var(--text-primary)]">{m.titleRu}</div>
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed mb-1">{m.explanationRu}</p>
                            <p className="text-[var(--success)] leading-relaxed">💡 {m.fixRu}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {coaching.strengths.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">{tp('Сильные стороны', 'Strengths', 'Mocne strony')}</div>
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
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">{tp('Цель на следующую гонку', 'Goal for next race', 'Cel na nastepny wyscig')}</div>
                    <p className="text-xs text-[var(--accent-cyan)]">{coaching.nextGoalRu}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Nickname prompt + Share block hidden while we are testing with friends.
                Save-to-leaderboard auto-happens silently in the background via saveResult(). */}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={backToMenu}
                className="flex-1 min-w-[100px] py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition"
              >
                {tp('Меню', 'Menu', 'Menu')}
              </button>
              <button
                onClick={() => setGameState('replay')}
                disabled={logSamplesRef.current.length < 5}
                className="flex-1 min-w-[100px] py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--accent-cyan)] hover:bg-[rgba(0,212,255,0.08)] transition disabled:opacity-40"
              >
                ▶ {tp('Replay гонки', 'Race replay', 'Replay wyscigu')}
              </button>
              <button
                onClick={openBriefing}
                className="flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: `linear-gradient(135deg, ${DIFFICULTY_CONFIG[difficulty].color}, ${DIFFICULTY_CONFIG[difficulty].color}cc)`,
                  color: '#0a1628',
                }}
              >
                {tp('Ещё раз', 'Again', 'Jeszcze raz')}
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
  const { tp } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/r/${code}` : '';
  const shareText = finishTime
    ? tp(
        `Прошёл регату за ${formatTime(finishTime)}${rank && total ? ` (${rank}/${total})` : ''} на regatta.icoffio.com - смотри replay`,
        `Finished the race in ${formatTime(finishTime)}${rank && total ? ` (${rank}/${total})` : ''} at regatta.icoffio.com - check the replay`,
        `Ukonczylem regate w ${formatTime(finishTime)}${rank && total ? ` (${rank}/${total})` : ''} na regatta.icoffio.com - zobacz replay`,
      )
    : tp('Мой replay на regatta.icoffio.com', 'My replay at regatta.icoffio.com', 'Moj replay na regatta.icoffio.com');

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
    ? `/api/og/result?nick=${encodeURIComponent(nickname ?? 'Player')}&time=${encodeURIComponent(formatTime(finishTime))}&place=${rank ?? ''}&of=${total ?? ''}&code=${code}&difficulty=${difficulty}&wind=${windStrength}&mission=${encodeURIComponent(missionTitle ?? '')}`
    : null;

  return (
    <div className="mb-4 p-3 rounded-lg"
         style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">SHARE REPLAY</div>
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
            {copied ? tp('✓ Скопировано', '✓ Copied', '✓ Skopiowano') : tp('🔗 Поделиться', '🔗 Share', '🔗 Udostepnij')}
          </button>
          <Link
            href={`/r/${code}`}
            className="px-3 py-1.5 rounded text-xs font-semibold border"
            style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}
          >
            {tp('Открыть', 'Open', 'Otworz')}
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

function getPointOfSailName(twa: number): { nameRu: string; nameEn: string; namePl: string; color: string } {
  const a = Math.abs(twa);
  if (a < 30) return { nameRu: 'Левентик', nameEn: 'In irons', namePl: 'Lewentyk', color: '#ff4444' };
  if (a < 60) return { nameRu: 'Бейдевинд', nameEn: 'Close-hauled', namePl: 'Bajdewind', color: '#ff8844' };
  if (a < 110) return { nameRu: 'Галфвинд', nameEn: 'Beam reach', namePl: 'Polwiatr', color: '#44ff88' };
  if (a < 160) return { nameRu: 'Бакштаг', nameEn: 'Broad reach', namePl: 'Baksztag', color: '#44aaff' };
  return { nameRu: 'Фордевинд', nameEn: 'Running', namePl: 'Fordewind', color: '#8844ff' };
}

function drawMiniMap(ctx: CanvasRenderingContext2D, W: number, H: number, boats: Boat[], course: Course) {
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
  ctx.fillText('ТРАССА / COURSE', mx + 6, my + 12);

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
    { icon: '📍', label: tp('Сверяю трек с трассой', 'Matching track to course', 'Sprawdzam tor z trasa') },
    { icon: '🌬', label: tp('Считаю время в мёртвой зоне', 'Counting time in dead zone', 'Licze czas w martwej strefie') },
    { icon: '↺', label: tp('Анализирую повороты и лейлайны', 'Analyzing turns and laylines', 'Analizuje zwroty i lejliny') },
    { icon: '🧭', label: tp('Формулирую советы', 'Drafting advice', 'Formuluje rady') },
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
        <span className="text-sm text-[var(--text-secondary)]">{tp('AI разбирает твою гонку…', 'AI is reviewing your race…', 'AI analizuje twoj wyscig…')}</span>
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
    ctx.fillText('идеал', gMid.x + 6, gMid.y - 4);
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
  }, [idx, total, samples, events, course, current]);

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
            <div className="text-lg font-semibold">{tp('Replay гонки', 'Race replay', 'Replay wyscigu')}</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {tp('Прокрути таймлайн - точки на треке это события: поворот, мёртвая зона, знак.', 'Scrub the timeline - points on the track are events: turn, dead zone, mark.', 'Przewin os czasu - punkty na trasie to zdarzenia: zwrot, martwa strefa, znak.')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Close replay"
          >
            ✕
          </button>
        </div>

        <canvas ref={canvasRef} className="w-full block rounded-lg" style={{ aspectRatio: '2/3', maxHeight: '55vh', background: '#061428' }} />

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><span className="inline-block w-5 h-[2px]" style={{ background: '#00d4ff' }} />{tp('твой трек', 'your track', 'twoj tor')}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-5 h-0 border-t border-dashed" style={{ borderColor: 'rgba(68,255,136,0.7)' }} />{tp('идеальный путь', 'ideal path', 'idealny tor')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ffaa00' }} />{tp('поворот', 'turn', 'zwrot')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ff4444' }} />{tp('мёртвая зона', 'dead zone', 'martwa strefa')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#44ff88' }} />{tp('знак / финиш', 'mark / finish', 'znak / meta')}</span>
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
          <span className="text-[var(--text-muted)]">{tp('Скорость', 'Speed', 'Predkosc')}</span>
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
              ⚠ {activeMistake.titleRu}
            </div>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-1">
              {activeMistake.explanationRu}
            </div>
            <div className="text-xs text-[var(--success)] leading-relaxed">
              💡 {activeMistake.fixRu}
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
    w === 'light' ? tp('слабый', 'light', 'slaby')
    : w === 'heavy' ? tp('сильный', 'heavy', 'silny')
    : tp('средний', 'medium', 'sredni');

  // Mission field pickers - mission titles / descriptions / hints are stored
  // with *Ru/*En/*Pl variants on src/data/missions.ts.
  const mTitle = (m: Mission) => tp(m.titleRu, m.titleEn, m.titlePl);
  const mDesc = (m: Mission) => tp(m.descRu, m.descEn, m.descPl);

  // Difficulty label picker. DIFFICULTY_CONFIG has `label` (RU, legacy
  // name), labelEn, labelPl.
  const difficultyLabel = (d: Difficulty) =>
    tp(DIFFICULTY_CONFIG[d].label, DIFFICULTY_CONFIG[d].labelEn, DIFFICULTY_CONFIG[d].labelPl);

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
    tab === 'learn' ? tp('Начать - Учусь гоняю', 'Start - Learning mode', 'Start - Tryb nauki') :
    tab === 'mission' ? (selectedMission
      ? tp(`К миссии: ${selectedMission.titleRu}`, `To mission: ${selectedMission.titleEn}`, `Do misji: ${selectedMission.titlePl}`)
      : tp('Выбери миссию', 'Pick a mission', 'Wybierz misje')) :
    tp(
      `К брифингу · ${DIFFICULTY_CONFIG[difficulty].label}`,
      `To briefing · ${DIFFICULTY_CONFIG[difficulty].labelEn}`,
      `Do briefingu · ${DIFFICULTY_CONFIG[difficulty].labelPl}`,
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
          {tp('Гонка', 'Race', 'Wyscig')}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {tp('Race · выбери режим', 'Race · pick a mode', 'Race · wybierz tryb')}
        </p>
      </div>

      {/* Three big preset cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <PresetCard
          active={tab === 'learn'}
          onClick={() => setTab('learn')}
          emoji="🎓"
          accent="#44ff88"
          title={tp('Учусь гоняю', 'Learning to race', 'Ucze sie regat')}
          subtitle={tp('Easy + средний ветер', 'Easy + medium wind', 'Latwy + sredni wiatr')}
          desc={tp(
            'Спокойные противники, плавные повороты. Для первого опыта гонки.',
            'Calm opponents, gentle turns. For a first racing experience.',
            'Spokojni rywale, lagodne zwroty. Na pierwsze doswiadczenie regat.',
          )}
        />
        <PresetCard
          active={tab === 'free'}
          onClick={() => setTab('free')}
          emoji="🏁"
          accent="#00d4ff"
          title={tp('Свободная гонка', 'Free race', 'Wolny wyscig')}
          subtitle={tp('Сам выбираешь', 'You choose', 'Ty decydujesz')}
          desc={tp(
            'Сложность, сила ветра, лодка - под тебя. Без конкретной цели.',
            'Difficulty, wind, boat - all yours. No specific objective.',
            'Trudnosc, sila wiatru, lodz - pod ciebie. Bez konkretnego celu.',
          )}
        />
        <PresetCard
          active={tab === 'mission'}
          onClick={() => setTab('mission')}
          emoji="🎯"
          accent="#ffaa00"
          title={tp('Миссия', 'Mission', 'Misja')}
          subtitle={tp('Конкретная задача', 'Specific objective', 'Konkretny cel')}
          desc={tp(
            '4 сценария: чистая гонка, под 90 сек, мин. галсов, слабый ветер.',
            '4 scenarios: clean race, under 90 sec, min tacks, light wind.',
            '4 scenariusze: czysty wyscig, ponizej 90 s, min. halsow, slaby wiatr.',
          )}
        />
      </div>

      {/* Tab-specific controls */}
      {tab === 'mission' && (
        <div className="card p-4 mb-5">
          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ВЫБЕРИ МИССИЮ', 'PICK A MISSION', 'WYBIERZ MISJE')}</div>
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
              <div className="text-[var(--accent-cyan)]">💡 {tp(selectedMission.hintRu, selectedMission.hintEn, selectedMission.hintPl)}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">
                {tp('Автонастройки', 'Auto-settings', 'Autoustawienia')}: {difficultyLabel(selectedMission.difficulty)} · {tp('ветер', 'wind', 'wiatr')} {windLabel(selectedMission.windStrength)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'free' && (
        <div className="card p-4 mb-5 space-y-4">
          {/* Difficulty */}
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СЛОЖНОСТЬ', 'DIFFICULTY', 'TRUDNOSC')}</div>
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
                      <div className="font-semibold" style={{ color: cfg.color }}>{tp(cfg.label, cfg.labelEn, cfg.labelPl)}</div>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{cfg.opponents} {tp('соперников', 'opponents', 'rywali')}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Wind */}
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('СИЛА ВЕТРА', 'WIND STRENGTH', 'SILA WIATRU')}</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'light',  label: tp('Слабый',  'Light',  'Slaby'),  icon: '🌬', desc: '~5 kts'  },
                { id: 'medium', label: tp('Средний', 'Medium', 'Sredni'), icon: '💨', desc: '~10 kts' },
                { id: 'heavy',  label: tp('Сильный', 'Strong', 'Silny'),  icon: '🌪', desc: '~15 kts' },
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
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ЛОДКА', 'BOAT', 'LODZ')}</div>
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
                      <div className="font-semibold text-[var(--text-primary)]">{tp(b.labelRu, b.labelEn, b.labelPl)}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{tp(b.descRu, b.descEn, b.descPl)}</div>
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
          ? tp('Скрыть детали', 'Hide details', 'Ukryj szczegoly')
          : tp('Показать управление и правила трассы', 'Show controls and course rules', 'Pokaz sterowanie i zasady trasy')
        }</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {detailsOpen && (
        <div className="card p-4 mb-5 space-y-4">
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('УПРАВЛЕНИЕ', 'CONTROLS', 'STEROWANIE')}</div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">←</kbd>
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">A</kbd>
                <span className="text-[var(--text-secondary)]">{tp('Влево', 'Left', 'W lewo')}</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">→</kbd>
                <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">D</kbd>
                <span className="text-[var(--text-secondary)]">{tp('Вправо', 'Right', 'W prawo')}</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">{tp('На мобайле - кнопки внизу экрана.', 'On mobile - buttons at the bottom.', 'Na mobilce - przyciski na dole.')}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">{tp('ТРАССА', 'COURSE', 'TRASA')}</div>
            <ol className="text-xs text-[var(--text-secondary)] space-y-1 list-decimal list-inside leading-relaxed">
              <li>{tp('Старт от нижней оранжевой линии (там же финиш).', 'Start from the bottom orange line (that\'s also the finish).', 'Start od dolnej pomaranczowej linii (tam tez meta).')}</li>
              <li>{tp('Идёшь к верхнему знаку галсами - ветер сверху.', 'Go to the windward mark on tacks - wind is from above.', 'Do znaku nawietrznego idziesz halsami - wiatr z gory.')}</li>
              <li>{tp('Огибаешь знак (ближе 30 метров).', 'Round the mark (within 30 m).', 'Okrazasz znak (blizej 30 m).')}</li>
              <li>{tp('Возвращаешься полным курсом и пересекаешь финиш сверху вниз.', 'Run back downwind and cross the finish top to bottom.', 'Wracasz kursem pelnym i przecinasz mete z gory w dol.')}</li>
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
        <text x="108" y="28" fill="#00d4ff" fontSize="11" fontFamily="system-ui">ветер</text>
      </g>
      {/* windward mark */}
      <circle cx="100" cy="60" r="7" fill="#ffaa00" stroke="#fff" strokeWidth="1.5" />
      <text x="112" y="64" fill="#ffaa00" fontSize="10" fontFamily="system-ui">верхний знак</text>
      {/* start/finish line */}
      <line x1="60" y1="220" x2="140" y2="220" stroke="#ffaa00" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="60" cy="220" r="4" fill="#ffaa00" />
      <circle cx="140" cy="220" r="4" fill="#ffaa00" />
      <text x="85" y="240" fill="#ffaa00" fontSize="10" fontFamily="system-ui">старт / финиш</text>
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
        <text x="10" y="250" fill="#00d4ff">-- ходом против ветра (галсы)</text>
        <text x="10" y="260" fill="#44ff88">-- попутно к финишу</text>
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
