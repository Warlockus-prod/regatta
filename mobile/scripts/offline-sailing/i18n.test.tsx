import { Text } from "react-native";
import { act, render } from "@testing-library/react-native";
import { OfflineSailingI18n, useI18n } from "./i18n";

const translations = { ru: "Основы", en: "Basics", pl: "Podstawy", es: "Fundamentos", fr: "Bases", de: "Grundlagen", it: "Basi" };
function Probe() {
  const { lang, tl } = useI18n();
  return <Text>{`${lang}|${tl(translations)}`}</Text>;
}

test("all seven native languages update a mounted local page without reloading it", () => {
  const listeners = new Map<string, () => void>();
  window.addEventListener = jest.fn((name, handler) => { listeners.set(name, handler as () => void); });
  window.removeEventListener = jest.fn(name => { listeners.delete(name); });
  (globalThis as unknown as { document: unknown }).document = { documentElement: {} };
  window.__REGATTA_LANGUAGE__ = "en";
  const view = render(<OfflineSailingI18n><Probe /></OfflineSailingI18n>);
  for (const [lang, text] of Object.entries(translations)) {
    act(() => { window.__REGATTA_LANGUAGE__ = lang; listeners.get("regatta-language")?.(); });
    expect(view.getByText(`${lang}|${text}`)).toBeTruthy();
    expect(document.documentElement.lang).toBe(lang);
  }
  view.unmount();
  expect(listeners.has("regatta-language")).toBe(false);
});
