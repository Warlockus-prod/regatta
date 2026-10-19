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
 * - Polish is written with full diacritics (owner decision 2026-09-27).
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
  });

  it('French puts a plain space before a colon in the long texts', () => {
    for (const file of ['description.md', 'promotional.txt']) {
      const value = readField('fr', file);
      const tight = value.split('\n').filter((line) => /\S:/.test(line));
      expect({ file, tight }).toEqual({ file, tight: [] });
    }
  });
});
