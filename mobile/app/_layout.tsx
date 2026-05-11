import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../src/i18n/context';
import { ErrorBoundary } from '../src/design-system/components';
import { FirstLaunchGate } from '../src/onboarding/first-launch-language';
import { colors } from '../src/design-system/tokens';

// Block the native splash from auto-hiding before the JS bundle has
// hydrated language preferences. The Gate below hides it once
// `useI18n().ready` flips true. Module-scope call so it runs before
// any UI mounts.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* The first call after the splash is already hidden throws; ignore. */
});

/**
 * Root layout. Provider stack from outside-in:
 *  - GestureHandlerRootView: required for any react-native-gesture-handler usage.
 *  - SafeAreaProvider: feeds insets to <Screen> and any other inset-aware code.
 *  - I18nProvider: hydrates language from AsyncStorage / device locale.
 *  - SplashGate: hides the native splash once i18n hydration finishes,
 *    so the user never sees the wrong language flash on first paint.
 *  - Stack: expo-router stack navigator. Per-route options are set via
 *    `<Stack.Screen options={...} />` inside each route file.
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <I18nProvider>
            <SplashGate>
              <FirstLaunchGate>
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
              </FirstLaunchGate>
            </SplashGate>
          </I18nProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

/**
 * Hides the native splash once `useI18n().ready` flips true. Living as
 * a child of `I18nProvider` so it can read the context without leaking
 * I18n internals into the SplashScreen API.
 */
function SplashGate({ children }: { children: ReactNode }) {
  const { ready } = useI18n();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {
      /* ignore; either already hidden or the module isn't initialized in
         a non-native test environment. */
    });
  }, [ready]);

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
