import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bootcampLessons } from "../../data/bootcamp";
import { sailLessons } from "../../data/sailing-lab/course";
import { bookmarkForPath, readLearningBookmark } from "./learning-bookmark";

const src = resolve(__dirname, "../..");
const staticImport = /^\s*(?:import|export)\s+(?!type\b)[^'"]*?\bfrom\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;
function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(src, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) return candidate;
  }
  return null;
}
/** Every source file the entry pulls in through static imports (next/dynamic and import() are not followed). */
function staticGraph(entry: string): Set<string> {
  const seen = new Set<string>(); const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(staticImport)) {
      const next = resolveImport(file, match[1] ?? match[2]);
      if (next) queue.push(next);
    }
  }
  return seen;
}
const rel = (files: Set<string>) => [...files].map(file => file.slice(src.length + 1));

// Every page loads the root layout. The lesson text and quizzes (about 330 KB of
// chunk) belong to the course pages, not to the bookmark, the lesson footer and
// the lesson return link, which need ids, heads, routes and the answer key.
describe("root layout stays free of lesson data", () => {
  const heavy = ["data/sailing-lab/course.ts", "data/bootcamp.ts", "data/bootcamp-quiz.ts"];
  it("Navigation, the lesson footer and the return link reach no lesson text", () => {
    for (const [entry, light] of [
      ["components/Navigation.tsx", "lib/product/learning-bookmark.ts"],
      ["components/BootcampFooterNav.tsx", "data/bootcamp-quiz-key.ts"],
      ["components/FoundationReturn.tsx", "data/bootcamp-index.ts"],
    ]) {
      const graph = rel(staticGraph(join(src, entry)));
      expect(graph, entry).toContain(light);
      for (const file of heavy) expect(graph, `${entry} -> ${file}`).not.toContain(file);
    }
  });
  it("the whole root layout reaches no lesson text", () => {
    const graph = rel(staticGraph(join(src, "app/layout.tsx")));
    expect(graph).toEqual(expect.arrayContaining(["components/Navigation.tsx", "components/BootcampFooterNav.tsx", "lib/learning/foundation-progress.ts"]));
    for (const file of heavy) expect(graph, file).not.toContain(file);
  });
  it("the walker does see the data when it is imported statically", () => {
    expect(rel(staticGraph(join(src, "app/start/FoundationClient.tsx")))).toEqual(expect.arrayContaining(["data/bootcamp.ts", "data/bootcamp-quiz.ts"]));
    expect(rel(staticGraph(join(src, "lib/product/learning.ts")))).toContain("data/sailing-lab/course.ts");
  });
});

describe("learning bookmark from ids only", () => {
  it("recognises every sail lesson and, natively, every foundation lesson", () => {
    for (const lesson of sailLessons) for (const platform of ["web", "native"] as const) {
      expect(bookmarkForPath(`/learn/sails/${lesson.id}/?x=1#y`, platform)).toEqual({ version: 1, course: "sails", lesson: lesson.id });
    }
    for (const lesson of bootcampLessons) {
      expect(bookmarkForPath(`/bootcamp/${lesson.id}`, "native")).toEqual({ version: 1, course: "course", lesson: lesson.id });
      expect(bookmarkForPath(`/bootcamp/${lesson.id}`, "web")).toBeNull();
    }
  });
  it("keeps a saved lesson only if it exists in its own course", () => {
    expect(readLearningBookmark(JSON.stringify({ version: 1, course: "sails", lesson: sailLessons[3].id }))?.lesson).toBe(sailLessons[3].id);
    expect(readLearningBookmark(JSON.stringify({ version: 1, course: "course", lesson: bootcampLessons[2].id }))?.lesson).toBe(bootcampLessons[2].id);
    expect(readLearningBookmark(JSON.stringify({ version: 1, course: "course", lesson: sailLessons[0].id }))?.lesson).toBeNull();
    expect(readLearningBookmark(JSON.stringify({ version: 1, course: "radio", lesson: bootcampLessons[0].id }))?.lesson).toBeNull();
  });
});
