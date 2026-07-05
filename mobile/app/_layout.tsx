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
import { AnalyticsProvider } from '../src/analytics';
import { ThemeProvider, useTheme } from '../src/design-system/theme';

// Block the native splash from auto-hiding before the JS bundle has
// hydrated language preferences. The Gate below hides it once
// `useI18n().ready` flips true. Module-scope call so it runs before
// any UI mounts.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* The first call after the splash is already hidden throws; ignore. */
});

/**
 * Root layout. Provider stack from outside-in:
 *  - ThemeProvider: resolves Auto/Light/Dark, exposes the active palette.
 *    Outermost so every provider + screen below can read the theme.
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
    <ThemeProvider>
      <ErrorBoundary>
        <ThemedApp />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

/**
 * Reads the resolved theme and applies it to the root view, the stack's
 * default screen options, and the StatusBar. Split out so it sits below
 * ThemeProvider and can call `useTheme()`.
 */
function ThemedApp() {
  const { colors, scheme } = useTheme();
  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      <SafeAreaProvider>
        <I18nProvider>
          <AnalyticsProvider>
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
                <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
              </FirstLaunchGate>
            </SplashGate>
          </AnalyticsProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
  },
});
