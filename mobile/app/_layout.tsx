import { DiagnosticLifecycle } from '../src/diagnostics/DiagnosticLifecycle';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../src/i18n/context';
import { ErrorBoundary } from '../src/design-system/components';
import { FirstLaunchGate } from '../src/onboarding/first-launch-language';
import { AnalyticsProvider } from '../src/analytics';
import { AppNavigation } from '../src/navigation/AppNavigation';
import { colors, darkColors } from '../src/design-system/tokens';
import { usesDarkNavigation } from '../src/navigation/visibility';
import { isFoundationLesson } from '../src/bootcamp/lesson-position';
import { ReturnToLesson } from '../src/bootcamp/ReturnToLesson';
import { AppFontContext, SOURCE_SANS_FONTS } from '../src/design-system/fonts';
import { ActivityBack, activityHubForRoute } from '../src/navigation/ActivityBack';

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
  const [fontsLoaded, fontError] = useFonts(SOURCE_SANS_FONTS);
  return (
    <AppFontContext.Provider value={fontsLoaded}><ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <I18nProvider>
            <AnalyticsProvider>
              <SplashGate fontsReady={fontsLoaded || Boolean(fontError)}>
                <FirstLaunchGate>
                  <DiagnosticLifecycle />
                  <AppNavigation>
                  <Stack
                    screenOptions={({ route }) => ({
                      headerBackVisible: false,
                      headerLeft: ({ tintColor }) => <ActivityBack fallback={activityHubForRoute(route.name)} tintColor={tintColor} />,
                      ...(isFoundationLesson((route.params as { fromLesson?: string } | undefined)?.fromLesson) ? {
                        headerBackVisible: false,
                        headerLeft: ({ tintColor }) => <ReturnToLesson id={(route.params as { fromLesson: string }).fromLesson} tintColor={tintColor} />,
                      } : {}),
                      contentStyle: { backgroundColor: colors.bgPrimary },
                      headerStyle: { backgroundColor: colors.bgPrimary },
                      headerShadowVisible: false,
                      // Chevron only: with large text iOS clipped the back title ("лавн").
                      headerBackButtonDisplayMode: 'minimal',
                      headerTintColor: colors.accentCyan,
                      headerTitleStyle: { color: usesDarkNavigation(`/${route.name}`) ? darkColors.textPrimary : colors.textPrimary, fontFamily: fontsLoaded ? 'SourceSans3Bold' : undefined, fontWeight: fontsLoaded ? 'normal' : '700' },
                      animation: 'slide_from_right',
                      // Scene-based apps (iOS 27) ignore the UIApplication status bar
                      // API, so each screen sets its style through react-native-screens
                      // (UIViewControllerBasedStatusBarAppearance in app.json).
                      statusBarStyle: 'dark',
                    })}
                  />
                  </AppNavigation>
                </FirstLaunchGate>
              </SplashGate>
            </AnalyticsProvider>
          </I18nProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary></AppFontContext.Provider>
  );
}

/**
 * Hides the native splash once `useI18n().ready` flips true. Living as
 * a child of `I18nProvider` so it can read the context without leaking
 * I18n internals into the SplashScreen API.
 */
function SplashGate({ children, fontsReady }: { children: ReactNode; fontsReady: boolean }) {
  const { ready } = useI18n();

  useEffect(() => {
    if (!ready || !fontsReady) return;
    SplashScreen.hideAsync().catch(() => {
      /* ignore; either already hidden or the module isn't initialized in
         a non-native test environment. */
    });
  }, [ready, fontsReady]);

  return fontsReady ? <>{children}</> : null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
