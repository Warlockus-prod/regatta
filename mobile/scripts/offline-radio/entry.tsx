import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import RadioCourseHome from "../../../src/app/radio/page";
import RadioSubnav from "../../../src/app/radio/RadioSubnav";
import RadioTheoryCourse from "../../../src/app/radio/teoria/page";
import RadioControlsCourse from "../../../src/app/radio/obsluga/page";
import RadioSimulatorPage from "../../../src/app/radio/symulator/page";
import SrcTrainerPage from "../../../src/app/radio/test/page";
import RadioTasksPage from "../../../src/app/radio/zadania/page";
import CheatSheet from "../../../src/app/radio/sciaga/CheatSheet";
import PositionDrill from "../../../src/app/radio/pozycja/PositionDrill";
import {
  ExplLangHint,
  SternikLangScope,
  SternikPrefsProvider,
} from "../../../src/app/sternik/prefs";
import { OfflineI18nProvider, useI18n } from "./i18n";
import { OfflineRouterProvider } from "./router";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (value: string) => void };
    __REGATTA_OFFLINE_BUNDLE__?: boolean;
  }
}

const STORAGE_PREFIXES = [
  "radio.",
  "sternik.radio.",
  "sternik.expl",
  "sternik.exam",
  "regatta.radio.",
];

function collectProgressEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    }
  } catch {
    // The course remains usable if storage is unavailable.
  }
  return entries;
}

function postProgressSnapshot(entries = collectProgressEntries()) {
  if (!window.ReactNativeWebView) return;
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: "radio-offline-progress",
    entries,
  }));
}

function openOnlineCourse(path = "/radio") {
  window.ReactNativeWebView?.postMessage(JSON.stringify({
    type: "radio-open-online",
    path,
  }));
}

function OfflineConversationNotice() {
  const { tp } = useI18n();
  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <h1 className="text-2xl font-bold">
        {tp("Разговор по радио", "Radio conversation", "Rozmowa radiowa")}
      </h1>
      <p className="mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {tp(
          "Свободный разговор и распознавание ответа требуют интернета. Открой раздел «Симулятор», чтобы без сети отработать кнопки, DSC, каналы и эталонные голосовые процедуры.",
          "Free conversation and speech recognition require a connection. Open the simulator to practise controls, DSC, channels and model voice procedures offline.",
          "Swobodna rozmowa i rozpoznawanie odpowiedzi wymagaja internetu. Otworz symulator, aby offline cwiczyc przyciski, DSC, kanaly i wzorcowe procedury glosowe.",
        )}
      </p>
      {navigator.onLine && window.ReactNativeWebView && (
        <button
          type="button"
          onClick={() => openOnlineCourse("/radio/rozmowa")}
          className="mt-4 min-h-[44px] rounded-xl px-4 text-sm font-bold"
          style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
        >
          {tp(
            "Открыть онлайн-разговор",
            "Open online conversation",
            "Otworz rozmowe online",
          )}
        </button>
      )}
    </section>
  );
}

function OfflineSkipperNotice() {
  const { tp } = useI18n();
  return (
    <section className="rounded-2xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
      <h1 className="text-xl font-bold">
        {tp("Раздел шкипера не входит в пакет SRC", "Skipper section is outside this SRC package", "Dzial sternika nie nalezy do pakietu SRC")}
      </h1>
    </section>
  );
}

const ROUTES: Record<string, ComponentType> = {
  "/radio": RadioCourseHome,
  "/radio/teoria": RadioTheoryCourse,
  "/radio/obsluga": RadioControlsCourse,
  "/radio/symulator": RadioSimulatorPage,
  "/radio/test": SrcTrainerPage,
  "/radio/zadania": RadioTasksPage,
  "/radio/sciaga": CheatSheet,
  "/radio/pozycja": PositionDrill,
  "/radio/rozmowa": OfflineConversationNotice,
  "/sternik": OfflineSkipperNotice,
};

function StatusBar() {
  const { lang, setLang, tp } = useI18n();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
      <span
        className="rounded-full px-2 py-1 font-bold"
        style={{
          background: online ? "rgba(68,255,136,0.1)" : "rgba(255,170,0,0.1)",
          color: online ? "var(--success)" : "var(--warning)",
        }}
      >
        {online
          ? tp("Курс сохранён на устройстве", "Course stored on device", "Kurs zapisany na urzadzeniu")
          : tp("Офлайн: теория и рация работают", "Offline: theory and radio work", "Offline: teoria i radio dzialaja")}
      </span>
      <span className="ml-auto" style={{ color: "var(--text-muted)" }}>
        {tp("Язык помощи", "Helper language", "Jezyk pomocy")}
      </span>
      {(["pl", "ru"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLang(item)}
          className="min-h-[36px] rounded-full px-3 font-bold"
          style={lang === item
            ? { background: "var(--accent-cyan)", color: "var(--accent-ink)" }
            : { background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
        >
          {item.toUpperCase()}
        </button>
      ))}
      {online && window.ReactNativeWebView && (
        <button
          type="button"
          onClick={() => openOnlineCourse("/radio/symulator")}
          className="min-h-[36px] rounded-full px-3 font-bold"
          style={{
            background: "rgba(0,212,255,0.1)",
            color: "var(--accent-cyan)",
            border: "1px solid rgba(0,212,255,0.28)",
          }}
        >
          {tp("Голос онлайн", "Voice online", "Glos online")}
        </button>
      )}
    </div>
  );
}

function App() {
  useEffect(() => {
    window.__REGATTA_OFFLINE_BUNDLE__ = true;
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "radio-offline-ready" }));
    let previous = "";
    const sendIfChanged = () => {
      const entries = collectProgressEntries();
      const current = JSON.stringify(entries);
      if (current === previous) return;
      previous = current;
      postProgressSnapshot(entries);
    };
    const timer = window.setInterval(sendIfChanged, 1500);
    const onPageHide = () => postProgressSnapshot();
    window.addEventListener("pagehide", onPageHide);
    sendIfChanged();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return (
    <OfflineI18nProvider>
      <SternikLangScope>
        <SternikPrefsProvider>
          <OfflineRouterProvider>
            {({ path, search }) => {
              const Page = ROUTES[path] ?? RadioCourseHome;
              const key = `${path}${search}`;
              return (
                <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4">
                  <StatusBar />
                  <RadioSubnav />
                  <ExplLangHint />
                  <main key={key}>
                    <Page />
                  </main>
                </div>
              );
            }}
          </OfflineRouterProvider>
        </SternikPrefsProvider>
      </SternikLangScope>
    </OfflineI18nProvider>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Offline radio root not found");
createRoot(rootElement).render(<App />);
