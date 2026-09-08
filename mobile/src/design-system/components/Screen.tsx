import { useContext, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationInsetContext } from '../../navigation/NavigationContext';
import { colors } from '../tokens';

interface ScreenProps {
  children: ReactNode;
  /** Skip top inset when the screen has a stack header that already insets. */
  noTopInset?: boolean;
  /** Skip bottom inset for screens hosting a tab bar that already insets. */
  noBottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Root view for any route. Applies the dark-ocean background and respects
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
  const hasNavigation = useContext(NavigationInsetContext);
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: noTopInset ? 0 : insets.top,
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
    backgroundColor: colors.bgPrimary,
  },
});
