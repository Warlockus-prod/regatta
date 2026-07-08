// ============================================================================
// Personalized error analysis: combine the localStorage progress with the bank
// to find weak categories, stubborn questions and a concrete study plan.
// Pure client util (imports the bank data, no React).
// ============================================================================

import {
  STERNIK_BANK,
  STERNIK_CATEGORIES,
  STERNIK_CATEGORY_BY_ID,
  type SternikCategory,
  type SternikCatId,
} from '@/data/sternik';
import type { SternikProgress } from '@/lib/sternik-progress';

export type CatLevel = 'critical' | 'weak' | 'ok' | 'strong' | 'untouched';

export interface CatAnalysis {
  cat: SternikCategory;
  total: number;
  seen: number;
  correct: number;
  wrong: number;
  mastered: number;
  accuracy: number; // 0..1 over answered questions
  level: CatLevel;
}

export interface StubbornQuestion {
  id: string;
  cat: SternikCatId;
  q: string;
  correctText: string;
  wrong: number;
}

export interface SternikAnalysis {
  answered: number;
  correct: number;
  accuracy: number; // overall
  categories: CatAnalysis[]; // all 11, sorted worst-need first
  weakest: CatAnalysis[]; // categories that need work (critical/weak), worst first
  stubborn: StubbornQuestion[]; // questions missed repeatedly
  weakIdCount: number;
  ready: boolean; // enough right across categories to feel exam-ready
}

const PASS = 0.87; // exam threshold

function levelFor(seen: number, accuracy: number): CatLevel {
  if (seen < 3) return 'untouched';
  if (accuracy < 0.6) return 'critical';
  if (accuracy < 0.8) return 'weak';
  if (accuracy < 0.95) return 'ok';
  return 'strong';
}

// Rank so the most-worth-fixing categories come first: unfinished + low accuracy
// + many wrong answers float up; untouched go last, strong go near the end.
function needScore(c: CatAnalysis): number {
  if (c.level === 'untouched') return -1; // shown separately / last
  const gap = Math.max(0, PASS - c.accuracy); // how far below pass
  return gap * 100 + c.wrong * 2;
}

export function analyzeSternik(p: SternikProgress): SternikAnalysis {
  const byCat = new Map<SternikCatId, CatAnalysis>();
  for (const cat of STERNIK_CATEGORIES) {
    byCat.set(cat.id, {
      cat,
      total: 0, seen: 0, correct: 0, wrong: 0, mastered: 0,
      accuracy: 0, level: 'untouched',
    });
  }
  for (const q of STERNIK_BANK) {
    const a = byCat.get(q.cat)!;
    a.total += 1;
    const s = p.q[q.id];
    if (s && s.seen > 0) {
      a.seen += 1;
      a.correct += s.lastCorrect ? 1 : 0; // "current" mastery snapshot
      if (s.streak >= 2) a.mastered += 1;
      if (s.wrong > 0 && s.streak < 2) a.wrong += 1;
    }
  }
  // accuracy uses the raw answer tallies for a truer picture
  const catAccRaw = new Map<SternikCatId, { c: number; t: number }>();
  for (const q of STERNIK_BANK) {
    const s = p.q[q.id];
    if (s && s.seen > 0) {
      const r = catAccRaw.get(q.cat) ?? { c: 0, t: 0 };
      r.c += s.correct;
      r.t += s.seen;
      catAccRaw.set(q.cat, r);
    }
  }
  for (const a of byCat.values()) {
    const raw = catAccRaw.get(a.cat.id);
    a.accuracy = raw && raw.t > 0 ? raw.c / raw.t : 0;
    a.level = levelFor(a.seen, a.accuracy);
  }

  const categories = [...byCat.values()].sort((x, y) => needScore(y) - needScore(x));
  const weakest = categories.filter((c) => c.level === 'critical' || c.level === 'weak');

  // stubborn: questions with 2+ wrong answers, not yet healed
  const stubborn: StubbornQuestion[] = [];
  for (const q of STERNIK_BANK) {
    const s = p.q[q.id];
    if (s && s.wrong >= 2 && s.streak < 2) {
      stubborn.push({ id: q.id, cat: q.cat, q: q.q, correctText: q.options[q.correct], wrong: s.wrong });
    }
  }
  stubborn.sort((a, b) => b.wrong - a.wrong);

  const overall = { c: 0, t: 0 };
  for (const r of catAccRaw.values()) { overall.c += r.c; overall.t += r.t; }
  const accuracy = overall.t > 0 ? overall.c / overall.t : 0;

  // "ready" heuristic: answered a good share, no critical categories, overall >= pass
  const touchedCats = categories.filter((c) => c.level !== 'untouched').length;
  const ready = accuracy >= PASS && weakest.filter((c) => c.level === 'critical').length === 0 && touchedCats >= 8;

  return {
    answered: overall.t,
    correct: overall.c,
    accuracy,
    categories,
    weakest,
    stubborn: stubborn.slice(0, 8),
    weakIdCount: Object.values(p.q).filter((s) => s.wrong > 0 && s.streak < 2).length,
    ready,
  };
}

/** teoria section anchor per category, for "read the theory" links. */
export const CAT_THEORY_ANCHOR: Record<SternikCatId, string> = {
  przepisy: 'przepisy', sygnaly: 'sygnaly', znaki: 'znaki', budowa: 'budowa',
  silniki: 'silniki', manewry: 'manewry', locja: 'locja', meteo: 'meteo',
  ratownictwo: 'ratownictwo', srodowisko: 'srodowisko', prawo: 'patent',
};

/** Build a compact context block for the AI tutor from the analysis. */
export function buildTutorContext(a: SternikAnalysis, lang: 'pl' | 'ru' | 'both'): string {
  const weak = a.weakest.slice(0, 4).map((c) => `${c.cat.pl} (${c.cat.ru}): ${Math.round(c.accuracy * 100)}%`).join('; ');
  const misses = a.stubborn.slice(0, 5).map((s) => {
    const cat = STERNIK_CATEGORY_BY_ID[s.cat];
    return `- [${cat.pl}] ${s.q} -> poprawna: ${s.correctText}`;
  }).join('\n');
  return [
    `Wynik uczacego sie: ${Math.round(a.accuracy * 100)}% (${a.correct}/${a.answered}).`,
    weak ? `Najslabsze tematy: ${weak}.` : '',
    misses ? `Pytania powtarzalnie mylone:\n${misses}` : '',
    `Jezyk wyjasnien: ${lang === 'pl' ? 'polski' : lang === 'ru' ? 'rosyjski' : 'polski i rosyjski'}.`,
  ].filter(Boolean).join('\n');
}
