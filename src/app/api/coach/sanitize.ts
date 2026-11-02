// Input normalization for /api/coach. Every field that reaches the prompt is
// coerced here: numbers become finite numbers, enums become enums, free text
// is clipped. After this the prompt builder cannot throw (no `toFixed` on a
// string) and a body cannot smuggle long text into the model through a
// numeric field.

export type CoachDifficulty = 'easy' | 'medium' | 'hard' | 'unknown';

export interface LogEvent {
  type: string;
  t: number;
  note?: string;
}

export interface LogSample {
  t: number;
  x: number;
  y: number;
  heading: number;
  twa: number;
  speed: number;
  lap: number;
}

export interface RaceLog {
  difficulty: CoachDifficulty;
  courseInfo: { windDirection: number; windwardMark: { x: number; y: number }; startY: number };
  finishTime: number | null;
  position: number;
  totalBoats: number;
  samples: LogSample[];
  events: LogEvent[];
  /**
   * Language for coaching output. All seven (ru/en/pl/es/fr/de/it) have
   * native system prompts since 2026-04-25. Unknown values fall back to
   * the English prompt.
   */
  lang?: string;
  /** The race's best course to windward (package 7, fallback-coach.ts):
   * kept only when all three numbers are plausible. */
  upwindTarget?: { twa: number; speedKn: number; vmgKn: number };
}

export const MAX_SAMPLES = 4000;
export const MAX_EVENTS = 200;
export const MAX_EVENT_TYPE_LEN = 24;
export const MAX_EVENT_NOTE_LEN = 80;
const MAX_BOATS = 100;
const MAX_RACE_SEC = 24 * 60 * 60;
const MAX_COORD = 1e6;

export type SanitizeResult =
  | { ok: true; log: RaceLog }
  | { ok: false; status: 400 | 413; reason: string };

function num(v: unknown, min: number, max: number, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

function int(v: unknown, min: number, max: number): number {
  return Math.round(num(v, min, max, 0));
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function sanitizeRaceLog(raw: unknown): SanitizeResult {
  const body = obj(raw);
  if (!raw || typeof raw !== 'object' || !Array.isArray(body.samples) || !body.courseInfo || typeof body.courseInfo !== 'object') {
    return { ok: false, status: 400, reason: 'bad-shape' };
  }
  const events = Array.isArray(body.events) ? body.events : [];
  if (body.samples.length > MAX_SAMPLES || events.length > MAX_EVENTS) {
    return { ok: false, status: 413, reason: 'too-large' };
  }

  const ci = obj(body.courseInfo);
  const mark = obj(ci.windwardMark);
  const difficulty: CoachDifficulty =
    body.difficulty === 'easy' || body.difficulty === 'medium' || body.difficulty === 'hard'
      ? body.difficulty
      : 'unknown';
  const finishTime =
    typeof body.finishTime === 'number' && Number.isFinite(body.finishTime) && body.finishTime > 0 && body.finishTime <= MAX_RACE_SEC
      ? body.finishTime
      : null;

  const log: RaceLog = {
    difficulty,
    courseInfo: {
      windDirection: num(ci.windDirection, -360, 360),
      windwardMark: { x: num(mark.x, -MAX_COORD, MAX_COORD), y: num(mark.y, -MAX_COORD, MAX_COORD) },
      startY: num(ci.startY, -MAX_COORD, MAX_COORD),
    },
    finishTime,
    position: int(body.position, 0, MAX_BOATS),
    totalBoats: int(body.totalBoats, 0, MAX_BOATS),
    samples: body.samples.map((s) => {
      const r = obj(s);
      return {
        t: num(r.t, 0, MAX_RACE_SEC),
        x: num(r.x, -MAX_COORD, MAX_COORD),
        y: num(r.y, -MAX_COORD, MAX_COORD),
        heading: num(r.heading, -720, 720),
        twa: num(r.twa, -360, 360),
        speed: num(r.speed, 0, 1000),
        lap: int(r.lap, 0, 100),
      };
    }),
    events: events.map((e) => {
      const r = obj(e);
      return {
        type: (typeof r.type === 'string' ? r.type : 'unknown').replace(/[^a-z-]/gi, '').slice(0, MAX_EVENT_TYPE_LEN) || 'unknown',
        t: num(r.t, 0, MAX_RACE_SEC),
        note: typeof r.note === 'string' ? r.note.slice(0, MAX_EVENT_NOTE_LEN) : undefined,
      };
    }),
    lang: typeof body.lang === 'string' ? body.lang : undefined,
  };
  const up = obj(body.upwindTarget);
  if ([up.twa, up.speedKn, up.vmgKn].every((v) => typeof v === 'number' && Number.isFinite(v))
    && (up.twa as number) > 0 && (up.twa as number) < 90 && (up.speedKn as number) > 0 && (up.speedKn as number) < 50
    && (up.vmgKn as number) > 0 && (up.vmgKn as number) <= (up.speedKn as number)) {
    log.upwindTarget = { twa: up.twa as number, speedKn: up.speedKn as number, vmgKn: up.vmgKn as number };
  }
  return { ok: true, log };
}
