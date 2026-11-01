import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RACE_MODE_LABELS as raceCopyLabels } from "@/app/game/race-copy";
import { RACE_MODE_LABELS } from "@/app/game/race-mode-labels";

// Turbopack copies a module into every route chunk that needs it unless a
// shared parent (the root layout) already has it. These guards keep the two
// dedupes that hold scripts/check-bundle-size.mjs under budget from being
// undone by a tidy-up that looks harmless.
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("client bundle dedupe", () => {
  it("keeps the next/dynamic runtime in the root layout through ClientErrorReporter", () => {
    const layout = read("../app/layout.tsx");
    expect(layout).toMatch(/import ClientErrorReporter from "@\/components\/ClientErrorReporter";/);
    expect(layout).toContain("<ClientErrorReporter />");
    const reporter = read("./ClientErrorReporter.tsx");
    expect(reporter.startsWith("'use client';")).toBe(true);
    expect(reporter).toMatch(/^import 'next\/dynamic';$/m);
  });

  it("lets the leaderboard read the mode labels without bundling the race copy", () => {
    const dir = new URL("../app/leaderboard/", import.meta.url);
    const sources = readdirSync(dir).filter((name) => /\.tsx?$/.test(name) && !/\.test\./.test(name));
    expect(sources.length).toBeGreaterThan(0);
    for (const name of sources) {
      expect(readFileSync(new URL(name, dir), "utf8"), name).not.toMatch(/game\/race-copy["']/);
    }
    expect(read("../app/game/race-mode-labels.ts")).not.toMatch(/from "[^"]*race-copy"/);
    expect(raceCopyLabels).toBe(RACE_MODE_LABELS);
  });
});
