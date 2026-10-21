import { ImageBackground, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../design-system/components";
import { colors, radii } from "../design-system/tokens";

interface PhotoCardProps {
  source: ImageSourcePropType;
  title: string;
  caption?: string;
  eyebrow?: string;
  onPress: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A photo with its label on a dark fade at the bottom. The photo sets the
 * mood only; the label is live text, never baked into the image.
 */
export function PhotoCard({ source, title, caption, eyebrow, onPress, height = 156, style }: PhotoCardProps) {
  return <Pressable accessibilityRole="button" accessibilityLabel={[eyebrow, title, caption].filter(Boolean).join(". ")} onPress={onPress}
    style={({ pressed }) => [styles.card, { height }, pressed && styles.pressed, style]}>
    <ImageBackground source={source} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
    <LinearGradient colors={["rgba(8, 40, 60, 0)", "rgba(8, 40, 60, 0.78)"]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
    <View style={styles.text}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title} numberOfLines={3}>{title}</Text>
      {caption ? <Text style={styles.caption} numberOfLines={2}>{caption}</Text> : null}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, overflow: "hidden", backgroundColor: "#0c4f6e", justifyContent: "flex-end" },
  pressed: { opacity: 0.9 },
  text: { padding: 14, gap: 2 },
  eyebrow: { color: colors.onPhoto, fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.92 },
  title: { color: colors.onPhoto, fontSize: 17, lineHeight: 21, fontWeight: "700" },
  caption: { color: colors.onPhoto, fontSize: 13, lineHeight: 18, opacity: 0.92 },
});
