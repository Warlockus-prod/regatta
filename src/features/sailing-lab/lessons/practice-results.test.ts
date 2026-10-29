import { describe, expect, it } from "vitest";
import { addAssessmentAttempt, ATTEMPT_RECORD_VERSION, emptyPracticeResults, mergePracticeResults, practiceSummary, readPracticeResults, saveMeasuredAttempt, type AssessmentAttempt, type PracticeStore } from "./practice-results";
import { parseStorageRequest, STORAGE_CHANNEL } from "../runtime/storage-protocol";

const attempt = (at: number, twistAfter = 6, depthAfter = .2): AssessmentAttempt => ({ at, baseline: { twist: 4, depth: .2, boom: 10 }, result: { twist: twistAfter, depth: depthAfter, boom: 10.3 } });
const memory = (): PracticeStore & { raw: string | null } => {
  const store = { raw: null as string | null, read: async () => store.raw, write: async (raw: string) => { store.raw = JSON.stringify(mergePracticeResults(readPracticeResults(store.raw), readPracticeResults(raw))); } };
  return store;
};

describe("practice results with measured attempts", () => {
  it("reads a legacy timestamp-only record as completed with one unmeasured attempt", () => {
    const legacy = readPracticeResults('{"version":1,"completed":{"twist":123}}');
    expect(legacy).toEqual({ version: 1, completed: { twist: 123 } });
    expect(practiceSummary(legacy, "twist")).toEqual({ completed: true, attempts: 1, record: null });
    expect(practiceSummary(legacy, "depth")).toEqual({ completed: false, attempts: 0, record: null });
  });
  it("versions each attempt record and drops damaged or unknown versions without losing the completion", () => {
    const stored = addAssessmentAttempt(emptyPracticeResults(), "twist", attempt(500));
    expect(stored.attempts?.twist?.version).toBe(ATTEMPT_RECORD_VERSION);
    expect(readPracticeResults(JSON.stringify(stored))).toEqual(stored);
    const future = JSON.stringify({ ...stored, attempts: { twist: { ...stored.attempts!.twist, version: 3 } } });
    expect(practiceSummary(readPracticeResults(future), "twist")).toEqual({ completed: true, attempts: 1, record: null });
    const broken = JSON.stringify({ version: 1, completed: {}, attempts: { depth: { version: 2, count: 1, last: { at: 9, baseline: { twist: 1, depth: 0, boom: 1 }, result: { twist: 1, depth: .1, boom: 1 } } }, exam: {} } });
    expect(readPracticeResults(broken)).toEqual(emptyPracticeResults());
  });
  it("keeps the bridge envelope that the native parser and older builds accept", () => {
    const raw = JSON.stringify(addAssessmentAttempt(emptyPracticeResults(), "depth", attempt(700)));
    expect(parseStorageRequest(JSON.stringify({ channel: STORAGE_CHANNEL, id: "p-1", action: "write", store: "practice", raw }))?.raw).toBe(raw);
    expect(JSON.parse(raw)).toMatchObject({ version: 1, completed: { depth: 700 } });
  });
  it("counts attempts, counts a legacy completion once and never counts a retried write twice", () => {
    const legacy = readPracticeResults('{"version":1,"completed":{"twist":100}}');
    const second = addAssessmentAttempt(legacy, "twist", attempt(200));
    expect(second.attempts?.twist).toMatchObject({ count: 2, last: { at: 200 } });
    expect(second.attempts?.twist?.previous).toBeUndefined();
    const third = addAssessmentAttempt(second, "twist", attempt(300, 7));
    expect(third.attempts?.twist).toMatchObject({ count: 3, last: { at: 300 }, previous: { at: 200 } });
    expect(addAssessmentAttempt(third, "twist", attempt(300, 7))).toBe(third);
    expect(mergePracticeResults(third, third).attempts?.twist?.count).toBe(3);
    expect(mergePracticeResults(second, third).attempts?.twist?.count).toBe(3);
    expect(mergePracticeResults(third, legacy).attempts?.twist?.count).toBe(3);
  });
  it("confirms a save only when the stored record holds the attempt", async () => {
    const store = memory();
    expect((await saveMeasuredAttempt("depth", attempt(10, 4, .15), store)).attempts).toBe(1);
    expect((await saveMeasuredAttempt("depth", attempt(20, 4, .14), store)).record?.previous?.at).toBe(10);
    expect((await saveMeasuredAttempt("depth", attempt(20, 4, .14), store)).attempts).toBe(2);
    const dropping: PracticeStore = { read: async () => null, write: async () => undefined };
    await expect(saveMeasuredAttempt("twist", attempt(30), dropping)).rejects.toThrow();
    const failing: PracticeStore = { read: async () => null, write: async () => { throw new Error("full"); } };
    await expect(saveMeasuredAttempt("twist", attempt(40), failing)).rejects.toThrow("full");
  });
});
