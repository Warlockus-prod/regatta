import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MOBILE_ROOT = join(__dirname, "..");
const ASSET_PATH = join(MOBILE_ROOT, "assets", "radio-offline.html");
const ROUTE_PATH = join(MOBILE_ROOT, "app", "kursy", "radio.tsx");

describe("embedded SRC Radio course", () => {
  const html = readFileSync(ASSET_PATH, "utf8");

  it("is a self-contained local document", () => {
    expect(html).toContain('<meta name="regatta-offline-version"');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("<script>");
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet/i);
  });

  it("contains the complete radio course surfaces", () => {
    expect(html).toContain("radio-offline-ready");
    expect(html).toContain("radio-open-online");
    expect(html).toContain("Zrozum radio morskie przed symulatorem");
    expect(html).toContain("Pamiec skanowania: sprawdz i dodaj kanaly");
    expect(html).toContain("Reczne wprowadzenie pozycji i czasu");
    expect(html).toContain("324 pytania");
  });

  it("stays small enough to ship inside the app", () => {
    const bytes = statSync(ASSET_PATH).size;
    expect(bytes).toBeGreaterThan(500_000);
    expect(bytes).toBeLessThan(3_000_000);
  });

  it("the mobile route opens the embedded package, not the live website", () => {
    const route = readFileSync(ROUTE_PATH, "utf8");
    expect(route).toContain("OfflineRadioCourse");
    expect(route).not.toContain("SectionWebView");
  });
});
