import { describe, expect, it } from "vitest";
import { diagnosticDestination, diagnosticSurface } from "./diagnostic-destination";
describe("diagnostic route projection", () => {
  it.each([["/", "home"], ["/practice", "practice"], ["/start", "course"], ["/learn/sails/private-lesson", "sails"], ["/r/private-replay-code", "replay"], ["/kursy/radio/symulator?private=secret", "radio-practice"], ["/radio/obsluga#private", "radio-practice"], ["/radio/teoria", "radio"], ["/kursy/motorowodny/egzamin", "motor"], ["/replay/private-user-id", "replay"], ["/simulator-v3", "trainer"], ["/simulator2", "boat"], ["/simulator", "basics"], ["/courses/private-id", "course"], ["/game", "solo"], ["/settings", "settings"], ["/unknown-private-value", "unknown"]])("maps %s to a fixed identifier", (path, expected) => { expect(diagnosticDestination(path)).toBe(expected); });
  it("uses host surfaces with no dynamic route data", () => {
    expect(diagnosticSurface("/game")).toBe("race");
    expect(diagnosticSurface("/kursy/motorowodny/private-id")).toBe("sternik");
    expect(diagnosticSurface("/private-secret")).toBe("app");
  });
});
