import { createRoot } from "react-dom/client";
import { useEffect, useLayoutEffect, useState } from "react";
import SimulatorV2 from "../../../src/features/simulator-3d/SimulatorV2";
import SimulatorV3Page from "../../../src/features/simulator-v3/SimulatorV3Page";
import GameClient from "../../../src/app/game/GameClient";
import SimulatorBasics from "../../../src/app/simulator/page";
import AnatomyPage from "../../../src/app/anatomy/page";
import { OfflineSailingI18n } from "./i18n";
import { readSailingEmbed, sailingSearch } from "./embed";

function OfflineSailingApp() {
  const [embed, setEmbed] = useState(readSailingEmbed);
  useLayoutEffect(() => {
    // Content pages retain document scrolling and the poster's body scroll lock.
    document.documentElement.dataset.sailingDocument = String(embed.path === "/anatomy" || embed.path === "/simulator");
  }, [embed.path]);
  useEffect(() => {
    const update = () => setEmbed(previous => {
      const next = readSailingEmbed();
      return next.path === previous.path && next.query === previous.query ? previous : next;
    });
    window.addEventListener("regatta-embed", update);
    window.ReactNativeWebView?.postMessage("app-ready");
    return () => window.removeEventListener("regatta-embed", update);
  }, []);
  const search = sailingSearch(embed.query);
  return <OfflineSailingI18n>{embed.path === "/game" ? <GameClient /> : embed.path === "/simulator-v3"
    ? <SimulatorV3Page initialSearch={search.toString()} /> : embed.path === "/simulator" ? <SimulatorBasics />
    : embed.path === "/anatomy" ? <AnatomyPage /> : <SimulatorV2 />}</OfflineSailingI18n>;
}

const reportAppError = () => window.ReactNativeWebView?.postMessage("app-error");
// R3F reports some recoverable canvas errors through window.onerror before
// its SceneBoundary renders. Do not convert those into fatal app errors:
// the Trainer's 2D views must remain usable. Root errors have their own signal.
createRoot(document.getElementById("root")!, { onUncaughtError: reportAppError }).render(<OfflineSailingApp />);
