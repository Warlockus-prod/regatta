import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../design-system/tokens';

/**
 * Grey placeholder blocks for simulated screens, so the eye goes to the ad
 * slots. They stand for app content and carry no text.
 */
export function FakeCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.line, styles.title]} />
      <View style={[styles.line, { width: '85%' }]} />
      <View style={[styles.line, { width: '60%' }]} />
    </View>
  );
}

export function FakeHeading() {
  return <View style={[styles.line, styles.heading]} />;
}

export function FakeParagraph({ lines }: { lines: number }) {
  return (
    <View style={styles.paragraph}>
      {Array.from({ length: lines }, (_, index) => (
        <View key={index} style={[styles.line, { width: index === lines - 1 ? '55%' : '100%' }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  line: {
    height: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardHover,
  },
  title: {
    height: 14,
    width: '50%',
  },
  heading: {
    height: 22,
    width: '70%',
  },
  paragraph: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
});
