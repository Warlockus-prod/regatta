jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { handleCheckpointMessage } from "../src/sailing/checkpoint-storage";
import { STORAGE_CHANNEL, TRAINER_STORAGE_KEY } from "../../src/features/sailing-lab/runtime/storage-protocol";
import { PRACTICE_RESULTS_KEY, addAssessmentAttempt, practiceSummary, readPracticeResults } from "../../src/features/sailing-lab/lessons/practice-results";

beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });
const message = (action: string, raw?: string) => JSON.stringify({ channel: STORAGE_CHANNEL, id: "test-1", action, raw });
const checkpoint = JSON.stringify({ version: 1, snapshot: "{}" });

it("acknowledges a native write only after storage finishes, and reads it on reentry", async () => {
  const reply = jest.fn();
  await handleCheckpointMessage(message("write", checkpoint), reply);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(TRAINER_STORAGE_KEY, checkpoint);
  expect(reply).toHaveBeenCalledWith(expect.stringContaining('"ok":true'));
  await handleCheckpointMessage(message("read"), reply);
  expect(reply).toHaveBeenLastCalledWith(expect.stringContaining(JSON.stringify(checkpoint)));
});

it("reports a write failure and leaves the preceding save intact", async () => {
  await AsyncStorage.setItem(TRAINER_STORAGE_KEY, checkpoint);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("full"));
  const reply = jest.fn();
  await handleCheckpointMessage(message("write", JSON.stringify({ version: 1, snapshot: "new" })), reply);
  expect(reply).toHaveBeenCalledWith(expect.stringContaining('"ok":false'));
  expect(await AsyncStorage.getItem(TRAINER_STORAGE_KEY)).toBe(checkpoint);
});

it("reports the actual durable outcome only after completion and isolates observer failure from the ACK", async () => {
  let complete!: () => void;
  const delay = new Promise<void>(resolve => { complete = resolve; });
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async () => { await delay; });
  const reply = jest.fn(), result = jest.fn();
  const saving = handleCheckpointMessage(message("write", checkpoint), reply, result);
  await Promise.resolve(); await Promise.resolve();
  expect(result).not.toHaveBeenCalled(); expect(reply).not.toHaveBeenCalled();
  complete(); await saving;
  expect(result).toHaveBeenCalledWith("write", true);
  expect(reply).toHaveBeenCalledWith(expect.stringContaining('"ok":true'));
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("PRIVATE_STORAGE_READ"));
  const brokenObserver = jest.fn(() => { throw new Error("PRIVATE_OBSERVER"); });
  await expect(handleCheckpointMessage(message("read"), reply, brokenObserver)).resolves.toBe(true);
  expect(brokenObserver).toHaveBeenCalledWith("read", false);
  expect(reply).toHaveBeenLastCalledWith(expect.stringContaining('"ok":false'));
  expect(reply).not.toHaveBeenLastCalledWith(expect.stringContaining("PRIVATE_"));
  await handleCheckpointMessage("{", reply, result);
  expect(result).toHaveBeenCalledTimes(1);
});

it("does not execute malformed messages or storage operations outside the contract", async () => {
  const reply = jest.fn();
  for (const raw of ["{", message("delete"), message("write", "x".repeat(65537))]) {
    expect(await handleCheckpointMessage(raw, reply)).toBe(false);
  }
  expect(reply).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it("merges concurrent practice results without changing the trainer checkpoint", async () => {
  await AsyncStorage.setItem(TRAINER_STORAGE_KEY, checkpoint);
  const reply = jest.fn();
  const request = (completed: object) => JSON.stringify({ channel: STORAGE_CHANNEL, id: "practice-1", store: "practice", action: "write", raw: JSON.stringify({ version: 1, completed }) });
  await Promise.all([handleCheckpointMessage(request({ twist: 100 }), reply), handleCheckpointMessage(request({ depth: 200 }), reply)]);
  expect(JSON.parse((await AsyncStorage.getItem(PRACTICE_RESULTS_KEY))!).completed).toEqual({ twist: 100, depth: 200 });
  expect(await AsyncStorage.getItem(TRAINER_STORAGE_KEY)).toBe(checkpoint);
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("full"));
  await handleCheckpointMessage(request({ mainsheet: 300 }), reply);
  expect(reply).toHaveBeenLastCalledWith(expect.stringContaining('"ok":false'));
  expect(JSON.parse((await AsyncStorage.getItem(PRACTICE_RESULTS_KEY))!).completed).toEqual({ twist: 100, depth: 200 });
});

it("keeps measured assessment attempts over the unchanged bridge and never double counts a retry", async () => {
  await AsyncStorage.setItem(PRACTICE_RESULTS_KEY, JSON.stringify({ version: 1, completed: { twist: 100 } }));
  const reply = jest.fn();
  const measured = (at: number) => addAssessmentAttempt(readPracticeResults(JSON.stringify({ version: 1, completed: { twist: 100 } })), "twist", { at, baseline: { twist: 4, depth: .2, boom: 10 }, result: { twist: 5.5, depth: .2, boom: 10.2 } });
  const write = JSON.stringify({ channel: STORAGE_CHANNEL, id: "practice-2", store: "practice", action: "write", raw: JSON.stringify(measured(300)) });
  await handleCheckpointMessage(write, reply);
  await handleCheckpointMessage(write, reply);
  expect(reply).toHaveBeenLastCalledWith(expect.stringContaining('"ok":true'));
  const stored = readPracticeResults(await AsyncStorage.getItem(PRACTICE_RESULTS_KEY));
  expect(practiceSummary(stored, "twist")).toMatchObject({ completed: true, attempts: 2, record: { last: { at: 300 } } });
  expect(stored.completed.twist).toBe(300);
});
