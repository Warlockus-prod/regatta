import { describe, expect, it } from "vitest";
import { coachFrom } from "./useSailingSim";

type Diag = Parameters<typeof coachFrom>[2];
const diag = (d: Partial<{ mainAoA: number; jibAoA: number; mainStalled: boolean; jibStalled: boolean }>) =>
  ({ mainAoA: 15, jibAoA: 15, mainStalled: false, jibStalled: false, ...d }) as unknown as Diag;

// Contract (owner decision 2026-10-19): every trim hint names the sheet to touch.
describe("3D coach names the sheet", () => {
  it("main luffing only asks for the mainsheet", () => {
    expect(coachFrom(90, 5, diag({ mainAoA: 3 }), 0.5)).toBe("luffMain");
  });
  it("jib luffing only asks for the jib sheet", () => {
    expect(coachFrom(90, 5, diag({ jibAoA: 3 }), 0.5)).toBe("luffJib");
  });
  it("both luffing asks for both sheets", () => {
    expect(coachFrom(60, 5, diag({ mainAoA: 2, jibAoA: 2 }), 0.2)).toBe("luffBoth");
  });
  it("a sail flying past the wind (incidence below 1) is reported as luffing on that sail", () => {
    expect(coachFrom(90, 5, diag({}), 0.9, { main: 0.5, jib: 20 })).toBe("luffMain");
    expect(coachFrom(90, 5, diag({}), 0.9, { main: 20, jib: 0.2 })).toBe("luffJib");
  });
  it("stalls name the stalled sail", () => {
    expect(coachFrom(70, 5, diag({ mainStalled: true }), 0.3)).toBe("stallMain");
    expect(coachFrom(70, 5, diag({ jibStalled: true }), 0.3)).toBe("stallJib");
    expect(coachFrom(70, 5, diag({ mainStalled: true, jibStalled: true }), 0.1)).toBe("stallBoth");
  });
  it("deep downwind drag mode is not a stall error", () => {
    expect(coachFrom(160, 5, diag({ mainStalled: true, jibStalled: true }), 0.5)).toBe("run");
  });
  it("good trim stays good", () => {
    expect(coachFrom(90, 6, diag({}), 0.8)).toBe("good");
  });
});
