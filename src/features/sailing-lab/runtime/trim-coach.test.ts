import { describe, expect, it } from "vitest";
import type { TickDiagnostics } from "@/lib/sailing-physics/types";
import { coachFrom, trimQualityFrom } from "./trim-coach";

const diag: TickDiagnostics = { aws: 12, awa: 60, mainAoA: 16, jibAoA: 16,
  mainStalled: false, jibStalled: false, slotHealth: 1, drive: 2000, side: 0, vmg: 2 };

describe("shared trim coaching", () => {
  it("scores the set sail alone rather than penalizing a missing sail or slot", () => {
    const jibOnly = { ...diag, mainAoA: 0, mainStalled: true, slotHealth: 0 };
    expect(trimQualityFrom(90, jibOnly, { main: false, jib: true })).toBe(1);
    expect(coachFrom(90, 5, jibOnly, 1, { main: 0, jib: 16 }, { main: false, jib: true })).toBe("good");
    expect(trimQualityFrom(90, diag, { main: false, jib: false })).toBe(0);
  });

  it("scores useful drag downwind without stall penalties", () => {
    const drag = { ...diag, mainAoA: 90, jibAoA: 90, mainStalled: true, jibStalled: true };
    expect(trimQualityFrom(160, drag)).toBe(1);
    expect(coachFrom(160, 5, drag, 1)).toBe("run");
    expect(coachFrom(140, 5, drag, 1, { main: 0, jib: 0 })).toBe("good");
  });
});
