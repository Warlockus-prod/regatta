import { describe, expect, it } from "vitest";
import { bowRelativeWind, signedAngle, WIND_DIAL } from "./wind-dial";
import { raceWindReading } from "./navigation-model";

const { centre } = WIND_DIAL;

describe("bowRelativeWind", () => {
  it("draws wind from the starboard bow on the right of a bow-up dial", () => {
    const wind = bowRelativeWind(45)!;
    expect(wind.side).toBe("starboard");
    expect(wind.degrees).toBe(45);
    expect(wind.tail.x).toBeGreaterThan(centre);
    expect(wind.tail.y).toBeLessThan(centre);
    // The head points toward the boat: closer to the centre than the tail.
    expect(Math.hypot(wind.head.x - centre, wind.head.y - centre)).toBeLessThan(Math.hypot(wind.tail.x - centre, wind.tail.y - centre));
  });

  it("draws wind from the port bow on the left, and from the port quarter low on the left", () => {
    const bow = bowRelativeWind(-40)!;
    expect(bow.side).toBe("port");
    expect(bow.tail.x).toBeLessThan(centre);
    expect(bow.tail.y).toBeLessThan(centre);
    const quarter = bowRelativeWind(-135)!;
    expect(quarter.side).toBe("port");
    expect(quarter.tail.x).toBeLessThan(centre);
    expect(quarter.tail.y).toBeGreaterThan(centre);
  });

  it("puts a beam wind level with the boat and a head wind at the top", () => {
    const beam = bowRelativeWind(90)!;
    expect(beam.tail).toEqual({ x: centre + WIND_DIAL.rim, y: centre });
    const head = bowRelativeWind(0)!;
    expect(head.side).toBe("ahead");
    expect(head.tail).toEqual({ x: centre, y: centre - WIND_DIAL.rim });
    const stern = bowRelativeWind(180)!;
    expect(stern.side).toBe("astern");
    expect(stern.tail).toEqual({ x: centre, y: centre + WIND_DIAL.rim });
  });

  it("names no side for readings that round to 0 or 180 degrees", () => {
    expect(bowRelativeWind(.4)!.side).toBe("ahead");
    expect(bowRelativeWind(-179.6)!.side).toBe("astern");
    expect(bowRelativeWind(.6)!.side).toBe("starboard");
  });

  it("follows the boat: the same wind moves to the other side after a tack", () => {
    // Wind from the north. Close hauled on starboard tack (heading 315) the
    // wind comes over the right bow; after tacking to 45 it is on the left.
    const before = bowRelativeWind(raceWindReading({ heading: 315, windFrom: 0, boatSpeedKn: 5, windKnots: 12 })!.twaSigned)!;
    const after = bowRelativeWind(raceWindReading({ heading: 45, windFrom: 0, boatSpeedKn: 5, windKnots: 12 })!.twaSigned)!;
    expect(before.side).toBe("starboard");
    expect(before.tail.x).toBeGreaterThan(centre);
    expect(after.side).toBe("port");
    expect(after.tail.x).toBeLessThan(centre);
    expect(before.degrees).toBe(45);
    expect(after.degrees).toBe(45);
  });

  it("normalises wrapped input to the signed angle", () => {
    expect(bowRelativeWind(30)!.angle).toBe(30);
    expect(bowRelativeWind(390)!.angle).toBe(30);
    expect(bowRelativeWind(-200)!.angle).toBe(160);
    expect(signedAngle(-180)).toBe(180);
  });

  it("puts the arrow head's barbs behind the head, one on each side of the shaft", () => {
    const ahead = bowRelativeWind(0)!;
    expect(ahead.head).toEqual({ x: centre, y: centre - WIND_DIAL.headRadius });
    expect(ahead.barbs).toEqual([{ x: centre - WIND_DIAL.barb, y: 24 }, { x: centre + WIND_DIAL.barb, y: 24 }]);
    const beam = bowRelativeWind(90)!;
    // Wind from abeam to starboard: the head points left toward the boat, barbs to its right.
    expect(beam.barbs.every(barb => barb.x > beam.head.x)).toBe(true);
    expect(beam.barbs.map(barb => barb.y).sort()).toEqual([centre - WIND_DIAL.barb, centre + WIND_DIAL.barb]);
  });

  it("returns null instead of a made-up reading", () => {
    expect(bowRelativeWind(null)).toBeNull();
    expect(bowRelativeWind(undefined)).toBeNull();
    expect(bowRelativeWind(Number.NaN)).toBeNull();
  });
});
