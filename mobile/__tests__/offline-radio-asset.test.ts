import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MOBILE_ROOT = join(__dirname, "..");
const ASSET_PATH = join(MOBILE_ROOT, "assets", "radio-offline.html");
const ROUTE_PATH = join(MOBILE_ROOT, "app", "kursy", "radio.tsx");
const ENTRY_PATH = join(MOBILE_ROOT, "scripts", "offline-radio", "entry.tsx");
const LOCALE_ROOT = join(MOBILE_ROOT, "..", "public", "radio-locales");
const languages = ["pl", "ru", "en", "es", "fr", "de", "it"];
const readable = (value: string) => value.replace(/\\(?:u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2}))/g, (_, unicode: string | undefined, hex: string | undefined) => String.fromCharCode(parseInt(unicode ?? hex!, 16)));

describe("embedded SRC Radio course", () => {
  const html = readFileSync(ASSET_PATH, "utf8");

  it("is a self-contained local document", () => {
    expect(html).toContain('<html lang="pl" data-theme="light">');
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain('<meta name="regatta-offline-version"');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("<script>");
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet/i);
  });

  it("contains the complete radio course surfaces", () => {
    // The bundler writes non-ASCII as \uXXXX escapes; decode them so the
    // checks read the Polish text as users see it (full diacritics).
    const text = readable(html);
    expect(html).toContain("radio-offline-ready");
    expect(html).toContain("radio-offline-progress");
    expect(html).not.toContain("radio-open-online");
    for (const path of ["/radio", "/radio/teoria", "/radio/obsluga", "/radio/symulator", "/radio/test", "/radio/zadania", "/radio/sciaga", "/radio/pozycja", "/radio/alfabet", "/radio/rozmowa"]) expect(html).toContain(path);
    expect(text).toContain("Zrozum radio morskie przed symulatorem");
    expect(text).toContain("Pamięć skanowania: sprawdź i dodaj kanały");
    expect(text).toContain("Ręczne wprowadzenie pozycji i czasu");
    expect(text).toContain("324 pytania");
  });

  it("ships all seven catalogs, aliases, local voice bridges and fonts inside the package", () => {
    const entry = readFileSync(ENTRY_PATH, "utf8");
    const text = readable(html);
    const catalogs = languages.map(lang => JSON.parse(readFileSync(join(LOCALE_ROOT, `${lang}.json`), "utf8")) as Record<string, string>);
    const translatedValues = catalogs.map(catalog => new Set(Object.values(catalog)));
    for (let index = 0; index < languages.length; index += 1) {
      const lang = languages[index]; const catalog = catalogs[index];
      expect(entry).toContain(`public/radio-locales/${lang}.json`);
      expect(Object.keys(catalog).length).toBeGreaterThan(3_500);
      // Distinct long prose from each locale proves the emitted document has
      // actual translations, rather than only language names or a remote URL.
      const prose = Object.values(catalog).filter(value => value.length > 40 && !/["'\\\n\r]/.test(value) && !translatedValues.some((other, otherIndex) => otherIndex !== index && other.has(value))).slice(0, 20);
      expect(prose).toHaveLength(20);
      expect(prose.filter(value => !text.includes(value))).toEqual([]);
    }
    expect(entry).toContain('public/radio-locales/aliases.json');
    expect(html).toContain("radio-speech");
    expect(html).toContain("radio-asr");
    expect(html).toContain("__REGATTA_OFFLINE_BUNDLE__");
    expect(html).toMatch(/data:font\/woff2;base64,/);
    expect(html).not.toMatch(/(?:@import|url\()\s*["']?https?:/i);
  });

  it("stays small enough to ship inside the app", () => {
    const bytes = statSync(ASSET_PATH).size;
    expect(bytes).toBeGreaterThan(500_000);
    // Seven complete study catalogs and a local font replace the old PL/RU
    // package. Keep a bounded 7 MiB ceiling to catch accidental asset growth.
    expect(bytes).toBeLessThan(7 * 1024 * 1024);
  });

  it("the mobile route opens the embedded package, not the live website", () => {
    const route = readFileSync(ROUTE_PATH, "utf8");
    expect(route).toContain("OfflineRadioCourse");
    expect(route).not.toContain("SectionWebView");
  });
});
