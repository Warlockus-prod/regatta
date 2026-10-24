// The Practice list on /radio/symulator (owner, 2026-10-24: fewer tabs, one or
// two screens). The 19 scenarios are grouped by what the learner does on air,
// and each row names the official UKE practical tasks it trains, taken from
// zadania/tasks.ts, so the separate list of 26 tasks is no longer needed to
// find the right exercise.

import { PRACTICAL_TASKS } from '../zadania/tasks';
import type { Bi } from './scenarios';

export type PracticeGroupId = 'distress' | 'urgency' | 'routine' | 'settings';

export interface PracticeGroup {
  id: PracticeGroupId;
  title: Bi;
  /** scenario ids, in the order a learner should meet them */
  scenarios: string[];
}

export const PRACTICE_GROUPS: PracticeGroup[] = [
  {
    id: 'distress',
    title: { pl: 'Alarm - DISTRESS', ru: 'Бедствие - DISTRESS' },
    scenarios: ['fire-mayday', 'mob-mayday', 'false-cancel', 'mayday-relay', 'receive-distress'],
  },
  {
    id: 'urgency',
    title: { pl: 'Pilność i bezpieczeństwo', ru: 'Срочность и безопасность' },
    scenarios: ['engine-panpan', 'panpan-medico', 'securite-hazard'],
  },
  {
    id: 'routine',
    title: { pl: 'Łączność rutynowa', ru: 'Обычная связь' },
    scenarios: ['radio-check', 'routine-marina', 'vts-report', 'routine-ship', 'group-call', 'receive-call', 'dsc-test'],
  },
  {
    id: 'settings',
    title: { pl: 'Ustawienia radia', ru: 'Настройки рации' },
    scenarios: ['scan-memory', 'position-input', 'id-add-lyngby', 'id-delete-lyngby'],
  },
];

/** UKE practical task numbers a scenario lets you demonstrate. */
export function ukeTasksFor(scenarioId: string): number[] {
  return PRACTICAL_TASKS.filter((t) => t.scenario === scenarioId).map((t) => t.n);
}

/** UKE tasks trained by the controls lessons (/radio/obsluga). */
export const CONTROLS_COURSE_TASKS: number[] = PRACTICAL_TASKS
  .filter((t) => t.guide === 'interaktywny-kurs')
  .map((t) => t.n);
