// ============================================================================
// Sternik motorowodny (PL): everything about the question bank EXCEPT the
// questions themselves. Types, categories, the exam format and the helpers
// that index a bank.
//
// Client code imports this module, never src/data/sternik.ts: the 879
// questions are served as a versioned JSON file
// (scripts/build-sternik-bank.mjs -> public/sternik-bank/bank.<hash>.json)
// and loaded at runtime by src/app/sternik/bank.ts, so they do not ride in the
// /sternik/test and /sternik/egzamin JavaScript. src/data/sternik.ts stays the
// one editable source of the bank and re-exports this module.
//
// No em/en dashes anywhere (project-wide rule) - plain hyphens only.
// ============================================================================

export type SternikCatId =
  | 'przepisy'
  | 'sygnaly'
  | 'znaki'
  | 'budowa'
  | 'silniki'
  | 'manewry'
  | 'locja'
  | 'meteo'
  | 'ratownictwo'
  | 'srodowisko'
  | 'prawo';

export interface SternikCategory {
  id: SternikCatId;
  /** Polish name - shown as the primary label (exam language). */
  pl: string;
  /** Russian name - shown as the secondary label. */
  ru: string;
  /** CSS color var name from globals.css, e.g. 'var(--cat-cyan)'. */
  color: string;
  /** Emoji icon for cards/lists. */
  icon: string;
}

export const STERNIK_CATEGORIES: SternikCategory[] = [
  { id: 'przepisy', pl: 'Przepisy i prawo drogi', ru: 'Правила расхождения', color: 'var(--cat-cyan)', icon: '🚦' },
  { id: 'sygnaly', pl: 'Sygnały dźwiękowe i światła', ru: 'Сигналы и огни', color: 'var(--cat-amber)', icon: '📢' },
  { id: 'znaki', pl: 'Znaki nawigacyjne', ru: 'Навигационные знаки', color: 'var(--cat-green)', icon: '🚩' },
  { id: 'budowa', pl: 'Budowa jachtu', ru: 'Устройство лодки', color: 'var(--cat-blue)', icon: '🛥️' },
  { id: 'silniki', pl: 'Silniki', ru: 'Двигатели', color: 'var(--cat-orange)', icon: '⚙️' },
  { id: 'manewry', pl: 'Manewrowanie i cumowanie', ru: 'Манёвры и швартовка', color: 'var(--cat-teal)', icon: '🧭' },
  { id: 'locja', pl: 'Locja i nawigacja', ru: 'Лоция и навигация', color: 'var(--cat-purple)', icon: '🗺️' },
  { id: 'meteo', pl: 'Meteorologia', ru: 'Метеорология', color: 'var(--cat-cyan)', icon: '🌤️' },
  { id: 'ratownictwo', pl: 'Ratownictwo i pierwsza pomoc', ru: 'Спасание и первая помощь', color: 'var(--cat-red)', icon: '🛟' },
  { id: 'srodowisko', pl: 'Ochrona środowiska', ru: 'Экология', color: 'var(--cat-green)', icon: '🌿' },
  { id: 'prawo', pl: 'Patent i przepisy prawne', ru: 'Патент и закон', color: 'var(--cat-amber)', icon: '📜' },
];

export const STERNIK_CATEGORY_BY_ID: Record<SternikCatId, SternikCategory> = Object.fromEntries(
  STERNIK_CATEGORIES.map((c) => [c.id, c]),
) as Record<SternikCatId, SternikCategory>;

/** Ids of small figures rendered above a question (see QuestionFigure.tsx). */
export type SternikFigureId =
  | 'cardinal-n' | 'cardinal-e' | 'cardinal-s' | 'cardinal-w'
  | 'lateral-red' | 'lateral-green'
  | 'isolated-danger' | 'safe-water'
  | 'flag-a';

export interface SternikQuestion {
  /** Stable id - localStorage stats key. Never renumber existing ids. */
  id: string;
  cat: SternikCatId;
  /** Question text, Polish (exam language). */
  q: string;
  /**
   * 3 or 4 options. The circulating PZMWiNW-derived base (337 questions) is
   * a/b/c/d; freshly authored questions are A/B/C. The engine handles both.
   */
  options: string[];
  /** Index of the correct option BEFORE shuffling. */
  correct: number;
  /** Russian explanation shown after answering. */
  whyRu: string;
  /** Polish explanation shown after answering (exam language), above whyRu. */
  whyPl?: string;
  /** Provenance, e.g. 'baza CZ #12' for questions from the open bank PDF. */
  source?: string;
  /** Optional figure shown above the question (znaki recognition etc). */
  figure?: SternikFigureId;
  /**
   * Optional real photo shown above the question, basename of a file in
   * /public/sternik/clouds (e.g. 'cumulonimbus'). Used for weather questions.
   */
  photo?: string;
  /** Difficulty where the source provides it (akademiasternika). */
  difficulty?: 'easy' | 'medium' | 'hard';
  /**
   * Which base this question belongs to. 'materialy' = the original uploaded
   * konspekt bank; anything without a base is treated as 'internet' (harvested
   * from open web sources). Lets the user pick a base to train/exam on.
   */
  base?: 'materialy' | 'internet';
}

/** Real exam format: rozporzadzenie MSiT z 9.04.2013 (Dz.U. 2013 poz. 460). */
export const STERNIK_EXAM = {
  questions: 75,
  minutes: 90,
  passCorrect: 65,
  passPct: Math.round((65 / 75) * 100), // 87
};

// ---------------------------------------------------------------------------
// Helpers over a bank (pure: the bank is an argument, never imported here)
// ---------------------------------------------------------------------------

/**
 * Exam-realistic pool: the state exam uses single-choice A/B/C (3 options).
 * The 4-option Centrum bank is extended study material, so the mock exam
 * draws only from 3-option questions to mirror the real test. Falls back to
 * the whole bank if the 3-option pool is ever too small.
 */
export function sternikExamPool(bank: SternikQuestion[]): SternikQuestion[] {
  const threeOption = bank.filter((q) => q.options.length === 3);
  return threeOption.length >= STERNIK_EXAM.questions ? threeOption : bank;
}

/** Questions without an explicit base are the internet-harvested set. */
export function questionBase(q: SternikQuestion): 'materialy' | 'internet' {
  return q.base ?? 'internet';
}

/** Filter a question list by the selected base ('all' keeps everything). */
export function filterByBase<T extends SternikQuestion>(
  questions: T[],
  base: 'all' | 'materialy' | 'internet',
): T[] {
  if (base === 'all') return questions;
  return questions.filter((q) => questionBase(q) === base);
}

export interface SternikBaseCounts {
  all: number;
  materialy: number;
  internet: number;
}

/** Counts per base, for labelling the base selector honestly. */
export function sternikBaseCounts(questions: SternikQuestion[]): SternikBaseCounts {
  return {
    all: questions.length,
    materialy: questions.filter((q) => questionBase(q) === 'materialy').length,
    internet: questions.filter((q) => questionBase(q) === 'internet').length,
  };
}

/** A loaded bank with the lookups the trainer, the exam and the report need. */
export interface SternikBank {
  /** Content hash of the bank file this came from. */
  version: string;
  questions: SternikQuestion[];
  /** Stable question id -> question. Progress and mistake review key on ids. */
  byId: Record<string, SternikQuestion>;
  /** The mock exam's pool (3-option questions). */
  examPool: SternikQuestion[];
  baseCounts: SternikBaseCounts;
  examBaseCounts: SternikBaseCounts;
}

export function indexSternikBank(questions: SternikQuestion[], version: string): SternikBank {
  const examPool = sternikExamPool(questions);
  return {
    version,
    questions,
    byId: Object.fromEntries(questions.map((q) => [q.id, q])),
    examPool,
    baseCounts: sternikBaseCounts(questions),
    examBaseCounts: sternikBaseCounts(examPool),
  };
}

// ---------------------------------------------------------------------------
// The bank file: what scripts/build-sternik-bank.mjs writes and the client
// reads. A shape check here turns a truncated download, an HTML error page or
// a stale file into the loading error (with Retry) instead of a crash halfway
// through an exam.
// ---------------------------------------------------------------------------

export const STERNIK_BANK_SCHEMA = 1;

export interface SternikBankFile {
  schema: typeof STERNIK_BANK_SCHEMA;
  version: string;
  count: number;
  questions: SternikQuestion[];
}

const CAT_IDS = new Set<string>(STERNIK_CATEGORIES.map((c) => c.id));

function validQuestion(q: unknown): q is SternikQuestion {
  if (!q || typeof q !== 'object') return false;
  const v = q as Record<string, unknown>;
  return typeof v.id === 'string' && v.id.length > 0
    && typeof v.cat === 'string' && CAT_IDS.has(v.cat)
    && typeof v.q === 'string'
    && Array.isArray(v.options) && v.options.length >= 2 && v.options.every((o) => typeof o === 'string')
    && Number.isInteger(v.correct) && (v.correct as number) >= 0 && (v.correct as number) < v.options.length
    && typeof v.whyRu === 'string';
}

/**
 * Validate a parsed bank file and index it. Throws on anything that is not a
 * complete bank of the expected schema (and, when given, the expected version).
 */
export function parseSternikBankFile(raw: unknown, expectedVersion?: string): SternikBank {
  if (!raw || typeof raw !== 'object') throw new Error('Sternik bank: not an object');
  const file = raw as Partial<SternikBankFile>;
  if (file.schema !== STERNIK_BANK_SCHEMA) throw new Error(`Sternik bank: schema ${String(file.schema)}`);
  if (typeof file.version !== 'string' || !file.version) throw new Error('Sternik bank: no version');
  if (expectedVersion && file.version !== expectedVersion) throw new Error(`Sternik bank: version ${file.version}, expected ${expectedVersion}`);
  const questions = file.questions;
  if (!Array.isArray(questions) || questions.length === 0 || questions.length !== file.count) throw new Error('Sternik bank: incomplete');
  const ids = new Set<string>();
  for (const q of questions) {
    if (!validQuestion(q)) throw new Error('Sternik bank: malformed question');
    if (ids.has(q.id)) throw new Error(`Sternik bank: duplicate id ${q.id}`);
    ids.add(q.id);
  }
  return indexSternikBank(questions, file.version);
}
