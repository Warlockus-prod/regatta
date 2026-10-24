import { recordReviewWin } from "../review/review-prompt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Screen } from "../design-system/components";
import { hideMainNavigation } from "../navigation/visibility";
import { colors } from "../design-system/tokens";
import { useI18n } from "../i18n/context";
import { AnalyticsEvent } from "../analytics/events";
import { useAnalytics } from "../analytics/use-analytics";
import { parseExamFinished } from "../analytics/web-bridge";
import { useAnalyticsConsent, webAnalyticsGuardScript } from "../persistence/analytics-consent";
import { LOCAL_RADIO_SPEECH_SCRIPT, useLocalRadioSpeech } from "../radio/useLocalRadioSpeech";

const OFFLINE_SOURCE = require("../../assets/radio-offline.html");
const STORAGE_KEY = "regatta.radio.offline.web-storage.v1";
const LOAD_TIMEOUT_MS = 15000;
const ORIGIN = "https://weektoregatta.com";

interface ProgressMessage {
  type?: string;
  entries?: Record<string, string>;
  path?: string;
  /** radio-workspace: the page's work screen (pinned radio) opened or closed */
  open?: boolean;
}

type CourseMode = "offline" | "online";

const ONLINE_AFTER_LOAD = `
  (function () {
    try {
      var css = [
        'nav.sticky { display: none !important; }',
        'a[href*="apps.apple.com"] { display: none !important; }',
        'section:has(a[href*="apps.apple.com"]) { display: none !important; }'
      ].join('\\n');
      var style = document.createElement('style');
      style.setAttribute('data-native-radio-online', '1');
      style.appendChild(document.createTextNode(css));
      document.head.appendChild(style);

      if (!document.querySelector('[data-return-offline]')) {
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-return-offline', '1');
        button.textContent = 'Offline';
        button.style.cssText = [
          'position:fixed',
          'right:12px',
          'bottom:calc(12px + env(safe-area-inset-bottom))',
          'z-index:2147483647',
          'min-height:44px',
          'padding:0 16px',
          'border-radius:999px',
          'border:1px solid rgba(0, 110, 166,.45)',
          'background:#0f2035',
          'color:#00d4ff',
          'font:700 13px -apple-system,BlinkMacSystemFont,sans-serif',
          'box-shadow:0 8px 24px rgba(0,0,0,.35)'
        ].join(';');
        button.addEventListener('click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'radio-open-offline'
          }));
        });
        document.body.appendChild(button);
      }
    } catch (error) {}
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'radio-online-ready'
    }));
  })();
  true;
`;

function restoreScript(
  raw: string | null,
  nativeLanguage: string,
): string {
  let entries: Record<string, string> = {};
  try {
    const parsed = JSON.parse(raw ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      entries = parsed as Record<string, string>;
    }
  } catch {
    entries = {};
  }

  const payload = JSON.stringify(entries);
  return `
    (function () {
      window.__REGATTA_NATIVE_APP__ = true;
      // the radio trainer runs in the app's language (any of the seven)
      window.__REGATTA_APP_LANG__ = ${JSON.stringify(nativeLanguage)};
      try {
        var entries = ${payload};
        Object.keys(entries).forEach(function (key) {
          if (localStorage.getItem(key) === null) localStorage.setItem(key, entries[key]);
        });
      } catch (error) {}
    })();
    true;
  `;
}

export function OfflineRadioCourse() {
  const { tp, lang } = useI18n();
  const analytics = useAnalytics();
  // The in-app "Anonymous analytics" switch also covers the embedded pages,
  // offline bundle and online /radio alike: when it is off, the page gets the
  // no-analytics flag before its own scripts run.
  const { enabled: analyticsOn, ready: consentReady } = useAnalyticsConsent();
  const [restore, setRestore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<CourseMode>("offline");
  const webRef = useRef<WebView>(null);
  const handleLocalSpeech = useLocalRadioSpeech(script => webRef.current?.injectJavaScript(script), mode === "offline");
  const [onlinePath, setOnlinePath] = useState("/radio/symulator");
  // While the page shows its radio work screen (pinned radio, task panel under
  // it) the stack header gives its 44pt to the task panel; the page's own bar
  // has the exit, and the swipe back still leaves the course.
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  // and the tab bar goes too, like in the trainers and the race
  useEffect(() => (workspaceOpen ? hideMainNavigation() : undefined), [workspaceOpen]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (active) setRestore(restoreScript(value, lang));
      })
      .catch(() => {
        if (active) setRestore(restoreScript(null, lang));
      });
    return () => {
      active = false;
    };
  }, [lang]);

  useEffect(() => {
    if (!loading || restore === null) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setFailed(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading, reloadKey, restore]);

  const source = useMemo(
    () => {
      if (mode === "offline") return OFFLINE_SOURCE;
      const separator = onlinePath.includes("?") ? "&" : "?";
      // the app's language: the trainer pages run in it, the rest of the
      // radio section stays PL / RU on the site as well
      return { uri: `${ORIGIN}${onlinePath}${separator}lang=${lang}&embed=1` };
    },
    [lang, mode, onlinePath],
  );

  const switchMode = (nextMode: CourseMode, path?: string) => {
    if (nextMode === "online" && path?.startsWith("/radio")) {
      setOnlinePath(path);
    }
    setFailed(false);
    setLoading(true);
    setWorkspaceOpen(false);
    setMode(nextMode);
  };

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setWorkspaceOpen(false);
    setReloadKey((value) => value + 1);
  };

  const onMessage = (event: WebViewMessageEvent) => {
    if (mode === "offline" && handleLocalSpeech(event.nativeEvent.data)) return;
    const exam = parseExamFinished(event.nativeEvent.data);
    if (exam) {
      analytics.capture(AnalyticsEvent.ExamFinished, exam);
      if (exam.passed) void recordReviewWin("exam-passed");
      return;
    }
    try {
      const message = JSON.parse(event.nativeEvent.data) as ProgressMessage;
      if (message.type === "radio-offline-ready") {
        setLoading(false);
        setFailed(false);
        return;
      }
      if (message.type === "radio-online-ready") {
        setLoading(false);
        setFailed(false);
        return;
      }
      if (message.type === "radio-workspace") {
        setWorkspaceOpen(message.open === true);
        return;
      }
      if (message.type === "radio-open-online") {
        switchMode("online", message.path);
        return;
      }
      if (message.type === "radio-open-offline") {
        switchMode("offline");
        return;
      }
      if (message.type === "radio-offline-progress" && message.entries) {
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(message.entries));
      }
    } catch {
      // Ignore messages not owned by the offline course.
    }
  };

  if (restore === null || !consentReady) {
    return (
      <Screen noTopInset noBottomInset>
        <Stack.Screen options={{ title: "SRC Radio" }} />
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accentCyan} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen noTopInset={!workspaceOpen} noBottomInset>
      <Stack.Screen options={{ title: "SRC Radio", headerShown: !workspaceOpen }} />
      <WebView
        ref={webRef}
        key={`${mode}-${reloadKey}-${analyticsOn ? "a" : "na"}`}
        source={source}
        style={styles.web}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        bounces={false}
        mediaCapturePermissionGrantType="grant"
        injectedJavaScriptBeforeContentLoaded={
          (webAnalyticsGuardScript(analyticsOn) + (mode === "offline" ? LOCAL_RADIO_SPEECH_SCRIPT + restore : "")) || undefined
        }
        injectedJavaScript={mode === "online" ? ONLINE_AFTER_LOAD : undefined}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          if (
            url.startsWith("file:")
            || url.startsWith("about:")
            || url.startsWith("data:")
            || url.startsWith("asset:")
            || url.startsWith("content:")
            || url.startsWith("blob:")
            // Dev builds serve the bundled page from Metro; release builds use
            // file:. Matching the path alone would let any host through.
            || (url.includes("/assets/radio-offline")
              && /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\//.test(url))
          ) {
            return true;
          }
          if (mode === "online" && url.startsWith(`${ORIGIN}/radio`)) {
            return true;
          }
          if (
            url.startsWith("https:")
            || url.startsWith("http:")
            || url.startsWith("mailto:")
            || url.startsWith("tel:")
          ) {
            void Linking.openURL(url);
            return false;
          }
          return false;
        }}
        onError={() => {
          setLoading(false);
          setFailed(true);
          setWorkspaceOpen(false);
        }}
        startInLoadingState={false}
      />

      {loading && !failed && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.accentCyan} size="large" />
          <Text style={styles.loadingText}>
            {tp(
              "Открываю сохранённый курс...",
              "Opening the stored course...",
              "Otwieram zapisany kurs...",
              {es:"Abriendo el curso guardado...",fr:"Ouverture du cours enregistré...",de:"Gespeicherter Kurs wird geöffnet...",it:"Apertura del corso salvato..."},
            )}
          </Text>
        </View>
      )}

      {failed && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>
            {mode === "online"
              ? tp(
                  "Онлайн-режим недоступен. Офлайн-теория и симулятор остаются на устройстве.",
                  "Online mode is unavailable. Offline theory and the simulator remain on the device.",
                  "Tryb online jest niedostępny. Teoria i symulator offline pozostają na urządzeniu.",
                  {es:"Modo en línea no disponible. La teoría y el simulador siguen disponibles sin conexión.",fr:"Mode en ligne indisponible. La théorie et le simulateur restent disponibles hors ligne.",de:"Online-Modus nicht verfügbar. Theorie und Simulator bleiben offline verfügbar.",it:"Modalità online non disponibile. Teoria e simulatore restano disponibili offline."},
                )
              : tp(
                  "Не удалось открыть встроенный курс. Интернет для повторной попытки не требуется.",
                  "The embedded course could not be opened. Retrying does not require a connection.",
                  "Nie udało się otworzyć wbudowanego kursu. Ponowienie nie wymaga internetu.",
                  {es:"No se pudo abrir el curso integrado. Puedes reintentar sin conexión.",fr:"Impossible d'ouvrir le cours intégré. Réessayez sans connexion.",de:"Der integrierte Kurs konnte nicht geöffnet werden. Erneut versuchen ist offline möglich.",it:"Impossibile aprire il corso integrato. Puoi riprovare senza connessione."},
                )}
          </Text>
          <Pressable
            onPress={() => {
              if (mode === "online") switchMode("offline");
              else retry();
            }}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>
              {mode === "online"
                ? tp("Вернуться офлайн", "Return offline", "Wróć offline", {es:"Volver sin conexión",fr:"Revenir hors ligne",de:"Zurück zu Offline",it:"Torna offline"})
                : tp("Повторить", "Retry", "Ponów", {es:"Reintentar",fr:"Réessayer",de:"Erneut versuchen",it:"Riprova"})}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgPrimary,
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(0, 110, 166, 0.12)",
    borderColor: colors.accentCyan,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.accentCyan,
    fontSize: 15,
    fontWeight: "700",
  },
});
