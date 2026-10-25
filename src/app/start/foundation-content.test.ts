import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BOOTCAMP_QUIZZES } from "@/data/bootcamp-quiz";
import { foundationCopy, foundationGuides, foundationModules } from "@/data/foundation-guide";
import { renderScene, windDirectionBoom, type SceneId, type SceneState } from "@/lib/learning/foundation-drawings";

const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
// Captured from the real pre-move cfc8a54 native exports. These fingerprints
// cover all translated strings, correct answers and rendered SVG bytes.
describe("foundation content relocation preserves the reviewed native source", () => {
  it("retains all 19 questions, stable IDs, option IDs and answer truth", () => {
    expect(Object.values(BOOTCAMP_QUIZZES).flat()).toHaveLength(19);
    expect(sha(BOOTCAMP_QUIZZES)).toBe("8364800f668704e3b309ea63be87728b7fc1df7b53d6e8ec2f5e98f486a01b46");
    expect(Object.fromEntries(Object.entries(BOOTCAMP_QUIZZES).map(([id, questions]) => [id, questions.map(question => ({ id: question.id, correct: question.options.filter(option => option.correct).map(option => option.id) }))]))).toEqual({"wind-direction": [{"id": "wd-q1", "correct": ["wd-q1-a"]}, {"id": "wd-q2", "correct": ["wd-q2-b"]}, {"id": "wd-q3", "correct": ["wd-q3-b"]}], "points-of-sail": [{"id": "pos-q1", "correct": ["pos-q1-b"]}, {"id": "pos-q2", "correct": ["pos-q2-a"]}, {"id": "pos-q3", "correct": ["pos-q3-b"]}], "how-sail-works": [{"id": "hs-q1", "correct": ["hs-q1-a"]}, {"id": "hs-q2", "correct": ["hs-q2-b"]}], "tacking": [{"id": "tk-q1", "correct": ["tk-q1-a"]}, {"id": "tk-q2", "correct": ["tk-q2-a"]}], "jibing": [{"id": "jb-q1", "correct": ["jb-q1-a"]}, {"id": "jb-q2", "correct": ["jb-q2-b"]}], "vmg-beating": [{"id": "vmg-q1", "correct": ["vmg-q1-a"]}, {"id": "vmg-q2", "correct": ["vmg-q2-b"]}], "simple-rules": [{"id": "sr-q1", "correct": ["sr-q1-a"]}, {"id": "sr-q2", "correct": ["sr-q2-b"]}, {"id": "sr-q3", "correct": ["sr-q3-a"]}], "mini-race": [{"id": "mr-q1", "correct": ["mr-q1-a"]}, {"id": "mr-q2", "correct": ["mr-q2-a"]}]});
  });
  it("retains shared teaching text and module order", () => {
    expect(sha({ guides: foundationGuides, copy: foundationCopy, modules: foundationModules })).toBe("7f8316e30db2e22513cb303b1d77da4b6af76997dda1b37ca3222588e95065e1");
  });
  it("keeps 60 original scene/theme/state outputs byte-identical, including the reviewed wind-side correction", () => {
    const ids: SceneId[] = ["wind-direction", "rig-basics", "points-of-sail", "how-sail-works", "tacking", "jibing", "vmg-beating", "simple-rules", "mini-race"];
    const outputs: string[] = [];
    for (const id of ids) for (const theme of ["paper", "instrument"] as const) for (const state of [0, 1, 2] as SceneState[]) {
      outputs.push(renderScene(id, state, theme));
      if (id === "wind-direction") outputs.push(renderScene(id, state, theme, { boom: windDirectionBoom[state] }));
    }
    expect(outputs).toHaveLength(60);
    expect(sha(outputs)).toBe("f5595c0df05fe2770a1da8d490703366bb6e85699e7354c5f7f9f2124e5cfd6a");
  });
});
