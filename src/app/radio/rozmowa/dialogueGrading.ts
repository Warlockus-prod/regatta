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
  /**
   * For facts a substring cannot express. "Green is on the RIGHT" is not a
   * keyword - both "zielony" and "prawa" appear in the sentence that gets it
   * backwards too, and any fixed phrase ("prawa strona zielona") is defeated by
   * the words Polish puts in between ("prawa strona toru wodnego jest zielona").
   * When present, this replaces the keyword check.
   *
   * It receives the RAW transcript, not the normalized one: punctuation and
   * conjunctions mark the clause boundaries, and those boundaries are exactly
   * what says which colour belongs to which side.
   */
  test?: (raw: string) => boolean;
  /**
   * An element that cannot be traded away by the one-miss allowance below.
   * Fumbling a supporting detail is human; stating the rule backwards is not the
   * same kind of mistake, and must not pass.
   */
  critical?: boolean;
  /**
   * Match each `anyOf` entry as a whole space-delimited token, not a substring.
   * OUT is the whole lesson of the radio check, and "out" as a substring is
   * ticked green by "about"; OVER by "moreover", "overboard", "recover". Short
   * prowords need a word boundary so an unrelated word cannot satisfy them.
   */
  whole?: boolean;
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
  if (item.test) return item.test(transcript);
  const t = normalize(transcript);
  return item.anyOf.some((phrase) => {
    const p = normalize(phrase);
    if (!p) return false;
    // normalize() leaves only [a-z0-9 ], so `p` is a safe, literal regex body.
    if (item.whole) return new RegExp(`(?:^| )${p}(?: |$)`).test(t);
    return t.includes(p);
  });
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
  //
  // The exception is an element marked `critical`. The slack exists to forgive a
  // dropped detail, not to let someone state the rule backwards and still be told
  // they passed - which is what happened when the IALA question could be answered
  // with the colours swapped and still score 3 out of 4.
  const criticalOk = must.every((m, i) => !m.critical || checks[i].ok);
  return {
    checks,
    score,
    passed: criticalOk && okCount >= must.length - 1 && okCount >= Math.ceil(must.length * 0.6),
  };
}
