'use client';
import { useRadioI18n } from "@/app/radio/localization/context";
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
import LiveDialogue from "../../../src/app/radio/rozmowa/LiveDialogue";
import { RadioPrefsProvider } from "../../../src/app/radio/prefs";
import { RadioLocaleProvider } from "../../../src/app/radio/localization/context";
import pl from "../../../public/radio-locales/pl.json";
import ru from "../../../public/radio-locales/ru.json";
import en from "../../../public/radio-locales/en.json";
import es from "../../../public/radio-locales/es.json";
import fr from "../../../public/radio-locales/fr.json";
import de from "../../../public/radio-locales/de.json";
import it from "../../../public/radio-locales/it.json";
import bundledAliases from "../../../public/radio-locales/aliases.json";
const bundledCatalogs = { pl, ru, en, es, fr, de, it };
import { OfflineI18nProvider, type CourseLanguage } from "./i18n";
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

function OfflineSkipperNotice() {
  const { rt: radioText } = useRadioI18n();
  const { tp } = useRadioI18n();
  return (
    <section className="rounded-2xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
      <h1 className="text-xl font-bold">
        {radioText(tp("Раздел шкипера не входит в пакет SRC", "Skipper section is outside this SRC package", "Dział sternika nie należy do pakietu SRC"))}
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
  "/radio/rozmowa": LiveDialogue,
  "/sternik": OfflineSkipperNotice,
};

function helperLanguages(): CourseLanguage[] { return ["de", "en", "es", "fr", "it", "pl", "ru"]; }

function StatusBar() {
  const { lang, setLang, tp } = useRadioI18n();
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
          ? tp("Курс сохранён на устройстве", "Course stored on device", "Kurs zapisany na urządzeniu", { es: "Curso guardado en el dispositivo", fr: "Cours enregistré sur l'appareil", de: "Kurs auf dem Gerät gespeichert", it: "Corso salvato sul dispositivo" })
          : tp("Офлайн: теория и рация работают", "Offline: theory and radio work", "Offline: teoria i radio działają", { es: "Sin conexión: la teoría y la radio funcionan", fr: "Hors ligne : la théorie et la radio fonctionnent", de: "Offline: Theorie und Funkgerät funktionieren", it: "Offline: teoria e radio funzionano" })}
      </span>
      <span className="ml-auto" style={{ color: "var(--text-muted)" }}>
        {tp("Язык курса", "Course language", "Język kursu", { es: "Idioma del curso", fr: "Langue du cours", de: "Kurssprache", it: "Lingua del corso" })}
      </span>
      {helperLanguages().map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLang(item)}
          className="min-h-[44px] rounded-full px-3 font-bold"
          style={lang === item
            ? { background: "var(--accent-cyan)", color: "var(--accent-ink)" }
            : { background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
        >
          {item.toUpperCase()}
        </button>
      ))}

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
      <OfflineRouterProvider>
        {({ path, search }) => {
          const Page = ROUTES[path] ?? RadioCourseHome;
          const key = `${path}${search}`;
          return (
            <RadioLocaleProvider bundled={bundledCatalogs} bundledAliases={bundledAliases}>
              <RadioPrefsProvider>
                <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4">
                  <StatusBar />
                  <RadioSubnav />
                  <main key={key}>
                    <Page />
                  </main>
                </div>
              </RadioPrefsProvider>
            </RadioLocaleProvider>
          );
        }}
      </OfflineRouterProvider>
    </OfflineI18nProvider>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Offline radio root not found");
// Components choose local speech/grading during their very first render.
window.__REGATTA_OFFLINE_BUNDLE__ = true;
createRoot(rootElement).render(<App />);
