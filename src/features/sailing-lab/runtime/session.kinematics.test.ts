import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createInitialState, getBoatParams, getClassicBoatParams } from "../../../lib/sailing-physics";
import { createSailingSession, stepSailingSession, type SessionInput } from "./session";

// Captured from untouched production session.ts at f883a19 before extraction.
// Each row: tick, heading, speed, leeway, heel, east, north, TWS, TWD, main, jib.
// These are numerical fixtures, not a second implementation of the integrator.
const BEFORE_EXTRACTION = [
  [1, 351.5, 5.008435873574987, -.020443448505120185, -.1772572426648121, -.012724966428231026, .08493741506281123, 12, 70, -42.5, -40],
  [60, 359, 5.234574301103945, -.8271457159868638, -5.943353012219488, -.17018199715311816, 5.285951983774147, 12, 70, -42.5, -40],
  [150, 1, 5.2917936321460495, -1.3568967636729092, -8.007398879212367, -.17719539810540505, 13.299722696039497, 14.361447671090708, 70, -42.5, -40],
  [240, 34.00000000000068, 5.080528913266479, -1.7469587257666623, -9.456453574018836, 2.024963729630083, 20.981016614874342, 16.88575380225666, 70, -15.42837350738684, -29.442685441831767],
  [330, 327.9999999999993, 4.724416750053342, -1.9122856486360147, -7.533381342961171, 1.8881107303865867, 28.206884670793304, 15.985732113450002, 70, -15.300010888414354, -39.92252045676249],
  [420, 200, 4.210409771153489, -.8785257823144084, -1.1095490160403685, -3.47009343841365, 27.234974768214553, 12, 70, 14.715695672291636, 16.786444814783867],
  [510, 266.00000000000136, 3.8296159644253263, -.2317684772869094, .4048378141152632, -8.10925562934716, 23.669621994975177, 12, 70, -11.07160866500395, -9.099477999608085],
  [600, 41.000000000001364, 3.5023176567356935, -1.1715738853444797, -3.739598766236865, -10.17950590956616, 27.615973636436987, 12, 70, -15.299641355309037, -20.92597404900853],
];
function command(tick: number): SessionInput {
  const steering: SessionInput["steering"] = tick < 60 ? { mode: "course-assist", heading: 359 }
    : tick < 150 ? { mode: "course-assist", heading: 1 }
    : tick < 240 ? { mode: "helm", rudder: .5, lowSpeedAssist: false }
    : tick < 330 ? { mode: "helm", rudder: -1, lowSpeedAssist: true }
    : tick < 420 ? { mode: "course-assist", heading: 200 }
    : tick < 510 ? { mode: "helm", rudder: 1, lowSpeedAssist: false }
    : { mode: "course-assist", heading: 45 };
  return { steering, wind: { speed: 12, direction: 70, mode: "gust" }, controls: {
    mainSheet: tick < 180 ? .5 : .82, jibSheet: tick < 360 ? .3 : .68,
    mainTwist: .2, jibTwist: .15, reef: tick >= 240 ? .25 : 0,
    jibFurl: tick >= 390 && tick < 450 ? .5 : 0, jibSide: 1,
    mainHoisted: !(tick >= 300 && tick < 360),
  } };
}

it("preserves the pre-extraction trainer trajectory through course wrap, helm, gusts and deployment", () => {
  const params = getClassicBoatParams(); // the extraction golden locks the classic profile (ADR-0021)
  let state = createSailingSession(createInitialState({ tws: 12, heading: 350, boatSpeed: 5 }), command(0), params, 1234);
  let checked = 0;
  const trajectory = createHash("sha256");
  for (let tick = 0; tick < 600; tick++) {
    state = stepSailingSession(state, command(tick), params);
    // The golden covers every property of all600 complete production states.
    // Nine significant digits remove platform libm noise; checkpoints below
    // additionally retain high-precision readable motion/rig diagnostics.
    trajectory.update(JSON.stringify(state, (_key, value) => typeof value === "number" ? Number(value.toPrecision(9)) : value) + "\n");
    const expected = BEFORE_EXTRACTION.find(row => row[0] === state.ticks);
    if (!expected) continue;
    const actual = [state.ticks, state.boat.heading, state.boat.boatSpeed, state.boat.leeway, state.boat.heel,
      state.position.east, state.position.north, state.boat.trueWindSpeed, state.boat.trueWindDir, state.rig.main, state.rig.jib];
    expect(actual[0]).toBe(expected[0]);
    // Small tolerance is for cross-platform libm; extraction is exactly equal locally.
    actual.slice(1).forEach((value, i) => expect(value).toBeCloseTo(expected[i + 1], 10));
    checked++;
  }
  expect(checked).toBe(8);
  expect(state.model).toBe("assisted-cruiser-v2");
  expect(state.simTime).toBe(20);
  expect(trajectory.digest("hex")).toBe("5b65db1d0f22c32c35fef2da23d3362419fcecef8136cd791925c7fe83cf5e7c");
});

// ADR-0021 golden of the cruiser profile the trainer now sails: the same 600
// commands, captured 2026-11-02 when the profile was accepted. Any change to
// the cruiser physics, rig or crew moves this digest; update it only with a
// new ADR's numbers.
it("keeps the cruiser-profile trainer trajectory of ADR-0021", () => {
  const params = getBoatParams();
  let state = createSailingSession(createInitialState({ tws: 12, heading: 350, boatSpeed: 5 }), command(0), params, 1234);
  const trajectory = createHash("sha256");
  const rows: number[][] = [];
  for (let tick = 0; tick < 600; tick++) {
    state = stepSailingSession(state, command(tick), params);
    trajectory.update(JSON.stringify(state, (_key, value) => typeof value === "number" ? Number(value.toPrecision(9)) : value) + "\n");
    if (BEFORE_EXTRACTION.some(row => row[0] === state.ticks)) rows.push([state.ticks, state.boat.boatSpeed, state.boat.heel]);
  }
  // Readable checkpoints: tick, speed, heel.
  expect(rows.map(([t, v, h]) => [t, Number(v.toFixed(3)), Number(h.toFixed(2))])).toEqual(CRUISER_CHECKPOINTS);
  expect(trajectory.digest("hex")).toBe(CRUISER_DIGEST);
});
const CRUISER_CHECKPOINTS: number[][] = [
  [1, 4.956, -.14], [60, 4.887, -4.05], [150, 5.002, -5.85], [240, 4.889, -14.23],
  [330, 4.485, -11.69], [420, 2.01, -1.72], [510, 2.076, 1.04], [600, 1.518, -4.83],
];
const CRUISER_DIGEST = "49911898d12220ab0f2ff73a09ee0d1cf29209fb0bb9a90baa91f45e2b592184";
