import { Stack } from 'expo-router';
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
// SectionWebView - embed a WHOLE web section (its landing + all sub-pages) as
// an in-app course. Unlike SimWebView (single chromeless simulator page), this:
//   - keeps the section's own subnav and ALLOWS in-section navigation, so the
//     user can move between the section pages (guide / simulator / tasks / ...);
//   - hides only the GLOBAL site nav (the web already drops it on ?embed=1);
//   - GRANTS the microphone so the SRC radio voice simulator works (getUserMedia
//     in WKWebView needs mediaCapturePermissionGrantType + NSMicrophoneUsage-
//     Description in Info.plist, both wired here / in app.json);
//   - forces Polish (?lang=pl): the motorowodny section (sternik + radio) exists
//     only in PL and RU, and in the app it is a Polish licence course.
// Navigation OUT of the section (other site areas) or off-origin opens in the
// system browser instead of walking the user out of the embed.
// ============================================================================

const ORIGIN = 'https://weektoregatta.com';
const LOAD_TIMEOUT_MS = 15000;

const SEEN_FLAGS = [
  'regatta.onboarding.v1',
  'regatta.v3.tour.v1',
  'sternik.radio.onboard.v1',
];
const SET_FLAGS = SEEN_FLAGS.map((k) => `localStorage.setItem('${k}', '1');`).join(' ');
const BEFORE_LOAD = `try { ${SET_FLAGS} } catch (e) {} true;`;

// Re-assert flags, hide ONLY the global sticky nav + the "get the app" banner,
// keep the section subnav, and signal ready.
const AFTER_LOAD = `
  (function () {
    try { ${SET_FLAGS} } catch (e) {}
    var css = [
      'nav.sticky { display: none !important; }',
      'a[href*="apps.apple.com"] { display: none !important; }',
      'section:has(a[href*="apps.apple.com"]) { display: none !important; }'
    ].join('\\n');
    var s = document.createElement('style');
    s.setAttribute('data-embed', '1');
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
  })();
  true;
`;

export interface SectionWebViewProps {
  /** Section landing to load first, e.g. "/radio" or "/sternik". */
  path: string;
  /** Path prefix in-section navigation may stay within, e.g. "/radio". */
  section: string;
  /** Stack header title. */
  title: string;
}

export function SectionWebView({ path, section, title }: SectionWebViewProps) {
  const { tp } = useI18n();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const uri = `${ORIGIN}${path}?lang=pl&embed=1`;

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
        // iOS 15+: grant getUserMedia (the SRC voice simulator) without a second
        // web-level prompt; the native mic prompt still appears once, gated by
        // NSMicrophoneUsageDescription (app.json / Info.plist).
        mediaCapturePermissionGrantType="grant"
        bounces={false}
        injectedJavaScriptBeforeContentLoaded={BEFORE_LOAD}
        injectedJavaScript={AFTER_LOAD}
        onShouldStartLoadWithRequest={(req) => {
          if (req.navigationType !== 'click') return true;
          // Stay inside the section: allow its own links (subnav, practice
          // links). Other same-origin areas and off-origin links open in the
          // system browser rather than walking the user out of the course.
          if (req.url.startsWith(`${ORIGIN}${section}`)) return true;
          if (!req.url.startsWith(ORIGIN)) {
            Linking.openURL(req.url).catch(() => {});
          }
          return false;
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
              'Не удалось загрузить курс. Нужен интернет.',
              'The course failed to load. An internet connection is required.',
              'Nie udalo sie zaladowac kursu. Potrzebny internet.',
              {
                es: 'No se pudo cargar el curso. Se necesita conexion a internet.',
                fr: 'Echec du chargement du cours. Une connexion internet est requise.',
                de: 'Kurs konnte nicht geladen werden. Internetverbindung erforderlich.',
                it: 'Impossibile caricare il corso. Serve una connessione internet.',
              },
            )}
          </Text>
          <Pressable
            onPress={retry}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>
              {tp('Повторить', 'Retry', 'Ponow', {
                es: 'Reintentar',
                fr: 'Reessayer',
                de: 'Erneut versuchen',
                it: 'Riprova',
              })}
            </Text>
          </Pressable>
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
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: colors.accentCyan,
  },
  btnPressed: { opacity: 0.7 },
  btnText: {
    color: colors.accentCyan,
    fontWeight: '700',
    fontSize: 15,
  },
});
