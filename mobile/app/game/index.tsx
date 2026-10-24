import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { SimWebView } from "../../src/simulator/SimWebView";
import { Button, Screen, Text } from "../../src/design-system/components";
import { DarkSurface, darkStackOptions } from "../../src/design-system/surface";
import { darkColors } from "../../src/design-system/tokens";
import { useI18n } from "../../src/i18n/context";
import { raceEntryQuery, raceNativeDestination } from "../../src/navigation/race-entry";
import { loadRaceById } from "../../src/persistence/race-history";
import { saveNativeRace, raceHistoryResponse, raceHistoryFailure } from "../../src/persistence/race-native";
import { parseRaceStorageEntries, RACE_STORAGE_BRIDGE_SCRIPT, useRaceWebStorage } from "../../src/persistence/race-web-storage";
import { setRaceMode, setShoreOn, setVenue } from "../../src/persistence/venue";
import { VENUES, type VenueId } from "../../../src/data/venues/venues";
import { validateNativeRace, type NativeRaceSnapshot } from "../../../src/lib/race-native";
import { isReviewPodium, recordReviewWin } from "../../src/review/review-prompt";
import { AnalyticsEvent, useAnalytics } from "../../src/analytics";

const OFFLINE_SOURCE = require("../../assets/sailing-offline.html");

/** One local race, shared with the website. Network availability never selects another game. */
export default function Game() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const analytics = useAnalytics();
  const reportedRaces = useRef(new Set<string>());
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const storage = useRaceWebStorage();
  const persistStorage = storage.persist;
  const mode = storage.entries["regatta.race.mode.v1"] === "pro" ? "pro" : "simple";
  const query = useMemo(() => raceEntryQuery(params, mode), [params, mode]);
  const replayId = query.replayId;
  const [replayState, setReplayState] = useState<{ id: string; data: NativeRaceSnapshot | null } | null>(null);
  const replayReady = !replayId || replayState?.id === replayId;
  const replay = replayId && replayState?.id === replayId ? replayState.data : null;
  useEffect(() => {
    let active = true;
    if (!replayId) return undefined;
    loadRaceById(replayId).then(record => {
      if (!active) return;
      setReplayState({ id: replayId, data: validateNativeRace(record?.webRace) });
    });
    return () => { active = false; };
  }, [replayId]);

  const onMessage = useCallback((message: string, inject: (script: string) => void) => {
    if (message.length > 2 * 1024 * 1024) return;
    let data: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(message);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      data = parsed as Record<string, unknown>;
    } catch { return; }
    if (data.type === "native-navigate") {
      const destination = raceNativeDestination(data.href);
      if (destination) router.navigate(destination);
    } else if (data.type === "race-storage") {
      const entries = parseRaceStorageEntries(data.entries);
      if (entries) void persistStorage(entries).catch(() => undefined);
    } else if (data.type === "race-prefs") {
      if (data.mode === "simple" || data.mode === "pro") setRaceMode(data.mode);
      if (typeof data.venue === "string" && VENUES.some(venue => venue.id === data.venue)) setVenue(data.venue as VenueId);
      if (typeof data.shoreOn === "boolean") setShoreOn(data.shoreOn);
      const assists = data.assists;
      if (assists && typeof assists === "object" && !Array.isArray(assists)) {
        const value = assists as Record<string, unknown>;
        if (["guidance", "rules", "penalties"].every(key => typeof value[key] === "boolean")) {
          void persistStorage({ "regatta.race.assists.v1": JSON.stringify({ guidance: value.guidance, trimHints: typeof value.trimHints === "boolean" ? value.trimHints : true, rules: value.rules, penalties: value.penalties }) }).catch(() => undefined);
        }
      }
    } else if (data.type === "race-finished") {
      void saveNativeRace(data.race, lang, Boolean(query.daily))
        .then(record => {
          inject(raceHistoryResponse(record.id));
          if (!record.webRace || reportedRaces.current.has(record.id)) return;
          reportedRaces.current.add(record.id);
          const race = record.webRace;
          try {
            analytics.capture(AnalyticsEvent.RaceFinished, {
              course: record.courseId, difficulty: race.difficulty,
              time_sec: Math.round(race.finishTimeSec), position: race.position,
              total_boats: race.totalBoats, won: race.position === 1,
            });
          } catch { /* Optional telemetry cannot turn a durable save into an error. */ }
          if (isReviewPodium(race.position, race.totalBoats)) void recordReviewWin("race-podium").catch(() => undefined);
        })
        .catch(error => inject(raceHistoryFailure(error instanceof Error && error.message === "invalid-race" ? "invalid-race" : "storage-unavailable")));
    }
  }, [lang, query.daily, router, persistStorage, analytics]);

  const title = tp("Гонка", "Race", "Wyścig", { es: "Regata", fr: "Course", de: "Rennen", it: "Regata" });
  if (!storage.ready || !replayReady) return <DarkSurface><Screen>
    <Stack.Screen options={{ ...darkStackOptions, headerShown: false, title }} />
    {storage.failed ? <>
      <Text>{tp("Не удалось прочитать данные гонок. Повтори попытку: сохраненная история не удалена.", "Could not read race data. Try again; your saved history has not been deleted.", "Nie udało się odczytać danych regat. Spróbuj ponownie; zapisana historia nie została usunięta.", { es: "No se pudieron leer los datos. Reintenta; tu historial no se ha borrado.", fr: "Impossible de lire les données. Réessaie ; ton historique n'a pas été supprimé.", de: "Renndaten konnten nicht gelesen werden. Erneut versuchen; dein Verlauf wurde nicht gelöscht.", it: "Impossibile leggere i dati. Riprova; la cronologia non è stata eliminata." })}</Text>
      <Button onPress={storage.retry}>{tp("Повторить", "Retry", "Ponów", { es: "Reintentar", fr: "Réessayer", de: "Erneut versuchen", it: "Riprova" })}</Button>
    </> : <ActivityIndicator color={darkColors.accentCyan} />}
  </Screen></DarkSurface>;
  if (replayId && !replay) return <DarkSurface><Screen>
    <Stack.Screen options={{ ...darkStackOptions, title }} />
    <Text>{tp("Повтор не найден на устройстве.", "Replay not found on this device.", "Nie znaleziono powtórki na tym urządzeniu.", { es: "No se encontró la repetición en este dispositivo.", fr: "La rediffusion est introuvable sur cet appareil.", de: "Wiederholung auf diesem Gerät nicht gefunden.", it: "Replay non trovato su questo dispositivo." })}</Text>
    <Button onPress={() => router.replace("/history")}>{tp("История гонок", "Race history", "Historia regat", { es: "Historial de regatas", fr: "Historique des courses", de: "Rennverlauf", it: "Cronologia regate" })}</Button>
  </Screen></DarkSurface>;

  return <SimWebView key={replayId ?? "race"} path="/game" title={title} query={query} fullScreen
    offlineSource={OFFLINE_SOURCE} localStorage={storage.entries} raceReplay={replay}
    offlineBridgeScript={RACE_STORAGE_BRIDGE_SCRIPT} onOfflineMessage={onMessage}
    fallbackRoute="/race" fallbackLabel={tp("К выбору гонки", "Race menu", "Menu regat", { es: "Menú de regatas", fr: "Menu des courses", de: "Rennmenü", it: "Menu delle regate" })} />;
}
