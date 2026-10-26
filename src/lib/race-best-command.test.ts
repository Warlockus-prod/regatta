import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, physicalRaceContext } from "./race-context";
import { makeStandardCourse } from "./race-physics";
import { makePhysicalRaceCourse } from "./race-courses";
import { createPendingNativeBestCommands, nativeBestFailure, NATIVE_BEST_PENDING_LIMIT,
  planNativeBestCommand, readNativeBestCommand, readNativeBestReply, type NativeBestCommand } from "./race-best-command";

const command = (): NativeBestCommand => ({ schema: 1, id: "finished-1", requestId: "finished-1_pb_1",
  comparison: { raceContext: LEGACY_RACE_CONTEXT, mode: "pro", difficulty: "easy", windStrength: "light" },
  rawFinishTimeSec: 100, penaltySeconds: 5, finishTimeSec: 105, course: makeStandardCourse() });
const key = "pro:easy-light";

describe("native PB command boundary", () => {
  it("requires explicit provenance and mode without classifying old absent metadata", () => {
    expect(readNativeBestCommand(command())).toEqual(command());
    for (const context of [undefined, null, { ...LEGACY_RACE_CONTEXT, model: "future" }]) {
      expect(readNativeBestCommand({ ...command(), comparison: { ...command().comparison, raceContext: context } })).toBeNull();
    }
    expect(readNativeBestCommand({ ...command(), comparison: { ...command().comparison, mode: undefined } })).toBeNull();
    expect(readNativeBestCommand({ ...command(), futureMode: true })).toBeNull();
    expect(readNativeBestCommand({ ...command(), comparison: { ...command().comparison, classId: "future" } })).toBeNull();
  });
  it("checks adjusted time, bounded IDs, canonical geometry and finite input", () => {
    for (const change of [{ finishTimeSec: 100 }, { rawFinishTimeSec: NaN }, { penaltySeconds: -1 }, { id: "<script>" }, { requestId: "x".repeat(101) }, { course: { ...makeStandardCourse(), marks: [] } }, { extra: "x".repeat(8192) }]) {
      expect(readNativeBestCommand({ ...command(), ...change })).toBeNull();
    }
    expect(readNativeBestCommand({ ...command(), course: { ...makeStandardCourse(), marks: makeStandardCourse().marks.map(m => ({ ...m, label: "Translated" })) } })).not.toBeNull();
  });
  it("reads a physical class but never emits it while the writer gate is off", () => {
    const context = physicalRaceContext("short");
    const input = { ...command(), comparison: { ...command().comparison, raceContext: context }, course: makePhysicalRaceCourse("short") };
    const valid = readNativeBestCommand(input);
    expect(valid).not.toBeNull();
    expect(planNativeBestCommand({}, valid!, 123)).toMatchObject({ kind: "settled", reply: { status: "failed", reason: "disabled", newRecord: false } });
  });
});

describe("durable PB planning", () => {
  it.each(["simple", "pro"] as const)("keeps every historical %s condition in its own existing bucket", mode => {
    const store: Record<string, unknown> = {};
    for (const difficulty of ["easy", "medium", "hard"] as const) for (const windStrength of ["light", "medium", "heavy"] as const) {
      const input = { ...command(), comparison: { ...command().comparison, mode, difficulty, windStrength } };
      const plan = planNativeBestCommand(store, input, 123); if (plan.kind !== "write") throw Error("Expected independent bucket");
      Object.assign(store, JSON.parse(plan.serialized));
      const bucket = `${mode === "pro" ? "pro:" : ""}${difficulty}-${windStrength}`;
      expect(store[bucket]).toMatchObject({ timeSec: 105, nativeReceipt: { raceId: command().id } });
    }
    expect(Object.keys(store)).toHaveLength(9);
  });
  it("keeps unknown and legacy buckets while planning a receipt in the same row", () => {
    const store = { "easy-light": { timeSec: 80, ts: 1 }, future: { opaque: true } };
    const before = JSON.stringify(store); const plan = planNativeBestCommand(store, command(), 123);
    expect(JSON.stringify(store)).toBe(before);
    expect(plan.kind).toBe("write");
    if (plan.kind !== "write") return;
    expect(JSON.parse(plan.serialized)).toEqual({ ...store, [key]: { timeSec: 105, ts: 123, nativeReceipt: { schema: 1, raceId: "finished-1", rawFinishTimeSec: 100, penaltySeconds: 5 } } });
    expect(plan.replyAfterWrite).toMatchObject({ status: "saved", newRecord: true, currentBest: { timeSec: 105, ts: 123 } });
    expect(plan.replyAfterWrite.currentBest).not.toHaveProperty("nativeReceipt");
  });
  it("confirms a lost ACK without another write or losing the original timestamp", () => {
    const first = planNativeBestCommand({}, command(), 123);
    if (first.kind !== "write") throw Error("Expected plan");
    const retry = planNativeBestCommand(JSON.parse(first.serialized), { ...command(), requestId: "retry_2" }, 999);
    expect(retry).toMatchObject({ kind: "settled", reply: { status: "saved", newRecord: true, requestId: "retry_2", currentBest: { timeSec: 105, ts: 123 } } });
    expect(retry).not.toHaveProperty("serialized");
  });
  it("rejects reusing a receipt with changed raw finish or penalty even for the same total", () => {
    const first = planNativeBestCommand({}, command(), 123);
    if (first.kind !== "write") throw Error("Expected plan");
    const changed = { ...command(), rawFinishTimeSec: 103, penaltySeconds: 2 };
    expect(planNativeBestCommand(JSON.parse(first.serialized), changed, 999)).toMatchObject({ kind: "settled", reply: { status: "failed", reason: "invalid-input", newRecord: false } });
  });
  it("keeps a better concurrent result and does not announce the older result as a record", () => {
    expect(planNativeBestCommand({ [key]: { timeSec: 90, ts: 2 } }, command(), 123)).toMatchObject({ kind: "settled", reply: { status: "unchanged", newRecord: false, currentBest: { timeSec: 90, ts: 2 } } });
  });
  it("rejects malformed target rows and unsupported receipts without replacing stored data", () => {
    for (const store of [null, [], { [key]: "broken" }, { [key]: { timeSec: 120, ts: 1, nativeReceipt: { schema: 2, raceId: "future" } } }]) {
      const before = JSON.stringify(store); const plan = planNativeBestCommand(store, command(), 123);
      expect(plan).toMatchObject({ kind: "settled", reply: { status: "failed", reason: "storage-invalid", newRecord: false } });
      expect(JSON.stringify(store)).toBe(before);
    }
  });
  it("bounds the complete store including its receipt", () => {
    expect(planNativeBestCommand({ future: "x".repeat(15980) }, command(), 123)).toMatchObject({ kind: "settled", reply: { status: "failed", reason: "limit", newRecord: false } });
  });
});

describe("actual attempt correlation", () => {
  it("waits for an ACK, ignores other buckets and IDs, and settles a result once", () => {
    const pending = createPendingNativeBestCommands(); expect(pending.add(command())).toBe(true);
    const request = pending.request(command().id)!; expect(pending.request(command().id)).toBeNull();
    const plan = planNativeBestCommand({}, request, 123); if (plan.kind !== "write") throw Error("Expected plan");
    for (const change of [{ id: "other" }, { comparisonKey: "easy-light" }, { requestId: "older" }, { currentBest: { timeSec: 80, ts: 123 } }, { newRecord: false }]) {
      expect(pending.settle({ ...plan.replyAfterWrite, ...change })).toBeNull();
    }
    expect(pending.waiting(command().id)).toEqual(request);
    expect(pending.settle(plan.replyAfterWrite)).toEqual(plan.replyAfterWrite);
    expect(pending.settle(plan.replyAfterWrite)).toBeNull(); expect(pending.size()).toBe(0);
  });
  it("keeps a failure retryable and rejects its delayed success after a newer attempt", () => {
    const pending = createPendingNativeBestCommands(); pending.add(command());
    const first = pending.request(command().id)!;
    const old = planNativeBestCommand({}, first, 123); if (old.kind !== "write") throw Error("Expected plan");
    expect(pending.settle(nativeBestFailure(first, "timeout"))).toMatchObject({ status: "failed" });
    expect(pending.settle(old.replyAfterWrite)).toBeNull();
    const second = pending.request(command().id)!; expect(second.requestId).not.toBe(first.requestId);
    expect(pending.settle(old.replyAfterWrite)).toBeNull();
    const confirmed = planNativeBestCommand(JSON.parse(old.serialized), second, 999);
    if (confirmed.kind !== "settled") throw Error("Expected receipt");
    expect(pending.settle(confirmed.reply)).toMatchObject({ status: "saved", currentBest: { ts: 123 } });
  });
  it("does not permit a failed reply to announce a record or expose arbitrary reasons", () => {
    const request = command(); const failure = nativeBestFailure(request, "storage-write");
    expect(readNativeBestReply(failure, request)).toEqual(failure);
    expect(readNativeBestReply({ ...failure, newRecord: true }, request)).toBeNull();
    expect(readNativeBestReply({ ...failure, reason: "raw error or transcript" }, request)).toBeNull();
    expect(readNativeBestReply({ ...failure, arbitrary: "PRIVATE_TRANSCRIPT" }, request)).toBeNull();
  });
  it("keeps independent finished results and protects its immutable input from callers", () => {
    const pending = createPendingNativeBestCommands(); const input = command(); pending.add(input);
    input.course.marks[0].pos.x += 10;
    const request = pending.request(command().id)!; expect(request.course).toEqual(command().course);
    request.course.marks[0].pos.x += 20;
    const copy = pending.waiting(command().id)!; expect(copy.course).toEqual(command().course);
    copy.course.marks[0].pos.x += 20;
    expect(pending.waiting(command().id)?.course).toEqual(command().course);
    expect(pending.add({ ...command(), id: "finished-2" })).toBe(true);
    expect(pending.has("finished-1")).toBe(true); expect(pending.has("finished-2")).toBe(true);
  });
  it("bounds pending work without silently discarding an unacknowledged result", () => {
    const pending = createPendingNativeBestCommands();
    for (let i = 0; i < NATIVE_BEST_PENDING_LIMIT; i++) expect(pending.add({ ...command(), id: `finished-${i}` })).toBe(true);
    expect(pending.add({ ...command(), id: "overflow" })).toBe(false);
    expect(pending.has("finished-0")).toBe(true); expect(pending.size()).toBe(NATIVE_BEST_PENDING_LIMIT);
  });
});
