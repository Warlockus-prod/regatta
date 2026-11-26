import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { AdSlot } from '../../src/ads/AdSlot';
import { FakeHeading, FakeParagraph } from '../../src/ads/FakeContent';
import { useAdsText } from '../../src/ads/strings';
import { placement } from '../../src/ads/vox-placements';
import { Screen, Text } from '../../src/design-system/components';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * MRAID game: a 300x600 inline ad in an article. A tap expands it to full screen
 * (mraid.expand, VOX SDK 1.4.3 stretches Hybrid's fixed-size frames), where the
 * creative is a short regatta: tack up to a buoy, round it, cross the line.
 */
export default function AdsMraidGameScreen() {
  const text = useAdsText();
  const { width } = useWindowDimensions();
  return (
    <Screen>
      <Stack.Screen options={{ title: text.formats.mraidGame.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption" style={styles.note}>{text.mraidGame.note}</Text>
        <FakeHeading />
        <FakeParagraph lines={3} />
        <Text variant="caption" style={styles.slotLabel}>{text.mraidGame.slot}</Text>
        <AdSlot placement={placement('mraidGame')} width={width - spacing.lg * 2} text={text} />
        <FakeParagraph lines={5} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  note: {
    color: colors.textSecondary,
  },
  slotLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
