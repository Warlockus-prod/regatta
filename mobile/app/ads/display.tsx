import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { AdSlot } from '../../src/ads/AdSlot';
import { FakeCard, FakeHeading, FakeParagraph } from '../../src/ads/FakeContent';
import { useAdsText, type AdsText } from '../../src/ads/strings';
import { placement } from '../../src/ads/vox-placements';
import { Screen, Text } from '../../src/design-system/components';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Display banners: one simulated screen per page, swiped horizontally.
 * A page requests its ad the first time it is shown, as a real screen would.
 */
const PAGES = ['bottom', 'mrec', 'feed', 'halfPage', 'leaderboard'] as const;
type Page = typeof PAGES[number];

export default function AdsDisplayScreen() {
  const text = useAdsText();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]));

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setPage(index);
    setVisited((previous) => (previous.has(index) ? previous : new Set(previous).add(index)));
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: text.formats.display.title }} />
      <View style={styles.tabs}>
        {PAGES.map((key, index) => (
          <View key={key} style={[styles.dot, index === page && styles.dotActive]} />
        ))}
      </View>
      <Text variant="caption" style={styles.pageTitle}>
        {`${text.display[PAGES[page]]}  ·  ${page + 1}/${PAGES.length}  ·  ${text.swipeHint}`}
      </Text>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {PAGES.map((key, index) => (
          <View key={key} style={{ width }}>
            <DisplayPage page={key} active={visited.has(index)} text={text} slotWidth={width - spacing.lg * 2} />
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

function DisplayPage({ page, active, text, slotWidth }: { page: Page; active: boolean; text: AdsText; slotWidth: number }) {
  if (page === 'bottom') {
    return (
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content}>
          <FakeHeading />
          <FakeCard />
          <FakeCard />
          <FakeCard />
          <FakeCard />
        </ScrollView>
        {/* Anchored banner: fixed at the bottom of the screen above the tab bar. */}
        <View style={styles.anchored}>
          {active ? <AdSlot placement={placement('banner320x50')} width={slotWidth} text={text} /> : null}
        </View>
      </View>
    );
  }
  const slot = {
    mrec: 'banner300x250',
    feed: 'banner320x480',
    halfPage: 'banner300x600',
    leaderboard: 'banner728x90',
  }[page];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {page === 'leaderboard' && active ? <AdSlot placement={placement(slot)} width={slotWidth} text={text} /> : null}
      {page === 'feed' ? <><FakeCard /><FakeCard /></> : <><FakeHeading /><FakeParagraph lines={5} /></>}
      {page !== 'leaderboard' && active ? <AdSlot placement={placement(slot)} width={slotWidth} text={text} /> : null}
      {page === 'feed' ? <><FakeCard /><FakeCard /></> : <FakeParagraph lines={6} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCardHover,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.accentCyan,
  },
  pageTitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  anchored: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderCyanFaint,
    backgroundColor: colors.bgPrimary,
  },
});
