// ============================================================================
// Sternik exam prep - progress persistence (localStorage, client only).
// Tracks per-question history, practice sessions and mock-exam attempts.
// All reads are guarded so the module is safe to import from RSC trees.
// ============================================================================

export interface SternikQuestionStat {
  seen: number;
  correct: number;
  wrong: number;
  /** Consecutive correct answers; resets to 0 on a wrong answer. */
  streak: number;
  lastTs: number;
  lastCorrect: boolean;
}

export interface SternikExamAttempt {
  ts: number;
  correct: number;
  total: number;
  passed: boolean;
  /** Active exam time in seconds (pauses excluded). */
  durationSec: number;
  wrongIds: string[];
  /** True when the attempt ended because the clock ran out. */
  timedOut?: boolean;
}

export interface SternikProgress {
  v: 1;
  q: Record<string, SternikQuestionStat>;
  exams: SternikExamAttempt[];
  totalAnswered: number;
  totalCorrect: number;
  /** Accumulated practice-mode active seconds. */
  practiceSec: number;
}

const KEY = 'sternik.progress.v1';

const EMPTY: SternikProgress = {
  v: 1,
  q: {},
  exams: [],
  totalAnswered: 0,
  totalCorrect: 0,
  practiceSec: 0,
};

export function loadSternikProgress(): SternikProgress {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, q: {}, exams: [] };
    const parsed = JSON.parse(raw) as SternikProgress;
    if (!parsed || parsed.v !== 1 || typeof parsed.q !== 'object') {
      return { ...EMPTY, q: {}, exams: [] };
    }
    return {
      ...EMPTY,
      ...parsed,
      q: parsed.q ?? {},
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
    };
  } catch {
    return { ...EMPTY, q: {}, exams: [] };
  }
}

function save(p: SternikProgress) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage full / privacy mode - stats are a nice-to-have, never crash
  }
}

/** Record a single answered question (practice or exam review). */
export function recordSternikAnswer(id: string, correct: boolean): SternikProgress {
  const p = loadSternikProgress();
  const stat: SternikQuestionStat = p.q[id] ?? {
    seen: 0, correct: 0, wrong: 0, streak: 0, lastTs: 0, lastCorrect: false,
  };
  stat.seen += 1;
  if (correct) {
    stat.correct += 1;
    stat.streak += 1;
  } else {
    stat.wrong += 1;
    stat.streak = 0;
  }
  stat.lastTs = Date.now();
  stat.lastCorrect = correct;
  p.q[id] = stat;
  p.totalAnswered += 1;
  if (correct) p.totalCorrect += 1;
  save(p);
  return p;
}

export function addSternikPracticeTime(seconds: number) {
  if (seconds <= 0) return;
  const p = loadSternikProgress();
  p.practiceSec += Math.round(seconds);
  save(p);
}

export function recordSternikExam(attempt: SternikExamAttempt): SternikProgress {
  const p = loadSternikProgress();
  p.exams.push(attempt);
  // keep the last 50 attempts - enough history, bounded storage
  if (p.exams.length > 50) p.exams = p.exams.slice(-50);
  save(p);
  return p;
}

/**
 * Question ids worth repeating: ever answered wrong and not yet "healed"
 * (needs a streak of 2+ correct answers to leave the list).
 */
export function sternikWeakIds(p: SternikProgress): string[] {
  return Object.entries(p.q)
    .filter(([, s]) => s.wrong > 0 && s.streak < 2)
    .map(([id]) => id);
}

/** Ids never answered yet, given the full bank id list. */
export function sternikUnseenIds(p: SternikProgress, allIds: string[]): string[] {
  return allIds.filter((id) => !p.q[id]);
}

export function resetSternikProgress() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
