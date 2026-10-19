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
import { VOICE_KINDS, gradeVoiceTransmission } from '@/app/api/radio-voice/voiceGrading';
import { POSITION_POOL, VESSEL_POOL } from '@/app/radio/symulator/radioModel';

// AGENTS.md hard rule 2 (2026-09-27): Polish is written with full diacritics.
// The sternik and SRC radio sections were written under the old ASCII-only
// rule and restored on 2026-10-18. These stripped spellings are never valid
// Polish words, so finding one means a string slipped back to the old style.
// Russian and English text cannot contain them, so whole objects are scanned.
// Letter boundaries are Unicode-aware: a plain \b would split "sieć" after "sie".
const STRIPPED =
  /(?<!\p{L})(sie|moze|mozna|ktory|ktora|ktore|ktorych|ktorym|byc|nalezy|predkosc|lodz|jesli|wiecej|takze|rowniez|miedzy|swiatlo|swiatla|wlacz|wylacz|kanal|sygnal|glosem|pytan|bledy|bledow|zrodel|probny|niz|wiec|juz|tez|sa|krazeniowo|doroslego)(?!\p{L})/iu;

// The voice-grading checklist labels: short phrases of their own, so they get
// their own list (every entry here is a stripped spelling seen in those labels).
const STRIPPED_LABEL =
  /(?<!\p{L})(koncu|kolejnosc|czlowiek|burta|prosba|zagrozeni\p{L}*|dokladn\p{L}*|wywol\p{L}*|niebezpieczenstw\p{L}*|gdanska|porade|osob|wokol|tresc|wejscie|wyjscie|postoj|odwolanie|ostrzezenie)(?!\p{L})/iu;

/** Fold Polish to ASCII the way a stripped spelling looks. */
const fold = (s: string) => s.replace(/ł/g, 'l').replace(/Ł/g, 'L').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const isAscii = (w: string) => /^[A-Za-z]+$/.test(w);
const LATIN_WORD = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+/g;

// Polish words a Russian explanation quotes in the dictionary (nominative) form,
// which is spelled without diacritics, while the question text only holds an
// inflected form that has one ("gaśnica pianowa" vs "gaśnicą pianową"). These
// are correct as written; anything else that folds onto a word of the same
// question is a stripped spelling.
const VALID_ASCII_IN_RU = new Set([
  'asekuracyjna', 'burta', 'czarna', 'czerwona', 'dzienna', 'echosonda', 'gazowa',
  'kula', 'lewa', 'morska', 'olejowa', 'pianowa', 'pionowa', 'prawa', 'proszkowa',
  'rana', 'ratunkowa', 'rekreacyjna', 'seria', 'skala', 'woda', 'zielona',
]);

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

  it('sternik bank: Polish terms quoted in the Russian explanation match the question', () => {
    // whyRu quotes the Polish term in brackets, e.g. "(statek żaglowy)". When the
    // question's own Polish text spells that word with diacritics, the quote must
    // too. Checked per question, not against a bank-wide map: the same letters can
    // be two different words ("prawa burta" is not "prawą burtą").
    const bad: string[] = [];
    for (const q of STERNIK_BANK) {
      const pl = new Map<string, string>();
      for (const w of [q.q, ...q.options, q.whyPl ?? ''].join(' ').match(LATIN_WORD) ?? []) {
        if (!isAscii(w)) pl.set(fold(w), w);
      }
      for (const w of q.whyRu.match(LATIN_WORD) ?? []) {
        if (!isAscii(w) || VALID_ASCII_IN_RU.has(w.toLowerCase())) continue;
        const restored = pl.get(w.toLowerCase());
        if (restored) bad.push(`${q.id}: "${w}" (question has "${restored}")`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('SRC radio voice grading: every checklist label of every transmission kind', () => {
    const bad: string[] = [];
    for (const kind of VOICE_KINDS) {
      const { checks } = gradeVoiceTransmission({
        kind,
        transcript: '',
        vessel: VESSEL_POOL[0],
        positionSpoken: POSITION_POOL[0].spoken,
        pob: 4,
      });
      for (const c of checks) {
        if (STRIPPED_LABEL.test(c.label) || STRIPPED.test(c.label)) bad.push(`${kind}/${c.id}: "${c.label}"`);
      }
    }
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
