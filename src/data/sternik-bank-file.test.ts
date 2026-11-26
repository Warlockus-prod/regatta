import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { STERNIK_BANK } from './sternik';
import { STERNIK_BANK_FILE } from './sternik-bank-file.generated';
import { parseSternikBankFile } from './sternik-core';

// ============================================================================
// Contract: the browser's copy of the sternik bank (a versioned JSON file in
// public/) holds exactly the questions of src/data/sternik.ts, same ids in the
// same order, and no client module of the course imports the bank as code.
// ============================================================================

const root = resolve(__dirname, '../..');
const bankPath = join(root, 'public', STERNIK_BANK_FILE.url);
const readBank = () => JSON.parse(readFileSync(bankPath, 'utf8'));

describe('the generated sternik bank file', () => {
  it('is fresh: the generator --check passes (JSON, url module and sw.js line)', () => {
    expect(execFileSync(process.execPath, ['scripts/build-sternik-bank.mjs', '--check'], { cwd: root, encoding: 'utf8' }))
      .toContain(`sternik bank: ${STERNIK_BANK.length} questions`);
  });

  it('holds exactly the source bank, ids unchanged and in order', () => {
    const file = readBank();
    expect(file.schema).toBe(1);
    expect(file.version).toBe(STERNIK_BANK_FILE.version);
    expect(file.count).toBe(STERNIK_BANK.length);
    expect(file.questions.map((q: { id: string }) => q.id)).toEqual(STERNIK_BANK.map((q) => q.id));
    expect(file.questions).toEqual(JSON.parse(JSON.stringify(STERNIK_BANK)));
  });

  it('is content-addressed: the file name carries the version, and it is the only bank file', () => {
    expect(STERNIK_BANK_FILE.url).toBe(`/sternik-bank/bank.${STERNIK_BANK_FILE.version}.json`);
    expect(readdirSync(join(root, 'public/sternik-bank'))).toEqual([`bank.${STERNIK_BANK_FILE.version}.json`]);
  });

  it('parses into a working bank: every id resolves, exam pool is 3-option only', () => {
    const bank = parseSternikBankFile(readBank(), STERNIK_BANK_FILE.version);
    expect(bank.questions).toHaveLength(STERNIK_BANK.length);
    for (const q of STERNIK_BANK) expect(bank.byId[q.id]?.q).toBe(q.q);
    expect(bank.examPool.every((q) => q.options.length === 3)).toBe(true);
    expect(bank.baseCounts.all).toBe(bank.baseCounts.materialy + bank.baseCounts.internet);
  });

  it('the service worker precaches the same file', () => {
    const sw = readFileSync(join(root, 'public/sw.js'), 'utf8');
    expect(sw).toContain(`const STERNIK_BANK_URL = '${STERNIK_BANK_FILE.url}';`);
  });
});

describe('parseSternikBankFile rejects anything but a complete bank', () => {
  const good = () => readBank();
  it.each([
    ['not an object', () => 'oops'],
    ['another schema', () => ({ ...good(), schema: 2 })],
    ['a truncated download', () => { const f = good(); f.questions = f.questions.slice(0, 10); return f; }],
    ['an answer key out of range', () => { const f = good(); f.questions[0] = { ...f.questions[0], correct: 9 }; return f; }],
    ['an answer key one past the last option', () => { const f = good(); f.questions[0] = { ...f.questions[0], correct: f.questions[0].options.length }; return f; }],
    ['an unknown category', () => { const f = good(); f.questions[0] = { ...f.questions[0], cat: 'nope' }; return f; }],
    ['a duplicated id', () => { const f = good(); f.questions[1] = { ...f.questions[1], id: f.questions[0].id }; return f; }],
  ])('%s', (_label, make) => {
    expect(() => parseSternikBankFile(make(), STERNIK_BANK_FILE.version)).toThrow();
  });
  it('a file of another version', () => {
    expect(() => parseSternikBankFile(good(), '000000000000')).toThrow(/version/);
  });
});

describe('client code never imports the bank as JavaScript', () => {
  // The hub page.tsx is a server component and may read the bank; everything
  // else under src/app/sternik ships to the browser.
  const dir = join(root, 'src/app/sternik');
  const files = (readdirSync(dir, { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
    .map((f) => join(dir, f))
    .filter((f) => relative(dir, f) !== 'page.tsx');
  it.each(files.map((f) => [relative(root, f)]))('%s', (file) => {
    const src = readFileSync(join(root, file), 'utf8');
    const valueImports = [...src.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"](?:@\/data\/sternik|(?:\.\.\/)+(?:data\/)?sternik)['"]/gm)];
    expect(valueImports.map((m) => m[0])).toEqual([]);
  });
});
