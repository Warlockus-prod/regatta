import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { partVisuals } from "../../../src/data/anatomy-visuals";
import { sailLessonPicture, sailingVisuals, type SailingVisuals } from "../../../src/data/sailing-visuals";
import { PartVisuals } from "../anatomy/PartVisuals";
import { PART_PICTURE_ASSETS } from "../anatomy/part-visuals.generated";
import { Text } from "../design-system/components/Text";
import { radii, spacing } from "../design-system/tokens";
import { SUBJECT_PICTURE_ASSETS } from "./subject-pictures.generated";

/**
 * Package 32: the two visuals of a subject in the app's native screens, whatever kind it is: a
 * part of the yacht or a sailing subject (a point of sail, a turn, wind, trim). The same pair the site shows
 * (src/components/visuals/SubjectVisuals.tsx), read from the same registries by the item's id;
 * nothing for an id that is none of these subjects.
 */
export function SubjectVisuals({ id, name, labels }: { id: string; name: string; labels: { diagram: string; picture: string } }) {
  if (partVisuals(id)) return <PartVisuals id={id} name={name} labels={labels} />;
  const visuals = sailingVisuals(id);
  if (!visuals) return null;
  return (
    <View style={styles.pair} testID="subject-visuals">
      <View style={styles.tile}>
        <View style={styles.frame} accessible accessibilityRole="image" accessibilityLabel={`${name}: ${labels.diagram}`} testID="subject-diagram">
          <SvgXml xml={visuals.schematic()} width="100%" height="100%" />
        </View>
        <Text variant="muted" style={styles.caption}>{labels.diagram}</Text>
      </View>
      <View style={styles.tile}>
        {/* Explicit height: React Native puts a required asset's own size before the style. */}
        <Image source={SUBJECT_PICTURE_ASSETS[visuals.id]} style={styles.picture} resizeMode="cover" accessible accessibilityRole="image"
          accessibilityLabel={`${name}: ${labels.picture}`} accessibilityIgnoresInvertColors testID="subject-picture" />
        <Text variant="muted" style={styles.caption}>{labels.picture}</Text>
      </View>
    </View>
  );
}

/** The subjects a card or section teaches, each with its two visuals and its name, in a strip that scrolls sideways. */
export function SubjectStrip({ ids, names, labels, title }: { ids: readonly string[]; names: (id: string) => string; labels: { diagram: string; picture: string }; title: string }) {
  if (!ids.length) return null;
  return (
    <View style={styles.strip} testID="subject-strip">
      <Text variant="muted" style={styles.stripTitle}>{title.toUpperCase()}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
        {ids.map(id => (
          <View key={id} style={styles.stripItem}>
            <SubjectVisuals id={id} name={names(id)} labels={labels} />
            <Text variant="body" style={styles.stripName}>{names(id)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * The same pair as two small tiles without captions, for a card that already names its subject
 * (an exercise of the trainer: drillVisuals in src/data/sailing-visuals.ts). The card's own text
 * is the label, so the tiles are hidden from assistive technology.
 */
export function SubjectThumbs({ visuals }: { visuals: SailingVisuals | null }) {
  if (!visuals) return null;
  return (
    <View style={styles.thumbs} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="subject-thumbs">
      <View style={[styles.tile, styles.frame]}><SvgXml xml={visuals.schematic()} width="100%" height="100%" /></View>
      <View style={styles.tile}><Image source={SUBJECT_PICTURE_ASSETS[visuals.id]} style={styles.picture} resizeMode="cover" accessibilityIgnoresInvertColors /></View>
    </View>
  );
}

/** The picture of a sail lesson (sailLessonPicture), beside the lesson's own drawing. */
export function LessonPicture({ lessonId, name, labels }: { lessonId: string; name: string; labels: { boat: string; water: string } }) {
  const picture = sailLessonPicture(lessonId);
  if (!picture) return null;
  const onBoat = "part" in picture.asset, label = onBoat ? labels.boat : labels.water;
  return (
    <View style={styles.tile} testID="lesson-picture">
      <Image source={"part" in picture.asset ? PART_PICTURE_ASSETS[picture.asset.part] : SUBJECT_PICTURE_ASSETS[picture.asset.frame]} style={styles.picture} resizeMode="cover" accessible accessibilityRole="image"
        accessibilityLabel={`${name}: ${label}`} accessibilityIgnoresInvertColors />
      <Text variant="muted" style={styles.caption}>{label}</Text>
    </View>
  );
}

const PAPER = "#f5f3ee";
const styles = StyleSheet.create({
  pair: { flexDirection: "row", gap: spacing.xs },
  tile: { flex: 1, borderRadius: radii.sm * 2, borderWidth: 1, borderColor: "rgba(18, 50, 71, 0.12)", backgroundColor: PAPER, overflow: "hidden" },
  frame: { width: "100%", aspectRatio: 4 / 3 },
  picture: { width: "100%", height: undefined, aspectRatio: 4 / 3 },
  caption: { textAlign: "center", paddingVertical: 4, fontSize: 12, lineHeight: 16 },
  thumbs: { flexDirection: "row", gap: 6 },
  strip: { marginTop: spacing.sm },
  stripTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, marginBottom: spacing.xs },
  stripRow: { gap: spacing.sm, paddingRight: spacing.sm },
  stripItem: { width: 288 },
  stripName: { marginTop: 4, fontWeight: "600" },
});
