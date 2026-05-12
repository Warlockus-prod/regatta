import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../tokens';
import { getPolar, maxSpeed, pointOfSailAt, speedAtAngle } from '../../courses/polar';

interface PointsOfSailDiagramProps {
  size?: number;
  windLabel: string;
  /** True wind speed, knots. Polar redraws when this changes. */
  windSpeedKn: number;
  /** Current heading the boat icon sits at (deg, 0..360 clockwise from wind). */
  heading: number;
  /** Called as the user drags. Pass `commit=true` on release for snap + haptic. */
  onHeadingChange: (heading: number, commit: boolean) => void;
  /** Cardinal labels shown around the rim. English convention (N/E/S/W). */
  cardinalLabels: { N: string; E: string; S: string; W: string };
}

export function PointsOfSailDiagram({
  size = 300,
  windLabel,
  windSpeedKn,
  heading,
  onHeadingChange,
  cardinalLabels,
}: PointsOfSailDiagramProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;

  const polar = useMemo(() => getPolar(windSpeedKn), [windSpeedKn]);
  const peak = useMemo(() => Math.max(0.01, maxSpeed(polar)), [polar]);

  const polarPath = useMemo(() => {
    const p = Skia.Path.Make();
    const ringR = outerR;
    const toXY = (twa: number, kn: number) => {
      const r = (kn / peak) * ringR;
      const rad = ((twa - 90) * Math.PI) / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };
    const first = polar.samples[0];
    if (!first) return p;
    const stbStart = toXY(first.twa, first.knots);
    p.moveTo(stbStart.x, stbStart.y);
    for (let i = 1; i < polar.samples.length; i++) {
      const s = polar.samples[i]!;
      const xy = toXY(s.twa, s.knots);
      p.lineTo(xy.x, xy.y);
    }
    for (let i = polar.samples.length - 1; i >= 0; i--) {
      const s = polar.samples[i]!;
      const mirroredTwa = 360 - s.twa;
      const xy = toXY(mirroredTwa, s.knots);
      p.lineTo(xy.x, xy.y);
    }
    p.close();
    return p;
  }, [polar, peak, cx, cy, outerR]);

  const ringPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, outerR);
    return p;
  }, [cx, cy, outerR]);

  const innerRingPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (const f of [0.25, 0.5, 0.75]) {
      p.addCircle(cx, cy, outerR * f);
    }
    return p;
  }, [cx, cy, outerR]);

  const tickPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const inner = outerR - (isCardinal ? 12 : 6);
      const x1 = cx + inner * Math.cos(rad);
      const y1 = cy + inner * Math.sin(rad);
      const x2 = cx + outerR * Math.cos(rad);
      const y2 = cy + outerR * Math.sin(rad);
      p.moveTo(x1, y1);
      p.lineTo(x2, y2);
    }
    return p;
  }, [cx, cy, outerR]);

  const sectorPaths = useMemo(() => {
    const sectorMeta: { id: string; min: number; max: number; tint: string }[] = [
      { id: 'in-irons', min: 0, max: 30, tint: 'rgba(255, 68, 68, 0.08)' },
      { id: 'close-hauled', min: 30, max: 60, tint: 'rgba(255, 170, 0, 0.08)' },
      { id: 'beam-reach', min: 60, max: 110, tint: 'rgba(0, 212, 255, 0.08)' },
      { id: 'broad-reach', min: 110, max: 160, tint: 'rgba(0, 212, 255, 0.12)' },
      { id: 'running', min: 160, max: 180, tint: 'rgba(68, 255, 136, 0.12)' },
    ];
    return sectorMeta.map((s) => {
      const stb = wedgePath(cx, cy, outerR, s.min, s.max);
      const port = wedgePath(cx, cy, outerR, -s.max, -s.min);
      return { ...s, stb, port };
    });
  }, [cx, cy, outerR]);

  const windArrowPath = useMemo(() => {
    const p = Skia.Path.Make();
    const top = cy - outerR - 30;
    const tip = cy - outerR - 6;
    p.moveTo(cx, top);
    p.lineTo(cx, tip);
    p.moveTo(cx - 6, tip - 8);
    p.lineTo(cx, tip);
    p.lineTo(cx + 6, tip - 8);
    return p;
  }, [cx, cy, outerR]);

  const boatSpeed = useMemo(() => speedAtAngle(polar, heading), [polar, heading]);
  const boatRingR = useMemo(() => {
    const norm = boatSpeed / peak;
    return outerR * Math.max(0.05, Math.min(1, norm));
  }, [boatSpeed, peak, outerR]);

  const boatPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, -10);
    p.lineTo(7, 8);
    p.lineTo(0, 4);
    p.lineTo(-7, 8);
    p.close();
    return p;
  }, []);

  const lastCommitRef = useRef(heading);
  useEffect(() => {
    lastCommitRef.current = heading;
  }, [heading]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          Haptics.selectionAsync().catch(() => {});
          onHeadingChange(angleFromTouch(e.x, e.y, cx, cy), false);
        })
        .onChange((e) => {
          onHeadingChange(angleFromTouch(e.x, e.y, cx, cy), false);
        })
        .onEnd((e) => {
          const raw = angleFromTouch(e.x, e.y, cx, cy);
          const snapped = Math.round(raw / 5) * 5;
          if (snapped !== lastCommitRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          onHeadingChange(snapped, true);
        }),
    [cx, cy, onHeadingChange],
  );

  const headingRad = ((heading - 90) * Math.PI) / 180;
  const boatX = cx + boatRingR * Math.cos(headingRad);
  const boatY = cy + boatRingR * Math.sin(headingRad);

  const cardinalPositions: { label: string; x: number; y: number }[] = useMemo(() => {
    const r = outerR + 18;
    return [
      { label: cardinalLabels.N, x: cx, y: cy - r },
      { label: cardinalLabels.E, x: cx + r, y: cy },
      { label: cardinalLabels.S, x: cx, y: cy + r },
      { label: cardinalLabels.W, x: cx - r, y: cy },
    ];
  }, [cx, cy, outerR, cardinalLabels]);

  const activeSectorId = pointOfSailAt(heading);

  return (
    <View style={[styles.wrap, { width: size, height: size + 32 }]}>
      <GestureDetector gesture={pan}>
        <View style={[styles.canvasBox, { width: size, height: size }]}>
          <Canvas style={{ width: size, height: size }}>
            <Group>
              {sectorPaths.map((s) => {
                const isActive = s.id === activeSectorId;
                const tint = isActive ? boostAlpha(s.tint, 1.6) : s.tint;
                return (
                  <Group key={s.id}>
                    <Path path={s.stb} color={tint} />
                    <Path path={s.port} color={tint} />
                  </Group>
                );
              })}
              <Path
                path={ringPath}
                color={colors.borderCyanSoft}
                style="stroke"
                strokeWidth={1}
              />
              <Path
                path={innerRingPath}
                color={'rgba(0, 212, 255, 0.10)'}
                style="stroke"
                strokeWidth={1}
              />
              <Path
                path={tickPath}
                color={'rgba(232, 244, 248, 0.30)'}
                style="stroke"
                strokeWidth={1}
              />
              <Path
                path={polarPath}
                color={colors.accentCyan}
                style="stroke"
                strokeWidth={2}
                strokeJoin="round"
                opacity={0.95}
              />
              <Path
                path={polarPath}
                color={colors.accentCyan}
                style="stroke"
                strokeWidth={6}
                strokeJoin="round"
                opacity={0.18}
              />
              <Path
                path={windArrowPath}
                color={colors.windColor}
                style="stroke"
                strokeWidth={2.5}
                strokeCap="round"
                strokeJoin="round"
              />
              <Path
                path={ringPath}
                color={colors.borderCyanStrong}
                style="stroke"
                strokeWidth={1.5}
              />
              <Group transform={[{ translateX: boatX }, { translateY: boatY }, { rotate: (heading * Math.PI) / 180 }]}>
                <Path path={boatPath} color={colors.accentCyan} opacity={0.95} />
                <Path
                  path={boatPath}
                  color={colors.sailColor}
                  style="stroke"
                  strokeWidth={1.2}
                  opacity={0.9}
                />
              </Group>
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
      <DiagramLabels
        size={size}
        cx={cx}
        cy={cy}
        outerR={outerR}
        windLabel={windLabel}
        cardinalPositions={cardinalPositions}
      />
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    </View>
  );
}

function DiagramLabels({
  size,
  cx,
  cy,
  outerR,
  windLabel,
  cardinalPositions,
}: {
  size: number;
  cx: number;
  cy: number;
  outerR: number;
  windLabel: string;
  cardinalPositions: { label: string; x: number; y: number }[];
}) {
  return (
    <View pointerEvents="none" style={[styles.svgOverlay, { width: size, height: size }]}>
      <Svg width={size} height={size}>
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
        {cardinalPositions.map((c) => (
          <SvgText
            key={c.label}
            x={c.x}
            y={c.y + 4}
            fill={colors.textSecondary}
            fontSize={11}
            fontWeight="700"
            textAnchor="middle"
            letterSpacing={1}
          >
            {c.label}
          </SvgText>
        ))}
        {[30, 60, 90, 120, 150, 210, 240, 270, 300, 330].map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const r = outerR + 14;
          const x = cx + r * Math.cos(rad);
          const y = cy + r * Math.sin(rad) + 3;
          return (
            <SvgText
              key={deg}
              x={x}
              y={y}
              fill={colors.textMuted}
              fontSize={9}
              fontWeight="500"
              textAnchor="middle"
            >
              {`${deg}`}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function angleFromTouch(x: number, y: number, cx: number, cy: number): number {
  const dx = x - cx;
  const dy = y - cy;
  if (dx === 0 && dy === 0) return 0;
  const rad = Math.atan2(dx, -dy);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function wedgePath(cx: number, cy: number, r: number, minDeg: number, maxDeg: number) {
  const p = Skia.Path.Make();
  let a0 = minDeg;
  let a1 = maxDeg;
  if (a1 < a0) [a0, a1] = [a1, a0];
  const rad0 = ((a0 - 90) * Math.PI) / 180;
  p.moveTo(cx, cy);
  p.lineTo(cx + r * Math.cos(rad0), cy + r * Math.sin(rad0));
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = a0 + ((a1 - a0) * i) / steps;
    const rad = ((t - 90) * Math.PI) / 180;
    p.lineTo(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
  }
  p.close();
  return p;
}

function boostAlpha(rgba: string, factor: number): string {
  const m = rgba.match(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
  if (!m) return rgba;
  const r = m[1]!.trim();
  const g = m[2]!.trim();
  const b = m[3]!.trim();
  const a = Math.min(0.9, parseFloat(m[4]!) * factor);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    marginVertical: spacing.lg,
    position: 'relative',
  },
  canvasBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
});
