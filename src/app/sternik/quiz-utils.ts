// Shared helpers for the sternik trainer and mock-exam pages.

import type { SternikQuestion } from '@/data/sternik';

export interface PreparedOption {
  text: string;
  ok: boolean;
}

export interface PreparedQuestion {
  id: string;
  cat: SternikQuestion['cat'];
  q: string;
  options: PreparedOption[];
  whyRu: string;
  whyPl?: string;
  figure?: SternikQuestion['figure'];
  photo?: SternikQuestion['photo'];
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle answer options while remembering which one is correct. */
export function prepareQuestion(q: SternikQuestion): PreparedQuestion {
  const options = shuffled(q.options.map((text, i) => ({ text, ok: i === q.correct })));
  return { id: q.id, cat: q.cat, q: q.q, options, whyRu: q.whyRu, whyPl: q.whyPl, figure: q.figure, photo: q.photo };
}

/** mm:ss or h:mm:ss for countdowns and timers. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
