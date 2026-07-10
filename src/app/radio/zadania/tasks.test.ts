import { describe, it, expect } from 'vitest';
import { PRACTICAL_TASKS, GROUP_LABEL } from './tasks';
import { SCENARIOS } from '../symulator/scenarios';

describe('UKE 26 practical tasks', () => {
  it('lists exactly 26 tasks numbered 1..26', () => {
    expect(PRACTICAL_TASKS.length).toBe(26);
    expect(PRACTICAL_TASKS.map((t) => t.n)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
  });

  it('every task has a PL+RU procedure and a known group', () => {
    for (const t of PRACTICAL_TASKS) {
      expect(t.how.pl.length).toBeGreaterThan(10);
      expect(t.how.ru.length).toBeGreaterThan(10);
      expect(GROUP_LABEL[t.group]).toBeTruthy();
    }
  });

  it('every scenario link points to a real simulator scenario', () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    for (const t of PRACTICAL_TASKS) {
      if (t.scenario) expect(ids.has(t.scenario)).toBe(true);
    }
  });

  it('all four task groups are represented', () => {
    const groups = new Set(PRACTICAL_TASKS.map((t) => t.group));
    expect(groups).toEqual(new Set(['device', 'voice', 'dsc', 'epirb-sart']));
  });
});
