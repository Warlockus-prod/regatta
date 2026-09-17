import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import SimulatorV2 from "../../../src/features/simulator-3d/SimulatorV2";
import SimulatorV3Page from "../../../src/features/simulator-v3/SimulatorV3Page";
import { OfflineSailingI18n } from "./i18n";

declare global {
  interface Window {
    __REGATTA_EMBED__?: { path: string; query: string };
  }
}

function readEmbed() {
  const fallback = new URLSearchParams(window.location.search);
  return window.__REGATTA_EMBED__ ?? {
    path: fallback.get("screen") === "trainer" ? "/simulator-v3" : "/simulator2",
    query: fallback.toString(),
  };
}

function OfflineSailingApp() {
  const [embed, setEmbed] = useState(readEmbed);
  useEffect(() => {
    const update = () => setEmbed(previous => {
      const next = readEmbed();
      return next.path === previous.path && next.query === previous.query ? previous : next;
    });
    window.addEventListener("regatta-embed", update);
    window.ReactNativeWebView?.postMessage("app-ready");
    return () => window.removeEventListener("regatta-embed", update);
  }, []);
  const search = new URLSearchParams(embed.query);
  search.set("embed", "1");
  search.set("offline", "1");
  return <OfflineSailingI18n>{embed.path === "/simulator-v3"
    ? <SimulatorV3Page initialSearch={search.toString()} /> : <SimulatorV2 />}</OfflineSailingI18n>;
}

const reportAppError = () => window.ReactNativeWebView?.postMessage("app-error");
// R3F reports some recoverable canvas errors through window.onerror before
// its SceneBoundary renders. Do not convert those into fatal app errors:
// the Trainer's 2D views must remain usable. Root errors have their own signal.
createRoot(document.getElementById("root")!, { onUncaughtError: reportAppError }).render(<OfflineSailingApp />);
