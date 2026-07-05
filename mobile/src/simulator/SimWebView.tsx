import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Screen } from '../design-system/components';
import { useI18n } from '../i18n/context';
import { colors } from '../design-system/tokens';

// ============================================================================
// SimWebView - embed a web simulator route inside the app via WebView.
//
// Native expo-gl + three.js does not render under the React Native New
// Architecture (Fabric) on this stack: a raw GLView clears fine, but three's
// renderer paints nothing. So the 3D simulator (and, for full parity, V3) run
// the SAME web code in a WebView (WebGL works in iOS WKWebView). This is the
// maximally synced option: the app shows byte-identical web output.
//
// We strip the website chrome so the embed reads as a native simulator:
//  - mark every onboarding/tour flag as seen so no modals open,
//  - hide the sticky <nav> and any "get the app" banner via injected CSS,
//  - CONTAIN navigation: link taps (footer nav, the internal version switcher,
//    external credits) must not walk the user out of this chromeless,
//    back-button-less screen. Same-origin link navigations are blocked;
//    off-origin links open in the system browser.
// Language is passed through ?lang= so the embed matches the app locale.
// A watchdog + Retry guard against a dead-network blank screen, with a
// fall-through to the offline native V1 simulator.
// ============================================================================

// Matches the app-wide origin (mobile/src/api/coach.ts API_BASE) after the
// weektoregatta.com rebrand.
const ORIGIN = 'https://weektoregatta.com';
const LOAD_TIMEOUT_MS = 12000;

// localStorage flags that gate first-visit tours across the web app. Keep in
// sync with web onboarding gates (OnboardingTour, V3 TourOverlay).
const SEEN_FLAGS = ['regatta.onboarding.v1', 'regatta.v3.tour.v1'];
const SET_FLAGS = SEEN_FLAGS.map((k) => `localStorage.setItem('${k}', '1');`).join(' ');

// Runs before hydration. Also repeated in AFTER_LOAD because
// injectedJavaScriptBeforeContentLoaded is not guaranteed to re-run on
// in-page navigations.
const BEFORE_LOAD = `try { ${SET_FLAGS} } catch (e) {} true;`;

// Runs after every load: re-assert flags, hide site chrome, signal ready.
const AFTER_LOAD = `
  (function () {
    try { ${SET_FLAGS} } catch (e) {}
    var css = [
      'nav { display: none !important; }',
      'a[href*="apps.apple.com"] { display: none !important; }',
      'section:has(a[href*="apps.apple.com"]) { display: none !important; }',
      'body { background: #0a1628 !important; }'
    ].join('\\n');
    var s = document.createElement('style');
    s.setAttribute('data-embed', '1');
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
  })();
  true;
`;

export interface SimWebViewProps {
  /** Web route to embed, e.g. "/simulator-v3" or "/anatomy". */
  path: string;
  /** Stack header title. */
  title: string;
  /** Extra query params appended after lang/embed. */
  query?: Record<string, string>;
  /**
   * Allow page scrolling. Off for the simulators (they fit 100dvh by the
   * embed contract); on for content pages like /anatomy where natural scroll
   * is the right UX (OrbitControls sets touch-action:none on its canvas, so
   * orbit drags do not fight the scroll view).
   */
  scrollEnabled?: boolean;
  /** Offline fallback route (default: the native Basics/Trainer entry). */
  fallbackRoute?: string;
  /** 7-language label for the offline fallback button. */
  fallbackLabel?: string;
}

export function SimWebView({
  path,
  title,
  query,
  scrollEnabled = false,
  fallbackRoute = '/simulator',
  fallbackLabel,
}: SimWebViewProps) {
  const { lang, tp } = useI18n();
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Bumping the key remounts the WebView for a clean Retry.
  const [reloadKey, setReloadKey] = useState(0);

  const params = new URLSearchParams({ lang, embed: '1', ...(query ?? {}) });
  const uri = `${ORIGIN}${path}?${params.toString()}`;

  // Watchdog: if the page never signals ready (dead network, blocked load),
  // surface the error state instead of a blank chromeless screen.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      setFailed(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loading, reloadKey]);

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  return (
    <Screen noTopInset noBottomInset>
      <Stack.Screen options={{ title }} />
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ uri }}
        style={styles.web}
        originWhitelist={[ORIGIN]}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={scrollEnabled}
        bounces={false}
        injectedJavaScriptBeforeContentLoaded={BEFORE_LOAD}
        injectedJavaScript={AFTER_LOAD}
        onShouldStartLoadWithRequest={(req) => {
          // A link tap must not navigate the embed away from the simulator.
          // Sim interactions are JS state, not URL loads, so they are
          // unaffected; only real anchor navigations reach here as 'click'.
          if (req.navigationType === 'click') {
            if (!req.url.startsWith(ORIGIN)) {
              Linking.openURL(req.url).catch(() => {});
            }
            return false;
          }
          return true;
        }}
        onMessage={(e: WebViewMessageEvent) => {
          if (e.nativeEvent.data === 'ready') setLoading(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        startInLoadingState={false}
      />
      {loading && !failed && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.accentCyan} size="large" />
        </View>
      )}
      {failed && (
        <View style={styles.overlay}>
          <Text style={styles.errText}>
            {tp(
              'Не удалось загрузить симулятор. Нужен интернет.',
              'The simulator failed to load. An internet connection is required.',
              'Nie udalo sie zaladowac symulatora. Potrzebny internet.',
              {
                es: 'No se pudo cargar el simulador. Se necesita conexion a internet.',
                fr: 'Echec du chargement du simulateur. Une connexion internet est requise.',
                de: 'Simulator konnte nicht geladen werden. Internetverbindung erforderlich.',
                it: 'Impossibile caricare il simulatore. Serve una connessione internet.',
              },
            )}
          </Text>
          <View style={styles.btnRow}>
            <Pressable
              onPress={retry}
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryText}>
                {tp('Повторить', 'Retry', 'Ponow', {
                  es: 'Reintentar',
                  fr: 'Reessayer',
                  de: 'Erneut versuchen',
                  it: 'Riprova',
                })}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace(fallbackRoute)}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.btnPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.btnGhostText}>
                {fallbackLabel ??
                  tp('Открыть Тренажёр (офлайн)', 'Open the Trainer (offline)', 'Otworz Trener (offline)', {
                    es: 'Abrir el Entrenador (sin conexion)',
                    fr: "Ouvrir l'Entraineur (hors ligne)",
                    de: 'Trainer offnen (offline)',
                    it: 'Apri il Trainer (offline)',
                  })}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.bgPrimary },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: 32,
    gap: 20,
  },
  errText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnPressed: { opacity: 0.7 },
  btnPrimary: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: colors.accentCyan,
  },
  btnPrimaryText: {
    color: colors.accentCyan,
    fontWeight: '700',
    fontSize: 15,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(139, 167, 184, 0.4)',
  },
  btnGhostText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
});
