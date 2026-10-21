import { describe, expect, it } from "vitest";
import { VENUES, findVenue } from "./venues";
import { RACE_AREA, coastTerrain, islandTerrain, landPolygon, terrainIndices, venueTerrain } from "./geometry";

// Contract: the scenery never reaches into the race area. Boats are clamped
// 20 units inside it, so land drawn there would be sailed through.
describe("venue scenery", () => {
  it("keeps every shore and island outside the race area", () => {
    for (const venue of VENUES) {
      for (const land of venue.lands) {
        for (const p of landPolygon(land)) {
          const inside = p.x > -10 && p.x < RACE_AREA.width + 10 && p.y > -10 && p.y < RACE_AREA.height + 10;
          expect(inside, `${venue.id} ${land.kind} ${JSON.stringify(p)}`).toBe(false);
        }
      }
    }
  });

  it("draws the same shapes every time (no Math.random, no float trig hash)", () => {
    const a = VENUES.map((v) => v.lands.map((l) => landPolygon(l)));
    const b = VENUES.map((v) => v.lands.map((l) => landPolygon(l)));
    expect(a).toEqual(b);
  });

  it("puts the 3D shore beyond the orbit camera and inside the fog", () => {
    for (const venue of VENUES) {
      for (const t of venueTerrain(venue)) {
        for (let k = 0; k < t.positions.length; k += 3) {
          const r = Math.hypot(t.positions[k], t.positions[k + 2]);
          expect(r).toBeGreaterThan(125);
          expect(r).toBeLessThan(340); // camera far plane is 400 m
        }
        expect(t.heights01.every((h) => h >= 0 && h <= 1)).toBe(true);
      }
    }
  });

  it("puts each land on its side of the compass (north is upwind)", () => {
    const gocek = findVenue("gocek");
    const north = gocek.lands.find((l) => l.kind === "coast" && l.side === "N")!;
    const t = coastTerrain(north as Extract<typeof north, { kind: "coast" }>);
    const mid = Math.floor(t.cols / 2) * 3;
    expect(t.positions[mid + 2]).toBeLessThan(-150); // Z south is positive, so north is negative
    const tersane = gocek.lands.find((l) => l.kind === "island" && l.name?.en === "Tersane")!;
    const it3 = islandTerrain(tersane as Extract<typeof tersane, { kind: "island" }>);
    const last = it3.positions.length - 3; // centre of the dome
    expect(it3.positions[last]).toBeGreaterThan(0); // east
    expect(it3.positions[last + 2]).toBeGreaterThan(0); // south
  });

  it("turns every terrain face up toward the sky (else it renders as a black edge)", () => {
    for (const venue of VENUES) {
      for (const [n, t] of venueTerrain(venue).entries()) {
        const idx = terrainIndices(t.rows, t.cols, venue.lands[n].kind === "island");
        let up = 0;
        let total = 0;
        for (let k = 0; k < idx.length; k += 3) {
          const [a, b, c] = [idx[k], idx[k + 1], idx[k + 2]].map((v) => [t.positions[v * 3], t.positions[v * 3 + 1], t.positions[v * 3 + 2]]);
          const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const ny = u[2] * w[0] - u[0] * w[2];
          if (Math.abs(ny) < 1e-6) continue;
          total++;
          if (ny > 0) up++;
        }
        expect(up / total, `${venue.id} land ${n}`).toBeGreaterThan(0.95);
      }
    }
  });

  it("builds closed island meshes and open coast meshes", () => {
    expect(terrainIndices(3, 4, true)).toHaveLength(2 * 4 * 6);
    expect(terrainIndices(3, 4, false)).toHaveLength(2 * 3 * 6);
  });

  it("names every venue in all seven languages and falls back to Göcek", () => {
    for (const v of VENUES) for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) expect(v.name[lang].length).toBeGreaterThan(0);
    expect(findVenue("nowhere").id).toBe("gocek");
  });
});
