import { useMemo } from 'react';
import { Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import type { Venue } from '../../../src/data/venues/venues';
import { RACE_AREA, landPolygon, reliefPolygons, type Pt } from '../../../src/data/venues/geometry';
import type { WaterRect } from '../simulator/use-sim-loop';

/**
 * The shore and islands around the race bay, drawn under the course (same
 * shapes as the website race, src/data/venues/geometry.ts). The geometry's
 * race area maps onto the water rect, so the land fills the margins and the
 * corners of the course and never reaches into the water the boats sail.
 */
export function VenueLand({ venue, water }: { venue: Venue; water: WaterRect }) {
  const shapes = useMemo(() => {
    const sx = (water.x1 - water.x0) / RACE_AREA.width;
    const sy = (water.y1 - water.y0) / RACE_AREA.height;
    const toPath = (poly: Pt[]): SkPath => {
      const p = Skia.Path.Make();
      poly.forEach((pt, i) => {
        const x = water.x0 + pt.x * sx;
        const y = water.y0 + pt.y * sy;
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      });
      p.close();
      return p;
    };
    return venue.lands.map((land) => ({
      outline: toPath(landPolygon(land)),
      rings: reliefPolygons(land).map((r) => ({ level: r.level, path: toPath(r.poly) })),
    }));
  }, [venue, water.x0, water.y0, water.x1, water.y1]);

  const ringColor = (level: number) => (level === 1 ? venue.palette.mid : level === 2 ? venue.palette.high : venue.palette.peak);
  return (
    <Group>
      {shapes.map((s, i) => (
        <Group key={`${venue.id}-${i}`}>
          <Path path={s.outline} color="rgba(120, 200, 215, 0.16)" style="stroke" strokeWidth={9} strokeJoin="round" />
          <Path path={s.outline} color={venue.palette.low} />
          {s.rings.map((r) => <Path key={r.level} path={r.path} color={ringColor(r.level)} opacity={0.9} />)}
          <Path path={s.outline} color={venue.palette.sand} style="stroke" strokeWidth={2} strokeJoin="round" />
        </Group>
      ))}
    </Group>
  );
}
