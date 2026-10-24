import { describe, expect, it } from 'vitest';
import { SCENARIOS } from './scenarios';
import { CONTROLS_COURSE_TASKS, PRACTICE_GROUPS, ukeTasksFor } from './practiceMenu';
import { PRACTICAL_TASKS } from '../zadania/tasks';

describe('Practice list', () => {
  it('lists every scenario exactly once and nothing that does not exist', () => {
    const listed = PRACTICE_GROUPS.flatMap((g) => g.scenarios);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(SCENARIOS.map((s) => s.id).sort());
  });

  it('names the UKE tasks a scenario trains, from the task list', () => {
    expect(ukeTasksFor('fire-mayday')).toEqual([9, 18, 19]);
    expect(ukeTasksFor('engine-panpan')).toEqual([]);
    expect(CONTROLS_COURSE_TASKS).toEqual([1, 2, 3, 4, 5]);
  });

  it('leaves no UKE task with a simulator scenario unreachable from the list', () => {
    const listed = new Set(PRACTICE_GROUPS.flatMap((g) => g.scenarios));
    for (const t of PRACTICAL_TASKS) if (t.scenario) expect(listed.has(t.scenario)).toBe(true);
  });
});
