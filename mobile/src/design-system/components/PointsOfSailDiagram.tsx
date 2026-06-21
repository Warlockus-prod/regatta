import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../tokens';
import { pointOfSailAt } from '../../courses/polar';

interface PointsOfSailDiagramProps {
  size?: number;
  /** Label shown above the wind arrow ("WIND"). */
  windLabel: string;
  /** Currently selected point-of-sail id (its sector lights up). */
  activeId: string | null;
  /** Tap a sector to select it. */
  onSelect: (id: string) => void;
  /** Localized point-of-sail names by id, shown around the rim (like the web). */
  sectorLabels: { id: string; name: string }[];
  /** Port / starboard captions along the bottom. */
  tackLabels?: { port: string; starboard: string };
}

// Midpoint angle (deg off the wind) of each point-of-sail sector, for placing the
// course name + boat glyph. Mirrors the colored sector wedges.
const SECTOR_MIDS: Record<string, number> = {
  'in-irons': 0,
  'close-hauled': 45,
  'beam-reach': 85,
  'broad-reach': 135,
  running: 172,
};

// Sector wedges by |TWA|. Static, like the web Points-of-Sail wheel: colored
// zones (no polar/VPP curve, no speed rings). Tints chosen to read clearly on
// the dark-ocean bg - red no-go, amber close-hauled, cyan reaches, green run.
const SECTOR_META: { id: string; min: number; max: number; tint: string; hi: string }[] = [
  { id: 'in-irons', min: 0, max: 30, tint: 'rgba(255, 80, 80, 0.18)', hi: 'rgba(255, 96, 96, 0.34)' },
  { id: 'close-hauled', min: 30, max: 60, tint: 'rgba(255, 176, 48, 0.16)', hi: 'rgba(255, 190, 80, 0.34)' },
  { id: 'beam-reach', min: 60, max: 110, tint: 'rgba(64, 220, 255, 0.18)', hi: 'rgba(96, 230, 255, 0.36)' },
  { id: 'broad-reach', min: 110, max: 160, tint: 'rgba(96, 170, 255, 0.18)', hi: 'rgba(128, 196, 255, 0.36)' },
  { id: 'running', min: 160, max: 180, tint: 'rgba(72, 230, 150, 0.20)', hi: 'rgba(104, 240, 176, 0.38)' },
];

export function PointsOfSailDiagram({
  size = 300,
  windLabel,
  activeId,
  onSelect,
  sectorLabels,
  tackLabels,
}: PointsOfSailDiagramProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.34;

  const sectorPaths = useMemo(
    () =>
      SECTOR_META.map((s) => ({
        ...s,
        stb: wedgePath(cx, cy, outerR, s.min, s.max),
        port: wedgePath(cx, cy, outerR, -s.max, -s.min),
      })),
    [cx, cy, outerR],
  );

  const ringPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, outerR);
    return p;
  }, [cx, cy, outerR]);

  const tickPath = useMemo(() => {
    const p = Skia.Path.Make();
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = ((deg - 90) * Math.PI) / 180;
      const isCardinal = deg % 90 === 0;
      const inner = outerR - (isCardinal ? 12 : 6);
      p.moveTo(cx + inner * Math.cos(rad), cy + inner * Math.sin(rad));
      p.lineTo(cx + outerR * Math.cos(rad), cy + outerR * Math.sin(rad));
    }
    return p;
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

  // A small boat glyph (pointing down its sector's heading) in each sector, both
  // tacks - "there is a boat sailing this course", like the web.
  const boatPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, -10);
    p.lineTo(7, 8);
    p.lineTo(0, 4);
    p.lineTo(-7, 8);
    p.close();
    return p;
  }, []);

  const sectorBoats = useMemo(() => {
    const r = outerR * 0.66;
    const out: { key: string; x: number; y: number; rot: number; id: string }[] = [];
    for (const s of SECTOR_META) {
      const mid = SECTOR_MIDS[s.id];
      if (mid === undefined || mid === 0) continue;
      for (const sign of [1, -1] as const) {
        const deg = sign * mid;
        const rad = ((deg - 90) * Math.PI) / 180;
        out.push({
          key: `b-${s.id}-${sign}`,
          id: s.id,
          x: cx + r * Math.cos(rad),
          y: cy + r * Math.sin(rad),
          rot: (deg * Math.PI) / 180,
        });
      }
    }
    return out;
  }, [cx, cy, outerR]);

  // Course names around the rim at each sector midpoint, mirrored on both tacks
  // (in-irons sits once inside the top no-go sector, like the web).
  const sectorNamePositions = useMemo(() => {
    const r = outerR + 20;
    const pad = 14;
    const maxX = cx * 2 - pad;
    // Label angles fanned out from the sector mids so the rim names sit like the
    // web (close-hauled / beam / broad / run spread evenly, not bunched at the
    // bottom or clipped at the horizontal edges).
    const labelMid: Record<string, number> = {
      'close-hauled': 48,
      'beam-reach': 90,
      'broad-reach': 132,
      running: 158,
    };
    const byId = new Map(sectorLabels.map((s) => [s.id, s.name]));
    const out: { key: string; name: string; x: number; y: number; muted: boolean }[] = [];
    for (const s of SECTOR_META) {
      const name = byId.get(s.id);
      if (!name) continue;
      if (s.id === 'in-irons') {
        out.push({ key: s.id, name, x: cx, y: cy - outerR * 0.56, muted: true });
        continue;
      }
      const mid = labelMid[s.id];
      if (mid === undefined) continue;
      for (const sign of [1, -1] as const) {
        const rad = ((sign * mid - 90) * Math.PI) / 180;
        const x = Math.max(pad, Math.min(maxX, cx + r * Math.cos(rad)));
        out.push({
          key: `${s.id}-${sign}`,
          name,
          x,
          y: cy + r * Math.sin(rad),
          muted: false,
        });
      }
    }
    return out;
  }, [sectorLabels, cx, cy, outerR]);

  // Tap a sector to select it (replaces the old drag-to-steer polar).
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((e) => {
          const id = pointOfSailAt(angleFromTouch(e.x, e.y, cx, cy));
          Haptics.selectionAsync().catch(() => {});
          onSelect(id);
        }),
    [cx, cy, onSelect],
  );

  return (
    <View style={[styles.wrap, { width: size, height: size + 52 }]}>
      <GestureDetector gesture={tap}>
        <View style={[styles.canvasBox, { width: size, height: size }]}>
          <Canvas style={{ width: size, height: size }}>
            <Group>
              {sectorPaths.map((s) => {
                const on = s.id === activeId;
                const fill = on ? s.hi : s.tint;
                return (
                  <Group key={s.id}>
                    <Path path={s.stb} color={fill} />
                    <Path path={s.port} color={fill} />
                  </Group>
                );
              })}
              <Path path={tickPath} color={'rgba(232, 244, 248, 0.30)'} style="stroke" strokeWidth={1} />
              <Path path={windArrowPath} color={colors.windColor} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" />
              <Path path={ringPath} color={colors.borderCyanStrong} style="stroke" strokeWidth={1.5} />
              {sectorBoats.map((b) => (
                <Group
                  key={b.key}
                  transform={[{ translateX: b.x }, { translateY: b.y }, { rotate: b.rot }, { scale: 0.66 }]}
                >
                  <Path
                    path={boatPath}
                    color={b.id === activeId ? colors.accentCyan : 'rgba(232, 244, 248, 0.5)'}
                    style="stroke"
                    strokeWidth={1.8}
                  />
                </Group>
              ))}
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
        sectorNamePositions={sectorNamePositions}
        tackLabels={tackLabels}
      />
    </View>
  );
}

function DiagramLabels({
  size,
  cx,
  cy,
  outerR,
  windLabel,
  sectorNamePositions,
  tackLabels,
}: {
  size: number;
  cx: number;
  cy: number;
  outerR: number;
  windLabel: string;
  sectorNamePositions: { key: string; name: string; x: number; y: number; muted: boolean }[];
  tackLabels?: { port: string; starboard: string };
}) {
  const h = size + 44;
  return (
    <View pointerEvents="none" style={[styles.svgOverlay, { width: size, height: h }]}>
      <Svg width={size} height={h}>
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
        {sectorNamePositions.map((c) => (
          <SvgText
            key={c.key}
            x={c.x}
            y={c.y + 4}
            fill={c.muted ? 'rgba(255, 120, 120, 0.85)' : colors.textSecondary}
            fontSize={10}
            fontWeight="700"
            textAnchor="middle"
          >
            {c.name}
          </SvgText>
        ))}
        {[30, 60, 90, 120, 150, 210, 240, 270, 300, 330].map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const r = outerR + 14;
          const x = cx + r * Math.cos(rad);
          const y = cy + r * Math.sin(rad) + 3;
          return (
            <SvgText key={deg} x={x} y={y} fill={colors.textMuted} fontSize={9} fontWeight="500" textAnchor="middle">
              {`${deg}`}
            </SvgText>
          );
        })}
        {tackLabels ? (
          <>
            <SvgText
              x={cx - outerR * 0.52}
              y={cy + outerR + 34}
              fill={colors.accentCyan}
              fontSize={10}
              fontWeight="800"
              textAnchor="middle"
              letterSpacing={0.6}
            >
              {tackLabels.port.toUpperCase()}
            </SvgText>
            <SvgText
              x={cx + outerR * 0.52}
              y={cy + outerR + 34}
              fill={colors.accentCyan}
              fontSize={10}
              fontWeight="800"
              textAnchor="middle"
              letterSpacing={0.6}
            >
              {tackLabels.starboard.toUpperCase()}
            </SvgText>
          </>
        ) : null}
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
