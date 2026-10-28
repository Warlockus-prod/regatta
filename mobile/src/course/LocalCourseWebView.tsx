import { Stack, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Screen, Text } from "../design-system/components";
import { colors } from "../design-system/tokens";
import { AppSurface, appStackOptions } from "../design-system/surface";
import { APP_EMBED_THEME_SCRIPT } from "../design-system/embedded-theme";
import { hideMainNavigation } from "../navigation/visibility";
import { useAnalyticsConsent, webAnalyticsGuardScript } from "../persistence/analytics-consent";
import { parseExamFinished, type ExamFinishedProps } from "../analytics/web-bridge";
import { loadLocalCourseHtml } from "./local-course-asset";
import { ActivityBack } from "../navigation/ActivityBack";
import { handleNativeDiagnosticMessage, recordNativeDiagnostic } from "../diagnostics/journal";

interface CourseStorage<T> {
  read: () => Promise<T | null>;
  parse: (raw: unknown) => T | null;
  persist: (value: T) => Promise<T>;
  bootstrap: (value: T | null, href: string) => string;
  response: (success: boolean) => string;
}
interface Props<T> {
  asset: number;
  title: string;
  baseUrl: string;
  href: string;
  readyMessage: string;
  errorMessage: string;
  progressMessage: string;
  messageLimit: number;
  storage: CourseStorage<T>;
  localHref: (href: unknown) => string | null;
  examBase: "sternik" | "src";
  onExamFinished?: (result: ExamFinishedProps) => void;
  onOpenRadio?: () => void;
}

/** Reusable local HTML host. The base URL preserves the former website origin
 * for progress migration; page bytes always come from the packaged asset. */
export function LocalCourseWebView<T>({ asset, title, baseUrl, href, readyMessage, errorMessage, progressMessage, messageLimit, storage, localHref, examBase, onExamFinished, onOpenRadio }: Props<T>) {
  const navigation = useNavigation();
  const router = useRouter();
  const leaveCourse = () => { if (navigation.canGoBack()) navigation.goBack(); else router.replace("/learn"); };
  const { enabled: analyticsOn, ready: consentReady } = useAnalyticsConsent();
  const web = useRef<WebView>(null);
  const [loaded, setLoaded] = useState<{ html: string; entries: T | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [failureCode, setFailureCode] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [examDirty, setExamDirty] = useState(false);
  const dirty = useRef(false);
  const exitPromptOpen = useRef(false);
  const reportedExam = useRef(false);
  const latestEntries = useRef<T | null>(null);
  const writeTicket = useRef(0);
  const initialNavigation = useRef<string | null>(null);
  const navigationKey = `${revision}-${analyticsOn ? "a" : "na"}`;
  const hasLoaded = loaded !== null;
  const diagnosticSurface = examBase === "src" ? "radio" : "sternik";
  const fail = (code: string, nativeCode?: number) => {
    const safeCode = /^[a-z-]{1,48}$/.test(code) ? code : "course-load";
    const diagnostic = Number.isInteger(nativeCode) ? `${safeCode}:${nativeCode}` : safeCode;
    // No URI, raw exception, storage value, answers or page content in logs.
    console.warn("[local-course] failure", diagnostic);
    recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: code === "course-webview-process" ? "process-terminated" : "error", outcome: "failed", attempt: revision,
      reason: code === "course-storage-read" ? "storage-read" : code === "course-page-timeout" ? "timeout" : code === "course-webview-process" ? "webview-process" : "webview-load" });
    setFailureCode(diagnostic); setFailed(true); setLoading(false);
  };

  useEffect(() => {
    let active = true;
    recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "begin", outcome: "accepted", attempt: revision });
    Promise.all([loadLocalCourseHtml(asset), storage.read().catch(() => { throw new Error("course-storage-read"); })]).then(([html, entries]) => {
      if (active) {
        recordNativeDiagnostic({ type: "storage.operation", surface: diagnosticSurface, action: "read", target: "course", outcome: "accepted" });
        setLoaded({ html, entries }); setLoading(true); setFailed(false);
      }
    }).catch(error => { if (active) fail(error instanceof Error ? error.message : "course-load"); });
    return () => { active = false; };
  }, [asset, revision, storage]);
  useEffect(() => {
    if (!loading || !loaded || !consentReady) return undefined;
    const timer = setTimeout(() => fail("course-page-timeout"), 15000);
    return () => clearTimeout(timer);
  }, [loading, loaded, consentReady, revision]);
  useEffect(() => {
    if (!hasLoaded || loading || failed) return;
    const route = localHref(href);
    if (route) web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent("regatta:sternik-navigate",{detail:${JSON.stringify({ href: route })}}));true;`);
  }, [href, hasLoaded, loading, failed, localHref]);
  useEffect(() => examDirty ? hideMainNavigation() : undefined, [examDirty]);
  const requestExit = (continueExit: () => void) => {
    if (!dirty.current) { continueExit(); return; }
    if (exitPromptOpen.current) return;
    exitPromptOpen.current = true;
    let settled = false;
    try { recordNativeDiagnostic({ type: "navigation", surface: "sternik", action: "request", outcome: "accepted", source: "native", from: "motor" }); } catch { /* Diagnostics cannot block the exam guard. */ }
    const stay = () => {
      if (settled) return;
      settled = true; exitPromptOpen.current = false;
      try { recordNativeDiagnostic({ type: "navigation", surface: "sternik", action: "cancelled", outcome: "noop", reason: "cancelled", source: "native", from: "motor" }); } catch { /* Diagnostics cannot change the exit decision. */ }
    };
    Alert.alert("Wyjść z egzaminu?", "Niezapisane odpowiedzi egzaminu zostaną utracone.", [
      { text: "Zostań", style: "cancel", onPress: stay },
      { text: "Wyjdź", style: "destructive", onPress: () => {
        if (settled || !exitPromptOpen.current) return;
        settled = true; exitPromptOpen.current = false; dirty.current = false; setExamDirty(false);
        continueExit();
      } },
    ], { cancelable: true, onDismiss: stay });
  };
  // The exam's header button asks before dispatching, avoiding UIKit's cancelled
  // back-button state. Keep native-stack prevention for every other exit action.
  usePreventRemove(examDirty, ({ data }) => requestExit(() => navigation.dispatch(data.action)));

  const persist = (entries: T) => {
    latestEntries.current = entries;
    // A consent change remounts the WebView. Restore its latest in-memory
    // snapshot rather than overwriting new answers with the mount-time data.
    setLoaded(current => current ? { ...current, entries } : current);
    const ticket = ++writeTicket.current;
    void storage.persist(entries).then(() => {
      recordNativeDiagnostic({ type: "storage.operation", surface: diagnosticSurface, action: "write", target: "course", outcome: "accepted" });
      web.current?.injectJavaScript(storage.response(true));
      if (writeTicket.current === ticket) setSaveFailed(false);
    }).catch(() => {
      recordNativeDiagnostic({ type: "storage.operation", surface: diagnosticSurface, action: "write", target: "course", outcome: "failed", reason: "storage-write" });
      web.current?.injectJavaScript(storage.response(false));
      if (writeTicket.current === ticket) setSaveFailed(true);
    });
  };
  const openRadio = () => {
    if (!onOpenRadio) return;
    requestExit(onOpenRadio);
  };
  const onMessage = (event: WebViewMessageEvent) => {
    const raw = event.nativeEvent.data;
    if (handleNativeDiagnosticMessage(raw, diagnosticSurface)) return;
    if (raw.length > messageLimit) return;
    let data: Record<string, unknown>;
    try { const parsed: unknown = JSON.parse(raw); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return; data = parsed as Record<string, unknown>; } catch { return; }
    if (data.type === readyMessage) { recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "ready", outcome: "accepted", attempt: revision }); initialNavigation.current = navigationKey; setLoading(false); setFailed(false); return; }
    if (data.type === errorMessage) { fail("course-page-runtime"); return; }
    if (data.type === progressMessage) {
      const entries = storage.parse(data.entries);
      if (entries) persist(entries);
      else {
        recordNativeDiagnostic({ type: "storage.operation", surface: diagnosticSurface, action: "write", target: "course", outcome: "rejected", reason: "storage-invalid" });
        web.current?.injectJavaScript(storage.response(false));
      }
    } else if (data.type === "exam-dirty" && typeof data.dirty === "boolean") {
      dirty.current = data.dirty; setExamDirty(data.dirty);
      if (data.dirty) reportedExam.current = false;
    } else if (data.type === "sternik-open-radio") openRadio();
    else {
      const exam = parseExamFinished(raw);
      if (exam?.base === examBase && !reportedExam.current) { reportedExam.current = true; onExamFinished?.(exam); }
    }
  };
  const retry = () => {
    recordNativeDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface, action: "retry", outcome: "accepted", attempt: revision });
    setLoaded(null); setFailed(false); setFailureCode(null); setLoading(true);
    setRevision(value => value + 1);
  };

  return <AppSurface><Screen>
    <Stack.Screen options={{
      ...appStackOptions,
      title,
      headerBackButtonMenuEnabled: false,
      headerBackVisible: false,
      gestureEnabled: examDirty ? false : undefined,
      headerLeft: () => examDirty ? <Pressable accessibilityRole="button" accessibilityLabel="Wyjdź z egzaminu" onPress={() => requestExit(leaveCourse)} style={styles.headerExit}><Text style={styles.headerExitText}>Wyjdź</Text></Pressable> : <ActivityBack fallback="/learn" tintColor={colors.accentCyan} />,
    }} />
    {saveFailed && <View style={styles.saveError} accessibilityRole="alert">
      <Text style={styles.text}>Nie zapisano postępu na urządzeniu. Nie zamykaj kursu i ponów zapis.</Text>
      <Pressable accessibilityRole="button" onPress={() => { if (latestEntries.current) persist(latestEntries.current); }} style={styles.button}><Text style={styles.buttonText}>Ponów zapis</Text></Pressable>
    </View>}
    {loaded && consentReady && <WebView ref={web} key={navigationKey} testID="local-course-webview"
      source={{ html: loaded.html, baseUrl }} style={styles.web} originWhitelist={["*"]}
      javaScriptEnabled domStorageEnabled bounces={false} mediaCapturePermissionGrantType="deny"
      allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
      injectedJavaScriptBeforeContentLoaded={webAnalyticsGuardScript(analyticsOn) + APP_EMBED_THEME_SCRIPT + storage.bootstrap(loaded.entries, href)}
      injectedJavaScript={APP_EMBED_THEME_SCRIPT}
      onMessage={onMessage} startInLoadingState={false}
      onShouldStartLoadWithRequest={request => {
        if (request.url === "about:blank") return true;
        if (initialNavigation.current !== navigationKey && request.url === baseUrl && request.navigationType === "other") { initialNavigation.current = navigationKey; return true; }
        const url = request.url;
        if (url.startsWith("https://weektoregatta.com/")) {
          const route = localHref(url.slice("https://weektoregatta.com".length));
          if (route) { web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent("regatta:sternik-navigate",{detail:${JSON.stringify({ href: route })}}));true;`); return false; }
        }
        if (request.navigationType === "click" && /^(?:https?:|mailto:)/.test(url)) void Linking.openURL(url).catch(() => undefined);
        return false;
      }}
      onLoadStart={() => console.info("[local-course] webview-load-start")}
      onError={event => fail("course-webview-load", event.nativeEvent.code)}
      onContentProcessDidTerminate={() => fail("course-webview-process")}
    />}
    {loading && !failed && <View style={styles.overlay} pointerEvents="none"><ActivityIndicator color={colors.accentCyan} /><Text style={styles.text}>Otwieram kurs zapisany na urządzeniu...</Text></View>}
    {failed && <View style={styles.overlay}><Text style={styles.text}>Nie udało się otworzyć wbudowanego kursu lub odczytać postępu. Ponowienie nie wymaga internetu. Zachowane dane nie zostały usunięte.</Text>{failureCode && <Text style={styles.text}>Kod: {failureCode}</Text>}<Pressable accessibilityRole="button" onPress={retry} style={styles.button}><Text style={styles.buttonText}>Ponów</Text></Pressable></View>}
  </Screen></AppSurface>;
}

const styles = StyleSheet.create({
  headerExit: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 8 },
  headerExitText: { color: colors.accentCyan, fontSize: 16, fontWeight: "600" },
  web: { flex: 1, backgroundColor: colors.bgPrimary },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: colors.bgPrimary, paddingHorizontal: 28, gap: 18 },
  saveError: { backgroundColor: colors.bgPrimary, padding: 12, gap: 8 },
  text: { color: colors.textSecondary, textAlign: "center", fontSize: 16, lineHeight: 24 },
  button: { minHeight: 44, paddingHorizontal: 18, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.accentCyan },
  buttonText: { color: colors.accentCyan, fontSize: 16, fontWeight: "600", textAlign: "center" },
});
