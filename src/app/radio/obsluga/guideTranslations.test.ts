import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ENABLED_LANGUAGES } from "@/lib/languages";
import { primaryRadioSource } from "../localization/protocolTerms";
import { radioText, type RadioAliases, type RadioCatalog } from "../localization/text";

const root = process.cwd();
const guideSource = readFileSync(join(root, "src/app/radio/obsluga/page.tsx"), "utf8");
const aliases = JSON.parse(readFileSync(join(root, "public/radio-locales/aliases.json"), "utf8")) as RadioAliases;
const sources = JSON.parse(readFileSync(join(root, "src/app/radio/localization/sources.json"), "utf8")) as { id: string; source: string }[];
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const omittedCells = [
  "jedno pokrętło, kilka funkcji - przytrzymaj = ON/OFF, kręć = głośność / выкл-вкл и громкость",
  "natychmiast kanał 16 (przytrzymanie = kanał wywoławczy)",
  "naciśnij = nadajesz, puścisz = słuchasz",
];
const hardware = ["DSC / MENU", "[16/C]", "DW / TRI / SCAN", "HI / LO"];
const headings: string[] = [];
const ast = ts.createSourceFile("page.tsx", guideSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function visit(node: ts.Node) {
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === "Section") {
    const pl = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === "pl");
    if (pl && ts.isJsxAttribute(pl) && pl.initializer && ts.isStringLiteral(pl.initializer)) headings.push(pl.initializer.text);
  }
  ts.forEachChild(node, visit);
}
visit(ast);

describe("the visible radio operating guide copy", () => {
  it("enumerates the paired JSX headings and visible table literals with the actual generator", () => {
    expect(headings).toHaveLength(9); // The microphone heading and all eight guide sections.
    for (const value of [...headings, ...omittedCells, ...hardware]) {
      expect(guideSource, value).toContain(value);
      expect(aliases[normalize(value)], value).toBeTruthy();
    }
    // Check the generated inventory too: hand-adding locale entries cannot hide
    // an extractor which still drops JSX attributes or cells containing "=".
    expect(execFileSync(process.execPath, ["src/app/radio/localization/build-catalog.mjs", "--check"], { cwd: root, encoding: "utf8" })).toContain(`radio catalog: ${sources.length} resources`);
    expect(sources.some(source => source.source === "16c")).toBe(false);
    expect(aliases).not.toHaveProperty("16c");
  });

  it("keeps the existing standalone TOC resource alongside the new paired heading", () => {
    expect(sources.find(source => source.id === "5a8fcf641c60d0bd")?.source).toBe("Поиск неисправностей");
    expect(aliases["Поиск неисправностей"]).toBe("5a8fcf641c60d0bd");
    expect(aliases["Шпаргалка"]).toBe("ced57ee3a4d58038");
  });

  for (const { id: lang } of ENABLED_LANGUAGES) {
    it(`${lang}: renders all real section headings and omitted table cells through rt`, () => {
      const catalog = JSON.parse(readFileSync(join(root, `public/radio-locales/${lang}.json`), "utf8")) as RadioCatalog;
      for (const source of [...headings, ...omittedCells]) {
        const rendered = radioText(source, catalog, aliases);
        expect(rendered.trim().length, source).toBeGreaterThan(2);
        expect(rendered).not.toMatch(/[\u2013\u2014]/);
        if (lang !== "pl") expect(rendered, source).not.toBe(primaryRadioSource(source));
        if (lang !== "ru") expect(rendered, source).not.toMatch(/[а-яё]/i);
      }
      for (const source of omittedCells) {
        const primary = primaryRadioSource(source);
        expect(radioText(source, catalog, aliases)).toBe(radioText(primary, catalog, aliases));
        if (lang === "pl") expect(radioText(source, catalog, aliases)).toBe(primary);
      }
      for (const source of hardware) expect(radioText(source, catalog, aliases)).toBe(source);
      expect(radioText(omittedCells[0], catalog, aliases)).toContain("ON/OFF");
      expect(radioText(omittedCells[1], catalog, aliases)).toContain("16");
    });
  }
});
