import { describe, expect, it } from "vitest";
import { appendAdsPreview, ADS_PREVIEW_LIMIT, type AdsPreviewEvent } from "./ads-preview";
import { parseDiagnosticBatch } from "./diagnostics";
import { diagnosticDestination, diagnosticSurface } from "./diagnostic-destination";

const open = { action: "open" as const, outcome: "accepted" as const, scene: "gocek" as const, camera: "whole" as const, fov: 60 as const };
describe("Ads local preview boundary", () => {
  it("records real preview actions in an immutable bounded session without SDK events", () => {
    let events: readonly AdsPreviewEvent[] = [];
    for (let i = 0; i < 100; i++) events = appendAdsPreview(events, { ...open, action: "camera" });
    expect(events).toHaveLength(ADS_PREVIEW_LIMIT);
    expect(events[0].seq).toBe(61); expect(events[39].seq).toBe(100);
    expect(events.every(e => e.source === "preview")).toBe(true);
    expect(Object.isFrozen(events) && Object.isFrozen(events[0])).toBe(true);
  });
  it.each([{ ...open, action: "impression" }, { ...open, source: "sdk" }, { ...open, adUnitId: "private" }, { ...open, rawError: "private" }, { ...open, scene: "unknown" }, { ...open, fov: NaN }, { ...open, action: "show" }, { ...open, action: "hide", placement: "unknown" }, null])("rejects unrecognized, private or SDK data instead of fabricating a signal", value => {
    const events = appendAdsPreview([], open);
    expect(appendAdsPreview(events, value as never)).toBe(events);
  });
  it("shows/hides only fixed placement tokens and never changes previous rows", () => {
    const events = appendAdsPreview([], open);
    const next = appendAdsPreview(events, { ...open, action: "show", placement: "bow-board" });
    expect(events).toHaveLength(1); expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ ...open, action: "show", placement: "bow-board", source: "preview", seq: 2 });
  });
  it("maps the native route and accepts only finite, private-free diagnostic fields", () => {
    expect(diagnosticDestination("/ads?private=value")).toBe("ads"); expect(diagnosticSurface("/ads")).toBe("ads");
    const event = { type: "ads.preview", surface: "ads", action: "show", outcome: "accepted", placement: "bow-board", scene: "open", camera: "high", fov: 90 };
    expect(parseDiagnosticBatch({ version: 1, events: [event] })?.events).toHaveLength(1);
    for (const extra of [{ action: "impression" }, { fov: 12 }, { placement: "external-placement" }, { adUnitId: "private" }, { rawError: "private" }]) {
      expect(parseDiagnosticBatch({ version: 1, events: [{ ...event, ...extra }] })).toBeNull();
    }
  });
});
