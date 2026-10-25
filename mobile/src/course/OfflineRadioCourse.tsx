import { recordReviewWin } from "../review/review-prompt";
import { Stack, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Screen, Text } from "../design-system/components";
import { hideMainNavigation } from "../navigation/visibility";
import { darkColors as colors } from "../design-system/tokens";
import { DarkSurface, darkStackOptions } from "../design-system/surface";
import { destinations } from "../../../src/lib/product/catalog";
import { parseRadioRoute, RADIO_FREE_HREF, radioLeaveCopy, radioNavigationScript } from "../../../src/lib/radio-navigation";
import { useI18n } from "../i18n/context";
import { AnalyticsEvent } from "../analytics/events";
import { useAnalytics } from "../analytics/use-analytics";
import { parseExamFinished } from "../analytics/web-bridge";
import { useAnalyticsConsent, webAnalyticsGuardScript } from "../persistence/analytics-consent";
import { LOCAL_RADIO_SPEECH_SCRIPT, useLocalRadioSpeech } from "../radio/useLocalRadioSpeech";
import { parseRadioEntries, persistRadioEntries, radioBootstrap, radioStorageEvent, readRadioEntries, RADIO_MESSAGE_LIMIT, type RadioEntries } from "../persistence/radio-storage";
import { createRadioStartupDiagnostics, RADIO_STARTUP_TIMEOUT_MS, type RadioStartupDiagnostic } from "../radio/startup-diagnostics";

const OFFLINE_SOURCE = require("../../assets/radio-offline.html");
const ORIGIN = "https://weektoregatta.com";

interface ProgressMessage {
  type?: string;
  entries?: Record<string, string>;
  path?: string;
  /** radio-workspace: the page's work screen (pinned radio) opened or closed */
  open?: boolean;
  href?: string;
  canGoBack?: boolean;
  dirty?: boolean;
}

export function OfflineRadioCourse({ initialHref = RADIO_FREE_HREF }: { initialHref?: string }) {
  return <DarkSurface><RadioCourseContent initialHref={parseRadioRoute(initialHref) ? initialHref : RADIO_FREE_HREF} /></DarkSurface>;
}

function RadioCourseContent({ initialHref }: { initialHref: string }) {
  const { tp, lang } = useI18n();
  const navigation = useNavigation();
  const router = useRouter();
  const analytics = useAnalytics();
  // The analytics preference is injected before the installed page runs.
  const { enabled: analyticsOn, ready: consentReady } = useAnalyticsConsent();
  const [restore, setRestore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<RadioStartupDiagnostic | null>(null);
  const failed = failure !== null;
  const [startup] = useState(createRadioStartupDiagnostics);
  const [attemptId, setAttemptId] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const webRef = useRef<WebView>(null);
  const latestEntries = useRef<RadioEntries | null>(null);
  const writeTicket = useRef(0);
  const handleLocalSpeech = useLocalRadioSpeech(script => webRef.current?.injectJavaScript(script), !failed);
  const [internalBack, setInternalBack] = useState(false);
  const [examDirty, setExamDirty] = useState(false);
  const dirty = useRef(false);
  const exitPromptOpen = useRef(false);
  // The work screen owns its Back and app-exit controls. Course pages use the
  // native header for internal history; UIKit never starts a cancelled swipe.
  const [workspaceOpen, setWorkspaceOpen] = useState(initialHref === RADIO_FREE_HREF);
  // and the tab bar goes too, like in the trainers and the race
  useEffect(() => (workspaceOpen || examDirty ? hideMainNavigation() : undefined), [workspaceOpen, examDirty]);
  const requestExit = (continueExit: () => void) => {
    if (!dirty.current) { continueExit(); return; }
    if (exitPromptOpen.current) return;
    exitPromptOpen.current = true;
    const stay = () => { exitPromptOpen.current = false; };
    const copy = radioLeaveCopy(lang);
    Alert.alert(copy.title, copy.body, [
      { text: copy.stay, style: "cancel", onPress: stay },
      { text: copy.leave, style: "destructive", onPress: () => {
        if (!exitPromptOpen.current) return;
        exitPromptOpen.current = false; dirty.current = false; setExamDirty(false);
        continueExit();
      } },
    ], { cancelable: true, onDismiss: stay });
  };
  usePreventRemove(examDirty, ({ data }) => requestExit(() => navigation.dispatch(data.action)));
  const exitToApp = () => requestExit(() => router.canGoBack() ? router.back() : router.replace("/simulators"));
  const internalNavigation = internalBack && !loading && !failed;
  const showHeader = loading || failed || !workspaceOpen;
  const back = () => internalNavigation ? webRef.current?.injectJavaScript(radioNavigationScript("back")) : exitToApp();
  const headerOptions = { ...darkStackOptions, title: destinations.find(item => item.id === "radio")!.title[lang], headerShown: showHeader, headerBackVisible: false, headerBackButtonMenuEnabled: false, gestureEnabled: false,
    headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel={internalNavigation ? tp("Назад", "Back", "Wstecz", { es: "Atrás", fr: "Retour", de: "Zurück", it: "Indietro" }) : tp("В приложение", "Back to app", "Do aplikacji", { es: "Volver a la app", fr: "Retour à l'app", de: "Zur App", it: "Torna all'app" })} onPress={back} style={styles.headerBack}><Text style={styles.headerBackText}>‹ {internalNavigation ? tp("Назад", "Back", "Wstecz", { es: "Atrás", fr: "Retour", de: "Zurück", it: "Indietro" }) : tp("Выйти", "Exit", "Wyjdź", { es: "Salir", fr: "Quitter", de: "Beenden", it: "Esci" })}</Text></Pressable>,
  };
  const bootstrap = (value: RadioEntries | null) => radioBootstrap(value, lang) + `window.__REGATTA_RADIO_ENTRY__=${JSON.stringify(initialHref)};true;`;
  const showFailure = useCallback((diagnostic: RadioStartupDiagnostic | null) => {
    if (!diagnostic) return;
    setFailure(diagnostic);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = startup.begin();
    setAttemptId(id);
    setRestore(null);
    setLoading(true);
    setFailure(null);
    setSaveFailed(false);
    setInternalBack(false);
    latestEntries.current = null;
    // This also covers a stalled native storage read or consent bootstrap.
    const timer = setTimeout(() => showFailure(startup.timeout(id)), RADIO_STARTUP_TIMEOUT_MS);
    readRadioEntries()
      .then((value) => {
        if (startup.storageLoaded(id)) setRestore(radioBootstrap(value, lang) + `window.__REGATTA_RADIO_ENTRY__=${JSON.stringify(initialHref)};true;`);
      })
      .catch((error: unknown) => showFailure(startup.storageError(id, error)));
    return () => {
      clearTimeout(timer);
      startup.invalidate(id);
    };
  }, [analyticsOn, initialHref, lang, reloadKey, showFailure, startup]);

  const retry = () => {
    startup.invalidate();
    setRestore(null);
    setFailure(null);
    setLoading(true);
    setWorkspaceOpen(false);
    setReloadKey((value) => value + 1);
  };

  const saveEntries = (entries: RadioEntries) => {
    if (!startup.accepts(attemptId)) return;
    latestEntries.current = entries;
    setRestore(bootstrap(entries));
    const ticket = ++writeTicket.current;
    void persistRadioEntries(entries).then(() => {
      if (!startup.accepts(attemptId)) return;
      webRef.current?.injectJavaScript(radioStorageEvent(true));
      if (writeTicket.current === ticket) setSaveFailed(false);
    }).catch(() => {
      if (!startup.accepts(attemptId)) return;
      webRef.current?.injectJavaScript(radioStorageEvent(false));
      if (writeTicket.current === ticket) setSaveFailed(true);
    });
  };

  const onMessage = (event: WebViewMessageEvent) => {
    if (!startup.accepts(attemptId)) return;
    if (event.nativeEvent.data.length > RADIO_MESSAGE_LIMIT) return;
    if (handleLocalSpeech(event.nativeEvent.data)) return;
    const exam = parseExamFinished(event.nativeEvent.data);
    if (exam) {
      analytics.capture(AnalyticsEvent.ExamFinished, exam);
      if (exam.passed) void recordReviewWin("exam-passed");
      return;
    }
    try {
      const message = JSON.parse(event.nativeEvent.data) as ProgressMessage;
      if (message.type === "radio-offline-ready") {
        if (startup.ready(attemptId)) setLoading(false);
        return;
      }
      if (message.type === "radio-route" && parseRadioRoute(message.href)) { setInternalBack(message.canGoBack === true); return; }
      if (message.type === "radio-exit") { exitToApp(); return; }
      if (message.type === "radio-exam-dirty" && typeof message.dirty === "boolean") { dirty.current = message.dirty; setExamDirty(message.dirty); return; }
      if (message.type === "radio-workspace") {
        setWorkspaceOpen(message.open === true);
        return;
      }
      if (message.type === "radio-open-online") {
        if (parseRadioRoute(message.path)) webRef.current?.injectJavaScript(radioNavigationScript("navigate", message.path));
        return;
      }
      if (message.type === "radio-offline-progress") {
        const entries = parseRadioEntries(message.entries);
        if (entries) saveEntries(entries);
        else webRef.current?.injectJavaScript(radioStorageEvent(false));
      }
    } catch {
      // Ignore messages not owned by the offline course.
    }
  };

  if (!failed && (restore === null || !consentReady)) {
    return (
      <Screen noTopInset={showHeader} noBottomInset={!workspaceOpen}>
        <Stack.Screen options={headerOptions} />
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accentCyan} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen noTopInset={showHeader} noBottomInset={!workspaceOpen}>
      <Stack.Screen options={headerOptions} />
      {saveFailed && <View style={styles.saveError} accessibilityRole="alert">
        <Text style={styles.errorText}>{tp("Не удалось сохранить прогресс. Не закрывай курс и повтори запись.", "Progress could not be saved. Keep the course open and retry saving.", "Nie zapisano postępu. Nie zamykaj kursu i ponów zapis.", {es:"No se pudo guardar el progreso. Mantén el curso abierto e intenta guardarlo de nuevo.",fr:"La progression n’a pas pu être enregistrée. Gardez le cours ouvert et réessayez.",de:"Der Fortschritt wurde nicht gespeichert. Lass den Kurs geöffnet und versuche es erneut.",it:"Impossibile salvare i progressi. Tieni aperto il corso e riprova a salvare."})}</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => { if (latestEntries.current) saveEntries(latestEntries.current); }}><Text style={styles.buttonText}>{tp("Повторить запись", "Retry saving", "Ponów zapis", {es:"Reintentar guardado",fr:"Réessayer l’enregistrement",de:"Speichern wiederholen",it:"Riprova a salvare"})}</Text></Pressable>
      </View>}
      {restore !== null && !failed && <WebView
        ref={webRef}
        key={`${reloadKey}-${analyticsOn ? "a" : "na"}`}
        source={OFFLINE_SOURCE}
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
          webAnalyticsGuardScript(analyticsOn) + LOCAL_RADIO_SPEECH_SCRIPT + restore
        }
        onMessage={onMessage}
        onLoadStart={() => { startup.webViewStarted(attemptId); }}
        onShouldStartLoadWithRequest={(request) => {
          if (!startup.accepts(attemptId)) return false;
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
          if (url.startsWith(`${ORIGIN}/radio`) && parseRadioRoute(url.slice(ORIGIN.length))) { webRef.current?.injectJavaScript(radioNavigationScript("navigate", url.slice(ORIGIN.length))); return false; }
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
        onError={(event) => {
          const diagnostic = startup.webViewError(attemptId, event.nativeEvent);
          if (!diagnostic) return;
          showFailure(diagnostic);
          setWorkspaceOpen(false);
        }}
        onContentProcessDidTerminate={() => {
          const diagnostic = startup.processTerminated(attemptId);
          if (!diagnostic) return;
          showFailure(diagnostic);
          setWorkspaceOpen(false);
        }}
        startInLoadingState={false}
      />}

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
        <ScrollView style={styles.failureScroll} contentContainerStyle={styles.failureContent}>
          <Text style={styles.errorText}>
            {failure.code === "SRC-S01" ? tp("Сохраненные данные курса не удалось прочитать.", "The saved course data could not be read.", "Nie udało się odczytać zapisanych danych kursu.", { es: "No se pudieron leer los datos guardados del curso.", fr: "Les données enregistrées du cours n'ont pas pu être lues.", de: "Die gespeicherten Kursdaten konnten nicht gelesen werden.", it: "Impossibile leggere i dati salvati del corso." })
              : failure.code === "SRC-S02" ? tp("Не удалось прочитать хранилище устройства.", "Device storage could not be read.", "Nie udało się odczytać pamięci urządzenia.", { es: "No se pudo leer el almacenamiento del dispositivo.", fr: "Le stockage de l'appareil n'a pas pu être lu.", de: "Der Gerätespeicher konnte nicht gelesen werden.", it: "Impossibile leggere la memoria del dispositivo." })
              : failure.code === "SRC-W03" ? tp("Система остановила встроенный курс.", "The system stopped the embedded course.", "System zatrzymał wbudowany kurs.", { es: "El sistema detuvo el curso integrado.", fr: "Le système a arrêté le cours intégré.", de: "Das System hat den integrierten Kurs beendet.", it: "Il sistema ha interrotto il corso integrato." })
              : failure.code === "SRC-W01" ? tp("Не удалось загрузить встроенную страницу курса.", "The embedded course page could not be loaded.", "Nie udało się wczytać wbudowanej strony kursu.", { es: "No se pudo cargar la página integrada del curso.", fr: "La page intégrée du cours n'a pas pu être chargée.", de: "Die integrierte Kursseite konnte nicht geladen werden.", it: "Impossibile caricare la pagina integrata del corso." })
              : tp("Запуск курса занял слишком много времени.", "The course took too long to start.", "Uruchomienie kursu trwało zbyt długo.", { es: "El curso tardó demasiado en iniciarse.", fr: "Le démarrage du cours a pris trop de temps.", de: "Der Kursstart hat zu lange gedauert.", it: "L'avvio del corso ha richiesto troppo tempo." })}
          </Text>
          <Text style={styles.errorText}>
            {tp(
                  "Не удалось открыть встроенный курс. Интернет для повторной попытки не требуется.",
                  "The embedded course could not be opened. Retrying does not require a connection.",
                  "Nie udało się otworzyć wbudowanego kursu. Ponowienie nie wymaga internetu.",
                  {es:"No se pudo abrir el curso integrado. Puedes reintentar sin conexión.",fr:"Impossible d'ouvrir le cours intégré. Réessayez sans connexion.",de:"Der integrierte Kurs konnte nicht geöffnet werden. Erneut versuchen ist offline möglich.",it:"Impossibile aprire il corso integrato. Puoi riprovare senza connessione."},
                )}
          </Text>
          <Text selectable style={styles.loadingText}>
            {tp("Код поддержки", "Support code", "Kod pomocy", { es: "Código de asistencia", fr: "Code d'assistance", de: "Support-Code", it: "Codice di assistenza" })}: {failure.code}{failure.wkDomain ? ` / ${failure.wkDomain}` : ""}{failure.wkCode !== undefined ? ` / ${failure.wkCode}` : ""}
          </Text>
          <Pressable
            onPress={retry}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>
              {tp("Повторить", "Retry", "Ponów", {es:"Reintentar",fr:"Réessayer",de:"Erneut versuchen",it:"Riprova"})}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBack: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingRight: 12 },
  headerBackText: { color: colors.accentCyan, fontSize: 16 },
  web: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  saveError: { backgroundColor: colors.bgPrimary, padding: 12, gap: 8 },
  failureScroll: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bgPrimary },
  failureContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32, paddingVertical: 24 },
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
