import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Package 10: the retired UI variants stay gone from the site (src/) and the
 * app (mobile/src, mobile/app). The scan reads the TypeScript syntax tree, so
 * only text a user can see is checked: string literals, template literals and
 * JSX text. Identifiers ("Profile", "REGATTA_DB_DIR") and comments are not
 * text and never match. The sternik question bank and generated data are not
 * UI copy and are skipped.
 */

const ROOT = path.resolve(__dirname, "../../..");
const TREES = ["src", "mobile/src", "mobile/app"];
const SKIP_FILE = /(\.test\.|\.spec\.|\.fixtures\.|\.d\.ts$|\.generated\.ts$)/;
const SKIP_PATHS = new Set([
  "src/data/sternik.ts", // the official Polish bank, not UI chrome
  "src/app/stats/StatsDashboard.tsx", // the English admin dashboard, not product copy
]);

/** Bilingual lines that quote the official Polish wording next to the Russian note. */
const ALLOWED: { file: string; text: string }[] = [
  { file: "src/app/sternik/teoria/page.tsx", text: "Mila morska = 1852 m" },
];

/** "ru": Russian text; "other": another language's slot; "none": shown as is in every language. */
type Context = "ru" | "other" | "none";
type Rule = { id: string; test: (text: string, context: Context) => boolean };

const CYRILLIC = /[А-Яа-яЁё]/;
// A Latin unit sign after a number or a placeholder ("12 kn", "{n} m", "${} min").
const LATIN_UNIT_AFTER_VALUE = /(\d|\$\{\}|\{\w+\})\s?(kn|kts|m|min)(?![A-Za-z])/;
// A value-only template ("${} kn", "${}: ${} m / ${} s"): it reads the same in every language.
const NEUTRAL_UNIT_TEMPLATE = /\$\{\}\s+(kn|kts|m|min)\b/;
const ONLY_UNITS_AND_SIGNS = (text: string) => !/[A-Za-zÀ-žА-Яа-яЁё]/.test(
  text.replace(/\$\{\}/g, " ").replace(/\b(kn|kts|m|min|s|Min\.)(?![A-Za-z])/g, " "));

export const RULES: Rule[] = [
  { id: "mode name «Обычный» (use UI_TERMS.modeSimple)", test: (t) =>
    /^\s*Обычный\s*$|«Обычный»|"Обычный"|Обычный (и|или) Pro|Pro (и|или) [Оо]бычный|режим[а-яё]*\s+«?Обычн/.test(t) },
  { id: "mode name RU «Про» (use UI_TERMS.modePro)", test: (t) => /^\s*Про\s*$|«Про»/.test(t) },
  { id: "mode name DE «Profi» (use UI_TERMS.modePro)", test: (t) => /\bProfi\b/.test(t) },
  { id: "«AI-тренер» (use UI_TERMS.aiCoach, «ИИ-тренер»)", test: (t) => /AI[-\s]тренер/.test(t) },
  { id: "«Еще раз» without ё (use UI_TERMS.again, «Ещё раз»)", test: (t) => /(^|[^А-Яа-яЁё])[Ее]ще раз/.test(t) },
  { id: "brand «REGATTA» in capitals (use UI_TERMS.brand)", test: (t) => /\bREGATTA\b(?!\s+(FLEET|GROUP))/.test(t) },
  { id: "Latin unit kn / m / min in Russian (use UI_TERMS.knots / metres / minutes)", test: (t, context) =>
    ((context === "ru" || CYRILLIC.test(t)) && LATIN_UNIT_AFTER_VALUE.test(t))
    || (context === "none" && NEUTRAL_UNIT_TEMPLATE.test(t) && ONLY_UNITS_AND_SIGNS(t)) },
];

// Calls whose first argument is the Russian text (tp, t, words and the local
// seven-language helpers), later arguments the other languages; object keys
// name the language of their value.
const LOCALIZE_CALLS = new Set(["tp", "t", "words", "label", "w", "t7", "word"]);
const LANG_KEYS = new Set(["en", "pl", "es", "fr", "de", "it"]);

function languageContext(node: ts.Node): Context {
  const parent = node.parent;
  if (!parent) return "none";
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const name = parent.name;
    const key = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : "";
    return key === "ru" ? "ru" : LANG_KEYS.has(key) ? "other" : "none";
  }
  if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && LOCALIZE_CALLS.has(parent.expression.text)) {
    return parent.arguments[0] === node ? "ru" : "other";
  }
  // The radio course's b(pl, ru): Polish first, Russian second.
  if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === "b") {
    return parent.arguments[1] === node ? "ru" : "other";
  }
  return "none";
}

function templateText(node: ts.TemplateExpression): string {
  return node.head.text + node.templateSpans.map((span) => "${}" + span.literal.text).join("");
}

export interface Finding { file: string; line: number; rule: string; text: string }

export function scanSource(file: string, source: string): Finding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings: Finding[] = [];
  const check = (node: ts.Node, text: string) => {
    if (!text.trim()) return;
    if (ALLOWED.some((a) => a.file === file && text.includes(a.text))) return;
    const context = languageContext(node);
    for (const rule of RULES) {
      if (rule.test(text, context)) {
        findings.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, rule: rule.id, text: text.trim().slice(0, 120) });
      }
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node, node.text);
    else if (ts.isTemplateExpression(node)) check(node, templateText(node));
    else if (ts.isJsxText(node)) {
      // A bare unit in JSX after a value ("{x} kn", "<span> kn</span>") renders the same in Russian.
      if (/^\s*(kn|kts|m|min)\s*$/.test(node.text)) findings.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        rule: "Latin unit kn / m / min in Russian (use UI_TERMS.knots / metres / minutes)", text: node.text.trim() });
      else check(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !SKIP_FILE.test(name)) out.push(full);
  }
  return out;
}

describe("retired UI variants (package 10)", () => {
  it("the scanner catches every retired variant and ignores identifiers, comments and radio phrases", () => {
    const bad = [
      `const a = { ru: "Обычный", en: "Simple" };`,
      `const b = tp("В режиме «Обычный» паруса сами", "x", "y");`,
      `const c = words("Про", "Pro", "Pro", "Pro", "Pro", "Profi", "Pro");`,
      `const d = tp("AI-тренер", "AI coach", "Trener AI");`,
      `const e = { ru: "Еще раз" };`,
      `const f = <p>REGATTA</p>;`,
      `const g = <span>{speed.toFixed(1)} kn</span>;`,
      "const h = `${speed.toFixed(1)} kn`;",
      "const i = `${minutes} min`;",
      `const j = { ru: "до 120 m" };`,
      `const k = tp("Ветер 12 kn", "Wind 12 kn", "Wiatr 12 w.");`,
      `const l = <dd>{rig.slack.toFixed(2)} m</dd>;`,
    ];
    for (const snippet of bad) expect(scanSource("probe.tsx", snippet), snippet).not.toEqual([]);
    const good = [
      `// AI-тренер, Обычный, REGATTA in a comment\nconst profile = radioProfile(model);`,
      `const REGATTA_DB_DIR = process.env.REGATTA_DB_DIR;`,
      `const call = "REGATTA FLEET, REGATTA FLEET, THIS IS BALTIC STAR";`,
      `const radio = b("Zwykłe wywołanie", "Обычный вызов по шагам");`,
      `const ok = { ru: "Ещё раз", de: "Pro", en: "Wind 12 kn" };`,
      "const en = `${level} · ${wind} · ${minutesAgo} min ago`;",
      "const lcd = `Next TX after ${m} min ${s} sec.`;",
      `const ru = tp("Ветер 12 уз, дистанция 120 м", "Wind 12 kn, 120 m", "Wiatr 12 w., 120 m");`,
    ];
    for (const snippet of good) expect(scanSource("probe.tsx", snippet), snippet).toEqual([]);
  });

  it("no retired variant appears in the site or app copy", () => {
    const findings: Finding[] = [];
    for (const tree of TREES) {
      for (const file of sourceFiles(path.join(ROOT, tree))) {
        const rel = path.relative(ROOT, file).split(path.sep).join("/");
        if (SKIP_PATHS.has(rel)) continue;
        findings.push(...scanSource(rel, readFileSync(file, "utf8")));
      }
    }
    expect(findings.map((f) => `${f.file}:${f.line} ${f.rule}: ${f.text}`)).toEqual([]);
  });
});
