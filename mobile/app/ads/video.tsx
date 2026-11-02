import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { AdSlot } from '../../src/ads/AdSlot';
import { FakeHeading, FakeParagraph } from '../../src/ads/FakeContent';
import { useAdsText } from '../../src/ads/strings';
import { placement } from '../../src/ads/vox-placements';
import { Screen, Text } from '../../src/design-system/components';
import { colors, spacing } from '../../src/design-system/tokens';

/** In-content VAST video inside an article: horizontal 16:9, then vertical 9:16. */
export default function AdsVideoScreen() {
  const text = useAdsText();
  const { width } = useWindowDimensions();
  const slotWidth = width - spacing.lg * 2;
  return (
    <Screen>
      <Stack.Screen options={{ title: text.formats.video.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <FakeHeading />
        <FakeParagraph lines={4} />
        <Text variant="caption" style={styles.label}>{text.video.horizontal}</Text>
        <AdSlot placement={placement('videoHorizontal')} width={slotWidth} text={text} />
        <FakeParagraph lines={5} />
        <Text variant="caption" style={styles.label}>{text.video.vertical}</Text>
        <AdSlot placement={placement('videoVertical')} width={Math.round(slotWidth * 0.7)} text={text} />
        <FakeParagraph lines={3} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    color: colors.textSecondary,
  },
});
