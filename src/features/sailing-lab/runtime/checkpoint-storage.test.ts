import { afterEach, describe, expect, it, vi } from "vitest";
import { checkpointStorage } from "./checkpoint-storage";
import { STORAGE_CHANNEL, TRAINER_STORAGE_KEY, parseStorageRequest } from "./storage-protocol";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("checkpoint storage transport", () => {
  it("reads and writes just the web checkpoint key, propagating quota failures", async () => {
    const localStorage = { getItem: vi.fn(() => "saved"), setItem: vi.fn() };
    vi.stubGlobal("window", { localStorage });
    expect(await checkpointStorage.read()).toBe("saved");
    await checkpointStorage.write("next");
    expect(localStorage.setItem).toHaveBeenCalledWith(TRAINER_STORAGE_KEY, "next");
    localStorage.setItem.mockImplementation(() => { throw new Error("quota"); });
    await expect(checkpointStorage.write("next")).rejects.toThrow("quota");
  });
  it("waits for a matching native acknowledgement and never falls back to web storage", async () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const postMessage = vi.fn();
    const localStorage = { setItem: vi.fn(), getItem: vi.fn() };
    vi.stubGlobal("window", Object.assign(target, { __REGATTA_SAILING_STORAGE__: true, ReactNativeWebView: { postMessage }, localStorage }));
    const pending = checkpointStorage.write("{}"), request = JSON.parse(postMessage.mock.calls[0][0]);
    target.dispatchEvent(new CustomEvent(STORAGE_CHANNEL, { detail: { id: "wrong", ok: true, raw: null } }));
    target.dispatchEvent(new CustomEvent(STORAGE_CHANNEL, { detail: { id: request.id, ok: true, raw: null } }));
    await expect(pending).resolves.toBeNull();
    const failed = checkpointStorage.read();
    const check = expect(failed).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(5000); await check;
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
  it("ignores invalid bridge operations and caller-supplied storage keys", () => {
    const request = { channel: STORAGE_CHANNEL, id: "request-1", action: "read", key: "secrets" };
    expect(parseStorageRequest(JSON.stringify(request))).toEqual({ channel: STORAGE_CHANNEL, id: "request-1", action: "read" });
    for (const change of [{ action: "delete" }, { id: "\";alert(1)" }, { channel: "other" }, { action: "write", raw: "{" }]) {
      expect(parseStorageRequest(JSON.stringify({ ...request, ...change }))).toBeNull();
    }
  });
});
