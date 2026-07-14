// ============================================================================
// Grading a single turn of a live conversation. Pure, so it runs on the client
// (the server's only job is audio -> text) and can be unit-tested.
//
// THE THING THAT MATTERS HERE IS THE NORMALIZATION.
//
// A textbook-perfect distress call comes back from gpt-4o-transcribe as
//
//     "Mayday! Mayday! Mayday! This is Wind Dancer..."
//
// and a naive lowercase substring match for "mayday mayday mayday" MISSES IT -
// the exclamation marks break the string. The learner would then be told their
// MAYDAY was missing the word MAYDAY. That is not a rough edge, it is the whole
// feature failing in the one place it must not.
//
// So both sides of every comparison get flattened first: case, punctuation,
// Polish diacritics, and any run of non-alphanumerics all collapse to single
// spaces. "Pan-pan, pan-pan, pan-pan." and "PAN PAN PAN PAN PAN PAN" become the
// same string, and both match.
// ============================================================================

export interface MustItem {
  id: string;
  /** what is missing, shown to the learner (Polish, ASCII) */
  label: string;
  /** the turn passes this item if the transcript contains ANY of these */
  anyOf: string[];
}

export interface TurnResult {
  id: string;
  label: string;
  ok: boolean;
}

/**
 * Flatten a string so speech-to-text punctuation and Polish diacritics cannot
 * cause a false failure.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // combining diacritics
    .replace(/ł/g, 'l')           // l with stroke does not decompose
    .replace(/[^a-z0-9]+/g, ' ')       // punctuation, degree signs, hyphens
    .trim();
}

/** does the transcript satisfy this required element? */
export function hits(transcript: string, item: MustItem): boolean {
  const t = normalize(transcript);
  return item.anyOf.some((phrase) => t.includes(normalize(phrase)));
}

export function gradeTurn(transcript: string, must: MustItem[]): {
  checks: TurnResult[];
  score: number;
  passed: boolean;
} {
  const checks = must.map((m) => ({ id: m.id, label: m.label, ok: hits(transcript, m) }));
  const okCount = checks.filter((c) => c.ok).length;
  const score = must.length === 0 ? 0 : Math.round((okCount / must.length) * 100);
  // A turn passes when nothing is missing but at most one element - a real
  // examiner does not fail a transmission for one fumbled word, and neither
  // does an unforgiving trainer teach anything except despair.
  return { checks, score, passed: okCount >= must.length - 1 && okCount >= Math.ceil(must.length * 0.6) };
}
