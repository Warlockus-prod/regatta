import { useEffect, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import SternikHome from "../../../src/app/sternik/page";
import SternikTheory from "../../../src/app/sternik/teoria/page";
import SternikTest from "../../../src/app/sternik/test/page";
import SternikExam from "../../../src/app/sternik/egzamin/page";
import SternikOral from "../../../src/app/sternik/ustny/page";
import SternikSubnav from "../../../src/app/sternik/SternikSubnav";
import { SternikLangScope, SternikPrefsProvider } from "../../../src/app/sternik/prefs";
import { installSternikBridge, postSternikProgress } from "./bridge";
import { OfflineRouterProvider } from "./router";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
    __REGATTA_EMBED__?: { path: string; query: string };
    __REGATTA_STERNIK_OFFLINE__?: boolean;
  }
}
const ROUTES: Record<string, ComponentType> = { "/sternik": SternikHome, "/sternik/teoria": SternikTheory,
  "/sternik/test": SternikTest, "/sternik/egzamin": SternikExam, "/sternik/ustny": SternikOral };

function Status() {
  const [storageError, setStorageError] = useState(false);
  const [tutorNotice, setTutorNotice] = useState(false);
  useEffect(() => {
    const failed = () => setStorageError(true), saved = () => setStorageError(false), tutor = () => { setTutorNotice(true); window.scrollTo({ top: 0, behavior: "auto" }); };
    window.addEventListener("regatta:sternik-storage-error", failed);
    window.addEventListener("regatta:sternik-storage-saved", saved);
    window.addEventListener("sternik:ask", tutor);
    return () => { window.removeEventListener("regatta:sternik-storage-error", failed); window.removeEventListener("regatta:sternik-storage-saved", saved); window.removeEventListener("sternik:ask", tutor); };
  }, []);
  return <div className="mb-4 space-y-2 text-sm">
    <p className="text-[var(--text-secondary)]">Kurs zapisany na urządzeniu. Teoria, trening i egzamin działają bez internetu.</p>
    {storageError && <div className="rounded-xl border border-[var(--warning)] p-3" role="alert"><p>Nie udało się zapisać postępu na urządzeniu. Nie zamykaj kursu i spróbuj ponownie.</p><button type="button" className="mt-2 min-h-11 underline" onClick={() => postSternikProgress(true)}>Ponów zapis</button></div>}
    {tutorNotice && <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3" role="status"><p>Rozmowa z asystentem AI wymaga internetu i nie jest częścią tego pakietu offline. Analiza błędów, pytania i objaśnienia pozostają dostępne na urządzeniu.</p><button type="button" className="mt-2 min-h-11 underline" onClick={() => setTutorNotice(false)}>Zamknij komunikat</button></div>}
  </div>;
}
function App() {
  useEffect(() => {
    document.documentElement.lang = "pl";
    window.__REGATTA_STERNIK_OFFLINE__ = true;
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "sternik-offline-ready" }));
    postSternikProgress();
    const interval = window.setInterval(() => postSternikProgress(), 1500);
    const flush = () => postSternikProgress(true);
    window.addEventListener("pagehide", flush);
    return () => { clearInterval(interval); window.removeEventListener("pagehide", flush); };
  }, []);
  return <OfflineRouterProvider>{route => {
    const Page = ROUTES[route.path] ?? SternikHome;
    return <SternikLangScope><SternikPrefsProvider><div className="sternik-offline-app mx-auto w-full max-w-5xl px-4 pb-12 pt-4">
      <Status /><SternikSubnav /><main key={`${route.path}${route.search}`}><Page /></main>
    </div></SternikPrefsProvider></SternikLangScope>;
  }}</OfflineRouterProvider>;
}
installSternikBridge();
createRoot(document.getElementById("root")!, { onUncaughtError: () => window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "sternik-offline-error" })) }).render(<App />);
