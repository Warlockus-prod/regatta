import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../src/i18n/context';
import { colors } from '../src/design-system/tokens';

/**
 * Root layout. Provider stack from outside-in:
 *  - GestureHandlerRootView: required for any react-native-gesture-handler usage.
 *  - SafeAreaProvider: feeds insets to <Screen> and any other inset-aware code.
 *  - I18nProvider: hydrates language from AsyncStorage / device locale.
 *  - Stack: expo-router stack navigator. Per-route options are set via
 *    `<Stack.Screen options={...} />` inside each route file.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <I18nProvider>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.bgPrimary },
              headerStyle: { backgroundColor: colors.bgPrimary },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: { color: colors.textPrimary },
              animation: 'slide_from_right',
            }}
          />
          <StatusBar style="light" />
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
