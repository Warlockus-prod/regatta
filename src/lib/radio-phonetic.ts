import {
  PHONETIC_ALPHABET,
  SPOKEN_FIGURES,
  type PhoneticLetter,
  type SpokenFigure,
} from "@/data/radio/phonetic-alphabet";

// ============================================================================
// Grading for the phonetic alphabet drill (/radio/alfabet). Pure functions:
// the page renders, this decides. Every answer is checked against the ITU
// table in src/data/radio/phonetic-alphabet.ts, never against itself.
// ============================================================================

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Spellings a transcriber or a learner commonly writes for a code word. They
 *  sound the same on the air, so they pass, but the learner sees the standard. */
const LETTER_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  A: ["alpha"],
  J: ["juliet"],
  W: ["whisky"],
};

/** Pronunciation spellings of figures (WUN, NINER) and the ITU figure code. */
const FIGURE_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  "1": ["wun"],
  "2": ["too"],
  "3": ["tree"],
  "4": ["fower"],
  "5": ["fife"],
  "8": ["ait"],
  "9": ["niner"],
};

/** Words around a spelling that carry no character. */
const FILLERS = new Set(["space", "break", "i", "spell", "spelling", "over", "and"]);

export type TokenMatch =
  | { kind: "char"; char: string; standard: boolean; token: string }
  | { kind: "unknown"; token: string };

/** What one spoken or typed word stands for. A bare letter ("o") is not a code
 *  word and does not count. Numerals count only for recognised speech, where a
 *  transcriber writes "9" for a spoken NINER. */
export function matchToken(raw: string, allowNumerals = false): TokenMatch | null {
  const token = norm(raw);
  if (!token || FILLERS.has(token)) return null;
  for (const l of PHONETIC_ALPHABET) {
    if (norm(l.word) === token) return { kind: "char", char: l.letter, standard: true, token: raw };
    if (LETTER_VARIANTS[l.letter]?.includes(token)) return { kind: "char", char: l.letter, standard: false, token: raw };
  }
  for (const f of SPOKEN_FIGURES) {
    if (norm(f.word) === token) return { kind: "char", char: f.symbol, standard: true, token: raw };
    if (norm(f.codeWord) === token || FIGURE_VARIANTS[f.symbol]?.includes(token)) {
      return { kind: "char", char: f.symbol, standard: false, token: raw };
    }
  }
  if (allowNumerals && /^\d$/.test(token)) return { kind: "char", char: token, standard: true, token: raw };
  return { kind: "unknown", token: raw };
}

/** Split a transmission into words, joining the two-word forms of X-RAY and FOXTROT. */
export function tokenize(text: string): string[] {
  return text
    .replace(/\bx[\s-]+ray\b/gi, "xray")
    .replace(/\bfox[\s-]+trot\b/gi, "foxtrot")
    .split(/[\s,.;:!?/]+/)
    .filter(Boolean);
}

export type CharStatus = "ok" | "variant" | "wrong" | "missing";

export interface CharCheck {
  /** the character of the name or call sign */
  char: string;
  /** the standard word for it, as transmitted */
  expected: string;
  status: CharStatus;
  /** what was typed or heard in that place */
  heard?: string;
}

export interface SpellResult {
  checks: CharCheck[];
  /** words after the last expected character */
  extra: string[];
  /** 0-100, share of characters given correctly in their place */
  score: number;
  passed: boolean;
}

/** The standard word for one character of a name. */
export function standardWord(char: string): string | null {
  const letter = PHONETIC_ALPHABET.find((l) => l.letter === char);
  if (letter) return letter.word.toUpperCase();
  const figure = SPOKEN_FIGURES.find((f) => f.symbol === char);
  return figure ? figure.word : null;
}

/**
 * Grade a spelling of `target` ("ORKA", "DJ4527"). Characters are compared in
 * order: OSCAR ROMEO KILO ALFA passes, ROMEO OSCAR KILO ALFA does not, and a
 * bare "O R K A" scores zero. Spaces in a ship name are not transmitted.
 */
export function gradeSpelling(target: string, transmission: string, opts: { allowNumerals?: boolean } = {}): SpellResult {
  const expected = [...target.toUpperCase()].filter((ch) => standardWord(ch) !== null);
  const matches = tokenize(transmission)
    .map((t) => matchToken(t, opts.allowNumerals))
    .filter((m): m is TokenMatch => m !== null);
  const checks: CharCheck[] = expected.map((char, i) => {
    const word = standardWord(char)!;
    const m = matches[i];
    if (!m) return { char, expected: word, status: "missing" };
    if (m.kind === "char" && m.char === char) return { char, expected: word, status: m.standard ? "ok" : "variant", heard: m.token };
    return { char, expected: word, status: "wrong", heard: m.token };
  });
  const extra = matches.slice(expected.length).map((m) => m.token);
  const good = checks.filter((c) => c.status === "ok" || c.status === "variant").length;
  const score = expected.length ? Math.round((good / expected.length) * 100) : 0;
  return { checks, extra, score, passed: expected.length > 0 && good === expected.length && extra.length === 0 };
}

// ---------------------------------------------------------------------------
// Recognition questions
// ---------------------------------------------------------------------------

export type QuestionKind = "word-to-letter" | "letter-to-word" | "figure-to-say";

export interface DrillQuestion {
  id: string;
  kind: QuestionKind;
  /** what the learner sees or hears */
  prompt: string;
  /** what the listen button speaks, when the prompt can be heard */
  speak?: string;
  options: string[];
  answer: string;
}

/** Deterministic PRNG (mulberry32), so a seed gives the same round in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickOthers<T>(pool: readonly T[], exclude: T, n: number, rnd: () => number): T[] {
  return shuffle(pool.filter((x) => x !== exclude), rnd).slice(0, n);
}

/** The pronunciation guide as one string: NIN-ER, DAY-SEE-MAL. */
export function sayGuide(item: Pick<PhoneticLetter | SpokenFigure, "syllables">): string {
  return item.syllables.join("-");
}

export function makeQuestion(kind: QuestionKind, rnd: () => number): DrillQuestion {
  if (kind === "figure-to-say") {
    const digits = SPOKEN_FIGURES.filter((f) => f.symbol !== ".");
    const f = digits[Math.floor(rnd() * digits.length)];
    const options = shuffle([sayGuide(f), ...pickOthers(digits, f, 3, rnd).map(sayGuide)], rnd);
    return { id: `fig-${f.symbol}`, kind, prompt: f.symbol, options, answer: sayGuide(f) };
  }
  const l = PHONETIC_ALPHABET[Math.floor(rnd() * PHONETIC_ALPHABET.length)];
  const others = pickOthers(PHONETIC_ALPHABET, l, 3, rnd);
  if (kind === "word-to-letter") {
    return { id: `w2l-${l.letter}`, kind, prompt: l.word, speak: l.word, options: shuffle([l.letter, ...others.map((o) => o.letter)], rnd), answer: l.letter };
  }
  return { id: `l2w-${l.letter}`, kind, prompt: l.letter, options: shuffle([l.word, ...others.map((o) => o.word)], rnd), answer: l.word };
}

/** True only for the exact correct option. */
export function isCorrect(q: DrillQuestion, picked: string): boolean {
  return picked === q.answer && q.options.includes(picked);
}

export const ROUND_SIZE = 10;
const ROUND_PLAN: readonly QuestionKind[] = [
  "word-to-letter", "word-to-letter", "word-to-letter", "word-to-letter",
  "letter-to-word", "letter-to-word", "letter-to-word",
  "figure-to-say", "figure-to-say", "figure-to-say",
];

/** Ten questions, no prompt asked twice. */
export function makeRound(seed: number): DrillQuestion[] {
  const rnd = seededRandom(seed);
  const seen = new Set<string>();
  const out: DrillQuestion[] = [];
  for (const kind of shuffle(ROUND_PLAN, rnd)) {
    let q = makeQuestion(kind, rnd);
    for (let tries = 0; seen.has(q.id) && tries < 50; tries++) q = makeQuestion(kind, rnd);
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

/** 0-100 for a finished round; an unanswered question counts as wrong. */
export function roundScore(questions: readonly DrillQuestion[], answers: readonly (string | null)[]): number {
  if (!questions.length) return 0;
  const right = questions.filter((q, i) => answers[i] != null && isCorrect(q, answers[i]!)).length;
  return Math.round((right / questions.length) * 100);
}

export function starsFor(score: number): 0 | 1 | 2 | 3 {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score >= 50) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Progress, on this device only (like every radio trainer)
// ---------------------------------------------------------------------------

export const PHONETIC_PROGRESS_KEY = "radio.src.phonetic.v1";

export interface PhoneticProgress {
  best: number;
  stars: 0 | 1 | 2 | 3;
  rounds: number;
  lastAt: number;
}

const EMPTY: PhoneticProgress = { best: 0, stars: 0, rounds: 0, lastAt: 0 };

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;
const browserStore = (): KeyValueStore | null => {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
};

export function loadPhoneticProgress(store: KeyValueStore | null = browserStore()): PhoneticProgress {
  try {
    const raw = store?.getItem(PHONETIC_PROGRESS_KEY);
    const p = raw ? JSON.parse(raw) : null;
    if (!p || typeof p !== "object" || typeof p.best !== "number") return { ...EMPTY };
    const best = Math.max(0, Math.min(100, Math.round(p.best)));
    return { best, stars: starsFor(best), rounds: Number.isFinite(p.rounds) ? Math.max(0, Math.floor(p.rounds)) : 0, lastAt: Number(p.lastAt) || 0 };
  } catch {
    return { ...EMPTY };
  }
}

/** Store a finished round; the best score never goes down. */
export function recordPhoneticRound(score: number, store: KeyValueStore | null = browserStore(), now = Date.now()): PhoneticProgress {
  const prev = loadPhoneticProgress(store);
  const best = Math.max(prev.best, Math.max(0, Math.min(100, Math.round(score))));
  const next: PhoneticProgress = { best, stars: starsFor(best), rounds: prev.rounds + 1, lastAt: now };
  try { store?.setItem(PHONETIC_PROGRESS_KEY, JSON.stringify(next)); } catch { /* private browsing */ }
  return next;
}
