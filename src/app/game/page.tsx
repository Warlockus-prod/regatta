'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'menu' | 'countdown' | 'racing' | 'finished';

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
  label: string;
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
  label: string;
  labelEn: string;
  description: string;
  opponents: number;
  aiSpeedMul: number;
  aiSkill: number;
  color: string;
}> = {
  easy: {
    label: 'Лёгкий',
    labelEn: 'Easy',
    description: 'Медленные противники, спокойные повороты. Хорошо для знакомства с управлением.',
    opponents: 2,
    aiSpeedMul: 0.78,
    aiSkill: 0.7,
    color: '#44ff88',
  },
  medium: {
    label: 'Средний',
    labelEn: 'Medium',
    description: 'Соперники держат курс уверенно. Нужна тактика лавировки и точное огибание знаков.',
    opponents: 3,
    aiSpeedMul: 0.92,
    aiSkill: 0.9,
    color: '#ffaa00',
  },
  hard: {
    label: 'Сложный',
    labelEn: 'Hard',
    description: 'Агрессивные соперники идут почти оптимально. Каждая ошибка дорого стоит.',
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

// True wind angle from boat heading. Wind is blowing FROM direction 0 (top) DOWN.
// So from the boat's perspective, the wind comes from direction (0 - heading) = -heading.
// TWA is the angle between the boat's bow and where the wind is coming from.
function calcTWA(heading: number): number {
  // Wind is coming from angle 0 (north in world). Boat heading is where the bow points.
  // Angle between bow direction (heading) and wind source (0°):
  let twa = ((heading - 0 + 540) % 360) - 180; // -180..180
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
      { pos: { x: cx, y: windwardY }, radius: 14, label: 'Верхний знак', type: 'windward', roundSide: 'port' },
      { pos: startLine.a, radius: 10, label: 'Старт/Финиш Л', type: 'start' },
      { pos: startLine.b, radius: 10, label: 'Старт/Финиш П', type: 'start' },
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
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [position, setPosition] = useState<{ rank: number; total: number }>({ rank: 1, total: 1 });
  const [results, setResults] = useState<{ name: string; time: number; color: string; isPlayer: boolean }[]>([]);
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

  // Touch controls state (true while button held)
  const [leftHeld, setLeftHeld] = useState(false);
  const [rightHeld, setRightHeld] = useState(false);

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
  const startRace = useCallback(() => {
    initRace(difficulty);
    setCountdown(3);
    setGameState('countdown');
  }, [difficulty, initRace]);

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown === 0) {
      startTimeRef.current = performance.now();
      lastTimeRef.current = performance.now();
      setGameState('racing');
      return;
    }
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
  // Game loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== 'racing') return;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const course = courseRef.current;
      const boats = boatsRef.current;
      const cfg = DIFFICULTY_CONFIG[difficulty];

      for (const boat of boats) {
        const prevPos = { ...boat.pos };

        // --- Heading update ---
        if (boat.isPlayer) {
          const keyRight = keysRef.current.has('arrowright') || keysRef.current.has('d') || rightHeld;
          const keyLeft = keysRef.current.has('arrowleft') || keysRef.current.has('a') || leftHeld;
          const turnInput = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
          boat.heading = normalizeAngle(boat.heading + turnInput * TURN_RATE * dt);
        } else {
          boat.heading = computeAIHeading(boat, course, dt);
        }

        // --- Speed from sailing physics ---
        const twa = calcTWA(boat.heading);
        const speedMul = boat.isPlayer ? 1.0 : cfg.aiSpeedMul;
        boat.targetSpeed = speedFactorFromTWA(twa) * MAX_SPEED * speedMul;

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

        // --- Wake ---
        if (boat.speed > 0.3) {
          boat.wake.unshift({ ...boat.pos });
          if (boat.wake.length > 30) boat.wake.pop();
        }

        // --- Course progression ---
        if (boat.lapDone === 0) {
          // Check windward mark rounding
          const windwardMark = course.marks[0];
          if (distance(boat.pos, windwardMark.pos) < MARK_ROUND_DIST + windwardMark.radius) {
            boat.lapDone = 1;
            if (boat.isPlayer) {
              const t = (now - startTimeRef.current) / 1000;
              logEventsRef.current.push({ type: 'mark-rounded', t, note: 'windward' });
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
              }
            }
          }
        }
      }

      // --- Race log recording (player only) ---
      const playerBoat = boats.find((b) => b.isPlayer);
      if (playerBoat && playerBoat.lapDone < 2) {
        const t = (now - startTimeRef.current) / 1000;
        if (t - lastSampleTimeRef.current >= 0.5) {
          logSamplesRef.current.push({
            t,
            x: Math.round(playerBoat.pos.x),
            y: Math.round(playerBoat.pos.y),
            heading: Math.round(playerBoat.heading),
            twa: Math.round(calcTWA(playerBoat.heading)),
            speed: Math.round(playerBoat.speed * 10) / 10,
            lap: playerBoat.lapDone,
          });
          lastSampleTimeRef.current = t;
        }
        // No-go zone event
        const pTWA = calcTWA(playerBoat.heading);
        const inNoGo = Math.abs(pTWA) < 30 && playerBoat.speed < 2;
        if (inNoGo && !wasInNoGoRef.current) {
          logEventsRef.current.push({ type: 'no-go-entered', t });
        }
        wasInNoGoRef.current = inNoGo;
        // Tack event (wind side flipped)
        const tackSign = pTWA > 0 ? 1 : -1;
        if (lastTackSignRef.current !== 0 && tackSign !== lastTackSignRef.current && playerBoat.speed > 1) {
          logEventsRef.current.push({ type: 'tack', t, note: tackSign > 0 ? 'to-port-tack' : 'to-starboard-tack' });
        }
        lastTackSignRef.current = tackSign;
      }

      // Update UI state
      const player = boats.find((b) => b.isPlayer)!;
      const playerTwa = calcTWA(player.heading);
      setPlayerTWA(playerTwa);
      setPlayerSpeed(player.speed);
      setElapsed((now - startTimeRef.current) / 1000);

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

      // Check race end: all boats finished OR player finished
      const allFinished = boats.every((b) => b.lapDone === 2);
      const playerFinished = player.lapDone === 2;
      const tooLong = elapsed > 300; // 5 minutes max

      if (allFinished || (playerFinished && elapsed > (player.finishTime ?? 0) + 15) || tooLong) {
        const sorted = [...boats]
          .map((b) => ({ name: b.name, time: b.finishTime ?? Infinity, color: b.color, isPlayer: b.isPlayer }))
          .sort((a, b) => a.time - b.time);
        setResults(sorted);
        setGameState('finished');

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
        };
        setCoachingLoading(true);
        fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.coaching) setCoaching(data.coaching);
            else if (data.fallback) setCoachingError('AI тренер не настроен (нет API ключа)');
            else setCoachingError(data.error || 'Ошибка AI');
          })
          .catch((err) => setCoachingError(err.message || 'Сетевая ошибка'))
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

    // --- No-go zone projected around wind direction (visual aid) ---
    // Wind comes from direction 0 (top), so no-go zone on world is a cone pointing UP from player
    ctx.save();
    const playerScreen = toScreen(player.pos);
    ctx.beginPath();
    ctx.moveTo(playerScreen.x, playerScreen.y);
    const coneLen = 120 * scale;
    const leftA = deg2rad(360 - 30);  // 330° from north
    const rightA = deg2rad(30);
    ctx.lineTo(playerScreen.x + Math.sin(leftA) * coneLen, playerScreen.y - Math.cos(leftA) * coneLen);
    ctx.arc(playerScreen.x, playerScreen.y, coneLen, -Math.PI / 2 - deg2rad(30), -Math.PI / 2 + deg2rad(30));
    ctx.lineTo(playerScreen.x, playerScreen.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,68,68,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,68,68,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
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

    // --- Laylines from windward mark ---
    const windwardScreen = toScreen(course.marks[0].pos);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,68,68,0.25)';
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1;
    const laylen = 400 * scale;
    // Port layline (going down-left at 45° from wind)
    ctx.beginPath();
    ctx.moveTo(windwardScreen.x, windwardScreen.y);
    ctx.lineTo(windwardScreen.x - Math.sin(deg2rad(45)) * laylen, windwardScreen.y + Math.cos(deg2rad(45)) * laylen);
    ctx.stroke();
    // Starboard layline
    ctx.beginPath();
    ctx.moveTo(windwardScreen.x, windwardScreen.y);
    ctx.lineTo(windwardScreen.x + Math.sin(deg2rad(45)) * laylen, windwardScreen.y + Math.cos(deg2rad(45)) * laylen);
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
        ctx.fillText(mark.label, p.x, p.y - mark.radius * scale * 1.8);
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
      drawBoat(ctx, bp.x, bp.y, boat.heading, boat.color, scale, boat.isPlayer);

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
      <div className="page-enter max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3"
              style={{ background: 'linear-gradient(135deg, var(--text-primary), #ff6688)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Гонка
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">Race Game</p>
          <p className="mt-4 max-w-xl mx-auto text-sm text-[var(--text-secondary)]">
            Обогни верхний знак и первым пересеки финишную линию. Управляй яхтой стрелками или A/D.
            Учитывай ветер — нельзя идти прямо против него, нужно лавировать галсами.
          </p>
        </div>

        {/* Difficulty cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
            const cfg = DIFFICULTY_CONFIG[d];
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`card p-5 text-left transition-all ${active ? 'ring-2 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                style={{
                  borderColor: active ? cfg.color : undefined,
                  outlineColor: active ? cfg.color : undefined,
                  boxShadow: active ? `0 4px 24px ${cfg.color}33` : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: cfg.color }} />
                  <div>
                    <div className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{cfg.labelEn}</div>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{cfg.description}</p>
                <div className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                  <div><span className="text-[var(--text-secondary)]">Соперники:</span> {cfg.opponents}</div>
                  <div><span className="text-[var(--text-secondary)]">AI скорость:</span> {Math.round(cfg.aiSpeedMul * 100)}%</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Controls info */}
        <div className="card p-5 mb-6">
          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">УПРАВЛЕНИЕ / CONTROLS</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">←</kbd>
              <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">A</kbd>
              <span className="text-[var(--text-secondary)]">Влево</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">→</kbd>
              <kbd className="px-2 py-1 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono">D</kbd>
              <span className="text-[var(--text-secondary)]">Вправо</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <div className="text-xs text-[var(--text-muted)]">
                Стрелка в углу экрана показывает направление к следующему знаку.
              </div>
            </div>
          </div>
        </div>

        {/* Rules summary */}
        <div className="card p-5 mb-6">
          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-3">ТРАССА / COURSE</div>
          <ol className="text-sm text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
            <li>Старт от нижней оранжевой линии (там же финиш).</li>
            <li>Иди к верхнему знаку (оранжевый буй вверху трассы). Придётся лавировать галсами — ветер дует прямо сверху.</li>
            <li>Обогни верхний знак (подойди ближе 30 метров).</li>
            <li>Возвращайся к финишу полным курсом (бакштаг/фордевинд) — это быстрее.</li>
            <li>Пересеки финишную линию сверху вниз.</li>
          </ol>
        </div>

        <button
          onClick={startRace}
          className="w-full py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.01]"
          style={{
            background: `linear-gradient(135deg, ${DIFFICULTY_CONFIG[difficulty].color}, ${DIFFICULTY_CONFIG[difficulty].color}cc)`,
            color: '#0a1628',
            boxShadow: `0 4px 24px ${DIFFICULTY_CONFIG[difficulty].color}44`,
          }}
        >
          Начать гонку ({DIFFICULTY_CONFIG[difficulty].label})
        </button>
      </div>
    );
  }

  // =====================================================================
  // RACING / COUNTDOWN / FINISHED SCREENS (Canvas)
  // =====================================================================
  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

      {/* HUD — top bar */}
      {gameState === 'racing' && (
        <>
          <div className="absolute top-4 left-4 card p-3 flex flex-col gap-2 min-w-[180px]" style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">КУРС</span>
              <span className="text-xs font-mono" style={{ color: currentPoS.color }}>{currentPoS.nameRu}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">УГОЛ К ВЕТРУ</span>
              <span className="text-xs font-mono font-bold" style={{ color: currentPoS.color }}>{Math.round(Math.abs(playerTWA))}°</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">СКОРОСТЬ</span>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>{playerSpeed.toFixed(1)} kts</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="h-full transition-all" style={{ width: `${(playerSpeed / MAX_SPEED) * 100}%`, background: currentPoS.color }} />
            </div>
          </div>

          <div className="absolute top-4 right-4 card p-3 flex flex-col gap-1.5 items-end" style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}>
            <div className="text-xs text-[var(--text-muted)]">ПОЗИЦИЯ</div>
            <div className="text-2xl font-bold" style={{ color: position.rank === 1 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {position.rank} <span className="text-xs text-[var(--text-muted)]">/ {position.total}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">ВРЕМЯ</div>
            <div className="text-sm font-mono text-[var(--text-primary)]">{formatTime(elapsed)}</div>
          </div>

          {/* Mark progress indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 card px-4 py-2 text-xs" style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}>
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 0 && '→ Идём к верхнему знаку (лавируй!)'}
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 1 && '→ Идём на финиш (полный курс)'}
            {boatsRef.current.find((b) => b.isPlayer)?.lapDone === 2 && '✓ Финиш!'}
          </div>

          <button
            onClick={backToMenu}
            className="absolute top-1/2 right-4 -translate-y-1/2 px-3 py-2 card text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition md:top-auto md:bottom-4 md:translate-y-0"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(21, 37, 64, 0.85)' }}
          >
            ← Меню
          </button>

          {/* Touch controls (visible on touch devices / always shown for accessibility) */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-between items-end px-4 pointer-events-none md:hidden">
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
              {countdown === 0 ? 'СТАРТ!' : countdown}
            </div>
            <div className="text-[var(--text-secondary)]">Приготовься к старту...</div>
          </div>
        </div>
      )}

      {/* Finish overlay */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="card p-6 sm:p-8 max-w-lg w-full my-4">
            <div className="text-center mb-5">
              <div className="text-sm text-[var(--text-muted)] mb-2">РЕЗУЛЬТАТ</div>
              {playerFinished?.time !== undefined && playerFinished.time !== Infinity ? (
                <>
                  <div className="text-5xl font-bold mb-2" style={{
                    color: playerRank === 1 ? 'var(--warning)' : playerRank <= 3 ? 'var(--success)' : 'var(--text-primary)',
                  }}>
                    {playerRank}
                    <span className="text-2xl text-[var(--text-muted)]"> из {results.length}</span>
                  </div>
                  <div className="text-xl font-mono text-[var(--text-secondary)]">{formatTime(playerFinished.time)}</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold mb-2" style={{ color: 'var(--danger)' }}>Не финишировал</div>
                  <div className="text-sm text-[var(--text-secondary)]">Время вышло</div>
                </>
              )}
            </div>

            {/* Leaderboard */}
            <div className="mb-5 space-y-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded"
                  style={{
                    background: r.isPlayer ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    border: r.isPlayer ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono w-5" style={{ color: i === 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {i + 1}.
                    </span>
                    <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    <span className={`text-sm ${r.isPlayer ? 'font-semibold' : ''}`}>{r.name}</span>
                  </div>
                  <span className="text-sm font-mono text-[var(--text-secondary)]">
                    {r.time === Infinity ? 'DNF' : formatTime(r.time)}
                  </span>
                </div>
              ))}
            </div>

            {/* AI Coach */}
            <div className="mb-5 p-4 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🧭</span>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>AI-тренер</div>
              </div>
              {coachingLoading && (
                <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full pulse-gentle" style={{ background: 'var(--accent-cyan)' }} />
                  Анализирую гонку...
                </div>
              )}
              {coachingError && !coaching && (
                <div className="text-xs text-[var(--text-muted)] italic">{coachingError}</div>
              )}
              {coaching && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Оценка</div>
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
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Ошибки</div>
                      <div className="space-y-2">
                        {coaching.mistakes.map((m, i) => (
                          <div key={i} className="text-xs p-2 rounded" style={{ background: 'rgba(10, 22, 40, 0.5)' }}>
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                                background: m.severity === 'major' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 170, 0, 0.2)',
                                color: m.severity === 'major' ? 'var(--danger)' : 'var(--warning)',
                              }}>
                                {formatTime(m.timeStart)}–{formatTime(m.timeEnd)}
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
                      <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Сильные стороны</div>
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
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Цель на следующую гонку</div>
                    <p className="text-xs text-[var(--accent-cyan)]">{coaching.nextGoalRu}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={backToMenu}
                className="flex-1 py-2 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition"
              >
                Меню
              </button>
              <button
                onClick={startRace}
                className="flex-1 py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: `linear-gradient(135deg, ${DIFFICULTY_CONFIG[difficulty].color}, ${DIFFICULTY_CONFIG[difficulty].color}cc)`,
                  color: '#0a1628',
                }}
              >
                Ещё раз
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DRAWING HELPERS
// ============================================================================

function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, color: string, scale: number, isPlayer: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(deg2rad(heading));
  const s = scale * (isPlayer ? 1.15 : 1.0);

  // Hull shadow
  ctx.save();
  ctx.translate(1, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.moveTo(0, -14 * s);
  ctx.quadraticCurveTo(7 * s, 0, 4.5 * s, 12 * s);
  ctx.lineTo(-4.5 * s, 12 * s);
  ctx.quadraticCurveTo(-7 * s, 0, 0, -14 * s);
  ctx.fill();
  ctx.restore();

  // Hull
  const hullGrad = ctx.createLinearGradient(-7 * s, 0, 7 * s, 0);
  hullGrad.addColorStop(0, isPlayer ? '#cfe7f4' : '#aaaaaa');
  hullGrad.addColorStop(0.5, '#ffffff');
  hullGrad.addColorStop(1, isPlayer ? '#8fb4c9' : '#666666');
  ctx.fillStyle = hullGrad;
  ctx.strokeStyle = isPlayer ? '#ffffff' : '#555555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -14 * s);
  ctx.quadraticCurveTo(7 * s, 0, 4.5 * s, 12 * s);
  ctx.lineTo(-4.5 * s, 12 * s);
  ctx.quadraticCurveTo(-7 * s, 0, 0, -14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

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

  // Sail — angle it based on TWA
  const twa = calcTWA(heading);
  // Sail angle from centerline based on TWA (automatic trim)
  let sailAngleFromCenterline = 0;
  const absTWA = Math.abs(twa);
  if (absTWA < 30) sailAngleFromCenterline = 0;
  else if (absTWA < 45) sailAngleFromCenterline = 12;
  else if (absTWA < 90) sailAngleFromCenterline = 30;
  else if (absTWA < 140) sailAngleFromCenterline = 55;
  else sailAngleFromCenterline = 75;
  // Sail goes to the opposite side of wind
  const sailSide = twa > 0 ? -1 : 1; // wind from starboard → sail on port
  const sailA = deg2rad(sailAngleFromCenterline * sailSide);

  ctx.save();
  ctx.rotate(sailA);
  // Sail as curved shape
  ctx.fillStyle = absTWA < 30 ? 'rgba(255,255,255,0.3)' : color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -3 * s);
  ctx.quadraticCurveTo(2 * s * sailSide, 3 * s, 0.5 * s * sailSide, 9 * s);
  ctx.lineTo(0, 9 * s);
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

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds * 10) % 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

function getPointOfSailName(twa: number): { nameRu: string; color: string } {
  const a = Math.abs(twa);
  if (a < 30) return { nameRu: 'Левентик', color: '#ff4444' };
  if (a < 60) return { nameRu: 'Бейдевинд', color: '#ff8844' };
  if (a < 110) return { nameRu: 'Галфвинд', color: '#44ff88' };
  if (a < 160) return { nameRu: 'Бакштаг', color: '#44aaff' };
  return { nameRu: 'Фордевинд', color: '#8844ff' };
}
