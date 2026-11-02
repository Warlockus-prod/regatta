import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VoxAds } from '../../modules/vox-ads';
import { VoxPrebid } from '../../modules/vox-prebid';
import { sdkAvailable } from '../../src/ads/AdSlot';
import { AD_FORMATS, AD_FORMAT_ROUTES } from '../../src/ads/formats';
import { AD_SDKS, setAdSdk, useAdSdk } from '../../src/ads/sdk';
import { useAdsText } from '../../src/ads/strings';
import { Card, Screen, Text } from '../../src/design-system/components';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Settings -> Ads. SDK switch (VOX SDK 1 / VOX SDK 2) and the list of ad
 * formats; each opens a simulated app screen with real requests through the
 * selected SDK. "In-game" is the bundled 3D yacht scene.
 */
export default function AdsFormatsScreen() {
  const text = useAdsText();
  const sdk = useAdSdk();
  const version = sdk === 'vox1' ? VoxAds?.sdkVersion : VoxPrebid?.sdkVersion;
  return (
    <Screen>
      <Stack.Screen options={{ title: text.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.intro}>
          <View style={styles.switch} accessibilityRole="tablist" accessibilityLabel={text.sdkLabel}>
            {AD_SDKS.map((id) => (
              <Pressable
                key={id}
                onPress={() => setAdSdk(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: sdk === id }}
                style={[styles.switchItem, sdk === id && styles.switchItemActive]}
              >
                <Text variant="subtitle" style={sdk === id ? styles.switchTextActive : styles.switchText}>
                  {id === 'vox1' ? 'VOX SDK 1' : 'VOX SDK 2'}
                </Text>
              </Pressable>
            ))}
          </View>
          {version ? <Text variant="caption" style={styles.secondary}>{version}</Text> : null}
          <Text variant="caption" style={styles.secondary}>{sdk === 'vox1' ? text.intro : text.sdk2Note}</Text>
          {sdkAvailable(sdk) ? null : <Text variant="caption" style={styles.warning}>{text.unavailable}</Text>}
        </Card>

        <Text variant="muted" style={styles.sectionLabel}>{text.formatsLabel.toUpperCase()}</Text>
        <View style={styles.list}>
          {AD_FORMATS.map((format) => (
            <Card
              key={format}
              onPress={() => router.push(AD_FORMAT_ROUTES[format])}
              accessibilityLabel={text.formats[format].title}
            >
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="subtitle">{text.formats[format].title}</Text>
                  <Text variant="caption" style={styles.secondary}>{text.formats[format].hint}</Text>
                </View>
                <Text variant="accent" style={styles.chevron}>{'>'}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: {
    gap: spacing.sm,
  },
  switch: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.control,
    backgroundColor: colors.bgSecondary,
  },
  switchItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  switchItemActive: {
    backgroundColor: colors.accentCyan,
  },
  switchText: {
    color: colors.textSecondary,
  },
  switchTextActive: {
    color: colors.bgPrimary,
  },
  secondary: {
    color: colors.textSecondary,
  },
  warning: {
    color: colors.warning,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  chevron: {
    fontSize: 18,
  },
});
