import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VOICE_KINDS, gradeVoiceTransmission } from '@/app/api/radio-voice/voiceGrading';
import { INSPECT } from './inspectData';
import { PRACTICE_GROUPS } from './practiceMenu';
import { SCENARIOS } from './scenarios';
import { TRAINER_DICTS, TRAINER_UI_DICTS, checkLabel, fmt, trainerText } from './trainerText';
import { VENUES } from './venues';

// The trainer runs in all seven site languages (owner, 2026-10-24). PL and RU
// live in the data; EN / ES / FR / DE / IT in i18n/*.json, keyed by the Polish
// source (content) or the English string (interface). A text changed or added
// in Polish or English without its translations fails here, by name.

function contentKeys(): string[] {
  const keys = new Set<string>();
  const add = (s?: string) => { if (s) keys.add(s); };
  for (const sc of SCENARIOS) {
    add(sc.title.pl); add(sc.brief.pl); add(sc.debrief?.pl);
    for (const st of sc.steps) { add(st.todo.pl); add(st.why.pl); }
    for (const m of sc.mistakes) add(m.text.pl);
  }
  for (const g of PRACTICE_GROUPS) add(g.title.pl);
  for (const v of Object.values(INSPECT)) { add(v.titlePl); add(v.whatPl); add(v.whyPl); add(v.whenPl); }
  // grader labels, with the value-carrying ones as templates ("... ({value})")
  const vessel = { name: '{value}', mmsi: '261012345', call: 'SP 1234' };
  for (const venue of VENUES) {
    for (const kind of VOICE_KINDS) {
      const g = gradeVoiceTransmission({ kind, transcript: '', vessel, positionSpoken: '{value}', pob: '{value}' as unknown as number, venue });
      for (const c of g.checks) if (!/ x2$/.test(c.label) || c.label.includes('(')) add(c.label);
    }
  }
  return [...keys];
}

const UI_FILES = [
  'page.tsx', 'RadioWorkspace.tsx', 'RadioFront.tsx', 'InspectPanel.tsx', 'VoicePtt.tsx',
  '../MicCheck.tsx', '../RadioSubnav.tsx', '../../sternik/prefs.tsx',
];
const LIT = String.raw`(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|` + '`' + String.raw`((?:\\.|[^` + '`' + String.raw`\\])*)` + '`' + ')';
const TP_CALL = new RegExp(String.raw`\b(?:tp|t)\(\s*` + LIT + String.raw`\s*,\s*` + LIT + String.raw`\s*,\s*` + LIT, 'g');

function uiKeys(): string[] {
  const keys = new Set<string>();
  for (const f of UI_FILES) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(TP_CALL)) keys.add(m[4] ?? m[5] ?? m[6]);
  }
  return [...keys];
}

// en and em dash, curly quotes, low quotes, ellipsis, guillemets (built from code points so this file stays ASCII)
const FORBIDDEN = new RegExp(`[${[0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2026, 0xab, 0xbb].map((c) => String.fromCharCode(c)).join('')}]`);
const RADIO_WORDS = /\b(?:MAYDAY RELAY|MAYDAY|PAN PAN|PAN-PAN|SECURITE|ALL STATIONS|THIS IS|OVER|OUT|RECEIVED MAYDAY|RADIO CHECK|CANCEL MY DISTRESS ALERT|DSC|MMSI|VTS|UKE)\b/g;

function sameTokens(source: string, translation: string) {
  const placeholders = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
  expect(placeholders(translation), source).toEqual(placeholders(source));
  // key names ([ENT], [ALARM OFF], [^]/[v]) stay; lowercase slots such as
  // [stacja wywoływana] ("the station called") are translated
  for (const key of source.match(/\[(?:[A-Z0-9][A-Z0-9 /.+-]*|\^|v)\]/g) ?? []) expect(translation, source).toContain(key);
  for (const word of new Set(source.match(RADIO_WORDS) ?? [])) expect(translation, source).toContain(word);
  expect(FORBIDDEN.test(translation), translation).toBe(false);
}

describe('radio trainer translations', () => {
  const content = contentKeys();
  const ui = uiKeys();

  it('finds the texts it guards', () => {
    expect(content.length).toBeGreaterThan(300);
    expect(ui.length).toBeGreaterThan(100);
    expect(ui).not.toContain(undefined);
    // a template literal with ${} could never be looked up by its English text
    for (const key of ui) expect(key, key).not.toContain('${');
  });

  for (const lang of ['en', 'es', 'fr', 'de', 'it'] as const) {
    it(`${lang}: every scenario, Inspect and grader text is translated`, () => {
      const dict = TRAINER_DICTS[lang];
      const missing = content.filter((k) => !dict[k]);
      expect(missing).toEqual([]);
      for (const k of content) sameTokens(k, dict[k]);
      // no stale entries for texts that no longer exist
      expect(Object.keys(dict).filter((k) => !content.includes(k))).toEqual([]);
    });
  }

  for (const lang of ['es', 'fr', 'de', 'it'] as const) {
    it(`${lang}: every interface string is translated`, () => {
      const dict = TRAINER_UI_DICTS[lang];
      expect(ui.filter((k) => !dict[k])).toEqual([]);
      for (const k of ui) sameTokens(k, dict[k]);
      expect(Object.keys(dict).filter((k) => !ui.includes(k))).toEqual([]);
    });
  }

  it('resolves PL and RU from the data, the rest from the dictionaries', () => {
    const power = SCENARIOS[0].steps[0].todo.pl;
    expect(trainerText(power, 'pl')).toBe(power);
    expect(trainerText(power, 'ru')).toBe(power);
    expect(trainerText(power, 'de')).toBe(TRAINER_DICTS.de[power]);
    expect(trainerText('no such text', 'it')).toBe('no such text');
  });

  it('translates grader labels that carry a value', () => {
    const label = 'dokładna pozycja (50 43.4 NORTH, 001 30.2 WEST)';
    const en = checkLabel(label, 'en');
    expect(en).toContain('50 43.4 NORTH, 001 30.2 WEST');
    expect(en).not.toContain('dokładna');
    expect(checkLabel(label, 'pl')).toBe(label);
    expect(fmt('{n}% min', { n: 70 })).toBe('70% min');
  });
});
