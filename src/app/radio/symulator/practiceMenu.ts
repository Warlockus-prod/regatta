// The Practice list on /radio/symulator (owner, 2026-10-24: fewer tabs, one or
// two screens). The 19 scenarios are grouped by what the learner does on air,
// and each row names the official UKE practical tasks it trains (the numbers of
// zadania/tasks.ts), so the separate list of 26 tasks is no longer needed to
// find the right exercise.

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

// The links of zadania/tasks.ts as bare numbers. Importing PRACTICAL_TASKS for
// them shipped all 26 task texts with the simulator page, a second copy next to
// the one on /radio/zadania. practiceMenu.test.ts compares both tables with
// PRACTICAL_TASKS, so a changed link fails the test until this file follows.

/** UKE practical task number -> the simulator scenario that demonstrates it. */
export const UKE_TASK_SCENARIOS: Readonly<Record<number, string>> = {
  3: 'radio-check',
  6: 'scan-memory',
  7: 'scan-memory',
  8: 'securite-hazard',
  9: 'fire-mayday',
  10: 'mob-mayday',
  11: 'receive-distress',
  12: 'routine-marina',
  13: 'mayday-relay',
  14: 'position-input',
  15: 'id-add-lyngby',
  16: 'id-delete-lyngby',
  17: 'dsc-test',
  18: 'fire-mayday',
  19: 'fire-mayday',
  20: 'panpan-medico',
  21: 'routine-ship',
  22: 'routine-ship',
};

/** UKE practical task numbers a scenario lets you demonstrate. */
export function ukeTasksFor(scenarioId: string): number[] {
  return Object.entries(UKE_TASK_SCENARIOS)
    .filter(([, scenario]) => scenario === scenarioId)
    .map(([n]) => Number(n));
}

/** UKE tasks trained by the controls lessons (/radio/obsluga). */
export const CONTROLS_COURSE_TASKS: number[] = [1, 2, 3, 4, 5];
