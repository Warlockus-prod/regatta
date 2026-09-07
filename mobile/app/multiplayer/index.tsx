import { useLocalSearchParams } from "expo-router";
import { useI18n } from "../../src/i18n/context";
import { SimWebView } from "../../src/simulator/SimWebView";

/** Shared live room: mobile and website join the same server-authoritative race. */
export default function Multiplayer() {
  const { tp } = useI18n();
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <SimWebView path="/multiplayer" scrollEnabled query={code ? { code } : undefined}
    title={tp("Мультиплеер", "Multiplayer", "Multiplayer", { es: "Multijugador", fr: "Multijoueur", de: "Mehrspieler", it: "Multigiocatore" })}
    fallbackRoute="/game"
    fallbackLabel={tp("Одиночная гонка офлайн", "Offline solo race", "Wyścig solo offline", { es: "Carrera individual sin conexión", fr: "Course solo hors ligne", de: "Offline-Einzelrennen", it: "Regata singola offline" })} />;
}
