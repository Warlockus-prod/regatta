import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BOOTCAMP_QUIZZES } from "@/data/bootcamp-quiz";
import { foundationCopy, foundationGuides, foundationModules } from "@/data/foundation-guide";
import { foundationWindLesson, windDirectionScene } from "@/data/foundation-wind";
import { renderScene, windDirectionBoom, type SceneId, type SceneState } from "@/lib/learning/foundation-drawings";

const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
// Captured from the real pre-move cfc8a54 native exports. These fingerprints
// cover all translated strings, correct answers and rendered SVG bytes.
describe("foundation content relocation preserves the reviewed native source", () => {
  it("retains all 19 questions, stable IDs, option IDs and answer truth", () => {
    expect(Object.values(BOOTCAMP_QUIZZES).flat()).toHaveLength(19);
    // Package 7: the no-go and close-hauled answers state NO_GO_HALF_DEG (was 45 / ~90); ids and answers below unchanged.
    // Package 12 (audit B3, expert C3-C4): new lesson 1 questions, fair distractors, VMG/VMC and COLREGS wording; ids and answers below unchanged (beginner-terms.test.ts).
    expect(sha(BOOTCAMP_QUIZZES)).toBe("d4efad49eea4bdc4a3fc9b82293fd5cfce5f7d97238fdfc47546455da89a3aae");
    expect(Object.fromEntries(Object.entries(BOOTCAMP_QUIZZES).map(([id, questions]) => [id, questions.map(question => ({ id: question.id, correct: question.options.filter(option => option.correct).map(option => option.id) }))]))).toEqual({"wind-direction": [{"id": "wd-q1", "correct": ["wd-q1-a"]}, {"id": "wd-q2", "correct": ["wd-q2-b"]}, {"id": "wd-q3", "correct": ["wd-q3-b"]}], "points-of-sail": [{"id": "pos-q1", "correct": ["pos-q1-b"]}, {"id": "pos-q2", "correct": ["pos-q2-a"]}, {"id": "pos-q3", "correct": ["pos-q3-b"]}], "how-sail-works": [{"id": "hs-q1", "correct": ["hs-q1-a"]}, {"id": "hs-q2", "correct": ["hs-q2-b"]}], "tacking": [{"id": "tk-q1", "correct": ["tk-q1-a"]}, {"id": "tk-q2", "correct": ["tk-q2-a"]}], "jibing": [{"id": "jb-q1", "correct": ["jb-q1-a"]}, {"id": "jb-q2", "correct": ["jb-q2-b"]}], "vmg-beating": [{"id": "vmg-q1", "correct": ["vmg-q1-a"]}, {"id": "vmg-q2", "correct": ["vmg-q2-b"]}], "simple-rules": [{"id": "sr-q1", "correct": ["sr-q1-a"]}, {"id": "sr-q2", "correct": ["sr-q2-b"]}, {"id": "sr-q3", "correct": ["sr-q3-a"]}], "mini-race": [{"id": "mr-q1", "correct": ["mr-q1-a"]}, {"id": "mr-q2", "correct": ["mr-q2-a"]}]});
  });
  it("retains the seven existing guides and module order while adding the reviewed first lesson", () => {
    const { "wind-direction": wind, ...previousGuides } = foundationGuides;
    // Package 10 changed one spelling only (the one UI dictionary writes "ещё раз"); undo it and the reviewed bytes match.
    const reviewed = JSON.stringify({ guides: previousGuides, copy: foundationCopy, modules: foundationModules });
    expect(reviewed).toContain("Попробуй ещё раз перед выходом");
    expect(createHash("sha256").update(reviewed.split("Попробуй ещё раз перед выходом").join("Попробуй еще раз перед выходом")).digest("hex")).toBe("7f8316e30db2e22513cb303b1d77da4b6af76997dda1b37ca3222588e95065e1");
    expect(wind.goal).toBe(foundationWindLesson.goal);
    expect(wind.explanation).toBe(foundationWindLesson.explanation);
    expect(wind.states).toEqual(windDirectionScene.states.map(state => state.label));
    expect(wind.notes).toEqual(windDirectionScene.states.map(state => state.note));
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
      for (const label of [wind.goal, wind.situation!, ...wind.explanation!, ...wind.states, ...wind.notes, ...wind.legend, wind.limit]) {
        expect(label[lang].trim()).not.toBe("");
        if (lang !== "ru") expect(label[lang]).not.toMatch(/[А-Яа-яЁё]/);
      }
    }
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
