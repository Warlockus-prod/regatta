import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../theme';
import type { ThemeColors } from '../tokens';

interface ScreenProps {
  children: ReactNode;
  /** Skip top inset when the screen has a stack header that already insets. */
  noTopInset?: boolean;
  /** Skip bottom inset for screens hosting a tab bar that already insets. */
  noBottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Root view for any route. Applies the themed ocean background and respects
 * top + bottom safe-area insets by default. Pair with `<Stack.Screen options>`
 * to set per-route header behavior.
 */
export function Screen({
  children,
  noTopInset = false,
  noBottomInset = false,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: noTopInset ? 0 : insets.top,
          paddingBottom: noBottomInset ? 0 : insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bgPrimary,
    },
  });
