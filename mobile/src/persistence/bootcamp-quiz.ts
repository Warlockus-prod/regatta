/**
 * Bootcamp quiz results: persists the latest score per lesson, in
 * AsyncStorage. Mirrors the shape of `useBootcampProgress` so consumers
 * can compose both without surprises.
 *
 * Storage shape:
 *   key   = `regatta.bootcamp-quiz.v1`
 *   value = JSON-encoded `{ [lessonId]: QuizResult }`
 *           where QuizResult = { score: number, total: number, answeredAt: number }
 *
 * Each `recordResult(lessonId, score, total)` overwrites the previous
 * entry for that lesson (one current-best result per lesson is enough
 * for v1; history can be layered later if needed).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'regatta.bootcamp-quiz.v1';

export interface QuizResult {
  /** Number of correctly answered questions. */
  score: number;
  /** Number of questions in the quiz when it was taken. */
  total: number;
  /** Unix epoch millis of the most recent attempt. */
  answeredAt: number;
}

export type QuizResultsMap = Record<string, QuizResult>;

function isQuizResult(x: unknown): x is QuizResult {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.score === 'number' &&
    typeof o.total === 'number' &&
    typeof o.answeredAt === 'number'
  );
}

async function readResults(): Promise<QuizResultsMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const out: QuizResultsMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && isQuizResult(v)) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function writeResults(results: QuizResultsMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    /* ignore - keep in-memory state */
  }
}

export interface BootcampQuizState {
  /** Recorded results, keyed by lesson id. Empty until hydration completes. */
  results: QuizResultsMap;
  /** True after the first hydration pass (storage read finished). */
  ready: boolean;
  /**
   * Record a freshly finished quiz. `answeredAt` is set automatically
   * to `Date.now()`. Idempotent in shape (overwrites the previous entry
   * for the same lesson with the new score).
   */
  recordResult: (lessonId: string, score: number, total: number) => void;
}

/**
 * Hook for the bootcamp quiz results map. Same hydration / write-through
 * pattern as `useBootcampProgress`; safe to mount alongside it.
 */
export function useBootcampQuiz(): BootcampQuizState {
  const [results, setResults] = useState<QuizResultsMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readResults().then((map) => {
      if (cancelled) return;
      setResults(map);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordResult = useCallback(
    (lessonId: string, score: number, total: number) => {
      setResults((prev) => {
        const next: QuizResultsMap = {
          ...prev,
          [lessonId]: {
            score,
            total,
            answeredAt: Date.now(),
          },
        };
        void writeResults(next);
        return next;
      });
    },
    [],
  );

  return useMemo(
    () => ({ results, ready, recordResult }),
    [results, ready, recordResult],
  );
}
