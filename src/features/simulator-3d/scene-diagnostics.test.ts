import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDiagnosticBatch } from "@/lib/diagnostics";
import { recordSceneLifecycle } from "./scene-diagnostics";

const { record } = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: record }));
beforeEach(() => { record.mockReset(); vi.stubGlobal("window", { location: { pathname: "/game", search: "" } }); });
afterEach(() => vi.unstubAllGlobals());

describe("bounded actual scene stages", () => {
  it("maps an installed route without retaining its file URL or injected query", () => {
    vi.stubGlobal("window", { location: { pathname: "/private/device/sailing.html" },
      __REGATTA_EMBED__: { path: "/game", query: "private-value" } });
    recordSceneLifecycle("renderer", "begin", "empty");
    recordSceneLifecycle("renderer", "ready", "sized");
    recordSceneLifecycle("model", "ready");
    recordSceneLifecycle("frame", "begin");
    recordSceneLifecycle("frame", "waiting");
    recordSceneLifecycle("asset", "begin");
    recordSceneLifecycle("decode", "ready");
    const events = record.mock.calls.map(([event]) => event);
    expect(parseDiagnosticBatch({ version: 1, events })?.events).toEqual(events);
    expect(events.every(event => event.surface === "race")).toBe(true);
    expect(events[4]).toMatchObject({ action: "waiting", outcome: "noop" });
    expect(JSON.stringify(events)).not.toMatch(/private|device|query|sailing.html/);
  });

  it("retains renderer failures as finite scene-load outcomes", () => {
    recordSceneLifecycle("renderer", "error", "sized");
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ stage: "renderer", action: "error", reason: "scene-load", outcome: "failed" }));
  });

  it("does not interrupt startup when diagnostics or route reads fail", () => {
    record.mockImplementation(() => { throw Error("unavailable"); });
    expect(() => recordSceneLifecycle("scene", "begin")).not.toThrow();
    vi.stubGlobal("window", { get __REGATTA_EMBED__() { throw Error("unavailable"); } });
    expect(() => recordSceneLifecycle("scene", "begin")).not.toThrow();
  });

  it("is inert without a browser", () => {
    vi.stubGlobal("window", undefined); recordSceneLifecycle("renderer", "begin");
    expect(record).not.toHaveBeenCalled();
  });

  it.each([{ stage: "raw-error" }, { viewport: "390x740" }, { url: "private" }])("rejects noncanonical phase fields %j", extra => {
    const event = { type: "embedded.lifecycle", surface: "race", action: "begin", outcome: "accepted", ...extra };
    expect(parseDiagnosticBatch({ version: 1, events: [event] })).toBeNull();
  });
});
