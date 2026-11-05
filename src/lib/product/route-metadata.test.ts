import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routeTitle, routeTitles, type RouteTitleId } from "./route-metadata";

const APP = join(process.cwd(), "src/app");
const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
// Own metadata (radio, sternik, stats), a redirect (library), a share page (r),
// an internal preview (design-v3) or no page at all (api).
const EXEMPT = new Set(["radio", "sternik", "stats", "library", "r", "design-v3", "api"]);

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");

describe("every route has its own tab title", () => {
  it("each route with a page declares a title from the one list", () => {
    const routes = readdirSync(APP, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !EXEMPT.has(entry.name) && existsSync(join(APP, entry.name, "page.tsx")))
      .map(entry => entry.name);
    expect(routes.length).toBeGreaterThan(20);
    for (const route of routes) {
      const source = read(join(APP, route, "layout.tsx")) + read(join(APP, route, "page.tsx"));
      const match = source.match(/routeMetadata\("([^"]+)"\)/);
      expect(match?.[1], `${route} has no routeMetadata`).toBeDefined();
      expect(routeTitles).toHaveProperty(match![1]);
    }
  });

  it("no two routes share a title in any language", () => {
    for (const lang of LANGS) {
      const titles = (Object.keys(routeTitles) as RouteTitleId[]).map(id => routeTitles[id][lang]);
      expect(new Set(titles).size, lang).toBe(titles.length);
    }
  });

  it("names the page first, then the product", () => {
    expect(routeTitle("glossary", "ru")).toBe("Морские термины | Week to Regatta");
    expect(routeTitle("start", "pl")).toBe("Żeglarstwo od podstaw | Week to Regatta");
  });
});
