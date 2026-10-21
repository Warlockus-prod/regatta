import { useContext, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderHeightContext } from '@react-navigation/elements';
import { NavigationInsetContext } from '../../navigation/NavigationContext';
import { darkColors, lightColors } from '../tokens';
import { useSurface } from '../surface';

interface ScreenProps {
  children: ReactNode;
  noTopInset?: boolean;
  noBottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Root view for any route. Paints the page background (paper, or dark
 * ocean inside <DarkSurface>) and respects top + bottom safe-area insets by
 * default. Under a visible stack header the header already clears the
 * status bar, so the top inset is skipped there. Pair with
 * `<Stack.Screen options>` to set per-route header behavior.
 */
export function Screen({
  children,
  noTopInset = false,
  noBottomInset = false,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const hasNavigation = useContext(NavigationInsetContext);
  const surface = useSurface();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  return (
    <View
      style={[
        styles.root,
        surface === 'dark' && styles.dark,
        {
          paddingTop: noTopInset || headerHeight > 0 ? 0 : insets.top,
          paddingBottom: noBottomInset || hasNavigation ? 0 : insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightColors.bgPrimary,
  },
  dark: {
    backgroundColor: darkColors.bgPrimary,
  },
});
