import { View } from "react-native";
import type { Lang } from "../i18n/languages";
import { Text } from "../design-system/components/Text";
import type { NativeRaceRecordProjection } from "../persistence/race-record-presentation";
import { formatSavedRaceTime, raceRecordConditions, RACE_RECORD_COPY } from "../../../src/lib/race-record-copy";

export function RaceRecordDetails({ projection, lang }: { projection: NativeRaceRecordProjection; lang: Lang }) {
  if (projection.kind === "unavailable") return <Text variant="muted">{RACE_RECORD_COPY.retained[lang]}</Text>;
  if (projection.kind !== "classified") return null;
  return <View>
    <Text variant="caption">{raceRecordConditions(projection.comparison, lang)}</Text>
    <Text variant="subtitle">{RACE_RECORD_COPY.adjusted[lang]}: {formatSavedRaceTime(projection.adjustedTimeSec)}</Text>
    <Text variant="muted">{RACE_RECORD_COPY.raw[lang]}: {formatSavedRaceTime(projection.rawFinishTimeSec)} · {RACE_RECORD_COPY.penalty[lang]}: {formatSavedRaceTime(projection.penaltySeconds)}</Text>
  </View>;
}
