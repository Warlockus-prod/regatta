import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { destinations, sectionForPath, searchDestinations, sections } from "./catalog";

describe("product navigation", () => {
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
