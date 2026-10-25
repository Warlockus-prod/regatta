import { TextEncoder } from "node:util";
import { canLeaveSternikExam, installSternikBridge, postSternikProgress } from "./bridge";

class MemoryStorage {
  values: Record<string, string> = {};
  getItem(key: string) { return this.values[key] ?? null; }
  setItem(key: string, value: string) { this.values[key] = String(value); }
  removeItem(key: string) { delete this.values[key]; }
}
const oldWindow = global.window;
const sent = jest.fn();
let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage(); sent.mockReset();
  Object.assign(global, { TextEncoder, window: { localStorage: storage, confirm: jest.fn(() => true), ReactNativeWebView: { postMessage: sent }, dispatchEvent: jest.fn() } });
  installSternikBridge();
});
afterAll(() => { Object.assign(global, { window: oldWindow }); });
const messages = () => sent.mock.calls.map(([raw]) => JSON.parse(raw));

test("answer writes persist immediately and deletion sends a complete replacement snapshot", () => {
  storage.setItem("sternik.progress.v1", '{"v":1,"q":{"question":{"correct":1}}}');
  expect(messages().at(-1)).toMatchObject({ type: "sternik-offline-progress", entries: { "sternik.progress.v1": expect.any(String), "sternik.explLang.v1": "pl" } });
  storage.setItem("regatta_sid", "private");
  postSternikProgress(true);
  expect(messages().at(-1).entries).not.toHaveProperty("regatta_sid");
  storage.removeItem("sternik.progress.v1");
  expect(messages().at(-1).entries).not.toHaveProperty("sternik.progress.v1");
});

test("exam navigation confirms before leaving and clears dirty state only after confirmation", () => {
  window.ReactNativeWebView?.postMessage('{"type":"exam-dirty","dirty":true}');
  (window.confirm as jest.Mock).mockReturnValueOnce(false);
  expect(canLeaveSternikExam()).toBe(false);
  expect(canLeaveSternikExam()).toBe(true);
  expect(messages().at(-1)).toEqual({ type: "exam-dirty", dirty: false });
  const calls = (window.confirm as jest.Mock).mock.calls.length;
  expect(canLeaveSternikExam()).toBe(true);
  expect(window.confirm).toHaveBeenCalledTimes(calls);
});
