import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { colors } from "../design-system/tokens";
import { useI18n } from "../i18n/context";

const OFFLINE_SOURCE = require("../../assets/radio-offline.html");
const STORAGE_KEY = "regatta.radio.offline.web-storage.v1";
const LOAD_TIMEOUT_MS = 15000;
const ORIGIN = "https://weektoregatta.com";

interface ProgressMessage {
  type?: string;
  entries?: Record<string, string>;
  path?: string;
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
          'border:1px solid rgba(0,212,255,.45)',
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
  const language = nativeLanguage === "ru" ? "ru" : "pl";
  return `
    (function () {
      window.__REGATTA_NATIVE_APP__ = true;
      try {
        var entries = ${payload};
        Object.keys(entries).forEach(function (key) {
          if (localStorage.getItem(key) === null) localStorage.setItem(key, entries[key]);
        });
        if (localStorage.getItem('regatta.radio.offline.lang.v1') === null) {
          localStorage.setItem('regatta.radio.offline.lang.v1', '${language}');
        }
      } catch (error) {}
    })();
    true;
  `;
}

export function OfflineRadioCourse() {
  const { tp, lang } = useI18n();
  const [restore, setRestore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<CourseMode>("offline");
  const [onlinePath, setOnlinePath] = useState("/radio/symulator");

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
      return { uri: `${ORIGIN}${onlinePath}${separator}lang=pl&embed=1` };
    },
    [mode, onlinePath],
  );

  const switchMode = (nextMode: CourseMode, path?: string) => {
    if (nextMode === "online" && path?.startsWith("/radio")) {
      setOnlinePath(path);
    }
    setFailed(false);
    setLoading(true);
    setMode(nextMode);
  };

  const retry = () => {
    setFailed(false);
    setLoading(true);
    setReloadKey((value) => value + 1);
  };

  const onMessage = (event: WebViewMessageEvent) => {
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

  if (restore === null) {
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
    <Screen noTopInset noBottomInset>
      <Stack.Screen options={{ title: "SRC Radio" }} />
      <WebView
        key={`${mode}-${reloadKey}`}
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
        injectedJavaScriptBeforeContentLoaded={mode === "offline" ? restore : undefined}
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
            || url.includes("/assets/radio-offline")
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
                  "Tryb online jest niedostepny. Teoria i symulator offline pozostaja na urzadzeniu.",
                )
              : tp(
                  "Не удалось открыть встроенный курс. Интернет для повторной попытки не требуется.",
                  "The embedded course could not be opened. Retrying does not require a connection.",
                  "Nie udalo sie otworzyc wbudowanego kursu. Ponowienie nie wymaga internetu.",
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
                ? tp("Вернуться офлайн", "Return offline", "Wroc offline")
                : tp("Повторить", "Retry", "Ponow")}
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
    backgroundColor: "rgba(0, 212, 255, 0.12)",
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
