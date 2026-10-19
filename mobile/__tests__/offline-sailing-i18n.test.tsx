import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { OfflineSailingI18n, useI18n } from "../scripts/offline-sailing/i18n";

// The offline sailing bundle swaps src/lib/i18n for this shim. Everything the
// bundled trainers call must exist here too, or the app's offline Trainer and
// 3D boat fail to open (a missing tl() did exactly that on 2026-10-19).
function Probe() {
  const { lang, tp, tl } = useI18n();
  return <Text>{`${lang}|${tp("ру", "en", "pl")}|${tl({ ru: "Гика-шкот", en: "Mainsheet", pl: "Szot grota" })}`}</Text>;
}

it("offers tp and tl in the app language", () => {
  // React Native's test window has no DOM events or document; the bundle runs in a WebView that does.
  const w = window as unknown as Record<string, unknown>;
  w.__REGATTA_LANGUAGE__ = "pl";
  w.addEventListener = () => undefined;
  w.removeEventListener = () => undefined;
  (globalThis as unknown as { document?: unknown }).document ??= { documentElement: {} };
  const view = render(<OfflineSailingI18n><Probe /></OfflineSailingI18n>);
  expect(view.getByText("pl|pl|Szot grota")).toBeTruthy();
});
