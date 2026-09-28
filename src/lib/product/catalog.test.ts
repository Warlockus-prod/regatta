import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { destinations, sectionForPath, searchDestinations, sections } from "./catalog";
import { menuEntry, menuGroups, nativeTabs, navigationItemForSection } from "./menu";

describe("product navigation", () => {
  it("exposes Menu instead of Library in the primary navigation and preserves reference ownership", () => {
    expect(nativeTabs.map(tab => tab.id)).toEqual(["home", "learn", "practice", "race", "menu"]);
    expect(menuEntry.web).toBe("/menu");
    expect(existsSync("src/app/menu/page.tsx")).toBe(true);
    for (const path of ["/menu", "/library", "/anatomy", "/glossary"]) {
      expect(navigationItemForSection(sectionForPath(path, "web"))).toBe("menu");
    }
    expect(navigationItemForSection(sectionForPath("/learn/sails", "native"))).toBe("learn");
  });
  it("lists every public platform destination exactly once in all seven languages", () => {
    for (const platform of ["web", "native"] as const) {
      for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
        const groups = menuGroups("", lang, platform);
        const ids = groups.flatMap(group => group.entries.map(entry => entry.id));
        expect(new Set(ids).size).toBe(ids.length);
        expect([...ids].sort()).toEqual(destinations.filter(d => d[platform]).map(d => d.id).sort());
        expect(groups.every(group => group.title[lang].length > 2)).toBe(true);
        expect(menuEntry.title[lang].length).toBeGreaterThan(2);
      }
    }
    expect(menuGroups("radio", "en", "web").flatMap(group => group.entries.map(d => d.id))).toEqual(["radio"]);
    expect(menuGroups("settings", "en", "web")).toEqual([]);
    expect(menuGroups("settings", "en", "native")[0].id).toBe("service");
  });
  it("does not require a connection for the bundled simulators or sail theory", () => {
    expect(destinations.find(d => d.id === "boat")?.online).not.toBe(true);
    expect(destinations.find(d => d.id === "sails")?.online).not.toBe(true);
    expect(destinations.find(d => d.id === "trainer")?.online).not.toBe(true);
  });
  it("keeps nested exam, simulator and race routes in their parent section", () => {
    expect(sectionForPath("/radio/symulator?scenario=mayday", "web")).toBe("learn");
    expect(sectionForPath("/kursy/radio", "native")).toBe("learn");
    expect(sectionForPath("/simulator-v3", "web")).toBe("practice");
    expect(sectionForPath("/simulator-basics", "native")).toBe("practice");
    expect(sectionForPath("/multiplayer/race/ABC123", "native")).toBe("race");
    expect(sectionForPath("/racing", "web")).toBe("learn");
    expect(sectionForPath("/race/", "web")).toBe("race");
    expect(sectionForPath("/learn/sails/rig-basics", "web")).toBe("learn");
    expect(sectionForPath("/learn/sails/rig-basics", "native")).toBe("learn");
  });
  it("searches localized words without requiring accents or exact casing", () => {
    expect(searchDestinations("ZAGLE", "pl", "native").some(d => d.id === "trainer")).toBe(true);
    expect(searchDestinations("lodka", "pl", "web").map(d => d.id)).toContain("boat");
    expect(searchDestinations(" тренажер трима ", "ru", "web").map(d => d.id)).toEqual(["trainer"]);
    expect(searchDestinations("not-a-section", "en", "web")).toEqual([]);
    expect(searchDestinations("settings", "en", "web")).toEqual([]);
    expect(searchDestinations("settings", "en", "native").map(d => d.id)).toEqual(["settings"]);
  });
  it("every catalog destination has a real entry point on its platform", () => {
    for (const item of [...sections, ...destinations]) {
      if (item.web) expect(existsSync(`src/app${item.web === "/" ? "" : item.web}/page.tsx`), item.web).toBe(true);
      if (item.native) {
        const base = `mobile/app${item.native === "/" ? "/index" : item.native}`;
        expect(existsSync(`${base}.tsx`) || existsSync(`${base}/index.tsx`), item.native).toBe(true);
      }
    }
  });
});
