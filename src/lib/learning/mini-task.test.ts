import { describe, expect, it } from "vitest";
import { foundationMiniTasks, miniTaskCopy } from "@/data/foundation-mini-tasks";
import { BOOTCAMP_LESSON_IDS } from "@/data/bootcamp-index";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";
import { renderAngleTask } from "./foundation-drawings";
import { emptyFoundation, readFoundationProgress, updateFoundationPractice } from "./foundation-progress";
import { boomForAngle, inNoGoZone, isTaskFinished, onTarget, shownWindAngle, signedWindAngle } from "./mini-task";

const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;

describe("in-lesson mini task", () => {
  it("counts targets one at a time, in order, only on the mark", () => {
    const task = foundationMiniTasks["wind-direction"];
    expect(onTarget(task, 0, task.start)).toBe(false);
    expect(onTarget(task, 0, 0)).toBe(true);
    expect(onTarget(task, 0, 90)).toBe(false);
    expect(onTarget(task, 1, 90)).toBe(true);
    expect(onTarget(task, 3, 180)).toBe(false);
    expect(isTaskFinished(task, task.targets.length - 1)).toBe(false);
    expect(isTaskFinished(task, task.targets.length)).toBe(true);
  });

  it("every task starts off its first mark, so opening the step never completes it", () => {
    for (const task of Object.values(foundationMiniTasks)) {
      expect(onTarget(task, 0, task.start)).toBe(false);
      for (const target of task.targets) {
        expect(target.angle).toBeGreaterThanOrEqual(task.min);
        expect(target.angle).toBeLessThanOrEqual(task.max);
      }
    }
  });

  it("names the wind angle the same on both sides of the boat", () => {
    expect(signedWindAngle(210)).toBe(-150);
    expect(shownWindAngle(210)).toBe(150);
    expect(shownWindAngle(-45)).toBe(45);
    expect(signedWindAngle(180)).toBe(180);
  });

  it("keeps the boom to leeward: it flips side only when bow or stern crosses the wind", () => {
    expect(boomForAngle(45)).toBeGreaterThan(0);
    expect(boomForAngle(-45)).toBeLessThan(0);
    expect(boomForAngle(179)).toBeGreaterThan(0);
    expect(boomForAngle(181)).toBeLessThan(0);
    // Same points as the points of sail drawing (22, 48, 75).
    expect(boomForAngle(45)).toBe(22);
    expect(boomForAngle(90)).toBe(48);
    expect(boomForAngle(135)).toBe(75);
  });

  it("the no-go wedge is the shared constant: the sail flaps inside, works at the edge", () => {
    expect(inNoGoZone(NO_GO_HALF_DEG - 1)).toBe(true);
    expect(inNoGoZone(NO_GO_HALF_DEG)).toBe(false);
    expect(boomForAngle(NO_GO_HALF_DEG - 1)).toBe(0);
    expect(boomForAngle(NO_GO_HALF_DEG)).not.toBe(0);
    // The close-hauled mark sits on the edge and is never met from inside the zone.
    const points = foundationMiniTasks["points-of-sail"];
    expect(points.targets[0].angle).toBe(NO_GO_HALF_DEG);
    expect(onTarget(points, 0, NO_GO_HALF_DEG - 1)).toBe(false);
    expect(onTarget(points, 0, NO_GO_HALF_DEG)).toBe(true);
    expect(onTarget(points, 0, NO_GO_HALF_DEG + 4)).toBe(true);
  });

  it("tacking and gybing really cross the wind", () => {
    const tack = foundationMiniTasks.tacking;
    expect(Math.sign(boomForAngle(tack.start))).not.toBe(Math.sign(boomForAngle(tack.targets[1].angle)));
    const gybe = foundationMiniTasks.jibing;
    expect(Math.sign(boomForAngle(gybe.start))).not.toBe(Math.sign(boomForAngle(gybe.targets[1].angle)));
  });

  it("is written in all seven languages, for known lessons only", () => {
    const texts: string[] = [...Object.values(miniTaskCopy).flatMap(label => LANGS.map(lang => label[lang]))];
    for (const [id, task] of Object.entries(foundationMiniTasks)) {
      expect(BOOTCAMP_LESSON_IDS).toContain(id);
      for (const lang of LANGS) { texts.push(task.done[lang]); for (const target of task.targets) texts.push(target.prompt[lang]); }
    }
    for (const text of texts) expect(text.trim().length).toBeGreaterThan(0);
  });

  it("draws the mark only while there is one", () => {
    const scene = { angle: 60, boom: 30, noGo: NO_GO_HALF_DEG, shownAngle: 60, windLabel: "Wind" };
    expect(renderAngleTask({ ...scene, target: 90 })).toMatch(/r="17"/);
    expect(renderAngleTask({ ...scene, target: null })).not.toMatch(/r="17"/);
  });

  it("stores the result, drops unknown ids, and leaves opening a section separate", () => {
    const done = updateFoundationPractice(emptyFoundation(), "tacking");
    expect(done.practiceDone).toEqual(["tacking"]);
    expect(done.practiceOpened).toEqual([]);
    expect(updateFoundationPractice(done, "tacking").practiceDone).toEqual(["tacking"]);
    expect(() => updateFoundationPractice(done, "unknown")).toThrow();
    const restored = readFoundationProgress(JSON.stringify({ ...done, practiceDone: ["tacking", "unknown"] }))!;
    expect(restored.practiceDone).toEqual(["tacking"]);
    // A progress file saved before this field existed still loads.
    const { practiceDone: _old, ...before } = done;
    expect(readFoundationProgress(JSON.stringify(before))!.practiceDone).toEqual([]);
  });
});
