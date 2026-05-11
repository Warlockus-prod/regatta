import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '../tokens';
import type { PointOfSail } from '../../data';

interface PointsOfSailDiagramProps {
  points: PointOfSail[];
  /** Pixel size of the diagram (square). */
  size?: number;
  /** Per-locale label for the small wind hint, e.g. "WIND". */
  windLabel: string;
}

/**
 * Static polar diagram of the 5 points of sail. Wind comes from the top
 * (12 o'clock). Each `point.angleMin..angleMax` is rendered as a colored
 * sector mirrored on starboard and port sides. Center disk shows a wind
 * arrow.
 *
 * v1 is non-interactive: the labeled cards below the diagram already
 * carry the descriptive text, so the diagram is a quick visual anchor
 * rather than the primary information surface. v1.x can wire taps on
 * sectors to scroll the matching card into view.
 */
export function PointsOfSailDiagram({
  points,
  size = 280,
  windLabel,
}: PointsOfSailDiagramProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill={colors.bgSecondary}
          stroke={colors.borderCyanSoft}
          strokeWidth={1}
        />

        {/* Sectors: starboard (positive) + port (mirrored) */}
        <G>
          {points.map((point) => {
            const stbPath = sectorPath(cx, cy, outerR, point.angleMin, point.angleMax);
            const portPath = sectorPath(cx, cy, outerR, -point.angleMax, -point.angleMin);
            return (
              <G key={point.id}>
                <Path d={stbPath} fill={point.color} fillOpacity={0.55} stroke={point.color} strokeWidth={1} />
                <Path d={portPath} fill={point.color} fillOpacity={0.55} stroke={point.color} strokeWidth={1} />
              </G>
            );
          })}
        </G>

        {/* Cardinal angle ticks */}
        {[0, 45, 90, 135, 180, -45, -90, -135].map((a) => {
          const inner = polar(cx, cy, outerR - 6, a);
          const outer = polar(cx, cy, outerR, a);
          return (
            <Line
              key={a}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={'rgba(232, 244, 248, 0.30)'}
              strokeWidth={1}
            />
          );
        })}

        {/* Wind arrow from the top, pointing toward the boat (south). */}
        <Line
          x1={cx}
          y1={cy - outerR - 30}
          x2={cx}
          y2={cy - outerR - 6}
          stroke={colors.windColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Polygon
          points={`${cx - 6},${cy - outerR - 14} ${cx},${cy - outerR - 4} ${cx + 6},${cy - outerR - 14}`}
          fill={colors.windColor}
        />
        <SvgText
          x={cx}
          y={cy - outerR - 36}
          fill={colors.windColor}
          fontSize={11}
          fontWeight="700"
          textAnchor="middle"
          letterSpacing={1.5}
        >
          {windLabel.toUpperCase()}
        </SvgText>

        {/* Boat dot in the center. */}
        <Circle cx={cx} cy={cy} r={5} fill={colors.sailColor} />
        <Line
          x1={cx}
          y1={cy - 12}
          x2={cx}
          y2={cy + 8}
          stroke={colors.sailColor}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Outline ring on top so sector edges look crisp. */}
        <Circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke={colors.borderCyanStrong}
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
}

/**
 * Convert a sailing angle (0 = wind direction = up, increases clockwise)
 * to canvas coords on the unit-circle of radius `r` centered at (cx, cy).
 */
function polar(cx: number, cy: number, r: number, sailingDeg: number) {
  const rad = ((sailingDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Build an SVG path for a wedge (pie-slice) from `cx,cy` out to radius `r`,
 * spanning sailing-angles [minDeg, maxDeg].
 */
function sectorPath(
  cx: number,
  cy: number,
  r: number,
  minDeg: number,
  maxDeg: number,
): string {
  // Normalize to clockwise sweep.
  let a0 = minDeg;
  let a1 = maxDeg;
  if (a1 < a0) [a0, a1] = [a1, a0];
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    marginVertical: spacing.lg,
  },
});
