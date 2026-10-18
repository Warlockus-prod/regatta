import type { AnalyticsProps } from './events';

/**
 * Funnel events relayed from embedded web pages over postMessage.
 *
 * The sternik and SRC mock exams run as web pages inside WebViews
 * (SectionWebView, OfflineRadioCourse). When an exam ends the page posts
 * { type: 'exam-finished', base, score, total, passed } (src/lib/funnel.ts on
 * the web side). The message comes from page script, so it is validated here
 * field by field before anything reaches analytics.
 */
export interface ExamFinishedProps extends AnalyticsProps {
  base: 'sternik' | 'src';
  score: number;
  total: number;
  passed: boolean;
}

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Parse a WebView message; returns the exam result or null if it is not one. */
export function parseExamFinished(data: string): ExamFinishedProps | null {
  let msg: unknown;
  try {
    msg = JSON.parse(data);
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object') return null;
  const m = msg as Record<string, unknown>;
  if (m.type !== 'exam-finished') return null;
  if (m.base !== 'sternik' && m.base !== 'src') return null;
  if (!isInt(m.total, 1, 1000) || !isInt(m.score, 0, m.total)) return null;
  if (typeof m.passed !== 'boolean') return null;
  return { base: m.base, score: m.score, total: m.total, passed: m.passed };
}
