/**
 * Guards the App Store listing text in `mobile/asc-metadata/` before it is
 * pushed with `node scripts/asc-metadata.mjs`.
 *
 * - Field lengths are measured the way the push script sends them: trailing
 *   whitespace (the file's final newline) is stripped first, then Unicode code
 *   points are counted. Counting the raw file flagged valid 30-character
 *   names as 31.
 * - Typography follows AGENTS.md: no en/em dash, no curly quotes, no ellipsis
 *   character, no non-breaking space (French uses a plain ASCII space before
 *   ':' instead).
 * - Polish is written with full diacritics (owner decision 2026-09-27):
 *   no common word spelled without them, and a normal diacritic density in
 *   the description, so a partly de-accented text fails too.
 * - French colons have a space before them; URLs and clock times are ignored.
 * - Keywords never repeat a word from the same locale's name or subtitle
 *   (Apple already indexes those).
 *
 * Runs inside `npm run check` (it is a jest test), so no extra wiring.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', 'asc-metadata');

// Locales pushed by scripts/asc-metadata.mjs (folder names, not ASC codes).
const LOCALES = ['ru', 'en', 'en-GB', 'pl', 'es', 'fr', 'de', 'it'];

// App Store Connect limits, in characters.
const LIMITS: Record<string, number> = {
  'name.txt': 30,
  'subtitle.txt': 30,
  'keywords.txt': 100,
  'promotional.txt': 170,
  'description.md': 4000,
  'support_url.txt': 255,
  'marketing_url.txt': 255,
};

// U+2013 en dash, U+2014 em dash, U+2018/2019 curly single quotes,
// U+201C/201D curly double quotes, U+2026 ellipsis, U+00A0 and U+202F
// non-breaking spaces.
const FORBIDDEN = /[\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00A0\u202F]/u;

function readField(locale: string, file: string): string {
  // Same normalisation as asc-metadata.mjs: strip trailing whitespace only.
  return readFileSync(join(ROOT, locale, file), 'utf8').replace(/\s+$/, '');
}

function codePoints(s: string): number {
  return Array.from(s).length;
}

function textFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...textFilesUnder(p));
    else if (/\.(md|txt|json)$/.test(entry)) out.push(p);
  }
  return out;
}

function words(s: string): string[] {
  return s
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2);
}

// ASCII spellings of common Polish words that only exist WITH diacritics
// ("sie" for "się", "zeglarstwo" for "żeglarstwo", ...). Each pattern matches
// a whole word, so a correct "się" or "zaglądać" never trips it. Only forms
// that are not Polish words without their accents belong here.
const DEACCENTED_POLISH: RegExp[] = [
  /^sie$/,
  /^zegl[a-z]*$/, // żegl-: żeglarstwo, żeglarz, żeglowanie
  /^zag(iel|le|li|lami|lach|lem)$/, // żagiel, żagle
  /^lodz[a-z]*$/, // łódź, łodzi
  /^moz(e|esz|na|liwe)$/, // może, możesz, można, możliwe
  /^wiecej$/,
  /^ktor(y|a|e|ego|ej|ych|ym|zy)$/,
  /^(takze|rowniez|dzieki|jezeli|bedzie|nauke|zaloga|pytan|egzaminow)$/,
  /^cwicze[a-z]*$/, // ćwiczenie, ćwiczenia
];

/** Words of `text` written without the diacritics Polish needs. */
function deAccentedPolish(text: string): string[] {
  return text
    .toLocaleLowerCase('pl')
    .split(/[^\p{L}]+/u)
    .filter((w) => DEACCENTED_POLISH.some((re) => re.test(w)));
}

/** Share of letters that carry a Polish diacritic (about 6-8% in real text). */
function polishDiacriticRatio(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  const marked = text.match(/[ąćęłńóśźż]/giu) ?? [];
  return letters.length === 0 ? 0 : marked.length / letters.length;
}

/**
 * Lines with a colon glued to the previous character, the French spacing
 * error. URLs ("https://") and clock times ("12:30") are removed first so
 * they never count as errors.
 */
function tightFrenchColons(text: string): string[] {
  return text
    .split('\n')
    .filter((line) =>
      /\S:/.test(
        line.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '').replace(/\d:\d/g, ''),
      ),
    );
}

describe('App Store listing text (mobile/asc-metadata)', () => {
  it('has a folder with every field for each pushed locale', () => {
    for (const locale of LOCALES) {
      for (const file of Object.keys(LIMITS)) {
        expect(readField(locale, file).length).toBeGreaterThan(0);
      }
    }
  });

  it.each(LOCALES)('%s fields fit the App Store Connect limits', (locale) => {
    for (const [file, max] of Object.entries(LIMITS)) {
      const value = readField(locale, file);
      const len = codePoints(value);
      if (len > max) {
        throw new Error(`${locale}/${file} is ${len} characters, limit ${max}`);
      }
      expect(value).toBe(value.trimStart());
    }
  });

  it('keywords are clean comma-separated terms without repeats', () => {
    for (const locale of LOCALES) {
      const raw = readField(locale, 'keywords.txt');
      expect(raw).not.toMatch(/\s,|,\s/);
      const terms = raw.split(',');
      expect(terms.every((t) => t.trim().length > 0)).toBe(true);
      expect(new Set(terms.map((t) => t.toLocaleLowerCase())).size).toBe(terms.length);

      const shown = new Set([
        ...words(readField(locale, 'name.txt')),
        ...words(readField(locale, 'subtitle.txt')),
      ]);
      const repeated = terms.filter((t) => shown.has(t.toLocaleLowerCase()));
      expect({ locale, repeated }).toEqual({ locale, repeated: [] });
    }
  });

  it('uses ASCII typography only (no dashes, curly quotes, ellipsis, NBSP)', () => {
    const offenders: string[] = [];
    for (const file of textFilesUnder(ROOT)) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (FORBIDDEN.test(line)) offenders.push(`${file.slice(ROOT.length + 1)}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('writes Polish with full diacritics', () => {
    for (const file of ['name.txt', 'description.md', 'promotional.txt']) {
      expect(readField('pl', file)).toMatch(/[ąćęłńóśźż]/iu);
    }
    // A partly de-accented text still has some diacritics, so also look for
    // common words spelled without them, in every Polish field.
    for (const file of Object.keys(LIMITS)) {
      const bare = deAccentedPolish(readField('pl', file));
      expect({ file, bare }).toEqual({ file, bare: [] });
    }
    // And the long description keeps a normal density of diacritics.
    expect(polishDiacriticRatio(readField('pl', 'description.md'))).toBeGreaterThan(0.04);
  });

  it('the Polish check catches de-accented words and passes correct ones', () => {
    expect(deAccentedPolish('Uczysz sie zeglarstwa, ktore moze byc trudne.')).toEqual([
      'sie',
      'zeglarstwa',
      'ktore',
      'moze',
    ]);
    expect(deAccentedPolish('Uczysz się żeglarstwa, które może być trudne.')).toEqual([]);
    expect(deAccentedPolish('Zaglądasz do żagli na łodzi.')).toEqual([]);
    expect(polishDiacriticRatio('Zażółć gęślą jaźń')).toBeGreaterThan(0.4);
    expect(polishDiacriticRatio('Zazolc gesla jazn')).toBe(0);
  });

  it('French puts a plain space before a colon in the long texts', () => {
    for (const file of ['description.md', 'promotional.txt']) {
      const tight = tightFrenchColons(readField('fr', file));
      expect({ file, tight }).toEqual({ file, tight: [] });
    }
  });

  it('the French colon check ignores URLs and clock times', () => {
    expect(tightFrenchColons('Voir https://weektoregatta.com/privacy à 12:30')).toEqual([]);
    expect(tightFrenchColons('Gratuit : 879 questions')).toEqual([]);
    expect(tightFrenchColons('Gratuit: 879 questions')).toEqual(['Gratuit: 879 questions']);
  });
});
