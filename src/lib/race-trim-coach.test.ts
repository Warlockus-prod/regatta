import { describe, expect, it } from "vitest";
import { raceTrimCoach } from "./race-trim-coach";
import { raceTrim, type RaceBoat } from "./race-physics";
import { createInitialState, getBoatParams, trimForDrive, twaFromCompass, type Controls } from "./sailing-physics";
import { createSailingSession } from "@/features/sailing-lab/runtime/session";
import { coachFrom, trimQualityFrom } from "@/features/sailing-lab/runtime/trim-coach";

const PARAMS = getBoatParams();
const boat = (heading = 90, trim: Partial<Controls> = {}): RaceBoat => ({
  id: "p", name: "Player", color: "#fff", pos: { x: 400, y: 600 }, heading, speed: 5, lapDone: 0,
  physics: createInitialState({ tws: 12, heading, boatSpeed: 5 }), trim: raceTrim(trim),
});
const optimum = (b: RaceBoat) => trimForDrive(b.physics!, b.trim!);

describe("live race Pro trim coach", () => {
  it("names the overtrimmed sheet immediately without advancing the boat", () => {
    const b = boat();
    b.trim = optimum(b);
    expect(raceTrimCoach(b)).toBe("good");
    b.trim.mainSheet = 1;
    expect(raceTrimCoach(b)).toBe("stallMain");
    b.trim = { ...optimum(b), jibSheet: 1 };
    expect(raceTrimCoach(b)).toBe("stallJib");
    b.trim = { ...b.trim, mainSheet: 1 };
    expect(raceTrimCoach(b)).toBe("stallBoth");
  });

  it("uses signed incidence to name an over-eased sail rather than reporting its absolute AoA as stall", () => {
    const b = boat(70);
    const trim = optimum(b);
    b.trim = { ...trim, mainSheet: 0 };
    expect(raceTrimCoach(b)).toBe("luffMain");
    b.trim = { ...trim, jibSheet: 0 };
    expect(raceTrimCoach(b)).toBe("luffJib");
    b.trim = { ...trim, mainSheet: 0, jibSheet: 0 };
    expect(raceTrimCoach(b)).toBe("luffBoth");
  });

  it("never asks to trim a lowered main or a fully furled jib", () => {
    const b = boat(90, { mainSheet: 1, jibSheet: 1, mainHoisted: false });
    expect(raceTrimCoach(b)).toBe("stallJib");
    b.trim = { ...b.trim!, mainHoisted: true, jibFurl: 1 };
    expect(raceTrimCoach(b)).toBe("stallMain");
    b.trim.mainHoisted = false;
    expect(raceTrimCoach(b)).toBeNull();
  });

  it("keeps downwind drag separate from a sheet trim error and identifies irons", () => {
    expect(raceTrimCoach(boat(160, { mainSheet: 0, jibSheet: 0 }))).toBe("run");
    const stopped = boat(0);
    stopped.speed = 0;
    expect(raceTrimCoach(stopped)).toBe("inIrons");
  });

  it("agrees with the shared trainer coach for live sheet, tack and drag-mode cases", () => {
    for (const heading of [70, 90, 160, 270]) {
      for (const sheets of [{ mainSheet: 1, jibSheet: 1 }, { mainSheet: 0, jibSheet: 0 }]) {
        const b = boat(heading, sheets);
        const session = createSailingSession(b.physics!, {
          controls: b.trim!, steering: { mode: "helm", rudder: 0, lowSpeedAssist: true },
          wind: { speed: 12, direction: 0, mode: "steady" },
        }, PARAMS);
        const twa = Math.abs(twaFromCompass(0, heading));
        const expected = coachFrom(twa, b.speed, session.lastDiag, trimQualityFrom(twa, session.lastDiag), {
          main: session.mainIncidence, jib: session.jibIncidence,
        });
        expect(raceTrimCoach(b), `heading ${heading}, mainsheet ${sheets.mainSheet}`).toBe(expected);
      }
    }
  });

  it("reads frozen telemetry and returns no hint for missing or invalid input", () => {
    const b = boat();
    const before = structuredClone(b);
    Object.freeze(b.physics); Object.freeze(b.trim); Object.freeze(b.pos); Object.freeze(b);
    expect(() => raceTrimCoach(b)).not.toThrow();
    expect(b).toEqual(before);
    expect(raceTrimCoach({ ...before, physics: undefined })).toBeNull();
    expect(raceTrimCoach({ ...before, trim: undefined })).toBeNull();
    expect(raceTrimCoach({ ...before, physics: { ...before.physics!, trueWindDir: Infinity } })).toBeNull();
  });
});
