import { Image, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { partVisuals } from "../../../src/data/anatomy-visuals";
import { Text } from "../design-system/components/Text";
import { radii, spacing } from "../design-system/tokens";
import { PART_DRAWING_ASSETS, PART_PICTURE_ASSETS } from "./part-visuals.generated";

/**
 * Package 32: the two visuals of a yacht part in the app's native screens, the same pair the
 * site shows (src/components/anatomy/PartVisuals.tsx): the schematic (the part marked on a
 * drawing of the whole yacht) and the picture of it on the boat. Renders nothing for an id
 * that is not a part of the yacht. `labels` are the two captions in the reader's language.
 */
export function PartVisuals({ id, name, labels }: { id: string; name: string; labels: { diagram: string; picture: string } }) {
  const visuals = partVisuals(id);
  if (!visuals) return null;
  const { drawing } = visuals;
  const cx = drawing.x * drawing.width, cy = drawing.y * drawing.height;
  const ring = Math.max(drawing.width, drawing.height) * 0.035;
  return (
    <View style={styles.pair} testID="part-visuals">
      <View style={[styles.tile, styles.diagramTile]}>
        <View style={styles.diagram} accessible accessibilityRole="image" accessibilityLabel={`${name}: ${labels.diagram}`} testID="part-diagram">
          <Image source={PART_DRAWING_ASSETS[drawing.view]} style={styles.drawing} resizeMode="contain" accessibilityIgnoresInvertColors testID="part-drawing" />
          <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${drawing.width} ${drawing.height}`} preserveAspectRatio="xMidYMid meet">
            <Line x1={0} y1={cy} x2={drawing.width} y2={cy} stroke="#0b6f96" strokeWidth={ring * 0.08} strokeDasharray={`${ring * 0.3} ${ring * 0.3}`} opacity={0.55} />
            <Line x1={cx} y1={0} x2={cx} y2={drawing.height} stroke="#0b6f96" strokeWidth={ring * 0.08} strokeDasharray={`${ring * 0.3} ${ring * 0.3}`} opacity={0.55} />
            <Circle cx={cx} cy={cy} r={ring} fill="rgba(0, 170, 220, 0.18)" stroke="#0b6f96" strokeWidth={ring * 0.16} />
            <Circle cx={cx} cy={cy} r={ring * 0.18} fill="#0b6f96" />
          </Svg>
        </View>
        <Text variant="muted" style={styles.caption}>{labels.diagram}</Text>
      </View>
      <View style={[styles.tile, styles.pictureTile]}>
        <Image source={PART_PICTURE_ASSETS[visuals.id]} style={styles.picture} resizeMode="cover" accessible accessibilityRole="image"
          accessibilityLabel={`${name}: ${labels.picture}`} accessibilityIgnoresInvertColors testID="part-picture" />
        <Text variant="muted" style={styles.caption}>{labels.picture}</Text>
      </View>
    </View>
  );
}

/** The parts a section teaches, each with its two visuals and its name, in a strip that scrolls sideways. */
export function PartStrip({ parts, names, labels, title }: { parts: readonly string[]; names: (id: string) => string; labels: { diagram: string; picture: string }; title: string }) {
  if (!parts.length) return null;
  return (
    <View style={styles.strip} testID="part-strip">
      <Text variant="muted" style={styles.stripTitle}>{title.toUpperCase()}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
        {parts.map(id => (
          <View key={id} style={styles.stripItem}>
            <PartVisuals id={id} name={names(id)} labels={labels} />
            <Text variant="body" style={styles.stripName}>{names(id)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const PAPER = "#f5f3ee";
const styles = StyleSheet.create({
  pair: { flexDirection: "row", gap: spacing.xs },
  tile: { borderRadius: radii.sm * 2, borderWidth: 1, borderColor: "rgba(18, 50, 71, 0.12)", backgroundColor: PAPER, overflow: "hidden" },
  // One third and two thirds of the row: a 2:3 drawing and a 4:3 picture then stand at the same height.
  diagramTile: { flex: 1 },
  pictureTile: { flex: 2 },
  diagram: { width: "100%", aspectRatio: 2 / 3 },
  // Explicit width and height: React Native puts a required asset's own size before the style,
  // so an absolute fill alone drew the 936x1404 drawing at full size and showed its empty corner.
  drawing: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" },
  picture: { width: "100%", height: undefined, aspectRatio: 4 / 3 },
  caption: { textAlign: "center", paddingVertical: 4, fontSize: 12, lineHeight: 16 },
  strip: { marginTop: spacing.sm },
  stripTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, marginBottom: spacing.xs },
  stripRow: { gap: spacing.sm, paddingRight: spacing.sm },
  stripItem: { width: 272 },
  stripName: { marginTop: 4, fontWeight: "600" },
});
