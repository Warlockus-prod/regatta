import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text } from "../design-system/components/Text";
import { colors } from "../design-system/tokens";

/**
 * The one look of every custom "back" in a native header: a drawn chevron and
 * a word, centred with the same padding on both sides.
 *
 * Owner, TestFlight 84 ("the back button is crooked"): iOS 26 puts a custom
 * header item into its own glass capsule. The old buttons were a text "‹" with
 * padding on the right only, so the word sat against the capsule's left edge and
 * an empty band filled its right side. Here the content is symmetric, so the
 * capsule is even; before iOS 26 there is no capsule and it reads as a plain
 * tinted back.
 */
export function HeaderBackButton(props: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  tintColor?: string;
  testID?: string;
}) {
  const tint = props.tintColor ?? colors.accentCyan;
  return <Pressable accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? props.label} onPress={props.onPress}
    hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }} testID={props.testID ?? "header-back"}
    style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <View style={styles.row}>
      <Svg width={10} height={17} viewBox="0 0 10 17" accessibilityElementsHidden importantForAccessibility="no">
        <Path d="M8.5 1.5 1.5 8.5l7 7" stroke={tint} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>{props.label}</Text>
    </View>
  </Pressable>;
}

/** Horizontal padding of the button on each side; the floating back over a turned trainer adds its own card around it. */
export const HEADER_BACK_PADDING = 8;

const styles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: HEADER_BACK_PADDING },
  pressed: { opacity: 0.6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 16, lineHeight: 20 },
});
