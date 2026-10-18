import { describe, expect, it } from 'vitest';
import { STERNIK_BANK } from './sternik';
import { SRC_BANK } from './src-radio';
import { THEORY_CHAPTERS } from '@/app/radio/teoria/courseData';
import { SUPPLEMENTAL_THEORY_CHAPTERS } from '@/app/radio/teoria/courseSupplement';
import { SCENARIOS } from '@/app/radio/symulator/scenarios';
import { INSPECT } from '@/app/radio/symulator/inspectData';
import { LESSON_TEXT } from '@/app/radio/obsluga/lessonData';
import { PRACTICAL_TASKS } from '@/app/radio/zadania/tasks';
import { DIALOGUES } from '@/app/radio/rozmowa/dialogues';
import { POSITIONS, POS_RULES_PL } from '@/app/radio/pozycja/drillData';
import { ORAL_PROMPTS } from '@/app/sternik/ustny/oralPrompts';

// AGENTS.md hard rule 2 (2026-09-27): Polish is written with full diacritics.
// The sternik and SRC radio sections were written under the old ASCII-only
// rule and restored on 2026-10-18. These stripped spellings are never valid
// Polish words, so finding one means a string slipped back to the old style.
// Russian and English text cannot contain them, so whole objects are scanned.
// Letter boundaries are Unicode-aware: a plain \b would split "sieć" after "sie".
const STRIPPED =
  /(?<!\p{L})(sie|moze|mozna|ktory|ktora|ktore|ktorych|ktorym|byc|nalezy|predkosc|lodz|jesli|wiecej|takze|rowniez|miedzy|swiatlo|swiatla|wlacz|wylacz|kanal|sygnal|glosem|pytan|bledy|bledow|zrodel|probny|niz|wiec|juz|tez|sa)(?!\p{L})/iu;

function hits(label: string, value: unknown): string[] {
  const text = JSON.stringify(value) ?? '';
  const out: string[] = [];
  for (const m of text.matchAll(new RegExp(STRIPPED.source, 'giu'))) {
    out.push(`${label}: "${text.slice(Math.max(0, m.index - 30), m.index + 30)}"`);
  }
  return out;
}

describe('Polish text is written with diacritics', () => {
  it('sternik bank: questions, options and Polish explanations', () => {
    const bad = STERNIK_BANK.flatMap((q) => hits(q.id, [q.q, q.options, q.whyPl]));
    expect(bad).toEqual([]);
  });

  it('SRC bank: Polish explanations', () => {
    const bad = SRC_BANK.flatMap((q) => hits(q.id, q.whyPl));
    expect(bad).toEqual([]);
  });

  it('radio course data', () => {
    const bad = [
      ...hits('theory', THEORY_CHAPTERS),
      ...hits('supplement', SUPPLEMENTAL_THEORY_CHAPTERS),
      ...hits('scenarios', SCENARIOS),
      ...hits('inspect', INSPECT),
      ...hits('lessons', LESSON_TEXT),
      ...hits('tasks', PRACTICAL_TASKS),
      ...hits('dialogues', DIALOGUES),
      ...hits('positions', [POSITIONS, POS_RULES_PL]),
      ...hits('oral', ORAL_PROMPTS),
    ];
    expect(bad).toEqual([]);
  });
});
