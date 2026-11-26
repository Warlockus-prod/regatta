import { useLocalSearchParams } from "expo-router";
import { useI18n } from "../../src/i18n/context";
import { SimWebView } from "../../src/simulator/SimWebView";
import { QUICK_ONLINE_RACE } from "../../../src/data/quick-online-race";

/** Shared live room: mobile and website join the same server-authoritative race. */
export default function Multiplayer() {
  const { tp, tl } = useI18n();
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <SimWebView path="/multiplayer" scrollEnabled query={code ? { code } : undefined}
    title={tl(QUICK_ONLINE_RACE)}
    fallbackRoute="/game"
    fallbackLabel={tp("Одиночная гонка офлайн", "Offline solo race", "Wyścig solo offline", { es: "Regata en solitario sin conexión", fr: "Course solo hors ligne", de: "Offline-Solorennen", it: "Regata in solitario offline" })} />;
}
