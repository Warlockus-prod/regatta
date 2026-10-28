import type { Lang } from "./languages";
import type { RaceClassId } from "./race-context";
import { raceContextForClassId, type RaceComparison } from "./race-record-class";

export type RaceRecordTitle =
  | { kind: "historical"; course: "short" | "medium" | "long" | "daily" | null }
  | { kind: "registered"; classId: RaceClassId }
  | { kind: "unavailable" };

/** Shared saved-result wording. IDs and comparison keys are never titles. */
export const RACE_RECORD_COPY = {
  short: { ru: "Короткая гонка", en: "Short race", pl: "Krótki wyścig", es: "Regata corta", fr: "Course courte", de: "Kurzes Rennen", it: "Regata breve" },
  medium: { ru: "Средняя гонка", en: "Medium race", pl: "Średni wyścig", es: "Regata media", fr: "Course moyenne", de: "Mittleres Rennen", it: "Regata media" },
  long: { ru: "Длинная гонка", en: "Long race", pl: "Długi wyścig", es: "Regata larga", fr: "Course longue", de: "Langes Rennen", it: "Regata lunga" },
  daily: { ru: "Дневной вызов", en: "Daily challenge", pl: "Wyzwanie dnia", es: "Reto diario", fr: "Défi du jour", de: "Tagesherausforderung", it: "Sfida giornaliera" },
  saved: { ru: "Сохраненная гонка", en: "Saved race", pl: "Zapisany wyścig", es: "Regata guardada", fr: "Course enregistrée", de: "Gespeichertes Rennen", it: "Regata salvata" },
  unavailable: { ru: "Запись гонки недоступна", en: "Race record unavailable", pl: "Zapis wyścigu jest niedostępny", es: "Registro de regata no disponible", fr: "Enregistrement de course indisponible", de: "Rennaufzeichnung nicht verfügbar", it: "Registrazione della regata non disponibile" },
  legacy: { ru: "Классическая 3D-гонка", en: "Classic 3D race", pl: "Klasyczny wyścig 3D", es: "Regata clásica 3D", fr: "Course classique 3D", de: "Klassisches 3D-Rennen", it: "Regata classica 3D" },
  physicalShort: { ru: "Короткая дистанция", en: "Short course", pl: "Krótka trasa", es: "Recorrido corto", fr: "Parcours court", de: "Kurze Bahn", it: "Percorso breve" },
  physicalMedium: { ru: "Средняя дистанция", en: "Medium course", pl: "Średnia trasa", es: "Recorrido medio", fr: "Parcours moyen", de: "Mittlere Bahn", it: "Percorso medio" },
  physicalLong: { ru: "Длинная дистанция", en: "Long course", pl: "Długa trasa", es: "Recorrido largo", fr: "Parcours long", de: "Lange Bahn", it: "Percorso lungo" },
  simple: { ru: "Обычный", en: "Simple", pl: "Prosty", es: "Sencillo", fr: "Simple", de: "Einfach", it: "Semplice" },
  pro: { ru: "Pro", en: "Pro", pl: "Pro", es: "Pro", fr: "Pro", de: "Pro", it: "Pro" },
  easy: { ru: "Лёгкий", en: "Easy", pl: "Łatwy", es: "Fácil", fr: "Facile", de: "Leicht", it: "Facile" },
  difficultyMedium: { ru: "Средний", en: "Medium", pl: "Średni", es: "Medio", fr: "Moyen", de: "Mittel", it: "Medio" },
  hard: { ru: "Сложный", en: "Hard", pl: "Trudny", es: "Difícil", fr: "Difficile", de: "Schwer", it: "Difficile" },
  light: { ru: "слабый ветер", en: "light wind", pl: "słaby wiatr", es: "viento flojo", fr: "vent faible", de: "leichter Wind", it: "vento leggero" },
  windMedium: { ru: "средний ветер", en: "medium wind", pl: "średni wiatr", es: "viento medio", fr: "vent moyen", de: "mäßiger Wind", it: "vento moderato" },
  heavy: { ru: "сильный ветер", en: "strong wind", pl: "silny wiatr", es: "viento fuerte", fr: "vent fort", de: "starker Wind", it: "vento forte" },
  adjusted: { ru: "Итоговое время", en: "Adjusted time", pl: "Czas po karach", es: "Tiempo ajustado", fr: "Temps corrigé", de: "Zeit mit Strafen", it: "Tempo corretto" },
  raw: { ru: "Ходовое время", en: "Sailing time", pl: "Czas żeglugi", es: "Tiempo de navegación", fr: "Temps de navigation", de: "Segelzeit", it: "Tempo di navigazione" },
  penalty: { ru: "Штраф", en: "Penalty", pl: "Kara", es: "Penalización", fr: "Pénalité", de: "Strafe", it: "Penalità" },
  historicalHeading: { ru: "Предыдущие результаты", en: "Previous results", pl: "Wcześniejsze wyniki", es: "Resultados anteriores", fr: "Résultats précédents", de: "Bisherige Ergebnisse", it: "Risultati precedenti" },
  classifiedHeading: { ru: "Рекорды по условиям", en: "Bests by race conditions", pl: "Rekordy według warunków", es: "Récords por condiciones", fr: "Records par conditions", de: "Bestzeiten nach Bedingungen", it: "Record per condizioni" },
  unavailableHeading: { ru: "Другие сохраненные записи", en: "Other saved records", pl: "Inne zapisane wyniki", es: "Otros registros guardados", fr: "Autres enregistrements", de: "Weitere gespeicherte Ergebnisse", it: "Altre registrazioni salvate" },
  retained: { ru: "Запись сохранена. Причина недоступности указана в повторе гонки.", en: "The record is preserved. Replay explains why it is unavailable.", pl: "Zapis został zachowany. Przyczynę niedostępności znajdziesz w Powtórce.", es: "El registro se conserva. La repetición explica por qué no está disponible.", fr: "L'enregistrement est conservé. Le replay indique pourquoi il est indisponible.", de: "Die Aufzeichnung bleibt erhalten. Die Wiederholung erklärt, warum sie nicht verfügbar ist.", it: "La registrazione è conservata. Il replay spiega perché non è disponibile." },
} as const satisfies Record<string, Record<Lang, string>>;

export function raceRecordTitle(title: RaceRecordTitle, lang: Lang): string {
  if (title.kind === "unavailable") return RACE_RECORD_COPY.unavailable[lang];
  if (title.kind === "historical") return RACE_RECORD_COPY[title.course ?? "saved"][lang];
  const context = raceContextForClassId(title.classId);
  if (!context) return RACE_RECORD_COPY.unavailable[lang];
  if (context.model === "legacy-race-v1") return RACE_RECORD_COPY.legacy[lang];
  const key = context.profile === "short" ? "physicalShort" : context.profile === "medium" ? "physicalMedium" : "physicalLong";
  return RACE_RECORD_COPY[key][lang];
}

export function raceRecordConditions(comparison: RaceComparison, lang: Lang): string {
  const difficulty = comparison.difficulty === "medium" ? "difficultyMedium" : comparison.difficulty;
  const wind = comparison.windStrength === "medium" ? "windMedium" : comparison.windStrength;
  return [RACE_RECORD_COPY[comparison.mode][lang], RACE_RECORD_COPY[difficulty][lang], RACE_RECORD_COPY[wind][lang]].join(" · ");
}

export function formatSavedRaceTime(seconds: number): string {
  const tenths = Math.max(0, Math.round(seconds * 10));
  return `${Math.floor(tenths / 600)}:${Math.floor(tenths % 600 / 10).toString().padStart(2, "0")}.${tenths % 10}`;
}
