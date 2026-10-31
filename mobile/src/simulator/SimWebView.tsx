import { Stack, useRouter, type Href } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Screen, Text } from '../design-system/components';
import { useI18n } from '../i18n/context';
import { colors } from '../design-system/tokens';
import { AppSurface, appStackOptions } from '../design-system/surface';
import { APP_EMBED_THEME_SCRIPT } from '../design-system/embedded-theme';
import { isFoundationLesson } from '../bootcamp/lesson-position';
import { findSailLesson } from "../../../src/data/sailing-lab/course";
import { guideCopy } from "../../../src/data/sailing-lab/lesson-guide";
import { handleCheckpointMessage } from "../sailing/checkpoint-storage";
import { useAnalyticsConsent, webAnalyticsGuardScript } from '../persistence/analytics-consent';
import { useControlPrefs } from '../persistence/controls';
import { useLandscapeWhileFocused } from './orientation';
import { isRaceShell, raceFrameInsets, raceOverlayInsets, raceProcessRecovery, raceShellStackOptions, useKeepAwakeWhileFocused } from './race-shell';
import { ActivityBack } from '../navigation/ActivityBack';
import { ReturnToLesson } from '../bootcamp/ReturnToLesson';
import { sailingNativeDestination } from '../navigation/sailing-entry';
import { handleNativeDiagnosticMessage, recordNativeDiagnostic } from '../diagnostics/journal';
import { nativeRaceHaptics } from './race-haptics';

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
// The in-app "Anonymous analytics" switch reaches the page too: when it is
// off, the no-analytics flag is injected before the page's own scripts, and
// the WebView is keyed on the choice so a change reloads it.
// A watchdog + Retry guard against a dead-network blank screen, with a
// fall-through to the offline native V1 simulator.
// ============================================================================

// Matches the app-wide origin (mobile/src/api/coach.ts API_BASE) after the
// weektoregatta.com rebrand.
const ORIGIN = 'https://weektoregatta.com';
const LOAD_TIMEOUT_MS = 12000;

// localStorage flags that gate first-visit tours across the web app. Keep in
// sync with web onboarding gates (OnboardingTour, V3 TourOverlay).
const SEEN_FLAGS = [
  'regatta.onboarding.v1',
  'regatta.v3.tour.v1',
  // The 3D boat has its own 5-step tour (src/features/simulator-3d/
  // Simulator3D.tsx). It was missing here, so it popped over the scene the
  // first time the 3D tier opened in the app.
  'regatta.3d.tour.v1',
];
const SET_FLAGS = SEEN_FLAGS.map((k) => `localStorage.setItem('${k}', '1');`).join(' ');

// Runs before hydration. Also repeated in AFTER_LOAD because
// injectedJavaScriptBeforeContentLoaded is not guaranteed to re-run on
// in-page navigations.
// The native host supplies presentation without changing the website preference.
const BEFORE_LOAD = APP_EMBED_THEME_SCRIPT + `try { ${SET_FLAGS} } catch (e) {} true;`;

// Runs after every load: re-assert flags, hide site chrome, signal ready.
const AFTER_LOAD = `
  (function () {
    try { ${SET_FLAGS} } catch (e) {}
    var css = [
      'nav[data-product-navigation] { display: none !important; }',
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

/**
 * Which learning tier this screen is, when it is one. Set it to render the
 * native tier switcher under the header.
 *
 * The web pages carry their own Osnovy/Trenazher/Lodka 3D switcher at the top,
 * but every embed hides it (the pages gate it behind !embed, and we also drop
 * the site nav) so a tap cannot walk the user out of the chromeless screen.
 * The owner reported the missing switcher as a bug, so the app provides its own
 * native one that swaps the embedded route instead of navigating the web page.
 */
export type SimTier = 'basics' | 'trainer' | 'boat3d';

export interface SimWebViewProps {
  /** Web route to embed, e.g. "/simulator-v3" or "/anatomy". */
  path: string;
  /** Stack header title. */
  title: string;
  /** Extra query params appended after lang/embed. */
  query?: Record<string, string>;
  /** Render the native tier switcher and mark this tier active. */
  tier?: SimTier;
  /**
   * Allow the reserved docks and multi-step menus to scroll. The scene and
   * wheels own their gestures with touch-action:none; disabling the whole
   * WKWebView can also prevent learners from reaching dock content.
   */
  scrollEnabled?: boolean;
  /** Offline fallback route (default: the native Basics/Trainer entry). */
  fallbackRoute?: string;
  /** 7-language label for the offline fallback button. */
  fallbackLabel?: string;
  /** Bundled, self-contained content. Never falls through to a remote URL. */
  offlineSource?: WebViewProps["source"] | number;
  /** The race owns its navigation bar inside the reserved control area. */
  fullScreen?: boolean;
  /** Saved canonical race log for the shared local replay renderer. */
  raceReplay?: unknown;
  /** Trusted local content messages, handled by the owning activity. */
  onOfflineMessage?: (message: string, inject: (script: string) => void) => void;
  /** Extra startup bridge code for the bundled activity. */
  offlineBridgeScript?: string;
  /**
   * App preferences the page reads from localStorage (the race venue, the
   * shore switch). Written before the page runs; a later change is written
   * into the live page with a "storage" event, so it updates without a reload.
   */
  localStorage?: Record<string, string | null>;
}

export function SimWebView({
  path,
  title,
  query,
  tier,
  scrollEnabled = true,
  fallbackRoute = '/simulator',
  fallbackLabel,
  offlineSource,
  fullScreen = false,
  raceReplay,
  onOfflineMessage,
  offlineBridgeScript = "",
  localStorage: pageStorage,
}: SimWebViewProps) {
  const { lang, tp, tl } = useI18n();
  const router = useRouter();
  const { enabled: analyticsOn, ready: consentReady } = useAnalyticsConsent();
  // Trainer controls (sliders or wheels, sound) live in the app: the page gets
  // them before it runs and posts back what the learner changes in the
  // trainer's own settings sheet (src/features/trainer-controls/prefs.ts).
  // The WebView does not wait for the stored record: a later read reaches the
  // page through the injection effect below, without a reload.
  const { prefs: controlPrefs, replace: replaceControls, ready: controlsReady } = useControlPrefs();
  // Only the trainers turn with the phone; content pages (anatomy) stay portrait.
  useLandscapeWhileFocused(Boolean(tier) || path === "/game");
  // A race keeps the display on and stays out of the landscape side insets.
  useKeepAwakeWhileFocused(isRaceShell(path));
  // The context, not useSafeAreaInsets: a host without a provider renders unpadded.
  const safeArea = useContext(SafeAreaInsetsContext);
  const frameInsets = raceFrameInsets(safeArea, fullScreen);
  const { width: winW, height: winH } = useWindowDimensions();
  // Turned phone: the trainer needs the height for the boat, the tier
  // switcher comes back when the phone is upright.
  const landscape = winW > winH && winH < 600;
  const controlsJson = JSON.stringify(controlPrefs);
  const controlsScript = `window.__REGATTA_CONTROLS__ = ${controlsJson}; true;`;
  const storageJson = JSON.stringify(pageStorage ?? {});
  const storageScript = `try { var s = ${storageJson}; for (var k in s) { if(s[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, s[k]); } } catch (e) {} true;`;
  const raceScript = path === "/game" && offlineSource
    ? `window.__REGATTA_RACE_NATIVE__ = true; window.__REGATTA_RACE_REPLAY__ = ${JSON.stringify(raceReplay ?? null)}; true;`
    : "";
  const returnLesson = findSailLesson(query?.lesson ?? "");
  const backFallback = path === "/anatomy" ? "/menu" : path === "/game" ? "/race" : "/simulators";

  // The three learning tiers, in the site's order. `replace` (not `push`) keeps
  // the back button pointing at the hub instead of stacking simulators.
  const tiers: { id: SimTier; route: string; label: string }[] = [
    {
      id: 'basics',
      route: '/simulator-v1',
      label: tp('Основы', 'Basics', 'Podstawy', {
        es: 'Fundamentos', fr: 'Bases', de: 'Grundlagen', it: 'Basi',
      }),
    },
    {
      id: 'trainer',
      route: '/simulator-v3',
      label: tp('Тренажёр', 'Trainer', 'Trenażer', {
        es: 'Trimado', fr: 'Réglage', de: 'Trainer', it: 'Regolazione',
      }),
    },
    {
      id: 'boat3d',
      route: '/simulator2',
      label: tp('Лодка 3D', '3D Boat', 'Łódka 3D', {
        es: 'Barco 3D', fr: 'Bateau 3D', de: '3D-Boot', it: 'Barca 3D',
      }),
    },
  ];
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Bumping the key remounts the WebView for a clean Retry.
  const [reloadKey, setReloadKey] = useState(0);
  // The local race reloads itself once when the system kills its web
  // process (memory pressure, a long background) and says so.
  const autoReloadAt = useRef<number | null>(null);
  const [processNotice, setProcessNotice] = useState(false);
  const headerShown = !fullScreen || loading || failed;
  const overlayInsets = raceOverlayInsets(safeArea, fullScreen, headerShown);

  const params = new URLSearchParams({ lang, embed: '1', ...(query ?? {}) });
  const uri = `${ORIGIN}${path}?${params.toString()}`;
  const bundledSource = typeof offlineSource === "number" ? Image.resolveAssetSource(offlineSource) : offlineSource;
  const bundledUri = bundledSource && "uri" in bundledSource ? bundledSource.uri : undefined;
  // Metro serves assets over HTTP in development only. Release resolves the
  // same require() to a bundled file; navigation stays confined to that asset.
  const developmentOrigin = __DEV__ && bundledUri?.startsWith("http") ? new URL(bundledUri).origin : null;
  const hasCheckpointBridge = Boolean(offlineSource && path === "/simulator-v3");
  const diagnosticSurface = path === "/game" ? raceReplay ? "replay" : "race" : path === "/anatomy" ? "anatomy" : tier === "boat3d" ? "boat" : tier === "basics" ? "basics" : "trainer";
  // M3-4: __REGATTA_RACE_HAPTICS__ tells the race page this app plays race-haptic messages (race screens only);
  // without it the page offers no Vibration switch, so an older build never shows one that does nothing.
  const languageScript = `window.__REGATTA_SAILING_STORAGE__ = ${hasCheckpointBridge}; window.__REGATTA_RACE_HAPTICS__ = ${isRaceShell(path)}; window.__REGATTA_LANGUAGE__ = ${JSON.stringify(lang)}; window.__REGATTA_EMBED__ = ${JSON.stringify({ path, query: new URLSearchParams(query ?? {}).toString() })}; window.dispatchEvent(new Event("regatta-language")); window.dispatchEvent(new Event("regatta-embed")); true;`;
  useEffect(() => {
    if (offlineSource) webRef.current?.injectJavaScript(languageScript);
  }, [offlineSource, languageScript]);
  // A change from the app Settings (or echoed from the page) reaches a mounted page without a reload.
  useEffect(() => {
    webRef.current?.injectJavaScript(`window.__REGATTA_CONTROLS__ = ${controlsJson}; window.dispatchEvent(new CustomEvent("regatta:controls-prefs")); true;`);
  }, [controlsJson]);

  useEffect(() => {
    if (storageJson !== "{}") webRef.current?.injectJavaScript(`${storageScript} window.dispatchEvent(new Event("storage")); true;`);
  }, [storageJson, storageScript]);

  // Watchdog: if the page never signals ready (dead network, blocked load),
  // surface the error state instead of a blank chromeless screen.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "error", outcome: "failed", reason: "timeout", attempt: reloadKey });
      setLoading(false);
      setFailed(true);
    }, tier === 'boat3d' ? 30000 : LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loading, reloadKey, tier]);

  const retry = () => {
    recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "retry", outcome: "accepted", attempt: reloadKey });
    setProcessNotice(false);
    setFailed(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // iOS onContentProcessDidTerminate and Android onRenderProcessGone. The
  // remounted race opens on its menu, where the page offers to resume the
  // saved setup; any other surface, or a second loss soon after, shows Retry.
  const processGone = () => {
    recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "process-terminated", outcome: "failed", reason: "webview-process", attempt: reloadKey });
    const now = Date.now();
    if (path === "/game" && offlineSource && raceProcessRecovery(autoReloadAt.current, now) === "reload") {
      autoReloadAt.current = now;
      recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "retry", outcome: "accepted", reason: "webview-process", attempt: reloadKey });
      setProcessNotice(true);
      setFailed(false);
      setLoading(true);
      setReloadKey((k) => k + 1);
      return;
    }
    setProcessNotice(false);
    setLoading(false);
    setFailed(true);
  };
  useEffect(() => {
    if (!processNotice) return;
    const t = setTimeout(() => setProcessNotice(false), 8000);
    return () => clearTimeout(t);
  }, [processNotice]);

  return (
    <AppSurface><Screen noTopInset={!fullScreen} style={frameInsets}>
      <Stack.Screen options={{ ...appStackOptions, ...raceShellStackOptions(path), title, headerShown, headerBackVisible: false,
        headerLeft: () => returnLesson
          ? <Pressable accessibilityRole="button" accessibilityLabel={guideCopy.return[lang]} onPress={() => router.dismissTo({ pathname: "/learn/sails/[lesson]", params: { lesson: returnLesson.id } })} style={styles.headerBack}><Text style={{ color: colors.accentCyan }}>‹ {guideCopy.return[lang]}</Text></Pressable>
          : isFoundationLesson(query?.fromLesson)
            ? <ReturnToLesson id={query!.fromLesson} tintColor={colors.accentCyan} />
            : <ActivityBack fallback={backFallback} tintColor={colors.accentCyan} />,
      }} />
      {tier && !landscape && !returnLesson && !isFoundationLesson(query?.fromLesson) && (
        <View style={styles.tierBar} accessibilityRole="tablist">
          {tiers.map((t) => {
            const active = t.id === tier;
            return (
              <Pressable
                key={t.id}
                onPress={() => { if (!active) router.replace(t.route); }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
                style={({ pressed }) => [
                  styles.tierChip,
                  active && styles.tierChipActive,
                  pressed && !active && styles.btnPressed,
                ]}
              >
                <Text style={[styles.tierText, active && styles.tierTextActive]} numberOfLines={1}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {/* Mount once the analytics choice is known so the first load already
          carries the flag; the key includes the choice. */}
      {consentReady && (path !== "/game" || controlsReady) && <WebView
        key={`${reloadKey}-${analyticsOn ? 'a' : 'na'}`}
        ref={webRef}
        source={offlineSource ? bundledSource ?? { html: "" } : { uri }}
        style={styles.web}
        originWhitelist={offlineSource ? ["file://*", "about:blank", ...(developmentOrigin ? [developmentOrigin] : [])] : [ORIGIN]}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={scrollEnabled}
        bounces={false}
        injectedJavaScriptBeforeContentLoaded={webAnalyticsGuardScript(analyticsOn) + raceScript + languageScript + controlsScript + storageScript + offlineBridgeScript + BEFORE_LOAD}
        injectedJavaScript={APP_EMBED_THEME_SCRIPT + languageScript + controlsScript + AFTER_LOAD}
        onShouldStartLoadWithRequest={(req) => {
          if (offlineSource) return req.navigationType !== "click" && (req.url.startsWith("file://") || req.url === "about:blank" || Boolean(developmentOrigin && req.url === bundledUri));
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
          const status = e.nativeEvent.data;
          if (handleNativeDiagnosticMessage(status, diagnosticSurface)) return;
          // M3-4: race events vibrate through expo-haptics; only race screens may ask, never passed on.
          if (nativeRaceHaptics.handle(path, status) !== null) return;
          if (offlineSource && status.startsWith("{")) {
            const owner = webRef.current;
            onOfflineMessage?.(status, script => { if (owner && webRef.current === owner) owner.injectJavaScript(script); });
          }
          if (offlineSource && path !== "/game" && status.length <= 1024 && status.startsWith("{")) {
            try {
              const data = JSON.parse(status) as { type?: string; href?: unknown };
              if (data.type === "native-navigate") {
                const destination = sailingNativeDestination(data.href);
                if (destination) router.navigate(destination as Href);
                return;
              }
            } catch { /* Ignore malformed messages from the local page. */ }
          }
          if (status.startsWith('{"type":"controls-prefs"')) {
            try { replaceControls((JSON.parse(status) as { prefs?: unknown }).prefs); } catch { /* malformed */ }
            return;
          }
          if (hasCheckpointBridge && status.startsWith("{")) {
            void handleCheckpointMessage(status, script => webRef.current?.injectJavaScript(script), (action, ok) => {
              if (ok) recordNativeDiagnostic({ type: "storage.operation", surface: diagnosticSurface, action, target: "checkpoint", outcome: "accepted" });
              else recordNativeDiagnostic({ type: "storage.operation", surface: diagnosticSurface, action, target: "checkpoint", outcome: "failed", reason: action === "read" ? "storage-read" : "storage-write" });
            });
            return;
          }
          if (status === 'scene-ready' || (status === 'app-ready' && offlineSource && tier !== 'boat3d')
            || (status === 'ready' && !offlineSource && tier !== 'boat3d')) {
            recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "ready", outcome: "accepted", attempt: reloadKey });
            setLoading(false);
            setFailed(false);
          }
          // Trainer owns its recoverable 3D boundary. Its Top/Rear/Side views
          // must stay accessible when WebGL fails; only root failures block it.
          if (status === 'app-error' || (status === 'scene-error' && tier !== 'trainer')) {
            recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "error", outcome: "failed", reason: "scene-load", attempt: reloadKey });
            setLoading(false);
            setFailed(true);
          }
          if (status === 'scene-error' && tier === 'trainer') recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "error", outcome: "failed", reason: "scene-load", attempt: reloadKey });
        }}
        onLoadStart={() => { recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "begin", outcome: "accepted", attempt: reloadKey }); }}
        onLoadEnd={() => { if (!offlineSource && tier !== 'boat3d') setLoading(false); }}
        onHttpError={() => { recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "error", outcome: "failed", reason: "connection", attempt: reloadKey }); setLoading(false); setFailed(true); }}
        onContentProcessDidTerminate={processGone}
        onRenderProcessGone={processGone}
        onError={() => {
          recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "error", outcome: "failed", reason: "webview-load", attempt: reloadKey });
          setLoading(false);
          setFailed(true);
        }}
        startInLoadingState={false}
      />}
      {loading && !failed && (
        <View style={[styles.overlay, { left: overlayInsets.left, right: overlayInsets.right }]} pointerEvents="none">
          <ActivityIndicator color={colors.accentCyan} size="large" />
        </View>
      )}
      {processNotice && !failed && (
        <Pressable
          onPress={() => setProcessNotice(false)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.notice, { top: 12 + overlayInsets.top, left: 16 + overlayInsets.left, right: 16 + overlayInsets.right }]}
          testID="race-process-notice"
        >
          <Text style={styles.noticeText}>
            {raceReplay ? tl({
              ru: "Система закрыла повтор, чтобы освободить память. Повтор открыт заново.",
              en: "The system closed the replay to free memory. It has been opened again.",
              pl: "System zamknął powtórkę, aby zwolnić pamięć. Powtórka została otwarta ponownie.",
              es: "El sistema cerró la repetición para liberar memoria. Se ha vuelto a abrir.",
              fr: "Le système a fermé la rediffusion pour libérer de la mémoire. Elle a été rouverte.",
              de: "Das System hat die Wiederholung geschlossen, um Speicher freizugeben. Sie wurde neu geöffnet.",
              it: "Il sistema ha chiuso il replay per liberare memoria. È stato riaperto.",
            }) : tl({
              ru: "Система закрыла гонку, чтобы освободить память. Меню гонки открыто заново.",
              en: "The system closed the race to free memory. The race menu is open again.",
              pl: "System zamknął wyścig, aby zwolnić pamięć. Menu regat jest znów otwarte.",
              es: "El sistema cerró la regata para liberar memoria. El menú de regatas está abierto de nuevo.",
              fr: "Le système a fermé la course pour libérer de la mémoire. Le menu des courses est rouvert.",
              de: "Das System hat das Rennen geschlossen, um Speicher freizugeben. Das Rennmenü ist wieder offen.",
              it: "Il sistema ha chiuso la regata per liberare memoria. Il menu delle regate è di nuovo aperto.",
            })}
          </Text>
        </Pressable>
      )}
      {failed && (
        <View style={[styles.overlay, { left: overlayInsets.left, right: overlayInsets.right }]} testID="sim-failed">
          <Text style={styles.errText}>
            {path === "/game" && offlineSource ? tp(
              "Не удалось открыть гонку. Повтори запуск или вернись к выбору гонки. Интернет не требуется.",
              "The race could not open. Retry or return to the race menu. No internet is needed.",
              "Nie udało się otworzyć wyścigu. Spróbuj ponownie lub wróć do menu regat. Internet nie jest potrzebny.",
              { es: "No se pudo abrir la regata. Reintenta o vuelve al menú. No necesitas internet.", fr: "La course ne s'ouvre pas. Réessaie ou retourne au menu. Internet n'est pas nécessaire.", de: "Das Rennen konnte nicht geöffnet werden. Erneut versuchen oder zum Rennmenü zurückkehren. Kein Internet nötig.", it: "Impossibile aprire la regata. Riprova o torna al menu. Non serve internet." },
            ) : offlineSource ? tp(
              "Не удалось открыть локальный симулятор. Повтори запуск или открой упрощенные Основы. Интернет не требуется.",
              "The local simulator could not open. Retry or open simplified Basics. No internet is needed.",
              "Nie udało się otworzyć lokalnego symulatora. Spróbuj ponownie lub otwórz uproszczone Podstawy. Internet nie jest potrzebny.",
              { es: "No se pudo abrir el simulador local. Reintenta o abre Fundamentos simplificados. No necesitas internet.", fr: "Le simulateur local ne s'ouvre pas. Réessaie ou ouvre les Bases simplifiées. Internet n'est pas nécessaire.", de: "Der lokale Simulator konnte nicht geöffnet werden. Erneut versuchen oder vereinfachte Grundlagen öffnen. Kein Internet nötig.", it: "Impossibile aprire il simulatore locale. Riprova o apri le Basi semplificate. Non serve internet." },
            ) : tp(
              'Не удалось загрузить симулятор. Нужен интернет.',
              'The simulator failed to load. An internet connection is required.',
              'Nie udało się załadować symulatora. Potrzebny jest internet.',
              {
                es: 'No se pudo cargar el simulador. Se necesita conexión a internet.',
                fr: 'Échec du chargement du simulateur. Une connexion internet est requise.',
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
                {tp('Повторить', 'Retry', 'Ponów', {
                  es: 'Reintentar',
                  fr: 'Réessayer',
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
                  tp('Открыть Тренажёр (офлайн)', 'Open the Trainer (offline)', 'Otwórz Trenażer (offline)', {
                    es: 'Abrir el simulador de trimado (sin conexión)',
                    fr: 'Ouvrir le Réglage des voiles (hors ligne)',
                    de: 'Trainer öffnen (offline)',
                    it: 'Apri la Regolazione delle vele (offline)',
                  })}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen></AppSurface>
  );
}

const styles = StyleSheet.create({
  headerBack: { minHeight: 44, minWidth: 44, paddingRight: 12, justifyContent: "center" },
  web: { flex: 1, backgroundColor: colors.bgPrimary },
  tierBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: colors.bgPrimary,
  },
  tierChip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(139, 167, 184, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tierChipActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.14)',
    borderColor: colors.accentCyan,
  },
  tierText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tierTextActive: {
    color: colors.accentCyan,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: 32,
    gap: 20,
  },
  notice: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 167, 184, 0.4)',
    backgroundColor: colors.bgPrimary,
  },
  noticeText: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
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
